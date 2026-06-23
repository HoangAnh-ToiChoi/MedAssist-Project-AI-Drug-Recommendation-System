const Disease = require('../entities/Disease')
const DiseaseType = require('../entities/DiseaseType')
const Symptom = require('../entities/Symptom')

const SPECIALTY_FALLBACKS = [
  ['tim_mach', 'Tim mạch', 1, 'Bệnh lý tim và hệ tuần hoàn.'],
  ['da_lieu', 'Da liễu', 2, 'Bệnh lý da, tóc, móng và mô dưới da.'],
  ['noi_tiet', 'Nội tiết', 3, 'Bệnh lý nội tiết, dinh dưỡng và chuyển hóa.'],
  ['tieu_hoa', 'Tiêu hóa', 4, 'Bệnh lý ống tiêu hóa, gan mật và tụy.'],
  ['huyet_hoc', 'Huyết học', 5, 'Bệnh lý máu, đông máu và miễn dịch huyết học.'],
  ['benh_truyen_nhiem', 'Bệnh truyền nhiễm', 6, 'Bệnh do vi khuẩn, virus, nấm và ký sinh trùng.'],
  ['than', 'Thận', 7, 'Bệnh lý thận học và lọc máu.'],
  ['than_kinh', 'Thần kinh', 8, 'Bệnh lý hệ thần kinh trung ương và ngoại biên.'],
  ['ung_buou', 'Ung bướu', 9, 'Bệnh lý u lành, u ác và chăm sóc ung thư.'],
  ['nhan_khoa', 'Nhãn khoa', 10, 'Bệnh lý mắt và thị giác.'],
  ['chinh_hinh', 'Chỉnh hình', 11, 'Bệnh lý xương khớp chấn thương và chỉnh hình.'],
  ['tai_mui_hong', 'Tai Mũi Họng', 12, 'Bệnh lý tai, mũi, họng, thanh quản và xoang.'],
  ['tam_than', 'Tâm thần', 13, 'Rối loạn tâm thần, hành vi và giấc ngủ.'],
  ['ho_hap', 'Hô hấp', 14, 'Bệnh lý phổi và đường hô hấp.'],
  ['thap_khop', 'Thấp khớp', 15, 'Bệnh lý thấp khớp, tự miễn và mô liên kết.'],
  ['tiet_nieu', 'Tiết niệu', 16, 'Bệnh lý tiết niệu, bàng quang, tuyến tiền liệt và sinh dục nam.'],
  ['cap_cuu', 'Cấp cứu', 17, 'Tình trạng cấp cứu, chấn thương và ngộ độc.'],
  ['gia_dinh', 'Gia đình', 18, 'Chăm sóc ban đầu, dự phòng và quản lý bệnh mạn.'],
  ['noi_khoa', 'Nội khoa', 19, 'Bệnh nội khoa tổng quát và bệnh đa hệ.'],
  ['nhi_khoa', 'Nhi khoa', 20, 'Bệnh lý trẻ em, sơ sinh và phát triển.'],
  ['san_phu_khoa', 'Sản Phụ khoa', 21, 'Thai kỳ, sinh sản và bệnh phụ khoa.'],
  ['chan_doan_hinh_anh', 'Chẩn đoán hình ảnh', 22, 'Nhóm hỗ trợ chẩn đoán bằng hình ảnh.'],
  ['gay_me', 'Gây mê', 23, 'Gây mê hồi sức, an thần và kiểm soát đau quanh phẫu thuật.'],
  ['giai_phau_benh', 'Giải phẫu bệnh', 24, 'Chẩn đoán mô bệnh học, tế bào học và sinh thiết.'],
]

class DiseaseGraphRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async findSpecialties() {
    try {
      const { rows } = await this.#pool.query(
        `SELECT id, code, name, description, display_order
         FROM disease_types
         ORDER BY display_order ASC, name ASC`
      )

      return rows.map((row) => DiseaseType.fromRow(row))
    } catch (error) {
      if (!this.#isMissingRelationError(error)) throw error
      return SPECIALTY_FALLBACKS.map(([code, name, displayOrder, description]) =>
        DiseaseType.fromRow({ id: null, code, name, description, display_order: displayOrder })
      )
    }
  }

  async findSymptomsBySpecialtyCode(specialtyCode) {
    const normalizedSpecialtyCode = this.#normalizeSingleValue(specialtyCode)
    if (!normalizedSpecialtyCode) return []

    try {
      const { rows } = await this.#pool.query(
        `SELECT DISTINCT s.id, s.code, s.name
         FROM symptoms s
         JOIN disease_symptoms ds ON ds.symptom_id = s.id
         JOIN diseases d ON d.id = ds.disease_id
         JOIN disease_types dt ON dt.id = d.disease_type_id
         WHERE LOWER(TRIM(dt.code)) = $1
         ORDER BY s.name ASC`,
        [normalizedSpecialtyCode]
      )

      return rows.map((row) => Symptom.fromRow(row))
    } catch (error) {
      if (!this.#isMissingRelationError(error)) throw error
      const { rows } = await this.#pool.query(
        `SELECT id, code, name
         FROM symptoms
         ORDER BY name ASC
         LIMIT 40`
      )
      return rows.map((row) => Symptom.fromRow(row))
    }
  }

  async findDiseasesBySpecialtyCode(specialtyCode) {
    const normalizedSpecialtyCode = this.#normalizeSingleValue(specialtyCode)
    if (!normalizedSpecialtyCode) return []

    try {
      const { rows } = await this.#pool.query(
        `SELECT
           d.id,
           d.code,
           d.display_name,
           d.canonical_name,
           d.icd10_code,
           dt.code AS disease_type_code
         FROM diseases d
         JOIN disease_types dt ON dt.id = d.disease_type_id
         WHERE LOWER(TRIM(dt.code)) = $1
         ORDER BY d.display_name ASC, d.canonical_name ASC`,
        [normalizedSpecialtyCode]
      )

      return rows.map((row) => Disease.fromRow(row))
    } catch (error) {
      if (!this.#isMissingRelationError(error)) throw error
      return []
    }
  }

  async resolveSymptomCodesWithinSpecialty(specialtyCode, inputs) {
    const normalizedSpecialtyCode = this.#normalizeSingleValue(specialtyCode)
    const normalizedInputs = this.#normalizeValues(inputs)

    if (!normalizedSpecialtyCode || normalizedInputs.length === 0) return []

    let rows = []
    try {
      ({ rows } = await this.#pool.query(
        `SELECT DISTINCT
           s.code,
           LOWER(TRIM(s.name)) AS normalized_name,
           LOWER(TRIM(s.code)) AS normalized_code
         FROM symptoms s
         JOIN disease_symptoms ds ON ds.symptom_id = s.id
         JOIN diseases d ON d.id = ds.disease_id
         JOIN disease_types dt ON dt.id = d.disease_type_id
         WHERE LOWER(TRIM(dt.code)) = $1
           AND (
             LOWER(TRIM(s.name)) = ANY($2)
             OR LOWER(TRIM(s.code)) = ANY($2)
           )`,
        [normalizedSpecialtyCode, normalizedInputs]
      ))
    } catch (error) {
      if (!this.#isMissingRelationError(error)) throw error
      ({ rows } = await this.#pool.query(
        `SELECT DISTINCT
           s.code,
           LOWER(TRIM(s.name)) AS normalized_name,
           LOWER(TRIM(s.code)) AS normalized_code
         FROM symptoms s
         WHERE LOWER(TRIM(s.name)) = ANY($1)
            OR LOWER(TRIM(s.code)) = ANY($1)`,
        [normalizedInputs]
      ))
    }

    const resolvedByInput = new Map()

    for (const row of rows) {
      if (row.normalized_name) resolvedByInput.set(row.normalized_name, row.code)
      if (row.normalized_code) resolvedByInput.set(row.normalized_code, row.code)
    }

    return [...new Set(
      normalizedInputs
        .map((input) => resolvedByInput.get(input))
        .filter(Boolean)
    )]
  }

  async findDiseaseCandidatesBySymptomCodes(specialtyCode, symptomCodes) {
    const normalizedSpecialtyCode = this.#normalizeSingleValue(specialtyCode)
    const normalizedSymptomCodes = this.#normalizeValues(symptomCodes)

    if (!normalizedSpecialtyCode || normalizedSymptomCodes.length === 0) return []

    try {
      const { rows } = await this.#pool.query(
        `SELECT
           d.id,
           d.code,
           d.display_name,
           d.canonical_name,
           d.icd10_code,
           dt.code AS disease_type_code,
           SUM(COALESCE(ds.confidence_score, 0)) AS score
         FROM diseases d
         JOIN disease_types dt ON dt.id = d.disease_type_id
         JOIN disease_symptoms ds ON ds.disease_id = d.id
         JOIN symptoms s ON s.id = ds.symptom_id
         WHERE LOWER(TRIM(dt.code)) = $1
           AND (
             LOWER(TRIM(s.code)) = ANY($2)
             OR LOWER(TRIM(s.name)) = ANY($2)
           )
         GROUP BY d.id, d.code, d.display_name, d.canonical_name, d.icd10_code, dt.code
         ORDER BY score DESC, d.display_name ASC
         LIMIT 10`,
        [normalizedSpecialtyCode, normalizedSymptomCodes]
      )

      return rows.map((row) => Disease.fromRow(row))
    } catch (error) {
      if (!this.#isMissingRelationError(error)) throw error
      return []
    }
  }

  async findDrugCandidatesByDiseaseIds(diseaseIds) {
    const normalizedDiseaseIds = [...new Set(
      (diseaseIds || [])
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )]

    if (normalizedDiseaseIds.length === 0) return []

    try {
      const { rows } = await this.#pool.query(
        `WITH disease_drug_scores AS (
           SELECT
             dr.id,
             dr.name,
             dr.generic_name,
             dr.category,
             dr.description,
             dr.contraindications,
             SUM(COALESCE(dd.confidence_score, 0)) AS confidence,
             MIN(dd.priority_rank) AS priority_rank
           FROM disease_drugs dd
           JOIN drugs dr ON dr.id = dd.drug_id
           WHERE dd.disease_id = ANY($1::uuid[])
           GROUP BY dr.id, dr.name, dr.generic_name, dr.category, dr.description, dr.contraindications
         ),
         ranked_drugs AS (
           SELECT
             *,
             ROW_NUMBER() OVER (
               PARTITION BY LOWER(COALESCE(NULLIF(generic_name, ''), name))
               ORDER BY confidence DESC, priority_rank ASC, name ASC
             ) AS generic_rank
           FROM disease_drug_scores
         )
         SELECT
           name,
           generic_name,
           category,
           description,
           contraindications,
           confidence,
           priority_rank
         FROM ranked_drugs
         WHERE generic_rank = 1
         ORDER BY confidence DESC, priority_rank ASC, name ASC`,
        [normalizedDiseaseIds]
      )

      return rows.map((row) => ({
        name: row.name,
        generic_name: row.generic_name,
        category: row.category,
        description: row.description,
        contraindications: row.contraindications,
        confidence: row.confidence,
        priority_rank: row.priority_rank,
      }))
    } catch (error) {
      if (!this.#isMissingRelationError(error)) throw error
      return []
    }
  }

  #isMissingRelationError(error) {
    return error?.code === '42P01'
  }

  #normalizeSingleValue(value) {
    const normalized = String(value || '').trim().toLowerCase()
    return normalized || null
  }

  #normalizeValues(values) {
    return [...new Set(
      (values || [])
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean)
    )]
  }
}

module.exports = DiseaseGraphRepository
