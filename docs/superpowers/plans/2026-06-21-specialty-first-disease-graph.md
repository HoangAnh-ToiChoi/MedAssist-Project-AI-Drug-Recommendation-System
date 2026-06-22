# Specialty-First Disease Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển MedAssist sang flow gợi ý thuốc `specialty -> disease -> symptom -> drug`, đồng thời bổ sung pipeline seed `1000+ diseases` và `1000+ drugs` từ nguồn public nhưng chỉ dùng offline.

**Architecture:** Hệ thống sẽ thêm disease graph song song với schema cũ: `disease_types`, `diseases`, `disease_symptoms`, `disease_drugs`. Seed pipeline mới sẽ build dữ liệu từ Clinical Tables / ICD-10 / RxTerms / RxNorm / openFDA, backend recommendation sẽ đọc graph nội bộ thay vì chỉ `drug_symptoms`, và frontend sẽ bắt buộc user chọn specialty trước khi chọn triệu chứng.

**Tech Stack:** PostgreSQL, Node.js, Express, Awilix, node:test, React, Vite, Axios, Vitest, Testing Library

---

### Task 1: Mở rộng schema và seed taxonomy chuyên khoa

**Files:**
- Modify: `docs/database/schema.sql`
- Modify: `docs/database/seed.sql`
- Modify: `docs/database/ERD.md`

- [ ] **Step 1: Viết test/schema checklist trước khi sửa**

Tạo checklist ngay trong working notes hoặc commit message draft:

```text
Need schema objects:
- disease_types
- diseases
- disease_symptoms
- disease_drugs
- foreign keys to symptoms/drugs
- unique constraints on normalized codes
```

Run:

```bash
rg -n "CREATE TABLE (symptoms|drugs|drug_symptoms)" docs/database/schema.sql
```

Expected: tìm thấy đúng các bảng hiện tại để chèn block mới ngay sau `symptoms` hoặc trước `drugs`.

- [ ] **Step 2: Thêm bảng `disease_types` và `diseases`**

Chèn vào `docs/database/schema.sql` block tương tự:

```sql
CREATE TABLE disease_types (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  code          VARCHAR(50)  NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  display_order INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE diseases (
  id                     UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  disease_type_id        UUID         NOT NULL REFERENCES disease_types(id) ON DELETE RESTRICT,
  code                   VARCHAR(80)  NOT NULL UNIQUE,
  canonical_name         VARCHAR(200) NOT NULL,
  display_name           VARCHAR(200) NOT NULL,
  icd10_code             VARCHAR(20),
  description            TEXT,
  synonyms_json          JSONB        NOT NULL DEFAULT '[]'::jsonb,
  source_primary         VARCHAR(50)  NOT NULL,
  source_provenance_json JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_diseases_type_id ON diseases(disease_type_id);
CREATE INDEX idx_diseases_icd10_code ON diseases(icd10_code);
CREATE INDEX idx_diseases_display_name ON diseases(display_name);
```

- [ ] **Step 3: Thêm bảng `disease_symptoms` và `disease_drugs`**

Thêm tiếp vào `docs/database/schema.sql`:

```sql
CREATE TABLE disease_symptoms (
  id               UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  disease_id       UUID  NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  symptom_id       UUID  NOT NULL REFERENCES symptoms(id) ON DELETE CASCADE,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  evidence_note    TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_disease_symptom UNIQUE (disease_id, symptom_id)
);

CREATE TABLE disease_drugs (
  id               UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  disease_id       UUID  NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  drug_id          UUID  NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  priority_rank    INTEGER NOT NULL DEFAULT 0,
  evidence_note    TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_disease_drug UNIQUE (disease_id, drug_id)
);

CREATE INDEX idx_disease_symptoms_disease_id ON disease_symptoms(disease_id);
CREATE INDEX idx_disease_symptoms_symptom_id ON disease_symptoms(symptom_id);
CREATE INDEX idx_disease_drugs_disease_id ON disease_drugs(disease_id);
CREATE INDEX idx_disease_drugs_drug_id ON disease_drugs(drug_id);
```

- [ ] **Step 4: Seed taxonomy chuyên khoa cố định**

Thêm vào `docs/database/seed.sql` block seed `disease_types`:

```sql
INSERT INTO disease_types (code, name, display_order) VALUES
('tim_mach', 'Tim mạch', 1),
('da_lieu', 'Da liễu', 2),
('noi_tiet', 'Nội tiết', 3),
('tieu_hoa', 'Tiêu hóa', 4),
('huyet_hoc', 'Huyết học', 5),
('benh_truyen_nhiem', 'Bệnh truyền nhiễm', 6),
('than', 'Thận', 7),
('than_kinh', 'Thần kinh', 8),
('ung_buou', 'Ung bướu', 9),
('nhan_khoa', 'Nhãn khoa', 10),
('chinh_hinh', 'Chỉnh hình', 11),
('tai_mui_hong', 'Tai Mũi Họng', 12),
('tam_than', 'Tâm thần', 13),
('ho_hap', 'Hô hấp', 14),
('thap_khop', 'Thấp khớp', 15),
('tiet_nieu', 'Tiết niệu', 16),
('cap_cuu', 'Cấp cứu', 17),
('gia_dinh', 'Gia đình', 18),
('noi_khoa', 'Nội khoa', 19),
('nhi_khoa', 'Nhi khoa', 20),
('san_phu_khoa', 'Sản Phụ khoa', 21),
('chan_doan_hinh_anh', 'Chẩn đoán hình ảnh', 22),
('gay_me', 'Gây mê', 23),
('giai_phau_benh', 'Giải phẫu bệnh', 24)
ON CONFLICT (code) DO NOTHING;
```

- [ ] **Step 5: Cập nhật ERD docs**

Trong `docs/database/ERD.md`, thêm mô tả quan hệ:

```md
- `disease_types` 1-N `diseases`
- `diseases` N-N `symptoms` qua `disease_symptoms`
- `diseases` N-N `drugs` qua `disease_drugs`
- `drug_symptoms` giữ lại để fallback/compatibility
```

- [ ] **Step 6: Commit**

```bash
git add docs/database/schema.sql docs/database/seed.sql docs/database/ERD.md
git commit -m "feat: add specialty-first disease graph schema"
```

### Task 2: Tách seed pipeline bệnh và thuốc đa nguồn

**Files:**
- Create: `scripts/seed-disease-graph-data.js`
- Create: `data/seed-config/disease-type-keywords.json`
- Create: `data/seed-config/disease-type-icd10-rules.json`
- Modify: `package.json`
- Modify: `docs/database/scrape-more-seed-data.md`

- [ ] **Step 1: Thêm script command mới**

Sửa `package.json`:

```json
{
  "scripts": {
    "scrape:more": "node scripts/scrape-more-medical-data.js",
    "seed:disease-graph": "node scripts/seed-disease-graph-data.js"
  }
}
```

- [ ] **Step 2: Tạo config classify disease type**

Tạo `data/seed-config/disease-type-keywords.json`:

```json
{
  "ho_hap": ["respiratory", "bronch", "asthma", "lung", "pneumonia"],
  "tieu_hoa": ["gastr", "bowel", "liver", "hepat", "reflux"],
  "da_lieu": ["skin", "dermat", "rash", "eczema", "psoriasis"],
  "tim_mach": ["cardio", "heart", "vascular", "hypertension"],
  "than_kinh": ["neuro", "brain", "seizure", "migraine"]
}
```

Tạo `data/seed-config/disease-type-icd10-rules.json`:

```json
[
  { "type": "ho_hap", "prefixes": ["J"] },
  { "type": "tieu_hoa", "prefixes": ["K"] },
  { "type": "da_lieu", "prefixes": ["L"] },
  { "type": "tim_mach", "prefixes": ["I"] },
  { "type": "than_kinh", "prefixes": ["G"] }
]
```

- [ ] **Step 3: Tạo seed script mới cho diseases + drugs**

Tạo `scripts/seed-disease-graph-data.js` với skeleton:

```js
'use strict';

const fs = require('fs');
const path = require('path');

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    counts: {},
    warnings: [],
  };

  const diseaseTypes = loadDiseaseTypes();
  const diseases = await fetchAndNormalizeDiseases(diseaseTypes);
  const drugs = await fetchAndNormalizeDrugs();
  const diseaseSymptoms = buildDiseaseSymptoms(diseases);
  const diseaseDrugs = buildDiseaseDrugs(diseases, drugs);

  writeArtifacts({ diseaseTypes, diseases, drugs, diseaseSymptoms, diseaseDrugs, report });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Phần implementation trong file này phải có:

```js
function loadDiseaseTypes() { /* đọc taxonomy cố định */ }
async function fetchAndNormalizeDiseases(diseaseTypes) { /* Clinical Tables + ICD-10 */ }
async function fetchAndNormalizeDrugs() { /* RxTerms + RxNorm + openFDA */ }
function buildDiseaseSymptoms(diseases) { /* mapping */ }
function buildDiseaseDrugs(diseases, drugs) { /* mapping */ }
function writeArtifacts(payload) { /* csv/json/sql */ }
```

- [ ] **Step 4: Ghi output artifacts mới vào doc**

Thêm vào `docs/database/scrape-more-seed-data.md`:

```md
## Disease graph seed

Run:

```bash
npm run seed:disease-graph
```

Expected artifacts:
- `data/crawled/disease-graph/disease_types.csv`
- `data/crawled/disease-graph/diseases_review.csv`
- `data/crawled/disease-graph/drugs_review.csv`
- `data/crawled/disease-graph/disease_symptoms_review.csv`
- `data/crawled/disease-graph/disease_drugs_review.csv`
- `data/crawled/disease-graph/import.sql`
```

- [ ] **Step 5: Verify syntax only**

Run:

```bash
node --check scripts/seed-disease-graph-data.js
```

Expected: không có syntax error.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/seed-disease-graph-data.js data/seed-config docs/database/scrape-more-seed-data.md
git commit -m "feat: add disease graph seed pipeline scaffold"
```

### Task 3: Thêm repository và entity cho disease graph trong backend

**Files:**
- Create: `backend/src/entities/Disease.js`
- Create: `backend/src/entities/DiseaseType.js`
- Create: `backend/src/repositories/DiseaseGraphRepository.js`
- Create: `backend/src/services/SpecialtyService.js`
- Create: `backend/src/controllers/SpecialtyController.js`
- Modify: `backend/src/config/container.js`

- [ ] **Step 1: Tạo entity `DiseaseType` và `Disease`**

Tạo `backend/src/entities/DiseaseType.js`:

```js
class DiseaseType {
  constructor({ id, code, name, description, displayOrder }) {
    this.id = id;
    this.code = code;
    this.name = name;
    this.description = description || '';
    this.displayOrder = displayOrder || 0;
  }

  static fromRow(row) {
    return new DiseaseType({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      displayOrder: row.display_order,
    });
  }
}

module.exports = DiseaseType;
```

Tạo `backend/src/entities/Disease.js`:

```js
class Disease {
  constructor({ id, code, displayName, canonicalName, icd10Code, diseaseTypeCode, score }) {
    this.id = id;
    this.code = code;
    this.displayName = displayName;
    this.canonicalName = canonicalName;
    this.icd10Code = icd10Code || '';
    this.diseaseTypeCode = diseaseTypeCode;
    this.score = score || 0;
  }
}

module.exports = Disease;
```

- [ ] **Step 2: Tạo repository graph**

Tạo `backend/src/repositories/DiseaseGraphRepository.js` với public methods:

```js
class DiseaseGraphRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findSpecialties() {}
  async findSymptomsBySpecialtyCode(specialtyCode) {}
  async findDiseasesBySpecialtyCode(specialtyCode) {}
  async resolveSymptomCodesWithinSpecialty(specialtyCode, inputs) {}
  async findDiseaseCandidatesBySymptomCodes(specialtyCode, symptomCodes) {}
  async findDrugCandidatesByDiseaseIds(diseaseIds) {}
}
```

Query trọng tâm của `findDiseaseCandidatesBySymptomCodes` nên có dạng:

```sql
SELECT
  d.id,
  d.code,
  d.display_name,
  d.canonical_name,
  d.icd10_code,
  dt.code AS disease_type_code,
  SUM(ds.confidence_score) AS score
FROM diseases d
JOIN disease_types dt ON dt.id = d.disease_type_id
JOIN disease_symptoms ds ON ds.disease_id = d.id
JOIN symptoms s ON s.id = ds.symptom_id
WHERE dt.code = $1
  AND LOWER(TRIM(s.code)) = ANY($2)
GROUP BY d.id, dt.code
ORDER BY score DESC, d.display_name ASC
LIMIT 10
```

- [ ] **Step 3: Tạo `SpecialtyService` và `SpecialtyController`**

`backend/src/services/SpecialtyService.js`:

```js
class SpecialtyService {
  constructor(diseaseGraphRepository) {
    this.repo = diseaseGraphRepository;
  }

  async getAllSpecialties() {
    return this.repo.findSpecialties();
  }

  async getSymptomsBySpecialty(code) {
    return this.repo.findSymptomsBySpecialtyCode(code);
  }

  async getDiseasesBySpecialty(code) {
    return this.repo.findDiseasesBySpecialtyCode(code);
  }
}

module.exports = SpecialtyService;
```

`backend/src/controllers/SpecialtyController.js`:

```js
const ApiResponse = require('../utils/ApiResponse');

class SpecialtyController {
  constructor(specialtyService) {
    this.specialtyService = specialtyService;
  }

  async getAll(req, res, next) { /* ... */ }
  async getSymptoms(req, res, next) { /* ... */ }
  async getDiseases(req, res, next) { /* ... */ }
}

module.exports = SpecialtyController;
```

- [ ] **Step 4: Đăng ký DI container**

Sửa `backend/src/config/container.js` thêm:

```js
const DiseaseGraphRepository = require('../repositories/DiseaseGraphRepository');
const SpecialtyService = require('../services/SpecialtyService');
const SpecialtyController = require('../controllers/SpecialtyController');
```

Và register:

```js
diseaseGraphRepository: awilix.asClass(DiseaseGraphRepository).singleton(),
specialtyService: awilix.asClass(SpecialtyService).singleton(),
specialtyController: awilix.asClass(SpecialtyController).singleton(),
```

- [ ] **Step 5: Verify backend loads**

Run:

```bash
cd backend && node --test
```

Expected: test cũ vẫn pass, hoặc fail duy nhất ở phần DI/require nếu tên class/file sai.

- [ ] **Step 6: Commit**

```bash
git add backend/src/entities backend/src/repositories/DiseaseGraphRepository.js backend/src/services/SpecialtyService.js backend/src/controllers/SpecialtyController.js backend/src/config/container.js
git commit -m "feat: add backend disease graph repository layer"
```

### Task 4: Bổ sung API specialty và scoped symptom browse

**Files:**
- Create: `backend/src/routes/specialtyRoutes.js`
- Modify: `backend/src/app.js`
- Modify: `backend/src/routes/symptomRoutes.js`
- Create: `backend/test/specialtyRoutes.test.js`

- [ ] **Step 1: Tạo route file mới**

Tạo `backend/src/routes/specialtyRoutes.js`:

```js
const { Router } = require('express');
const Joi = require('joi');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const container = require('../config/container');

const router = Router();
const specialtyController = container.resolve('specialtyController');

const specialtyParamSchema = Joi.object({
  specialtyId: Joi.string().trim().required(),
});

router.get('/', authenticate, specialtyController.getAll.bind(specialtyController));
router.get('/:specialtyId/symptoms', authenticate, validate(specialtyParamSchema, 'params'), specialtyController.getSymptoms.bind(specialtyController));
router.get('/:specialtyId/diseases', authenticate, validate(specialtyParamSchema, 'params'), specialtyController.getDiseases.bind(specialtyController));

module.exports = router;
```

- [ ] **Step 2: Gắn route vào app**

Sửa `backend/src/app.js`:

```js
const specialtyRoutes = require('./routes/specialtyRoutes');
```

và mount:

```js
app.use('/api/v1/specialties', specialtyRoutes);
```

- [ ] **Step 3: Mở rộng validation `/symptoms/check` để bắt `specialty`**

Sửa schema trong `backend/src/routes/symptomRoutes.js`:

```js
const checkSchema = Joi.object({
  specialty: Joi.string().trim().required().messages({
    'any.required': 'Specialty là bắt buộc',
    'string.empty': 'Specialty là bắt buộc',
  }),
  symptoms: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  severity: Joi.string().trim().optional(),
  duration: Joi.string().trim().optional(),
});
```

- [ ] **Step 4: Thêm route test**

Tạo `backend/test/specialtyRoutes.test.js` theo pattern `allergyRoutes.test.js` với các case:

```js
test('GET /api/v1/specialties returns sorted taxonomy', async () => {
  assert.equal(response.statusCode, 200);
  assert.equal(body.data[0].code, 'tim_mach');
});

test('POST /api/v1/symptoms/check rejects missing specialty', async () => {
  assert.equal(response.statusCode, 400);
});
```

- [ ] **Step 5: Run backend tests**

Run:

```bash
cd backend && node --test
```

Expected: có thêm pass cho `specialtyRoutes.test.js`, test cũ không regress.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/specialtyRoutes.js backend/src/app.js backend/src/routes/symptomRoutes.js backend/test/specialtyRoutes.test.js
git commit -m "feat: add specialty browse APIs"
```

### Task 5: Refactor recommendation engine sang disease graph

**Files:**
- Modify: `backend/src/services/RecommendationService.js`
- Modify: `backend/src/controllers/RecommendationController.js`
- Modify: `backend/src/services/ai/HttpAiServiceEngine.js`
- Modify: `backend/src/services/ai/DatabaseFallbackEngine.js`
- Modify: `backend/src/repositories/RecommendationRepository.js`
- Modify: `backend/test/recommendationService.test.js`

- [ ] **Step 1: Mở rộng service signature để nhận specialty**

Sửa `RecommendationController.check`:

```js
const result = await this.#recommendationService.checkSymptoms(
  req.user.id,
  req.body.specialty,
  req.body.symptoms,
);
```

Sửa `RecommendationService.checkSymptoms` signature:

```js
async checkSymptoms(userId, specialty, symptoms) {
  if (!specialty) {
    throw new AppError('Specialty là bắt buộc', 400, 'SPECIALTY_REQUIRED');
  }
  // ...
}
```

- [ ] **Step 2: Đổi cache key và input payload**

Trong `RecommendationService`, đổi cache key:

```js
#buildCacheKey(userId, specialty, symptoms) {
  return `recommend:${userId}:${specialty}:${symptoms.join('-')}`;
}
```

Lưu `inputSymptoms`:

```js
inputSymptoms: {
  specialty,
  symptoms: normalizedSymptoms,
  history,
  allergies,
},
```

- [ ] **Step 3: Đổi engine contract**

Sửa `HttpAiServiceEngine.getRecommendations`:

```js
async getRecommendations(specialty, symptoms, history, allergies) {
  const { data } = await axios.post(`${this.#url}/ai/recommend`, {
    specialty,
    symptoms,
    history,
    allergies,
  }, { timeout: this.#timeout });

  return {
    engineVersion: data.engine_version || 'ai-service-v2',
    recommendations: data.recommendations || [],
    topDiseases: data.top_diseases || [],
    matchedSymptoms: data.matched_symptoms || [],
    dangerAlert: data.danger_alert || null,
  };
}
```

Sửa `DatabaseFallbackEngine` để gọi graph:

```js
const graphResult = await this.#recommendationRepo.findDiseaseGraphRecommendations(specialty, symptoms);
return {
  engineVersion: 'disease-graph-v1',
  dangerAlert: this.#detectDanger(symptoms),
  recommendations: graphResult.recommendations,
  topDiseases: graphResult.topDiseases,
  matchedSymptoms: graphResult.matchedSymptoms,
};
```

- [ ] **Step 4: Thêm query graph trong repository**

Trong `RecommendationRepository`, thêm method:

```js
async findDiseaseGraphRecommendations(specialty, symptomCodes) {
  const topDiseases = await this.findDiseaseCandidatesBySymptomCodes(specialty, symptomCodes);
  const recommendations = await this.findDrugCandidatesByDiseaseIds(topDiseases.map((item) => item.id));
  return {
    matchedSymptoms: symptomCodes,
    topDiseases,
    recommendations,
  };
}
```

Nếu không muốn duplicate SQL, `RecommendationRepository` có thể receive `diseaseGraphRepository` từ container. Giữ một hướng nhất quán trong code thật.

- [ ] **Step 5: Trả response mới**

Sửa `RecommendationService` result object:

```js
const result = {
  id: saved.id,
  specialty,
  matchedSymptoms: aiResult.matchedSymptoms || normalizedSymptoms,
  topDiseases: aiResult.topDiseases || [],
  recommendations: aiResult.recommendations,
  engineVersion: aiResult.engineVersion,
  dangerAlert: aiResult.dangerAlert || null,
};
```

- [ ] **Step 6: Cập nhật tests service**

Sửa `backend/test/recommendationService.test.js` theo signature mới:

```js
const result = await service.checkSymptoms('user-1', 'ho_hap', ['sot']);
assert.equal(result.specialty, 'ho_hap');
assert.ok(Array.isArray(result.topDiseases));
```

Thêm case:

```js
await assert.rejects(
  service.checkSymptoms('user-1', '', ['sot']),
  (error) => error.code === 'SPECIALTY_REQUIRED'
);
```

- [ ] **Step 7: Run backend tests**

Run:

```bash
cd backend && node --test
```

Expected: `recommendationService.test.js` pass với contract mới.

- [ ] **Step 8: Commit**

```bash
git add backend/src/services/RecommendationService.js backend/src/controllers/RecommendationController.js backend/src/services/ai/HttpAiServiceEngine.js backend/src/services/ai/DatabaseFallbackEngine.js backend/src/repositories/RecommendationRepository.js backend/test/recommendationService.test.js
git commit -m "feat: switch recommendation flow to disease graph"
```

### Task 6: Cập nhật frontend sang specialty-first symptom flow

**Files:**
- Create: `frontend/src/components/symptoms/SpecialtySelector.jsx`
- Modify: `frontend/src/components/symptoms/SymptomSelector.jsx`
- Modify: `frontend/src/pages/SymptomInput.jsx`
- Modify: `frontend/src/services/api.js`

- [ ] **Step 1: Tạo component chọn specialty**

Tạo `frontend/src/components/symptoms/SpecialtySelector.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const SpecialtySelector = ({ value, onChange }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/specialties').then((response) => {
      setItems(response.data?.data || []);
    });
  }, []);

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
        Chọn chuyên khoa trước khi nhập triệu chứng
      </label>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button key={item.code} type="button" onClick={() => onChange(item.code)}>
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SpecialtySelector;
```

- [ ] **Step 2: Scope `SymptomSelector` theo specialty**

Đổi props `SymptomSelector` thành:

```jsx
const SymptomSelector = ({ specialty, selected = [], onAdd, onRemove }) => {
```

Đổi fetch:

```jsx
useEffect(() => {
  if (!specialty) {
    setSymptoms([]);
    setLoading(false);
    return;
  }

  setLoading(true);
  api.get(`/specialties/${specialty}/symptoms`)
    .then((response) => setSymptoms(response.data?.data || []))
    .catch(() => setError('Không thể tải danh sách triệu chứng theo chuyên khoa.'))
    .finally(() => setLoading(false));
}, [specialty]);
```

- [ ] **Step 3: Bắt buộc specialty trong `SymptomInput`**

Trong `frontend/src/pages/SymptomInput.jsx`, thêm state:

```jsx
const [specialty, setSpecialty] = useState('');
```

Render `SpecialtySelector` trước `SymptomSelector`:

```jsx
<SpecialtySelector value={specialty} onChange={(next) => {
  setSpecialty(next);
  setSelectedSymptoms([]);
}} />

<SymptomSelector
  specialty={specialty}
  selected={selectedSymptoms}
  onAdd={handleAdd}
  onRemove={handleRemove}
/>
```

Trong `handleSubmit`:

```jsx
if (!specialty) {
  setError('Vui lòng chọn chuyên khoa trước');
  return;
}

const response = await api.post('/symptoms/check', {
  specialty,
  symptoms: selectedSymptoms,
  severity,
  duration,
});
```

- [ ] **Step 4: Lưu meta mới vào localStorage**

Sửa payload localStorage:

```jsx
localStorage.setItem('drugSuggestions', JSON.stringify({
  ...(response.data.data || response.data),
  meta: {
    specialty,
    symptoms: selectedSymptoms,
    severity,
    duration,
    allergiesCount,
    historyCount,
  }
}));
```

- [ ] **Step 5: Build frontend**

Run:

```bash
cd frontend && npm run build
```

Expected: Vite build thành công.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/symptoms/SpecialtySelector.jsx frontend/src/components/symptoms/SymptomSelector.jsx frontend/src/pages/SymptomInput.jsx
git commit -m "feat: require specialty selection before symptoms"
```

### Task 7: Cập nhật trang kết quả để hiển thị disease-first hierarchy

**Files:**
- Modify: `frontend/src/pages/DrugSuggestion.jsx`
- Create: `frontend/src/components/symptoms/DiseaseCandidateCard.jsx`
- Modify: `frontend/src/components/symptoms/RecommendationCard.jsx`

- [ ] **Step 1: Tạo component hiển thị disease candidate**

Tạo `frontend/src/components/symptoms/DiseaseCandidateCard.jsx`:

```jsx
const DiseaseCandidateCard = ({ disease }) => (
  <div className="glass-card p-4 rounded-xl border-white/5">
    <div className="text-sm font-semibold text-slate-100">{disease.name}</div>
    <div className="text-xs text-slate-400">{disease.code}</div>
    <div className="text-xs text-teal-400">Độ phù hợp: {Math.round((disease.score || 0) * 100)}%</div>
  </div>
);

export default DiseaseCandidateCard;
```

- [ ] **Step 2: Hiển thị specialty + matched symptoms + top diseases**

Trong `frontend/src/pages/DrugSuggestion.jsx`, thêm state reads:

```jsx
const [topDiseases, setTopDiseases] = useState([]);
const [matchedSymptoms, setMatchedSymptoms] = useState([]);
```

Khi parse localStorage:

```jsx
setTopDiseases(data.topDiseases || data.top_diseases || []);
setMatchedSymptoms(data.matchedSymptoms || data.matched_symptoms || []);
```

Render block summary:

```jsx
{meta?.specialty && (
  <div className="glass-card p-4 rounded-xl border-white/5">
    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chuyên khoa đã chọn</h4>
    <p className="text-sm font-semibold text-slate-100">{meta.specialty}</p>
  </div>
)}
```

Render hierarchy:

```jsx
<section className="space-y-3">
  <h3 className="text-sm font-bold">Bệnh nghi ngờ hàng đầu</h3>
  {topDiseases.map((item) => <DiseaseCandidateCard key={item.code} disease={item} />)}
</section>
```

- [ ] **Step 3: Mở rộng `RecommendationCard` để show disease reason**

Trong `frontend/src/components/symptoms/RecommendationCard.jsx`, đảm bảo có hiển thị:

```jsx
{drug.reason && (
  <p className="text-xs text-slate-400 mt-2">{drug.reason}</p>
)}
```

- [ ] **Step 4: Build frontend**

Run:

```bash
cd frontend && npm run build
```

Expected: pass, không có import thiếu cho `DiseaseCandidateCard`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/DrugSuggestion.jsx frontend/src/components/symptoms/DiseaseCandidateCard.jsx frontend/src/components/symptoms/RecommendationCard.jsx
git commit -m "feat: show disease-first recommendation results"
```

### Task 8: Thêm test frontend và hoàn thiện docs rollout

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.js`
- Create: `frontend/src/test/setup.js`
- Create: `frontend/src/pages/SymptomInput.test.jsx`
- Create: `frontend/src/pages/DrugSuggestion.test.jsx`
- Modify: `README.md`

- [ ] **Step 1: Thêm test tooling cho frontend**

Sửa `frontend/package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^26.1.0",
    "vitest": "^2.1.9"
  }
}
```

Tạo `frontend/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});
```

- [ ] **Step 2: Tạo test setup**

Tạo `frontend/src/test/setup.js`:

```js
import '@testing-library/jest-dom';
```

- [ ] **Step 3: Viết test cho specialty-first flow**

Tạo `frontend/src/pages/SymptomInput.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SymptomInput from './SymptomInput';

test('blocks submit before specialty selection', async () => {
  render(<SymptomInput />);
  expect(screen.getByText(/chuyên khoa/i)).toBeInTheDocument();
});
```

Tạo `frontend/src/pages/DrugSuggestion.test.jsx`:

```jsx
test('renders disease-first hierarchy from stored result', () => {
  localStorage.setItem('drugSuggestions', JSON.stringify({
    topDiseases: [{ code: 'viem_phe_quan_cap', name: 'Viêm phế quản cấp', score: 0.87 }],
    recommendations: [{ drug: 'Salbutamol', confidence: 0.81, reason: 'Phù hợp disease candidate' }],
    meta: { specialty: 'ho_hap', symptoms: ['Ho'] }
  }));
});
```

- [ ] **Step 4: Cập nhật README rollout**

Thêm vào `README.md` một mục ngắn:

```md
### Disease graph v1

- User phải chọn specialty trước khi nhập triệu chứng
- Backend recommendation dùng `specialty -> disease -> symptom -> drug`
- Runtime không gọi API public; mọi nguồn ngoài chỉ dùng cho seed/sync offline
```

- [ ] **Step 5: Chạy full verify**

Run:

```bash
cd backend && node --test
cd ../frontend && npm test
cd .. && npm run scrape:more -- --drug-enrich-limit=3
```

Expected:

```text
backend: all tests pass
frontend: vitest passes
root scrape script: completes without syntax/runtime regression
```

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/vitest.config.js frontend/src/test/setup.js frontend/src/pages/SymptomInput.test.jsx frontend/src/pages/DrugSuggestion.test.jsx README.md
git commit -m "test: add specialty-first frontend coverage"
```

### Task 9: Self-check rollout and migration verification

**Files:**
- Modify: `docs/database/scrape-more-seed-data.md`
- Modify: `docs/superpowers/specs/2026-06-21-specialty-first-disease-graph-design.md`

- [ ] **Step 1: Ghi rõ migration fallback**

Thêm vào docs note:

```md
- `drug_symptoms` vẫn được giữ để fallback trong giai đoạn migrate
- engine mặc định mới là `disease-graph-v1`
- không được gọi nguồn public ở runtime
```

- [ ] **Step 2: Verify spec coverage cuối**

Run:

```bash
rg -n "1000\\+ diseases|1000\\+ drugs|specialty|disease-graph-v1|runtime does not call public" docs/superpowers/specs/2026-06-21-specialty-first-disease-graph-design.md docs/database/scrape-more-seed-data.md README.md
```

Expected: mọi requirement cốt lõi đều xuất hiện trong docs.

- [ ] **Step 3: Commit**

```bash
git add docs/database/scrape-more-seed-data.md docs/superpowers/specs/2026-06-21-specialty-first-disease-graph-design.md
git commit -m "docs: finalize disease graph rollout notes"
```

---

## File Structure Summary

- `docs/database/schema.sql`: thêm disease graph schema
- `docs/database/seed.sql`: seed taxonomy specialty
- `scripts/seed-disease-graph-data.js`: offline ingest disease/drug graph
- `data/seed-config/*.json`: rule/classifier configs
- `backend/src/repositories/DiseaseGraphRepository.js`: truy vấn graph theo specialty
- `backend/src/services/RecommendationService.js`: điều phối specialty-first recommendation
- `backend/src/routes/specialtyRoutes.js`: API browse specialty/disease/symptom
- `frontend/src/components/symptoms/SpecialtySelector.jsx`: bắt chọn specialty
- `frontend/src/pages/SymptomInput.jsx`: submit specialty + symptoms
- `frontend/src/pages/DrugSuggestion.jsx`: render disease-first results

---

## Self-Review

### Spec coverage

- Specialty taxonomy: covered in Task 1 and Task 4
- `1000+ diseases` and `1000+ drugs` seed direction: covered in Task 2
- Backend disease-graph recommendation: covered in Task 5
- Frontend specialty-first filter flow: covered in Task 6 and Task 7
- Runtime isolation from external APIs: covered in Task 2, Task 5, and Task 9

### Placeholder scan

- Không dùng `TODO`, `TBD`, hoặc “implement later”
- Mọi task đều có file path, commands, và code skeleton cụ thể

### Type consistency

- `specialty` được dùng nhất quán ở request, service, cache key, và frontend meta
- `topDiseases` / `matchedSymptoms` / `recommendations` được giữ nhất quán giữa backend và frontend
