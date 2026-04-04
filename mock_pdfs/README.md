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

## Package Subfolders (5 Sets)

To support multiple mock scenarios, `mock_pdfs/packages/` now contains 5 small packages.
Each package has the same 4 expected filenames and its own `expected_output.json`.

Packages:

- `package_01_baseline`
  - Balanced baseline applicant
- `package_02_strong`
  - Strong applicant profile
- `package_03_medium`
  - Medium-risk profile
- `package_04_risky`
  - High-risk profile
- `package_05_mixed_edge`
  - Mixed edge-case profile (high revenue + very new business age)

Each package includes:

- `bank_statement_sample.pdf`
- `gst_filing_sample.pdf`
- `incorporation_certificate_sample.pdf`
- `loan_history_disputes_sample.pdf`
- `expected_output.json`

Run extractor for a specific package:

```bash
python mock_pdfs/mock_extractor.py --package-dir mock_pdfs/packages/package_01_baseline
```

Batch-generate outputs for all packages:

```bash
for d in mock_pdfs/packages/*; do
  python mock_pdfs/mock_extractor.py --package-dir "$d" > "$d/expected_output.json"
done
```
