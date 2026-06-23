'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runSeedCheck(outputDir) {
  const scriptPath = path.resolve(__dirname, 'seed-disease-graph-data.js');
  const result = spawnSync(process.execPath, [
    scriptPath,
    '--offline',
    '--strict',
    '--min-diseases=0',
    '--min-drugs=0',
    '--max-api-pages=0',
    `--output-dir=${outputDir}`,
  ], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`Offline strict seed check failed.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
}

function validateArtifacts(outputDir) {
  const reportPath = path.join(outputDir, 'scrape_report.json');
  const importSqlPath = path.join(outputDir, 'import.sql');
  assert(fs.existsSync(reportPath), `Missing report artifact: ${reportPath}`);
  assert(fs.existsSync(importSqlPath), `Missing import artifact: ${importSqlPath}`);

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const importSql = fs.readFileSync(importSqlPath, 'utf8');

  assert(report.options?.strict === true, 'Report must record strict mode as enabled.');
  assert(report.options?.offline === true, 'Report must record offline mode as enabled.');
  assert(report.strict_status?.enabled === true, 'strict_status.enabled must be true.');
  assert(report.strict_status?.passed === true, 'Offline strict smoke check should pass.');
  assert(report.source_coverage?.diseases?.synthetic_rows === 0, 'Strict mode must not emit synthetic disease rows.');
  assert(report.source_coverage?.drugs?.synthetic_rows === 0, 'Strict mode must not emit synthetic drug rows.');
  assert(typeof report.source_coverage?.diseases?.public_source_rows === 'number', 'Disease public-source coverage must be reported.');
  assert(typeof report.source_coverage?.drugs?.public_source_rows === 'number', 'Drug public-source coverage must be reported.');
  assert(Array.isArray(report.warnings), 'Warnings must be present as an array.');
  assert(importSql.includes("source_primary = 'local_synthetic_review'"), 'Import SQL must warn against promoting synthetic rows.');
}

function main() {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medassist-disease-graph-check-'));
  runSeedCheck(outputDir);
  validateArtifacts(outputDir);
  console.log(`Disease graph offline strict check passed: ${outputDir}`);
}

if (require.main === module) {
  main();
}
