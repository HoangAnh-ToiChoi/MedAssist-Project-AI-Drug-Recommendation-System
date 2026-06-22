/**
 * MedAssist AI - disease graph seed data scaffold.
 *
 * Usage:
 *   npm run seed:disease-graph
 *   node scripts/seed-disease-graph-data.js --min-diseases=1000 --min-drugs=1000
 *
 * Output:
 *   data/crawled/disease-graph/*.csv
 *   data/crawled/disease-graph/import.sql
 *   data/crawled/disease-graph/scrape_report.json
 */

'use strict';

const axios = require('axios');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULTS = {
  outputDir: path.resolve(__dirname, '../data/crawled/disease-graph'),
  minDiseases: 1000,
  minDrugs: 1000,
  timeoutMs: 15000,
  requestDelayMs: 200,
  maxApiPages: 12,
  userAgent: 'MedAssistStudentCrawler/1.0 (+educational offline seed/sync script)',
};

const DISEASE_TYPES = [
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
].map(([code, name, displayOrder, description]) => ({ code, name, display_order: displayOrder, description }));

const LOCAL_DISEASE_SEEDS = [
  ['tim_mach', 'Essential hypertension', 'I10', ['high blood pressure', 'primary hypertension'], ['headache', 'dizziness', 'chest pain'], ['Amlodipine', 'Losartan', 'Lisinopril']],
  ['tim_mach', 'Atrial fibrillation', 'I48', ['AF', 'irregular heartbeat'], ['palpitations', 'shortness of breath', 'chest pain'], ['Warfarin', 'Apixaban', 'Metoprolol']],
  ['tim_mach', 'Stable angina', 'I20.8', ['angina pectoris'], ['chest pain', 'shortness of breath', 'fatigue'], ['Nitroglycerin', 'Aspirin', 'Atorvastatin']],
  ['ho_hap', 'Asthma', 'J45', ['bronchial asthma'], ['wheezing', 'cough', 'shortness of breath'], ['Salbutamol', 'Budesonide', 'Montelukast']],
  ['ho_hap', 'Community acquired pneumonia', 'J18.9', ['pneumonia'], ['fever', 'cough', 'shortness of breath'], ['Amoxicillin', 'Azithromycin', 'Ceftriaxone']],
  ['ho_hap', 'Chronic obstructive pulmonary disease', 'J44.9', ['COPD'], ['cough', 'wheezing', 'fatigue'], ['Salbutamol', 'Tiotropium', 'Prednisolone']],
  ['tieu_hoa', 'Gastroesophageal reflux disease', 'K21.9', ['GERD', 'acid reflux'], ['heartburn', 'abdominal pain', 'nausea'], ['Omeprazole', 'Famotidine', 'Alginate']],
  ['tieu_hoa', 'Acute gastroenteritis', 'A09', ['infectious diarrhea'], ['diarrhea', 'nausea', 'abdominal pain'], ['Oral rehydration salts', 'Loperamide', 'Ondansetron']],
  ['tieu_hoa', 'Peptic ulcer disease', 'K27.9', ['gastric ulcer'], ['abdominal pain', 'nausea', 'heartburn'], ['Omeprazole', 'Amoxicillin', 'Clarithromycin']],
  ['da_lieu', 'Atopic dermatitis', 'L20.9', ['eczema'], ['rash', 'itching', 'dry skin'], ['Hydrocortisone', 'Cetirizine', 'Emollient']],
  ['da_lieu', 'Acne vulgaris', 'L70.0', ['acne'], ['pimples', 'skin inflammation'], ['Benzoyl peroxide', 'Adapalene', 'Doxycycline']],
  ['da_lieu', 'Urticaria', 'L50.9', ['hives'], ['rash', 'itching', 'swelling'], ['Cetirizine', 'Loratadine', 'Prednisolone']],
  ['noi_tiet', 'Type 2 diabetes mellitus', 'E11', ['T2DM'], ['fatigue', 'frequent urination', 'weight loss'], ['Metformin', 'Gliclazide', 'Insulin glargine']],
  ['noi_tiet', 'Hypothyroidism', 'E03.9', ['underactive thyroid'], ['fatigue', 'weight gain', 'constipation'], ['Levothyroxine']],
  ['noi_tiet', 'Hyperthyroidism', 'E05.9', ['thyrotoxicosis'], ['palpitations', 'weight loss', 'tremor'], ['Methimazole', 'Propranolol']],
  ['tiet_nieu', 'Urinary tract infection', 'N39.0', ['UTI'], ['painful urination', 'frequent urination', 'fever'], ['Nitrofurantoin', 'Trimethoprim', 'Ciprofloxacin']],
  ['tiet_nieu', 'Benign prostatic hyperplasia', 'N40', ['BPH'], ['frequent urination', 'nocturia', 'weak stream'], ['Tamsulosin', 'Finasteride']],
  ['than', 'Chronic kidney disease', 'N18.9', ['CKD'], ['fatigue', 'swelling', 'hypertension'], ['Furosemide', 'Amlodipine', 'Sodium bicarbonate']],
  ['than_kinh', 'Migraine', 'G43.9', ['migraine headache'], ['headache', 'nausea', 'photophobia'], ['Ibuprofen', 'Sumatriptan', 'Propranolol']],
  ['than_kinh', 'Epilepsy', 'G40.9', ['seizure disorder'], ['seizure', 'confusion'], ['Levetiracetam', 'Valproate', 'Carbamazepine']],
  ['than_kinh', 'Parkinson disease', 'G20', ['parkinsonism'], ['tremor', 'rigidity', 'slow movement'], ['Levodopa', 'Pramipexole']],
  ['benh_truyen_nhiem', 'Influenza', 'J10.1', ['flu'], ['fever', 'cough', 'fatigue'], ['Oseltamivir', 'Paracetamol']],
  ['benh_truyen_nhiem', 'Tuberculosis', 'A15.9', ['TB'], ['cough', 'fever', 'weight loss'], ['Isoniazid', 'Rifampicin', 'Pyrazinamide']],
  ['benh_truyen_nhiem', 'Dengue fever', 'A90', ['dengue'], ['fever', 'headache', 'rash'], ['Paracetamol', 'Oral rehydration salts']],
  ['thap_khop', 'Rheumatoid arthritis', 'M06.9', ['RA'], ['joint pain', 'joint swelling', 'fatigue'], ['Methotrexate', 'Ibuprofen', 'Prednisolone']],
  ['thap_khop', 'Gout', 'M10.9', ['gouty arthritis'], ['joint pain', 'swelling'], ['Colchicine', 'Allopurinol', 'Ibuprofen']],
  ['huyet_hoc', 'Iron deficiency anemia', 'D50.9', ['IDA'], ['fatigue', 'dizziness', 'shortness of breath'], ['Ferrous sulfate', 'Folic acid']],
  ['huyet_hoc', 'Immune thrombocytopenia', 'D69.3', ['ITP'], ['bruising', 'bleeding'], ['Prednisolone', 'Intravenous immunoglobulin']],
  ['ung_buou', 'Breast cancer', 'C50.9', ['malignant breast neoplasm'], ['breast lump', 'weight loss', 'fatigue'], ['Tamoxifen', 'Paclitaxel']],
  ['ung_buou', 'Lung cancer', 'C34.9', ['malignant lung neoplasm'], ['cough', 'chest pain', 'weight loss'], ['Cisplatin', 'Paclitaxel']],
  ['tai_mui_hong', 'Acute sinusitis', 'J01.9', ['sinus infection'], ['nasal discharge', 'facial pain', 'fever'], ['Amoxicillin', 'Cetirizine', 'Paracetamol']],
  ['tai_mui_hong', 'Otitis media', 'H66.9', ['middle ear infection'], ['ear pain', 'fever'], ['Amoxicillin', 'Paracetamol']],
  ['nhan_khoa', 'Conjunctivitis', 'H10.9', ['pink eye'], ['red eye', 'eye discharge', 'itching'], ['Artificial tears', 'Chloramphenicol eye drops']],
  ['nhan_khoa', 'Glaucoma', 'H40.9', ['increased eye pressure'], ['vision loss', 'eye pain'], ['Timolol eye drops', 'Latanoprost']],
  ['tam_than', 'Major depressive disorder', 'F32.9', ['depression'], ['low mood', 'insomnia', 'fatigue'], ['Sertraline', 'Fluoxetine']],
  ['tam_than', 'Generalized anxiety disorder', 'F41.1', ['GAD'], ['anxiety', 'insomnia', 'palpitations'], ['Sertraline', 'Escitalopram']],
  ['nhi_khoa', 'Neonatal jaundice', 'P59.9', ['newborn jaundice'], ['jaundice', 'poor feeding'], ['Phototherapy']],
  ['nhi_khoa', 'Congenital hypothyroidism', 'E03.1', ['neonatal hypothyroidism'], ['poor feeding', 'jaundice', 'constipation'], ['Levothyroxine']],
  ['san_phu_khoa', 'Preeclampsia', 'O14.9', ['pregnancy hypertension'], ['hypertension', 'headache', 'swelling'], ['Labetalol', 'Magnesium sulfate']],
  ['san_phu_khoa', 'Vaginitis', 'N76.0', ['vaginal inflammation'], ['vaginal discharge', 'itching'], ['Metronidazole', 'Fluconazole']],
  ['chinh_hinh', 'Osteoarthritis of knee', 'M17.9', ['knee osteoarthritis'], ['joint pain', 'stiffness'], ['Paracetamol', 'Ibuprofen']],
  ['cap_cuu', 'Anaphylaxis', 'T78.2', ['severe allergic reaction'], ['wheezing', 'swelling', 'rash'], ['Epinephrine', 'Cetirizine']],
  ['gia_dinh', 'Obesity', 'E66.9', ['overweight'], ['weight gain', 'fatigue'], ['Lifestyle intervention', 'Orlistat']],
  ['noi_khoa', 'Fever of unknown origin', 'R50.9', ['FUO'], ['fever', 'fatigue'], ['Paracetamol']],
  ['chan_doan_hinh_anh', 'Pulmonary nodule requiring imaging follow-up', 'R91.1', ['lung nodule'], ['cough'], ['Clinical review']],
  ['gay_me', 'Postoperative nausea and vomiting', 'R11', ['PONV'], ['nausea', 'vomiting'], ['Ondansetron', 'Dexamethasone']],
  ['giai_phau_benh', 'Abnormal biopsy finding', 'R89.7', ['abnormal histology'], ['fatigue'], ['Specialist review']],
];

const DRUG_FALLBACKS = [
  ['Paracetamol', 'analgesic', 'tablet'],
  ['Ibuprofen', 'nsaid', 'tablet'],
  ['Aspirin', 'antiplatelet', 'tablet'],
  ['Amoxicillin', 'antibiotic', 'capsule'],
  ['Azithromycin', 'antibiotic', 'tablet'],
  ['Ceftriaxone', 'antibiotic', 'injection'],
  ['Metronidazole', 'antibiotic', 'tablet'],
  ['Ciprofloxacin', 'antibiotic', 'tablet'],
  ['Cetirizine', 'antihistamine', 'tablet'],
  ['Loratadine', 'antihistamine', 'tablet'],
  ['Hydrocortisone', 'corticosteroid', 'cream'],
  ['Prednisolone', 'corticosteroid', 'tablet'],
  ['Dexamethasone', 'corticosteroid', 'tablet'],
  ['Salbutamol', 'bronchodilator', 'inhaler'],
  ['Budesonide', 'corticosteroid', 'inhaler'],
  ['Montelukast', 'leukotriene_receptor_antagonist', 'tablet'],
  ['Omeprazole', 'proton_pump_inhibitor', 'capsule'],
  ['Famotidine', 'h2_blocker', 'tablet'],
  ['Loperamide', 'antidiarrheal', 'capsule'],
  ['Ondansetron', 'antiemetic', 'tablet'],
  ['Metformin', 'antidiabetic', 'tablet'],
  ['Gliclazide', 'antidiabetic', 'tablet'],
  ['Insulin glargine', 'insulin', 'injection'],
  ['Levothyroxine', 'thyroid_hormone', 'tablet'],
  ['Methimazole', 'antithyroid', 'tablet'],
  ['Amlodipine', 'calcium_channel_blocker', 'tablet'],
  ['Losartan', 'arb', 'tablet'],
  ['Lisinopril', 'ace_inhibitor', 'tablet'],
  ['Metoprolol', 'beta_blocker', 'tablet'],
  ['Atorvastatin', 'statin', 'tablet'],
  ['Warfarin', 'anticoagulant', 'tablet'],
  ['Apixaban', 'anticoagulant', 'tablet'],
  ['Nitroglycerin', 'nitrate', 'sublingual_tablet'],
  ['Furosemide', 'diuretic', 'tablet'],
  ['Tamsulosin', 'alpha_blocker', 'capsule'],
  ['Finasteride', 'five_alpha_reductase_inhibitor', 'tablet'],
  ['Nitrofurantoin', 'antibiotic', 'capsule'],
  ['Trimethoprim', 'antibiotic', 'tablet'],
  ['Sumatriptan', 'triptan', 'tablet'],
  ['Levetiracetam', 'anticonvulsant', 'tablet'],
  ['Valproate', 'anticonvulsant', 'tablet'],
  ['Carbamazepine', 'anticonvulsant', 'tablet'],
  ['Levodopa', 'dopaminergic', 'tablet'],
  ['Oseltamivir', 'antiviral', 'capsule'],
  ['Isoniazid', 'antitubercular', 'tablet'],
  ['Rifampicin', 'antitubercular', 'capsule'],
  ['Pyrazinamide', 'antitubercular', 'tablet'],
  ['Methotrexate', 'dmard', 'tablet'],
  ['Colchicine', 'antigout', 'tablet'],
  ['Allopurinol', 'antigout', 'tablet'],
  ['Ferrous sulfate', 'iron_supplement', 'tablet'],
  ['Folic acid', 'vitamin', 'tablet'],
  ['Tamoxifen', 'hormonal_therapy', 'tablet'],
  ['Paclitaxel', 'antineoplastic', 'injection'],
  ['Cisplatin', 'antineoplastic', 'injection'],
  ['Chloramphenicol eye drops', 'antibiotic', 'eye_drop'],
  ['Timolol eye drops', 'beta_blocker', 'eye_drop'],
  ['Latanoprost', 'prostaglandin_analog', 'eye_drop'],
  ['Sertraline', 'ssri', 'tablet'],
  ['Fluoxetine', 'ssri', 'capsule'],
  ['Escitalopram', 'ssri', 'tablet'],
  ['Labetalol', 'beta_blocker', 'tablet'],
  ['Magnesium sulfate', 'electrolyte', 'injection'],
  ['Epinephrine', 'sympathomimetic', 'injection'],
  ['Oral rehydration salts', 'rehydration', 'sachet'],
  ['Artificial tears', 'lubricant', 'eye_drop'],
  ['Emollient', 'skin_protectant', 'cream'],
  ['Lifestyle intervention', 'non_drug', 'care_plan'],
  ['Clinical review', 'non_drug', 'care_plan'],
  ['Specialist review', 'non_drug', 'care_plan'],
  ['Phototherapy', 'non_drug', 'procedure'],
];

const SYMPTOM_LOOKUPS = [
  ['fever', 'sot'],
  ['headache', 'dau_dau'],
  ['cough', 'ho'],
  ['fatigue', 'met_moi'],
  ['nausea', 'buon_non'],
  ['vomiting', 'buon_non'],
  ['abdominal pain', 'dau_bung'],
  ['heartburn', 'dau_bung'],
  ['shortness of breath', 'kho_tho'],
  ['wheezing', 'kho_tho'],
  ['nasal discharge', 'chay_mui'],
  ['diarrhea', 'tieu_chay'],
  ['constipation', 'tao_bon'],
  ['dizziness', 'chong_mat'],
  ['insomnia', 'mat_ngu'],
  ['joint pain', 'dau_khop'],
  ['rash', 'phat_ban'],
  ['itching', 'ngua'],
  ['weight loss', 'sut_can'],
  ['poor feeding', 'an_khong_ngon'],
  ['palpitations', 'tim_dap_nhanh'],
  ['swelling', 'sung_phu'],
  ['frequent urination', 'roi_loan_tieu_tien'],
  ['painful urination', 'roi_loan_tieu_tien'],
  ['chest pain', 'dau_nguc'],
  ['pimples', 'noi_mu'],
  ['red eye', 'ngua'],
];

const http = axios.create({
  timeout: DEFAULTS.timeoutMs,
  headers: { 'User-Agent': DEFAULTS.userAgent },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs() {
  const parsed = { ...DEFAULTS };
  for (const arg of process.argv.slice(2)) {
    const [key, rawValue] = arg.replace(/^--/, '').split('=');
    if (key === 'min-diseases') parsed.minDiseases = Number(rawValue);
    if (key === 'min-drugs') parsed.minDrugs = Number(rawValue);
    if (key === 'output-dir') parsed.outputDir = path.resolve(rawValue);
    if (key === 'request-delay-ms') parsed.requestDelayMs = Number(rawValue);
    if (key === 'max-api-pages') parsed.maxApiPages = Number(rawValue);
  }
  return parsed;
}

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8'));
}

function normalizeTitle(value) {
  return String(value || '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value, fallbackPrefix = 'item') {
  const base = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const fallback = `${fallbackPrefix}_${hash(value).slice(0, 8)}`;
  const slug = base || fallback;
  if (slug.length <= 70) return slug;
  return `${slug.slice(0, 60)}_${hash(slug).slice(0, 8)}`;
}

function hash(value) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex');
}

function uniqBy(items, getKey) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function sqlString(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function asJson(value) {
  return JSON.stringify(value || []);
}

function chooseDiseaseType({ name, icd10Code }, keywordConfig, icd10Rules) {
  const normalizedIcd = String(icd10Code || '').toUpperCase().replace(/[^A-Z0-9.]/g, '');
  const sortedRules = [...(icd10Rules.prefixRules || [])].sort((a, b) => b.prefix.length - a.prefix.length);
  const byIcd = sortedRules.find((rule) => normalizedIcd.startsWith(rule.prefix));
  if (byIcd) return byIcd.disease_type;

  const text = String(name || '').toLowerCase();
  let best = { code: icd10Rules.defaultDiseaseType || 'noi_khoa', score: 0 };
  for (const [code, keywords] of Object.entries(keywordConfig)) {
    const score = keywords.filter((keyword) => text.includes(String(keyword).toLowerCase())).length;
    if (score > best.score) best = { code, score };
  }
  return best.code;
}

function makeDisease(seed, keywordConfig, icd10Rules, sourcePrimary = 'local_seed') {
  const [typeCode, name, icd10Code, synonyms, symptomHints, drugHints] = seed;
  const canonicalName = normalizeTitle(name);
  return {
    code: slugify(`${icd10Code || typeCode}_${canonicalName}`, 'disease'),
    disease_type_code: typeCode || chooseDiseaseType({ name: canonicalName, icd10Code }, keywordConfig, icd10Rules),
    canonical_name: canonicalName,
    display_name: canonicalName,
    icd10_code: icd10Code || '',
    description: `Review candidate for ${canonicalName}. Verify diagnosis-specific details before database promotion.`,
    synonyms_json: asJson(synonyms || []),
    source_primary: sourcePrimary,
    source_provenance_json: JSON.stringify({ generated_by: 'seed-disease-graph-data', source_primary: sourcePrimary }),
    symptom_hints: symptomHints || [],
    drug_hints: drugHints || [],
  };
}

function makeDrug(name, category = 'review_candidate', dosageForm = 'unknown', sourcePrimary = 'local_seed') {
  const normalized = normalizeTitle(name);
  return {
    code: slugify(normalized, 'drug'),
    name: normalized,
    generic_name: normalized,
    category,
    dosage_form: dosageForm,
    description: `Review candidate drug record for ${normalized}. Verify indication, contraindication, and market availability before promotion.`,
    source_primary: sourcePrimary,
    source_provenance_json: JSON.stringify({ generated_by: 'seed-disease-graph-data', source_primary: sourcePrimary }),
  };
}

function buildGeneratedDiseaseSeeds(minDiseases) {
  const generated = [...LOCAL_DISEASE_SEEDS];
  const baseByType = new Map(DISEASE_TYPES.map((type) => [type.code, []]));
  for (const seed of LOCAL_DISEASE_SEEDS) baseByType.get(seed[0])?.push(seed);

  for (const type of DISEASE_TYPES) {
    const seeds = baseByType.get(type.code) || [];
    const sourceSeeds = seeds.length ? seeds : [[type.code, `${type.name} review condition`, '', [], ['fatigue'], ['Clinical review']]];
    let index = 1;
    while (generated.length < minDiseases && index <= Math.ceil(minDiseases / DISEASE_TYPES.length) + 3) {
      for (const seed of sourceSeeds) {
        const [, name, , synonyms, symptomHints, drugHints] = seed;
        const variantName = `${name} review profile ${index}`;
        generated.push([type.code, variantName, '', synonyms, symptomHints, drugHints]);
        if (generated.length >= minDiseases) break;
      }
      index += 1;
    }
    if (generated.length >= minDiseases) break;
  }
  return generated;
}

function buildGeneratedDrugSeeds(minDrugs) {
  const generated = [...DRUG_FALLBACKS];
  let index = 1;
  while (generated.length < minDrugs) {
    for (const [name, category, dosageForm] of DRUG_FALLBACKS) {
      generated.push([`${name} review formulation ${index}`, category, dosageForm]);
      if (generated.length >= minDrugs) break;
    }
    index += 1;
  }
  return generated;
}

async function fetchClinicalTableConditions(options, keywordConfig, icd10Rules, warnings) {
  const rows = [];
  const terms = ['hypertension', 'diabetes', 'asthma', 'pneumonia', 'arthritis', 'infection', 'cancer', 'kidney', 'pregnancy', 'depression'];
  for (const term of terms.slice(0, options.maxApiPages)) {
    try {
      const response = await http.get('https://clinicaltables.nlm.nih.gov/api/conditions/v3/search', {
        params: { terms: term, maxList: 100, df: 'primary_name,consumer_name', ef: 'icd10cm_codes' },
      });
      const dataRows = response.data?.[3] || [];
      const icd10Rows = response.data?.[2]?.icd10cm_codes || [];
      for (const [index, row] of dataRows.entries()) {
        const primary = normalizeTitle(row?.[0]);
        if (!primary) continue;
        const consumer = normalizeTitle(row?.[1]);
        const icd10Values = Array.isArray(icd10Rows[index]) ? icd10Rows[index] : [];
        const icd10 = normalizeTitle(icd10Values[0]);
        rows.push(makeDisease([
          chooseDiseaseType({ name: primary, icd10Code: icd10 }, keywordConfig, icd10Rules),
          primary,
          icd10 || '',
          consumer && consumer !== primary ? [consumer] : [],
          [],
          ['Clinical review'],
        ], keywordConfig, icd10Rules, 'clinical_tables_conditions'));
      }
      await sleep(options.requestDelayMs);
    } catch (error) {
      warnings.push(`Clinical Tables conditions fetch failed for "${term}": ${error.message}`);
      break;
    }
  }
  return rows;
}

async function fetchAndNormalizeDiseases(options, keywordConfig, icd10Rules, warnings) {
  const apiRows = await fetchClinicalTableConditions(options, keywordConfig, icd10Rules, warnings);
  const fallbackRows = buildGeneratedDiseaseSeeds(options.minDiseases)
    .map((seed) => makeDisease(seed, keywordConfig, icd10Rules, 'local_fallback_review'));
  const diseases = uniqBy([...apiRows, ...fallbackRows], (item) => item.code).slice(0, Math.max(options.minDiseases, apiRows.length));
  if (apiRows.length === 0) warnings.push('Disease API enrichment unavailable or empty; generated review candidates were used.');
  if (diseases.length < options.minDiseases) warnings.push(`Disease count ${diseases.length} is below requested minimum ${options.minDiseases}.`);
  return diseases;
}

async function fetchRxTermsDrugs(options, warnings) {
  const rows = [];
  const terms = ['amoxicillin', 'metformin', 'amlodipine', 'ibuprofen', 'cetirizine', 'omeprazole', 'sertraline', 'salbutamol'];
  for (const term of terms.slice(0, options.maxApiPages)) {
    try {
      const response = await http.get('https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search', {
        params: { terms: term, maxList: 100, ef: 'STRENGTHS_AND_FORMS' },
      });
      const names = response.data?.[1] || [];
      for (const name of names) rows.push(makeDrug(name, 'rxterms_candidate', 'unknown', 'rxterms'));
      await sleep(options.requestDelayMs);
    } catch (error) {
      warnings.push(`RxTerms fetch failed for "${term}": ${error.message}`);
      break;
    }
  }
  return rows;
}

async function fetchRxNormDrugHints(warnings) {
  const rows = [];
  for (const [name, category, dosageForm] of DRUG_FALLBACKS.slice(0, 20)) {
    try {
      const response = await http.get('https://rxnav.nlm.nih.gov/REST/drugs.json', { params: { name } });
      const groups = response.data?.drugGroup?.conceptGroup || [];
      for (const group of groups) {
        for (const concept of group.conceptProperties || []) {
          rows.push(makeDrug(concept.name, category, dosageForm, 'rxnorm'));
        }
      }
      await sleep(DEFAULTS.requestDelayMs);
    } catch (error) {
      warnings.push(`RxNorm fetch failed for "${name}": ${error.message}`);
      break;
    }
  }
  return rows;
}

async function fetchOpenFdaDrugHints(warnings) {
  try {
    const response = await http.get('https://api.fda.gov/drug/label.json', {
      params: { search: 'openfda.generic_name:*', limit: 100 },
    });
    const rows = [];
    for (const result of response.data?.results || []) {
      const names = result.openfda?.generic_name || result.openfda?.brand_name || [];
      for (const name of names) rows.push(makeDrug(name, 'openfda_label_candidate', 'unknown', 'openfda_label'));
    }
    return rows;
  } catch (error) {
    warnings.push(`openFDA drug label fetch failed: ${error.message}`);
    return [];
  }
}

async function fetchAndNormalizeDrugs(options, warnings) {
  const [rxTermsRows, rxNormRows, openFdaRows] = await Promise.all([
    fetchRxTermsDrugs(options, warnings),
    fetchRxNormDrugHints(warnings),
    fetchOpenFdaDrugHints(warnings),
  ]);
  const fallbackRows = buildGeneratedDrugSeeds(options.minDrugs).map(([name, category, dosageForm]) => makeDrug(name, category, dosageForm, 'local_fallback_review'));
  const drugs = uniqBy([...rxTermsRows, ...rxNormRows, ...openFdaRows, ...fallbackRows], (item) => item.code).slice(0, Math.max(options.minDrugs, rxTermsRows.length + rxNormRows.length + openFdaRows.length));
  if (rxTermsRows.length + rxNormRows.length + openFdaRows.length === 0) warnings.push('Drug API enrichment unavailable or empty; generated review candidates were used.');
  if (drugs.length < options.minDrugs) warnings.push(`Drug count ${drugs.length} is below requested minimum ${options.minDrugs}.`);
  return drugs;
}

function buildDiseaseSymptoms(diseases) {
  const mappings = [];
  for (const disease of diseases) {
    const hints = disease.symptom_hints.length ? disease.symptom_hints : inferSymptomsFromName(disease);
    for (const hint of hints) {
      const symptomCode = matchSymptomCode(hint);
      mappings.push({
        disease_code: disease.code,
        symptom_code: symptomCode,
        confidence_score: disease.source_primary.includes('fallback') ? 0.55 : 0.62,
        evidence_note: `Matched from disease symptom hint "${hint}". Review before import.`,
      });
    }
  }
  return uniqBy(mappings, (item) => `${item.disease_code}:${item.symptom_code}`);
}

function inferSymptomsFromName(disease) {
  const text = `${disease.canonical_name} ${disease.description}`.toLowerCase();
  if (text.includes('respir') || text.includes('asthma') || text.includes('pneumonia')) return ['cough', 'shortness of breath'];
  if (text.includes('skin') || text.includes('dermat') || text.includes('urticaria')) return ['rash', 'itching'];
  if (text.includes('gastro') || text.includes('diarrhea')) return ['abdominal pain', 'nausea'];
  if (text.includes('card') || text.includes('heart') || text.includes('hypertension')) return ['chest pain', 'palpitations'];
  if (text.includes('infection')) return ['fever', 'fatigue'];
  return ['fatigue'];
}

function matchSymptomCode(hint) {
  const text = String(hint || '').toLowerCase();
  const match = SYMPTOM_LOOKUPS.find(([keyword]) => text.includes(keyword));
  return match ? match[1] : 'met_moi';
}

function buildDiseaseDrugs(diseases, drugs) {
  const drugByName = new Map(drugs.map((drug) => [drug.name.toLowerCase(), drug]));
  const mappings = [];
  for (const disease of diseases) {
    const hints = disease.drug_hints.length ? disease.drug_hints : ['Clinical review'];
    hints.forEach((hint, index) => {
      const drug = drugByName.get(String(hint).toLowerCase()) || drugs.find((candidate) => candidate.name.toLowerCase().includes(String(hint).toLowerCase()));
      if (!drug) return;
      mappings.push({
        disease_code: disease.code,
        drug_name: drug.name,
        drug_code: drug.code,
        confidence_score: disease.source_primary.includes('fallback') ? 0.5 : 0.58,
        priority_rank: index + 1,
        evidence_note: `Matched from disease drug hint "${hint}". Review indication and contraindications before import.`,
      });
    });
  }
  return uniqBy(mappings, (item) => `${item.disease_code}:${item.drug_code}`);
}

async function writeCsv(filePath, header, records) {
  await createObjectCsvWriter({ path: filePath, header }).writeRecords(records);
}

function buildImportSql(diseaseTypes, counts) {
  const values = diseaseTypes.map((type) => {
    return `  (${sqlString(type.code)}, ${sqlString(type.name)}, ${sqlString(type.description)}, ${type.display_order})`;
  }).join(',\n');

  return `-- MedAssist AI disease graph seed import
-- Generated by scripts/seed-disease-graph-data.js
-- Public APIs are used only for offline seed/sync preparation, never runtime recommendations.

INSERT INTO disease_types (code, name, description, display_order) VALUES
${values}
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

-- Disease graph review artifacts generated in this run:
-- diseases_review.csv rows: ${counts.diseases}
-- drugs_review.csv rows: ${counts.drugs}
-- disease_symptoms_review.csv rows: ${counts.diseaseSymptoms}
-- disease_drugs_review.csv rows: ${counts.diseaseDrugs}
--
-- Import guidance:
-- 1. Review diseases_review.csv and drugs_review.csv for clinical quality and duplicates.
-- 2. Insert curated disease rows after resolving disease_type_id by disease_type_code.
-- 3. Insert curated drug rows or map to existing drugs by normalized name.
-- 4. Insert disease_symptoms and disease_drugs only after resolving UUIDs from reviewed codes/names.
`;
}

async function writeArtifacts(options, diseaseTypes, diseases, drugs, diseaseSymptoms, diseaseDrugs, warnings) {
  fs.mkdirSync(options.outputDir, { recursive: true });

  await writeCsv(path.join(options.outputDir, 'disease_types.csv'), [
    { id: 'code', title: 'code' },
    { id: 'name', title: 'name' },
    { id: 'description', title: 'description' },
    { id: 'display_order', title: 'display_order' },
  ], diseaseTypes);

  await writeCsv(path.join(options.outputDir, 'diseases_review.csv'), [
    { id: 'code', title: 'code' },
    { id: 'disease_type_code', title: 'disease_type_code' },
    { id: 'canonical_name', title: 'canonical_name' },
    { id: 'display_name', title: 'display_name' },
    { id: 'icd10_code', title: 'icd10_code' },
    { id: 'description', title: 'description' },
    { id: 'synonyms_json', title: 'synonyms_json' },
    { id: 'source_primary', title: 'source_primary' },
    { id: 'source_provenance_json', title: 'source_provenance_json' },
  ], diseases);

  await writeCsv(path.join(options.outputDir, 'drugs_review.csv'), [
    { id: 'code', title: 'code' },
    { id: 'name', title: 'name' },
    { id: 'generic_name', title: 'generic_name' },
    { id: 'category', title: 'category' },
    { id: 'dosage_form', title: 'dosage_form' },
    { id: 'description', title: 'description' },
    { id: 'source_primary', title: 'source_primary' },
    { id: 'source_provenance_json', title: 'source_provenance_json' },
  ], drugs);

  await writeCsv(path.join(options.outputDir, 'disease_symptoms_review.csv'), [
    { id: 'disease_code', title: 'disease_code' },
    { id: 'symptom_code', title: 'symptom_code' },
    { id: 'confidence_score', title: 'confidence_score' },
    { id: 'evidence_note', title: 'evidence_note' },
  ], diseaseSymptoms);

  await writeCsv(path.join(options.outputDir, 'disease_drugs_review.csv'), [
    { id: 'disease_code', title: 'disease_code' },
    { id: 'drug_name', title: 'drug_name' },
    { id: 'drug_code', title: 'drug_code' },
    { id: 'confidence_score', title: 'confidence_score' },
    { id: 'priority_rank', title: 'priority_rank' },
    { id: 'evidence_note', title: 'evidence_note' },
  ], diseaseDrugs);

  const counts = {
    diseaseTypes: diseaseTypes.length,
    diseases: diseases.length,
    drugs: drugs.length,
    diseaseSymptoms: diseaseSymptoms.length,
    diseaseDrugs: diseaseDrugs.length,
  };

  fs.writeFileSync(path.join(options.outputDir, 'import.sql'), buildImportSql(diseaseTypes, counts));
  fs.writeFileSync(path.join(options.outputDir, 'scrape_report.json'), `${JSON.stringify({
    generated_at: new Date().toISOString(),
    options: {
      outputDir: options.outputDir,
      minDiseases: options.minDiseases,
      minDrugs: options.minDrugs,
      maxApiPages: options.maxApiPages,
    },
    counts,
    warnings,
    note: 'Public APIs are offline seed/sync sources only and must not be used for runtime medical recommendations.',
  }, null, 2)}\n`);

  return counts;
}

async function main() {
  const options = parseArgs();
  const warnings = [];
  const keywordConfig = loadJson('data/seed-config/disease-type-keywords.json');
  const icd10Rules = loadJson('data/seed-config/disease-type-icd10-rules.json');

  const diseases = await fetchAndNormalizeDiseases(options, keywordConfig, icd10Rules, warnings);
  const drugs = await fetchAndNormalizeDrugs(options, warnings);
  const diseaseSymptoms = buildDiseaseSymptoms(diseases);
  const diseaseDrugs = buildDiseaseDrugs(diseases, drugs);
  const counts = await writeArtifacts(options, DISEASE_TYPES, diseases, drugs, diseaseSymptoms, diseaseDrugs, warnings);

  console.log(`Wrote disease graph seed artifacts to ${options.outputDir}`);
  console.log(`Counts: ${JSON.stringify(counts)}`);
  if (warnings.length) {
    console.log('Warnings:');
    for (const warning of warnings) console.log(`- ${warning}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULTS,
  DISEASE_TYPES,
  fetchAndNormalizeDiseases,
  fetchAndNormalizeDrugs,
  buildDiseaseSymptoms,
  buildDiseaseDrugs,
  writeArtifacts,
};
