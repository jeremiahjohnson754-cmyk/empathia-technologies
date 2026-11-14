#!/usr/bin/env node
// Search Party's bar and results page against V2.5.3's (founder, 13 Nov 2026: "massive improvements to Search Party … preserve V2.5.3
// features"). V2.5.3's overlay opened on a directory before a word was typed (continue where you left off, questions to try), found
// issues, people and projects beside rooms and pages, narrowed results by facet with counts, and marked the matched word. Each is walked
// here, and the gate is checked: a role that may not open an issue's or a person's page is not shown it in the bar either.
//   node tests/browser/demo-search-parity.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-search-parity');
const bar = (p) => p.getByTestId('searchbar').locator('input');
const options = (p) => p.getByTestId('searchbar').locator('[role=option]');

{ const t = await open('#/find', { role: 'architect', sw: false }); const p = t.page; p.setDefaultTimeout(15000);
  await bar(p).click(); await p.waitForTimeout(200);
  const kinds0 = await options(p).evaluateAll((els) => els.map((e) => e.dataset.optionKind));
  ok('SP-01', 'before a word is typed the bar opens on questions the records answer (V2.5.3’s directory)', kinds0.length >= 2 && kinds0.includes('Try'), kinds0.join(','));
  await bar(p).fill('4.218'); await p.waitForTimeout(250); await bar(p).press('ArrowDown'); await bar(p).press('Enter'); await p.waitForFunction(() => /R-ATL-4-218/.test(location.hash));
  await p.goto(p.url().split('#')[0] + '#/find'); await bar(p).click(); await p.waitForTimeout(200);
  const recent = await options(p).filter({ has: p.locator('.sbar__kind', { hasText: 'Recent' }) }).allInnerTexts();
  ok('SP-02', 'what was opened from the bar comes back as “Continue where you left off”', recent.some((x) => /4\.218/.test(x)), recent.join(' | '));
  await bar(p).fill('intelligibility'); await p.waitForTimeout(300);
  const issue = await options(p).filter({ has: p.locator('.sbar__kind', { hasText: 'Issue' }) }).allInnerTexts(); const marked = await p.getByTestId('searchbar').locator('[role=option] mark').count();
  ok('SP-03', 'issues are found by their words, and the matched word is marked', issue.some((x) => /Speech intelligibility/.test(x)) && marked >= 1, issue.join(' | '));
  await bar(p).fill('champion'); await p.waitForTimeout(300);
  const person = await options(p).filter({ has: p.locator('.sbar__kind', { hasText: 'Person' }) }).count();
  ok('SP-04', 'people are found by their title', person >= 1, String(person));
  await p.goto(p.url().split('#')[0] + '#/find?q=atlas'); await p.getByTestId('find-facets').waitFor();
  const facets = await p.getByTestId('find-facets').locator('button').evaluateAll((els) => els.map((e) => `${e.dataset.facet}:${e.querySelector('.ui-meta')?.textContent}`));
  const all = Number((facets.find((f) => f.startsWith('all:')) || '0:0').split(':')[1]); const parts = facets.filter((f) => !f.startsWith('all:')).reduce((a, f) => a + Number(f.split(':')[1]), 0);
  await p.getByTestId('find-facets').locator('button[data-facet=room]').click(); await p.waitForTimeout(150);
  const groups = await p.locator('.fnd__group h2').allInnerTexts();
  ok('SP-05', 'the results page narrows by facet, each with its count, the counts add up, and a facet shows only its kind', facets.length >= 3 && all === parts && groups.length === 1 && /^Rooms/.test(groups[0] || ''), `${facets.join(' ')} → ${groups.join(',')}`);
  ok('SP-06', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }

{ // the gate: a visitor is not shown issues or people in the bar, because a visitor may not open those pages
  const t = await open('#/find', { role: 'visitor', sw: false }); const p = t.page; p.setDefaultTimeout(15000);
  const kindsFor = async (q) => { await bar(p).fill(q); await p.waitForTimeout(300); return options(p).locator('.sbar__kind').allInnerTexts(); };
  const a = await kindsFor('intelligibility'); const b = await kindsFor('champion');
  await p.goto(p.url().split('#')[0] + '#/find?q=champion'); await p.waitForTimeout(500);
  const pageText = await p.locator('main').innerText();
  ok('SP-07', 'a visitor sees no issue and no person, in the bar or on the results page', !a.includes('Issue') && !b.includes('Person') && !/\bPeople \(\d+\)/.test(pageText), `${a.join(',')} | ${b.join(',')}`);
  await t.close(); }
await done();
