"""Real-first credit risk modeling pipeline.

Workflow:
1. Train and evaluate on real dataset using real predictive features first.
2. Add engineered features as secondary support.
3. Only introduce synthetic data (<=30% of train) if real-only AUC is strong.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import numpy as np
import pandas as pd
from joblib import dump
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split


RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)
RNG = np.random.default_rng(RANDOM_STATE)


def _first_existing_path(candidates: Iterable[Path]) -> Path | None:
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def _load_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")
    return pd.read_csv(path)


def _drop_leakage_columns(df: pd.DataFrame) -> pd.DataFrame:
    leakage_like = {
        "id",
        "member_id",
        "application_id",
        "customer_id",
        "loan_id",
        "url",
        "title",
        "desc",
        "description",
        "issue_d",
        "last_pymnt_d",
        "last_credit_pull_d",
        "total_pymnt",
        "total_pymnt_inv",
        "recoveries",
        "collection_recovery_fee",
        "last_pymnt_amnt",
    }
    remove_cols = [column for column in df.columns if column.lower() in leakage_like]
    return df.drop(columns=remove_cols, errors="ignore")


def _fill_missing(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = [column for column in df.columns if column not in numeric_cols]

    for column in numeric_cols:
        df[column] = pd.to_numeric(df[column], errors="coerce")
        df[column] = df[column].fillna(df[column].median())

    for column in categorical_cols:
        mode = df[column].mode(dropna=True)
        fill_value = mode.iloc[0] if not mode.empty else "unknown"
        df[column] = df[column].fillna(fill_value)

    return df


def _to_binary_default(series: pd.Series) -> pd.Series:
    if series.dtype == "object":
        lowered = series.astype(str).str.lower().str.strip()
        positive_tokens = {
            "1",
            "true",
            "default",
            "charged off",
            "late",
            "late (31-120 days)",
            "late (16-30 days)",
            "does not meet the credit policy. status:charged off",
            "yes",
        }
        return lowered.isin(positive_tokens).astype(np.int8)

    numeric = pd.to_numeric(series, errors="coerce").fillna(0)
    return (numeric > 0).astype(np.int8)


def _align_real_dataset(df_real: pd.DataFrame) -> pd.DataFrame:
    print("[Stage] Aligning real dataset (real features first)...")
    df = _drop_leakage_columns(df_real.copy())

    # Preserve real credit features directly when available.
    rename_map = {
        "interest_rate": "int_rate",
        "annual_income": "annual_inc",
        "debt_to_income": "dti",
        "loan_status": "default_label",
        "default": "default_label",
        "income": "annual_inc",
    }
    for src, dst in rename_map.items():
        if src in df.columns and dst not in df.columns:
            df = df.rename(columns={src: dst})

    # Proxy mappings for non-LendingClub datasets.
    proxy_map = {
        "loan_amnt": ["debt", "total_debt"],
        "installment": ["emi", "monthly_emi"],
        "annual_inc": ["monthly_revenue", "income"],
        "dti": ["debt_ratio"],
        "delinq_2yrs": ["past_disputes", "disputes"],
        "revol_util": ["debt_ratio"],
        "total_acc": ["business_age", "business_age_months"],
    }

    for target, candidates in proxy_map.items():
        if target in df.columns:
            continue
        found = next((candidate for candidate in candidates if candidate in df.columns), None)
        if found is not None:
            df[target] = df[found]

    # Derived support features from real columns.
    if "monthly_revenue" not in df.columns:
        if "annual_inc" in df.columns:
            df["monthly_revenue"] = pd.to_numeric(df["annual_inc"], errors="coerce") / 12.0
        else:
            df["monthly_revenue"] = 80000.0

    if "monthly_emi" not in df.columns:
        if "installment" in df.columns:
            df["monthly_emi"] = pd.to_numeric(df["installment"], errors="coerce")
        else:
            df["monthly_emi"] = pd.to_numeric(df["monthly_revenue"], errors="coerce") * 0.22

    if "default_label" not in df.columns:
        raise ValueError("Real dataset must contain default indicator (default_label/loan_status/default).")

    df = _fill_missing(df)
    df["default_label"] = _to_binary_default(df["default_label"])

    # Rate normalization and engineered support features.
    revenue = np.clip(pd.to_numeric(df["monthly_revenue"], errors="coerce").to_numpy(dtype=np.float64), 1.0, None)
    monthly_emi = pd.to_numeric(df["monthly_emi"], errors="coerce").to_numpy(dtype=np.float64)

    if "dti" in df.columns:
        dti = pd.to_numeric(df["dti"], errors="coerce").fillna(0).to_numpy(dtype=np.float64)
        debt_ratio = np.where(dti > 3.0, dti / 100.0, dti)
    else:
        debt_ratio = np.full_like(revenue, 0.35)

    monthly_expenses = revenue * 0.60
    free_cash_flow = revenue - monthly_expenses - monthly_emi
    fcf_ratio = free_cash_flow / revenue
    emi_ratio = monthly_emi / revenue

    df["debt_ratio"] = np.clip(debt_ratio, 0.0, 3.0)
    df["emi_ratio"] = np.clip(emi_ratio, 0.0, 1.5)
    df["monthly_expenses"] = monthly_expenses
    df["free_cash_flow"] = free_cash_flow
    df["fcf_ratio"] = np.clip(fcf_ratio, -1.0, 1.0)

    if "int_rate" in df.columns:
        int_rate = pd.to_numeric(df["int_rate"], errors="coerce").fillna(0).to_numpy(dtype=np.float64)
        df["int_rate"] = np.where(int_rate > 1.0, int_rate / 100.0, int_rate)
    else:
        df["int_rate"] = np.clip(0.08 + 0.45 * df["debt_ratio"].to_numpy(dtype=np.float64), 0.05, 0.36)

    if "grade" in df.columns:
        grade_map = {"a": 1, "b": 2, "c": 3, "d": 4, "e": 5, "f": 6, "g": 7}
        df["grade_num"] = (
            df["grade"].astype(str).str.lower().str.strip().map(grade_map).fillna(4).astype(np.float64)
        )
    else:
        df["grade_num"] = np.clip(1.0 + 10.0 * df["debt_ratio"].to_numpy(dtype=np.float64), 1.0, 7.0)

    if "subgrade" in df.columns:
        sub = df["subgrade"].astype(str).str.lower().str.extract(r"([a-g])(\d)", expand=True)
        letter = sub[0].map({"a": 1, "b": 2, "c": 3, "d": 4, "e": 5, "f": 6, "g": 7}).fillna(4)
        num = pd.to_numeric(sub[1], errors="coerce").fillna(3)
        df["subgrade_num"] = (letter - 1) * 5 + num
    else:
        df["subgrade_num"] = np.clip(df["grade_num"].to_numpy(dtype=np.float64) * 5 - 2, 1, 35)

    return df


def _align_synthetic_dataset(df_synth: pd.DataFrame) -> pd.DataFrame:
    print("[Stage] Preparing synthetic support dataset...")
    df = _fill_missing(df_synth.copy())

    # Make synthetic support resemble real feature space.
    revenue_series = pd.to_numeric(df["monthly_revenue"], errors="coerce") if "monthly_revenue" in df.columns else pd.Series(80000.0, index=df.index)
    revenue_series = revenue_series.fillna(80000.0)
    revenue = np.clip(revenue_series.to_numpy(dtype=np.float64), 1.0, None)

    emi_series = pd.to_numeric(df["monthly_emi"], errors="coerce") if "monthly_emi" in df.columns else pd.Series(np.nan, index=df.index)
    emi_default = 0.22 * revenue
    monthly_emi = np.where(np.isnan(emi_series.to_numpy(dtype=np.float64)), emi_default, emi_series.to_numpy(dtype=np.float64))

    debt_series = pd.to_numeric(df["debt_ratio"], errors="coerce") if "debt_ratio" in df.columns else pd.Series(np.nan, index=df.index)
    debt_ratio = np.where(np.isnan(debt_series.to_numpy(dtype=np.float64)), 0.40, debt_series.to_numpy(dtype=np.float64))

    emi_ratio_series = pd.to_numeric(df["emi_ratio"], errors="coerce") if "emi_ratio" in df.columns else pd.Series(np.nan, index=df.index)
    emi_ratio_default = monthly_emi / revenue
    emi_ratio = np.where(np.isnan(emi_ratio_series.to_numpy(dtype=np.float64)), emi_ratio_default, emi_ratio_series.to_numpy(dtype=np.float64))

    fcf_series = pd.to_numeric(df["fcf_ratio"], errors="coerce") if "fcf_ratio" in df.columns else pd.Series(np.nan, index=df.index)
    fcf_ratio = np.where(np.isnan(fcf_series.to_numpy(dtype=np.float64)), 0.15, fcf_series.to_numpy(dtype=np.float64))

    # Synthetic de-biasing noise.
    emi_ratio = np.clip(emi_ratio * RNG.normal(1.0, 0.1, size=len(df)), 0.0, 1.5)
    debt_ratio = np.clip(debt_ratio * RNG.normal(1.0, 0.15, size=len(df)), 0.0, 3.0)
    fcf_ratio = np.clip(fcf_ratio + RNG.normal(0.0, 0.1, size=len(df)), -1.0, 1.0)

    prob = 0.3 * emi_ratio + 0.3 * debt_ratio - 0.2 * fcf_ratio + RNG.normal(0.0, 0.2, size=len(df))
    threshold = np.quantile(prob, 0.60)
    default_label = (prob > threshold).astype(np.int8)

    # Keep default rate between 30-50%.
    default_rate = float(default_label.mean())
    if default_rate < 0.30 or default_rate > 0.50:
        threshold = np.quantile(prob, 0.55 if default_rate < 0.30 else 0.65)
        default_label = (prob > threshold).astype(np.int8)
        default_rate = float(default_label.mean())

    monthly_expenses = revenue * 0.60
    free_cash_flow = revenue - monthly_expenses - monthly_emi

    aligned = pd.DataFrame(
        {
            "loan_amnt": revenue * np.clip(debt_ratio * 0.8, 0.10, 1.2),
            "term": 36,
            "int_rate": np.clip(0.08 + 0.45 * debt_ratio, 0.05, 0.36),
            "installment": monthly_emi,
            "annual_inc": revenue * 12.0,
            "dti": debt_ratio,
            "delinq_2yrs": pd.to_numeric(df.get("disputes", 0), errors="coerce").fillna(0).to_numpy(dtype=np.float64),
            "revol_util": np.clip(0.25 + 0.50 * debt_ratio, 0.05, 1.0),
            "total_acc": pd.to_numeric(df.get("business_age_months", 60), errors="coerce").fillna(60).to_numpy(dtype=np.float64) / 12.0,
            "grade_num": np.clip(1.0 + 10.0 * debt_ratio, 1.0, 7.0),
            "subgrade_num": np.clip((1.0 + 10.0 * debt_ratio) * 5.0 - 2.0, 1.0, 35.0),
            "monthly_revenue": revenue,
            "monthly_emi": monthly_emi,
            "debt_ratio": debt_ratio,
            "emi_ratio": emi_ratio,
            "fcf_ratio": fcf_ratio,
            "free_cash_flow": free_cash_flow,
            "monthly_expenses": monthly_expenses,
            "default_label": default_label,
        }
    )

    print(f"  Synthetic default rate after fix: {default_rate:.2%}")
    return aligned


def _feature_columns(df: pd.DataFrame) -> Tuple[List[str], List[str]]:
    real_primary = [
        "loan_amnt",
        "int_rate",
        "installment",
        "annual_inc",
        "dti",
        "delinq_2yrs",
        "revol_util",
        "total_acc",
        "grade_num",
        "subgrade_num",
    ]
    secondary = ["emi_ratio", "fcf_ratio"]

    available_primary = [column for column in real_primary if column in df.columns]
    available_secondary = [column for column in secondary if column in df.columns]

    return available_primary, available_secondary


def _make_features(df: pd.DataFrame, primary_cols: List[str], secondary_cols: List[str]) -> pd.DataFrame:
    cols = primary_cols + secondary_cols
    X = df[cols].copy()
    for column in cols:
        X[column] = pd.to_numeric(X[column], errors="coerce")
    X = X.fillna(X.median(numeric_only=True)).fillna(0)
    return X


def _train_rf(X: pd.DataFrame, y: pd.Series) -> RandomForestClassifier:
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    model.fit(X, y)
    return model


def _risk_category(pd_value: float) -> str:
    if pd_value < 0.10:
        return "LOW"
    if pd_value < 0.25:
        return "MEDIUM"
    return "HIGH"


def _print_feature_guidance(importances: pd.Series, primary_cols: List[str], secondary_cols: List[str]) -> None:
    print("[Stage] Feature importance analysis")
    print(importances)

    top_features = importances.head(5).index.tolist()
    weak_features = importances[importances < importances.median()].index.tolist()

    print(f"  Top features: {top_features}")
    print(f"  Candidate weak features to remove: {weak_features}")

    strong_real_in_top = any(feature in primary_cols for feature in top_features)
    if not strong_real_in_top:
        print("WARNING: Model may not be leveraging strong real features sufficiently.")

    secondary_top_count = sum(feature in secondary_cols for feature in top_features)
    if secondary_top_count >= 3:
        print("WARNING: Secondary engineered features are dominating; rebalance feature set.")


def run_pipeline(synthetic_path: Path, real_path: Path, output_dir: Path) -> Dict[str, float]:
    output_dir.mkdir(parents=True, exist_ok=True)

    print("[Stage] Loading datasets")
    real_df = _align_real_dataset(_load_csv(real_path))
    synthetic_df = _align_synthetic_dataset(_load_csv(synthetic_path))

    print("[Stage] Creating untouched real test split")
    real_train, real_test = train_test_split(
        real_df,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=real_df["default_label"],
    )

    primary_cols, secondary_cols = _feature_columns(real_train)
    if not primary_cols:
        raise RuntimeError("No real primary features available after alignment.")

    print(f"  Primary real features used: {primary_cols}")
    print(f"  Secondary engineered features used: {secondary_cols}")

    print("[Stage] Real-only baseline training")
    X_real_train = _make_features(real_train, primary_cols, secondary_cols)
    y_real_train = real_train["default_label"].astype(np.int8)
    X_real_test = _make_features(real_test, primary_cols, secondary_cols)
    y_real_test = real_test["default_label"].astype(np.int8)

    baseline_model = _train_rf(X_real_train, y_real_train)
    baseline_test_pd = baseline_model.predict_proba(X_real_test)[:, 1]
    baseline_auc = roc_auc_score(y_real_test, baseline_test_pd)
    print(f"  Baseline real-only AUC: {baseline_auc:.4f}")

    baseline_importances = pd.Series(
        baseline_model.feature_importances_,
        index=X_real_train.columns,
    ).sort_values(ascending=False)

    if baseline_auc < 0.60:
        print("WARNING: Baseline AUC < 0.60. Feature issue detected.")
        _print_feature_guidance(baseline_importances, primary_cols, secondary_cols)
        raise RuntimeError("Stopping pipeline due to failed baseline gate (AUC < 0.60).")

    use_synthetic = baseline_auc > 0.65

    if use_synthetic:
        print("[Stage] Baseline passed >0.65, adding synthetic support (max 30%)")
        synthetic_sample = synthetic_df.sample(frac=0.3, random_state=RANDOM_STATE)
        synthetic_cap = int((0.30 / 0.70) * len(real_train))
        synthetic_take = synthetic_sample.head(min(len(synthetic_sample), synthetic_cap))
        train_df = pd.concat([real_train, synthetic_take], ignore_index=True)
        synthetic_share = len(synthetic_take) / len(train_df)
    else:
        print("[Stage] Baseline between 0.60 and 0.65, training on real-only data")
        train_df = real_train.copy()
        synthetic_share = 0.0

    print(f"  Synthetic share in final train set: {synthetic_share:.2%}")

    X_train = _make_features(train_df, primary_cols, secondary_cols)
    y_train = train_df["default_label"].astype(np.int8)

    print("[Stage] Training final raw + calibrated models")
    raw_model = _train_rf(X_train, y_train)
    calibrated_model = CalibratedClassifierCV(
        estimator=RandomForestClassifier(
            n_estimators=200,
            max_depth=8,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
        method="sigmoid",
        cv=3,
    )
    calibrated_model.fit(X_train, y_train)

    print("[Stage] Real-test evaluation (strict)")
    train_raw_pd = raw_model.predict_proba(X_train)[:, 1]
    test_raw_pd = raw_model.predict_proba(X_real_test)[:, 1]
    test_cal_pd = calibrated_model.predict_proba(X_real_test)[:, 1]
    test_pred = (test_cal_pd >= 0.5).astype(np.int8)

    train_auc = roc_auc_score(y_train, train_raw_pd)
    test_auc_raw = roc_auc_score(y_real_test, test_raw_pd)
    test_auc_cal = roc_auc_score(y_real_test, test_cal_pd)
    precision = precision_score(y_real_test, test_pred, zero_division=0)
    recall = recall_score(y_real_test, test_pred, zero_division=0)
    cm = confusion_matrix(y_real_test, test_pred)

    print(f"  Train AUC (raw): {train_auc:.4f}")
    print(f"  Test AUC (raw): {test_auc_raw:.4f}")
    print(f"  Test AUC (calibrated): {test_auc_cal:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall: {recall:.4f}")
    print("  Confusion matrix:")
    print(cm)

    if (train_auc - test_auc_cal) > 0.10:
        print("WARNING: Overfitting detected (train-test gap > 0.10).")

    if test_auc_cal < 0.70:
        print("WARNING: Test AUC below 0.70 on real-only holdout.")

    importances = pd.Series(raw_model.feature_importances_, index=X_train.columns).sort_values(ascending=False)
    _print_feature_guidance(importances, primary_cols, secondary_cols)

    print("[Stage] Correlation checks")
    corr_frame = train_df[["emi_ratio", "debt_ratio", "fcf_ratio", "default_label"]].copy()
    corr = corr_frame.corr(numeric_only=True)["default_label"]
    print(f"  emi_ratio vs default: {corr['emi_ratio']:.4f}")
    print(f"  debt_ratio vs default: {corr['debt_ratio']:.4f}")
    print(f"  fcf_ratio vs default: {corr['fcf_ratio']:.4f}")

    print("[Stage] Saving artifacts")
    model_path = output_dir / "pd_model.pkl"
    dump(
        {
            "raw_model": raw_model,
            "calibrated_model": calibrated_model,
            "feature_columns": list(X_train.columns),
            "primary_features": primary_cols,
            "secondary_features": secondary_cols,
            "baseline_real_auc": float(baseline_auc),
            "random_state": RANDOM_STATE,
        },
        model_path,
    )

    sample_features = X_real_test.iloc[[0]]
    sample_pd = float(calibrated_model.predict_proba(sample_features)[0, 1])
    sample_output = {
        "risk_score": round((1.0 - sample_pd) * 100.0, 2),
        "probability_of_default": round(sample_pd, 4),
        "risk_category": _risk_category(sample_pd),
    }

    (output_dir / "sample_prediction.json").write_text(json.dumps(sample_output, indent=2), encoding="utf-8")

    report = {
        "baseline_real_auc": float(baseline_auc),
        "train_auc_raw": float(train_auc),
        "test_auc_raw": float(test_auc_raw),
        "test_auc_calibrated": float(test_auc_cal),
        "precision": float(precision),
        "recall": float(recall),
        "confusion_matrix": cm.tolist(),
        "synthetic_share": float(synthetic_share),
        "feature_importance": {k: float(v) for k, v in importances.items()},
        "correlations": {
            "emi_ratio": float(corr["emi_ratio"]),
            "debt_ratio": float(corr["debt_ratio"]),
            "fcf_ratio": float(corr["fcf_ratio"]),
        },
    }
    (output_dir / "evaluation_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("Sample prediction output:")
    print(json.dumps(sample_output, indent=2))

    return report


def main() -> None:
    root = Path(__file__).resolve().parents[1]

    synthetic_path = root / "ml" / "data" / "synthetic_credit_data.csv"
    real_candidates = [
        root / "ml" / "data" / "lending_club.csv",
        root / "ml" / "data" / "give_me_some_credit.csv",
        root / "ml" / "data" / "training_data.csv",
    ]
    real_path = _first_existing_path(real_candidates)
    if real_path is None:
        raise FileNotFoundError(
            "No real dataset found. Expected one of: " + ", ".join(str(path) for path in real_candidates)
        )

    output_dir = root / "ml" / "models"

    print(f"Synthetic dataset: {synthetic_path}")
    print(f"Real dataset: {real_path}")

    report = run_pipeline(synthetic_path=synthetic_path, real_path=real_path, output_dir=output_dir)
    print("Pipeline complete")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
