// People and experience (apps/demo/src/people/involvement.ts): who did each job is stable; a job's experience is room complexity × kind
// × severity; a person's total is the sum of their jobs and equals the sum over layers and over quarters; levels name experience only.
//   node --test tests/unit/people-involvement.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'people-')), 'm.mjs');
await esbuild.build({ stdin: { contents: "export * as P from './people/involvement.ts'; export * as H from './service/history.ts'; export * as S from './workspace/store.ts'; export { roomRecord } from './campus/design.ts';", resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', define: { 'process.env.DEMO_BUILD_ID': '"test"' } });
const { P, H, S, roomRecord } = await import(pathToFileURL(out).href);
const close = (a, b) => Math.abs(a - b) < 0.5;

test('PI-01 who did a job is stable, and always a person of the job’s vendor (internal jobs to the internal team)', () => {
  const jobs = H.syntheticHistory();
  for (const j of jobs.slice(0, 200)) {
    const a = P.technicianOf(j); assert.equal(a, P.technicianOf(j), 'deterministic');
    const who = P.personOf(a); assert.ok(who, a); assert.equal(who.vendor === H.INTERNAL, j.vendor === H.INTERNAL, `${j.id} ${j.vendor} → ${a}`);
    if (j.vendor !== H.INTERNAL) assert.equal(who.vendor, j.vendor);
  }
  const ws = S.seed(); ws.workOrders[0].techId = 'tech-dev';
  const wj = H.workspaceJobs(ws).find((j) => j.id === ws.workOrders[0].incidentId); assert.equal(P.technicianOf(wj), 'tech-dev', 'a work order’s technician is who did it');
});

test('PI-02 a job’s experience is room complexity × kind × severity', () => {
  const j = H.syntheticHistory().find((x) => x.kind === 'change' && x.severity === 'High');
  const c = P.roomComplexity(roomRecord(j.roomId)).weight; assert.ok([1, 1.5, 2, 2.5, 3, 3.5].includes(c), String(c));
  assert.equal(P.jobPoints(j), Math.round(c * 1.5 * 1.2 * 10) / 10);
  assert.equal(P.levelOf(0), 'Started'); assert.equal(P.levelOf(39.9), 'Practised'); assert.equal(P.levelOf(40), 'Experienced'); assert.equal(P.levelOf(250), 'Deep experience');
});

test('PI-03 a person’s total is the sum of their worked jobs, and equals the sums over layers and over quarters; unworked jobs give none', () => {
  const people = P.involvement(H.syntheticHistory());
  assert.ok(people.length >= 8);
  for (const x of people) {
    const sum = x.jobs.reduce((s, j) => s + P.jobPoints(j), 0);
    assert.ok(close(x.points, sum) && close(x.points, Object.values(x.byLayer).reduce((a, b) => a + b, 0)) && close(x.points, Object.values(x.byQuarter).reduce((a, b) => a + b, 0)), x.person.id);
    assert.ok(x.jobs.every((j) => j.respondedAt || j.restoredAt)); assert.equal(x.level, P.levelOf(x.points));
  }
  assert.ok(people.every((x, i) => i === 0 || people[i - 1].points >= x.points), 'most experience first');
});

test('PI-04 everyone who touched a room: its people from its jobs and the roles on its record (refused steps are not involvement)', () => {
  const jobs = H.syntheticHistory(); const room = jobs.find((j) => j.respondedAt).roomId;
  const t = P.whoTouched(jobs, [room]);
  assert.ok(t.people.length >= 1 && t.people.every((x) => x.jobs >= 1 && x.layers.length >= 1)); assert.ok(t.roles.length >= 1);
  const denied = (roomRecord(room).events || []).filter((e) => e.outcome === 'DENIED').length;
  assert.equal(t.roles.reduce((s, r) => s + r.steps, 0), roomRecord(room).events.length - denied);
});
