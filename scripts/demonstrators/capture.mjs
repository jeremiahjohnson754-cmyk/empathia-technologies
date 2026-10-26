#!/usr/bin/env node
/**
 * Open every launchable demonstrator in the registry (read-only, from disk), record whether it loads without page errors, its
 * title and SHA-256, and capture one desktop screenshot (JPEG). Writes media/screenshots/demonstrators/ and
 * docs/product/DEMONSTRATOR_INDEX.{json,md}.
 *   node scripts/demonstrators/capture.mjs [workspace-root]
 */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ws = path.resolve(process.argv[2] || '/home/claude');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const reg = JSON.parse(fs.readFileSync(path.join(repo, 'scripts/demonstrators/registry.json'), 'utf8')).demonstrators;
const shots = path.join(repo, 'media/screenshots/demonstrators'); fs.mkdirSync(shots, { recursive: true });
const b = await chromium.launch(); const out = [];
for (const d of reg) {
  const abs = path.join(ws, d.path); const rec = { ...d, exists: fs.existsSync(abs) };
  if (rec.exists) {
    rec.sha256 = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex'); rec.bytes = fs.statSync(abs).size;
    const p = await b.newPage({ viewport: { width: 1366, height: 860 } }); const errs = []; const ext = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('request', (r) => { if (!/^(file|data|blob|about):/.test(r.url())) ext.push(r.url()); });
    // block any network request: a demonstrator must work offline, and nothing may leave this computer during capture
    await p.route(/^https?:/, (r) => r.abort());
    try { await p.goto(`file://${abs}${d.route || ''}`, { timeout: 60000 }); await p.waitForTimeout(3500); rec.title = await p.title(); await p.screenshot({ path: path.join(shots, `${d.id}.jpg`), type: 'jpeg', quality: 72 }); rec.screenshot = `media/screenshots/demonstrators/${d.id}.jpg`; }
    catch (e) { errs.push(`load: ${e.message.split('\n')[0]}`); }
    rec.loads = errs.length === 0 ? 'PASS' : 'FAIL'; rec.pageErrors = errs.slice(0, 3); rec.networkAttempts = ext.length; await p.close();
  } else { rec.loads = 'NOT_FOUND'; }
  out.push(rec); console.log(`${rec.loads.padEnd(9)} ${d.id} ${rec.networkAttempts ? `(${rec.networkAttempts} network attempts blocked)` : ''}`);
}
await b.close();
fs.mkdirSync(path.join(repo, 'docs/product'), { recursive: true });
fs.writeFileSync(path.join(repo, 'docs/product/DEMONSTRATOR_INDEX.json'), JSON.stringify({ capturedAt: new Date().toISOString(), demonstrators: out }, null, 1));
const md = [`# Demonstrator index`, '', `*Every launchable demonstration in the founder workspace, opened from disk and captured on ${new Date().toISOString().slice(0, 10)} by \`scripts/demonstrators/capture.mjs\` (network blocked during capture). All data synthetic. Nothing here is authorized for external distribution.*`, '',
  '| demonstrator | version | loads offline | classification |', '|---|---|---|---|',
  ...out.map((d) => `| [${d.title}](#${d.id}) | ${d.version} | ${d.loads}${d.networkAttempts ? ` (${d.networkAttempts} network attempts blocked)` : ''} | ${d.class} |`), '',
  ...out.flatMap((d) => [`## ${d.title}`, `<a id="${d.id}"></a>`, '', d.screenshot ? `![${d.title}](../../${d.screenshot})` : '', '',
    '| field | value |', '|---|---|',
    `| version | ${d.version} |`, `| file | \`${d.path}\` |`, `| SHA-256 | \`${d.sha256 || 'n/a'}\` |`, `| title on load | ${d.title || 'n/a'} |`, `| launch | ${d.launch} |`,
    `| supported interactions | ${d.interactions} |`, `| data source | ${d.data} |`, `| synthetic-data disclosure | all people, rooms, figures and approvals are synthetic |`, `| known limitations | ${d.limitations} |`,
    `| dependencies | ${d.deps} |`, `| test evidence | ${d.tests} |`, `| rights / distribution | ${d.class} |`, `| source | \`${d.source}\` |`, `| loads offline (this capture) | ${d.loads}${d.pageErrors && d.pageErrors.length ? ` — ${d.pageErrors.join('; ').replace(/\|/g, '/')}` : ''} |`, ''])].join('\n');
fs.writeFileSync(path.join(repo, 'docs/product/DEMONSTRATOR_INDEX.md'), md);
console.log(`${out.filter((d) => d.loads === 'PASS').length} of ${out.length} load without page errors`);
