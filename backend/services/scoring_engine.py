"""
Hybrid credit scoring engine combining rule-based logic and PD estimation.

Features:
- Deterministic rule-based score (0-100)
- Logistic regression-based probability of default (PD)
- PD-dominant final score = 0.4 * rule_score + 0.6 * (1 - PD) * 100
- Risk categorization based on PD
- Lending decision with PD-first consistency guards
- Data-driven key factors analysis (positive/negative)
"""
import math
from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass(frozen=True)
class ScoringWeights:
    """Legacy component weights retained for backward compatibility tests."""

    financial_health: float = 0.25
    cash_flow_stability: float = 0.25
    gst_compliance: float = 0.20
    fraud_risk: float = 0.15
    business_age: float = 0.15


class ScoringEngine:
    """
    Hybrid credit scoring engine combining rule-based and statistical approaches.
    
    Evaluates business loan applicants using:
    1. Rule-based scoring (deterministic financial metrics)
    2. Probability of default (PD) using logistic regression
    3. Hybrid final score blending both approaches
    """
    
    def __init__(self, weights: ScoringWeights | None = None):
        """Initialize the scoring engine."""
        self.weights = weights or ScoringWeights()
        total_weight = (
            self.weights.financial_health
            + self.weights.cash_flow_stability
            + self.weights.gst_compliance
            + self.weights.fraud_risk
            + self.weights.business_age
        )
        if abs(total_weight - 1.0) > 1e-9:
            raise ValueError("Scoring weights must sum to 1.0")

    # ------------------------------------------------------------------
    # Legacy compatibility helpers
    # ------------------------------------------------------------------

    def compute_business_age_score(self, business_age_months: int) -> float:
        """Legacy age score on a 0-100 scale with 60 months as the cap."""
        return max(0.0, min(100.0, (business_age_months / 60.0) * 100.0))

    def compute_revenue_consistency(self, monthly_revenue: float, volatility_pct: float = 0.0) -> float:
        """Legacy consistency score derived from revenue volatility."""
        if monthly_revenue <= 0:
            return 0.0
        return max(0.0, min(100.0, 100.0 - float(volatility_pct)))

    def compute_activity_score(self, monthly_revenue: float) -> float:
        """Legacy activity score derived from monthly revenue."""
        return max(0.0, min(100.0, (monthly_revenue / 100000.0) * 100.0))

    def compute_financial_health(self, monthly_revenue: float) -> float:
        """Legacy financial health score derived from revenue."""
        return max(0.0, min(100.0, (monthly_revenue / 100000.0) * 100.0))

    def compute_cash_flow_stability(self, monthly_revenue: float, emi: float) -> float:
        """Legacy cash flow stability score derived from EMI burden."""
        if monthly_revenue <= 0:
            return 0.0 if emi > 0 else 100.0
        ratio = emi / monthly_revenue
        if ratio <= 0.01:
            return 100.0
        return max(0.0, min(100.0, 100.0 - (ratio * 50.0)))

    def compute_gst_compliance(self, gst_compliance: int) -> float:
        """Legacy GST compliance score."""
        return 100.0 if gst_compliance else 0.0

    def compute_fraud_risk(self, past_disputes: int) -> float:
        """Legacy fraud risk score."""
        return 0.0 if past_disputes else 100.0

    def calculate_final_score(
        self,
        monthly_revenue: float,
        net_profit: float,
        debt: float,
        emi: float,
        gst_compliance: int,
        past_disputes: int,
        business_age: int,
    ) -> Tuple[float, Dict[str, float]]:
        """Legacy weighted score used by older tests.

        The contributions are intentionally explicit and sum to the final score.
        """
        financial_health = self.compute_financial_health(monthly_revenue)
        cash_flow_stability = self.compute_cash_flow_stability(monthly_revenue, emi)
        gst_score = self.compute_gst_compliance(gst_compliance)
        fraud_risk = self.compute_fraud_risk(past_disputes)
        business_age_score = self.compute_business_age_score(business_age)

        contributions = {
            "financial_health": financial_health * self.weights.financial_health,
            "cash_flow_stability": cash_flow_stability * self.weights.cash_flow_stability,
            "gst_compliance": gst_score * self.weights.gst_compliance,
            "fraud_risk": fraud_risk * self.weights.fraud_risk,
            "business_age": business_age_score * self.weights.business_age,
        }

        final_score = sum(contributions.values())
        return round(final_score, 2), {key: round(value, 2) for key, value in contributions.items()}

    def map_risk_category(self, score: float) -> str:
        """Legacy risk mapping based on the final score."""
        if score >= 80:
            return "Low Risk"
        if score >= 50:
            return "Medium Risk"
        return "High Risk"
    
    def compute_rule_score(
        self,
        monthly_revenue: float,
        total_debt: float,
        emi: float,
        business_age_months: int,
        gst_compliant: bool,
        has_disputes: bool
    ) -> float:
        """
        Compute rule-based score using deterministic financial metrics.
        
        Args:
            monthly_revenue: Average monthly revenue (rupees)
            total_debt: Total outstanding debt (rupees)
            emi: Monthly EMI obligations (rupees)
            business_age_months: Business age in months
            gst_compliant: GST compliance status
            has_disputes: Whether applicant has past disputes
            
        Returns:
            Score in range [0, 100]
        """
        score = 80.0
        has_negative_adjustment = False

        emi_ratio = (emi / monthly_revenue) if monthly_revenue > 0 else float("inf")
        debt_ratio = (total_debt / (monthly_revenue * 12.0)) if monthly_revenue > 0 else float("inf")
        
        # 1. Revenue Strength
        if monthly_revenue > 1000000:
            score += 10
        elif 300000 <= monthly_revenue <= 1000000:
            score += 5
        elif monthly_revenue < 80000:
            score -= 20
            has_negative_adjustment = True
        elif monthly_revenue < 150000:
            score -= 10
            has_negative_adjustment = True
        
        # 2. Debt Burden
        if debt_ratio > 1.0:
            score -= 20
            has_negative_adjustment = True
        elif debt_ratio > 0.6:
            score -= 10
            has_negative_adjustment = True
        
        # 3. EMI Stress
        if emi_ratio > 0.5:
            score -= 25
            has_negative_adjustment = True
        elif emi_ratio > 0.3:
            score -= 15
            has_negative_adjustment = True
        elif emi_ratio < 0.3:
            score += 5
        
        # 4. Business Age
        if business_age_months < 12:
            score -= 20
            has_negative_adjustment = True
        elif business_age_months < 36:
            score -= 10
            has_negative_adjustment = True
        
        # 5. Compliance
        if not gst_compliant:
            score -= 10
            has_negative_adjustment = True
        
        # 6. Disputes
        if has_disputes:
            score -= 15
            has_negative_adjustment = True
        
        # Clamp to [0, 95]
        score = max(0.0, min(95.0, score))

        # Keep score/explanation consistency: perfect score only when no negatives triggered.
        if has_negative_adjustment and score == 95.0:
            score = 94.0
        
        return score
    
    def compute_probability_of_default(
        self,
        monthly_revenue: float,
        total_debt: float,
        emi: float,
        business_age_months: int,
        gst_compliant: bool,
        has_disputes: bool
    ) -> float:
        """
        Compute probability of default using the requested additive risk model.
        
        Args:
            monthly_revenue: Average monthly revenue (rupees)
            total_debt: Total outstanding debt (rupees)
            emi: Monthly EMI obligations (rupees)
            business_age_months: Business age in months
            gst_compliant: GST compliance status
            has_disputes: Whether applicant has past disputes
            
        Returns:
            PD in range [0, 1]
        """
        emi_ratio = (emi / monthly_revenue) if monthly_revenue > 0 else float("inf")
        debt_ratio = (total_debt / (monthly_revenue * 12.0)) if monthly_revenue > 0 else float("inf")

        pd = 0.03
        pd += (emi_ratio * 0.35)
        pd += (debt_ratio * 0.25)
        pd += 0.08 if business_age_months < 24 else 0.0
        pd += 0.05 if not gst_compliant else 0.0
        pd += 0.07 if has_disputes else 0.0

        # Clamp to the requested operational band.
        pd = max(0.01, min(0.6, pd))
        
        return pd
    
    def compute_final_score(
        self,
        rule_score: float,
        pd: float
    ) -> float:
        """
        Compute hybrid final score blending rule-based and PD components.
        
        Formula: 0.4 * rule_score + 0.6 * (1 - PD) * 100
        
        Args:
            rule_score: Deterministic rule-based score (0-100)
            pd: Probability of default (0-1)
            
        Returns:
            Final score in range [0, 100]
        """
        ml_component = (1.0 - pd) * 100.0
        final_score = (0.4 * rule_score) + (0.6 * ml_component)

        # If PD is very low but rule score is weak, keep the combined score from looking overly strong.
        if pd < 0.08 and rule_score < 50:
            final_score = min(final_score, 75.0)
        
        # Clamp to [0, 100]
        final_score = max(0.0, min(100.0, final_score))
        
        return final_score
    
    def get_risk_category(self, pd: float) -> str:
        """
        Determine risk category based on probability of default.
        
        Args:
            pd: Probability of default (0-1)
            
        Returns:
            Risk category: "Low Risk", "Medium Risk", or "High Risk"
        """
        if pd < 0.10:
            return "Low Risk"
        elif 0.10 <= pd <= 0.25:
            return "Medium Risk"
        else:  # pd > 0.25
            return "High Risk"
    
    def get_decision(self, pd: float, final_score: float) -> str:
        """
        Determine lending decision with PD-first consistency and score guardrails.
        
        Args:
            pd: Probability of default (0-1)
            final_score: Hybrid score (0-100)
            
        Returns:
            Decision: "Approve", "Manual Review", or "Reject"
        """
        if pd < 0.08:
            return "Approve"
        if pd < 0.18:
            return "Manual Review"
        return "Reject"
    
    def get_key_factors(
        self,
        monthly_revenue: float,
        total_debt: float,
        emi: float,
        business_age_months: int,
        gst_compliant: bool,
        has_disputes: bool
    ) -> Dict[str, List[str]]:
        """
        Identify positive and negative factors influencing the score.
        
        Args:
            monthly_revenue: Average monthly revenue (rupees)
            total_debt: Total outstanding debt (rupees)
            emi: Monthly EMI obligations (rupees)
            business_age_months: Business age in months
            gst_compliant: GST compliance status
            has_disputes: Whether applicant has past disputes
            
        Returns:
            Dictionary with 'positive' and 'negative' factor lists
        """
        positive: List[str] = []
        negative_candidates: List[Tuple[int, str]] = []

        debt_ratio = (total_debt / (monthly_revenue * 12.0)) if monthly_revenue > 0 else float("inf")
        emi_ratio = (emi / monthly_revenue) if monthly_revenue > 0 else float("inf")

        # Revenue strength / weakness
        if monthly_revenue >= 150000:
            positive.append(f"Revenue ₹{monthly_revenue:,.0f} supports business sustainability")
        elif monthly_revenue < 80000:
            negative_candidates.append((90, f"Revenue ₹{monthly_revenue:,.0f} is critically below ₹80,000 minimum threshold"))
        else:
            negative_candidates.append((70, f"Revenue ₹{monthly_revenue:,.0f} is below ₹150,000 sustainability threshold"))

        # Debt burden
        if debt_ratio <= 0.6:
            positive.append(f"Debt ratio {debt_ratio:.2f} indicates minimal leverage risk")
        elif debt_ratio > 1.0:
            negative_candidates.append((85, f"Debt ratio {debt_ratio:.2f} indicates high leverage risk"))
        else:
            negative_candidates.append((65, f"Debt ratio {debt_ratio:.2f} indicates elevated leverage risk"))

        # EMI stress
        if emi_ratio <= 0.3:
            positive.append(f"EMI ratio {emi_ratio:.2f} indicates strong repayment capacity")
        elif emi_ratio > 0.5:
            negative_candidates.append((80, f"EMI ratio {emi_ratio:.2f} indicates severe repayment stress"))
        else:
            negative_candidates.append((60, f"EMI ratio {emi_ratio:.2f} indicates elevated repayment stress"))

        # Business history
        if business_age_months >= 36:
            positive.append(f"Business age {business_age_months} months indicates high stability")
        elif business_age_months < 12:
            negative_candidates.append((75, f"Business age {business_age_months} months indicates high instability"))
        else:
            negative_candidates.append((50, f"Business age {business_age_months} months indicates limited operating history"))

        # Compliance and disputes
        if gst_compliant:
            positive.append("GST compliance reduces regulatory risk")
        else:
            negative_candidates.append((40, "GST non-compliance increases regulatory risk"))

        if has_disputes:
            negative_candidates.append((60, "Past disputes increase credit risk"))

        negative = []
        if negative_candidates:
            negative = [max(negative_candidates, key=lambda item: item[0])[1]]
        
        return {
            "positive": positive,
            "negative": negative
        }
    
    def calculate_score(
        self,
        monthly_revenue: float,
        total_debt: float,
        emi: float,
        business_age_months: int,
        gst_compliant: bool,
        has_disputes: bool
    ) -> Dict:
        """
        Calculate complete credit score assessment.
        
        Args:
            monthly_revenue: Average monthly revenue (rupees)
            total_debt: Total outstanding debt (rupees)
            emi: Monthly EMI obligations (rupees)
            business_age_months: Business age in months
            gst_compliant: GST compliance status
            has_disputes: Whether applicant has past disputes
            
        Returns:
            Dictionary with rule_score, pd, final_score, risk_category, decision, key_factors
        """
        # Step 1: Compute rule-based score
        rule_score = self.compute_rule_score(
            monthly_revenue, total_debt, emi, business_age_months,
            gst_compliant, has_disputes
        )
        
        # Step 2: Compute probability of default
        pd = self.compute_probability_of_default(
            monthly_revenue, total_debt, emi, business_age_months,
            gst_compliant, has_disputes
        )
        
        # Step 3: Compute final score
        final_score = self.compute_final_score(rule_score, pd)
        
        # Step 4: Get risk category
        risk_category = self.get_risk_category(pd)
        
        # Step 5: Get lending decision
        decision = self.get_decision(pd, final_score)
        
        # Step 6: Get key factors
        key_factors = self.get_key_factors(
            monthly_revenue, total_debt, emi, business_age_months,
            gst_compliant, has_disputes
        )
        
        return {
            "rule_score": round(rule_score, 2),
            "pd": round(pd, 4),
            "final_score": round(final_score, 2),
            "risk_category": risk_category,
            "decision": decision,
            "key_factors": key_factors
        }
