import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requiredDocuments, documentationStatus, documentationBlocker, signatureBlockers, lifecycleBlockers, DOCUMENT_KINDS, type DocumentationFact } from '../src/index.js';

test('the matrix follows what the room contains', () => {
  assert.equal(DOCUMENT_KINDS.length, 14, 'fourteen documents to upload; the fifteenth item of the tracker is the two signatures');
  assert.deepEqual(requiredDocuments([]).map((d) => d.kind), ['as_built_drawings', 'firmware_list', 'photo_set', 'photo_front_of_room', 'photo_ceiling', 'commissioning_report']);
  const all = requiredDocuments(['rack', 'switch', 'dsp', 'control', 'camera', 'compute', 'speaker']); assert.equal(all.length, 14);
  assert.ok(!requiredDocuments(['speaker', 'display']).some((d) => d.kind === 'dsp_file'), 'no audio processor, no DSP file');
});

test('status, blocker and signatures', () => {
  const required = requiredDocuments(['dsp']).map((d) => d.kind);
  const none: DocumentationFact = { required, states: {}, signed: {} };
  assert.equal(documentationStatus(none).percent, 0); assert.match(documentationBlocker(none)!, /0 of 8 required documents approved \(0%\) — not submitted: As-built drawings/);
  const states = Object.fromEntries(required.map((k) => [k, 'APPROVED'])) as DocumentationFact['states'];
  const approved: DocumentationFact = { required, states, signed: {} };
  assert.match(documentationBlocker(approved)!, /8 of 8 .*signature outstanding: the integrator’s and the owner’s$/);
  assert.deepEqual(signatureBlockers({ ...approved, states: { ...states, dsp_file: 'SUBMITTED' } }, 'VENDOR', 'p1', null), ['the packet is signed once every required document is approved (7 of 8)']);
  assert.deepEqual(signatureBlockers(approved, 'INTERNAL', 'p1', 'p1'), ['the two signatures are by two different people']);
  assert.deepEqual(signatureBlockers({ ...approved, signed: { VENDOR: true } }, 'VENDOR', 'p2', null), ['the integrator’s signature is on the packet already']);
  assert.equal(documentationBlocker({ ...approved, signed: { VENDOR: true, INTERNAL: true } }), null);
});

test('the acceptance gate holds on documentation, and only when the fact is given', () => {
  const rows = [{ id: 't1', applicable: true, result: 'PASS_VERIFIED' }] as never[];
  const results = { t1: { state: 'PASS', by: 'rec', verified: { by: 'ver' }, evidence: { kind: 'X', ref: 'e' } } } as never;
  const f = { from: 'COMMISSIONING', to: 'ACCEPTED' as const, classificationApproved: true, openIssues: [], savedRevisions: 1, rows, results, hasBaseline: true, hasLiveMonitoringEvidence: false };
  assert.deepEqual(lifecycleBlockers(f), []);
  const required = requiredDocuments([]).map((d) => d.kind);
  assert.match(lifecycleBlockers({ ...f, documentation: { required, states: {}, signed: {} } }).join(' '), /^documentation and submission: 0 of 6/);
  const states = Object.fromEntries(required.map((k) => [k, 'APPROVED'])) as DocumentationFact['states'];
  assert.deepEqual(lifecycleBlockers({ ...f, documentation: { required, states, signed: { VENDOR: true, INTERNAL: true } } }), []);
});
