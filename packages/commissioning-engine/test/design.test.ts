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
