from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .models import CreateTtsJobRequest, TtsJobResponse
from .tts_service import TtsService

BASE_DIR = Path(__file__).resolve().parent.parent
AUDIO_DIR = BASE_DIR / "generated_audio"

tts_service = TtsService(output_dir=AUDIO_DIR)

app = FastAPI(title="Markdown TTS API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/tts/jobs", response_model=TtsJobResponse)
def create_tts_job(payload: CreateTtsJobRequest) -> TtsJobResponse:
    if not payload.markdown.strip():
        raise HTTPException(status_code=400, detail="Markdown content is required.")
    return tts_service.create_job(payload.markdown)


@app.get("/api/tts/jobs/{job_id}", response_model=TtsJobResponse)
def get_tts_job(job_id: str) -> TtsJobResponse:
    job = tts_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="TTS job not found.")
    return job


@app.get("/api/tts/audio/{job_id}")
def get_tts_audio(job_id: str) -> FileResponse:
    audio_path = tts_service.get_audio_path(job_id)
    if not audio_path or not audio_path.exists():
        raise HTTPException(status_code=404, detail="TTS audio not available.")
    return FileResponse(path=audio_path, media_type="audio/wav", filename=f"{job_id}.wav")
