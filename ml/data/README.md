# FinLytics ML Data Module

Synthetic dataset generation for training and testing the credit scoring ML model.

## Datasets

### Training Dataset (`training_data.csv`)
- **300 samples** with binary default labels (0 = repaid, 1 = defaulted)
- Used for training ML models in Phase 3
- Includes all 8 features: monthly_revenue, net_profit, debt, emi, gst_compliance, past_disputes, business_age, collateral_type
- Default rate simulates realistic distribution (~12-15%)
- Generated with deterministic seed for reproducibility

### Test Dataset (`test_data.csv`)
- **50 samples** without labels (for API testing)
- Used to validate scoring engine in Phase 4
- Same features as training data (minus default_label)
- Diverse applicant profiles (micro, small, medium, large businesses)

## Usage

### Generate Datasets

```bash
cd ml/data
python generate_synthetic.py
```

This creates:
- `training_data.csv` - for ML training
- `training_data.json` - alternative format
- `test_data.csv` - for scoring engine testing  
- `test_data.json` - alternative format

### Data Generation Strategy

The synthetic data generator creates realistic applicant profiles by:

1. **Business Tier Distribution:** Generates micro, small, medium, and large businesses evenly
2. **Revenue Distribution:** Tier-based revenue ranges (e.g., micro: 50k-200k, large: 5M+)
3. **Profit Margins:** Realistic margins (5-30%) with noise
4. **Debt Profiles:** Risk-based debt-to-revenue ratios (low: 0.2-0.5, medium: 0.5-1.0, high: 1.0-2.0)
5. **EMI Obligations:** Derived from debt with loan term assumptions
6. **Compliance Flags:** 80% GST compliant, 15% have past disputes
7. **Business Age:** Uniformly distributed 1-180 months (0-15 years)
8. **Default Labels:** Probabilistic based on financial health indicators

### Default Rate Calculation

Default probability is computed from:
- Debt-to-revenue ratio (high = risky)
- Debt service coverage ratio (low = risky)
- Business age (new = risky)
- GST compliance (non-compliant = risky)
- Past disputes (strong default indicator)

This creates a realistic distribution where default rate correlates with financial stress indicators.

## Test Scenarios

For deterministic testing, see `tests/fixtures/test_scenarios.py`:

- **Strong Applicant:** High revenue, low debt, compliant, established → Low Risk
- **Borderline Applicant:** Moderate metrics → Medium Risk
- **Risky Applicant:** Low revenue, high debt, non-compliant, new → High Risk
- **Edge Cases:** Zero revenue, perfect financials, high EMI stress

All scenarios have expected score ranges for validation.

## Files

- `generate_synthetic.py` - Data generation script and SyntheticDataGenerator class
- `training_data.csv` - Generated training dataset (300 samples with labels)
- `training_data.json` - Same as above in JSON format
- `test_data.csv` - Generated test dataset (50 samples, no labels)
- `test_data.json` - Same as above in JSON format

## Integration with ML Pipeline (Phase 3)

1. Load `training_data.csv` with pandas or direct CSV reader
2. Extract features (X) and labels (y)
3. Split into train/validation sets
4. Train Random Forest or XGBoost classifier
5. Validate on test set
6. Export model artifact for Phase 3 API endpoint
