#!/usr/bin/env node
// Moving the pictures without losing the page (founder, 20 Nov 2026 05:34: "the campus maps and maps everything in general are a little
// too sensitive especially for mobile users it's hard to scroll down to the page", and of Expo LIVE: "It doesn't take me there, Hard to
// move around"). One gesture model for the map and the three worlds (apps/demo/src/map/gestures.ts), checked with real input:
//   - a phone (a touch context; fingers sent through the browser's own touch input, CDP Input.dispatchTouchEvent): one finger over a
//     picture scrolls the page and the picture stays still, with a hint; two fingers pinch to zoom and move the picture; a tap opens
//     what is under it; Full screen makes one finger move the picture, and Done leaves;
//   - a computer (a mouse): the plain wheel scrolls the page, with a hint; Ctrl and the wheel zooms; a drag moves the picture and never
//     opens anything; a click that does not move opens what is under it (a booth in Expo LIVE: the camera goes to it).
// Whether the page scrolled is read from where the picture sits on screen, so it holds whichever element scrolls. Reduced motion, so the
// camera jumps instead of flying. Headless Chromium draws WebGL in software here: no frame-rate claim.
//   node tests/browser/demo-gestures.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { open, ok, done } = await harness('demo-gestures');

const fingers = (cdp) => {
  const send = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 1 })) });
  return {
    async swipe(p, x, y, dx, dy, steps = 10) { await send('touchStart', [[x, y]]); for (let i = 1; i <= steps; i++) { await send('touchMove', [[x + dx * i / steps, y + dy * i / steps]]); await p.waitForTimeout(16); } await send('touchEnd', []); await p.waitForTimeout(250); },
    /** two fingers from a and b, each moved by its own offset */
    async two(p, a, b, da, db, steps = 10) { await send('touchStart', [a, b]); for (let i = 1; i <= steps; i++) { await send('touchMove', [[a[0] + da[0] * i / steps, a[1] + da[1] * i / steps], [b[0] + db[0] * i / steps, b[1] + db[1] * i / steps]]); await p.waitForTimeout(16); } await send('touchEnd', []); await p.waitForTimeout(250); },
    async tap(p, x, y) { await send('touchStart', [[x, y]]); await p.waitForTimeout(40); await send('touchEnd', []); await p.waitForTimeout(350); },
  };
};
const top = async (p, id) => (await p.getByTestId(id).boundingBox()).y;
const centre = async (p, id) => { const b = await p.getByTestId(id).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2, b]; };
const attr = (p, id, k) => p.getByTestId(id).getAttribute(`data-${k}`);
const hint = async (p, id) => (await p.getByTestId(id).innerText().catch(() => '')).trim();
const vw = (p) => p.evaluate(() => [innerWidth, innerHeight]);

// ---- the campus map on a phone --------------------------------------------------------------------------------------------------------
{ const t = await open('#/campus', { role: 'architect', sw: false, w: 390, h: 844, reduced: true, touch: true }); const p = t.page; p.setDefaultTimeout(20000);
  await p.waitForSelector('[data-testid=emap][data-ready=true]'); await p.waitForTimeout(1200); const f = fingers(await t.ctx.newCDPSession(p));
  const cam = async () => [await attr(p, 'emap', 'dist'), await attr(p, 'emap', 'yaw'), await attr(p, 'emap', 'at'), await attr(p, 'emap', 'level')].join('|');
  let [x, y] = await centre(p, 'emap-canvas'); const c0 = await cam(), t0 = await top(p, 'emap');
  await f.swipe(p, x, y, 0, -220); const t1 = await top(p, 'emap'), c1 = await cam(), h1 = await hint(p, 'emap-hint');
  ok('GS-map-01', 'phone: one finger swiped up over the map scrolls the page; the map stays where it was and says how to move it (two fingers, or full screen)', t1 < t0 - 60 && c1 === c0 && /two fingers/i.test(h1), `top ${t0.toFixed(0)} → ${t1.toFixed(0)}; camera ${c0} → ${c1}; hint "${h1}"`);

  await p.evaluate(() => { document.scrollingElement.scrollTop = 0; document.querySelector('main')?.scrollTo?.(0, 0); }); await p.getByTestId('emap-canvas').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  [x, y] = await centre(p, 'emap-canvas'); const d0 = Number(await attr(p, 'emap', 'dist')), tp0 = await top(p, 'emap');
  await f.two(p, [x - 30, y], [x + 30, y], [-60, 0], [60, 0]); const d1 = Number(await attr(p, 'emap', 'dist')), tp1 = await top(p, 'emap');
  ok('GS-map-02', 'phone: two fingers pinched apart zoom the map in; the page does not move', d1 < d0 * 0.8 && Math.abs(tp1 - tp0) < 2, `distance ${d0} → ${d1}; top ${tp0.toFixed(0)} → ${tp1.toFixed(0)}`);
  const a0 = await attr(p, 'emap', 'at'); await f.two(p, [x - 40, y], [x + 40, y], [0, 70], [0, 70]); const a1 = await attr(p, 'emap', 'at'), tp2 = await top(p, 'emap');
  ok('GS-map-03', 'phone: two fingers moved together pan the map; the page does not move', a1 !== a0 && Math.abs(tp2 - tp1) < 2, `centre ${a0} → ${a1}`);

  const [px, py] = await centre(p, 'campus-b-ATL'); await f.tap(p, px, py);
  ok('GS-map-04', 'phone: a tap on a building opens it', (await attr(p, 'emap', 'level')) === 'building' && (await attr(p, 'emap', 'sel')) === 'ATL', `${await attr(p, 'emap', 'level')} ${await attr(p, 'emap', 'sel')}`);

  await p.getByTestId('emap-full').scrollIntoViewIfNeeded(); const [fx, fy] = await centre(p, 'emap-full'); await f.tap(p, fx, fy); await p.waitForTimeout(400);
  const [W, H] = await vw(p); const fb = await p.getByTestId('emap').boundingBox(); const isFull = await p.evaluate(() => document.querySelector('[data-testid=emap]').classList.contains('is-full') && document.documentElement.classList.contains('has-full'));
  [x, y] = await centre(p, 'emap-canvas'); const g0 = await cam(), ft0 = await top(p, 'emap'); await f.swipe(p, x, y, 90, 60); const g1 = await cam(), ft1 = await top(p, 'emap');
  ok('GS-map-05', 'phone: Full screen fills the window, and there one finger moves the map instead of the page', isFull && Math.abs(fb.x) < 1 && Math.abs(fb.y) < 1 && Math.abs(fb.width - W) < 2 && Math.abs(fb.height - H) < 2 && g1 !== g0 && Math.abs(ft1 - ft0) < 1,
    `full ${isFull} box ${fb.x.toFixed(0)},${fb.y.toFixed(0)} ${fb.width.toFixed(0)}×${fb.height.toFixed(0)} of ${W}×${H}; camera ${g0} → ${g1}`);
  const ctl = await p.evaluate(() => { const v = document.querySelector('.emap__view').getBoundingClientRect(); return [...document.querySelectorAll('.emap .emap__ctrl button, .emap .emap__layers button')].filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect()).filter((r) => r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.top < -1).length + (v.height < 300 ? 100 : 0); });
  ok('GS-map-06', 'phone: in full screen every control is inside the window and the picture takes the room left', ctl === 0, `${ctl} off-screen`);
  [x, y] = await centre(p, 'emap-full'); await f.tap(p, x, y); await p.waitForTimeout(300);
  const left = await p.evaluate(() => !document.querySelector('[data-testid=emap]').classList.contains('is-full') && !document.documentElement.classList.contains('has-full'));
  ok('GS-map-07', 'phone: Done leaves full screen and the page scrolls again', left && (await p.getByTestId('emap-full').innerText()).trim() !== 'Done', '');
  ok('GS-map-08', 'phone: no console error', !t.errs.length, t.errs.slice(0, 2).join(' | ')); await t.close(); }

// ---- the campus map with a mouse ------------------------------------------------------------------------------------------------------
{ const t = await open('#/campus', { role: 'architect', sw: false, w: 1280, h: 760, reduced: true }); const p = t.page; p.setDefaultTimeout(20000);
  await p.waitForSelector('[data-testid=emap][data-ready=true]'); await p.waitForTimeout(1200);
  let [x, y] = await centre(p, 'emap-canvas'); const d0 = await attr(p, 'emap', 'dist'), t0 = await top(p, 'emap');
  await p.mouse.move(x, y); await p.mouse.wheel(0, 300); await p.waitForTimeout(350); const d1 = await attr(p, 'emap', 'dist'), t1 = await top(p, 'emap'), h1 = await hint(p, 'emap-hint');
  ok('GS-map-09', 'mouse: the plain wheel over the map scrolls the page, not the map, and the map says Ctrl and the wheel zooms', d1 === d0 && t1 < t0 - 40 && /Ctrl/.test(h1), `distance ${d0} → ${d1}; top ${t0.toFixed(0)} → ${t1.toFixed(0)}; hint "${h1}"`);
  [x, y] = await centre(p, 'emap-canvas'); await p.mouse.move(x, y); const tz0 = await top(p, 'emap'); await p.keyboard.down('Control'); await p.mouse.wheel(0, -300); await p.keyboard.up('Control'); await p.waitForTimeout(350);
  const d2 = Number(await attr(p, 'emap', 'dist')), tz1 = await top(p, 'emap');
  ok('GS-map-10', 'mouse: Ctrl with the wheel zooms the map and the page stays put', d2 < Number(d1) * 0.9 && Math.abs(tz1 - tz0) < 2, `distance ${d1} → ${d2}`);
  const a0 = await attr(p, 'emap', 'at'), l0 = await attr(p, 'emap', 'level'); await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 140, y + 60, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
  ok('GS-map-11', 'mouse: a drag pans the map and opens nothing', (await attr(p, 'emap', 'at')) !== a0 && (await attr(p, 'emap', 'level')) === l0, `${a0} → ${await attr(p, 'emap', 'at')}`);
  const y0 = await attr(p, 'emap', 'yaw'); await p.mouse.move(x, y); await p.mouse.down({ button: 'right' }); await p.mouse.move(x + 160, y, { steps: 8 }); await p.mouse.up({ button: 'right' }); await p.waitForTimeout(300);
  ok('GS-map-12', 'mouse: a right-drag turns the map', (await attr(p, 'emap', 'yaw')) !== y0, `${y0} → ${await attr(p, 'emap', 'yaw')}`);
  await p.getByTestId('emap-full').click(); await p.waitForTimeout(300); const [W, H] = await vw(p); const fb = await p.getByTestId('emap').boundingBox();
  const dw0 = Number(await attr(p, 'emap', 'dist')); [x, y] = await centre(p, 'emap-canvas'); await p.mouse.move(x, y); await p.mouse.wheel(0, -300); await p.waitForTimeout(300); const dw1 = Number(await attr(p, 'emap', 'dist'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(250); const out = await p.evaluate(() => !document.querySelector('[data-testid=emap]').classList.contains('is-full'));
  ok('GS-map-13', 'mouse: in full screen the map fills the window and the plain wheel zooms; Escape leaves', Math.abs(fb.width - W) < 2 && Math.abs(fb.height - H) < 2 && dw1 < dw0 * 0.9 && out, `${fb.width.toFixed(0)}×${fb.height.toFixed(0)} of ${W}×${H}; ${dw0} → ${dw1}; left ${out}`);
  ok('GS-map-14', 'mouse: no console error', !t.errs.length, t.errs.slice(0, 2).join(' | ')); await t.close(); }

// ---- Expo LIVE: a booth in the hall takes you there ----------------------------------------------------------------------------------
const xinit = () => { try { if (!sessionStorage.getItem('xpo-fresh')) { localStorage.removeItem('empathia.expolive.v1'); sessionStorage.setItem('xpo-fresh', '1'); } } catch { /* none */ } };
/** taps (or clicks) across the hall until a booth is chosen; returns the point and the booth */
const probe = async (p, hit) => { const b = await p.getByTestId('xpo-canvas').boundingBox();
  for (const fy of [0.55, 0.45, 0.65, 0.35, 0.75]) for (const fx of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) { await hit(b.x + b.width * fx, b.y + b.height * fy); const s = await attr(p, 'expo-live', 'sel'); if (s) return { s, at: [fx, fy] }; }
  return { s: '', at: null }; };
{ const t = await open('#/play/expo', { role: 'architect', sw: false, w: 1440, h: 900, reduced: true, init: xinit }); const p = t.page; p.setDefaultTimeout(20000);
  await p.waitForSelector('[data-testid=expo-live][data-ready=true]'); await p.waitForTimeout(2000);
  const c0 = await attr(p, 'xpo-canvas', 'cam'); let [x, y] = await centre(p, 'xpo-canvas'); await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 150, y + 30, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
  const c1 = await attr(p, 'xpo-canvas', 'cam');
  ok('GS-xpo-01', 'mouse: a drag across the hall looks around it and chooses no booth', c1 !== c0 && !(await attr(p, 'expo-live', 'sel')), `${c0} → ${c1}`);
  const t0 = await top(p, 'xpo-canvas'); [x, y] = await centre(p, 'xpo-canvas'); await p.mouse.move(x, y); await p.mouse.wheel(0, 250); await p.waitForTimeout(300); const h1 = await hint(p, 'xpo-hint'), t1 = await top(p, 'xpo-canvas');
  ok('GS-xpo-02', 'mouse: the plain wheel over the hall scrolls the page, with the hint', t1 < t0 - 30 && /Ctrl/.test(h1), `top ${t0.toFixed(0)} → ${t1.toFixed(0)}; "${h1}"`);
  await p.getByTestId('xpo-canvas').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  const before = await attr(p, 'expo-live', 'sel'); const r = await probe(p, async (px, py) => { await p.mouse.click(px, py); await p.waitForTimeout(250); });
  const cam = (await attr(p, 'xpo-canvas', 'cam') || '').split(' ').map(Number); const card = await p.getByTestId('xpo-card').innerText().catch(() => '');
  const planName = r.s ? (await p.getByTestId(`xpo-plan-${r.s}`).innerText().catch(() => '')).split('\n')[0] : '';
  ok('GS-xpo-03', 'mouse: a click on a booth in the hall chooses it, takes the camera to it and opens its card', !before && !!r.s && cam[2] === 34 && card.length > 20, `${r.s} at ${JSON.stringify(r.at)}; camera ${cam.join(' ')}; card "${card.slice(0, 50)}"; plan "${planName}"`);
  { const cam = async () => (await attr(p, 'xpo-canvas', 'cam')).split(' ').map(Number); const k0 = await cam(); await p.getByTestId('xpo-left').click(); await p.waitForTimeout(150); const k1 = await cam(); await p.getByTestId('xpo-out').click(); await p.waitForTimeout(150); const k2 = await cam();
    await p.getByTestId('xpo-canvas').focus(); await p.keyboard.press('ArrowRight'); await p.keyboard.press('+'); await p.keyboard.press('Shift+ArrowUp'); await p.waitForTimeout(150); const k3 = await cam();
    ok('GS-xpo-11', 'without dragging: the buttons on the hall turn it and go farther, and the keyboard turns, comes nearer and moves along (WCAG 2.2 2.5.7)', k1[3] !== k0[3] && k2[2] > k1[2] && k3[3] !== k2[3] && k3[2] < k2[2] && (k3[0] !== k2[0] || k3[1] !== k2[1]), `${k0.join(' ')} → ${k1.join(' ')} → ${k2.join(' ')} → ${k3.join(' ')}`); }
  ok('GS-xpo-04', 'mouse: no console error', !t.errs.length, t.errs.slice(0, 2).join(' | ')); await t.close(); }

{ const t = await open('#/play/expo', { role: 'architect', sw: false, w: 390, h: 844, reduced: true, init: xinit, touch: true }); const p = t.page; p.setDefaultTimeout(20000);
  await p.waitForSelector('[data-testid=expo-live][data-ready=true]'); await p.waitForTimeout(2000); const f = fingers(await t.ctx.newCDPSession(p));
  await p.getByTestId('xpo-canvas').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  let [x, y] = await centre(p, 'xpo-canvas'); const c0 = await attr(p, 'xpo-canvas', 'cam'), t0 = await top(p, 'xpo-canvas');
  await f.swipe(p, x, y, 0, -200); const c1 = await attr(p, 'xpo-canvas', 'cam'), t1 = await top(p, 'xpo-canvas'), h1 = await hint(p, 'xpo-hint');
  ok('GS-xpo-05', 'phone: one finger over the hall scrolls the page; the hall stays still and says how to move it', t1 < t0 - 60 && c1 === c0 && /two fingers/i.test(h1), `top ${t0.toFixed(0)} → ${t1.toFixed(0)}; camera ${c0} → ${c1}; "${h1}"`);
  await p.getByTestId('xpo-canvas').scrollIntoViewIfNeeded(); await p.waitForTimeout(250); [x, y] = await centre(p, 'xpo-canvas');
  const k0 = (await attr(p, 'xpo-canvas', 'cam')).split(' '); await f.two(p, [x - 30, y], [x + 30, y], [-50, 0], [50, 0]); const k1 = (await attr(p, 'xpo-canvas', 'cam')).split(' ');
  await f.two(p, [x - 40, y], [x + 40, y], [0, 60], [0, 60]); const k2 = (await attr(p, 'xpo-canvas', 'cam')).split(' ');
  ok('GS-xpo-06', 'phone: two fingers pinch to come nearer, and moved together walk the camera along the hall', Number(k1[2]) < Number(k0[2]) && (k2[0] !== k1[0] || k2[1] !== k1[1]), `${k0.join(' ')} → ${k1.join(' ')} → ${k2.join(' ')}`);
  const r = await probe(p, async (px, py) => { await f.tap(p, px, py); });
  ok('GS-xpo-07', 'phone: a tap on a booth in the hall chooses it and takes the camera there', !!r.s && Number((await attr(p, 'xpo-canvas', 'cam')).split(' ')[2]) === 34, `${r.s} at ${JSON.stringify(r.at)}`);
  const [fx, fy] = await centre(p, 'xpo-full'); await f.tap(p, fx, fy); await p.waitForTimeout(400); const [W, H] = await vw(p); const sb = await p.locator('.xpo-stage').boundingBox();
  const mini = await p.getByTestId('xpo-mini').isVisible().catch(() => false); [x, y] = await centre(p, 'xpo-canvas'); const m0 = await attr(p, 'xpo-canvas', 'cam'); await f.swipe(p, x, y, 100, 0); const m1 = await attr(p, 'xpo-canvas', 'cam');
  ok('GS-xpo-08', 'phone: Full screen fills the window with the hall, keeps the chosen booth in a small card, and one finger looks around', Math.abs(sb.width - W) < 2 && Math.abs(sb.height - H) < 2 && mini && m1 !== m0, `${sb.width.toFixed(0)}×${sb.height.toFixed(0)} of ${W}×${H}; card ${mini}; ${m0} → ${m1}`);
  const [dx2, dy2] = await centre(p, 'xpo-full'); await f.tap(p, dx2, dy2); await p.waitForTimeout(300);
  ok('GS-xpo-09', 'phone: Done leaves full screen', !(await p.evaluate(() => document.documentElement.classList.contains('has-full'))), '');
  ok('GS-xpo-10', 'phone: no console error', !t.errs.length, t.errs.slice(0, 2).join(' | ')); await t.close(); }

// ---- the stadium and Campus Life on a phone -------------------------------------------------------------------------------------------
for (const [hash, sec, cv, full, hid, key] of [['#/play/stadium', 'stadium-live', 'slv-canvas', 'slv-full', 'slv-hint', 'slv'], ['#/play/campus', 'campus-life', 'cl-canvas', 'cl-full', 'cl-hint', 'cl']]) {
  const t = await open(hash, { role: 'architect', sw: false, w: 390, h: 844, reduced: true, touch: true }); const p = t.page; p.setDefaultTimeout(20000);
  await p.waitForSelector(`[data-testid=${sec}][data-ready=true]`); await p.waitForTimeout(1500); const f = fingers(await t.ctx.newCDPSession(p));
  const view = key === 'slv' ? async () => attr(p, cv, 'cam') : async () => `${await attr(p, sec, 'yaw')}`;
  await p.getByTestId(cv).scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  let [x, y] = await centre(p, cv); const v0 = await view(), t0 = await top(p, cv); await f.swipe(p, x, y, 0, -200); const v1 = await view(), t1 = await top(p, cv), h1 = await hint(p, hid);
  ok(`GS-${key}-01`, `phone, ${sec}: one finger over the picture scrolls the page; the picture stays still and says how to move it`, t1 < t0 - 60 && v1 === v0 && /two fingers/i.test(h1), `top ${t0.toFixed(0)} → ${t1.toFixed(0)}; view ${v0} → ${v1}; "${h1}"`);
  await p.getByTestId(cv).scrollIntoViewIfNeeded(); await p.waitForTimeout(250); [x, y] = await centre(p, cv); const w0 = await view();
  await f.two(p, [x - 40, y], [x + 40, y], [70, 0], [70, 0]); const w1 = await view();
  ok(`GS-${key}-02`, `phone, ${sec}: two fingers moved together turn the view`, w1 !== w0, `${w0} → ${w1}`);
  const [fx, fy] = await centre(p, full); await f.tap(p, fx, fy); await p.waitForTimeout(400); const [W, H] = await vw(p);
  const sb = await p.evaluate(() => { const e = document.querySelector('.is-full'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
  [x, y] = await centre(p, cv); const g0 = await view(); await f.swipe(p, x, y, 110, 0); const g1 = await view();
  ok(`GS-${key}-03`, `phone, ${sec}: Full screen fills the window and one finger turns the view`, !!sb && Math.abs(sb[2] - W) < 2 && Math.abs(sb[3] - H) < 2 && g1 !== g0, `${sb ? sb.map((n) => n.toFixed(0)).join(',') : 'none'} of ${W}×${H}; ${g0} → ${g1}`);
  const [dx, dy] = await centre(p, full); await f.tap(p, dx, dy); await p.waitForTimeout(300);
  ok(`GS-${key}-04`, `phone, ${sec}: Done leaves full screen; no console error`, !(await p.evaluate(() => document.documentElement.classList.contains('has-full'))) && !t.errs.length, t.errs.slice(0, 2).join(' | '));
  await t.close(); }

{ const t = await open('#/play/stadium', { role: 'architect', sw: false, w: 1280, h: 760, reduced: true }); const p = t.page; p.setDefaultTimeout(20000);
  await p.waitForSelector('[data-testid=stadium-live][data-ready=true]'); await p.waitForTimeout(1500);
  let [x, y] = await centre(p, 'slv-canvas'); const c0 = await attr(p, 'slv-canvas', 'cam'); await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 150, y + 20, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
  const c1 = await attr(p, 'slv-canvas', 'cam'); const t0 = await top(p, 'slv-canvas'); [x, y] = await centre(p, 'slv-canvas'); await p.mouse.move(x, y); await p.mouse.wheel(0, 250); await p.waitForTimeout(300); const t1 = await top(p, 'slv-canvas'), c2 = await attr(p, 'slv-canvas', 'cam');
  await p.getByTestId('slv-canvas').scrollIntoViewIfNeeded(); [x, y] = await centre(p, 'slv-canvas'); await p.mouse.move(x, y); await p.keyboard.down('Control'); await p.mouse.wheel(0, -300); await p.keyboard.up('Control'); await p.waitForTimeout(300); const c3 = await attr(p, 'slv-canvas', 'cam');
  ok('GS-slv-05', 'mouse, stadium: a drag orbits the stadium; the plain wheel scrolls the page; Ctrl and the wheel come nearer', c1 !== c0 && c2 === c1 && t1 < t0 - 30 && Number(c3.split(' ')[0]) < Number(c2.split(' ')[0]), `${c0} → ${c1} → ${c2} → ${c3}; top ${t0.toFixed(0)} → ${t1.toFixed(0)}`);
  { const cam = async () => (await attr(p, 'slv-canvas', 'cam')).split(' ').map(Number); const k0 = await cam(); await p.getByTestId('slv-right').click(); await p.waitForTimeout(150); const k1 = await cam(); await p.getByTestId('slv-in').click(); await p.waitForTimeout(150); const k2 = await cam();
    await p.getByTestId('slv-canvas').focus(); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('-'); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(150); const k3 = await cam();
    ok('GS-slv-07', 'mouse, stadium: without dragging, the buttons turn and come nearer; the keyboard turns, tilts and goes farther', k1[1] !== k0[1] && k2[0] < k1[0] && k3[1] !== k2[1] && k3[0] > k2[0] && k3[2] !== k2[2], `${k0.join(' ')} → ${k1.join(' ')} → ${k2.join(' ')} → ${k3.join(' ')}`); }
  ok('GS-slv-06', 'mouse, stadium: no console error', !t.errs.length, t.errs.slice(0, 2).join(' | ')); await t.close(); }

// ---- Lite's room scene on a phone (the technical view): a vertical swipe scrolls the page, a sideways one turns the room -------------
{ const t = await open('#/lite/room/R-ATL-4-218?mode=engineer&view=tech', { role: 'architect', sw: false, w: 390, h: 844, reduced: true, touch: true }); const p = t.page; p.setDefaultTimeout(20000);
  await p.waitForSelector('[data-testid=lite-3d]'); await p.waitForTimeout(800); const f = fingers(await t.ctx.newCDPSession(p));
  await p.getByTestId('lite-3d').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  let [x, y] = await centre(p, 'lite-3d'); const y0 = await attr(p, 'lite-3d', 'yaw'), t0 = await top(p, 'lite-3d'); await f.swipe(p, x, y, 0, -200); const y1 = await attr(p, 'lite-3d', 'yaw'), t1 = await top(p, 'lite-3d');
  await p.getByTestId('lite-3d').scrollIntoViewIfNeeded(); await p.waitForTimeout(250); [x, y] = await centre(p, 'lite-3d'); await f.swipe(p, x - 80, y, 160, 0); const y2 = await attr(p, 'lite-3d', 'yaw');
  ok('GS-lite-01', "phone, Lite's room in 3D: a vertical swipe scrolls the page and leaves the room as it was; a sideways swipe turns it", t1 < t0 - 60 && y1 === y0 && y2 !== y1, `top ${t0.toFixed(0)} → ${t1.toFixed(0)}; yaw ${y0} → ${y1} → ${y2}`);
  ok('GS-lite-02', 'phone, Lite: no console error', !t.errs.length, t.errs.slice(0, 2).join(' | ')); await t.close(); }

await done();
