import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EVENT_CONTRACTS } from '@empathia/event-contracts';
import { RESULT_LABELS } from '../src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../schemas');
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

test('every generated schema is valid JSON with $schema 2020-12 and a unique $id', () => {
  const files = walk(root).filter((f) => f.endsWith('.json') && !f.endsWith('INDEX.json'));
  assert.ok(files.length > 100);
  const ids = new Set<string>();
  for (const f of files) {
    const s = JSON.parse(fs.readFileSync(f, 'utf8'));
    assert.equal(s.$schema, 'https://json-schema.org/draft/2020-12/schema', f);
    assert.match(s.$id, /^https:\/\/schemas\.empathia\.invalid\//, f);
    assert.ok(!ids.has(s.$id), `duplicate $id ${s.$id}`); ids.add(s.$id);
  }
});

test('one event schema per event contract, each requiring its contract’s payload fields', () => {
  const ev = fs.readdirSync(path.join(root, 'events'));
  assert.equal(ev.length, Object.keys(EVENT_CONTRACTS).length);
  for (const [type, need] of Object.entries(EVENT_CONTRACTS)) {
    const s = JSON.parse(fs.readFileSync(path.join(root, 'events', `${type}.json`), 'utf8'));
    assert.deepEqual(s.properties.payload.required, [...need]);
  }
});

test('the index lists every file, and no entity schema allows a bare PASS', () => {
  const idx = JSON.parse(fs.readFileSync(path.join(root, 'INDEX.json'), 'utf8'));
  assert.equal(idx.files.length, walk(root).filter((f) => !f.endsWith('INDEX.json')).length);
  assert.ok(!(RESULT_LABELS as readonly string[]).includes('PASS'));
  const plan = JSON.parse(fs.readFileSync(path.join(root, 'entities/PlanRow.json'), 'utf8'));
  assert.ok(!plan.properties.result.enum.includes('PASS'));
  assert.ok(idx.counts.api >= 10);
});
