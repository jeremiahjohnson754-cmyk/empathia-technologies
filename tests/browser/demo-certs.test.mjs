#!/usr/bin/env node
// Certification study spaces (founder, 18 Nov 2026). Every role may open them; the disclaimer is on every page; the comparison sets the
// three side by side with sources; a tab is addressable; study mode answers with its reason; a practice exam is timed, flags, asks before
// scoring, scores by duty and says a percentage is not AVIXA's scale; missed questions survive a reload; the keyboard works; 390 px and
// both themes hold; no console errors and nothing off the origin.
//   CEB-01 compare page; CEB-02 each exam's facts and weights; CEB-03 tab addresses; CEB-04 study mode; CEB-05 practice exam;
//   CEB-06 missed questions persist; CEB-07 keyboard; CEB-08 formula cards and calculator links; CEB-09 phone and dark
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-certs');
const DISC = /not affiliated with or endorsed by AVIXA/;

{ const t = await open('#/learn/certifications', { role: 'visitor' }); const p = t.page;
  ok('CEB-01a', 'a visitor opens the comparison', !!(await p.$('[data-testid="ct-compare"]')));
  const head = (await p.$$eval('[data-testid="ct-table"] thead th', (h) => h.map((x) => x.textContent.trim()))).slice(1);   /* the first header is the row labels' column, named for screen readers only */ ok('CEB-01b', 'three columns: CTS, CTS-D, CTS-I', head.join() === 'CTS,CTS-D,CTS-I', head.join());
  const txt = await p.innerText('main'); ok('CEB-01c', 'the disclaimer and the sources are shown', DISC.test(txt) && /CTS-I Candidate Handbook/.test(txt) && /Read 18 November 2026/.test(txt));
  ok('CEB-01d', 'no console errors, nothing off the origin', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

for (const [slug, total, first] of [['cts', '115', 'Creating AV Solutions'], ['cts-d', '110', 'Conduct a Needs Assessment'], ['cts-i', '110', 'Implement Pre-Installation Activities']]) {
  const t = await open(`#/learn/${slug}`, { role: 'employee' }); const facts = await t.page.innerText('[data-testid="ct-facts"]').catch(() => ''); const w = await t.page.innerText('[data-testid="ct-weights"]').catch(() => '');
  ok(`CEB-02 ${slug}`, 'facts and the outline’s duties are shown with the disclaimer', facts.includes(total) && /350/.test(facts) && w.includes(first) && DISC.test(await t.page.innerText('main')), facts.slice(0, 120)); await t.close();
}

{ const t = await open('#/learn/cts-i/guide', { role: 'installer' }); const p = t.page;
  ok('CEB-03a', 'a tab has its own address', !!(await p.$('[data-testid="ct-tab-guide"]')) && (await p.getAttribute('.ct-tabs a[data-tab="guide"]', 'aria-selected')) === 'true');
  ok('CEB-03b', 'the guide covers all six CTS-I duties', (await p.$$('[data-testid^="ct-guide-"]')).length === 6);
  await p.click('.ct-tabs a[data-tab="math"]'); await p.waitForSelector('[data-testid="ct-tab-math"]'); ok('CEB-03c', 'the math tab opens from the tabs', /Decibels: the one idea/.test(await p.innerText('main')));
  await t.close(); }

{ const t = await open('#/learn/cts/practice', { role: 'syseng' }); const p = t.page;
  await p.click('[data-testid="ct-study"]'); await p.waitForSelector('[data-testid="ct-q"]');
  const qid = await p.getAttribute('[data-testid="ct-q"]', 'data-qid'); await p.click('.ct-opt[data-n="0"]'); await p.waitForTimeout(80);
  const why = await p.$('[data-testid="ct-why"]'); ok('CEB-04a', 'study mode shows the reason after an answer', !!why, qid);
  const right = await p.$$eval('.ct-opt[data-state="right"]', (x) => x.length); ok('CEB-04b', 'and marks the right answer', right === 1);
  await p.click('.ct-opt[data-n="1"]'); const chosen = await p.$$eval('.ct-opt[aria-checked="true"]', (x) => x.map((e) => e.dataset.n)); ok('CEB-04c', 'an answer cannot be changed after it is revealed', chosen.join() === '0', chosen.join());
  ok('CEB-04d', 'no console errors', !t.errs.length, t.errs.join(' | ')); await t.close(); }

{ const t = await open('#/learn/cts-d/practice', { role: 'designer', init: () => { try { if (!sessionStorage.getItem('__cs')) { localStorage.removeItem('empathia.certs.progress.v1'); sessionStorage.setItem('__cs', '1'); } } catch { /* storage refused */ } } }); const p = t.page;
  await p.click('[data-testid="ct-exam-25"]'); await p.waitForSelector('[role="timer"]');
  const timer = await p.innerText('[role="timer"]'); ok('CEB-05a', 'a 25-question exam is timed at the real pace (about 34 minutes)', /^3[34]:\d\d left/.test(timer), timer);
  await p.click('.ct-opt[data-n="0"]'); await p.click('[data-testid="ct-flag"]'); ok('CEB-05b', 'a question can be flagged', (await p.getAttribute('.ct-dot[aria-current="step"]', 'data-flag')) === '1');
  ok('CEB-05c', 'an exam does not reveal answers before scoring', !(await p.$('[data-testid="ct-why"]')));
  await p.click('.ct-dot >> text="25"'); await p.click('[data-testid="ct-submit"]'); ok('CEB-05d', 'finishing asks first and says what is unanswered', /24 unanswered, 1 flagged/.test(await p.innerText('[data-testid="ct-runner"]')));
  await p.click('[data-testid="ct-submit-yes"]'); await p.waitForSelector('[data-testid="ct-results"]');
  const res = await p.innerText('[data-testid="ct-results"]'); ok('CEB-05e', 'results by duty, with the scale caveat', /of 25 correct/.test(res) && /does not convert to it/.test(res) && (await p.$$('[data-testid="ct-bydomain"] li')).length === 4, res.slice(0, 200));
  await p.click('[data-testid="ct-again"]'); await p.reload(); await p.waitForSelector('[data-testid="ct-missed"]');
  const lbl = await p.innerText('[data-testid="ct-missed"]'); ok('CEB-06', 'missed questions survive a reload and can be reviewed', /Review (2[0-5]|1\d)/.test(lbl) && !(await p.isDisabled('[data-testid="ct-missed"]')), lbl);
  ok('CEB-05f', 'no console errors, nothing off the origin', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

{ const t = await open('#/learn/cts-i/practice', { role: 'installer' }); const p = t.page;
  await p.click('[data-testid="ct-drill"]'); await p.waitForSelector('[data-testid="ct-qbox"]');
  const first = await p.getAttribute('[data-testid="ct-q"]', 'data-qid'); await p.focus('[data-testid="ct-qbox"]'); await p.keyboard.press('3');
  ok('CEB-07a', 'key 3 chooses the third answer', (await p.$$eval('.ct-opt[aria-checked="true"]', (x) => x.map((e) => e.dataset.n))).join() === '2');
  await p.keyboard.press('Enter'); const second = await p.getAttribute('[data-testid="ct-q"]', 'data-qid'); ok('CEB-07b', 'Enter moves on', second !== first && /^gen-/.test(second), `${first} → ${second}`);
  await t.close(); }

{ const t = await open('#/learn/cts/math', { role: 'service' }); const p = t.page;
  const before = await p.innerText('[data-testid="ct-cards"] .ct-card'); await p.click('[data-testid="ct-cards"] .ct-card'); const after = await p.innerText('[data-testid="ct-cards"] .ct-card');
  ok('CEB-08a', 'a formula card turns', before !== after && /=/.test(after), after);
  const href = await p.getAttribute('[data-testid="ct-sec-decibels"] .ct-tool', 'href'); ok('CEB-08b', 'formulas link to their Field Tools calculator', /^#\/field-tools\//.test(href || ''), href);
  await t.close(); }

for (const [hash, scheme] of [['#/learn/certifications', 'dark'], ['#/learn/cts/overview', 'light'], ['#/learn/cts-d/practice', 'dark']]) {
  const m = await open(hash, { role: 'installer', w: 390, h: 844, colorScheme: scheme }); const sw = await m.page.evaluate(() => document.documentElement.scrollWidth);
  ok(`CEB-09 ${hash} ${scheme}`, '390 px: no sideways scroll, no errors', sw <= 390 && !m.errs.length, `${sw} ${m.errs.join(' | ')}`); await m.close();
}
await done();
