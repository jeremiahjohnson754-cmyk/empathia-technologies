#!/usr/bin/env node
// SIGNAL Cinematic Story, the first scene (A5, 12 Nov 2026): S01E01 "Ten Seats", Act I, over the canon. The scene opens from the
// chapter; it shows the canon's panel art and captions; Maya's and Ray's lines play their recorded takes (decoded, the clock moves) with
// the canon text on screen; the decision is the story engine's own: option D (the ladder) plays Ray's canon line and opens the choice
// again, and the choice made here (C) is the choice the written story then shows; with the audio refused the scene still plays on
// captions; phone width; no console error, no request leaving the page.
//   node tests/browser/demo-cinematic.test.mjs
import { harness } from './demo-shell-lib.mjs';
import { unlockInit } from './signal-unlock.mjs';
const { ok, open, done } = await harness('demo-cinematic');
for (const [w, tag] of [[1440, 'desktop'], [390, 'phone']]) {
  const t = await open('#/story/s01e01', { init: unlockInit('s01e01'), w, h: 900 }); const p = t.page; await p.waitForSelector('.sg-dec');
  await p.getByTestId('story-cine').click(); await p.getByTestId('sg-cine').waitFor();
  const s0 = await p.getByTestId('sg-cine-shot').evaluate((e) => ({ item: e.dataset.item, art: !!e.querySelector('.sg-cine__art svg'), cap: e.querySelector('.sg-cine__cap')?.textContent || '' }));
  ok(`CN-${tag}-01`, `${tag}: the scene opens on the canon's first shot of Act I with its panel art and caption`, s0.item === '11' && s0.art && /Priya photographs every cable/.test(s0.cap), JSON.stringify(s0));
  await p.getByTestId('sg-cine-next').click(); await p.waitForSelector('[data-testid=sg-cine-line][data-who=maya]');
  const l1 = await p.getByTestId('sg-cine-line').innerText(); await p.waitForTimeout(1200);
  const a1 = await p.evaluate(() => { const a = document.querySelector('.sg-cine audio'); return { src: a.currentSrc.split('/').pop(), t: a.currentTime, d: a.duration }; });
  ok(`CN-${tag}-02`, 'Maya speaks the canon line in her recorded take: the caption is the canon text, the take decodes and its clock moves', /Maya:\s*It.s EQ\. Something.s building up in the mids\. I can cut it\./.test(l1) && a1.src === 'maya-1.mp3' && a1.t > 0.3 && a1.d > 2, `${l1} ${JSON.stringify(a1)}`);
  await p.getByTestId('sg-cine-next').click(); await p.getByTestId('sg-cine-next').click(); await p.getByTestId('sg-cine-dec').waitFor();
  const nextOff = await p.getByTestId('sg-cine-next').isDisabled();
  await p.getByTestId('sg-cine-dec').getByRole('button', { name: /^D\./ }).click(); await p.getByTestId('sg-cine-out').waitFor(); await p.waitForTimeout(900);
  const d = await p.evaluate(() => { const o = document.querySelector('[data-testid=sg-cine-out]'); const a = document.querySelector('.sg-cine audio'); return { ladder: o.dataset.ladder, text: o.textContent, src: a.currentSrc.split('/').pop(), t: a.currentTime, opts: document.querySelectorAll('.sg-cine__opts button').length }; });
  ok(`CN-${tag}-03`, 'the decision holds the scene (Next is off); the ladder plays Ray’s canon line, says it is not yours, and opens the choice again without D', nextOff && d.ladder === 'true' && /Who.s qualified to be under that/.test(d.text) && /overhead-work boundary/.test(d.text) && d.src === 'ray-3.mp3' && d.t > 0.3 && d.opts === 3, JSON.stringify(d));
  await p.getByTestId('sg-cine-dec').getByRole('button', { name: /^C\./ }).click(); await p.waitForSelector('[data-testid=sg-cine-out][data-letter=C]');
  await p.getByTestId('sg-cine-continue').click(); await p.waitForSelector('[data-testid=sg-cine-line][data-who=maya]'); const l2 = await p.getByTestId('sg-cine-line').innerText();
  ok(`CN-${tag}-04`, 'the canonical choice records and the scene goes on to Maya stopping herself, in the canon’s words', /Wait\. If I change it now, I lose what it sounds like now\./.test(l2), l2);
  await p.getByTestId('sg-cine-close').click(); await p.waitForTimeout(400);
  const classic = await p.evaluate(() => { const dec = document.querySelector('.sg-dec[data-decision="BR-S01E01-01"]'); return { done: dec?.dataset.done, text: dec?.textContent || '' }; });
  ok(`CN-${tag}-05`, 'back in the written story, the same decision shows the choice made in the scene (C, changed once from D)', classic.done === 'true' && /A ten-seat map before touching anything/.test(classic.text), classic.text.slice(0, 200));
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`CN-${tag}-06`, 'no overflow, no console error, no request leaving the page', over <= 0 && !t.errs.length && !t.off.length, [over, ...t.errs, ...t.off].slice(0, 4).join(' | '));
  await t.close();
}
// captions-only fallback: the audio is refused, and the scene still plays its lines as captions
{ const t = await open('#/story/s01e01', { init: unlockInit('s01e01'), w: 1440, h: 900 }); const p = t.page;
  await p.route('**/media/signal/**', (r) => r.abort()); await p.waitForSelector('.sg-dec'); await p.getByTestId('story-cine').click(); await p.getByTestId('sg-cine').waitFor();
  await p.getByTestId('sg-cine-next').click(); await p.waitForSelector('[data-testid=sg-cine-line][data-who=maya]'); await p.waitForTimeout(7000);
  const s = await p.getByTestId('sg-cine-shot').evaluate((e) => e.dataset.item);
  ok('CN-fallback', 'with the audio refused, the line stays on screen as a caption for its reading time and the scene moves on by itself', s === '14', s);
  await t.close(); }
await done();
