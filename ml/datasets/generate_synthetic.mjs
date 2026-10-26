#!/usr/bin/env node
/**
 * SYNTHETIC dataset generator for the first-attempt test-failure research prototype.
 *
 * Features are REAL engine output: random rooms (template, occupancy, extra devices) are analysed by @empathia/commissioning-engine,
 * and every applicable test becomes one row with its domain, phase, tier, instrument flag and the room's context.
 * Labels are SYNTHETIC: drawn from the declared ground-truth function `truth()` below with a fixed seed. They describe no real room,
 * installer or product. A model trained on them can at best rediscover `truth()`; it has no real-world predictive validity.
 *
 *   node ml/datasets/generate_synthetic.mjs [--rooms=1500] [--seed=20261026]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const E = await import(path.join(repo, 'packages/commissioning-engine/dist/src/index.js'));
const arg = (k, d) => Number((process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d);
const ROOMS = arg('rooms', 1500), SEED = arg('seed', 20261026);

// mulberry32: small, seeded, reproducible
let s = SEED >>> 0; const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const pick = (a) => a[Math.floor(rnd() * a.length)];

/** THE DECLARED GROUND TRUTH (synthetic). Logit of a first-attempt FAIL for one applicable test in one room. */
const DOMAIN = { Audio: 0.45, Video: 0.30, Network: 0.25, Cybersecurity: 0.20, Control: 0.15, Compute: 0.10 };
export function truth(r) {
  return -2.2 + (r.tier === 1 ? 0.5 : 0) + (r.phase >= 3 ? 0.35 : 0) + (r.instrument ? 0.6 : 0) + 0.03 * (r.n_devices - 10) + (DOMAIN[r.domain] || 0) + (r.large_room ? 0.3 : 0) + (r.new_install ? 0 : -0.2);
}
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

const C = E.defaultCatalog;
const TEMPLATES = ['huddle', 'small_conf', 'medium_conf', 'boardroom', 'executive', 'training', 'townhall', 'auditorium', 'collab'];
const EXTRA = ['display', 'camera', 'micceil', 'speaker', 'dsp', 'touch', 'scheduler', 'switch', 'compute'];
const LARGE = new Set(['Townhall', 'Auditorium', 'Training Room', 'Boardroom']);
const rows = [];
for (let i = 0; i < ROOMS; i += 1) {
  const template = pick(TEMPLATES); const T = C.templates[template];
  const outline = E.outlineFor('rect', T.dims[1], T.dims[0]);
  let n = 0; const devices = E.templateDevices(template, outline, () => `PA-${++n}`, C);
  for (let k = Math.floor(rnd() * 4); k > 0; k -= 1) { const id = `PA-${++n}`; devices.push(E.newDevice(id, pick(EXTRA), devices, { x: rnd() * T.dims[1], y: rnd() * T.dims[0] }, '', C)); }
  const occupancy = Math.max(1, Math.round((T.occ || 6) * (0.6 + rnd() * 0.8)));
  const d = { template, intendedUse: T.use || '', occupancy, lifecycle: 'PLANNED', coreRoomId: `SYN-${i}`, geometry: { shape: 'rect', points: outline, ceiling: T.dims[2], lengthM: T.dims[0], widthM: T.dims[1], provenance: {}, confidence: 'modeled' }, devices, connections: [], classification: { approved: null }, results: {} };
  const a = E.analyzeRoom(d, C);
  const nDev = devices.filter((x) => !x.furniture).length; const fams = new Set(devices.filter((x) => !x.furniture).map((x) => x.cat)).size;
  const newInstall = rnd() < 0.7;
  for (const r of a.applicability.rows.filter((x) => x.applicable)) {
    const f = { room: `SYN-${i}`, template, archetype: a.archetype || 'NONE', occupancy, n_devices: nDev, n_families: fams, large_room: LARGE.has(a.classification.archetypeName) ? 1 : 0, new_install: newInstall ? 1 : 0, test_id: r.id, domain: r.domain, phase: r.phase, tier: r.tier, instrument: r.instrument ? 1 : 0 };
    const p = sigmoid(truth(f) + 0.3 * gauss());
    rows.push({ ...f, true_p: Math.round(p * 1e4) / 1e4, failed_first_attempt: rnd() < p ? 1 : 0 });
  }
}
const cols = Object.keys(rows[0]);
const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => String(r[c])).join(','))].join('\n') + '\n';
const out = path.join(here, 'synthetic_first_attempt_v1.csv');
fs.writeFileSync(out, csv);
const meta = { dataset: 'synthetic_first_attempt_v1', synthetic: true, rooms: ROOMS, rows: rows.length, seed: SEED, positives: rows.filter((r) => r.failed_first_attempt).length, engineVersion: E.ENGINE_VERSION, generator: 'ml/datasets/generate_synthetic.mjs', groundTruth: 'truth() in the generator (declared, synthetic)', columns: cols, sha256: crypto.createHash('sha256').update(csv).digest('hex'), createdAt: new Date().toISOString() };
fs.writeFileSync(path.join(here, 'synthetic_first_attempt_v1.meta.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(`${rows.length} rows from ${ROOMS} synthetic rooms (${meta.positives} synthetic first-attempt failures) → ${path.relative(repo, out)} sha256 ${meta.sha256.slice(0, 16)}…`);
