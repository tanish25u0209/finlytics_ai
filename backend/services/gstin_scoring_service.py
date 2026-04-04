"""
GSTIN-based explainable scoring service backed by the saved behavior model.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
import os
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
import shap
from joblib import load

try:
    from .fraud_detection_service import FraudDetectionService
except ImportError:  # pragma: no cover - fallback for direct module execution
    from services.fraud_detection_service import FraudDetectionService


EXPLANATION_RULES = {
    "late_filing_ratio": {
        "higher_is_riskier": True,
        "positive": "GST filings have been timely, supporting operational discipline.",
        "negative": "GST filings are frequently delayed, increasing repayment risk.",
    },
    "filing_regularity": {
        "higher_is_riskier": False,
        "positive": "GST filing regularity is strong, which supports score stability.",
        "negative": "GST filing regularity is weak, which reduces confidence in current operations.",
    },
    "turnover_trend": {
        "higher_is_riskier": False,
        "positive": "GST turnover is trending upward, indicating improving business activity.",
        "negative": "GST turnover trend is weakening, which signals softer business momentum.",
    },
    "turnover_momentum": {
        "higher_is_riskier": False,
        "positive": "Recent turnover momentum is healthy relative to historical levels.",
        "negative": "Recent turnover momentum is below the portfolio baseline.",
    },
    "turnover_volatility": {
        "higher_is_riskier": True,
        "positive": "Turnover volatility is contained, suggesting predictable cash generation.",
        "negative": "Turnover volatility is elevated, making cash flows less predictable.",
    },
    "monthly_inflow": {
        "higher_is_riskier": False,
        "positive": "Monthly inflows are strong, supporting business repayment capacity.",
        "negative": "Monthly inflows are weaker than expected for a healthy MSME profile.",
    },
    "monthly_outflow": {
        "higher_is_riskier": True,
        "positive": "Monthly outflows are manageable relative to business scale.",
        "negative": "Monthly outflows are elevated, putting pressure on operating cash flow.",
    },
    "transaction_count": {
        "higher_is_riskier": False,
        "positive": "Transaction cadence is healthy, indicating active business demand.",
        "negative": "Transaction cadence is thin, suggesting limited current business activity.",
    },
    "avg_ticket_size": {
        "higher_is_riskier": False,
        "positive": "Average ticket size supports healthy commercial activity.",
        "negative": "Average ticket size is weaker than baseline, reducing revenue confidence.",
    },
    "digital_activity_index": {
        "higher_is_riskier": False,
        "positive": "Combined digital activity across UPI and logistics signals is strong.",
        "negative": "Digital activity signals are weaker than expected for a healthy MSME.",
    },
    "cashflow_variance": {
        "higher_is_riskier": True,
        "positive": "Cash-flow variability is under control, which supports repayment ability.",
        "negative": "Cash-flow variability is high, increasing uncertainty in repayment capacity.",
    },
    "cashflow_health": {
        "higher_is_riskier": False,
        "positive": "Net cash-flow health is strong relative to volatility.",
        "negative": "Cash-flow health is weak after accounting for volatility.",
    },
    "cashflow_stability": {
        "higher_is_riskier": True,
        "positive": "Cash-flow stability is healthy with limited month-to-month stress.",
        "negative": "Cash-flow swings are elevated, which weakens predictability of repayment capacity.",
    },
    "balance_buffer_ratio": {
        "higher_is_riskier": False,
        "positive": "Average balances provide a healthy liquidity buffer against outflows.",
        "negative": "Liquidity buffer is thin relative to outgoing obligations.",
    },
    "avg_balance": {
        "higher_is_riskier": False,
        "positive": "Average bank balance supports near-term resilience.",
        "negative": "Average bank balance is low for the observed cash-flow profile.",
    },
    "inflow_outflow_ratio": {
        "higher_is_riskier": False,
        "positive": "Inflow-to-outflow ratio indicates balanced and sustainable operations.",
        "negative": "Inflow-to-outflow ratio is weak, suggesting tighter repayment capacity.",
    },
    "net_flow_ratio": {
        "higher_is_riskier": False,
        "positive": "Net cash retained after outflows is healthy relative to inflows.",
        "negative": "Net cash retained after outflows is weak, limiting internal repayment cushion.",
    },
    "invoice_velocity_proxy": {
        "higher_is_riskier": False,
        "positive": "Invoice velocity proxy points to consistent ongoing business generation.",
        "negative": "Invoice generation proxy is weaker than the healthy benchmark.",
    },
    "business_age_days": {
        "higher_is_riskier": False,
        "positive": "Business operating history is sufficiently established for comfort.",
        "negative": "Short operating history adds uncertainty to the score.",
    },
    "bounce_indicator": {
        "higher_is_riskier": True,
        "positive": "No payment bounce signal was observed in the recent banking pattern.",
        "negative": "Payment bounce behavior raises repayment reliability concerns.",
    },
    "logistics_activity": {
        "higher_is_riskier": False,
        "positive": "E-way bill logistics activity supports evidence of active fulfillment.",
        "negative": "Logistics activity is limited, reducing confidence in current order flow.",
    },
    "min_balance": {
        "higher_is_riskier": False,
        "positive": "Minimum bank balance stays above stress levels for most of the cycle.",
        "negative": "Minimum bank balance drops too low, indicating liquidity stress periods.",
    },
    "data_coverage_ratio": {
        "higher_is_riskier": False,
        "positive": "Multiple live data streams are consistently available, improving underwriting confidence.",
        "negative": "Only partial live signal coverage is available, so score confidence is lower.",
    },
    "filing_months_observed": {
        "higher_is_riskier": False,
        "positive": "GST history spans multiple filing cycles, improving confidence in business continuity.",
        "negative": "GST history is sparse, which increases uncertainty for this business.",
    },
    "upi_months_observed": {
        "higher_is_riskier": False,
        "positive": "UPI activity is visible across many months, supporting continuity of cash flows.",
        "negative": "UPI activity history is limited, reducing confidence in current transaction patterns.",
    },
    "bank_months_observed": {
        "higher_is_riskier": False,
        "positive": "Bank statement coverage spans enough months to support score confidence.",
        "negative": "Banking history is thin, limiting confidence in cash-flow stability.",
    },
}


@dataclass
class GstinArtifacts:
    model_bundle: Dict[str, Any]
    features_df: pd.DataFrame
    feature_columns: List[str]
    importances: pd.Series
    baseline: pd.Series
    scale: pd.Series
    shap_explainer: shap.TreeExplainer


class GstinScoringService:
    def __init__(self) -> None:
        self._artifacts: GstinArtifacts | None = None
        self._fraud_detection_service = FraudDetectionService()

    def _load_artifacts(self) -> GstinArtifacts:
        if self._artifacts is not None:
            return self._artifacts

        root = Path(__file__).resolve().parents[2]
        model_path = root / "ml" / "models" / "gst_behavior_pd_model.pkl"
        features_path = root / "ml" / "models" / "gst_behavior_features.csv"

        model_bundle = load(model_path)
        features_df = pd.read_csv(features_path)
        feature_columns = list(model_bundle["feature_columns"])
        importances = pd.Series(
            model_bundle["raw_model"].feature_importances_,
            index=feature_columns,
        ).sort_values(ascending=False)
        baseline = features_df[feature_columns].median(numeric_only=True)
        scale = features_df[feature_columns].std(numeric_only=True).replace(0, 1.0).fillna(1.0)
        background = features_df[feature_columns].sample(min(200, len(features_df)), random_state=42)
        shap_explainer = shap.TreeExplainer(model_bundle["raw_model"], data=background, feature_perturbation="interventional")

        self._artifacts = GstinArtifacts(
            model_bundle=model_bundle,
            features_df=features_df,
            feature_columns=feature_columns,
            importances=importances,
            baseline=baseline,
            scale=scale,
            shap_explainer=shap_explainer,
        )
        return self._artifacts

    def _reason_for_feature(self, feature: str, supports_score: bool) -> str:
        rule = EXPLANATION_RULES.get(feature)
        if rule is None:
            if supports_score:
                return f"{feature.replace('_', ' ').title()} is supporting the current score."
            return f"{feature.replace('_', ' ').title()} is pressuring the current score."

        return rule["positive"] if supports_score else rule["negative"]

    def _top_reasons(
        self,
        row: pd.Series,
        artifacts: GstinArtifacts,
        top_n: int = 5,
        highlight_risk: bool = True,
    ) -> List[str]:
        x = row[artifacts.feature_columns].to_frame().T
        shap_values = artifacts.shap_explainer.shap_values(x, check_additivity=False)
        if isinstance(shap_values, list):
            class_index = 1 if len(shap_values) > 1 else 0
            shap_vector = shap_values[class_index][0]
        else:
            shap_array = shap_values
            if getattr(shap_array, "ndim", 0) == 3:
                class_index = 1 if shap_array.shape[2] > 1 else 0
                shap_vector = shap_array[0, :, class_index]
            else:
                shap_vector = shap_array[0]

        scored = []
        for feature, shap_value in zip(artifacts.feature_columns, shap_vector):
            signed_effect = float(shap_value)
            scored.append((signed_effect, feature))

        reasons: List[str] = []
        if highlight_risk:
            ranked = sorted((item for item in scored if item[0] > 0), key=lambda item: item[0], reverse=True)
        else:
            ranked = sorted((item for item in scored if item[0] < 0), key=lambda item: item[0])

        if not ranked:
            fallback = []
            for _, feature in sorted(
                ((abs(effect), feature) for effect, feature in scored),
                key=lambda item: item[0],
                reverse=True,
            ):
                row_value = float(row.get(feature, artifacts.baseline.get(feature, 0.0)))
                base_value = float(artifacts.baseline.get(feature, 0.0))
                feature_scale = float(artifacts.scale.get(feature, 1.0)) or 1.0
                delta = (row_value - base_value) / feature_scale
                fallback.append((delta, feature))
            ranked = fallback

        for _, feature in ranked:
            reason = self._reason_for_feature(feature, supports_score=not highlight_risk)
            if reason not in reasons:
                reasons.append(reason)
            if len(reasons) == top_n:
                break
        return reasons

    def _credit_score_from_risk_score(self, risk_score: float) -> int:
        normalized = max(0.0, min(risk_score / 100.0, 1.0))
        curved = normalized ** 1.08
        return int(round(300 + (curved * 600.0)))

    def _risk_band_from_credit_score(self, credit_score: int, fraud_flag: bool) -> str:
        if fraud_flag or credit_score < 620:
            return "High Risk"
        if credit_score < 700:
            return "Medium Risk"
        if credit_score < 780:
            return "Low Risk"
        return "Prime"

    def _recommend_loan_amount(self, row: pd.Series, risk_band: str, fraud_flag: bool) -> float:
        monthly_capacity = max(
            float(row.get("monthly_inflow", 0.0)),
            float(row.get("avg_turnover", 0.0)),
            float(row.get("monthly_outflow", 0.0)) * 0.9,
        )
        buffer_ratio = max(float(row.get("balance_buffer_ratio", 0.0)), 0.05)
        coverage_ratio = max(float(row.get("data_coverage_ratio", 0.0)), 0.20)

        base_multiple = {
            "Prime": 3.0,
            "Low Risk": 2.4,
            "Medium Risk": 1.7,
            "High Risk": 1.0,
        }[risk_band]
        if fraud_flag:
            base_multiple *= 0.45

        quality_adjustment = min(buffer_ratio + 0.55, 1.35) * (0.65 + coverage_ratio)
        raw_amount = monthly_capacity * base_multiple * quality_adjustment
        capped_amount = min(raw_amount, monthly_capacity * 4.5)
        minimum_amount = 75000.0 if risk_band in {"Prime", "Low Risk", "Medium Risk"} and not fraud_flag else 50000.0
        return round(max(capped_amount, minimum_amount) / 5000.0) * 5000.0

    def _recommend_tenure(self, risk_band: str, fraud_flag: bool, business_age_days: float) -> int:
        if fraud_flag:
            return 6
        if risk_band == "Prime" and business_age_days >= 720:
            return 24
        if risk_band == "Low Risk":
            return 18 if business_age_days < 720 else 24
        if risk_band == "Medium Risk":
            return 18
        return 9

    def _amnesty_window(self) -> Dict[str, Any]:
        start_raw = os.getenv("GST_AMNESTY_START_DATE", "").strip()
        end_raw = os.getenv("GST_AMNESTY_END_DATE", "").strip()
        if not start_raw or not end_raw:
            return {
                "active": False,
                "window_start": None,
                "window_end": None,
                "pd_relief": 0.0,
            }

        try:
            start_date = date.fromisoformat(start_raw)
            end_date = date.fromisoformat(end_raw)
        except ValueError:
            return {
                "active": False,
                "window_start": start_raw,
                "window_end": end_raw,
                "pd_relief": 0.0,
                "error": "Invalid amnesty date format. Use YYYY-MM-DD.",
            }

        today = datetime.now(timezone.utc).date()
        return {
            "active": start_date <= today <= end_date,
            "window_start": start_date.isoformat(),
            "window_end": end_date.isoformat(),
            "pd_relief": 0.0,
        }

    def _apply_amnesty(self, pd_value: float, row: pd.Series, policy: Dict[str, Any]) -> tuple[float, Dict[str, Any]]:
        if not policy.get("active"):
            return pd_value, policy

        late_ratio = max(0.0, min(1.0, float(row.get("late_filing_ratio", 0.0))))
        filing_months_observed = float(row.get("filing_months_observed", 0.0))
        confidence = max(0.25, min(1.0, filing_months_observed / 6.0))
        relief = min(0.12, late_ratio * 0.12 * confidence)
        adjusted = max(0.01, pd_value - relief)

        next_policy = dict(policy)
        next_policy["pd_relief"] = round(relief, 4)
        return adjusted, next_policy

    def score_gstin(self, gstin: str) -> Dict[str, Any]:
        artifacts = self._load_artifacts()
        matches = artifacts.features_df[artifacts.features_df["gstin"].astype(str) == str(gstin)]
        if matches.empty:
            raise ValueError(f"No GSTIN profile found for {gstin}")

        row = matches.iloc[0]
        x = row[artifacts.feature_columns].to_frame().T
        base_pd = float(artifacts.model_bundle["calibrated_model"].predict_proba(x)[0, 1])
        fraud_assessment = self._fraud_detection_service.analyze_gstin(str(gstin))
        fraud_penalty = 0.18 if fraud_assessment["fraud_flag"] else 0.08 * float(fraud_assessment["fraud_score"])
        pd_pre_policy = min(0.99, base_pd + fraud_penalty)
        amnesty_policy = self._amnesty_window()
        pd_value, amnesty_policy = self._apply_amnesty(pd_pre_policy, row, amnesty_policy)
        risk_score = round((1.0 - pd_value) * 100.0, 2)
        credit_score = self._credit_score_from_risk_score(risk_score)
        risk_band = self._risk_band_from_credit_score(credit_score, bool(fraud_assessment["fraud_flag"]))
        risk_category = {
            "Prime": "LOW",
            "Low Risk": "LOW",
            "Medium Risk": "MEDIUM",
            "High Risk": "HIGH",
        }[risk_band]
        recommended_loan_amount = self._recommend_loan_amount(row, risk_band, bool(fraud_assessment["fraud_flag"]))
        recommended_tenure_months = self._recommend_tenure(
            risk_band,
            bool(fraud_assessment["fraud_flag"]),
            float(row.get("business_age_days", 365.0)),
        )

        top_reasons = self._top_reasons(
            row,
            artifacts,
            top_n=5,
            highlight_risk=bool(fraud_assessment["fraud_flag"]) or risk_band in {"High Risk", "Medium Risk"},
        )
        if fraud_assessment["fraud_flag"]:
            top_reasons = [
                "Linked GSTIN transaction graph shows repeated circular fund movement, which materially increases fraud risk.",
                *top_reasons,
            ][:5]
        elif amnesty_policy.get("active") and amnesty_policy.get("pd_relief", 0.0) > 0:
            top_reasons = [
                "GST amnesty policy applied for the active window; delayed filing impact was reduced dynamically without retraining.",
                *top_reasons,
            ][:5]

        return {
            "gstin": str(gstin),
            "credit_score": credit_score,
            "risk_band": risk_band,
            "risk_score": risk_score,
            "probability_of_default": round(pd_value, 4),
            "risk_category": risk_category,
            "top_reasons": top_reasons,
            "recommended_loan_amount": recommended_loan_amount,
            "recommended_tenure_months": recommended_tenure_months,
            "fraud_flag": fraud_assessment["fraud_flag"],
            "fraud_score": fraud_assessment["fraud_score"],
            "fraud_summary": fraud_assessment["fraud_summary"],
            "linked_gstins": fraud_assessment["linked_gstins"],
            "fraud_network": fraud_assessment.get("fraud_network", {"nodes": [], "edges": [], "cycle_count": 0}),
            "amnesty_policy": amnesty_policy,
            "score_freshness_timestamp": datetime.now(timezone.utc).isoformat(),
        }
