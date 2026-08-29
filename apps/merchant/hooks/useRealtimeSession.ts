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
import { ECHO_GRACE_MS } from "../lib/agent-script";

export type SessionPhase = "idle" | "connecting" | "live" | "scripted";
export type SessionFailure = null | "no_key" | "no_context" | "mint_failed" | "mic_denied" | "ice_failed" | "dropped" | "operator";

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
  /**
   * The owner's transcript for the open (or just-closed) turn — real `state`, not a ref,
   * because every delta should re-render `.caption-text` as it arrives, paced by the
   * owner's own speech rather than an artificial cps. Reset to "" on
   * `input_audio_buffer.speech_started`; grown by transcription deltas; corrected in place
   * by the completed event's authoritative full transcript. Never gates a beat — decorative
   * only (lib/beat-runner.ts applies the MIN_SPEECH_MS display gate on top of this).
   */
  caption: string;
  /**
   * The last EVENT_LOG_MAX raw server events, newest last, for operator debugging (plan
   * 02-03's status chip). A ref, not state — mutated in place so a fast event stream never
   * forces a re-render; nothing on stage reads this.
   */
  events: RefObject<RealtimeEvent[]>;
}

export interface UseRealtimeSessionOptions {
  /** Raw server events, forwarded unfiltered. */
  onEvent?: (event: RealtimeEvent) => void;
}

const CALLS_URL = "https://api.openai.com/v1/realtime/calls";
const EVENT_LOG_MAX = 50;

// Matched by suffix, not by an exact literal — 02-RESEARCH.md pins the session config shape
// but not the server event names, so a namespace change (the full type today is
// `conversation.item.input_audio_transcription.delta` / `…completed`) degrades to a missing
// caption rather than a crash. The caption is decorative and never gates a beat.
const TRANSCRIPTION_DELTA_SUFFIX = "input_audio_transcription.delta";
// Exported (not local-only) so lib/beat-runner.ts can independently recognize the same
// event, matched by suffix for the same reason, to finalize a turn into its rolling
// caption history (QUICK-caption-history.md) without duplicating the suffix string.
export const TRANSCRIPTION_COMPLETED_SUFFIX = "input_audio_transcription.completed";

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
  const [caption, setCaption] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const connectingRef = useRef(false);
  const onEventRef = useRef(opts.onEvent);
  useEffect(() => {
    onEventRef.current = opts.onEvent;
  });
  const eventsRef = useRef<RealtimeEvent[]>([]);

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
    setCaption("");
  }, [teardown]);

  const handleServerMessage = useCallback((raw: string) => {
    let event: RealtimeEvent;
    try {
      event = JSON.parse(raw) as RealtimeEvent;
    } catch {
      return;
    }
    eventsRef.current.push(event);
    if (eventsRef.current.length > EVENT_LOG_MAX) eventsRef.current.shift();
    if (event.type === "output_audio_buffer.started") setSpeaking(true);
    if (event.type === "output_audio_buffer.stopped" || event.type === "output_audio_buffer.cleared") setSpeaking(false);
    if (event.type === "input_audio_buffer.speech_started") { setHearing(true); setCaption(""); }
    if (event.type === "input_audio_buffer.speech_stopped") setHearing(false);
    if (typeof event.type === "string" && event.type.endsWith(TRANSCRIPTION_DELTA_SUFFIX)) {
      const delta = typeof event.delta === "string" ? event.delta : "";
      if (delta) setCaption((c) => c + delta);
    }
    if (typeof event.type === "string" && event.type.endsWith(TRANSCRIPTION_COMPLETED_SUFFIX)) {
      // The completed event's `transcript` is the authoritative full text — an in-place
      // correction of whatever the incremental deltas accumulated to, applied as a single
      // swap (no per-character animation, no strikethrough).
      if (typeof event.transcript === "string") setCaption(event.transcript);
    }
    onEventRef.current?.(event);
  }, []);

  /**
   * Hard mic gate while the agent is speaking.
   *
   * Echo cancellation alone does not survive a room with open speakers: the agent's audio
   * leaks back in, server VAD calls it an owner turn, and the server clears the output
   * buffer — cutting the agent off mid-line. `interrupt_response: false` does not prevent
   * this; it stops the *response* being cancelled, not the *audio* being flushed, so
   * `response.done` still arrives with the full transcript while nothing was heard.
   *
   * Disabling the local track is the only thing that stops it at the source, and it costs
   * nothing the demo wants: the owner has no scripted turn during the agent's line. The
   * track is re-enabled ECHO_GRACE_MS after the audio stops so the tail cannot re-trigger.
   *
   * Consequence, deliberate: the agent can no longer be barged in on. For this phase that
   * is the point — a take cannot be derailed by a cough, a door, or the agent hearing
   * itself. Delete this effect to restore barge-in.
   */
  useEffect(() => {
    const stream = streamRef.current;
    if (!stream || muted) return; // an operator mute must always win over the gate
    if (speaking) {
      stream.getAudioTracks().forEach((t) => { t.enabled = false; });
      return;
    }
    const id = setTimeout(() => {
      if (!streamRef.current || muted) return;
      streamRef.current.getAudioTracks().forEach((t) => { t.enabled = true; });
    }, ECHO_GRACE_MS);
    return () => clearTimeout(id);
  }, [speaking, muted]);

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
          // Echo cancellation is not optional here. Without it the agent's own voice comes
          // back through the speakers, server VAD reads it as the owner talking, and the
          // server clears the output audio buffer mid-line — the agent cuts itself off
          // ~200ms into every beat. Browsers usually default these on, but `audio: true`
          // leaves it to the UA; on a desktop with speakers that default is not enough,
          // so they are requested explicitly and backed by the mic gate below.
          navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          }),
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
          else if (body?.error === "no_context") reason = "no_context";
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

  return { phase, failure, muted, speaking, hearing, connect, disconnect, send, toggleMute, caption, events: eventsRef };
}
