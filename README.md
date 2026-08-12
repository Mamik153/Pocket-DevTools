# Pocket DevTools (Formerly Markdown TTS Studio)

Pocket DevTools is now a multi-tool developer workspace.  
This project started as a markdown-to-speech app and has shifted into a broader utility hub where Markdown to PDF is one tool among many.

## Major Shift

- **Then:** single-purpose markdown + TTS workflow.
- **Now:** a unified developer toolkit with multiple utilities, shared design system, and floating productivity widgets.

## What You Get

- 13+ frontend tools in one interface (JSON, auth, encoding, regex, timestamps, passwords, URLs, and more).
- Markdown to PDF with a live preview and a print-ready export.
- Floating top-right widgets:
  - INR conversion with live rates and bidirectional conversion.
  - Multi-timezone world clock.
- Built-in URL shortener + event metrics APIs for product instrumentation.
- Modern UI stack with motion, shadcn-style primitives, and responsive layouts.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend:** FastAPI (Python 3.11+), async job flow for TTS
- **TTS Model:** Coqui (`tts_models/en/ljspeech/tacotron2-DDC`)

## Project Structure

```text
.
├── frontend
│   ├── src/components
│   ├── src/routes
│   ├── src/config
│   └── src/components/widgets
└── backend
    ├── app
    └── data
```

## Local Development

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+

### Run Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
./dev.sh
```

Alternative (without activating venv):

```bash
cd backend
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Optional:

```bash
cp .env.example .env
```

`VITE_API_URL` defaults to `http://localhost:8000`.

Health check:

```bash
curl http://localhost:8000/health
```

## API Overview

- `GET /health` - API health status
- `POST /api/tts/jobs` - create TTS job from markdown
- `GET /api/tts/jobs/{job_id}` - get TTS job status
- `GET /api/tts/audio/{job_id}` - download generated WAV audio
- `POST /api/short-links` - create short link
- `GET /api/short-links` - list recent short links
- `GET /api/short-links/{code}` - fetch short link metadata
- `DELETE /api/short-links` - clear short links
- `POST /api/metrics/events` - track product event
- `GET /api/metrics/events` - list event counters
- `GET /s/{code}` - redirect to original URL

## Frontend Tools

- Markdown to PDF
- PDF Toolkit
- JSON Toolkit
- Prompt Improver
- URL Encoder/Decoder
- URL Shortener
- JWT Decode
- UUID Generator
- Password Generator
- Base64 Encoder/Decoder
- Regex Tester
- Timestamp Converter

Tool catalog: `frontend/src/config/tools.ts`  
Routes: `frontend/src/router.tsx`

JSON route aliases (same shared toolkit UI):

- `/json-compare` (primary)
- `/json-beautifier` (opens beautify mode)
- `/json-to-toon` (opens TOON mode)

## Markdown to PDF Flow

Everything happens client-side. `Download PDF` clones the rendered preview into a
popup window, injects the app stylesheet plus a dedicated print stylesheet, and
calls `window.print()` so the browser can save it as a PDF.

The print stylesheet is what makes the export usable: it forces the real webfonts,
gives code blocks a light background with wrapped lines, keeps table borders
visible with a repeated header row, and stops rows and diagrams splitting across
pages.

Share snapshot support:

- Users can create short links for markdown snapshots.
- Shared links open `/markdown-to-pdf` with pre-filled content.
- Events `audioscribe_share_created` and `audioscribe_share_opened` are tracked via `/api/metrics/events`. The names are legacy — `backend/app/models.py` validates them with a `Literal`, so renaming needs a backend deploy.

The tool was previously called Audioscribe and had a text-to-speech mode. That mode
is gone from the UI; `/audioscribe` now redirects to `/markdown-to-pdf`. The TTS
endpoints below are unused and can be removed on the next backend change.

## PDF Toolkit

`/pdf-toolkit` runs entirely in the browser — no PDF, and no password, is ever
uploaded. Four tabs share one page:

- **Merge** — reorder files by dragging the grip or with the ↑/↓ buttons, add more
  without losing the list, export as one PDF.
- **Unlock** — removes permission restrictions with no prompt, and removes an open
  password when you supply it. It cannot guess or crack passwords.
- **To Image** — renders pages to PNG or JPEG at 72/150/300 DPI, single download or
  ZIP.
- **Compress** — lossless by default; an aggressive mode rasterises pages for far
  bigger savings at the cost of selectable text.

Libraries load on demand: `@cantoo/pdf-lib` (MIT), `pdfjs-dist` (Apache-2.0), and
`fflate` (MIT) are all dynamically imported from `frontend/src/lib/pdf.ts` and stay
out of the initial bundle.

Two implementation notes worth keeping:

- Decrypting is not just `load({ password })` then `save()`. The original encryption
  dictionary survives as an orphaned object and the output reloads as encrypted, so
  `decryptPdf` deletes only that dictionary — it deliberately leaves other orphaned
  objects alone, since discarding those risks losing legitimate malformed-but-referenced
  content from older PDF generators — then verifies the result with a plain, optionless
  load. Only if that verification still finds the file encrypted does it fall back to a
  page-level rebuild, which always clears encryption but drops outlines, bookmarks, and
  form fields.
- Compression can produce a **larger** file — object streams add overhead a small
  document never recovers (measured: a 677-byte PDF compresses losslessly to a
  686-byte candidate). Both modes compare sizes and return the original when the
  candidate is not strictly smaller.

Unlock, To Image, and Compress each guard against a superseded run with a
request-generation counter, so dropping a second file mid-operation cannot let a
stale result overwrite a newer one; Merge doesn't need this since it accumulates a
list of files rather than replacing a single result.

Run the unit tests with `cd frontend && npm test`.

## Persistence Notes

- Short links: `backend/data/short_links.json`
- Event metrics: `backend/data/event_metrics.json`
- `SHORTENER_BASE_URL` can override generated short-link base URL.
- First TTS request may be slower due to model warm-up/download.

## Community

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md)

## License

MIT License. See [LICENSE](LICENSE).
