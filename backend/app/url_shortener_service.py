from __future__ import annotations

import json
import re
import secrets
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Dict
from urllib.parse import urlparse

CODE_PATTERN = re.compile(r"^[A-Za-z0-9_-]{4,32}$")
CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
DEFAULT_CODE_LENGTH = 7


@dataclass
class _ShortLink:
    code: str
    long_url: str
    click_count: int
    created_at: datetime
    last_accessed_at: datetime | None


def _normalize_http_url(value: str) -> str:
    trimmed = value.strip()
    if not trimmed:
        raise ValueError("URL is required.")

    with_scheme = trimmed if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", trimmed) else f"https://{trimmed}"
    parsed = urlparse(with_scheme)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Only HTTP and HTTPS URLs are supported.")
    if not parsed.netloc:
        raise ValueError("URL must include a valid host.")

    return with_scheme


def _normalize_custom_code(value: str) -> str:
    code = value.strip()
    if not CODE_PATTERN.fullmatch(code):
        raise ValueError("Custom code must match [A-Za-z0-9_-] and be 4-32 characters.")
    return code


class UrlShortenerService:
    def __init__(self, storage_path: Path):
        self._storage_path = storage_path
        self._links: Dict[str, _ShortLink] = {}
        self._lock = Lock()
        self._storage_path.parent.mkdir(parents=True, exist_ok=True)
        self._load_from_disk()

    def create_link(self, long_url: str, *, custom_code: str | None = None) -> _ShortLink:
        normalized_url = _normalize_http_url(long_url)
        with self._lock:
            if custom_code:
                code = _normalize_custom_code(custom_code)
                if code in self._links:
                    raise KeyError("That short code is already in use.")
            else:
                code = self._generate_unique_code_locked()

            now = datetime.now(timezone.utc)
            record = _ShortLink(
                code=code,
                long_url=normalized_url,
                click_count=0,
                created_at=now,
                last_accessed_at=None,
            )
            self._links[code] = record
            self._save_to_disk_locked()
            return record

    def list_links(self, *, limit: int = 20) -> list[_ShortLink]:
        with self._lock:
            sorted_links = sorted(self._links.values(), key=lambda record: record.created_at, reverse=True)
            return sorted_links[:limit]

    def get_link(self, code: str) -> _ShortLink | None:
        with self._lock:
            return self._links.get(code)

    def resolve_link(self, code: str) -> _ShortLink | None:
        with self._lock:
            record = self._links.get(code)
            if not record:
                return None
            record.click_count += 1
            record.last_accessed_at = datetime.now(timezone.utc)
            self._save_to_disk_locked()
            return record

    def clear_links(self) -> None:
        with self._lock:
            self._links.clear()
            self._save_to_disk_locked()

    def _generate_unique_code_locked(self) -> str:
        for _ in range(64):
            candidate = "".join(secrets.choice(CODE_ALPHABET) for _ in range(DEFAULT_CODE_LENGTH))
            if candidate not in self._links:
                return candidate
        raise RuntimeError("Failed to generate a unique short code.")

    def _load_from_disk(self) -> None:
        if not self._storage_path.exists():
            return

        try:
            payload = json.loads(self._storage_path.read_text(encoding="utf-8"))
        except Exception:
            return

        if not isinstance(payload, list):
            return

        for item in payload:
            if not isinstance(item, dict):
                continue
            code = item.get("code")
            long_url = item.get("long_url")
            click_count = item.get("click_count")
            created_at = item.get("created_at")
            last_accessed_at = item.get("last_accessed_at")
            if not isinstance(code, str) or not isinstance(long_url, str):
                continue
            if not isinstance(click_count, int) or not isinstance(created_at, str):
                continue

            try:
                created_dt = datetime.fromisoformat(created_at)
                accessed_dt = datetime.fromisoformat(last_accessed_at) if isinstance(last_accessed_at, str) else None
                if created_dt.tzinfo is None:
                    created_dt = created_dt.replace(tzinfo=timezone.utc)
                if accessed_dt is not None and accessed_dt.tzinfo is None:
                    accessed_dt = accessed_dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue

            self._links[code] = _ShortLink(
                code=code,
                long_url=long_url,
                click_count=click_count,
                created_at=created_dt,
                last_accessed_at=accessed_dt,
            )

    def _save_to_disk_locked(self) -> None:
        serializable = [
            {
                **asdict(record),
                "created_at": record.created_at.isoformat(),
                "last_accessed_at": record.last_accessed_at.isoformat() if record.last_accessed_at else None,
            }
            for record in self._links.values()
        ]
        temp_path = self._storage_path.with_suffix(".tmp")
        temp_path.write_text(json.dumps(serializable, ensure_ascii=True, indent=2), encoding="utf-8")
        temp_path.replace(self._storage_path)
