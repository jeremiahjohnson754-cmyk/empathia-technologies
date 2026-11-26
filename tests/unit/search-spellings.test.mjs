#!/usr/bin/env node
// British and American spellings find the same things (26 Nov 2026). The text people read became American English (founder decisions
// CR-D2 and CR-D3); an independent review found that the page search and the menu search matched words exactly, so "lecture theatre"
// no longer found the campus lecture hall, whose words now say "theater". apps/demo/src/search/spelling.ts gives each typed word its
// other spelling, in both directions; a word with no other spelling is searched exactly as it was (the first test).
//   node --test tests/unit/search-spellings.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'search-spellings-'));
const entry = path.join(tmp, 'entry.ts'); const out = path.join(tmp, 'm.mjs');
const src = (p) => JSON.stringify(path.join(repo, 'apps/demo/src', p));
fs.writeFileSync(entry, `export * as sp from ${src('search/spelling.ts')}; export * as find from ${src('search/find.ts')};`);
await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', loader: { '.json': 'json' } });
const { sp, find } = await import(pathToFileURL(out).href);

test('each spelling gives the other, in both directions and inside longer words; other words are left alone', () => {
  assert.deepEqual(sp.spellings('theatre').sort(), ['theater', 'theatre']);
  assert.deepEqual(sp.spellings('Theater').sort(), ['theater', 'theatre']);
  assert.ok(sp.spellings('organisations').includes('organizations'));
  assert.ok(sp.spellings('licences').includes('licenses'));
  assert.ok(sp.spellings('colour').includes('color') && sp.spellings('color').includes('colour'));
  assert.deepEqual(sp.spellings('huddle'), ['huddle']);
});

test('the page search gives the same results for either spelling (the campus lecture hall, Highfield 1.110, among them)', () => {
  const uk = find.find('lecture theatre'), us = find.find('lecture theater');
  assert.ok(us.length > 0, 'the American spelling finds something');
  assert.deepEqual(uk.map((h) => h.id), us.map((h) => h.id));
  assert.ok(us.some((h) => /Highfield 1\.110/.test(h.label)), us.map((h) => h.label).join(' | '));
  assert.deepEqual(find.find('operations centre').map((h) => h.id), find.find('operations center').map((h) => h.id));
  assert.ok(find.find('operations centre').length > 0);
});

test('either spelling ranks the same: a building named outright leads, whichever way it is spelled', () => {
  const uk = find.find('centre', 40).map((h) => h.id), us = find.find('center', 40).map((h) => h.id);
  assert.deepEqual(uk, us);
  assert.equal(find.find('center', 40)[0].kind, 'building', find.find('center', 3).map((h) => h.label).join(' | '));
});
