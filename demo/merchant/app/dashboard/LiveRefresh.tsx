"use client";

import { useEffect, useState } from "react";

// Polls /api/orders so a sale closed in a Pluto chat lands on the dashboard
// without anyone touching the keyboard — the moment the demo depends on.
// router.refresh() re-runs the Server Component, so the page keeps rendering
// from the server and no Supabase credential is ever needed in the browser.
export default function LiveRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        // Only reload when something actually changed, so the page does not
        // flicker every five seconds during a recording.
        const next = `${data.orders?.length ?? 0}:${data.collectedCents ?? 0}:${data.heldCents ?? 0}`;
        setUpdatedAt(
          new Date().toLocaleTimeString("en-SG", {
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: false, timeZone: "Asia/Singapore",
          })
        );
        setSignature((prev) => {
          if (prev !== null && prev !== next) window.location.reload();
          return next;
        });
      } catch {
        // Offline or server restarting — try again on the next tick.
      }
    }

    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return (
    <span className="text-xs" style={{ color: "var(--color-neutral-500)" }}>
      {updatedAt ? `Live · checked ${updatedAt}` : "Live"}
    </span>
  );
}
