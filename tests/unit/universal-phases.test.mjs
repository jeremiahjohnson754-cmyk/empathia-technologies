// The universal phase engine (apps/demo/src/phases/universal.ts), shared by commissioning and ServiceHands.
//   UP-01  the verdict rule; the sign-off waits for every phase, for verification, and never takes a signer who did the work
//   UP-02  commissioning's phase verdicts on all rooms are exactly what the rule gave before the engine was shared (the old formula is
//          kept here as the reference)
//   UP-03  a ServiceHands job, phase by phase: a fresh request is intake only; a closed, verified, confirmed job passes every phase and
//          its sign-off; a fix verified by its own technician fails verification
//   node --test tests/unit/universal-phases.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'phases-')), 'm.mjs');
await esbuild.build({ stdin: { contents: "export * as U from './phases/universal.ts'; export * as CX from './campus/cxRecord.ts'; export * as SP from './service/phases.ts'; export * as S from './workspace/store.ts'; export { allRecords } from './campus/design.ts';", resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', define: { 'process.env.DEMO_BUILD_ID': '"test"' } });
const { U, CX, SP, S, allRecords } = await import(pathToFileURL(out).href);

test('UP-01 the verdict rule and the sign-off', () => {
  const v = (...r) => U.verdictOf(r.map((result) => ({ result })));
  assert.deepEqual([v(), v('na'), v('pass', 'fail'), v('pass', 'ran'), v('pass', 'pending'), v('pending', 'pending'), v('pass', 'pass')], ['none', 'none', 'fail', 'pass', 'partial', 'notrun', 'pass']);
  const defs = [{ n: 1, name: 'A', q: '' }, { n: 2, name: 'B', q: '' }];
  const run = (items) => U.runPhases(defs, items);
  assert.equal(U.signOff(run([{ id: 'a', phase: 1, label: 'a', result: 'pass', why: '' }, { id: 'b', phase: 2, label: 'b', result: 'pass', why: '', by: 'tech' }]), 'mgr').ready, true);
  assert.match(U.signOff(run([{ id: 'a', phase: 1, label: 'a', result: 'pass', why: '' }, { id: 'b', phase: 2, label: 'b', result: 'ran', why: '' }]), 'mgr').why.join(), /awaiting verification/);
  assert.match(U.signOff(run([{ id: 'a', phase: 1, label: 'a', result: 'fail', why: '' }]), 'mgr').why.join(), /failed item/);
  assert.match(U.signOff(run([{ id: 'a', phase: 1, label: 'a', result: 'pass', why: '', by: 'mgr' }]), 'mgr').why.join(), /separation of duties/);
});

test('UP-02 commissioning’s phase verdicts are unchanged on every room', () => {
  const old = (r) => CX.PHASES.map(([n]) => { const ps = CX.rowsOf(r).filter((x) => x.applicable && x.phase === n); const pass = ps.filter((x) => x.result === 'PASS_VERIFIED').length; const fail = ps.filter((x) => x.result === 'FAIL').length; const run = ps.filter((x) => x.result && x.result !== 'NOT_TESTED').length;
    return { n, pass, fail, run, len: ps.length, verdict: !ps.length ? 'none' : fail ? 'fail' : run < ps.length ? (run ? 'partial' : 'notrun') : 'pass' }; });
  let n = 0;
  for (const r of allRecords()) { const now = CX.phaseStats(r); const was = old(r); n++;
    assert.deepEqual(now.map((p) => [p.n, p.pass, p.fail, p.run, p.rows.length, p.verdict]), was.map((p) => [p.n, p.pass, p.fail, p.run, p.len, p.verdict]), r.outline.id); }
  assert.ok(n >= 90, `${n} rooms`);
});

test('UP-03 a ServiceHands job, phase by phase', () => {
  const w = S.seed();
  const fresh = w.incidents.find((i) => i.state === 'OPEN' || i.state === 'TRIAGED');
  const p0 = SP.servicePhases(fresh, null);
  assert.equal(p0.run.length, 5); assert.equal(p0.signOff.done, false); assert.ok(['pass', 'partial'].includes(p0.run[0].verdict)); assert.ok(p0.run.slice(2).every((p) => p.verdict === 'notrun'));
  const closed = w.incidents.find((i) => i.state === 'CLOSED' && i.requesterConfirmed && i.verifiedBy);
  const wo = closed.workOrderId ? w.workOrders.find((x) => x.id === closed.workOrderId) : null;
  const p1 = SP.servicePhases(closed, wo);
  assert.equal(p1.signOff.done, true); assert.equal(p1.signOff.by, closed.history.find((h) => h.to === 'CLOSED').by);
  assert.ok(p1.run.find((p) => p.n === 4).verdict === 'pass' && p1.run.find((p) => p.n === 5).verdict === 'pass', JSON.stringify(p1.run.map((p) => [p.n, p.verdict])));
  const self = { ...closed, verifiedBy: 'tech-x' }; const woSelf = { ...(wo || { evidence: [], preflight: null }), techId: 'tech-x' };
  assert.equal(SP.servicePhases(self, woSelf).run.find((p) => p.n === 4).verdict, 'fail', 'verified by its own technician');
});
