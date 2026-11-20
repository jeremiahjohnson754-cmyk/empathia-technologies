#!/usr/bin/env node
// The Space Optimizer page (v1.8.1 §10, Surpass §08, W06): one engine in every seeded world, nine dimensions, options A/B/C that really
// change the plan and the scores, the dimension shown on the plan, a study that reopens from its address, the model label on every
// screen, role boundaries (D44), the Enterprise hand-over, phone width, keyboard, both themes.
//   node tests/browser/demo-optimizer.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, main, done } = await harness('demo-optimizer');
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const table = (p) => p.$$eval('[data-testid=optimizer-table] tbody tr', (rows) => rows.map((r) => [r.dataset.dimension, ...[...r.querySelectorAll('td')].map((c) => parseInt(c.querySelector('.so-v').textContent, 10))]));

for (const [world, as, room] of [['university', 'university.av_it_engineer', 'UNI-ENG-110'], ['stadium', 'stadium.av_it_engineer', 'STA-PCR'], ['convention', 'convention.convention_av_it_engineer', 'CNV-SR-05']]) {
  const t = await open(`#/optimizer/${world}?as=${as}`); const p = t.page; const rows = await table(p);
  const s = await p.evaluate(() => ({ room: document.querySelector('[data-testid=optimizer]')?.dataset.room, saved: !!document.querySelector('[data-testid=optimizer-saved]'), model: document.querySelector('[data-testid=optimizer-model]')?.innerText, syn: document.querySelectorAll('main [data-testid=synthetic]').length, seats: document.querySelectorAll('[data-testid=optimizer-roomplan] .so-seat').length, opt: document.querySelector('[data-testid=optimizer]')?.dataset.option, best: document.querySelector('[data-testid=optimizer-best] .so-best')?.innerText }));
  ok(`O-01 ${world}`, `${world}: the saved study opens on its room, marked as saved and synthetic`, s.room === room && s.saved && s.syn === 1, JSON.stringify(s).slice(0, 200));
  ok(`O-02 ${world}`, `${world}: nine dimensions in order, three options each, every score 0 to 100`, rows.map((r) => r[0]).join() === 'video,sightlines,capture,reproduction,efficiency,accessibility,infrastructure,supportability,purpose' && rows.every((r) => r.length === 4 && r.slice(1).every((v) => v >= 0 && v <= 100)), JSON.stringify(rows));
  ok(`O-03 ${world}`, `${world}: the page says it is a planning model, not a measurement`, /A planning model, not a measurement/.test(s.model) && !/\bmeasured\b(?! )/.test(''), s.model.slice(0, 60));
  ok(`O-04 ${world}`, `${world}: the preferred option named in words is the option shown first`, new RegExp(`^Option ${s.opt}:`).test(s.best) && s.seats > 10, `${s.best} / ${s.opt}`);
  ok(`O-05 ${world}`, `${world}: no console error, no request leaving the page`, !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close();
}

{ const t = await open('#/optimizer/stadium/STA-PCR?as=stadium.av_it_engineer&option=A&show=capture'); const p = t.page;
  const a = await p.evaluate(() => ({ opt: document.querySelector('[data-testid=optimizer]').dataset.option, show: document.querySelector('[data-testid=optimizer-roomplan]').dataset.show, ok: document.querySelectorAll('.so-seat[data-ok=true]').length, no: document.querySelectorAll('.so-seat[data-ok=false]').length, mics: document.querySelectorAll('[data-testid=optimizer-roomplan] svg[role=img] .so-mic').length, count: document.querySelector('[data-testid=optimizer-count]').innerText }));
  const rows = await table(p); const cap = rows.find((r) => r[0] === 'capture');
  ok('O-06', 'a study reopens from its address: option A, audio capture on the plan', a.opt === 'A' && a.show === 'capture' && a.mics === 1);
  ok('O-07', 'the plan and the table agree: seats within reach on the plan give the table’s score for option A', Math.round(100 * a.ok / (a.ok + a.no)) === cap[1] && new RegExp(`^${a.ok} of ${a.ok + a.no} seats`).test(a.count), `${a.ok}/${a.ok + a.no} vs ${cap[1]} · ${a.count}`);
  await p.click('[data-testid=optimizer-plan] a[data-option=C]'); await p.waitForFunction(() => document.querySelector('[data-testid=optimizer]')?.dataset.option === 'C');
  const c = await p.evaluate(() => ({ ok: document.querySelectorAll('.so-seat[data-ok=true]').length, no: document.querySelectorAll('.so-seat[data-ok=false]').length, mics: document.querySelectorAll('[data-testid=optimizer-roomplan] svg[role=img] .so-mic').length, show: document.querySelector('[data-testid=optimizer-roomplan]').dataset.show, cur: document.querySelector('[data-testid=optimizer-plan] a[data-option=C]').getAttribute('aria-current'), col: document.querySelectorAll('[data-testid=optimizer-table] td[aria-current=true][data-option=C]').length }));
  ok('O-08', 'choosing option C really changes the room: more microphones, more seats within reach, the same dimension still shown', c.mics > a.mics && c.ok > a.ok && c.show === 'capture' && c.cur === 'true' && c.col === 9, JSON.stringify(c));
  ok('O-09', 'the choice is in the address, so Back returns to option A', /option=C/.test(p.url()) && /show=capture/.test(p.url()));
  await p.goBack(); await p.waitForFunction(() => document.querySelector('[data-testid=optimizer]')?.dataset.option === 'A');
  ok('O-10', 'Back restores option A', true);
  await p.click('[data-testid=optimizer-plan] a[data-show=sightlines]'); await p.waitForFunction(() => document.querySelector('[data-testid=optimizer-roomplan]')?.dataset.show === 'sightlines');
  const sl = await p.evaluate(() => ({ ok: document.querySelectorAll('.so-seat[data-ok=true]').length, n: document.querySelectorAll('.so-seat[data-ok]').length, wc: document.querySelectorAll('.so-seat[data-wheelchair=true]').length, label: document.querySelector('[data-testid=optimizer-roomplan] svg').getAttribute('aria-label') }));
  ok('O-11', 'changing the dimension redraws the same seats against the sightline rule, and the picture has a text equivalent', Math.round(100 * sl.ok / sl.n) === (await table(p)).find((r) => r[0] === 'sightlines')[1] && sl.wc >= 2 && /option A, from above: \d+ of \d+ seats can see a screen/.test(sl.label), sl.label);
  const why = await p.$$eval('[data-testid=optimizer-why] [data-dimension]', (d) => d.map((x) => x.innerText));
  ok('O-12', 'every score carries its reason and its rule in words', why.length === 9 && why.every((x) => /Rule:/.test(x)), why[1]);
  ok('O-13', 'a failing seat differs by shape, not only colour (ring and bar against filled dot)', await p.evaluate(() => { const no = document.querySelector('.so-seat.is-no'); return !no || (!!no.querySelector('line') && getComputedStyle(no.querySelector('circle, rect')).fill === 'none'); }));
  ok('O-14', 'no make, standards body or measurement claim appears', !/crestron|extron|qsc|biamp|shure|avixa|infocomm|certified|compliant/i.test(await main(p)));
  await t.close(); }

{ const t = await open('#/estate/university/UNI-ENG-110?as=university.av_it_engineer'); const p = t.page;
  await p.click('[data-testid=open-optimizer]'); await p.waitForSelector('[data-testid=optimizer]');
  ok('O-15', 'a room record opens its own study, as the same role', await p.locator('[data-testid=optimizer]').getAttribute('data-room') === 'UNI-ENG-110' && /as=university\.av_it_engineer/.test(p.url()), p.url());
  await p.click('text=Back to Engineering Centre 1.10'); await p.waitForSelector('[data-testid=estate-place]');
  ok('O-16', 'and returns to the same record', await p.locator('[data-testid=estate-place]').getAttribute('data-node') === 'UNI-ENG-110'); await t.close(); }

{ const t = await open('#/optimizer/university?as=university.student'); const p = t.page; const text = await main(p);
  ok('O-17', 'a student is not shown the design tool: the owl page, no scores', await p.locator('[data-testid=optimizer-gate]').count() === 1 && await p.locator('[data-testid=optimizer-table]').count() === 0 && /grants nothing/.test(text));
  await p.goto(p.url().replace(/#.*/, '#/estate/university/UNI-ENG-110?as=university.student')); await p.waitForSelector('[data-testid=estate-place]');
  ok('O-18', 'and the student’s room record offers no link to it', await p.locator('[data-testid=open-optimizer]').count() === 0); await t.close(); }

{ const t = await open('#/optimizer/enterprise'); const p = t.page;
  ok('O-19', 'Enterprise says plainly that its rooms are designed in Build a Room and are not yet read by the optimizer', await p.locator('[data-testid=optimizer-enterprise]').count() === 1 && /does not yet read/.test(await main(p)));
  await p.goto(p.url().replace(/#.*/, '#/optimizer/stadium/STA-SEC-113?as=stadium.av_it_engineer')); await p.waitForTimeout(500);
  ok('O-20', 'a room without seats says why it cannot be studied and offers the saved study', await p.locator('[data-testid=optimizer-none]').count() === 1);
  await p.goto(p.url().replace(/#.*/, '#/optimizer/stadium/NOPE?as=stadium.av_it_engineer')); await p.waitForTimeout(500);
  ok('O-21', 'an unknown room says so', await p.locator('[data-testid=world-unknown]').count() === 1); await t.close(); }

{ const t = await open('#/optimizer/convention?as=convention.convention_av_it_engineer'); const p = t.page;
  await p.focus('[data-testid=optimizer-plan] a[data-option=A]'); await p.keyboard.press('Enter'); await p.waitForFunction(() => document.querySelector('[data-testid=optimizer]')?.dataset.option === 'A');
  ok('O-22', 'options are links: keyboard Enter chooses one', true); await t.close(); }

for (const theme of ['light', 'dark']) { const t = await open('#/optimizer/university?as=university.av_it_engineer', { w: 390, h: 844, theme }); const p = t.page;
  const small = await p.$$eval('main .so-pickb, main .ui-btn, main .so-table thead a, main .w-crumbs a', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).map((e) => `${e.textContent.slice(0, 16)}:${Math.round(e.getBoundingClientRect().height)}`));
  ok(`O-23 ${theme}`, `phone (390, ${theme}): no horizontal overflow, 44 px targets, no console error`, await overflow(p) <= 0 && small.length === 0 && !t.errs.length, `${await overflow(p)} ${small.slice(0, 4).join(',')} ${t.errs.join('|')}`);
  const c = await p.evaluate(() => { const lum = (s) => { const m = s.match(/[\d.]+/g).map(Number).map((v) => (/^color\(/.test(s) ? v * 255 : v)); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; const al = b && /^rgba\(/.test(b) ? Number(b.match(/[\d.]+/g)[3]) : b && /\/\s*([\d.]+)\)$/.test(b) ? Number(b.match(/\/\s*([\d.]+)\)$/)[1]) : 1; if (b && b !== 'transparent' && al >= 0.6) return b; } return 'rgb(255,255,255)'; };
    return [...document.querySelectorAll('main .so-model, main .so-why .ui-meta, main .so-table tbody th, main .so-cap span, main .so-pickb')].map((el) => { const a = lum(getComputedStyle(el).color); const b = lum(bgOf(el)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }); });
  ok(`O-24 ${theme}`, `${theme}: text on the optimizer meets 4.5:1`, c.length > 10 && Math.min(...c) >= 4.5, Math.min(...c).toFixed(2)); await t.close(); }
await done();
