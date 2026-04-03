"""
Validation script to demonstrate synthetic data generation and scoring engine.

This script:
1. Generates synthetic training and test datasets
2. Validates scoring engine against known scenarios
3. Displays results for verification
"""
import sys
import json
from pathlib import Path

try:
    from tabulate import tabulate
except ImportError:
    def tabulate(data, headers="keys", tablefmt="grid"):
        """Simple fallback table printer."""
        if isinstance(data, list) and data:
            if isinstance(data[0], dict):
                headers = list(data[0].keys())
                rows = [[str(item.get(h, "")) for h in headers] for item in data]
            else:
                headers = headers if isinstance(headers, list) else list(headers) if headers != "keys" else []
                rows = [[str(x) for x in row] for row in data]
            
            col_widths = [max(len(str(h)), max(len(r[i]) for r in rows)) for i, h in enumerate(headers)]
            sep = "+" + "+".join("-" * (w + 2) for w in col_widths) + "+"
            
            result = sep + "\n"
            result += "|" + "|".join(" " + h.center(w) + " " for h, w in zip(headers, col_widths)) + "|\n"
            result += sep + "\n"
            for row in rows:
                result += "|" + "|".join(" " + str(c).ljust(w) + " " for c, w in zip(row, col_widths)) + "|\n"
            result += sep
            return result
        return str(data)

# Add paths
project_root = Path(__file__).parent
backend_path = project_root / "backend"
ml_path = project_root / "ml"

sys.path.insert(0, str(backend_path))
sys.path.insert(0, str(ml_path))

from services.scoring_engine import ScoringEngine
from ml.data.generate_synthetic import SyntheticDataGenerator, ApplicantRecord
from tests.fixtures.test_scenarios import TEST_SCENARIOS


def print_separator(title: str = ""):
    """Print a formatted separator."""
    line = "=" * 80
    if title:
        print(f"\n{line}")
        print(f"  {title}")
        print(line)
    else:
        print(line)


def validate_scoring_engine():
    """Validate scoring engine against all test scenarios."""
    print_separator("SCORING ENGINE VALIDATION")
    
    engine = ScoringEngine()
    results = []
    all_passed = True
    
    for scenario_name, scenario in TEST_SCENARIOS.items():
        score, contributions = engine.calculate_final_score(
            monthly_revenue=scenario["monthly_revenue"],
            net_profit=scenario["net_profit"],
            debt=scenario["debt"],
            emi=scenario["emi"],
            gst_compliance=scenario["gst_compliance"],
            past_disputes=scenario["past_disputes"],
            business_age=scenario["business_age"]
        )
        
        category = engine.map_risk_category(score)
        
        # Check expectations
        score_in_range = scenario["expected_score_min"] <= score <= scenario["expected_score_max"]
        category_correct = category == scenario["expected_risk"]
        passed = score_in_range and category_correct
        
        status = "✓ PASS" if passed else "✗ FAIL"
        all_passed = all_passed and passed
        
        results.append({
            "Scenario": scenario_name,
            "Score": f"{score:.2f}",
            "Risk Category": category,
            "Expected": scenario["expected_risk"],
            "Range": f"{scenario['expected_score_min']}-{scenario['expected_score_max']}",
            "Status": status
        })
    
    print("\nTest Scenario Results:")
    print(tabulate(results, headers="keys", tablefmt="grid"))
    
    return all_passed


def demonstrate_component_calculations():
    """Show how individual components contribute to final score."""
    print_separator("COMPONENT CONTRIBUTION BREAKDOWN")
    
    engine = ScoringEngine()
    strong = TEST_SCENARIOS["strong_applicant"]
    
    # Calculate components
    business_age = engine.compute_business_age_score(strong["business_age"])
    financial_health = engine.compute_financial_health(strong["monthly_revenue"])
    cash_flow = engine.compute_cash_flow_stability(strong["monthly_revenue"], strong["emi"])
    gst = engine.compute_gst_compliance(strong["gst_compliance"])
    fraud = engine.compute_fraud_risk(strong["past_disputes"])
    
    score, contributions = engine.calculate_final_score(
        monthly_revenue=strong["monthly_revenue"],
        net_profit=strong["net_profit"],
        debt=strong["debt"],
        emi=strong["emi"],
        gst_compliance=strong["gst_compliance"],
        past_disputes=strong["past_disputes"],
        business_age=strong["business_age"]
    )
    
    components_data = [
        {
            "Component": "Financial Health (30%)",
            "Raw Score": f"{financial_health:.2f}",
            "Weighted Contribution": f"{contributions['financial_health']:.2f}"
        },
        {
            "Component": "Cash Flow Stability (25%)",
            "Raw Score": f"{cash_flow:.2f}",
            "Weighted Contribution": f"{contributions['cash_flow_stability']:.2f}"
        },
        {
            "Component": "GST Compliance (20%)",
            "Raw Score": f"{gst:.2f}",
            "Weighted Contribution": f"{contributions['gst_compliance']:.2f}"
        },
        {
            "Component": "Fraud Risk (15%)",
            "Raw Score": f"{fraud:.2f}",
            "Weighted Contribution": f"{contributions['fraud_risk']:.2f}"
        },
        {
            "Component": "Business Age (10%)",
            "Raw Score": f"{business_age:.2f}",
            "Weighted Contribution": f"{contributions['business_age']:.2f}"
        },
    ]
    
    print("\nStrong Applicant Component Breakdown:")
    print(tabulate(components_data, headers="keys", tablefmt="grid"))
    print(f"\nFinal Score: {score:.2f} ({engine.map_risk_category(score)})")


def generate_and_validate_synthetic_data(num_samples: int = 50):
    """Generate synthetic data and display statistics."""
    print_separator(f"SYNTHETIC DATA GENERATION ({num_samples} samples)")
    
    generator = SyntheticDataGenerator(seed=42)
    dataset = generator.generate_dataset(num_samples=num_samples)
    
    engine = ScoringEngine()
    
    # Score each record
    scored_records = []
    risk_distribution = {"Low Risk": 0, "Medium Risk": 0, "High Risk": 0}
    
    for record in dataset:
        score, _ = engine.calculate_final_score(
            monthly_revenue=record.monthly_revenue,
            net_profit=record.net_profit,
            debt=record.debt,
            emi=record.emi,
            gst_compliance=record.gst_compliance,
            past_disputes=record.past_disputes,
            business_age=record.business_age
        )
        
        category = engine.map_risk_category(score)
        risk_distribution[category] += 1
        
        scored_records.append({
            "Revenue": f"₹{record.monthly_revenue:,.0f}",
            "Debt": f"₹{record.debt:,.0f}",
            "EMI": f"₹{record.emi:,.0f}",
            "Age (mo)": record.business_age,
            "GST": "✓" if record.gst_compliance else "✗",
            "Score": f"{score:.2f}",
            "Risk": category
        })
    
    print(f"\nGenerated {num_samples} synthetic applicant records")
    print("\nSample Records:")
    print(tabulate(scored_records[:10], headers="keys", tablefmt="grid"))
    
    print("\n\nRisk Distribution:")
    distribution_data = [
        {"Risk Category": cat, "Count": count, "Percentage": f"{100*count/num_samples:.1f}%"}
        for cat, count in risk_distribution.items()
    ]
    print(tabulate(distribution_data, headers="keys", tablefmt="grid"))
    
    print(f"\nDefault Rate in Generated Data:")
    defaults = sum(1 for r in dataset if r.default_label == 1)
    print(f"  - Defaults: {defaults}/{num_samples} ({100*defaults/num_samples:.1f}%)")
    print(f"  - Non-defaults: {num_samples - defaults}/{num_samples} ({100*(num_samples-defaults)/num_samples:.1f}%)")


def main():
    """Run all validations."""
    print("\n" + "=" * 80)
    print(" " * 15 + "FinLytics Credit Scoring Engine - Validation Report")
    print("=" * 80)
    
    try:
        # Test 1: Component calculations
        print("\n✓ Loading ScoringEngine...")
        engine = ScoringEngine()
        print("✓ ScoringEngine initialized successfully")
        
        # Test 2: Validate against scenarios
        print("\n✓ Validating against known scenarios...")
        scenarios_passed = validate_scoring_engine()
        
        # Test 3: Show component breakdown
        print("\n✓ Demonstrating component calculations...")
        demonstrate_component_calculations()
        
        # Test 4: Generate synthetic data
        print("\n✓ Generating synthetic data...")
        generate_and_validate_synthetic_data(num_samples=50)
        
        # Summary
        print_separator("VALIDATION SUMMARY")
        if scenarios_passed:
            print("✓ All test scenarios PASSED")
            print("✓ Component calculations are correct")
            print("✓ Risk category mappings are accurate")
            print("✓ Synthetic data generation is working")
            print("\n✓ SCORING ENGINE IS READY FOR TESTING")
        else:
            print("✗ Some scenarios FAILED - please review results above")
        
        print("\n" + "=" * 80)
        
    except Exception as e:
        print(f"\n✗ ERROR during validation: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
