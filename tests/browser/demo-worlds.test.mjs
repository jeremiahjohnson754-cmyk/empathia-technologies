#!/usr/bin/env node
// The worlds (handoff v1.8 §3, ADR-022, ADR-024): "Choose a world" with exactly four cards and a skip path; every journey of every
// world within three actions of #/worlds; the role configurations by purpose (13 / 14 / 13 / 12 = 52, never one list); the presentation
// gate with its owl page; scoped state reset on a world or role switch; back navigation and deep links; light and dark at 390 / 768 /
// 1440 with no horizontal overflow, 44 px targets on the phone, no console error, no request leaving the page, and no 3D scene, video
// or restricted chunk fetched for a world or journey that did not ask for it.
//   node tests/browser/demo-worlds.test.mjs        (PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs … for a dark device)
import fs from 'node:fs'; import path from 'node:path';
import { harness, repo } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-worlds');

const dist = path.join(repo, 'apps/demo/dist');
const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
// the demonstration's 3D is the spatial stage module (isometric room and campus scenes): any shipped script that carries it, or WebGL
const SCENE = walk(dist).filter((f) => f.endsWith('.js') && /stage__svg|Three-dimensional view|WebGLRenderer|getContext\(["']webgl/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(dist, f));
const heavy = (reqs) => reqs.map((r) => r.split('?')[0]).filter((r) => SCENE.includes(r) || /\.(mp4|webm|mp3|glb|gltf|hdr|ktx2)$/.test(r) || r === 'signal-lib.json');
const pro = (reqs) => reqs.filter((r) => /chunks\/(Stadium|University|Convention)Pro-/.test(r));
const WORLDS = { enterprise: 13, stadium: 14, university: 13, convention: 12 };
const JOURNEYS = {
  stadium: ['attend-game', 'find-amenities', 'broadcast-production', 'venue-engineering', 'venue-operations'],
  university: ['student-life', 'discover-campus', 'study-play', 'teaching-research', 'campus-technology'],
  convention: ['attend-expo', 'exhibitor-experience', 'keynote-polls', 'production-broadcast', 'venue-operations'],
};
const BAD = /soldier field|illinois|urbana|mccormick|\bbears\b|\bNFL\b|\bAON\b|kraft|heinz|stefanini|\bKHC\b|official partner|production[- ]ready/i;
const LIVE = /\blive\b/i;   // nothing on a world screen may call itself live
const settle = (p, ms = 350) => p.waitForTimeout(ms);
const go = async (p, hash) => { await p.evaluate((h) => { location.hash = h; }, hash); await settle(p); };
const state = (p) => p.evaluate(() => {
  const main = document.querySelector('main'); const vw = document.documentElement.clientWidth;
  const small = [...main.querySelectorAll('button, a.ui-btn, a.w-card, a.w-jcard, a.w-role, select, input:not([type=checkbox]), .w-crumbs a, label.w-check')].filter((e) => e.offsetParent !== null).map((e) => ({ t: (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30), h: Math.round(e.getBoundingClientRect().height) })).filter((x) => x.h < 44);
  return { h1: main.querySelector('h1')?.textContent || '', text: main.innerText, overflow: document.documentElement.scrollWidth - vw, small, synthetic: main.querySelectorAll('[data-testid=synthetic]').length, crumbs: [...main.querySelectorAll('[data-testid=crumbs] li')].map((l) => l.textContent), current: main.querySelector('[data-testid=crumbs] [aria-current=page]')?.textContent || '', hash: location.hash, focus: document.activeElement?.tagName + ':' + (document.activeElement?.textContent || '').slice(0, 40), bg: getComputedStyle(document.body).backgroundColor };
});

// ---------------------------------------------------------------- 1. every screen, light and dark, 390 / 768 / 1440
const seen = { text: '', bg: {} };
for (const theme of ['light', 'dark']) for (const w of [390, 768, 1440]) {
  const t = await open('#/worlds', { role: 'visitor', w, h: w === 390 ? 844 : 900, theme }); const p = t.page; const id = `${theme}-${w}`;
  const s0 = await state(p); seen.bg[theme] = s0.bg;
  const cards = await p.$$eval('[data-testid=world-card]', (a) => a.map((x) => ({ world: x.dataset.world, href: x.getAttribute('href') })));
  ok(`W-01-${id}`, 'Choose a world: exactly four world cards, a heading, breadcrumbs and a skip path', cards.length === 4 && cards.map((c) => c.world).join() === Object.keys(WORLDS).join() && s0.h1 === 'Choose a world' && s0.current === 'Worlds' && await p.locator('[data-testid=worlds-skip]').getAttribute('href') === '#/investor', JSON.stringify({ cards, h1: s0.h1 }));
  const bad = []; const push = (where, s, extra = '') => { if (s.overflow > 0) bad.push(`${where}: overflows by ${s.overflow}px`); if (w === 390 && s.small.length) bad.push(`${where}: small targets ${JSON.stringify(s.small.slice(0, 3))}`); if (!s.synthetic) bad.push(`${where}: no SYNTHETIC label`); if (BAD.test(s.text)) bad.push(`${where}: forbidden name ${BAD.exec(s.text)[0]}`); if (extra) bad.push(`${where}: ${extra}`); seen.text += s.text; };
  push('worlds', s0);
  for (const [world, n] of Object.entries(WORLDS)) {
    await go(p, `#/world/${world}`); const s = await state(p); const js = await p.locator('[data-testid=journeys] [data-journey]').count();
    push(world, s, js >= 4 && js <= 6 ? '' : `${js} journey cards`);
    await p.click('[data-testid=advanced-open]'); await settle(p, 120);
    const adv = await p.evaluate(() => ({ n: document.querySelectorAll('[data-testid=advanced] [data-role-config]').length, groups: document.querySelectorAll('[data-testid=advanced] .w-group').length, biggest: Math.max(...[...document.querySelectorAll('[data-testid=advanced] .w-group')].map((g) => g.querySelectorAll('[data-role-config]').length)), selects: document.querySelectorAll('main select').length, said: document.querySelector('[data-testid=advanced-count]')?.textContent || '' }));
    push(`${world} advanced`, await state(p), adv.n === n && adv.groups >= 4 && adv.biggest < n && adv.selects === 0 && adv.said.startsWith(`${n} role configurations`) ? '' : `advanced list ${JSON.stringify(adv)}`);
  }
  for (const [world, slugs] of Object.entries(JOURNEYS)) for (const slug of slugs) {
    await go(p, `#/world/${world}`); const href = await p.locator(`[data-journey=${slug}]`).getAttribute('href'); await go(p, href); await p.waitForSelector('[data-testid=world-screen]', { timeout: 5000 }).catch(() => undefined);
    const s = await state(p); push(`${world}/${slug}`, s, (await p.locator('[data-testid=world-screen]').count()) === 1 && !LIVE.test(s.text) && s.crumbs.length === 4 ? '' : `screen missing, or says live, or crumbs ${s.crumbs.length}`);
  }
  ok(`W-02-${id}`, 'worlds, world pages, advanced lists (13/14/13/12, grouped, no dropdown) and all 15 journey screens: labelled SYNTHETIC, no overflow, 44 px targets on the phone, fictional names only', bad.length === 0, bad.slice(0, 4).join(' | '));
  ok(`W-03-${id}`, 'no console error, no request leaves the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();
}
ok('W-04', 'light and dark are different themes of the same screens', seen.bg.light && seen.bg.dark && seen.bg.light !== seen.bg.dark, JSON.stringify(seen.bg));
ok('W-05', 'the screens name only the fictional places', /Harborlight Stadium/.test(seen.text) && /Kestrel Valley University/.test(seen.text) && /Larkspur Exchange/.test(seen.text) && !BAD.test(seen.text));

// ---------------------------------------------------------------- 2. three actions or fewer; nothing heavy for an unvisited world
for (const [w, theme] of [[1440, 'light'], [390, 'dark']]) {
  const worst = []; let fetched = [];
  for (const [world, slugs] of Object.entries(JOURNEYS)) for (const slug of slugs) {
    const t = await open('#/worlds', { role: 'visitor', w, theme }); const p = t.page; let actions = 0;
    await p.click(`[data-testid=world-card][data-world=${world}]`); actions += 1; await settle(p, 250);
    await p.click(`[data-testid=journeys] [data-journey=${slug}]`); actions += 1;
    const up = await p.waitForSelector('[data-testid=world-screen]', { timeout: 5000 }).then(() => true).catch(() => false);
    const at = await p.evaluate(() => document.querySelector('[data-testid=world-screen]')?.dataset.journey);
    if (!up || at !== slug || actions > 3) worst.push(`${world}/${slug}: ${actions} actions, screen ${at}`);
    fetched.push(...heavy(t.reqs)); if (t.errs.length) worst.push(`${world}/${slug}: ${t.errs[0]}`); await t.close();
  }
  ok(`W-06-${w}`, 'every Stadium, University and Convention journey is two actions from #/worlds (three allowed)', worst.length === 0, worst.slice(0, 3).join(' | '));
  ok(`W-07-${w}`, `no 3D scene chunk (${SCENE.length} shipped), video, audio or SIGNAL library is fetched by choosing a world or a journey`, SCENE.length > 0 && fetched.length === 0, fetched.slice(0, 4).join(', '));
}
{ // Enterprise: the journeys open the existing pages, by the policy
  const t = await open('#/worlds', { role: 'architect' }); const p = t.page; const out = [];
  for (const [slug, hash] of [['explore-workplace', '#/lite'], ['find-support', '#/search'], ['engineer-commission', '#/commissioning'], ['manage-operations', '#/home'], ['executive-overview', '#/pro/exec']]) {
    await go(p, '#/worlds'); await p.click('[data-testid=world-card][data-world=enterprise]'); await settle(p, 250); await p.click(`[data-journey=${slug}]`); await settle(p, 500);
    const s = await p.evaluate(() => ({ hash: location.hash, h1: document.querySelector('main h1')?.textContent, denied: !!document.querySelector('[data-testid=access-page]') }));
    if (s.hash !== hash || !s.h1 || s.denied) out.push(`${slug}: ${JSON.stringify(s)}`);
  }
  ok('W-08', 'Enterprise: each of the five journeys opens its existing page in two actions, for a role the policy admits', out.length === 0, out.join(' | '));
  await t.close();
  const v = await open('#/world/enterprise', { role: 'visitor' }); const q = v.page;
  const before = heavy(v.reqs).length;
  const label = await q.locator('[data-journey=engineer-commission]').innerText();
  await q.click('[data-journey=engineer-commission]'); await settle(q, 700);
  const s = await q.evaluate(() => ({ role: document.documentElement.dataset.role, hash: location.hash, said: document.getElementById('route-announcer').textContent, denied: !!document.querySelector('[data-testid=access-page]') }));
  ok('W-10', 'a role the policy denies is told the journey opens as another role, and it does so through View as, announced (never a refusal, never a silent grant)', /Opens as Commissioning Engineer through View as/.test(label) && s.role === 'cxeng' && s.hash === '#/commissioning' && !s.denied && /grants nothing/.test(s.said), JSON.stringify({ label: label.slice(0, 80), ...s }));
  ok('W-11', 'opening the Enterprise world page itself fetches no 3D scene chunk', before === 0, String(before));
  await v.close(); }

// ---------------------------------------------------------------- 3. the presentation gate (D44) and the chunks behind it
{ const t = await open('#/world/stadium/venue-engineering', { role: 'visitor' }); const p = t.page;
  const g = await p.evaluate(() => ({ owl: !!document.querySelector('[data-testid=world-access-page]'), h1: document.querySelector('main h1')?.textContent, who: [...document.querySelectorAll('[data-testid=world-access-who] a')].map((a) => a.textContent), own: [...document.querySelectorAll('[data-testid=world-access-own] a')].map((a) => a.textContent), screen: !!document.querySelector('[data-testid=world-screen]'), text: document.querySelector('main').innerText }));
  ok('W-12', 'a visitor at an engineering address gets the owl page: the roles whose work it is, what the visitor can open, and no screen', g.owl && !g.screen && g.h1 === 'Venue Engineering is not open to the Visitor' && g.who.join() === 'Open as Broadcast Engineer,Open as AV / IT Engineer,Open as Service Technician,Open as MSP Engineer' && g.own.join() === 'Attend Game,Find Amenities' && !/Device passport:|HLS-/i.test(g.text), JSON.stringify(g).slice(0, 280));
  ok('W-13', 'the refused screen’s code was not loaded (no restricted chunk, no public chunk)', pro(t.reqs).length === 0 && !t.reqs.some((r) => /StadiumPublic-/.test(r)), t.reqs.filter((r) => /Stadium/.test(r)).join());
  await p.click('[data-testid=world-access-who] a[data-role-config="stadium.av_it_engineer"]'); await p.waitForSelector('[data-testid=chain]', { timeout: 5000 }).catch(() => undefined);
  const e = await p.evaluate(() => ({ hash: location.hash, as: document.querySelector('[data-testid=world-as]')?.innerText, nodes: document.querySelectorAll('[data-testid=chain] .w-chain__node').length, passport: document.querySelector('[data-testid=passport]')?.innerText || '' }));
  ok('W-14', '“Open as AV / IT Engineer” opens the signal chain with device passports and evidence states; the address carries the role', e.hash === '#/world/stadium/venue-engineering?as=stadium.av_it_engineer' && /Viewing as AV \/ IT Engineer/.test(e.as) && /grants nothing/.test(e.as) && e.nodes === 5 && /SPEC TO VERIFY/.test(e.passport) && /read-only/.test(e.passport) && pro(t.reqs).length === 1, JSON.stringify(e).slice(0, 260));
  await p.click('[data-testid=chain] .w-chain__node >> nth=3'); await settle(p, 100);
  const pass = await p.locator('[data-testid=passport]').innerText();
  await p.click('.w-pick__b:has-text("Broadcast video")'); await settle(p, 150);
  ok('W-15', 'a node opens its passport (class template, state, work order); the second chain is one press away', /East stand amplifiers/.test(pass) && /Degraded/.test(pass) && /WO-2207/.test(pass) && await p.locator('[data-testid=chain] .w-chain__node').count() === 6 && /Camera position 1/.test(await p.locator('[data-testid=passport]').innerText()), pass.slice(0, 160));
  ok('W-16', 'no console error, nothing off the page', !t.errs.length && !t.off.length, t.errs.join(' | ')); await t.close(); }

{ // public journeys never carry the venue's systems
  const t = await open('#/world/stadium/attend-game?as=stadium.fan', { role: 'visitor' }); const p = t.page; const out = [];
  for (const [world, slugs] of Object.entries(JOURNEYS)) for (const slug of slugs.filter((s) => ['attend-game', 'find-amenities', 'discover-campus', 'study-play', 'attend-expo', 'keynote-polls'].includes(s))) {
    await go(p, `#/world/${world}/${slug}`); await p.waitForSelector('[data-testid=world-screen]', { timeout: 5000 }).catch(() => undefined);
    const text = await p.evaluate(() => document.querySelector('main').innerText);
    if (/passport|signal chain|VLAN|amplifier|encoder|switcher|HLS-|LXC-|work order|WO-\d|rack/i.test(text) || (await p.locator('[data-testid=chain], [data-testid=workboard]').count())) out.push(`${world}/${slug}`);
  }
  ok('W-17', 'the six public journeys show no engineering topology, device passport or work order, and never fetch a restricted chunk', out.length === 0 && pro(t.reqs).length === 0, [...out, ...pro(t.reqs)].join());
  await go(p, '#/world/university/student-life'); const owl = await p.locator('[data-testid=world-access-page]').count();
  await go(p, '#/world/university/campus-technology?as=university.av_it_engineer'); await p.waitForSelector('[data-testid=estate]', { timeout: 5000 }).catch(() => undefined);
  const tech = await p.evaluate(() => document.querySelector('main').innerText);
  ok('W-18', 'the student’s day is the Student’s only (a visitor gets the owl page), and Campus Technology shows no timetable, assignment or reminder', owl === 1 && !/problem set|timetable|Circuits and Signals|reminder/i.test(tech) && /Classroom AV estate/.test(tech), tech.slice(0, 120));
  await go(p, '#/world/university?as=stadium.av_it_engineer');
  const carried = await p.evaluate(() => ({ as: document.querySelector('[data-testid=world-as]')?.innerText, note: document.querySelector('main .ui-notice')?.innerText || '' }));
  ok('W-19', 'a role of another world is never carried across: the world opens as its Visitor and says why', /Viewing as Visitor/.test(carried.as) && /never carried/.test(carried.note), JSON.stringify(carried));
  await go(p, '#/world/atlantis'); const u1 = await p.locator('[data-testid=world-unknown]').count(); await go(p, '#/world/stadium/halftime-show'); const u2 = await p.locator('[data-testid=world-unknown]').count();
  ok('W-20', 'an unknown world or journey lands on a finished page with the way back, not an error', u1 === 1 && u2 === 1 && !t.errs.length, t.errs.join(' | ')); await t.close(); }

// ---------------------------------------------------------------- 4. the world page: tour, panels, roles, keyboard, back
{ const t = await open('#/investor', { role: 'architect' }); const p = t.page;
  const entry = await p.locator('[data-testid=worlds-entry]').getAttribute('href');
  ok('W-21', 'the investor start still opens on its own heading and links prominently to Choose a world', entry === '#/worlds' && /guard, an actor and an event/.test(await p.locator('main h1').innerText()) && await p.locator('.start .go').count() === 3);
  await p.click('[data-testid=worlds-entry]'); await settle(p);
  const f = await p.evaluate(() => ({ start: document.activeElement.tagName, order: [], world: '', said: document.getElementById('route-announcer').textContent }));
  for (let i = 0; i < 2; i++) { await p.keyboard.press('Tab'); f.world = await p.evaluate(() => document.activeElement.dataset.world || ''); f.order.push(f.world); }
  await p.keyboard.press('Enter'); await settle(p);
  const s = await state(p);
  ok('W-22', 'keyboard: the heading is announced, Tab reaches the world cards in order, Enter opens one and focus lands on its heading', f.said === 'Choose a world' && f.start === 'H1' && f.order.join() === 'enterprise,stadium' && s.hash === '#/world/stadium' && /^H1:Stadium/.test(s.focus), JSON.stringify({ f, focus: s.focus, hash: s.hash }));
  const tour = await p.locator('[data-testid=world-tour]').count(); await p.click('[data-testid=skip-tour]'); await settle(p, 100);
  await go(p, '#/world/university'); const tour2 = await p.locator('[data-testid=world-tour]').count();
  ok('W-23', 'a first visit gets a short tour; Skip tour dismisses it for the rest of the visit', tour === 1 && tour2 === 0);
  await go(p, '#/world/stadium');
  await p.click('[data-testid=what-can-i-do]'); await settle(p, 100); const what = await p.locator('[data-testid=what]').innerText();
  await p.click('[data-testid=all-features]'); await settle(p, 100); const all = await p.locator('[data-testid=all]').innerText();
  const exp = await p.$$eval('.w-acts button', (b) => b.map((x) => x.getAttribute('aria-expanded')).join());
  ok('W-24', '“What can I do here?” lists what the current role can open and what no role can do; “Show all features” lists every journey and who it is for; one panel at a time', /As Visitor you can/.test(what) && /Attend Game/.test(what) && !/Venue Engineering/.test(what) && /grants nothing/.test(what) && /Venue Engineering/.test(all) && /AV \/ IT Engineer/.test(all) && /no 3D scene/.test(all) && exp === 'false,true,false', exp);
  await p.click('[data-testid=advanced-open]'); await settle(p, 100);
  await p.click('[data-role-config="stadium.fan"] a'); await settle(p);
  const fan = await p.evaluate(() => ({ hash: location.hash, as: document.querySelector('[data-testid=world-as]').innerText, cards: [...document.querySelectorAll('[data-journey]')].map((a) => a.querySelector('.w-jcard__as')?.textContent || '') }));
  ok('W-25', 'choosing Fan in the advanced list views the world as the Fan (in the address), and restricted journeys say which role they open as', fan.hash === '#/world/stadium?as=stadium.fan' && /Viewing as Fan/.test(fan.as) && fan.cards.join('|') === '||Opens as Event Producer / Show Caller|Opens as AV / IT Engineer|Opens as Venue Operations Lead', JSON.stringify(fan));
  await p.click('[data-journey=attend-game]'); await p.waitForSelector('[data-testid=seat]'); const h1 = await p.evaluate(() => location.hash);
  await p.goBack(); await settle(p); const b1 = await p.evaluate(() => location.hash); await p.goBack(); await settle(p); const b2 = await p.evaluate(() => location.hash); await p.goBack(); await settle(p); const b3 = await p.evaluate(() => location.hash);
  await p.goForward(); await settle(p); const f1 = await p.evaluate(() => location.hash);
  ok('W-26', 'browser back retraces journey → world as Fan → world → …, and forward returns', h1 === '#/world/stadium/attend-game?as=stadium.fan' && b1 === '#/world/stadium?as=stadium.fan' && b2 === '#/world/stadium' && b3 === '#/world/university' && f1 === '#/world/stadium' && await p.locator('[data-testid=world]').count() === 1, [h1, b1, b2, b3, f1].join(' '));
  // Enterprise advanced: the 13 by purpose, mapped onto the fifteen View-as roles, which stay
  await go(p, '#/world/enterprise?panel=roles');
  const ent = await p.evaluate(() => ({ n: document.querySelectorAll('[data-role-config]').length, mapped: document.querySelectorAll('[data-role-config] button[data-role-key]').length, spec: document.querySelectorAll('[data-role-config] .w-role--spec').length, now: document.querySelector('[data-role-config] [aria-pressed=true]')?.innerText || '' }));
  await p.click('[data-role-config="enterprise.executive"] button'); await settle(p, 500);
  const sw = await p.evaluate(() => ({ role: document.documentElement.dataset.role, hash: location.hash, said: document.getElementById('route-announcer').textContent }));
  await p.click('[data-testid=world-viewas]'); await p.waitForSelector('[data-testid=viewas-sheet]'); const fifteen = await p.locator('[data-testid=viewas-sheet] [data-role-key]').count(); await p.keyboard.press('Escape');
  ok('W-27', 'Enterprise: 13 configurations by purpose; nine lead to a View-as role (eight exact, one nearest), four are specified only; choosing one is a View-as switch, announced; the sixteen View-as roles remain (the fifteen, and the Site Champion added on 11 Nov 2026)', ent.n === 13 && ent.mapped === 9 && ent.spec === 4 && /Product Architect/.test(ent.now) && sw.role === 'exec' && /^#\/world\/enterprise/.test(sw.hash) && /Now viewing as Executive/.test(sw.said) && fifteen === 16, JSON.stringify({ ent, sw, fifteen }));
  ok('W-28', 'no console error, nothing off the page', !t.errs.length && !t.off.length, t.errs.join(' | ')); await t.close(); }

// ---------------------------------------------------------------- 5. the screens work, and scoped state is reset on a switch
{ const t = await open('#/world/stadium/attend-game?as=stadium.fan', { role: 'visitor' }); const p = t.page;
  const a = await p.locator('[data-testid=way]').innerText(); await p.check('[data-testid=step-free]'); await settle(p, 100); const b = await p.locator('[data-testid=way]').innerText();
  const route = await p.locator('[data-testid=plan-route]').getAttribute('points');
  await p.selectOption('[data-testid=ticket]', 't-121'); await settle(p, 100); const c = await p.locator('[data-testid=way]').innerText();
  ok('S-01', 'Attend Game: a seat, the gate and the way in on a 2D plan; the step-free route goes by the lift; the wheelchair platform has no stairs', /Gate C/.test(a) && /Stair S4/.test(a) && /lift/i.test(b) && !/Stair/.test(b) && route.split(' ').length === 3 && /Gate D/.test(c) && /platform space 3/.test(c) && await p.locator('[data-testid=step-free]').isDisabled(), [a, b, c].join(' / ').replace(/\n/g, ' ').slice(0, 260));
  await go(p, '#/world/stadium/attend-game?as=stadium.away_fan');
  const away = await p.evaluate(() => ({ note: document.querySelector('main .ui-notice')?.innerText || '', ticket: document.querySelector('[data-testid=ticket]').value }));
  ok('S-02', 'Away Fan is an opt-in preference, said so, and the seat resets with the role (not carried from the Fan)', /opt-in preference/.test(away.note) && /never inferred/.test(away.note) && away.ticket === 't-132', JSON.stringify(away));
  await go(p, '#/world/stadium/find-amenities?as=stadium.fan');
  await p.click('.w-pick__b:has-text("Food")'); await settle(p, 100); const n = await p.locator('[data-amenity]').count(); await p.click('[data-amenity=food-s]'); await settle(p, 100); const d = await p.locator('[data-testid=amenity-detail]').innerText();
  ok('S-03', 'Find Amenities: filter by kind, nearest first, each status with how fresh it is, an unknown status claimed as unknown, prices and allergens with their source', n === 3 && /South Counter/.test(d) && /Unknown/.test(d) && /none is claimed/.test(d) && /Declared allergens/.test(d) && /DECLARED/.test(d), d.replace(/\n/g, ' ').slice(0, 200));
  await go(p, '#/world/stadium/venue-operations?as=stadium.venue_ops_lead'); await p.waitForSelector('[data-testid=workboard]');
  const gated = await p.locator('[data-work=WO-2207] button').isDisabled(); const why = await p.locator('[data-work=WO-2207] .w-work__gate').innerText();
  await p.click('.w-pick__b:has-text("Event ended")'); await settle(p, 100); await p.click('[data-work=WO-2207] button'); await p.click('[data-work=WO-2207] button'); await settle(p, 100);
  const trail = await p.locator('[data-testid=work-trail]').innerText(); const step = await p.locator('[data-work=WO-2207]').getAttribute('data-step');
  ok('S-04', 'Venue Operations: disruptive work is gated while the event is in progress, then moves step by step; verification is by a second person; every move is on the trail', gated && /waits until the event ends/.test(why) && step === 'Verified' && /Work done → Verified by a second person/.test(trail) && /Assigned → Work done by Venue Operations Lead/.test(trail), trail.replace(/\n/g, ' | '));
  await go(p, '#/world/stadium/broadcast-production?as=stadium.event_producer'); await p.waitForSelector('[data-testid=acoustics]');
  const ac = await p.locator('[data-testid=acoustics]').innerText();
  ok('S-05', 'Broadcast & Production: run of show; crowd acoustics as LAeq and LAFmax, modelled, with the coverage gap stated; overlay export unavailable with its reason', /LAeq,1 min 95 dB · LAFmax 108 dB/.test(ac) && /MODELED/.test(ac) && /No value/.test(ac) && /UNKNOWN/.test(ac) && await p.locator('button:has-text("Export acoustic overlay")').isDisabled() && await p.locator('[data-testid=run-of-show] li').count() === 5, ac.replace(/\n/g, ' ').slice(0, 200));
  ok('S-06', 'no console error, nothing off the page', !t.errs.length && !t.off.length, t.errs.join(' | ')); await t.close(); }

{ const t = await open('#/world/university/discover-campus', { role: 'visitor' }); const p = t.page;
  const a = await p.locator('[data-testid=way-sum]').innerText(); await p.selectOption('[data-testid=to]', 'ART'); await p.click('.w-pick__b:has-text("Shuttle")'); await p.check('[data-testid=step-free]'); await settle(p, 150);
  const b = await p.locator('[data-testid=way]').innerText(); const pts = (await p.locator('[data-testid=plan-route]').getAttribute('points')).split(' ').length;
  await p.selectOption('[data-testid=to]', 'WEL'); await settle(p, 100); const none = await p.locator('[data-testid=way-none]').count();
  ok('S-07', 'Discover Campus: a 2D map with a route between two chosen places; walking, cycling and shuttle; a step-free variant; the same place twice is explained', /about \d+ min/.test(a) && /MODELED/.test(a) && /North Loop stop|Union stop/.test(b) && /level entrance/.test(b) && pts === 4 && none === 1, `${a} / ${b}`.replace(/\n/g, ' ').slice(0, 240));
  await go(p, '#/world/university/study-play'); await p.waitForSelector('[data-testid=quest]');
  await p.click('.w-pick__b:has-text("100 Ω")'); await settle(p, 80); const wrong = await p.locator('[data-testid=quest-feedback]').innerText(); const noNext = await p.locator('[data-testid=quest-next]').count();
  await p.click('.w-pick__b:has-text("390 Ω")'); await settle(p, 80); const right = await p.locator('[data-testid=quest-feedback]').innerText(); const score = await p.locator('[data-testid=quest-score]').innerText();
  await p.click('[data-testid=quest-next]'); await p.click('.w-pick__b:has-text("20 mA")'); await p.click('[data-testid=quest-next]'); await p.click('.w-pick__b:has-text("10 mA")'); await p.click('[data-testid=quest-next]'); await settle(p, 100);
  const end = await p.locator('[data-testid=quest-done]').innerText();
  ok('S-08', 'Study & Play: a playable circuit quest with scoring and feedback that explains each answer; a badge that costs and pays nothing', /Not quite/.test(wrong) && /70 mA/.test(wrong) && noNext === 0 && /Correct/.test(right) && /Score: 5\./.test(score) && /25 of 30 points/.test(end) && /Badge earned: Circuit Starter/.test(end) && /counts toward no grade/.test(end), `${wrong} / ${score} / ${end}`.replace(/\n/g, ' ').slice(0, 240));
  // scoped reset: the quest's progress does not survive a role switch or a world switch
  await go(p, '#/world/university/study-play?as=university.student'); await p.waitForSelector('[data-testid=quest]'); const afterRole = await p.locator('[data-testid=quest-score]').innerText(); const done1 = await p.locator('[data-testid=quest-done]').count();
  ok('S-09', 'scoped state resets on a role switch: the Student starts the quest from nothing', /Score: 0\./.test(afterRole) && done1 === 0, afterRole);
  await go(p, '#/world/university/student-life?as=university.student'); await p.waitForSelector('[data-testid=today]');
  const today = await p.locator('[data-testid=today]').innerText(); await p.uncheck('[data-testid=reminders-on]'); await settle(p, 80);
  ok('S-10', 'Student Life: a sample day with a way to each class, reminders the student can switch off, dining and shuttles with their source', /09:00/.test(today) && await p.locator('[data-testid=today] a.w-link').count() === 3 && await p.locator('[data-testid=reminders-off]').count() === 1 && /Declared allergens/.test(await p.locator('main').innerText()) && /No transit feed is connected/.test(await p.locator('main').innerText()));
  await p.click('[data-testid=today] a.w-link >> nth=2'); await p.waitForSelector('[data-testid=wayfinding]'); const to = await p.locator('[data-testid=to]').inputValue();
  ok('S-11', '“Get there” opens the map with the class’s building as the destination, still as the Student', to === 'ART' && /as=university\.student/.test(await p.evaluate(() => location.hash)), to);
  await go(p, '#/world/university/campus-technology?as=university.av_it_engineer'); await p.waitForSelector('[data-testid=estate]');
  await p.click('.w-pick__b:has-text("Action needed")'); await settle(p, 100); const rooms = await p.locator('[data-room]').count(); const chain = await p.locator('[data-testid=room-chain]').innerText();
  await p.click('[data-work=CT-481] button'); await settle(p, 80); const moved = await p.locator('[data-work=CT-481]').getAttribute('data-step');
  await p.click('.w-pick__b:has-text("No data")'); await settle(p, 100); const nodata = await p.locator('[data-testid=room-chain]').innerText();
  ok('S-12', 'Campus Technology: the classroom estate filtered by state, a room’s signal chain with passports, a service ticket that moves, and “no data” claimed as unknown', rooms === 1 && /ENG-115/.test(chain) && /Degraded/.test(chain) && moved === 'Assigned' && /ART-010/.test(nodata) && /UNKNOWN/.test(nodata), chain.replace(/\n/g, ' ').slice(0, 160));
  await go(p, '#/world/university/teaching-research?as=university.faculty'); await p.waitForSelector('[data-testid=readiness]');
  await p.check('[data-testid=record]'); await p.click('[data-testid=labs] button >> nth=0'); await settle(p, 100); const tr = await p.locator('main').innerText();
  ok('S-13', 'Teaching & Research: room readiness with evidence states, recording off by default and consent-gated, a lab request held locally', /Hearing loop/.test(tr) && /UNKNOWN/.test(tr) && /consent notice/.test(tr) && /1 request held in this page only/.test(tr) && await p.locator('[data-testid=lab-asked]').count() === 1);
  ok('S-14', 'no console error, nothing off the page', !t.errs.length && !t.off.length, t.errs.join(' | ')); await t.close(); }

{ const t = await open('#/world/convention/attend-expo?as=convention.convention_attendee', { role: 'visitor' }); const p = t.page;
  await p.fill('[data-testid=expo-find]', 'audio'); await settle(p, 120); const n = await p.locator('[data-exhibitor]').count();
  await p.click('[data-exhibitor=e6]'); await p.click('[data-testid=meeting-ask]'); await p.click('[data-testid=sessions] button >> nth=1'); await p.click('[data-testid=sessions] button >> nth=2'); await settle(p, 120);
  const ag = await p.locator('[data-testid=agenda]').innerText(); const held = await p.locator('[data-testid=meeting-held]').count();
  await p.fill('[data-testid=expo-find]', 'zzzz'); await settle(p, 100); const empty = await p.locator('[data-testid=expo-empty]').count();
  ok('S-15', 'Attend Expo: a hall map, exhibitor search with a zero-result state, a consent-based meeting request held locally, and an agenda that warns of a clash', n === 3 && held === 1 && /same time/.test(ag) && /11:00/.test(ag) && empty === 1 && await p.locator('[data-testid=plan]').count() === 1, ag.replace(/\n/g, ' '));
  // scoped reset: the search query, the selection and the agenda do not survive a role switch, a world switch or a View-as switch
  await p.fill('[data-testid=expo-find]', 'audio'); await go(p, '#/world/convention/attend-expo?as=convention.convention_exhibitor');
  const r1 = await p.evaluate(() => ({ q: document.querySelector('[data-testid=expo-find]').value, agenda: document.querySelector('[data-testid=agenda]').innerText, held: document.querySelectorAll('[data-testid=meeting-held]').length, on: document.querySelector('[data-exhibitor][aria-pressed=true]').dataset.exhibitor }));
  await p.fill('[data-testid=expo-find]', 'net'); await go(p, '#/world/stadium'); await go(p, '#/world/convention/attend-expo?as=convention.convention_exhibitor'); const r2 = await p.inputValue('[data-testid=expo-find]');
  await p.fill('[data-testid=expo-find]', 'led'); await p.selectOption('.persp select', 'exec'); await settle(p, 500); const r3 = await p.inputValue('[data-testid=expo-find]');
  ok('S-16', 'scoped state resets before the new context renders: the search query, the selection, the agenda and the meeting request are gone after a role switch, a world switch and a View-as switch', r1.q === '' && /Nothing yet/.test(r1.agenda) && r1.held === 0 && r1.on === 'e1' && r2 === '' && r3 === '', JSON.stringify({ r1, r2, r3 }));
  // the shell's own search and menu do not carry a query or an open drawer into another world
  await go(p, '#/world/convention'); const box = p.locator('[data-testid=quickfind] input'); await box.fill('boardroom'); await settle(p, 200); await p.click('[data-testid=crumbs] a >> nth=1'); await settle(p);
  const q = await box.inputValue(); const drawer = await p.locator('[data-testid=menu]').count();
  ok('S-17', 'the shell’s search query and drawers are not carried into the next world', q === '' && drawer === 0 && await p.evaluate(() => location.hash) === '#/worlds', q);
  await t.close(); }

{ const t = await open('#/world/convention/keynote-polls?as=convention.convention_attendee', { role: 'visitor' }); const p = t.page;
  const before = await p.locator('.w-poll__r').count(); const desk0 = await p.locator('[data-testid=moderation]').count();
  await p.click('[data-option="2"]'); await settle(p, 100); const poll = await p.locator('[data-testid=poll]').innerText(); const locked = await p.locator('[data-option="0"]').isDisabled();
  await p.fill('[data-testid=question-input]', 'Can a room report its own faults?'); await p.click('[data-testid=question-send]'); await settle(p, 100);
  const mine = await p.locator('[data-testid=questions-mine]').innerText(); const shown = await p.locator('[data-testid=questions-shown] li').count();
  ok('P-01', 'Keynote & Polls as an attendee: results appear only after voting, one vote is counted (not attributed) and locked, a question waits for the moderator, and there is no moderation desk', before === 0 && desk0 === 0 && /34 votes/.test(poll) && /121 votes in all/.test(poll) && /counted, not attributed/.test(poll) && locked && /Waiting for the moderator/.test(mine) && shown === 1, `${poll} / ${mine}`.replace(/\n/g, ' ').slice(0, 260));
  await go(p, '#/world/convention/keynote-polls?as=convention.convention_speaker'); await p.waitForSelector('[data-testid=moderation]');
  const m0 = await p.evaluate(() => ({ pending: document.querySelectorAll('[data-pending]').length, mine: document.querySelectorAll('[data-testid=questions-mine] li').length, voted: document.querySelectorAll('.w-poll__o[aria-pressed=true]').length, results: document.querySelectorAll('.w-poll__r').length }));
  await p.click('[data-pending=q2] button >> nth=0'); await p.click('[data-pending=q3] button >> nth=1'); await p.click('[data-testid=poll-toggle]'); await settle(p, 120);
  const m1 = await p.evaluate(() => ({ shown: [...document.querySelectorAll('[data-testid=questions-shown] li')].map((l) => l.textContent), pending: document.querySelectorAll('[data-pending]').length, closed: document.querySelector('[data-option="0"]').disabled, sub: document.querySelector('[data-testid=poll]').innerText }));
  ok('P-02', 'as the Speaker: the moderation desk is presented, the attendee’s vote and question were not carried over, a question is shown only when accepted, and the poll can be closed', m0.pending === 2 && m0.mine === 0 && m0.voted === 0 && m0.results === 4 && m1.shown.length === 2 && m1.pending === 0 && m1.closed && /closed/.test(m1.sub) && !/Buy my product/.test(m1.shown.join()), JSON.stringify({ m0, shown: m1.shown.length }));
  await go(p, '#/world/convention/exhibitor-experience?as=convention.convention_exhibitor'); await p.waitForSelector('[data-testid=leads]');
  await p.click('[data-lead=L-02] button'); await settle(p, 100); const leads = await p.locator('[data-lead]').count(); const said = await p.locator('[data-testid=leads] .w-said').innerText();
  await p.click('[data-testid=meetings] button >> nth=0'); await settle(p, 80);
  ok('P-03', 'Exhibitor Experience: its own booth only, opt-in leads with their scope, a lead can be deleted, a meeting accepted', leads === 2 && /L-02 deleted/.test(said) && /this booth only/.test(await p.locator('main').innerText()) && /Accepted/.test(await p.locator('[data-testid=meetings]').innerText()));
  await go(p, '#/world/convention/production-broadcast?as=convention.convention_show_producer'); await p.waitForSelector('[data-testid=chain]'); const prod = await p.locator('main').innerText();
  await go(p, '#/world/convention/venue-operations?as=convention.convention_msp_delegated'); await p.waitForSelector('[data-testid=workboard]'); const ops = await p.locator('main').innerText();
  ok('P-04', 'Production & Broadcast: the keynote run of show and the stage-to-stream chain, read-only; Venue Operations: hall readiness, service requests and the delegated engineer’s time-limited label', /Run of show/.test(prod) && /Stage LED wall/.test(prod) && /No cue can be fired/.test(prod) && /Hall readiness/.test(ops) && /time-limited delegation/.test(ops) && /VO-311/.test(ops));
  ok('P-05', 'no console error, nothing off the page', !t.errs.length && !t.off.length, t.errs.join(' | ')); await t.close(); }

{ // reduced motion, and a deep link opened cold
  const t = await open('#/world/university/campus-technology?as=university.facilities_engineer', { role: 'employee', w: 390, h: 844, reduced: true }); const p = t.page;
  await p.waitForSelector('[data-testid=estate]', { timeout: 5000 }).catch(() => undefined);
  const s = await p.evaluate(() => ({ as: document.querySelector('[data-testid=world-as]')?.innerText || '', moving: [...document.querySelectorAll('main *')].filter((e) => { const c = getComputedStyle(e); return (parseFloat(c.transitionDuration) || 0) > 0 || c.animationName !== 'none'; }).length, role: document.documentElement.dataset.role }));
  ok('R-01', 'a deep link with a role configuration opens cold, for any View-as role, and with reduced motion nothing on the screen animates', /Viewing as Facilities Engineer \/ Operations/.test(s.as) && s.moving === 0 && s.role === 'employee' && !t.errs.length, JSON.stringify(s)); await t.close(); }

await done();
