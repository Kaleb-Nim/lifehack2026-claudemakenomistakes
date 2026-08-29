"use client";

// WebRTC transport for the OpenAI Realtime API. Connects only on demand — CONTEXT.md:
// mic permission is requested on the orb tap, never on page load. Every failure path
// (no key, mint error, mic denial, ICE failure, data-channel close) resolves to
// `phase: "scripted"` with a matching `failure` reason and throws nothing to the caller,
// so components/Onboarding.tsx can fall back to the byte-identical Phase 1 keyboard demo.
//
// The SDP exchange endpoint below is pinned by 02-RESEARCH.md, verified 2026-08-29 —
// it overrides training data (never the deprecated /v1/realtime?model= shape).

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export type SessionPhase = "idle" | "connecting" | "live" | "scripted";
export type SessionFailure = null | "no_key" | "mint_failed" | "mic_denied" | "ice_failed" | "dropped" | "operator";

export interface RealtimeEvent {
  type: string;
  [k: string]: unknown;
}

export interface RealtimeSessionApi {
  phase: SessionPhase;
  failure: SessionFailure;
  muted: boolean;
  speaking: boolean;
  hearing: boolean;
  connect: () => void;
  disconnect: (failure?: SessionFailure) => void;
  send: (event: RealtimeEvent) => void;
  toggleMute: () => void;
}

export interface UseRealtimeSessionOptions {
  /** Raw server events, forwarded unfiltered. */
  onEvent?: (event: RealtimeEvent) => void;
}

const CALLS_URL = "https://api.openai.com/v1/realtime/calls";

function isPermissionError(err: unknown): boolean {
  return err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError" || err.name === "SecurityError");
}

/**
 * `audioRef` is a standalone parameter, not a field on `opts` — bundling a ref into the
 * same object as plain callbacks makes the react-compiler lint treat every field read
 * off that object as an unsafe render-time ref access, including plain ones like
 * `opts.onEvent`.
 */
export function useRealtimeSession(audioRef: RefObject<HTMLAudioElement | null>, opts: UseRealtimeSessionOptions = {}): RealtimeSessionApi {
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [failure, setFailure] = useState<SessionFailure>(null);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [hearing, setHearing] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const connectingRef = useRef(false);
  const onEventRef = useRef(opts.onEvent);
  useEffect(() => {
    onEventRef.current = opts.onEvent;
  });

  const teardown = useCallback(() => {
    if (dcRef.current) { dcRef.current.onmessage = null; dcRef.current.onclose = null; dcRef.current.close(); }
    dcRef.current = null;
    if (pcRef.current) { pcRef.current.oniceconnectionstatechange = null; pcRef.current.ontrack = null; pcRef.current.close(); }
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    connectingRef.current = false;
  }, []);

  const disconnect = useCallback((f: SessionFailure = null) => {
    teardown();
    setPhase("scripted");
    setFailure(f);
    setSpeaking(false);
    setHearing(false);
  }, [teardown]);

  const handleServerMessage = useCallback((raw: string) => {
    let event: RealtimeEvent;
    try {
      event = JSON.parse(raw) as RealtimeEvent;
    } catch {
      return;
    }
    if (event.type === "output_audio_buffer.started") setSpeaking(true);
    if (event.type === "output_audio_buffer.stopped" || event.type === "output_audio_buffer.cleared") setSpeaking(false);
    if (event.type === "input_audio_buffer.speech_started") setHearing(true);
    if (event.type === "input_audio_buffer.speech_stopped") setHearing(false);
    onEventRef.current?.(event);
  }, []);

  const connect = useCallback(() => {
    if (connectingRef.current || phase === "live") return;
    connectingRef.current = true;
    setPhase("connecting");
    setFailure(null);

    (async () => {
      let stream: MediaStream;
      let mintRes: Response;
      try {
        [mintRes, stream] = await Promise.all([
          fetch("/api/realtime/session", { method: "POST" }),
          navigator.mediaDevices.getUserMedia({ audio: true }),
        ]);
      } catch (err) {
        disconnect(isPermissionError(err) ? "mic_denied" : "mint_failed");
        return;
      }

      if (!mintRes.ok) {
        stream.getTracks().forEach((t) => t.stop());
        let reason: SessionFailure = "mint_failed";
        try {
          const body = (await mintRes.json()) as { error?: string };
          if (body?.error === "no_key") reason = "no_key";
        } catch {
          // keep default reason
        }
        disconnect(reason);
        return;
      }

      let clientSecret: string;
      try {
        const minted = (await mintRes.json()) as { client_secret?: string };
        if (typeof minted.client_secret !== "string" || !minted.client_secret) throw new Error("missing client_secret");
        clientSecret = minted.client_secret;
      } catch {
        stream.getTracks().forEach((t) => t.stop());
        disconnect("mint_failed");
        return;
      }

      streamRef.current = stream;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === "failed") disconnect("ice_failed");
        else if (state === "disconnected" || state === "closed") disconnect("dropped");
      };

      pc.ontrack = (e) => {
        if (audioRef.current) audioRef.current.srcObject = e.streams[0];
      };

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (e) => handleServerMessage(e.data as string);
      dc.onclose = () => disconnect("dropped");
      dc.onopen = () => {
        connectingRef.current = false;
        setPhase("live");
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpRes = await fetch(CALLS_URL, {
          method: "POST",
          body: offer.sdp,
          headers: { Authorization: `Bearer ${clientSecret}`, "Content-Type": "application/sdp" },
        });
        if (!sdpRes.ok) { disconnect("ice_failed"); return; }

        const answerSdp = await sdpRes.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      } catch {
        disconnect("ice_failed");
      }
    })();
  }, [phase, disconnect, handleServerMessage, audioRef]);

  const send = useCallback((event: RealtimeEvent) => {
    if (dcRef.current?.readyState === "open") {
      dcRef.current.send(JSON.stringify(event));
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
      return next;
    });
  }, []);

  useEffect(() => teardown, [teardown]);

  return { phase, failure, muted, speaking, hearing, connect, disconnect, send, toggleMute };
}
