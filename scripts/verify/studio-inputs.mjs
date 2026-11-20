#!/usr/bin/env node
// The Founder Studio is generated from committed inputs (apps/founder-studio/inputs). This checks each file against its SHA-256 in
// INPUTS.json, so a studio build can never silently use a changed or truncated input. Exit 1 on any mismatch or missing file.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const dir = path.join(root, 'apps/founder-studio/inputs');
const m = JSON.parse(fs.readFileSync(path.join(dir, 'INPUTS.json'), 'utf8')); const bad = [];
for (const f of m.files) { const p = path.join(dir, f.path); if (!fs.existsSync(p)) { bad.push(`${f.path}: missing`); continue; } const h = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); if (h !== f.sha256) bad.push(`${f.path}: sha256 ${h.slice(0, 12)}… ≠ ${f.sha256.slice(0, 12)}…`); }
if (bad.length) { console.error('studio inputs do not match INPUTS.json:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log(`studio inputs: ${m.files.length} files match INPUTS.json`);
