"""
Scoring API endpoints for hybrid credit scoring and risk assessment.
"""
from fastapi import APIRouter, File, HTTPException, UploadFile
try:
    from ..schemas.models import (
        ScoringRequest,
        ScoringResponse,
        HealthResponse,
        ExtractionResponse,
        GstinScoreRequest,
        GstinScoreResponse,
        ApplicationSubmitRequest,
        ApplicationSubmitResponse,
        ApplicationListResponse,
        ApplicationAcceptRequest,
        ApplicationAcceptResponse,
        ManagerDashboardResponse,
        ApplicationChatMessageCreateRequest,
        ApplicationChatMessagesResponse,
    )
    from ..services.scoring_engine import ScoringEngine
    from ..services.document_extractor import MockDocumentExtractor
    from ..services.gstin_scoring_service import GstinScoringService
    from ..services.application_assignment_service import ApplicationAssignmentService
except ImportError:  # pragma: no cover - fallback for direct execution
    from schemas.models import (
        ScoringRequest,
        ScoringResponse,
        HealthResponse,
        ExtractionResponse,
        GstinScoreRequest,
        GstinScoreResponse,
        ApplicationSubmitRequest,
        ApplicationSubmitResponse,
        ApplicationListResponse,
        ApplicationAcceptRequest,
        ApplicationAcceptResponse,
        ManagerDashboardResponse,
        ApplicationChatMessageCreateRequest,
        ApplicationChatMessagesResponse,
    )
    from services.scoring_engine import ScoringEngine
    from services.document_extractor import MockDocumentExtractor
    from services.gstin_scoring_service import GstinScoringService
    from services.application_assignment_service import ApplicationAssignmentService

router = APIRouter()
engine = ScoringEngine()
extractor = MockDocumentExtractor()
gstin_scoring_service = GstinScoringService()
assignment_service = ApplicationAssignmentService()


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


@router.post("/applications/submit", response_model=ApplicationSubmitResponse)
def submit_application(request: ApplicationSubmitRequest):
    """Persist borrower application and assign/reuse manager mapping."""
    try:
        application = assignment_service.submit_application(request.dict())
        return {"application": application}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Application submission failed: {str(e)}")


@router.get("/applications/manager/{manager_email}", response_model=ApplicationListResponse)
def get_manager_applications(manager_email: str):
    """Fetch only applications assigned to this manager email."""
    try:
        applications = assignment_service.get_manager_applications(manager_email)
        return {"applications": applications}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Manager application fetch failed: {str(e)}")


@router.get("/applications/manager/{manager_email}/dashboard", response_model=ManagerDashboardResponse)
def get_manager_dashboard_applications(manager_email: str):
    """Fetch manager applications enriched with normalized backend scoring summary."""
    try:
        applications = assignment_service.get_manager_dashboard_applications(manager_email)
        return {"applications": applications}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Manager dashboard fetch failed: {str(e)}")


@router.get("/applications/borrower/{borrower_email}", response_model=ApplicationListResponse)
def get_borrower_applications(borrower_email: str):
    """Fetch only applications submitted by this borrower email."""
    try:
        applications = assignment_service.get_borrower_applications(borrower_email)
        return {"applications": applications}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Borrower application fetch failed: {str(e)}")


@router.get("/applications/pending", response_model=ApplicationListResponse)
def get_pending_applications():
    """Fetch pending borrower requests visible to all managers."""
    try:
        applications = assignment_service.get_pending_applications()
        return {"applications": applications}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pending application fetch failed: {str(e)}")


@router.get("/applications/system-metrics")
def get_system_metrics():
    """Return lightweight runtime metrics for dashboard widgets."""
    try:
        return assignment_service.get_system_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"System metrics fetch failed: {str(e)}")


@router.post("/applications/accept/{application_id}", response_model=ApplicationAcceptResponse)
def accept_application(application_id: str, request: ApplicationAcceptRequest):
    """Manager accepts a pending request and becomes the owner of full process."""
    try:
        application = assignment_service.accept_application(
            application_id=application_id,
            manager_email=request.manager_email,
            manager_name=request.manager_name,
        )
        return {"application": application}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Application accept failed: {str(e)}")


@router.get("/applications/{application_id}/messages", response_model=ApplicationChatMessagesResponse)
def get_application_messages(application_id: str):
    """Fetch chat messages for a given application."""
    try:
        messages = assignment_service.get_application_messages(application_id)
        return {"messages": messages}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Application message fetch failed: {str(e)}")


@router.post("/applications/{application_id}/messages")
def post_application_message(application_id: str, request: ApplicationChatMessageCreateRequest):
    """Create a chat message for the selected application."""
    try:
        message = assignment_service.add_application_message(application_id, request.dict())
        return {"message": message}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Application message create failed: {str(e)}")
