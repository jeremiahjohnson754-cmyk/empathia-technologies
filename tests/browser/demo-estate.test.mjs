#!/usr/bin/env node
// The estate page (v1.8.1 §3): one page for every world on the canonical records. What a role configuration is shown and never shown
// (D44), Search Party in context returning the same record that browsing reaches, the founder's University numbers as rendered,
// step-free routes, the Enterprise hand-over, deep links, phone width, keyboard, and no console error or request leaving the page.
//   node tests/browser/demo-estate.test.mjs        (PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs … for a dark device)
import { harness } from './demo-shell-lib.mjs';
const { ok, open, main, done } = await harness('demo-estate');
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

{ const t = await open('#/estate/university'); const p = t.page;
  const s = await p.evaluate(() => ({ h1: document.querySelector('main h1')?.textContent, syn: document.querySelectorAll('main [data-testid=synthetic]').length, reader: document.querySelector('[data-testid=estate-reader]')?.dataset.reader, totals: document.querySelector('[data-testid=estate-totals]')?.innerText, plan: document.querySelectorAll('[data-testid=estate-plan] a').length, browse: [...document.querySelectorAll('[data-testid=estate-browse] a')].map((a) => a.textContent) }));
  ok('E-01', 'the University estate opens: a heading, one synthetic label, a plan and the three campuses', /Kestrel Valley University/.test(s.h1) && s.syn === 1 && s.plan > 10 && s.browse.filter((x) => /Campus/.test(x)).length === 3, JSON.stringify(s));
  ok('E-02', 'a visitor is the default reader, shown public places only, and no equipment count', s.reader === 'public' && !/equipment/.test(s.totals) && /of \d+ recorded/.test(s.totals), s.totals);
  await p.fill('#es-q', 'classroom'); await p.waitForTimeout(250);
  const vis = await p.$$eval('[data-testid=estate-hits] a', (a) => a.map((x) => x.dataset.node));
  ok('E-03', 'a visitor searching “classroom” is offered no classroom record (classrooms open to the enrolled), only public places that mention one', vis.length < 5 && !vis.some((h) => /^UNI-(ENG|CMP|BUS|SCI|HLT|ART|MED|HUM)-\d{3}$/.test(h)), vis.join(','));
  await p.fill('#es-q', 'zzqx'); await p.waitForTimeout(250);
  ok('E-03b', 'words that match nothing are answered in words, with a suggestion', await p.locator('[data-testid=estate-none]').count() === 1 && /Nothing in what the Visitor is shown/.test(await p.locator('[data-testid=estate-none]').innerText()));
  ok('E-04', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

{ const t = await open('#/estate/university?as=university.student'); const p = t.page;
  await p.fill('#es-q', 'classroom'); await p.waitForTimeout(250);
  const hits = await p.$$eval('[data-testid=estate-hits] a', (a) => a.map((x) => x.dataset.node));
  ok('E-05', 'a student searching “classroom” gets classroom records', hits.length >= 20 && hits.every((h) => /^UNI-/.test(h)), `${hits.length}`);
  await p.fill('#es-q', 'sci-110'); await p.waitForTimeout(250); const first = await p.locator('[data-testid=estate-hits] a').first().getAttribute('data-node');
  await p.locator('[data-testid=estate-hits] a').first().click(); await p.waitForSelector('[data-testid=estate-place]');
  const rec = await p.evaluate(() => ({ node: document.querySelector('[data-testid=estate-place]').dataset.node, id: document.querySelector('[data-testid=estate-id]').textContent, h1: document.querySelector('main h1').textContent, focus: document.activeElement === document.querySelector('main h1') }));
  ok('E-06', 'the place found by words is the record browsed to (one identifier), and the heading takes focus', first === 'UNI-SCI-110' && rec.node === first && rec.id === first && /SCI-110/.test(rec.h1), JSON.stringify(rec));
  ok('E-07', 'a student is told what the room offers in plain words, with no equipment table and no systems state', await p.locator('[data-testid=estate-offers] li').count() >= 2 && await p.locator('[data-testid=estate-equipment]').count() === 0 && await p.locator('[data-testid=estate-state]').count() === 0);
  ok('E-08', 'the address keeps the role configuration from page to page', /as=university\.student/.test(p.url()), p.url());
  await p.goBack(); await p.waitForSelector('[data-testid=estate]');
  ok('E-09', 'Back returns to the estate', /#\/estate\/university\?as=university\.student$/.test(p.url()), p.url());
  ok('E-10', 'no console error', !t.errs.length, t.errs.join(' | ')); await t.close(); }

{ const t = await open('#/estate/university/UNI-SCI-110?as=university.av_it_engineer'); const p = t.page;
  const s = await p.evaluate(() => ({ rows: document.querySelectorAll('[data-testid=estate-equipment] tbody tr').length, state: document.querySelector('[data-testid=estate-state]')?.textContent, offers: document.querySelectorAll('[data-testid=estate-offers]').length, th: document.querySelectorAll('[data-testid=estate-equipment] th[scope]').length }));
  ok('E-11', 'the campus AV engineer opens the same record with its equipment table and commissioning state', s.rows >= 4 && /Commissioned/.test(s.state) && s.offers === 0 && s.th >= 5 + s.rows, JSON.stringify(s));
  ok('E-12', 'equipment is named by class, never by make', !/crestron|extron|qsc|biamp|shure|cisco|poly|logitech|sony|samsung|barco|epson|panasonic/i.test(await main(p)));
  await t.close(); }

{ const t = await open('#/estate/university?as=university.av_it_engineer'); const p = t.page;
  await p.fill('#es-q', 'house'); await p.waitForTimeout(250);
  const dorms = (await p.$$eval('[data-testid=estate-hits] a b', (b) => b.map((x) => x.textContent))).slice(0, 4);
  ok('E-13', 'the four dormitories lead a search for “house”, ahead of the rooms inside them', dorms.join() === 'Alder House,Birch House,Cedar House,Dunlin House', dorms.join(','));
  await t.close(); }

{ const t = await open('#/estate/stadium/STA-LKR-H?as=stadium.fan'); const p = t.page; const text = await main(p);
  ok('E-14', 'a fan following a link to a team room gets the owl page: no name, no facts', await p.locator('[data-testid=estate-gate]').count() === 1 && !/locker/i.test(text) && await p.locator('[data-testid=estate-facts]').count() === 0, text.slice(0, 120));
  await p.click('text=Open the estate'); await p.waitForSelector('[data-testid=estate]'); await p.fill('#es-q', 'locker'); await p.waitForTimeout(250);
  ok('E-15', 'a fan searching “locker” finds nothing', await p.locator('[data-testid=estate-none]').count() === 1 && await p.locator('[data-testid=estate-hits]').count() === 0);
  await p.fill('#es-q', 'first aid'); await p.waitForTimeout(250);
  ok('E-16', 'a fan searching “first aid” finds it', (await p.$$eval('[data-testid=estate-hits] a', (a) => a.map((x) => x.dataset.node))).includes('STA-FA-NE'));
  await t.close(); }

{ const t = await open('#/estate/stadium/STA-SEC-113?as=stadium.fan'); const p = t.page;
  const all = await p.$$eval('[data-testid=estate-routes] [data-route]', (l) => l.map((x) => x.dataset.stepfree));
  await p.click('[data-testid=estate-routes] button:has-text("Step-free only")'); await p.waitForTimeout(150);
  const sf = await p.$$eval('[data-testid=estate-routes] [data-route]', (l) => l.map((x) => x.dataset.stepfree));
  ok('E-17', 'Section 113 lists a stepped and a step-free way in; “Step-free only” leaves the step-free one and says how many', all.length === 2 && all.includes('false') && sf.length === 1 && sf[0] === 'true' && await p.locator('[data-testid=estate-routes] button[aria-pressed=true]').innerText() === 'Step-free only', JSON.stringify({ all, sf }));
  ok('E-18', 'the section is lit on the plan through its bowl', await p.locator('[data-testid=estate-plan] .is-lit').count() >= 1);
  await t.close(); }

{ const t = await open('#/estate/stadium/STA-LKR-H?as=stadium.av_it_engineer'); const p = t.page;
  ok('E-19', 'the venue AV engineer opens the same team room record', await p.locator('[data-testid=estate-place]').count() === 1 && /Home Locker Room/.test(await p.locator('main h1').innerText()));
  await t.close(); }

{ const t = await open('#/estate/convention/CNV-BTH-A1?as=convention.convention_attendee'); const p = t.page; const text = await main(p);
  ok('E-20', 'booth A1 is the journey’s exhibitor, said to be invented', /Quillfinch Audio/.test(text) && /invented/.test(text), text.slice(0, 200));
  await p.goto(p.url().replace(/#.*/, '#/estate/convention')); await p.waitForSelector('[data-testid=estate]');
  ok('E-21', 'a walk-in visitor to the convention is not shown the badge-only hall', !(await p.$$eval('[data-testid=estate-plan] a', (a) => a.map((x) => x.dataset.node))).some((id) => /^CNV-(EXPO|HBR|SMT|GDN)-/.test(id)) && (await p.$$eval('[data-testid=estate-program] tbody tr', (r) => r.map((x) => x.dataset.type))).every((t) => !['expo-hall', 'booth', 'network-room'].includes(t)) && (await p.locator('[data-testid=estate-reader]').getAttribute('data-reader')) === 'public');
  ok('E-22', 'no association, show or venue of the real world is named', !/avixa|infocomm|playstation/i.test(await main(p)));
  await t.close(); }

{ const t = await open('#/estate/stadium?as=stadium.venue_ops_lead'); const p = t.page;
  const prog = Object.fromEntries(await p.$$eval('[data-testid=estate-program] tbody tr', (r) => r.map((x) => [x.dataset.type, [...x.querySelectorAll('td')].map((c) => c.textContent)])));
  const seats = Number(prog['seating-section'][1].replace(/,/g, '')) + Number(prog.suite[1].replace(/,/g, ''));
  ok('E-32', 'Stadium: the space program on screen adds up to a 60,000 to 65,000 seat venue (Surpass §20)', seats >= 60000 && seats <= 65000 && Number(prog.suite[0]) === 120 && Number(prog.restrooms[0]) >= 30, `${seats} seats`);
  await p.goto(p.url().replace(/#.*/, '#/estate/convention?as=convention.convention_av_it_engineer')); await p.waitForSelector('[data-testid=estate-program]');
  const cp = Object.fromEntries(await p.$$eval('[data-testid=estate-program] tbody tr', (r) => r.map((x) => [x.dataset.type, [...x.querySelectorAll('td')].map((c) => c.textContent)])));
  ok('E-33', 'Convention: thirteen halls, 225 meeting and breakout rooms and the show’s booths are on screen (Surpass §22)', Number(cp['expo-hall'][0]) === 13 && Number(cp['breakout-room'][0]) + Number(cp['meeting-room'][0]) === 225 && Number(cp.booth[0].replace(/,/g, '')) >= 1000 && /269,100 m²/.test(cp['expo-hall'][2]), JSON.stringify(cp['expo-hall']));
  ok('E-34', 'the large estates still open without console errors', !t.errs.length, t.errs.join(' | ')); await t.close(); }

{ const t = await open('#/estate/enterprise'); const p = t.page;
  ok('E-23', 'Enterprise hands over to the existing campus, Lite and Search Party; nothing parallel is built', await p.locator('[data-testid=estate-enterprise]').count() === 1 && (await p.$$eval('[data-testid=estate-enterprise] a.ui-btn', (a) => a.map((x) => x.getAttribute('href')))).join() === '#/campus,#/lite,#/search');
  await p.goto(p.url().replace(/#.*/, '#/estate/university/NOT-A-PLACE')); await p.waitForTimeout(500);
  ok('E-24', 'an unknown place and an unknown world say so', await p.locator('[data-testid=world-unknown]').count() === 1);
  await p.goto(p.url().replace(/#.*/, '#/estate/atlantis')); await p.waitForTimeout(500);
  ok('E-25', 'an unknown world says so', await p.locator('[data-testid=world-unknown]').count() === 1);
  await t.close(); }

{ const t = await open('#/world/university?as=university.student'); const p = t.page;
  const href = await p.locator('[data-testid=open-estate]').getAttribute('href');
  await p.click('[data-testid=open-estate]'); await p.waitForSelector('[data-testid=estate]');
  ok('E-26', 'a world offers “Explore the estate”, carrying the role configuration', /#\/estate\/university\?as=university\.student/.test(href) && (await p.locator('[data-testid=estate-reader]').getAttribute('data-reader')) === 'members', href);
  await p.fill('#es-q', 'library'); await p.waitForTimeout(200);
  await p.goto(p.url().replace(/#.*/, '#/estate/university?as=university.visitor')); await p.waitForTimeout(500);
  ok('E-27', 'changing the role configuration clears the search (scoped state)', await p.inputValue('#es-q') === '');
  await p.focus('[data-testid=estate-plan] a'); const target = await p.evaluate(() => document.activeElement.dataset.node); await p.keyboard.press('Enter'); await p.waitForSelector('[data-testid=estate-place]');
  ok('E-28', 'the plan is keyboard-operable: Enter on an outline opens its record', await p.locator('[data-testid=estate-place]').getAttribute('data-node') === target, target);
  await t.close(); }

for (const [hash, name] of [['#/estate/university?as=university.av_it_engineer', 'estate'], ['#/estate/university/UNI-SCI-110?as=university.av_it_engineer', 'place with equipment'], ['#/estate/stadium/STA-SEC-113?as=stadium.fan', 'section'], ['#/estate/convention?as=convention.convention_av_it_engineer', 'convention']]) {
  const t = await open(hash, { w: 390, h: 844 }); const p = t.page;
  const small = await p.$$eval('main a.w-item, main .w-pick__b, main .ui-btn, main #es-q, main .w-crumbs a, main .es-as a', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 43.5); }).map((e) => `${e.textContent.slice(0, 20)}:${Math.round(e.getBoundingClientRect().height)}`));
  ok(`E-29 ${name}`, `phone (390): ${name} has no horizontal overflow and 44 px targets`, await overflow(p) <= 0 && small.length === 0, `${await overflow(p)} ${small.slice(0, 4).join(',')}`);
  ok(`E-30 ${name}`, `phone (390): ${name} raises no console error`, !t.errs.length, t.errs.join(' | ')); await t.close();
}
for (const theme of ['light', 'dark']) { const t = await open('#/estate/stadium?as=stadium.venue_ops_lead', { theme }); const p = t.page;
  const c = await p.evaluate(() => { const lum = (s) => { const m = s.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; } return 'rgb(255,255,255)'; };
    return [...document.querySelectorAll('main .es-as, main .es-totals li, main .w-item .ui-meta, main .es-find label')].map((el) => { const a = lum(getComputedStyle(el).color); const b = lum(bgOf(el)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }); });
  ok(`E-31 ${theme}`, `${theme}: the estate’s secondary text meets 4.5:1`, c.length > 5 && Math.min(...c) >= 4.5, Math.min(...c).toFixed(2)); await t.close(); }
await done();
