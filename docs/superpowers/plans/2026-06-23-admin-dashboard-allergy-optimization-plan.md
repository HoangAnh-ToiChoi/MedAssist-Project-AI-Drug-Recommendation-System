# Admin Dashboard & Allergy Matching Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a global medical audit log dashboard for admins in the frontend and backend, and optimize the user allergy search fuzzy matching algorithm using a two-stage indexed PostgreSQL Trigram search strategy.

**Architecture:** 
1. Add global audit log retrieval methods to the backend repository, service, and controller, exposing admin-only routes `/api/v1/ai/insights/summary` and `/events` with `global=true` parameter support. 
2. Revamp the React `AiInsights.jsx` view with email-based logs, filters (event type, fallback status, time window), and a raw payload JSON inspector modal.
3. Enable PostgreSQL `pg_trgm` extension, index the `drugs` table, add exact match + fuzzy candidate queries, and update `AllergyService` to compute Dice's Coefficient only on the top 15 database candidates.

**Tech Stack:** Express, PostgreSQL (pg_trgm), Node Joi, React, Axios, Vitest, Node Test Runner.

---

### Task 1: Enable PostgreSQL Trigram Extension and Indexing

**Files:**
- Create: `docs/database/migrations/2026-06-23-enable-pg-trgm.sql`

- [ ] **Step 1: Write the migration script**
  Create the migration SQL script containing:
  ```sql
  -- Enable pg_trgm extension if not exists
  CREATE EXTENSION IF NOT EXISTS pg_trgm;

  -- Create GIN index for trigram similarity search on drugs table name and generic_name columns
  CREATE INDEX IF NOT EXISTS idx_drugs_name_trgm ON drugs USING gin (name gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_drugs_generic_name_trgm ON drugs USING gin (generic_name gin_trgm_ops);
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add docs/database/migrations/2026-06-23-enable-pg-trgm.sql
  git commit -m "db: create pg_trgm extension and drugs trigram index migration"
  ```

---

### Task 2: Implement Database Queries in AllergyRepository

**Files:**
- Modify: `backend/src/repositories/AllergyRepository.js`
- Modify: `backend/test/allergyRoutes.test.js`

- [ ] **Step 1: Write failing tests in allergyRoutes.test.js**
  We must update `mockPool.query` in `backend/test/allergyRoutes.test.js` to mock the new database queries `SELECT id, name, generic_name FROM drugs WHERE name = $1...` and fuzzy candidates queries, avoiding the `Unexpected SQL` exception.
  Find lines in [allergyRoutes.test.js](file:///Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/backend/test/allergyRoutes.test.js#L77-L88):
  ```javascript
  if (sql.includes('SELECT id, name, generic_name FROM drugs') || sql.includes('SELECT id, name, generic_name, category FROM drugs')) {
  ```
  And modify it to handle:
  ```javascript
  if (sql.includes('SELECT id, name, generic_name FROM drugs WHERE LOWER(name) = $1') || sql.includes('LOWER(generic_name) = $1')) {
    const q = params[0].toLowerCase()
    const rows = mockState.drugs.filter(
      (item) => item.name.toLowerCase() === q || item.generic_name.toLowerCase() === q
    )
    return { rows }
  }

  if (sql.includes('similarity(name, $1) DESC') || sql.includes('WHERE name % $1')) {
    const q = params[0].toLowerCase()
    const rows = mockState.drugs.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.generic_name.toLowerCase().includes(q)
    )
    return { rows }
  }
  ```

- [ ] **Step 2: Run test suite to verify tests are still green (or fail on any unhandled queries)**
  Run: `npm test` inside `backend`
  Expected: PASS (or fail on unexpected SQL queries)

- [ ] **Step 3: Implement exact match and fuzzy candidates methods in AllergyRepository.js**
  Add the methods to `backend/src/repositories/AllergyRepository.js`:
  ```javascript
  async findExactDrugMatch(cleanName) {
    const { rows } = await this.#pool.query(
      `SELECT id, name, generic_name 
       FROM drugs 
       WHERE LOWER(name) = $1 OR LOWER(generic_name) = $1 
       LIMIT 1`,
      [cleanName]
    )
    return rows[0] || null
  }

  async findFuzzyCandidates(query, limit = 15) {
    const cleanQuery = String(query || '').trim().toLowerCase()
    const { rows } = await this.#pool.query(
      `SELECT id, name, generic_name
       FROM drugs
       WHERE name % $1 OR generic_name % $1
       ORDER BY similarity(name, $1) DESC, similarity(generic_name, $1) DESC
       LIMIT $2`,
      [cleanQuery, limit]
    )
    return rows
  }
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add backend/src/repositories/AllergyRepository.js backend/test/allergyRoutes.test.js
  git commit -m "repo: add exact drug match and fuzzy candidate query queries to AllergyRepository"
  ```

---

### Task 3: Optimize Allergy Resolution in AllergyService

**Files:**
- Modify: `backend/src/services/AllergyService.js`

- [ ] **Step 1: Refactor AllergyService.#resolveDrugId**
  Modify [AllergyService.js](file:///Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/backend/src/services/AllergyService.js#L125-L175) to replace `await this.#allergyRepository.getAllDrugs()` with a call to `findExactDrugMatch(cleanInput)` and `findFuzzyCandidates(cleanInput)`.
  
  Replace the method body with:
  ```javascript
  async #resolveDrugId(drugName) {
    if (!drugName || !drugName.trim()) {
      throw new AppError('Tên thuốc không được để trống', 400, 'DRUG_NAME_REQUIRED')
    }

    const cleanInput = drugName.trim().toLowerCase()

    // 1. Stage 1A: Exact matching directly in Database
    const exactMatch = await this.#allergyRepository.findExactDrugMatch(cleanInput)
    if (exactMatch) {
      return exactMatch.id
    }

    // 2. Stage 1B: Filter top candidates using pg_trgm Index
    const candidates = await this.#allergyRepository.findFuzzyCandidates(cleanInput, 15)

    let bestMatch = null
    let maxScore = 0

    // 3. Stage 2: Re-rank the small list of candidates using Dice Coefficient
    for (const drug of candidates) {
      const name = (drug.name || '').toLowerCase()
      const genericName = (drug.generic_name || '').toLowerCase()

      // Substring scoring
      let substringScore = 0
      if (name.includes(cleanInput) || cleanInput.includes(name)) {
        substringScore = 0.8
      }
      if (genericName.includes(cleanInput) || cleanInput.includes(genericName)) {
        substringScore = Math.max(substringScore, 0.8)
      }

      // Dice Similarity scoring
      const nameSimilarity = this.#getSimilarity(cleanInput, name)
      const genericSimilarity = this.#getSimilarity(cleanInput, genericName)
      const similarityScore = Math.max(nameSimilarity, genericSimilarity)

      const finalScore = Math.max(substringScore, similarityScore)
      if (finalScore > maxScore) {
        maxScore = finalScore
        bestMatch = drug
      }
    }

    if (bestMatch && maxScore >= 0.4) {
      return bestMatch.id
    }

    throw new AppError(
      `Không thể nhận dạng thuốc "${drugName}". Vui lòng chọn tên thuốc từ danh sách gợi ý.`,
      404,
      'DRUG_NOT_FOUND'
    )
  }
  ```

- [ ] **Step 2: Run test suite to verify optimized allergy resolution behaves identical**
  Run: `npm test` inside `backend`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add backend/src/services/AllergyService.js
  git commit -m "perf: optimize AllergyService matching with pg_trgm pre-filtering"
  ```

---

### Task 4: Implement Global Audit Log Queries in Repository & Service

**Files:**
- Modify: `backend/src/repositories/AiAuditLogRepository.js`
- Modify: `backend/src/services/AiAuditInsightsService.js`
- Modify: `backend/test/aiAuditInsightsService.test.js`

- [ ] **Step 1: Write test case in aiAuditInsightsService.test.js**
  Open [aiAuditInsightsService.test.js](file:///Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/backend/test/aiAuditInsightsService.test.js) and append a test case for `getGlobalSummary` and `getGlobalRecentEvents`.
  ```javascript
  test('getGlobalSummary aggregates system-wide metrics across all users', async () => {
    const repository = {
      async findAllRecent(options) {
        assert.equal(options.days, 10)
        return [
          {
            event_type: 'recommendation_explanation',
            provider: 'groq',
            status: 'success',
            fallback_used: false,
            latency_ms: 500,
            response_payload: { provider: 'groq', quality: { status: 'pass' } },
            error_message: null,
          }
        ]
      }
    }
    const service = new AiAuditInsightsService(repository)
    const result = await service.getGlobalSummary({ days: 10 })
    assert.equal(result.rowCount, 1)
    assert.equal(result.fallbackRate, 0)
    assert.deepEqual(result.providerBreakdown, { groq: 1 })
  })
  ```

- [ ] **Step 2: Implement AiAuditLogRepository.findAllRecent**
  Add the method to [AiAuditLogRepository.js](file:///Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/backend/src/repositories/AiAuditLogRepository.js):
  ```javascript
  async findAllRecent(options = {}) {
    const days = Number.isFinite(options.days) ? Math.max(1, Math.round(options.days)) : 7
    const limit = Number.isFinite(options.limit) ? Math.max(1, Math.min(100, Math.round(options.limit))) : 20
    const values = [days]
    const conditions = ["l.created_at >= NOW() - ($1::int * INTERVAL '1 day')"]

    if (options.eventType) {
      values.push(options.eventType)
      conditions.push(`l.event_type = $${values.length}`)
    }
    if (options.status) {
      values.push(options.status)
      conditions.push(`l.status = $${values.length}`)
    }
    if (options.fallbackUsed !== undefined) {
      values.push(options.fallbackUsed === 'true' || options.fallbackUsed === true)
      conditions.push(`l.fallback_used = $${values.length}`)
    }

    values.push(limit)

    const { rows } = await this.#pool.query(
      `SELECT
        l.id,
        l.user_id,
        u.email AS user_email,
        l.recommendation_id,
        l.event_type,
        l.provider,
        l.status,
        l.fallback_used,
        l.latency_ms,
        l.request_payload,
        l.response_payload,
        l.error_message,
        l.created_at
      FROM ai_audit_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY l.created_at DESC
      LIMIT $${values.length}`,
      values
    )

    return rows
  }
  ```

- [ ] **Step 3: Implement getGlobalSummary and getGlobalRecentEvents in AiAuditInsightsService.js**
  Open [AiAuditInsightsService.js](file:///Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/backend/src/services/AiAuditInsightsService.js) and add methods:
  ```javascript
  async getGlobalSummary(options = {}) {
    const rows = await this.#aiAuditLogRepository.findAllRecent(options)

    const providerBreakdown = {}
    const eventBreakdown = {}
    const statusBreakdown = {}
    const qualityBreakdown = {}
    const errorBreakdown = {}
    const latencies = []
    let fallbackCount = 0

    for (const row of rows) {
      const responsePayload = this.#parseJson(row.response_payload)
      const provider = responsePayload?.provider || row.provider || 'none'
      const qualityStatus = responsePayload?.quality?.status || null

      providerBreakdown[provider] = (providerBreakdown[provider] || 0) + 1
      eventBreakdown[row.event_type || 'unknown'] = (eventBreakdown[row.event_type || 'unknown'] || 0) + 1
      statusBreakdown[row.status || 'unknown'] = (statusBreakdown[row.status || 'unknown'] || 0) + 1
      if (qualityStatus) {
        qualityBreakdown[qualityStatus] = (qualityBreakdown[qualityStatus] || 0) + 1
      }
      if (row.error_message) {
        errorBreakdown[row.error_message] = (errorBreakdown[row.error_message] || 0) + 1
      }
      if (row.fallback_used) fallbackCount += 1
      if (Number.isFinite(row.latency_ms)) latencies.push(row.latency_ms)
    }

    return {
      windowDays: Number.isFinite(options.days) ? Math.max(1, Math.round(options.days)) : 7,
      rowCount: rows.length,
      fallbackRate: rows.length > 0 ? Number(((fallbackCount / rows.length) * 100).toFixed(1)) : 0,
      avgLatencyMs: this.#average(latencies),
      p95LatencyMs: this.#percentile(latencies, 0.95),
      maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : 0,
      providerBreakdown,
      eventBreakdown,
      statusBreakdown,
      qualityBreakdown,
      topErrors: this.#topEntries(errorBreakdown, 5),
    }
  }

  async getGlobalRecentEvents(options = {}) {
    const rows = await this.#aiAuditLogRepository.findAllRecent(options)
    return rows.map((row) => {
      const responsePayload = this.#parseJson(row.response_payload)
      return {
        id: row.id,
        userEmail: row.user_email || 'unknown@example.com',
        recommendationId: row.recommendation_id,
        eventType: row.event_type,
        provider: responsePayload?.provider || row.provider || 'none',
        status: row.status,
        fallbackUsed: Boolean(row.fallback_used),
        latencyMs: row.latency_ms || 0,
        qualityStatus: responsePayload?.quality?.status || null,
        errorMessage: row.error_message || null,
        createdAt: row.created_at,
        requestPayload: this.#parseJson(row.request_payload),
        responsePayload: responsePayload || {},
      }
    })
  }
  ```

- [ ] **Step 4: Run backend tests to verify**
  Run: `npm test` inside `backend`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/repositories/AiAuditLogRepository.js backend/src/services/AiAuditInsightsService.js backend/test/aiAuditInsightsService.test.js
  git commit -m "feat: add global audit log query methods to repository and insights service"
  ```

---

### Task 5: Expose Global Audit Log Controller and Routes

**Files:**
- Modify: `backend/src/controllers/AiAuditInsightsController.js`

- [ ] **Step 1: Update AiAuditInsightsController.js**
  Open [AiAuditInsightsController.js](file:///Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/backend/src/controllers/AiAuditInsightsController.js) and rewrite both routes to support `global=true` when user requests it.
  ```javascript
  async getSummary(req, res, next) {
    try {
      const days = Number(req.query.days || 7)
      const eventType = req.query.eventType ? String(req.query.eventType) : null
      const global = req.query.global === 'true'

      let summary
      if (global) {
        summary = await this.#aiAuditInsightsService.getGlobalSummary({
          days,
          eventType,
        })
      } else {
        summary = await this.#aiAuditInsightsService.getSummaryForUser(req.user.id, {
          days,
          eventType,
        })
      }
      res.json(ApiResponse.success(summary, 'AI audit summary loaded'))
    } catch (err) {
      next(err)
    }
  }

  async getRecentEvents(req, res, next) {
    try {
      const days = Number(req.query.days || 7)
      const limit = Number(req.query.limit || 20)
      const eventType = req.query.eventType ? String(req.query.eventType) : null
      const status = req.query.status ? String(req.query.status) : null
      const fallbackUsed = req.query.fallbackUsed !== undefined ? req.query.fallbackUsed : undefined
      const global = req.query.global === 'true'

      let events
      if (global) {
        events = await this.#aiAuditInsightsService.getGlobalRecentEvents({
          days,
          limit,
          eventType,
          status,
          fallbackUsed,
        })
      } else {
        events = await this.#aiAuditInsightsService.getRecentEventsForUser(req.user.id, {
          days,
          limit,
          eventType,
        })
      }
      res.json(ApiResponse.success(events, 'AI audit events loaded'))
    } catch (err) {
      next(err)
    }
  }
  ```

- [ ] **Step 2: Run all backend tests**
  Run: `npm test` inside `backend`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add backend/src/controllers/AiAuditInsightsController.js
  git commit -m "feat: support global insights aggregation and event filtering in controller"
  ```

---

### Task 6: Implement Frontend Admin Global Filters and JSON Viewer Modal

**Files:**
- Modify: `frontend/src/pages/AiInsights.jsx`

- [ ] **Step 1: Add state variables and revise API loading**
  Modify [AiInsights.jsx](file:///Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/frontend/src/pages/AiInsights.jsx) to load from `/ai/insights/summary?global=true` and `/ai/insights/events?global=true` with additional filters:
  ```javascript
  const [days, setDays] = useState(7);
  const [eventType, setEventType] = useState('');
  const [status, setStatus] = useState('');
  const [fallbackUsed, setFallbackUsed] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null); // For JSON detail modal
  ```

- [ ] **Step 2: Implement Filter Controls and Event Details Modal UI**
  Add JSX controls for `days`, `eventType`, `status`, and `fallbackUsed` to trigger reload.
  Implement a beautiful Modal/Dialog layout to show:
  - Event metadata
  - Beautified JSON request (`<pre className="bg-slate-900 p-4 rounded text-xs overflow-x-auto">{JSON.stringify(selectedEvent.requestPayload, null, 2)}</pre>`)
  - Beautified JSON response.

- [ ] **Step 3: Run frontend tests to make sure layout loads correctly**
  Run: `npm run test` inside `frontend`
  Expected: PASS

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/src/pages/AiInsights.jsx
  git commit -m "feat: build global filters and JSON payload viewer modal in admin AI insights dashboard"
  ```
