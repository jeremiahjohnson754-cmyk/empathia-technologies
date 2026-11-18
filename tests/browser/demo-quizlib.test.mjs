#!/usr/bin/env node
// The SIGNAL quiz library in Learn (18 Nov 2026; SIGNAL_INVENTORY “470 not yet reachable”): every one of the 693 quizzes reachable by
// kind (121 chapter checks, 121 UX rules, 224 twist checks, 4 season finals, 62 case checks, 31 fieldbook checks, 130 lesson checks);
// a season and words narrow it; a quiz plays in place, explains each answer, keeps its best score across a reload and links its chapter.
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-quizlib');
const t = await open('#/learn/library', { role: 'installer' }); const p = t.page;
await p.waitForSelector('[data-testid="quiz-library"]', { timeout: 15000 }).catch(() => undefined);
const counts = await p.$$eval('[data-testid="quiz-library"] .ln-kind', (b) => Object.fromEntries(b.map((x) => [x.dataset.kind, Number(x.querySelector('span').textContent)])));
ok('QL-01', 'every quiz is reachable, by kind', JSON.stringify(counts) === JSON.stringify({ chapter: 121, ux: 121, twist: 224, final: 4, case: 62, fieldbook: 31, lesson: 130 }), JSON.stringify(counts));
await p.click('.ln-kind[data-kind="twist"]'); await p.selectOption('[data-testid="ql-season"]', '4');
const n4 = await p.$$eval('[data-testid="ql-list"] a[data-quiz]', (a) => a.map((x) => x.dataset.quiz)); ok('QL-02', 'a season narrows the list', n4.length > 0 && n4.every((id) => /^Q-TW-S04/.test(id)), n4.slice(0, 4).join());
await p.click(`a[data-quiz="${n4[0]}"]`); await p.waitForSelector('[data-testid="ql-play"] [data-testid="quiz"]');
const nq = await p.$$eval('[data-testid="ql-play"] .learn__opts', (x) => x.length);
for (let i = 0; i < nq; i++) await p.click(`[data-testid="ql-play"] .learn__opts >> nth=${i} >> button >> nth=0`);
ok('QL-03', 'a quiz plays in place and explains each answer', (await p.$$eval('[data-testid="ql-play"] .ui-meta', (x) => x.filter((e) => /^(Right|Not quite)\./.test(e.textContent)).length)) === nq);
ok('QL-04', 'it links the chapter it belongs to', /#\/story\/s04e\d\d/.test(await p.getAttribute('[data-testid="ql-play"] a[href^="#/story/"]', 'href') || ''));
await p.reload(); await p.waitForSelector('[data-testid="quiz-library"]'); await p.click('.ln-kind[data-kind="twist"]'); await p.selectOption('[data-testid="ql-season"]', '4');
ok('QL-05', 'the best score is kept in this browser', /best \d+ of \d+/.test(await p.innerText(`a[data-quiz="${n4[0]}"]`)));
await p.click('.ln-kind[data-kind="ux"]'); await p.selectOption('[data-testid="ql-season"]', '0'); await p.fill('[data-testid="ql-search"]', 'alarm');
ok('QL-06', 'words narrow the list', (await p.$$('[data-testid="ql-list"] a[data-quiz]')).length >= 1);
ok('QL-07', 'no console errors, nothing off the origin', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | '));
await t.close();
const m = await open('#/learn/library', { role: 'installer', w: 390, h: 844, colorScheme: 'dark' }); await m.page.waitForSelector('[data-testid="quiz-library"]').catch(() => undefined);
const sw = await m.page.evaluate(() => document.documentElement.scrollWidth); ok('QL-08', '390 px dark: no sideways scroll', sw <= 390, sw); await m.close();
await done();
