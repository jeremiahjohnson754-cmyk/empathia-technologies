// Chapter locks (restored 12 Nov 2026, reference gate.js): a chapter opens once every hard and soft gate of the chapter before is cleared.
// Suites that test a later chapter as a returning reader would see it start from this: the stored progress of a reader who has cleared
// every hard and soft gate of every chapter before `chapterId` — the canonical choice at each decision, a full quiz, a passed drill, lab
// and boss, a proven incident and meltdown, a passed season review. Built from the canon in this repository, never from the page.
import fs from 'node:fs'; import path from 'node:path'; import { repo } from './demo-shell-lib.mjs';
const canon = (f) => JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data', f), 'utf8'));
export const STORY_KEY = 'empathia.signal.story.v1';
export function progressBefore(chapterId, extra = {}) {
  const order = canon('story/index.json').map((c) => c.id), at = order.indexOf(chapterId); if (at < 0) throw new Error(`unknown chapter ${chapterId}`);
  const before = new Set(order.slice(0, at)), gates = canon('gates.json').filter((g) => g.tier !== 'opt' && before.has(g.chapter)), app = canon('app-data.json');
  const p = { v: 2, chapters: {}, clock: 'on', gates: true, last: null, quizzes: {}, skips: {}, drills: {}, incidents: {}, labs: {}, reviews: {}, meltdowns: {}, bosses: {}, challenges: {} };
  const quiz = (id) => { const n = app.quizzes[id].qs.length; p.quizzes[id] = { best: n, total: n, first: n }; };
  const items = {}; const itemsOf = (ch) => (items[ch] = items[ch] || canon(`story/${ch}.json`).items);
  for (const g of gates) {
    const ch = (p.chapters[g.chapter] = p.chapters[g.chapter] || { choices: {}, talks: {}, found: [], done: true });
    if (g.kind === 'decision') { const d = itemsOf(g.chapter).find((i) => i.type === 'decision' && i.id === g.id); const L = d.options.find((o) => o.canonical).letter; ch.choices[g.id] = { letter: L, first: L, changes: 0, hints: 0 }; }
    else if (g.kind === 'quiz') quiz(g.id);
    else if (g.kind === 'lesson') quiz(app.lessons[g.id].quiz);
    else if (g.kind === 'drill') p.drills[g.id] = { passed: true, tries: 1, first: true };
    else if (g.kind === 'incident') p.incidents[g.id] = { best: 'proven', runs: 1, first: 'proven', firstWhy: 'declared' };
    else if (g.kind === 'lab') p.labs[g.id] = { passed: true, done: true, tries: 1, passTry: 1 };
    else if (g.kind === 'review') p.reviews[g.id] = { score: 80, pass: true, at: 1, dims: {} };
    else if (g.kind === 'meltdown') p.meltdowns[g.id] = { best: 'proven', grade: 'S', runs: 1, last: 'proven', first: 'proven', firstGrade: 'S', firstWhy: 'end' };
    else if (g.kind === 'boss') p.bosses[g.id] = { tries: 1, passed: true, best: app.bosses[g.id].steps.length };
    else throw new Error(`unknown gate kind ${g.kind}`);
  }
  return { ...p, ...extra };
}
/** An init script (for harness open) that stores that progress once per tab, before the page loads. */
export const unlockInit = (chapterId, extra) => ({ content: `try { if (!sessionStorage.getItem('__unlocked')) { localStorage.setItem(${JSON.stringify(STORY_KEY)}, ${JSON.stringify(JSON.stringify(progressBefore(chapterId, extra)))}); sessionStorage.setItem('__unlocked', '1'); } } catch (e) { /* */ }` });
