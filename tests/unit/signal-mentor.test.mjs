// SIGNAL mentor channel, built-in answers (apps/demo/src/signal/mentor.ts) against the reference app.js offline(). Restored 12 Nov 2026.
//   node --test tests/unit/signal-mentor.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'signal-mentor-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/signal/mentor.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const X = await import(pathToFileURL(out).href);
const app = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/app-data.json'), 'utf8'));
test('MN-01 the canon carries twenty prepared answers and seven suggestions, and every suggestion finds a prepared answer', () => {
  assert.equal(app.askOffline.length, 20); assert.equal(app.askSuggest.length, 7);
  for (const s of app.askSuggest) assert.ok(X.mentorAnswer(s, app.askOffline).matched, s);
});
test('MN-02 the most keywords win (the first on a tie); case does not matter; no keyword gives the method line', () => {
  const A = [{ k: ['eq', 'seat'], a: 'one' }, { k: ['eq', 'seat', 'notch'], a: 'two' }, { k: ['breaker'], a: 'three' }];
  assert.equal(X.mentorAnswer('Why can EQ not fix a NOTCH at one seat?', A).text, 'two');
  assert.equal(X.mentorAnswer('eq at my seat', A).text, 'one');
  assert.deepEqual(X.mentorAnswer('hello', A), { text: X.MENTOR_FALLBACK, matched: false });
});
test('MN-03 the moving-notch suggestion answers with comb filtering, as the reference does', () => {
  assert.match(X.mentorAnswer("Why can't EQ fix a notch that moves between seats?", app.askOffline).text, /^\[comb filtering\]/);
});
