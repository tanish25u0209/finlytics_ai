"""
Pydantic schemas for input validation and response serialization.
"""
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


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


class ExtractedDocument(BaseModel):
    """Normalized fields extracted from a single uploaded document."""

    document_type: str = Field(..., description="Detected document type")
    source_document: str = Field(..., description="Original uploaded file name")
    monthly_revenue: Optional[float] = Field(None, ge=0)
    total_debt: Optional[float] = Field(None, ge=0)
    emi: Optional[float] = Field(None, ge=0)
    business_age_months: Optional[int] = Field(None, ge=0)
    gst_compliant: Optional[bool] = None
    has_disputes: Optional[bool] = None


class ExtractionResponse(BaseModel):
    """Response schema for mock document extraction."""

    documents: List[ExtractedDocument] = Field(..., description="Per-document extracted fields")
    scoring_payload: Dict[str, Any] = Field(
        ...,
        description="Merged normalized payload ready for /calculate-score",
    )


class GstinScoreRequest(BaseModel):
    """Request schema for GSTIN-based explainable scoring."""

    gstin: str = Field(..., min_length=5, description="GSTIN or mocked GSTIN identifier")


class GstinScoreResponse(BaseModel):
    """Explainable GSTIN score response."""

    gstin: str
    credit_score: int = Field(..., ge=300, le=900)
    risk_band: str
    risk_score: float = Field(..., ge=0, le=100)
    probability_of_default: float = Field(..., ge=0, le=1)
    risk_category: str
    top_reasons: List[str] = Field(..., min_length=1)
    recommended_loan_amount: float = Field(..., ge=0, description="Recommended sanctioned loan amount in rupees")
    recommended_tenure_months: int = Field(..., ge=6, le=60, description="Recommended tenure in months")
    fraud_flag: bool = Field(..., description="Whether the GSTIN is flagged for suspicious circular transaction behavior")
    fraud_score: float = Field(..., ge=0, le=1, description="Fraud risk score derived from mocked transaction topology")
    fraud_summary: str = Field(..., description="Plain-language explanation of the fraud assessment")
    linked_gstins: List[str] = Field(default_factory=list, description="Linked GSTINs involved in the mocked transaction network")
    score_freshness_timestamp: str
