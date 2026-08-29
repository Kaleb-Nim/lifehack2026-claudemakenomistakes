"use client";

// Merchant onboarding — one conversational screen, states A → G.
// Layout ported from FrameQuiet2.dc.html (Claude Design "Merchant Onboarding v3"); copy from lib/merchant-data.ts.
// Everything is hardcoded and timer-driven. Controls for recording:
//   →/Space next state · ← previous · ?state=C deep-link · ?auto=1 runs the demo-script timing sheet
//   The two pill questions, the drop bar buttons and Go live are the only pointer interactions.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FRAMES, HERO, LIVE_LINE, PRODUCTS, PRODUCT_NAME, SHOP_NAME,
  type Card, type Frame, type LogLine,
} from "../lib/merchant-data";

const LOG_STAGGER_MS = 600;   // brief §6: log lines appear one at a time ~0.6 s apart
const CARD_READ_MS = 4000;    // brief §6: card `reading…` ≈ 4 s
const CARD_STAGGER_MS = 1500; // uploads land one after another

const MARK: Record<LogLine["mark"], string> = { ok: "✓", q: "?", flag: "!", struck: "✓" };

// ── Icons (Lucide line SVGs, as in the design) ──────────────────────────────
const Svg = ({ d, size = 15, stroke = "currentColor", w = 1.8 }: { d: string[]; size?: number; stroke?: string; w?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    {d.map((p) => <path key={p} d={p} />)}
  </svg>
);
const PENCIL = ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"];
const TRASH = ["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6"];
const CHECK = ["M20 6 9 17l-5-5"];
const CHEV = ["m6 9 6 6 6-6"];
const OPEN = ["M7 17 17 7", "M7 7h10v10"];
const UPLOAD = ["M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7", "M12 3v13", "m7 8 5-5 5 5"];
const TYPE = ["M4 7V5h16v2", "M9 19h6", "M12 5v14"];

// ── Typewriter for the owner's live caption ─────────────────────────────────
function useTypewriter(text: string | undefined, cps = 28) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    const id = setInterval(() => setN((k) => (k >= text.length ? (clearInterval(id), k) : k + 1)), 1000 / cps);
    return () => clearInterval(id);
  }, [text, cps]);
  return text ? text.slice(0, n) : "";
}

export default function Onboarding() {
  const params = useSearchParams();
  const router = useRouter();
  const auto = params.get("auto") === "1";
  const initial = Math.max(0, FRAMES.findIndex((f) => f.key === (params.get("state") ?? "A").toUpperCase()));

  const [idx, setIdx] = useState(initial);
  const [live, setLive] = useState(false);
  const [reading, setReading] = useState<Set<string>>(new Set());
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});
  const [over, setOver] = useState(false);
  const [scale, setScale] = useState(1);
  const prevIdx = useRef(idx);

  const frame: Frame = FRAMES[idx];
  const prev: Frame | undefined = FRAMES[prevIdx.current];

  // Fit the 1920×1080 stage to the window (recording target is 1:1 at 1080p).
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const go = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(FRAMES.length - 1, next));
    prevIdx.current = idx;
    setIdx(clamped);
    setLive(false);
    setOpenOverride({});
    const q = new URLSearchParams(params.toString());
    q.set("state", FRAMES[clamped].key);
    router.replace(`?${q.toString()}`);
  }, [idx, params, router]);

  // Keyboard navigation for recording.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(idx + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, go]);

  // ?auto=1 — advance on the timing sheet.
  useEffect(() => {
    if (!auto || idx >= FRAMES.length - 1) return;
    const t = setTimeout(() => go(idx + 1), frame.seconds * 1000);
    return () => clearTimeout(t);
  }, [auto, idx, frame.seconds, go]);

  // Cards new to this frame start in `reading…` and flip after ~4 s, landing one after another.
  useEffect(() => {
    const before = new Set((prev?.cards ?? []).map((c) => c.file));
    const fresh = frame.cards.filter((c) => !before.has(c.file)).map((c) => c.file);
    if (!fresh.length || prevIdx.current > idx) { setReading(new Set()); return; }
    setReading(new Set(fresh));
    const timers = fresh.map((file, i) =>
      setTimeout(() => setReading((s) => { const n = new Set(s); n.delete(file); return n; }), CARD_READ_MS + i * CARD_STAGGER_MS),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // Log lines new to this frame rise in one at a time.
  const prevTexts = useMemo(() => new Set((prev?.log ?? []).map((l) => l.text + l.mark)), [prev]);
  let newCount = 0;
  const logDelay = (l: LogLine) => (prevTexts.has(l.text + l.mark) ? 0 : (newCount++) * LOG_STAGGER_MS);

  const caption = useTypewriter(frame.caption);
  const typing = !!frame.caption && caption.length < frame.caption.length;
  const orbState = live ? "speaking" : typing ? "listening" : frame.orb;
  const orbLabel = live ? "Speaking" : typing ? "Listening to you" : frame.orbLabel;
  const agentLine = live ? LIVE_LINE : frame.agentLine;
  const header = live ? "Live" : frame.header;

  const isOpen = (c: Card) => openOverride[c.file] ?? (!!c.open && !reading.has(c.file));
  const toggle = (c: Card) => setOpenOverride((o) => ({ ...o, [c.file]: !isOpen(c) }));

  // Drop bar → simulate the uploads landing (jump to State C from A/B).
  const simulateUpload = () => { if (idx < 2) go(2); };

  return (
    <div className="viewport">
      <div className="stage" style={{ transform: `scale(${scale})` }}>
        {/* Header */}
        <div className="hdr">
          <div className="hdr-brand">{PRODUCT_NAME}</div>
          <div className="hdr-chip"><div className="hdr-dot" /><span>{header}</span></div>
        </div>

        <div className="body">
          {/* Left — Locked in */}
          <div className="left">
            <div className="left-head">
              <div className="col-label">Locked in</div>
              <div className="left-count">{frame.log.length ? `${frame.log.length} decisions · editable` : ""}</div>
            </div>
            {frame.log.length === 0 && (
              <div className="col-empty" style={{ maxWidth: 330 }}>Nothing yet. Everything I understand shows up here — you can edit or remove any line.</div>
            )}
            <div className="log">
              {frame.log.map((l) => (
                <div key={l.text} className={`row ${l.mark}${l.tools ? " tools" : ""}`} style={{ animationDelay: `${logDelay(l)}ms` }}>
                  <div className="row-mark">{MARK[l.mark]}</div>
                  <div className="row-text">{l.text}</div>
                  {l.tools ? (
                    <div className="row-tools">
                      <button className="row-tool" title="Edit"><Svg d={PENCIL} stroke="var(--color-text)" /></button>
                      <button className="row-tool" title="Delete"><Svg d={TRASH} stroke="var(--color-accent-700)" /></button>
                      <button className="row-tool confirm" title="Re-confirm"><Svg d={CHECK} stroke="var(--color-neutral-100)" w={2} /></button>
                    </div>
                  ) : (
                    <button className="row-edit" title="Edit"><Svg d={PENCIL} size={13} stroke="var(--color-neutral-700)" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Centre — voice orb */}
          <div className="centre">
            <div className={`orb ${orbState}${orbState !== "idle" ? " live" : ""}`}>
              <div className="orb-halo" />
              <div className="orb-core-wrap"><div className="orb-core" /></div>
              <div className="orb-ring ring-a"><div /></div>
              <div className="orb-ring ring-b"><div /></div>
              <div className="orb-ring ring-c"><div /></div>
              <div className="orb-ring ring-d"><div /></div>
            </div>
            <div className="centre-text">
              <div className="orb-label">{orbLabel}</div>
              <div className="agent-line" key={agentLine}>{agentLine}</div>
              {frame.caption && !live && (
                <div className="caption">
                  <div className="caption-text">{caption}<span className="caret" /></div>
                </div>
              )}
              {frame.pills && !live && (
                <div className="pills">
                  {frame.pills.map((p) => (
                    <button key={p.label} className={`pill${p.primary ? " primary" : ""}`} onClick={() => go(idx + 1)}>{p.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — Context / listing */}
          <div className="right">
            <div className="col-label">{frame.rightLabel ?? "Context"}</div>
            {frame.cards.length === 0 && !frame.listing && (
              <div className="col-empty" style={{ maxWidth: 380 }}>Files, photos and links appear here as plain rows. Open one to see exactly what I read.</div>
            )}

            {frame.cards.length > 0 && (
              <div className="cards">
                {frame.cards.map((c, i) => {
                  const isReading = reading.has(c.file);
                  const open = !isReading && isOpen(c);
                  const delay = (prev?.cards ?? []).some((p) => p.file === c.file) ? 0 : i * CARD_STAGGER_MS;
                  return (
                    <button key={c.file} className={`card${open ? " open" : ""}`} style={{ animationDelay: `${delay}ms` }} onClick={() => !isReading && toggle(c)}>
                      <div className="card-head">
                        <div className="card-title">
                          <div className="card-file">{c.file}</div>
                          <div className="card-what">{c.what}</div>
                        </div>
                        <div className={`card-status${c.live && !isReading ? " live" : ""}`}>{isReading ? "reading…" : c.status}</div>
                        <div className="card-chev"><Svg d={CHEV} size={16} stroke="var(--color-neutral-800)" w={2} /></div>
                      </div>
                      {isReading && <div className="prog"><div /></div>}
                      {!isReading && <div className="card-summary">{c.summary}</div>}
                      {open && (
                        <div className="card-detail">
                          {c.thumbs && <div className="thumbs">{c.thumbs.map((t) => <div key={t} className="thumb">{t}</div>)}</div>}
                          <div className="mono">{c.lines}</div>
                          <div className="card-link"><span>Open the original file</span><Svg d={OPEN} stroke="var(--color-accent-700)" w={2} /></div>
                        </div>
                      )}
                      {!open && !isReading && <div className="card-more">View details</div>}
                    </button>
                  );
                })}
              </div>
            )}

            {frame.listing && (
              <div className="listing">
                <div className="hero">
                  <div className="hero-head">
                    <div className="hero-name">{HERO.name}</div>
                    <div className="hero-price"><b>{HERO.price}</b><div className="hero-tag">{HERO.priceNote}</div></div>
                  </div>
                  <div className="hero-specs">{HERO.specs.map((s) => <div key={s}>{s}</div>)}</div>
                  <div className="hero-foot"><div>{HERO.stock}</div><div>{HERO.extra}</div></div>
                  <div className="hero-foot"><div>{HERO.collect}</div></div>
                </div>
                <div className="products">
                  {PRODUCTS.map((p, i) => (
                    <div key={p.name} className="product" style={{ animationDelay: `${300 + i * 90}ms` }}>
                      <div className="product-name">{p.name}</div>
                      <div className="product-price">{p.price}</div>
                      <div className="product-stock">{p.stock}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom — Go live / composer */}
        <div className="foot">
          {frame.goLive ? (
            <div className="golive">
              <button className={`golive-btn${live ? " done" : ""}`} onClick={() => setLive(true)}>
                {live ? `Live — shoppers can find ${SHOP_NAME}` : `Go live — shoppers can find ${SHOP_NAME}`}
              </button>
              <div className="golive-note">11 products · readable by the shopping agent</div>
            </div>
          ) : (
            <div className="drop">
              <div className="drop-hint">{frame.dropText}</div>
              <div
                className={`drop-bar${over ? " over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); simulateUpload(); }}
              >
                <Svg d={UPLOAD} size={24} stroke="var(--color-text)" w={1.7} />
                <div className="drop-text">Drop files here, paste your store link, or type it out</div>
                <div className="drop-actions">
                  <button className="btn-dark" onClick={simulateUpload}>Upload files</button>
                  <button className="btn-outline" onClick={simulateUpload}>Paste URL</button>
                  <div className="vsep" />
                  <button className="btn-type"><Svg d={TYPE} size={19} stroke="var(--color-text)" /><span>Type instead</span></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
