from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    brier_score_loss,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split

from ml.gst_behavior_pd_pipeline import RANDOM_STATE, _generate_demo_sources, build_features, create_proxy_label


BEHAVIOR_COLS = [
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
    "filing_regularity",
    "net_flow_ratio",
    "balance_buffer_ratio",
    "invoice_velocity_proxy",
    "digital_activity_index",
    "cashflow_health",
    "turnover_momentum",
]

BASELINE_COLS = [
    "filing_delay_days",
    "late_filing_ratio",
    "avg_turnover",
    "turnover_volatility",
    "turnover_trend",
    "business_age_days",
    "state_risk_proxy",
]


def ece_score(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> float:
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    bin_ids = np.digitize(y_prob, bins, right=True) - 1
    bin_ids = np.clip(bin_ids, 0, n_bins - 1)
    ece = 0.0
    for bin_idx in range(n_bins):
        mask = bin_ids == bin_idx
        if not np.any(mask):
            continue
        bin_acc = float(np.mean(y_true[mask]))
        bin_conf = float(np.mean(y_prob[mask]))
        ece += float(np.mean(mask)) * abs(bin_acc - bin_conf)
    return ece


def fit_and_eval(X: pd.DataFrame, y: pd.Series, feature_cols: list[str]) -> dict[str, float]:
    X = X[feature_cols].copy().fillna(X.median(numeric_only=True)).fillna(0)
    X_trainval, X_test, y_trainval, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=y,
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_trainval,
        y_trainval,
        test_size=0.25,
        random_state=RANDOM_STATE,
        stratify=y_trainval,
    )

    calibrator = CalibratedClassifierCV(
        estimator=GradientBoostingClassifier(
            learning_rate=0.05,
            max_depth=3,
            n_estimators=220,
            min_samples_leaf=12,
            subsample=0.9,
            random_state=RANDOM_STATE,
        ),
        method="sigmoid",
        cv=3,
    )
    calibrator.fit(X_train, y_train)

    val_prob = calibrator.predict_proba(X_val)[:, 1]
    thresholds = np.linspace(0.05, 0.95, 91)
    scores = []
    for threshold in thresholds:
        pred = (val_prob >= threshold).astype(int)
        precision = precision_score(y_val, pred, zero_division=0)
        recall = recall_score(y_val, pred, zero_division=0)
        if precision + recall == 0:
            f1 = 0.0
        else:
            f1 = 2 * precision * recall / (precision + recall)
        scores.append((f1, threshold))
    best_f1, best_threshold = max(scores)

    test_prob = calibrator.predict_proba(X_test)[:, 1]
    test_pred = (test_prob >= best_threshold).astype(int)

    return {
        "val_best_threshold": float(best_threshold),
        "val_best_f1": float(best_f1),
        "test_auc": float(roc_auc_score(y_test, test_prob)),
        "test_precision": float(precision_score(y_test, test_pred, zero_division=0)),
        "test_recall": float(recall_score(y_test, test_pred, zero_division=0)),
        "test_brier": float(brier_score_loss(y_test, test_prob)),
        "test_ece": float(ece_score(np.asarray(y_test), test_prob)),
        "test_default_rate": float(np.mean(y_test)),
    }


def main() -> None:
    registration, filings, upi, eway, bank = _generate_demo_sources(n_gstin=500)
    features = build_features(registration, filings, upi, eway, bank)
    y, proxy_prob = create_proxy_label(features)
    feature_frame = features.assign(default_label=y, proxy_risk_prob=proxy_prob)

    with_behavior = fit_and_eval(feature_frame, y, BASELINE_COLS + BEHAVIOR_COLS)
    without_behavior = fit_and_eval(feature_frame, y, BASELINE_COLS)

    rows = [
        ("without_behavior", without_behavior),
        ("with_behavior", with_behavior),
    ]

    print("STRICT MOCK EVALUATION")
    print(f"rows={len(feature_frame)} default_rate={y.mean():.4f}")
    print("split=60/20/20 train/validation/test, holdout_test untouched until final scoring")
    print("threshold=selected on validation by max F1")
    print()
    for label, result in rows:
        print(label)
        print(
            "  auc={test_auc:.4f} precision={test_precision:.4f} recall={test_recall:.4f} "
            "brier={test_brier:.4f} ece={test_ece:.4f} threshold={val_best_threshold:.2f}".format(**result)
        )
        print(f"  val_best_f1={result['val_best_f1']:.4f} test_default_rate={result['test_default_rate']:.4f}")
        print()

    uplift = with_behavior["test_auc"] - without_behavior["test_auc"]
    print(f"auc_uplift_with_behavior={uplift:.4f}")


if __name__ == "__main__":
    main()
