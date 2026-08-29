"use client";

// Joins hooks/useRealtimeSession.ts (transport) to lib/agent-script.ts (beat table) so a
// live Realtime session replies to the owner's own turns, walks the eight beats A → G, and
// fires each beat's canned tool calls — never a timer — the moment its own `advanceOn`
// condition is satisfied, then advances the onboarding page a frame (CONTEXT.md:
// "Snapshot-first, not a reducer rewrite").
//
// The agent's WORDS are no longer decided here — the session config sent at mint time (the
// contents of lib/agent-context.md, read server-side per mint) carries the whole context
// bias, and the model answers freely inside it. This module's only job is the screen: open
// the conversation once the session goes live, answer again on every qualified owner turn
// (never more than one response in flight at once), and walk the beat cursor on whichever
// signal each beat is waiting for — speech, an upload landing, a pill tap, an operator
// action, or the agent's own audio finishing — while a beat whose condition is not speech
// ignores speech events for advancing entirely (the owner can talk through it and still
// only ever get a reply, never an early cut). See 02-02-PLAN.md Tasks 2 and 3.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useRealtimeSession, type RealtimeEvent, type SessionFailure, type SessionPhase } from "../hooks/useRealtimeSession";
import { AUDIO_TIMEOUT_MS, BEATS, ECHO_GRACE_MS, MIN_REPLY_MS, MIN_SPEECH_MS, SETTLE_MS, TOOL_HANDLERS, VAD_SILENCE_DURATION_MS, beatIndexOf, type AdvanceOn, type Beat } from "./agent-script";

/** The slice of useOnboardingState() the runner needs — kept structural, not imported, to avoid coupling this module to the hook's full surface. */
export interface BeatRunnerOnboarding {
  idx: number;
  frame: { key: string };
  go: (next: number) => void;
}

/**
 * Advance signals the surrounding page reports explicitly — an upload landing, a pill tap,
 * or an operator action like Go live. The other two `AdvanceOn` values (`speech_stopped`,
 * `audio_done`) are never reported this way; the runner detects both itself from Realtime
 * session events.
 */
export type ExternalAdvanceSignal = Extract<AdvanceOn, "upload" | "pill" | "operator">;

export interface BeatRunnerApi {
  phase: SessionPhase;
  failure: SessionFailure;
  speaking: boolean;
  hearing: boolean;
  connect: () => void;
  /**
   * Operator override (key `R`, wired from hooks/useOnboardingState.ts): nudges a stalled
   * agent to speak again with a fresh bare reply, or — if the session has dropped —
   * re-attempts the connection first. Always safe to call, including with no session ever
   * started; it no-ops rather than throwing.
   */
  repeat: () => void;
  /**
   * Reports a non-speech advance signal to the current beat. A no-op if the current beat
   * isn't waiting on that particular signal (e.g. a pill tap while the take is still on
   * beat A) — callers never need to check `advanceOn` themselves before calling this.
   */
  notify: (signal: ExternalAdvanceSignal) => void;
  /** 1-indexed position of the current beat within BEATS, for the operator teleprompter (plan 02-03). 0 before any beat has been entered. */
  beatNumber: number;
  /** Total beat count (BEATS.length). */
  beatTotal: number;
}

/**
 * `audioRef` is a plain hook argument (not bundled into the returned API object) —
 * mixing a ref with plain return state in one object makes the react-compiler lint
 * treat every field on that object as ref-derived, flagging ordinary reads like
 * `.phase` as an unsafe render-time ref access.
 */
export function useBeatRunner(onboarding: BeatRunnerOnboarding, audioRef: RefObject<HTMLAudioElement | null>): BeatRunnerApi {
  const [beatIndex, setBeatIndex] = useState(-1);
  const currentBeatRef = useRef<Beat | null>(null);
  /** When the current beat became current — the clock a `minDwellMs` is measured against. */
  const beatEnteredAtRef = useRef(0);
  /** Beats already advanced past — a beat's tools fire, and it moves the cursor, exactly once. */
  const advancedBeatsRef = useRef<Set<string>>(new Set());
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStartedAtRef = useRef<number | null>(null);
  const audioArrivedRef = useRef(false);
  /** True while the agent's own audio is playing out of the speakers. */
  const agentSpeakingRef = useRef(false);
  /** When the agent's audio last stopped — inbound speech within ECHO_GRACE_MS of this is the agent's own tail. */
  const agentStoppedAtRef = useRef(0);
  /** True between a `response.created` and its matching `response.done` — a second reply is suppressed while this is true, silently, so a rejected turn is never dead air. */
  const activeResponseRef = useRef(false);
  const audioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onboardingRef = useRef(onboarding);
  useEffect(() => {
    onboardingRef.current = onboarding;
  });

  // session.send / session.disconnect are needed inside handleEvent, but handleEvent is
  // itself the callback passed to useRealtimeSession() below — mirrored through refs (kept
  // current by a no-dependency effect, same idiom as onboardingRef above) rather than
  // closed over directly, which would be a circular reference. session.phase / .connect are
  // mirrored the same way so `repeat` below never needs the whole session object (returned
  // fresh every render) in its dependency array.
  const sendRef = useRef<(event: RealtimeEvent) => void>(() => {});
  const disconnectRef = useRef<(failure?: SessionFailure) => void>(() => {});
  const phaseRef = useRef<SessionPhase>("idle");
  const connectRef = useRef<() => void>(() => {});

  const fireTools = useCallback((beat: Beat): boolean => {
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

  const enterBeat = useCallback((beat: Beat) => {
    currentBeatRef.current = beat;
    beatEnteredAtRef.current = Date.now();
    setBeatIndex(beatIndexOf(beat.key));
  }, []);

  /**
   * The sole place a bare reply is requested. Silently suppressed while a response is
   * already in flight — the API would reject a second one, and a rejected turn is dead air
   * on camera, so suppression must never surface an error or consume the turn's advance.
   */
  const sendResponseCreate = useCallback(() => {
    if (activeResponseRef.current) return;
    audioArrivedRef.current = false;
    sendRef.current({ type: "response.create", response: {} });
    if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
    audioTimeoutRef.current = setTimeout(() => {
      if (!audioArrivedRef.current) disconnectRef.current("dropped");
    }, AUDIO_TIMEOUT_MS);
  }, []);

  // `advance` schedules itself for a beat's remaining dwell (see below) — a ref mirror, kept
  // current by a no-dependency effect (same idiom as sendRef/disconnectRef above), is what
  // that self-schedule calls, rather than the `const` closing over itself directly.
  const advanceRef = useRef<(beat: Beat) => void>(() => {});

  /**
   * The only place a beat is left. Fires its tools, moves the onboarding frame forward, and
   * advances the cursor to the next beat in BEATS (if any) — never twice for the same beat.
   * A `minDwellMs` holds this off rather than dropping it: the condition stays satisfied, so
   * this re-checks itself once the remaining dwell has elapsed.
   */
  const advance = useCallback((beat: Beat) => {
    if (advancedBeatsRef.current.has(beat.key)) return;
    const dwell = beat.minDwellMs ?? 0;
    const elapsed = Date.now() - beatEnteredAtRef.current;
    if (elapsed < dwell) {
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = setTimeout(() => advanceRef.current(beat), dwell - elapsed);
      return;
    }
    advancedBeatsRef.current.add(beat.key);
    setTimeout(() => {
      fireTools(beat);
      const { go, idx } = onboardingRef.current;
      go(idx + 1);
      const nextBeat = BEATS[beatIndexOf(beat.key) + 1];
      if (nextBeat) enterBeat(nextBeat);
    }, SETTLE_MS);
  }, [fireTools, enterBeat]);

  useEffect(() => {
    advanceRef.current = advance;
  });

  const notify = useCallback((signal: ExternalAdvanceSignal) => {
    const beat = currentBeatRef.current;
    if (!beat || beat.advanceOn !== signal) return;
    advance(beat);
  }, [advance]);

  const handleEvent = useCallback((event: RealtimeEvent) => {
    if (event.type === "response.created") {
      activeResponseRef.current = true;
    }
    if (event.type === "response.done") {
      activeResponseRef.current = false;
    }

    if (event.type === "output_audio_buffer.started") {
      audioArrivedRef.current = true;
      agentSpeakingRef.current = true;
      if (audioTimeoutRef.current) { clearTimeout(audioTimeoutRef.current); audioTimeoutRef.current = null; }
    }

    if (event.type === "output_audio_buffer.stopped" || event.type === "output_audio_buffer.cleared") {
      agentSpeakingRef.current = false;
      agentStoppedAtRef.current = Date.now();
      // Any speech window still open here began under the agent's own voice — discard it
      // rather than letting it be measured as an owner turn.
      speechStartedAtRef.current = null;

      // Beat C's own signal: the agent's audio finishing (never `.cleared`, which is an
      // interruption — not applicable here since barge-in is gated off).
      if (event.type === "output_audio_buffer.stopped") {
        const beat = currentBeatRef.current;
        if (beat && beat.advanceOn === "audio_done") advance(beat);
      }
    }

    if (event.type === "input_audio_buffer.speech_started") {
      // Echo rejection. Speech that begins while the agent is talking, or in the short tail
      // after it stops, is the agent's own audio coming back through the speakers — not the
      // owner. Recording without a headset produces this on every single beat.
      if (agentSpeakingRef.current || Date.now() - agentStoppedAtRef.current < ECHO_GRACE_MS) {
        speechStartedAtRef.current = null;
        return;
      }
      speechStartedAtRef.current = Date.now();
      return;
    }

    if (event.type === "input_audio_buffer.speech_stopped") {
      const startedAt = speechStartedAtRef.current;
      speechStartedAtRef.current = null;
      if (startedAt == null) return; // no owner turn was open — echo, or already discarded

      // Server VAD only emits speech_stopped after silence_duration_ms of quiet, so the
      // wall-clock span between the two events over-reports the real speech by that much.
      // Subtracting it is what makes both thresholds below mean what they say.
      const spokenMs = Date.now() - startedAt - VAD_SILENCE_DURATION_MS;
      if (spokenMs < MIN_REPLY_MS) return; // a cough or an "mm" — no reply, no advance

      // Replying and advancing are separate questions. Every qualifying turn gets a
      // response; only a turn past MIN_SPEECH_MS on a beat that is itself waiting on speech
      // also moves the take — a beat waiting on an upload, a pill, an operator action, or
      // the agent's own audio ignores speech for advancing entirely, on any length of turn.
      sendResponseCreate();
      if (spokenMs < MIN_SPEECH_MS) return; // answered, but too short to advance the frame

      const beat = currentBeatRef.current;
      if (!beat || beat.advanceOn !== "speech_stopped") return;
      advance(beat);
    }
  }, [advance, sendResponseCreate]);

  const session = useRealtimeSession(audioRef, { onEvent: handleEvent });

  useEffect(() => {
    sendRef.current = session.send;
    disconnectRef.current = session.disconnect;
    phaseRef.current = session.phase;
    connectRef.current = session.connect;
  });

  // Enter the first beat and open the conversation exactly once, the moment the session
  // goes live — a bare reply, not a scripted line; the session config sent at mint time is
  // what does the talking.
  useEffect(() => {
    if (session.phase === "live" && currentBeatRef.current === null) {
      enterBeat(BEATS[0]);
      sendResponseCreate();
    }
  }, [session.phase, enterBeat, sendResponseCreate]);

  useEffect(() => () => {
    if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
    if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
  }, []);

  const repeat = useCallback(() => {
    if (phaseRef.current !== "live") {
      connectRef.current();
      return;
    }
    sendResponseCreate();
  }, [sendResponseCreate]);

  return {
    phase: session.phase,
    failure: session.failure,
    speaking: session.speaking,
    hearing: session.hearing,
    connect: session.connect,
    repeat,
    notify,
    beatNumber: beatIndex + 1,
    beatTotal: BEATS.length,
  };
}
