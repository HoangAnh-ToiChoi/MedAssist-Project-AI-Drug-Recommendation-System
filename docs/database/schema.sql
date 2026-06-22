-- ============================================================
-- MedAssist AI — Database Schema v2.0
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  gender        VARCHAR(10)  CHECK (gender IN ('male', 'female', 'other')),
  role          VARCHAR(10)  NOT NULL DEFAULT 'user'
                             CHECK (role IN ('user', 'admin')),
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMP    DEFAULT NOW(),
  updated_at    TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_users_email     ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================================
-- 2. SYMPTOMS
-- ============================================================
CREATE TABLE symptoms (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  code        VARCHAR(50)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  icd10_code  VARCHAR(10)  UNIQUE,
  description TEXT,
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_symptoms_code ON symptoms(code);

-- ============================================================
-- 3. DRUGS
-- ============================================================
CREATE TABLE drugs (
  id                UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  name              VARCHAR(150) NOT NULL,
  generic_name      VARCHAR(150) NOT NULL,
  category          VARCHAR(100),
  dosage_form       VARCHAR(50),
  contraindications TEXT,
  description       TEXT,
  created_at        TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_drugs_category ON drugs(category);
CREATE INDEX idx_drugs_name     ON drugs(name);

-- ============================================================
-- 4. DRUG_SYMPTOMS (junction N:N)
-- ============================================================
CREATE TABLE drug_symptoms (
  id               UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  drug_id          UUID  NOT NULL REFERENCES drugs(id)    ON DELETE CASCADE,
  symptom_id       UUID  NOT NULL REFERENCES symptoms(id) ON DELETE CASCADE,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at       TIMESTAMP DEFAULT NOW(),

  CONSTRAINT uq_drug_symptom UNIQUE (drug_id, symptom_id)
);

CREATE INDEX idx_drug_symptoms_drug_id    ON drug_symptoms(drug_id);
CREATE INDEX idx_drug_symptoms_symptom_id ON drug_symptoms(symptom_id);

-- ============================================================
-- 4A. DISEASE_TYPES
-- ============================================================
CREATE TABLE disease_types (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  code          VARCHAR(50)  NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  display_order INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_disease_types_code ON disease_types(code);

-- ============================================================
-- 4B. DISEASES
-- ============================================================
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

CREATE INDEX idx_diseases_code            ON diseases(code);
CREATE INDEX idx_diseases_disease_type_id ON diseases(disease_type_id);
CREATE INDEX idx_diseases_icd10_code      ON diseases(icd10_code);
CREATE INDEX idx_diseases_display_name    ON diseases(display_name);

-- ============================================================
-- 4C. DISEASE_SYMPTOMS (junction N:N)
-- ============================================================
CREATE TABLE disease_symptoms (
  id               UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  disease_id       UUID  NOT NULL REFERENCES diseases(id)  ON DELETE CASCADE,
  symptom_id       UUID  NOT NULL REFERENCES symptoms(id)  ON DELETE CASCADE,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  evidence_note    TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),

  CONSTRAINT uq_disease_symptom UNIQUE (disease_id, symptom_id)
);

CREATE INDEX idx_disease_symptoms_disease_id ON disease_symptoms(disease_id);
CREATE INDEX idx_disease_symptoms_symptom_id ON disease_symptoms(symptom_id);

-- ============================================================
-- 4D. DISEASE_DRUGS (junction N:N)
-- ============================================================
CREATE TABLE disease_drugs (
  id               UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  disease_id       UUID  NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  drug_id          UUID  NOT NULL REFERENCES drugs(id)    ON DELETE CASCADE,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  priority_rank    INTEGER NOT NULL DEFAULT 0,
  evidence_note    TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),

  CONSTRAINT uq_disease_drug UNIQUE (disease_id, drug_id)
);

CREATE INDEX idx_disease_drugs_disease_id ON disease_drugs(disease_id);
CREATE INDEX idx_disease_drugs_drug_id    ON disease_drugs(drug_id);

-- ============================================================
-- 5. PATIENT_HISTORY
-- ============================================================
CREATE TABLE patient_history (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condition    VARCHAR(200) NOT NULL,
  status       VARCHAR(20)  DEFAULT 'active'
                            CHECK (status IN ('active', 'remission', 'chronic')),
  diagnosed_at DATE,
  notes        TEXT,
  created_at   TIMESTAMP    DEFAULT NOW(),
  updated_at   TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_patient_history_user_id ON patient_history(user_id);
CREATE INDEX idx_patient_history_status  ON patient_history(user_id, status);

-- ============================================================
-- 6. ALLERGIES
-- ============================================================
CREATE TABLE allergies (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  drug_id       UUID        REFERENCES drugs(id)           ON DELETE SET NULL,
  reaction_type VARCHAR(100),
  severity      VARCHAR(10) CHECK (severity IN ('mild', 'moderate', 'severe')),
  created_at    TIMESTAMP   DEFAULT NOW(),

  CONSTRAINT uq_user_drug_allergy UNIQUE (user_id, drug_id)
);

CREATE INDEX idx_allergies_user_id ON allergies(user_id);
CREATE INDEX idx_allergies_drug_id ON allergies(drug_id);

-- ============================================================
-- 7. RECOMMENDATIONS
-- ============================================================
CREATE TABLE recommendations (
  id             UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input_symptoms JSONB     NOT NULL,
  output_drugs   JSONB     NOT NULL,
  ai_version     VARCHAR(20) DEFAULT 'rule-based-v1',
  danger_alert   JSONB,
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recommendations_user_id    ON recommendations(user_id);
CREATE INDEX idx_recommendations_created_at ON recommendations(created_at DESC);

-- ============================================================
-- 8. REFRESH_TOKENS
-- ============================================================
CREATE TABLE refresh_tokens (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMP    NOT NULL,
  revoked     BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id    ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
