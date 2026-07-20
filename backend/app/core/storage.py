"""
Supabase Storage backing layer.

Klaro writes uploaded CSVs and trained models to the local filesystem for speed,
but on ephemeral hosting (Render, containers) that disk is wiped on every redeploy.
This module mirrors those artifacts to a Supabase Storage bucket so they survive:

  - write-through on save (upload local file after it is written), and
  - download-on-miss on read (pull the object back to local disk before use).

The local filesystem therefore stays a fast cache; Supabase is the source of truth.

Design contract:
  * If SUPABASE_URL / SUPABASE_SERVICE_KEY are not configured, storage is DISABLED
    and every method is a safe no-op — the app falls back to pure local disk, which
    is exactly how local development runs. Nothing here ever raises: object storage
    is best-effort backing, and the local write/read has already been attempted.

Uses the raw Supabase Storage REST API via `requests` (already a dependency) to
avoid pulling in the heavier supabase-py SDK. The service-role key is used because
these are server-side operations that must bypass row-level security.
"""
import logging
import os
from pathlib import Path
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# Upload/download timeouts (seconds). Models can be a few MB, so give writes room.
_UPLOAD_TIMEOUT = 60
_DOWNLOAD_TIMEOUT = 60


class SupabaseStorage:
    """Thin, fail-open wrapper over the Supabase Storage REST API."""

    def __init__(self) -> None:
        self.url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY") or ""
        self.bucket = os.getenv("SUPABASE_BUCKET", "klaro")

    def is_enabled(self) -> bool:
        """True only when both the project URL and a service key are configured."""
        return bool(self.url and self.service_key)

    def _headers(self, extra: Optional[dict] = None) -> dict:
        headers = {
            "Authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key,
        }
        if extra:
            headers.update(extra)
        return headers

    def _object_url(self, key: str) -> str:
        return f"{self.url}/storage/v1/object/{self.bucket}/{key.lstrip('/')}"

    def upload(self, local_path: Path, key: str, content_type: str = "application/octet-stream") -> bool:
        """Upsert a local file to `key` in the bucket. Returns success; never raises."""
        if not self.is_enabled():
            return False
        try:
            with open(local_path, "rb") as f:
                data = f.read()
            resp = requests.post(
                self._object_url(key),
                headers=self._headers({"Content-Type": content_type, "x-upsert": "true"}),
                data=data,
                timeout=_UPLOAD_TIMEOUT,
            )
            if resp.status_code in (200, 201):
                return True
            logger.warning(f"[storage] upload {key} failed: {resp.status_code} {resp.text[:200]}")
            return False
        except Exception as e:
            logger.warning(f"[storage] upload {key} error: {e}")
            return False

    def download_to(self, key: str, local_path: Path) -> bool:
        """Download `key` to `local_path` (creating parent dirs). Returns success; never raises."""
        if not self.is_enabled():
            return False
        try:
            resp = requests.get(
                self._object_url(key),
                headers=self._headers(),
                timeout=_DOWNLOAD_TIMEOUT,
            )
            if resp.status_code != 200:
                return False
            local_path.parent.mkdir(parents=True, exist_ok=True)
            with open(local_path, "wb") as f:
                f.write(resp.content)
            return True
        except Exception as e:
            logger.warning(f"[storage] download {key} error: {e}")
            return False

    def remove(self, key: str) -> bool:
        """Delete `key` from the bucket. Returns success; never raises."""
        if not self.is_enabled():
            return False
        try:
            resp = requests.delete(
                self._object_url(key),
                headers=self._headers(),
                timeout=_DOWNLOAD_TIMEOUT,
            )
            return resp.status_code in (200, 204)
        except Exception as e:
            logger.warning(f"[storage] remove {key} error: {e}")
            return False


# Global storage instance — disabled automatically when env is not configured.
storage = SupabaseStorage()
