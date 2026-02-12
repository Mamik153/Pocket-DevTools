# Pocket DevTools (Formerly Markdown TTS Studio)

Pocket DevTools is now a multi-tool developer workspace.  
This project started as a markdown-to-speech app and has shifted into a broader utility hub where Audioscribe is one tool among many.

## Major Shift

- **Then:** single-purpose markdown + TTS workflow.
- **Now:** a unified developer toolkit with multiple utilities, shared design system, and floating productivity widgets.

## What You Get

- 13+ frontend tools in one interface (JSON, auth, encoding, regex, timestamps, passwords, URLs, and more).
- Audioscribe with async text-to-speech job processing.
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

- Audioscribe
- JSON Beautifier
- JSON to TOON
- JSON Compare
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

## Audioscribe Flow

1. Frontend sends markdown to `POST /api/tts/jobs`.
2. Backend queues and processes TTS.
3. Frontend polls `GET /api/tts/jobs/{id}`.
4. On completion, audio is loaded from `GET /api/tts/audio/{id}`.

Share snapshot support:

- Users can create short links for Audioscribe markdown snapshots.
- Shared links open Audioscribe with pre-filled content.
- Events like `audioscribe_share_created` and `audioscribe_share_opened` are tracked via `/api/metrics/events`.

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
