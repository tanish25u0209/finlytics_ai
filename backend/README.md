# PulseScore Backend

Backend API for PulseScore, an alternative credit scoring platform for new Indian businesses.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Run development server:

```bash
npm run dev
```

Server default: `http://localhost:5000`

## API Endpoints

- `GET /api/health` - health check
- `POST /api/auth/register` - register user
- `POST /api/auth/login` - login and receive JWT
- `POST /api/score/evaluate` - evaluate credit score (requires Bearer token)

## Sample Payload for Scoring

```json
{
  "businessId": "biz_1001",
  "gstConsistency": 82,
  "upiDiversity": 68,
  "ewayGrowth": 34,
  "fraudRisk": 22
}
```

## Notes

- Storage is currently in-memory (`src/data/mockStore.js`).
- Replace with DB integration (PostgreSQL/MongoDB) for production.
