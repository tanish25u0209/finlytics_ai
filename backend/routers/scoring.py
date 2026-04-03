"""
Scoring API endpoints for hybrid credit scoring and risk assessment.
"""
from fastapi import APIRouter, File, HTTPException, UploadFile
from schemas.models import (
    ScoringRequest,
    ScoringResponse,
    HealthResponse,
    ExtractionResponse,
    GstinScoreRequest,
    GstinScoreResponse,
)
from services.scoring_engine import ScoringEngine
from services.document_extractor import MockDocumentExtractor
from services.gstin_scoring_service import GstinScoringService

router = APIRouter()
engine = ScoringEngine()
extractor = MockDocumentExtractor()
gstin_scoring_service = GstinScoringService()


@router.get("/health", response_model=HealthResponse)
def health_check():
    """
    Health check endpoint to verify API is running.
    
    Returns:
        HealthResponse with status and version
    """
    return {
        "status": "healthy",
        "version": "2.0.0"
    }


@router.post("/calculate-score", response_model=ScoringResponse)
def calculate_score(request: ScoringRequest):
    """
    Calculate hybrid credit score using rule-based scoring and probability of default.
    
    Endpoint: POST /calculate-score
    
    Args:
        request: ScoringRequest with applicant financial metrics
        
    Returns:
        ScoringResponse with rule_score, pd, final_score, risk_category, decision, and key_factors
        
    Raises:
        HTTPException: If request validation fails (400)
    """
    try:
        # Calculate score using hybrid approach
        result = engine.calculate_score(
            monthly_revenue=request.monthly_revenue,
            total_debt=request.total_debt,
            emi=request.emi,
            business_age_months=request.business_age_months,
            gst_compliant=request.gst_compliant,
            has_disputes=request.has_disputes
        )
        
        # Create response with all result fields
        response = ScoringResponse(
            rule_score=result["rule_score"],
            pd=result["pd"],
            final_score=result["final_score"],
            risk_category=result["risk_category"],
            decision=result["decision"],
            key_factors=result["key_factors"]
        )
        
        return response
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid input: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/extract-documents", response_model=ExtractionResponse)
async def extract_documents(files: list[UploadFile] = File(...)):
    """
    Extract normalized scoring fields from uploaded mock PDFs.

    The demo extractor infers document type from the uploaded filename and parses
    simple key/value content from the PDF bytes.
    """
    try:
        extracted_documents = [await extractor.extract_uploaded_document(upload) for upload in files]
        scoring_payload = extractor.build_scoring_payload(extracted_documents)
        return ExtractionResponse(documents=extracted_documents, scoring_payload=scoring_payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document extraction failed: {str(e)}")


@router.post("/gstin-score", response_model=GstinScoreResponse)
def gstin_score(request: GstinScoreRequest):
    """Return explainable GSTIN-level behavior score from the saved ML artifacts."""
    try:
        return GstinScoreResponse(**gstin_scoring_service.score_gstin(request.gstin))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GSTIN scoring failed: {str(e)}")
