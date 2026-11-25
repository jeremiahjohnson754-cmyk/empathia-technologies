#!/usr/bin/env node
// Campus Life, the first playable slice (task #186; founder, 17 Nov 2026 10:31 and 10:59), driven in a real browser by real key and
// touch input. The acceptance journey: Launch → Spawn → Walk → Run → Rotate the camera → Talk to the professor → Receive the quest →
// Open the door → Enter the building → Complete the classroom interaction → Earn XP → Save → Reload → Resume. And the founder's
// additions: collision (walls, furniture and the world's edge from several angles, never through, never stuck), camera obstruction
// (the camera pulls in front of a wall), and frame rate measured per scene with a budget.
//
// The frame rate is of THIS machine's headless Chromium, which draws WebGL in software (SwiftShader): it is not a phone and not a
// graphics card, and the budget is set for it (a regression floor, not a claim about any device). The numbers are printed with the run.
//   node tests/browser/demo-campus-life.test.mjs
import { harness } from './demo-shell-lib.mjs';
import { recordFrameRates, glRenderer } from '../lib/frame-rates.mjs';
// 25 Nov 2026: the figures the frame-rate checks measure are also written beside the run's evidence (tests/lib/frame-rates.mjs), so the
// record of a regression says what was measured and not only PASS. Nothing here changes a check that existed; CL-23 and CL-24 are new.
const costOf = (q, id) => q.evaluate((t) => { const c = document.querySelector(`[data-testid=${t}]`); return { triangles: Number(c?.dataset.tris), draws: Number(c?.dataset.draws) }; }, id);   // what the renderer says its last frame drew (gl.ts, Renderer.stats)
const FR = []; let GL = ''; const detailOf = async (q) => Number(await q.getByTestId('campus-life').getAttribute('data-detail'));
const { open, ok, done, base, browser } = await harness('demo-campus-life');

const KEY_OF = { n: 'w', s: 's', e: 'd', w: 'a' };
async function at(p) { return p.evaluate(() => { const e = document.querySelector('[data-testid=campus-life]'); const g = (k) => e.getAttribute(`data-${k}`); return { x: Number(g('x')), z: Number(g('z')), cam: Number(g('cam')), eyeZ: Number(g('eye-z')), yaw: Number(g('yaw')), xp: Number(g('xp')), level: Number(g('level')), stage: g('quest'), door: g('door'), inside: g('inside'), fps: Number(g('fps')), cards: Number(g('cards')), speed: Number(g('speed')) }; }); }
/** hold keys until a condition holds or time runs out; returns the last position */
async function hold(p, keys, until, ms = 8000) { for (const k of keys) await p.keyboard.down(k); const t0 = Date.now(); let s = await at(p);
  while (Date.now() - t0 < ms && !until(s)) { await p.waitForTimeout(40); s = await at(p); } for (const k of keys) await p.keyboard.up(k); await p.waitForTimeout(120); return at(p); }
/** walk to (x, z) with the camera facing north (the default): north/south first or east/west first, as asked */
async function walkTo(p, x, z, { tol = 0.35, run = true, order = 'xz' } = {}) {
  const axis = async (which) => { for (let i = 0; i < 3; i++) { const s = await at(p); const d = which === 'x' ? x - s.x : z - s.z; if (Math.abs(d) <= tol) return;
    const k = which === 'x' ? (d > 0 ? KEY_OF.e : KEY_OF.w) : (d < 0 ? KEY_OF.n : KEY_OF.s); const keys = run && Math.abs(d) > 2 ? ['Shift', k] : [k];
    await hold(p, keys, (q) => (which === 'x' ? Math.abs(x - q.x) <= tol || Math.sign(x - q.x) !== Math.sign(d) : Math.abs(z - q.z) <= tol || Math.sign(z - q.z) !== Math.sign(d)), 15000); } };
  for (const w of order) await axis(w); return at(p);
}
const press = async (p, key) => { await p.keyboard.press(key); await p.waitForTimeout(250); };

{ const t = await open('#/play/campus', { role: 'architect', sw: false, w: 1280, h: 860, init: () => { try { if (!sessionStorage.getItem('cl-fresh')) { localStorage.removeItem('empathia.campuslife.v1'); sessionStorage.setItem('cl-fresh', '1'); } } catch { /* none */ } } }); const p = t.page; p.setDefaultTimeout(20000);
  await p.waitForSelector('[data-testid=campus-life][data-ready=true]'); await p.waitForTimeout(1200); await p.getByTestId('cl-canvas').focus();
  const s0 = await at(p);
  ok('CL-01', 'launch and spawn: the scene draws (WebGL2), the student stands at the south gate of the Quad facing Science Hall, level 1, no XP, the quest says where to start', !(await p.getByTestId('cl-err').count()) && s0.x === 0 && s0.z === 20 && s0.level === 1 && s0.xp === 0 && s0.stage === 'start' && /Find Professor Calder/.test(await p.getByTestId('cl-quest').innerText()), JSON.stringify(s0));

  // walk, then run: the speed while the keys are held (frame-rate independent), and the ground covered each time
  const a = await at(p); await p.keyboard.down('w'); await p.waitForTimeout(1000); const walking = (await at(p)).speed; await p.keyboard.up('w'); await p.waitForTimeout(300); const b = await at(p);
  await hold(p, ['s'], () => false, 1000); const c = await at(p);
  await p.keyboard.down('Shift'); await p.keyboard.down('w'); await p.waitForTimeout(1000); const running = (await at(p)).speed; await p.keyboard.up('w'); await p.keyboard.up('Shift'); await p.waitForTimeout(300); const d = await at(p);
  const walked = a.z - b.z, ran = c.z - d.z;
  ok('CL-02', 'walk and run with real keys: W moves north at a walking pace (about 3.2 m/s), S comes back, Shift runs at about twice the pace', walked > 1.5 && Math.abs(walking - 3.2) < 0.4 && running > walking * 1.7 && ran > walked, `walk ${walking} m/s (${walked.toFixed(2)} m) · run ${running} m/s (${ran.toFixed(2)} m)`);

  // rotate the camera: arrow keys and a drag; then put it back facing north for the rest of the journey
  const y0 = (await at(p)).yaw; await hold(p, ['ArrowLeft'], () => false, 500); const y1 = (await at(p)).yaw;
  const box = await p.getByTestId('cl-canvas').boundingBox(); await p.mouse.move(box.x + 600, box.y + 400); await p.mouse.down(); await p.mouse.move(box.x + 700, box.y + 400, { steps: 6 }); await p.mouse.up(); const y2 = (await at(p)).yaw;
await press(p, 'c'); const y3r = (await at(p)).yaw; const y3 = ((y3r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); const compass = await p.locator('[data-testid=cl-compass] span[data-dir=N]').count();
  ok('CL-03', 'rotate the camera: the left arrow turns it one way, a drag turns it the other; C puts it back behind the student (facing north), and the compass shows N', y1 > y0 + 0.4 && y2 < y1 - 0.3 && Math.abs(y3 - Math.PI) < 0.06 && compass === 1, `${y0.toFixed(2)} → ${y1.toFixed(2)} → ${y2.toFixed(2)} → ${y3.toFixed(2)}`);

  // camera in the open: nothing in the way
  const open1 = await at(p);
  // to the professor, past the fountain
  await walkTo(p, 4.5, 8, { order: 'xz' }); await walkTo(p, 4.5, -16.6, { order: 'z' }); await walkTo(p, 3.2, -16.6, { order: 'x' }); await walkTo(p, 3.2, -17.3, { order: 'z', tol: 0.25 });
  const reachN = await p.getByTestId('cl-prompt').getAttribute('data-reach').catch(() => null);
  await press(p, 'e'); const talk = await p.getByTestId('cl-panel').innerText().catch(() => ''); const afterTalk = await at(p);
  await p.getByTestId('cl-close').click(); await p.getByTestId('cl-canvas').focus();
  ok('CL-04', 'talk to the professor: the prompt names her, E opens the conversation, the quest is received (+10 XP) and the tracker moves on', reachN === 'npc' && /Professor Ines Calder/.test(talk) && /LED demonstration board/.test(talk) && afterTalk.stage === 'met' && afterTalk.xp === 10 && /Go into Science Hall/.test(await p.getByTestId('cl-quest').innerText()), `${reachN} · ${afterTalk.stage} ${afterTalk.xp}`);

  // the door: closed, it stops the student; opened with E, they walk in
  await walkTo(p, 0, -21.2, { order: 'xz' }); const stopped = await hold(p, ['w'], () => false, 2500);
  const reachD = await p.getByTestId('cl-prompt').getAttribute('data-reach').catch(() => null); await press(p, 'e'); await p.waitForTimeout(900); const opened = await at(p);
  const inside = await walkTo(p, 0, -26.5, { order: 'z' }); const sign = await p.locator('.cl-tag--thing').count();
  ok('CL-05', 'the door: closed, the student stops at it; E opens it; through it into Science Hall (+15 XP), the roof lifts away so the camera sees in', stopped.z > -23.9 && reachD === 'door' && opened.door === 'open' && inside.inside === 'true' && inside.stage === 'inside' && inside.xp === 25 && sign >= 1, `stopped ${stopped.z.toFixed(2)} · ${reachD} · ${opened.door} · ${inside.stage} ${inside.xp}`);

  // camera obstruction: in the lobby west of the doorway, facing north, the camera behind the student would be outside the front wall: it pulls in
  await walkTo(p, -6, -27.2, { order: 'zx' }); const obstructed = await at(p);
  ok('CL-06', 'camera obstruction: on the Quad nothing is in the way (about 5.7 m); in the lobby the front wall is behind the student, so the camera rises over their shoulder and stays inside the wall (its eye north of the wall’s inner face), never through it', open1.cam > 5.4 && obstructed.eyeZ < -24.4 && obstructed.eyeZ > -42 && obstructed.cam >= 0.6, `open ${open1.cam} · lobby ${obstructed.cam} m, eye z ${obstructed.eyeZ}`);

  // collision inside: the inner wall, then through the opening, the desks, and the back wall
  const wall = await hold(p, ['w'], () => false, 2500);
  await walkTo(p, 4, -27.2, { order: 'x' }); await walkTo(p, 4, -30.6, { order: 'z' }); const desk = await hold(p, ['w'], () => false, 2500);
  await walkTo(p, 10.9, -30.6, { order: 'x' }); await walkTo(p, 10.9, -35.6, { order: 'z' }); const benchHit = await hold(p, ['w'], () => false, 2500);
  ok('CL-07', 'collision indoors: the inner wall (z −29 ± 0.2) and the front row of desks stop the student; the circuit bench stops them; each time they can move on', wall.z > -28.8 + 0.3 && desk.z > -32.4 && benchHit.z > -36.6 && benchHit.x > 9 , `wall ${wall.z.toFixed(2)} · desk ${desk.z.toFixed(2)} · bench ${benchHit.x.toFixed(2)},${benchHit.z.toFixed(2)}`);

  // the classroom interaction: the bench's three circuits
  const reachB = await p.getByTestId('cl-prompt').getAttribute('data-reach').catch(() => null); await press(p, 'e');
  const dark = await p.locator('.cl-board').getAttribute('data-lit');
  let wrongShown = false;
  for (let i = 0; i < 3; i++) {
    const wrong = p.locator('[data-testid=cl-circuits] .cl-opt-btn[data-right=false]').first(); if (i === 0) { await wrong.click(); wrongShown = /Not quite/.test(await p.getByTestId('cl-why').innerText()); }
    await p.locator('[data-testid=cl-circuits] .cl-opt-btn[data-right=true]').click(); await p.getByTestId('cl-next').click();
  }
  const lit = await p.locator('.cl-board').getAttribute('data-lit'); const solvedS = await at(p); await p.getByTestId('cl-close').click(); await p.getByTestId('cl-canvas').focus();
  ok('CL-08', 'the classroom interaction: at the bench in SCI-110, three circuits; a wrong answer explains itself; three right answers light the board and earn XP (+150, +20 for each right first time)', reachB === 'bench' && dark === 'false' && wrongShown && lit === 'true' && solvedS.stage === 'solved' && solvedS.xp === 25 + 150 + 40, `${reachB} · ${dark}→${lit} · ${solvedS.stage} ${solvedS.xp}`);

  // back out to the professor; level up
  await walkTo(p, 10.9, -30.6, { order: 'z' }); await walkTo(p, 4, -30.6, { order: 'x' }); await walkTo(p, 4, -27, { order: 'z' }); await walkTo(p, 0, -27, { order: 'x' }); await walkTo(p, 0, -20, { order: 'z' }); await walkTo(p, 4.5, -20, { order: 'x' }); await walkTo(p, 4.5, -16.6, { order: 'z' }); await walkTo(p, 3.2, -16.6, { order: 'x' }); await walkTo(p, 3.2, -17.3, { order: 'z', tol: 0.25 });
  const nearN = await at(p); const reachN2 = await p.getByTestId('cl-prompt').getAttribute('data-reach').catch(() => null);
  await press(p, 'e'); const doneS = await at(p); await p.getByTestId('cl-close').click({ timeout: 5000 }).catch(() => undefined); await p.getByTestId('cl-canvas').focus();
  ok('CL-09', 'the quest complete: back to the professor (+50 XP), the student reaches level 2 and the tracker says the theatre is ready', doneS.stage === 'done' && doneS.xp === 265 && doneS.level === 2 && /lecture theatre is ready/.test(await p.getByTestId('cl-quest').innerText()), `${doneS.stage} ${doneS.xp} L${doneS.level} · at ${nearN.x},${nearN.z} reach ${reachN2}`);

  // a fact card on the way; collision with the fountain and the world's edge
  await walkTo(p, 6, -16.6, { order: 'x' }); await walkTo(p, 6, 7, { order: 'z' }); await walkTo(p, 0, 7, { order: 'x' }); const fountain = await hold(p, ['w'], () => false, 3000);
  await walkTo(p, 0, 5.6, { order: 'z' }); const reachC = await p.getByTestId('cl-prompt').getAttribute('data-reach').catch(() => null); await press(p, 'e'); const card = await at(p); await p.getByTestId('cl-close').click(); await p.getByTestId('cl-canvas').focus();
  await walkTo(p, 0, 20, { order: 'z' }); await walkTo(p, -20, 20, { order: 'x' }); const edgeS = await hold(p, ['Shift', 's'], () => false, 6000); const edgeSE = await hold(p, ['Shift', 's', 'd'], () => false, 2500);
  const away = await hold(p, ['w'], () => false, 800);
  ok('CL-10', 'collision outdoors: the fountain stops the student; a fact card is picked up (+25 XP); running into the south hedge, straight and at an angle, they stay inside the world and can walk away', fountain.z > 3.0 && reachC === 'card:fountain' && card.cards === 1 && card.xp === 290 && edgeS.z <= 45.66 && edgeSE.z <= 45.66 && away.z < edgeSE.z - 1, `fountain ${fountain.z.toFixed(2)} · ${reachC} ${card.xp} · edge ${edgeS.z.toFixed(2)}/${edgeSE.z.toFixed(2)} → ${away.z.toFixed(2)}`);

  // save, reload, resume
  await p.getByTestId('cl-save').click(); const savedAt = await at(p); const note = await p.getByTestId('cl-saved').innerText();
  await p.reload(); await p.waitForSelector('[data-testid=campus-life][data-ready=true]'); await p.waitForTimeout(1200); const resumed = await at(p);
  ok('CL-11', 'save, reload, resume: the page says progress is kept in this browser; after a reload the student is where they were, with their XP, level, quest and cards', /Saved in this browser/.test(note) && Math.abs(resumed.x - savedAt.x) < 0.05 && Math.abs(resumed.z - savedAt.z) < 0.05 && resumed.xp === 290 && resumed.stage === 'done' && resumed.cards === 1 && /Resumed from this browser/.test(await p.getByTestId('cl-saved').innerText()), `${JSON.stringify(savedAt)} → ${JSON.stringify(resumed)}`);

  // pause and settings: sound off until chosen; Esc pauses and resumes
  await p.getByTestId('cl-canvas').focus(); await press(p, 'Escape'); const paused = await p.getByTestId('cl-paused').count(); const soundOff = !(await p.getByTestId('cl-sound').isChecked());
  const frozenA = await at(p); await p.keyboard.down('w'); await p.waitForTimeout(500); await p.keyboard.up('w'); const frozenB = await at(p); await p.getByTestId('cl-resume').click();
  ok('CL-12', 'pause: Esc pauses the game (movement keys do nothing), sound is off until the player turns it on, Resume returns', paused === 1 && soundOff && Math.abs(frozenA.z - frozenB.z) < 0.01 && !(await p.getByTestId('cl-paused').count()), `paused ${paused} · sound ${!soundOff} · ${frozenA.z}/${frozenB.z}`);

  const fpsDesk = (await at(p)).fps; FR.push({ check: 'CL-13', mode: 'adapted', what: 'desktop 1280 × 860, opened as a visitor opens it, read after the quest and a reload', fps: fpsDesk, detail: await detailOf(p), floor: 8 });
  ok('CL-13', `frame rate at desktop size (1280 × 860) in this machine's headless software-rendered Chromium: ${fpsDesk} fps; budget ≥ 8 (a regression floor for this machine, not a device claim)`, fpsDesk >= 8, `${fpsDesk} fps`);
  ok('CL-14', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }

{ // CL-21, CL-22 (24 Nov 2026): adaptive detail. CL-13 measured 7 frames a second against its floor of 8 in two regressions on a machine
  // that had not stalled; the scene is bound by the pixels it draws. The renderer now draws fewer pixels when it cannot hold 24 frames a
  // second. This compares the same scene on the same machine, forced to full detail and left to adapt. The floor in CL-13 is unchanged.
  const sample = async (p) => { const v = []; for (let i = 0; i < 4; i += 1) { await p.waitForTimeout(1150); v.push(Number(await p.getByTestId('campus-life').getAttribute('data-fps'))); } v.sort((a, b) => a - b); return Math.round((v[1] + v[2]) / 2); };
  const shape = (p) => p.evaluate(() => { const c = document.querySelector('[data-testid=campus-life] canvas'); const r = document.querySelector('[data-testid=campus-life]'); return { cssW: c.clientWidth, cssH: c.clientHeight, w: c.width, h: c.height, dpr: Math.min(devicePixelRatio || 1, 2), detail: Number(r.getAttribute('data-detail')), note: document.querySelector('[data-testid=cl-detail]')?.textContent || '', wide: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  const init = () => { try { localStorage.removeItem('empathia.campuslife.v1'); } catch { /* none */ } };
  const f = await open('#/play/campus?detail=full', { role: 'architect', sw: false, w: 1280, h: 860, init }); await f.page.waitForSelector('[data-testid=campus-life][data-ready=true]'); await f.page.waitForTimeout(6000);
  const fullFps = await sample(f.page); const full = await shape(f.page); const costFull = await costOf(f.page, 'cl-canvas'); await f.close();
  const a = await open('#/play/campus', { role: 'architect', sw: false, w: 1280, h: 860, init }); await a.page.waitForSelector('[data-testid=campus-life][data-ready=true]'); await a.page.waitForTimeout(6000);
  const autoFps = await sample(a.page); const auto = await shape(a.page);
  FR.push({ check: 'CL-21', mode: 'full', what: 'desktop 1280 × 860, held at full detail, the middle of four one-second readings', fps: fullFps, detail: full.detail, ...costFull }, { check: 'CL-21', mode: 'adapted', what: 'desktop 1280 × 860, left to adapt, the middle of four one-second readings', fps: autoFps, detail: auto.detail, ...(await costOf(a.page, 'cl-canvas')) });
  // CL-24 (25 Nov 2026): what a frame costs, counted and not timed, so the same on every machine: a budget beside the frame-rate floor.
  ok('CL-24', `the cost of a frame, counted: the campus as the student arrives sends ${costFull.triangles} triangles in ${costFull.draws} draw calls (budget 32,000 and 120)`, costFull.triangles > 10000 && costFull.triangles <= 32000 && costFull.draws > 20 && costFull.draws <= 120, JSON.stringify(costFull));
  const slow = fullFps < 24;
  ok('CL-21', `adaptive detail on this machine: ${fullFps} fps forced to full detail, ${autoFps} fps left to adapt at ${auto.detail}% detail. ${slow ? 'Full detail cannot hold 24 here, so the scene must draw fewer pixels and be faster for it' : 'Full detail holds 24 here, so the scene must stay at full detail'}`,
    full.detail === 100 && !full.note && (slow ? auto.detail < 100 && auto.detail >= 50 && autoFps > fullFps && /Drawn at \d+% of full detail/.test(auto.note) : auto.detail === 100 && !auto.note), JSON.stringify({ fullFps, autoFps, full, auto }));
  ok('CL-22', 'adaptive detail changes the pixels drawn, not the page: the canvas keeps its size on the page, is drawn at the device ratio times the detail, and nothing scrolls sideways', auto.cssW === full.cssW && auto.cssH === full.cssH && Math.abs(auto.w - Math.round(auto.cssW * auto.dpr * auto.detail / 100)) <= 2 && Math.abs(full.w - Math.round(full.cssW * full.dpr)) <= 2 && auto.wide <= 1 && !a.errs.length, JSON.stringify({ full, auto, e: a.errs[0] }));
  GL = await glRenderer(a.page); // asked after every reading and check of this page, so the question costs them nothing
  await a.close(); }

{ // a phone: the thumb-stick moves the student; the act button acts; frame rate at phone size
  const t = await open('#/play/campus', { role: 'architect', sw: false, w: 390, h: 844, init: () => { try { localStorage.removeItem('empathia.campuslife.v1'); } catch { /* none */ } } });
  const p = t.page; await p.waitForSelector('[data-testid=campus-life][data-ready=true]'); await p.waitForTimeout(1200);
  const coarse = await p.evaluate(() => matchMedia('(pointer: coarse)').matches);
  let moved = null; let over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (coarse) {
    const st = await p.getByTestId('cl-stick').boundingBox(); const cx = st.x + st.width / 2, cy = st.y + st.height / 2; const a = await at(p);
    await p.dispatchEvent('[data-testid=cl-stick]', 'pointerdown', { pointerId: 7, clientX: cx, clientY: cy - st.height / 2, pointerType: 'touch', isPrimary: true });
    await p.dispatchEvent('[data-testid=cl-stick]', 'pointermove', { pointerId: 7, clientX: cx, clientY: cy - st.height / 2, pointerType: 'touch', isPrimary: true });
    await p.waitForTimeout(1200); await p.dispatchEvent('[data-testid=cl-stick]', 'pointerup', { pointerId: 7, pointerType: 'touch' }); const b = await at(p); moved = a.z - b.z;
  }
  await p.waitForTimeout(1500); const fpsPhone = (await at(p)).fps; FR.push({ check: 'CL-16f', mode: 'adapted', what: 'phone size 390 × 844 in the same desktop browser (not a phone), opened as a visitor opens it', fps: fpsPhone, detail: await detailOf(p), floor: 8 });
  ok('CL-15', `a phone-sized screen: no sideways scroll; the HUD fits; ${coarse ? `the thumb-stick moves the student (${moved?.toFixed(2)} m)` : 'this browser reports a fine pointer, so the touch controls are hidden (they are tested with a coarse pointer in CL-16)'}`, over <= 0 && (!coarse || moved > 1), `overflow ${over} · coarse ${coarse} · moved ${moved}`);
  ok('CL-16f', `frame rate at phone size (390 × 844) in the same headless browser: ${fpsPhone} fps; budget ≥ 8 (not a phone measurement)`, fpsPhone >= 8, `${fpsPhone} fps`);
  // 18 Nov first-time-viewer pass: the game wrote its quest stage to data-stage, which the design tokens read as "a dark 3D stage", so
  // the page's intro took the dark theme's pale text on the light page. The intro must read in the page's own text colour.
  const tone = await p.evaluate(() => { const sec = document.querySelector('[data-testid=campus-life]'); return { stageAttr: sec.hasAttribute('data-stage'), intro: getComputedStyle(sec.querySelector('.cl-head p')).color, page: getComputedStyle(document.querySelector('main')).getPropertyValue('--tx2').trim() }; });
  const rgb = (c) => c.startsWith('#') ? `rgb(${parseInt(c.slice(1, 3), 16)}, ${parseInt(c.slice(3, 5), 16)}, ${parseInt(c.slice(5, 7), 16)})` : c;
  ok('CL-19', 'the page keeps its own theme: the game no longer marks itself a dark stage, and the intro is in the page text colour', !tone.stageAttr && tone.intro === rgb(tone.page), JSON.stringify(tone));
  await t.close(); }

{ // touch controls on a touch device (a coarse pointer): a context with touch, as a phone's browser has; the stick driven by touch pointers
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(base + '#/play/campus'); await p.waitForSelector('[data-testid=campus-life][data-ready=true]', { timeout: 20000 }); await p.waitForTimeout(1200);
  const coarse = await p.evaluate(() => matchMedia('(pointer: coarse)').matches); const vis = await p.getByTestId('cl-stick').isVisible();
  let moved = 0; if (vis) { const st = await p.getByTestId('cl-stick').boundingBox(); const cx = st.x + st.width / 2, cy = st.y + st.height / 2; const a = await at(p);
    await p.dispatchEvent('[data-testid=cl-stick]', 'pointerdown', { pointerId: 9, clientX: cx, clientY: cy - st.height / 2, pointerType: 'touch', isPrimary: true });
    await p.waitForTimeout(1500); await p.dispatchEvent('[data-testid=cl-stick]', 'pointerup', { pointerId: 9, pointerType: 'touch' }); moved = a.z - (await at(p)).z; }
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('CL-16', 'touch: on a touch device the thumb-stick shows and pushing it up walks the student north; no sideways scroll', coarse && vis && moved > 1 && over <= 0, `coarse ${coarse} · visible ${vis} · moved ${moved.toFixed(2)} m · overflow ${over}`);
  ok('CL-17', 'no console error on the touch device', !errs.length, errs.slice(0, 3).join(' | '));
  // 18 Nov first-time-viewer pass: on a 390 px phone the quest card covered the player card. No two HUD pieces may overlap on a phone.
  const hud = await p.evaluate(() => { const r = (s) => { const b = document.querySelector(s)?.getBoundingClientRect(); return b && b.width ? { s, l: b.left, t: b.top, r: b.right, b: b.bottom } : null; }; const xs = ['.cl-who', '.cl-quest', '.cl-map', '.cl-stick', '.cl-acts', '.cl-bar'].map(r).filter(Boolean); const hit = []; for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) { const a = xs[i], b = xs[j]; if (a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1) hit.push(`${a.s}×${b.s}`); } return { n: xs.length, hit }; });
  ok('CL-20', `touch phone (390 × 844): the ${hud.n} HUD pieces (player, quest, map, stick, actions, bar) do not overlap`, hud.n >= 5 && !hud.hit.length, JSON.stringify(hud));
  await ctx.close(); }
{ // CL-25 (25 Nov 2026): Full quality, as on Stadium LIVE, in the pause sheet with the campus's other options. Opened as a visitor opens it;
  // the box pins full detail whatever the frame rate; opened with ?detail=full it starts ticked.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce', serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(base + '#/play/campus'); await p.waitForSelector('[data-testid=campus-life][data-ready=true]', { timeout: 20000 }); await p.waitForTimeout(3000);
  await p.getByTestId('cl-canvas').focus(); await press(p, 'Escape'); const before = { ticked: await p.getByTestId('cl-quality').isChecked(), quality: await p.getByTestId('campus-life').getAttribute('data-quality') };
  await p.getByTestId('cl-quality').check(); await p.getByTestId('cl-resume').click(); await p.waitForTimeout(2500);
  const after = { quality: await p.getByTestId('campus-life').getAttribute('data-quality'), detail: Number(await p.getByTestId('campus-life').getAttribute('data-detail')), note: await p.getByTestId('cl-detail').count() };
  // turning Sound on must leave the scene drawing, still held at full detail. Until 25 Nov it rebuilt the scene on a lost WebGL context and
  // the page said "This browser cannot draw the campus" (found while writing this check; it was live on the previews)
  await p.getByTestId('cl-canvas').focus(); await press(p, 'Escape'); await p.getByTestId('cl-sound').check(); await p.getByTestId('cl-resume').click(); await p.waitForTimeout(2500);
  const rebuilt = { ready: await p.getByTestId('campus-life').getAttribute('data-ready'), error: await p.locator('[data-testid=campus-life] .cl-err').count(), quality: await p.getByTestId('campus-life').getAttribute('data-quality'), detail: Number(await p.getByTestId('campus-life').getAttribute('data-detail')), held: await p.evaluate(() => /[?&]detail=full/.test(location.hash)) };
  await p.goto(base + '#/play/campus?detail=full'); await p.waitForSelector('[data-testid=campus-life][data-ready=true]', { timeout: 20000 }); await p.waitForTimeout(800);
  await p.getByTestId('cl-canvas').focus(); await press(p, 'Escape'); const pinned = await p.getByTestId('cl-quality').isChecked();
  ok('CL-25', 'Full quality in the pause sheet: off as a visitor opens the campus; ticked, it is drawn at 100% detail and the note no longer says it is drawn at less, and turning Sound on leaves the scene drawing, still at full detail; ticked already with ?detail=full', !before.ticked && before.quality === 'auto' && after.quality === 'full' && after.detail === 100 && after.note === 0 && rebuilt.ready === 'true' && rebuilt.error === 0 && rebuilt.quality === 'full' && rebuilt.detail === 100 && pinned && !errs.length, JSON.stringify({ before, after, rebuilt, pinned, errs: errs.slice(0, 2) }));
  await ctx.close(); }
{ let file = '', why = ''; try { file = recordFrameRates('campus', FR, { renderer: GL }); } catch (e) { why = String(e.message); }
  ok('CL-23', 'the frame rates this run measured are written beside its evidence, each with the detail it was drawn at, as this machine’s figures and not a device’s', !!file && FR.length === 4, file ? `${FR.length} readings` : why); }
await done();
