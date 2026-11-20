// Field Tools (apps/demo/src/fieldtools/calc.ts; founder, 18 Nov 2026). Every calculator is checked against a value worked by hand from
// the standard formula, so a regression in the physics fails here rather than on a job site.
//   FT-01  every tool is well formed: unique id, a known category, fields with defaults, a formula and a basis; it runs on its defaults
//          and returns at least one output, a key output, and no NaN or Infinity in a key value
//   FT-02  display and projection geometry (16:9 diagonal, viewing ratios, throw, contrast lumens, luminance, pixel acuity)
//   FT-03  LED wall: size, resolution, pitch, power, circuits at 80 %
//   FT-04  video bandwidth: 4K60 8-bit 4:4:4 is 14.26 Gb/s with CTA-861 blanking; fits HDMI 2.0, not HDMI 1.4
//   FT-05  audio: SPL at distance, inverse square, level sum, dBu/dBV, impedance, 70 V, cable loss, delay, wavelength, PAG/NAG
//   FT-06  acoustics: Sabine RT60, critical distance, axial modes
//   FT-07  power and rigging: current (1φ, 3φ), voltage drop, Ohm's law, bridle tensions and the geometry refusal, WLL
//   FT-08  network and cabling: subnet, refusal of a malformed address, PoE budget, fiber budget, 100 m channel
//   FT-09  search and report: words narrow, category filters, the report names the tool, inputs, results and the verification line
//   node --test tests/unit/field-tools.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fieldtools-')), 'm.mjs');
await esbuild.build({ stdin: { contents: "export * from './fieldtools/calc.ts';", resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const F = await import(pathToFileURL(out).href);

const run = (id, over = {}) => { const t = F.toolById(id); assert.ok(t, `tool ${id}`); return t.run({ ...F.defaults(t), ...over }); };
const val = (r, label) => { const o = r.outputs.find((x) => x.label.startsWith(label)); assert.ok(o, `output "${label}" in ${r.outputs.map((x) => x.label).join(' | ')}`); return o; };
const num = (r, label) => Number(val(r, label).value.replace(/,/g, '').match(/-?\d+(\.\d+)?/)[0]);
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} not within ${tol} of ${b}`);

test('FT-01 every tool is well formed and runs on its defaults', () => {
  const ids = new Set(); const cats = new Set(F.CATEGORIES.map((c) => c.id));
  assert.ok(F.TOOLS.length >= 35, `${F.TOOLS.length} tools`);
  for (const t of F.TOOLS) {
    assert.ok(!ids.has(t.id), `duplicate ${t.id}`); ids.add(t.id);
    assert.ok(cats.has(t.category), `${t.id} category ${t.category}`);
    assert.ok(t.fields.length && t.formula.length && t.basis.length > 20, `${t.id} fields/formula/basis`);
    for (const f of t.fields) { assert.ok(f.default !== undefined, `${t.id}.${f.id} default`); if (f.kind === 'select') assert.ok(f.options.some((o) => o.value === String(f.default)), `${t.id}.${f.id} default is an option`); }
    const r = t.run(F.defaults(t));
    assert.ok(r.outputs.length >= 1, `${t.id} outputs`); assert.ok(r.outputs.some((o) => o.key), `${t.id} key output`);
    for (const o of r.outputs.filter((x) => x.key)) assert.doesNotMatch(o.value, /NaN|Infinity|undefined/, `${t.id}: ${o.label} = ${o.value}`);
  }
  for (const c of F.CATEGORIES) assert.ok(F.TOOLS.some((t) => t.category === c.id), `category ${c.id} has a tool`);
});

test('FT-02 display and projection geometry', () => {
  let r = run('screen-size', { diag: 100, aspect: '16:9' });
  near(num(r, 'Width') * 12 / 1, 87.16, 0.6, '100" 16:9 width in inches'); // 100 × 16/√337 = 87.16 in (shown in feet first)
  r = run('viewing-distance', { diag: 120, aspect: '16:9' }); // H = 58.83 in → 6H = 29.4 ft
  near(num(r, 'Farthest: detailed'), 29.4, 0.1, '6H');
  r = run('throw-distance', { w: 120, tmin: 1.5, tmax: 2 }); near(num(r, 'Shortest throw'), 15, 0.01, 'TR 1.5 × 10 ft'); near(num(r, 'Longest throw'), 20, 0.01, 'TR 2 × 10 ft');
  assert.match(run('throw-distance', { tmin: 3, tmax: 2 }).warnings.join(), /swap/);
  r = run('throw-ratio', { d: 20, w: 10 }); near(num(r, 'Throw ratio'), 2, 1e-9, 'TR');
  r = run('projector-lumens', { w: 16, aspect: '16:9', fc: 10, cr: '15', gain: 1, have: 0 }); // area 144 → (15−1) × 10 × 144 = 20 160
  near(num(r, 'Lumens on the screen'), 20160, 1, 'lumens'); near(num(r, 'Image area'), 144, 0.01, 'area');
  r = run('projector-lumens', { w: 16, aspect: '16:9', fc: 10, cr: '15', gain: 1, have: 10000 }); // 1 + 10000/144/10 = 7.94
  near(num(r, 'Contrast with your projector'), 7.94, 0.05, 'achieved contrast'); assert.equal(val(r, 'Contrast with your projector').tone, 'bad');
  r = run('screen-luminance', { lm: 7000, area: 140, gain: 1 }); near(num(r, 'Luminance'), 50, 1e-9, 'fL');
  r = run('pixel-acuity', { width: 85.6, px: 1920, seat: 10 }); // pixel 1.1324 mm → 3.893 m
  near(num(r, 'Pixel size'), 1.132, 0.001, 'pixel'); near(Number(val(r, 'Pixels blend').value.match(/·\s*([\d.]+) m/)[1]), 3.89, 0.01, 'blend distance');
  r = run('screen-for-room', { far: 30, u: 'ft', k: '6', aspect: '16:9' }); near(Number(val(r, 'Minimum diagonal').value.match(/[\d.]+/)[0]), 122.4, 0.2, 'diagonal');
});

test('FT-03 LED wall', () => {
  const r = run('led-wall', { cw: 500, ch: 500, px: 192, py: 192, nx: 12, ny: 7, pmax: 160, typ: 35, kg: 7.5, v: '208', brk: 20 });
  assert.match(val(r, 'Resolution').value, /2,304 × 1,344/); near(num(r, 'Pixel pitch'), 2.6, 0.01, 'pitch 500/192');
  assert.match(val(r, 'Wall size').value, /^6 × 3\.5 m/);
  near(num(r, 'Max power'), 13.44, 0.001, 'kW'); // 84 × 160 W; 13 440 / 208 = 64.6 A; 16 A per circuit → 5
  assert.equal(val(r, '20 A circuits').value, '5'); near(num(r, 'Weight'), 630, 0.5, 'kg');
});

test('FT-04 video bandwidth', () => {
  let r = run('video-bandwidth', { res: '3840x2160', fps: '60', bpc: '8', chroma: '3' }); // 4400 × 2250 × 60 × 24 = 14.256 Gb/s
  near(num(r, 'With blanking'), 14.26, 0.01, '4K60'); near(num(r, 'Pixel clock'), 594, 0.1, 'pixel clock');
  assert.equal(val(r, 'HDMI 2.0').tone, 'ok'); assert.equal(val(r, 'HDMI 1.4').tone, 'bad'); assert.equal(val(r, '12G-SDI').tone, 'bad');
  r = run('video-bandwidth', { res: '1920x1080', fps: '60', bpc: '10', chroma: '2' }); // 2200 × 1125 × 60 × 20 = 2.97 Gb/s: exactly 3G-SDI
  near(num(r, 'With blanking'), 2.97, 1e-6, '1080p60 10-bit 4:2:2'); assert.equal(val(r, '3G-SDI').tone, 'ok');
});

test('FT-05 audio', () => {
  let r = run('spl-listener', { sens: 97, p: 100, d: 10, u: 'm', max: 0, head: 10 }); near(num(r, 'Max SPL at the listener'), 97, 1e-9, '97 + 20 − 20');
  r = run('spl-listener', { sens: 97, p: 1000, d: 1, u: 'm', max: 120, head: 10 }); near(num(r, 'Max SPL at 1 m'), 120, 1e-9, 'capped');
  r = run('inverse-square', { l1: 100, d1: 1, d2: 2 }); near(num(r, 'Level at d₂'), 93.98, 0.05, 'doubling −6.02 dB');
  r = run('add-levels', { a: 90, b: 90, c: 0, d: 0 }); near(num(r, 'Combined'), 93.01, 0.05, 'equal sum +3 dB');
  r = run('signal-level', { x: 4, u: 'dBu' }); near(num(r, 'Volts RMS'), 1.228, 0.001, '+4 dBu'); near(num(r, 'dBV'), 1.78, 0.01, '+4 dBu in dBV');
  r = run('signal-level', { x: -10, u: 'dBV' }); near(num(r, 'Volts RMS'), 0.3162, 0.0001, '−10 dBV');
  assert.equal(val(run('speaker-impedance', { z: 8, nn: 4, wire: 'par', min: 4 }), 'Total load').value, '2 Ω'); assert.equal(val(run('speaker-impedance', { z: 8, nn: 4, wire: 'par', min: 4 }), 'Amplifier').tone, 'bad');
  assert.equal(val(run('speaker-impedance', { z: 8, nn: 4, wire: 'sp', min: 4 }), 'Total load').value, '8 Ω');
  assert.match(val(run('speaker-impedance', { z: 8, nn: 3, wire: 'sp' }), 'Total load').value, /even/);
  r = run('distributed-70v', { V: '70.7', nn: 20, tap: 5, head: 25 }); near(num(r, 'Load impedance'), 49.98, 0.05, '70.7²/100'); near(num(r, 'Minimum amplifier'), 125, 1e-9, 'amp');
  r = run('speaker-cable', { g: '14', len: 100, z: 8 }); near(num(r, 'Cable resistance'), 0.505, 0.001, 'R'); near(num(r, 'Level lost'), -0.53, 0.01, 'dB');
  r = run('delay-alignment', { dm: 80, df: 15, pre: 10, t: 20 }); near(num(r, 'Speed of sound'), 343.2, 0.1, 'c at 20 °C'); near(num(r, 'Arrival difference'), 57.72, 0.05, 'ms');
  r = run('wavelength', { f: 1000, path: 1 }); near(num(r, 'Wavelength'), 0.343, 1e-9, 'λ'); near(num(r, 'First cancellation'), 563, 1, 'notch');
  r = run('pag-nag', { d0: 60, d1: 20, d2: 40, ds: 2, ead: 6, nom: 1, fsm: 6 }); // 35.56 + 26.02 − 6.02 − 32.04 − 0 − 6 = 17.52; NAG 20
  near(num(r, 'PAG'), 17.52, 0.05, 'PAG'); near(num(r, 'NAG'), 20, 1e-9, 'NAG'); assert.equal(val(r, 'Verdict').tone, 'bad');
  r = run('amp-for-spl', { target: 85, head: 10, sens: 90, d: 10 }); near(num(r, 'Amplifier power'), 316, 1, '10^(25/10)');
});

test('FT-06 acoustics', () => {
  let r = run('rt60-sabine', { L: 10, W: 10, H: 3, alpha: 0.2 }); // V 300, S 320, A 64 → 0.755 s
  near(num(r, 'RT60 (Sabine)'), 0.75, 0.01, 'Sabine'); assert.ok(num(r, 'RT60 (Eyring') < num(r, 'RT60 (Sabine)'), 'Eyring is shorter');
  r = run('critical-distance', { Q: 5, S: 700, alpha: 0.2 }); near(num(r, 'Critical distance'), 4.17, 0.01, 'Dc'); // R 175 → 0.141 × √875 = 4.17
  r = run('room-modes', { L: 8, W: 5.5, H: 3 }); assert.match(val(r, 'Length modes').value, /^21\.4 Hz · 42\.9 Hz · 64\.3 Hz/);
});

test('FT-07 power and rigging', () => {
  let r = run('watts-amps', { P: 2400, V: '120', ph: '1', pf: 1, brk: 20 }); near(num(r, 'Total current'), 20, 1e-9, '2400/120'); assert.equal(val(r, '20 A circuits').value, '2');
  near(num(r, 'Heat'), 8189, 1, 'BTU');
  r = run('watts-amps', { P: 10000, V: '208', ph: '3', pf: 1, brk: 20 }); near(num(r, 'Current per phase'), 27.76, 0.05, '3φ');
  r = run('voltage-drop', { g: '12', L: 100, I: 16, V: '120', ph: '1' }); near(num(r, 'Voltage drop'), 6.32, 0.01, 'VD'); assert.equal(val(r, 'Percent').tone, 'bad');
  r = run('ohms-law', { V: 70.7, I: 0, R: 8, P: 0 }); near(num(r, 'Watts'), 624.8, 0.1, 'V²/R'); near(num(r, 'Amps'), 8.84, 0.01, 'V/R');
  assert.equal(val(run('ohms-law', { V: 0, I: 0, R: 8, P: 0 }), 'Enter two').tone, 'muted');
  r = run('two-leg-bridle', { W: 1000, span: 10, l1: 8, l2: 8 }); // symmetric: h = √(64 − 25) = 6.245; T = 500 / cos θ = 640.5
  near(num(r, 'Leg 1 tension'), 640, 1, 'T1'); near(num(r, 'Leg 2 tension'), 640, 1, 'T2'); near(num(r, 'Included angle'), 77.4, 0.1, 'angle');
  assert.equal(val(run('two-leg-bridle', { W: 1000, span: 10, l1: 4, l2: 4 }), 'Geometry').tone, 'bad');
  r = run('design-factor', { mbs: 10000, df: 5, load: 2500 }); near(num(r, 'Working load limit'), 2000, 1e-9, 'WLL'); assert.equal(val(r, 'Load as a share').tone, 'bad');
  r = run('ups-runtime', { load: 900, wh: 1440, eff: 90, dod: 80 }); near(num(r, 'Estimated runtime'), 69, 1, 'minutes');
});

test('FT-08 network and cabling', () => {
  let r = run('subnet', { ip: '192.168.10.57', p: 26 });
  assert.equal(val(r, 'Subnet mask').value, '255.255.255.192'); assert.equal(val(r, 'Network').value, '192.168.10.0/26'); assert.equal(val(r, 'Broadcast').value, '192.168.10.63');
  assert.equal(val(r, 'Usable range').value, '192.168.10.1 – 192.168.10.62'); assert.equal(val(r, 'Usable hosts').value, '62'); assert.match(val(r, 'Address kind').value, /RFC 1918/);
  assert.equal(val(run('subnet', { ip: '10.0.0.1', p: 31 }), 'Usable hosts').value, '2');
  assert.equal(val(run('subnet', { ip: '300.1.1.1', p: 24 }), 'Address').tone, 'bad');
  assert.match(val(run('subnet', { ip: '169.254.3.3', p: 16 }), 'Address kind').value, /link-local/);
  r = run('poe-budget', { budget: 370, c3: 8, c4: 6, c6: 1, c8: 0 }); near(num(r, 'Allocated'), 363.2, 0.01, 'PoE'); assert.equal(val(r, 'Budget left').tone, 'ok');
  assert.equal(val(run('poe-budget', { budget: 100, c3: 0, c4: 4, c6: 0, c8: 0 }), 'Budget left').tone, 'bad');
  r = run('fiber-budget', { type: 'mm850', km: 300, conn: 2, splice: 0, budget: 7 }); near(num(r, 'Expected link loss'), 2.55, 1e-9, 'loss');
  assert.equal(val(run('copper-reach', { perm: 92, cords: 6 }), 'Verdict').tone, 'bad'); assert.equal(val(run('copper-reach', { perm: 85, cords: 10 }), 'Verdict').tone, 'ok');
  r = run('audio-network', { ch: 8, flows: 1, sr: 48, bits: 24, pt: 1, link: 1000 }); near(num(r, 'Per flow'), 9.84, 0.01, 'AES67-style 8 ch'); // (1152 + 78 bytes) × 8 × 1000 packets/s
});

test('FT-09 search and report', () => {
  assert.ok(F.search('subnet').some((t) => t.id === 'subnet'));
  assert.ok(F.search('throw').every((t) => /throw/i.test(`${t.title} ${t.summary} ${t.keywords ?? ''} ${t.formula.join(' ')}`)));
  assert.equal(F.search('', 'rigging').length, F.TOOLS.filter((t) => t.category === 'rigging').length);
  assert.equal(F.search('zzzz-nothing').length, 0);
  const t = F.toolById('subnet'); const v = F.defaults(t); const rep = F.report(t, v, t.run(v), 'rack A');
  assert.match(rep, /^Subnet calculator — Empathia Field Tools/); assert.match(rep, /IP address: 192\.168\.10\.57/); assert.match(rep, /Subnet mask: 255\.255\.255\.0/); assert.match(rep, /Note: rack A/); assert.match(rep, /verify against manufacturer data/);
  assert.equal(F.toolById('nope'), null);
});
