"""Mock extraction layer for the sample PDFs.

This parses the intentionally simple text-based PDFs in ``mock_pdfs/`` and
produces normalized fields for the scoring backend.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict


BASE_DIR = Path(__file__).parent


def _read_pdf_text(pdf_path: Path) -> str:
    """Return a text view of the PDF bytes.

    These mock PDFs were generated as plain-text PDF streams, so regex-based
    extraction is sufficient for the demo.
    """
    return pdf_path.read_bytes().decode("latin-1", errors="ignore")


def _extract_currency(text: str, label: str) -> int | None:
    pattern = rf"{re.escape(label)}:\s*INR\s*([0-9,]+)"
    match = re.search(pattern, text, flags=re.IGNORECASE)
    if not match:
        return None
    return int(match.group(1).replace(",", ""))


def _extract_bool(text: str, label: str) -> bool | None:
    pattern = rf"{re.escape(label)}:\s*(TRUE|FALSE|YES|NO)"
    match = re.search(pattern, text, flags=re.IGNORECASE)
    if not match:
        return None
    value = match.group(1).upper()
    return value in {"TRUE", "YES"}


def _extract_int(text: str, label: str) -> int | None:
    pattern = rf"{re.escape(label)}:\s*([0-9]+)"
    match = re.search(pattern, text, flags=re.IGNORECASE)
    if not match:
        return None
    return int(match.group(1))


def extract_bank_statement(pdf_path: Path) -> Dict[str, Any]:
    text = _read_pdf_text(pdf_path)
    return {
        "monthly_revenue": _extract_currency(text, "Average Monthly Credit"),
        "emi": _extract_currency(text, "Existing EMI Debit"),
        "total_debt": _extract_currency(text, "Outstanding Business Loan Balance"),
        "source_document": pdf_path.name,
    }


def extract_gst_filing(pdf_path: Path) -> Dict[str, Any]:
    text = _read_pdf_text(pdf_path)
    return {
        "gst_compliant": _extract_bool(text, "Compliance Flag"),
        "source_document": pdf_path.name,
    }


def extract_incorporation_certificate(pdf_path: Path) -> Dict[str, Any]:
    text = _read_pdf_text(pdf_path)
    return {
        "business_age_months": _extract_int(text, "Derived Business Age Months"),
        "source_document": pdf_path.name,
    }


def extract_loan_history(pdf_path: Path) -> Dict[str, Any]:
    text = _read_pdf_text(pdf_path)
    return {
        "has_disputes": _extract_bool(text, "Has Disputes Flag"),
        "source_document": pdf_path.name,
    }


def build_scoring_payload(package_dir: Path | None = None) -> Dict[str, Any]:
    source_dir = package_dir or BASE_DIR
    payload: Dict[str, Any] = {}
    documents = [
        extract_bank_statement(source_dir / "bank_statement_sample.pdf"),
        extract_gst_filing(source_dir / "gst_filing_sample.pdf"),
        extract_incorporation_certificate(source_dir / "incorporation_certificate_sample.pdf"),
        extract_loan_history(source_dir / "loan_history_disputes_sample.pdf"),
    ]

    for document_data in documents:
        normalized = {key: value for key, value in document_data.items() if key != "source_document"}
        payload.update(normalized)

    return payload


def _build_result(package_dir: Path | None = None) -> Dict[str, Any]:
    source_dir = package_dir or BASE_DIR
    return {
        "documents": {
            "bank_statement": extract_bank_statement(source_dir / "bank_statement_sample.pdf"),
            "gst_filing": extract_gst_filing(source_dir / "gst_filing_sample.pdf"),
            "incorporation_certificate": extract_incorporation_certificate(
                source_dir / "incorporation_certificate_sample.pdf"
            ),
            "loan_history": extract_loan_history(source_dir / "loan_history_disputes_sample.pdf"),
        },
        "scoring_payload": build_scoring_payload(source_dir),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract scoring payload from a mock PDF package.")
    parser.add_argument(
        "--package-dir",
        type=Path,
        default=BASE_DIR,
        help="Folder containing bank_statement_sample.pdf, gst_filing_sample.pdf, incorporation_certificate_sample.pdf, loan_history_disputes_sample.pdf",
    )
    args = parser.parse_args()
    result = _build_result(args.package_dir)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
