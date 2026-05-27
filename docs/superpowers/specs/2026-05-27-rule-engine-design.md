# MedAssist AI — Rule-Based Drug Recommendation Engine Design

**Date:** 2026-05-27  
**Status:** Approved  
**Author:** AI-assisted brainstorm (Antigravity)

---

## 1. Mục tiêu

Xây dựng **Rule-Based Drug Recommendation Engine** cho MedAssist AI — một pipeline tuần tự chạy bên trong `ai-service` (FastAPI Python) nhận triệu chứng từ người dùng và trả về danh sách thuốc gợi ý có điểm tin cậy (confidence), kèm cảnh báo an toàn.

**Success criteria:**
- `POST /ai/recommend` trả response < 500ms
- Trả đúng top 3–5 thuốc có confidence cao nhất
- Lọc được dị ứng, cảnh báo triệu chứng nguy hiểm
- Có thể giải thích lý do recommend (explainability)

---

## 2. Kiến trúc Tổng quan

```
User Input (free-text hoặc symptom codes)
        │
        ▼
┌──────────────────────────────────────────────────┐
│  AI Service (FastAPI Python)                     │
│                                                  │
│  Stage 1: NLP Extractor                          │
│    - Nhận free-text → tìm symptom codes          │
│    - Fuzzy match keywords trong DB               │
│    - Hoặc nhận codes trực tiếp (structured)      │
│                                                  │
│  Stage 2: Rule Engine (Weighted Scoring)         │
│    - Query Supabase: drug_symptoms JOIN drugs    │
│    - Tính confidence = Σ(weight × match_bonus)   │
│    - Voting threshold: chỉ lấy match ≥ 1 symptom│
│                                                  │
│  Stage 3: Safety Filter                          │
│    - Loại thuốc trong allergy list               │
│    - Hạ weight thuốc conflict patient_history    │
│    - Gắn cờ is_danger → danger_alert text        │
│                                                  │
│  Stage 4: Ranker                                 │
│    - Sort by confidence DESC                     │
│    - Lấy top N (default 5, max 10)               │
│    - Format output JSON                          │
│                                                  │
└──────────────────────────────────────────────────┘
        │
        ▼
Backend Node.js (proxy + save to recommendations table)
        │
        ▼
Frontend (hiển thị DrugCard, DangerAlert)
```

---

## 3. Data Pipeline (cần hoàn thành trước)

### 3.1 Bảng `symptoms` (đã có 1,483 entries từ seeder)
Cần push từ `data/symptoms/symptoms.json` → Supabase `symptoms` table.

### 3.2 Bảng `drugs` (cần seed)
Seed từ openFDA drug labels + curated Vietnamese data.

**Schema target:**
```
code, name_vi, name_en, active_ingredient, drug_class, warnings[], contraindications[], is_active
```

**Nguồn:**
- openFDA `/drug/label.json` — tên thuốc, active ingredient, warnings
- Curated list: ~50 thuốc OTC phổ biến tại Việt Nam

### 3.3 Bảng `drug_symptoms` (cần seed)
Mapping triệu chứng ↔ thuốc với weight và is_primary.

**Nguồn:**
- Curated rules từ medical knowledge base
- Ví dụ: Paracetamol → {sốt: 0.95, đau đầu: 0.85, đau nhức: 0.80}

### 3.4 Script push lên Supabase
Script Python dùng `supabase-py` để upsert toàn bộ data lên Supabase.

---

## 4. Chi tiết từng Stage

### Stage 1: NLP Extractor (`services/nlp_extractor.py`)

**Input:** `text: str` hoặc `symptom_codes: list[str]`

**Logic:**
1. Nếu có `symptom_codes` → skip, dùng trực tiếp
2. Nếu có `text`:
   - Lowercase, remove punctuation
   - Query `symptoms` table: `WHERE keywords && ARRAY[token]` (GIN index)
   - Hoặc fuzzy match với rapidfuzz (Levenshtein distance ≤ 2)
   - Return danh sách `symptom_id` đã resolve

**Output:** `list[SymptomMatch]` = `{id, code, name_vi, name_en, is_danger}`

---

### Stage 2: Rule Engine (`services/rule_engine.py`)

**Input:** `list[SymptomMatch]`, Supabase client

**Logic:**
```python
# Với mỗi symptom_id đã resolve:
# Query drug_symptoms JOIN drugs
# SELECT d.*, ds.weight, ds.is_primary
# FROM drug_symptoms ds
# JOIN drugs d ON ds.drug_id = d.id
# WHERE ds.symptom_id = ANY($symptom_ids)
# AND d.is_active = true

# Tính confidence cho mỗi thuốc:
confidence = Σ(weight_i) / len(matched_symptoms)
# Bonus nếu is_primary:
confidence += 0.1 * count(is_primary=True)
confidence = min(confidence, 1.0)

# Voting threshold: thuốc chỉ vào kết quả nếu match ≥ 1 symptom
# (tự nhiên đảm bảo bởi query)
```

**Output:** `dict[drug_id, DrugScore]` = `{drug, confidence, matched_symptoms, reason}`

---

### Stage 3: Safety Filter (`services/safety_filter.py`)

**Input:** `dict[drug_id, DrugScore]`, `allergies: list[str]`, `patient_history: list[str]`

**Logic:**
1. **Allergy filter:** Nếu `drug.name_en.lower()` hoặc `drug.active_ingredient.lower()` in `allergies` → remove drug khỏi kết quả hoàn toàn
2. **Patient history:** Nếu `drug.contraindications` overlap với `patient_history` entries → hạ confidence xuống 0.1 (vẫn hiển thị nhưng rank thấp, kèm warning)
3. **Danger alert:** Nếu bất kỳ symptom nào `is_danger=True` → set `danger_alert` text, không recommend thuốc OTC

**Output:** `dict[drug_id, DrugScore]` đã được filter + `danger_alert: str | None`

---

### Stage 4: Ranker (`services/ranker.py`)

**Input:** `dict[drug_id, DrugScore]`, `limit: int = 5`

**Logic:**
```python
sorted_drugs = sorted(drug_scores.values(), key=lambda x: x.confidence, reverse=True)
top_n = sorted_drugs[:limit]
# Format reason: "Phù hợp với triệu chứng: sốt (0.95), đau đầu (0.85)"
```

**Output:** `RecommendationResult` — contract API

---

## 5. API Contract

### `POST /ai/recommend`

**Request body:**
```json
{
  "text": "tôi bị sốt và đau đầu",
  "symptom_codes": [],
  "allergies": ["penicillin"],
  "patient_history": ["tiểu đường"],
  "limit": 5,
  "min_confidence": 0.3
}
```

**Response (success):**
```json
{
  "success": true,
  "danger_alert": null,
  "recommendations": [
    {
      "drug_code": "paracetamol_500",
      "drug_name": "Paracetamol 500mg",
      "confidence": 0.90,
      "reason": "Phù hợp với triệu chứng: Sốt (0.95), Đau đầu (0.85)",
      "warnings": ["Không dùng quá 4g/ngày"],
      "is_primary_match": true
    }
  ],
  "filtered_out": [],
  "matched_symptoms": ["sot", "dau_dau"],
  "total": 3,
  "engine_version": "rule-based-v1",
  "processed_at": "2026-05-27T05:00:00Z"
}
```

**Response (danger):**
```json
{
  "success": true,
  "danger_alert": "⚠️ Phát hiện triệu chứng nguy hiểm: Khó thở nặng. Vui lòng đến cơ sở y tế ngay lập tức.",
  "recommendations": [],
  ...
}
```

---

## 6. File Structure

```
ai-service/
├── scripts/
│   ├── seed_symptoms.py          ✅ Done
│   ├── seed_drugs.py             [NEW] Seed drugs từ openFDA + curated
│   ├── seed_mappings.py          [NEW] Seed drug_symptoms mappings
│   └── push_to_supabase.py       [NEW] Push tất cả data lên Supabase
├── services/
│   ├── chatbot.py                ✅ Existing
│   ├── nlp_extractor.py          [NEW] Stage 1 — text → symptom codes
│   ├── rule_engine.py            [NEW] Stage 2 — scoring engine
│   ├── safety_filter.py          [NEW] Stage 3 — allergy/danger filter
│   └── ranker.py                 [NEW] Stage 4 — sort + format output
├── routers/
│   ├── chat.py                   ✅ Existing
│   └── recommend.py              [NEW] POST /ai/recommend endpoint
├── models/
│   └── schemas.py                [MODIFY] Thêm RecommendRequest, RecommendResponse
├── data/
│   ├── symptoms/symptoms.json    ✅ Done (1,483 entries)
│   ├── drugs/drugs.json          [NEW] ~100–200 drugs
│   └── mappings/drug_symptoms.json [NEW] drug↔symptom mappings
└── main.py                       [MODIFY] Register recommend router
```

---

## 7. Supabase Integration

**Connection:** `supabase-py` client, dùng `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` từ `.env`

**Queries chính:**
```sql
-- NLP Extractor: tìm symptoms theo keyword
SELECT id, code, name_vi, name_en, is_danger
FROM symptoms
WHERE keywords && $1::text[]   -- GIN index lookup

-- Rule Engine: lấy drugs match symptoms
SELECT d.id, d.code, d.name_vi, d.name_en, d.active_ingredient,
       d.drug_class, d.warnings, d.contraindications,
       ds.weight, ds.is_primary, ds.symptom_id
FROM drug_symptoms ds
JOIN drugs d ON ds.drug_id = d.id
WHERE ds.symptom_id = ANY($1::uuid[])
AND d.is_active = true
```

---

## 8. Các quyết định thiết kế quan trọng

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| Input method | Free-text + Structured codes | Linh hoạt cho cả chatbot và UI có sẵn |
| Scoring | Weighted sum + is_primary bonus | Phản ánh đúng độ phù hợp lâm sàng |
| Threshold | match ≥ 1 symptom | Tránh false positive, đủ đơn giản |
| Data source | Supabase PostgreSQL trực tiếp | Dữ liệu luôn mới nhất, không cần cache phức tạp |
| Architecture | AI service xử lý toàn bộ pipeline | Backend chỉ proxy, tách biệt concern |
| Output | Top 5 mặc định, configurable | Đủ thông tin, không overwhelm user |
| Danger handling | Alert + block OTC recommend | An toàn là ưu tiên số 1 |

---

## 9. Testing Plan

- Unit test cho từng stage (NLP, Engine, Filter, Ranker)
- Integration test: `POST /ai/recommend` với input chuẩn
- Edge cases: không tìm thấy triệu chứng, tất cả thuốc bị filter, triệu chứng nguy hiểm
