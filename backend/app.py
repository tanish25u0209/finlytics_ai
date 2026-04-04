"""
FastAPI application for FinLytics Credit Scoring Engine.

Entry point for the deterministic credit scoring backend.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
try:
    from .routers import scoring
except ImportError:  # pragma: no cover - fallback for direct execution
    from routers import scoring

# Initialize FastAPI app
app = FastAPI(
    title="FinLytics Credit Scoring Engine",
    description="Deterministic credit scoring API for small business loan risk assessment",
    version="1.0.0"
)

# Add CORS middleware for frontend integration (when added later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include scoring routes
app.include_router(scoring.router, prefix="/api/v1", tags=["scoring"])


@app.get("/")
def root():
    """Root endpoint with API information."""
    return {
        "message": "FinLytics Credit Scoring Engine",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/v1/health",
            "calculate_score": "/api/v1/calculate-score"
        },
        "docs": "/docs"  # Swagger UI
    }


if __name__ == "__main__":
    import uvicorn
    
    # Run development server
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
