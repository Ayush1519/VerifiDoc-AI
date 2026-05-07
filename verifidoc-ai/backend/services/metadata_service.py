"""
VerifiDoc AI — Metadata Service
Inspects file metadata for signs of digital tampering.
"""

import os
import logging
from pathlib import Path
from datetime import datetime, timezone

logger = logging.getLogger("verifidoc.metadata")

# Software commonly used to forge documents
_SUSPICIOUS_SOFTWARE = {
    "adobe photoshop", "gimp", "inkscape", "paint.net",
    "corel", "affinity photo", "pixelmator", "canva",
    "microsoft paint", "irfanview",
}

_LEGITIMATE_CREATORS = {
    "microsoft word", "microsoft excel", "libreoffice",
    "adobe acrobat", "scanner", "epson", "canon", "hp",
    "kofax", "abbyy", "nitro pdf",
}


class MetadataService:
    """Extracts and analyses metadata from PDF and image files."""

    def analyze(self, file_path: str) -> dict:
        suffix = Path(file_path).suffix.lower()
        try:
            if suffix == ".pdf":
                return self._analyze_pdf(file_path)
            else:
                return self._analyze_image(file_path)
        except Exception as exc:
            logger.error("Metadata analysis error: %s", exc)
            return {"flags": [], "raw": {}, "error": str(exc)}

    # ── PDF ───────────────────────────────────────────────────────────────────

    def _analyze_pdf(self, file_path: str) -> dict:
        try:
            import pdfplumber

            flags: list[str] = []
            raw_meta: dict   = {}

            with pdfplumber.open(file_path) as pdf:
                meta = pdf.metadata or {}
                raw_meta = {str(k): str(v) for k, v in meta.items()}

            creator  = (meta.get("Creator")  or "").lower()
            producer = (meta.get("Producer") or "").lower()
            author   = (meta.get("Author")   or "").lower()

            created_raw  = meta.get("CreationDate", "")
            modified_raw = meta.get("ModDate", "")

            # ── Check 1: Photo-editing software as creator ────────────────────
            for sw in _SUSPICIOUS_SOFTWARE:
                if sw in creator or sw in producer:
                    flags.append(f"SUSPICIOUS_CREATOR_SOFTWARE: '{creator or producer}'")
                    break

            # ── Check 2: Missing standard metadata ───────────────────────────
            if not creator and not producer:
                flags.append("MISSING_CREATOR_METADATA")

            # ── Check 3: Modification after creation ─────────────────────────
            if created_raw and modified_raw:
                try:
                    # PDF dates look like D:20230101120000+05'30'
                    def _parse_pdf_date(s: str) -> datetime | None:
                        s = s.strip().lstrip("D:")
                        for fmt in ("%Y%m%d%H%M%S", "%Y%m%d%H%M", "%Y%m%d"):
                            try:
                                return datetime.strptime(s[:len(fmt.replace("%", "XX").replace("X",""))], fmt)
                            except ValueError:
                                continue
                        return None

                    c_dt = _parse_pdf_date(created_raw)
                    m_dt = _parse_pdf_date(modified_raw)
                    if c_dt and m_dt and m_dt > c_dt:
                        delta_days = (m_dt - c_dt).days
                        flags.append(f"DOCUMENT_MODIFIED_AFTER_CREATION: {delta_days} days later")
                except Exception:
                    pass

            # ── Check 4: Future creation date ────────────────────────────────
            if created_raw:
                try:
                    c_dt = datetime.strptime(created_raw.strip().lstrip("D:")[:14], "%Y%m%d%H%M%S")
                    if c_dt > datetime.now():
                        flags.append("CREATION_DATE_IN_FUTURE")
                except Exception:
                    pass

            # ── Check 5: Suspicious author string ────────────────────────────
            if any(kw in author for kw in ["test", "sample", "demo", "fake", "template"]):
                flags.append(f"SUSPICIOUS_AUTHOR_STRING: '{author}'")

            return {"flags": flags, "raw": raw_meta}

        except Exception as exc:
            logger.warning("PDF metadata failed: %s", exc)
            return {"flags": ["METADATA_EXTRACTION_FAILED"], "raw": {}}

    # ── Image ─────────────────────────────────────────────────────────────────

    def _analyze_image(self, file_path: str) -> dict:
        try:
            from PIL import Image
            from PIL.ExifTags import TAGS

            flags: list[str] = []
            raw_meta: dict   = {}

            img        = Image.open(file_path)
            exif_data  = img._getexif() if hasattr(img, "_getexif") and img._getexif() else {}

            if exif_data:
                for tag_id, value in exif_data.items():
                    tag = TAGS.get(tag_id, str(tag_id))
                    raw_meta[tag] = str(value)
            else:
                flags.append("NO_EXIF_DATA: Metadata stripped or image was edited")

            software = raw_meta.get("Software", "").lower()
            make     = raw_meta.get("Make", "").lower()

            # ── Check 1: Photo-editing software ──────────────────────────────
            for sw in _SUSPICIOUS_SOFTWARE:
                if sw in software:
                    flags.append(f"EDITED_WITH_IMAGE_SOFTWARE: '{software}'")
                    break

            # ── Check 2: No camera make (real scans have this) ───────────────
            if not make and not software:
                flags.append("NO_DEVICE_OR_SOFTWARE_INFO")

            # ── Check 3: DateTime anomaly ─────────────────────────────────────
            dt_str = raw_meta.get("DateTime") or raw_meta.get("DateTimeOriginal", "")
            if dt_str:
                try:
                    dt = datetime.strptime(dt_str, "%Y:%m:%d %H:%M:%S")
                    if dt > datetime.now():
                        flags.append("IMAGE_DATE_IN_FUTURE")
                except ValueError:
                    flags.append("MALFORMED_DATE_FIELD")

            return {"flags": flags, "raw": raw_meta}

        except Exception as exc:
            logger.warning("Image metadata failed: %s", exc)
            return {"flags": ["METADATA_EXTRACTION_FAILED"], "raw": {}}
