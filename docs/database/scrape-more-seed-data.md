# Scrape More Seed Data

Script:

```bash
npm run scrape:more
```

Or run directly:

```bash
node scripts/scrape-more-medical-data.js --min-drugs=240 --min-symptoms=240 --min-mappings=500 --drug-enrich-limit=80
```

Default output:

```text
data/crawled/more/symptoms_scraped.csv
data/crawled/more/drugs_scraped.csv
data/crawled/more/drug_symptom_mappings_review.csv
data/crawled/more/drug_sources_review.csv
data/crawled/more/drugs_enriched.json
data/crawled/more/cleanup_previous_scrape.sql
data/crawled/more/scrape_import.sql
data/crawled/more/scrape_report.json
```

`--drug-enrich-limit` giới hạn số lượng drug record sẽ được gọi network enrichment trực tiếp trong mỗi lần chạy. Phần còn lại vẫn được sinh review links/provenance để curate thủ công mà không làm script chạy quá lâu.

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

Symptoms use the curated Vietnamese seed plus EBI OLS. Drugs use openFDA active ingredients as the main source. `openFDA label` is used as the first enrichment pass for indication/contraindication text when available. Wikipedia is still fallback for drug descriptions. DrugBank, DAV, and CTDbase are currently surfaced through generated lookup URLs in `drug_sources_review.csv` / `drugs_enriched.json` so the team can review and curate records even when those public sites throttle or block automated scraping.

## Next step for real drug data

- Bộ dữ liệu thuốc hiện tại mới phù hợp cho seed/demo và kiểm thử tích hợp, chưa đủ độ phủ để xem là production-ready.
- Drug data thật cần tiếp tục được fetch từ nhiều nguồn công khai rồi hợp nhất lại, không nên phụ thuộc vào một nguồn duy nhất.
- Hướng ưu tiên hiện tại là giữ `openFDA` làm nguồn cấu trúc chính khi match được hoạt chất hoặc sản phẩm, dùng `Wikipedia` làm fallback, rồi mở rộng thêm `DrugBank`, `DAV`, `CTDbase` và các nguồn công khai phù hợp với thị trường Việt Nam.
- Trước khi promote vào seed mặc định hoặc DB dùng thật, nên có pipeline chuẩn hóa field giữa các nguồn, gộp bản ghi trùng theo hoạt chất/brand name/synonym, gắn provenance theo từng field quan trọng và review thủ công các record có chống chỉ định, cảnh báo hoặc mapping triệu chứng chưa chắc chắn.

## Disease graph seed

Script:

```bash
npm run seed:disease-graph
```

Production-ready review run without synthetic padding:

```bash
node scripts/seed-disease-graph-data.js --strict --min-diseases=1000 --min-drugs=1000
```

Small verification run:

```bash
node scripts/seed-disease-graph-data.js --offline --min-diseases=5 --min-drugs=5 --output-dir=/tmp/medassist-disease-graph-check
```

Default output:

```text
data/crawled/disease-graph/disease_types.csv
data/crawled/disease-graph/diseases_review.csv
data/crawled/disease-graph/drugs_review.csv
data/crawled/disease-graph/disease_symptoms_review.csv
data/crawled/disease-graph/disease_drugs_review.csv
data/crawled/disease-graph/import.sql
data/crawled/disease-graph/scrape_report.json
```

`disease_types.csv` and `import.sql` seed the approved 24 specialty taxonomy. The disease, drug, disease-symptom, and disease-drug CSV files are review artifacts: curate them, resolve UUIDs against `disease_types`, `symptoms`, and `drugs`, then import only approved rows.

## Disease graph import guardrails

- `--strict` disables synthetic padding. If the requested minimum counts cannot be met from public-source rows plus local curated seeds, the script writes the report/artifacts and then exits non-zero.
- `--offline` disables all live API calls. This is intended for local smoke checks and CI guardrails, not for production-ready coverage runs.
- `source_primary=local_synthetic_review` means the row exists only to pad review coverage in non-strict mode. Do not promote these rows into production datasets.
- `scrape_report.json` is the canonical gate before import. Review:
  - `counts`: raw row totals for disease, drug, symptom, and mapping artifacts.
  - `source_coverage.diseases` / `source_coverage.drugs`: row counts by source, public-source totals, local curated seed totals, and synthetic totals.
  - `strict_status`: whether strict mode was enabled, whether minimums were met, and whether any synthetic padding slipped in.
  - `warnings`: source outages, offline skips, below-threshold counts, or synthetic padding notices.

## Recommended disease graph import flow

1. Run a production-intent pass with `--strict` when you want production-ready review artifacts.
2. Open `scrape_report.json` first and confirm:
   - `strict_status.passed` is `true`;
   - `source_coverage.diseases.synthetic_rows` is `0`;
   - `source_coverage.drugs.synthetic_rows` is `0`;
   - warnings do not indicate unacceptable source gaps.
3. Review `diseases_review.csv` and `drugs_review.csv`, especially rows sourced from public APIs, for duplicates and clinical quality.
4. Resolve reviewed disease rows against `disease_types`, then resolve drug rows against `drugs`.
5. Import only curated rows and only after UUID resolution for `disease_symptoms` / `disease_drugs`.

The script makes best-effort seed/sync calls to public sources such as Clinical Tables, RxTerms, RxNorm, and openFDA when network access is allowed. These public APIs must not be used as runtime dependencies for user-facing medical recommendations.
