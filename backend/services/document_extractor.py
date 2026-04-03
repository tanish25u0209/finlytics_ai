"""
Mock document extraction service for uploaded PDF files.

This service keeps the demo architecture realistic:
frontend uploads PDFs -> backend extracts normalized fields -> scoring engine
consumes the structured payload.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, Iterable

from fastapi import UploadFile


class MockDocumentExtractor:
    """Parse demo PDFs and normalize them into scoring fields."""

    def _read_bytes_text(self, content: bytes) -> str:
        return content.decode("latin-1", errors="ignore")

    def _extract_currency(self, text: str, label: str) -> int | None:
        pattern = rf"{re.escape(label)}:\s*INR\s*([0-9,]+)"
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if not match:
            return None
        return int(match.group(1).replace(",", ""))

    def _extract_bool(self, text: str, label: str) -> bool | None:
        pattern = rf"{re.escape(label)}:\s*(TRUE|FALSE|YES|NO)"
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if not match:
            return None
        return match.group(1).upper() in {"TRUE", "YES"}

    def _extract_int(self, text: str, label: str) -> int | None:
        pattern = rf"{re.escape(label)}:\s*([0-9]+)"
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if not match:
            return None
        return int(match.group(1))

    def _extract_from_kind(self, kind: str, text: str, filename: str) -> Dict[str, Any]:
        if kind == "bank_statement":
            return {
                "monthly_revenue": self._extract_currency(text, "Average Monthly Credit"),
                "emi": self._extract_currency(text, "Existing EMI Debit"),
                "total_debt": self._extract_currency(text, "Outstanding Business Loan Balance"),
                "source_document": filename,
                "document_type": kind,
            }

        if kind == "gst_filing":
            return {
                "gst_compliant": self._extract_bool(text, "Compliance Flag"),
                "source_document": filename,
                "document_type": kind,
            }

        if kind == "incorporation_certificate":
            return {
                "business_age_months": self._extract_int(text, "Derived Business Age Months"),
                "source_document": filename,
                "document_type": kind,
            }

        if kind == "loan_history":
            return {
                "has_disputes": self._extract_bool(text, "Has Disputes Flag"),
                "source_document": filename,
                "document_type": kind,
            }

        return {
            "source_document": filename,
            "document_type": "unknown",
        }

    def infer_document_type(self, filename: str) -> str:
        normalized = Path(filename).stem.lower()
        if "bank" in normalized and "statement" in normalized:
            return "bank_statement"
        if "gst" in normalized:
            return "gst_filing"
        if "incorporation" in normalized or "certificate" in normalized:
            return "incorporation_certificate"
        if "loan_history" in normalized or "dispute" in normalized:
            return "loan_history"
        return "unknown"

    async def extract_uploaded_document(self, upload: UploadFile) -> Dict[str, Any]:
        content = await upload.read()
        text = self._read_bytes_text(content)
        document_type = self.infer_document_type(upload.filename or "unknown.pdf")
        return self._extract_from_kind(document_type, text, upload.filename or "unknown.pdf")

    def build_scoring_payload(self, documents: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
        payload: Dict[str, Any] = {}
        for document_data in documents:
            payload.update(
                {
                    key: value
                    for key, value in document_data.items()
                    if key not in {"source_document", "document_type"} and value is not None
                }
            )
        return payload
