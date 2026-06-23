-- MedAssist AI rollout migration
-- Target: add durable audit table for grounded explanation/chat observability
-- Safe to run in Supabase SQL Editor before backend rollout.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id                UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recommendation_id UUID         REFERENCES recommendations(id) ON DELETE SET NULL,
  event_type        VARCHAR(50)  NOT NULL,
  provider          VARCHAR(100),
  status            VARCHAR(30)  NOT NULL,
  fallback_used     BOOLEAN      NOT NULL DEFAULT false,
  latency_ms        INTEGER      CHECK (latency_ms IS NULL OR latency_ms >= 0),
  request_payload   JSONB        NOT NULL DEFAULT '{}'::jsonb,
  response_payload  JSONB        NOT NULL DEFAULT '{}'::jsonb,
  error_message     TEXT,
  created_at        TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_user_id
  ON ai_audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_recommendation_id
  ON ai_audit_logs(recommendation_id);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_event_type_created_at
  ON ai_audit_logs(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_status_created_at
  ON ai_audit_logs(status, created_at DESC);
