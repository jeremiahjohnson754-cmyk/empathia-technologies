#!/usr/bin/env node
// The investor start's welcome (founder, 19 Nov 2026 09:09: "a warm welcome to Empathia: what would you like to see first? Who or what
// can I find for you through Search Party? ... I love campus being in there too ... with product architect role selected opening if a
// investor just opened the demo normally or through the main open the demo button"):
// the question and the campus on one screen; Search Party asked in words; six first choices, each opening its screen as a role that may
// see it; the website's main "Open the demo" (li=start) opens here as the Product Architect whatever role was last used; phone and
// desktop, no sideways scroll, no console error, no request leaving the page; the three other worlds in 3D one tap away (09:09 G).
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-welcome');
const settle = (p, ms = 500) => p.waitForTimeout(ms);

// 1. the welcome, the campus, the Search Party question
{ const t = await open('#/investor'); const p = t.page; await settle(p, 800);
  const w = await p.evaluate(() => ({ h1: document.querySelector('main h1')?.textContent, tag: document.querySelector('.lnd__tag')?.textContent, campus: !!document.querySelector('.lnd__art .iso3d, .lnd__art svg, .lnd__art canvas'), label: document.querySelector('label[for=lnd-ask]')?.textContent, picks: [...document.querySelectorAll('[data-testid=welcome-first] [data-first]')].map((a) => a.dataset.first) }));
  ok('WEL-01', 'the investor start asks "Welcome to Empathia. What would you like to see first?", keeps the campus in 3D beside it, and asks "Who or what can I find for you?"', w.h1 === 'Welcome to Empathia. What would you like to see first?' && /Every room has a story/.test(w.tag || '') && w.campus && /Who or what can I find for you\?/.test(w.label || '') && w.picks.length === 6, JSON.stringify(w));
  await p.fill('#lnd-ask', 'Atlas 4.218'); await p.keyboard.press('Enter'); await settle(p, 1200);
  const s = await p.evaluate(() => ({ hash: location.hash, h1: document.querySelector('main h1')?.textContent, hits: document.querySelectorAll('main [data-testid*=result], main .sp-hit, main li a').length }));
  ok('WEL-02', 'asking in words opens Search Party with the question (#/search?q=Atlas%204.218) and an answer on the page', s.hash === '#/search?q=Atlas%204.218' && /Search Party/.test(s.h1 || '') && s.hits > 0, JSON.stringify(s));
  await p.evaluate(() => { location.hash = '#/investor'; }); await settle(p, 700); await p.click('.lnd__try >> nth=1'); await settle(p, 900);
  ok('WEL-03', 'a suggestion ("a ceiling microphone") asks Search Party for it in one tap', await p.evaluate(() => location.hash) === '#/search?q=ceiling%20microphone');
  // every first choice lands on a page with its own heading, as the Product Architect
  const land = [];
  for (const href of w.picks) { await p.evaluate(() => { location.hash = '#/investor'; }); await settle(p, 600); await p.click(`[data-first="${href}"]`); await settle(p, 1500);
    land.push({ href, at: await p.evaluate(() => location.hash), h1: await p.evaluate(() => document.querySelector('main h1')?.textContent || '') }); }
  ok('WEL-04', 'each of the six first choices opens its screen (Lite campus, Atlas 4.218 in Lite, Pro’s failure map, the room’s commissioning, SIGNAL, Core Replay) with a heading', land.every((l) => l.at.startsWith(l.href) && l.h1.length > 2 && !/not (allowed|available)|no access/i.test(l.h1)), JSON.stringify(land));
  ok('WEL-05', 'no console error and no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | '));
  await t.close(); }

// 2. as a role that cannot open a choice: it is a button that switches to a role that can, then opens it
{ const t = await open('#/investor', { role: 'visitor' }); const p = t.page; await settle(p, 800);
  const kind = await p.evaluate(() => document.querySelector('[data-first="#/pro/issues"]')?.tagName);
  await p.click('[data-first="#/pro/issues"]'); await settle(p, 1500);
  const r = await p.evaluate(() => ({ at: location.hash, h1: document.querySelector('main h1')?.textContent, as: localStorage.getItem('empathia.demo.perspective') }));
  ok('WEL-06', 'viewed as a Visitor, "Where the estate hurts" switches to a role that may see Pro and opens the failure map (never a refusal page)', kind === 'BUTTON' && r.at === '#/pro/issues' && r.as === 'exec' && /Issue Intelligence/.test(r.h1 || ''), JSON.stringify({ kind, ...r }));
  await t.close(); }

// 3. the website's main "Open the demo": as the Product Architect, whatever role this browser last used
{ const t = await open('#/investor?from=site&li=start&back=%2F', { role: 'service' }); const p = t.page; await settle(p, 1200);
  const r = await p.evaluate(() => ({ h1: document.querySelector('main h1')?.textContent, as: localStorage.getItem('empathia.demo.perspective'), strip: document.body.innerText.includes('Product Architect') }));
  ok('WEL-07', 'opened from the website’s "Open the demo" (li=start), the welcome is shown as the Product Architect even after this browser last viewed as a Service Engineer', /^Welcome to Empathia/.test(r.h1 || '') && r.as === 'architect' && r.strip, JSON.stringify(r));
  await t.close(); }

// 4. phone
{ const t = await open('#/investor', { w: 390, h: 844 }); const p = t.page; await settle(p, 800);
  const m = await p.evaluate(() => { const picks = [...document.querySelectorAll('.lnd__pick')].map((e) => e.getBoundingClientRect()); return { over: document.documentElement.scrollWidth - innerWidth, oneCol: new Set(picks.map((r) => Math.round(r.left))).size === 1, tall: picks.every((r) => r.height >= 44), input: Math.round(document.getElementById('lnd-ask').getBoundingClientRect().height) }; });
  ok('WEL-08', 'on a phone (390 px): no sideways scroll, the choices stack in one column at 44 px or more, the question field is 48 px tall', m.over <= 0 && m.oneCol && m.tall && m.input >= 44, JSON.stringify(m));
  const w = await p.evaluate(() => { const l = document.querySelector('.lnd__w3list'); return { rail: l ? getComputedStyle(l).overflowX : '', over: document.documentElement.scrollWidth - innerWidth }; });
  ok('WEL-09', 'on a phone the three worlds are a sideways rail and the page still never scrolls sideways', w.rail === 'auto' && w.over <= 0, JSON.stringify(w));
  await t.close(); }

// 5. the three other worlds in 3D, one tap from the welcome (founder 09:09 G)
{ const t = await open('#/investor', { role: 'visitor' }); const p = t.page; await settle(p, 800);
  await p.evaluate(() => document.querySelector('[data-testid=welcome-worlds]')?.scrollIntoView()); await settle(p, 900);
  const w = await p.evaluate(() => [...document.querySelectorAll('[data-testid=welcome-worlds] a[data-world]')].map((a) => { const i = a.querySelector('img'); return { world: a.dataset.world, href: a.getAttribute('href'), img: !!i && i.complete && i.naturalWidth > 0, alt: i?.alt || '' }; }));
  const hrefs = w.map((x) => x.href).join(' ');
  await p.click('[data-world=stadium]'); await settle(p, 2500);
  const at = await p.evaluate(() => ({ hash: location.hash, h1: document.querySelector('main h1, h1')?.textContent || '' }));
  ok('WEL-10', 'the welcome shows the three other worlds with their frames (Stadium LIVE, Campus Life, Expo LIVE), each one tap from 3D, for any role', w.length === 3 && hrefs === '#/play/stadium #/play/campus #/play/expo' && w.every((x) => x.img && x.alt.length > 10) && at.hash === '#/play/stadium' && at.h1.length > 2, JSON.stringify({ w, at }));
  ok('WEL-11', 'no console error and no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | '));
  await t.close(); }
await done();
