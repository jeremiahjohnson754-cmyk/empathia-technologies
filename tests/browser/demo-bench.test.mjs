#!/usr/bin/env node
// Learn Service Mode: the bench and the meltdowns (restored 12 Nov 2026 to the founder's build package: reference demos.js, the six
// "HEAR IT, SEE IT" demos, and renderServiceList's meltdown list). Each demo opens one at a time, draws its stage, and answers its own
// controls with the reference's arithmetic in the readout: the ear's threshold, the ringing mic's loudest band, the compressor letting go,
// a shutter that does or does not fit whole flicker cycles, a fixture's beam, a mired shift. The EQ's "Listen" plays pink noise through the
// filters and turns the bars into a live analyser, then stops. A meltdown opens from Service Mode. Phone, both themes, no console error,
// nothing leaves the page.
//   node tests/browser/demo-bench.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-bench');
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const slide = (loc, r) => loc.evaluate((el, x) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, String(x)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, r);
const field = (d, label) => d.locator('label.ch__field').filter({ has: d.page().locator(`span:text-is("${label}")`) });
const read = (d) => d.locator('.ch__read').innerText();

for (const [theme, w, h] of [['light', 1440, 900], ['dark', 390, 844]]) {
  const t = await open('#/learn/service', { role: 'service', theme, w, h }); const p = t.page; await p.waitForSelector('[data-testid=service-bench]');
  const bench = p.getByTestId('service-bench'), btn = (id) => bench.locator(`button[data-demo=${id}]`), demo = () => bench.getByTestId('bench-demo');
  const ids = await bench.locator('button[data-demo]').evaluateAll((b) => b.map((x) => x.dataset.demo));
  ok(`BN-01 ${theme}`, 'the bench lists the reference’s six demos, none open until chosen', ids.join() === 'ear,eq,comp,shutter,beam,color' && await bench.getByTestId('bench-demo').count() === 0, ids.join());

  await btn('ear').click(); let d = demo(); await d.waitFor();
  const ear0 = await read(d); await slide(d.locator('input[type=range]').first(), 0);
  const ear1 = await read(d);
  ok(`BN-02 ${theme}`, 'the ear: at 1 kHz a 60 dB tone is audible; at 20 Hz it is below the threshold of hearing (Terhardt), with λ = 343 ÷ f', /1000 Hz/.test(ear0) && /audible/.test(ear0) && !/below threshold/.test(ear0) && /20 Hz/.test(ear1) && /below threshold/.test(ear1) && /17\.15 m/.test(ear1) && /SUB-BASS/.test(ear1) && await d.locator('svg path').count() >= 1, `${ear0} || ${ear1}`);

  await btn('eq').click(); d = demo(); await d.waitFor({ state: 'attached' }); await p.waitForSelector('[data-testid=bench-demo][data-demo=eq]');
  await field(d, 'Source').locator('select').selectOption('ring');
  const eq1 = await read(d);
  ok(`BN-03 ${theme}`, 'EQ: the ringing mic’s loudest band is 2.5 kHz in the upper mids; the bars are drawn in the region colours (31 ⅓-octave bands)', /2\.5k Hz · UPPER-MIDS/.test(eq1) && await d.locator('svg rect[opacity="0.85"]').count() === 31, eq1);
  await d.getByRole('button', { name: /Listen through the EQ/ }).click(); await p.waitForTimeout(900);
  const live = await d.locator('svg text').filter({ hasText: 'LIVE ANALYSER' }).count(); const ys = await d.locator('svg rect[opacity="0.85"]').evaluateAll((r) => r.map((x) => Number(x.getAttribute('y'))));
  await d.getByRole('button', { name: /Stop/ }).click();
  ok(`BN-04 ${theme}`, 'Listen plays pink noise through the five filters and the bars become a live analyser (finite numbers), then Stop returns to the model', live === 1 && ys.length === 31 && ys.every(Number.isFinite) && await d.locator('svg text').filter({ hasText: 'LIVE ANALYSER' }).count() === 0, `${live} ${ys.slice(0, 6)}`);

  await btn('comp').click(); await p.waitForSelector('[data-testid=bench-demo][data-demo=comp]'); d = demo();
  const c0 = await read(d); await slide(field(d, 'Threshold (dBFS)').locator('input'), 1000); const c1 = await read(d);
  const gr = (s) => Number(/most gain reduction\s*([\d.]+) dB/.exec(s)?.[1]);
  ok(`BN-05 ${theme}`, 'compression: 4:1 at −18 dBFS works on the sung phrase; with the threshold at 0 dBFS it barely works', gr(c0) > 2 && /4:1 above -18 dBFS/.test(c0) && gr(c1) < 2 && /barely working/.test(c1), `${c0} || ${c1}`);

  await btn('shutter').click(); await p.waitForSelector('[data-testid=bench-demo][data-demo=shutter]'); d = demo();
  const fits = await d.locator('svg text').filter({ hasText: 'A whole number of cycles:' }).count();
  await field(d, 'Frame rate').locator('select').selectOption('25'); const r1 = await read(d);
  const bands = await d.locator('svg text').filter({ hasText: 'Not a whole number of cycles:' }).count();
  ok(`BN-06 ${theme}`, 'shutter: 180° at 29.97 fps under 120 Hz flicker fits ≈ 2 whole cycles (no bands); at 25 fps (1/50 s) it does not, and the frame bands', fits === 1 && bands === 1 && /20 ms \(180° at 25 fps\)/.test(r1) && /2\.4/.test(r1), r1);

  await btn('beam').click(); await p.waitForSelector('[data-testid=bench-demo][data-demo=beam]'); d = demo();
  const b0 = await read(d); await field(d, 'Fixture type').locator('select').selectOption('beam'); const b1 = await read(d);
  ok(`BN-07 ${theme}`, 'beams: a 26° profile at 10 m makes a 4.62 m pool; choosing a moving-head beam narrows it to a 0.52 m shaft (beam ⌀ = 2 d tan(θ/2))', /Ellipsoidal/.test(b0) && /4\.62 m/.test(b0) && /lux/.test(b0) && /Moving head beam/.test(b1) && /0\.52 m/.test(b1), `${b0} || ${b1}`);

  await btn('color').click(); await p.waitForSelector('[data-testid=bench-demo][data-demo=color]'); d = demo();
  const k0 = await read(d);
  ok(`BN-08 ${theme}`, 'colour: 3,200 K → 5,600 K is a −134 mired shift; the three lights mix additively', /-134/.test(k0) && /warm/.test(k0) && await d.locator('.bench__light').count() === 3 && (await d.locator('.bench__light').first().evaluate((e) => getComputedStyle(e).mixBlendMode)) === 'screen', k0);

  await btn('color').click();
  ok(`BN-09 ${theme}`, 'choosing an open demo again closes it; one demo at a time', await bench.getByTestId('bench-demo').count() === 0 && await bench.locator('button[aria-pressed=true]').count() === 0);

  const md = p.getByTestId('service-meltdowns'); await md.waitFor(); const n = await md.locator('li[data-meltdown]').count();
  await md.locator('li[data-meltdown]').first().getByRole('button', { name: 'Take the meltdown' }).click();
  ok(`BN-10 ${theme}`, 'Service Mode lists the meltdowns and one opens in place as the runner', n >= 1 && await md.getByTestId('meltdown').count() === 1, String(n));

  if (theme === 'dark') {
    await btn('eq').click(); await p.waitForSelector('[data-testid=bench-demo][data-demo=eq]');
    const small = await p.$$eval('[data-testid=service-bench] button, [data-testid=service-bench] select', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).map((e) => `${e.textContent.slice(0, 14)}:${Math.round(e.getBoundingClientRect().height)}`));
    ok('BN-11', 'phone (390, dark): the bench has 44 px targets and no horizontal overflow (the drawing scrolls in its box)', await overflow(p) <= 0 && small.length === 0, `${await overflow(p)} ${small.slice(0, 5).join(',')}`);
  }
  ok(`BN-12 ${theme}`, 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close();
}
await done();
