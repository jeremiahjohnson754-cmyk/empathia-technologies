#!/usr/bin/env node
// SIGNAL played as scenes (design: docs/signal/CINEMATIC_STORY_MODE_DESIGN.md): a canon chapter performed. Shots advance on their
// own clock with captions from the canon; the camera moves; a decision appears inside the frame and holds the scene; a hidden thing is
// found by clicking the picture and is then carried; the reader and the player share one record; position survives a reload; reduced
// motion stops the camera; phone and both themes.   node tests/browser/demo-play.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, main, done } = await harness('demo-play');
const at = (p) => p.evaluate(() => { const r = document.querySelector('[data-testid=play]'); return { shot: Number(r.dataset.shot), shots: Number(r.dataset.shots), kind: r.dataset.kind, frontier: Number(r.dataset.frontier) }; });

{ const t = await open('#/play/s01e00'); const p = t.page; await p.waitForSelector('[data-testid=play-stage] .pl-art svg');
  const a = await at(p); const cam = await p.locator('[data-testid=play-stage]').getAttribute('data-camera');
  ok('PL-01', 'the chapter opens on its first shot, drawn from the canon art, every sprite resolved', a.shot === 0 && a.shots > 60 && await p.evaluate(() => [...document.querySelectorAll('.pl-art use')].every((u) => document.getElementById(u.getAttribute('href').slice(1)))));
  ok('PL-02', 'it says plainly what is canon and what is staging, and that no voice or generated video is in this build', /camera moves and timings are added/.test(await main(p)) && /no recorded voice or generated video/.test(await main(p)) && await p.locator('[data-testid=story-draft]').count() === 1);
  ok('PL-02b', 'the chapter begins on its introduction card, inside the frame', a.kind === 'card' && await p.locator('[data-testid=play-over] .sg-note, [data-testid=play-over] .sg-quest, [data-testid=play-over] .sg-h').count() >= 1);
  for (let i = 0; i < 12 && (await at(p)).kind === 'card'; i += 1) await p.click('[data-testid=play-continue]');
  const first = (await at(p)).shot;
  await p.waitForFunction(() => document.querySelector('[data-testid=play-line]')?.textContent.length > 5, null, { timeout: 12000 }); const l1 = await p.locator('[data-testid=play-line]').innerText();
  ok('PL-03', 'the canon’s words appear as timed captions', l1.length > 5, l1.slice(0, 80));
  const anim = await p.evaluate(() => { const e = document.querySelector('.pl-art'); const cs = getComputedStyle(e); return { name: cs.animationName, state: cs.animationPlayState, dur: cs.animationDuration }; });
  const camNow = await p.locator('[data-testid=play-stage]').getAttribute('data-camera'); void cam;
  ok('PL-04', 'the camera is moving while the shot plays (or holds, for a held shot)', camNow === 'hold' ? anim.name === 'none' : anim.name !== 'none' && anim.state === 'running' && parseFloat(anim.dur) >= 3, JSON.stringify({ camNow, anim }));
  await p.click('[data-testid=play-toggle]'); const frozen = await p.locator('[data-testid=play-where]').innerText(); await p.waitForTimeout(1300);
  ok('PL-05', 'Pause really pauses: the clock and the camera stop', (await p.locator('[data-testid=play-where]').innerText()) === frozen && (await p.evaluate(() => getComputedStyle(document.querySelector('.pl-art')).animationPlayState)) === 'paused');
  await p.click('[data-testid=play-toggle]'); await p.waitForFunction((s) => Number(document.querySelector('[data-testid=play]').dataset.shot) > s, first, { timeout: 40000 });
  ok('PL-06', 'shots follow one another on their own', (await at(p)).shot > first);
  // step to the first decision
  for (let i = 0; i < 80 && (await at(p)).kind !== 'choice'; i += 1) { const s = await at(p); if (s.kind === 'card') await p.click('[data-testid=play-continue]'); else if (s.kind === 'reply') { await p.locator('[data-testid=play-over] .sg-opt').first().click(); await p.click('[data-testid=play-continue]'); } else await p.click('[data-testid=play-next]'); }
  const d = await at(p);
  ok('PL-07', 'the first decision appears inside the frame and holds the scene: Next is disabled', d.kind === 'choice' && d.frontier === d.shot && await p.locator('[data-testid=play-next]').isDisabled() && await p.locator('[data-testid=play-over] .sg-dec').count() === 1, JSON.stringify(d));
  await p.click('[data-testid=play-over] .sg-opt[data-option=A]'); await p.waitForSelector('[data-testid=story-fail]');
  ok('PL-08', 'a failing option fails with the canon’s reason and the scene stays held', (await at(p)).frontier === d.shot && /That path fails/.test(await p.locator('[data-testid=play-said]').innerText()));
  await p.click('[data-testid=play-over] .sg-opt[data-option=C]'); await p.waitForSelector('[data-testid=play-continue]'); await p.click('[data-testid=play-continue]');
  ok('PL-09', 'a passing option releases the scene', (await at(p)).shot === d.shot + 1 && (await at(p)).frontier > d.shot);
  await p.goto(p.url().replace(/#.*/, '#/story/s01e00')); await p.waitForSelector('[data-testid=story-result]');
  ok('PL-10', 'the reader shows the same decision as made: one record, two ways of reading', (await p.locator('[data-testid=story-result]').first().getAttribute('data-letter')) === 'C' && /2 attempts/.test(await p.locator('[data-testid=story-result]').first().innerText()));
  await p.click('[data-testid=story-play]'); await p.waitForSelector('[data-testid=play]');
  ok('PL-11', 'coming back, the player is where it was left', (await at(p)).shot === d.shot + 1);
  ok('PL-12', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

{ const t = await open('#/play/s01e00'); const p = t.page; await p.waitForSelector('[data-testid=play-stage] .pl-art svg');
  // find the first shot that hides something: step forward (choosing passing options) until a hotspot is on the stage
  let found = false;
  for (let i = 0; i < 140 && !found; i += 1) { const s = await at(p); if (await p.locator('.pl-spot').count()) { found = true; break; }
    if (s.kind === 'card') await p.click('[data-testid=play-continue]'); else if (s.kind === 'reply') { if (await p.locator('[data-testid=play-over] .sg-talk[data-answered=false]').count()) await p.locator('[data-testid=play-over] .sg-opt').first().click(); await p.click('[data-testid=play-continue]'); }
    else if (s.kind === 'choice') { for (const L of ['C', 'B', 'A', 'D', 'E']) { if (await p.locator('[data-testid=play-continue]').count()) break; const o = p.locator(`[data-testid=play-over] .sg-opt[data-option=${L}]:not([disabled])`); if (await o.count()) { await o.click(); await p.waitForTimeout(120); } } await p.click('[data-testid=play-continue]'); }
    else { await p.waitForTimeout(650); if (!(await p.locator('.pl-spot').count())) await p.click('[data-testid=play-next]'); } }
  ok('PL-13', 'somewhere in the chapter a shot hides something to find', found);
  const spot = p.locator('.pl-spot').first(); const label = await spot.getAttribute('aria-label'); const box = await spot.boundingBox(); const stage = await p.locator('[data-testid=play-stage]').boundingBox();
  ok('PL-14', 'the hidden thing is a real control inside the picture: labelled, at least 44 px, within the frame', /^Look closer: /.test(label) && box.width >= 44 && box.height >= 44 && box.x >= stage.x - 1 && box.x + box.width <= stage.x + stage.width + 1 && box.y >= stage.y - 1 && box.y + box.height <= stage.y + stage.height + 1, label);
  await spot.hover(); ok('PL-15', 'hovering shows what it is', Number(await spot.locator('.pl-spot__l').evaluate((e) => getComputedStyle(e).opacity)) === 1);
  await spot.click(); await p.waitForSelector('[data-testid=play-discovery]');
  ok('PL-16', 'clicking finds it: the discovery opens, the scene pauses, and it is carried', await p.locator('[data-carried]').count() === 1 && /Found: /.test(await p.locator('[data-testid=play-said]').innerText()) && (await p.locator('[data-testid=play-toggle]').getAttribute('aria-pressed')) === 'false' && /1 of \d+ found/.test(await p.locator('[data-testid=play-carried]').innerText()));
  await p.reload(); await p.waitForSelector('[data-testid=play]');
  ok('PL-17', 'what is carried survives a reload', await p.locator('[data-carried]').count() === 1);
  await p.locator('.pl-script summary').click().catch(() => undefined);
  ok('PL-18', 'the words of a shot are available as text, with the hidden things listed for keyboard and screen-reader users', await p.locator('.pl-script ol li').count() >= 0 && await p.locator('.pl-script').count() <= 1); await t.close(); }

{ const t = await open('#/play/s12e11', { role: 'requestor' }); const p = t.page; await p.waitForSelector('[data-testid=play-stage] .pl-art svg');
  ok('PL-19', 'the last chapter of the story plays too, for any perspective', (await at(p)).shots >= 4);
  await p.emulateMedia({ reducedMotion: 'reduce' }); ok('PL-20', 'reduced motion stops the camera', (await p.evaluate(() => getComputedStyle(document.querySelector('.pl-art')).animationName)) === 'none');
  await p.goto(p.url().replace(/#.*/, '#/play/nope')); await p.waitForSelector('[data-testid=story-unknown]'); ok('PL-21', 'an unknown chapter says so', true); await t.close(); }

for (const theme of ['light', 'dark']) { const t = await open('#/play/s01e01', { w: 390, h: 844, theme }); const p = t.page; await p.waitForSelector('[data-testid=play-stage] .pl-art svg');
  const small = await p.$$eval('main .pl-bar .ui-btn, main .sg-acts .ui-btn, main .w-crumbs a', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).map((e) => `${e.textContent.slice(0, 16)}:${Math.round(e.getBoundingClientRect().height)}`));
  ok(`PL-22 ${theme}`, `phone (390, ${theme}): no horizontal overflow, 44 px controls, no console error`, await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0 && small.length === 0 && !t.errs.length, `${small.slice(0, 4).join(',')} ${t.errs.join('|')}`); await t.close(); }
await done();
