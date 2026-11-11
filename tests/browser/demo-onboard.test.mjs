#!/usr/bin/env node
// The IT Onboarding Success Guide (#/onboard; apps/demo/src/onboard) against the built demo: the four editions, each held by the role
// it is for; a starter's day through to a manager's review and a mentor's feedback in one browser; what each role is and is not
// shown of one person's progress; publishing; the organisation's own details read from records and never invented; phones; print.
//   PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/demo-onboard.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, main, done, base } = await harness('demo-onboard');
const clean = (t) => t.errs.length === 0 && t.off.length === 0;
const over = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const led = (p, type) => p.evaluate((ty) => (JSON.parse(localStorage.getItem('empathia.demo.workspace.v1') || '{}').events || []).filter((e) => e.type === ty).map((e) => `${e.outcome}:${e.detail}`), type);
const as = async (p, role, hash, sel = '[data-testid=onboard]') => { await p.evaluate((r) => localStorage.setItem('empathia.demo.perspective', r), role); await p.goto(`${base}${hash}`); await p.reload(); await p.waitForSelector(sel); };
const eds = (p) => p.evaluate(() => [...document.querySelectorAll('[data-testid=ob-editions] a')].map((a) => `${a.dataset.edition}${a.getAttribute('aria-current') ? '*' : ''}`).join(' '));
const item = (p, id) => p.evaluate((i) => { const x = document.querySelector(`[data-item="${i}"]`); return x ? { done: x.dataset.done, text: x.innerText.replace(/\s+/g, ' ') } : null; }, id);
const RIGHT = { security: [2, 0], service: [1, 0], room: [1, 2], network: [0, 1], escalation: [2, 1], communication: [0, 1] };
const answer = async (p, id, picks) => { for (let i = 0; i < picks.length; i++) await p.locator(`[data-testid=ob-check-${id}] fieldset`).nth(i).locator('input').nth(picks[i]).check(); await p.click(`[data-testid=ob-check-go-${id}]`); };

{ const t = await open('#/onboard', { role: 'service' }); const p = t.page; await p.waitForSelector('[data-testid=onboard]'); const m = await main(p);
  ok('OBB-01', 'the starter lands on the employee edition, which says what the guide is: a draft, synthetic, with its revision and review date', await p.getAttribute('[data-testid=onboard]', 'data-edition') === 'employee' && await eds(p) === 'employee*' && /Draft: not yet reviewed by a practising IT manager/.test(m) && /Revision 1, published .* review by /.test(m) && await p.getAttribute('[data-testid=ob-fresh]', 'data-state') === 'CURRENT', await eds(p));
  const prof = await p.innerText('[data-testid=ob-profile]'); const miss = await p.innerText('[data-testid=ob-missing]');
  ok('OBB-02', 'the starter’s own details come from the organisation’s records, and what it has not provided is said, not filled in', /Northstar \(a synthetic organisation\)/.test(prof) && /Service Engineer at Atlas HQ · \d+ rooms/.test(prof) && /Manager\s+\S+ \S+/.test(prof) && /Mentor\s+\S+ \S+/.test(prof) && /Not recorded by this organisation: department, approved software, internal standards, required training, equipment assignments, access procedures, vendors and agreements, organisational content approved by hr\. Nothing is filled in/.test(miss), miss);
  const shape = await p.evaluate(() => ({ phases: [...document.querySelectorAll('[data-testid^=ob-phase-]')].map((x) => x.dataset.testid.slice(9)).join(' '), items: document.querySelectorAll('[data-item]').length, checks: document.querySelectorAll('[data-testid^=ob-check-go-]').length, mine: document.querySelectorAll('[data-testid^=ob-done-]').length, confirm: document.querySelectorAll('[data-testid^=ob-confirm-], [data-testid^=ob-review-go-], [data-testid=ob-publish-go]').length }));
  ok('OBB-03', 'six phases from before day one to day ninety; the starter is offered their own items and checks, and no step that is a manager’s, a mentor’s or an administrator’s', shape.phases === 'pre day1 week1 month1 day60 day90' && shape.items >= 30 && shape.checks === 6 && shape.mine >= 10 && shape.confirm === 0, JSON.stringify(shape));
  await p.click('[data-testid=ob-done-pre-welcome]'); const a = await item(p, 'pre-welcome');
  ok('OBB-04', 'saying an item is done records it as the starter’s own word, with the date, and removes the button', a.done === 'yes' && /Done on \d+ \w+ \d{4}/.test(a.text) && await p.locator('[data-testid=ob-done-pre-welcome]').count() === 0 && /marked done by the starter \(their own word\)/.test((await led(p, 'onboard.item_done'))[0]), a.text.slice(-80));
  await answer(p, 'security', [0, 0]); await p.waitForSelector('[data-testid=ob-check-result-security]');
  const r1 = await p.evaluate(() => ({ passed: document.querySelector('[data-testid=ob-check-result-security]').dataset.passed, marks: [...document.querySelectorAll('[data-testid=ob-check-security] fieldset')].map((f) => f.dataset.marked).join(' '), why: document.querySelectorAll('[data-testid=ob-check-security] .ob-because').length }));
  ok('OBB-05', 'a check with one answer wrong is not passed, shows which and why, and leaves its item open', r1.passed === 'no' && r1.marks === 'wrong right' && r1.why === 2 && (await item(p, 'd1-security')).done === 'no', JSON.stringify(r1));
  await answer(p, 'security', RIGHT.security); await p.waitForFunction(() => document.querySelector('[data-item="d1-security"]').dataset.done === 'yes');
  ok('OBB-06', 'with every answer right the item is done by the check itself; the ledger records that the check was taken, twice, and nothing about how it went', (await led(p, 'onboard.check_taken')).length === 2 && /was taken \(try 2\)\. The result is shown to the starter and their manager and is not written here/.test((await led(p, 'onboard.check_taken'))[0]) && !(await led(p, 'onboard.check_taken')).some((x) => /\d of \d|passed/.test(x)) && await p.locator('[data-testid=ob-check-security]').count() === 0);
  const mentorItem = await item(p, 'd1-mentor'); const need = await p.locator('[data-item="w1-tools"] [data-need=software]').count();
  ok('OBB-07', 'an item the mentor confirms says so and offers the starter no button; an item that depends on something the organisation has not recorded says that', /Confirmed by the mentor\./.test(mentorItem.text) && mentorItem.done === 'no' && need === 1 && /has not recorded its approved software\. Ask your manager; nothing is assumed here/.test((await item(p, 'w1-tools')).text));
  const links = await p.evaluate(() => [...document.querySelectorAll('.ob-tags a')].map((a) => a.getAttribute('href')));
  ok('OBB-08', 'the places the programme sends the starter are real pages of this organisation’s own site and people', links.length >= 8 && links.every((h) => /^#\/(people|lite|guide|servicehands|docs|knowledge|learn|control)/.test(h)) && links.some((h) => /^#\/people\/p-/.test(h)) && links.some((h) => /^#\/lite\/b\/ATL$/.test(h)), links.join(' '));
  await p.goto(`${base}#/onboard/manager`); await p.waitForSelector('[data-testid=ob-not-held]');
  ok('OBB-09', 'the starter cannot open the manager’s edition by its address: it says whose it is and shows nothing of it', /does not hold the manager edition\. It is for the starter’s manager/.test(await p.innerText('[data-testid=ob-not-held]')) && await p.locator('[data-testid=ob-manager-items], [data-testid^=ob-review-]').count() === 0);

  // the manager, in the same browser: the starter's record is the one they see
  await as(p, 'svcmgr', '#/onboard');
  ok('OBB-10', 'the manager lands on the manager edition and holds two editions', await p.getAttribute('[data-testid=onboard]', 'data-edition') === 'manager' && await eds(p) === 'employee manager*');
  const pre = await p.evaluate(() => { const r = document.querySelector('[data-testid=ob-phases] tr[data-phase=pre]'); return r.innerText.replace(/\s+/g, ' '); });
  ok('OBB-11', 'progress by phase shows what the starter did; a milestone is “Open” until every item is done', /Before day one .*1 of 5 .*None in this phase .*Open/.test(pre) && /This organisation has not recorded its access procedures/.test(await p.innerText('[data-testid=ob-access]')), pre);
  await p.fill('[data-testid=ob-note-pre-access]', 'Accounts tested with the starter on a call.'); await p.click('[data-testid=ob-confirm-pre-access]'); for (const id of ['pre-start', 'pre-kit', 'pre-mentor']) await p.click(`[data-testid=ob-confirm-${id}]`);
  const met = await p.getAttribute('[data-testid=ob-phases] tr[data-phase=pre]', 'data-met');
  ok('OBB-12', 'the manager confirms their own four items, and “before day one” becomes a met milestone by itself', met === 'yes' && /You confirmed on .* that accounts and access are ready/.test(await p.innerText('[data-testid=ob-access]')) && (await led(p, 'onboard.item_done')).filter((x) => /confirmed by the manager/.test(x)).length === 4, met);
  await p.click('[data-testid=ob-review-go-w1-review]'); const noRate = await p.innerText('[data-testid=ob-refused]');
  for (const c of ['record', 'diagnose', 'handon', 'people', 'safe']) await p.locator(`[data-testid=ob-review-w1-review] input[name="w1-review-${c}"]`).nth(1).check();
  await p.click('[data-testid=ob-review-go-w1-review]'); const noNote = await p.innerText('[data-testid=ob-refused]');
  await p.fill('[data-testid=ob-review-note-w1-review]', 'Agreed: shadow two more visits, then take a job alone.'); await p.click('[data-testid=ob-review-go-w1-review]'); await p.waitForSelector('[data-testid=ob-review-w1-review][data-recorded=yes]');
  ok('OBB-13', 'a review needs all five ratings and what was agreed; recorded, it shows them, says which items of the phase are still open, and the note is not in the ledger', /Give a rating for “Keeps the record”/.test(noRate) && /what was agreed \(at least 12 characters\)/.test(noNote) && /Agreed: shadow two more visits/.test(await p.innerText('[data-testid=ob-review-w1-review]')) && /items? of this phase (is|are) still open/.test(await p.innerText('[data-testid=ob-open-w1-review]')) && !(await led(p, 'onboard.review_recorded')).some((x) => /Agreed/.test(x)), noRate);
  await p.goto(`${base}#/onboard/employee`); await p.waitForSelector('[data-testid=ob-programme-only]');
  ok('OBB-14', 'the manager reading the employee edition reads the programme; the starter’s progress is in their own edition, and no starter button is offered', /The starter’s progress is in the manager edition/.test(await p.innerText('[data-testid=ob-programme-only]')) && await p.locator('[data-testid^=ob-done-], [data-testid^=ob-check-go-]').count() === 0 && await p.locator('[data-item][data-done=yes]').count() === 0);

  // the mentor
  await as(p, 'syseng', '#/onboard');
  ok('OBB-20', 'the mentor lands on the mentor edition: their coaching plan, and no review of the starter', await p.getAttribute('[data-testid=onboard]', 'data-edition') === 'mentor' && await eds(p) === 'employee mentor*' && await p.locator('[data-testid=ob-mentor-items] [data-item]').count() >= 5 && !/Agreed: shadow/.test(await main(p)) && await p.locator('[data-testid^=ob-review-]').count() === 0);
  await p.click('[data-testid=ob-confirm-w1-shadow]'); const fb = await p.innerText('[data-testid=ob-refused]');
  await p.fill('[data-testid=ob-note-w1-shadow]', 'Showed the order: power, source, sound, far end. Next: you lead.'); await p.click('[data-testid=ob-confirm-w1-shadow]'); await p.click('[data-testid=ob-confirm-d1-mentor]');
  ok('OBB-21', 'an exercise is confirmed only with its feedback; a meeting needs none', /An exercise is confirmed with its feedback/.test(fb) && (await item(p, 'w1-shadow')).done === 'yes' && /Showed the order/.test((await item(p, 'w1-shadow')).text) && (await item(p, 'd1-mentor')).done === 'yes', fb);
  const mp = await p.innerText('[data-testid=ob-mentor-progress]');
  ok('OBB-22', 'the mentor sees how far the starter is by phase, and is told what they are not shown', /not shown the starter’s own notes, their check answers or their reviews/.test(mp) && /First day\s+\d of \d/.test(mp), mp.replace(/\s+/g, ' ').slice(0, 200));

  // back to the starter: what the others did is there
  await as(p, 'service', '#/onboard'); const sh = await item(p, 'w1-shadow');
  ok('OBB-23', 'the starter reads the mentor’s feedback and the manager’s confirmations in their own programme', sh.done === 'yes' && /Showed the order: power, source, sound, far end\. Next: you lead\./.test(sh.text) && (await item(p, 'pre-access')).done === 'yes' && await p.getAttribute('[data-testid=ob-phase-pre]', 'data-met') === 'yes' && Number(await p.getAttribute('[data-testid=ob-progress]', 'data-done')) === 9, await p.getAttribute('[data-testid=ob-progress]', 'data-done'));

  // the administrator: counts and publishing, never a person's notes
  await as(p, 'steward', '#/onboard'); const am = await main(p);
  ok('OBB-30', 'the administrator lands on the administrator edition: counts only, with none of the notes anyone wrote', await p.getAttribute('[data-testid=onboard]', 'data-edition') === 'administrator' && await eds(p) === 'employee administrator*' && await p.getAttribute('[data-testid=ob-report] dl', 'data-items') === '9' && await p.getAttribute('[data-testid=ob-report] dl', 'data-reviews') === '1' && !/Agreed|Showed the order|Accounts tested/.test(am) && /not shown a person’s notes, ratings or answers/.test(am));
  const fields = await p.evaluate(() => [...document.querySelectorAll('[data-testid=ob-fields] tr[data-field]')].map((r) => `${r.dataset.field}:${r.dataset.recorded}`).join(' '));
  ok('OBB-31', 'what the organisation has provided is a table: six recorded, eight not, and each says where it is read from', (fields.match(/:yes/g) || []).length === 6 && (fields.match(/:no/g) || []).length === 8 && /The programme exists in English only/.test(am), fields);
  await p.click('[data-testid=ob-publish-go]'); const pn = await p.innerText('[data-testid=ob-refused]'); await p.fill('[data-testid=ob-publish-note]', 'Added the vendor section for this site.'); await p.selectOption('[data-testid=ob-publish-days]', '90'); await p.click('[data-testid=ob-publish-go]'); await p.waitForSelector('[data-testid=ob-revisions] li[data-rev="2"]');
  const revs = await p.evaluate(() => [...document.querySelectorAll('[data-testid=ob-revisions] li')].map((x) => `${x.dataset.rev}:${x.dataset.state}`).join(' '));
  ok('OBB-32', 'publishing needs what changed; the new revision is published, the earlier one archived and still listed, and every edition carries the new number', /Say what changed in this revision/.test(pn) && revs === '2:PUBLISHED 1:ARCHIVED' && await p.getAttribute('[data-testid=onboard]', 'data-rev') === '2' && /Revision 2, published/.test(await main(p)), revs);
  await p.reload(); await p.waitForSelector('[data-testid=onboard]'); ok('OBB-33', 'it survives a reload', await p.getAttribute('[data-testid=onboard]', 'data-rev') === '2' && await p.getAttribute('[data-testid=ob-report] dl', 'data-items') === '9');
  await p.emulateMedia({ media: 'print' }); await as(p, 'service', '#/onboard'); await p.waitForTimeout(200);
  const pr = await p.evaluate(() => { const vis = (s) => [...document.querySelectorAll(s)].some((e) => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0); return { chrome: vis('.shell__bar, .rail, .foot, .ob-eds'), buttons: vis('.ob button, .ob-check'), items: document.querySelectorAll('[data-item]').length, over: document.documentElement.scrollWidth - innerWidth }; });
  ok('OBB-34', 'printed, the starter’s edition is the programme and its record without the app, its buttons or its forms', !pr.chrome && !pr.buttons && pr.items >= 30 && pr.over <= 0, JSON.stringify(pr)); await p.emulateMedia({ media: 'screen' });
  ok('OBB-35', 'no console error and nothing requested off the origin', clean(t), [...t.errs, ...t.off].join(' | ')); await t.close(); }

// a technical colleague who is none of the four reads the programme only; roles outside are not admitted
{ const t = await open('#/onboard', { role: 'installer' }); const p = t.page; await p.waitForSelector('[data-testid=onboard]');
  ok('OBB-40', 'an Installation Engineer reads the programme and is shown nobody’s progress and no step', await eds(p) === 'employee*' && /shown to them, their manager and their mentor, and to nobody else/.test(await p.innerText('[data-testid=ob-programme-only]')) && await p.locator('[data-testid=ob-profile], [data-testid=ob-progress], .ob button').count() === 0); await t.close(); }
for (const role of ['employee', 'visitor', 'sitechamp', 'exec']) { const t = await open('#/onboard/administrator', { role }); await t.page.waitForTimeout(700); const m = await main(t.page);
  ok(`OBB-41-${role}`, `the guide is not open to the ${role}: nothing of it is shown`, /is not open to the/.test(m) && await t.page.locator('[data-testid=onboard]').count() === 0, m.slice(0, 90)); await t.close(); }

for (const [role, w] of [['service', 390], ['service', 320], ['svcmgr', 390], ['steward', 390]]) { const t = await open('#/onboard', { role, w, h: 780 }); const p = t.page; await p.waitForSelector('[data-testid=onboard]');
  const small = await p.evaluate(() => [...document.querySelectorAll('.ob .ui-btn, .ob .ob-opt, .ob-eds a, .ob select, .ob input[type=text]')].filter((b) => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 43.5; }).length);
  ok(`OBB-50-${role}-${w}`, `at ${w} px the ${role}’s edition fits the screen, has one h1, and every control is at least 44 px tall`, await over(p) <= 0 && small === 0 && await p.locator('main h1').count() === 1 && clean(t), `over=${await over(p)} small=${small}`); await t.close(); }

await done();
