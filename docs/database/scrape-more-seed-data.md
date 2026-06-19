# Scrape More Seed Data

Script:

```bash
npm run scrape:more
```

Or run directly:

```bash
node scripts/scrape-more-medical-data.js --min-drugs=240 --min-symptoms=240 --min-mappings=500
```

Default output:

```text
data/crawled/more/symptoms_scraped.csv
data/crawled/more/drugs_scraped.csv
data/crawled/more/drug_symptom_mappings_review.csv
data/crawled/more/scrape_import.sql
data/crawled/more/scrape_report.json
```

## Important: do not import the mapping CSV into `drug_symptoms`

The database table stores UUID columns:

```text
drug_id, symptom_id, confidence_score
```

The review CSV stores readable lookup values:

```text
symptom_code, drug_name, confidence_score, notes
```

Therefore `drug_symptom_mappings_review.csv` is for reviewing the generated mappings only. It is intentionally not compatible with Supabase's direct CSV importer.

## Recommended Supabase import/repair flow

1. Run the script.
2. Open `data/crawled/more/scrape_import.sql`.
3. Paste it into Supabase SQL Editor.
4. Run the SQL.

Use this SQL even if `drugs_scraped.csv` was already imported. It will:

- update existing symptoms by `code` instead of failing on duplicates such as `sot`;
- preserve the Vietnamese curated symptoms and ICD-10 codes;
- skip drugs whose names already exist, without requiring a unique index;
- resolve `symptom_code` and `drug_name` to UUIDs before inserting `drug_symptoms`;
- keep existing tables and rows; it does not drop or delete data.

The generated SQL uses `ON CONFLICT` for symptoms and mappings, so it is safe to run again when refreshing seed data.

`symptoms_scraped.csv` contains only newly scraped symptoms and excludes the original Vietnamese seed rows. Direct CSV import is still intended for a one-time import only; use `scrape_import.sql` for repeatable imports.

Main data source is Wikipedia API because it is stable for scripts. DrugBank, DAV, CTDbase, and EBI are checked best-effort and recorded in `scrape_report.json`; if a site blocks script access or an API fails, the script continues with sources that are readable.
