"""
VerifiDoc AI — Risk Engine
Combines signals from metadata, OCR, and anomaly detection
into a final risk score, level, and recommendations.
"""

import logging
import time

logger = logging.getLogger("verifidoc.risk")

# Severity → base score contribution
_SEVERITY_WEIGHT = {
    "CRITICAL": 35,
    "HIGH":     22,
    "MEDIUM":   12,
    "LOW":       6,
}

# Metadata flag patterns and their score contributions
_METADATA_PENALTIES = {
    "SUSPICIOUS_CREATOR_SOFTWARE":   15,
    "EDITED_WITH_IMAGE_SOFTWARE":    15,
    "DOCUMENT_MODIFIED_AFTER_CREATION": 8,
    "MISSING_CREATOR_METADATA":       5,
    "NO_EXIF_DATA":                   5,
    "NO_DEVICE_OR_SOFTWARE_INFO":     5,
    "CREATION_DATE_IN_FUTURE":       20,
    "IMAGE_DATE_IN_FUTURE":          20,
    "SUSPICIOUS_AUTHOR_STRING":      12,
    "METADATA_EXTRACTION_FAILED":     3,
    "MALFORMED_DATE_FIELD":           8,
    "PDF_EMBEDDED_JAVASCRIPT":       30,
}

# Anomaly-type-specific multipliers (applied on top of severity weight)
_ANOMALY_TYPE_MULTIPLIERS = {
    "AMOUNT_FIGURE_WORD_MISMATCH":   2.5,  # Critical cross-field validation failure
    "IFSC_BANK_MISMATCH":            2.2,  # Impossible banking detail mismatch
    "HIGH_RISK_JURISDICTION":        2.0,  # AML/CFT red flag
    "ELA_TAMPERING":                 1.8,  # Pixel-level forgery
    "ELA_HOT_REGIONS":               1.8,  # Localised tampering
    "NOISE_INCONSISTENCY":           1.5,  # Composite image
    "CONTRADICTORY_TERMS":           1.4,  # Logical inconsistency
    "MULTIPLE_PAN_NUMBERS":          1.6,  # Identity fraud indicator
    "MULTIPLE_AADHAAR_NUMBERS":      1.6,  # Identity fraud indicator
}


class RiskEngine:

    def calculate(
        self,
        metadata_result: dict,
        ocr_result: dict,
        anomaly_result: dict,
    ) -> dict:
        t_start = time.perf_counter()

        score = 0
        all_anomalies: list[dict] = []

        # ── Anomaly scores with type-specific multipliers ──────────────────────
        for anomaly in anomaly_result.get("anomalies", []):
            weight = _SEVERITY_WEIGHT.get(anomaly.get("severity", "LOW"), 5)
            
            # Apply anomaly-type multiplier for critical cross-field issues
            anomaly_type = anomaly.get("type", "")
            multiplier = _ANOMALY_TYPE_MULTIPLIERS.get(anomaly_type, 1.0)
            weight = int(weight * multiplier)
            
            score += weight
            all_anomalies.append(anomaly)

        # ── Metadata penalties ────────────────────────────────────────────────
        for flag in metadata_result.get("flags", []):
            for key, penalty in _METADATA_PENALTIES.items():
                if flag.startswith(key):
                    score += penalty
                    break

        # ── OCR confidence penalty ────────────────────────────────────────────
        ocr_confidence = ocr_result.get("confidence", 0.5)
        if ocr_confidence < 0.2:
            score += 10  # Very low confidence → possible blank/empty document
        elif ocr_confidence < 0.4:
            score += 5

        # ── Clamp to 0–100 ───────────────────────────────────────────────────
        score = max(0, min(score, 100))

        risk_level = self._score_to_level(score)
        processing_time_ms = round((time.perf_counter() - t_start) * 1000)

        logger.debug("Risk score: %s  level: %s  anomalies: %s", score, risk_level, len(all_anomalies))

        return {
            "risk_score":          score,
            "risk_level":          risk_level,
            "anomalies":           all_anomalies,
            "recommendations":     self._build_recommendations(score, risk_level, all_anomalies, metadata_result),
            "processing_time_ms":  processing_time_ms,
        }

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _score_to_level(score: int) -> str:
        if score >= 70:
            return "CRITICAL"
        elif score >= 40:
            return "HIGH"
        elif score >= 15:
            return "MODERATE"
        else:
            return "LOW"

    @staticmethod
    def _build_recommendations(
        score: int,
        level: str,
        anomalies: list[dict],
        metadata_result: dict,
    ) -> list[str]:
        recs: list[str] = []

        if level == "LOW":
            recs.append("Document appears authentic. Proceed with standard underwriting workflow.")
            recs.append("Retain a certified copy for audit records.")
            return recs

        if level == "MODERATE":
            recs.append("Minor inconsistencies detected. Request additional supporting documents.")
            recs.append("Cross-verify key figures against original source (bank, IT department).")

        if level in {"HIGH", "CRITICAL"}:
            recs.append("STOP processing. Flag this application for manual senior review.")
            recs.append("Do NOT disburse any funds until document authenticity is confirmed.")
            recs.append("Contact the applicant to re-submit notarised / certified originals.")
            recs.append("Log this case in the fraud registry and notify the compliance team.")

        # Anomaly-specific guidance
        anomaly_types = {a["type"] for a in anomalies}

        if "ELA_TAMPERING" in anomaly_types or "ELA_HOT_REGIONS" in anomaly_types:
            recs.append("Request a fresh scan of the original physical document from a bank-approved scanner.")

        if "NOISE_INCONSISTENCY" in anomaly_types:
            recs.append("Ask applicant to provide the document via official digital channel (DigiLocker, e-mail from issuer).")

        if "AMOUNT_FIGURE_WORD_MISMATCH" in anomaly_types:
            recs.append("CRITICAL: Amount in figures does not match written amount. Request certified original and escalate to fraud team immediately.")

        if "IFSC_BANK_MISMATCH" in anomaly_types:
            recs.append("CRITICAL: IFSC code does not belong to stated bank. This indicates document fabrication. Block this applicant and file fraud report.")

        if "HIGH_RISK_JURISDICTION" in anomaly_types:
            recs.append("Address registered in high-risk AML/CFT jurisdiction. Conduct enhanced due diligence and OFAC screening before proceeding.")

        if "FUTURE_DATE_ANOMALY" in anomaly_types:
            recs.append("Document contains a future date (impossible). Reject immediately and flag as fabricated.")

        if "MULTIPLE_PAN_NUMBERS" in anomaly_types or "MULTIPLE_AADHAAR_NUMBERS" in anomaly_types:
            recs.append("Identity field anomaly: cross-check PAN/Aadhaar with NSDL/UIDAI portals.")

        if "CONTRADICTORY_TERMS" in anomaly_types:
            recs.append("Legal text inconsistency found. Refer document to the legal team for clause-level review.")

        if "UNREPLACED_PLACEHOLDER" in anomaly_types:
            recs.append("Document appears to be an unfinished template. Reject and request the original.")

        for flag in metadata_result.get("flags", []):
            if "SOFTWARE" in flag:
                recs.append("Metadata indicates use of image-editing software. Treat this document as suspect.")
                break

        # De-duplicate while preserving order
        seen: set[str] = set()
        unique_recs: list[str] = []
        for r in recs:
            if r not in seen:
                seen.add(r)
                unique_recs.append(r)

        return unique_recs
