# PDF Toolkit — Design

Date: 2026-08-12
Status: Approved

## Purpose

Add a fourteenth tool to Pocket DevTools: a PDF toolkit with four features — Merge,
Unlock, PDF to Image, and Compress. Everything runs in the browser. No file ever
leaves the user's machine, matching the privacy promise the other thirteen tools make.

## Scope

In scope:

- Merge multiple PDFs with drag-to-reorder and incremental "add more".
- Unlock: strip permission restrictions, and remove an open-password the user supplies.
- PDF to Image: render pages to PNG or JPEG at a chosen DPI, single or ZIP download.
- Compress: lossless by default, opt-in aggressive raster mode.
- A one-line press-state fix to the shared `Button` component.

Out of scope:

- Page-level thumbnails and page-level reordering. The requested interaction is
  file-level reordering; thumbnails would pull `pdfjs-dist` into the Merge tab,
  which otherwise never needs it.
- Splitting, rotating, watermarking, form filling, OCR.
- Any server-side processing.
- Password guessing or cracking of any kind.

## Decisions

### Routing: one route, tabs inside

A single route `/pdf-toolkit` renders one page with four tabs. This yields one
sitemap entry and one keyword-targeted landing page rather than four.

Registration touches the same four places every existing tool does:

| File | Change |
| --- | --- |
| `frontend/src/config/tools.ts` | Add `"pdf-toolkit"` to `ToolId` and `ToolPath`; one `ToolDefinition` with `metaDescription` and `metaKeywords`. |
| `frontend/src/router.tsx` | One `lazy()` import, one `createRoute`, one entry in `addChildren`. |
| `frontend/src/routes/HomePage.tsx` | One entry in the `toolIcons` map, using `FileStack` from lucide. |
| `frontend/scripts/generate-sitemap.mjs` | One entry in the hand-maintained `entries` array, priority `0.9`. |

SEO metadata derives automatically from `tools.ts` via `config/seo.ts`. No change
to `seo.ts` is needed.

### Libraries: two, both client-side

**`@cantoo/pdf-lib`** (MIT, actively maintained, ~460k weekly downloads) — a
maintained fork of the frozen `pdf-lib`. Decisive capability, verified by running
it against real generated PDFs: `PDFDocument.load(bytes, { password })` decrypts,
including `password: ''` for permission-only PDFs. One library therefore covers
Merge, Unlock, and the rebuild half of Compress.

**Important correction, established by experiment.** Loading with the correct
password and calling `save()` does **not** produce an unencrypted PDF. The
decrypted document keeps the original encryption dictionary as an orphaned
indirect object plus a `PDFInvalidObject` remnant, and the re-saved file reloads
as encrypted — `PDFDocument.load()` on the output throws `EncryptedPDFError`. The
naive implementation would have shipped a broken Unlock tool. See "Unlock" under
Panel behaviour for the approach that actually works.

**`pdfjs-dist`** (Apache-2.0) — page rendering for PDF to Image and for the
aggressive Compress mode.

**`fflate`** (MIT, ~8KB gzipped) — ZIP packaging for "download all images".
Dynamically imported only when that button is pressed.

All three are dynamically imported so the PDF machinery loads only when a tab
that needs it is opened.

Rejected alternatives:

- **`mupdf`** would cover all four features in one library and offers genuinely
  better compression through real image downsampling. It is **AGPL-3.0-or-later**.
  Shipping it would force this MIT frontend to AGPL. Not viable without a
  commercial licence.
- **Server-side qpdf or Ghostscript via the FastAPI backend** would give the best
  compression quality. Rejected on three grounds: `backend/**` is listed in
  `.vercelignore` so nothing server-side is deployed today; it breaks the
  no-upload privacy story; and uploading a password-protected PDF to a server is
  precisely what a user of an unlock tool does not want.

### Unlock scope

Two cases, both handled, neither involving guessing:

1. **Permission-restricted** — the PDF opens freely but blocks copy, print, or
   edit. `{ password: '' }` decrypts it. No prompt is shown.
2. **Open-password** — the user types a password they already know.

The panel states this boundary in plain text in the UI. The tool works on PDFs the
user can already open, or whose password they know. It does not guess or crack
passwords.

### Compress: two modes

**Lossless (default)** — `PDFDocument.load` then
`save({ useObjectStreams: true, rewrite: true })`. Drops orphaned objects and
incremental-update history, recompresses streams. Text, links, and searchability
all survive. Typical saving 5–25%, and sometimes zero.

**Aggressive (explicit opt-in)** — render each page via pdf.js at a chosen DPI,
`canvas.toBlob('image/jpeg', quality)`, then `embedJpg` into a fresh document at
the original page dimensions. Typical saving 50–90% on scans and image-heavy
decks. Text becomes a picture: not selectable, not searchable, links dead.

Aggressive is gated behind a toggle carrying that warning verbatim. It is
implemented as PDF-to-Image piped into the Merge rebuild, so it adds little new
code.

**Never return a larger file.** Measured on a small generated PDF, lossless save
produced 884 bytes from an 878-byte input — object streams add overhead that can
exceed the saving. Both modes therefore compare output length against input length
and, when the output is not smaller, discard it and report "already optimised,
nothing to save" with no download offered. Handing back a bigger file labelled
"compressed" is the specific failure this rule prevents.

Otherwise results show before → after with the delta.

## Architecture

Four small components rather than one large file. The four features share a file
picker and little else, and — unlike the JSON Toolkit — they share no workspace: a
file loaded into Merge is meaningless to Unlock. Each panel therefore owns its own
file state and mounts fresh on tab switch, so an aborted 80MB compress does not
leak memory into the next tab.

```
src/routes/PdfToolkitPage.tsx          route wrapper
src/components/pdf/PdfToolkit.tsx      tab shell, holds mode state
src/components/pdf/MergePanel.tsx
src/components/pdf/UnlockPanel.tsx
src/components/pdf/ToImagePanel.tsx
src/components/pdf/CompressPanel.tsx
src/components/pdf/PdfDropzone.tsx     shared: drag-drop, file input, validation
src/lib/pdf.ts                         shared: dynamic imports, load/save, pure helpers
src/lib/pdf.test.ts                    pure-helper tests
```

The page uses `ToolPageLayout`, as every other tool does. Tab switching follows the
`JsonToolkit` pattern — a row of `Button`s with
`variant={mode === id ? "default" : "outline"}` — rather than introducing a Radix
Tabs dependency.

`src/lib/pdf.ts` holds the pure logic worth isolating and testing: reorder index
math, the `%PDF-` magic-byte sniff, DPI-to-scale conversion, and byte-size
formatting.

## Interaction design

Applies `~/Desktop/Skills/apple-design/SKILL.md`. Section references below are to
that document. `framer-motion@12.34.0` is already a dependency and exports
`Reorder`, `useDragControls`, and `useReducedMotion`, so this costs no new
dependency.

**Merge reorder.** `Reorder.Group` and `Reorder.Item`, with drag initiated from a
grip handle via `useDragControls` so the rest of the card stays clickable.
Neighbours spring aside continuously during the drag, not on drop (§2, §3).
Native HTML5 drag-and-drop is explicitly not used: it supplies a ghost image, no
1:1 tracking, no velocity, and cannot be grabbed mid-flight.

**Springs.** `bounce: 0` everywhere by default (§4). The single exception is the
Merge card's settle after a drag release, at `bounce: 0.2, duration: 0.4`, because
that release carries real momentum from the user's hand.

**Press feedback.** Cards lift on **pointer-down** (`scale 1.02`, deeper shadow),
not on drag-start, so the grab registers instantly (§1). Globally,
`src/components/ui/button.tsx` gains `active:scale-[0.98]` with a 100ms
transform transition on its base variant. This affects all thirteen existing
tools, deliberately: things that look the same should behave the same (§16
Familiarity).

**Keyboard.** `Reorder` is pointer-only, so every row also carries ↑/↓ buttons
with `aria-label`s. This is the accessibility floor, not an enhancement.

**Reduced motion.** `useReducedMotion` — already the established pattern in
`HomePage.tsx` — collapses layout springs to instant and removes the bounce.
Dragging still tracks 1:1. Reduced motion means no vestibular motion, not no
feedback (§14).

**Tabs.** A `motion.div` with `layoutId` sits behind the active tab button so the
indicator physically travels between tabs (§7). Panel content cross-fades rather
than slides: Merge and Unlock have no spatial relationship, and a slide would
imply one that does not exist.

**Dropzone.** Highlights on `dragenter` and stays continuously responsive while a
file is held over it (§1), rather than reacting only on drop. Accepted files
animate into the list from the dropzone, emerging from where they came (§7).

**Progress.** Every operation is determinate, never a bare spinner: "Page 7 of 42",
driven by the real per-page loop in pdf.js and the per-object tick in pdf-lib.
Feedback runs during the work, not only at the end (§1, §16). Sizes and page
counts render with `tabular-nums` so figures do not jitter as they update.

**Action bar.** Merge's export bar pins to the bottom of the panel as a translucent
`backdrop-blur` layer with the file list scrolling underneath, consistent with the
existing `FloatingWidgets` aesthetic. A `prefers-reduced-transparency` fallback
makes it solid (§12, §14).

## Panel behaviour

### Merge

Drop or pick multiple PDFs. Each becomes a row showing filename, page count, size,
grip handle, ↑/↓ buttons, and remove. "Add more" appends without clearing the
existing list. Export runs `PDFDocument.create()` with `copyPages` in list order,
saves, and downloads. Page counts come from `getPageCount()`, which is cheap.

### Unlock

Drop one PDF. Load with `{ ignoreEncryption: true }` to read `isEncrypted`.

- Not encrypted: say so, offer nothing. A pointless re-save is not a result.
- Encrypted: try `{ password: '' }` first, which silently handles the entire
  permission-restricted class with no prompt. Only if that throws is a password
  field shown.

Stripping the encryption then takes two tiers, because a plain re-save does not
work (see Libraries):

1. **Targeted strip (preferred).** Clear `context.trailerInfo.Encrypt`, then walk
   `context.enumerateIndirectObjects()` and `context.delete(ref)` every
   `PDFInvalidObject` and every `PDFDict` whose `Filter` is `PDFName.of('Standard')`
   — the encryption dictionary. Save normally. This keeps the original object
   graph, so outlines, bookmarks, form fields, and attachments survive.
2. **Verify, then fall back.** Attempt a plain `PDFDocument.load(output)` with no
   options. If it throws, the strip missed something; reload the source and rebuild
   page-by-page via `copyPages` into a fresh document, which always clears
   encryption. The rebuild is the same code path Merge uses.

The fallback is a genuine downgrade — a page-level rebuild drops outlines and form
data — so it is a fallback, not the default. When it fires, the UI says the document
was rebuilt and that bookmarks and form fields may not have carried over. Silently
returning a lossy file is the failure mode this tier exists to prevent.

Both tiers are verified in tests. Against generated fixtures, tier 1 succeeds for
both the permission-restricted and user-password cases.

The panel states its boundary in the UI as described under Decisions.

### PDF to Image

Dynamic `import("pdfjs-dist")`, worker wired via `import.meta.url` — the
Vite-supported path. Controls: format (PNG or JPEG), a quality slider for JPEG,
and a scale selector expressed as DPI rather than a raw multiplier, because
"150 DPI (print)" maps to user intent in a way "2.0x" does not (§16 Mapping).

Pages render one at a time to a canvas with live progress and a thumbnail strip
filling in as it goes. Single-page download is direct. "Download all" dynamically
imports `fflate` and produces a ZIP; forty separate download prompts is not a
feature.

### Compress

As described under Decisions. Mode selector, DPI and quality controls when
aggressive, before/after sizes with delta.

## Errors, limits, safety

**Validation at the boundary.** Files are sniffed for the `%PDF-` magic bytes, not
trusted by extension or MIME type. A renamed non-PDF is the most common bad input
and must fail with "this isn't a PDF", not a stack trace from inside pdf-lib.

**Encrypted file in the wrong tab.** Dropping a locked PDF into Merge, Compress, or
To Image is a likely mistake. Each panel detects `isEncrypted` up front and directs
the user to the Unlock tab with a real explanation rather than throwing. Never trap
the user (§16 Wayfinding).

**Per-file failure in Merge.** A corrupt file marks its own row with an error and is
excluded from export. It does not fail the other files.

**Passwords.** Held in component state only. Never logged, never placed in a URL,
never persisted, cleared on unmount. A wrong password leaves both the file and the
field in place with an inline error; retyping a password must not require
re-picking the file.

**Size.** Large files produce a warning, not a block — "this is 180MB, your browser
may run out of memory" — and the user may proceed (§16 Agency). The worst case is a
crashed tab, and since nothing was uploaded, nothing is lost.

**Memory.** After each page render the canvas is zeroed and object URLs are revoked,
so a 200-page job does not accumulate memory.

**Main thread.** pdf.js renders in its own worker. pdf-lib's save runs on the main
thread and uses `objectsPerTick` to yield. If that still janks on very large merges,
the fix is a worker — recorded as a `ponytail:` comment naming the ceiling rather
than built speculatively.

## Testing

Add `vitest` as a devDependency with no configuration file; it reads the existing
Vite config. Add a `test` script to `frontend/package.json`.

One test file, `src/lib/pdf.test.ts`, in two parts.

**Pure helpers:**

- reorder index math (move up, move down, drag reorder, boundary cases at index 0
  and the last index)
- `%PDF-` magic-byte sniff (valid, renamed text file, empty file, file shorter
  than the header)
- DPI to pdf.js viewport scale conversion (`scale = dpi / 72`, since a PDF user
  space unit is 1/72 inch)
- byte-size formatting
- the "never return a larger file" comparison

**Document operations.** These need no checked-in fixtures and no mocking:
`@cantoo/pdf-lib` can *create* the PDFs the tests need, including encrypted ones
via `doc.encrypt({ ownerPassword, userPassword, permissions })`, and it runs in
Node. Pages are given distinct dimensions so order is assertable.

- merge preserves the requested order (assert page widths `[200, 300, 100]`)
- decrypt a permission-restricted PDF (owner password only) using `password: ''`,
  and assert the output loads with a plain `PDFDocument.load()`
- decrypt a user-password PDF, and assert an empty and a wrong password both reject
- assert an unencrypted PDF reports `isEncrypted === false`

Excluded: anything requiring canvas. pdf.js rendering needs a real canvas, so
PDF-to-Image and aggressive Compress are covered by manual verification rather than
by adding a `canvas` native dependency to get them under test.

## Verification

- `npm run build` in `frontend/` passes (`tsc -b` plus sitemap generation plus
  `vite build`).
- `npm test` passes.
- Manual: merge three PDFs and confirm output order matches the on-screen order;
  unlock a permission-restricted PDF with no prompt; unlock a password-protected
  PDF with the correct password, and confirm a wrong password shows an inline
  error; export a multi-page PDF to a ZIP of images; compress a scanned PDF in
  both modes and confirm the reported before/after sizes match the actual files.
- Confirm `/pdf-toolkit` appears on the home page, in the generated sitemap, and
  carries its own title and meta description.
