// Generated documents stay true: each is rebuilt from the records and compared with the committed file, so a count in a document can
// never drift from the code it describes.   node --test tests/unit/docs-generated.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const check = (script) => spawnSync(process.execPath, [path.join(repo, script), '--check'], { cwd: repo, encoding: 'utf8' });
test('DOC-01 the four-world estate manifests are what the estate records say', () => { const r = check('scripts/docs/estate-manifests.mjs'); assert.equal(r.status, 0, r.stderr || r.stdout); });
test('DOC-02 the product census covers every catalogue family, names only pages and tests that exist, and is current', () => { const r = check('scripts/docs/product-census.mjs'); assert.equal(r.status, 0, r.stderr || r.stdout); });
test('DOC-03 the W01–W26 workflow matrix names only pages and tests that exist, and is current', () => { const r = check('scripts/docs/workflow-matrix.mjs'); assert.equal(r.status, 0, r.stderr || r.stdout); });
