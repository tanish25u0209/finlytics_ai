"""Synthetic SME credit dataset generator.

Produces a deterministic, vectorized synthetic dataset for credit risk modeling.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


SEED = 42
N_SAMPLES = 2000
OUTPUT_FILE = Path(__file__).parent / "synthetic_credit_data.csv"


def _build_base_features(n_samples: int, rng: np.random.Generator) -> pd.DataFrame:
    segment = rng.choice([0, 1, 2], size=n_samples, p=[0.48, 0.32, 0.20])

    revenue_mu = np.select([segment == 0, segment == 1], [11.70, 12.00], default=12.30)
    revenue_sigma = np.select([segment == 0, segment == 1], [0.38, 0.50], default=0.62)
    monthly_revenue = rng.lognormal(mean=revenue_mu, sigma=revenue_sigma)
    monthly_revenue = np.clip(monthly_revenue, 30000.0, 1000000.0)

    business_age_months = rng.integers(6, 241, size=n_samples)
    business_age_months = np.clip(
        business_age_months + np.where(segment == 0, 18, np.where(segment == 1, 0, -12)),
        6,
        240,
    )

    gst_probability = np.select([segment == 0, segment == 1], [0.90, 0.80], default=0.68)
    gst_compliant = (rng.random(n_samples) < gst_probability).astype(np.int8)

    disputes = rng.choice([0, 1, 2], size=n_samples, p=[0.70, 0.20, 0.10]).astype(np.int8)

    expense_ratio = np.clip(rng.beta(5.0, 4.0, size=n_samples) * 0.25 + 0.50, 0.50, 0.75)
    expense_ratio = np.clip(expense_ratio + np.where(segment == 2, 0.04, np.where(segment == 1, 0.015, -0.01)), 0.50, 0.75)

    emi_ratio_base = np.clip(rng.beta(2.2, 4.5, size=n_samples) * 0.45 + 0.05, 0.05, 0.50)
    emi_ratio_base = np.clip(emi_ratio_base + np.where(segment == 2, 0.10, np.where(segment == 1, 0.03, -0.03)), 0.05, 0.50)

    debt_factor = np.clip(rng.beta(2.0, 2.2, size=n_samples) * 8.0 + 2.0, 2.0, 10.0)
    debt_factor = np.clip(debt_factor + np.where(segment == 2, 1.0, np.where(segment == 1, 0.2, -0.4)), 2.0, 10.0)

    total_debt = monthly_revenue * debt_factor
    monthly_emi = monthly_revenue * emi_ratio_base

    return pd.DataFrame(
        {
            "monthly_revenue": monthly_revenue,
            "total_debt": total_debt,
            "monthly_emi": monthly_emi,
            "business_age_months": business_age_months.astype(np.int16),
            "gst_compliant": gst_compliant,
            "disputes": disputes,
            "estimated_expenses": monthly_revenue * expense_ratio,
        }
    )


def _engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    revenue = df["monthly_revenue"].to_numpy(dtype=np.float64)
    total_debt = df["total_debt"].to_numpy(dtype=np.float64)
    monthly_emi = df["monthly_emi"].to_numpy(dtype=np.float64)
    gst_compliant = df["gst_compliant"].to_numpy(dtype=np.float64)
    disputes = df["disputes"].to_numpy(dtype=np.float64)

    revenue_safe = np.clip(revenue, 1.0, None)
    emi_ratio_raw = monthly_emi / revenue_safe
    debt_ratio_raw = total_debt / (revenue_safe * 12.0)

    emi_ratio = np.clip(emi_ratio_raw, 0.0, 1.5)
    debt_ratio = np.clip(debt_ratio_raw, 0.0, 2.0)
    profit = revenue - df["estimated_expenses"].to_numpy(dtype=np.float64)
    profit_margin = np.divide(profit, revenue_safe, out=np.zeros_like(profit), where=revenue_safe > 0)
    free_cash_flow = revenue - monthly_emi - df["estimated_expenses"].to_numpy(dtype=np.float64)
    fcf_ratio = np.divide(free_cash_flow, revenue_safe, out=np.zeros_like(free_cash_flow), where=revenue_safe > 0)
    log_revenue = np.log1p(revenue)

    repayment_score = (
        (1.0 - emi_ratio) * 0.4
        + (1.0 - debt_ratio) * 0.3
        + gst_compliant * 0.2
        - (disputes > 0).astype(np.float64) * 0.1
    )
    repayment_score = np.clip(repayment_score, 0.0, 1.0)

    df = df.copy()
    df["profit"] = profit
    df["profit_margin"] = profit_margin
    df["emi_ratio"] = emi_ratio
    df["debt_ratio"] = debt_ratio
    df["free_cash_flow"] = free_cash_flow
    df["fcf_ratio"] = fcf_ratio
    df["repayment_score"] = repayment_score
    df["log_revenue"] = log_revenue
    df["high_emi_flag"] = (emi_ratio > 0.4).astype(np.int8)
    df["high_debt_flag"] = (debt_ratio > 0.6).astype(np.int8)
    df["low_revenue_flag"] = (revenue < 80000.0).astype(np.int8)
    return df


def _generate_default_label(df: pd.DataFrame, rng: np.random.Generator) -> np.ndarray:
    revenue = df["monthly_revenue"].to_numpy(dtype=np.float64)
    emi_ratio = df["emi_ratio"].to_numpy(dtype=np.float64)
    debt_ratio = df["debt_ratio"].to_numpy(dtype=np.float64)
    fcf_ratio = df["fcf_ratio"].to_numpy(dtype=np.float64)

    y = (
        (emi_ratio > 0.5)
        | (debt_ratio > 0.7)
        | ((revenue < 80000.0) & (debt_ratio > 0.4))
        | (fcf_ratio < 0.0)
    ).astype(np.int8)

    flip_mask = rng.random(len(y)) < 0.07
    y = np.where(flip_mask, 1 - y, y).astype(np.int8)

    risk_score = (
        0.40 * emi_ratio
        + 0.35 * debt_ratio
        + 0.15 * (revenue < 80000.0).astype(np.float64)
        + 0.20 * (fcf_ratio < 0.0).astype(np.float64)
        + 0.10 * df["disputes"].to_numpy(dtype=np.float64)
        - 0.10 * df["gst_compliant"].to_numpy(dtype=np.float64)
    )

    default_rate = float(y.mean())
    lower_bound = 0.40
    upper_bound = 0.60

    if default_rate < lower_bound:
        deficit = int(np.ceil((lower_bound - default_rate) * len(y)))
        zero_idx = np.where(y == 0)[0]
        ranked = zero_idx[np.argsort(-risk_score[zero_idx])]
        y[ranked[:deficit]] = 1
    elif default_rate > upper_bound:
        excess = int(np.ceil((default_rate - upper_bound) * len(y)))
        one_idx = np.where(y == 1)[0]
        ranked = one_idx[np.argsort(risk_score[one_idx])]
        y[ranked[:excess]] = 0

    return y.astype(np.int8)


def generate_synthetic_credit_data(n_samples: int = N_SAMPLES, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    np.random.seed(seed)

    df = _build_base_features(n_samples, rng)
    df = _engineer_features(df)
    df["default_label"] = _generate_default_label(df, rng)

    return df[
        [
            "monthly_revenue",
            "total_debt",
            "monthly_emi",
            "business_age_months",
            "gst_compliant",
            "disputes",
            "estimated_expenses",
            "profit",
            "profit_margin",
            "emi_ratio",
            "debt_ratio",
            "free_cash_flow",
            "fcf_ratio",
            "repayment_score",
            "default_label",
        ]
    ]


def save_dataset(df: pd.DataFrame, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)


def print_validation(df: pd.DataFrame) -> None:
    default_rate = float(df["default_label"].mean())
    correlations = df[["emi_ratio", "debt_ratio", "fcf_ratio", "default_label"]].corr(numeric_only=True)["default_label"]

    print("Default rate:", f"{default_rate:.2%}")
    print("Correlation checks:")
    print(f"  emi_ratio vs default_label:  {correlations['emi_ratio']:.4f}")
    print(f"  debt_ratio vs default_label: {correlations['debt_ratio']:.4f}")
    print(f"  fcf_ratio vs default_label:  {correlations['fcf_ratio']:.4f}")


def plot_distributions(df: pd.DataFrame, output_path: Path) -> None:
    try:
        import matplotlib.pyplot as plt
    except Exception:
        return

    fig, axes = plt.subplots(1, 3, figsize=(15, 4))
    axes[0].hist(df["monthly_revenue"], bins=30, color="#1f77b4", edgecolor="white")
    axes[0].set_title("Monthly Revenue")
    axes[1].hist(df["emi_ratio"], bins=30, color="#ff7f0e", edgecolor="white")
    axes[1].set_title("EMI Ratio")
    axes[2].hist(df["debt_ratio"], bins=30, color="#2ca02c", edgecolor="white")
    axes[2].set_title("Debt Ratio")

    for axis in axes:
        axis.grid(alpha=0.2)

    fig.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    df = generate_synthetic_credit_data()
    save_dataset(df, OUTPUT_FILE)

    print(df.head())
    print()
    print(df.describe())
    print()
    print(f"Saved dataset to: {OUTPUT_FILE}")
    print_validation(df)
    plot_distributions(df, Path(__file__).parent / "synthetic_credit_distributions.png")


if __name__ == "__main__":
    main()
