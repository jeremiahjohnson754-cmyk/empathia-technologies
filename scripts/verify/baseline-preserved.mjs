#!/usr/bin/env node
// The founder's preserved baseline, checked: 1,099 requirements, 652 QA scenarios (every v1.7 identifier still present in v1.8) and the
// 52 world role configurations (13 Enterprise, 14 Stadium, 13 University, 12 Convention). The matrices themselves stay outside this
// public repository (.local/handoff); what is committed is their fingerprint (docs/v18/BASELINE_FINGERPRINTS.json). When the matrices
// are present this recomputes every count and hash and fails on any difference; when they are absent it says NOT_RUN, never PASS.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const H = path.join(root, '.local/handoff');
const want = JSON.parse(fs.readFileSync(path.join(root, 'docs/v18/BASELINE_FINGERPRINTS.json'), 'utf8'));
const FILES = { requirements_v1_8_consolidated: 'v1_8/matrices/EMPATHIA_CONSOLIDATED_REQUIREMENTS_v1_8.csv', qa_tests_v1_8_consolidated: 'v1_8/matrices/EMPATHIA_CONSOLIDATED_QA_TESTS_v1_8.csv', requirements_v1_8_only: 'v1_8/matrices/V1_8_ONLY_REQUIREMENTS.csv', qa_tests_v1_8_only: 'v1_8/matrices/V1_8_ONLY_QA_TESTS.csv', requirements_v1_7_consolidated: 'v1_7/matrices/EMPATHIA_CONSOLIDATED_REQUIREMENTS_v1_7.csv', qa_tests_v1_7_consolidated: 'v1_7/matrices/EMPATHIA_CONSOLIDATED_QA_TESTS_v1_7.csv', roles_all_52_v1_4: 'v1_4/matrices/FOUR_WORLDS_ROLE_NAVIGATION_ALL_52_v1_4.csv' };
if (!Object.values(FILES).every((f) => fs.existsSync(path.join(H, f)))) { console.log('NOT_RUN baseline: the handoff matrices are not on this machine (.local/handoff); the committed fingerprints were not re-checked'); process.exit(0); }
/** RFC 4180 rows (quoted fields may hold commas and newlines) */
function parse(text) { const rows = []; let row = [], cell = '', q = false; text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i += 1) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i += 1; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c; }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); } return rows.filter((r) => r.length > 1 || r[0] !== ''); }
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex'); let bad = 0; const ids = {};
for (const [k, f] of Object.entries(FILES)) {
  const buf = fs.readFileSync(path.join(H, f)); const [head, ...rows] = parse(buf.toString('utf8'));
  ids[k] = k === 'roles_all_52_v1_4' ? rows.map((r) => `${r[head.indexOf('world_type')]}/${r[head.indexOf('role_id')]}`) : rows.map((r) => r[0]);
  const got = { rows: rows.length, distinct_ids: new Set(ids[k]).size, sha256: sha(buf), ids_sha256: sha(ids[k].join('\n')) }; const w = want[k];
  const same = got.rows === w.rows && got.distinct_ids === w.distinct_ids && got.sha256 === w.sha256 && got.ids_sha256 === w.ids_sha256; if (!same) bad += 1;
  console.log(`${same ? 'PASS' : 'FAIL'} ${k}: ${got.rows} rows, ${got.distinct_ids} distinct identifiers${same ? '' : ` — expected ${w.rows}/${w.distinct_ids}, file or identifiers differ`}`);
}
const kept = (a, b) => ids[a].filter((x) => !new Set(ids[b]).has(x)).length;
const r7 = kept('requirements_v1_7_consolidated', 'requirements_v1_8_consolidated'), t7 = kept('qa_tests_v1_7_consolidated', 'qa_tests_v1_8_consolidated');
const worlds = {}; for (const x of ids.roles_all_52_v1_4) { const w = x.split('/')[0]; worlds[w] = (worlds[w] || 0) + 1; }
const rolesOk = worlds.enterprise === 13 && worlds.stadium === 14 && worlds.university === 13 && worlds.convention === 12;
console.log(`${r7 === 0 ? 'PASS' : 'FAIL'} every v1.7 requirement identifier is still in v1.8 (${r7} missing)`); console.log(`${t7 === 0 ? 'PASS' : 'FAIL'} every v1.7 test identifier is still in v1.8 (${t7} missing)`);
console.log(`${rolesOk ? 'PASS' : 'FAIL'} 52 role configurations: ${JSON.stringify(worlds)}`);
if (r7 || t7 || !rolesOk) bad += 1;
console.log(bad ? `\nbaseline FAIL (${bad})` : '\nbaseline PASS: 1,099 requirements, 652 tests and 52 role configurations preserved (tracked specifications, not passed tests)'); process.exit(bad ? 1 : 0);
