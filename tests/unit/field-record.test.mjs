// Phase 1 field record and redlines (apps/demo/src/install/fieldRecord.ts; founder, 14 Nov 2026): who may record, what a mounting needs,
// hookups against the design, field moves decided independently, notes resolved, and every refusal logged.
//   FR-01  the installation team records; a designer or an employee is refused, with the reason, and the refusal is logged
//   FR-02  a mounting needs its method and fixing; an overhead mounting says whether a safety tether is fitted; versions are kept
//   FR-03  a hookup is compared with the design (as designed / not in the design); a port is hooked up once; the far end must exist
//   FR-04  a field move needs a reason and a position inside the room; it is PROPOSED until a room.design.approve holder who did not
//          record it decides; a rejection says why; an approved move is the as-built position and lists the checks naming the device
//   FR-05  a note is pinned inside the room and resolved with a resolution
//   node --test tests/unit/field-record.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'field-')), 'm.mjs');
await esbuild.build({ stdin: { contents: "export * as F from './install/fieldRecord.ts'; export { roomRecord } from './campus/design.ts';", resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', define: { 'process.env.DEMO_BUILD_ID': '"test"' } });
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const { F, roomRecord } = await import(pathToFileURL(out).href);
const r = roomRecord('R-ATL-4-218'); const devs = F.devicesOf(r);
const cam = devs.find((d) => d.cat === 'camera') || devs[0]; const disp = devs.find((d) => d.cat === 'display');

test('FR-01 the installation team records; others are refused with the reason, and the refusal is logged', () => {
  const x = F.recordMounting(r, 'designer', cam.code, { method: 'wall-bracket', fixing: 'VESA bracket, 4 × M8 into blocking' });
  assert.equal(x.ok, false); assert.match(x.why[0], /installation team/);
  assert.equal(F.readField(r.outline.id).log[0].outcome, 'DENIED');
  assert.equal(F.recordHookup(r, 'employee', { device: cam.code, port: 'LAN', to: 'building network (outside the room)' }).ok, false);
});

test('FR-02 a mounting needs method and fixing; overhead needs the tether answer; versions are kept', () => {
  assert.match(F.recordMounting(r, 'installer', cam.code, { method: '' }).why.join(' '), /choose how/);
  assert.match(F.recordMounting(r, 'installer', cam.code, { method: 'wall-bracket' }).why.join(' '), /how it is fixed/);
  assert.match(F.recordMounting(r, 'installer', cam.code, { method: 'ceiling-structure', fixing: 'threaded rod' }).why.join(' '), /safety tether/);
  assert.match(F.recordMounting(r, 'installer', cam.code, { method: 'wall-bracket', fixing: 'x', heightM: 40 }).why.join(' '), /0–15/);
  assert.equal(F.recordMounting(r, 'installer', cam.code, { method: 'wall-bracket', fixing: 'camera shelf, 2 × toggle bolts', heightM: '1.9', backing: 'plywood' }).ok, true);
  assert.equal(F.recordMounting(r, 'service', cam.code, { method: 'wall-bracket', fixing: 'camera shelf, 4 × toggle bolts', heightM: 1.95 }).ok, true);
  const s = F.readField(r.outline.id); assert.equal(s.mount[cam.code].length, 2); assert.equal(F.mountOf(s, cam.code).heightM, 1.95); assert.equal(s.mount[cam.code][1].by, 'installer');
});

test('FR-03 hookups are compared with the design; a port is hooked once; the far end must exist', () => {
  const c = r.connections[0]; assert.ok(c, 'the room has designed connections');
  const a = F.recordHookup(r, 'installer', { device: c.from, port: 'LAN 1', to: c.to, toPort: 'port 7', cable: 'C-4218-07' }); assert.equal(a.ok, true);
  assert.equal(F.asDesigned(r, a.state.hookups.at(-1)), true);
  const other = devs.find((d) => d.code !== c.from && !r.connections.some((k) => (k.from === c.from && k.to === d.code) || (k.to === c.from && k.from === d.code)));
  const b = F.recordHookup(r, 'installer', { device: c.from, port: 'USB', to: other.code }); assert.equal(b.ok, true); assert.equal(F.asDesigned(r, b.state.hookups.at(-1)), false);
  assert.match(F.recordHookup(r, 'installer', { device: c.from, port: 'lan 1', to: c.to }).why.join(' '), /already recorded/);
  assert.match(F.recordHookup(r, 'installer', { device: c.from, port: 'HDMI', to: 'A-9999' }).why.join(' '), /other end/);
  const st = F.fieldStats(r, F.readField(r.outline.id)); assert.equal(st.hookups, 2); assert.equal(st.notInDesign, 1);
});

test('FR-04 a field move: reason, inside the room, decided independently; approved is the as-built position', () => {
  const [w, l] = r.outline.dims; const to = { x: Math.min(w, disp.x + 0.4), y: disp.y };
  assert.match(F.proposeMove(r, 'installer', { device: disp.code, ...to, reason: '' }).why.join(' '), /why it moved/);
  assert.match(F.proposeMove(r, 'installer', { device: disp.code, x: w + 2, y: 1, reason: 'sprinkler head' }).why.join(' '), /inside the room/);
  assert.match(F.proposeMove(r, 'installer', { device: disp.code, x: disp.x, y: disp.y, reason: 'sprinkler head' }).why.join(' '), /nothing moved/);
  const mv = F.proposeMove(r, 'installer', { device: disp.code, ...to, reason: 'sprinkler head', note: 'head 300 mm left of the designed centre' }); assert.equal(mv.ok, true);
  const id = mv.state.moves.at(-1).id; assert.equal(mv.state.moves.at(-1).state, 'PROPOSED');
  assert.match(F.proposeMove(r, 'installer', { device: disp.code, x: to.x, y: to.y + 0.2, reason: 'light fixture' }).why.join(' '), /waiting/);
  assert.match(F.decideMove(r, 'installer', id, true).why[0], /room\.design\.approve/);
  assert.equal(F.decideMove(r, 'syseng', id, false, '').ok, false, 'a rejection says why');
  const ok = F.decideMove(r, 'syseng', id, true, 'agreed on site walk'); assert.equal(ok.ok, true);
  const b = F.asBuilt(F.readField(r.outline.id), disp); assert.deepEqual([b.x, b.y, !!b.moved], [Math.round(to.x * 100) / 100, to.y, true]);
  assert.equal(F.decideMove(r, 'syseng', id, false, 'x').ok, false, 'decided once');
  assert.ok(Array.isArray(F.checksNaming(r, disp.code)));
  // separation of duties: the recorder does not decide (syseng records nothing here, so an approver who recorded: the architect holds both)
  const mv2 = F.proposeMove(r, 'architect', { device: cam.code, x: Math.min(w, cam.x + 0.3), y: cam.y, reason: 'HVAC diffuser or return' }); assert.equal(mv2.ok, true);
  assert.match(F.decideMove(r, 'architect', mv2.state.moves.at(-1).id, true).why[0], /separation of duties/);
});

test('FR-05 a note is pinned inside the room and resolved with a resolution', () => {
  const [w, l] = r.outline.dims;
  assert.equal(F.addMarkup(r, 'installer', { x: w + 1, y: 1, text: 'x' }).ok, false);
  const n = F.addMarkup(r, 'installer', { x: 1, y: 1, text: 'access panel above the rack position' }); assert.equal(n.ok, true);
  const id = n.state.markups.at(-1).id; assert.equal(F.resolveMarkup(r, 'syseng', id, '').ok, false);
  assert.equal(F.resolveMarkup(r, 'syseng', id, 'rack moved 0.5 m; panel clear').ok, true);
  assert.equal(F.readField(r.outline.id).markups.at(-1).state, 'RESOLVED'); assert.equal(F.addMarkup(r, 'employee', { x: 1, y: 1, text: 'hi' }).ok, false);
});
