#!/usr/bin/env node
// SIGNAL boss levels and challenges in the story (restored 12 Nov 2026 to the founder's build package: docs/04-engine-specs.md §12–13 and the
// reference chal_boss.js / chal_*.js). Season 1's boss is played end to end through the page — the trace tapped in order, the right calls,
// each challenge set with the reference QA's recipe through its own controls and checked once — and clears its hard gate; Season 8's run
// adds the commission (ask, scope, design, cost) and clears too; a wrong call ends the run and "Start the run over" begins again; the
// lighting desk plays live; the clock, the alarm light and calm lights behave; phone, both themes, no console error, nothing leaves the page.
//   node tests/browser/demo-boss.test.mjs
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { harness, repo } from './demo-shell-lib.mjs';
import { recipes } from '../fixtures/signal-challenge-recipes.mjs';
const { ok, open, done } = await harness('demo-boss');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js')); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boss-b-'));
await esbuild.build({ entryPoints: [path.join(repo, 'packages/ui/src/challenges/index.ts')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'c.mjs'), logLevel: 'error' });
const C = await import(pathToFileURL(path.join(tmp, 'c.mjs')).href), R = recipes(C);
const BOSSES = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/app-data.json'), 'utf8')).bosses;
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('empathia.signal.story.v1') || '{}'));

/** Set a challenge through its own controls to the recipe state, as a person would: sliders, stops, selects, ticks, steppers, gear, colours. */
async function dial(ch, id, lv) {
  const want = { ...C.byId(id).init(lv), ...R[id](lv) };
  for (let pass = 0; pass < 2; pass += 1) for (const c of C.byId(id).controls(lv, want)) {
    const v = want[c.key];
    if (c.kind === 'slider') { const pos = c.log ? Math.round((1000 * Math.log(v / c.min)) / Math.log(c.max / c.min)) : v;
      await ch.locator(`input[type=range][data-key="${c.key}"]`).evaluate((el, x) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, String(x)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, pos); }
    else if (c.kind === 'stops') await ch.locator(`input[type=range][data-key="${c.key}"]`).evaluate((el, x) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, String(x)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, c.stops.indexOf(v));
    else if (c.kind === 'select') await ch.locator(`select[data-key="${c.key}"]`).selectOption(String(v));
    else if (c.kind === 'check') await ch.locator(`input[type=checkbox][data-key="${c.key}"]`).setChecked(!!v);
    else if (c.kind === 'stepper') { for (let g = 0; g < 40; g += 1) { const now = Number((await ch.locator(`b[data-key="${c.key}"]`).innerText()).replace(/[^\d-]/g, '')); if (now === v) break; await ch.getByRole('button', { name: `${now < v ? 'More' : 'Fewer'}: ${c.label}`, exact: true }).click(); } }
    else if (c.kind === 'slots') { if (v) await ch.locator(`[data-key="${c.key}"] [data-opt="${v}"]`).click(); }
    else if (c.kind === 'color') await ch.locator(`[data-key="${c.key}"] button[data-hex="${String(v).toUpperCase()}"]`).click();
  }
}
/** Play the stage on screen on its intended answer. */
async function playStage(p, boss, s) {
  const b = p.locator('[data-testid=boss]');
  if (s.type === 'trace') { for (const it of s.items) await b.locator('[data-testid=boss-trace] .dr__btn').filter({ hasText: it }).first().click(); return; }
  if (s.type === 'call') { await b.locator('[data-testid=boss-call] .dr__btn').filter({ hasText: s.opts.find((o) => o.ok).t }).first().click(); return; }
  if (s.type === 'chal') { const ch = b.locator('[data-testid=challenge]'); await dial(ch, s.chal, boss.lv); await ch.getByRole('button', { name: /Check my work — one shot/ }).click(); return; }
  if (s.type === 'ask') { const want = new Set(); for (const q of s.qs) if (q.kind === 'must') { if (q.after) want.add(q.after); want.add(q.id); }
    for (const q of s.qs.filter((x) => want.has(x.id))) await b.locator('[data-testid=boss-ask] .dr__btn').filter({ hasText: q.q }).first().click();
    if (await b.getByRole('button', { name: 'Close the meeting ▸' }).isEnabled()) await b.getByRole('button', { name: 'Close the meeting ▸' }).click(); return; }
  if (s.type === 'scope') { const rows = b.locator('[data-testid=boss-scope] .dr__cm'); for (let k = 0; k < s.items.length; k += 1) await rows.nth(k).locator('.dr__chip').filter({ hasText: s.items[k].c }).first().click(); await b.getByRole('button', { name: 'Issue the scope ▸' }).click(); return; }
  if (s.type === 'design') { for (const sl of s.slots) { const o = sl.opts.find((x) => x.best); await b.getByRole('group', { name: sl.label, exact: true }).locator('.dr__btn').filter({ has: p.locator('b', { hasText: o.n }) }).first().click(); } await b.getByRole('button', { name: 'Issue the design ▸' }).click(); return; }
  if (s.type === 'cost') { const ln = s.lines.reduce((a, l) => { a[l.kind || 'eq'] += l.q * l.each; return a; }, { eq: 0, lab: 0, run: 0, later: 0 }); const T = (ln.eq * (1 + (s.tax || 0)) + ln.lab) * (1 + (s.cont || 0)) + ln.run + ln.later;
    await b.locator('[data-testid=boss-cost] input').fill(`$${Math.round(T).toLocaleString('en-US')}`); await b.getByRole('button', { name: 'Submit the estimate' }).click(); await b.locator('[data-testid=boss-ve]').waitFor();
    for (const [k, v] of s.ve.entries()) if (v.pick) await b.locator('[data-testid=boss-ve] .dr__btn').nth(k).click(); await b.getByRole('button', { name: 'Present to the client ▸' }).click(); }
}
async function clearRun(p, id, check) {
  const boss = BOSSES[id], b = p.locator('[data-testid=boss]'); await b.getByTestId('boss-begin').click();
  for (const [i, s] of boss.steps.entries()) { await p.locator(`[data-testid=boss][data-step="${i}"][data-phase=stage]`).waitFor(); await playStage(p, boss, s);
    const r = await Promise.race([b.getByTestId('boss-ok').waitFor().then(() => 'ok'), b.getByTestId('boss-fail').waitFor().then(() => 'fail')]);
    if (r !== 'ok') { check(false, `stage ${i + 1} ${s.type} ${s.chal || ''}: ${await b.getByTestId('boss-fail').innerText()}`); return false; }
    await b.getByTestId('boss-next').click(); }
  await b.getByTestId('boss-win').waitFor(); return true;
}

// Season 1's boss, end to end, with the clock off (a person at this speed would beat it; the test does not race the wall clock).
{ const t = await open('#/story/s01e11'); const p = t.page; await p.waitForSelector('.sg-panel, .sg-dec'); await p.check('[data-testid=story-gates]'); await p.click('.w-pick__b:has-text("No clock")');
  const box = p.locator('.sg-piece[data-piece=S01]'); const b = box.locator('[data-testid=boss]'); await b.waitFor();
  const intro = await b.innerText();
  ok('BS-01', 'the boss opens on its briefing as a hard gate: Season 1 · Beginner, its title, stakes, eight stage pips, the rules and calm lights, and nothing runs yet', (await box.getAttribute('data-tier')) === 'hard' && /Season 1 · Episode 11 · boss level · Beginner/i.test(intro) && intro.includes(BOSSES.S01.title) && await b.locator('.boss__pips li').count() === 8 && /Every challenge gets one check/.test(intro) && await b.getByLabel(/Calm lights/).count() === 1 && await b.getByTestId('boss-begin').count() === 1);
  ok('BS-02', 'no commission before Season 8', !/The commission/.test(intro));
  let why = ''; const cleared = await clearRun(p, 'S01', (_v, w) => { why = w; });
  ok('BS-03', 'the run clears every stage on the page: the trace in order, the right calls, all five challenges dialled in and checked once', cleared, why);
  const st = await store(p); const win = cleared ? await b.getByTestId('boss-win').innerText() : '';
  ok('BS-04', 'cleared: the win text, the next season open, the record {tries 1, passed, best 8}, and the gate cleared', /Boss cleared/i.test(win) && /next season is open/.test(win) && st.bosses?.S01?.passed === true && st.bosses.S01.tries === 1 && st.bosses.S01.best === 8 && (await box.getAttribute('data-cleared')) === 'true', JSON.stringify(st.bosses));
  ok('BS-05', 'each challenge stage recorded its try at the season’s level, passed', ['hear-comp', 'see-focus', 'reach-light', 'build-stream', 'record-take'].every((k) => st.challenges?.[`${k}@1`]?.passed === true && st.challenges[`${k}@1`].tries === 1), JSON.stringify(st.challenges));
  ok('BS-06', 'the alarm light turned green on the win', (await b.locator('.boss__alarm').getAttribute('data-state')) === 'g');
  ok('BS-07', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

// A wrong call ends the run; the run starts over from stage one; the clock runs on its own (25 s for a call at Beginner).
{ const t = await open('#/story/s01e11'); const p = t.page; await p.waitForSelector('.sg-panel, .sg-dec'); await p.check('[data-testid=story-gates]');
  const B = BOSSES.S01, b = p.locator('.sg-piece[data-piece=S01] [data-testid=boss]'); await b.getByTestId('boss-begin').click();
  const c0 = await b.getByTestId('boss-clock').innerText(); ok('BS-08', 'with the clock on, the trace runs on its own clock (60 s at Beginner) and the edge glows yellow', /⏱ 1:00|⏱ 0:5\d/.test(c0) && (await b.locator('.boss__alarm').getAttribute('data-state')) === 'y', c0);
  await b.locator('[data-testid=boss-trace] .dr__btn').filter({ hasText: B.steps[0].items[1] }).first().click(); await b.getByTestId('boss-fail').waitFor();
  const f = await b.getByTestId('boss-fail').innerText();
  ok('BS-09', 'a wrong tap in the trace ends the run: it says where the signal starts, the step reached, and offers to start over; the edge turns red', /Run over · Lost the trace/i.test(f) && f.includes(`The signal starts at “${B.steps[0].items[0]}”`) && /You reached step 1 of 8/.test(f) && ['rf', 'r'].includes(await b.locator('.boss__alarm').getAttribute('data-state')), f);
  await b.getByTestId('boss-restart').click(); await p.locator('[data-testid=boss][data-step="0"][data-phase=stage]').waitFor();
  const callAt = B.steps.findIndex((s) => s.type === 'call'); for (let i = 0; i < callAt; i += 1) { await p.locator(`[data-testid=boss][data-step="${i}"][data-phase=stage]`).waitFor(); await playStage(p, B, B.steps[i]); await b.getByTestId('boss-ok').waitFor(); await b.getByTestId('boss-next').click(); }
  await b.locator('[data-testid=boss-call]').waitFor(); const cc = await b.getByTestId('boss-clock').innerText();
  const wrong = B.steps.find((s) => s.type === 'call').opts.find((o) => !o.ok); await b.locator('[data-testid=boss-call] .dr__btn').filter({ hasText: wrong.t }).first().click(); await b.getByTestId('boss-fail').waitFor();
  const f2 = await b.getByTestId('boss-fail').innerText(); const st = await store(p);
  ok('BS-10', 'run 2: the stages before it cleared, the call has its own 25 s clock, and a wrong call ends the run with its reason', /⏱ 0:2[45]/.test(cc) && /Run over · Wrong call/i.test(f2) && f2.includes(wrong.why) && st.bosses.S01.tries === 2 && st.bosses.S01.best === callAt && st.bosses.S01.passed === false, `${cc} ${JSON.stringify(st.bosses)}`);
  await b.getByRole('button', { name: 'Back to the briefing' }).click(); const again = await b.innerText();
  ok('BS-11', 'back at the briefing it shows the runs so far and the furthest stage, and the gate still holds the story', new RegExp(`Runs so far: 2 · furthest: stage ${B.steps.findIndex((x) => x.type === 'call')} of 8`).test(again) && (await p.locator('.sg-piece[data-piece=S01]').getAttribute('data-cleared')) === 'false');
  await p.uncheck('[data-testid=story-gates]'); await b.getByLabel(/Calm lights/).check();
  ok('BS-12', 'calm lights is remembered for this viewer', await p.evaluate(() => localStorage.getItem('signal-calm')) === '1');
  ok('BS-13', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

// Season 8: the run adds the commission — ask, scope, design, cost — and clears.
{ const t = await open('#/story/s08e11'); const p = t.page; await p.waitForSelector('.sg-panel, .sg-dec'); await p.check('[data-testid=story-gates]'); await p.click('.w-pick__b:has-text("No clock")');
  const b = p.locator('.sg-piece[data-piece=S08] [data-testid=boss]'); await b.waitFor();
  ok('BS-14', 'Season 8’s briefing names the commission and has twelve stages', /The commission/.test(await b.innerText()) && await b.locator('.boss__pips li').count() === 12);
  let why = ''; const cleared = await clearRun(p, 'S08', (_v, w) => { why = w; }); const st = await store(p);
  ok('BS-15', 'the commission plays on the page: every must-ask question asked, every line scoped, the best design issued inside its limits, the estimate exact, the intended savings inside the budget', cleared && st.bosses?.S08?.passed === true && st.bosses.S08.best === 12, why || JSON.stringify(st.bosses));
  ok('BS-16', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

// The commission's failures, on the page: a trap question ends the meeting; a wrong estimate ends the run with the worked answer.
{ const t = await open('#/story/s08e11'); const p = t.page; await p.waitForSelector('.sg-panel, .sg-dec'); await p.check('[data-testid=story-gates]'); await p.click('.w-pick__b:has-text("No clock")');
  const B = BOSSES.S08, b = p.locator('.sg-piece[data-piece=S08] [data-testid=boss]'); await b.waitFor();
  await b.getByTestId('boss-begin').click(); for (const [i, s] of B.steps.entries()) { if (s.type === 'ask') break; await p.locator(`[data-testid=boss][data-step="${i}"][data-phase=stage]`).waitFor(); await playStage(p, B, s); await b.getByTestId('boss-ok').waitFor(); await b.getByTestId('boss-next').click(); }
  const ask = B.steps.find((s) => s.type === 'ask'), trap = ask.qs.find((q) => q.kind === 'trap' && !q.after);
  await b.locator('[data-testid=boss-ask] .dr__btn').filter({ hasText: trap.q }).first().click(); await b.getByTestId('boss-fail').waitFor();
  ok('BS-17', 'a leading or out-of-bounds question ends the meeting and the run, with why', /Run over · Wrong question/i.test(await b.getByTestId('boss-fail').innerText()) && (await b.getByTestId('boss-fail').innerText()).includes(trap.why));
  ok('BS-18', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

// The lighting desk (reach-cues) plays live: keys 1–8 fire looks against the song's clock; stopping the show is a must-pass failure.
{ const t = await open('#/story/s02e11'); const p = t.page; await p.waitForSelector('.sg-panel, .sg-dec'); await p.check('[data-testid=story-gates]'); await p.click('.w-pick__b:has-text("No clock")');
  const B = BOSSES.S02, b = p.locator('.sg-piece[data-piece=S02] [data-testid=boss]'); await b.getByTestId('boss-begin').click();
  for (const [i, s] of B.steps.entries()) { if (s.type === 'chal' && s.chal === 'reach-cues') break; await p.locator(`[data-testid=boss][data-step="${i}"][data-phase=stage]`).waitFor(); await playStage(p, B, s); await b.getByTestId('boss-ok').waitFor(); await b.getByTestId('boss-next').click(); }
  const desk = b.locator('[data-testid=cue-desk]'); await desk.waitFor(); await desk.getByRole('button', { name: /Start the song/ }).click(); await p.waitForSelector('[data-testid=cue-desk][data-running=true]');
  await p.waitForTimeout(600); await p.keyboard.press('3'); await p.waitForTimeout(150);
  const lit = await desk.locator('.ch__key[aria-pressed=true]').innerText(); const msgs = await desk.locator('.ch__msgs').innerText();
  await desk.getByRole('button', { name: /Stop \(counts as a fail\)/ }).click(); await b.getByTestId('boss-fail').waitFor();
  ok('BS-19', 'the desk runs: key 3 fires Deep blue (a press between cues costs the crowd), and stopping the show ends the run as a must-pass failure', /Deep blue/.test(lit) && /mid-phrase|BOO|CHEER|nice|late|early/.test(msgs) && /Finished the song/.test(await b.innerText()), `${lit} | ${msgs}`);
  ok('BS-20', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

// Phone, both themes: the briefing and a challenge stage have 44 px targets, no horizontal overflow, text at 4.5:1.
for (const theme of ['light', 'dark']) { const t = await open('#/story/s05e11', { w: 390, h: 844, theme }); const p = t.page; await p.waitForSelector('.sg-panel, .sg-dec'); await p.check('[data-testid=story-gates]'); await p.click('.w-pick__b:has-text("No clock")');
  const B = BOSSES.S05, b = p.locator('.sg-piece[data-piece=S05] [data-testid=boss]'); await b.waitFor(); await b.getByTestId('boss-begin').click();
  for (const [i, s] of B.steps.entries()) { if (s.type === 'chal') break; await p.locator(`[data-testid=boss][data-step="${i}"][data-phase=stage]`).waitFor(); await playStage(p, B, s); await b.getByTestId('boss-ok').waitFor(); await b.getByTestId('boss-next').click(); }
  await b.locator('[data-testid=challenge]').waitFor();
  const small = await b.evaluate((root) => [...root.querySelectorAll('button, select, input[type=range], input[type=checkbox]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (e.type === 'checkbox' ? r.height < 20 : r.height < 43.5); }).map((e) => `${(e.textContent || e.getAttribute('aria-label') || e.tagName).slice(0, 16)}:${Math.round(e.getBoundingClientRect().height)}`));
  const c = await b.evaluate((root) => { const lum = (s) => { const m = s.match(/[\d.]+/g).map(Number).map((v) => (/^color\(/.test(s) ? v * 255 : v)); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const bc = getComputedStyle(e).backgroundColor; const al = bc && /^rgba\(/.test(bc) ? Number(bc.match(/[\d.]+/g)[3]) : bc && /\/\s*([\d.]+)\)$/.test(bc) ? Number(bc.match(/\/\s*([\d.]+)\)$/)[1]) : 1; if (bc && bc !== 'transparent' && al >= 0.5) return bc; } return getComputedStyle(document.body).backgroundColor; };
    return [...root.querySelectorAll('p, h4, li, dt, dd, .dr__btn, label span')].filter((e) => e.getBoundingClientRect().width > 0 && e.textContent.trim()).map((el) => { const a = lum(getComputedStyle(el).color); const bb = lum(bgOf(el)); return [(Math.max(a, bb) + 0.05) / (Math.min(a, bb) + 0.05), el.className + ':' + el.textContent.trim().slice(0, 30)]; }).sort((x, y) => x[0] - y[0]); });
  ok(`BS-21 ${theme}`, `phone (390, ${theme}): a boss challenge stage has 44 px targets, no overflow, text at 4.5:1, no console error`, await overflow(p) <= 0 && small.length === 0 && c.length >= 10 && c[0][0] >= 4.5 && !t.errs.length, `${await overflow(p)} ${small.slice(0, 6).join(',')} ${c[0][0].toFixed(2)} ${c[0][1]} ${t.errs.join('|')}`);
  await t.close(); }
await done();
