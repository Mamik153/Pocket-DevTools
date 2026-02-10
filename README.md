# Markdown TTS Studio

Markdown TTS Studio is a full-screen markdown workspace that turns markdown input into generated speech.

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

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
