from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse

from .models import CreateShortLinkRequest, CreateTtsJobRequest, ShortLinkResponse, TtsJobResponse
from .tts_service import TtsService
from .url_shortener_service import UrlShortenerService

BASE_DIR = Path(__file__).resolve().parent.parent
AUDIO_DIR = BASE_DIR / "generated_audio"
SHORT_LINKS_FILE = BASE_DIR / "data" / "short_links.json"

tts_service = TtsService(output_dir=AUDIO_DIR)
url_shortener_service = UrlShortenerService(storage_path=SHORT_LINKS_FILE)

app = FastAPI(title="Markdown TTS API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "https://frontend-nine-neon-98.vercel.app",
        "https://audioscribe.slickspender.com",
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


def _public_base_url(request: Request) -> str:
    configured = os.getenv("SHORTENER_BASE_URL", "").strip()
    if configured:
        return configured.rstrip("/")
    return str(request.base_url).rstrip("/")


def _to_short_link_response(link, *, base_url: str) -> ShortLinkResponse:
    return ShortLinkResponse(
        code=link.code,
        long_url=link.long_url,
        short_url=f"{base_url}/s/{link.code}",
        click_count=link.click_count,
        created_at=link.created_at,
        last_accessed_at=link.last_accessed_at,
    )


@app.post("/api/short-links", response_model=ShortLinkResponse, status_code=status.HTTP_201_CREATED)
def create_short_link(payload: CreateShortLinkRequest, request: Request) -> ShortLinkResponse:
    try:
        link = url_shortener_service.create_link(payload.long_url, custom_code=payload.custom_code)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return _to_short_link_response(link, base_url=_public_base_url(request))


@app.get("/api/short-links", response_model=list[ShortLinkResponse])
def list_short_links(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
) -> list[ShortLinkResponse]:
    links = url_shortener_service.list_links(limit=limit)
    base_url = _public_base_url(request)
    return [_to_short_link_response(link, base_url=base_url) for link in links]


@app.get("/api/short-links/{code}", response_model=ShortLinkResponse)
def get_short_link(code: str, request: Request) -> ShortLinkResponse:
    link = url_shortener_service.get_link(code)
    if not link:
        raise HTTPException(status_code=404, detail="Short link not found.")
    return _to_short_link_response(link, base_url=_public_base_url(request))


@app.delete("/api/short-links", status_code=status.HTTP_204_NO_CONTENT)
def clear_short_links() -> None:
    url_shortener_service.clear_links()


@app.get("/s/{code}", include_in_schema=False)
def follow_short_link(code: str) -> RedirectResponse:
    link = url_shortener_service.resolve_link(code)
    if not link:
        raise HTTPException(status_code=404, detail="Short link not found.")
    return RedirectResponse(url=link.long_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
