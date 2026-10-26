import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_CONTRACTS, validateEvent, jsonSchemaFor } from '../src/index.js';

test('the catalogue carries the demonstrator’s 101 event types, including Build a Room’s', () => {
  assert.equal(Object.keys(EVENT_CONTRACTS).length, 101);
  for (const t of ['room.design_created', 'room.test_verified', 'commission.test_result_submitted', 'issue.assigned']) assert.ok(EVENT_CONTRACTS[t], t);
  assert.deepEqual([...EVENT_CONTRACTS['room.test_verified']!], ['designId', 'testId', 'resultLabel']);
});
test('a valid event passes; missing fields and a bare PASS label are refused', () => {
  const ok = { type: 'room.test_verified', aggregateType: 'Room', aggregateId: 'r1', aggregateRevision: 3, payload: { designId: 'r1', testId: 't', resultLabel: 'PASS_VERIFIED' } };
  assert.deepEqual(validateEvent(ok), []);
  assert.ok(validateEvent({ ...ok, payload: { designId: 'r1', testId: 't' } }).some((x) => /resultLabel/.test(x)));
  assert.ok(validateEvent({ ...ok, type: 'commission.test_result_submitted', payload: { planId: 'p', testId: 't', state: 'PASS', evidence: 'FIELD_OBSERVED', resultLabel: 'PASS' } }).some((x) => /bare|not a result label/.test(x)));
  assert.ok(validateEvent({ ...ok, type: 'nope.never' }).some((x) => /unknown event type/.test(x)));
});
test('every event type has a JSON Schema with its required payload fields', () => {
  for (const t of Object.keys(EVENT_CONTRACTS)) { const s = jsonSchemaFor(t) as any; assert.deepEqual(s.properties.payload.required, [...EVENT_CONTRACTS[t]!]); }
});
