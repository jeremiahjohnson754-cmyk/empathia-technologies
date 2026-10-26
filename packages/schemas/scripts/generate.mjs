#!/usr/bin/env node
/**
 * Emit JSON Schema 2020-12 files into packages/schemas/schemas/:
 *   events/<type>.json      one per event contract (packages/event-contracts jsonSchemaFor), the envelope + required payload fields
 *   api/<operationId>.json  every JSON request body in docs/api/openapi.json (bodies are inline per operation there)
 *   entities/<Name>.json    the core entity shapes (src/entities.ts)
 *   INDEX.json              list of every file with its $id and sha256
 * Needs: tsc -b of this package and of packages/event-contracts.
 *   node packages/schemas/scripts/generate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(pkg, '../..');
const { EVENT_CONTRACTS, EVENT_SCHEMA_VERSION, jsonSchemaFor } = await import(path.join(repo, 'packages/event-contracts/dist/src/index.js'));
const { ENTITY_SCHEMAS } = await import(path.join(pkg, 'dist/src/index.js'));
const out = path.join(pkg, 'schemas');
fs.rmSync(out, { recursive: true, force: true });
const index = [];
const write = (rel, obj) => { const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); const s = JSON.stringify(obj, null, 2) + '\n'; fs.writeFileSync(f, s); index.push({ file: rel, $id: obj.$id, sha256: crypto.createHash('sha256').update(s).digest('hex') }); };
for (const type of Object.keys(EVENT_CONTRACTS).sort()) write(`events/${type}.json`, jsonSchemaFor(type));
const oas = JSON.parse(fs.readFileSync(path.join(repo, 'docs/api/openapi.json'), 'utf8'));
for (const [p, ops] of Object.entries(oas.paths)) for (const [m, op] of Object.entries(ops)) {
  const s = op.requestBody?.content?.['application/json']?.schema; if (!s) continue;
  write(`api/${op.operationId}.json`, { $schema: 'https://json-schema.org/draft/2020-12/schema', $id: `https://schemas.empathia.invalid/api/${op.operationId}/${oas.info.version}.json`, title: `${m.toUpperCase()} ${p} request body`, description: op.summary, ...s });
}
for (const [name, s] of Object.entries(ENTITY_SCHEMAS)) write(`entities/${name}.json`, s);
fs.writeFileSync(path.join(out, 'INDEX.json'), JSON.stringify({ generatedBy: 'packages/schemas/scripts/generate.mjs', eventSchemaVersion: EVENT_SCHEMA_VERSION, apiVersion: oas.info.version, counts: { events: index.filter((x) => x.file.startsWith('events/')).length, api: index.filter((x) => x.file.startsWith('api/')).length, entities: index.filter((x) => x.file.startsWith('entities/')).length }, files: index }, null, 2) + '\n');
console.log(`schemas: ${index.filter((x) => x.file.startsWith('events/')).length} events, ${index.filter((x) => x.file.startsWith('api/')).length} API request bodies, ${index.filter((x) => x.file.startsWith('entities/')).length} entities`);
