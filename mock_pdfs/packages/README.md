## Mock PDF Packages

This folder contains 5 independent mock document packages.
Each package has the same document filenames, but different content and output.

### Package list

1. package_01_baseline
2. package_02_strong
3. package_03_medium
4. package_04_risky
5. package_05_mixed_edge

### Output differences (scoring_payload)

| Package | monthly_revenue | emi | total_debt | gst_compliant | business_age_months | has_disputes |
|---|---:|---:|---:|---|---:|---|
| package_01_baseline | 500000 | 20000 | 200000 | true | 48 | false |
| package_02_strong | 1500000 | 20000 | 300000 | true | 120 | false |
| package_03_medium | 250000 | 55000 | 900000 | true | 18 | false |
| package_04_risky | 90000 | 60000 | 1600000 | false | 8 | true |
| package_05_mixed_edge | 1500000 | 20000 | 300000 | true | 8 | false |

### Run extractor for one package

```bash
python mock_pdfs/mock_extractor.py --package-dir mock_pdfs/packages/package_03_medium
```

### Files required in each package

- bank_statement_sample.pdf
- gst_filing_sample.pdf
- incorporation_certificate_sample.pdf
- loan_history_disputes_sample.pdf
- expected_output.json
