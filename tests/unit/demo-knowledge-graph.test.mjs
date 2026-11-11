// The Microsoft Graph document source (apps/demo/src/knowledge/graph.source.ts) against its mock (graph.source.mock.ts).
// STATUS: MOCK-TESTED. Nothing here has run against a Microsoft 365 tenant. Held: the requests are the documented ones; the pages'
// own examples parse; a library read through Graph gives the same index as the simulated library, after every kind of change; a
// renamed folder moves its files although the feed reports none; a revoked reader is found although the feed says nothing; throttle,
// 410 and refusals change nothing; no link off Microsoft Graph is followed; the tenant's token never goes to a download address;
// nothing outside the selected folders is asked for; what cannot be attributed to a named reader grants nobody.
//   node --test tests/unit/demo-knowledge-graph.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} }; globalThis.Event = globalThis.Event || class { constructor(t) { this.type = t; } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-knowledge-graph-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as I from './knowledge/ingest.ts'; export * as G from './knowledge/graph.source.ts'; export * as M from './knowledge/graph.source.mock.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { I, G, M } = await import(pathToFileURL(out).href);
const SCOPE = ['/Standards', '/Runbooks', '/Incidents', '/Inbox']; const KINDS = { '/Standards': 'standard', '/Runbooks': 'procedure', '/Incidents': 'incident-review', '/Inbox': 'procedure' };
const AT = '2026-11-11T12:00:00.000Z'; const NOW = Date.parse(AT);
const indexFor = (src) => ({ ...I.emptyIndex(src), scope: SCOPE, kinds: KINDS, stage: 'IMPORTED' });
const cfgOf = (d, extra = {}) => { const waits = []; return { cfg: { siteId: d.siteId, transport: M.driveTransport(d), sleep: async (s) => { waits.push(s); }, now: NOW, ...extra }, waits }; };
// what an index entry says, without what the two sources number differently (dates) and with the reader prefix removed
const say = (index) => Object.values(index.items).map((x) => ({ id: x.docId, path: x.path, status: x.status, version: x.version, title: x.title, body: x.body, flags: x.flags, groups: x.groups.map((g) => g.replace(/^group:/, '')), facts: x.facts.map((f) => `${f.key}=${f.value}@${f.source}`),
  refusal: /\.(docx|pdf)$/.test(x.path) && x.status === 'REFUSED' ? 'refused' : x.refusal })).sort((a, b) => a.id.localeCompare(b.id));
const urls = (d) => d.requests.map((r) => r.url);

test('GS-01 the requests are the documented ones, carry no token of their own, and the download is marked so that none is ever added', () => {
  const site = 'contoso.sharepoint.example,site-1,web-1';
  assert.equal(G.reqDelta(site, null).url, `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(site)}/drive/root/delta`); assert.equal(G.reqDelta(site, 'https://graph.microsoft.com/v1.0/x?token=1').url, 'https://graph.microsoft.com/v1.0/x?token=1');
  assert.equal(G.reqPermissions(site, 'a b').url, `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(site)}/drive/items/a%20b/permissions`); assert.equal(G.reqContent(site, 'x').url, `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(site)}/drive/items/x/content`);
  for (const r of [G.reqDelta(site, null), G.reqPermissions(site, 'x'), G.reqContent(site, 'x'), G.reqDownload('https://d.example/x')]) { assert.equal(r.method, 'GET'); assert.ok(!Object.keys(r.headers).some((h) => /authorization/i.test(h))); }
  assert.equal(G.reqDownload('https://d.example/x').anonymous, true); assert.equal(G.reqContent(site, 'x').anonymous, undefined);
  for (const c of G.GRAPH_DOC_CALLS) { assert.match(c.source, /^https:\/\/learn\.microsoft\.com\//); if (c.request) assert.equal(c.application, 'Files.Read.All'); }
  assert.equal(G.GRAPH_DOC_READ, '2026-11-11'); assert.ok(G.GRAPH_DOC_OPEN.length >= 3, 'what only a tenant can answer is listed, not assumed');
  assert.ok(G.onGraph('https://graph.microsoft.com/v1.0/sites/x')); for (const bad of ['https://graph.microsoft.com.evil.example/v1.0/x', 'http://graph.microsoft.com/v1.0/x', 'https://graph.microsoft.com/beta/x', 'https://graph.microsoft.com/v1.0/x y', null, 5]) assert.equal(G.onGraph(bad), false, String(bad));
});

test('GS-02 the pages’ own examples parse: a delta page (folder, file, deleted, next link) and a permissions answer (a link, a named user, an application’s link)', () => {
  const p = G.parseDeltaPage(M.FIXTURES.delta.body); assert.deepEqual(p.items.map((i) => `${i.id}:${i.kind}:${i.name}`), ['0123456789abc:folder:folder2', '123010204abac:file:file.txt', '2353010204ddgg:deleted:file5.txt']);
  assert.equal(p.next, 'https://graph.microsoft.com/v1.0/me/drive/delta(token=1230919asd190410jlka)'); assert.equal(p.delta, null); assert.ok(G.onGraph(p.next));
  const r = G.readersOf(M.FIXTURES.permissions.body, NOW); assert.deepEqual(r.groups, ['user:5D33DD65C6932946']); assert.deepEqual(r.unresolved, ['a sharing link with no named people']);
  for (const bad of [null, 'x', {}, { value: 'no' }]) { assert.equal(G.parseDeltaPage(bad), null); assert.equal(G.readersOf(bad, NOW), null); }
  assert.deepEqual(G.parseDeltaPage({ value: [null, 5, {}, { id: '' }, { id: 'ok', file: {} }] }).items.map((i) => i.id), ['ok']);
});

test('GS-03 who counts as a reader: a named user or directory group with a reading role; site groups and bare links grant nobody; expired and role-less permissions are ignored', () => {
  const body = { value: [M.groupPerm('grp-a'), M.userPerm('u-1', 'write'), M.siteGroupPerm('Site Members'), M.linkPerm(), { id: 'x', roles: ['restrictedView'], grantedToV2: { group: { id: 'grp-no-role' } } },
    { id: 'e', roles: ['read'], expirationDateTime: '2026-11-01T00:00:00Z', grantedToV2: { group: { id: 'grp-expired' } } }, { id: 'n', roles: ['read'], expirationDateTime: '0001-01-01T00:00:00Z', grantedToV2: { group: { id: 'grp-never-expires' } } },
    { id: 'l', roles: ['read'], link: { type: 'view' }, grantedToIdentitiesV2: [{ user: { id: 'u-2' } }, { siteGroup: { displayName: 'Visitors' } }] }, { id: 'o', roles: ['owner'], grantedToV2: { sharePointGroup: { id: 'g', displayName: 'Owners' } } },
    { id: 'd', roles: ['read'], grantedTo: { user: { id: 'u-old' } } }, { id: 'a', roles: ['read'], grantedToV2: { application: { id: 'app' } } }] };
  const r = G.readersOf(body, NOW);
  assert.deepEqual(r.groups, ['group:grp-a', 'group:grp-never-expires', 'user:u-1', 'user:u-2', 'user:u-old']);
  assert.deepEqual(r.unresolved, ['SharePoint group “Owners”', 'SharePoint group “Site Members”', 'SharePoint group “Visitors”', 'a sharing link with no named people']);
});

test('GS-04 a library read through Graph gives the same index as the simulated library: first import, then after each kind of change', async () => {
  let src = I.seedSource(); const d = M.driveFromSource(src); const { cfg } = cfgOf(d);
  let sim = I.fullImport(src, indexFor(src), AT).index; let g = await G.graphSync(indexFor(src), cfg, null, AT);
  assert.equal(g.report.ok, true); assert.equal(g.report.full, true); assert.equal(g.read.delta.provenance, 'GRAPH_MOCK'); assert.deepEqual(say(g.index), say(sim));
  assert.ok(Object.keys(g.index.items).length >= 10); assert.ok(!Object.values(g.index.items).some((x) => x.path.startsWith('/People')), 'outside the selected folders nothing is imported');
  assert.ok(d.requests.filter((r) => /delta/.test(r.url)).length > 1, 'the first read took more than one page'); assert.deepEqual(d.violations, []);
  const quiet = await G.graphSync(g.index, cfg, g.state, AT); assert.deepEqual(quiet.read.delta.changes, [], 'nothing changed, nothing reported'); assert.deepEqual(say(quiet.index), say(sim));
  const step = async (op, act) => { src = I.applyOp(src, op); act(); sim = I.sync(sim, src, AT).index; g = await G.graphSync(g.index, cfg, g.state, AT); assert.equal(g.report.ok, true, JSON.stringify(op)); assert.equal(g.report.full, false); assert.deepEqual(say(g.index), say(sim), JSON.stringify(op)); return g.report; };
  const id = Object.values(src.docs).find((x) => x.path.startsWith('/Standards/') && x.path.endsWith('.md')).id; const parent = M.folderId(d, 'Standards');
  let rep = await step({ op: 'update', id, text: `${src.docs[id].text}\nReview interval: 12 months` }, () => M.update(d, id, `${d.items[id].text}\nReview interval: 12 months`)); assert.match(rep.updated[0], /\(v1 → v2\)/);
  rep = await step({ op: 'rename', id, path: '/Standards/Renamed standard.md' }, () => M.rename(d, id, 'Renamed standard.md')); assert.equal(rep.renamed.length, 1);
  rep = await step({ op: 'add', doc: { id: 'D-NEW', path: '/Runbooks/New runbook.md', text: 'New runbook\nOwner: Service desk', groups: ['grp-workplace'] } }, () => M.addFile(d, 'D-NEW', 'New runbook.md', M.folderId(d, 'Runbooks'), 'New runbook\nOwner: Service desk', [M.groupPerm('grp-workplace')])); assert.deepEqual(rep.added, ['/Runbooks/New runbook.md']);
  rep = await step({ op: 'delete', id: 'D-NEW' }, () => M.remove(d, 'D-NEW')); assert.deepEqual(rep.removed, ['/Runbooks/New runbook.md']);
  const gone = src.docs[id].groups[0];
  rep = await step({ op: 'revoke', id, group: gone }, () => M.setPerms(d, id, src.docs[id].groups.filter((x) => x !== gone).map((x) => M.groupPerm(x))));
  assert.ok(!g.index.items[id].groups.includes(`group:${gone}`), 'a reader removed at the source is gone at the next sync although the change feed said nothing'); assert.ok(parent);
  assert.deepEqual(d.violations, []);
});

test('GS-05 a renamed folder moves its files, and a folder moved out of the selection removes them, although the feed reports only the folder', async () => {
  const d = M.emptyDrive(); M.addFolder(d, 'f-std', 'Standards'); M.addFolder(d, 'f-sub', 'Displays', 'f-std'); M.addFile(d, 'a', 'Sizing.md', 'f-sub', 'Display sizing\nMinimum height: 1.2 m', [M.groupPerm('grp-a')]);
  const { cfg } = cfgOf(d); const base = { ...I.emptyIndex({ site: 's', library: 'l' }), scope: ['/Standards'], kinds: { '/Standards': 'standard' } };
  let g = await G.graphSync(base, cfg, null, AT); assert.equal(g.index.items.a.path, '/Standards/Displays/Sizing.md');
  M.rename(d, 'f-sub', 'Screens'); g = await G.graphSync(g.index, cfg, g.state, AT);
  assert.equal(g.index.items.a.path, '/Standards/Screens/Sizing.md'); assert.deepEqual(g.report.renamed, ['/Standards/Displays/Sizing.md → /Standards/Screens/Sizing.md']); assert.equal(g.index.items.a.version, 1, 'a move is not a new version');
  M.rename(d, 'f-std', 'Archive'); g = await G.graphSync(g.index, cfg, g.state, AT); assert.deepEqual(Object.keys(g.index.items), [], 'the folder is no longer one the administrator selected'); assert.deepEqual(g.report.removed, ['/Standards/Screens/Sizing.md']);
  const asked = d.requests.length; g = await G.graphSync(g.index, cfg, g.state, AT); assert.deepEqual(urls(d).slice(asked).filter((u) => /permissions|content|downloads/.test(u)), [], 'nothing is asked about a document outside the selection');
});

test('GS-06 asked to slow down: the same request is retried after the time the service names, or a growing wait when it names none; if it never lets up, nothing changes', async () => {
  const src = I.seedSource(); const d = M.driveFromSource(src); const { cfg, waits } = cfgOf(d);
  d.script = [7, null, null]; let g = await G.graphSync(indexFor(src), cfg, null, AT); assert.equal(g.report.ok, true); assert.deepEqual(waits, [7, 2, 4]); assert.deepEqual(g.report.attempts.map((a) => a.waitS), [7, 2, 4]);
  assert.equal(new Set(urls(d).slice(0, 4)).size, 1, 'the same request, four times');
  M.update(d, Object.keys(g.index.items)[0], 'Changed\nValue: 1'); d.script = [1, 1, 1, 1]; const kept = JSON.stringify([g.index, g.state]);
  const r = await G.graphSync(g.index, cfg, g.state, AT); assert.equal(r.report.ok, false); assert.equal(r.read.kind, 'throttled'); assert.match(r.report.why, /slow down 4 times in a row\. Nothing was changed/); assert.equal(JSON.stringify([r.index, r.state]), kept);
  d.script = [{ status: 429, headers: { 'retry-after': '100000' }, body: null }]; waits.length = 0; await G.graphSync(g.index, cfg, g.state, AT); assert.deepEqual(waits, [300], 'a wait is capped');
});

test('GS-07 the place to read from is gone (410): the library is read afresh from the address the service gives, and what vanished in between is removed', async () => {
  const src = I.seedSource(); const d = M.driveFromSource(src); const { cfg } = cfgOf(d); let g = await G.graphSync(indexFor(src), cfg, null, AT); const n = Object.keys(g.index.items).length;
  const victim = Object.values(g.index.items).find((x) => x.status === 'CANDIDATE'); const other = Object.values(g.index.items).find((x) => x.status === 'CANDIDATE' && x.docId !== victim.docId);
  M.remove(d, victim.docId); M.update(d, other.docId, `${d.items[other.docId].text}\nAdded line: yes`); d.expireBefore = d.seq;
  g = await G.graphSync(g.index, cfg, g.state, AT); assert.equal(g.report.ok, true); assert.equal(g.report.full, true); assert.equal(g.read.resynced, true); assert.match(g.read.notes[0], /fresh read of the whole library \(resyncChangesApplyDifferences\)/);
  assert.equal(Object.keys(g.index.items).length, n - 1); assert.ok(!g.index.items[victim.docId]); assert.deepEqual(g.report.removed, [victim.path]); assert.equal(g.index.items[other.docId].version, 2, 'a fresh read does not restart version numbers');
  const sim = I.fullImport({ ...src, docs: Object.fromEntries(Object.entries(src.docs).filter(([k]) => k !== victim.docId).map(([k, v]) => [k, k === other.docId ? { ...v, text: d.items[k].text, version: 2 } : v])) }, indexFor(src), AT).index;
  assert.deepEqual(say(g.index), say(sim));
});

test('GS-08 no link off Microsoft Graph is followed: a stored one, a next page, a final link, the 410 address; and a download address must be https', async () => {
  const src = I.seedSource(); const fresh = () => { const d = M.driveFromSource(src); return { d, ...cfgOf(d) }; };
  { const { d, cfg } = fresh(); const r = await G.graphRead({ ...cfg, scope: SCOPE }, { link: 'https://graph.example.net/v1.0/x', tree: {}, seen: {} }); assert.equal(r.ok, false); assert.equal(r.kind, 'refused-link'); assert.equal(d.requests.length, 0, 'not even asked'); }
  for (const poison of ['next', 'delta']) { const { d, cfg } = fresh(); d.poison = poison; const r = await G.graphSync(indexFor(src), cfg, null, AT); assert.equal(r.read.kind, 'refused-link', poison); assert.equal(Object.keys(r.index.items).length, 0); assert.ok(!urls(d).some((u) => /graph\.example\.net/.test(u)), poison); }
  { const { d, cfg } = fresh(); let g = await G.graphSync(indexFor(src), cfg, null, AT); d.expireBefore = d.seq + 1; M.addFolder(d, 'f-x', 'X'); d.poison = 'location'; const kept = JSON.stringify(g.index); const r = await G.graphSync(g.index, cfg, g.state, AT); assert.equal(r.read.kind, 'refused-link'); assert.equal(JSON.stringify(r.index), kept); assert.ok(!urls(d).some((u) => /graph\.example\.net/.test(u))); }
  { const { d, cfg } = fresh(); d.poison = 'download'; const r = await G.graphSync(indexFor(src), cfg, null, AT); assert.equal(r.read.kind, 'refused-link'); assert.match(r.report.why, /not a secure web address/); assert.ok(!urls(d).some((u) => u.startsWith('http://'))); }
});

test('GS-09 the tenant’s token never goes to a download address, and nothing is downloaded that will not be read: other folders, other types, oversize, malware', async () => {
  const d = M.emptyDrive(); M.addFolder(d, 'f-in', 'Standards'); M.addFolder(d, 'f-out', 'People'); const P = [M.groupPerm('grp-a')];
  M.addFile(d, 'ok', 'Good.md', 'f-in', 'Good\nValue: 1', P); M.addFile(d, 'out', 'Salaries.md', 'f-out', 'Salaries\nSecret: 1', P); M.addFile(d, 'exe', 'setup.exe', 'f-in', 'MZ', P); M.addFile(d, 'big', 'Huge.md', 'f-in', 'x', P, { bytes: 9 * 1024 * 1024 });
  M.addFile(d, 'bad', 'Infected.md', 'f-in', 'Looks fine\nValue: 2', P, { malware: true }); M.addFile(d, 'docx', 'Guide.docx', 'f-in', 'PK', P); M.addFile(d, 'bin', 'Odd.txt', 'f-in', '', P, { binary: true }); M.addFile(d, 'none', 'Nobody.md', 'f-in', 'Nobody\nValue: 3', [M.siteGroupPerm('Members'), M.linkPerm()]);
  const { cfg } = cfgOf(d); const g = await G.graphSync({ ...I.emptyIndex({ site: 's', library: 'l' }), scope: ['/Standards'], kinds: { '/Standards': 'standard' } }, cfg, null, AT);
  const dl = urls(d).filter((u) => /downloads\./.test(u)).map((u) => decodeURIComponent(u.split('/dl/')[1].split('?')[0])).sort(); assert.deepEqual(dl, ['bin', 'none', 'ok'], 'only text files in the selected folder, small enough and not flagged by the source');
  assert.ok(!urls(d).some((u) => /items\/out\//.test(u)), 'neither the readers nor the text of a file outside the selection is asked for'); assert.deepEqual(d.violations, []);
  const it = g.index.items; assert.equal(it.ok.status, 'CANDIDATE'); assert.ok(!it.out);
  assert.match(it.exe.refusal, /not on the allow-list/); assert.match(it.big.refusal, /the limit is/); assert.match(it.bad.refusal, /source reports that this file contains malware\. It was not downloaded/); assert.match(it.docx.refusal, /not yet extracted from \.docx/); assert.match(it.bin.refusal, /could not be read as text/);
  assert.match(it.none.refusal, /lists no reader/); assert.match(g.read.notes.join(' '), /Not counted as readers.*SharePoint group “Members”.*sharing link/);
  assert.equal(d.requests.filter((r) => r.anonymous).length, 3); assert.ok(d.requests.filter((r) => r.anonymous).every((r) => Object.keys(r.headers).length === 0));
});

test('GS-10 a refusal by the service changes nothing and names what to ask an administrator for; the same item twice in one answer uses the last', async () => {
  const src = I.seedSource(); const d = M.driveFromSource(src); const { cfg } = cfgOf(d); let g = await G.graphSync(indexFor(src), cfg, null, AT); const kept = JSON.stringify([g.index, g.state]);
  for (const [status, kind, re] of [[401, 'unauthorized', /did not accept the sign-in/], [403, 'forbidden', /An administrator grants the application Files\.Read\.All for this site/], [404, 'not-found', /did not find the site/], [500, 'unexpected', /answered 500/]]) {
    d.script = [{ status, headers: {}, body: { error: { code: 'x', message: 'SECRET-DETAIL' } } }]; const r = await G.graphSync(g.index, cfg, g.state, AT); assert.equal(r.read.kind, kind); assert.match(r.report.why, re); assert.ok(!/SECRET-DETAIL/.test(r.report.why), 'the service’s own message is not shown'); assert.equal(JSON.stringify([r.index, r.state]), kept); }
  d.script = [{ status: 200, headers: {}, body: { value: [] } }]; assert.equal((await G.graphSync(g.index, cfg, g.state, AT)).read.kind, 'unexpected', 'an answer with no link to continue from is not accepted');
  const id = Object.values(g.index.items).find((x) => x.status === 'CANDIDATE').docId; d.duplicates = true; M.rename(d, id, 'Final name.md'); g = await G.graphSync(g.index, cfg, g.state, AT); assert.match(g.index.items[id].path, /\/Final name\.md$/);
});

test('GS-11 it is not connected: no page imports the source or its mock, and the list of connected sources is still empty', () => {
  assert.deepEqual(I.connected(), []);
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []));
  const importers = walk(path.join(repo, 'apps/demo/src')).filter((f) => !/graph\.source(\.mock)?\.ts$/.test(f) && /from\s+['"][^'"]*graph\.source|import\(['"][^'"]*graph\.source/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(importers.map((f) => path.relative(repo, f)), []);
  const text = fs.readFileSync(path.join(repo, 'apps/demo/src/knowledge/graph.source.ts'), 'utf8'); assert.ok(!/\bfetch\(|XMLHttpRequest|Authorization['"]?\s*:/.test(text), 'makes no network call and builds no token header'); assert.match(text, /STATUS: MOCK-TESTED/);
});
