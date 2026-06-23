#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require(path.resolve(__dirname, '../backend/node_modules/pg'));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs() {
  const args = {
    limit: 200,
    eventType: null,
    provider: null,
    days: 7,
  };

  for (const rawArg of process.argv.slice(2)) {
    const [key, rawValue] = rawArg.replace(/^--/, '').split('=');
    if (key === 'limit' && rawValue) args.limit = Number(rawValue);
    if (key === 'event-type' && rawValue) args.eventType = rawValue;
    if (key === 'provider' && rawValue) args.provider = rawValue;
    if (key === 'days' && rawValue) args.days = Number(rawValue);
  }

  return args;
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function avg(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function formatMap(map) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}

function topEntries(map, count) {
  return new Map([...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, count));
}

async function main() {
  loadEnvFile(path.resolve(__dirname, '../backend/.env'));
  const args = parseArgs();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Add it to backend/.env or export it before running this script.');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  const conditions = ['created_at >= NOW() - ($1::int * INTERVAL \'1 day\')'];
  const params = [args.days];

  if (args.eventType) {
    params.push(args.eventType);
    conditions.push(`event_type = $${params.length}`);
  }

  if (args.provider) {
    params.push(args.provider);
    conditions.push(`provider = $${params.length}`);
  }

  params.push(args.limit);

  const query = `
    SELECT
      id,
      event_type,
      provider,
      status,
      fallback_used,
      latency_ms,
      request_payload,
      response_payload,
      error_message,
      created_at
    FROM ai_audit_logs
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${params.length}
  `;

  const { rows } = await client.query(query, params);
  await client.end();

  const providerCounts = new Map();
  const statusCounts = new Map();
  const eventCounts = new Map();
  const qualityCounts = new Map();
  const topErrors = new Map();
  const latencyValues = [];
  let fallbackCount = 0;
  let qualityCount = 0;

  for (const row of rows) {
    const responsePayload = parseJson(row.response_payload);
    const effectiveProvider = responsePayload?.provider || row.provider || 'none';

    increment(providerCounts, effectiveProvider);
    increment(statusCounts, row.status || 'unknown');
    increment(eventCounts, row.event_type || 'unknown');

    if (row.fallback_used) fallbackCount += 1;
    if (Number.isFinite(row.latency_ms)) latencyValues.push(row.latency_ms);
    if (row.error_message) increment(topErrors, row.error_message);

    const qualityStatus = responsePayload?.quality?.status;
    if (qualityStatus) {
      increment(qualityCounts, qualityStatus);
      qualityCount += 1;
    }
  }

  const fallbackRate = rows.length ? (fallbackCount / rows.length) * 100 : 0;
  const warnings = [];
  if (fallbackRate >= 50) warnings.push(`Fallback rate is high at ${fallbackRate.toFixed(1)}%`);
  if (latencyValues.length && percentile(latencyValues, 0.95) >= 1500) warnings.push(`P95 latency is high at ${percentile(latencyValues, 0.95)}ms`);
  if (topErrors.size) warnings.push(`Most common error: ${[...topEntries(topErrors, 1).keys()][0]}`);

  const lines = [
    '=== AI Audit Report ===',
    `Rows analyzed: ${rows.length}`,
    `Window: last ${args.days} day(s)`,
    `Filters: event_type=${args.eventType || 'all'}, provider=${args.provider || 'all'}`,
    '',
    `Events: ${formatMap(eventCounts) || 'none'}`,
    `Providers: ${formatMap(providerCounts) || 'none'}`,
    `Statuses: ${formatMap(statusCounts) || 'none'}`,
    `Fallback rate: ${rows.length ? `${fallbackRate.toFixed(1)}%` : '0.0%'} (${fallbackCount}/${rows.length})`,
    `Latency avg/p95/max: ${avg(latencyValues)}ms / ${percentile(latencyValues, 0.95)}ms / ${latencyValues.length ? Math.max(...latencyValues) : 0}ms`,
    `Quality statuses: ${qualityCount ? formatMap(qualityCounts) : 'no quality payloads found'}`,
    `Top errors: ${topErrors.size ? formatMap(topEntries(topErrors, 5)) : 'none'}`,
    '',
    `Warnings: ${warnings.length ? warnings.join(' | ') : 'none'}`,
    '',
    'Recent entries:',
  ];

  for (const row of rows.slice(0, 10)) {
    const responsePayload = parseJson(row.response_payload);
    const qualityStatus = responsePayload?.quality?.status || '-';
    const effectiveProvider = responsePayload?.provider || row.provider || 'none';
    lines.push(
      [
        `${new Date(row.created_at).toISOString()}`,
        row.event_type,
        effectiveProvider,
        row.status || 'unknown',
        row.fallback_used ? 'fallback' : 'direct',
        `${row.latency_ms || 0}ms`,
        `quality=${qualityStatus}`,
        row.error_message ? `error=${row.error_message}` : null,
      ]
        .filter(Boolean)
        .join(' | ')
    );
  }

  process.stdout.write(`${lines.join('\n')}\n`);
}

main().catch((error) => {
  process.stderr.write(`[report-ai-audit-log] ${error.message}\n`);
  process.exitCode = 1;
});
