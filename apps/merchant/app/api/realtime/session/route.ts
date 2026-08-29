// Mints an ephemeral OpenAI Realtime client secret, server-side only.
// The real OPENAI_API_KEY never leaves this file — the browser only ever receives the
// short-lived client secret this route returns.
//
// Request/response shapes are pinned by 02-RESEARCH.md, verified against current OpenAI
// docs on 2026-08-29 — they override training data. In particular: the mint endpoint
// below is the GA client-secrets one (the pre-GA sessions endpoint is deprecated), the
// response's secret is at `value` (not `client_secret`), and session audio config nests
// under audio.input / audio.output.

import { NextResponse } from "next/server";
import { SYSTEM_PROMPT, TOOLS, TURN_DETECTION } from "../../../../lib/agent-script";

// Callable more than once per page load (a mid-take reconnect needs a fresh secret) —
// forbid caching so every POST actually re-mints. See node_modules/next/dist/docs
// .../02-route-segment-config/index.md and .../02-guides/caching-without-cache-components.md.
export const dynamic = "force-dynamic";

const CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "no_key" }, { status: 503 });
  }

  const model = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";
  const voice = process.env.OPENAI_REALTIME_VOICE || "marin";

  // Nested under audio.input / audio.output per RESEARCH.md — never the deprecated flat
  // top-level `voice` / `turn_detection` / `input_audio_transcription` session keys.
  const audio = {
    input: {
      transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
      // The whole scripted-brain contract (02-RESEARCH.md). Shared with the beat runner
      // via lib/agent-script.ts so silence_duration_ms cannot drift out of sync with the
      // min-speech measurement that subtracts it.
      turn_detection: TURN_DETECTION,
    },
    output: { voice },
  };

  const mintRes = await fetch(CLIENT_SECRETS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      expires_after: { anchor: "created_at", seconds: 600 },
      session: {
        type: "realtime",
        model,
        instructions: SYSTEM_PROMPT,
        tools: TOOLS,
        tool_choice: "none", // the client fires tool handlers itself; the model must never self-call one
        audio,
      },
    }),
  });

  if (!mintRes.ok) {
    return NextResponse.json({ error: "mint_failed" }, { status: 502 });
  }

  const minted = await mintRes.json();
  const clientSecret = minted?.value;
  if (typeof clientSecret !== "string" || !clientSecret) {
    return NextResponse.json({ error: "mint_failed" }, { status: 502 });
  }

  return NextResponse.json({
    client_secret: clientSecret,
    model,
    voice,
    expires_at: minted?.expires_at,
  });
}
