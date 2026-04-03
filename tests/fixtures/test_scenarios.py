"""
Test fixtures with known scenarios for validating the scoring engine.
"""
import json
from pathlib import Path


# Test scenario: Strong applicant (should get Low Risk score >= 80)
STRONG_APPLICANT = {
    "monthly_revenue": 1000000,      # High revenue
    "net_profit": 250000,            # Healthy profit margin
    "debt": 300000,                  # Low debt relative to revenue
    "emi": 10000,                    # Low EMI obligations
    "gst_compliance": 1,             # Fully compliant
    "past_disputes": 0,              # No disputes
    "business_age": 60,              # Established business
    "collateral_type": 1,
    "expected_risk": "Low Risk",
    "expected_score_min": 80,
    "expected_score_max": 100,
}

# Test scenario: Borderline applicant (should get Medium Risk score 50-79)
BORDERLINE_APPLICANT = {
    "monthly_revenue": 300000,       # Moderate revenue
    "net_profit": 45000,             # Lower profit margin
    "debt": 500000,                  # Higher debt (1.67:1 ratio with revenue)
    "emi": 40000,                    # Higher EMI obligations
    "gst_compliance": 0,             # Non-compliant (reduces score)
    "past_disputes": 0,              # No disputes
    "business_age": 24,              # Relatively new
    "collateral_type": 0,
    "expected_risk": "Medium Risk",
    "expected_score_min": 50,
    "expected_score_max": 79,
}

# Test scenario: Risky applicant (should get High Risk score < 50)
RISKY_APPLICANT = {
    "monthly_revenue": 100000,       # Very low revenue
    "net_profit": 5000,              # Minimal profit (5% margin)
    "debt": 500000,                  # Very high debt relative to revenue (5:1)
    "emi": 80000,                    # Very high EMI (80% of revenue!)
    "gst_compliance": 0,             # Not compliant
    "past_disputes": 1,              # Has disputes
    "business_age": 2,               # Barely registered
    "collateral_type": 0,
    "expected_risk": "High Risk",
    "expected_score_min": 0,
    "expected_score_max": 49,
}

# Edge case: Zero revenue (should handle gracefully)
EDGE_ZERO_REVENUE = {
    "monthly_revenue": 0,
    "net_profit": 0,
    "debt": 100000,
    "emi": 5000,
    "gst_compliance": 0,
    "past_disputes": 1,
    "business_age": 12,
    "collateral_type": 0,
    "expected_risk": "High Risk",
    "expected_score_min": 0,
    "expected_score_max": 49,
}

# Edge case: Excellent financials (should approach 100)
EDGE_PERFECT_APPLICANT = {
    "monthly_revenue": 5000000,      # Very high revenue
    "net_profit": 1000000,           # Excellent profit
    "debt": 500000,                  # Minimal debt
    "emi": 5000,                     # Negligible EMI
    "gst_compliance": 1,
    "past_disputes": 0,
    "business_age": 120,             # Very established (10 years)
    "collateral_type": 1,
    "expected_risk": "Low Risk",
    "expected_score_min": 90,
    "expected_score_max": 100,
}

# Edge case: High EMI stress (should be risky)
EDGE_HIGH_EMI_STRESS = {
    "monthly_revenue": 200000,
    "net_profit": 20000,
    "debt": 800000,                  # Very high debt
    "emi": 80000,                    # EMI = 40% of revenue!
    "gst_compliance": 0,             # Add non-compliance to push into high risk
    "past_disputes": 1,              # Add disputes to increase risk
    "business_age": 12,
    "collateral_type": 1,
    "expected_risk": "High Risk",
    "expected_score_min": 0,
    "expected_score_max": 49,
}


TEST_SCENARIOS = {
    "strong_applicant": STRONG_APPLICANT,
    "borderline_applicant": BORDERLINE_APPLICANT,
    "risky_applicant": RISKY_APPLICANT,
    "edge_zero_revenue": EDGE_ZERO_REVENUE,
    "edge_perfect_applicant": EDGE_PERFECT_APPLICANT,
    "edge_high_emi_stress": EDGE_HIGH_EMI_STRESS,
}


def get_test_scenario(name: str) -> dict:
    """Get a test scenario by name."""
    return TEST_SCENARIOS.get(name)


def get_all_scenarios() -> dict:
    """Get all test scenarios."""
    return TEST_SCENARIOS


def save_scenarios_to_json(filepath: Path):
    """Save all test scenarios to JSON file."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, 'w') as f:
        json.dump(TEST_SCENARIOS, f, indent=2)


if __name__ == "__main__":
    # Display all test scenarios
    print("Test Scenarios for Scoring Engine Validation:\n")
    for name, scenario in TEST_SCENARIOS.items():
        print(f"{name.upper()}")
        print(f"  Revenue: ₹{scenario['monthly_revenue']:,}")
        print(f"  Debt: ₹{scenario['debt']:,}")
        print(f"  EMI: ₹{scenario['emi']:,}")
        print(f"  Business Age: {scenario['business_age']} months")
        print(f"  GST Compliance: {scenario['gst_compliance']}")
        print(f"  Past Disputes: {scenario['past_disputes']}")
        print(f"  Expected Risk: {scenario['expected_risk']}")
        print(f"  Expected Score Range: {scenario['expected_score_min']}-{scenario['expected_score_max']}\n")
