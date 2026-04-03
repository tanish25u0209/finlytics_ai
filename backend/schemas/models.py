"""
Pydantic schemas for input validation and response serialization.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Dict, List


class ScoringRequest(BaseModel):
    """Request schema for hybrid credit scoring endpoint."""
    
    monthly_revenue: float = Field(..., ge=0, description="Average monthly revenue in rupees")
    total_debt: float = Field(..., ge=0, description="Total outstanding debt in rupees")
    emi: float = Field(..., ge=0, description="Monthly EMI obligations in rupees")
    business_age_months: int = Field(..., ge=0, description="Business age in months")
    gst_compliant: bool = Field(..., description="GST compliance status")
    has_disputes: bool = Field(..., description="Whether applicant has past disputes")

    class Config:
        json_schema_extra = {
            "example": {
                "monthly_revenue": 500000,
                "total_debt": 200000,
                "emi": 20000,
                "business_age_months": 36,
                "gst_compliant": True,
                "has_disputes": False
            }
        }


class KeyFactors(BaseModel):
    """Positive and negative factors influencing the score."""
    
    positive: List[str] = Field(..., description="List of positive factors")
    negative: List[str] = Field(..., description="List of negative factors")


class ScoringResponse(BaseModel):
    """Response schema for hybrid credit scoring endpoint."""
    
    rule_score: float = Field(..., ge=0, le=100, description="Deterministic rule-based score (0-100)")
    pd: float = Field(..., ge=0, le=1, description="Probability of default (0-1)")
    final_score: float = Field(..., ge=0, le=100, description="Hybrid final score (0-100)")
    risk_category: str = Field(..., description="Risk category: Low Risk, Medium Risk, or High Risk")
    decision: str = Field(..., description="Lending decision: Approve, Manual Review, or Reject")
    key_factors: KeyFactors = Field(..., description="Positive and negative factors")

    class Config:
        json_schema_extra = {
            "example": {
                "rule_score": 75.0,
                "pd": 0.1234,
                "final_score": 68.5,
                "risk_category": "Low Risk",
                "decision": "Approve",
                "key_factors": {
                    "positive": ["strong revenue", "established business", "compliant"],
                    "negative": ["high EMI stress"]
                }
            }
        }


class HealthResponse(BaseModel):
    """Response schema for health check endpoint."""
    
    status: str = Field(..., description="Health status")
    version: str = Field(..., description="API version")
