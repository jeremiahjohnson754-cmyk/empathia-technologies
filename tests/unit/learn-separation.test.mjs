// Learn cases keep separation of duties in the store, not only on the page (14 Nov 2026: the Learn page stopped offering the proposer an SME
// review the store refuses, so the browser suite no longer exercises the refusal; this keeps it exercised, with the DENIED ledger event).
//   LS-01  the proposer's own SME review is refused, and the refusal is in the ledger with its reason
//   LS-02  the steward who proposed a case does not approve it, even after an independent SME review
//   node --test tests/unit/learn-separation.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'learn-sep-')), 'm.mjs');
await esbuild.build({ stdin: { contents: "export * as S from './workspace/store.ts';", resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', define: { 'process.env.DEMO_BUILD_ID': '"test"' } });
const { S } = await import(pathToFileURL(out).href);

function proposed() {
  const w = S.seed(); const inc = w.incidents.find((i) => i.id === 'ISS-0417') || w.incidents[0]; inc.state = 'RESOLVED';   // fixture: a resolved incident to learn from
  const r = S.proposeCase(w, 'cxeng', inc.id, { title: 'Display drops after a firmware push', lesson: 'Check the scaler profile after any firmware change.', permission: true, deidentified: true });
  assert.ok(r && 'id' in r, `the case is proposed: ${JSON.stringify(r)}`); return { w, id: r.id };
}

test('LS-01 the proposer’s own SME review is refused, and the refusal is in the ledger with its reason', () => {
  const { w, id } = proposed(); const n = w.events.length;
  const r = S.smeReview(w, 'cxeng', id, 'approve', '');
  assert.ok(r, 'refused'); assert.equal(w.learnCases.find((c) => c.id === id).state, 'PROPOSED');
  const ev = w.events.slice(0, w.events.length - n + 1).find((e) => e.type === 'learn.sme_review' && e.outcome === 'DENIED');
  assert.ok(ev && /separation of duties/.test(ev.detail) && ev.by === 'cxeng', JSON.stringify(ev));
});

test('LS-02 the steward who proposed a case does not approve it, even after an independent SME review; the refusal names separation of duties', () => {
  const w = S.seed(); const inc = w.incidents.find((i) => i.id === 'ISS-0417') || w.incidents[0]; inc.state = 'RESOLVED';
  const p = S.proposeCase(w, 'steward', inc.id, { title: 'Display drops after a firmware push', lesson: 'Check the scaler profile after any firmware change.', permission: true, deidentified: true });
  assert.ok(p && 'id' in p, JSON.stringify(p));
  assert.equal(S.smeReview(w, 'syseng', p.id, 'approve', 'checked'), null, 'a different subject-matter reviewer');
  assert.ok(S.approveCase(w, 'steward', p.id), 'refused');
  assert.equal(w.learnCases.find((c) => c.id === p.id).state, 'SME_REVIEWED');
  const ev = w.events.find((e) => e.type === 'training.case_approved' && e.outcome === 'DENIED');
  assert.ok(ev && /separation of duties/.test(ev.detail), JSON.stringify(ev));
});
