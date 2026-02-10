from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Dict
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor

from .models import JobStatus, TtsJobResponse


MODEL_NAME = "tts_models/en/ljspeech/tacotron2-DDC"


@dataclass
class _Job:
    id: str
    status: JobStatus
    markdown: str
    created_at: datetime
    updated_at: datetime
    error: str | None = None
    audio_file: str | None = None


def _strip_markdown(markdown: str) -> str:
    text = re.sub(r"```[\s\S]*?```", " code block. ", markdown)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"[*_~>]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text or "No readable markdown content was provided."


class TtsService:
    def __init__(self, output_dir: Path):
        self._output_dir = output_dir
        self._jobs: Dict[str, _Job] = {}
        self._jobs_lock = Lock()
        self._model_lock = Lock()
        self._executor = ThreadPoolExecutor(max_workers=2)
        self._tts_model = None

        self._output_dir.mkdir(parents=True, exist_ok=True)

    def create_job(self, markdown: str) -> TtsJobResponse:
        now = datetime.now(timezone.utc)
        job = _Job(
            id=uuid4().hex,
            status="queued",
            markdown=markdown,
            created_at=now,
            updated_at=now,
        )
        with self._jobs_lock:
            self._jobs[job.id] = job

        self._executor.submit(self._run_tts_job, job.id)
        return self._to_response(job)

    def get_job(self, job_id: str) -> TtsJobResponse | None:
        with self._jobs_lock:
            job = self._jobs.get(job_id)
            if not job:
                return None
            return self._to_response(job)

    def get_audio_path(self, job_id: str) -> Path | None:
        with self._jobs_lock:
            job = self._jobs.get(job_id)
            if not job or job.status != "done" or not job.audio_file:
                return None
            return self._output_dir / job.audio_file

    def _run_tts_job(self, job_id: str) -> None:
        self._set_job_state(job_id, status="processing")
        try:
            tts = self._get_model()
            with self._jobs_lock:
                job = self._jobs[job_id]
                plain_text = _strip_markdown(job.markdown)
                output_name = f"{job_id}.wav"
                output_path = self._output_dir / output_name

            tts.tts_to_file(text=plain_text, file_path=str(output_path))
            self._set_job_state(job_id, status="done", audio_file=output_name)
        except Exception as exc:  # pragma: no cover - runtime/model errors
            self._set_job_state(job_id, status="error", error=f"TTS generation failed: {exc}")

    def _get_model(self):
        if self._tts_model is not None:
            return self._tts_model

        with self._model_lock:
            if self._tts_model is not None:
                return self._tts_model

            try:
                from TTS.api import TTS  # Local import keeps startup fast.
            except Exception as exc:  # pragma: no cover - dependency/runtime errors
                raise RuntimeError(
                    "Unable to import Coqui TTS. "
                    f"Python interpreter: {sys.executable}. "
                    f"Import error: {exc!r}. "
                    "Install backend dependencies in the same environment and restart the API with "
                    "`backend/.venv/bin/python -m uvicorn app.main:app --reload --port 8000`."
                ) from exc

            self._tts_model = TTS(model_name=MODEL_NAME, progress_bar=False, gpu=False)
            return self._tts_model

    def _set_job_state(
        self,
        job_id: str,
        *,
        status: JobStatus,
        error: str | None = None,
        audio_file: str | None = None,
    ) -> None:
        with self._jobs_lock:
            job = self._jobs[job_id]
            job.status = status
            job.error = error
            if audio_file:
                job.audio_file = audio_file
            job.updated_at = datetime.now(timezone.utc)

    @staticmethod
    def _to_response(job: _Job) -> TtsJobResponse:
        audio_url = f"/api/tts/audio/{job.id}" if job.audio_file else None
        return TtsJobResponse(
            id=job.id,
            status=job.status,
            error=job.error,
            audio_url=audio_url,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )
