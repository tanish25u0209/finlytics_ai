"""GST + transaction behavior PD pipeline.

Builds GSTIN-level risk features from:
- GST registration
- GST filings
- UPI transactions
- E-way bills
- Bank statements

Then creates a probabilistic proxy default label, trains a calibrated model,
and outputs risk predictions per GSTIN.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from joblib import dump
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import confusion_matrix, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)
RNG = np.random.default_rng(RANDOM_STATE)

EXPLANATION_RULES = {
    "late_filing_ratio": {
        "higher_is_riskier": True,
        "positive": "GST filings are frequently delayed, increasing repayment risk.",
        "negative": "GST filings have been timely, supporting operational discipline.",
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
        "positive": "UPI and bank inflows are strong, showing active revenue generation.",
        "negative": "Incoming cash flows are weaker than comparable MSMEs.",
    },
    "monthly_outflow": {
        "higher_is_riskier": True,
        "positive": "Outflows are manageable relative to business inflows.",
        "negative": "Outflows are heavy relative to inflows, adding repayment pressure.",
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
    "min_balance": {
        "higher_is_riskier": False,
        "positive": "Minimum balance stays comfortably above stress levels.",
        "negative": "Minimum balance dips too low, indicating liquidity stress.",
    },
    "inflow_outflow_ratio": {
        "higher_is_riskier": False,
        "positive": "Inflow-to-outflow ratio indicates balanced and sustainable operations.",
        "negative": "Inflow-to-outflow ratio is weak, suggesting tighter repayment capacity.",
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
    "data_coverage_ratio": {
        "higher_is_riskier": False,
        "positive": "Multiple live data streams are consistently available, improving score confidence.",
        "negative": "Only partial live data is available, so the business carries higher uncertainty.",
    },
    "upi_months_observed": {
        "higher_is_riskier": False,
        "positive": "UPI activity is visible across many months, supporting continuity of operations.",
        "negative": "UPI history is sparse, limiting confidence in the live activity pattern.",
    },
    "filing_months_observed": {
        "higher_is_riskier": False,
        "positive": "GST history spans multiple filing cycles, improving underwriting confidence.",
        "negative": "GST history is limited, which increases uncertainty for a young or thin-file business.",
    },
}


def _safe_read(path: Path, expected_cols: list[str]) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame(columns=expected_cols)
    df = pd.read_csv(path)
    for col in expected_cols:
        if col not in df.columns:
            df[col] = np.nan
    return df[expected_cols].copy()


def _coerce_dates(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")
    return df


def _coerce_numeric(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def _state_risk_proxy(state_series: pd.Series) -> pd.Series:
    # Simple proxy map for hackathon use; unknown states fall back to 0.5.
    low = {"ka", "mh", "tn", "gj", "dl"}
    high = {"br", "jh", "up", "wb"}
    state = state_series.astype(str).str.lower().str.strip()
    return np.where(state.isin(low), 0.30, np.where(state.isin(high), 0.70, 0.50))


def build_features(
    registration_df: pd.DataFrame,
    filings_df: pd.DataFrame,
    upi_df: pd.DataFrame,
    eway_df: pd.DataFrame,
    bank_df: pd.DataFrame,
) -> pd.DataFrame:
    today = pd.Timestamp.today().normalize()
    reference_months = 1

    registration_df = _coerce_dates(registration_df.copy(), ["registration_date"])
    registration_df["business_age_days"] = (today - registration_df["registration_date"]).dt.days
    registration_df["business_age_days"] = registration_df["business_age_days"].fillna(365).clip(lower=30)
    registration_df["state_risk_proxy"] = _state_risk_proxy(registration_df["state_code"])
    reg_features = registration_df[["gstin", "business_age_days", "state_risk_proxy"]].drop_duplicates("gstin")

    filings_df = _coerce_dates(filings_df.copy(), ["due_date", "actual_filing_date"])
    filings_df = _coerce_numeric(filings_df, ["turnover"])
    if "due_date" in filings_df.columns and filings_df["due_date"].notna().any():
        reference_months = max(reference_months, int(filings_df["due_date"].dt.to_period("M").nunique()))
    delay = (filings_df["actual_filing_date"] - filings_df["due_date"]).dt.days
    filings_df["filing_delay_days"] = delay.fillna(0).clip(lower=0)
    filings_df["late_flag"] = (filings_df["filing_delay_days"] > 0).astype(np.int8)

    # Turnover trend using vectorized slope: cov(x,y) / var(x) per GSTIN.
    filings_df = filings_df.sort_values(["gstin", "due_date"]).reset_index(drop=True)
    filings_df["x_idx"] = filings_df.groupby("gstin").cumcount().astype(float)
    x_mean = filings_df.groupby("gstin")["x_idx"].transform("mean")
    y_mean = filings_df.groupby("gstin")["turnover"].transform("mean")
    x_c = filings_df["x_idx"] - x_mean
    y_c = filings_df["turnover"].fillna(y_mean) - y_mean
    cov_xy = (x_c * y_c).groupby(filings_df["gstin"]).transform("mean")
    var_x = (x_c * x_c).groupby(filings_df["gstin"]).transform("mean")
    slope = np.where(var_x > 0, cov_xy / var_x, 0.0)
    filings_df["turnover_slope"] = slope

    gst_features = (
        filings_df.groupby("gstin", as_index=False)
        .agg(
            filing_delay_days=("filing_delay_days", "mean"),
            late_filing_ratio=("late_flag", "mean"),
            avg_turnover=("turnover", "mean"),
            turnover_volatility=("turnover", "std"),
            turnover_trend=("turnover_slope", "mean"),
            filing_months_observed=("due_date", lambda s: s.dt.to_period("M").nunique()),
        )
    )

    upi_df = _coerce_dates(upi_df.copy(), ["txn_date"])
    upi_df = _coerce_numeric(upi_df, ["amount"])
    direction = upi_df["direction"].astype(str).str.lower().str.strip()
    upi_df["inflow_amt"] = np.where(direction.isin(["inflow", "credit", "cr"]), upi_df["amount"], 0.0)
    upi_df["outflow_amt"] = np.where(direction.isin(["outflow", "debit", "dr"]), upi_df["amount"], 0.0)
    upi_df["ticket"] = upi_df["amount"].abs()
    upi_df["txn_month"] = upi_df["txn_date"].dt.to_period("M").astype(str)

    upi_month = (
        upi_df.groupby(["gstin", "txn_month"], as_index=False)
        .agg(monthly_inflow=("inflow_amt", "sum"), monthly_outflow=("outflow_amt", "sum"))
    )
    reference_months = max(reference_months, int(upi_month["txn_month"].nunique()) if not upi_month.empty else reference_months)
    upi_month["monthly_net"] = upi_month["monthly_inflow"] - upi_month["monthly_outflow"]

    upi_features = (
        upi_df.groupby("gstin", as_index=False)
        .agg(transaction_count=("amount", "size"), avg_ticket_size=("ticket", "mean"))
        .merge(
            upi_month.groupby("gstin", as_index=False).agg(
                monthly_inflow=("monthly_inflow", "mean"),
                monthly_outflow=("monthly_outflow", "mean"),
                cashflow_variance=("monthly_net", "var"),
                upi_months_observed=("txn_month", "nunique"),
            ),
            on="gstin",
            how="left",
        )
    )

    eway_df = _coerce_dates(eway_df.copy(), ["bill_date"])
    eway_df = _coerce_numeric(eway_df, ["consignment_value", "distance_km"])
    if "bill_date" in eway_df.columns and eway_df["bill_date"].notna().any():
        reference_months = max(reference_months, int(eway_df["bill_date"].dt.to_period("M").nunique()))
    eway_features = (
        eway_df.groupby("gstin", as_index=False)
        .agg(
            logistics_activity=("bill_date", "size"),
            avg_consignment_value=("consignment_value", "mean"),
            distance_avg=("distance_km", "mean"),
            eway_months_observed=("bill_date", lambda s: s.dt.to_period("M").nunique()),
        )
    )

    bank_df = _coerce_dates(bank_df.copy(), ["entry_date"])
    bank_df = _coerce_numeric(bank_df, ["balance", "amount", "bounce_flag"])
    if "entry_date" in bank_df.columns and bank_df["entry_date"].notna().any():
        reference_months = max(reference_months, int(bank_df["entry_date"].dt.to_period("M").nunique()))
    bank_dir = bank_df["direction"].astype(str).str.lower().str.strip()
    bank_df["inflow_amt"] = np.where(bank_dir.isin(["inflow", "credit", "cr"]), bank_df["amount"], 0.0)
    bank_df["outflow_amt"] = np.where(bank_dir.isin(["outflow", "debit", "dr"]), bank_df["amount"], 0.0)

    bank_features = (
        bank_df.groupby("gstin", as_index=False)
        .agg(
            avg_balance=("balance", "mean"),
            min_balance=("balance", "min"),
            bank_inflow=("inflow_amt", "sum"),
            bank_outflow=("outflow_amt", "sum"),
            cashflow_stability=("amount", "std"),
            bounce_indicator=("bounce_flag", "max"),
            bank_months_observed=("entry_date", lambda s: s.dt.to_period("M").nunique()),
        )
    )
    bank_features["inflow_outflow_ratio"] = np.where(
        bank_features["bank_outflow"].abs() > 1e-9,
        bank_features["bank_inflow"] / bank_features["bank_outflow"].abs(),
        1.0,
    )

    # Merge all sources at GSTIN level.
    features = reg_features.copy()
    for part in [gst_features, upi_features, eway_features, bank_features]:
        features = features.merge(part, on="gstin", how="left")

    # Global missing handling (numeric median).
    numeric_cols = features.select_dtypes(include=[np.number]).columns.tolist()
    for col in numeric_cols:
        features[col] = features[col].fillna(features[col].median())

    # Clip sanity.
    features["late_filing_ratio"] = features["late_filing_ratio"].clip(0.0, 1.0)
    features["inflow_outflow_ratio"] = features["inflow_outflow_ratio"].clip(0.0, 5.0)
    features["cashflow_variance"] = features["cashflow_variance"].clip(lower=0)
    features["turnover_volatility"] = features["turnover_volatility"].fillna(0).clip(lower=0)
    features["cashflow_stability"] = features["cashflow_stability"].fillna(0).clip(lower=0)

    # FT02-style support features that make the live-signal story stronger.
    features["filing_regularity"] = 1.0 - features["late_filing_ratio"]
    features["net_flow"] = features["monthly_inflow"] - features["monthly_outflow"]
    features["net_flow_ratio"] = np.where(
        features["monthly_inflow"].abs() > 1e-9,
        features["net_flow"] / features["monthly_inflow"].abs(),
        0.0,
    )
    features["balance_buffer_ratio"] = np.where(
        features["monthly_outflow"].abs() > 1e-9,
        features["avg_balance"] / features["monthly_outflow"].abs(),
        0.0,
    )
    features["invoice_velocity_proxy"] = np.log1p(features["avg_turnover"].clip(lower=0))
    features["digital_activity_index"] = np.log1p(features["transaction_count"].clip(lower=0)) + np.log1p(
        features["logistics_activity"].clip(lower=0)
    )
    features["cashflow_health"] = np.where(
        features["cashflow_variance"] > 0,
        features["net_flow"].clip(lower=0) / np.sqrt(features["cashflow_variance"] + 1.0),
        features["net_flow"].clip(lower=0),
    )
    features["turnover_momentum"] = features["turnover_trend"] / (features["avg_turnover"].abs() + 1.0)
    features["bounce_rate_proxy"] = np.where(features["transaction_count"] > 0, features["bounce_indicator"], 0.0)
    features["eway_months_observed"] = features["eway_months_observed"].fillna(0)
    features["source_coverage_count"] = (
        (features["filing_months_observed"] > 0).astype(int)
        + (features["upi_months_observed"] > 0).astype(int)
        + (features["eway_months_observed"] > 0).astype(int)
        + (features["bank_months_observed"] > 0).astype(int)
    )
    features["data_coverage_ratio"] = (
        features[["filing_months_observed", "upi_months_observed", "eway_months_observed", "bank_months_observed"]]
        .sum(axis=1)
        / float(reference_months * 4)
    ).clip(0.0, 1.0)

    return features


def create_proxy_label(features: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    # Normalize components for robust probabilistic proxy risk generation.
    eps = 1e-9
    cfv = features["cashflow_variance"].to_numpy(dtype=float)
    turnover_vol = features["turnover_volatility"].to_numpy(dtype=float)
    slope = features["turnover_trend"].to_numpy(dtype=float)
    late_ratio = features["late_filing_ratio"].to_numpy(dtype=float)
    avg_bal = features["avg_balance"].to_numpy(dtype=float)
    age_years = np.clip(features["business_age_days"].to_numpy(dtype=float) / 365.0, 0.1, None)
    net_flow_ratio = features["net_flow_ratio"].to_numpy(dtype=float)
    balance_buffer_ratio = features["balance_buffer_ratio"].to_numpy(dtype=float)
    inflow_outflow_ratio = features["inflow_outflow_ratio"].to_numpy(dtype=float)
    bounce_indicator = features["bounce_indicator"].to_numpy(dtype=float)
    digital_activity = features["digital_activity_index"].to_numpy(dtype=float)
    data_coverage_ratio = features["data_coverage_ratio"].to_numpy(dtype=float)
    upi_months_observed = features["upi_months_observed"].to_numpy(dtype=float)
    filing_months_observed = features["filing_months_observed"].to_numpy(dtype=float)

    cfv_norm = (cfv - np.nanmedian(cfv)) / (np.nanstd(cfv) + eps)
    tvol_norm = (turnover_vol - np.nanmedian(turnover_vol)) / (np.nanstd(turnover_vol) + eps)
    decline = np.clip(-slope, 0.0, None)
    decline_norm = (decline - np.nanmedian(decline)) / (np.nanstd(decline) + eps)
    bal_norm = (np.log1p(np.clip(avg_bal, 0.0, None)) - np.nanmedian(np.log1p(np.clip(avg_bal, 0.0, None)))) / (
        np.nanstd(np.log1p(np.clip(avg_bal, 0.0, None))) + eps
    )
    net_flow_norm = (net_flow_ratio - np.nanmedian(net_flow_ratio)) / (np.nanstd(net_flow_ratio) + eps)
    buffer_norm = (
        np.log1p(np.clip(balance_buffer_ratio, 0.0, None))
        - np.nanmedian(np.log1p(np.clip(balance_buffer_ratio, 0.0, None)))
    ) / (np.nanstd(np.log1p(np.clip(balance_buffer_ratio, 0.0, None))) + eps)
    activity_norm = (
        digital_activity - np.nanmedian(digital_activity)
    ) / (np.nanstd(digital_activity) + eps)

    risk_linear = (
        1.35 * late_ratio
        + 0.70 * cfv_norm
        + 0.55 * tvol_norm
        + 0.70 * decline_norm
        + 0.40 * (1.0 - np.clip(inflow_outflow_ratio, 0.0, 2.0) / 2.0)
        + 0.55 * bounce_indicator
        + 0.35 * (1.0 - data_coverage_ratio)
        + 0.15 * (upi_months_observed < 6).astype(float)
        + 0.18 * (filing_months_observed < 4).astype(float)
        - 0.65 * bal_norm
        - 0.45 * net_flow_norm
        - 0.35 * buffer_norm
        - 0.30 * activity_norm
        - 0.25 * np.log1p(age_years)
        + RNG.normal(0.0, 0.28, size=len(features))
    )

    risk_prob = 1.0 / (1.0 + np.exp(-risk_linear))
    risk_prob = np.clip(risk_prob, 0.02, 0.98)
    default_label = RNG.binomial(1, risk_prob, size=len(features)).astype(np.int8)

    # Rebalance to avoid extreme class imbalance.
    default_rate = default_label.mean()
    if default_rate < 0.25 or default_rate > 0.65:
        threshold = np.quantile(risk_prob, 0.55)
        default_label = (risk_prob > threshold).astype(np.int8)

    return pd.Series(default_label, index=features.index, name="default_label"), pd.Series(risk_prob, index=features.index, name="proxy_risk_prob")


def train_model(features: pd.DataFrame) -> Dict[str, object]:
    y, proxy_prob = create_proxy_label(features)

    feature_cols = [
        "filing_delay_days",
        "late_filing_ratio",
        "avg_turnover",
        "turnover_volatility",
        "turnover_trend",
        "monthly_inflow",
        "monthly_outflow",
        "cashflow_variance",
        "transaction_count",
        "avg_ticket_size",
        "logistics_activity",
        "avg_consignment_value",
        "distance_avg",
        "avg_balance",
        "min_balance",
        "cashflow_stability",
        "bounce_indicator",
        "inflow_outflow_ratio",
        "business_age_days",
        "state_risk_proxy",
        "filing_regularity",
        "net_flow_ratio",
        "balance_buffer_ratio",
        "invoice_velocity_proxy",
        "digital_activity_index",
        "cashflow_health",
        "turnover_momentum",
        "filing_months_observed",
        "upi_months_observed",
        "eway_months_observed",
        "bank_months_observed",
        "data_coverage_ratio",
    ]

    X = features[feature_cols].copy()
    X = X.fillna(X.median(numeric_only=True)).fillna(0)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    raw_model = RandomForestClassifier(
        n_estimators=320,
        max_depth=10,
        min_samples_leaf=4,
        class_weight="balanced_subsample",
        random_state=RANDOM_STATE,
        n_jobs=1,
    )
    raw_model.fit(X_train, y_train)

    calibrated_estimator = GradientBoostingClassifier(
        learning_rate=0.05,
        max_depth=3,
        n_estimators=220,
        min_samples_leaf=12,
        subsample=0.9,
        random_state=RANDOM_STATE,
    )
    calibrated = CalibratedClassifierCV(
        estimator=calibrated_estimator,
        method="sigmoid",
        cv=3,
    )
    calibrated.fit(X_train, y_train)

    test_pd = calibrated.predict_proba(X_test)[:, 1]
    test_auc = roc_auc_score(y_test, test_pd)
    test_pred = (test_pd >= 0.5).astype(np.int8)
    precision = precision_score(y_test, test_pred, zero_division=0)
    recall = recall_score(y_test, test_pred, zero_division=0)
    cm = confusion_matrix(y_test, test_pred)

    importances = pd.Series(raw_model.feature_importances_, index=feature_cols).sort_values(ascending=False)

    report = {
        "auc": float(test_auc),
        "default_rate": float(y.mean()),
        "precision": float(precision),
        "recall": float(recall),
        "confusion_matrix": cm.tolist(),
        "feature_importance": {k: float(v) for k, v in importances.items()},
        "correlations": {
            "late_filing_ratio": float(features["late_filing_ratio"].corr(y)),
            "cashflow_variance": float(features["cashflow_variance"].corr(y)),
            "turnover_trend": float(features["turnover_trend"].corr(y)),
            "net_flow_ratio": float(features["net_flow_ratio"].corr(y)),
            "balance_buffer_ratio": float(features["balance_buffer_ratio"].corr(y)),
            "data_coverage_ratio": float(features["data_coverage_ratio"].corr(y)),
        },
    }

    return {
        "raw_model": raw_model,
        "calibrated_model": calibrated,
        "feature_columns": feature_cols,
        "feature_importance_series": importances,
        "feature_baseline": X.median(numeric_only=True),
        "feature_scale": X.std(numeric_only=True).replace(0, 1.0).fillna(1.0),
        "X": X,
        "y": y,
        "report": report,
        "proxy_prob": proxy_prob,
        "features_with_label": features.assign(default_label=y, proxy_risk_prob=proxy_prob),
    }


def _feature_reason(feature: str, delta: float) -> str:
    rule = EXPLANATION_RULES.get(feature)
    if rule is None:
        direction = "higher" if delta > 0 else "lower"
        return f"{feature.replace('_', ' ').title()} is {direction} than the portfolio baseline."

    risky_direction = delta > 0 if rule["higher_is_riskier"] else delta < 0
    return rule["negative"] if risky_direction else rule["positive"]


def build_top_reasons(
    row: pd.Series,
    importances: pd.Series,
    baseline: pd.Series,
    scale: pd.Series,
    top_n: int = 5,
) -> list[str]:
    scored = []
    for feature, importance in importances.items():
        row_value = float(row.get(feature, baseline.get(feature, 0.0)))
        base_value = float(baseline.get(feature, 0.0))
        feature_scale = float(scale.get(feature, 1.0)) or 1.0
        delta = (row_value - base_value) / feature_scale
        weighted_delta = float(importance) * delta
        scored.append((abs(weighted_delta), weighted_delta, feature))

    scored.sort(reverse=True)
    reasons: list[str] = []
    for _, weighted_delta, feature in scored:
        reason = _feature_reason(feature, weighted_delta)
        if reason not in reasons:
            reasons.append(reason)
        if len(reasons) == top_n:
            break
    return reasons


def predict_sample(
    calibrated_model: CalibratedClassifierCV,
    feature_columns: list[str],
    row: pd.Series,
    importances: pd.Series,
    baseline: pd.Series,
    scale: pd.Series,
) -> dict:
    x = row[feature_columns].to_frame().T
    pd_value = float(calibrated_model.predict_proba(x)[0, 1])
    risk_score = round((1.0 - pd_value) * 100.0, 2)
    if pd_value < 0.10:
        category = "LOW"
    elif pd_value < 0.25:
        category = "MEDIUM"
    else:
        category = "HIGH"

    return {
        "gstin": str(row.get("gstin", "UNKNOWN")),
        "risk_score": risk_score,
        "probability_of_default": round(pd_value, 4),
        "risk_category": category,
        "top_reasons": build_top_reasons(row, importances, baseline, scale, top_n=5),
    }


def _generate_demo_sources(n_gstin: int = 700) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    gstins = pd.Series([f"29ABCDE{1000+i:04d}Z{i%10}" for i in range(n_gstin)], name="gstin")
    states = np.array(["KA", "MH", "TN", "GJ", "DL", "UP", "BR", "WB"])
    state_codes = RNG.choice(states, size=n_gstin, p=[0.16, 0.17, 0.12, 0.12, 0.09, 0.14, 0.10, 0.10])
    segment = RNG.choice(["micro", "small", "medium"], size=n_gstin, p=[0.52, 0.33, 0.15])
    sector = RNG.choice(["manufacturing", "trading", "services", "logistics"], size=n_gstin, p=[0.29, 0.31, 0.27, 0.13])
    reg_dates = pd.to_datetime("2022-01-01") + pd.to_timedelta(RNG.integers(0, 1450, size=n_gstin), unit="D")
    quality = np.clip(
        RNG.normal(
            loc=np.select([segment == "micro", segment == "small"], [-0.15, 0.05], default=0.20),
            scale=0.75,
            size=n_gstin,
        ),
        -2.0,
        2.0,
    )
    season_amp = np.select(
        [sector == "manufacturing", sector == "trading", sector == "logistics"],
        [0.14, 0.10, 0.09],
        default=0.05,
    )
    digital_penetration = np.clip(
        np.select([sector == "services", sector == "trading"], [0.78, 0.70], default=0.58)
        + RNG.normal(0.0, 0.08, size=n_gstin),
        0.20,
        0.95,
    )
    logistics_intensity = np.clip(
        np.select([sector == "manufacturing", sector == "logistics", sector == "trading"], [0.80, 0.90, 0.55], default=0.12)
        + RNG.normal(0.0, 0.07, size=n_gstin),
        0.0,
        1.0,
    )
    base_turnover = np.exp(
        np.select([segment == "micro", segment == "small"], [11.0, 12.1], default=13.0)
        + 0.30 * quality
        + RNG.normal(0.0, 0.18, size=n_gstin)
    )
    base_turnover = np.clip(base_turnover, 40000.0, 2200000.0)
    stress_start = RNG.integers(4, 22, size=n_gstin)
    stress_flag = RNG.random(n_gstin) < np.clip(0.18 - 0.05 * quality, 0.05, 0.30)
    recovery_flag = RNG.random(n_gstin) < np.clip(0.15 + 0.05 * quality, 0.06, 0.24)
    season_phase = RNG.integers(0, 12, size=n_gstin)

    registration = pd.DataFrame(
        {
            "gstin": gstins,
            "registration_date": reg_dates,
            "state_code": state_codes,
            "segment": segment,
            "sector": sector,
        }
    )

    months = pd.period_range("2024-01", "2025-12", freq="M")
    filing_rows: list[pd.DataFrame] = []
    upi_rows: list[pd.DataFrame] = []
    eway_rows: list[pd.DataFrame] = []
    bank_rows: list[pd.DataFrame] = []

    reg_month_pd = pd.PeriodIndex(reg_dates, freq="M")

    for idx, month in enumerate(months):
        due_date = month.to_timestamp(how="end")
        active = reg_month_pd <= month
        business_age_months = np.maximum((month.year - reg_month_pd.year) * 12 + (month.month - reg_month_pd.month), 0)

        seasonal = 1.0 + season_amp * np.sin((2 * np.pi * ((idx + season_phase) % 12)) / 12.0)
        lifecycle = 0.70 + 0.015 * np.clip(business_age_months, 0, 24)
        lifecycle = np.clip(lifecycle, 0.60, 1.20)
        macro = 1.0 + 0.03 * np.sin((2 * np.pi * idx) / 12.0) - 0.02 * (idx >= 16)
        stress_multiplier = np.where(stress_flag & (idx >= stress_start), 0.72, 1.0)
        recovery_multiplier = np.where(recovery_flag & (idx >= 14), 1.10, 1.0)
        volatility = np.exp(RNG.normal(0.0, 0.18 + 0.08 * (quality < -0.5), size=n_gstin))

        turnover = base_turnover * seasonal * lifecycle * macro * stress_multiplier * recovery_multiplier * volatility
        turnover = np.clip(turnover, 20000.0, 3500000.0)
        turnover = np.where(active, turnover, np.nan)

        sparse_history = (business_age_months < 6) | ((segment == "micro") & (RNG.random(n_gstin) < 0.12))
        filing_available = active & (~sparse_history | (RNG.random(n_gstin) < 0.55))

        late_prob = np.clip(
            0.06
            + 0.15 * (quality < -0.4)
            + 0.09 * (business_age_months < 9)
            + 0.08 * (stress_multiplier < 1.0)
            + 0.04 * np.isin(state_codes, ["BR", "UP", "WB"]),
            0.02,
            0.55,
        )
        is_late = RNG.random(n_gstin) < late_prob
        delay_days = np.where(is_late, RNG.integers(1, 28, size=n_gstin), 0)
        actual_date = due_date + pd.to_timedelta(delay_days, unit="D")

        filings_month = pd.DataFrame(
            {
                "gstin": gstins.values,
                "due_date": due_date,
                "actual_filing_date": actual_date,
                "turnover": np.clip(turnover * RNG.uniform(0.94, 1.04, size=n_gstin), 10000.0, None),
            }
        )
        filings_month = filings_month.loc[filing_available].copy()
        filing_rows.append(filings_month)

        monthly_inflow = turnover * np.clip(digital_penetration + RNG.normal(0.05, 0.06, size=n_gstin), 0.10, 0.95)
        margin = np.clip(0.04 + 0.08 * quality + RNG.normal(0.0, 0.05, size=n_gstin), -0.12, 0.28)
        monthly_outflow = monthly_inflow * np.clip(1.0 - margin, 0.78, 1.20)
        upi_present = active & (RNG.random(n_gstin) < np.clip(0.55 + 0.30 * digital_penetration, 0.25, 0.96))
        txn_count = np.clip(
            (monthly_inflow / np.clip(turnover * 0.018, 500.0, None)) * RNG.uniform(0.75, 1.25, size=n_gstin),
            8,
            240,
        )
        txn_count = np.nan_to_num(txn_count, nan=8.0, posinf=240.0, neginf=8.0).astype(int)

        upi_rows.append(
            pd.DataFrame(
                {
                    "gstin": gstins.values[upi_present],
                    "txn_date": due_date,
                    "amount": monthly_inflow[upi_present] / np.maximum(txn_count[upi_present], 1),
                    "direction": "inflow",
                    "txn_count": txn_count[upi_present],
                }
            )
        )
        upi_rows.append(
            pd.DataFrame(
                {
                    "gstin": gstins.values[upi_present],
                    "txn_date": due_date,
                    "amount": monthly_outflow[upi_present] / np.maximum(txn_count[upi_present], 1),
                    "direction": "outflow",
                    "txn_count": txn_count[upi_present],
                }
            )
        )

        eway_present = active & (RNG.random(n_gstin) < np.clip(logistics_intensity, 0.03, 0.95))
        bill_count = np.clip(
            (turnover / np.clip(base_turnover * 0.22, 20000.0, None)) * logistics_intensity * RNG.uniform(0.7, 1.4, size=n_gstin),
            0,
            18,
        )
        bill_count = np.nan_to_num(bill_count, nan=0.0, posinf=18.0, neginf=0.0).astype(int)
        eway_base = pd.DataFrame(
            {
                "gstin": gstins.values[eway_present],
                "bill_date": due_date,
                "consignment_value": np.clip(turnover[eway_present] * RNG.uniform(0.04, 0.18, size=eway_present.sum()), 5000.0, None),
                "distance_km": RNG.uniform(40, 1200, size=eway_present.sum()),
                "bill_count": np.maximum(bill_count[eway_present], 1),
            }
        )
        eway_rows.append(eway_base)

        balance = np.clip(monthly_inflow * np.clip(0.08 + 0.10 * quality + RNG.normal(0.02, 0.04, size=n_gstin), 0.01, 0.35), 5000.0, None)
        min_balance = balance * np.clip(RNG.uniform(0.18, 0.85, size=n_gstin), 0.05, 1.0)
        bounce_flag = (
            active
            & (
                RNG.random(n_gstin)
                < np.clip(0.03 + 0.22 * (margin < 0.02) + 0.10 * (stress_multiplier < 1.0) + 0.06 * is_late, 0.0, 0.70)
            )
        ).astype(int)
        bank_present = active & (RNG.random(n_gstin) < np.clip(0.80 + 0.10 * digital_penetration, 0.55, 0.98))

        bank_rows.append(
            pd.DataFrame(
                {
                    "gstin": gstins.values[bank_present],
                    "entry_date": due_date,
                    "balance": balance[bank_present],
                    "amount": monthly_inflow[bank_present],
                    "direction": "inflow",
                    "bounce_flag": bounce_flag[bank_present],
                }
            )
        )
        bank_rows.append(
            pd.DataFrame(
                {
                    "gstin": gstins.values[bank_present],
                    "entry_date": due_date,
                    "balance": min_balance[bank_present],
                    "amount": monthly_outflow[bank_present],
                    "direction": "outflow",
                    "bounce_flag": bounce_flag[bank_present],
                }
            )
        )

    filings = pd.concat(filing_rows, ignore_index=True)
    upi = pd.concat(upi_rows, ignore_index=True)
    eway = pd.concat(eway_rows, ignore_index=True)
    bank = pd.concat(bank_rows, ignore_index=True)

    upi["txn_count"] = upi["txn_count"].astype(int)
    upi = upi.loc[upi.index.repeat(upi["txn_count"])].copy()
    upi["amount"] = upi["amount"] / upi["txn_count"].replace(0, 1)
    upi = upi.drop(columns=["txn_count"])

    if not eway.empty:
        eway["bill_count"] = eway["bill_count"].astype(int)
        eway = eway.loc[eway.index.repeat(eway["bill_count"])].copy()
        eway = eway.drop(columns=["bill_count"])

    return registration, filings, upi, eway, bank


def _save_source_tables(
    data_dir: Path,
    registration: pd.DataFrame,
    filings: pd.DataFrame,
    upi: pd.DataFrame,
    eway: pd.DataFrame,
    bank: pd.DataFrame,
) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    registration.to_csv(data_dir / "gst_registration.csv", index=False)
    filings.to_csv(data_dir / "gst_filings.csv", index=False)
    upi.to_csv(data_dir / "upi_transactions.csv", index=False)
    eway.to_csv(data_dir / "eway_bills.csv", index=False)
    bank.to_csv(data_dir / "bank_statements.csv", index=False)


def run_pipeline(data_dir: Path, output_dir: Path, demo: bool) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)

    if demo:
        print("[Stage] Using generated demo data")
        registration, filings, upi, eway, bank = _generate_demo_sources()
        _save_source_tables(data_dir, registration, filings, upi, eway, bank)
    else:
        print("[Stage] Loading source tables from disk")
        registration = _safe_read(data_dir / "gst_registration.csv", ["gstin", "registration_date", "state_code"])
        filings = _safe_read(data_dir / "gst_filings.csv", ["gstin", "due_date", "actual_filing_date", "turnover"])
        upi = _safe_read(data_dir / "upi_transactions.csv", ["gstin", "txn_date", "amount", "direction"])
        eway = _safe_read(data_dir / "eway_bills.csv", ["gstin", "bill_date", "consignment_value", "distance_km"])
        bank = _safe_read(data_dir / "bank_statements.csv", ["gstin", "entry_date", "balance", "amount", "direction", "bounce_flag"])

    features = build_features(registration, filings, upi, eway, bank)
    result = train_model(features)

    model_path = output_dir / "gst_behavior_pd_model.pkl"
    dump(
        {
            "raw_model": result["raw_model"],
            "calibrated_model": result["calibrated_model"],
            "feature_columns": result["feature_columns"],
            "random_state": RANDOM_STATE,
        },
        model_path,
    )

    report_path = output_dir / "gst_behavior_evaluation_report.json"
    report_path.write_text(json.dumps(result["report"], indent=2), encoding="utf-8")

    sample_row = result["features_with_label"].iloc[0]
    sample_payload = predict_sample(
        result["calibrated_model"],
        result["feature_columns"],
        sample_row,
        result["feature_importance_series"],
        result["feature_baseline"],
        result["feature_scale"],
    )
    sample_path = output_dir / "gst_behavior_sample_prediction.json"
    sample_path.write_text(json.dumps(sample_payload, indent=2), encoding="utf-8")

    # Save aggregated training dataset for auditability.
    result["features_with_label"].to_csv(output_dir / "gst_behavior_features.csv", index=False)

    print("ROC-AUC:", f"{result['report']['auc']:.4f}")
    print("Top feature importance:")
    top_items = list(result["report"]["feature_importance"].items())[:8]
    for name, val in top_items:
        print(f"  {name}: {val:.4f}")

    print("Sample output JSON:")
    print(json.dumps(sample_payload, indent=2))

    return {
        "report": result["report"],
        "sample": sample_payload,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="GST behavior PD model pipeline")
    parser.add_argument("--data-dir", type=Path, default=Path(__file__).parent / "data", help="Directory containing source CSV files")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).parent / "models", help="Directory to save artifacts")
    parser.add_argument("--demo", action="store_true", help="Run with generated demo datasets")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    out = run_pipeline(args.data_dir, args.output_dir, args.demo)
    print("Pipeline complete")
    print(json.dumps(out["report"], indent=2))


if __name__ == "__main__":
    main()
