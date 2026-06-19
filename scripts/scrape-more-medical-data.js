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
const cheerio = require('cheerio');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULTS = {
  minDrugs: 220,
  minSymptoms: 220,
  minMappings: 320,
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
  ['sot', 'Fever', 'R50'],
  ['dau_dau', 'Headache', 'R51'],
  ['ho', 'Cough', 'R05'],
  ['met_moi', 'Fatigue', 'R53'],
  ['buon_non', 'Nausea', 'R11'],
  ['dau_bung', 'Abdominal pain', 'R10'],
  ['kho_tho', 'Shortness of breath', 'R06'],
  ['chay_mui', 'Runny nose', 'R09.8'],
  ['dau_hong', 'Sore throat', 'J02'],
  ['tieu_chay', 'Diarrhea', 'A09'],
  ['tao_bon', 'Constipation', 'K59.0'],
  ['chong_mat', 'Dizziness', 'R42'],
  ['mat_ngu', 'Insomnia', 'G47.0'],
  ['dau_lung', 'Back pain', 'M54'],
  ['dau_khop', 'Joint pain', 'M25.5'],
  ['phat_ban', 'Rash', 'R21'],
  ['ngua', 'Itching', 'L29'],
  ['sut_can', 'Weight loss', 'R63.4'],
  ['an_khong_ngon', 'Loss of appetite', 'R63.0'],
  ['dau_nguc', 'Chest pain', 'R07'],
];

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
    const exact = ['drug', 'medication', 'pharmaceutical', 'therapy', 'treatment', 'medicine', 'clinical trial', 'law'];
    return exact.includes(text);
  }
  if (type === 'symptom') {
    return ['signs and symptoms', 'medical sign', 'symptom'].includes(text);
  }
  return false;
}

async function fetchJson(url) {
  const response = await http.get(url, { responseType: 'json' });
  return response.data;
}

async function fetchText(url) {
  const response = await http.get(url, { responseType: 'text' });
  return response.data;
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
  for (const [category, type, dosage] of DRUG_CATEGORIES) {
    if (drugs.size >= config.minDrugs + 80) break;
    try {
      const titles = await crawlWikipediaCategory(category, 500, report);
      for (const rawTitle of titles) {
        const name = normalizeTitle(rawTitle);
        if (isBadTitle(name, 'drug')) continue;
        const key = name.toLowerCase();
        if (!drugs.has(key)) {
          drugs.set(key, {
            name,
            generic_name: name,
            category: type,
            dosage_form: dosage,
            contraindications: defaultContraindications(type, name),
            description: `Scraped from ${category} on Wikipedia.`,
            source: 'Wikipedia',
          });
        }
      }
    } catch (error) {
      report.warnings.push(`Wikipedia drug category failed (${category}): ${error.message}`);
    }
  }

  for (const [name, category, dosage] of LOCAL_DRUGS) {
    const key = name.toLowerCase();
    if (!drugs.has(key)) {
      drugs.set(key, {
        name,
        generic_name: name,
        category,
        dosage_form: dosage,
        contraindications: defaultContraindications(category, name),
        description: 'Local curated fallback drug used by MedAssist.',
        source: 'Local fallback',
      });
    }
  }

  return Array.from(drugs.values()).slice(0, Math.max(config.minDrugs, drugs.size));
}

async function crawlSymptoms(config, report) {
  const symptoms = new Map();

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

  for (const [code, name, icd10] of LOCAL_SYMPTOMS) {
    if (!symptoms.has(code)) {
      symptoms.set(code, {
        code,
        name,
        icd10_code: icd10,
        description: 'Local curated fallback symptom used by MedAssist.',
        source: 'Local fallback',
      });
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
            description: `Scraped from EBI OLS search (${doc.ontology_name || 'ontology'}).`,
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
  await statusPage('DrugBank', 'https://www.drugbank.com/drugs/DB00316', report);
  await statusPage('CTDbase', 'https://ctdbase.org/detail.go?type=chem&acc=D000082', report);
  await statusPage('DAV', 'https://dav.gov.vn/', report);
  try {
    const data = await fetchJson('https://www.ebi.ac.uk/ols4/api/ontologies');
    const count = Array.isArray(data?._embedded?.ontologies) ? data._embedded.ontologies.length : 1;
    report.sources.push({ source: 'EBI', detail: 'OLS API status check', records: count });
  } catch (error) {
    report.warnings.push(`EBI API status check failed: ${error.message}`);
  }
}

async function statusPage(source, url, report) {
  try {
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    const title = $('h1').first().text().trim() || $('title').text().trim();
    report.sources.push({ source, detail: 'public page status check', records: title ? 1 : 0 });
  } catch (error) {
    report.warnings.push(`${source} public page unavailable for script access: ${error.message}`);
  }
}

function defaultContraindications(category, name) {
  const fallback = `Do not use if allergic to ${name}. Consult a doctor before use.`;
  const byCategory = {
    antibiotic: 'Avoid self-medication; use only when prescribed. Do not use if allergic to this antibiotic class.',
    nsaid: 'Avoid in active gastric ulcer, severe kidney disease, NSAID allergy, and late pregnancy.',
    analgesic: 'Use caution in severe liver disease, overdose risk, or allergy to the active ingredient.',
    anticoagulant: 'Avoid in active bleeding or high bleeding risk unless prescribed and monitored.',
    antiplatelet: 'Avoid in active bleeding or severe allergy unless prescribed.',
    corticosteroid: 'Use caution with uncontrolled infection, diabetes, or long-term unsupervised use.',
    bronchodilator: 'Use caution with unstable heart disease, arrhythmia, or uncontrolled hyperthyroidism.',
    antidiabetic: 'Use caution with kidney/liver disease and hypoglycemia risk.',
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
  return [
    '-- MedAssist scrape-more import',
    '-- Generated by scripts/scrape-more-medical-data.js',
    '-- Safe to run multiple times in Supabase SQL Editor.',
    '',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_drugs_name_unique ON drugs(name);',
    '',
    'INSERT INTO symptoms (code, name, icd10_code, description) VALUES',
    symptoms
      .map((s) => `  (${sqlString(s.code)}, ${sqlString(s.name)}, ${sqlString(s.icd10_code)}, ${sqlString(s.description)})`)
      .join(',\n') +
      '\nON CONFLICT (code) DO UPDATE SET\n  name = EXCLUDED.name,\n  icd10_code = COALESCE(EXCLUDED.icd10_code, symptoms.icd10_code),\n  description = EXCLUDED.description;',
    '',
    'INSERT INTO drugs (name, generic_name, category, dosage_form, contraindications, description) VALUES',
    drugs
      .map(
        (d) =>
          `  (${sqlString(d.name)}, ${sqlString(d.generic_name)}, ${sqlString(d.category)}, ${sqlString(d.dosage_form)}, ${sqlString(d.contraindications)}, ${sqlString(d.description)})`,
      )
      .join(',\n') +
      '\nON CONFLICT (name) DO UPDATE SET\n  generic_name = EXCLUDED.generic_name,\n  category = EXCLUDED.category,\n  dosage_form = EXCLUDED.dosage_form,\n  contraindications = EXCLUDED.contraindications,\n  description = EXCLUDED.description;',
    '',
    'INSERT INTO drug_symptoms (drug_id, symptom_id, confidence_score)',
    'SELECT d.id, s.id, v.confidence_score',
    'FROM (VALUES',
    mappings.map((m) => `  (${sqlString(m.symptom_code)}, ${sqlString(m.drug_name)}, ${Number(m.confidence_score)})`).join(',\n'),
    ') AS v(symptom_code, drug_name, confidence_score)',
    'JOIN symptoms s ON s.code = v.symptom_code',
    'JOIN drugs d ON d.name = v.drug_name',
    'ON CONFLICT (drug_id, symptom_id) DO UPDATE SET',
    '  confidence_score = EXCLUDED.confidence_score;',
    '',
  ].join('\n');
}

function summarizeSources(records) {
  return records.reduce((acc, record) => {
    acc[record.source] = (acc[record.source] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  const config = parseArgs();
  const report = {
    generated_at: new Date().toISOString(),
    minimums: { drugs: config.minDrugs, symptoms: config.minSymptoms, mappings: config.minMappings },
    sources: [],
    warnings: [],
  };

  fs.mkdirSync(config.outputDir, { recursive: true });

  console.log('MedAssist scrape-more seed data');
  console.log(`Output dir: ${config.outputDir}`);

  await crawlBestEffortSources(report);
  const symptoms = await crawlSymptoms(config, report);
  const drugs = await crawlDrugs(config, report);
  const mappings = generateMappings(symptoms, drugs, config.minMappings);

  report.counts = { symptoms: symptoms.length, drugs: drugs.length, drug_symptoms: mappings.length };
  report.record_sources = { symptoms: summarizeSources(symptoms), drugs: summarizeSources(drugs) };
  if (symptoms.length < config.minSymptoms || drugs.length < config.minDrugs || mappings.length < config.minMappings) {
    report.warnings.push('Generated data did not reach one or more configured minimums.');
  }

  await writeCsv(path.join(config.outputDir, 'symptoms_scraped.csv'), ['code', 'name', 'icd10_code', 'description'], symptoms);
  await writeCsv(
    path.join(config.outputDir, 'drugs_scraped.csv'),
    ['name', 'generic_name', 'category', 'dosage_form', 'contraindications', 'description'],
    drugs,
  );
  await writeCsv(
    path.join(config.outputDir, 'drug_symptoms_scraped.csv'),
    ['symptom_code', 'drug_name', 'confidence_score', 'notes'],
    mappings,
  );

  fs.writeFileSync(path.join(config.outputDir, 'scrape_import.sql'), buildSql(symptoms, drugs, mappings), 'utf8');
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
