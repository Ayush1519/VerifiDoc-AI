"""
VerifiDoc AI — Utility Helpers
"""

import os
import logging
from pathlib import Path

from fastapi import UploadFile

logger = logging.getLogger("verifidoc.utils")

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


def is_valid_file_type(filename: str | None) -> bool:
    if not filename:
        return False
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


async def save_upload(file: UploadFile, dest: Path) -> None:
    """Stream-write an uploaded file to *dest*."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as f:
        while chunk := await file.read(1024 * 64):  # 64 KB chunks
            f.write(chunk)


def cleanup_temp_file(path: str) -> None:
    """Delete a temporary file; silently ignore if already gone."""
    try:
        if os.path.exists(path):
            os.remove(path)
            logger.debug("Cleaned up temp file: %s", path)
    except Exception as exc:
        logger.warning("Could not delete temp file %s: %s", path, exc)
