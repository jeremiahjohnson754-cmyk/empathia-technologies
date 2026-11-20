// ServiceHands dispatch planning (12 Nov 2026): the staging journey found that the seeded job could not pass its preflight through
// the page (no control re-planned the booked window or rechecked stale stock). replanWindow and recheckStock close that dead end
// under the same authorities as the rest of the service flow, and the ledger records both.
//   node --test tests/unit/service-dispatch-plan.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'svc-plan-')), 'm.mjs');
await esbuild.build({ stdin: { contents: "export * as W from './workspace/store.ts'; export { overlaps } from '@empathia/service-engine';", resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')],
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { W, overlaps } = await import(pathToFileURL(out).href);
const ready = () => { mem.clear(); const w = W.seed(); assert.equal(W.triage(w, 'svcmgr', 'ISS-0417', 'High'), null); assert.equal(W.assign(w, 'svcmgr', 'ISS-0417', 'tech-ana'), null); assert.equal(W.accept(w, 'service', 'ISS-0417'), null); return w; };
const wo = (w) => W.workOrderOf(w, W.incidentOf(w, 'ISS-0417').workOrderId);
const blocked = (w) => W.preflightFor(w, wo(w).id, { access: true, safety: true, heightPermit: true, tools: ['audio analyser', 'laptop with the DSP tool'] }).checks.filter((c) => !c.ok).map((c) => c.id);

test('the seeded job is blocked by the booked window and stale stock until the plan is changed', () => {
  const w = ready(); const b = blocked(w); assert.ok(b.includes('booking'), b.join()); assert.ok(b.length >= 2, b.join());
});
test('the service manager re-plans to a free window at least a day ahead; the technician may not; the ledger records it', () => {
  const w = ready();
  const r = W.replanWindow(w, 'service', 'ISS-0417'); assert.ok(r && /does not hold service\.assign/.test(r.why.join()), JSON.stringify(r));
  assert.equal(W.replanWindow(w, 'svcmgr', 'ISS-0417'), null); const win = wo(w).window;
  assert.ok(Date.parse(win.from + 'Z') >= Date.now() + 864e5 - 6e4); assert.ok(!(w.bookings['R-ATL-4-218'] || []).some((x) => overlaps(win, x)));
  assert.ok(w.events.some((e) => e.type === 'service.replan' && e.outcome === 'ALLOWED')); assert.ok(w.events.some((e) => e.type === 'service.replan' && e.outcome === 'DENIED'));
});
test('stale stock is rechecked by the manager or the assigned technician, not by an executive; then the preflight passes and the work starts', () => {
  const w = ready(); assert.equal(W.replanWindow(w, 'svcmgr', 'ISS-0417'), null);
  const stale = Object.keys(w.stock).filter((p) => W.stockOf(w, p).stale);
  assert.ok(stale.length >= 1); const r = W.recheckStock(w, 'exec', 'ISS-0417', stale[0]); assert.ok(r, 'an executive is refused');
  for (const p of stale) assert.equal(W.recheckStock(w, 'service', 'ISS-0417', p), null);
  assert.deepEqual(blocked(w), []);
  assert.equal(W.start(w, 'service', 'ISS-0417', { access: true, safety: true, heightPermit: true, tools: ['audio analyser', 'laptop with the DSP tool'] }), null);
  assert.equal(W.incidentOf(w, 'ISS-0417').state, 'IN_PROGRESS'); assert.ok(w.events.some((e) => e.type === 'service.stock' && /no inventory system/.test(e.detail)));
});
