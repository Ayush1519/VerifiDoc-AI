"""
VerifiDoc AI — OCR Service
Extracts text from PDFs and images using pytesseract / pdfplumber.
"""

import logging
import re
from pathlib import Path

logger = logging.getLogger("verifidoc.ocr")


class OCRService:
    """Wraps OCR engines with graceful fallbacks."""

    # Field patterns to look for in financial/legal docs
    _FIELD_PATTERNS: dict[str, str] = {
        "pan_number":       r"\b[A-Z]{5}[0-9]{4}[A-Z]\b",
        "aadhaar_number":   r"\b\d{4}\s\d{4}\s\d{4}\b",
        "amount":           r"(?:Rs\.?|INR|₹)\s*[\d,]+(?:\.\d{1,2})?",
        "date":             r"\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b",
        "account_number":   r"\b\d{9,18}\b",
        "ifsc_code":        r"\b[A-Z]{4}0[A-Z0-9]{6}\b",
        "email":            r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b",
        "mobile":           r"\b(?:\+91[\-\s]?)?[6-9]\d{9}\b",
        "loan_amount":      r"(?:Loan|Principal)\s*[Aa]mount[:\s]+(?:Rs\.?|INR|₹)?\s*[\d,]+",
        "property_area":    r"\d+(?:\.\d+)?\s*(?:sq\.?\s*(?:ft|m|yd)|acres?|cents?)",
    }

    def is_available(self) -> bool:
        try:
            import pytesseract
            pytesseract.get_tesseract_version()
            return True
        except Exception:
            return False

    def extract(self, file_path: str) -> dict:
        """
        Run OCR on *file_path* and return:
          - raw_text
          - confidence  (0-1)
          - fields      (detected structured values)
          - word_count
          - page_count
        """
        suffix = Path(file_path).suffix.lower()

        if suffix == ".pdf":
            return self._extract_pdf(file_path)
        else:
            return self._extract_image(file_path)

    # ── PDF ───────────────────────────────────────────────────────────────────

    def _extract_pdf(self, file_path: str) -> dict:
        try:
            import pdfplumber

            pages_text: list[str] = []
            with pdfplumber.open(file_path) as pdf:
                page_count = len(pdf.pages)
                for page in pdf.pages:
                    text = page.extract_text() or ""
                    pages_text.append(text)

            raw_text  = "\n".join(pages_text)
            word_count = len(raw_text.split())

            # Confidence heuristic: ratio of alphanumeric chars to total
            alnum = sum(c.isalnum() for c in raw_text)
            total = max(len(raw_text), 1)
            confidence = min(alnum / total * 1.8, 1.0) if word_count > 10 else 0.3

            return {
                "raw_text":   raw_text,
                "confidence": round(confidence, 3),
                "fields":     self._extract_fields(raw_text),
                "word_count": word_count,
                "page_count": page_count,
                "engine":     "pdfplumber",
            }

        except Exception as exc:
            logger.warning("pdfplumber failed (%s), falling back to pytesseract PDF render", exc)
            return self._extract_image_from_pdf(file_path)

    def _extract_image_from_pdf(self, file_path: str) -> dict:
        """Convert PDF pages to images then OCR each."""
        try:
            import fitz  # PyMuPDF
            import pytesseract
            from PIL import Image
            import io

            doc = fitz.open(file_path)
            all_text: list[str] = []

            for page_num in range(min(len(doc), 10)):  # cap at 10 pages
                page = doc[page_num]
                mat  = fitz.Matrix(2, 2)  # 2× zoom for clarity
                pix  = page.get_pixmap(matrix=mat)
                img  = Image.open(io.BytesIO(pix.tobytes("png")))
                text = pytesseract.image_to_string(img, config="--psm 6")
                all_text.append(text)

            raw_text  = "\n".join(all_text)
            word_count = len(raw_text.split())
            confidence = 0.70 if word_count > 20 else 0.35

            return {
                "raw_text":   raw_text,
                "confidence": confidence,
                "fields":     self._extract_fields(raw_text),
                "word_count": word_count,
                "page_count": len(doc),
                "engine":     "pymupdf+tesseract",
            }

        except Exception as exc:
            logger.error("PDF image extraction failed: %s", exc)
            return self._empty_result()

    # ── Image ─────────────────────────────────────────────────────────────────

    def _extract_image(self, file_path: str) -> dict:
        try:
            import pytesseract
            from PIL import Image

            img  = Image.open(file_path)
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, config="--psm 6")

            # Filter confident words
            confident_words = [
                w for w, c in zip(data["text"], data["conf"])
                if str(c).isdigit() and int(c) > 30 and w.strip()
            ]
            raw_text = pytesseract.image_to_string(img, config="--psm 6")

            avg_conf = (
                sum(int(c) for c in data["conf"] if str(c).isdigit() and int(c) >= 0)
                / max(len([c for c in data["conf"] if str(c).isdigit() and int(c) >= 0]), 1)
            )

            return {
                "raw_text":   raw_text,
                "confidence": round(avg_conf / 100, 3),
                "fields":     self._extract_fields(raw_text),
                "word_count": len(confident_words),
                "page_count": 1,
                "engine":     "tesseract",
            }

        except Exception as exc:
            logger.error("Image OCR failed: %s", exc)
            return self._empty_result()

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _extract_fields(self, text: str) -> dict:
        fields: dict[str, list[str]] = {}
        for field_name, pattern in self._FIELD_PATTERNS.items():
            matches = re.findall(pattern, text)
            if matches:
                fields[field_name] = list(dict.fromkeys(matches))  # unique, ordered
        return fields

    @staticmethod
    def _empty_result() -> dict:
        return {
            "raw_text":   "",
            "confidence": 0.0,
            "fields":     {},
            "word_count": 0,
            "page_count": 0,
            "engine":     "none",
        }
