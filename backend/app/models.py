from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

JobStatus = Literal["queued", "processing", "done", "error"]


class CreateTtsJobRequest(BaseModel):
    markdown: str = Field(min_length=1, description="Markdown content to convert into speech.")


class TtsJobResponse(BaseModel):
    id: str
    status: JobStatus
    error: str | None = None
    audio_url: str | None = None
    created_at: datetime
    updated_at: datetime
