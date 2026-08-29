# MERCH-03 — Integration seam

**Status:** the library layer (storage, thumbnails, matcher, canned extracts) and the
`/api/upload` route are built and tested. **Nothing is wired into `components/Onboarding.tsx` or
into a `read_source` tool handler** — both files are owned by the concurrent MERCH-02 agent and
were off-limits to this plan. This document is the contract whoever does that wiring should build
against, plus the assumptions made about MERCH-02's code that need re-checking once it lands.

## What was built (net-new, all under `apps/merchant/`)

| File | Exports | Purpose |
|---|---|---|
| `lib/uploads.ts` | `StoredSource`, `SourceKind`, `newSourceId`, `saveSourceFile`, `listSources`, `getSourceById`, `getSourceByName`, `addSource`, `removeSource`, `createWebsiteSource`, `InvalidWebsiteUrlError` | Disk-backed storage + JSON index under `uploads/` |
| `lib/thumbnails.ts` | `pdfFirstPageThumbnail(buffer)`, `imageThumbnail(buffer, mimeType)` | Real thumbnail generation (see caveat below) |
| `lib/canned-extracts.ts` | `CannedExtract`, `CANNED_WEBSITE`, `CANNED_PRICELIST`, `CANNED_FLYER`, `CANNED_PHOTOS`, `GENERIC_PDF_EXTRACT`, `GENERIC_IMAGE_EXTRACT`, `GENERIC_WEBSITE_EXTRACT` | Content copied verbatim from `lib/merchant-data.ts`'s `CARD_*` constants (no import — that file is owned elsewhere) |
| `lib/source-matcher.ts` | `matchCannedExtract(source: MatchableSource): CannedExtract` | UP-04 pattern matching, kind + filename/host |
| `app/api/upload/route.ts` | `POST`, `GET` | Multipart file upload, JSON website submission, listing |

## 1. What `components/Onboarding.tsx` calls on drop / paste / file-pick

The drop target already exists (`.drop-bar`, lines ~276–286): `onDrop`, and the "Upload files" /
"Paste URL" buttons, all currently wired to a placeholder `simulateUpload()` that just calls
`go(2)`. Real wiring replaces those three call sites.

**On file drop or file-pick** (one call per file dropped/picked):

```ts
async function uploadFile(file: File): Promise<StoredSource> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error((await res.json()).error ?? `upload failed: ${res.status}`);
  return res.json(); // StoredSource
}
```

**On paste-URL** (the "Paste URL" button / a pasted link):

```ts
async function uploadWebsite(url: string): Promise<StoredSource> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? `upload failed: ${res.status}`);
  return res.json(); // StoredSource
}
```

**On mount / reload** (rehydrating rows for UP-02's "`?state` reload keeps the rows"):

```ts
const res = await fetch("/api/upload"); // GET
const sources: StoredSource[] = await res.json();
```

`StoredSource` (returned by all three) is exported from `lib/uploads.ts`:

```ts
interface StoredSource {
  id: string;
  kind: "pdf" | "image" | "website";
  name: string;        // filename, or hostname for website
  sizeBytes: number;
  pageCount?: number;  // pdf only
  host?: string;        // website only
  thumbUrl?: string;    // data: URI (pdf/image) or external favicon URL (website)
  storedAt: string;     // ISO 8601
}
```

**What the caller renders immediately** (UP-01 — "Context row appears at once"): a `Card`-shaped
row using `source.name`, `source.sizeBytes`, `source.pageCount` and `source.thumbUrl` for display,
with `status` forced to `"reading…"` — see §4 below for how the canned `what`/`status`/`summary`/
`lines` get filled in ~4s later.

## 2. What the `read_source` tool handler calls

MERCH-02's plan (`.planning/phases/MERCH-02-real-time-voice-scripted-brain/02-03-PLAN.md`) fixes
`read_source`'s scripted shape: it takes a `file` argument (a string matching a `Card.file`/name)
and returns a canned payload built from `lib/merchant-data.ts`'s `FRAMES`/`CARD_*`. Per
`.planning/ROADMAP.md`'s Phase 3 plan list, item **03-02 is exactly this**: "Source matcher →
canned extract; agent `read_source` tool consumes the real file metadata + canned content." That
wiring is deferred (it requires editing `lib/agent-script.ts`, off-limits here), but the function
it should call is built and tested:

```ts
import { matchCannedExtract, type MatchableSource } from "@/lib/source-matcher";
import { getSourceByName } from "@/lib/uploads"; // or getSourceById, if the handler is given an id

// inside the read_source handler, given the tool-call argument `file: string`:
const source = await getSourceByName(file);
if (!source) {
  // fall back to the Phase 1/2 scripted CARD_* lookup — file wasn't a real upload
}
const extract = matchCannedExtract(source); // { what, status, summary, lines }
```

`matchCannedExtract` takes the minimal shape it needs, not a full `StoredSource`, so the handler
doesn't have to thread the whole object through:

```ts
interface MatchableSource { kind: SourceKind; name: string; host?: string }
interface CannedExtract { what: string; status: string; summary: string; lines: string }
```

The returned `CannedExtract`'s four fields are named to match `Card` 1:1 (see §3) — the handler's
job is just to combine it with the `StoredSource`'s real metadata to build the final `Card`.

## 3. `StoredSource` → `Card` field mapping

`Card` (from `lib/merchant-data.ts`, read-only reference — do not import from a lib file that
isn't `merchant-data.ts` itself):

```ts
interface Card {
  file: string;      // React key AND identity — see assumption below
  what: string;
  status: string;
  live?: boolean;
  thumbs?: string[];
  summary: string;
  lines: string;
  open?: boolean;
}
```

| `Card` field | Source | Notes |
|---|---|---|
| `file` | `source.name` (pdf/image) or `source.host` (website) | **See assumption 1 — collision risk.** |
| `what` | `matchCannedExtract(source).what` | Not from `StoredSource` — only the canned lookup knows this. |
| `status` | `"reading…"` for ~4s, then `matchCannedExtract(source).status` | Enforced at the call site, see §4. |
| `live` | Not derivable from `StoredSource`. Leave `undefined`/`false` for real uploads. | The scripted demo uses `live: true` on `CARD_SITE`/`CARD_FLYER` to mean "has a conflict flagged in the log" — real uploads have no log-flag mechanism yet. |
| `thumbs` | **Only used for the photo-batch card.** Current `CARD_PHOTOS.thumbs` is `["IMG_2201", "IMG_2202", "IMG_2203"]` — plain filename *labels*, not image URLs. `components/Onboarding.tsx:225` renders each as `<div className="thumb">{t}</div>` (text content, not an `<img>`). **See assumption 2.** |
| `summary` | `matchCannedExtract(source).summary` | |
| `lines` | `matchCannedExtract(source).lines` | |
| `open` | UI-only expand/collapse state, not derived from `StoredSource`. | |

`thumbUrl` (a real data-URI thumbnail) has **no current home in `Card`** — `Card` has no single-
image-URL field. See assumption 2 for two ways to reconcile this without editing `merchant-data.ts`.

## 4. Enforcing UP-05's fixed ~4s "reading…" duration

`components/Onboarding.tsx` already has exactly this mechanism for the *scripted* cards —
`CARD_READ_MS = 4000` (line 17) and a `reading: Set<string>` keyed by `Card.file`, populated when a
frame transition introduces "fresh" cards and cleared via `setTimeout(..., CARD_READ_MS)` (lines
101–108). **That mechanism is entirely driven by frame-diffing** (`FRAMES[idx].cards` vs.
`FRAMES[idx-1].cards`) and fires only on scripted frame transitions — it has no path for a card
that appears because the owner actually dragged a file in mid-conversation.

Real uploads need a parallel (not necessarily shared) mechanism, because they happen at arbitrary
times outside the frame script:

```ts
// call site: right after uploadFile()/uploadWebsite() resolves
const source = await uploadFile(file);
addCard({ file: cardFileFor(source), what: "…", status: "reading…", /* thumb, etc. */ });
setReading((s) => new Set(s).add(cardFileFor(source)));
setTimeout(() => {
  const extract = matchCannedExtract(source); // client-side call, or fetched from a route
  updateCard(cardFileFor(source), extract);
  setReading((s) => { const n = new Set(s); n.delete(cardFileFor(source)); return n; });
}, 4000); // reuse the existing CARD_READ_MS constant rather than a new literal
```

Key point: **the fixed delay must live at this call site (client-side timer), not inside
`/api/upload`.** The route resolves almost immediately (thumbnail generation is sub-second) — if
the 4s were baked into the route's response time instead, concurrent drops would serialize behind
each other and multi-file drops would visibly stall. `matchCannedExtract` is synchronous and pure,
so it's safe to call directly in the client after the timer, or from a tiny server action / route
if the tool handler needs the lookup server-side instead.

## 5. Assumptions about MERCH-02's code — re-check at merge time

1. **`Card.file` doubles as both display text and unique identity.** `components/Onboarding.tsx`
   uses it as the React `key` (line 212), the `openOverride` map key (line 126–127), the `reading`
   Set member (line 105–108), and the dedup check for "which cards are new to this frame" (line
   103–104). The scripted demo gets away with this because its four `CARD_*.file` values are
   hardcoded and unique. **Real uploads can collide** — two different photos both named `IMG_2201.jpg`
   dropped in the same session would silently merge into one row. Two ways to fix, neither touches
   `merchant-data.ts`:
   - Reject/rename on collision in the upload flow (e.g. `uploads.ts`'s `getSourceByName` could be
     used client-side to detect a name clash and suffix it, `IMG_2201 (2).jpg`, before calling
     `addCard`).
   - Or extend `Card` with an optional `id?: string` in `merchant-data.ts` and use `id ?? file` as
     the key everywhere — cleaner, but requires editing the file this phase couldn't touch. Flag
     this for whoever picks up wiring; it's a one-line type change plus ~5 call-site updates.

2. **`Card.thumbs` is text labels, not images, today.** `CARD_PHOTOS.thumbs` renders as bare
   `<div>{filename}</div>` tiles (`components/Onboarding.tsx:225`), not `<img src>`. Real uploads
   produce actual `thumbUrl` data URIs via `lib/thumbnails.ts`. Two ways to reconcile without
   touching `merchant-data.ts`'s `Card` type:
   - Keep `thumbs: string[]` as filenames for the photo *batch* row (matches today's behavior,
     UP-01's "3-up for a batch" is about grouping 3 photos under one card, not about each thumb
     being a real image), and put the *single-file* `thumbUrl` display (pdf/image cards) somewhere
     else in the row — e.g. a background-image style on the card header, which needs a small JSX
     change in `Onboarding.tsx` (an added `style` prop, not a new class — same spirit as the
     Phase 2 plan's "permitted JSX edit" pattern).
   - Or change `thumbs` to accept data URIs and swap the `<div>{t}</div>` for `<img src={t} />` —
     requires a `merchant-data.ts`/`Onboarding.tsx` edit, out of scope here.
   Either way, **`lib/thumbnails.ts` already returns a real image (or SVG) as a `thumbUrl` string**
   — the mapping decision is UI-only and can be made independently of everything built in this
   phase.

3. **PDF thumbnails ARE real rasterized pixels.** (Resolved — this was briefly built as an SVG
   stand-in to respect a one-line dependency budget, then corrected: these thumbnails are on
   camera in Phase 4, so a stand-in was the wrong trade.) `@napi-rs/canvas` was added and
   `pdfFirstPageThumbnail()` now renders page 1 through `page.render({ canvas, canvasContext,
   viewport })` at 2x (440 px wide) and returns a PNG `data:` URI. Verified against a real
   4-page PDF: correct page count, 440x330 RGBA PNG, visually accurate. The SVG document card
   survives only as a fallback if rasterization throws, so a corrupt file degrades instead of
   breaking the row. `standardFontDataUrl` is wired to `node_modules/pdfjs-dist/standard_fonts/`
   — without it pdfjs drops text for non-embedded fonts.

   One consequence for the wiring: a rendered page PNG runs ~150-200 KB of base64. Storing many
   of those inline in `uploads/index.json` will bloat it. If that bites, write the PNG to
   `uploads/<id>/thumb.png` and put a URL in `thumbUrl` instead — the field is already a plain
   string, so nothing downstream changes.

4. **Image "thumbnails" are the original image, not resized.** No image-processing dependency was
   added (same one-dependency-line constraint). `imageThumbnail()` embeds the original bytes as a
   `data:` URI, falling back to a placeholder SVG above 4 MB. Fine for demo-sized phone photos;
   revisit if a shoot uses raw camera files.

5. **`read_source`'s tool-call argument is assumed to be a filename string** (matching
   `getSourceByName`), based on the scripted `CARD_*.file` values and the Phase 2 plan's `file`
   argument name. If MERCH-02 lands with `read_source` keyed by something else (an index, an id),
   swap `getSourceByName` for `getSourceById` — both exist in `lib/uploads.ts` — no other change
   needed.

6. **Website favicon is a live external URL** (`https://www.google.com/s2/favicons?...`), not
   fetched/stored locally. Fine for a demo with internet; if recording happens offline, the favicon
   `<img>` will just fail to load — cosmetic only, doesn't block the row.

7. **No route serves the raw uploaded file back out.** `uploads/<id>/<filename>` is written to disk
   (for Phase 5's real extraction to read later) but nothing in this phase makes it fetchable over
   HTTP — only `thumbUrl` (a self-contained data URI or external favicon URL) is servable today.
   Add a `GET /api/upload/[id]/file` route if a later phase needs to display or re-download the
   original.

## 6. Not built (deferred, out of this plan's scope per the brief)

- Any edit to `components/Onboarding.tsx`, `hooks/useOnboardingState.ts`, `lib/agent-script.ts`,
  `lib/beat-runner.ts` — all owned by the concurrent MERCH-02 agent, not yet in this worktree at
  the time this phase ran (`hooks/useOnboardingState.ts` and `lib/agent-script.ts` do not exist
  here yet).
- The actual `read_source` handler swap described in roadmap item 03-02.
- Drag/drop/paste event wiring in `Onboarding.tsx`'s `.drop-bar`.
