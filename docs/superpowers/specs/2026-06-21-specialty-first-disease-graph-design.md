# Specialty-First Disease Graph Design

**Date:** 2026-06-21  
**Status:** Draft for review  
**Author:** Codex with user-approved brainstorming flow

---

## 1. Problem Statement

MedAssist currently stores symptoms and drugs as mostly flat catalogs and recommends drugs primarily through `drug_symptoms`. That structure is not strong enough for the next product goal:

- classify diseases by specialty/type as shown in the approved taxonomy mockup;
- scale to `1000+ diseases/conditions`;
- scale to `1000+ drugs/ingredients`;
- require the user to choose a specialty before any recommendation;
- change recommendation logic from `drug_symptoms`-first to `specialty -> disease -> symptom -> drug`;
- keep external public sources out of runtime and use them only for offline seed/sync jobs.

The current model can still be kept as compatibility data, but it is no longer sufficient as the primary reasoning graph.

---

## 2. Goals

- Introduce a disease-centric graph model organized by medical specialty.
- Support at least `1000+ diseases/conditions` sourced from `Clinical Tables conditions + ICD-10`.
- Support at least `1000+ drugs/ingredients` sourced from `RxTerms + RxNorm + openFDA`.
- Require specialty selection in the recommendation flow before symptom entry is evaluated.
- Return both disease candidates and drug recommendations so results are explainable.
- Keep runtime fully dependent on internal database data, not external APIs.
- Preserve enough backward compatibility to migrate incrementally from the current flat model.

## 3. Non-Goals

- Real-time querying of public medical APIs at user request time.
- Full clinical decision support or production-grade diagnosis.
- Automated ingestion of every possible specialty taxonomy from external sources.
- Automatic trust of DrugBank, DAV, or CTDbase as runtime sources.
- Removing `symptoms`, `drugs`, or `drug_symptoms` in this phase.

---

## 4. Approved Specialty Taxonomy

The application will use a fixed, curated specialty list based on the approved UI taxonomy. This list becomes the source of truth for `disease_types`.

- `tim_mach` — Tim mạch
- `da_lieu` — Da liễu
- `noi_tiet` — Nội tiết
- `tieu_hoa` — Tiêu hóa
- `huyet_hoc` — Huyết học
- `benh_truyen_nhiem` — Bệnh truyền nhiễm
- `than` — Thận
- `than_kinh` — Thần kinh
- `ung_buou` — Ung bướu
- `nhan_khoa` — Nhãn khoa
- `chinh_hinh` — Chỉnh hình
- `tai_mui_hong` — Tai Mũi Họng
- `tam_than` — Tâm thần
- `ho_hap` — Hô hấp
- `thap_khop` — Thấp khớp
- `tiet_nieu` — Tiết niệu
- `cap_cuu` — Cấp cứu
- `gia_dinh` — Gia đình
- `noi_khoa` — Nội khoa
- `nhi_khoa` — Nhi khoa
- `san_phu_khoa` — Sản Phụ khoa
- `chan_doan_hinh_anh` — Chẩn đoán hình ảnh
- `gay_me` — Gây mê
- `giai_phau_benh` — Giải phẫu bệnh

Not every specialty must be equally complete in the first seed, but all specialties must exist in the catalog and be selectable in the frontend.

---

## 5. Domain Model

### 5.1 New Primary Entities

This phase adds the following primary entities:

- `disease_types`
- `diseases`
- `disease_symptoms`
- `disease_drugs`

### 5.2 Existing Entities Kept

These existing tables remain in place:

- `symptoms`
- `drugs`
- `drug_symptoms`
- `patient_history`
- `allergies`
- `recommendations`

### 5.3 Entity Responsibilities

#### `disease_types`

Stores the fixed specialty taxonomy.

Suggested fields:

- `id`
- `code`
- `name`
- `display_order`
- `description`
- `created_at`

#### `diseases`

Stores normalized diseases/conditions.

Suggested fields:

- `id`
- `disease_type_id`
- `code`
- `canonical_name`
- `display_name`
- `icd10_code`
- `description`
- `synonyms_json`
- `source_primary`
- `source_provenance_json`
- `created_at`

#### `disease_symptoms`

Stores disease-to-symptom edges.

Suggested fields:

- `id`
- `disease_id`
- `symptom_id`
- `confidence_score`
- `evidence_note`
- `created_at`

#### `disease_drugs`

Stores disease-to-drug edges.

Suggested fields:

- `id`
- `disease_id`
- `drug_id`
- `confidence_score`
- `priority_rank`
- `evidence_note`
- `created_at`

### 5.4 Role of Existing `drug_symptoms`

`drug_symptoms` remains available for compatibility and fallback, but it is no longer the primary recommendation graph. The primary path becomes:

`specialty -> diseases -> symptoms -> drugs`

---

## 6. Data Source Strategy

### 6.1 Primary Structured Sources

#### Diseases

- `Clinical Tables medical conditions`
- `ICD-10-CM`

These sources provide the bulk of disease/condition records and ICD anchoring needed for specialty classification and searchability.

#### Drugs

- `RxTerms`
- `RxNorm`
- `openFDA`

These sources provide ingredient-level and prescribable drug coverage, with openFDA used primarily for enrichment and cross-source normalization.

### 6.2 Secondary Enrichment

- `openFDA label`
- `Wikipedia`

Usage rules:

- `openFDA label` is the first enrichment pass for indications, warnings, and contraindication text when available.
- `Wikipedia` is fallback-only for missing descriptions.

### 6.3 Provenance / Review-Only Sources

- `DrugBank`
- `DAV`
- `CTDbase`

These sources are not runtime dependencies. They are used only for:

- generated review links,
- provenance notes,
- manual curation workflows,
- optional future enrichment.

If public site automation is blocked or unstable, the seed pipeline must still succeed.

---

## 7. Data Ingestion Pipeline

### 7.1 Overview

The seed pipeline will move from a mostly symptom/drug scrape model to a structured graph ingestion model.

High-level flow:

1. Seed fixed `disease_types`
2. Fetch and normalize diseases
3. Classify diseases into specialties
4. Fetch and normalize drugs
5. Enrich drugs from label and fallback description sources
6. Build `disease_symptoms`
7. Build `disease_drugs`
8. Write review artifacts
9. Write SQL/import artifacts for safe database ingestion

### 7.2 Disease Normalization

Each disease record should be normalized into:

- canonical code
- canonical name
- display name
- ICD-10 code when available
- synonyms
- description
- disease type assignment
- source provenance

Deduplication rules should prioritize:

1. exact ICD-10 match
2. exact canonical name match
3. synonym overlap under the same ICD family

### 7.3 Specialty Classification

Disease classification into `disease_types` will use:

- ICD-10 chapter/range based rules
- keyword-based rules
- curated override mappings for ambiguous or cross-specialty conditions

Classification must be deterministic and reviewable. Each disease must have exactly one primary `disease_type_id` in this phase.

### 7.4 Drug Normalization

Each drug record should be normalized into:

- `name`
- `generic_name`
- ingredient-level identity
- optional brand names list
- dosage forms
- description
- contraindications
- provenance metadata

Deduplication rules should prioritize:

1. RxNorm or source ingredient identity when available
2. normalized generic name
3. normalized ingredient name

### 7.5 Mapping Generation

#### Disease to Symptom

Generate `disease_symptoms` from:

- disease descriptions,
- ICD-related metadata,
- curated keyword mapping rules,
- reviewed seed overrides.

#### Disease to Drug

Generate `disease_drugs` from:

- drug indications,
- drug class/category rules,
- disease-specialty constraints,
- curated overrides,
- safety filtering rules that avoid obvious unsafe or unrelated matches.

### 7.6 Artifacts

The new seed flow should generate review and import artifacts such as:

- `diseases_review.csv`
- `drugs_review.csv`
- `disease_symptoms_review.csv`
- `disease_drugs_review.csv`
- `scrape_report.json`
- enriched JSON artifacts for provenance inspection
- SQL import scripts safe for repeatable database loading

---

## 8. Backend Architecture Changes

### 8.1 Recommendation Engine Direction

Recommendation will move from a flat symptom-to-drug approach to a disease graph approach.

New reasoning path:

1. User selects `specialty`
2. Backend scopes all downstream matching to that specialty
3. Backend matches incoming symptoms
4. Backend computes top disease candidates
5. Backend computes top drug candidates from those diseases
6. Backend removes unsafe candidates by allergy/history/contraindication checks
7. Backend returns disease and drug explanations together

### 8.2 Request Requirements

`POST /ai/recommend` must require `specialty`.

If `specialty` is missing, the request is invalid.

### 8.3 Disease Candidate Scoring

Disease scoring should consider:

- number of matched symptoms
- weight from `disease_symptoms.confidence_score`
- exact match over fuzzy match
- optional tie-breakers such as disease specificity and specialty fit

### 8.4 Drug Candidate Scoring

Drug scoring should consider:

- parent disease scores
- edge weights from `disease_drugs.confidence_score`
- specialty consistency
- exclusions from allergies and patient history
- contraindication safety rules

### 8.5 Backward Compatibility

The route path can remain `POST /ai/recommend`, but the internal engine version should move to something like `disease-graph-v1`.

Existing `drug_symptoms` logic may remain as fallback-only during migration, but the primary path must be the disease graph.

---

## 9. Backend API Surface

### 9.1 New or Updated APIs

- `GET /specialties`
- `GET /specialties/:specialtyId/diseases`
- `GET /specialties/:specialtyId/symptoms`
- `GET /diseases/search`
- `GET /drugs/search`
- `POST /ai/recommend`

### 9.2 API Responsibilities

#### `GET /specialties`

Returns the fixed curated taxonomy for the frontend selector.

#### `GET /specialties/:specialtyId/diseases`

Returns diseases scoped to the selected specialty for browse/search support.

#### `GET /specialties/:specialtyId/symptoms`

Returns symptoms associated with the selected specialty so the frontend can guide the user toward relevant inputs.

#### `GET /diseases/search`

Supports keyword search against normalized disease records already stored in the internal database.

#### `GET /drugs/search`

Supports keyword search against normalized drug records already stored in the internal database.

#### `POST /ai/recommend`

Consumes specialty + symptoms + optional history/allergy context and returns scoped disease and drug recommendations.

### 9.3 Example Request

```json
{
  "specialty": "ho_hap",
  "symptoms": ["ho", "kho_tho", "dau_hong"],
  "patient_history": ["hen_suyen"],
  "allergies": ["amoxicillin"]
}
```

### 9.4 Example Response

```json
{
  "specialty": "ho_hap",
  "matched_symptoms": [
    { "code": "ho", "name": "Ho" }
  ],
  "top_diseases": [
    { "code": "viem_phe_quan_cap", "name": "Viêm phế quản cấp", "score": 0.87 }
  ],
  "recommended_drugs": [
    {
      "drug": "Salbutamol",
      "confidence": 0.81,
      "reason": "Phù hợp disease candidate viêm phế quản cấp"
    }
  ],
  "danger_alerts": [],
  "engine_version": "disease-graph-v1"
}
```

---

## 10. Frontend Behavior

### 10.1 UX Rules

The recommendation screen becomes specialty-first.

Required user journey:

1. User opens recommendation screen
2. User must choose a specialty first
3. Only after specialty selection does the app unlock symptom browsing/search
4. User submits symptoms within the chosen specialty context
5. Results display matched symptoms, top diseases, and recommended drugs

### 10.2 UI Expectations

The frontend should clearly communicate:

- the user is browsing within a specialty,
- symptom choices are scoped,
- disease suggestions are scoped,
- drug recommendations come from scoped disease reasoning rather than a global drug search.

### 10.3 Results Hierarchy

Results should be displayed in this order:

1. matched symptoms
2. disease candidates
3. recommended drugs
4. alerts or safety warnings

This hierarchy reinforces explainability.

---

## 11. Migration Strategy

### 11.1 Incremental Migration

This phase should not delete old structures. It should add the new disease graph beside the current model.

Add:

- `disease_types`
- `diseases`
- `disease_symptoms`
- `disease_drugs`

Keep:

- `symptoms`
- `drugs`
- `drug_symptoms`

### 11.2 Engine Rollout

Planned progression:

1. ship new schema
2. ship new seed/import pipeline
3. ship backend read path for specialty-scoped disease graph
4. ship frontend specialty-first flow
5. switch recommendation engine default to `disease-graph-v1`
6. keep old logic only as migration fallback while validating behavior

### 11.3 Runtime Rule

The application must never depend on external data sources during live user requests. All public-source data must be pulled into the local database first.

---

## 12. Testing Strategy

### 12.1 Data Quality Tests

The seed pipeline should verify:

- at least `1000+ diseases`
- at least `1000+ drugs`
- every disease has exactly one `disease_type`
- no serious duplicate canonical diseases
- no serious duplicate canonical drugs
- import artifacts are generated successfully

### 12.2 Backend Tests

Backend tests should verify:

- recommendation rejects requests without `specialty`
- only diseases within the selected specialty are considered
- only drugs within selected disease results are returned
- allergies exclude unsafe drugs
- contraindication filters are applied
- response contains `top_diseases` and `recommended_drugs`

### 12.3 Frontend Tests

Frontend tests should verify:

- recommendation submission is blocked before specialty selection
- specialty changes reload the symptom scope
- specialty taxonomy renders correctly
- results display in disease-first hierarchy

### 12.4 Integration Tests

Integration tests should verify end-to-end flow:

`specialty -> symptoms -> disease candidates -> drug recommendations`

### 12.5 Sync / Seed Tests

Offline seed tests should verify:

- seed jobs still complete if review-only sources are unavailable
- openFDA/Wikipedia enrichment is optional, not fatal
- generated review links/provenance artifacts remain usable

---

## 13. Risks and Constraints

### 13.1 Classification Ambiguity

Some diseases can belong to multiple specialties in real life. This phase resolves that by enforcing one primary specialty classification and handling ambiguous cases through curated overrides.

### 13.2 Public Data Quality

External public data is useful for seed generation but may be incomplete, noisy, blocked, or unstable. That is why runtime must not depend on it.

### 13.3 Clinical Safety

This system is still a student project recommendation flow, not a clinical diagnosis engine. The architecture should improve structure and explainability, but it does not remove the need for conservative safety filtering and warning language.

---

## 14. Success Criteria

This phase is successful when:

- the database supports the specialty-first disease graph;
- the seed pipeline loads `1000+ diseases` and `1000+ drugs`;
- the frontend requires specialty selection first;
- backend recommendation uses `specialty -> disease -> symptom -> drug`;
- results include disease candidates and explainable drug recommendations;
- runtime does not call public external medical sources.

---

## 15. Recommended Implementation Scope

This spec is intentionally broad, but still intended to produce one coherent implementation track:

1. schema and seed pipeline for disease graph data
2. backend APIs and recommendation engine update
3. frontend specialty-first flow
4. migration-safe rollout and validation

The work should be implemented incrementally, but all increments must align to the same disease-centric target architecture.
