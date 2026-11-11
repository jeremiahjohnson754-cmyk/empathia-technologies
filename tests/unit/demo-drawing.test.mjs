// Drawing Intelligence: reading and reviewing (apps/demo/src/drawing). Founder, 11 Nov 2026, §10: "Classify findings as: Observed /
// Extracted / Modeled / Inferred / Verified / Approved." "Never claim dimensionally accurate reconstruction from insufficient
// information." "When scale is unknown, request calibration." "When devices overlap, raise a conflict." "When documents contradict
// each other, preserve both sources and request engineering review." Held here on a synthetic package in two revisions.
//   node --test tests/unit/demo-drawing.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-drawing-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as R from './drawing/read.ts'; export * as V from './drawing/review.ts'; export * as S from './drawing/sample.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') } });
const { R, V, S } = await import(pathToFileURL(out).href);
const doc = (rev, kind) => S.SAMPLE[rev].find((d) => d.kind === kind); const planA = () => R.readPlan(doc('A', 'plan')); const with_ = (d, f) => ({ ...d, text: f(d.text) });
const ex = (rev, edit = {}) => V.combine(edit.plan === null ? null : R.readPlan(edit.plan || doc(rev, 'plan')), edit.schedule === null ? null : R.readSchedule(edit.schedule || doc(rev, 'schedule')), edit.bom === null ? null : R.readBom(edit.bom || doc(rev, 'bom')));
const kinds = (e) => e.findings.map((f) => f.kind).sort(); const one = (e, kind) => e.findings.filter((f) => f.kind === kind);

test('DI-01 a file is read only if it is a kind this reader reads, and anything else is refused with what is and is not built', () => {
  assert.deepEqual(R.kindOf('plan.svg', '<svg xmlns="x"><rect/></svg>'), { kind: 'plan' }); assert.deepEqual(R.kindOf('s.csv', 'Tag,Description\n'), { kind: 'schedule' }); assert.deepEqual(R.kindOf('b.CSV', 'Model,Qty\n'), { kind: 'bom' });
  assert.match(R.kindOf('plan.pdf', '%PDF-1.7').why, /PDF, Visio, CAD and image files are not read: that is not built/); assert.match(R.kindOf('plan.dwg', 'AC1032').why, /not built/); assert.match(R.kindOf('photo.jpg', 'ÿØ').why, /not read/);
  assert.match(R.kindOf('x.svg', 'hello').why, /does not contain one/); assert.match(R.kindOf('x.csv', 'a,b\n1,2').why, /neither a Tag column .* nor a Qty column/); assert.match(R.kindOf('big.svg', '<svg>' + 'x'.repeat(R.MAX_BYTES)).why, /larger than this reader accepts/);
  for (const k of ['OBSERVED', 'EXTRACTED', 'MODELED', 'INFERRED', 'VERIFIED', 'APPROVED']) assert.ok(R.CLS_WORD[k].length > 20, k);
});

test('DI-02 the plan: the room is the largest rectangle (a convention, said), the scale comes from dimensions that agree, tags become devices by a convention, ports are counted', () => {
  const p = planA(); assert.deepEqual(p.boundary, { x: 100, y: 100, w: 620, h: 940 }); assert.equal(p.unitsPerMetre, 100); assert.equal(p.scaleCls, 'EXTRACTED'); assert.equal(p.annotations.length, 2);
  assert.deepEqual(p.devices.map((d) => `${d.tag}:${d.cat}`), ['DISP-01:display', 'CAM-01:camera', 'MICC-01:micceil', 'MICC-02:micceil', 'SPK-01:speaker', 'SPK-02:speaker', 'DSP-01:dsp', 'UC-01:compute', 'TP-01:touch', 'XYZ-01:null']);
  assert.deepEqual(p.ports.map((x) => x.tag), ['NP-01', 'NP-02']); assert.equal(p.printedScale, '1:50'); assert.ok(p.notes.some((n) => /largest rectangle is taken as the room/.test(n))); assert.ok(p.notes.some((n) => /A scale of 1:50 is printed, but the file does not say what its units are, so it is not used/.test(n)));
  assert.match(p.devices.find((d) => d.tag === 'XYZ-01').note, /prefix “XYZ” is not one this reader knows/); assert.deepEqual(p.doubts, []);
  const mic = R.readPlan(with_(doc('A', 'plan'), (t) => t.replace('MICC-01', 'MIC-01'))).devices.find((d) => d.tag === 'MIC-01'); assert.equal(mic.cat, 'micceil'); assert.match(mic.note, /not which kind; taken as a ceiling microphone/);
});

test('DI-03 no scale is claimed from insufficient information: none written, or two that disagree, gives no metres and asks for a calibration; a person’s calibration is theirs', () => {
  const none = with_(doc('A', 'plan'), (t) => t.replace('6200 mm', '').replace('9.40 m', '')); const pn = R.readPlan(none); assert.equal(pn.unitsPerMetre, null); assert.equal(pn.scaleCls, null);
  const en = ex('A', { plan: none }); assert.equal(one(en, 'scale-unknown').length, 1); assert.equal(one(en, 'scale-unknown')[0].blocker, true); assert.match(one(en, 'scale-unknown')[0].ask, /Calibrate: give the real length of one line/); assert.equal(en.room, null); assert.ok(en.devices.every((d) => d.x === null && d.posCls === null));
  assert.match(V.toDesign(en, { template: 'medium_conf', occupancy: 14, use: 'meetings' }).why, /Calibrate the plan first/);
  const bad = with_(doc('A', 'plan'), (t) => t.replace('9.40 m', '7.00 m')); const pb = R.readPlan(bad); assert.equal(pb.unitsPerMetre, null); assert.match(pb.doubts[0], /do not agree with each other: “6200 mm” over 620 units, “7\.00 m” over 940 units\. No scale is taken from them/);
  const eb = ex('A', { plan: bad }); assert.equal(one(eb, 'scale-conflict').length, 1); assert.equal(one(eb, 'scale-unknown').length, 0, 'one finding, not two, for the same cause'); assert.equal(eb.room, null);
  const cal = R.calibrate(pb, { x1: 100, y1: 100, x2: 720, y2: 100, metres: 6.2 }); assert.equal(cal.unitsPerMetre, 100); assert.equal(cal.scaleCls, 'OBSERVED'); assert.ok(!cal.doubts.some((d) => /do not agree/.test(d))); assert.match(cal.notes.at(-1), /set by a person: 620 drawing units are 6\.2 m/);
  assert.ok(R.calibrate(pb, { x1: 1, y1: 1, x2: 1, y2: 1, metres: 5 }).why); assert.ok(R.calibrate(pb, { x1: 0, y1: 0, x2: 100, y2: 0, metres: 0 }).why); assert.ok(R.calibrate(pb, { x1: 0, y1: 0, x2: 100, y2: 0, metres: NaN }).why);
  assert.deepEqual(V.combine(cal, R.readSchedule(doc('A', 'schedule')), R.readBom(doc('A', 'bom'))).room, { width: 6.2, length: 9.4, cls: 'MODELED' });
});

test('DI-04 the tables: quoted cells, either separator, missing columns said, duplicate and unreadable rows said, cells cleaned', () => {
  assert.deepEqual(R.parseCsv('a,"b, c","d ""e"""\r\n1;2;3\n\n'), [['a', 'b, c', 'd "e"'], ['1', '2', '3']]);
  const s = R.readSchedule(doc('A', 'schedule')); assert.equal(s.rows.length, 10); assert.deepEqual(s.rows[0], { tag: 'DISP-01', description: 'Display 75 in', model: 'D75-A', network: true, line: 2 }); assert.equal(s.rows.find((r) => r.tag === 'SPK-01').network, false);
  const odd = R.readSchedule({ ...doc('A', 'schedule'), text: 'Tag,Description\nCAM-01,<b>Camera</b>\nCAM-01,Camera again\n???,what\n,\n' }); assert.deepEqual(odd.rows.map((r) => r.tag), ['CAM-01']); assert.ok(!/[<>]/.test(odd.rows[0].description));
  assert.ok(odd.doubts.some((d) => /no Model column/.test(d))); assert.ok(odd.doubts.some((d) => /CAM-01 is listed twice in the schedule \(row 3\)/.test(d))); assert.ok(odd.doubts.some((d) => /Row 4: “\?\?\?” is not a tag/.test(d)));
  assert.match(R.readSchedule({ ...doc('A', 'schedule'), text: 'Name,Thing\nx,y\n' }).doubts[0], /no Tag column/);
  const b = R.readBom(doc('A', 'bom')); assert.equal(b.rows.length, 8); assert.equal(b.rows.find((r) => r.model === 'M9-C').qty, 3); assert.match(R.readBom({ ...doc('A', 'bom'), text: 'Model,Qty\nA16,two\n' }).doubts[0], /quantity “two” for A16 is not a whole number/); assert.match(R.readBom({ ...doc('A', 'bom'), text: 'Item,Count\n' }).doubts[0], /needs a Model column and a Qty column/);
  assert.equal(R.catFromWords('Ceiling microphone'), 'micceil'); assert.equal(R.catFromWords('PTZ camera'), 'camera'); assert.equal(R.catFromWords('Thing'), null);
});

test('DI-05 revision A has what was drawn into it: an overlap, a tag nobody can read, a device in the schedule only, a quantity two documents disagree on, and too few ports', () => {
  const e = ex('A'); assert.deepEqual(kinds(e), ['not-in-schedule', 'not-on-plan', 'overlap', 'ports', 'quantity-contradiction', 'unknown-tag']);
  const o = one(e, 'overlap')[0]; assert.match(o.text, /DISP-01 and CAM-01 are drawn in the same place \(0\.08 m apart\)/); assert.equal(o.blocker, true); assert.equal(o.cls, 'MODELED'); assert.match(o.ask, /An engineer says whether one is mounted above the other or the drawing is wrong/);
  const q = one(e, 'quantity-contradiction')[0]; assert.equal(q.text, 'The schedule lists 2 of model M9-C; the bill of materials lists 3. Both are kept.'); assert.deepEqual(q.sources, ['AV-601-A: 2 rows', 'AV-701-A: row 4']); assert.equal(q.blocker, true); assert.match(q.ask, /An engineer says which quantity is right/);
  assert.match(one(e, 'not-on-plan')[0].text, /AMP-01 \(Amplifier\) is in the schedule but not on the plan/); assert.match(one(e, 'unknown-tag')[0].text, /XYZ-01 is on the plan, but what it is could not be told/); assert.match(one(e, 'not-in-schedule')[0].text, /XYZ-01/);
  assert.equal(one(e, 'ports')[0].text, 'The plan shows 2 network ports; 7 devices on it need one. Ports inside a rack or on a switch are not counted here.'); assert.equal(one(e, 'ports')[0].blocker, false);
  for (const f of e.findings) { assert.ok(f.sources.length >= 1 && f.ask.length > 10 && ['EXTRACTED', 'MODELED', 'INFERRED'].includes(f.cls), f.id); } assert.equal(new Set(e.findings.map((f) => f.id)).size, e.findings.length);
  assert.deepEqual(e.room, { width: 6.2, length: 9.4, cls: 'MODELED' }); const cam = e.devices.find((d) => d.tag === 'CAM-01'); assert.deepEqual([cam.cat, cam.catCls, cam.model, cam.x, cam.y, cam.posCls, cam.inRoom, cam.network], ['camera', 'EXTRACTED', 'C12-P', 3.1, 0.18, 'MODELED', true, true]);
  assert.match(cam.catWhy, /the schedule describes it as “PTZ camera”/); assert.equal(e.devices.find((d) => d.tag === 'XYZ-01').catCls, 'INFERRED');
  assert.equal(e.notReviewed.length, 2); assert.match(e.notReviewed[0], /Signal paths: the package has no signal flow diagram, and this reader does not read one/);
});

test('DI-06 documents that contradict each other are both kept: a tag that says one thing and a schedule that says another; and what is missing from the package is said', () => {
  const c = ex('A', { schedule: with_(doc('A', 'schedule'), (t) => t.replace('SPK-01,Loudspeaker', 'SPK-01,Ceiling microphone')) }); const k = one(c, 'category-contradiction')[0];
  assert.match(k.text, /SPK-01 is drawn with a tag that means loudspeaker; the schedule describes it as “Ceiling microphone”\. Both are kept\./); assert.deepEqual(k.sources, ['AV-301-A: tag SPK-01', 'AV-601-A: row 6']); assert.equal(k.blocker, true);
  const noS = ex('A', { schedule: null, bom: null }); assert.deepEqual(one(noS, 'missing-document').map((f) => f.id), ['missing-document:schedule', 'missing-document:bom']); assert.ok(noS.devices.every((d) => d.catCls === 'INFERRED' && d.model === null)); assert.equal(one(noS, 'quantity-contradiction').length, 0);
  const noP = ex('A', { plan: null }); assert.equal(one(noP, 'missing-document')[0].blocker, true); assert.deepEqual(noP.devices, []);
  const out = ex('A', { plan: with_(doc('A', 'plan'), (t) => t.replace('<text x="410" y="560">TP-01</text>', '<text x="60" y="560">TP-01</text>')) }); assert.match(one(out, 'outside')[0].text, /TP-01 is drawn outside the room’s outline/);
});

test('DI-07 imported text is untrusted: script and embedded content are ignored and said, transforms are said, markup never survives, and size is capped', () => {
  const p = R.readPlan(with_(doc('A', 'plan'), (t) => t.replace('</svg>', '<script>alert(1)</script><g transform="scale(2)"><text x="1" y="1" onclick="x()">CAM-09</text></g><text x="5" y="5">&lt;img src=x&gt; DSP-07</text></svg>')));
  assert.ok(p.doubts.some((d) => /contains script or embedded content\. It was ignored/.test(d))); assert.ok(p.doubts.some((d) => /transforms\)\. This reader does not follow them/.test(d)));
  assert.ok(!JSON.stringify(p).includes('<')); assert.ok(!JSON.stringify(p).includes('alert'));
  const span = R.readPlan(with_(doc('A', 'plan'), (t) => t.replace('</svg>', '<text x="500" y="500"><tspan font-weight="bold">DSP-07</tspan></text></svg>'))); assert.ok(span.devices.some((d) => d.tag === 'DSP-07'), 'text inside a tspan is read as text'); assert.ok(!JSON.stringify(span).includes('tspan'));
  const many = R.readPlan({ ...doc('A', 'plan'), text: '<svg>' + '<rect x="0" y="0" width="1" height="1"/>'.repeat(R.MAX_ELEMENTS + 50) + '</svg>' }); assert.ok(many.doubts.some((d) => /more than 4000 shapes; the rest were not read/.test(d)));
  const twins = R.readPlan({ ...doc('A', 'plan'), text: '<svg><rect x="0" y="0" width="100" height="100"/><rect x="200" y="0" width="100" height="95"/></svg>' }); assert.ok(twins.doubts.some((d) => /Two rectangles are nearly the same size/.test(d)));
  assert.match(R.readPlan({ ...doc('A', 'plan'), text: '<svg><text x="1" y="1">CAM-01</text></svg>' }).doubts[0], /No rectangle was found/);
});

test('DI-08 the standards review is the commissioning engine’s own rules on what was read: what a room type requires, the draft checklist, and every assumption; signal paths are not reported as failures', () => {
  const e = ex('B'); const d = V.toDesign(e, { template: 'boardroom', occupancy: 14, use: 'Board and leadership meetings' }).ok; assert.equal(d.geometry.widthM, 6.2); assert.equal(d.geometry.lengthM, 9.4); assert.equal(d.devices.length, 11);
  assert.deepEqual(d.devices.find((x) => x.id === 'CAM-01').provenance, 'drawing'); assert.ok(d.devices.every((x) => x.x >= 0 && x.x <= 6.2 && x.y >= 0 && x.y <= 9.4));
  const r = V.standardsReview(e, d, 'BRD'); assert.equal(r.archetype, 'BRD'); assert.deepEqual(r.findings.filter((f) => /^standard:missing-equipment/.test(f.id)), [], 'a boardroom’s required equipment is all on the drawing');
  assert.ok(!r.findings.some((f) => /no signal path|no video path/.test(f.text)), 'connections were not in the package, so they are not reported as missing');
  assert.ok(r.checklist.length >= 5 && r.checklist.every((t) => t.id && t.label)); assert.match(r.assumptions[0], /Reviewed as .*, the room type the reviewer named/); assert.ok(r.assumptions.some((a) => /No ceiling height is on the plan: 2\.7 m is assumed/.test(a))); assert.ok(r.assumptions.some((a) => /An organisation’s own approved standard would replace it/.test(a)));
  const noDsp = ex('B', { plan: with_(doc('B', 'plan'), (t) => t.replace('<text x="680" y="1000">DSP-01</text>', '')), schedule: with_(doc('B', 'schedule'), (t) => t.replace('DSP-01,Audio processor,A16,Y\n', '')), bom: with_(doc('B', 'bom'), (t) => t.replace('A16,Audio processor,1\n', '')) });
  const r2 = V.standardsReview(noDsp, V.toDesign(noDsp, { template: 'boardroom', occupancy: 14, use: 'Board meetings' }).ok, 'BRD'); const miss = r2.findings.find((f) => f.id === 'standard:missing-equipment:dsp');
  assert.ok(miss, 'a boardroom with no audio processor is found'); assert.equal(miss.blocker, true); assert.equal(miss.cls, 'MODELED'); assert.match(miss.ask, /or an engineer records why the room is an exception/);
  const auto = V.standardsReview(e, d, null); assert.match(auto.assumptions[0], /No room type was named\. The engine suggests .*; an engineer confirms it/);
});

test('DI-09 what changed between revision A and revision B, by tag', () => {
  const ch = V.diff(ex('A'), ex('B')).map((c) => `${c.kind}: ${c.text}`).sort();
  assert.deepEqual(ch, ['added: AMP-01 was added (P2).', 'added: SW-01 was added (N24-P).', 'moved: CAM-01 moved 0.42 m.', 'moved: MICC-02 moved 0.6 m.', 'removed: XYZ-01 was removed.']);
  assert.deepEqual(kinds(ex('B')), ['ports'], 'revision B answers every finding of A but the network ports'); assert.deepEqual(V.diff(ex('A'), ex('A')), []);
  const noScale = ex('B', { plan: with_(doc('B', 'plan'), (t) => t.replace('6200 mm', '').replace('9.40 m', '')) }); assert.ok(V.diff(ex('A'), noScale).some((c) => /CAM-01 moved on the drawing\. How far in metres is not known/.test(c.text)));
});
