# FinLytics Credit Scoring Backend

ML-powered credit risk assessment API for MSME loan scoring, using XGBoost probability of default (PD) models with GST filing analysis and financial metric extraction.

## Quick Start

### Prerequisites
- Python 3.10+
- pip package manager

### Installation & Run

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run the API server
python app.py
```

The API server starts on `http://localhost:8000`

### Access Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app.py                              # FastAPI application entry point
├── requirements.txt                    # Python dependencies
├── routers/
│   ├── __init__.py
│   └── scoring.py                     # API endpoints for scoring and applications
├── schemas/
│   ├── __init__.py
│   └── models.py                      # Pydantic models (request/response schemas)
├── services/
│   ├── __init__.py
│   ├── scoring_engine.py              # Core scoring orchestration logic
│   ├── gstin_scoring_service.py       # GSTIN-based scoring with ML model
│   ├── document_extractor.py          # Financial document parsing and extraction
│   └── application_assignment_service.py # Application workflow management
└── data/
    ├── assigned_applications.json     # Sample applications (anonymized)
    └── demo_submit.json               # Demo submission example
```

## Core Services

### 1. Scoring Engine (`services/scoring_engine.py`)

Main orchestration service that:
- Accepts raw financial input (revenue, debt, EMI, business age)
- Processes through extraction and validation
- Calls ML scoring service
- Returns structured decision package

**Main Method**: `score_application(payload) → ScoringResponse`

### 2. GSTIN Scoring Service (`services/gstin_scoring_service.py`)

Specialized service for GSTIN-based risk assessment:

**Features**:
- Loads pre-trained XGBoost model for PD prediction
- Computes 20+ financial behavior features
- SHAP-based factor importance (top 5 reasons)
- Risk band assignment (Low/Medium/High)
- Loan amount and tenure recommendations

**Model**: XGBoost with 78% prediction accuracy
- Training data: 2,000+ synthetic MSME records
- Features: GST filing patterns, cash flow health, compliance metrics
- Output: PD score (0-1), risk category, top factors

### 3. Document Extractor (`services/document_extractor.py`)

Extracts financial metrics from uploaded documents:
- **GST Filings**: Monthly revenue, filing compliance, transaction frequency
- **Bank Statements**: Cash inflows/outflows, average balance
- **ITR**: Net profit, total income assertions
- **Incorporation Certificates**: Business establishment date

## API Endpoints

### Health & Status
- **GET** `/api/v1/health` - API health check

### GSTIN Scoring (Primary Endpoint)
- **POST** `/api/v1/score/gstin` - Score borrower by GSTIN

**Request**:
```json
{
  "gstin": "29ABCDE1234F1Z5",
  "applicant_phone": "+91-9876543210",
  "monthly_revenue": 500000,
  "total_outstanding_debt": 2000000,
  "monthly_emi_commitments": 150000,
  "business_age_months": 36
}
```

**Response**:
```json
{
  "gstin": "29ABCDE1234F1Z5",
  "credit_score": 412,
  "risk_band": "Medium Risk",
  "risk_score": 45.2,
  "probability_of_default": 0.52,
  "risk_category": "MEDIUM",
  "top_reasons": [
    "Cash-flow health is weak after accounting for volatility",
    "Debt ratio 1.6 indicates moderate leverage risk",
    "Recent GST filing show declining trend"
  ],
  "recommended_loan_amount": 200000,
  "recommended_tenure_months": 18
}
```

### Applications Management
- **POST** `/api/v1/applications` - Create new application
- **GET** `/api/v1/applications` - List all applications (with filtering)
- **GET** `/api/v1/applications/{id}` - Get application details
- **PUT** `/api/v1/applications/{id}` - Update application status

## Scoring Algorithm

### Step 1: Feature Engineering
Input metrics transformed into 20+ financial indicators:
- Revenue stability (monthly variance)
- Cash flow coverage (monthly revenue / EMI)
- Debt ratio (total debt / monthly revenue)
- Business maturity (log transformation of age)
- GST compliance history
- Transaction frequency
- Invoice velocity

### Step 2: ML Prediction
XGBoost model predicts Probability of Default (PD):
- **Input**: 20+ engineered features
- **Output**: PD score 0-1 (0 = safe, 1 = certain default)
- **Calibration**: Probability matched to base rate of defaults

### Step 3: Risk Banding
PD score converted to risk categories:

| PD Score | Risk Band | Decision | Loan Details |
|----------|----------|----------|--------------|
| 0.0-0.2 | Low Risk | Approve | 5x revenue, 36 months |
| 0.2-0.5 | Medium Risk | Review | 2x revenue, 18 months |
| 0.5-1.0 | High Risk | Reject | 1x revenue, 6 months |

### Step 4: Recommendations
Based on risk band and available cash flow:
- **Loan Amount**: Constrained by revenue and existing debt
- **Tenure**: Adjusted for repayment capacity and risk

### Step 5: Explainability
SHAP values computed for each prediction showing:
- Top 5 positive factors (supporting approval)
- Top 5 negative factors (supporting rejection)
- Each factor's impact on final PD score

## Configuration

### Environment Variables

```bash
# API Configuration (optional)
DEBUG=false
LOG_LEVEL=INFO

# Database (future)
DATABASE_URL=sqlite:///./finlytics.db
```

### Model Configuration

Model artifacts located in `../ml/models/`:
- `gst_behavior_pd_model.pkl` - XGBoost PD model
- `scaler_meta.json` - Feature scaling metadata
- `gst_behavior_features.csv` - Feature engineering configs

## Development & Testing

### Run Tests
```bash
cd backend
pytest tests/ -v
```

### Test Coverage
- Unit tests: Scoring logic, feature engineering
- Integration tests: API endpoints, end-to-end flows
- Fixtures: Sample applications, scoring scenarios

### Code Quality
- **Style**: PEP 8 compliance
- **Type Hints**: Full type annotations throughout
- **Linting**: Configured for flake8, mypy

## Performance Characteristics

- **Scoring Latency**: <500ms per application
- **Throughput**: 1000+ applications/hour
- **Memory**: ~150MB for loaded model + features
- **Scalability**: Stateless design allows horizontal scaling

## Dependencies

Key packages (see `requirements.txt`):
- **fastapi**: REST API framework
- **pydantic**: Request/response validation
- **xgboost**: ML model for PD prediction
- **scikit-learn**: Feature preprocessing
- **shap**: Model explainability
- **pandas**/**numpy**: Data processing
- **joblib**: Model serialization

## Notes

- All monetary values in INR (₹)
- Timestamps in ISO 8601 format with timezone
- GSTIN format validated: 15-character alphanumeric
- Phone numbers validated: Indian format with country code
