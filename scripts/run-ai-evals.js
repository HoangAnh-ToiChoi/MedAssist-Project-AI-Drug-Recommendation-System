#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const AI_BASE_URL = process.env.AI_EVAL_BASE_URL || 'http://localhost:8000';
const CASES = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'ai-eval-cases.json'), 'utf8'));

function includesAll(text, terms) {
  const normalized = String(text || '').toLowerCase();
  return terms.every((term) => normalized.includes(String(term).toLowerCase()));
}

async function runCase(testCase) {
  const endpoint = testCase.type === 'chat' ? '/ai/chat/recommendation' : '/ai/recommend/explain';
  const started = Date.now();
  const response = await fetch(`${AI_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testCase.payload),
  });
  const body = await response.json();
  const latencyMs = Date.now() - started;

  const mainText = testCase.type === 'chat'
    ? body.answer || ''
    : `${body.summary || ''} ${body.explanation || ''}`.trim();
  const qualityStatus = body.quality?.status || 'none';
  const mustMention = testCase.expect?.mustMention || [];
  const qualityAllowed = testCase.expect?.qualityStatus || ['pass'];
  const passed = response.ok &&
    body.success !== false &&
    includesAll(mainText, mustMention) &&
    qualityAllowed.includes(qualityStatus);

  return {
    id: testCase.id,
    type: testCase.type,
    provider: body.provider || 'none',
    success: body.success !== false,
    qualityStatus,
    latencyMs,
    passed,
    error: body.error || null,
  };
}

async function main() {
  const results = [];
  for (const testCase of CASES) {
    results.push(await runCase(testCase));
  }

  const passedCount = results.filter((item) => item.passed).length;
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: AI_BASE_URL,
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (passedCount !== results.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`[run-ai-evals] ${error.message}\n`);
  process.exitCode = 1;
});
