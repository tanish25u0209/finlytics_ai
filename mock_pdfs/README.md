## Mock PDFs

These files are mock source documents for the frontend upload flow.
The extraction layer is now included too.

Files:

- `bank_statement_sample.pdf`
  - Simulates extraction of `monthly_revenue`, `emi`, and `total_debt`
- `gst_filing_sample.pdf`
  - Simulates extraction of `gst_compliant`
- `incorporation_certificate_sample.pdf`
  - Simulates extraction of `business_age_months`
- `itr_sample_fy_2024_25.pdf`
  - Supplemental financial proof for revenue/profit validation
- `loan_history_disputes_sample.pdf`
  - Simulates extraction of `has_disputes`

Extraction layer:

- `mock_extractor.py`
  - Parses the mock PDFs and builds the normalized scoring payload
- `extracted_payload.json`
  - Example output after extraction

Target scoring payload:

```json
{
  "monthly_revenue": 500000,
  "total_debt": 200000,
  "emi": 20000,
  "business_age_months": 48,
  "gst_compliant": true,
  "has_disputes": false
}
```

Run the extractor:

```bash
python mock_pdfs/mock_extractor.py
```
