#!/usr/bin/env node
/**
 * Produce real room design inputs with @empathia/commissioning-engine (one per template)
 * and write them to spatial/room-models/examples/; check_schema.py also checks the 92 golden-case inputs of
 * packages/domain-data/golden/room-engine-golden.json, so that the JSON Schema can be checked against what the engine actually uses:
 *   node spatial/room-models/validate.mjs && python3 -I spatial/room-models/check_schema.py
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const E = await import(path.join(repo, 'packages/commissioning-engine/dist/src/index.js'));
const out = path.join(here, 'examples'); fs.mkdirSync(out, { recursive: true });
const C = E.defaultCatalog; let n = 0;
for (const template of Object.keys(C.templates)) {
  const T = C.templates[template]; if (!T.dims) continue;
  const points = E.outlineFor('rect', T.dims[1], T.dims[0]); let k = 0;
  const devices = E.templateDevices(template, points, () => `PA-${String(++k).padStart(4, '0')}`, C);
  const d = { template, intendedUse: T.use || '', occupancy: T.occ || 1, lifecycle: 'PLANNED', coreRoomId: `R-SYN-${template.toUpperCase()}`, geometry: { shape: 'rect', points, ceiling: T.dims[2], lengthM: T.dims[0], widthM: T.dims[1], provenance: { length: 'MODELED', width: 'MODELED', ceiling: 'MODELED' }, confidence: 'modeled' }, devices, connections: [], classification: { approved: null } };
  E.analyzeRoom(d, C);   // must not throw: the example is a real engine input
  fs.writeFileSync(path.join(out, `${template}.json`), JSON.stringify(d, null, 1)); n += 1;
}
console.log(`${n} template examples written to spatial/room-models/examples/`);
