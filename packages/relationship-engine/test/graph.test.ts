import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Graph, neighbourhood, impact, path, RELATIONS } from '../src/index.js';

const N = (type: string, id: string) => ({ type, id });
const g = new Graph([
  { from: N('Room', 'R1'), rel: 'LOCATED_IN', to: N('Building', 'B1'), provenance: 'DECLARED' },
  { from: N('Room', 'R1'), rel: 'PLANS_DEVICE', to: N('PlannedAsset', 'PA-1'), provenance: 'DECLARED' },
  { from: N('Room', 'R1'), rel: 'PLANS_DEVICE', to: N('PlannedAsset', 'PA-2'), provenance: 'DECLARED' },
  { from: N('PlannedAsset', 'PA-1'), rel: 'FEEDS', to: N('PlannedAsset', 'PA-2'), provenance: 'MODELED' },
  { from: N('RoomIssue', 'I1'), rel: 'ISSUE_ON', to: N('PlannedAsset', 'PA-1'), provenance: 'MODELED' },
  { from: N('Room', 'R2'), rel: 'LOCATED_IN', to: N('Building', 'B1'), provenance: 'DECLARED' },
]);

test('the relation vocabulary is the demonstrator’s (130 relations, with inverse labels)', () => {
  assert.equal(Object.keys(RELATIONS).length, 130);
  assert.ok(RELATIONS['PLANS_DEVICE']);
});
test('neighbourhood walks both directions to the depth asked', () => {
  const n1 = neighbourhood(g, N('Room', 'R1'), 1).map((s) => `${s.node.type}:${s.node.id}`);
  assert.deepEqual(n1.sort(), ['Building:B1', 'PlannedAsset:PA-1', 'PlannedAsset:PA-2', 'Room:R1']);
  const n2 = neighbourhood(g, N('Room', 'R1'), 2).map((s) => s.node.id);
  assert.ok(n2.includes('R2') && n2.includes('I1'));
});
test('visibility: a node the caller may not see is dropped, and so is what is only reachable through it', () => {
  const n = neighbourhood(g, N('Room', 'R1'), 3, (x) => x.id !== 'B1').map((s) => s.node.id);
  assert.ok(!n.includes('B1') && !n.includes('R2'));
});
test('impact follows only forward dependency relations', () => {
  assert.deepEqual(impact(g, N('PlannedAsset', 'PA-1')).map((x) => x.id), ['PA-2']);
  assert.deepEqual(impact(g, N('PlannedAsset', 'PA-2')), []);
});
test('shortest path between two rooms runs through their building', () => {
  const p = path(g, N('Room', 'R1'), N('Room', 'R2'))!;
  assert.equal(p.length, 2);
  assert.deepEqual(p.map((e) => e.rel), ['LOCATED_IN', 'LOCATED_IN']);
});
