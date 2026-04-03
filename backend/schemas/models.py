"""
Pydantic schemas for input validation and response serialization.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Dict


class ScoringRequest(BaseModel):
    """Request schema for credit scoring endpoint."""
    
    monthly_revenue: float = Field(..., ge=0, description="Average monthly revenue in rupees")
    net_profit: float = Field(..., ge=0, description="Average net profit in rupees")
    debt: float = Field(..., ge=0, description="Total outstanding debt in rupees")
    emi: float = Field(..., ge=0, description="Monthly EMI obligations in rupees")
    gst_compliance: int = Field(..., ge=0, le=1, description="GST compliance flag (0 or 1)")
    past_disputes: int = Field(..., ge=0, le=1, description="Past legal disputes flag (0 or 1)")
    business_age: int = Field(..., ge=0, description="Business age in months")
    collateral_type: int = Field(default=0, ge=0, description="Collateral type code (reserved for future use)")

    class Config:
        json_schema_extra = {
            "example": {
                "monthly_revenue": 500000,
                "net_profit": 100000,
                "debt": 200000,
                "emi": 20000,
                "gst_compliance": 1,
                "past_disputes": 0,
                "business_age": 36,
                "collateral_type": 1
            }
        }

    @field_validator('gst_compliance', 'past_disputes')
    @classmethod
    def validate_binary_flags(cls, v):
        if v not in (0, 1):
            raise ValueError('Flag must be 0 or 1')
        return v


class FeatureContributions(BaseModel):
    """Feature contributions to the final score."""
    
    financial_health: float = Field(..., ge=0, le=100, description="Financial health contribution (0-100)")
    cash_flow_stability: float = Field(..., ge=0, le=100, description="Cash flow stability contribution (0-100)")
    gst_compliance: float = Field(..., ge=0, le=100, description="GST compliance contribution (0-100)")
    fraud_risk: float = Field(..., ge=0, le=100, description="Fraud risk contribution (0-100)")
    business_age: float = Field(..., ge=0, le=100, description="Business age contribution (0-100)")


class ScoringResponse(BaseModel):
    """Response schema for credit scoring endpoint."""
    
    final_score: float = Field(..., ge=0, le=100, description="Final credit score (0-100)")
    risk_category: str = Field(..., description="Risk category: Low Risk, Medium Risk, or High Risk")
    feature_contributions: FeatureContributions = Field(..., description="Contribution of each feature to final score")

    class Config:
        json_schema_extra = {
            "example": {
                "final_score": 72,
                "risk_category": "Medium Risk",
                "feature_contributions": {
                    "financial_health": 25,
                    "cash_flow_stability": 18,
                    "gst_compliance": 20,
                    "fraud_risk": 12,
                    "business_age": 10
                }
            }
        }


class HealthResponse(BaseModel):
    """Response schema for health check endpoint."""
    
    status: str = Field(..., description="Health status")
    version: str = Field(..., description="API version")
