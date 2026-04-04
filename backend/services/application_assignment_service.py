"""Application assignment persistence service for borrower-manager routing."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from services.manager_narrative_service import ManagerNarrativeService
from services.scoring_engine import ScoringEngine


class ApplicationAssignmentService:
    """Persist and retrieve assigned applications for demo backend flows."""

    def __init__(self) -> None:
        self._data_dir = Path(__file__).resolve().parent.parent / "data"
        self._data_dir.mkdir(parents=True, exist_ok=True)
        self._store_path = self._data_dir / "assigned_applications.json"
        self._narrative_service = ManagerNarrativeService()
        self._scoring_engine = ScoringEngine()
        self._default_managers = [
            {"email": "manager@bank.com", "name": "Priya Sharma"},
        ]

    def _normalized_extracted_payload(self, backend_scoring: Dict[str, Any]) -> Dict[str, Any]:
        extracted = backend_scoring.get("extractedPayload") or {}
        return {
            "monthly_revenue": float(extracted.get("monthly_revenue") or 0),
            "total_debt": float(extracted.get("total_debt") or 0),
            "monthly_emi": float(extracted.get("monthly_emi") or extracted.get("emi") or 0),
            "business_age_months": int(extracted.get("business_age_months") or 0),
            "gst_compliant": bool(extracted.get("gst_compliant")),
            "has_disputes": bool(extracted.get("has_disputes")),
        }

    def _derive_score_result(self, record: Dict[str, Any], backend_scoring: Dict[str, Any], normalized_payload: Dict[str, Any]) -> Dict[str, Any]:
        existing = backend_scoring.get("scoreResult") or {}
        if existing.get("final_score") is not None and existing.get("pd") is not None:
            return existing

        monthly_revenue = float(normalized_payload.get("monthly_revenue") or 0)
        total_debt = float(normalized_payload.get("total_debt") or 0)
        monthly_emi = float(normalized_payload.get("monthly_emi") or 0)
        business_age_months = int(normalized_payload.get("business_age_months") or 0)
        gst_compliant = bool(normalized_payload.get("gst_compliant"))
        has_disputes = bool(normalized_payload.get("has_disputes"))

        has_signal = any([
            monthly_revenue > 0,
            total_debt > 0,
            monthly_emi > 0,
            business_age_months > 0,
            gst_compliant,
            has_disputes,
        ])
        if not has_signal:
            return existing

        derived = self._scoring_engine.calculate_score(
            monthly_revenue=monthly_revenue,
            total_debt=total_debt,
            emi=monthly_emi,
            business_age_months=business_age_months,
            gst_compliant=gst_compliant,
            has_disputes=has_disputes,
        )
        if existing:
            merged = dict(existing)
            merged.update({k: v for k, v in derived.items() if v is not None})
            return merged
        return derived

    def _derive_gstin_result(self, record: Dict[str, Any], score_result: Dict[str, Any], backend_scoring: Dict[str, Any]) -> Dict[str, Any]:
        existing = backend_scoring.get("gstinResult") or {}
        if existing.get("credit_score") is not None and existing.get("risk_band"):
            return existing

        final_score = float(score_result.get("final_score") or 0)
        pd = float(score_result.get("pd") or 0)
        risk_category = str(score_result.get("risk_category") or "")
        risk_band_map = {
            "Low Risk": "Low",
            "Medium Risk": "Moderate",
            "High Risk": "High",
        }
        risk_band = risk_band_map.get(risk_category, "Awaiting scoring")

        credit_score = int(round(300 + max(0.0, min(100.0, final_score)) * 6)) if final_score > 0 else None
        recommended_loan_amount = float(existing.get("recommended_loan_amount") or record.get("loanAmount") or 0)
        if pd <= 0.15:
            recommended_tenure_months = 36
        elif pd <= 0.30:
            recommended_tenure_months = 24
        else:
            recommended_tenure_months = 18

        key_factors = score_result.get("key_factors") or {}
        positive = key_factors.get("positive") if isinstance(key_factors, dict) else []
        negative = key_factors.get("negative") if isinstance(key_factors, dict) else []
        top_reasons = [
            *([str(item) for item in positive[:2]] if isinstance(positive, list) else []),
            *([str(item) for item in negative[:2]] if isinstance(negative, list) else []),
        ]

        derived = {
            "credit_score": credit_score,
            "risk_band": risk_band,
            "probability_of_default": pd if pd > 0 else None,
            "risk_category": risk_category or None,
            "recommended_loan_amount": recommended_loan_amount,
            "recommended_tenure_months": recommended_tenure_months,
            "top_reasons": top_reasons,
        }
        if existing:
            merged = dict(existing)
            for key, value in derived.items():
                if merged.get(key) in (None, "", []):
                    merged[key] = value
            return merged
        return derived

    def _read_all(self) -> List[Dict[str, Any]]:
        if not self._store_path.exists():
            return []
        try:
            raw = self._store_path.read_text(encoding="utf-8")
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []

    def _write_all(self, records: List[Dict[str, Any]]) -> None:
        self._store_path.write_text(json.dumps(records, indent=2), encoding="utf-8")

    def _pick_manager(self, borrower_email: str, preferred_manager_email: str | None = None, preferred_manager_name: str | None = None) -> Dict[str, str]:
        if preferred_manager_email:
            return {
                "email": preferred_manager_email,
                "name": preferred_manager_name or preferred_manager_email.split("@")[0],
            }

        key = borrower_email or "borrower"
        idx = sum(ord(ch) for ch in key) % len(self._default_managers)
        return self._default_managers[idx]

    def submit_application(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        borrower_email = str(payload.get("borrower_email", "")).strip().lower()
        borrower_name = str(payload.get("borrower_name", "")).strip() or "Borrower"
        application_id = str(payload.get("id", "")).strip()
        if not borrower_email:
            raise ValueError("borrower_email is required")
        if not application_id:
            raise ValueError("id is required")

        preferred_manager_email = payload.get("manager_email")
        preferred_manager_name = payload.get("manager_name")
        manager = (
            self._pick_manager(
                borrower_email=borrower_email,
                preferred_manager_email=preferred_manager_email,
                preferred_manager_name=preferred_manager_name,
            )
            if preferred_manager_email
            else {"email": None, "name": None}
        )

        record = {
            "id": application_id,
            "borrowerEmail": borrower_email,
            "borrowerName": borrower_name,
            "managerEmail": manager["email"],
            "managerName": manager["name"],
            "companyName": payload.get("company_name") or borrower_name,
            "loanAmount": float(payload.get("loan_amount", 0) or 0),
            "riskLevel": payload.get("risk_level") or "medium",
            "currentStage": payload.get("current_stage") or "submitted",
            "credibilityScore": int(payload.get("credibility_score", 0) or 0),
            "createdAt": payload.get("created_at"),
            "updatedAt": payload.get("updated_at"),
            "assignmentStatus": "accepted" if manager["email"] else "pending",
            "acceptedAt": payload.get("updated_at") if manager["email"] else None,
            "backendScoring": payload.get("backend_scoring") or {},
            "documents": payload.get("documents") or [],
            "chatMessages": payload.get("chat_messages") or [],
        }

        records = self._read_all()
        next_records = [record] + [item for item in records if item.get("id") != application_id]
        self._write_all(next_records)
        return record

    def get_manager_applications(self, manager_email: str) -> List[Dict[str, Any]]:
        scoped = []
        normalized = manager_email.strip().lower()
        for record in self._read_all():
            if (
                record.get("assignmentStatus") == "accepted"
                and str(record.get("managerEmail", "")).lower() == normalized
            ):
                scoped.append(record)
        return scoped

    def _build_scoring_summary(self, record: Dict[str, Any]) -> Dict[str, Any]:
        backend_scoring = record.get("backendScoring") or {}
        normalized_payload = self._normalized_extracted_payload(backend_scoring)
        score_result = self._derive_score_result(record, backend_scoring, normalized_payload)
        gstin_result = self._derive_gstin_result(record, score_result, backend_scoring)
        top_reasons = gstin_result.get("top_reasons")

        return {
            "pd": score_result.get("pd"),
            "final_score": score_result.get("final_score"),
            "decision": score_result.get("decision"),
            "risk_category": score_result.get("risk_category") or gstin_result.get("risk_category"),
            "credit_score": gstin_result.get("credit_score"),
            "risk_band": gstin_result.get("risk_band"),
            "probability_of_default": gstin_result.get("probability_of_default"),
            "recommended_loan_amount": gstin_result.get("recommended_loan_amount"),
            "recommended_tenure_months": gstin_result.get("recommended_tenure_months"),
            "top_reasons": top_reasons if isinstance(top_reasons, list) else [],
            "document_count": len(record.get("documents") or []),
        }

    def _build_tab_analysis(self, record: Dict[str, Any]) -> Dict[str, Any]:
        backend_scoring = record.get("backendScoring") or {}
        extracted_payload = self._normalized_extracted_payload(backend_scoring)
        score_result = self._derive_score_result(record, backend_scoring, extracted_payload)
        gstin_result = self._derive_gstin_result(record, score_result, backend_scoring)
        processed_documents = backend_scoring.get("processedDocuments") or []

        monthly_revenue = float(extracted_payload.get("monthly_revenue") or 0)
        total_debt = float(extracted_payload.get("total_debt") or 0)
        monthly_emi = float(extracted_payload.get("monthly_emi") or 0)

        base_profit = monthly_revenue * 0.22 if monthly_revenue > 0 else 0.0
        dscr_value = (monthly_revenue / max(monthly_emi, 1.0)) if monthly_revenue > 0 else 0.0
        current_ratio = (1.2 + monthly_revenue / max(total_debt, 1.0) / 2.0) if total_debt > 0 and monthly_revenue > 0 else 0.0

        top_reasons = gstin_result.get("top_reasons") if isinstance(gstin_result.get("top_reasons"), list) else []
        findings = []
        if isinstance(processed_documents, list) and processed_documents:
            for document in processed_documents:
                document_type = document.get("document_type", "document")
                source_document = document.get("source_document", "unknown")
                findings.append(f"Processed {document_type} document: {source_document}")

        probability_of_default = gstin_result.get("probability_of_default")
        if probability_of_default is None:
            probability_of_default = score_result.get("pd")
        probability_of_default = float(probability_of_default or 0)

        recommended_loan_amount = float(gstin_result.get("recommended_loan_amount") or record.get("loanAmount") or 0)
        key_risks = []
        fraud_summary = gstin_result.get("fraud_summary")
        if fraud_summary:
            key_risks.append(fraud_summary)
        key_risks.extend(top_reasons[:3])

        narrative_payload = self._narrative_service.generate_narratives(
            record,
            {
                "risk_band": gstin_result.get("risk_band") or score_result.get("risk_category"),
                "top_reasons": top_reasons,
                "probability_of_default": probability_of_default,
                "dscr": dscr_value,
                "current_ratio": current_ratio,
                "processed_documents": processed_documents,
                "extracted_payload": extracted_payload,
            },
        )
        narrative_sections = narrative_payload.get("sections") or {}

        return {
            "narrativeSource": narrative_payload.get("source", "fallback"),
            "credibility": {
                "score": int(round(float(score_result.get("final_score") or record.get("credibilityScore") or 0))),
                "reasoning": narrative_sections.get("credibility") or top_reasons,
            },
            "financial": {
                "ebitda": {
                    "current": int(round(base_profit)),
                    "trend": [int(round(base_profit * factor)) for factor in [0.72, 0.8, 0.88, 0.94, 1.0]] if base_profit > 0 else [],
                },
                "dscr": {
                    "current": round(dscr_value, 1) if dscr_value > 0 else 0,
                    "trend": [round(dscr_value * factor, 1) for factor in [0.8, 0.9, 1.0, 1.1, 1.2]] if dscr_value > 0 else [],
                },
                "currentRatio": {
                    "current": round(current_ratio, 1) if current_ratio > 0 else 0,
                    "trend": [round(current_ratio * factor, 1) for factor in [0.82, 0.9, 0.95, 1.0, 1.08]] if current_ratio > 0 else [],
                },
                "reasoning": narrative_sections.get("financial") or [],
            },
            "industry": {
                "sector": "MSME Alternative Signal Profile" if gstin_result else "No sector data yet",
                "marketSize": "Mocked live GST + UPI + e-way signal universe" if gstin_result else "Awaiting scoring input",
                "growthRate": gstin_result.get("risk_band") or "Awaiting scoring",
                "competitiveBenchmark": f"{gstin_result.get('risk_band')} segment" if gstin_result.get("risk_band") else "Awaiting benchmark",
                "reasoning": narrative_sections.get("industry") or top_reasons,
            },
            "siteReview": {
                "visitDate": record.get("updatedAt"),
                "findings": narrative_sections.get("siteReview") or findings,
            },
            "risk": {
                "probabilityOfDefault": int(round(probability_of_default * 100)),
                "keyRisks": narrative_sections.get("risk") or key_risks,
                "collateralValue": int(round(recommended_loan_amount * 1.4)),
                "loanAmount": int(round(recommended_loan_amount)),
            },
        }

    def get_manager_dashboard_applications(self, manager_email: str) -> List[Dict[str, Any]]:
        applications = self.get_manager_applications(manager_email)
        enriched: List[Dict[str, Any]] = []
        for application in applications:
            next_record = dict(application)
            next_record["scoringSummary"] = self._build_scoring_summary(application)
            next_record["tabAnalysis"] = self._build_tab_analysis(application)
            enriched.append(next_record)
        return enriched

    def get_borrower_applications(self, borrower_email: str) -> List[Dict[str, Any]]:
        scoped = []
        normalized = borrower_email.strip().lower()
        for record in self._read_all():
            if str(record.get("borrowerEmail", "")).lower() == normalized:
                scoped.append(record)
        return scoped

    def get_pending_applications(self) -> List[Dict[str, Any]]:
        pending = []
        for record in self._read_all():
            if record.get("assignmentStatus") == "pending":
                pending.append(record)
        return pending

    def get_system_metrics(self) -> Dict[str, Any]:
        """Return lightweight runtime metrics for dashboard widgets."""
        records = self._read_all()
        pending_count = 0
        accepted_count = 0
        scored_count = 0
        active_pipeline_count = 0

        for record in records:
            status = str(record.get("assignmentStatus") or "").lower()
            if status == "pending":
                pending_count += 1
                active_pipeline_count += 1
            elif status == "accepted":
                accepted_count += 1

            backend_scoring = record.get("backendScoring") or {}
            score_result = backend_scoring.get("scoreResult") or {}
            gstin_result = backend_scoring.get("gstinResult") or {}
            if score_result.get("final_score") is not None or gstin_result.get("credit_score") is not None:
                scored_count += 1

        # Simple, bounded load model based on live application pipeline activity.
        load_percent = 18 + pending_count * 14 + accepted_count * 9 + active_pipeline_count * 5
        load_percent = max(5, min(95, int(round(load_percent))))

        if load_percent < 50:
            health_label = "Healthy"
        elif load_percent < 75:
            health_label = "Moderate"
        else:
            health_label = "High"

        return {
            "system_load_percent": load_percent,
            "health_label": health_label,
            "pending_count": pending_count,
            "accepted_count": accepted_count,
            "scored_count": scored_count,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def accept_application(self, application_id: str, manager_email: str, manager_name: str) -> Dict[str, Any]:
        records = self._read_all()
        idx = -1
        for i, record in enumerate(records):
            if str(record.get("id", "")) == application_id:
                idx = i
                break

        if idx < 0:
            raise ValueError("Application not found")

        record = records[idx]
        if record.get("assignmentStatus") == "accepted" and str(record.get("managerEmail", "")).lower() != manager_email.lower():
            raise ValueError("Application already accepted by another manager")

        now_iso = datetime.now(timezone.utc).isoformat()
        record["managerEmail"] = manager_email.strip().lower()
        record["managerName"] = manager_name.strip()
        record["assignmentStatus"] = "accepted"
        record["acceptedAt"] = now_iso
        record["updatedAt"] = now_iso

        records[idx] = record
        self._write_all(records)
        return record

    def get_application_messages(self, application_id: str) -> List[Dict[str, Any]]:
        for record in self._read_all():
            if str(record.get("id", "")) == str(application_id):
                messages = record.get("chatMessages") or []
                if isinstance(messages, list):
                    return messages
                return []
        raise ValueError("Application not found")

    def add_application_message(self, application_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        records = self._read_all()
        idx = -1
        for i, record in enumerate(records):
            if str(record.get("id", "")) == str(application_id):
                idx = i
                break

        if idx < 0:
            raise ValueError("Application not found")

        record = records[idx]
        messages = record.get("chatMessages") or []
        if not isinstance(messages, list):
            messages = []

        message = {
            "id": int(datetime.now(timezone.utc).timestamp() * 1000),
            "applicationId": str(application_id),
            "senderRole": str(payload.get("sender_role") or "borrower"),
            "senderName": str(payload.get("sender_name") or "User"),
            "subject": payload.get("subject"),
            "message": str(payload.get("message") or ""),
            "attachmentName": payload.get("attachment_name"),
            "borrowerEmail": payload.get("borrower_email"),
            "companyName": payload.get("company_name"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        messages.insert(0, message)
        record["chatMessages"] = messages
        record["updatedAt"] = datetime.now(timezone.utc).isoformat()
        records[idx] = record
        self._write_all(records)
        return message
