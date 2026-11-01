/** Re-verification after a substitution (substitution.ts): the four triggers, a non-match, and two substitutions on one test. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reopenedBySubstitution, substitutionReason, deviceFamily, IDENTITY_TEST } from '../src/index.js';

const rows = [
  { testId: 'camera_preset', domain: 'Video', devices: ['PA-0061'] },
  { testId: 'video_av_sync', domain: 'Video', devices: [] },
  { testId: 'audio_aec', domain: 'Audio', devices: [] },
  { testId: IDENTITY_TEST, domain: 'Physical', devices: [] },
  { testId: 'network_vlan', domain: 'Network', devices: ['PA-0070'] },
];
const camera = { assetId: 'PA-0061', label: 'Camera 1', category: 'camera', from: 'generic', to: 'SYN-PTZ-12X (synthetic PTZ camera)' };
const mic = { assetId: 'PA-0064', label: 'Ceiling microphone 1', category: 'micceil', from: 'generic', to: 'SYN-MIC-ARRAY (synthetic)' };
const byId = <T extends { testId: string }>(xs: T[]) => new Map(xs.map((x) => [x.testId, x] as const));

test('trigger 1: a plan row that names the substituted asset among its devices is reopened, with the API’s wording', () => {
  const r = byId(reopenedBySubstitution(rows, [camera])).get('camera_preset')!;
  assert.deepEqual(r.assets, ['PA-0061']);
  assert.deepEqual(r.reasons, ['Camera 1 (PA-0061) was substituted after acceptance (generic → SYN-PTZ-12X (synthetic PTZ camera)): the plan names it among the devices this test covers']);
  assert.equal(r.row, rows[0], 'the row is returned as given');
});

test('trigger 2: a camera reopens the Video tests of the room even when the row does not name it', () => {
  const r = byId(reopenedBySubstitution(rows, [camera])).get('video_av_sync')!;
  assert.deepEqual(r.reasons, ['Camera 1 (PA-0061) was substituted after acceptance (generic → SYN-PTZ-12X (synthetic PTZ camera)): it is a camera and this is a Video test of the room']);
  // a video bar is of the camera family too
  assert.equal(substitutionReason(rows[1]!, { ...camera, category: 'bar' }), 'it is a camera and this is a Video test of the room');
});

test('trigger 3: a part of the audio chain (dsp family) reopens the Audio tests', () => {
  for (const cat of ['micceil', 'mictable', 'micwireless', 'dsp', 'speaker', 'amp']) assert.equal(deviceFamily(cat), 'dsp', cat);
  const r = byId(reopenedBySubstitution(rows, [mic])).get('audio_aec')!;
  assert.deepEqual(r.reasons, ['Ceiling microphone 1 (PA-0064) was substituted after acceptance (generic → SYN-MIC-ARRAY (synthetic)): it is part of the audio chain and this is an Audio test of the room']);
  assert.equal(byId(reopenedBySubstitution(rows, [mic])).has('video_av_sync'), false, 'a microphone does not reopen a Video test');
});

test('trigger 4: the asset-identity check is reopened by every substitution', () => {
  const display = { assetId: 'PA-0050', label: 'Display 1', category: 'display', from: 'generic', to: 'SYN-DISP-75' };
  const out = reopenedBySubstitution(rows, [display]);
  assert.deepEqual(out.map((t) => t.testId), [IDENTITY_TEST], 'a display reopens only the identity check here');
  assert.deepEqual(out[0]!.reasons, ['Display 1 (PA-0050) was substituted after acceptance (generic → SYN-DISP-75): the asset identity is checked again after every substitution']);
});

test('a non-match: a test that does not depend on the substituted asset is not reopened; no substitution reopens nothing', () => {
  const out = reopenedBySubstitution(rows, [camera]);
  assert.deepEqual(out.map((t) => t.testId), ['camera_preset', 'video_av_sync', IDENTITY_TEST], 'in row order; Audio and Network untouched');
  assert.equal(substitutionReason(rows[4]!, camera), null);
  assert.deepEqual(reopenedBySubstitution(rows, []), []);
  assert.equal(substitutionReason({ testId: 'x', domain: 'Video' }, { ...camera, category: 'lighting' }), null, 'a row without devices and an unrelated family');
});

test('two substitutions on one test: one reason and one asset per substitution, in their order, each substitution returned', () => {
  const s1 = { ...camera, at: '2026-10-31T10:00:00.000Z' }; const s2 = { ...mic, at: '2026-10-31T11:00:00.000Z' };
  const id = byId(reopenedBySubstitution(rows, [s1, s2])).get(IDENTITY_TEST)!;
  assert.deepEqual(id.assets, ['PA-0061', 'PA-0064']);
  assert.equal(id.reasons.length, 2);
  assert.match(id.reasons[0]!, /^Camera 1 \(PA-0061\) .*identity is checked again/); assert.match(id.reasons[1]!, /^Ceiling microphone 1 \(PA-0064\) .*identity is checked again/);
  assert.deepEqual(id.substitutions.map((s) => s.at), [s1.at, s2.at], 'the caller’s own fields come back with each substitution');
  // the camera row is reopened by the camera only: the microphone is neither named nor of its domain
  assert.deepEqual(byId(reopenedBySubstitution(rows, [s1, s2])).get('camera_preset')!.assets, ['PA-0061']);
});
