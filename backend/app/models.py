from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

JobStatus = Literal["queued", "processing", "done", "error"]
EventName = Literal["audioscribe_share_created", "audioscribe_share_opened"]


class CreateTtsJobRequest(BaseModel):
    markdown: str = Field(min_length=1, description="Markdown content to convert into speech.")


class TtsJobResponse(BaseModel):
    id: str
    status: JobStatus
    error: str | None = None
    audio_url: str | None = None
    created_at: datetime
    updated_at: datetime


class CreateShortLinkRequest(BaseModel):
    long_url: str = Field(min_length=1, description="Destination URL for the short link.")
    custom_code: str | None = Field(
        default=None,
        description="Optional custom short code. Allowed chars: letters, numbers, underscore, hyphen.",
    )


class ShortLinkResponse(BaseModel):
    code: str
    long_url: str
    short_url: str
    click_count: int
    created_at: datetime
    last_accessed_at: datetime | None = None


class TrackEventRequest(BaseModel):
    name: EventName


class EventMetricResponse(BaseModel):
    name: EventName
    count: int
    last_tracked_at: datetime | None = None
