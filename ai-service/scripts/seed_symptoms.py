#!/usr/bin/env python3
"""
MedAssist – Symptom Data Seeder
================================
Thu thập dữ liệu triệu chứng từ nhiều nguồn:
  1. NIH Clinical Tables  – ICD-10-CM Chapter R (Symptoms/Signs)
  2. openFDA              – MedDRA reaction terms từ adverse-event reports
  3. Wikidata SPARQL      – triệu chứng được liên kết với bệnh (Q169872)
  4. Curated Vietnamese   – bộ triệu chứng phổ biến + dịch tiếng Việt

Output: ai-service/data/symptoms/symptoms.json
"""

import asyncio
import json
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional

import httpx

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent          # ai-service/
OUT_DIR = ROOT / "data" / "symptoms"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = OUT_DIR / "symptoms.json"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("seed_symptoms")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
HEADERS = {"User-Agent": "MedAssist-Seeder/1.0 (educational project)"}

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")


# ===========================================================================
# SOURCE 1 – NIH Clinical Tables  (ICD-10-CM)
# ===========================================================================
# Chapter R (R00–R99) = "Symptoms, signs and abnormal clinical and laboratory findings"
# Chapter Z (Z00–Z99) có một số triệu chứng liên quan
NIH_BASE = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search"

# Các prefix ICD-10 liên quan đến triệu chứng
SYMPTOM_PREFIXES = [
    # R-chapter – Symptoms and signs
    "R0", "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9",
    # G-chapter – neurological symptoms
    "G43", "G44", "G45", "G47",
    # M-chapter – musculoskeletal pain/symptoms
    "M54", "M79",
    # K-chapter – GI symptoms
    "K21", "K30", "K58", "K59",
    # J-chapter – respiratory symptoms  
    "J06", "J20", "J44",
    # N-chapter – urinary symptoms
    "N39", "N40",
]

async def fetch_nih_prefix(client: httpx.AsyncClient, prefix: str) -> list[dict]:
    """Lấy tất cả ICD-10 codes bắt đầu bằng prefix."""
    params = {
        "sf": "code,name",
        "df": "code,name",
        "terms": prefix,
        "maxList": 500,
    }
    try:
        r = await client.get(NIH_BASE, params=params, headers=HEADERS, timeout=15)
        r.raise_for_status()
        data = r.json()
        # Format: [total, [codes...], null, [[code, name], ...]]
        if not data or len(data) < 4 or not data[3]:
            return []
        results = []
        for item in data[3]:
            if len(item) >= 2:
                code, name = item[0], item[1]
                results.append({
                    "code": code,
                    "name_en": name,
                    "source": "NIH-ICD10CM",
                    "icd10_code": code,
                })
        return results
    except Exception as e:
        log.warning(f"NIH prefix={prefix} failed: {e}")
        return []


async def source_nih() -> list[dict]:
    log.info("📡 [1/4] NIH Clinical Tables – ICD-10-CM symptoms…")
    async with httpx.AsyncClient() as client:
        tasks = [fetch_nih_prefix(client, p) for p in SYMPTOM_PREFIXES]
        results_nested = await asyncio.gather(*tasks)

    all_items = []
    seen_codes = set()
    for batch in results_nested:
        for item in batch:
            if item["code"] not in seen_codes:
                seen_codes.add(item["code"])
                all_items.append(item)

    log.info(f"  → {len(all_items)} ICD-10 symptoms từ NIH")
    return all_items


# ===========================================================================
# SOURCE 2 – openFDA  (MedDRA adverse-event reaction terms)
# ===========================================================================
FDA_BASE = "https://api.fda.gov/drug/event.json"

# Terms phổ biến để lấy MedDRA reaction terms
FDA_SEARCH_TERMS = [
    "headache", "fever", "nausea", "vomiting", "dizziness", "fatigue",
    "pain", "rash", "dyspnea", "cough", "diarrhea", "constipation",
    "anxiety", "insomnia", "pruritus", "edema", "hypertension",
    "hypotension", "tachycardia", "bradycardia", "syncope",
    "tremor", "seizure", "depression", "confusion", "chest+pain",
    "back+pain", "abdominal+pain", "arthralgia", "myalgia",
    "alopecia", "acne", "urticaria", "dysphagia", "palpitations",
    "weight+gain", "weight+loss", "anorexia", "malaise",
]

async def fetch_fda_count(client: httpx.AsyncClient, term: str) -> list[str]:
    """Lấy top MedDRA reaction terms liên quan."""
    params = {
        "search": f'patient.reaction.reactionmeddrapt:"{term}"',
        "count": "patient.reaction.reactionmeddrapt.exact",
        "limit": 50,
    }
    try:
        r = await client.get(FDA_BASE, params=params, headers=HEADERS, timeout=20)
        if r.status_code == 404:
            return []
        r.raise_for_status()
        data = r.json()
        results = data.get("results", [])
        return [item["term"] for item in results if "term" in item]
    except Exception as e:
        log.warning(f"  FDA term={term} failed: {e}")
        return []


async def source_openfda() -> list[dict]:
    log.info("📡 [2/4] openFDA – MedDRA reaction terms…")
    # Lấy top 200 terms phổ biến nhất
    params_top = {
        "count": "patient.reaction.reactionmeddrapt.exact",
        "limit": 200,
    }
    top_terms = []
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(FDA_BASE, params=params_top, headers=HEADERS, timeout=30)
            if r.status_code == 200:
                data = r.json()
                top_terms = [item["term"] for item in data.get("results", []) if "term" in item]
                log.info(f"  → {len(top_terms)} MedDRA top terms từ openFDA count")
    except Exception as e:
        log.warning(f"  FDA top-count failed: {e}")

    # Thêm terms từ search cụ thể
    extra_terms = set()
    async with httpx.AsyncClient() as client:
        # Chia thành batches để tránh rate limit
        for i in range(0, len(FDA_SEARCH_TERMS), 5):
            batch = FDA_SEARCH_TERMS[i:i+5]
            tasks = [fetch_fda_count(client, t) for t in batch]
            results = await asyncio.gather(*tasks)
            for batch_terms in results:
                extra_terms.update(batch_terms)
            await asyncio.sleep(0.5)

    all_terms = list(set(top_terms) | extra_terms)
    
    items = []
    seen = set()
    for term in all_terms:
        key = term.lower().strip()
        if key and key not in seen:
            seen.add(key)
            items.append({
                "name_en": term.title(),
                "source": "openFDA-MedDRA",
                "icd10_code": None,
                "meddra_term": term,
            })

    log.info(f"  → {len(items)} MedDRA symptom terms từ openFDA")
    return items


# ===========================================================================
# SOURCE 3 – Wikidata SPARQL
# ===========================================================================
WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"

SPARQL_QUERY = """
SELECT DISTINCT ?symptom ?symptomLabel ?symptomDescription ?icd10 WHERE {
  # Items that are subclass of "symptom" (Q169872) or "medical sign" (Q1817442)
  { ?symptom wdt:P279* wd:Q169872 . }
  UNION
  { ?symptom wdt:P279* wd:Q1817442 . }
  UNION
  { ?symptom wdt:P31 wd:Q169872 . }
  
  OPTIONAL { ?symptom wdt:P494 ?icd10 . }
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,vi" . }
  
  FILTER(LANG(?symptomLabel) = "en")
  FILTER(?symptomLabel != "")
}
LIMIT 500
"""

async def source_wikidata() -> list[dict]:
    log.info("📡 [3/4] Wikidata SPARQL – medical symptoms…")
    params = {
        "query": SPARQL_QUERY,
        "format": "json",
    }
    headers = {
        **HEADERS,
        "Accept": "application/sparql-results+json",
    }
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.get(WIKIDATA_SPARQL, params=params, headers=headers)
            r.raise_for_status()
            data = r.json()

        bindings = data.get("results", {}).get("bindings", [])
        items = []
        seen = set()
        for b in bindings:
            label = b.get("symptomLabel", {}).get("value", "").strip()
            desc = b.get("symptomDescription", {}).get("value", "").strip()
            icd10 = b.get("icd10", {}).get("value", "").strip() or None
            wikidata_id = b.get("symptom", {}).get("value", "").split("/")[-1]

            key = label.lower()
            if label and key not in seen:
                seen.add(key)
                items.append({
                    "name_en": label,
                    "description_en": desc or None,
                    "source": "Wikidata",
                    "icd10_code": icd10,
                    "wikidata_id": wikidata_id,
                })

        log.info(f"  → {len(items)} symptoms từ Wikidata")
        return items

    except Exception as e:
        log.warning(f"  Wikidata SPARQL failed: {e}")
        return []


# ===========================================================================
# SOURCE 4 – Curated Vietnamese Medical Symptoms
# ===========================================================================
# Danh sách triệu chứng phổ biến với tên tiếng Việt, tiếng Anh, mã ICD-10
CURATED_SYMPTOMS = [
    # --- Toàn thân ---
    {"name_en": "Fever", "name_vi": "Sốt", "icd10_code": "R50.9", "category": "general", "severity": "moderate"},
    {"name_en": "Chills", "name_vi": "Ớn lạnh / Rùng mình", "icd10_code": "R68.83", "category": "general", "severity": "mild"},
    {"name_en": "Fatigue", "name_vi": "Mệt mỏi", "icd10_code": "R53.83", "category": "general", "severity": "mild"},
    {"name_en": "Malaise", "name_vi": "Khó chịu toàn thân", "icd10_code": "R53.81", "category": "general", "severity": "mild"},
    {"name_en": "Weight loss", "name_vi": "Sụt cân", "icd10_code": "R63.4", "category": "general", "severity": "moderate"},
    {"name_en": "Weight gain", "name_vi": "Tăng cân", "icd10_code": "R63.5", "category": "general", "severity": "mild"},
    {"name_en": "Night sweats", "name_vi": "Đổ mồ hôi đêm", "icd10_code": "R61", "category": "general", "severity": "mild"},
    {"name_en": "Hypothermia", "name_vi": "Hạ thân nhiệt", "icd10_code": "R68.0", "category": "general", "severity": "severe"},
    {"name_en": "Hyperthermia", "name_vi": "Tăng thân nhiệt", "icd10_code": "R50.9", "category": "general", "severity": "severe"},
    {"name_en": "Edema", "name_vi": "Phù nề", "icd10_code": "R60.9", "category": "general", "severity": "moderate"},
    {"name_en": "Dehydration", "name_vi": "Mất nước", "icd10_code": "E86.0", "category": "general", "severity": "moderate"},
    {"name_en": "Loss of appetite", "name_vi": "Chán ăn / Mất cảm giác thèm ăn", "icd10_code": "R63.0", "category": "general", "severity": "mild"},
    {"name_en": "Excessive thirst", "name_vi": "Khát nước nhiều", "icd10_code": "R63.1", "category": "general", "severity": "mild"},

    # --- Đầu / Thần kinh ---
    {"name_en": "Headache", "name_vi": "Đau đầu", "icd10_code": "R51", "category": "neurological", "severity": "moderate"},
    {"name_en": "Migraine", "name_vi": "Đau đầu nửa bên (Migraine)", "icd10_code": "G43.9", "category": "neurological", "severity": "moderate"},
    {"name_en": "Dizziness", "name_vi": "Chóng mặt", "icd10_code": "R42", "category": "neurological", "severity": "moderate"},
    {"name_en": "Vertigo", "name_vi": "Choáng váng / Hoa mắt", "icd10_code": "R42", "category": "neurological", "severity": "moderate"},
    {"name_en": "Syncope", "name_vi": "Ngất xỉu", "icd10_code": "R55", "category": "neurological", "severity": "severe"},
    {"name_en": "Confusion", "name_vi": "Lú lẫn / Mất định hướng", "icd10_code": "R41.3", "category": "neurological", "severity": "severe"},
    {"name_en": "Memory loss", "name_vi": "Mất trí nhớ", "icd10_code": "R41.3", "category": "neurological", "severity": "severe"},
    {"name_en": "Seizure", "name_vi": "Co giật", "icd10_code": "R56.9", "category": "neurological", "severity": "severe"},
    {"name_en": "Tremor", "name_vi": "Run tay / Run chân", "icd10_code": "R25.1", "category": "neurological", "severity": "moderate"},
    {"name_en": "Numbness", "name_vi": "Tê bì / Mất cảm giác", "icd10_code": "R20.0", "category": "neurological", "severity": "moderate"},
    {"name_en": "Tingling", "name_vi": "Cảm giác kiến bò / Tê ran", "icd10_code": "R20.2", "category": "neurological", "severity": "mild"},
    {"name_en": "Paralysis", "name_vi": "Liệt / Bại liệt", "icd10_code": "G83.9", "category": "neurological", "severity": "severe"},
    {"name_en": "Weakness", "name_vi": "Yếu cơ / Suy nhược", "icd10_code": "R53.1", "category": "neurological", "severity": "moderate"},
    {"name_en": "Insomnia", "name_vi": "Mất ngủ", "icd10_code": "G47.00", "category": "neurological", "severity": "mild"},
    {"name_en": "Excessive sleepiness", "name_vi": "Buồn ngủ quá mức", "icd10_code": "R53.83", "category": "neurological", "severity": "mild"},
    {"name_en": "Loss of smell", "name_vi": "Mất khứu giác", "icd10_code": "R43.0", "category": "neurological", "severity": "mild"},
    {"name_en": "Loss of taste", "name_vi": "Mất vị giác", "icd10_code": "R43.2", "category": "neurological", "severity": "mild"},

    # --- Hô hấp ---
    {"name_en": "Cough", "name_vi": "Ho", "icd10_code": "R05", "category": "respiratory", "severity": "mild"},
    {"name_en": "Dry cough", "name_vi": "Ho khan", "icd10_code": "R05.9", "category": "respiratory", "severity": "mild"},
    {"name_en": "Productive cough", "name_vi": "Ho có đờm", "icd10_code": "R05.9", "category": "respiratory", "severity": "mild"},
    {"name_en": "Shortness of breath", "name_vi": "Khó thở", "icd10_code": "R06.00", "category": "respiratory", "severity": "severe"},
    {"name_en": "Dyspnea", "name_vi": "Khó thở / Thở nặng nề", "icd10_code": "R06.00", "category": "respiratory", "severity": "severe"},
    {"name_en": "Wheezing", "name_vi": "Thở khò khè", "icd10_code": "R06.2", "category": "respiratory", "severity": "moderate"},
    {"name_en": "Stridor", "name_vi": "Thở rít", "icd10_code": "R06.1", "category": "respiratory", "severity": "severe"},
    {"name_en": "Hemoptysis", "name_vi": "Ho ra máu", "icd10_code": "R04.2", "category": "respiratory", "severity": "severe"},
    {"name_en": "Sneezing", "name_vi": "Hắt hơi", "icd10_code": "R06.7", "category": "respiratory", "severity": "mild"},
    {"name_en": "Runny nose", "name_vi": "Chảy nước mũi", "icd10_code": "J00", "category": "respiratory", "severity": "mild"},
    {"name_en": "Nasal congestion", "name_vi": "Ngạt mũi / Tắc mũi", "icd10_code": "R09.81", "category": "respiratory", "severity": "mild"},
    {"name_en": "Sore throat", "name_vi": "Đau họng", "icd10_code": "J02.9", "category": "respiratory", "severity": "mild"},
    {"name_en": "Hoarseness", "name_vi": "Khản tiếng", "icd10_code": "R49.0", "category": "respiratory", "severity": "mild"},
    {"name_en": "Chest tightness", "name_vi": "Tức ngực / Nặng ngực", "icd10_code": "R07.9", "category": "respiratory", "severity": "moderate"},
    {"name_en": "Sleep apnea", "name_vi": "Ngưng thở khi ngủ", "icd10_code": "G47.30", "category": "respiratory", "severity": "moderate"},
    {"name_en": "Epistaxis", "name_vi": "Chảy máu cam", "icd10_code": "R04.0", "category": "respiratory", "severity": "moderate"},

    # --- Tim mạch ---
    {"name_en": "Chest pain", "name_vi": "Đau ngực", "icd10_code": "R07.9", "category": "cardiovascular", "severity": "severe"},
    {"name_en": "Palpitations", "name_vi": "Hồi hộp / Tim đập nhanh", "icd10_code": "R00.2", "category": "cardiovascular", "severity": "moderate"},
    {"name_en": "Tachycardia", "name_vi": "Nhịp tim nhanh", "icd10_code": "R00.0", "category": "cardiovascular", "severity": "moderate"},
    {"name_en": "Bradycardia", "name_vi": "Nhịp tim chậm", "icd10_code": "R00.1", "category": "cardiovascular", "severity": "moderate"},
    {"name_en": "Hypertension", "name_vi": "Tăng huyết áp", "icd10_code": "I10", "category": "cardiovascular", "severity": "moderate"},
    {"name_en": "Hypotension", "name_vi": "Hạ huyết áp", "icd10_code": "I95.9", "category": "cardiovascular", "severity": "moderate"},
    {"name_en": "Irregular heartbeat", "name_vi": "Nhịp tim không đều", "icd10_code": "R00.8", "category": "cardiovascular", "severity": "moderate"},
    {"name_en": "Cyanosis", "name_vi": "Tím tái", "icd10_code": "R23.0", "category": "cardiovascular", "severity": "severe"},
    {"name_en": "Claudication", "name_vi": "Đau chân khi đi bộ (thiếu máu chi)", "icd10_code": "I73.9", "category": "cardiovascular", "severity": "moderate"},

    # --- Tiêu hóa ---
    {"name_en": "Nausea", "name_vi": "Buồn nôn", "icd10_code": "R11.0", "category": "gastrointestinal", "severity": "mild"},
    {"name_en": "Vomiting", "name_vi": "Nôn mửa", "icd10_code": "R11.10", "category": "gastrointestinal", "severity": "moderate"},
    {"name_en": "Diarrhea", "name_vi": "Tiêu chảy", "icd10_code": "R19.7", "category": "gastrointestinal", "severity": "moderate"},
    {"name_en": "Constipation", "name_vi": "Táo bón", "icd10_code": "K59.00", "category": "gastrointestinal", "severity": "mild"},
    {"name_en": "Abdominal pain", "name_vi": "Đau bụng", "icd10_code": "R10.9", "category": "gastrointestinal", "severity": "moderate"},
    {"name_en": "Bloating", "name_vi": "Đầy hơi / Chướng bụng", "icd10_code": "R14.0", "category": "gastrointestinal", "severity": "mild"},
    {"name_en": "Flatulence", "name_vi": "Xì hơi / Đầy bụng sinh hơi", "icd10_code": "R14.3", "category": "gastrointestinal", "severity": "mild"},
    {"name_en": "Heartburn", "name_vi": "Ợ nóng / Nóng rát thượng vị", "icd10_code": "R12", "category": "gastrointestinal", "severity": "mild"},
    {"name_en": "Acid reflux", "name_vi": "Trào ngược axit", "icd10_code": "K21.9", "category": "gastrointestinal", "severity": "mild"},
    {"name_en": "Dysphagia", "name_vi": "Khó nuốt", "icd10_code": "R13.10", "category": "gastrointestinal", "severity": "moderate"},
    {"name_en": "Jaundice", "name_vi": "Vàng da", "icd10_code": "R17", "category": "gastrointestinal", "severity": "severe"},
    {"name_en": "Blood in stool", "name_vi": "Đi cầu ra máu", "icd10_code": "K92.1", "category": "gastrointestinal", "severity": "severe"},
    {"name_en": "Melena", "name_vi": "Phân đen (xuất huyết tiêu hóa)", "icd10_code": "K92.1", "category": "gastrointestinal", "severity": "severe"},
    {"name_en": "Rectal bleeding", "name_vi": "Chảy máu trực tràng", "icd10_code": "K62.5", "category": "gastrointestinal", "severity": "severe"},
    {"name_en": "Hemorrhoids", "name_vi": "Trĩ", "icd10_code": "K64.9", "category": "gastrointestinal", "severity": "mild"},
    {"name_en": "Indigestion", "name_vi": "Khó tiêu", "icd10_code": "K30", "category": "gastrointestinal", "severity": "mild"},
    {"name_en": "Ascites", "name_vi": "Cổ trướng / Dịch ổ bụng", "icd10_code": "R18.8", "category": "gastrointestinal", "severity": "severe"},
    {"name_en": "Hiccups", "name_vi": "Nấc cụt", "icd10_code": "R06.6", "category": "gastrointestinal", "severity": "mild"},

    # --- Da liễu ---
    {"name_en": "Rash", "name_vi": "Phát ban", "icd10_code": "R21", "category": "dermatological", "severity": "mild"},
    {"name_en": "Itching", "name_vi": "Ngứa", "icd10_code": "L29.9", "category": "dermatological", "severity": "mild"},
    {"name_en": "Pruritus", "name_vi": "Ngứa da", "icd10_code": "L29.9", "category": "dermatological", "severity": "mild"},
    {"name_en": "Hives", "name_vi": "Mề đay / Nổi mẩn", "icd10_code": "L50.9", "category": "dermatological", "severity": "mild"},
    {"name_en": "Urticaria", "name_vi": "Mày đay", "icd10_code": "L50.9", "category": "dermatological", "severity": "mild"},
    {"name_en": "Eczema", "name_vi": "Chàm da / Eczema", "icd10_code": "L30.9", "category": "dermatological", "severity": "mild"},
    {"name_en": "Acne", "name_vi": "Mụn trứng cá", "icd10_code": "L70.9", "category": "dermatological", "severity": "mild"},
    {"name_en": "Hair loss", "name_vi": "Rụng tóc", "icd10_code": "L65.9", "category": "dermatological", "severity": "mild"},
    {"name_en": "Alopecia", "name_vi": "Rụng tóc / Hói đầu", "icd10_code": "L65.9", "category": "dermatological", "severity": "mild"},
    {"name_en": "Pallor", "name_vi": "Da nhợt nhạt / Xanh xao", "icd10_code": "R23.1", "category": "dermatological", "severity": "moderate"},
    {"name_en": "Bruising", "name_vi": "Bầm tím dưới da", "icd10_code": "R23.3", "category": "dermatological", "severity": "mild"},
    {"name_en": "Petechiae", "name_vi": "Xuất huyết dạng chấm đỏ trên da", "icd10_code": "R23.3", "category": "dermatological", "severity": "moderate"},
    {"name_en": "Dry skin", "name_vi": "Da khô", "icd10_code": "L85.3", "category": "dermatological", "severity": "mild"},
    {"name_en": "Excessive sweating", "name_vi": "Đổ mồ hôi nhiều", "icd10_code": "R61", "category": "dermatological", "severity": "mild"},

    # --- Cơ xương khớp ---
    {"name_en": "Joint pain", "name_vi": "Đau khớp", "icd10_code": "M25.50", "category": "musculoskeletal", "severity": "moderate"},
    {"name_en": "Arthralgia", "name_vi": "Đau khớp", "icd10_code": "M25.50", "category": "musculoskeletal", "severity": "moderate"},
    {"name_en": "Back pain", "name_vi": "Đau lưng", "icd10_code": "M54.5", "category": "musculoskeletal", "severity": "moderate"},
    {"name_en": "Neck pain", "name_vi": "Đau cổ", "icd10_code": "M54.2", "category": "musculoskeletal", "severity": "moderate"},
    {"name_en": "Muscle pain", "name_vi": "Đau cơ", "icd10_code": "M79.1", "category": "musculoskeletal", "severity": "mild"},
    {"name_en": "Myalgia", "name_vi": "Đau cơ / Mỏi cơ", "icd10_code": "M79.1", "category": "musculoskeletal", "severity": "mild"},
    {"name_en": "Joint swelling", "name_vi": "Sưng khớp", "icd10_code": "M25.40", "category": "musculoskeletal", "severity": "moderate"},
    {"name_en": "Stiffness", "name_vi": "Cứng khớp / Cứng cơ", "icd10_code": "M25.60", "category": "musculoskeletal", "severity": "mild"},
    {"name_en": "Muscle cramps", "name_vi": "Chuột rút / Vọp bẻ", "icd10_code": "R25.2", "category": "musculoskeletal", "severity": "mild"},
    {"name_en": "Bone pain", "name_vi": "Đau xương", "icd10_code": "M89.8", "category": "musculoskeletal", "severity": "moderate"},
    {"name_en": "Sciatica", "name_vi": "Đau thần kinh tọa", "icd10_code": "M54.3", "category": "musculoskeletal", "severity": "moderate"},
    {"name_en": "Lumbago", "name_vi": "Đau thắt lưng", "icd10_code": "M54.5", "category": "musculoskeletal", "severity": "moderate"},
    {"name_en": "Shoulder pain", "name_vi": "Đau vai", "icd10_code": "M25.51", "category": "musculoskeletal", "severity": "moderate"},
    {"name_en": "Knee pain", "name_vi": "Đau gối", "icd10_code": "M25.56", "category": "musculoskeletal", "severity": "moderate"},
    {"name_en": "Hip pain", "name_vi": "Đau hông", "icd10_code": "M25.55", "category": "musculoskeletal", "severity": "moderate"},

    # --- Tiết niệu / Sinh dục ---
    {"name_en": "Dysuria", "name_vi": "Tiểu buốt / Tiểu đau", "icd10_code": "R30.0", "category": "urogenital", "severity": "moderate"},
    {"name_en": "Frequent urination", "name_vi": "Tiểu nhiều lần", "icd10_code": "R35.0", "category": "urogenital", "severity": "mild"},
    {"name_en": "Blood in urine", "name_vi": "Tiểu ra máu", "icd10_code": "R31.9", "category": "urogenital", "severity": "severe"},
    {"name_en": "Hematuria", "name_vi": "Đái ra máu", "icd10_code": "R31.9", "category": "urogenital", "severity": "severe"},
    {"name_en": "Urinary incontinence", "name_vi": "Tiểu không kiểm soát", "icd10_code": "R32", "category": "urogenital", "severity": "moderate"},
    {"name_en": "Urinary retention", "name_vi": "Bí tiểu", "icd10_code": "R33.9", "category": "urogenital", "severity": "severe"},
    {"name_en": "Polyuria", "name_vi": "Đái nhiều", "icd10_code": "R35.8", "category": "urogenital", "severity": "mild"},
    {"name_en": "Oliguria", "name_vi": "Thiểu niệu / Ít nước tiểu", "icd10_code": "R34", "category": "urogenital", "severity": "severe"},
    {"name_en": "Vaginal discharge", "name_vi": "Khí hư / Dịch âm đạo bất thường", "icd10_code": "N89.8", "category": "urogenital", "severity": "mild"},
    {"name_en": "Menstrual irregularity", "name_vi": "Rối loạn kinh nguyệt", "icd10_code": "N92.6", "category": "urogenital", "severity": "mild"},
    {"name_en": "Painful menstruation", "name_vi": "Đau bụng kinh", "icd10_code": "N94.6", "category": "urogenital", "severity": "moderate"},
    {"name_en": "Erectile dysfunction", "name_vi": "Rối loạn cương dương", "icd10_code": "N52.9", "category": "urogenital", "severity": "mild"},
    {"name_en": "Pelvic pain", "name_vi": "Đau vùng chậu", "icd10_code": "R10.2", "category": "urogenital", "severity": "moderate"},
    {"name_en": "Breast pain", "name_vi": "Đau ngực (tuyến vú)", "icd10_code": "N64.4", "category": "urogenital", "severity": "mild"},
    {"name_en": "Breast lump", "name_vi": "U cục vú / Khối u tuyến vú", "icd10_code": "N63", "category": "urogenital", "severity": "moderate"},

    # --- Mắt ---
    {"name_en": "Blurred vision", "name_vi": "Mờ mắt / Nhìn mờ", "icd10_code": "H53.8", "category": "ophthalmological", "severity": "moderate"},
    {"name_en": "Double vision", "name_vi": "Nhìn đôi", "icd10_code": "H53.2", "category": "ophthalmological", "severity": "moderate"},
    {"name_en": "Eye pain", "name_vi": "Đau mắt", "icd10_code": "H57.1", "category": "ophthalmological", "severity": "moderate"},
    {"name_en": "Red eye", "name_vi": "Đỏ mắt / Mắt đỏ", "icd10_code": "H57.8", "category": "ophthalmological", "severity": "mild"},
    {"name_en": "Eye discharge", "name_vi": "Chảy dịch mắt / Ghèn mắt", "icd10_code": "H04.20", "category": "ophthalmological", "severity": "mild"},
    {"name_en": "Light sensitivity", "name_vi": "Sợ ánh sáng / Nhạy cảm ánh sáng", "icd10_code": "H53.1", "category": "ophthalmological", "severity": "mild"},
    {"name_en": "Vision loss", "name_vi": "Mất thị lực", "icd10_code": "H54.7", "category": "ophthalmological", "severity": "severe"},
    {"name_en": "Watery eyes", "name_vi": "Chảy nước mắt", "icd10_code": "H04.20", "category": "ophthalmological", "severity": "mild"},

    # --- Tai ---
    {"name_en": "Ear pain", "name_vi": "Đau tai", "icd10_code": "H92.09", "category": "otological", "severity": "moderate"},
    {"name_en": "Hearing loss", "name_vi": "Mất thính lực / Điếc", "icd10_code": "H91.90", "category": "otological", "severity": "moderate"},
    {"name_en": "Tinnitus", "name_vi": "Ù tai", "icd10_code": "H93.19", "category": "otological", "severity": "mild"},
    {"name_en": "Ear discharge", "name_vi": "Chảy dịch tai", "icd10_code": "H92.10", "category": "otological", "severity": "moderate"},

    # --- Tâm thần / Tâm lý ---
    {"name_en": "Anxiety", "name_vi": "Lo âu / Hồi hộp lo lắng", "icd10_code": "F41.9", "category": "psychiatric", "severity": "moderate"},
    {"name_en": "Depression", "name_vi": "Trầm cảm", "icd10_code": "F32.9", "category": "psychiatric", "severity": "moderate"},
    {"name_en": "Mood swings", "name_vi": "Thay đổi tâm trạng thất thường", "icd10_code": "F39", "category": "psychiatric", "severity": "mild"},
    {"name_en": "Irritability", "name_vi": "Cáu kỉnh / Dễ bực bội", "icd10_code": "R45.1", "category": "psychiatric", "severity": "mild"},
    {"name_en": "Hallucinations", "name_vi": "Ảo giác", "icd10_code": "R44.3", "category": "psychiatric", "severity": "severe"},
    {"name_en": "Panic attacks", "name_vi": "Cơn hoảng loạn", "icd10_code": "F41.0", "category": "psychiatric", "severity": "moderate"},
    {"name_en": "Suicidal thoughts", "name_vi": "Ý định tự tử", "icd10_code": "R45.851", "category": "psychiatric", "severity": "severe"},
    {"name_en": "Agitation", "name_vi": "Kích động", "icd10_code": "R45.1", "category": "psychiatric", "severity": "moderate"},
    {"name_en": "Disorientation", "name_vi": "Mất định hướng", "icd10_code": "R41.3", "category": "psychiatric", "severity": "severe"},
    {"name_en": "Obsessive thoughts", "name_vi": "Suy nghĩ ám ảnh", "icd10_code": "F42.9", "category": "psychiatric", "severity": "moderate"},

    # --- Nội tiết / Chuyển hóa ---
    {"name_en": "Polyuria", "name_vi": "Tiểu nhiều", "icd10_code": "R35.8", "category": "endocrine", "severity": "mild"},
    {"name_en": "Polydipsia", "name_vi": "Uống nhiều nước", "icd10_code": "R63.1", "category": "endocrine", "severity": "mild"},
    {"name_en": "Polyphagia", "name_vi": "Ăn nhiều / Đói nhiều", "icd10_code": "R63.2", "category": "endocrine", "severity": "mild"},
    {"name_en": "Heat intolerance", "name_vi": "Không chịu được nóng", "icd10_code": "R68.09", "category": "endocrine", "severity": "mild"},
    {"name_en": "Cold intolerance", "name_vi": "Không chịu được lạnh", "icd10_code": "R20.8", "category": "endocrine", "severity": "mild"},
    {"name_en": "Goiter", "name_vi": "Bướu cổ", "icd10_code": "E04.9", "category": "endocrine", "severity": "moderate"},
    {"name_en": "Hirsutism", "name_vi": "Mọc lông nhiều bất thường (nữ)", "icd10_code": "L68.0", "category": "endocrine", "severity": "mild"},
    {"name_en": "Gynecomastia", "name_vi": "Vú to bất thường ở nam", "icd10_code": "N62", "category": "endocrine", "severity": "mild"},
    {"name_en": "Hot flashes", "name_vi": "Bốc hỏa", "icd10_code": "N95.1", "category": "endocrine", "severity": "mild"},

    # --- Trẻ em ---
    {"name_en": "High-pitched cry", "name_vi": "Khóc thét (trẻ sơ sinh)", "icd10_code": "R68.11", "category": "pediatric", "severity": "severe"},
    {"name_en": "Poor feeding", "name_vi": "Bú kém / Bỏ bú", "icd10_code": "R63.3", "category": "pediatric", "severity": "moderate"},
    {"name_en": "Failure to thrive", "name_vi": "Chậm phát triển / Không tăng cân", "icd10_code": "R62.51", "category": "pediatric", "severity": "moderate"},
    {"name_en": "Neonatal jaundice", "name_vi": "Vàng da sơ sinh", "icd10_code": "P59.9", "category": "pediatric", "severity": "moderate"},
    {"name_en": "Bedwetting", "name_vi": "Đái dầm", "icd10_code": "R32", "category": "pediatric", "severity": "mild"},

    # --- Khác ---
    {"name_en": "Lymphadenopathy", "name_vi": "Hạch bạch huyết to", "icd10_code": "R59.9", "category": "general", "severity": "moderate"},
    {"name_en": "Splenomegaly", "name_vi": "Lách to", "icd10_code": "R16.1", "category": "general", "severity": "moderate"},
    {"name_en": "Hepatomegaly", "name_vi": "Gan to", "icd10_code": "R16.0", "category": "general", "severity": "moderate"},
    {"name_en": "Abdominal mass", "name_vi": "Khối u bụng", "icd10_code": "R19.09", "category": "general", "severity": "severe"},
    {"name_en": "Leg swelling", "name_vi": "Phù chân", "icd10_code": "R60.0", "category": "cardiovascular", "severity": "moderate"},
    {"name_en": "Hand tremor", "name_vi": "Run tay", "icd10_code": "R25.1", "category": "neurological", "severity": "mild"},
    {"name_en": "Excessive hunger", "name_vi": "Đói nhiều / Thèm ăn quá mức", "icd10_code": "R63.2", "category": "general", "severity": "mild"},
    {"name_en": "Frequent infections", "name_vi": "Hay bị nhiễm trùng", "icd10_code": "D84.9", "category": "general", "severity": "moderate"},
    {"name_en": "Easy bruising", "name_vi": "Dễ bầm tím", "icd10_code": "R23.3", "category": "dermatological", "severity": "mild"},
    {"name_en": "Slow healing wounds", "name_vi": "Vết thương lâu lành", "icd10_code": "T14.90", "category": "general", "severity": "moderate"},
]

def source_curated() -> list[dict]:
    log.info("📋 [4/4] Curated Vietnamese medical symptoms…")
    items = []
    for s in CURATED_SYMPTOMS:
        items.append({
            **s,
            "source": "Curated-VI",
        })
    log.info(f"  → {len(items)} curated Vietnamese symptoms")
    return items


# ===========================================================================
# MERGE & DEDUPLICATE
# ===========================================================================
def normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.lower().strip())


def merge_all(sources: list[list[dict]]) -> list[dict]:
    """
    Gộp tất cả sources, deduplicate theo name_en (normalized).
    Priority: Curated-VI > Wikidata > NIH > openFDA
    """
    # Thứ tự ưu tiên: curated có đầy đủ info nhất
    priority_order = ["Curated-VI", "Wikidata", "NIH-ICD10CM", "openFDA-MedDRA"]

    # Sắp xếp sources theo priority
    all_items: list[dict] = []
    for src_name in priority_order:
        for src in sources:
            for item in src:
                if item.get("source") == src_name:
                    all_items.append(item)

    seen_names: dict[str, dict] = {}
    seen_icd10: dict[str, bool] = {}
    final: list[dict] = []
    idx = 1

    for item in all_items:
        name = item.get("name_en", "").strip()
        if not name:
            continue

        key = normalize_name(name)
        icd10 = item.get("icd10_code")

        if key in seen_names:
            # Enrich existing entry với thông tin bổ sung
            existing = seen_names[key]
            if icd10 and not existing.get("icd10_code"):
                existing["icd10_code"] = icd10
            if item.get("name_vi") and not existing.get("name_vi"):
                existing["name_vi"] = item["name_vi"]
            if item.get("description_en") and not existing.get("description_en"):
                existing["description_en"] = item["description_en"]
            if item.get("wikidata_id") and not existing.get("wikidata_id"):
                existing["wikidata_id"] = item["wikidata_id"]
            if item.get("meddra_term") and not existing.get("meddra_term"):
                existing["meddra_term"] = item["meddra_term"]
            # Thêm source vào danh sách
            existing_sources = existing.get("sources", [existing.get("source", "")])
            if item["source"] not in existing_sources:
                existing_sources.append(item["source"])
            existing["sources"] = existing_sources
            continue

        # New entry
        entry = {
            "id": idx,
            "slug": slugify(name),
            "name_en": name,
            "name_vi": item.get("name_vi"),
            "description_en": item.get("description_en"),
            "icd10_code": icd10,
            "meddra_term": item.get("meddra_term"),
            "wikidata_id": item.get("wikidata_id"),
            "category": item.get("category", "general"),
            "severity": item.get("severity", "mild"),
            "sources": [item.get("source", "unknown")],
        }
        seen_names[key] = entry
        final.append(entry)
        idx += 1

    return final


# ===========================================================================
# MAIN
# ===========================================================================
async def main():
    log.info("=" * 60)
    log.info("  MedAssist – Symptom Data Seeder")
    log.info("=" * 60)

    # Thu thập từ các nguồn
    nih_data = await source_nih()
    fda_data = await source_openfda()
    wiki_data = await source_wikidata()
    curated_data = source_curated()

    # Merge & deduplicate
    log.info("🔀 Merging và deduplicating…")
    merged = merge_all([curated_data, wiki_data, nih_data, fda_data])
    log.info(f"  → Tổng: {len(merged)} triệu chứng unique")

    # Thống kê theo source
    source_stats: dict[str, int] = {}
    for item in merged:
        for src in item.get("sources", []):
            source_stats[src] = source_stats.get(src, 0) + 1
    log.info("📊 Thống kê theo nguồn:")
    for src, count in sorted(source_stats.items(), key=lambda x: -x[1]):
        log.info(f"    {src}: {count}")

    # Thống kê theo category
    cat_stats: dict[str, int] = {}
    for item in merged:
        cat = item.get("category", "general")
        cat_stats[cat] = cat_stats.get(cat, 0) + 1
    log.info("📊 Thống kê theo danh mục:")
    for cat, count in sorted(cat_stats.items(), key=lambda x: -x[1]):
        log.info(f"    {cat}: {count}")

    # Lưu file
    output = {
        "meta": {
            "total": len(merged),
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "sources": ["NIH-ICD10CM", "openFDA-MedDRA", "Wikidata", "Curated-VI"],
            "source_stats": source_stats,
            "category_stats": cat_stats,
        },
        "symptoms": merged,
    }

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    log.info(f"✅ Saved → {OUT_FILE}")
    log.info(f"   File size: {OUT_FILE.stat().st_size / 1024:.1f} KB")
    log.info("=" * 60)
    log.info("Done!")


if __name__ == "__main__":
    asyncio.run(main())
