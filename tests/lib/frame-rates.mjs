// The frame rates the 3D scene suites measure, kept with the evidence of the run that measured them (roadmap A19; founder, 24 Nov 2026:
// spatial rendering performance is "my biggest concern").
//
// Before this file the suites printed each figure in the title of its check. The exact-commit regression on 87956a57 passed, and the
// committed record of it said PASS for the frame-rate checks and nothing about what they measured: the per-check files a browser suite
// writes are under tests/evidence/demo-shell, which git ignores. So there was no history of the figures to compare run against run.
//
//   a suite calls        recordFrameRates('campus', [{ check: 'CL-13', mode: 'adapted', what: '…', fps: 18, detail: 50, floor: 8, triangles: 28412, draws: 103 }], { renderer })
//                        mode is 'full' (the scene held at full detail with ?detail=full) or 'adapted' (left alone, as a visitor opens it)
//   which writes         <evidence>/performance/<scene>.json   (tests/evidence in a run of record; .local otherwise, as all evidence)
//   the merge then puts  the figures of THIS commit's files in the run's line of tests/REGRESSION_LEDGER.jsonl and in TEST_RESULTS.md
//
// Every figure is of the machine that ran the tests. It is never a device figure, and the file says so in its own text.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evidencePath } from './evidence.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const NOT_A_DEVICE = 'Measured on the machine that ran the tests, in headless Chromium. Not a measurement of any visitor’s device. The target for ordinary hardware is 30 frames a second; no device has been measured.';
const SCENE = /^[a-z][a-z0-9-]{1,30}$/;
const head = () => { const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : ''; };

/** one reading, checked: a figure that is not a number is refused rather than written as one */
export function reading(r) {
  const bad = (why) => { throw new Error(`frame-rate reading refused: ${why} (${JSON.stringify(r)})`); };
  if (!r || typeof r.check !== 'string' || !/^[A-Z]{2,4}-\d{1,3}[a-z]?$/.test(r.check)) bad('no check id');
  if (r.mode !== 'full' && r.mode !== 'adapted') bad('mode is neither full nor adapted');
  if (typeof r.what !== 'string' || r.what.length < 8) bad('does not say what was measured');
  if (!Number.isFinite(r.fps) || r.fps < 0 || r.fps > 1000) bad('fps is not a plausible number');
  if (!Number.isFinite(r.detail) || r.detail < 50 || r.detail > 100) bad('detail is not between 50 and 100');
  if (r.mode === 'full' && r.detail !== 100) bad('held at full detail but not drawn at 100%');
  if (r.floor !== undefined && !(Number.isFinite(r.floor) && r.floor >= 0)) bad('floor is not a number');
  // what the frame cost, counted: triangles and draw calls (the renderer's own count; the same on every machine, which fps is not)
  for (const k of ['triangles', 'draws']) if (r[k] !== undefined && !(Number.isInteger(r[k]) && r[k] > 0)) bad(`${k} is not a count`);
  return { check: r.check, mode: r.mode, what: r.what, fps: r.fps, detail: r.detail, ...(r.floor !== undefined ? { floor: r.floor } : {}), ...(r.triangles !== undefined ? { triangles: r.triangles } : {}), ...(r.draws !== undefined ? { draws: r.draws } : {}) };
}

/** write a scene's readings beside the rest of this run's evidence; returns the path */
export function recordFrameRates(scene, readings, { renderer = '', dir = evidencePath('performance'), commit = head() } = {}) {
  if (!SCENE.test(scene)) throw new Error(`frame rates: not a scene name: ${scene}`);
  if (!Array.isArray(readings) || !readings.length) throw new Error(`frame rates: no readings for ${scene}`);
  const rec = { scene, at: new Date().toISOString(), commit, machine: { cores: os.cpus().length, renderer: String(renderer).slice(0, 200) }, note: NOT_A_DEVICE, readings: readings.map(reading) };
  fs.mkdirSync(dir, { recursive: true }); const file = path.join(dir, `${scene}.json`);
  fs.writeFileSync(file, JSON.stringify(rec, null, 1) + '\n'); return file;
}

/** the readings in a directory that were written on this commit: { scene: { 'CHECK mode': { fps, detail, floor? } } }, and the machine they share */
export function collectFrameRates(dir, commit) {
  const out = { scenes: {}, machine: null };
  if (!commit || !fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    let rec; try { rec = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    if (!rec || rec.commit !== commit || !SCENE.test(rec.scene || '') || !Array.isArray(rec.readings)) continue; // a file left by a run on another commit is not this run's
    try { out.scenes[rec.scene] = Object.fromEntries(rec.readings.map(reading).map((r) => [`${r.check} ${r.mode}`, { fps: r.fps, detail: r.detail, ...(r.floor !== undefined ? { floor: r.floor } : {}), ...(r.triangles !== undefined ? { triangles: r.triangles } : {}), ...(r.draws !== undefined ? { draws: r.draws } : {}) }])); } catch { continue; }
    out.machine ??= rec.machine || null;
  }
  return out;
}

/** the lines for TEST_RESULTS.md; none when nothing was measured on this commit */
export function frameRateLines(dir, commit) {
  const { scenes, machine } = collectFrameRates(dir, commit); const names = Object.keys(scenes); if (!names.length) return [];
  const what = (scene, key) => { try { return JSON.parse(fs.readFileSync(path.join(dir, `${scene}.json`), 'utf8')).readings.find((r) => `${r.check} ${r.mode}` === key)?.what || ''; } catch { return ''; } };
  return ['', '## Frame rates this run measured', '', `${NOT_A_DEVICE} Machine: ${machine?.cores ?? '?'} cores; WebGL drawn by ${machine?.renderer || 'an unreported renderer'}.`, '',
    '| Scene | Check and mode | What | Frames a second | Drawn at | Floor | Triangles a frame | Draw calls |', '|---|---|---|---|---|---|---|---|',
    ...names.flatMap((s) => Object.entries(scenes[s]).map(([c, r]) => `| ${s} | ${c} | ${what(s, c).replace(/\|/g, '/')} | ${r.fps} | ${r.detail}% | ${r.floor ?? '—'} | ${r.triangles ?? '—'} | ${r.draws ?? '—'} |`))];
}

/** what draws WebGL in this page, as the browser reports it (asked after measuring, so the question costs the measurement nothing) */
export const glRenderer = (page) => page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); if (!g) return 'no WebGL2';
  const e = g.getExtension('WEBGL_debug_renderer_info'); const s = String(e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)); return s; }).catch(() => 'not reported');
