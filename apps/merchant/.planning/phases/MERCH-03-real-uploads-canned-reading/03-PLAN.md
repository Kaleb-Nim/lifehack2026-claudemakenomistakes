# MERCH-03 — Real uploads, canned reading

**Goal (from ROADMAP.md):** the owner really drags a price-list PDF, an Acer flyer and three
photos and pastes a URL; the page stores them and shows real thumbnails; what the agent "reads"
out of them is hardcoded.

**Requirements:** UP-01 … UP-05 (`.planning/REQUIREMENTS.md`).

This plan covers the full phase — the library + route layer (built, this pass) and the UI/tool
wiring (deferred, next pass). It was executed in parallel with MERCH-02 under a hard constraint:
zero edits to any file MERCH-02 owns. See `03-INTEGRATION.md` for the exact call contract between
the two halves and the assumptions that need re-checking once MERCH-02 lands.

## Part A — built this pass (headless, no UI wiring)

1. **`lib/uploads.ts`** — `StoredSource` type + disk-backed storage (`uploads/<id>/<filename>`
   plus `uploads/index.json`), `createWebsiteSource` for UP-03, CRUD helpers by id and by name.
2. **`lib/thumbnails.ts`** — `pdfFirstPageThumbnail` (real page count + real page-1 text via
   pdfjs-dist, rendered into an SVG document thumbnail — see 03-INTEGRATION.md §5.3 for why not a
   raster render) and `imageThumbnail` (original bytes as a data URI, size-capped).
3. **`lib/canned-extracts.ts`** — the four scripted extracts (website, pricelist, flyer, photos)
   copied verbatim from `lib/merchant-data.ts`'s `CARD_*` constants, plus one generic fallback per
   source kind (UP-04).
4. **`lib/source-matcher.ts`** — `matchCannedExtract(source)`, kind + filename/host pattern
   matching with the generic fallback, case-insensitive.
5. **`app/api/upload/route.ts`** — `POST` (multipart → file upload; JSON `{url}` → website source)
   and `GET` (list). Validates kind and size, rejects unsupported types with 400/415.
6. **Tests** (`bun test`, 21 passing): `lib/source-matcher.test.ts` covers pdf/image/website
   matching, case-insensitivity, and all three generic fallbacks; `app/api/upload/route.test.ts`
   covers validation (missing/empty/oversized/unsupported file, malformed website JSON, wrong
   content-type) and the three happy paths (pdf, image, website) plus `GET` listing, using a
   temp-dir `process.chdir()` so it never touches the real `uploads/` directory.
7. **`package.json`** — added `pdfjs-dist` as the single new dependency (one-line diff).
8. **`.gitignore`** — added `uploads/`.

Verification for Part A: `bun test` (21/21 pass), `bunx tsc --noEmit` (clean). `bun run lint`
fails, but only on two pre-existing errors inside `components/Onboarding.tsx` (a `setState`-in-
effect and a ref-during-render warning) that predate this plan and sit in a file this plan was
forbidden to touch — not introduced here.

## Part B — deferred (needs MERCH-02's files, not built this pass)

### 03-B1: Drag/drop/paste wiring in `components/Onboarding.tsx`

- Replace the three `simulateUpload()` call sites (`.drop-bar`'s `onDrop`, "Upload files", "Paste
  URL" — currently placeholders that jump to frame index 2) with real calls: `POST /api/upload`
  (multipart) for dropped/picked files, `POST /api/upload` (JSON `{url}`) for a pasted link.
- On mount, `GET /api/upload` to rehydrate rows for a `?state` reload (UP-02).
- Resolve the `Card.file`-as-identity collision risk for real uploads (see
  `03-INTEGRATION.md` assumption 1) — either dedupe filenames client-side or extend `Card` with an
  `id` field.
- Decide how a `StoredSource.thumbUrl` surfaces in the row given `Card.thumbs` today renders text
  labels, not images (see assumption 2) — likely a small, permitted-style JSX addition (an inline
  `style`/`src`), not a new CSS class.
- Enforce UP-05's fixed ~4s "reading…" window at this call site with a client-side timer (reuse
  the existing `CARD_READ_MS` constant), independent of the frame-diff-driven `reading` Set that
  currently only fires on scripted frame transitions — see `03-INTEGRATION.md` §4 for why the delay
  cannot live inside the route handler.

### 03-B2: `read_source` tool handler consumes real sources

- Per `.planning/ROADMAP.md`'s Phase 3 plan list (03-02): the `read_source` handler in
  `lib/agent-script.ts` (built by MERCH-02) currently resolves purely from `lib/merchant-data.ts`'s
  `FRAMES`/`CARD_*`. Extend it to first look up a real `StoredSource` (`getSourceByName`/
  `getSourceById` from `lib/uploads.ts`) and run it through `matchCannedExtract` when the file
  argument matches a real upload, falling back to the scripted lookup otherwise so the recorded
  demo (which uses the scripted `CARD_*` files, not real drops) is unaffected.
- Confirm the tool-call argument shape against MERCH-02's actual implementation (assumed to be a
  filename string per the Phase 2 plan; see assumption 5).

### 03-B3: Verification once B1/B2 land

- Dropping the real price-list PDF, the ACER flyer and three `IMG_*` photos produces four Context
  rows with real names/sizes/page counts/thumbnails, each showing "reading…" for ~4s and then the
  correct canned extract.
- Pasting `https://www.bizgram.com` produces a website row with a favicon and the bizgram canned
  extract; pasting an unrelated URL produces the generic website extract.
- A `?state=C` reload after uploading keeps all rows (re-fetched from `GET /api/upload`, not
  re-derived from `FRAMES`).
- `bun x tsc --noEmit && bun run lint && bun test && bun run build` all exit 0 (lint should be
  clean once whichever agent fixes/avoids the two pre-existing `Onboarding.tsx` errors above, or
  they're confirmed unrelated and pre-existing on `main`).
