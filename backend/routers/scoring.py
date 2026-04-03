"""
Scoring API endpoints for credit score calculation and risk assessment.
"""
from fastapi import APIRouter, HTTPException
from schemas.models import ScoringRequest, ScoringResponse, FeatureContributions, HealthResponse
from services.scoring_engine import ScoringEngine

router = APIRouter()
engine = ScoringEngine()


@router.get("/health", response_model=HealthResponse)
def health_check():
    """
    Health check endpoint to verify API is running.
    
    Returns:
        HealthResponse with status and version
    """
    return {
        "status": "healthy",
        "version": "1.0.0"
    }


@router.post("/calculate-score", response_model=ScoringResponse)
def calculate_score(request: ScoringRequest):
    """
    Calculate credit score and risk category for an applicant.
    
    Endpoint: POST /calculate-score
    
    Args:
        request: ScoringRequest with applicant financial metrics
        
    Returns:
        ScoringResponse with final_score, risk_category, and feature_contributions
        
    Raises:
        HTTPException: If request validation fails (400)
    """
    try:
        # Calculate final score and contributions
        final_score, contributions = engine.calculate_final_score(
            monthly_revenue=request.monthly_revenue,
            net_profit=request.net_profit,
            debt=request.debt,
            emi=request.emi,
            gst_compliance=request.gst_compliance,
            past_disputes=request.past_disputes,
            business_age=request.business_age
        )
        
        # Determine risk category
        risk_category = engine.map_risk_category(final_score)
        
        # Round contributions to 2 decimal places for clarity
        rounded_contributions = {k: round(v, 2) for k, v in contributions.items()}
        
        # Create response
        response = ScoringResponse(
            final_score=round(final_score, 2),
            risk_category=risk_category,
            feature_contributions=FeatureContributions(**rounded_contributions)
        )
        
        return response
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid input: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
