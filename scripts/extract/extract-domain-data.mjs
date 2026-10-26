// Extract the demonstrator's domain tables (data only, no code) from a built demonstrator page, so the production engines use the
// exact same rules the audited demonstrator uses. Top-level `const` tables of the demonstrator's classic script are global lexical
// bindings, so page.evaluate can read them by name. Functions inside a table are dropped (recorded as "<fn>").
//   node scripts/extract/extract-domain-data.mjs <demonstrator.html> <out-dir>
const { chromium } = await import('/opt/npm-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const [file, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const NAMES = ['V25_TESTS', 'V25_TEST_LABEL', 'V25_CX_CATALOGUE', 'V25_CX_PACKS', 'V25_ROOM_TYPE', 'V25_DOMAIN_PERSONA', 'V25_VERIFIER_PERSONAS', 'V25_ROOM_CATS', 'V25_ROOM_TEMPLATES',
  'V25_ROOM_REQUIRED', 'V25_ROOM_ROLEOK', 'V25_ROOM_INFO', 'V25_ROOM_LIFECYCLE', 'V25_ROOM_RESULTS', 'ARCHETYPES', 'V25_PERSONAS', 'V25_EV', 'V25_PHASES', 'V25_GUARDS', 'TYPES', 'RELS'];
const b = await chromium.launch(); const page = await b.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
// the demonstrator's script is one strict IIFE; a temporary copy (never shipped) gets one line inside it that lets this extractor read a table by name
const html = fs.readFileSync(file, 'utf8'); const at = html.indexOf("'use strict';"); const end = html.indexOf('\n})();\n</script>', at); if (at < 0 || end < 0) throw new Error('unexpected page structure');
const tmp = path.join(out, '.extract-tmp.html'); fs.writeFileSync(tmp, html.slice(0, end) + '\n;window.__EMPATHIA_EXTRACT__ = (n) => eval(n);\n' + html.slice(end));
await page.goto('file://' + path.resolve(tmp) + '#/home'); await page.waitForFunction('window.__V25__ && window.__V25__.room'); await page.waitForTimeout(300);
const data = await page.evaluate((names) => { const X = window.__EMPATHIA_EXTRACT__; const clean = (v, seen = new WeakSet()) => { if (typeof v === 'function') return '<fn>'; if (!v || typeof v !== 'object') return v; if (seen.has(v)) return '<cycle>'; seen.add(v); if (Array.isArray(v)) return v.map((x) => clean(x, seen)); const o = {}; for (const k of Object.keys(v)) o[k] = clean(v[k], seen); return o; };
  const out = {}; for (const n of names) { try { out[n] = clean(X(n)); } catch (e) { out[n] = { error: String(e.message) }; } }
  out.V25_DESIGN_rulePack = clean(X('V25_DESIGN').rulePack); const fam = X('v25RoomFamily'); out.V25_ROOM_FAMILY = Object.fromEntries(Object.keys(X('V25_ROOM_CATS')).map((c) => [c, fam(c)])); return out; }, NAMES);
const src = fs.readFileSync(file); const prov = { extractedFrom: path.basename(file), sha256: crypto.createHash('sha256').update(src).digest('hex'), at: new Date().toISOString(), tables: {} };
for (const [k, v] of Object.entries(data)) { const s = JSON.stringify(v, null, 1); fs.writeFileSync(path.join(out, `${k}.json`), s + '\n'); prov.tables[k] = { sha256: crypto.createHash('sha256').update(s).digest('hex'), entries: v && typeof v === 'object' ? Object.keys(v).length : null }; }
fs.writeFileSync(path.join(out, 'PROVENANCE.json'), JSON.stringify(prov, null, 1)); await b.close(); fs.unlinkSync(tmp);
console.log(JSON.stringify({ tables: Object.fromEntries(Object.entries(prov.tables).map(([k, v]) => [k, v.entries])), errors: errs }));
