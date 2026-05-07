"""
VerifiDoc AI — Anomaly Detection Service
Pixel-level forgery detection using Error Level Analysis (ELA),
noise inconsistency checks, and semantic consistency validation.
"""

import io
import logging
import math
import re
from pathlib import Path

import numpy as np

logger = logging.getLogger("verifidoc.anomaly")


class AnomalyService:
    """Runs computer-vision and semantic checks to surface forgery indicators."""

    def analyze(self, file_path: str, ocr_result: dict) -> dict:
        anomalies: list[dict] = []

        suffix = Path(file_path).suffix.lower()
        if suffix in {".jpg", ".jpeg", ".png"}:
            anomalies += self._run_ela(file_path)
            anomalies += self._run_noise_analysis(file_path)
        elif suffix == ".pdf":
            anomalies += self._run_pdf_structural_checks(file_path)

        anomalies += self._run_semantic_checks(ocr_result)
        anomalies += self._run_field_consistency_checks(ocr_result)

        return {"anomalies": anomalies}

    # ── Error Level Analysis ──────────────────────────────────────────────────

    def _run_ela(self, file_path: str) -> list[dict]:
        """
        ELA: re-compress the image at a known quality and compute the
        difference.  Manipulated regions have higher error levels.
        """
        try:
            from PIL import Image

            anomalies: list[dict] = []

            img = Image.open(file_path).convert("RGB")

            # Ensure the image is large enough to be meaningful
            if img.width < 100 or img.height < 100:
                return []

            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=90)
            buf.seek(0)
            compressed = Image.open(buf).convert("RGB")

            orig_arr = np.array(img, dtype=np.float32)
            comp_arr = np.array(compressed, dtype=np.float32)
            ela_arr  = np.abs(orig_arr - comp_arr)

            mean_ela = float(np.mean(ela_arr))
            max_ela  = float(np.max(ela_arr))
            std_ela  = float(np.std(ela_arr))

            # Heuristic thresholds (tuned for typical financial document scans)
            if max_ela > 60 and std_ela > 15:
                anomalies.append({
                    "type":        "ELA_TAMPERING",
                    "severity":    "HIGH" if max_ela > 80 else "MEDIUM",
                    "description": (
                        f"Error Level Analysis detected pixel inconsistencies "
                        f"(max_error={max_ela:.1f}, std={std_ela:.1f}). "
                        "This may indicate copy-paste manipulation or airbrushing."
                    ),
                    "confidence": min(max_ela / 120, 1.0),
                    "location":   "image_body",
                })
            elif mean_ela > 20:
                anomalies.append({
                    "type":        "ELA_MODERATE_NOISE",
                    "severity":    "LOW",
                    "description": f"Slight ELA inconsistency detected (mean={mean_ela:.1f}). Document may have been processed.",
                    "confidence":  0.35,
                    "location":    "image_body",
                })

            # ── Block variance check ──────────────────────────────────────────
            block_size = 64
            h, w = ela_arr.shape[:2]
            block_means: list[float] = []
            for r in range(0, h - block_size, block_size):
                for c in range(0, w - block_size, block_size):
                    block = ela_arr[r : r + block_size, c : c + block_size]
                    block_means.append(float(np.mean(block)))

            if block_means:
                global_mean = sum(block_means) / len(block_means)
                hot_blocks  = sum(1 for bm in block_means if bm > global_mean * 3.5)
                if hot_blocks >= 3:
                    anomalies.append({
                        "type":        "ELA_HOT_REGIONS",
                        "severity":    "HIGH",
                        "description": (
                            f"Found {hot_blocks} image blocks with significantly elevated error levels, "
                            "suggesting localised content insertion."
                        ),
                        "confidence": min(hot_blocks / 10, 0.95),
                        "location":   f"{hot_blocks} block(s) detected",
                    })

            return anomalies

        except Exception as exc:
            logger.warning("ELA failed: %s", exc)
            return []

    # ── Noise Analysis ────────────────────────────────────────────────────────

    def _run_noise_analysis(self, file_path: str) -> list[dict]:
        """
        Check for uneven noise distribution across the image.
        Authentic scans have consistent sensor noise; edited images do not.
        """
        try:
            from PIL import Image
            import cv2

            img_pil = Image.open(file_path).convert("L")  # grayscale
            img_np  = np.array(img_pil)

            h, w = img_np.shape
            if h < 200 or w < 200:
                return []

            # Estimate local noise in 4 quadrants
            quadrants = [
                img_np[: h // 2, : w // 2],
                img_np[: h // 2, w // 2 :],
                img_np[h // 2 :, : w // 2],
                img_np[h // 2 :, w // 2 :],
            ]

            def _noise_level(quad: np.ndarray) -> float:
                laplacian = cv2.Laplacian(quad.astype(np.float32), cv2.CV_32F)
                return float(laplacian.var())

            noise_levels = [_noise_level(q) for q in quadrants]
            avg_noise    = sum(noise_levels) / len(noise_levels)
            deviation    = math.sqrt(sum((n - avg_noise) ** 2 for n in noise_levels) / len(noise_levels))
            cv_noise     = deviation / max(avg_noise, 1)  # coefficient of variation

            anomalies: list[dict] = []
            if cv_noise > 0.6:
                anomalies.append({
                    "type":        "NOISE_INCONSISTENCY",
                    "severity":    "HIGH" if cv_noise > 1.0 else "MEDIUM",
                    "description": (
                        f"Uneven noise distribution across quadrants (CV={cv_noise:.2f}). "
                        "Authentic scans have uniform noise. This suggests composite image assembly."
                    ),
                    "confidence": min(cv_noise / 1.5, 0.9),
                    "location":   "multiple_regions",
                })

            return anomalies

        except ImportError:
            logger.debug("OpenCV not available; skipping noise analysis")
            return []
        except Exception as exc:
            logger.warning("Noise analysis failed: %s", exc)
            return []

    # ── PDF Structural Checks ─────────────────────────────────────────────────

    def _run_pdf_structural_checks(self, file_path: str) -> list[dict]:
        """Check PDF internal structure for signs of manipulation."""
        try:
            import pdfplumber

            anomalies: list[dict] = []

            with pdfplumber.open(file_path) as pdf:
                meta  = pdf.metadata or {}
                pages = pdf.pages

                # Multiple content streams or inconsistent page sizes can indicate splicing
                page_sizes = [(round(p.width), round(p.height)) for p in pages]
                unique_sizes = set(page_sizes)
                if len(unique_sizes) > 2 and len(pages) >= 3:
                    anomalies.append({
                        "type":        "PDF_MIXED_PAGE_SIZES",
                        "severity":    "MEDIUM",
                        "description": f"Document contains {len(unique_sizes)} different page sizes — may indicate pages sourced from multiple documents.",
                        "confidence":  0.55,
                        "location":    "document_structure",
                    })

                # Embedded JavaScript
                js_keys = [k for k in (meta or {}).keys() if "javascript" in str(k).lower() or "js" in str(k).lower()]
                if js_keys:
                    anomalies.append({
                        "type":        "PDF_EMBEDDED_JAVASCRIPT",
                        "severity":    "CRITICAL",
                        "description": "Embedded JavaScript detected in PDF. This is unusual for financial documents and may indicate malicious modification.",
                        "confidence":  0.90,
                        "location":    "pdf_metadata",
                    })

            return anomalies

        except Exception as exc:
            logger.warning("PDF structural checks failed: %s", exc)
            return []

    # ── Semantic / Text Checks ────────────────────────────────────────────────

    def _run_semantic_checks(self, ocr_result: dict) -> list[dict]:
        """Rule-based semantic validation of extracted text."""
        anomalies: list[dict] = []
        text       = (ocr_result.get("raw_text") or "").lower()
        confidence = ocr_result.get("confidence", 0)

        if not text or confidence < 0.1:
            return anomalies

        # Contradictory legal terms
        pairs = [
            ("approved", "rejected"),
            ("sanctioned", "denied"),
            ("active", "closed"),
            ("original", "copy"),
        ]
        for term_a, term_b in pairs:
            if term_a in text and term_b in text:
                anomalies.append({
                    "type":        "CONTRADICTORY_TERMS",
                    "severity":    "MEDIUM",
                    "description": f"Document contains contradictory terms: '{term_a}' and '{term_b}' both appear.",
                    "confidence":  0.60,
                    "location":    "document_text",
                })

        # Placeholder text not replaced
        placeholders = ["[insert", "[name]", "[date]", "xxxx", "____", "your name here", "sample text"]
        for ph in placeholders:
            if ph in text:
                anomalies.append({
                    "type":        "UNREPLACED_PLACEHOLDER",
                    "severity":    "HIGH",
                    "description": f"Template placeholder '{ph}' found in document. Document may be fabricated from a template.",
                    "confidence":  0.85,
                    "location":    "document_text",
                })
                break

        # Suspiciously round large numbers (possible fabrication)
        amounts = re.findall(r"(?:rs\.?|inr|₹)\s*([\d,]+)", text)
        for amt in amounts:
            val = int(amt.replace(",", ""))
            if val > 100000 and val % 100000 == 0:
                anomalies.append({
                    "type":        "SUSPICIOUSLY_ROUND_AMOUNT",
                    "severity":    "LOW",
                    "description": f"Very round financial figure detected: ₹{val:,}. Genuine documents rarely feature perfectly rounded large amounts.",
                    "confidence":  0.30,
                    "location":    "financial_fields",
                })
                break

        return anomalies

    # ── Field Consistency Checks ──────────────────────────────────────────────

    def _run_field_consistency_checks(self, ocr_result: dict) -> list[dict]:
        """Cross-validate extracted structured fields."""
        anomalies: list[dict] = []
        fields = ocr_result.get("fields", {})
        text = (ocr_result.get("raw_text") or "").lower()

        # Multiple distinct PAN numbers in one document
        pans = fields.get("pan_number", [])
        if len(set(pans)) > 2:
            anomalies.append({
                "type":        "MULTIPLE_PAN_NUMBERS",
                "severity":    "HIGH",
                "description": f"Found {len(set(pans))} distinct PAN numbers. A genuine document should reference at most one individual's PAN.",
                "confidence":  0.80,
                "location":    "identity_fields",
            })

        # Multiple Aadhaar numbers
        aadhaars = fields.get("aadhaar_number", [])
        if len(set(aadhaars)) > 1:
            anomalies.append({
                "type":        "MULTIPLE_AADHAAR_NUMBERS",
                "severity":    "HIGH",
                "description": f"Found {len(set(aadhaars))} distinct Aadhaar numbers in a single document.",
                "confidence":  0.80,
                "location":    "identity_fields",
            })

        # Multiple IFSC codes (unusual in a single bank statement)
        ifscs = fields.get("ifsc_code", [])
        if len(set(ifscs)) > 3:
            anomalies.append({
                "type":        "EXCESSIVE_IFSC_CODES",
                "severity":    "MEDIUM",
                "description": f"Detected {len(set(ifscs))} unique IFSC codes. A standard bank statement should contain 1–2.",
                "confidence":  0.55,
                "location":    "banking_fields",
            })

        # ── NEW: Amount figure vs. word mismatch ──────────────────────────────
        amounts = fields.get("amount", [])
        if amounts:
            for amt_str in amounts:
                try:
                    # Extract numeric value
                    numeric_val = int(re.sub(r"[^\d]", "", str(amt_str)))
                    words_val = self._text_amount_to_numeric(text, numeric_val)
                    
                    if words_val > 0 and abs(numeric_val - words_val) / max(numeric_val, words_val) > 0.15:
                        anomalies.append({
                            "type":        "AMOUNT_FIGURE_WORD_MISMATCH",
                            "severity":    "CRITICAL",
                            "description": f"Amount mismatch: Figure shows ₹{numeric_val:,} but written amount suggests ₹{words_val:,}. This indicates document tampering or copy-paste error.",
                            "confidence":  0.85,
                            "location":    "financial_fields",
                        })
                except Exception:
                    pass

        # ── NEW: IFSC code vs. Bank name mismatch ────────────────────────────
        ifscs = fields.get("ifsc_code", [])
        banks = fields.get("bank_name", [])
        
        if ifscs and banks:
            ifsc_bank_map = {
                "SBIN": "State Bank", "HDFC": "HDFC Bank", "ICIC": "ICICI Bank",
                "AXIS": "Axis Bank", "KKBK": "Kotak Mahindra", "CITI": "Citibank",
                "UTIB": "Axis Bank", "CANARA": "Canara Bank", "BOB": "Bank of Baroda",
                "PNB": "Punjab National", "INDB": "IndusInd", "BKID": "Bank of India",
                "UNION": "Union Bank", "SBT": "State Bank", "IDFB": "IDFB Bank",
                "YES": "YES Bank", "SCBL": "Standard Chartered", "HSBC": "HSBC",
                "ABY": "Allahabad Bank", "OBC": "Oriental Bank", "CORP": "Corporation Bank",
            }
            
            for ifsc in ifscs:
                for bank in banks:
                    ifsc_prefix = ifsc[:4].upper() if len(ifsc) >= 4 else ""
                    if ifsc_prefix and ifsc_prefix in ifsc_bank_map:
                        expected_bank = ifsc_bank_map[ifsc_prefix].lower()
                        if expected_bank not in bank.lower():
                            anomalies.append({
                                "type":        "IFSC_BANK_MISMATCH",
                                "severity":    "CRITICAL",
                                "description": f"IFSC code '{ifsc}' belongs to {ifsc_bank_map[ifsc_prefix]}, but document lists bank as '{bank}'. This is a clear fabrication indicator.",
                                "confidence":  0.92,
                                "location":    "banking_fields",
                            })
                            break

        # ── NEW: High-risk jurisdiction detection ──────────────────────────────
        high_risk_jurisdictions = [
            "cayman", "panama", "bermuda", "bvi", "british virgin",
            "virgin islands", "seychelles", "mauritius", "turks and caicos",
            "bahamas", "gibraltar", "samoa", "vanuatu", "palau", "marshall"
        ]
        
        addresses = fields.get("address", [])
        if addresses:
            for addr in addresses:
                addr_lower = str(addr).lower()
                for jurisdiction in high_risk_jurisdictions:
                    if jurisdiction in addr_lower:
                        anomalies.append({
                            "type":        "HIGH_RISK_JURISDICTION",
                            "severity":    "CRITICAL",
                            "description": f"Address registered in '{jurisdiction.title()}', a high-risk jurisdiction for AML/CFT compliance. This requires enhanced due diligence.",
                            "confidence":  0.90,
                            "location":    "address_fields",
                        })
                        break

        # ── NEW: Suspicious date patterns (future dates, too old dates) ────────
        dates = fields.get("date", [])
        if dates:
            import datetime
            today = datetime.date.today()
            
            for date_str in dates:
                try:
                    # Try to parse date (simple heuristic)
                    date_obj = None
                    for fmt in ["%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%y"]:
                        try:
                            date_obj = datetime.datetime.strptime(str(date_str), fmt).date()
                            break
                        except:
                            pass
                    
                    if date_obj:
                        if date_obj > today:
                            anomalies.append({
                                "type":        "FUTURE_DATE_ANOMALY",
                                "severity":    "HIGH",
                                "description": f"Document contains a future date: {date_obj}. This is impossible for an authentic document.",
                                "confidence":  0.95,
                                "location":    "date_fields",
                            })
                        elif (today - date_obj).days > 7300:  # ~20 years
                            anomalies.append({
                                "type":        "SUSPICIOUSLY_OLD_DATE",
                                "severity":    "MEDIUM",
                                "description": f"Document date is over 20 years old ({date_obj}). May indicate expired or archived document being reused.",
                                "confidence":  0.45,
                                "location":    "date_fields",
                            })
                except:
                    pass

        return anomalies

    @staticmethod
    def _text_amount_to_numeric(text: str, reference_numeric: int) -> int:
        """
        Try to extract a number written in words from text.
        Returns the numeric value if found, else 0.
        """
        word_to_num = {
            "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
            "hundred": 100, "thousand": 1000, "lakh": 100000, "lac": 100000,
            "crore": 10000000, "million": 1000000, "billion": 1000000000,
            "fifty": 50, "twenty": 20, "thirty": 30, "forty": 40, "sixty": 60,
            "seventy": 70, "eighty": 80, "ninety": 90,
        }
        
        # Search for common amount patterns in text
        patterns = [
            r"(?:rupees?|rs\.?|inr|₹)?\s*([a-z\s]+?)(?:\s|,|\.)", 
            r"(?:amount|figure|sum).*?([a-z\s]+?)(?:\s|,|\.)",
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                phrase = match.group(1).strip()
                words = phrase.split()
                
                # Simple conversion: look for patterns like "fifty lakh"
                total = 0
                for word in words:
                    if word in word_to_num:
                        val = word_to_num[word]
                        if val >= 100:
                            total *= val
                        else:
                            total += val
                
                if total > 0:
                    return total
        
        return 0

