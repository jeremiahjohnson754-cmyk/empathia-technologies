#!/usr/bin/env node
// Expo LIVE, the first slice (task #181; founder, 17 Nov 2026 10:20: "Success is not a beautiful hall with buttons"). Each control is
// pressed and its effect checked: the drawn hall changes (its pixels compared, the page in reduced motion so it is still between
// presses), the booth card, the agenda, details left only with consent, a session's poll answered once, a question waiting for the
// moderator, the organiser's modeled footfall, and what is kept in this browser across a reload.
//   node tests/browser/demo-expo-live.test.mjs
import crypto from 'node:crypto';
import { harness } from './demo-shell-lib.mjs';
import { recordFrameRates, glRenderer } from '../lib/frame-rates.mjs';
// 25 Nov 2026: the figures the frame-rate checks measure are also written beside the run's evidence (tests/lib/frame-rates.mjs), so the
// record of a regression says what was measured and not only PASS. Nothing here changes a check that existed; XPO-14 and XPO-15 are new.
const FR = [];
const costOf = (q, id) => q.evaluate((t) => { const c = document.querySelector(`[data-testid=${t}]`); return { triangles: Number(c?.dataset.tris), draws: Number(c?.dataset.draws) }; }, id);   // what the renderer says its last frame drew (gl.ts, Renderer.stats)
const { open, ok, done } = await harness('demo-expo-live');
const init = () => { try { if (!sessionStorage.getItem('xpo-fresh')) { localStorage.removeItem('empathia.expolive.v1'); sessionStorage.setItem('xpo-fresh', '1'); } } catch { /* none */ } };
// 24 Nov 2026: the scene now lowers its drawing detail on a machine that cannot hold the pace (play/gl.ts, DetailGovernor), which changes
// the canvas's pixels by itself. A pixel comparison is a fair judge of a control only while the detail is fixed, so this page is opened
// with the documented switch `?detail=full`, as it was drawn before the governor existed. Every check below is as strict as it was. The
// governor itself is checked in XPO-13 (this scene left to adapt), CL-21 and CL-22 (campus) and tests/unit/render-detail.test.mjs.
const t = await open('#/play/expo?detail=full', { role: 'architect', sw: false, w: 1440, h: 900, reduced: true, init }); const p = t.page; p.setDefaultTimeout(20000);
await p.waitForSelector('[data-testid=expo-live][data-ready=true]'); await p.waitForTimeout(2500);
const attr = (k) => p.getByTestId('expo-live').getAttribute(`data-${k}`);
const shot = async () => { await p.waitForTimeout(700); return crypto.createHash('sha1').update(await p.evaluate(() => document.querySelector('[data-testid=xpo-canvas]').toDataURL('image/png'))).digest('hex'); };

const a0 = await shot(); const a1 = await shot();
const booths = await p.locator('[data-testid^=xpo-plan-]').count();
const cost0 = await costOf(p, 'xpo-canvas');   // the whole hall, as the page opens
ok('XPO-01', 'launch: the hall draws (WebGL2); the plan has the twenty exhibitors and the Empathia showcase; still between presses', (await attr('ready')) === 'true' && booths === 21 && a0 === a1 && !(await p.getByTestId('xpo-err').count()), `${booths} booths`);

await p.getByTestId('xpo-plan-E1').click(); const b1 = await shot(); const card = await p.getByTestId('xpo-card').innerText();
ok('XPO-02', 'choosing a booth on the plan flies the camera to it, outlines it, and opens its card: what the exhibitor does and what is on the stand', (await attr('sel')) === 'E1' && b1 !== a1 && /Empathia/.test(card) && /On the stand/.test(card) && /SCI-110/.test(card), card.slice(0, 80));

await p.locator('details.xpo-list summary').click(); await p.getByTestId('xpo-list-C3').click(); const b2 = await shot(); const card2 = await p.getByTestId('xpo-card').innerText();
ok('XPO-03', 'choosing from the list goes to that booth instead', (await attr('sel')) === 'C3' && b2 !== b1 && /Teasel Conferencing/.test(card2), card2.slice(0, 60));

await p.getByTestId('xpo-agenda').click(); const ag = await attr('agenda');
const leaveBefore = await p.getByTestId('xpo-leave').isDisabled(); await p.getByTestId('xpo-name').fill('Avery Synthetic'); const noConsent = await p.getByTestId('xpo-leave').isDisabled();
await p.getByTestId('xpo-consent').check(); await p.getByTestId('xpo-leave').click(); const left = await p.getByTestId('xpo-left').innerText();
ok('XPO-04', 'the agenda keeps the booth; details cannot be left without a name and the consent box; with both, they are kept in this browser and the page says nothing was sent', ag === '1' && leaveBefore && noConsent && (await attr('leads')) === '1' && /nothing was sent/.test(left), `${ag} · ${leaveBefore}/${noConsent} · ${left}`);

await p.getByTestId('xpo-organiser').check(); const b3 = await shot(); const foot = await p.getByTestId('xpo-foot').innerText(); const fault = await p.getByTestId('xpo-fault').innerText();
ok('XPO-05', 'the organiser view lays the modeled footfall over the hall (stated as modeled, not counted) and shows this stand’s simulated display fault with where it would go', b3 !== b2 && /MODELED, not counted/.test(foot) && /ServiceHands/.test(fault), foot.slice(0, 60));
const f0 = foot;

await p.getByTestId('xpo-join-s1').click(); const b4 = await shot(); const f1 = await p.getByTestId('xpo-foot').innerText();
await p.getByTestId('xpo-vote-s1-1').click(); const voted = await p.getByTestId('xpo-voted').innerText(); const once = await p.getByTestId('xpo-vote-s1-2').isDisabled();
await p.getByTestId('xpo-q').fill('How do you prove a room before handover? (synthetic)'); await p.getByTestId('xpo-ask').click(); const qd = await p.getByTestId('xpo-question').innerText();
ok('XPO-06', 'joining the keynote lights the session screens and changes the modeled footfall; its poll takes one answer; a question waits for the moderator', b4 !== b3 && f1 !== f0 && (await attr('session')) === 's1' && /Untested rooms/.test(voted) && once && /waiting for the moderator/.test(qd), `${f0.slice(0, 30)} → ${f1.slice(0, 30)}`);

await p.reload(); await p.waitForSelector('[data-testid=expo-live][data-ready=true]'); await p.waitForTimeout(1000);
await p.getByTestId('xpo-plan-C3').click(); const kept = await p.getByTestId('xpo-card').innerText(); await p.getByTestId('xpo-join-s1').click(); const keptVote = await p.getByTestId('xpo-voted').count();
ok('XPO-07', 'kept in this browser across a reload: the agenda, the details left, the vote', (await attr('agenda')) === '1' && (await attr('leads')) === '1' && /In your agenda/.test(kept) && keptVote === 1, kept.slice(0, 60));

await p.getByTestId('xpo-overview').click(); const b5 = await shot(); ok('XPO-08', '“Whole hall” returns the camera to the overview', (await attr('sel')) === '' && b5 !== (await (async () => { await p.getByTestId('xpo-plan-A1').click(); return shot(); })()), '');
const plan = p.getByTestId('xpo-plan-B2'); await plan.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
ok('XPO-09', 'the plan is keyboard-reachable: Enter on a booth chooses it', (await attr('sel')) === 'B2', await attr('sel'));
const fps = Number(await attr('fps'));
ok('XPO-10', `frame rate in this machine's headless software-rendered Chromium: ${fps} fps; floor ≥ 4 (not a device claim)`, fps >= 4, `${fps}`);
ok('XPO-11', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
const shapeOf = (q) => q.evaluate(() => { const c = document.querySelector('[data-testid=xpo-canvas]'); const r = document.querySelector('[data-testid=expo-live]'); return { cssW: c.clientWidth, cssH: c.clientHeight, w: c.width, dpr: Math.min(devicePixelRatio || 1, 2), detail: Number(r.getAttribute('data-detail')), fps: Number(r.getAttribute('data-fps')), wide: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
const pinned = await shapeOf(p); FR.push({ check: 'XPO-10', mode: 'full', what: 'desktop 1440 × 900, held at full detail, reduced motion, after every control was pressed', fps, detail: pinned.detail, floor: 4, ...(await costOf(p, 'xpo-canvas')) });
// XPO-15 (25 Nov 2026): what a frame costs, counted and not timed, so the same on every machine: a budget beside the frame-rate floor.
ok('XPO-15', `the cost of a frame, counted: the whole hall sends ${cost0.triangles} triangles in ${cost0.draws} draw calls (budget 8,000 and 150)`, cost0.triangles > 2000 && cost0.triangles <= 8000 && cost0.draws > 20 && cost0.draws <= 150, JSON.stringify(cost0));
const GL = await glRenderer(p);
await t.close();
{ // XPO-13: the same scene left to adapt, as a visitor opens it. Waits until the level has held for three seconds (it is decided in the first few).
  const a = await open('#/play/expo', { role: 'architect', sw: false, w: 1440, h: 900, init }); const q = a.page; await q.waitForSelector('[data-testid=expo-live][data-ready=true]');
  let held = 0, lastD = -1; for (let i = 0; i < 18 && held < 3; i += 1) { await q.waitForTimeout(1100); const d = Number(await q.getByTestId('expo-live').getAttribute('data-detail')); held = d === lastD ? held + 1 : 0; lastD = d; }
  const auto = await shapeOf(q); const slow = pinned.fps < 24; FR.push({ check: 'XPO-13', mode: 'adapted', what: 'desktop 1440 × 900, left to adapt, once the level had held three seconds', fps: auto.fps, detail: auto.detail, ...(await costOf(q, 'xpo-canvas')) });
  ok('XPO-13', `adaptive detail on this machine: ${pinned.fps} fps held at full detail, ${auto.fps} fps left to adapt at ${auto.detail}% detail. ${slow ? 'Full detail cannot hold 24 here, so the hall must draw fewer pixels, not fewer than half, and not be slower for it' : 'Full detail holds 24 here, so the hall must stay at full detail'}; the canvas keeps its size on the page`,
    held >= 3 && pinned.detail === 100 && Math.abs(pinned.w - Math.round(pinned.cssW * pinned.dpr)) <= 2 && auto.cssW === pinned.cssW && auto.cssH === pinned.cssH && Math.abs(auto.w - Math.round(auto.cssW * auto.dpr * auto.detail / 100)) <= 2 && auto.wide <= 1 && !a.errs.length
    && (slow ? auto.detail < 100 && auto.detail >= 50 && auto.fps >= pinned.fps : auto.detail === 100), JSON.stringify({ held, pinned, auto, e: a.errs[0] }));
  await a.close(); }
{ const ph = await open('#/play/expo', { role: 'architect', sw: false, w: 390, h: 844, reduced: true }); await ph.page.waitForSelector('[data-testid=expo-live][data-ready=true]'); await ph.page.waitForTimeout(1000);
  const over = await ph.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('XPO-12', 'a phone-sized screen: no sideways scroll; the plan and sessions sit under the hall', over <= 0, `overflow ${over}`); await ph.close(); }
{ let file = '', why = ''; try { file = recordFrameRates('expo', FR, { renderer: GL }); } catch (e) { why = String(e.message); }
  ok('XPO-14', 'the frame rates this run measured are written beside its evidence, each with the detail it was drawn at, as this machine’s figures and not a device’s', !!file && FR.length === 2, file ? `${FR.length} readings` : why); }
await done();
