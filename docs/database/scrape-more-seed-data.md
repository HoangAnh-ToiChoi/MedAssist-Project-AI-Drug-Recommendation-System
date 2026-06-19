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
data/crawled/more/drug_symptoms_scraped.csv
data/crawled/more/scrape_import.sql
data/crawled/more/scrape_report.json
```

Supabase import flow:

1. Run the script.
2. Open `data/crawled/more/scrape_import.sql`.
3. Paste it into Supabase SQL Editor.
4. Run the SQL.

The generated SQL uses `ON CONFLICT`, so it is safe to run again when refreshing seed data.

Main data source is Wikipedia API because it is stable for scripts. DrugBank, DAV, CTDbase, and EBI are checked best-effort and recorded in `scrape_report.json`; if a site blocks script access or an API fails, the script continues with sources that are readable.
