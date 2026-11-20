// 90-3: a vendor or product name on either public app is allowed only with evidence (docs/surpass/VENDOR_NAME_REGISTER.json): a disclosed
// processor, a catalogue entry labelled planned and not connected, a mock-tested adapter that says NOT CONNECTED, a documented link the user
// opens in the vendor's own app, a cited training subject or standard, a credential issuer, or an ordinary word. A new name or file fails
// until it is entered with its evidence; an entry that no longer occurs fails too, so the register stays true. The engineering connectors
// are covered separately by connector-claims.test.mjs.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const REG = JSON.parse(fs.readFileSync(path.join(root, 'docs/surpass/VENDOR_NAME_REGISTER.json'), 'utf8'));
const csv = fs.readFileSync(path.join(root, REG.catalogue.source), 'utf8').trim().split('\n');
const head = JSON.parse(`[${csv[0].split(',').map((h) => JSON.stringify(h)).join(',')}]`);
const rows = csv.slice(1).map((l) => { const cells = [...l.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replace(/""/g, '"')); return Object.fromEntries(head.map((h, i) => [h, cells[i]])); });
const EXTRA = ['Tally', 'Google', 'Apple', 'Android', 'Outlook', 'SharePoint', 'OneDrive', 'Entra', 'Teams', 'Windows', 'Slack', 'Okta', 'Salesforce', 'AWS', 'Azure', 'Stripe', 'GitHub', 'OpenAI', 'Anthropic', 'AVIXA', 'PMI', 'CompTIA', 'InfoComm', 'Kraft Heinz', 'Stefanini', 'AON'];
const NAMES = [...new Set([...rows.map((r) => r.vendor), ...EXTRA])];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => { const p = path.join(dir, e.name); return e.isDirectory() ? files(p) : /\.(tsx?|json|css|md)$/.test(e.name) ? [p] : []; });
const found = new Set();
for (const app of ['apps/website/src', 'apps/demo/src']) for (const f of files(path.join(root, app))) { const s = fs.readFileSync(f, 'utf8'); for (const n of NAMES) if (new RegExp(`(?<![\\w-])${esc(n)}(?![\\w-])`).test(s)) found.add(`${n} @ ${path.relative(root, f)}`); }
const listed = new Set(Object.entries(REG.names).flatMap(([n, es]) => es.map((e) => `${n} @ ${e.file}`)));

test('every vendor, product, standard or body named in either app is in the register with its evidence', () => {
  assert.deepEqual([...found].filter((x) => !listed.has(x)).sort(), []);
});
test('no register entry is stale: each still occurs where it says', () => {
  assert.deepEqual([...listed].filter((x) => !found.has(x)).sort(), []);
});
test('every entry gives a defined kind of evidence and a note', () => {
  const bad = Object.entries(REG.names).flatMap(([n, es]) => es.filter((e) => !REG.evidence[e.evidence] || !e.note).map((e) => `${n} @ ${e.file}`));
  assert.deepEqual(bad, []); assert.ok(REG.evidence[REG.catalogue.evidence]);
});
test('names the founder said never to use appear nowhere in either app', () => {
  assert.deepEqual([...found].filter((x) => /^(Kraft Heinz|Stefanini|AON) @/.test(x)), []);
});
test('the connector catalogue claims nothing live: every entry planned, no adapter, no proof', () => {
  assert.ok(rows.length > 0);
  assert.deepEqual(rows.filter((r) => r.live_available !== 'NO' || !/^MOCKED_UI_ONLY/.test(r.implementation_state) || r.proof_level !== 'NOT_ASSESSED').map((r) => r.integration_id), []);
  const gen = fs.readFileSync(path.join(root, REG.catalogue.generated), 'utf8');
  assert.equal((gen.match(/"live":true/g) || []).length, 0); assert.equal((gen.match(/"key":/g) || []).length, rows.length);
});
test('the website labels each catalogue entry planned, not connected, beside a note that none is a partnership or working connection', () => {
  const s = fs.readFileSync(path.join(root, 'apps/website/src/commercial.tsx'), 'utf8');
  assert.match(s, /\(planned, not connected\)/); assert.match(s, /No entry implies a partnership, a certification or a working connection/);
});
test('the mock-tested Microsoft code says so where a person can read it', () => {
  assert.match(fs.readFileSync(path.join(root, 'apps/demo/src/connect/adapter.ts'), 'utf8'), /CONNECTION_STATEMENT = 'NOT CONNECTED\./);
  assert.match(fs.readFileSync(path.join(root, 'apps/demo/src/connect/graph.ts'), 'utf8'), /NOT validated against a real Microsoft 365 tenant/);
});
