/** Parity of the design-construction rules with the demonstrator: template instantiation and the proposed-connection rules. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { templateDevices, proposeConnections, polygonCheck, outlineFor } from '../src/index.js';

const require = createRequire(import.meta.url);
const golden = JSON.parse(fs.readFileSync(require.resolve('@empathia/domain-data/golden/room-engine-golden.json'), 'utf8'));
const defaults = golden.data.filter((c: any) => /^template:[a-z_]+$/.test(c.name));

test('15 template default cases are present', () => assert.equal(defaults.length, 15));

for (const c of defaults) {
  test(`template instantiation: ${c.name}`, () => {
    let n = 0;
    const devs = templateDevices(c.input.template, c.input.geometry.points, () => `T-${(n += 1)}`);
    const pick = (x: any) => ({ cat: x.cat, label: x.label, x: x.x, y: x.y, rot: x.rot, mount: x.mount, furniture: !!x.furniture, z: x.z });
    assert.deepEqual(devs.map(pick), c.input.devices.map(pick));
  });
  test(`proposed connections: ${c.name}`, () => {
    const g = c.input.connections;
    const prefix = g.length ? g[0].id.replace(/\d+$/, '') : 'CN-';
    let n = 0;
    const got = proposeConnections({ devices: c.input.devices, connections: [] }, () => `${prefix}${(n += 1)}`);
    const pick = (x: any) => ({ id: x.id, from: x.from, to: x.to, kind: x.kind, why: x.why });
    assert.deepEqual(got.map(pick), g.map(pick));
  });
}

test('outline rules: a bow-tie is refused, a rectangle accepted and shifted to 0,0', () => {
  assert.match((polygonCheck([[0, 0], [4, 4], [4, 0], [0, 4]]) as { why: string }).why, /cross/);
  const ok = polygonCheck([[10, 10], [14, 10], [14, 13], [10, 13]]) as { points: number[][]; area: number };
  assert.deepEqual(ok.points[0], [0, 0]);
  assert.equal(ok.area, 12);
  assert.deepEqual(outlineFor('rect', 3, 4), [[0, 0], [3, 0], [3, 4], [0, 4]]);
});

// ---- capacity (18 Nov 2026): a switch has ports and an amplifier has channels. The fifteen parity cases above have one of each and
// are unchanged; these are rooms the demonstrator's templates never made.
import { newDevice } from '../src/index.js';
const room = (cats: string[]) => { const out: any[] = []; cats.forEach((cat, i) => out.push(newDevice(`D-${i + 1}`, cat, out, { x: i, y: 1 }))); return out; };
const propose = (devices: any[], connections: any[] = []) => { let n = connections.length; return proposeConnections({ devices, connections }, () => `CN-${(n += 1)}`); };

test('capacity: loudspeakers go to the first amplifier with a free channel, and to the first when none has', () => {
  const one = room(['dsp', 'amp', ...Array(6).fill('speaker')]); const a1 = propose(one).filter((c) => c.why === 'amplifier → loudspeaker');
  assert.deepEqual([...new Set(a1.map((c) => c.from))], ['D-2'], 'one amplifier takes them all, over its four channels, as it always did'); assert.equal(a1.length, 6);
  const two = room(['dsp', 'amp', 'amp', ...Array(6).fill('speaker')]); const a2 = propose(two).filter((c) => c.why === 'amplifier → loudspeaker');
  assert.deepEqual(a2.map((c) => c.from), ['D-2', 'D-2', 'D-2', 'D-2', 'D-3', 'D-3'], 'four on the first (its channels), the rest on the second');
  assert.equal(new Set(a2.map((c) => c.to)).size, 6, 'each loudspeaker is driven once');
  const full = room(['dsp', 'amp', 'amp', ...Array(10).fill('speaker')]); const a3 = propose(full).filter((c) => c.why === 'amplifier → loudspeaker');
  assert.deepEqual([a3.filter((c) => c.from === 'D-2').length, a3.filter((c) => c.from === 'D-3').length], [6, 4], 'both full: the overflow goes to the first, and the design check has it to report');
});

test('capacity: networked devices go to the first switch with a free port; a second switch uplinks to the first; proposing again adds nothing', () => {
  const devices = room(['switch', 'switch', ...Array(26).fill('camera'), 'compute']); const got = propose(devices); const net = got.filter((c) => c.kind === 'network');
  const up = net.filter((c) => c.why === 'switch uplink → room switch'); assert.deepEqual(up.map((c) => [c.from, c.to]), [['D-2', 'D-1']]);
  const on = (id: string) => net.filter((c) => c.to === id && c.why === 'networked device → room switch').length;
  assert.equal(on('D-1') + 1, 24, 'the first switch carries its 24 ports: 23 devices and the uplink'); assert.equal(on('D-2'), 27 - 23, 'the rest are on the second');
  assert.equal(new Set(net.filter((c) => c.why !== 'switch uplink → room switch').map((c) => c.from)).size, 27, 'each networked device reaches one switch, once');
  assert.deepEqual(propose(devices, got), [], 'nothing new the second time');
  // one switch: everything on it, as before, however many
  const single = room(['switch', ...Array(30).fill('camera')]); assert.equal(propose(single).filter((c) => c.kind === 'network' && c.to === 'D-1').length, 30);
});
