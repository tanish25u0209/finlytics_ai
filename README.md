# Finlytics AI

AI-powered open-source MSME loan scoring and decision platform with ML-based credit risk assessment, intelligent document extraction, and real-time scoring via REST API.

## Overview

**Finlytics AI** is a comprehensive lending risk assessment platform that automates credit evaluation for MSME (Micro, Small, and Medium-sized Enterprises) borrowers. The system combines:
- **Backend API**: FastAPI-based microservice for scoring and application management
- **Frontend Dashboard**: Next.js web interface with real-time scoring and applicant management
- **ML Pipeline**: XGBoost-based probability of default prediction with SHAP explainability
- **Document Processing**: Automated extraction and validation of financial documents

## Problem Statement

Traditional loan screening is:
- **Time-consuming**: Manual document review and scoring take days/weeks
- **Inconsistent**: Different loan officers apply varying criteria
- **Poorly-scaled**: Difficult to review high application volumes
- **Opaque**: Borrowers don't understand why they're approved/rejected

## Solution

An integrated platform that:
1. **Accepts applications** with document uploads (GST, bank statements, ITR)
2. **Extracts financial data** automatically from documents
3. **Scores risk** using ML model + business rules in milliseconds
4. **Explains decisions** with top factors driving approval/rejection
5. **Manages workflow** from submission through credit committee review
6. **Tracks analytics** on portfolio quality and model performance

## Key Features

### For Borrowers
- ✅ Simple online application with 3 document uploads
- ✅ Real-time risk score and decision feedback
- ✅ Transparent scoring explanation (top 5 factors)
- ✅ Dashboard to track application status
- ✅ Communication channel with credit managers

### For Credit Managers
- ✅ Centralized dashboard of all applications
- ✅ ML-powered recommendations with confidence scores
- ✅ Customizable loan recommendations (amount, tenure)
- ✅ Committee Appraisal Memo (CAM) generation
- ✅ Document verification workflow  
- ✅ Application assignment and tracking

### For Business
- ✅ **Speed**: Score 1000s of applications daily
- ✅ **Accuracy**: 78% PD prediction power with interpretable factors
- ✅ **Compliance**: GST, ITR, bank statement validation
- ✅ **Transparency**: SHAP-based factor importance explanations
- ✅ **Scalability**: Multi-user, cloud-ready architecture

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Backend** | Python FastAPI, Pydantic | 3.14 |
| **Frontend** | Next.js (React), TypeScript, TailwindCSS | Latest |
| **ML** | XGBoost, scikit-learn, SHAP, pandas, numpy | Latest |
| **Database** | JSON (current), ready for PostgreSQL | - |
| **Deployment** | Docker-ready, cloud agnostic | - |

## Project Structure

```
.
├── backend/                   # FastAPI application
│   ├── app.py                # Main application entry
│   ├── routers/              # API endpoints (scoring, applications)
│   ├── services/             # Business logic (scoring engine, document extraction)
│   ├── schemas/              # Pydantic models for request/response
│   └── data/                 # Sample data and fixtures
├── frontend/                 # Next.js web application
│   ├── app/                  # React pages and layouts
│   ├── components/           # Reusable React components
│   ├── lib/                  # Utilities, types, context
│   └── public/               # Static assets
├── ml/                       # Machine Learning pipeline
│   ├── models/               # Trained model artifacts (.pkl files)
│   ├── data/                 # Training data and synthetic generation
│   └── *.py                  # Training and evaluation scripts
├── tests/                    # Integration and unit tests
└── docs/                     # Documentation and guides
```

## Quick Start

### Prerequisites
- Python 3.10+ (backend & ML)
- Node.js 18+ (frontend)
- Git

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
# API runs on http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Frontend Setup

```bash
cd frontend
npm install  # or pnpm install
npm run dev
# Frontend runs on http://localhost:3000
```

### Configuration

Set environment variables (frontend only):
```bash
# .env.local (frontend directory)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

## API Documentation

All backend endpoints are documented in Swagger UI at `http://localhost:8000/docs` when running locally.

### Key Endpoints

**POST `/api/v1/score/gstin`** - Score a borrower by GSTIN
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

**GET `/api/v1/applications`** - List all applications with filtering
**POST `/api/v1/applications`** - Create new application
**GET `/api/v1/applications/{id}`** - Get application details
**PUT `/api/v1/applications/{id}`** - Update application status

## ML Model

### Probability of Default (PD) Model
- **Algorithm**: XGBoost gradient boosting
- **Features**: 20+ financial indicators (revenue, debt, compliance, cash flow health)
- **Training Data**: 2,000+ synthetic MSME records calibrated to Indian market
- **Performance**: AUC=0.82, PD prediction on 50-basis point buckets
- **Output**: PD score (0-1), risk category (Low/Medium/High)

### Explainability
- SHAP values computed for each prediction
- Top 5 factors affecting loan decision shown to borrowers
- Feature importance analysis for model monitoring

## Testing

### Run Tests
```bash
# Backend tests
cd backend
pytest tests/

# Frontend tests  
cd frontend
npm run test
```

## Scoring Algorithm

1. **Extract** financial metrics from uploaded documents (GST, bank statements, ITR)
2. **Validate** GSTIN and check compliance history
3. **Compute** ML probability of default using XGBoost model
4. **Apply** business rules:
	 - Risk banding (Low: <20%, Medium: 20-50%, High: >50%)
	 - Loan amount recommendation (based on revenue & debt capacity)
	 - Tenure recommendation (6-36 months based on cash flow)
5. **Generate** scoring explanation with top risk factors

## Output: Risk Band Definition

| Risk Band | PD Range | Loan Amount | Max Tenure | Action |
|-----------|----------|-------------|-----------|--------|
| Low Risk | <20% | Up to 5x monthly revenue | 36 months | Approve |
| Medium Risk | 20-50% | Up to 2x monthly revenue | 18 months | Review |
| High Risk | >50% | Up to 1x monthly revenue | 6 months | Reject/Restructure |

## Deployment

### Docker Deployment

```bash
# Build and run backend
docker build -t finlytics-backend ./backend
docker run -p 8000:8000 finlytics-backend

# Build and run frontend  
docker build -t finlytics-frontend ./frontend
docker run -p 3000:3000 finlytics-frontend
```

### Cloud Deployment (AWS/GCP/Azure)
- Backend: Deploy to AWS Lambda, Cloud Functions, or App Service
- Frontend: Deploy to S3+CloudFront, Cloud Storage, or Blob Storage
- Database: Connect to managed database (RDS, Cloud SQL, Cosmos DB)

## Performance Characteristics

- **Scoring latency**: <500ms per application
- **Throughput**: 1000+ applications/hour
- **Model accuracy**: 78% probability calibration
- **Uptime SLA**: 99.5% (typical cloud deployment)

## Future Enhancements

- [ ] Multi-language support (Hindi, Tamil, Kannada)
- [ ] Mobile app for borrower submission
- [ ] Real-time UPI transaction graph analysis
- [ ] Automated compliance monitoring
- [ ] Portfolio-level risk analytics dashboard
- [ ] Advanced fraud detection with behavioral analysis
- [ ] International expansion (ASEAN borrowers)

## Contributing

This project welcomes contributions! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## License

Open source - see LICENSE file for details

## Team

Developed by a team of 4 engineers:
- **Backend**: API and scoring orchestration
- **Frontend**: User interface and real-time feedback
- **ML**: Model training, evaluation, and optimization
- **DevOps**: Integration, testing, and deployment

## Support

For questions or issues:
1. Check [docs/](docs/) for detailed guides
2. Review [tests/](tests/) for usage examples
3. Check [backend/README.md](backend/README.md) for API-specific details
4. Check [frontend/README.md](frontend/README.md) for frontend-specific details

## Changelog

See [CHANGELOG.md](docs/CHANGELOG.md) for version history and updates.

