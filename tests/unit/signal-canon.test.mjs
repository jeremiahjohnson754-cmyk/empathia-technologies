// The SIGNAL canon (packages/signal-canon) is carried unchanged, and the story engine (apps/demo/src/signal/story.ts) obeys the
// canon's own rules. A byte of story or art that changes fails here; so does a count that drifts from the package's statistics.
//   node --test tests/unit/signal-canon.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const canon = path.join(repo, 'packages/signal-canon');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'signal-canon-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * from './signal/story.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const E = await import(pathToFileURL(out).href);
const J = (p) => JSON.parse(fs.readFileSync(path.join(canon, 'data', p), 'utf8'));
const index = J('story/index.json'); const stats = J('stats.json'); const chapters = index.map((c) => J(`story/${c.id}.json`));
const all = chapters.flatMap((c) => c.items); const of = (t) => all.filter((i) => i.type === t);

test('SC-01 every canon file matches its recorded hash: nothing edited, nothing missing, nothing added', () => {
  const lines = fs.readFileSync(path.join(canon, 'MANIFEST.sha256'), 'utf8').trim().split('\n'); assert.equal(lines.length, 1764);
  const listed = new Set();
  for (const l of lines) { const [hash, , ...rest] = l.split('  '); const rel = rest.join('  '); listed.add(rel); assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(canon, 'data', rel))).digest('hex'), hash, rel); }
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.relative(path.join(canon, 'data'), path.join(d, e.name))]));
  assert.deepEqual(walk(path.join(canon, 'data')).filter((f) => !listed.has(f)), []);
});
test('SC-02 the canon is whole: Prologue of 11, 133 chapters in twelve seasons, and the package’s own counts', () => {
  assert.equal(index.length, 144); assert.equal(index.filter((c) => c.season === 0).length, 11); assert.equal(index.filter((c) => c.season >= 1).length, 133); assert.equal(stats.chapters, 133);
  assert.deepEqual([...new Set(index.map((c) => c.season))].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  for (const [type, key] of [['panel', 'panels'], ['decision', 'decisions'], ['quest', 'quests'], ['beat', 'beats'], ['talk', 'talks'], ['discovery', 'discoveries'], ['twist', 'twists'], ['history', 'quick_facts_in_story']]) assert.equal(of(type).length, stats[key], type);
  assert.equal(of('panel').length, 1610); assert.equal(chapters.filter((c, i) => index[i].season >= 1).flatMap((c) => c.items).filter((i) => i.type === 'panel').length, 1583); assert.equal(of('decision').length, 387);
});
test('SC-03 the twelve season names are the founder’s, in order', () => {
  assert.deepEqual(Object.values(J('seasons.json')), ['The Sanctuary', 'The Load-In', 'The Workplace', 'On Air', 'The Campus', 'The Drawing Set', 'The Estate', 'Topping Out', 'Breach', 'The Take', 'The Mission Room', 'Principal']);
});
test('SC-04 every panel has its art, matched by description, and the art is safe to place in the page', async () => {
  const { shipSignal } = await import(pathToFileURL(path.join(repo, 'apps/demo/build.signal.mjs')).href); const d = fs.mkdtempSync(path.join(os.tmpdir(), 'signal-ship-'));
  const r = shipSignal(repo, d); assert.deepEqual(r, { chapters: 144, panels: 1610 });
  for (const c of index) { assert.equal(fs.readFileSync(path.join(d, 'signal/story', `${c.id}.json`), 'utf8'), fs.readFileSync(path.join(canon, 'data/story', `${c.id}.json`), 'utf8'), c.id);
    const art = JSON.parse(fs.readFileSync(path.join(d, 'signal/art', `${c.id}.json`), 'utf8')); assert.equal(art.panels.length, c.counts.panel || 0, c.id); for (const s of art.panels) assert.ok(!/<script|<style|style="|\son[a-z]+=|href="(?!#)/i.test(s), c.id); }
  const shipped = JSON.parse(fs.readFileSync(path.join(d, 'signal/index.json'), 'utf8')); assert.equal(shipped.chapters.length, 144); assert.equal(shipped.stats.review_flags, 318);
});
test('SC-05 the canon keeps its ground rules: every decision can be passed, review flags are carried, no option is silently dropped', () => {
  for (const d of of('decision')) { assert.ok(d.options.length >= 2, d.id); assert.ok(d.options.some((o) => !o.fail), `${d.id} has no passing option`); assert.equal(new Set(d.options.map((o) => o.letter)).size, d.options.length, d.id); }
  assert.equal(new Set(of('decision').map((d) => d.id)).size, 387); assert.equal(Object.keys(J('flags.json')).length, 318);
  assert.ok(of('panel').filter((p) => p.flags.length).length > 1000, 'flags stay on their panels');
});
const s01 = chapters[index.findIndex((c) => c.id === 's01e00')].items; const dec = s01.find((i) => i.type === 'decision'); const failing = dec.options.find((o) => o.fail); const passing = dec.options.find((o) => !o.fail);
test('SC-06 a decision gates the story: nothing after it is reached until an option that does not fail is chosen', () => {
  const at = s01.indexOf(dec); let s = E.emptyChapter(); assert.equal(E.reached(s01, s, true), at + 1); assert.equal(E.reached(s01, s, false), s01.length);
  const f = E.choose(s, dec, failing.letter); assert.equal(f.outcome.kind, 'failed'); assert.equal(f.outcome.reason, failing.fail); assert.equal(E.reached(s01, f.state, true), at + 1); assert.equal(E.passed(f.state, dec.id), false);
  const p = E.choose(f.state, dec, passing.letter); assert.equal(p.outcome.kind, 'passed'); assert.ok(E.reached(s01, p.state, true) > at + 1); assert.equal(p.state.choices[dec.id].tries, 2); assert.deepEqual(p.state.choices[dec.id].failed, [failing.letter]);
  assert.equal(E.choose(p.state, dec, passing.letter).outcome.kind, 'refused'); assert.equal(E.choose(s, dec, 'Z').outcome.kind, 'refused');
});
test('SC-07 merit and trust come from the canon’s weights; failed attempts and hints cost what the canon says', () => {
  const clean = E.choose(E.emptyChapter(), dec, passing.letter).state; const t0 = E.tally(s01, clean); assert.equal(t0.merit, passing.weight.merit || 0); assert.equal(t0.firstTry, 1);
  const messy = E.choose(E.choose(E.emptyChapter(), dec, failing.letter).state, dec, passing.letter).state; assert.equal(E.tally(s01, messy).merit, (passing.weight.merit || 0) + (failing.weight.merit || 0)); assert.equal(E.tally(s01, messy).failedAttempts, 1);
  if ((passing.weight.merit || 0) > 0 && dec.hints.length) { const hinted = E.choose(E.emptyChapter(), dec, passing.letter, { hints: 2 }).state; assert.equal(E.tally(s01, hinted).merit, Math.round(passing.weight.merit * dec.hints[1].keep)); }
  const talk = s01.find((i) => i.type === 'talk'); const tk = E.answerTalk(E.emptyChapter(), talk.id, 0); assert.deepEqual(E.tally(s01, tk).trust, talk.options[0].trust); assert.equal(E.answerTalk(tk, talk.id, 1), tk, 'a reply cannot be taken back');
});
test('SC-08 every one of the 144 chapters can be read to its end by choosing passing options, and is then complete', () => {
  for (const [i, c] of chapters.entries()) { let s = E.emptyChapter(); let guard = 0;
    while (E.reached(c.items, s, true) < c.items.length || !E.complete(c.items, s)) { const d = c.items[E.reached(c.items, s, true) - 1]; assert.equal(d.type, 'decision', index[i].id); s = E.choose(s, d, d.options.find((o) => !o.fail).letter).state; assert.ok((guard += 1) < 50); }
    assert.ok(E.complete(c.items, s), index[i].id); assert.equal(E.tally(c.items, s).made, c.items.filter((x) => x.type === 'decision').length); }
});
test('SC-09 the clock follows the canon: on, doubled, or off; an untimed decision has no clock', () => {
  const timed = of('decision').find((d) => d.timer_s > 0); const untimed = of('decision').find((d) => !d.timer_s);
  assert.equal(E.seconds(timed, 'on'), timed.timer_s); assert.equal(E.seconds(timed, 'extended'), timed.timer_s * 2); assert.equal(E.seconds(timed, 'off'), null); if (untimed) assert.equal(E.seconds(untimed, 'on'), null);
  assert.equal(of('decision').filter((d) => d.timer_s > 0).length, stats.timed_decisions);
});
test('SC-10 emphasis marks are split, never interpreted as markup', () => {
  assert.deepEqual(E.emphasis('a **b** c *d*'), [{ t: 'a ' }, { t: 'b', b: true }, { t: ' c ' }, { t: 'd', i: true }]); assert.deepEqual(E.emphasis('<img src=x onerror=1>'), [{ t: '<img src=x onerror=1>' }]);
});
test('SC-11 no real brand, product or company is named in the story (the canon’s own rule; Dante is a character, not the protocol)', () => {
  const text = JSON.stringify(chapters); for (const w of ['Crestron', 'Extron', 'Q-SYS', 'Biamp', 'Shure', 'Cisco', 'Zoom', 'Microsoft Teams', 'YouTube', 'Twitch', 'PlayStation']) assert.ok(!new RegExp(`\\b${w}\\b`).test(text), w);
});
test('SC-12 the reader is returned to where they were: the unfinished chapter last opened, else the next unread one after it', () => {
  const ix = { chapters: index.map((c) => ({ id: c.id })) }; const fresh = E.emptyProgress(); assert.equal(E.resume(ix, fresh).id, 'pro01');
  assert.equal(E.resume(ix, { ...fresh, last: 's03e04', chapters: { s03e04: E.emptyChapter() } }).id, 's03e04');
  assert.equal(E.resume(ix, { ...fresh, last: 's03e04', chapters: { s03e04: { ...E.emptyChapter(), done: true } } }).id, 's03e05');
  assert.equal(E.nextOf(ix, 's12e11'), null); assert.equal(E.nextOf(ix, 'pro11').id, 's01e00');
});
