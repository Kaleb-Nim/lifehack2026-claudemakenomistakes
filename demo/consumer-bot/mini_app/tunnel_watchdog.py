"""Keep the local Mini App reachable through a disposable localhost.run tunnel."""

from __future__ import annotations

import os
import queue
import re
import signal
import subprocess
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = APP_DIR / ".env"
URL_PATTERN = re.compile(r"https://[a-z0-9]+\.lhr\.life")
CHECK_INTERVAL_SECONDS = 20
stop_requested = threading.Event()


def log(message: str) -> None:
    print(f"[mini-app-tunnel] {message}", flush=True)


def public_app_is_healthy(url: str) -> bool:
    request = urllib.request.Request(url, headers={"User-Agent": "PlutoHealthCheck/1"})
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status == 200
    except (OSError, urllib.error.URLError):
        return False


def write_mini_app_url(url: str) -> None:
    try:
        lines = ENV_PATH.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        lines = []

    replacement = f"MINI_APP_URL={url}"
    updated: list[str] = []
    replaced = False
    for line in lines:
        if line.partition("=")[0].strip() == "MINI_APP_URL":
            updated.append(replacement)
            replaced = True
        else:
            updated.append(line)
    if not replaced:
        updated.append(replacement)

    temporary_path = ENV_PATH.with_suffix(".env.tunnel-update")
    temporary_path.write_text("\n".join(updated) + "\n", encoding="utf-8")
    if ENV_PATH.exists():
        os.chmod(temporary_path, ENV_PATH.stat().st_mode)
    os.replace(temporary_path, ENV_PATH)


def terminate(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def start_tunnel() -> tuple[subprocess.Popen[str], str] | None:
    process = subprocess.Popen(
        [
            "/usr/bin/ssh",
            "-o",
            "StrictHostKeyChecking=accept-new",
            "-o",
            "ServerAliveInterval=30",
            "-o",
            "ExitOnForwardFailure=yes",
            "-R",
            "80:localhost:8080",
            "nokey@localhost.run",
        ],
        cwd=APP_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    output: queue.Queue[str] = queue.Queue()

    def read_output() -> None:
        if process.stdout is None:
            return
        for line in process.stdout:
            output.put(line)

    threading.Thread(target=read_output, daemon=True).start()
    deadline = time.monotonic() + 30
    tunnel_url: str | None = None
    while time.monotonic() < deadline and not stop_requested.is_set():
        if process.poll() is not None:
            break
        try:
            line = output.get(timeout=1)
        except queue.Empty:
            continue
        match = URL_PATTERN.search(line)
        if match:
            tunnel_url = match.group(0)
            break

    if tunnel_url is None:
        log("Tunnel did not provide a public URL; retrying")
        terminate(process)
        return None

    health_deadline = time.monotonic() + 30
    while time.monotonic() < health_deadline and not stop_requested.is_set():
        if process.poll() is not None:
            break
        if public_app_is_healthy(tunnel_url):
            write_mini_app_url(tunnel_url)
            log(f"Public Mini App is healthy at {tunnel_url}")
            return process, tunnel_url
        stop_requested.wait(2)

    log("New tunnel never became healthy; retrying")
    terminate(process)
    return None


def request_stop(_signal_number: int, _frame: object) -> None:
    stop_requested.set()


def main() -> None:
    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)
    active_process: subprocess.Popen[str] | None = None
    try:
        while not stop_requested.is_set():
            started = start_tunnel()
            if started is None:
                stop_requested.wait(3)
                continue
            active_process, tunnel_url = started
            failed_checks = 0
            while not stop_requested.wait(CHECK_INTERVAL_SECONDS):
                if active_process.poll() is not None:
                    log("Tunnel process exited; reconnecting")
                    break
                if public_app_is_healthy(tunnel_url):
                    failed_checks = 0
                    continue
                failed_checks += 1
                if failed_checks >= 2:
                    log("Public Mini App failed two health checks; reconnecting")
                    break
            terminate(active_process)
            active_process = None
    finally:
        if active_process is not None:
            terminate(active_process)
        log("Watchdog stopped")


if __name__ == "__main__":
    main()
