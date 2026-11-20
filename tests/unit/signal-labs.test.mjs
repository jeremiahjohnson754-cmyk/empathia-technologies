// SIGNAL Fix-It Labs (packages/ui/src/labs.ts) against the founder's build package: docs/04-engine-specs.md §5, the reference runtime
// (labs.js mathBox, mountLab, recordLab, labSignalFlow) and its QA ("every lab's start state must fail and the intended fix must pass").
// The intended fixes are the package's own where its QA recorded them (tests/fixtures/signal-lab-fixes.json); where it did not, the fix
// is derived here from the lab's own brief and targets and marked DERIVED. Restored 11 Nov 2026.   node --test tests/unit/signal-labs.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'signal-labs-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'packages/ui/src/labs.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const X = await import(pathToFileURL(out).href);
const labs = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/app-data.json'), 'utf8')).labs;
const FIX = JSON.parse(fs.readFileSync(path.join(repo, 'tests/fixtures/signal-lab-fixes.json'), 'utf8')).labs;
const SF = Object.values(labs).filter((L) => L.type === 'signalflow');
// DERIVED fixes (the package's QA has none for these six): ids, not labels
const DERIVED = {
  'LAB-SF-01': { gains: { pp: 32 }, add: [['pp', 'strm'], ['lp', 'strm'], ['bp', 'strm']] },
  'LAB-SF-02': { gains: { aux6: 2 }, add: [['lec', 'aux6'], ['pas', 'aux6'], ['vox', 'aux6'], ['bnd', 'aux6'], ['aux6', 'tx']] },
  'LAB-SF-03': { gains: { pre: 18, fad: -6 }, add: [] },
  'LAB-SF-04': { gains: {}, add: [['pres', 'ifb'], ['ret', 'ifb'], ['host', 'ifb']] },   // toggles: the first two remove
  'LAB-SF-05': { gains: {}, add: [['tap', 'strm'], ['pp', 'stems'], ['bp', 'stems'], ['stems', 'strm']] },
  'LAB-SF-06': { gains: {}, add: [['in1', 'cap'], ['in2', 'cap']] },
};
const byLabel = (L, lbl) => { const n = L.nodes.find((x) => x.label === lbl); assert.ok(n, `${L.id}: no block “${lbl}”`); return n.id; };
function fixed(L) {
  let s = X.sfInit(L); const f = FIX[L.id]; const d = DERIVED[L.id];
  if (f) { for (const [a, b] of f.wires || []) s = X.sfToggle(L, s, byLabel(L, a), byLabel(L, b)); for (const [lbl, v] of Object.entries(f.gains || {})) s = X.sfGain(L, s, byLabel(L, lbl), v); }
  else { assert.ok(d, `${L.id} has neither a recorded nor a derived fix`); for (const [a, b] of d.add) s = X.sfToggle(L, s, a, b); for (const [id, v] of Object.entries(d.gains)) s = X.sfGain(L, s, id, v); }
  return s;
}

test('SL-01 the 26 signal-flow labs: each fails at its start state, and its intended fix passes (20 recorded by the package, 6 derived)', () => {
  assert.equal(SF.length, 26); let rec = 0;
  for (const L of SF) { assert.equal(X.sfCheck(L, X.sfInit(L)).ok, false, `${L.id} must fail at the start`);
    const c = X.sfCheck(L, fixed(L)); assert.ok(c.ok, `${L.id} fix: ${c.why.join(' | ')}`); if (FIX[L.id]) rec += 1; }
  assert.equal(rec, 20);
});

test('SL-02 every recorded math answer is right by the lab’s own tolerance, and every step’s stated answer is right', () => {
  for (const L of Object.values(labs)) { for (const m of L.math) assert.ok(X.mathRight(m, m.answer), `${L.id}: ${m.q}`);
    const f = FIX[L.id]; if (f?.math) f.math.forEach((v, i) => assert.ok(X.mathRight(L.math[i], v), `${L.id} step ${i + 1}: ${v} vs ${L.math[i].answer}`)); }
  assert.equal(X.mathRight({ answer: 100 }, 101.9), true, 'no tolerance: 2% of the answer'); assert.equal(X.mathRight({ answer: 100 }, 102.1), false);
});

test('SL-03 wiring follows the reference: toward a later column only, never out of an output or into a source; a wire the lab starts with can be removed', () => {
  const L = labs['LAB-SF-06']; let s = X.sfInit(L);
  assert.equal(X.sfToggle(L, s, 'cap', 'in2'), s, 'backwards'); assert.equal(X.sfToggle(L, s, 'far', 'loc'), s, 'out of an output / same column');
  s = X.sfToggle(L, s, 'in1', 'cap'); assert.ok(!s.wires.includes('in1>cap'), 'a starting wire can be removed');
  assert.ok(X.sfToggle(L, s, 'lap', 'cap').wires.includes('lap>cap'), 'a source may skip a column, as the reference allows');
  const Y = { id: 'Y', type: 'signalflow', targets: [], wires: [], nodes: [{ id: 'o', label: 'O', kind: 'out', col: 0, row: 0 }, { id: 'b', label: 'B', kind: 'bus', col: 1, row: 0 }, { id: 's', label: 'S', kind: 'src', col: 2, row: 0, level: -10 }] };
  assert.equal(X.sfCanWire(Y, 'o', 'b'), false, 'never out of an output'); assert.equal(X.sfCanWire(Y, 'b', 's'), false, 'never into a source');
});

test('SL-04 the model: power sums, gains after the sum, a mute silences and forgets its sources, clipping above 0 dB anywhere fails', () => {
  assert.equal(Math.round(X.dbsum([-18, -18, -18]) * 10) / 10, -13.2); assert.equal(X.dbsum([-Infinity]), -Infinity);
  const L = labs['LAB-SF-03']; let s = X.sfGain(L, X.sfInit(L), 'pre', 60); const c = X.sfCheck(L, s); assert.ok(c.why.some((w) => /clipping/.test(w)));
  assert.equal(X.sfGain(L, X.sfInit(L), 'eq', 5).gains.eq, 0, 'a gain the lab does not let you edit stays'); assert.equal(X.sfGain(L, X.sfInit(L), 'pre', 99).gains.pre, 60, 'clamped to its range');
  const M = labs['LAB-SF-05']; const R = X.sfCompute(M, X.sfInit(M)); assert.equal(R.wm.lvl, -Infinity); assert.deepEqual(R.wm.srcs, {});
  const why = X.sfCheck(M, X.sfInit(M)).why.join(' '); assert.match(why, /must NOT carry .*A mic the room muted/); assert.match(why, /must pass through/); assert.match(why, /must NOT pass through/);
});

test('SL-05 the shell: a test that fails keeps the lab open and offers the fix from the third miss; math missing is named; the record is the reference’s', () => {
  const L = { success: 'Done.', timeoutWhy: 'Slow down.' };
  const v1 = X.testFix(L, { ok: false, why: ['A is low.'] }, ['Q1'], 0); assert.deepEqual([v1.pass, v1.final, v1.offerFix], [false, false, false]); assert.match(v1.lines[0], /Math not finished: Q1/);
  assert.equal(X.testFix(L, { ok: false, why: [] }, [], 2).offerFix, true); assert.equal(X.testFix(L, { ok: true, why: [] }, ['Q1'], 0).pass, false, 'the math must be done too');
  const p = X.testFix(L, { ok: true, why: [], notes: ['n'] }, [], 5); assert.deepEqual([p.pass, p.final, p.lines], [true, true, ['Done.', 'n']]);
  assert.match(X.showFix(L, { ok: false, why: ['x'] }).head, /here is the fix/); assert.match(X.clockOut(L, { ok: false, why: [] }).lines[0], /clock ran out .*Slow down/);
  let r = X.recordLab(undefined, false); r = X.recordLab(r, false); r = X.recordLab(r, true, true); r = X.recordLab(r, false, true);
  assert.deepEqual(r, { passed: true, done: true, tries: 4, passTry: 3 }); assert.deepEqual(X.readLab(r), r); for (const j of [null, {}, { ...r, tries: 0 }, { ...r, passed: 1 }]) assert.equal(X.readLab(j), null);
  assert.equal(X.clockFor(325, 2), 650); assert.equal(X.clockFor(325, 0), null); assert.equal(X.clockFor(undefined, 1), null);
});

// DERIVED network fixes (none recorded by the package's QA for these three), from each lab's brief
const NET_DERIVED = {
  'LAB-NET-01': { igmp: { 10: true } },                                   // "or turn on multicast snooping"
  'LAB-NET-02': { vlan: { scn: 50 }, ip: { enc: '172.16.40.5' } },        // scanners home; encoder below the automatic range
  'LAB-NET-03': { vlan: { cc: 120 }, ip: { brg: '10.40.120.20' } },      // computer onto the audio VLAN; bridge inside its /26
};
test('SL-06 the 12 network labs: each fails at its start state and its intended fix passes (9 recorded, 3 derived)', () => {
  const NET = Object.values(labs).filter((L) => L.type === 'network'); assert.equal(NET.length, 12);
  const dev = (L, lbl) => { const d = L.devices.find((x) => x.label === lbl); assert.ok(d, `${L.id}: no device “${lbl}”`); return d.id; };
  for (const L of NET) { assert.equal(X.netCheck(L, X.netInit(L)).ok, false, `${L.id} must fail at the start`);
    let s = X.netInit(L); const f = FIX[L.id]; const d = NET_DERIVED[L.id]; assert.ok(f || d, L.id);
    if (f) { for (const [lbl, v] of Object.entries(f.vsel || {})) s = X.netSetVlan(L, s, dev(L, lbl), v); for (const [lbl, ip] of Object.entries(f.ips || {})) s = X.netSetIp(L, s, dev(L, lbl), ip); }
    else { for (const [id, v] of Object.entries(d.vlan || {})) s = X.netSetVlan(L, s, id, v); for (const [id, ip] of Object.entries(d.ip || {})) s = X.netSetIp(L, s, id, ip); for (const [vl, on] of Object.entries(d.igmp || {})) s = X.netSetIgmp(L, s, Number(vl), on); }
    const c = X.netCheck(L, s); assert.ok(c.ok, `${L.id} fix: ${c.why.join(' | ')}`); }
});

test('SL-07 network rules: addresses parse strictly; a /26 is 62 hosts; a fixed address in the automatic range, outside the subnet, or shared fails; locks hold', () => {
  assert.equal(X.ip2n('10.0.0.1'), 167772161); for (const bad of ['10.0.0', '10.0.0.256', '10.0.0.x', '', '1.2.3.4.5']) assert.equal(X.ip2n(bad), null, bad);
  const c = X.cidr('10.40.120.0/26'); assert.deepEqual([X.n2ip(c.first), X.n2ip(c.last), c.size], ['10.40.120.1', '10.40.120.62', 64]); assert.equal(X.n2ip(X.cidr('10.40.120.70/26').base), '10.40.120.64', 'a host address names its block');
  const L = labs['LAB-NET-02']; let s = X.netInit(L); assert.match(X.netDevice(L, s, 'enc').issues.join(), /inside the automatic range/);
  s = X.netSetIp(L, s, 'enc', '172.16.41.5'); assert.match(X.netDevice(L, s, 'enc').issues.join(), /outside VLAN 40/);
  s = X.netSetIp(L, s, 'enc', '172.16.40.254'); assert.match(X.netDevice(L, s, 'enc').issues.join(), /share 172\.16\.40\.254/);
  assert.equal(X.netSetIp(L, s, 'scn', '1.2.3.4'), s, 'an automatic device has no fixed address');
  const N = labs['LAB-NET-01']; const n0 = X.netInit(N); assert.equal(X.netSetVlan(N, n0, 'off', 10), n0, 'a locked VLAN stays'); assert.equal(X.netSetIgmp(N, n0, 20, false), n0, 'a snooping setting that is not ours stays');
  assert.match(X.netCheck(N, n0).why.join(' '), /flooded with 400 Mb\/s/); assert.match(X.netCheck(N, X.netSetVlan(N, n0, 'enc', 20)).why.join(' '), /must be on separate VLANs/);
});

// DERIVED power fix (none recorded for LAB-PWR-01): spread the four fixture bars, keep the keyboard and pedals on C3 (cable length)
const PWR_DERIVED = { 'LAB-PWR-01': { 'Fixture bar C (3 × 150 W)': 'C5', 'Fixture bar D (3 × 150 W)': 'C7', 'Monitor amps': 'C5' } };
test('SL-08 the 6 power labs and the conduit-fill lab: each fails at its start state and its intended fix passes (6 recorded, 1 derived)', () => {
  const P = Object.values(labs).filter((L) => L.type === 'power' || L.type === 'fill'); assert.equal(P.length, 7);
  for (const L of P) { assert.equal(X.pwrCheck(L, X.pwrInit(L)).ok, false, `${L.id} must fail at the start`);
    const sel = FIX[L.id]?.psel || PWR_DERIVED[L.id]; assert.ok(sel, L.id); let s = X.pwrInit(L);
    for (const [lbl, c] of Object.entries(sel)) { const i = L.loads.findIndex((l) => l.label === lbl); assert.ok(i >= 0, `${L.id}: no load “${lbl}”`); s = X.pwrAssign(L, s, i, c); }
    const c = X.pwrCheck(L, s); assert.ok(c.ok, `${L.id} fix: ${c.why.join(' | ')}`); }
});

test('SL-09 power rules: amps are watts over volts against 80% of the breaker; a budget or a fill adds directly; unplugged, wrong-circuit and locked loads behave', () => {
  const L = labs['LAB-PWR-01']; const s0 = X.pwrInit(L); const c3 = L.circuits[0];
  assert.equal(Math.round(X.pwrDraw(L, s0, c3) * 100) / 100, Math.round((2600 / 120) * 100) / 100); assert.match(X.pwrCheck(L, s0).why.join(' '), /over 80% of its 20 A breaker \(16 A\)/);
  const kb = L.loads.findIndex((l) => l.label === 'Keyboard rig'); assert.match(X.pwrCheck(L, X.pwrAssign(L, s0, kb, 'C7')).why.join(' '), /has to be on C3/);
  assert.match(X.pwrCheck(L, X.pwrAssign(L, s0, kb, '')).why.join(' '), /isn’t plugged in/); assert.equal(X.pwrAssign(L, s0, kb, 'C9'), s0, 'no such circuit');
  const F = labs['LAB-CON-01']; assert.equal(X.pwrDraw(F, X.pwrInit(F), F.circuits[0]), 88 + 66 + 44 + 30 + 88, 'fill adds areas directly');
  const locked = { ...L, loads: L.loads.map((l, i) => (i === 0 ? { ...l, lock: true } : l)) }; const z = X.pwrInit(locked); assert.equal(X.pwrAssign(locked, z, 0, 'C5'), z);
});

// DERIVED EQ fixes (one recorded: LAB-EQ-04's delay of 166.8 ms)
const EQ_DERIVED = { 'LAB-EQ-01': { f: 2718.75, g: -12, q: 9 }, 'LAB-EQ-02': { delay: 4.96 }, 'LAB-EQ-03': { delay: 87.46 } };
test('SL-10 the 4 EQ and timing labs: each fails at its start state and its intended fix passes (1 recorded, 3 derived)', () => {
  const E = Object.values(labs).filter((L) => L.type === 'eq'); assert.equal(E.length, 4);
  for (const L of E) { assert.equal(X.eqCheck(L, X.eqInit(L)).ok, false, `${L.id} must fail at the start`);
    let s = X.eqInit(L); const fx = FIX[L.id]?.first_num != null ? { delay: FIX[L.id].first_num } : EQ_DERIVED[L.id]; assert.ok(fx, L.id);
    for (const [k, v] of Object.entries(fx)) s = X.eqSet(L, s, k, v); const c = X.eqCheck(L, s); assert.ok(c.ok, `${L.id} fix: ${c.why.join(' | ')}`); }
});
test('SL-11 EQ rules: a flat band is 0 dB; a band at the ring but too wide, or off the ring, fails; misaligned arrivals name their first notch; sync windows hold', () => {
  assert.equal(X.peakingMag(1000, 1000, 0, 2), 0); assert.ok(Math.abs(X.peakingMag(1000, 1000, -12, 4) + 12) < 0.01, 'a band’s gain is its depth at its own frequency');
  const L = labs['LAB-EQ-01']; let s = X.eqInit(L); s = X.eqSet(L, s, 'f', 2718.75); s = X.eqSet(L, s, 'g', -12); s = X.eqSet(L, s, 'q', 0.5);
  assert.match(X.eqCheck(L, s).why.join(' '), /Too wide/); assert.match(X.eqCheck(L, X.eqSet(L, X.eqSet(L, s, 'q', 9), 'f', 2400)).why.join(' '), /off the ring/);
  assert.equal(X.eqSet(L, s, 'delay', 5), s, 'a notch lab has no delay'); assert.equal(X.eqSet(labs['LAB-EQ-02'], X.eqInit(labs['LAB-EQ-02']), 'g', -3).g, 0, 'an alignment lab has no band');
  assert.match(X.eqCheck(labs['LAB-EQ-02'], X.eqInit(labs['LAB-EQ-02'])).why[0], /first notch near 101 Hz/);
  assert.equal(X.eqCheck(labs['LAB-EQ-02'], X.eqSet(labs['LAB-EQ-02'], X.eqInit(labs['LAB-EQ-02']), 'delay', 5.2)).ok, false, '0.24 ms off is outside its 0.1 ms tolerance');
  const A = labs['LAB-EQ-04']; assert.match(X.eqCheck(A, X.eqSet(A, X.eqInit(A), 'delay', 100)).why[0], /before the picture/); assert.match(X.eqCheck(A, X.eqSet(A, X.eqInit(A), 'delay', 230)).why[0], /after the picture/);
  assert.match(X.eqCheck(A, X.eqSet(A, X.eqInit(A), 'delay', 175)).why[0], /Inside the window, but not matched/);
});

test('SL-12 the 3 camera labs: each fails at its start; a fix exists among the lab’s own settings (DERIVED by search: focus on the presenter, the system’s frame rate, then iris, shutter and wall input), and it passes', () => {
  const C = Object.values(labs).filter((L) => L.type === 'camera'); assert.equal(C.length, 3); const found = {};
  for (const L of C) { assert.equal(X.camCheck(L, X.camInit(L)).ok, false, `${L.id} must fail at the start`);
    let s = X.camSet(L, X.camSet(L, X.camInit(L), 'focus', L.subject), 'fps', L.system); let hit = null;
    for (const iris of X.CAM_OPTS.iris) for (const sh of X.CAM_OPTS.shutter) for (const w of L.wallEditable === false ? [s.wallIn] : X.CAM_OPTS.wallIn) { if (hit) break; const t = X.camSet(L, X.camSet(L, X.camSet(L, s, 'iris', iris), 'shutter', sh), 'wallIn', w); if (X.camCheck(L, t).ok) hit = t; }
    assert.ok(hit, `${L.id}: no setting of the lab's own controls passes`); found[L.id] = hit; }
  assert.deepEqual(found['LAB-CAM-01'], { focus: 9.5, iris: 1.8, shutter: 60, fps: 59.94, wallIn: 59.94 });
});
test('SL-13 camera rules: wrong rate stutters; another family beats; a whole number of refresh cycles per exposure is clean; a locked wall input stays; focus is clamped', () => {
  const L = labs['LAB-CAM-01']; const ok = { focus: 9.5, iris: 1.8, shutter: 60, fps: 59.94, wallIn: 59.94 };
  assert.match(X.camCheck(L, { ...ok, fps: 50 }).why.join(' '), /Stutter/); assert.match(X.camCheck(L, { ...ok, wallIn: 50 }).why.join(' '), /different frame-rate family/);
  assert.match(X.camCheck(L, { ...ok, shutter: 250 }).why.join(' '), /refresh cycles per exposure/); assert.match(X.camCheck(L, { ...ok, focus: 11.8 }).why.join(' '), /presenter is soft/); assert.doesNotMatch(X.camCheck(L, { ...ok, focus: 9.0 }).why.join(' '), /presenter is soft/, 'half a metre off, the depth of field at f/1.8 still holds her');
  assert.match(X.camCheck(L, { ...ok, focus: 11.8, iris: 11 }).why.join(' '), /Moiré/);
  const W = labs['LAB-CAM-02']; const w0 = X.camInit(W); assert.equal(X.camSet(W, w0, 'wallIn', 50), w0); assert.equal(X.camSet(L, X.camInit(L), 'focus', 99).focus, 30); const c0 = X.camInit(L); assert.equal(X.camSet(L, c0, 'iris', 3), c0, 'not an f-stop on the lens: unchanged');
});

test('SL-14 the DMX lab fails at its start and passes with its DERIVED fix (Fix 7 to 99, Fix 8 to 115, data cable on 2→3, a terminator)', () => {
  const L = labs['LAB-DMX-01']; const s0 = X.dmxInit(L); const c0 = X.dmxCheck(L, s0); assert.equal(c0.ok, false);
  assert.match(c0.why.join(' '), /Fix 6 \(81–98\) overlaps Fix 7 \(95–110\)/); assert.match(c0.why.join(' '), /microphone cable/); assert.match(c0.why.join(' '), /No terminator/);
  let s = X.dmxSetAddr(L, s0, 6, 99); s = X.dmxSetAddr(L, s, 7, 115); s = X.dmxSetLink(L, s, 2, 'data'); s = X.dmxTerm(s); const c = X.dmxCheck(L, s); assert.ok(c.ok, c.why.join(' | '));
  assert.match(X.dmxCheck(L, X.dmxSetLink(L, s, 0, 'y')).why[0], /DMX is a line, not a tree/); assert.match(X.dmxCheck(L, X.dmxSetAddr(L, s, 1, 1)).why[0], /Fix 1 \(1–16\) overlaps Fix 2 \(1–16\)/, 'the same start address overlaps'); assert.match(X.dmxCheck(L, X.dmxSetAddr(L, s, 7, 500)).why[0], /outside the 512-channel universe/);
});

test('SL-15 the 2 RF labs fail at their start; LAB-RF-02 passes with its recorded plan and LAB-RF-01 with a DERIVED one (found by a search of 25 kHz steps)', () => {
  const A = labs['LAB-RF-01'], B = labs['LAB-RF-02']; assert.equal(X.rfCheck(A, X.rfInit(A)).ok, false); assert.equal(X.rfCheck(B, X.rfInit(B)).ok, false);
  const plan = [520.0, 520.425, 520.975, 521.4, 522.075, 522.5]; const s = plan.reduce((t, f, i) => X.rfSet(A, t, i, f), X.rfInit(A)); const ca = X.rfCheck(A, s); assert.ok(ca.ok, ca.why.join(' | '));
  let t = X.rfInit(B); for (const [lbl, f] of Object.entries(FIX['LAB-RF-02'].freqs)) t = X.rfSet(B, t, B.tx.findIndex((x) => x.label === lbl), f); const cb = X.rfCheck(B, t); assert.ok(cb.ok, cb.why.join(' | '));
  assert.ok(X.rfProducts(A, [500, 501]).some((p) => p.f === 499 && p.k === '2×V1−V2')); assert.equal(X.rfProducts({ ...A, threeTx: true }, [500, 501, 503]).filter((p) => /\+/.test(p.k)).length, 3);
  assert.match(X.rfCheck(A, X.rfSet(A, s, 1, 520.2)).why.join(' '), /only 0\.2 MHz apart/); assert.match(X.rfCheck(A, X.rfSet(A, s, 5, 524.5)).why.join(' '), /occupied range \(local service\)/);
  assert.match(X.rfCheck(A, X.rfSet(A, s, 5, 525.55)).why.join(' '), /occupied range \(local service\)/, 'inside the 0.1 MHz guard'); assert.match(X.rfCheck(A, X.rfSet(A, s, 2, 520.85)).why.join(' '), /intermod product \(2×V2−V1 = 520\.85 MHz\)/);
  const locked = { ...A, tx: A.tx.map((x, i) => (i === 0 ? { ...x, lock: true } : x)) }; const z = X.rfInit(locked); assert.equal(X.rfSet(locked, z, 0, 530), z);
});
