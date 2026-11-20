#!/usr/bin/env node
// The reverberation instrument in a browser (the arithmetic itself is tested against known answers in tests/unit/bench-reverb.test.mjs).
//   RB-01  the commissioning engineer opens it: nothing yet, the chain not declared, and the page says what to bring
//   RB-02  two synthetic references: labelled as references everywhere; the decay curve is drawn; T20 at 1 kHz near 0.70 s
//   RB-03  a measured WAV with only ~40 dB of range: T30 is refused and the page says why (T20 is still given)
//   RB-04  a file that is not a WAV is refused with the reason; nothing is added
//   RB-05  a target of 0.70 s ± 10 % marks each band; declaring a phone microphone says it is not a measurement microphone
//   RB-06  the JSON export carries every position's SHA-256, the synthetic label and the chain; a phone chain makes it "Indicative only"
//   RB-07  a visitor is not shown the instrument; phone width does not scroll sideways; no console error; nothing leaves the page
//   node tests/browser/demo-reverb.test.mjs
import fs from 'node:fs';
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-reverb');

/** a mono 16-bit WAV of decaying noise (decay time rt) over a floor floorDb below the start — the test's own measured-looking file */
function wav(rt, floorDb, seconds = 1.4, rate = 48000) {
  let s = 12345; const rnd = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
  const g = () => { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
  const n = Math.round(seconds * rate); const k = Math.log(1000) / rt; const fl = Math.pow(10, floorDb / 20); const x = new Float64Array(n); let pk = 0;
  for (let i = 0; i < n; i++) { x[i] = g() * Math.exp((-k * i) / rate) + fl * g(); pk = Math.max(pk, Math.abs(x[i])); }
  const b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round((x[i] / pk) * 0.9 * 32767))), 44 + i * 2);
  return b;
}
const fitOf = (p, name) => p.locator(`[data-testid=rv-fit][data-name=${name}]`);

{ const t = await open('#/commissioning/instruments/reverb', { role: 'cxeng', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('reverb-bench').waitFor();
  ok('RB-01', 'the commissioning engineer opens the instrument: no responses yet, the chain not declared, and the page says what to bring',
    await p.getByTestId('rv-empty').count() === 1 && /Not declared/.test(await p.getByTestId('rv-chain-select').evaluate((e) => e.selectedOptions[0].textContent)) && /chain decides what they can claim/.test(await p.getByTestId('rv-chain-note').innerText()));

  await p.getByTestId('rv-reference').click(); await p.getByTestId('rv-reference').click(); await p.waitForFunction(() => document.querySelector('[data-testid=reverb-bench]')?.getAttribute('data-positions') === '2');
  const t20 = Number(await fitOf(p, 'T20').locator('td.num').first().innerText());
  const synth = await p.getByTestId('rv-position').evaluateAll((els) => els.map((e) => e.dataset.synthetic));
  ok('RB-02', 'two synthetic references: each labelled a reference, the decay curve drawn with its fit, T20 at 1 kHz near the reference 0.70 s',
    JSON.stringify(synth) === '["true","true"]' && /synthetic reference/i.test(await p.getByTestId('rv-positions').innerText()) && await p.getByTestId('rv-synthetic-note').count() === 1
    && await p.locator('[data-testid=rv-decay] path.rv-curve').count() === 1 && await p.locator('[data-testid=rv-decay] line.rv-fit').count() === 1 && Math.abs(t20 - 0.7) < 0.12, `T20 ${t20} · ${synth}`);

  await p.getByTestId('rv-file').setInputFiles({ name: 'P3-lectern.wav', mimeType: 'audio/wav', buffer: wav(0.9, -40) });
  await p.waitForFunction(() => document.querySelector('[data-testid=reverb-bench]')?.getAttribute('data-positions') === '3');
  await p.locator('[data-testid=rv-decay-card] [role=radio]', { hasText: 'broadband' }).click().catch(() => {});
  const t30 = await fitOf(p, 'T30').getAttribute('data-refused'); const t30why = await fitOf(p, 'T30').innerText(); const t20b = await fitOf(p, 'T20').getAttribute('data-refused');
  ok('RB-03', 'a measured WAV with about 40 dB of range: T30 is refused with the range it measured and the 45 dB it needs; T20 is still given', t30 === 'yes' && /T30 needs 45 dB/.test(t30why) && t20b === 'no', t30why.slice(0, 160));

  await p.getByTestId('rv-file').setInputFiles({ name: 'broken.wav', mimeType: 'audio/wav', buffer: Buffer.from('this is not audio at all, just some text standing in for a file') });
  await p.getByTestId('rv-error').waitFor();
  ok('RB-04', 'a file that is not a WAV is refused with the reason, and nothing is added', /broken\.wav: not a WAV file/.test(await p.getByTestId('rv-error').innerText()) && await p.getByTestId('reverb-bench').getAttribute('data-positions') === '3');

  await p.getByTestId('rv-target').fill('0.7'); await p.getByTestId('rv-tol').fill('10');
  await p.getByTestId('rv-chain-select').selectOption('consumer');
  const states = await p.getByTestId('rv-mean').evaluateAll((els) => Object.fromEntries(els.map((e) => [e.dataset.band, e.dataset.state])));
  ok('RB-05', 'a target of 0.70 s ± 10 % marks each band against it; a phone microphone is said not to be a calibrated measurement microphone',
    Object.values(states).every((s) => ['within', 'above', 'below', ''].includes(s)) && Object.values(states).some((s) => s) && /not a calibrated measurement microphone/.test(await p.getByTestId('rv-chain-note').innerText()) && /not a commissioning result/.test(await p.getByTestId('rv-means').innerText()), JSON.stringify(states));

  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByTestId('rv-export').locator('button[data-format=json]').click()]);
  const j = JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); const text = JSON.stringify(j);
  const shas = (j.entities?.positions || []).map((x) => x.sha256);
  ok('RB-06', 'the JSON export: every position with its SHA-256, the references labelled SYNTHETIC REFERENCE, the phone chain making it "Indicative only"',
    j.schema === 'empathia.dossier/1' && shas.length === 3 && shas.every((s) => /^[0-9a-f]{64}$/.test(s)) && /SYNTHETIC REFERENCE/.test(text) && j.status?.label === 'Indicative only' && j.entities?.chain === 'consumer' && typeof j.integrity?.value === 'string', `${j.status?.label} · ${shas.length}`);
  ok('RB-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }

{ const t = await open('#/commissioning/instruments/reverb', { role: 'visitor', sw: false }); await t.page.waitForTimeout(800);
  const visitorSees = await t.page.getByTestId('reverb-bench').count(); await t.close();
  const ph = await open('#/commissioning/instruments/reverb', { role: 'cxeng', sw: false, w: 390, h: 844 }); await ph.page.getByTestId('rv-reference').click(); await ph.page.getByTestId('rv-decay').waitFor();
  const over = await ph.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('RB-07', 'a visitor is not shown the instrument; at phone width the page does not scroll sideways', visitorSees === 0 && over <= 0, `visitor ${visitorSees} · overflow ${over}px`);
  await ph.close(); }
await done();
