#!/usr/bin/env node
// SIGNAL restorations of 12 Nov 2026 against the founder's build package, played through the pages: the result pop-ups (gate.js: a card
// for each gate cleared by playing it, CHAPTER COMPLETE with the quest rating, keyboard and focus as the reference has them, nothing for
// what was already done); glossary terms marked at first use with their pop-over (ladder.js); the quick-facts timeline in the Learn
// library and the library at the source's revision (app.js); the mentor channel on its built-in answers (app.js offline()). Phone, both
// themes, no console error, nothing leaves the page.
//   node tests/browser/demo-story-more.test.mjs
import fs from 'node:fs'; import path from 'node:path';
import { harness, repo } from './demo-shell-lib.mjs';
import { progressBefore, STORY_KEY } from './signal-unlock.mjs';
const { ok, open, done } = await harness('demo-story-more');
const canon = (f) => JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data', f), 'utf8'));
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const ix = canon('story/index.json'), title = (id) => ix.find((c) => c.id === id).title;
const DISC = canon('story/s01e00.json').items.filter((i) => i.type === 'discovery').length, LAST = 'BR-S01E00-04', lastOpt = canon('story/s01e00.json').items.find((i) => i.type === 'decision' && i.id === LAST).options.find((o) => o.canonical);
/** A reader who has cleared every gate of the Prologue and s01e00 except its last decision. */
const seed = (() => { const p = progressBefore('s01e01'); delete p.chapters.s01e00.choices[LAST]; p.chapters.s01e00.done = false; p.last = 's01e00'; return p; })();
const seedInit = { content: `try { if (!sessionStorage.getItem('__s')) { localStorage.setItem(${JSON.stringify(STORY_KEY)}, ${JSON.stringify(JSON.stringify(seed))}); sessionStorage.setItem('__s', '1'); } } catch (e) {}` };
const popText = (p) => p.getByTestId('story-pop').innerText();
const active = (p) => p.evaluate(() => document.activeElement?.getAttribute('data-testid') || document.activeElement?.getAttribute('data-gl') || document.activeElement?.tagName);

for (const [theme, w, h] of [['light', 1440, 900], ['dark', 390, 844]]) {
  // ------------------------------------------------------------------------------------------------ result pop-ups
  { const t = await open('#/story/s01e00', { theme, w, h, init: seedInit, pops: true }); const p = t.page;
    const d = p.locator(`[data-decision="${LAST}"]`); await d.waitFor({ timeout: 10000 }); await p.click('.w-pick__b:has-text("No clock")').catch(() => {});
    await p.waitForTimeout(1300); const early = await p.getByTestId('story-pop').count();
    await d.locator(`[data-option="${lastOpt.letter}"]`).click(); await p.getByTestId('story-pop').waitFor({ timeout: 5000 });
    const a = await popText(p), focus1 = await active(p);
    ok(`PP-01 ${theme}`, 'a decision raises the reference’s card: CHOICE LOCKED IN, the choice and its merit, the quest objective it completed, every gate cleared; nothing popped for what was already done', early === 0 && /S01E00 · QUEST UPDATED/.test(a) && /CHOICE LOCKED IN/.test(a) && a.includes(`You chose: ${lastOpt.label}`) && /★ The professional call\. Merit \+\d/.test(a) && /Quest: ✓ Decide who gets the network: home or overflow/.test(a) && /Every gate in this chapter is cleared\./.test(a), a);
    const objs = await p.locator('.sg-quest [data-obj]').evaluateAll((e) => e.map((x) => [x.dataset.obj, x.dataset.done]));
    ok(`PP-08 ${theme}`, 'the quest card’s objectives tick live (engine spec §11): the decision just made and the core skill are ticked, the discoveries not yet', objs.find((o) => o[0] === LAST)?.[1] === 'true' && objs.find((o) => o[0] === 'core')?.[1] === 'true' && objs.find((o) => /^disc:/.test(o[0]))?.[1] === 'false', JSON.stringify(objs));
    await p.keyboard.press('Tab'); const focus2 = await active(p); await p.keyboard.press('Tab'); const focus3 = await active(p);
    ok(`PP-02 ${theme}`, 'the card is a modal dialog: focus starts on “Continue the story”, Tab moves between its two buttons only', focus1 === 'story-pop-go' && focus2 === 'story-pop-stay' && focus3 === 'story-pop-go' && (await p.getByTestId('story-pop').getAttribute('aria-modal')) === 'true', `${focus1} ${focus2} ${focus3}`);
    await p.keyboard.press('Escape'); await p.waitForFunction(() => /CHAPTER COMPLETE/.test(document.querySelector('[data-testid=story-pop]')?.textContent || ''), null, { timeout: 5000 }).catch(() => {});
    const c = await popText(p).catch(() => '');
    ok(`PP-03 ${theme}`, 'Escape closes it, and the chapter card follows: CHAPTER COMPLETE with the quest rating and its line, the discoveries, the chapter it unlocks', /S01E00 · QUEST LOG/.test(c) && /CHAPTER COMPLETE/.test(c) && /is finished\./.test(c) && /Quest rating [SABCD] · \d+ \/ \d+ — /.test(c) && c.includes(`🔎 Discoveries 0 / ${DISC}`) && c.includes(`Unlocked: ${title('s01e01')}`) && /Open the next chapter/.test(c), c.replace(/\n/g, " | "));
    await p.getByTestId('story-pop-go').click(); await p.waitForFunction(() => location.hash === '#/story/s01e01', null, { timeout: 5000 }).catch(() => {});
    ok(`PP-04 ${theme}`, '“Open the next chapter” opens it', await p.evaluate(() => location.hash) === '#/story/s01e01');
    await p.goto(p.url().replace(/#.*$/, '#/story/s01e00')); await p.locator(`[data-decision="${LAST}"]`).waitFor(); await p.waitForTimeout(1500);
    ok(`PP-05 ${theme}`, 'coming back to a finished chapter raises nothing', await p.getByTestId('story-pop').count() === 0);
    ok(`PP-06 ${theme}`, 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }
  { const t = await open('#/story/s01e00', { theme, w, h, init: seedInit }); const p = t.page; const d = p.locator(`[data-decision="${LAST}"]`); await d.waitFor({ timeout: 10000 });
    await p.click('.w-pick__b:has-text("No clock")').catch(() => {}); await d.locator(`[data-option="${lastOpt.letter}"]`).click(); await p.waitForTimeout(1600);
    ok(`PP-07 ${theme}`, 'with window.SIGNAL_NOPOP set (the reference’s own test switch, which the other suites use) no card is raised', await p.getByTestId('story-pop').count() === 0 && await d.getAttribute('data-done') === 'true'); await t.close(); }

  { const t = await open('#/story/s01e00', { theme, w, h }); const p = t.page; await p.getByTestId('story-still').check(); const st1 = await p.getByTestId('story-reader').getAttribute('data-still');
    await p.reload(); await p.getByTestId('story-reader').waitFor(); const st2 = await p.getByTestId('story-reader').getAttribute('data-still'); await p.getByTestId('story-still').uncheck();
    ok(`ST-S1 ${theme}`, '“Still art” (the reference’s toggle) stops the reader’s animation and is remembered in this browser', st1 === 'true' && st2 === 'true' && await p.getByTestId('story-reader').getAttribute('data-still') === 'false', `${st1} ${st2}`); await t.close(); }

  // ------------------------------------------------------------------------------------------------ glossary terms
  { const t = await open('#/story/s01e00', { theme, w, h }); const p = t.page; await p.check('[data-testid=story-gates]'); await p.waitForSelector('.sg-panel'); await p.waitForSelector('.sg-gl', { timeout: 8000 }).catch(() => {});
    const terms = await p.locator('.sg-gl').evaluateAll((e) => e.map((x) => x.dataset.gl));
    ok(`GP-01 ${theme}`, 'glossary terms are underlined at their first use in the chapter, each term once', terms.length >= 2 && new Set(terms).size === terms.length, terms.join(', '));
    const first = p.locator('.sg-gl').first(); await first.scrollIntoViewIfNeeded(); await first.click(); const pop = p.getByTestId('story-glpop'); await pop.waitFor();
    const term = canon('app-data.json').glossary.find((g) => g.term === terms[0]); const pt = await pop.innerText(); const box = await pop.boundingBox();
    ok(`GP-02 ${theme}`, 'tapping a term opens its pop-over: the term, its domain and definition, where it is first met, inside the screen, with focus on Close', pt.includes(term.term) && pt.includes(term.d) && (!term.first || pt.includes(`First met: ${term.first.toUpperCase()}`)) && box.x >= 0 && box.x + box.width <= w + 1 && await active(p) === 'BUTTON', `${pt.slice(0, 160)} ${JSON.stringify(box)}`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(150); const back = await active(p);
    await p.keyboard.press('Enter'); const reopened = await pop.count(); await p.keyboard.press('Escape');
    ok(`GP-03 ${theme}`, 'Escape closes it and focus returns to the term; Enter on the term opens it again', back === terms[0] && reopened === 1, `${back} ${reopened}`);
    const nd = p.getByTestId('story-needs').first(); const nN = await p.getByTestId('story-needs').count(); const chip = nd.locator('.sg-glchip').first(); const chipTerm = await chip.getAttribute('data-gl').catch(() => null);
    if (chipTerm) { await chip.scrollIntoViewIfNeeded(); await chip.click(); } const chipPop = chipTerm ? (await p.getByTestId('story-glpop').innerText().catch(() => '')).includes(chipTerm) : false; await p.keyboard.press('Escape');
    ok(`GP-05 ${theme}`, '“Terms you’ll need” (glNeeds) heads the chapter’s interactives at the default tier as chips that open the pop-over', nN >= 1 && /Terms you’ll need/.test(await nd.innerText()) && chipPop, `${nN} ${chipTerm}`);
    ok(`GP-04 ${theme}`, 'no horizontal overflow; no console error, no request leaving the page', await overflow(p) <= 0 && !t.errs.length && !t.off.length, [await overflow(p), ...t.errs, ...t.off].join(' | ')); await t.close(); }

  // ------------------------------------------------------------------------------------------------ Learn: library at the source's revision, the timeline, the mentor
  { const t = await open('#/learn/library', { role: 'service', theme, w, h }); const p = t.page; await p.waitForSelector('[data-testid=library-lessons]');
    await p.locator('[data-testid=library-lessons] details').filter({ hasText: 'Fieldbook' }).first().locator('summary').click();
    await p.getByRole('button', { name: /What sound is — and why it gets quieter/ }).first().click(); await p.getByTestId('lesson').waitFor();
    ok(`LR-01 ${theme}`, 'Learn reads the library at the source’s revision (FB2’s first card as the build package has it)', /vibration travelling as pressure waves/.test(await p.getByTestId('lesson').innerText()));
    const tl = p.getByTestId('library-timeline'); await tl.waitFor(); const seasons = await tl.locator('details').count(); await tl.locator('details[data-season="1"] summary').click();
    const facts = await tl.locator('details[data-season="1"] .ln-fact').count(); const tt = await tl.innerText();
    ok(`LR-02 ${theme}`, 'the quick-facts timeline: four seasons hold the 55 notes; Season 1 opens to its 19, each tied to its chapter; RV-27 shown', seasons === 4 && facts === 19 && /RV-27/.test(tt) && /S01E00 · quick fact/.test(tt) && await tl.locator('a[href="#/story/s01e00"]').count() >= 1, `${seasons} ${facts}`);
    ok(`LR-03 ${theme}`, 'no horizontal overflow; no console error, no request leaving the page', await overflow(p) <= 0 && !t.errs.length && !t.off.length, [await overflow(p), ...t.errs, ...t.off].join(' | ')); await t.close(); }
  { const t = await open('#/learn/cases', { role: 'service', theme, w, h }); const p = t.page; const app = canon('app-data.json'); const cid = app.caseOrder[0], C = app.cases[cid], st = C.engineer.steps[0];
    const box = p.getByTestId('signal-casefiles'); await box.waitFor(); await box.locator('details').first().locator('summary').click();
    const card = box.locator(`[data-case="${cid}"]`); await card.getByRole('tab', { name: 'Engineer' }).click(); const step = card.locator('.ln-calc').first();
    const unitWrong = st.units.find((u) => u !== st.unit);
    await step.locator('input').fill(String(st.answer + Math.abs(st.answer) + 10)); await step.getByRole('button', { name: 'Check' }).click(); const f1 = await step.locator('p[aria-live]').innerText();
    await step.locator('input').fill(String(st.answer)); await step.locator('select').selectOption(unitWrong); await step.getByRole('button', { name: 'Check' }).click(); const f2 = await step.locator('p[aria-live]').innerText();
    await step.locator('select').selectOption(st.unit); await step.getByRole('button', { name: 'Check' }).click(); const f3 = await step.locator('p[aria-live]').innerText(); const shown = await step.locator('.ln-calc__w').count();
    ok(`CF-01 ${theme}`, 'a SIGNAL case file’s Engineer perspective: a wrong number gets the hint, the right number in the wrong unit is caught, the right number and unit is correct and the equation shows', /^✕ Not yet\./.test(f1) && /Right number, wrong unit/.test(f2) && f3.startsWith(`✓ Correct: ${st.answer} ${st.unit}.`) && shown === 1, [f1, f2, f3].join(' | '));
    await card.getByRole('tab', { name: 'Service' }).click(); const sv = await card.locator('[data-pane=service]').innerText();
    ok(`CF-02 ${theme}`, 'the Service perspective names the live incident and opens it in Service Mode', sv.includes(`Incident ${C.incident}`) && await card.locator(`a[href="#/learn/service/${C.incident}"]`).count() === 1, sv.slice(0, 120));
    await card.getByRole('tab', { name: 'Learn' }).click();
    ok(`CF-03 ${theme}`, 'the Learn perspective carries the case’s cards, its check and a way back to the episode', await card.locator('[data-pane=learn] .learn__card').count() === C.learn.length && await card.locator(`a[href="#/story/${C.chapter}"]`).count() === 1);
    ok(`CF-04 ${theme}`, 'no horizontal overflow; no console error, no request leaving the page', await overflow(p) <= 0 && !t.errs.length && !t.off.length, [await overflow(p), ...t.errs, ...t.off].join(' | ')); await t.close(); }
  { const t = await open('#/learn/cases', { role: 'service', theme, w, h }); const p = t.page; const app = canon('app-data.json'); const cid = app.caseOrder[0], C = app.cases[cid], st = C.engineer.steps[0], F = app.formulas[st.f];
    await p.evaluate(() => { localStorage.setItem('empathia.signal.story.v1', JSON.stringify({ v: 2, chapters: {}, support: '4' })); }); await p.reload();
    const box = p.getByTestId('signal-casefiles'); await box.waitFor(); await box.locator('details').first().locator('summary').click();
    const card = box.locator(`[data-case="${cid}"]`); await card.getByRole('tab', { name: 'Engineer' }).click(); const step = card.locator('.ln-calc').first();
    const tier = await card.getByTestId('case-tier').getAttribute('data-tier'); const locked = await step.locator('input').isDisabled(); const shownF = await step.getByTestId('case-fx').count();
    const wrongK = F.opts.find((k) => k !== st.f && app.formulas[k]); await step.locator(`[data-f="${wrongK}"]`).click(); const why1 = await step.getByTestId('case-fx-why').innerText(); const still = await step.locator('input').isDisabled();
    await step.locator(`[data-f="${st.f}"]`).click(); const why2 = await step.getByTestId('case-fx-why').innerText(); const open1 = !(await step.locator('input').isDisabled());
    await step.locator('input').fill(String(st.answer)); await step.locator('select').selectOption(st.unit); await step.getByRole('button', { name: 'Check' }).click(); const f3 = await step.locator('p[aria-live]').last().innerText();
    ok(`CF-05 ${theme}`, 'Mastery in a case file (reference fxGate): no formula shown; the answer stays locked; a wrong relationship is refused with its own “when”; the right one unlocks it and the step can be solved', tier === '4' && locked && shownF === 0 && /^✕ Not this one/.test(why1) && still && why2.startsWith('✓') && open1 && f3.startsWith(`✓ Correct: ${st.answer} ${st.unit}.`), JSON.stringify([tier, locked, shownF, why1.slice(0, 40), still, why2.slice(0, 30), open1, f3.slice(0, 30)]));
    await p.evaluate(() => { localStorage.setItem('empathia.signal.story.v1', JSON.stringify({ v: 2, chapters: {}, support: '3' })); }); await p.reload(); await box.waitFor(); await box.locator('details').first().locator('summary').click();
    await card.getByRole('tab', { name: 'Engineer' }).click(); const ask = await card.locator('.ln-calc').first().locator('details.ln-calc__ask').count(); const en = !(await card.locator('.ln-calc').first().locator('input').isDisabled());
    ok(`CF-06 ${theme}`, 'Advanced: the formula is there on request (collapsed) and the answer box is open', ask === 1 && en);
    await p.evaluate(() => localStorage.removeItem('empathia.signal.story.v1')); await t.close(); }
  { const t = await open('#/learn/explore', { role: 'service', theme, w, h }); const p = t.page; const x = canon('app-data.json').explorers[0]; await p.getByTestId('learn-explore').waitFor();
    const pressed = await p.locator('.ln-layer[aria-pressed=true]').evaluateAll((b) => b.map((e) => e.dataset.layer)); const pts = await p.locator('.ln-log li').count();
    await p.getByRole('tab', { name: 'Reality view' }).click(); await p.locator('.ln-ex__hot').first().click(); const real = await p.getByTestId('explore-info').innerText(); const ptsR = await p.locator('.ln-log li').count();
    await p.getByRole('tab', { name: 'System view' }).click(); await p.locator('.ln-ex__hot').first().click(); const sys = await p.getByTestId('explore-info').innerText();
    ok(`EX-01 ${theme}`, 'the system explorer as the reference has it: the first two layers on, System view lists its points; Reality view hides them and answers “?” as it looks; System view answers as the system sees it', pressed.join() === x.layers.slice(0, 2).join() && pts >= 1 && ptsR === 0 && real.includes(x.hot[0].label) && real.includes(x.hot[0].real) && sys.includes(x.hot[0].sys), [pressed.join(), pts, ptsR, real.slice(0, 60), sys.slice(0, 60)].join(' | '));
    await p.getByRole('tab', { name: /L2/ }).click(); const pts2 = await p.locator('.ln-log li').count();
    ok(`EX-02 ${theme}`, 'level L2 adds measurements, evidence and requirements to the same layers', pts2 > pts, `${pts} → ${pts2}`); await t.close(); }
  { const t = await open('#/learn/ask', { role: 'service', theme, w, h }); const p = t.page; const m = p.getByTestId('ask-mentor'); await m.waitFor();
    const note = await p.getByTestId('ask-mentor-note').innerText(); const log = m.getByTestId('ask-mentor-log').locator('.ln-msg');
    await m.getByRole('button', { name: "Why can't EQ fix a notch that moves between seats?" }).click(); const n1 = await log.count(), a1 = await log.last().innerText();
    await m.getByLabel('Your question to the mentor').fill('hello there'); await m.getByLabel('Your question to the mentor').press('Enter'); const a2 = await log.last().innerText();
    await m.getByRole('button', { name: 'Send' }).click(); const nudge = await m.getByLabel('Your question to the mentor').getAttribute('data-nudge');
    ok(`MC-11 ${theme}`, 'the mentor channel answers from the source’s twenty built-in answers and says no AI model is used; a suggestion asks it; an unknown question gets the method line; an empty one is nudged', /No AI model is used/.test(note) && /20 prepared answers/.test(note) && n1 === 3 && /^\[comb filtering\]/.test(a1) && /^Good question\. Start with the method/.test(a2) && nudge === 'true', `${n1} ${a1.slice(0, 40)} ${a2.slice(0, 40)} ${nudge}`);
    if (theme === 'dark') { const small = await p.$$eval('[data-testid=ask-mentor] button, [data-testid=ask-mentor] textarea', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).map((e) => `${e.textContent.slice(0, 14)}:${Math.round(e.getBoundingClientRect().height)}`));
      ok('MC-12', 'phone (390, dark): the mentor’s buttons and box are 44 px targets; no horizontal overflow', small.length === 0 && await overflow(p) <= 0, small.join(',')); }
    ok(`MC-13 ${theme}`, 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }
}
await done();
