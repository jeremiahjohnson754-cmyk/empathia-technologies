#!/usr/bin/env node
/**
 * Write the enterprise API's OpenAPI document (generated from the route table) to docs/api/openapi.json, then regenerate the typed
 * client (packages/api-client/src/generated.ts). No database or server is needed: the document comes from the route table alone.
 *   node scripts/api/export-openapi.mjs           (write)
 *   node scripts/api/export-openapi.mjs --check   (fail if the committed files differ from what the code generates)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { buildRoutes } = await import(path.join(root, 'services/enterprise-api/dist/src/modules/routes.js'));
const { openapi } = await import(path.join(root, 'services/enterprise-api/dist/src/openapi.js'));
const { generateClient } = await import(path.join(root, 'packages/api-client/scripts/generate.mjs'));
const router = buildRoutes({ pool: null, tokens: null, store: null, health: async () => ({}) });
const doc = JSON.stringify(openapi(router), null, 2) + '\n';
const client = generateClient(JSON.parse(doc));
const targets = [[path.join(root, 'docs/api/openapi.json'), doc], [path.join(root, 'packages/api-client/src/generated.ts'), client]];
if (process.argv.includes('--check')) {
  const stale = targets.filter(([f, s]) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== s).map(([f]) => path.relative(root, f));
  if (stale.length) { console.error(`FAIL: generated files are stale: ${stale.join(', ')} — run node scripts/api/export-openapi.mjs`); process.exit(1); }
  console.log(`PASS: docs/api/openapi.json and the typed client match the route table (${router.routes.length} operations)`);
} else {
  for (const [f, s] of targets) fs.writeFileSync(f, s);
  console.log(`wrote ${targets.map(([f]) => path.relative(root, f)).join(', ')} (${router.routes.length} operations)`);
}
