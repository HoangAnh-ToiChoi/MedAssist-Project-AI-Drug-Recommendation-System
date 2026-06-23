'use strict';

const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

function assertIncludes(content, expected, message) {
  assert(content.includes(expected), message);
}

function main() {
  const schemaSql = read('docs/database/schema.sql');
  const migrationSql = read('docs/database/migrations/2026-06-23-ai-audit-logs.sql');
  const backendHealth = read('backend/src/app.js');
  const recommendationService = read('backend/src/services/RecommendationService.js');
  const chatbotService = read('backend/src/services/ChatbotService.js');
  const aiHealth = read('ai-service/main.py');
  const providerRouter = read('ai-service/services/provider_router.py');

  assertIncludes(schemaSql, 'CREATE TABLE ai_audit_logs', 'Schema must define ai_audit_logs.');
  assertIncludes(migrationSql, 'CREATE TABLE IF NOT EXISTS ai_audit_logs', 'Migration file must define ai_audit_logs.');
  assertIncludes(schemaSql, 'fallback_used', 'ai_audit_logs must persist fallback_used.');
  assertIncludes(schemaSql, 'latency_ms', 'ai_audit_logs must persist latency_ms.');
  assertIncludes(schemaSql, 'request_payload', 'ai_audit_logs must persist request_payload.');
  assertIncludes(schemaSql, 'response_payload', 'ai_audit_logs must persist response_payload.');

  assertIncludes(backendHealth, "app.get('/health'", 'Backend must expose /health.');
  assertIncludes(backendHealth, 'services: {', 'Backend health payload must include service statuses.');
  assertIncludes(backendHealth, 'ai: {', 'Backend health payload must include AI configuration status.');

  assertIncludes(
    recommendationService,
    "eventType: 'recommendation_explanation'",
    'RecommendationService must emit recommendation_explanation audit events.'
  );
  assertIncludes(
    chatbotService,
    "eventType: 'grounded_chatbot'",
    'ChatbotService must emit grounded_chatbot audit events.'
  );

  assertIncludes(aiHealth, '"provider_health": get_provider_health_snapshot()', 'AI service health must expose provider_health.');
  assertIncludes(providerRouter, 'BREAKER_COOLDOWN_SECONDS', 'Provider router must define breaker cooldown.');
  assertIncludes(providerRouter, '"half_open"', 'Provider router must support half_open breaker state.');
  assertIncludes(providerRouter, 'def get_provider_health_snapshot()', 'Provider router must expose health snapshot accessor.');

  console.log('AI observability guardrails passed.');
}

if (require.main === module) {
  main();
}
