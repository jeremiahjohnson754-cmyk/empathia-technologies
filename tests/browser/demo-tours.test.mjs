#!/usr/bin/env node
// Tours A, B and C end to end at 390 / 768 / 1440 in light and dark, plus reduced motion: each stop lands on its route, the panel is
// announced and focusable without trapping, ←/→ and Esc work, pause/resume/skip/exit, the spotlighted element exists and is visible
// when the stop names one, reload resumes the tour, the narration at A5 is not autoplayed and has captions and a transcript; free
// exploration never needs a tour.
//   node tests/browser/demo-tours.test.mjs
import { harness, VIEWPORTS, SCHEMES } from './demo-spaces-lib.mjs';
const { ok, open, done, base } = await harness('demo-tours');
const COUNTS = { a: 10, b: 10, c: 7 };

const runTour = async (t, key, tag) => {
  await t.go(`#/tours/${key}`, 500);
  const seen = []; const bad = [];
  for (let i = 0; i < COUNTS[key]; i += 1) {
    const v = await t.page.evaluate(() => { const g = document.querySelector('[data-testid="guided"]'); const s = document.querySelector('.tour-spot'); const r = s?.getBoundingClientRect(); return { head: g?.querySelector('.tour__k')?.textContent || '', title: g?.querySelector('.tour__title')?.textContent || '', status: g?.querySelector('[role="status"]')?.textContent || '', hash: location.hash, spot: s ? { w: r.width, h: r.height } : null }; });
    seen.push(v.title);
    if (!new RegExp(`stop ${i + 1} of ${COUNTS[key]}`).test(v.head) || !v.status.includes(v.title)) bad.push(`${i + 1}: ${JSON.stringify(v)}`);
    if (v.spot && !(v.spot.w > 0 && v.spot.h > 0)) bad.push(`${i + 1}: spotlight not visible`);
    if (i < COUNTS[key] - 1) { await t.page.click('[data-testid="guided"] button:has-text("Next")'); await t.page.waitForTimeout(450); }
  }
  ok(`TR-${tag}-${key}-01`, `tour ${key.toUpperCase()} runs end to end (${COUNTS[key]} stops), each announced, spotlights visible`, !bad.length && new Set(seen).size === COUNTS[key], bad.slice(0, 2).join(' | '));
  await t.page.click('[data-testid="guided"] button:has-text("Finish")'); await t.page.waitForTimeout(150);
  ok(`TR-${tag}-${key}-02`, 'Finish leaves the tour and the visitor explores freely', (await t.page.locator('[data-testid="guided"]').count()) === 0 && (await t.page.locator('main').count()) === 1);
};

for (const scheme of SCHEMES) for (const vp of VIEWPORTS) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/tours' });
  ok(`TR-${tag}-00`, 'the tours page offers three tours and free exploration', (await t.page.locator('[data-testid^="tour-start-"]').count()) === 3 && /explore on your own/.test(await t.text()));
  for (const key of ['a', 'b', 'c']) await runTour(t, key, tag);
  // controls: keyboard, pause/resume, skip, reload resumes, Esc exits
  await t.go('#/tours/a', 500);
  await t.page.locator('[data-testid="guided"]').focus(); await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(400);
  ok(`TR-${tag}-03`, '→ moves to the next stop', /stop 2 of 10/.test(await t.page.locator('.tour__k').innerText()));
  await t.page.locator('[data-testid="guided"]').focus(); await t.page.keyboard.press('ArrowLeft'); await t.page.waitForTimeout(400);
  ok(`TR-${tag}-04`, '← moves back', /stop 1 of 10/.test(await t.page.locator('.tour__k').innerText()));
  await t.page.click('[data-testid="guided"] button:has-text("Pause")'); await t.page.waitForTimeout(100);
  ok(`TR-${tag}-05`, 'pause collapses the stop and offers Resume', (await t.page.locator('[data-testid="guided"] .tour__title').count()) === 0 && (await t.page.locator('[data-testid="guided"] button:has-text("Resume")').count()) === 1);
  await t.page.click('[data-testid="guided"] button:has-text("Resume")');
  await t.page.selectOption('.tour__skip select', '4'); await t.page.waitForTimeout(600);
  ok(`TR-${tag}-06`, 'skip jumps to a stop (A5, the reference room)', /stop 5 of 10/.test(await t.page.locator('.tour__k').innerText()) && /R-ATL-4-218/.test(await t.page.evaluate(() => location.hash)));
  const narr = await t.page.evaluate(() => { const a = document.querySelector('[data-testid="narration"] audio'); return a ? { paused: a.paused, autoplay: a.autoplay, track: !!a.querySelector('track[kind="captions"]'), transcript: !!document.querySelector('[data-testid="narration"] details') } : null; });
  ok(`TR-${tag}-07`, 'A5 narration: not autoplayed, captions track and transcript present, labelled AI-generated', narr && narr.paused && !narr.autoplay && narr.track && narr.transcript && /AI-generated voice/.test(await t.page.locator('[data-testid="narration"]').innerText()), JSON.stringify(narr));
  const res = await t.page.evaluate(async () => { const r = await fetch('media/narration/tour-a-05.mp3', { method: 'GET' }); const v = await fetch('media/narration/tour-a-05.vtt'); return { mp3: r.status, type: r.headers.get('content-type'), vtt: v.status, vt: (await v.text()).slice(0, 6) }; });
  ok(`TR-${tag}-08`, 'the take and its captions are served from the page’s own origin with the right types', res.mp3 === 200 && /audio\/mpeg/.test(res.type) && res.vtt === 200 && res.vt === 'WEBVTT', JSON.stringify(res));
  await t.page.reload(); await t.page.waitForTimeout(700);
  ok(`TR-${tag}-09`, 'a reload mid-tour resumes at the same stop', /stop 5 of 10/.test(await t.page.locator('.tour__k').innerText().catch(() => '')));
  await t.page.locator('[data-testid="guided"]').focus(); await t.page.keyboard.press('Escape'); await t.page.waitForTimeout(150);
  ok(`TR-${tag}-10`, 'Esc exits the tour', (await t.page.locator('[data-testid="guided"]').count()) === 0);
  await t.go('#/tours/z', 300);
  ok(`TR-${tag}-11`, 'an unknown tour address starts nothing and the page still works', (await t.page.locator('[data-testid="guided"]').count()) === 0 && (await t.page.locator('main h1').count()) >= 1);
  if (vp[2] === 'phone') { await t.go('#/tours/b', 500); const dock = await t.page.evaluate(() => { const r = document.querySelector('[data-testid="guided"]').getBoundingClientRect(); return { bottom: Math.round(r.bottom), vh: innerHeight, pos: getComputedStyle(document.querySelector('[data-testid="guided"]')).position }; }); ok(`TR-${tag}-12`, 'on a phone the panel docks at the bottom', dock.pos === 'fixed' && Math.abs(dock.bottom - dock.vh) <= 2, JSON.stringify(dock)); await t.page.click('[data-testid="guided"] button:has-text("Exit tour")'); }
  ok(`TR-${tag}-13`, 'no horizontal overflow, no page error, no request leaves the page', (await t.overflow()) <= 0 && !t.errs.length && !t.ext.length, [await t.overflow(), ...t.errs, ...t.ext].join(' | '));
  await t.close();
}
{ const t = await open([1440, 900], SCHEMES[0], { hash: '#/tours/a', reducedMotion: 'reduce' }); await t.page.waitForTimeout(600); await t.page.click('[data-testid="guided"] button:has-text("Next")'); await t.page.waitForTimeout(500);
  const tr = await t.page.evaluate(() => { const s = document.querySelector('.tour-spot'); return s ? getComputedStyle(s).transitionDuration : 'none'; });
  ok('TR-reduced-motion', 'under reduced motion the spotlight has no transition', /^(0s|none)/.test(tr) && !t.errs.length, tr); await t.close(); }
// destructive: the narration fails to load (network lost) → the transcript stands in; rapid double-taps on Next never overshoot
{ const t = await open([390, 844], SCHEMES[0], { hash: '#/tours' }); await t.page.route('**/media/narration/**', (r) => r.abort());
  await t.go('#/tours/a?stop=5', 700); await t.page.evaluate(() => document.querySelector('[data-testid="narration"] audio')?.play().catch(() => {})); await t.page.waitForTimeout(800);
  ok('TR-lost-network', 'when the take cannot load, the stop says so and the transcript remains', /could not be loaded/.test(await t.page.locator('[data-testid="narration"]').innerText()) && (await t.page.locator('[data-testid="narration"] details').count()) === 1);
  const next = t.page.locator('[data-testid="guided"] button:has-text("Next")'); for (let i = 0; i < 12; i += 1) await next.click({ timeout: 300 }).catch(() => {});
  await t.page.waitForTimeout(600);
  ok('TR-double-tap', 'rapid taps on Next end on the last stop, never past it, with no error', /stop 10 of 10/.test(await t.page.locator('.tour__k').innerText()) && (await t.page.locator('[data-testid="guided"] button:has-text("Finish")').count()) === 1 && !t.errs.filter((e) => !/narration|ERR_FAILED|net::/.test(e)).length, t.errs.join(' | '));
  await t.close(); }
void base;
await done();
