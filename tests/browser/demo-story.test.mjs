#!/usr/bin/env node
// SIGNAL story (Surpass §13, W14): the founder's canon read in the product. The library shows the canon's own counts; a chapter draws
// its panels from the canon's art; a decision gates the story until a choice is recorded, and every choice counts, a costly one too
// (restored 11 Nov 2026 to the founder's build package: ST-13, ST-14, ST-18 changed with it); a missed clock is recorded and can be
// replayed; the previous chapter's choices open the next; hints, conversations and discoveries work;
// progress survives a reload and can be replayed; the last season opens too; review flags are shown; phone, keyboard, both themes;
// no console error and no request leaving the page.   node tests/browser/demo-story.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, main, done } = await harness('demo-story');
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const reader = (p) => p.evaluate(() => { const r = document.querySelector('[data-testid=story-reader]'); return { reached: Number(r.dataset.reached), items: Number(r.dataset.items), panels: document.querySelectorAll('.sg-panel').length, drawn: [...document.querySelectorAll('.sg-art')].filter((a) => a.querySelector('svg use, svg rect')).length, missing: [...document.querySelectorAll('.sg-art use, .sg-face use')].filter((u) => !document.getElementById(u.getAttribute('href').slice(1))).length }; });

{ const t = await open('#/story'); const p = t.page; await p.waitForSelector('[data-testid=story-library]');
  const s = await p.evaluate(() => ({ stats: document.querySelector('[data-testid=story-stats]').innerText.replace(/\s+/g, ' '), seasons: [...document.querySelectorAll('.sg-season')].map((b) => b.querySelector('.sg-season__t').textContent), draft: document.querySelectorAll('[data-testid=story-draft]').length, cta: document.querySelector('[data-testid=story-continue]').textContent, text: document.querySelector('main').innerText }));
  ok('ST-01', 'the library shows the canon’s own counts: 133 chapters, 12 seasons, 1,610 panels, 387 decisions, 121 quests', /133 chapters 12 seasons 1,610 panels 387 decisions 121 quests/.test(s.stats), s.stats);
  ok('ST-02', 'the twelve seasons carry the founder’s names, in order, after the Prologue', s.seasons.slice(1).join('|') === 'The Sanctuary|The Load-In|The Workplace|On Air|The Campus|The Drawing Set|The Estate|Topping Out|Breach|The Take|The Mission Room|Principal', s.seasons.join('|'));
  ok('ST-03', 'it is labelled a draft under review, with the 318 open review points and the free-through-Season-2 rule', s.draft === 1 && /318 review points/.test(s.text) && /free through Season 2/.test(s.text) && /not a credential/.test(s.text));
  ok('ST-04', 'a new reader starts at the Prologue', /Start at the Prologue/.test(s.cta) && (await p.locator('[data-testid=story-continue]').getAttribute('href')) === '#/story/pro01');
  await p.click('.sg-season[data-season="12"]'); const last = await p.$$eval('[data-testid=story-chapters] a', (a) => a.map((x) => x.dataset.chapter));
  ok('ST-05', 'Season 12 lists its eleven chapters', last.length === 11 && last[0] === 's12e01' && last[10] === 's12e11' && (await p.locator('.sg-season[data-season="12"]').getAttribute('aria-pressed')) === 'true', last.join(','));
  ok('ST-06', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

{ const t = await open('#/story/s01e00'); const p = t.page; await p.waitForSelector('.sg-dec'); await p.waitForFunction(() => document.querySelector('.sg-art svg'));
  const a = await reader(p); const text = await main(p);
  ok('ST-07', 'the chapter opens with its panels drawn from the canon’s art, every sprite resolved', a.panels >= 5 && a.drawn === a.panels && a.missing === 0, JSON.stringify(a));
  ok('ST-08', 'the story stops at the first decision: later moments are not in the page', a.reached < a.items && await p.locator('.sg-dec').count() === 1 && await p.locator('[data-testid=story-waiting]').count() === 1 && !/The computer isn't broken/.test(text), `${a.reached}/${a.items}`);
  ok('ST-09', 'the pictures have text equivalents and the dialogue is real text', (await p.$$eval('.sg-art', (e) => e.every((x) => x.getAttribute('role') === 'img' && x.getAttribute('aria-label').length > 20))) && await p.locator('.sg-bubble').count() >= 3);
  ok('ST-10', 'review flags are shown, not hidden: on the chapter and on its panels', await p.locator('[data-testid=story-flags]').count() === 1 && await p.locator('.sg-flagline').count() >= 1);
  // Changed 11 Nov 2026 (reference build): the clock starts only when the card is in view, and restarts if it leaves the screen.
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300); const idle = await p.locator('[data-testid=story-clock]').getAttribute('data-running');
  await p.locator('.sg-dec').first().scrollIntoViewIfNeeded(); await p.waitForSelector('[data-testid=story-clock][data-running=true]');
  const clock0 = Number(await p.locator('[data-testid=story-clock]').getAttribute('data-left')); await p.waitForTimeout(2200); const clock1 = Number(await p.locator('[data-testid=story-clock]').getAttribute('data-left'));
  ok('ST-11', 'the decision clock waits until the card is in view, then counts down', idle === 'false' && clock0 > 0 && clock1 < clock0 && clock1 >= clock0 - 4, `${idle} ${clock0} → ${clock1}`);
  await p.click('[data-testid=story-hint]'); ok('ST-12', 'a hint can be taken and says what it costs', await p.locator('.sg-hint').count() === 1 && /keeps 85% of the merit/.test(await p.locator('[data-testid=story-hint]').innerText()));
  // Changed 11 Nov 2026 (restoration to the reference build, docs/04-engine-specs.md §1): a failing option used to be refused while the
  // story waited; in the canon it is recorded as a costly call, with its merit and trust, and the story goes on with it.
  await p.click('.sg-opt[data-option=A]'); await p.waitForSelector('[data-testid=story-result][data-verdict=costly]');
  const f = await reader(p); const fw = await p.locator('[data-testid=story-weight]').first().innerText();
  ok('ST-13', 'a failing option is recorded as a costly call: it says why it costs, what it weighs (merit −4, Walter’s trust down), and the story goes on with it', /erased the receive history/.test(await p.locator('[data-testid=story-result]').innerText()) && /Merit -4/.test(fw) && /Walter -2/.test(fw) && /This will cost you/.test(fw) && f.reached > a.reached && /a costly call/.test(await p.locator('[data-testid=story-said]').innerText()), `${a.reached} → ${f.reached} ${fw}`);
  await p.click('.sg-dec[data-decision=BR-S01E00-02] .sg-opt[data-option=C]'); await p.waitForSelector('[data-testid=story-result][data-letter=C]');
  const b = await reader(p); const bt = await p.locator('[data-testid=story-result][data-letter=C]').innerText();
  ok('ST-14', 'tapping another option replaces the choice and keeps the first: the professional call is marked, with its weight', b.reached === f.reached && /The professional call/.test(bt) && /Merit \+4/.test(bt) && /First choice A, changed once · 1 hint/.test(bt) && b.missing === 0, `${bt.slice(-200)}`);
  const tk = p.locator('.sg-talk[data-answered=false]').first(); if (await tk.count()) { await tk.locator('.sg-opt').first().click(); }
  ok('ST-15', 'a conversation reply is answered in character and moves trust', await p.locator('.sg-talk[data-answered=true] .sg-reply').count() >= 1 || await p.locator('.sg-talk').count() === 0);
  const dz = p.locator('.sg-disc[data-found=false] button').first(); const had = await dz.count(); if (had) await dz.click();
  ok('ST-16', 'a discovery is found by looking', !had || await p.locator('.sg-disc[data-found=true]').count() >= 1);
  await p.reload(); await p.waitForSelector('[data-testid=story-result][data-letter=C]'); const c = await reader(p);
  ok('ST-17', 'progress survives a reload: the decision stays made and the reader is where they were', c.reached === b.reached && await p.locator('[data-testid=story-result]').count() >= 1, `${c.reached}`);
  // Changed 11 Nov 2026 with ST-13: one choice per decision plays the chapter through, whatever it is. Here the first option each time.
  // Changed again 11 Nov 2026 when quizzes and lessons began to hold the story as the reference's soft gates: the walk now also skips
  // each soft gate it meets ("Skip for now"), which is what a reader who wants only the story does. ST-35..ST-41 play them instead.
  for (let i = 0; i < 24 && !(await p.locator('[data-testid=story-summary]').count()); i += 1) {
    const kind = await p.locator('[data-testid=story-waiting]').getAttribute('data-kind').catch(() => null);
    if (kind && kind !== 'decision') await p.locator('.sg-piece[data-cleared=false] [data-testid=story-skip]').last().click();
    else if (await p.locator('.sg-dec[data-done=false]').count()) await p.locator('.sg-dec[data-done=false]').first().locator('.sg-opt').first().click();
    await p.waitForTimeout(150); }
  await p.waitForSelector('[data-testid=story-summary]', { timeout: 15000 }); const e = await reader(p); const sum = await p.locator('[data-testid=story-summary]').innerText();
  ok('ST-18', 'the chapter plays to its end on one choice per decision, costly ones included', e.reached === e.items && await p.locator('.sg-dec[data-done=false]').count() === 0, `${e.reached}/${e.items}`);
  ok('ST-19', 'the end of the chapter says what the choices added up to, from the canon’s weights, gives the reference’s verdict, and offers the next chapter', /3 of 3 decisions made/.test(sum) && await p.locator('[data-testid=story-counts]').getAttribute('data-costly') === '1' && /Mostly steady, one costly call/.test(await p.locator('[data-testid=story-verdict]').innerText()) && /^[+-]?\d+$/.test(await p.locator('[data-testid=story-merit]').innerText()) && (await p.locator('[data-testid=story-next]').getAttribute('href')) === '#/story/s01e01', sum);
  await p.click('[data-testid=story-next]'); await p.waitForSelector('[data-testid=story-echo][data-made="3"]'); const echo = await p.locator('[data-testid=story-echo]').innerText();
  ok('ST-19b', 'the next chapter opens with the previous one’s choices, each marked, and the merit and trust carried in (the reference’s echoes)', /Previously: your choices in /.test(echo) && (echo.match(/^[★✕◦⏱]/gm) || []).length === 3 && /Merit carried in: [+-]?\d+/.test(echo), echo.slice(0, 300));
  await p.goto(p.url().replace(/#.*/, '#/story/s01e00')); await p.waitForSelector('[data-testid=story-echo]');
  await p.goto(p.url().replace(/#.*/, '#/story')); await p.waitForSelector('[data-testid=story-library]');
  ok('ST-20', 'the library remembers: it offers to continue, and marks the chapter read', /^Continue/.test(await p.locator('[data-testid=story-continue]').innerText()) && /Read/.test(await p.locator('[data-chapter=s01e00]').innerText()));
  await p.goto(p.url().replace(/#.*/, '#/story/s01e00')); await p.waitForSelector('[data-testid=story-replay]'); await p.click('[data-testid=story-replay]'); await p.waitForSelector('[data-testid=story-waiting]');
  ok('ST-21', 'a chapter can be replayed: its choices are forgotten and the story waits again', (await reader(p)).reached === a.reached && await p.locator('[data-testid=story-result]').count() === 0);
  await p.check('[data-testid=story-gates]'); await p.waitForFunction(() => { const r = document.querySelector('[data-testid=story-reader]'); return r.dataset.reached === r.dataset.items; });
  ok('ST-22', 'a reviewer can show the whole chapter without waiting for decisions', await p.locator('.sg-dec').count() >= 2);
  await p.click('.w-pick__b:has-text("No clock")'); ok('ST-23', 'the clock can be turned off, as the canon allows', await p.locator('[data-testid=story-clock]').count() === 0);
  ok('ST-24', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

{ const t = await open('#/story/s12e11'); const p = t.page; await p.waitForFunction(() => document.querySelector('.sg-art svg')); const a = await reader(p);
  ok('ST-25', 'the last chapter of Season 12 opens and draws', a.panels >= 1 && a.drawn === a.panels && a.missing === 0 && /The Inheritance, Live/.test(await p.locator('main h1').innerText()), JSON.stringify(a));
  await p.goto(p.url().replace(/#.*/, '#/story/nope')); await p.waitForSelector('[data-testid=story-unknown]'); ok('ST-26', 'an unknown chapter says so', true);
  ok('ST-27', 'the page has no inline style or script from the story (content policy holds)', await p.evaluate(() => document.querySelectorAll('main [style], main script, #sg-defs script, #sg-defs style').length === 0) && !t.errs.some((e) => /Content Security Policy/i.test(e)), t.errs.join('|')); await t.close(); }

{ const t = await open('#/story/s06e03', { role: 'requestor' }); const p = t.page; await p.waitForFunction(() => document.querySelector('.sg-art svg') || document.querySelector('.sg-dec'));
  ok('ST-28', 'the story is open to every perspective (here the Requestor), mid-canon', await p.locator('[data-testid=story-reader]').count() === 1 && (await reader(p)).missing === 0);
  await p.keyboard.press('Tab'); const dec = p.locator('.sg-dec .sg-opt').first(); await dec.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  ok('ST-29', 'options are buttons: the keyboard chooses', await p.locator('[data-testid=story-result]').count() >= 1); await t.close(); }

{ const t = await open('#/story/s01e00'); const p = t.page; await p.clock.install(); await p.reload(); await p.waitForSelector('[data-testid=story-clock]'); await p.locator('.sg-dec').first().scrollIntoViewIfNeeded(); await p.clock.runFor(200); await p.waitForSelector('[data-testid=story-clock][data-running=true]');
  await p.clock.runFor(31000); await p.waitForSelector('[data-testid=story-timeout]'); const r = await reader(p); const tw = await p.locator('.sg-dec[data-decision=BR-S01E00-02] [data-testid=story-weight]').innerText();
  ok('ST-31', 'when the clock runs out the decision is recorded as missed (merit −2), the story goes on, and the canon’s timeout words are shown', /Time ran out/.test(await p.locator('[data-testid=story-timeout]').innerText()) && /Merit -2/.test(tw) && (await p.locator('.sg-dec[data-decision=BR-S01E00-02]').getAttribute('data-done')) === 'true' && r.reached > 0 && await p.locator('[data-testid=story-waiting][data-kind=quiz]').count() === 1, tw);   // changed 11 Nov 2026: the story now goes on to the soft twist test, not straight to the next decision
  await p.click('.sg-dec[data-decision=BR-S01E00-02] .sg-opt[data-option=C]'); const rv = await p.locator('[data-testid=story-result][data-review=true]').innerText();
  ok('ST-32', 'after the clock an option shows what it would have meant, and does not count', /would have been/.test(rv) && /It doesn’t count/.test(rv) && JSON.parse(await p.evaluate(() => localStorage.getItem('empathia.signal.story.v1'))).chapters.s01e00.choices['BR-S01E00-02'].letter === 'TIMEOUT');
  await p.click('[data-testid=story-replay-decision]'); await p.waitForSelector('.sg-dec[data-decision=BR-S01E00-02][data-done=false] [data-testid=story-clock]'); await p.click('.sg-dec[data-decision=BR-S01E00-02] .sg-opt[data-option=C]'); await p.waitForSelector('[data-testid=story-result][data-letter=C][data-review=false]');
  ok('ST-33', 'Replay reopens the decision with its clock, and a choice then counts', JSON.parse(await p.evaluate(() => localStorage.getItem('empathia.signal.story.v1'))).chapters.s01e00.choices['BR-S01E00-02'].letter === 'C');
  ok('ST-34', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

// Restored 11 Nov 2026: quizzes and lessons are played inside the story and hold it as the reference's gates do (soft: the pages wait,
// or "Skip for now"; optional: there to do, never holding). The answers come from the chapter's own pieces file, as the page reads them.
{ const t = await open('#/story/s01e00'); const p = t.page; await p.waitForSelector('.sg-dec[data-decision=BR-S01E00-02]');
  const pc = await p.evaluate(async () => (await fetch('signal/pieces/s01e00.json')).json());
  await p.click('.sg-dec[data-decision=BR-S01E00-02] .sg-opt[data-option=C]'); await p.waitForSelector('[data-testid=story-waiting][data-kind=quiz]');
  const w = await p.locator('[data-testid=story-waiting]').innerText(); const q = p.locator('[data-testid=story-quiz][data-quiz=Q-TW-S01E00-R]');
  ok('ST-35', 'after the decision the twist test holds the story as a soft gate: it says what to do, offers to skip, and nothing after it shows', /Answer every question/.test(w) && /skip/i.test(w) && await q.count() === 1 && (await p.locator('.sg-piece[data-piece=Q-TW-S01E00-R]').getAttribute('data-tier')) === 'soft' && await p.locator('.sg-dec[data-decision=BR-S01E00-03]').count() === 0, w);
  const qs = pc.quizzes['Q-TW-S01E00-R'].qs; for (let i = 0; i < qs.length; i += 1) { await q.locator('.sg-qopts').nth(i).locator('.sg-qopt').nth(qs[i].a).click(); }
  await p.waitForSelector('[data-testid=story-quiz-score]'); const sc = await p.locator('[data-testid=story-quiz-score]').innerText();
  ok('ST-36', 'answering every question marks each right answer, gives the score, records it, and releases the story', new RegExp(`Score ${qs.length} of ${qs.length}`).test(sc) && await q.locator('.sg-qopt[data-state=right]').count() === qs.length && await p.locator('.sg-why').count() >= qs.length && JSON.parse(await p.evaluate(() => localStorage.getItem('empathia.signal.story.v1'))).quizzes['Q-TW-S01E00-R'].first === qs.length && await p.locator('.sg-dec[data-decision=BR-S01E00-03]').count() === 1, sc);
  await p.reload(); await p.waitForSelector('[data-testid=story-quiz-rec]');
  ok('ST-37', 'the quiz record survives a reload: the story stays released and the earlier score is shown, the first score kept', /best \d+ of \d+, first \d+/.test(await p.locator('[data-testid=story-quiz-rec]').innerText()) && await p.locator('.sg-dec[data-decision=BR-S01E00-03]').count() === 1);
  for (const d of ['BR-S01E00-03', 'BR-S01E00-04']) { await p.locator(`.sg-dec[data-decision=${d}] .sg-opt`).first().click(); await p.waitForTimeout(150); }
  await p.waitForSelector('[data-testid=story-waiting][data-kind=lesson]'); const L = p.locator('.sg-piece[data-piece=FB1]');
  const lt = await L.innerText();
  ok('ST-38', 'the fieldbook lesson renders in place, its formulas as code and no markup shown as text, with its check below', await L.locator('code.sg-formula').count() >= 1 && !/<\/?(b|i|sub|sup|span)\b/.test(lt) && await L.locator('[data-testid=story-quiz]').count() === 1 && /Finish the lesson check/.test(await p.locator('[data-testid=story-waiting]').innerText()), lt.slice(0, 160));
  await L.locator('[data-testid=story-skip]').click(); await p.waitForFunction(() => document.querySelector('.sg-piece[data-piece=FB1]')?.dataset.cleared === 'true');
  ok('ST-39', '"Skip for now" clears a soft gate, is remembered, and the story goes on past it', JSON.parse(await p.evaluate(() => localStorage.getItem('empathia.signal.story.v1'))).skips['lesson:FB1'] === 1 && await p.locator('[data-testid=story-waiting][data-kind=lesson]').count() === 0 && await p.locator('[data-testid=story-skip]').count() === 0);
  const opt = p.locator('.sg-piece[data-piece=Q-UX-S01E00]');
  ok('ST-40', 'pieces of other kinds are shown and said not to hold the story yet; optional checks are offered without holding; the note says which kinds play', /decisions, quizzes, lessons/.test(await p.locator('[data-testid=story-gate-note]').innerText()) /* note widened 11 Nov 2026 when drills joined: ST-45 */ && (await opt.count() === 0 || (await opt.getAttribute('data-tier')) === 'opt') && await p.locator('.sg-mount[data-kind=lab] a[href^="#/learn/labs/"]').count() >= 1);   // changed 11 Nov 2026: with incidents playable, this chapter's only unplayed piece is its lab, which links to Learn
  ok('ST-41', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

// Restored 11 Nov 2026: practice drills are played inside the story on the reference's rules (packages/ui/src/drills.ts), on the
// story's clock. A hard drill (the chapter's core skill) holds the story until a try is recorded, passed or not, as gate.js has it.
{ const t = await open('#/story/s01e01'); const p = t.page; await p.waitForSelector('.sg-dec');
  const pc = await p.evaluate(async () => (await fetch('signal/pieces/s01e01.json')).json());
  for (let i = 0; i < 12 && !(await p.locator('[data-testid=story-waiting][data-kind=drill]').count()); i += 1) {
    const kind = await p.locator('[data-testid=story-waiting]').getAttribute('data-kind');
    if (kind && kind !== 'decision') await p.locator('.sg-piece[data-cleared=false] [data-testid=story-skip]').last().click();
    else await p.locator('.sg-dec[data-done=false]').first().locator('.sg-opt').first().click();
    await p.waitForTimeout(150); }
  const dr = p.locator('.sg-piece[data-piece=C-01]'); const w = await p.locator('[data-testid=story-waiting]').innerText();
  ok('ST-43', 'the chapter’s core drill holds the story as a hard gate: no skip, "Finish the drill", and the brief is read before the clock starts', /Finish the drill/.test(w) && !/skip/i.test(w) && (await dr.getAttribute('data-tier')) === 'hard' && await dr.locator('[data-testid=story-skip]').count() === 0 && /core skill/.test(await dr.locator('[data-testid=story-tier]').innerText()) && (await dr.locator('[data-testid=drill]').getAttribute('data-state')) === 'ready' && /Start the clock \(1:20\)/.test(await dr.innerText()), w);
  await dr.getByRole('button', { name: /Start the clock/ }).click(); await dr.locator('[data-testid=drill][data-state=running]').waitFor();
  const d = pc.drills['C-01']; for (const c of d.clues.filter((x) => x.k === 'key').slice(0, d.pick)) await dr.getByRole('button', { name: c.t, exact: true }).click();
  await dr.getByRole('button', { name: 'Submit clues' }).click(); await dr.locator('[data-testid=drill-verdict]').waitFor(); const v = await dr.locator('[data-testid=drill-verdict]').innerText();
  const st = JSON.parse(await p.evaluate(() => localStorage.getItem('empathia.signal.story.v1')));
  ok('ST-44', 'picking the key clues passes: each picked card is marked and explained, the try is recorded as passed, and the story goes on', /Passed · 3 discriminating clues/.test(v) && (await dr.locator('.dr__lines li').allInnerTexts()).filter((x) => /^✓ /.test(x)).length === 3 && await dr.locator('.dr__btn[data-state=right]').count() === 3 && st.drills['C-01'].passed === true && st.drills['C-01'].first === true && (await dr.getAttribute('data-cleared')) === 'true' && await p.locator('[data-testid=story-waiting][data-kind=drill]').count() === 0, v.slice(0, 200));
  ok('ST-45', 'the gate note now names drills among what plays in the story', /decisions, quizzes, lessons, drills/.test(   /* widened 11 Nov 2026 when incidents joined: ST-60 */ await p.locator('[data-testid=story-gate-note]').innerText()));
  ok('ST-46', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

{ const t = await open('#/story/s01e00'); const p = t.page; await p.waitForSelector('.sg-dec'); await p.check('[data-testid=story-gates]'); await p.click('.w-pick__b:has-text("No clock")');
  const ff = p.locator('.sg-piece[data-piece=F-02]'); await ff.waitFor(); const pc = await p.evaluate(async () => (await fetch('signal/pieces/s01e00.json')).json()); const ans = pc.drills['F-02'].answer;
  ok('ST-47', 'with the clock off a drill opens straight away, untimed; an optional drill never holds the story', (await ff.locator('[data-testid=drill]').getAttribute('data-state')) === 'running' && await ff.locator('[data-testid=drill-clock]').count() === 0 && (await ff.getAttribute('data-tier')) === 'opt');
  await ff.locator('.learn__stages button').nth((ans + 1) % 3).click(); await ff.locator('[data-testid=drill-verdict][data-pass=false]').waitFor(); const v1 = await ff.locator('[data-testid=drill-verdict]').innerText();
  ok('ST-48', 'a wrong stage fails the try, says why and where the first failure really is, marks both, and offers Try again', /Failed · wrong stage/.test(v1) && /The first failure is at /.test(v1) && await ff.locator('.learn__stages button[data-state=right]').count() === 1 && await ff.locator('.learn__stages button[data-state=wrong]').count() === 1 && await ff.getByRole('button', { name: 'Try again' }).count() === 1, v1.slice(0, 200));
  await ff.getByRole('button', { name: 'Try again' }).click(); await ff.locator('.learn__stages button').nth(ans).click(); await ff.locator('[data-testid=drill-verdict][data-pass=true]').waitFor();
  const r = JSON.parse(await p.evaluate(() => localStorage.getItem('empathia.signal.story.v1'))).drills['F-02'];
  ok('ST-49', 'trying again and passing records it as the reference does: passed, two tries, the first try kept as not passed', r.passed === true && r.tries === 2 && r.first === false && /Passed · 2 tries · first try not passed/.test(await ff.locator('[data-testid=story-drill-rec]').innerText()), JSON.stringify(r));
  await p.click('.w-pick__b:has-text("Clock on")'); const c2 = p.locator('.sg-piece[data-piece=C-02]'); await p.clock.install(); await c2.getByRole('button', { name: /Start the clock/ }).click();
  await p.clock.runFor(81000); await c2.locator('[data-testid=drill-verdict][data-pass=false]').waitFor(); const v2 = await c2.locator('[data-testid=drill-verdict]').innerText();
  ok('ST-50', 'when the drill’s clock runs out the try fails with the reference’s words and is recorded', /the clock ran out/i.test(v2) && /not deciding is still a decision/.test(v2) && JSON.parse(await p.evaluate(() => localStorage.getItem('empathia.signal.story.v1'))).drills['C-02'].passed === false, v2.slice(0, 200));
  ok('ST-51', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

// Restored 11 Nov 2026: live incidents (Service Mode) play inside the story on the reference's rules (packages/ui/src/incidents.ts).
// The path is the build package's own solver record for SM-01 (qa/incident-paths.json), read from the canon as the unit tests read it.
{ const fs = await import('node:fs'); const P = JSON.parse(fs.readFileSync(new URL('../../packages/signal-canon/data/qa/incident-paths.json', import.meta.url), 'utf8'))['SM-01'];
  const t = await open('#/story/s01e00'); const p = t.page; await p.waitForSelector('.sg-dec'); await p.check('[data-testid=story-gates]');
  const pc = await p.evaluate(async () => (await fetch('signal/pieces/s01e00.json')).json()); const inc = pc.incidents['SM-01'];
  const box = p.locator('.sg-piece[data-piece=SM-01]'); await box.waitFor(); const r = box.locator('[data-testid=incident]');
  ok('ST-53', 'an incident opens on its briefing with the clock set and the actions locked until Start', (await r.getAttribute('data-state')) === 'ready' && /4:05/.test(await r.locator('[data-testid=incident-clock]').innerText()) && await r.locator('[data-testid=incident-actions]').count() === 0 && /Actions unlock when you start/.test(await r.innerText()));
  await r.getByRole('button', { name: /Start the incident/ }).click(); await r.locator('[data-testid=incident-actions]').waitFor();
  const secs = async () => { const [m, x] = (await r.locator('[data-testid=incident-clock] b').innerText()).split(':').map(Number); return m * 60 + x; };
  const before = await secs(); await r.locator('[data-action=office]').click(); await p.waitForTimeout(100); const after = await secs();
  ok('ST-54', 'a refusal says why, spends its time, counts as a boundary test, and cannot be used again', before - after >= 10 && await r.locator('[data-action=office]').isDisabled() && /Whose network is that/.test(await r.locator('.in__log').innerText()), `${before} → ${after}`);
  for (const id of P.path) { const a = inc.actions.find((x) => x.id === id); await r.locator(`[data-action=${id}]`).click();
    if (a.calc) { const c = r.locator('[data-testid=incident-calc]'); await c.locator('input').fill(String(a.calc.answer * 3 + 7)); await c.getByRole('button', { name: 'Submit' }).click(); await c.getByText(/Not right/).waitFor();
      ok('ST-55', 'a wrong calculation costs its penalty and does not run the action; the right one runs it', !(await r.locator('[data-action=' + id + ']').isDisabled()) && /Wrong:/.test(await r.locator('.in__log').innerText()));
      await c.locator('input').fill(String(a.calc.answer)); await c.getByRole('button', { name: 'Submit' }).click(); await c.waitFor({ state: 'detached' }); }
    await p.waitForTimeout(60); }
  await r.locator('[data-testid=incident-declare]').click(); await r.locator('[data-testid=incident-end]').waitFor(); const end = await r.locator('[data-testid=incident-end]').innerText();
  const rec = JSON.parse(await p.evaluate(() => localStorage.getItem('empathia.signal.story.v1'))).incidents['SM-01'];
  ok('ST-56', 'the package’s expert path ends proven: the debrief gives the grid, why each move mattered and an expert’s path, and the run is recorded', (await r.locator('[data-testid=incident-end]').getAttribute('data-outcome')) === 'proven' && /Restored/.test(end) && /Proven/.test(end) && /1 tested/.test(end) && /Why your moves mattered/.test(end) && /An expert’s path/.test(end) && rec.best === 'proven' && rec.runs === 1 && rec.first === 'proven' && rec.firstWhy === 'declared', `${end.slice(0, 160)} ${JSON.stringify(rec)}`);
  await r.getByRole('button', { name: 'Run it again' }).click(); await r.getByRole('button', { name: /Start the incident/ }).click(); await r.locator('[data-testid=incident-declare]').click(); await r.locator('[data-testid=incident-end][data-outcome=fail]').waitFor();
  const rec2 = JSON.parse(await p.evaluate(() => localStorage.getItem('empathia.signal.story.v1'))).incidents['SM-01'];
  ok('ST-57', 'declaring at the start fails honestly; the record keeps the best (proven) and the first run, and counts the runs', /declared resolved while still broken/i.test(await r.locator('[data-testid=incident-end]').innerText()) && rec2.best === 'proven' && rec2.runs === 2 && rec2.first === 'proven' && /Best so far: restored and proven · 2 runs/.test(await box.locator('[data-testid=story-incident-rec]').innerText()), JSON.stringify(rec2));
  ok('ST-58', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

{ const t = await open('#/story/s01e07'); const p = t.page; await p.waitForSelector('.sg-dec');
  // the chapter's drills are played in ST-43..52; here a try is already on record for each, as for a reader who has tried them
  await p.evaluate(async () => { const pc = await (await fetch('signal/pieces/s01e07.json')).json(); const k = 'empathia.signal.story.v1'; const st = JSON.parse(localStorage.getItem(k) || '{"v":2,"chapters":{}}'); st.drills = Object.fromEntries(Object.keys(pc.drills).map((id) => [id, { passed: false, tries: 1, first: false }])); localStorage.setItem(k, JSON.stringify(st)); });
  await p.reload(); await p.waitForSelector('.sg-dec');
  for (let i = 0; i < 20 && !(await p.locator('[data-testid=story-waiting][data-kind=incident]').count()); i += 1) {
    const kind = await p.locator('[data-testid=story-waiting]').getAttribute('data-kind').catch(() => null); if (!kind) break;
    if (kind !== 'decision') await p.locator('.sg-piece[data-cleared=false] [data-testid=story-skip]').last().click();
    else await p.locator('.sg-dec[data-done=false]').first().locator('.sg-opt').first().click();
    await p.waitForTimeout(150); }
  const w = await p.locator('[data-testid=story-waiting]').innerText();
  ok('ST-59', 'the chapter’s live incident holds the story as a soft gate: "Run the live incident to its end", or skip it for now', /Run the live incident to its end/.test(w) && /skip/i.test(w) && (await p.locator('.sg-piece[data-piece=SM-05]').getAttribute('data-tier')) === 'soft', w);
  await p.locator('.sg-piece[data-piece=SM-05] [data-testid=incident]').getByRole('button', { name: /Start the incident/ }).click(); await p.locator('.sg-piece[data-piece=SM-05] [data-testid=incident-declare]').click();
  await p.waitForFunction(() => document.querySelector('.sg-piece[data-piece=SM-05]')?.dataset.cleared === 'true');
  ok('ST-60', 'a run that ends, even failed, clears the incident’s gate, as the reference’s gate.js has it, and the story goes on', await p.locator('[data-testid=story-waiting][data-kind=incident]').count() === 0 && /decisions, quizzes, lessons, drills and live incidents/.test(await p.locator('[data-testid=story-gate-note]').innerText()));
  ok('ST-61', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

for (const theme of ['light', 'dark']) { const t = await open('#/story/s01e00', { w: 390, h: 844, theme }); const p = t.page; await p.waitForSelector('.sg-dec'); await p.check('[data-testid=story-gates]');
  const r = p.locator('.sg-piece[data-piece=SM-01] [data-testid=incident]'); await r.waitFor(); await r.getByRole('button', { name: /Start the incident/ }).click(); await r.locator('[data-action=walk]').click(); await r.locator('[data-action=rx]').click();
  const small = await r.evaluate((root) => [...root.querySelectorAll('button, input')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height < 43.5; }).map((e) => `${(e.textContent || e.getAttribute('aria-label') || '').slice(0, 16)}:${Math.round(e.getBoundingClientRect().height)}`));
  const c = await r.evaluate((root) => { const lum = (s) => { const m = s.match(/[\d.]+/g).map(Number).map((v) => (/^color\(/.test(s) ? v * 255 : v)); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; const al = b && /^rgba\(/.test(b) ? Number(b.match(/[\d.]+/g)[3]) : b && /\/\s*([\d.]+)\)$/.test(b) ? Number(b.match(/\/\s*([\d.]+)\)$/)[1]) : 1; if (b && b !== 'transparent' && al >= 0.6) return b; } return 'rgb(255,255,255)'; };
    return [...root.querySelectorAll('h4, p, li, .in__act span, .in__rows b')].filter((e) => e.getBoundingClientRect().width > 0 && e.textContent.trim()).map((el) => { const a = lum(getComputedStyle(el).color); const b = lum(bgOf(el)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }); });
  ok(`ST-62 ${theme}`, `phone (390, ${theme}): a live incident in the story has 44 px targets, no overflow, text at 4.5:1, no console error`, await overflow(p) <= 0 && small.length === 0 && c.length >= 8 && Math.min(...c) >= 4.5 && !t.errs.length, `${await overflow(p)} ${small.slice(0, 4).join(',')} ${Math.min(...c).toFixed(2)} ${t.errs.join('|')}`); await t.close(); }

for (const theme of ['light', 'dark']) { const t = await open('#/story/s01e00', { w: 390, h: 844, theme }); const p = t.page; await p.waitForSelector('.sg-dec'); await p.check('[data-testid=story-gates]');
  const c2 = p.locator('.sg-piece[data-piece=C-02]'); await c2.waitFor(); await c2.getByRole('button', { name: /Start the clock/ }).click(); await c2.locator('.dr__btn').first().waitFor();
  const small = await c2.evaluate((root) => [...root.querySelectorAll('button')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).map((e) => `${e.textContent.slice(0, 16)}:${Math.round(e.getBoundingClientRect().height)}`));
  const c = await c2.evaluate((root) => { const lum = (s) => { const m = s.match(/[\d.]+/g).map(Number).map((v) => (/^color\(/.test(s) ? v * 255 : v)); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; const al = b && /^rgba\(/.test(b) ? Number(b.match(/[\d.]+/g)[3]) : b && /\/\s*([\d.]+)\)$/.test(b) ? Number(b.match(/\/\s*([\d.]+)\)$/)[1]) : 1; if (b && b !== 'transparent' && al >= 0.6) return b; } return 'rgb(255,255,255)'; };
    return [...root.querySelectorAll('h4, p, .dr__btn')].filter((e) => e.getBoundingClientRect().width > 0).map((el) => { const a = lum(getComputedStyle(el).color); const b = lum(bgOf(el)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }); });
  ok(`ST-52 ${theme}`, `phone (390, ${theme}): a drill in the story has 44 px targets, no overflow, text at 4.5:1, no console error`, await overflow(p) <= 0 && small.length === 0 && c.length >= 4 && Math.min(...c) >= 4.5 && !t.errs.length, `${await overflow(p)} ${small.slice(0, 4).join(',')} ${Math.min(...c).toFixed(2)} ${t.errs.join('|')}`); await t.close(); }

for (const theme of ['light', 'dark']) { const t = await open('#/story/s01e00', { w: 390, h: 844, theme }); const p = t.page; await p.waitForSelector('.sg-dec[data-decision=BR-S01E00-02]');
  await p.click('.sg-dec[data-decision=BR-S01E00-02] .sg-opt[data-option=C]'); await p.waitForSelector('[data-testid=story-quiz]');
  const small = await p.$$eval('main .sg-piece .sg-opt, main .sg-piece .ui-btn', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).map((e) => `${e.textContent.slice(0, 16)}:${Math.round(e.getBoundingClientRect().height)}`));
  const c = await p.evaluate(() => { const lum = (s) => { const m = s.match(/[\d.]+/g).map(Number).map((v) => (/^color\(/.test(s) ? v * 255 : v)); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; const al = b && /^rgba\(/.test(b) ? Number(b.match(/[\d.]+/g)[3]) : b && /\/\s*([\d.]+)\)$/.test(b) ? Number(b.match(/\/\s*([\d.]+)\)$/)[1]) : 1; if (b && b !== 'transparent' && al >= 0.6) return b; } return 'rgb(255,255,255)'; };
    return [...document.querySelectorAll('main .sg-piece h4, main .sg-piece p, main .sg-qopt, main .sg-tier, main .sg-wait')].filter((e) => e.getBoundingClientRect().width > 0).map((el) => { const a = lum(getComputedStyle(el).color); const b = lum(bgOf(el)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }); });
  ok(`ST-42 ${theme}`, `phone (390, ${theme}): the quiz has 44 px targets, no overflow, its text meets 4.5:1, no console error`, await overflow(p) <= 0 && small.length === 0 && c.length >= 4 && Math.min(...c) >= 4.5 && !t.errs.length, `${await overflow(p)} ${small.slice(0, 4).join(',')} ${Math.min(...c).toFixed(2)} ${t.errs.join('|')}`); await t.close(); }

for (const theme of ['light', 'dark']) { const t = await open('#/story/s01e01', { w: 390, h: 844, theme }); const p = t.page; await p.waitForFunction(() => document.querySelector('.sg-art svg'));
  const small = await p.$$eval('main .sg-opt, main .ui-btn, main .w-pick__b, main .sg-check, main .sg-flags summary, main .w-crumbs a', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).map((e) => `${e.textContent.slice(0, 16)}:${Math.round(e.getBoundingClientRect().height)}`));
  ok(`ST-30 ${theme}`, `phone (390, ${theme}): no horizontal overflow, 44 px targets, no console error`, await overflow(p) <= 0 && small.length === 0 && !t.errs.length, `${await overflow(p)} ${small.slice(0, 4).join(',')} ${t.errs.join('|')}`);
  const c = await p.evaluate(() => { const lum = (s) => { const m = s.match(/[\d.]+/g).map(Number).map((v) => (/^color\(/.test(s) ? v * 255 : v)); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; const al = b && /^rgba\(/.test(b) ? Number(b.match(/[\d.]+/g)[3]) : b && /\/\s*([\d.]+)\)$/.test(b) ? Number(b.match(/\/\s*([\d.]+)\)$/)[1]) : 1; if (b && b !== 'transparent' && al >= 0.6) return b; } return 'rgb(255,255,255)'; };
    return [...document.querySelectorAll('main .sg-bubble, main .sg-narr, main .sg-cap, main .sg-flagline, main .sg-note p, main .sg-dec p, main .sg-opt, main .sg-quest dd, main .sg-check')].map((el) => { const a = lum(getComputedStyle(el).color); const b = lum(bgOf(el)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }); });
  ok(`ST-31 ${theme}`, `${theme}: story text meets 4.5:1`, c.length > 10 && Math.min(...c) >= 4.5, Math.min(...c).toFixed(2)); await t.close(); }
await done();
