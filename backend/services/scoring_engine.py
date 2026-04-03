"""
Scoring engine for credit score calculation using deterministic weighted formulas.
All component scores are normalized to 0-100 range.
"""
from dataclasses import dataclass
from typing import Dict


@dataclass
class ScoringWeights:
    """Weights for each scoring component."""
    financial_health: float = 0.30
    cash_flow_stability: float = 0.25
    gst_compliance: float = 0.20
    fraud_risk: float = 0.15
    business_age: float = 0.10


class ScoringEngine:
    """
    Deterministic credit scoring engine.
    
    Computes credit score (0-100) and risk category based on business financial metrics.
    All component calculations are normalized to 0-100 range.
    """
    
    def __init__(self, weights: ScoringWeights = None):
        """
        Initialize scoring engine with optional custom weights.
        
        Args:
            weights: Custom ScoringWeights instance. Uses defaults if None.
        """
        self.weights = weights or ScoringWeights()
        self._validate_weights()
    
    def _validate_weights(self):
        """Ensure weights sum to 1.0 (allowing small floating-point errors)."""
        total = (
            self.weights.financial_health +
            self.weights.cash_flow_stability +
            self.weights.gst_compliance +
            self.weights.fraud_risk +
            self.weights.business_age
        )
        if abs(total - 1.0) > 1e-6:
            raise ValueError(f"Weights must sum to 1.0, got {total}")
    
    def compute_business_age_score(self, months: int) -> float:
        """
        Calculate business age score.
        
        Formula: min((months / 60) * 100, 100)
        - 60 months = 5 years (max score of 100)
        - Scales linearly below 60 months
        
        Args:
            months: Business age in months
            
        Returns:
            Score in range [0, 100]
        """
        if months < 0:
            return 0.0
        score = (months / 60.0) * 100.0
        return min(score, 100.0)
    
    def compute_revenue_consistency(self, monthly_revenue: float, volatility_pct: float = 15.0) -> float:
        """
        Calculate revenue consistency score.
        
        Formula: 100 - (StdDev / Mean) * 100
        
        For MVP, we assume StdDev(monthly_revenue) ≈ volatility_pct% of Mean.
        This simulates stable revenue (lower volatility = higher consistency).
        
        Args:
            monthly_revenue: Average monthly revenue
            volatility_pct: Assumed revenue volatility as percentage of mean (default 15%)
            
        Returns:
            Score in range [0, 100]
        """
        if monthly_revenue <= 0:
            return 0.0
        
        # Volatility coefficient: 15% volatility = lower consistency score
        volatility_factor = volatility_pct / 100.0
        consistency = 100.0 - (volatility_factor * 100.0)
        return max(consistency, 0.0)
    
    def compute_activity_score(
        self, monthly_revenue: float, 
        avg_invoice_size: float = 5000.0,
        revenue_denominator: float = 100000.0,
        invoice_count_denominator: float = 50.0
    ) -> float:
        """
        Calculate activity/volume score from revenue and transaction frequency.
        
        Formula: 0.7 * (revenue / revenue_denominator) * 100 + 0.3 * (invoice_count / invoice_count_denominator) * 100
        
        Args:
            monthly_revenue: Average monthly revenue
            avg_invoice_size: Assumed average invoice size (default 5000 rupees)
            revenue_denominator: Benchmark revenue for scaling (default 100k rupees)
            invoice_count_denominator: Benchmark invoice count for scaling (default 50)
            
        Returns:
            Score in range [0, 100]
        """
        if monthly_revenue < 0:
            return 0.0
        
        # Estimate invoice count from revenue
        if avg_invoice_size > 0:
            invoice_count = monthly_revenue / avg_invoice_size
        else:
            invoice_count = 0.0
        
        # Revenue component (70% weight)
        revenue_score = min((monthly_revenue / revenue_denominator) * 100.0, 100.0)
        
        # Invoice count component (30% weight)
        invoice_score = min((invoice_count / invoice_count_denominator) * 100.0, 100.0)
        
        activity = (0.7 * revenue_score) + (0.3 * invoice_score)
        return min(activity, 100.0)
    
    def compute_financial_health(self, monthly_revenue: float) -> float:
        """
        Calculate financial health score.
        
        Formula: 0.6 * Activity Score + 0.4 * Revenue Consistency
        
        Args:
            monthly_revenue: Average monthly revenue
            
        Returns:
            Score in range [0, 100]
        """
        activity = self.compute_activity_score(monthly_revenue)
        consistency = self.compute_revenue_consistency(monthly_revenue)
        
        financial_health = (0.6 * activity) + (0.4 * consistency)
        return min(financial_health, 100.0)
    
    def compute_cash_flow_stability(self, monthly_revenue: float, emi: float) -> float:
        """
        Calculate cash flow stability score.
        
        Formula: min((monthly_revenue / max(emi, 1)) * 50, 100)
        
        Represents the ratio of inflows to outflows.
        Higher inflow/outflow ratio = better stability.
        
        Args:
            monthly_revenue: Average monthly revenue (inflows)
            emi: Monthly EMI obligations (outflows proxy)
            
        Returns:
            Score in range [0, 100]
        """
        if monthly_revenue < 0 or emi < 0:
            return 0.0
        
        # Use max(emi, 1) to avoid division by zero
        outflows = max(emi, 1.0)
        ratio = monthly_revenue / outflows
        
        score = ratio * 50.0
        return min(score, 100.0)
    
    def compute_gst_compliance(self, gst_compliance_flag: int) -> float:
        """
        Calculate GST compliance score.
        
        Formula: gst_compliance_flag * 100
        
        Direct mapping:
        - 0 (no compliance) = 0 score
        - 1 (timely filing) = 100 score
        
        Args:
            gst_compliance_flag: Binary flag (0 or 1)
            
        Returns:
            Score of 0 or 100
        """
        return float(gst_compliance_flag) * 100.0
    
    def compute_fraud_risk(self, past_disputes_flag: int) -> float:
        """
        Calculate fraud/risk score.
        
        Formula: (1 - past_disputes_flag) * 100
        
        Direct mapping:
        - 0 (no disputes) = 100 score (clean)
        - 1 (past disputes) = 0 score (risky)
        
        Args:
            past_disputes_flag: Binary flag (0 or 1)
            
        Returns:
            Score of 0 or 100
        """
        return (1 - past_disputes_flag) * 100.0
    
    def calculate_final_score(
        self,
        monthly_revenue: float,
        net_profit: float,
        debt: float,
        emi: float,
        gst_compliance: int,
        past_disputes: int,
        business_age: int
    ) -> tuple[float, Dict[str, float]]:
        """
        Calculate final credit score and component contributions.
        
        Args:
            monthly_revenue: Average monthly revenue
            net_profit: Average net profit
            debt: Total outstanding debt
            emi: Monthly EMI obligations
            gst_compliance: Binary GST compliance flag
            past_disputes: Binary past disputes flag
            business_age: Business age in months
            
        Returns:
            Tuple of (final_score, feature_contributions_dict)
            where contributions are each component's absolute value (not just weight)
        """
        # Calculate all component scores (0-100 range)
        financial_health = self.compute_financial_health(monthly_revenue)
        cash_flow = self.compute_cash_flow_stability(monthly_revenue, emi)
        gst = self.compute_gst_compliance(gst_compliance)
        fraud = self.compute_fraud_risk(past_disputes)
        age = self.compute_business_age_score(business_age)
        
        # Calculate weighted final score
        final_score = (
            self.weights.financial_health * financial_health +
            self.weights.cash_flow_stability * cash_flow +
            self.weights.gst_compliance * gst +
            self.weights.fraud_risk * fraud +
            self.weights.business_age * age
        )
        
        # Clamp to 0-100 range (should already be, but ensure)
        final_score = max(0.0, min(final_score, 100.0))
        
        # Calculate contributions as percentage of the weighted sum
        contributions = {
            "financial_health": self.weights.financial_health * financial_health,
            "cash_flow_stability": self.weights.cash_flow_stability * cash_flow,
            "gst_compliance": self.weights.gst_compliance * gst,
            "fraud_risk": self.weights.fraud_risk * fraud,
            "business_age": self.weights.business_age * age,
        }
        
        return final_score, contributions
    
    def map_risk_category(self, score: float) -> str:
        """
        Map final score to risk category.
        
        Thresholds:
        - 80-100: Low Risk
        - 50-79: Medium Risk
        - 0-49: High Risk
        
        Args:
            score: Final credit score (0-100)
            
        Returns:
            Risk category string
        """
        if score >= 80:
            return "Low Risk"
        elif score >= 50:
            return "Medium Risk"
        else:
            return "High Risk"
