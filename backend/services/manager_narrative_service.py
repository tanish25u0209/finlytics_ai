"""Narrative generation for manager dashboard tabs with LLM + deterministic fallback."""
from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Tuple
from urllib import request as urllib_request


class ManagerNarrativeService:
    """Build per-application narrative lists for dashboard tabs."""

    def __init__(self) -> None:
        self._api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        self._model = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini").strip()
        self._base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
        self._cache: Dict[str, Dict[str, Any]] = {}

    def generate_narratives(self, record: Dict[str, Any], metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Return narrative sections and generation source metadata."""
        cache_key = self._build_cache_key(record, metrics)
        cached = self._cache.get(cache_key)
        if cached:
            return cached

        fallback_sections = self._build_fallback_sections(record, metrics)
        if not self._api_key:
            payload = {
                "sections": fallback_sections,
                "source": "fallback",
            }
            self._cache[cache_key] = payload
            return payload

        llm_sections = self._generate_with_llm(record, metrics)
        if llm_sections is None:
            payload = {
                "sections": fallback_sections,
                "source": "fallback",
            }
            self._cache[cache_key] = payload
            return payload

        payload = {
            "sections": llm_sections,
            "source": "llm",
        }
        self._cache[cache_key] = payload
        return payload

    def _build_cache_key(self, record: Dict[str, Any], metrics: Dict[str, Any]) -> str:
        payload = {
            "id": record.get("id"),
            "updatedAt": record.get("updatedAt"),
            "companyName": record.get("companyName"),
            "loanAmount": record.get("loanAmount"),
            "metrics": metrics,
        }
        return json.dumps(payload, sort_keys=True, default=str)

    def _generate_with_llm(self, record: Dict[str, Any], metrics: Dict[str, Any]) -> Dict[str, List[str]] | None:
        system_prompt = (
            "You are a credit risk analyst assistant. "
            "Write concise, business-specific reasoning for one loan application. "
            "Do not fabricate external facts. Use only provided inputs. "
            "Return only valid JSON with keys: credibility, financial, industry, siteReview, risk. "
            "Each key must map to an array of 3 short bullet-style strings."
        )
        user_payload = {
            "application": {
                "id": record.get("id"),
                "companyName": record.get("companyName"),
                "loanAmount": record.get("loanAmount"),
                "riskLevel": record.get("riskLevel"),
                "currentStage": record.get("currentStage"),
            },
            "metrics": metrics,
        }

        body = {
            "model": self._model,
            "temperature": 0.3,
            "max_tokens": 450,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload)},
            ],
        }

        req = urllib_request.Request(
            f"{self._base_url}/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": os.getenv("OPENROUTER_HTTP_REFERER", "http://localhost"),
                "X-Title": os.getenv("OPENROUTER_APP_TITLE", "Ignisia Manager Dashboard"),
            },
            method="POST",
        )

        try:
            with urllib_request.urlopen(req, timeout=12) as response:
                raw = response.read().decode("utf-8")
            parsed = json.loads(raw)
            content = (
                parsed.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            )
            section_payload = self._extract_json(content)
            return self._validate_sections(section_payload)
        except Exception:
            return None

    def _extract_json(self, content: str) -> Dict[str, Any]:
        try:
            return json.loads(content)
        except Exception:
            start = content.find("{")
            end = content.rfind("}")
            if start >= 0 and end > start:
                return json.loads(content[start : end + 1])
            raise

    def _validate_sections(self, payload: Dict[str, Any]) -> Dict[str, List[str]] | None:
        keys = ["credibility", "financial", "industry", "siteReview", "risk"]
        normalized: Dict[str, List[str]] = {}
        for key in keys:
            values = payload.get(key)
            if not isinstance(values, list):
                return None
            clean = [str(item).strip() for item in values if str(item).strip()]
            if not clean:
                return None
            normalized[key] = clean[:4]
        return normalized

    def _build_fallback_sections(self, record: Dict[str, Any], metrics: Dict[str, Any]) -> Dict[str, List[str]]:
        extracted_payload = metrics.get("extracted_payload") or {}
        top_reasons = metrics.get("top_reasons") or []
        risk_band = str(metrics.get("risk_band") or "Awaiting scoring")
        business_age_months = int(extracted_payload.get("business_age_months") or 0)
        business_age_years = business_age_months / 12 if business_age_months else 0
        monthly_revenue = float(extracted_payload.get("monthly_revenue") or 0)
        total_debt = float(extracted_payload.get("total_debt") or 0)
        monthly_emi = float(extracted_payload.get("monthly_emi") or 0)
        gst_compliant = bool(extracted_payload.get("gst_compliant"))
        has_disputes = bool(extracted_payload.get("has_disputes"))
        dscr = float(metrics.get("dscr") or 0)
        current_ratio = float(metrics.get("current_ratio") or 0)
        pd_pct = int(round(float(metrics.get("probability_of_default") or 0) * 100))
        processed_documents = metrics.get("processed_documents") or []

        doc_types = [str(doc.get("document_type") or "document") for doc in processed_documents if isinstance(doc, dict)]
        unique_doc_types = list(dict.fromkeys(doc_types))
        document_phrase = ", ".join(unique_doc_types[:3]) if unique_doc_types else "submitted files"

        debt_ratio = (total_debt / max(monthly_revenue * 12, 1.0)) if monthly_revenue > 0 else 0.0
        emi_ratio = (monthly_emi / max(monthly_revenue, 1.0)) if monthly_revenue > 0 else 0.0

        credibility_lines = [
            f"Business vintage is {business_age_years:.1f} years with current risk band marked as {risk_band}.",
            f"GST compliance is {'active' if gst_compliant else 'not confirmed'}, and dispute history is {'present' if has_disputes else 'not indicated'} in extracted records.",
            top_reasons[0] if top_reasons else "Narrative confidence is lower where upstream explainability reasons are unavailable.",
        ]

        financial_lines = [
            f"Observed monthly revenue is about Rs {monthly_revenue:,.0f}, with EMI load near {emi_ratio * 100:.1f}% of revenue.",
            f"Debt service coverage is {dscr:.1f}x and current ratio is {current_ratio:.1f}x based on extracted financial fields.",
            f"Debt to annualized revenue ratio is {debt_ratio:.2f}, indicating {'moderate' if debt_ratio < 0.7 else 'elevated'} leverage.",
        ]

        industry_lines = [
            f"This case is currently benchmarked under {risk_band} segment behavior from GST-linked explainability outputs.",
            f"Primary comparative signals are derived from {document_phrase} and tax behavior proxies rather than static industry assumptions.",
            top_reasons[1] if len(top_reasons) > 1 else "Additional sector-level insight should be refreshed when richer transaction telemetry is available.",
        ]

        site_lines = [
            f"Document review reflects {len(processed_documents)} processed artifacts covering {document_phrase}.",
            f"Latest workflow update timestamp is {record.get('updatedAt') or 'not available'}, used as the current review checkpoint.",
            "No physical site red flag is auto-detected; manual verifier notes should supplement this desk review.",
        ]

        risk_lines = [
            f"Modeled probability of default is {pd_pct}% with declared risk band {risk_band}.",
            top_reasons[2] if len(top_reasons) > 2 else "Top model risk drivers are limited; use caution in final credit committee discussion.",
            f"Recommended exposure should account for collateral buffer and the current EMI stress level of {emi_ratio * 100:.1f}%.",
        ]

        return {
            "credibility": credibility_lines,
            "financial": financial_lines,
            "industry": industry_lines,
            "siteReview": site_lines,
            "risk": risk_lines,
        }
