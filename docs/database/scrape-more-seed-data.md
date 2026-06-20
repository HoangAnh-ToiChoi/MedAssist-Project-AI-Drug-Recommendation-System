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
data/crawled/more/cleanup_previous_scrape.sql
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

These generated files use self-contained CTE statements and do not use temporary tables. They can be run as a whole file or one complete `WITH ...` block at a time in Supabase SQL Editor. RLS does not need to be enabled or disabled for this import.

1. Run the script.
2. If the old Wikipedia drug CSV was already imported, open `cleanup_previous_scrape.sql` and review the preview query/explicit drug-name list.
3. Run `cleanup_previous_scrape.sql` in Supabase SQL Editor to remove only unreferenced rows from that exact bad batch.
4. Open `data/crawled/more/scrape_import.sql`.
5. Paste it into Supabase SQL Editor and run it.

Use this SQL even if `drugs_scraped.csv` was already imported. It will:

- update existing symptoms by `code` instead of failing on duplicates such as `sot`;
- skip a new symptom when its ICD-10 code already belongs to another existing symptom;
- preserve the Vietnamese curated symptoms and ICD-10 codes;
- skip drugs whose names already exist, without requiring a unique index;
- resolve `symptom_code` and `drug_name` to UUIDs before inserting `drug_symptoms`;
- keep existing tables and rows; it does not drop or delete data.

The generated SQL uses `ON CONFLICT` for symptoms and mappings, so it is safe to run again when refreshing seed data.

`symptoms_scraped.csv` contains only newly scraped symptoms and excludes the original Vietnamese seed rows. Direct CSV import is still intended for a one-time import only; use `scrape_import.sql` for repeatable imports.

Symptoms use the curated Vietnamese seed plus EBI OLS. Drugs use openFDA active ingredients as the main source. Wikipedia drug categories are fallback-only because those categories also contain research compounds, drug classes, and non-product pages. DrugBank, DAV, and CTDbase are checked best-effort and recorded in `scrape_report.json`.
