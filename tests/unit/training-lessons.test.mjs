// The Equipment Experience Engine's first lesson (A5, 12 Nov 2026): the record says what it applies to and where it comes from, its
// state is one of the named verification states and never claims device verification without it, its media exist, and the captions
// carry exactly the script's words, beat by beat.
//   node --test tests/unit/training-lessons.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/training/lessons.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const L = await import(pathToFileURL(out).href);
const beats = JSON.parse(fs.readFileSync(path.join(repo, 'media/training/pilot1/beats.json'), 'utf8')).beats;
const lesson = L.lessonOf('teams-rooms-windows-quickstart');

test('the lesson names vendor, product, platform, hardware, software, configuration differences, sources, reviewer and date', () => {
  for (const k of ['vendor', 'product', 'platform', 'hardware', 'software', 'reviewer', 'reviewed']) assert.ok(lesson[k], k);
  assert.ok(lesson.config.length >= 4); assert.ok(lesson.sources.length >= 1 && lesson.sources.every((s) => /^https:\/\/(support|learn)\.microsoft\.com\//.test(s.url) && s.read));
  assert.ok(lesson.notCovered.some((x) => /whiteboard/i.test(x)), 'what the sources do not say is said');
});
test('its state is a named verification state, short of device verification, and says so', () => {
  assert.ok(L.VERIFICATION.includes(lesson.state));
  assert.ok(L.VERIFICATION.indexOf(lesson.state) < L.VERIFICATION.indexOf('device/lab verified'));
  assert.match(lesson.stateNote, /Not device-verified/);
});
test('the practice has one correct choice with its reason, and a reason for each wrong one', () => {
  const ids = lesson.practice.choices.map((c) => c.id); assert.ok(ids.includes(lesson.practice.correct));
  for (const id of ids.filter((x) => x !== lesson.practice.correct)) assert.ok(lesson.practice.wrong[id], id);
});
test('the media exist where the page serves them, and the captions are the script word for word', () => {
  for (const f of ['video', 'captioned', 'captions', 'transcript', 'poster']) assert.ok(fs.existsSync(path.join(repo, 'apps/demo/public', lesson.media[f])), f);
  const vtt = fs.readFileSync(path.join(repo, 'apps/demo/public', lesson.media.captions), 'utf8');
  const cues = vtt.split(/\n\n/).slice(1).map((b) => b.split('\n').slice(2).join(' ').trim()).filter(Boolean);
  assert.deepEqual(cues, beats.map((b) => b.text));
  const tx = fs.readFileSync(path.join(repo, 'apps/demo/public', lesson.media.transcript), 'utf8'); for (const b of beats) assert.ok(tx.includes(b.text));
});
