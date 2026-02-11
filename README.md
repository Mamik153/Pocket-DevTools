# Markdown TTS Studio

Markdown TTS Studio is a full-screen markdown workspace that turns markdown input into generated speech.
It also includes a DevTools Hub with quick utilities for common developer workflows.

- React + TypeScript + Vite frontend
- Tailwind + shadcn-style UI primitives
- Framer Motion animations + Lucide icons
- Python FastAPI backend with async Text-to-Speech jobs
- Open-source Coqui TTS model (`tts_models/en/ljspeech/tacotron2-DDC`)

## Project Structure

```text
.
├── frontend
└── backend
```

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+

## Local Development

Start backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
./dev.sh
```

Alternative backend run command without activating the environment:

```bash
cd backend
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

If you start Uvicorn manually, use `app.main:app` (or legacy-compatible `services.main:app`) from the `backend` directory.

Start frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Optional frontend environment variable:

```bash
cp .env.example .env
```

`VITE_API_URL` defaults to `http://localhost:8000`.

Backend health check:

```bash
curl http://localhost:8000/health
```

## API Overview

- `GET /health`: API health status
- `POST /api/tts/jobs`: create a TTS job from markdown
- `GET /api/tts/jobs/{job_id}`: get job status
- `GET /api/tts/audio/{job_id}`: download generated WAV audio
- `POST /api/short-links`: create a short link
- `GET /api/short-links`: list recent short links
- `GET /api/short-links/{code}`: get one short link
- `DELETE /api/short-links`: clear all short links
- `GET /s/{code}`: redirect to the original URL

## Frontend Tools

The home page exposes the following tools:

- Audioscribe
- JSON Beautifier
- JSON to TOON
- JSON Compare
- Prompt Improver
- URL Encoder/Decoder
- URL Shortener
- JWT Decode
- UUID Generator
- Base64 Encoder/Decoder
- Regex Tester
- Timestamp Converter

Tool metadata is maintained in `frontend/src/config/tools.ts`, with routes defined in `frontend/src/router.tsx`.

## Resources Section

The home page includes a `Resources` section with curated links grouped by:

- UI Components
- AI Frameworks
- Online Compilers
- Reading Material

Resource links are maintained in `frontend/src/config/resources.ts`.

## TTS Flow

1. Frontend sends markdown to `POST /api/tts/jobs`.
2. Backend queues and processes TTS in a background worker.
3. Frontend polls `GET /api/tts/jobs/{id}` every 2 seconds.
4. When status is `done`, frontend loads audio from `GET /api/tts/audio/{id}`.

## Community

- Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Code of conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Security policy: [SECURITY.md](SECURITY.md)

## Notes

- The first TTS request can be slow because model download and warm-up happen lazily.
- URL short links are persisted in `backend/data/short_links.json`.
- Set `SHORTENER_BASE_URL` to override the generated public short-link base URL.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
