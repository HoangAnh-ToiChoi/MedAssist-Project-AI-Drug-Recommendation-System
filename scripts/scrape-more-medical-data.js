/**
 * MedAssist AI - scrape more seed data.
 *
 * Usage:
 *   npm run scrape:more
 *   node scripts/scrape-more-medical-data.js --min-drugs=240 --min-symptoms=240 --min-mappings=500
 *
 * Output:
 *   data/crawled/more/*.csv
 *   data/crawled/more/scrape_import.sql
 *   data/crawled/more/scrape_report.json
 */

'use strict';

const axios = require('axios');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULTS = {
  minDrugs: 220,
  minSymptoms: 220,
  minMappings: 320,
  drugEnrichLimit: 80,
  outputDir: path.resolve(__dirname, '../data/crawled/more'),
  requestDelayMs: 250,
  timeoutMs: 20000,
  userAgent: 'MedAssistStudentCrawler/1.0 (+educational seed-data script)',
};

const DRUG_CATEGORIES = [
  ['Category:Antibiotics', 'antibiotic', 'capsule'],
  ['Category:Analgesics', 'analgesic', 'tablet'],
  ['Category:Nonsteroidal anti-inflammatory drugs', 'nsaid', 'tablet'],
  ['Category:Antihistamines', 'antihistamine', 'tablet'],
  ['Category:Corticosteroids', 'corticosteroid', 'tablet'],
  ['Category:Bronchodilators', 'bronchodilator', 'inhaler'],
  ['Category:Antiemetics', 'antiemetic', 'tablet'],
  ['Category:Laxatives', 'laxative', 'tablet'],
  ['Category:Diuretics', 'diuretic', 'tablet'],
  ['Category:Antihypertensive agents', 'antihypertensive', 'tablet'],
  ['Category:Anticoagulants', 'anticoagulant', 'tablet'],
  ['Category:Antiplatelet drugs', 'antiplatelet', 'tablet'],
  ['Category:Proton-pump inhibitors', 'proton_pump_inhibitor', 'capsule'],
  ['Category:H2 receptor antagonists', 'h2_blocker', 'tablet'],
  ['Category:Statins', 'statin', 'tablet'],
  ['Category:Antidiabetic drugs', 'antidiabetic', 'tablet'],
  ['Category:Antiviral drugs', 'antiviral', 'tablet'],
  ['Category:Antifungals', 'antifungal', 'tablet'],
  ['Category:Antidepressants', 'antidepressant', 'tablet'],
  ['Category:Anticonvulsants', 'anticonvulsant', 'tablet'],
];

const SYMPTOM_CATEGORIES = [
  'Category:Medical signs',
  'Category:Symptoms and signs',
  'Category:Pain',
  'Category:Respiratory symptoms and signs',
  'Category:Digestive system symptoms and signs',
  'Category:Neurological symptoms and signs',
  'Category:Skin conditions resulting from physical factors',
];

const EBI_SYMPTOM_QUERIES = [
  'symptom',
  'pain',
  'fever',
  'cough',
  'nausea',
  'rash',
  'edema',
  'dyspnea',
  'dizziness',
  'fatigue',
];

const LOCAL_DRUGS = [
  ['Paracetamol', 'analgesic', 'tablet'],
  ['Ibuprofen', 'nsaid', 'tablet'],
  ['Aspirin', 'nsaid', 'tablet'],
  ['Amoxicillin', 'antibiotic', 'capsule'],
  ['Cetirizine', 'antihistamine', 'tablet'],
  ['Omeprazole', 'proton_pump_inhibitor', 'capsule'],
  ['Metformin', 'antidiabetic', 'tablet'],
  ['Amlodipine', 'antihypertensive', 'tablet'],
  ['Atorvastatin', 'statin', 'tablet'],
  ['Salbutamol', 'bronchodilator', 'inhaler'],
  ['Diazepam', 'benzodiazepine', 'tablet'],
  ['Dexamethasone', 'corticosteroid', 'tablet'],
  ['Metronidazole', 'antibiotic', 'tablet'],
  ['Loperamide', 'antidiarrheal', 'capsule'],
  ['Simvastatin', 'statin', 'tablet'],
  ['Lisinopril', 'ace_inhibitor', 'tablet'],
  ['Losartan', 'arb', 'tablet'],
  ['Clopidogrel', 'antiplatelet', 'tablet'],
  ['Warfarin', 'anticoagulant', 'tablet'],
  ['Furosemide', 'diuretic', 'tablet'],
  ['Prednisolone', 'corticosteroid', 'tablet'],
  ['Azithromycin', 'antibiotic', 'tablet'],
  ['Ciprofloxacin', 'antibiotic', 'tablet'],
  ['Lactulose', 'laxative', 'syrup'],
  ['Bisacodyl', 'laxative', 'tablet'],
  ['Domperidone', 'antiemetic', 'tablet'],
];

const LOCAL_SYMPTOMS = [
  ['sot', 'Sốt', 'R50', 'Nhiệt độ cơ thể tăng cao trên 37.5°C, thường là phản ứng của cơ thể với nhiễm trùng.'],
  ['dau_dau', 'Đau đầu', 'R51', 'Đau hoặc khó chịu ở vùng đầu, có thể do căng thẳng, thiếu ngủ hoặc bệnh lý.'],
  ['ho', 'Ho', 'R05', 'Phản xạ bảo vệ đường hô hấp, có thể là ho khan hoặc ho có đờm.'],
  ['met_moi', 'Mệt mỏi', 'R53', 'Cảm giác kiệt sức, thiếu năng lượng hoặc khó tập trung.'],
  ['buon_non', 'Buồn nôn', 'R11', 'Cảm giác muốn nôn và khó chịu ở dạ dày.'],
  ['dau_bung', 'Đau bụng', 'R10', 'Đau hoặc khó chịu ở vùng bụng với nhiều mức độ khác nhau.'],
  ['kho_tho', 'Khó thở', 'R06', 'Cảm giác hụt hơi hoặc không hít đủ không khí.'],
  ['chay_mui', 'Chảy mũi', 'R09.8', 'Dịch chảy từ mũi, thường gặp khi cảm lạnh hoặc dị ứng.'],
  ['dau_hong', 'Đau họng', 'J02', 'Đau, rát hoặc ngứa cổ họng và có thể khó nuốt.'],
  ['tieu_chay', 'Tiêu chảy', 'A09', 'Đi ngoài phân lỏng nhiều lần trong ngày.'],
  ['tao_bon', 'Táo bón', 'K59.0', 'Đi ngoài khó, ít lần hoặc phân cứng.'],
  ['chong_mat', 'Chóng mặt', 'R42', 'Cảm giác xoay vòng hoặc mất thăng bằng.'],
  ['mat_ngu', 'Mất ngủ', 'G47.0', 'Khó bắt đầu hoặc duy trì giấc ngủ.'],
  ['dau_lung', 'Đau lưng', 'M54', 'Đau hoặc khó chịu ở vùng lưng.'],
  ['dau_khop', 'Đau khớp', 'M25.5', 'Đau, sưng hoặc cứng khớp làm giảm vận động.'],
  ['phat_ban', 'Phát ban', 'R21', 'Nổi mẩn hoặc thay đổi màu sắc, bề mặt da.'],
  ['ngua', 'Ngứa', 'L29', 'Cảm giác khó chịu trên da gây nhu cầu gãi.'],
  ['sut_can', 'Sụt cân', 'R63.4', 'Giảm cân không chủ đích có thể liên quan bệnh lý.'],
  ['an_khong_ngon', 'Ăn không ngon', 'R63.0', 'Giảm hoặc mất cảm giác thèm ăn.'],
  ['tim_dap_nhanh', 'Tim đập nhanh', 'R00.0', 'Nhịp tim nhanh hoặc cảm giác hồi hộp, đánh trống ngực.'],
  ['sung_phu', 'Sưng phù', 'R60', 'Tích tụ dịch dưới da gây sưng, thường ở chân hoặc tay.'],
  ['roi_loan_tieu_tien', 'Rối loạn tiểu tiện', 'R35', 'Tiểu nhiều, tiểu ít, đau hoặc buốt khi tiểu.'],
  ['ho_co_dom', 'Ho có đờm', 'R09.3', 'Ho kèm chất nhầy hoặc đờm từ đường hô hấp.'],
  ['dau_nguc', 'Đau ngực', 'R07', 'Đau hoặc tức ngực cần được đánh giá nguyên nhân.'],
  ['noi_mu', 'Nổi mụn', 'L70', 'Tổn thương da do viêm hoặc bít tắc nang lông.'],
];

const CATEGORY_SYMPTOM_MAPPINGS = {
  analgesic: ['sot', 'dau_dau', 'dau_lung', 'dau_khop'],
  nsaid: ['sot', 'dau_dau', 'dau_lung', 'dau_khop'],
  antibiotic: ['sot', 'dau_hong', 'ho_co_dom'],
  antihistamine: ['chay_mui', 'ngua', 'phat_ban'],
  corticosteroid: ['phat_ban', 'kho_tho'],
  bronchodilator: ['ho', 'kho_tho'],
  antiemetic: ['buon_non'],
  antidiarrheal: ['tieu_chay'],
  laxative: ['tao_bon'],
  proton_pump_inhibitor: ['dau_bung'],
  h2_blocker: ['dau_bung'],
  diuretic: ['sung_phu'],
  antihypertensive: ['tim_dap_nhanh'],
  ace_inhibitor: ['tim_dap_nhanh'],
  arb: ['tim_dap_nhanh'],
};

const MAPPING_RULES = [
  [['fever', 'temperature', 'chills', 'headache', 'pain', 'ache'], ['analgesic', 'nsaid'], 0.78],
  [['cough', 'respiratory', 'breath', 'wheeze', 'asthma', 'throat'], ['bronchodilator', 'antihistamine', 'corticosteroid'], 0.72],
  [['rash', 'itch', 'allergic', 'urticaria', 'skin'], ['antihistamine', 'corticosteroid'], 0.73],
  [['nausea', 'vomit', 'emesis'], ['antiemetic'], 0.75],
  [['diarrhea', 'diarrhoea', 'stool', 'bowel'], ['antidiarrheal', 'antibiotic'], 0.68],
  [['constipation'], ['laxative'], 0.76],
  [['abdominal', 'stomach', 'gastric', 'heartburn', 'reflux'], ['proton_pump_inhibitor', 'h2_blocker'], 0.7],
  [['edema', 'oedema', 'swelling'], ['diuretic'], 0.65],
  [['blood pressure', 'hypertension'], ['antihypertensive', 'ace_inhibitor', 'arb'], 0.66],
  [['infection', 'infectious', 'bacterial'], ['antibiotic'], 0.62],
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
    if (key === 'min-drugs') parsed.minDrugs = Number(rawValue);
    if (key === 'min-symptoms') parsed.minSymptoms = Number(rawValue);
    if (key === 'min-mappings') parsed.minMappings = Number(rawValue);
    if (key === 'drug-enrich-limit') parsed.drugEnrichLimit = Number(rawValue);
    if (key === 'output-dir') parsed.outputDir = path.resolve(rawValue);
  }
  return parsed;
}

function normalizeTitle(title) {
  return String(title || '')
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
  const fallback = `${fallbackPrefix}_${crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 8)}`;
  const slug = base || fallback;
  if (slug.length <= 50) return slug;
  return `${slug.slice(0, 42)}_${crypto.createHash('sha1').update(slug).digest('hex').slice(0, 7)}`;
}

function isBadTitle(title, type) {
  const text = title.toLowerCase();
  const bad = ['list of ', 'timeline', 'template:', 'category:', 'outline of ', 'index of ', 'comparison of ', 'history of '];
  if (bad.some((term) => text.includes(term))) return true;
  if (title.length < 3 || title.length > 100) return true;
  if (type === 'drug') {
    const exact = [
      'drug', 'medication', 'pharmaceutical', 'therapy', 'treatment', 'medicine',
      'clinical trial', 'law', 'antibiotic', 'antibacterial', 'analgesic',
      'antihistamine', 'corticosteroid', 'bronchodilator', 'antidepressant',
    ];
    if (exact.includes(text)) return true;
    if (/^[a-z]-?\d[\d,.-]*$/i.test(title)) return true;
    return false;
  }
  if (type === 'symptom') {
    const noisyTerms = ['diary', 'questionnaire', 'scale', 'score', 'screening', 'assessment', 'measurement'];
    return ['signs and symptoms', 'medical sign', 'symptom'].includes(text) || noisyTerms.some((term) => text.includes(term));
  }
  return false;
}

async function fetchJson(url) {
  const response = await http.get(url, { responseType: 'json' });
  return response.data;
}

function truncateText(value, maxLength = 320) {
  const text = String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function isGenericDrugDescription(description) {
  const text = String(description || '').trim().toLowerCase();
  if (!text) return true;
  return (
    text.startsWith('scraped from category:') ||
    text.startsWith('scraped from category ') ||
    text.includes('hoạt chất được ghi nhận trong') ||
    text.includes('dữ liệu thuốc nền đã được kiểm tra thủ công')
  );
}

function isDefaultContraindications(drug) {
  return String(drug.contraindications || '').trim() === defaultContraindications(drug.category, drug.name);
}

function buildDrugLookupRefs(name, genericName) {
  const lookupName = normalizeTitle(genericName || name);
  const encodedName = encodeURIComponent(lookupName);
  const encodedWiki = encodeURIComponent(normalizeTitle(name));
  return {
    openfda_label_search_url: `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(`openfda.generic_name.exact:"${lookupName}"`)}&limit=1`,
    wikipedia_summary_url: `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedWiki}`,
    drugbank_search_url: `https://go.drugbank.com/unearth/q?searcher=drugs&query=${encodedName}`,
    ctdbase_search_url: `https://ctdbase.org/basicQuery.go?bqCat=chem&bq=${encodedName}`,
    dav_lookup_url: 'https://dav.gov.vn/tra-cuu-thuoc.html',
    dav_otc_lookup_url: `https://dichvucong.dav.gov.vn/congbothuockhongkedon/index?keyWord=${encodedName}`,
  };
}

function initDrugRecord(record) {
  return {
    ...record,
    _source_tags: record.source ? [record.source] : [],
    _source_notes: record.source ? [`${record.source}: ${truncateText(record.description, 160)}`] : [],
    _review_flags: [],
    _lookup_refs: buildDrugLookupRefs(record.name, record.generic_name),
  };
}

function addUniqueValue(list, value) {
  if (!value) return;
  if (!list.includes(value)) list.push(value);
}

function addDrugSourceNote(drug, source, detail) {
  addUniqueValue(drug._source_tags, source);
  addUniqueValue(drug._source_notes, `${source}: ${truncateText(detail, 160)}`);
}

function addDrugReviewFlag(drug, flag) {
  addUniqueValue(drug._review_flags, flag);
}

function firstNonEmptyLabelField(result, fieldNames) {
  for (const field of fieldNames) {
    const raw = result?.[field];
    const text = truncateText(Array.isArray(raw) ? raw.join(' ') : raw, 320);
    if (text) return text;
  }
  return '';
}

function buildWikipediaTitles(drug) {
  return Array.from(
    new Set(
      [drug.name, drug.generic_name]
        .map((value) => normalizeTitle(value))
        .filter(Boolean),
    ),
  );
}

function summarizeMergedDrugSources(records) {
  return records.reduce((acc, record) => {
    for (const source of record._source_tags || []) {
      acc[source] = (acc[source] || 0) + 1;
    }
    return acc;
  }, {});
}

async function crawlWikipediaCategory(category, targetCount, report) {
  const titles = [];
  let cmcontinue = '';
  let requests = 0;

  do {
    const url = new URL('https://en.wikipedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('list', 'categorymembers');
    url.searchParams.set('cmtitle', category);
    url.searchParams.set('cmlimit', '500');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');
    if (cmcontinue) url.searchParams.set('cmcontinue', cmcontinue);

    const data = await fetchJson(url.toString());
    const members = data.query?.categorymembers || [];
    titles.push(...members.filter((item) => item.ns === 0).map((item) => item.title));
    cmcontinue = data.continue?.cmcontinue || '';
    requests += 1;
    await sleep(DEFAULTS.requestDelayMs);
  } while (cmcontinue && titles.length < targetCount && requests < 10);

  report.sources.push({ source: 'Wikipedia', detail: category, records: titles.length });
  return titles;
}

async function crawlDrugs(config, report) {
  const drugs = new Map();

  for (const [name, category, dosage] of LOCAL_DRUGS) {
    drugs.set(name.toLowerCase(), initDrugRecord({
      name,
      generic_name: name,
      category,
      dosage_form: dosage,
      contraindications: defaultContraindications(category, name),
      description: 'Dữ liệu thuốc nền đã được kiểm tra thủ công trong MedAssist.',
      source: 'Local curated',
    }));
  }

  try {
    const fdaDrugs = await crawlOpenFdaIngredients(config.minDrugs, report);
    for (const drug of fdaDrugs) {
      const key = drug.name.toLowerCase();
      if (!drugs.has(key)) drugs.set(key, initDrugRecord(drug));
    }
  } catch (error) {
    report.warnings.push(`openFDA ingredient crawl failed: ${error.message}`);
  }

  if (drugs.size < config.minDrugs) {
    report.warnings.push('openFDA did not reach the requested minimum; using filtered Wikipedia fallback.');
    for (const [category, type, dosage] of DRUG_CATEGORIES) {
      if (drugs.size >= config.minDrugs + 80) break;
      try {
        const titles = await crawlWikipediaCategory(category, 500, report);
        for (const rawTitle of titles) {
          const name = normalizeTitle(rawTitle);
          if (isBadTitle(name, 'drug')) continue;
          const key = name.toLowerCase();
          if (!drugs.has(key)) {
            drugs.set(key, initDrugRecord({
              name,
              generic_name: name,
              category: type,
              dosage_form: dosage,
              contraindications: defaultContraindications(type, name),
              description: `Scraped from ${category} on Wikipedia.`,
              source: 'Wikipedia',
            }));
          }
        }
      } catch (error) {
        report.warnings.push(`Wikipedia drug category failed (${category}): ${error.message}`);
      }
    }
  }

  const records = Array.from(drugs.values()).slice(0, Math.max(config.minDrugs, drugs.size));
  await enrichDrugRecords(records, config, report);
  return records;
}

async function crawlOpenFdaIngredients(minDrugs, report) {
  const limit = Math.min(1000, Math.max(300, minDrugs + 100));
  const url = `https://api.fda.gov/drug/drugsfda.json?count=products.active_ingredients.name.exact&limit=${limit}`;
  const response = await http.get(url, { responseType: 'json', timeout: 60000 });
  const rows = response.data?.results || [];
  const drugs = [];

  for (const row of rows) {
    const name = normalizeFdaIngredient(row.term);
    if (!name || isBadTitle(name, 'drug')) continue;
    const category = inferDrugCategory(name);
    drugs.push({
      name,
      generic_name: name,
      category,
      dosage_form: inferDosageForm(category),
      contraindications: defaultContraindications(category, name),
      description: `Hoạt chất được ghi nhận trong ${row.count || 0} hồ sơ sản phẩm thuốc openFDA.`,
      source: 'openFDA',
    });
  }

  report.sources.push({ source: 'openFDA', detail: 'active ingredient frequency', records: drugs.length });
  return drugs;
}

function normalizeFdaIngredient(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || text.length > 150 || text.includes('UNKNOWN')) return '';
  return text.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function inferDrugCategory(name) {
  const text = name.toLowerCase();
  if (/(cillin|cycline|mycin|floxacin|cef[a-z]|penicillin|sulfamethoxazole)/.test(text)) return 'antibiotic';
  if (/(statin)/.test(text)) return 'statin';
  if (/(pril)/.test(text)) return 'ace_inhibitor';
  if (/(sartan)/.test(text)) return 'arb';
  if (/(olol|dipine|hydrochlorothiazide)/.test(text)) return 'antihypertensive';
  if (/(azole|nystatin|terbinafine)/.test(text)) return 'antifungal';
  if (/(vir\b)/.test(text)) return 'antiviral';
  if (/(setron)/.test(text)) return 'antiemetic';
  if (/(prednis|dexamethasone|hydrocortisone|methylprednisolone)/.test(text)) return 'corticosteroid';
  if (/(cetirizine|loratadine|fexofenadine|diphenhydramine)/.test(text)) return 'antihistamine';
  if (/(omeprazole|pantoprazole|lansoprazole|esomeprazole)/.test(text)) return 'proton_pump_inhibitor';
  if (/(metformin|insulin|glipizide|glyburide|sitagliptin)/.test(text)) return 'antidiabetic';
  if (/(ibuprofen|naproxen|diclofenac|meloxicam|celecoxib|aspirin)/.test(text)) return 'nsaid';
  if (/(acetaminophen|paracetamol|tramadol|morphine|oxycodone|hydrocodone)/.test(text)) return 'analgesic';
  return 'other';
}

function inferDosageForm(category) {
  if (category === 'bronchodilator') return 'inhaler';
  if (category === 'antibiotic') return 'tablet_or_capsule';
  return 'various';
}

async function enrichDrugRecords(drugs, config, report) {
  const enrichLimit = Math.min(drugs.length, Math.max(0, config.drugEnrichLimit || 0));
  let openFdaMatches = 0;
  let wikipediaMatches = 0;

  for (let index = 0; index < drugs.length; index += 1) {
    const drug = drugs[index];

    if (index < enrichLimit) {
      if (await enrichDrugFromOpenFdaLabel(drug, report)) openFdaMatches += 1;
      await sleep(Math.max(100, Math.floor(config.requestDelayMs / 2)));

      if (await enrichDrugFromWikipedia(drug, report)) wikipediaMatches += 1;
      await sleep(Math.max(100, Math.floor(config.requestDelayMs / 2)));
    } else {
      addDrugReviewFlag(
        drug,
        `Network enrichment skipped by limit (${config.drugEnrichLimit}); keep lookup refs for manual review.`,
      );
    }
  }

  report.sources.push({ source: 'DrugBank', detail: 'candidate lookup URLs generated', records: drugs.length });
  report.sources.push({ source: 'CTDbase', detail: 'candidate lookup URLs generated', records: drugs.length });
  report.sources.push({ source: 'DAV', detail: 'candidate lookup URLs generated', records: drugs.length });
  report.enrichment = {
    total_drugs: drugs.length,
    network_enriched_drugs: enrichLimit,
    openfda_label_matches: openFdaMatches,
    wikipedia_summary_matches: wikipediaMatches,
    drugbank_lookup_candidates: drugs.length,
    ctdbase_lookup_candidates: drugs.length,
    dav_lookup_candidates: drugs.length,
  };
}

async function enrichDrugFromOpenFdaLabel(drug, report) {
  const searchTerms = Array.from(
    new Set(
      [drug.generic_name, drug.name]
        .map((value) => normalizeTitle(value).replace(/"/g, ''))
        .filter(Boolean),
    ),
  );

  for (const term of searchTerms) {
    const queries = [
      `openfda.generic_name.exact:"${term}"`,
      `openfda.substance_name.exact:"${term}"`,
      `openfda.brand_name.exact:"${term}"`,
    ];

    for (const query of queries) {
      try {
        const url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(query)}&limit=1`;
        const data = await fetchJson(url);
        const result = data?.results?.[0];
        if (!result) continue;

        const indication = firstNonEmptyLabelField(result, [
          'indications_and_usage',
          'purpose',
          'description',
          'mechanism_of_action',
        ]);
        const contraindications = firstNonEmptyLabelField(result, [
          'contraindications',
          'do_not_use',
          'warnings',
          'warnings_and_cautions',
          'boxed_warning',
          'stop_use',
        ]);
        const brandNames = Array.isArray(result?.openfda?.brand_name)
          ? Array.from(new Set(result.openfda.brand_name)).slice(0, 5)
          : [];

        if (indication && isGenericDrugDescription(drug.description)) {
          drug.description = indication;
        }
        if (contraindications && isDefaultContraindications(drug)) {
          drug.contraindications = contraindications;
        }
        if (brandNames.length) {
          addDrugReviewFlag(drug, `openFDA label brand names: ${brandNames.join(', ')}`);
        }

        drug._lookup_refs.openfda_label_search_url = url;
        addDrugSourceNote(drug, 'openFDA label', `Matched label by query ${query}`);
        return true;
      } catch (error) {
        const status = error.response?.status;
        if (status === 404) continue;
        if (status === 429) {
          report.warnings.push(`openFDA label rate-limited while enriching ${drug.name}.`);
          return false;
        }
        report.warnings.push(`openFDA label lookup failed for ${drug.name}: ${error.message}`);
        return false;
      }
    }
  }

  return false;
}

async function enrichDrugFromWikipedia(drug, report) {
  for (const title of buildWikipediaTitles(drug)) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const data = await fetchJson(url);
      const extract = truncateText(data?.extract, 320);
      if (!extract) continue;
      if (String(data?.type || '').toLowerCase() === 'disambiguation') continue;

      if (isGenericDrugDescription(drug.description)) {
        drug.description = extract;
      }
      if (data?.content_urls?.desktop?.page) {
        drug._lookup_refs.wikipedia_page_url = data.content_urls.desktop.page;
      }
      drug._lookup_refs.wikipedia_summary_url = url;
      addDrugSourceNote(drug, 'Wikipedia summary', `Matched summary page ${data?.title || title}`);
      return true;
    } catch (error) {
      const status = error.response?.status;
      if (status === 404) continue;
      if (status === 429) {
        report.warnings.push(`Wikipedia summary rate-limited while enriching ${drug.name}.`);
        return false;
      }
      report.warnings.push(`Wikipedia summary lookup failed for ${drug.name}: ${error.message}`);
      return false;
    }
  }

  return false;
}

async function crawlSymptoms(config, report) {
  const symptoms = new Map();

  for (const [code, name, icd10, description] of LOCAL_SYMPTOMS) {
    symptoms.set(code, {
      code,
      name,
      icd10_code: icd10,
      description,
      source: 'Local curated Vietnamese',
    });
  }

  const ebiSymptoms = await crawlEbiSymptoms(report);
  for (const symptom of ebiSymptoms) {
    if (!symptoms.has(symptom.code)) symptoms.set(symptom.code, symptom);
  }

  for (const category of SYMPTOM_CATEGORIES) {
    if (symptoms.size >= config.minSymptoms + 80) break;
    try {
      const titles = await crawlWikipediaCategory(category, 500, report);
      for (const rawTitle of titles) {
        const name = normalizeTitle(rawTitle);
        if (isBadTitle(name, 'symptom')) continue;
        const code = slugify(name, 'symptom');
        if (!symptoms.has(code)) {
          symptoms.set(code, {
            code,
            name: name.slice(0, 100),
            icd10_code: '',
            description: `Scraped from ${category} on Wikipedia.`,
            source: 'Wikipedia',
          });
        }
      }
    } catch (error) {
      report.warnings.push(`Wikipedia symptom category failed (${category}): ${error.message}`);
    }
  }

  return Array.from(symptoms.values()).slice(0, Math.max(config.minSymptoms, symptoms.size));
}

async function crawlEbiSymptoms(report) {
  const symptoms = new Map();
  let fetched = 0;

  for (const query of EBI_SYMPTOM_QUERIES) {
    try {
      const url = new URL('https://www.ebi.ac.uk/ols4/api/search');
      url.searchParams.set('q', query);
      url.searchParams.set('rows', '60');
      const data = await fetchJson(url.toString());
      const docs = data.response?.docs || [];
      fetched += docs.length;

      for (const doc of docs) {
        const label = normalizeTitle(doc.label);
        if (!label || isBadTitle(label, 'symptom')) continue;
        const text = `${label} ${(doc.description || []).join(' ')}`.toLowerCase();
        const looksClinical =
          text.includes('symptom') ||
          text.includes('pain') ||
          text.includes('fever') ||
          text.includes('cough') ||
          text.includes('edema') ||
          text.includes('dyspnea') ||
          text.includes('nausea') ||
          text.includes('rash');
        if (!looksClinical) continue;

        const code = slugify(label, 'ebi_symptom');
        if (!symptoms.has(code)) {
          symptoms.set(code, {
            code,
            name: label.slice(0, 100),
            icd10_code: '',
            description: (doc.description || [])[0] || `Clinical term from EBI OLS (${doc.ontology_name || 'ontology'}).`,
            source: 'EBI OLS',
          });
        }
      }
      await sleep(DEFAULTS.requestDelayMs);
    } catch (error) {
      report.warnings.push(`EBI OLS symptom search failed (${query}): ${error.message}`);
    }
  }

  report.sources.push({ source: 'EBI OLS', detail: 'symptom search terms', records: symptoms.size, fetched });
  return Array.from(symptoms.values());
}

async function crawlBestEffortSources(report) {
  report.sources.push({
    source: 'DrugBank',
    detail: 'lookup workflow enabled via generated review URLs; automated scraping kept best-effort only',
    records: 1,
  });
  report.sources.push({
    source: 'CTDbase',
    detail: 'lookup workflow enabled via generated review URLs; automated scraping kept best-effort only',
    records: 1,
  });
  report.sources.push({
    source: 'DAV',
    detail: 'lookup workflow enabled via generated review URLs; automated scraping kept best-effort only',
    records: 1,
  });
  try {
    const data = await fetchJson('https://www.ebi.ac.uk/ols4/api/ontologies');
    const count = Array.isArray(data?._embedded?.ontologies) ? data._embedded.ontologies.length : 1;
    report.sources.push({ source: 'EBI', detail: 'OLS API status check', records: count });
  } catch (error) {
    report.warnings.push(`EBI API status check failed: ${error.message}`);
  }
}

function defaultContraindications(category, name) {
  const fallback = `Không dùng nếu dị ứng với ${name}. Cần tham khảo bác sĩ hoặc dược sĩ trước khi sử dụng.`;
  const byCategory = {
    antibiotic: 'Không tự ý sử dụng; chỉ dùng khi được kê đơn và không dùng nếu dị ứng với nhóm kháng sinh tương ứng.',
    nsaid: 'Không dùng khi loét dạ dày đang tiến triển, suy thận nặng, dị ứng NSAID hoặc ở cuối thai kỳ.',
    analgesic: 'Thận trọng khi bệnh gan nặng, có nguy cơ quá liều hoặc dị ứng hoạt chất.',
    anticoagulant: 'Không dùng khi đang chảy máu hoặc có nguy cơ chảy máu cao nếu chưa được bác sĩ theo dõi.',
    antiplatelet: 'Không dùng khi đang chảy máu hoặc dị ứng nghiêm trọng nếu chưa được kê đơn.',
    corticosteroid: 'Thận trọng khi nhiễm trùng chưa kiểm soát, tiểu đường hoặc sử dụng kéo dài.',
    bronchodilator: 'Thận trọng khi bệnh tim không ổn định, rối loạn nhịp hoặc cường giáp.',
    antidiabetic: 'Thận trọng khi suy gan, suy thận hoặc có nguy cơ hạ đường huyết.',
  };
  return byCategory[category] || fallback;
}

function generateMappings(symptoms, drugs, minMappings) {
  const mappings = [];
  const seen = new Set();
  const drugsByCategory = new Map();

  for (const drug of drugs) {
    if (!drugsByCategory.has(drug.category)) drugsByCategory.set(drug.category, []);
    drugsByCategory.get(drug.category).push(drug);
  }

  const addMapping = (symptom, drug, score, notes) => {
    const key = `${symptom.code}|${drug.name.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    mappings.push({
      symptom_code: symptom.code,
      drug_name: drug.name,
      confidence_score: Number(score.toFixed(2)),
      notes,
    });
  };

  const symptomsByCode = new Map(symptoms.map((symptom) => [symptom.code, symptom]));
  for (const drug of drugs) {
    const symptomCodes = CATEGORY_SYMPTOM_MAPPINGS[drug.category] || [];
    for (const symptomCode of symptomCodes) {
      const symptom = symptomsByCode.get(symptomCode);
      if (!symptom) continue;
      const score = drug.category === 'antibiotic' ? 0.4 : 0.62;
      const note = drug.category === 'antibiotic'
        ? 'Category mapping only; antibiotic requires confirmed diagnosis and prescription.'
        : `Curated category mapping: ${drug.category}`;
      addMapping(symptom, drug, score, note);
    }
  }

  for (const symptom of symptoms) {
    const text = `${symptom.code} ${symptom.name}`.toLowerCase();
    for (const [keywords, categories, score] of MAPPING_RULES) {
      if (!keywords.some((keyword) => text.includes(keyword))) continue;
      for (const category of categories) {
        for (const drug of (drugsByCategory.get(category) || []).slice(0, 5)) {
          addMapping(symptom, drug, score, `Auto-mapped by keyword/category rule: ${category}`);
        }
      }
    }
  }

  const commonCategories = ['analgesic', 'nsaid', 'antihistamine', 'antibiotic', 'proton_pump_inhibitor', 'antiemetic'];
  const commonDrugs = drugs.filter((drug) => commonCategories.includes(drug.category));
  for (const symptom of symptoms) {
    if (mappings.length >= minMappings) break;
    for (const drug of commonDrugs) {
      if (mappings.length >= minMappings) break;
      addMapping(symptom, drug, 0.55, 'Fallback mapping for baseline recommendation coverage.');
    }
  }

  return mappings;
}

async function writeCsv(filePath, headers, rows) {
  const writer = createObjectCsvWriter({
    path: filePath,
    header: headers.map((id) => ({ id, title: id })),
    encoding: 'utf8',
  });
  await writer.writeRecords(rows);
}

function sqlString(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildSql(symptoms, drugs, mappings) {
  const symptomValues = symptoms
    .map((s) => `  (${sqlString(s.code)}, ${sqlString(s.name)}, ${sqlString(s.icd10_code)}, ${sqlString(s.description)})`)
    .join(',\n');
  const drugValues = drugs
    .map(
      (d) =>
        `  (${sqlString(d.name)}, ${sqlString(d.generic_name)}, ${sqlString(d.category)}, ${sqlString(d.dosage_form)}, ${sqlString(d.contraindications)}, ${sqlString(d.description)})`,
    )
    .join(',\n');
  const mappingValues = mappings
    .map((m) => `  (${sqlString(m.symptom_code)}, ${sqlString(m.drug_name)}, ${Number(m.confidence_score)})`)
    .join(',\n');

  return [
    '-- MedAssist scrape-more repair/import',
    '-- Generated by scripts/scrape-more-medical-data.js',
    '-- Safe when symptoms already exist and when drugs were imported from CSV.',
    '-- No table is dropped and no existing drug is deleted.',
    '',
    'WITH incoming(code, name, icd10_code, description) AS (',
    'VALUES',
    symptomValues,
    '), updated AS (',
    '  UPDATE symptoms s',
    '  SET name = i.name,',
    '      description = i.description,',
    '      icd10_code = CASE',
    '        WHEN i.icd10_code IS NULL THEN s.icd10_code',
    '        WHEN NOT EXISTS (',
    '          SELECT 1 FROM symptoms other',
    '          WHERE other.icd10_code = i.icd10_code AND other.id <> s.id',
    '        ) THEN i.icd10_code',
    '        ELSE s.icd10_code',
    '      END',
    '  FROM incoming i',
    '  WHERE s.code = i.code',
    '  RETURNING s.code',
    ')',
    'INSERT INTO symptoms (code, name, icd10_code, description)',
    'SELECT i.code, i.name, i.icd10_code, i.description',
    'FROM incoming i',
    'WHERE NOT EXISTS (SELECT 1 FROM symptoms s WHERE s.code = i.code)',
    '  AND (',
    '    i.icd10_code IS NULL',
    '    OR NOT EXISTS (SELECT 1 FROM symptoms s WHERE s.icd10_code = i.icd10_code)',
    '  );',
    '',
    'WITH incoming(name, generic_name, category, dosage_form, contraindications, description) AS (',
    'VALUES',
    drugValues,
    ')',
    'INSERT INTO drugs (name, generic_name, category, dosage_form, contraindications, description)',
    'SELECT i.name, i.generic_name, i.category, i.dosage_form, i.contraindications, i.description',
    'FROM incoming i',
    'WHERE NOT EXISTS (',
    '  SELECT 1 FROM drugs d',
    '  WHERE LOWER(BTRIM(d.name)) = LOWER(BTRIM(i.name))',
    ');',
    '',
    'WITH incoming(symptom_code, drug_name, confidence_score) AS (',
    'VALUES',
    mappingValues,
    ')',
    'INSERT INTO drug_symptoms (drug_id, symptom_id, confidence_score)',
    'SELECT d.id, s.id, v.confidence_score',
    'FROM incoming v',
    'JOIN symptoms s ON s.code = v.symptom_code',
    'JOIN LATERAL (',
    '  SELECT d0.id',
    '  FROM drugs d0',
    '  WHERE LOWER(BTRIM(d0.name)) = LOWER(BTRIM(v.drug_name))',
    '  ORDER BY d0.created_at NULLS LAST, d0.id',
    '  LIMIT 1',
    ') d ON TRUE',
    'ON CONFLICT (drug_id, symptom_id) DO UPDATE SET',
    '  confidence_score = EXCLUDED.confidence_score;',
    '',
    "SELECT 'symptoms' AS table_name, COUNT(*) AS total FROM symptoms",
    "UNION ALL SELECT 'drugs', COUNT(*) FROM drugs",
    "UNION ALL SELECT 'drug_symptoms', COUNT(*) FROM drug_symptoms;",
    '',
  ].join('\n');
}

function summarizeSources(records) {
  return records.reduce((acc, record) => {
    acc[record.source] = (acc[record.source] || 0) + 1;
    return acc;
  }, {});
}

function buildDrugReviewRows(drugs) {
  return drugs.map((drug) => ({
    name: drug.name,
    generic_name: drug.generic_name,
    category: drug.category,
    dosage_form: drug.dosage_form,
    merged_sources: (drug._source_tags || []).join(' | '),
    description: drug.description,
    contraindications: drug.contraindications,
    source_notes: (drug._source_notes || []).join(' || '),
    review_flags: (drug._review_flags || []).join(' | '),
    openfda_label_search_url: drug._lookup_refs?.openfda_label_search_url || '',
    wikipedia_summary_url: drug._lookup_refs?.wikipedia_summary_url || '',
    wikipedia_page_url: drug._lookup_refs?.wikipedia_page_url || '',
    drugbank_search_url: drug._lookup_refs?.drugbank_search_url || '',
    ctdbase_search_url: drug._lookup_refs?.ctdbase_search_url || '',
    dav_lookup_url: drug._lookup_refs?.dav_lookup_url || '',
    dav_otc_lookup_url: drug._lookup_refs?.dav_otc_lookup_url || '',
  }));
}

function parseFirstCsvColumn(line) {
  if (!line) return '';
  if (!line.startsWith('"')) return line.split(',')[0].trim();
  let value = '';
  for (let index = 1; index < line.length; index += 1) {
    if (line[index] === '"' && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (line[index] === '"') {
      break;
    } else {
      value += line[index];
    }
  }
  return value.trim();
}

function readCsvNames(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .slice(1)
    .map(parseFirstCsvColumn)
    .filter(Boolean);
}

function buildCleanupSql(cleanupNames) {
  const cleanupValues = cleanupNames.map((name) => `  (${sqlString(name)})`).join(',\n');
  return [
    '-- Cleanup for the previous low-quality Wikipedia drug batch.',
    '-- Each statement is self-contained for Supabase SQL Editor.',
    '-- Original curated drugs and referenced drugs are protected.',
    '',
    '-- Preview rows targeted by this cleanup.',
    'WITH bad_names(name) AS (',
    'VALUES',
    cleanupValues,
    ')',
    'SELECT d.id, d.name, d.created_at',
    'FROM drugs d',
    'JOIN bad_names b ON LOWER(BTRIM(b.name)) = LOWER(BTRIM(d.name))',
    'ORDER BY d.name;',
    '',
    '-- Delete only unreferenced rows from that exact scraped batch.',
    'WITH bad_names(name) AS (',
    'VALUES',
    cleanupValues,
    ')',
    'DELETE FROM drugs d',
    'USING bad_names b',
    'WHERE LOWER(BTRIM(b.name)) = LOWER(BTRIM(d.name))',
    '  AND NOT EXISTS (SELECT 1 FROM drug_symptoms ds WHERE ds.drug_id = d.id)',
    '  AND NOT EXISTS (SELECT 1 FROM allergies a WHERE a.drug_id = d.id)',
    'RETURNING d.id, d.name;',
    '',
  ].join('\n');
}

function upgradeExistingCleanupSql(outputDir) {
  const cleanupPath = path.join(outputDir, 'cleanup_previous_scrape.sql');
  if (!fs.existsSync(cleanupPath)) return;
  const currentSql = fs.readFileSync(cleanupPath, 'utf8');
  if (!currentSql.includes('tmp_bad_scraped_drug_names')) return;

  const cleanupNames = Array.from(currentSql.matchAll(/^\s*\('((?:''|[^'])*)'\)[,;]?$/gm))
    .map((match) => match[1].replace(/''/g, "'"));
  if (cleanupNames.length) {
    fs.writeFileSync(cleanupPath, buildCleanupSql(cleanupNames), 'utf8');
  }
}

function preservePreviousScrapeCleanup(outputDir) {
  const reportPath = path.join(outputDir, 'scrape_report.json');
  const previousCsvPath = path.join(outputDir, 'drugs_scraped.csv');
  if (!fs.existsSync(reportPath) || !fs.existsSync(previousCsvPath)) return;

  let previousReport;
  try {
    previousReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch {
    return;
  }

  if (!previousReport.record_sources?.drugs?.Wikipedia) return;

  const originalCsvPath = path.resolve(__dirname, '../data/crawled/drugs_crawled.csv');
  const protectedNames = new Set([
    ...LOCAL_DRUGS.map(([name]) => name.toLowerCase()),
    ...readCsvNames(originalCsvPath).map((name) => name.toLowerCase()),
  ]);
  const cleanupNames = readCsvNames(previousCsvPath).filter(
    (name) => !protectedNames.has(name.toLowerCase()),
  );
  if (!cleanupNames.length) return;

  fs.writeFileSync(
    path.join(outputDir, 'cleanup_previous_scrape.sql'),
    buildCleanupSql(cleanupNames),
    'utf8',
  );
}

async function main() {
  const config = parseArgs();
  const report = {
    generated_at: new Date().toISOString(),
    minimums: {
      drugs: config.minDrugs,
      symptoms: config.minSymptoms,
      mappings: config.minMappings,
      drug_network_enrichment: config.drugEnrichLimit,
    },
    sources: [],
    warnings: [],
  };

  fs.mkdirSync(config.outputDir, { recursive: true });
  upgradeExistingCleanupSql(config.outputDir);
  preservePreviousScrapeCleanup(config.outputDir);

  console.log('MedAssist scrape-more seed data');
  console.log(`Output dir: ${config.outputDir}`);

  await crawlBestEffortSources(report);
  const symptoms = await crawlSymptoms(config, report);
  const drugs = await crawlDrugs(config, report);
  const mappings = generateMappings(symptoms, drugs, config.minMappings);

  report.counts = { symptoms: symptoms.length, drugs: drugs.length, drug_symptoms: mappings.length };
  report.record_sources = { symptoms: summarizeSources(symptoms), drugs: summarizeSources(drugs) };
  report.merged_record_sources = { drugs: summarizeMergedDrugSources(drugs) };
  if (symptoms.length < config.minSymptoms || drugs.length < config.minDrugs || mappings.length < config.minMappings) {
    report.warnings.push('Generated data did not reach one or more configured minimums.');
  }

  const newSymptomsOnly = symptoms.filter((symptom) => symptom.source !== 'Local curated Vietnamese');
  await writeCsv(
    path.join(config.outputDir, 'symptoms_scraped.csv'),
    ['code', 'name', 'icd10_code', 'description'],
    newSymptomsOnly,
  );
  await writeCsv(
    path.join(config.outputDir, 'drugs_scraped.csv'),
    ['name', 'generic_name', 'category', 'dosage_form', 'contraindications', 'description'],
    drugs,
  );
  await writeCsv(
    path.join(config.outputDir, 'drug_symptom_mappings_review.csv'),
    ['symptom_code', 'drug_name', 'confidence_score', 'notes'],
    mappings,
  );
  await writeCsv(
    path.join(config.outputDir, 'drug_sources_review.csv'),
    [
      'name',
      'generic_name',
      'category',
      'dosage_form',
      'merged_sources',
      'description',
      'contraindications',
      'source_notes',
      'review_flags',
      'openfda_label_search_url',
      'wikipedia_summary_url',
      'wikipedia_page_url',
      'drugbank_search_url',
      'ctdbase_search_url',
      'dav_lookup_url',
      'dav_otc_lookup_url',
    ],
    buildDrugReviewRows(drugs),
  );

  const obsoleteMappingCsv = path.join(config.outputDir, 'drug_symptoms_scraped.csv');
  if (fs.existsSync(obsoleteMappingCsv)) fs.rmSync(obsoleteMappingCsv);

  fs.writeFileSync(path.join(config.outputDir, 'scrape_import.sql'), buildSql(symptoms, drugs, mappings), 'utf8');
  fs.writeFileSync(path.join(config.outputDir, 'drugs_enriched.json'), JSON.stringify(drugs, null, 2), 'utf8');
  fs.writeFileSync(path.join(config.outputDir, 'scrape_report.json'), JSON.stringify(report, null, 2), 'utf8');

  console.log('Done.');
  console.log(`Symptoms: ${symptoms.length}`);
  console.log(`Drugs: ${drugs.length}`);
  console.log(`Drug symptoms: ${mappings.length}`);
  if (report.warnings.length) {
    console.log('Warnings:');
    for (const warning of report.warnings) console.log(`- ${warning}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
