"use client";

// Joins hooks/useRealtimeSession.ts (transport) to lib/agent-script.ts (beat table) so a
// live Realtime session speaks the scripted line for a beat, fires that beat's canned tool
// handlers on the owner's real speech, and uses the handler's return value — never a
// timer — to advance the onboarding page a frame (CONTEXT.md: "Snapshot-first, not a
// reducer rewrite").
//
// Scope for this plan (02-01): exactly ONE beat is driven end to end (BEATS[0], "A"). The
// runner enters it once on connect, issues its one `response.create`, and on a real
// speech_stopped past MIN_SPEECH_MS fires its tools and advances the page. Progressing the
// runner's OWN beat cursor into subsequent beats (so they also get spoken) is plan 02-02's
// "full beat progression" — deliberately not wired here, so this plan's single response.create
// stays observably singular.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useRealtimeSession, type RealtimeEvent, type SessionFailure, type SessionPhase } from "../hooks/useRealtimeSession";
import { AUDIO_TIMEOUT_MS, BEATS, MIN_SPEECH_MS, SETTLE_MS, TOOL_HANDLERS, verbatim, type Beat } from "./agent-script";

/** The slice of useOnboardingState() the runner needs — kept structural, not imported, to avoid coupling this module to the hook's full surface. */
export interface BeatRunnerOnboarding {
  idx: number;
  frame: { key: string };
  go: (next: number) => void;
}

export interface BeatRunnerApi {
  phase: SessionPhase;
  failure: SessionFailure;
  speaking: boolean;
  hearing: boolean;
  connect: () => void;
  /**
   * The current beat's exact script line, set the moment its audio actually starts
   * (never at beat-entry, never the model's own transcript — UI-SPEC §3). `null`
   * before the first beat's audio has arrived, or after a drop — the caller falls
   * back to `frame.agentLine` in both cases.
   */
  agentLine: string | null;
}

/**
 * `audioRef` is a plain hook argument (not bundled into the returned API object) —
 * mixing a ref with plain return state in one object makes the react-compiler lint
 * treat every field on that object as ref-derived, flagging ordinary reads like
 * `.phase` as an unsafe render-time ref access.
 */
export function useBeatRunner(onboarding: BeatRunnerOnboarding, audioRef: RefObject<HTMLAudioElement | null>): BeatRunnerApi {
  const [agentLine, setAgentLine] = useState<string | null>(null);
  const currentBeatRef = useRef<Beat | null>(null);
  const firedToolsRef = useRef<Set<string>>(new Set());
  const speechStartedAtRef = useRef<number | null>(null);
  const audioArrivedRef = useRef(false);
  const audioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onboardingRef = useRef(onboarding);
  useEffect(() => {
    onboardingRef.current = onboarding;
  });

  const fireTools = useCallback((beat: Beat): boolean => {
    if (firedToolsRef.current.has(beat.key)) return false; // already fired — never fire twice
    firedToolsRef.current.add(beat.key);
    let allOk = true;
    for (const call of beat.tools) {
      try {
        const result = TOOL_HANDLERS[call.name](call.args);
        if (!result.ok) allOk = false;
      } catch {
        allOk = false;
      }
    }
    return allOk;
  }, []);

  const enterBeat = useCallback((
    beat: Beat,
    send: (event: RealtimeEvent) => void,
    disconnect: (failure?: SessionFailure) => void,
  ) => {
    currentBeatRef.current = beat;
    audioArrivedRef.current = false;
    send({
      type: "response.create",
      response: { instructions: verbatim(beat.line), metadata: { beat: beat.key }, conversation: "none" },
    });
    if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
    audioTimeoutRef.current = setTimeout(() => {
      if (!audioArrivedRef.current) disconnect("dropped");
    }, AUDIO_TIMEOUT_MS);
  }, []);

  const handleEvent = useCallback((event: RealtimeEvent) => {
    if (event.type === "output_audio_buffer.started") {
      audioArrivedRef.current = true;
      if (audioTimeoutRef.current) { clearTimeout(audioTimeoutRef.current); audioTimeoutRef.current = null; }
      setAgentLine(currentBeatRef.current?.line ?? null);
    }

    if (event.type === "input_audio_buffer.speech_started") {
      speechStartedAtRef.current = Date.now();
      return;
    }

    if (event.type === "input_audio_buffer.speech_stopped") {
      const startedAt = speechStartedAtRef.current;
      speechStartedAtRef.current = null;
      if (startedAt == null) return;
      if (Date.now() - startedAt < MIN_SPEECH_MS) return; // a cough or an "mm" cannot advance a take

      const beat = currentBeatRef.current;
      if (!beat || beat.advanceOn !== "speech_stopped") return;

      const { go, idx } = onboardingRef.current;
      setTimeout(() => {
        if (fireTools(beat)) go(idx + 1);
      }, SETTLE_MS);
    }
  }, [fireTools]);

  const session = useRealtimeSession(audioRef, { onEvent: handleEvent });

  // Enter the first beat exactly once, the moment the session goes live. Subsequent
  // frame changes (driven by go() above) do not re-enter a beat in this plan's scope.
  useEffect(() => {
    if (session.phase === "live" && currentBeatRef.current === null) {
      enterBeat(BEATS[0], session.send, session.disconnect);
    }
  }, [session.phase, session.send, session.disconnect, enterBeat]);

  useEffect(() => () => {
    if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
  }, []);

  // A drop falls back to frame.agentLine immediately (UI-SPEC §3) — never show a stale
  // spoken line once the session is no longer live. Adjusted during render (React's own
  // "adjusting state when a prop changes" pattern), not from inside an effect.
  if (session.phase !== "live" && agentLine !== null) {
    setAgentLine(null);
  }

  return {
    phase: session.phase,
    failure: session.failure,
    speaking: session.speaking,
    hearing: session.hearing,
    connect: session.connect,
    agentLine,
  };
}
