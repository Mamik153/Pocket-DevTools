from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Dict


@dataclass
class _EventMetric:
    name: str
    count: int
    last_tracked_at: datetime | None


class EventMetricsService:
    def __init__(self, storage_path: Path):
        self._storage_path = storage_path
        self._metrics: Dict[str, _EventMetric] = {}
        self._lock = Lock()
        self._storage_path.parent.mkdir(parents=True, exist_ok=True)
        self._load_from_disk()

    def track(self, name: str) -> _EventMetric:
        with self._lock:
            metric = self._metrics.get(name)
            if metric is None:
                metric = _EventMetric(name=name, count=0, last_tracked_at=None)
                self._metrics[name] = metric

            metric.count += 1
            metric.last_tracked_at = datetime.now(timezone.utc)
            self._save_to_disk_locked()
            return metric

    def list_metrics(self, *, names: list[str] | None = None) -> list[_EventMetric]:
        with self._lock:
            if names:
                name_set = set(names)
                metrics = [metric for metric in self._metrics.values() if metric.name in name_set]
            else:
                metrics = list(self._metrics.values())
            return sorted(metrics, key=lambda metric: metric.name)

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
            name = item.get("name")
            count = item.get("count")
            last_tracked_at = item.get("last_tracked_at")
            if not isinstance(name, str) or not isinstance(count, int):
                continue

            last_tracked_dt: datetime | None = None
            if isinstance(last_tracked_at, str):
                try:
                    last_tracked_dt = datetime.fromisoformat(last_tracked_at)
                    if last_tracked_dt.tzinfo is None:
                        last_tracked_dt = last_tracked_dt.replace(tzinfo=timezone.utc)
                except ValueError:
                    last_tracked_dt = None

            self._metrics[name] = _EventMetric(
                name=name,
                count=count,
                last_tracked_at=last_tracked_dt,
            )

    def _save_to_disk_locked(self) -> None:
        serializable = [
            {
                **asdict(metric),
                "last_tracked_at": metric.last_tracked_at.isoformat() if metric.last_tracked_at else None,
            }
            for metric in self._metrics.values()
        ]
        temp_path = self._storage_path.with_suffix(".tmp")
        temp_path.write_text(json.dumps(serializable, ensure_ascii=True, indent=2), encoding="utf-8")
        temp_path.replace(self._storage_path)
