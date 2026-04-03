"""
Comprehensive unit tests for the scoring engine.

Tests validate:
1. Component score ranges (0-100)
2. Boundary conditions
3. Risk category mappings
4. Known scenarios (strong/borderline/risky applicants)
5. Edge cases
"""
import sys
import pytest
from pathlib import Path

# Add backend to path for imports
backend_path = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from services.scoring_engine import ScoringEngine, ScoringWeights
from fixtures.test_scenarios import TEST_SCENARIOS, get_test_scenario


class TestScoringEngineComponentCalculations:
    """Test individual component score calculations."""
    
    def setup_method(self):
        """Initialize scoring engine before each test."""
        self.engine = ScoringEngine()
    
    # Business Age Tests
    def test_business_age_zero_months(self):
        """New business with 0 months should have score 0."""
        score = self.engine.compute_business_age_score(0)
        assert score == 0.0
    
    def test_business_age_60_months(self):
        """5-year-old business (60 months) should have max score."""
        score = self.engine.compute_business_age_score(60)
        assert score == 100.0
    
    def test_business_age_12_months(self):
        """1-year-old business should have ~20 score."""
        score = self.engine.compute_business_age_score(12)
        assert 19.5 <= score <= 20.5
    
    def test_business_age_beyond_60(self):
        """Score should cap at 100 for 120+ months."""
        score = self.engine.compute_business_age_score(120)
        assert score == 100.0
    
    # Revenue Consistency Tests
    def test_revenue_consistency_range(self):
        """Consistency score should be in [0, 100]."""
        score = self.engine.compute_revenue_consistency(500000, volatility_pct=15)
        assert 0 <= score <= 100
    
    def test_revenue_consistency_zero_revenue(self):
        """Zero revenue should return 0 consistency."""
        score = self.engine.compute_revenue_consistency(0)
        assert score == 0.0
    
    def test_revenue_consistency_15pct_volatility(self):
        """15% volatility should give 85 consistency."""
        score = self.engine.compute_revenue_consistency(500000, volatility_pct=15)
        assert score == 85.0
    
    # Activity Score Tests
    def test_activity_score_zero_revenue(self):
        """Zero revenue should return 0 activity."""
        score = self.engine.compute_activity_score(0)
        assert score == 0.0
    
    def test_activity_score_capping_at_100(self):
        """Very high revenue should cap at 100."""
        score = self.engine.compute_activity_score(10000000)
        assert score == 100.0
    
    def test_activity_score_typical_revenue(self):
        """Typical 500k revenue should give high activity score (capped at 100)."""
        score = self.engine.compute_activity_score(500000)
        assert score == 100.0  # 500k/100k = 5, capped at 100
    
    # Financial Health Tests
    def test_financial_health_range(self):
        """Financial health should be in [0, 100]."""
        score = self.engine.compute_financial_health(500000)
        assert 0 <= score <= 100
    
    def test_financial_health_high_revenue(self):
        """High revenue should give high financial health."""
        score = self.engine.compute_financial_health(5000000)
        assert score >= 80
    
    def test_financial_health_low_revenue(self):
        """Low revenue should give lower financial health."""
        score = self.engine.compute_financial_health(50000)
        assert score < 60
    
    # Cash Flow Stability Tests
    def test_cash_flow_stability_zero_emi(self):
        """Zero EMI (no debt) should give max score."""
        score = self.engine.compute_cash_flow_stability(500000, 0)
        assert score == 100.0
    
    def test_cash_flow_stability_equal_emi_revenue(self):
        """EMI = revenue/month should give 50 score."""
        score = self.engine.compute_cash_flow_stability(500000, 500000)
        assert 49 <= score <= 51
    
    def test_cash_flow_stability_half_revenue(self):
        """EMI = revenue should give ~50 score (1:1 ratio)."""
        score = self.engine.compute_cash_flow_stability(500000, 500000)
        # (500k / 500k) * 50 = 1 * 50 = 50
        assert 49 <= score <= 51
    
    def test_cash_flow_stability_capping_at_100(self):
        """Very high cash flow should cap at 100."""
        score = self.engine.compute_cash_flow_stability(10000000, 10000)
        assert score == 100.0
    
    # GST Compliance Tests
    def test_gst_compliance_flag_0(self):
        """Non-compliance flag should give 0 score."""
        score = self.engine.compute_gst_compliance(0)
        assert score == 0.0
    
    def test_gst_compliance_flag_1(self):
        """Compliance flag should give 100 score."""
        score = self.engine.compute_gst_compliance(1)
        assert score == 100.0
    
    # Fraud Risk Tests
    def test_fraud_risk_no_disputes(self):
        """No disputes should give 100 risk score."""
        score = self.engine.compute_fraud_risk(0)
        assert score == 100.0
    
    def test_fraud_risk_with_disputes(self):
        """Past disputes should give 0 risk score."""
        score = self.engine.compute_fraud_risk(1)
        assert score == 0.0


class TestScoringEngineAggregation:
    """Test final score calculation and aggregation."""
    
    def setup_method(self):
        """Initialize scoring engine before each test."""
        self.engine = ScoringEngine()
    
    def test_final_score_range(self):
        """Final score should always be in [0, 100]."""
        score, _ = self.engine.calculate_final_score(
            monthly_revenue=500000,
            net_profit=100000,
            debt=200000,
            emi=20000,
            gst_compliance=1,
            past_disputes=0,
            business_age=36
        )
        assert 0 <= score <= 100
    
    def test_contributions_sum_to_score(self):
        """Contributions should sum (approximately) to final score."""
        score, contributions = self.engine.calculate_final_score(
            monthly_revenue=500000,
            net_profit=100000,
            debt=200000,
            emi=20000,
            gst_compliance=1,
            past_disputes=0,
            business_age=36
        )
        
        total_contribution = sum(contributions.values())
        # Allow small floating-point error
        assert abs(score - total_contribution) < 0.1
    
    def test_contributions_all_non_negative(self):
        """All contributions should be non-negative."""
        _, contributions = self.engine.calculate_final_score(
            monthly_revenue=500000,
            net_profit=100000,
            debt=200000,
            emi=20000,
            gst_compliance=1,
            past_disputes=0,
            business_age=36
        )
        
        for component, value in contributions.items():
            assert value >= 0, f"{component} is negative: {value}"
    
    def test_contributions_keys_complete(self):
        """Response should include all five components."""
        _, contributions = self.engine.calculate_final_score(
            monthly_revenue=500000,
            net_profit=100000,
            debt=200000,
            emi=20000,
            gst_compliance=1,
            past_disputes=0,
            business_age=36
        )
        
        expected_keys = {
            'financial_health',
            'cash_flow_stability',
            'gst_compliance',
            'fraud_risk',
            'business_age'
        }
        assert set(contributions.keys()) == expected_keys


class TestRiskCategoryMapping:
    """Test risk category thresholds."""
    
    def setup_method(self):
        """Initialize scoring engine before each test."""
        self.engine = ScoringEngine()
    
    def test_low_risk_80(self):
        """Score of 80 should be Low Risk."""
        category = self.engine.map_risk_category(80)
        assert category == "Low Risk"
    
    def test_low_risk_100(self):
        """Score of 100 should be Low Risk."""
        category = self.engine.map_risk_category(100)
        assert category == "Low Risk"
    
    def test_medium_risk_50(self):
        """Score of 50 should be Medium Risk."""
        category = self.engine.map_risk_category(50)
        assert category == "Medium Risk"
    
    def test_medium_risk_79(self):
        """Score of 79 should be Medium Risk."""
        category = self.engine.map_risk_category(79)
        assert category == "Medium Risk"
    
    def test_high_risk_0(self):
        """Score of 0 should be High Risk."""
        category = self.engine.map_risk_category(0)
        assert category == "High Risk"
    
    def test_high_risk_49(self):
        """Score of 49 should be High Risk."""
        category = self.engine.map_risk_category(49)
        assert category == "High Risk"
    
    def test_threshold_boundary_79_to_80(self):
        """Verify threshold between Medium and Low at 80."""
        cat_79 = self.engine.map_risk_category(79.9)
        cat_80 = self.engine.map_risk_category(80.0)
        assert cat_79 == "Medium Risk"
        assert cat_80 == "Low Risk"
    
    def test_threshold_boundary_49_to_50(self):
        """Verify threshold between High and Medium at 50."""
        cat_49 = self.engine.map_risk_category(49.9)
        cat_50 = self.engine.map_risk_category(50.0)
        assert cat_49 == "High Risk"
        assert cat_50 == "Medium Risk"


class TestKnownScenarios:
    """Test against known applicant profiles."""
    
    def setup_method(self):
        """Initialize scoring engine before each test."""
        self.engine = ScoringEngine()
    
    def test_strong_applicant_low_risk(self):
        """Strong applicant should get Low Risk (score >= 80)."""
        scenario = get_test_scenario("strong_applicant")
        score, _ = self.engine.calculate_final_score(
            monthly_revenue=scenario["monthly_revenue"],
            net_profit=scenario["net_profit"],
            debt=scenario["debt"],
            emi=scenario["emi"],
            gst_compliance=scenario["gst_compliance"],
            past_disputes=scenario["past_disputes"],
            business_age=scenario["business_age"]
        )
        category = self.engine.map_risk_category(score)
        
        assert category == scenario["expected_risk"], f"Expected {scenario['expected_risk']}, got {category}"
        assert score >= scenario["expected_score_min"], f"Score {score} below expected min {scenario['expected_score_min']}"
        assert score <= scenario["expected_score_max"], f"Score {score} above expected max {scenario['expected_score_max']}"
    
    def test_borderline_applicant_medium_risk(self):
        """Borderline applicant should get Medium Risk (50-79)."""
        scenario = get_test_scenario("borderline_applicant")
        score, _ = self.engine.calculate_final_score(
            monthly_revenue=scenario["monthly_revenue"],
            net_profit=scenario["net_profit"],
            debt=scenario["debt"],
            emi=scenario["emi"],
            gst_compliance=scenario["gst_compliance"],
            past_disputes=scenario["past_disputes"],
            business_age=scenario["business_age"]
        )
        category = self.engine.map_risk_category(score)
        
        assert category == scenario["expected_risk"]
        assert score >= scenario["expected_score_min"]
        assert score <= scenario["expected_score_max"]
    
    def test_risky_applicant_high_risk(self):
        """Risky applicant should get High Risk (< 50)."""
        scenario = get_test_scenario("risky_applicant")
        score, _ = self.engine.calculate_final_score(
            monthly_revenue=scenario["monthly_revenue"],
            net_profit=scenario["net_profit"],
            debt=scenario["debt"],
            emi=scenario["emi"],
            gst_compliance=scenario["gst_compliance"],
            past_disputes=scenario["past_disputes"],
            business_age=scenario["business_age"]
        )
        category = self.engine.map_risk_category(score)
        
        assert category == scenario["expected_risk"]
        assert score >= scenario["expected_score_min"]
        assert score <= scenario["expected_score_max"]
    
    def test_perfect_applicant_excellent_score(self):
        """Perfect applicant should get excellent score."""
        scenario = get_test_scenario("edge_perfect_applicant")
        score, _ = self.engine.calculate_final_score(
            monthly_revenue=scenario["monthly_revenue"],
            net_profit=scenario["net_profit"],
            debt=scenario["debt"],
            emi=scenario["emi"],
            gst_compliance=scenario["gst_compliance"],
            past_disputes=scenario["past_disputes"],
            business_age=scenario["business_age"]
        )
        category = self.engine.map_risk_category(score)
        
        assert category == scenario["expected_risk"]
        assert score >= scenario["expected_score_min"]


class TestEdgeCases:
    """Test edge cases and error conditions."""
    
    def setup_method(self):
        """Initialize scoring engine before each test."""
        self.engine = ScoringEngine()
    
    def test_zero_revenue_handled_gracefully(self):
        """Zero revenue should not crash and should give low score."""
        score, contributions = self.engine.calculate_final_score(
            monthly_revenue=0,
            net_profit=0,
            debt=100000,
            emi=5000,
            gst_compliance=0,
            past_disputes=1,
            business_age=12
        )
        
        assert isinstance(score, float)
        assert 0 <= score <= 100
        assert all(0 <= v <= 100 for v in contributions.values())
    
    def test_high_emi_stress(self):
        """High EMI with compliance/disputes flags should reduce score."""
        score_low_stress, _ = self.engine.calculate_final_score(
            monthly_revenue=500000,
            net_profit=100000,
            debt=100000,
            emi=5000,  # Low EMI
            gst_compliance=1,
            past_disputes=0,
            business_age=60
        )
        
        score_high_stress, _ = self.engine.calculate_final_score(
            monthly_revenue=500000,
            net_profit=100000,
            debt=1000000,
            emi=100000,  # High EMI
            gst_compliance=0,  # Non-compliant to show impact
            past_disputes=1,   # Past disputes to show impact
            business_age=60
        )
        
        assert score_low_stress > score_high_stress
    
    def test_compliance_impact(self):
        """GST non-compliance should reduce score."""
        score_compliant, _ = self.engine.calculate_final_score(
            monthly_revenue=500000,
            net_profit=100000,
            debt=200000,
            emi=20000,
            gst_compliance=1,
            past_disputes=0,
            business_age=36
        )
        
        score_non_compliant, _ = self.engine.calculate_final_score(
            monthly_revenue=500000,
            net_profit=100000,
            debt=200000,
            emi=20000,
            gst_compliance=0,  # Non-compliant
            past_disputes=0,
            business_age=36
        )
        
        assert score_compliant > score_non_compliant
    
    def test_disputes_impact(self):
        """Past disputes should reduce score significantly."""
        score_clean, _ = self.engine.calculate_final_score(
            monthly_revenue=500000,
            net_profit=100000,
            debt=200000,
            emi=20000,
            gst_compliance=1,
            past_disputes=0,
            business_age=36
        )
        
        score_disputes, _ = self.engine.calculate_final_score(
            monthly_revenue=500000,
            net_profit=100000,
            debt=200000,
            emi=20000,
            gst_compliance=1,
            past_disputes=1,  # Has disputes
            business_age=36
        )
        
        assert score_clean > score_disputes


class TestCustomWeights:
    """Test engine with custom weights."""
    
    def test_custom_weights_initialization(self):
        """Engine should accept custom weights."""
        custom_weights = ScoringWeights(
            financial_health=0.40,
            cash_flow_stability=0.30,
            gst_compliance=0.15,
            fraud_risk=0.10,
            business_age=0.05
        )
        engine = ScoringEngine(weights=custom_weights)
        
        assert engine.weights.financial_health == 0.40
    
    def test_invalid_weights_rejected(self):
        """Engine should reject weights that don't sum to 1.0."""
        invalid_weights = ScoringWeights(
            financial_health=0.40,
            cash_flow_stability=0.30,
            gst_compliance=0.15,
            fraud_risk=0.10,
            business_age=0.04  # Sums to 0.99
        )
        
        with pytest.raises(ValueError):
            ScoringEngine(weights=invalid_weights)


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])
