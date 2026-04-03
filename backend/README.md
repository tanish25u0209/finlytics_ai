# FinLytics Credit Scoring Backend

Deterministic credit scoring engine for small business loan risk assessment.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run Development Server

```bash
python app.py
```

Or with uvicorn directly:

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check
- **GET** `/api/v1/health`
- Returns API health status and version

### Calculate Credit Score
- **POST** `/api/v1/calculate-score`
- Request body (JSON):
  ```json
  {
    "monthly_revenue": 500000,
    "net_profit": 100000,
    "debt": 200000,
    "emi": 20000,
    "gst_compliance": 1,
    "past_disputes": 0,
    "business_age": 36,
    "collateral_type": 1
  }
  ```
- Response (JSON):
  ```json
  {
    "final_score": 72.0,
    "risk_category": "Medium Risk",
    "feature_contributions": {
      "financial_health": 21.6,
      "cash_flow_stability": 12.5,
      "gst_compliance": 20.0,
      "fraud_risk": 15.0,
      "business_age": 3.0
    }
  }
  ```

## Project Structure

```
backend/
├── app.py                    # FastAPI entry point
├── requirements.txt          # Python dependencies
├── routers/
│   ├── __init__.py
│   └── scoring.py           # Scoring endpoints (POST /calculate-score, GET /health)
├── schemas/
│   ├── __init__.py
│   └── models.py            # Pydantic request/response schemas
└── services/
    ├── __init__.py
    └── scoring_engine.py    # ScoringEngine class with all scoring logic
```

## Scoring Formula

### Components (each 0-100 scale):

1. **Financial Health (30% weight)**
   - Activity Score: 0.7 × (revenue/100k) + 0.3 × (invoice_count/50)
   - Revenue Consistency: 100 - (StdDev/Mean) × 100 (mocked at 15% volatility)
   - Final: 0.6 × Activity + 0.4 × Consistency

2. **Cash Flow Stability (25% weight)**
   - Formula: min((monthly_revenue / max(emi, 1)) × 50, 100)
   - Represents inflow-to-outflow ratio

3. **GST Compliance (20% weight)**
   - Direct mapping: 0 → 0 score, 1 → 100 score

4. **Fraud Risk (15% weight)**
   - Direct mapping: no disputes (0) → 100 score, disputes (1) → 0 score

5. **Business Age (10% weight)**
   - Formula: min((months / 60) × 100, 100)
   - 60 months (5 years) = 100 score

### Final Score
```
Final = 0.30 × Financial Health + 0.25 × Cash Flow + 0.20 × GST + 
        0.15 × Fraud Risk + 0.10 × Business Age
```

### Risk Mapping
- **80-100**: Low Risk
- **50-79**: Medium Risk
- **0-49**: High Risk

## Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Development

### Running Tests (when added)
```bash
pytest tests/
```

### Code Style
- Follow PEP 8
- Use type hints throughout
- Document all functions with docstrings

## Notes

- All components are normalized to 0-100 scale
- Revenue consistency is mocked at 15% volatility for MVP (can be parameterized)
- Invoice count is derived from monthly_revenue with 5000 rupee avg invoice assumption
- Collateral type is reserved for future use and not currently used in scoring
