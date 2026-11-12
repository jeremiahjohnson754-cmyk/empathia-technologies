#!/usr/bin/env node
// Season 1 acceptance (founder directive 12 Nov 2026, "35/10"): the checks that prove the experience in a real browser. This first part is
// the founder's dividing line, "a major decision changes something later in the episode, not just the next ten seconds of dialogue":
// S01E01's first call is MAJOR (BR-S01E01-01). Played two ways (C, the professional ten-seat map; A, EQ first), the reader then goes on
// through 37 items (19 spoken lines) to Ana's question (BR-S01E01-03), whose briefing recalls the earlier call in that option's own canon
// words; then to the chapter's end ("What your calls set in motion", merit, verdict); then into S01E02, whose opening carries it. The same
// is checked in the cinematic player. Every pure branch edge is covered by tests/unit/signal-consequence.test.mjs.
//   node tests/browser/demo-signal-s1.test.mjs
import fs from 'node:fs'; import path from 'node:path';
import { harness, repo } from './demo-shell-lib.mjs';
import { unlockInit } from './signal-unlock.mjs';
const { ok, open, done } = await harness('demo-signal-s1');
const E01 = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/story/s01e01.json'), 'utf8')).items;
const dec = (id) => E01.find((i) => i.type === 'decision' && i.id === id);
const D1 = dec('BR-S01E01-01'), D2 = dec('BR-S01E01-02'), D3 = dec('BR-S01E01-03');
const canon = (d) => (d.options.find((o) => o.canonical) || d.options[0]).letter;
const pick = async (p, d, L) => { const b = p.locator(`.sg-dec[data-decision=${d.id}] .sg-opt[data-option=${L}]`); await b.scrollIntoViewIfNeeded(); await b.click(); await p.waitForSelector(`.sg-dec[data-decision=${d.id}] [data-testid=story-result][data-letter=${L}]`); };

/** play S01E01 the way a reader does (soft gates skipped, the core lab ended the shortest honest way, as demo-story's walk does), making
 *  the first call `letter` and the professional call everywhere else; read the later card, the episode end and the next opening */
async function playE01(letter) {
  const t = await open('#/story/s01e01', { role: 'architect', init: unlockInit('s01e01') }); const p = t.page; p.setDefaultTimeout(10000);
  await p.waitForSelector('[data-testid=story-reader]'); let later = null;
  for (let i = 0; i < 40 && !(await p.locator('[data-testid=story-summary]').count()); i += 1) {
    const kind = await p.locator('[data-testid=story-waiting]').getAttribute('data-kind').catch(() => null);
    if (kind === 'lab') { const lab = p.locator('.sg-piece[data-cleared=false] [data-testid=lab]').last(); const o = lab.getByRole('button', { name: /Open the lab/ }); if (await o.count()) await o.click();
      for (let k = 0; k < 3; k += 1) await lab.getByRole('button', { name: /Test the fix/ }).click(); await lab.getByRole('button', { name: /Show me the fix/ }).click(); }
    else if (kind === 'drill') { const id = await p.locator('.sg-piece[data-cleared=false][data-kind=drill]').first().getAttribute('data-piece'); const dr = p.locator(`.sg-piece[data-piece=${id}]`);
      const pc = await p.evaluate(async () => (await fetch('signal/pieces/s01e01.json')).json()); const d = pc.drills[id];
      const st = dr.getByRole('button', { name: /Start the clock/ }); if (await st.count()) await st.click();
      for (const c of d.clues.filter((x) => x.k === 'key').slice(0, d.pick)) await dr.getByRole('button', { name: c.t, exact: true }).click();
      await dr.getByRole('button', { name: 'Submit clues' }).click(); await dr.locator('[data-testid=drill-verdict]').waitFor(); }
    else if (kind && kind !== 'decision') { const sk = p.locator('.sg-piece[data-cleared=false] [data-testid=story-skip]').last(); if (await sk.count()) await sk.click(); else break; }
    else { const open = p.locator('.sg-dec[data-done=false]').first(); if (await open.count()) { const id = await open.getAttribute('data-decision');
      if (id === D3.id && !later) { const cb = open.locator('[data-testid=story-callback]'); later = (await cb.count()) ? { from: await cb.getAttribute('data-from'), text: await cb.innerText() } : { none: true }; }
      await pick(p, dec(id), id === D1.id ? letter : canon(dec(id))); } }
    await p.waitForTimeout(150); }
  const motion = p.locator(`[data-testid=story-set-in-motion] li[data-from=${D1.id}]`); const end = (await motion.count()) ? await motion.innerText() : null;
  const merit = (await p.locator('[data-testid=story-merit]').count()) ? await p.locator('[data-testid=story-merit]').innerText() : null;
  const verdict = (await p.locator('[data-testid=story-verdict]').count()) ? await p.locator('[data-testid=story-verdict]').innerText() : null;
  let next = null; const nextLink = await p.locator('[data-testid=story-next]').getAttribute('href').catch(() => null);
  if (nextLink) { await p.click('[data-testid=story-next]'); await p.waitForFunction((h) => location.hash === h, nextLink).catch(() => undefined);
    // wait for S01E02's own opening (it names Ten Seats), not the S01E01 opening still on screen as the route changes
    const mine = p.locator('[data-testid=story-echo][aria-label*="Ten Seats"]'); await mine.waitFor({ timeout: 30000 }).catch(() => undefined);
    next = (await mine.count()) ? await mine.innerText() : null; }
  const errs = [...t.errs]; await t.close();
  return { later, end, merit, verdict, next, errs };
}

const C = await playE01('C'); const A = await playE01('A');
const oC = D1.options.find((o) => o.letter === 'C'), oA = D1.options.find((o) => o.letter === 'A');
ok('S1-CQ-01', 'S01E01: the major first call is recalled 37 items and 19 spoken lines later, at Ana’s question, in that option’s own canon words', !!C.later?.from && C.later.from.includes(`${D1.id}:C`) && C.later.text.includes(oC.result) && C.later.text.includes(oC.consequence) && !!A.later?.from && A.later.from.includes(`${D1.id}:A`) && A.later.text.includes(oA.result), JSON.stringify({ C: C.later, A: A.later }).slice(0, 380));
ok('S1-CQ-02', 'the same later moment reads differently for the two choices: the professional map gives “every later comparison has a baseline”, EQ-first gives “she learns the notches move the hard way”', C.later && A.later && C.later.text !== A.later.text && /baseline/.test(C.later.text) && /hard way/.test(A.later.text));
ok('S1-CQ-03', 'at the episode’s end, “What your calls set in motion” carries the call, and the merit and verdict differ', !!C.end && !!A.end && C.end.includes(oC.consequence) && A.end.includes(oA.consequence) && C.merit !== A.merit, JSON.stringify({ C: [C.end?.slice(0, 80), C.merit, C.verdict], A: [A.end?.slice(0, 80), A.merit, A.verdict] }));
ok('S1-CQ-04', 'S01E02 opens with what the reader did in S01E01, and it differs by the call', !!C.next && !!A.next && C.next !== A.next && C.next.includes(oC.label) && A.next.includes(oA.label), JSON.stringify({ C: C.next?.slice(0, 160), A: A.next?.slice(0, 160), errs: [...C.errs, ...A.errs].slice(0, 2) }));
ok('S1-CQ-05', 'no console error while playing either way', !C.errs.length && !A.errs.length, [...C.errs, ...A.errs].slice(0, 3).join(' | '));

// the cinematic player carries the same callback at the later decision
{ const t = await open('#/story/s01e01', { role: 'architect', init: unlockInit('s01e01') }); const p = t.page; p.setDefaultTimeout(10000); await p.waitForSelector('[data-testid=story-reader]'); await p.check('[data-testid=story-gates]').catch(() => undefined); await p.waitForFunction(() => { const r = document.querySelector('[data-testid=story-reader]'); return r && r.dataset.reached === r.dataset.items; }).catch(() => undefined);
  await pick(p, D1, 'A'); await pick(p, D2, canon(D2));
  const play = p.locator('[data-testid=story-cine]').first(); let seen = null;
  if (await play.count()) { await play.click(); await p.waitForSelector('[data-testid=sg-cine]', { timeout: 10000 }).catch(() => undefined);
    const acts = await p.locator('[data-testid=sg-cine-act] option').count();
    for (let a = 0; a < acts && !seen; a++) { await p.selectOption('[data-testid=sg-cine-act]', { index: a }); await p.waitForTimeout(200);
      for (let k = 0; k < 80 && !seen; k++) {
        const d = p.locator('[data-testid=sg-cine-dec]');
        if (await d.count()) { const id = await d.getAttribute('data-decision');
          if (id === D3.id) { const cb = d.locator('[data-testid=sg-cine-callback]'); seen = (await cb.count()) ? { from: await cb.getAttribute('data-from'), text: await cb.innerText() } : { none: true }; break; }
          // an earlier decision: make the same call again (as the classic reader did) and continue
          const L = id === D1.id ? 'A' : canon(dec(id)); await d.getByRole('button', { name: new RegExp(`^${L}\\. `) }).first().click({ timeout: 1500 }).catch(() => undefined);
          const go = p.getByTestId('sg-cine-continue'); if (await go.count()) await go.click({ timeout: 1500 }).catch(() => undefined); else break; continue; }
        const nx = p.getByTestId('sg-cine-next'); if (!(await nx.count()) || await nx.isDisabled()) break; await nx.click({ timeout: 1500 }).catch(() => undefined); await p.waitForTimeout(30); } } }
  ok('S1-CQ-06', 'Cinematic mode: Ana’s decision card recalls the earlier EQ-first call the same way', !!seen && seen.from === D1.id && seen.text.includes(oA.result), JSON.stringify(seen));
  await t.close(); }
await done();
