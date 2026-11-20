// The Power BI project export (founder, 18 Nov 2026, 07:49; task #208). A real enterprise API on a real database; the project is unzipped
// by the system's own unzip and every JSON file is checked against Microsoft's published schema for it (tests/security/validate-pbip.py,
// schemas vendored under their MIT licence). Opening the project in Power BI Desktop is NOT RUN here (it needs Windows); the project's
// README says so, and so does this suite.
//
//   PBI-01  refused to everyone who does not answer for the estate's figures, each refusal audited; no token, no project
//   PBI-02  the project: the PBIP layout, every JSON file valid against Microsoft's schema, the theme it names is in the project, the TMDL
//           tables are the ones the model refers to, every relationship joins columns that exist, every field a visual uses exists, every
//           DAX reference names a column or measure of the model, every measure has a description
//   PBI-03  evidence backed: the rows are the organization's records (row counts and the share recorded agree with /v1/reports/summary),
//           each table's SHA-256 in the provenance file matches, the export is audited with the file's hash, and nothing says it was
//           published or opened in Power BI
//   PBI-04  another organization's project is its own
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict';
import crypto from 'node:crypto'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync, spawnSync } from 'node:child_process';
import { setup, client, repo } from '../integration/harness.mjs';

let h, c; const T = {}; let P; const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pbi-'));
const get = async (who, p) => { const r = await fetch(h.base + p, { headers: T[who] ? { authorization: `Bearer ${T[who]}` } : {} }); return { status: r.status, headers: r.headers, bytes: Buffer.from(await r.arrayBuffer()) }; };
const unzip = (bytes, name) => { const z = path.join(dir, `${name}.zip`); const d = path.join(dir, name); fs.writeFileSync(z, bytes); fs.mkdirSync(d); execFileSync('unzip', ['-q', z, '-d', d]); return d; };
const walk = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), base) : [path.relative(base, path.join(d, e.name)).split(path.sep).join('/')]));

before(async () => {
  h = await setup({ db: 'empathia_test_powerbi', port: 4168 }); c = client(h.base);
  for (const r of ['requestor', 'service', 'designer', 'installer', 'cxeng', 'steward', 'syseng', 'exec', 'opslead', 'svcmgr', 'secadmin']) T[r] = await c.login(r);
  T.other = await c.login('secadmin', 'second-tenant');
  const r = await get('exec', '/v1/reports/powerbi.zip'); assert.equal(r.status, 200); P = { ...r, dir: unzip(r.bytes, 'exec') };
});
after(async () => { await h?.app.stop(); fs.rmSync(dir, { recursive: true, force: true }); });

test('PBI-01 refused to the roles that do not answer for the estate’s figures, each refusal audited', async () => {
  for (const who of ['requestor', 'service', 'designer', 'installer', 'cxeng', 'steward', 'syseng']) {
    const r = await get(who, '/v1/reports/powerbi.zip'); assert.equal(r.status, 403, who); assert.notEqual(r.bytes.readUInt32LE(0), 0x04034b50, `${who} got no zip`);
  }
  assert.ok(Number(h.asSuper("SELECT count(*) FROM app.audit_event WHERE outcome = 'DENIED' AND (action = 'export a Power BI project' OR aggregate_id = 'powerbi')")) >= 7);
  assert.equal((await get('nobody', '/v1/reports/powerbi.zip')).status, 401);
  for (const who of ['opslead', 'svcmgr', 'secadmin']) assert.equal((await get(who, '/v1/reports/powerbi.zip')).status, 200, who);
});

test('PBI-02 a PBIP project whose JSON is valid against Microsoft’s schemas and whose model, DAX and visuals refer to what exists', async () => {
  assert.equal(P.headers.get('content-type'), 'application/zip'); assert.match(P.headers.get('content-disposition') || '', /^attachment; filename="empathia-powerbi-empathia-demo-\d{4}-\d{2}-\d{2}\.zip"$/);
  const files = walk(P.dir);
  for (const f of ['Empathia Estate.pbip', 'Empathia Estate.SemanticModel/definition.pbism', 'Empathia Estate.SemanticModel/definition/database.tmdl', 'Empathia Estate.SemanticModel/definition/model.tmdl',
    'Empathia Estate.SemanticModel/definition/relationships.tmdl', 'Empathia Estate.Report/definition.pbir', 'Empathia Estate.Report/definition/report.json', 'Empathia Estate.Report/definition/version.json',
    'Empathia Estate.Report/definition/pages/pages.json', 'Empathia Estate.Report/StaticResources/RegisteredResources/Empathia.json', 'empathia-provenance.json', 'README.txt']) assert.ok(files.includes(f), f);
  const v = spawnSync('python3', ['-I', path.join(repo, 'tests/security/validate-pbip.py'), P.dir, path.join(repo, 'tests/fixtures/ms-fabric-schemas')], { encoding: 'utf8' });
  const rep = JSON.parse(v.stdout); assert.equal(v.status, 0, JSON.stringify(rep.files.filter((x) => !x.ok)).slice(0, 800)); assert.equal(rep.failed, 0);
  assert.ok(rep.files.filter((x) => x.schema).length >= 20, 'every report, page and visual file was checked against a schema');
  // the model: tables, columns, measures (TMDL)
  const sm = path.join(P.dir, 'Empathia Estate.SemanticModel/definition'); const model = fs.readFileSync(path.join(sm, 'model.tmdl'), 'utf8');
  const tables = {}; for (const f of fs.readdirSync(path.join(sm, 'tables'))) {
    const t = fs.readFileSync(path.join(sm, 'tables', f), 'utf8'); const name = /^table (\S+)$/m.exec(t)[1];
    tables[name] = { cols: [...t.matchAll(/^\tcolumn (\S+)$/gm)].map((m) => m[1]), measures: [...t.matchAll(/^\tmeasure (?:'([^']+)'|(\S+)) = (.+)$/gm)].map((m) => ({ name: m[1] || m[2], dax: m[3] })), text: t };
    assert.ok(/^\tpartition \S+ = m\n\t\tmode: import\n\t\tsource =\n\t\t\t\tlet\n\t\t\t\t    Source = #table\(type table \[/m.test(t), `${name}: an import partition with an embedded table`);
    for (const m of tables[name].measures) assert.ok(new RegExp(`\\t/// .+\\n\\tmeasure '?${m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'? =`).test(t), `${name}[${m.name}] has a description`);
    assert.ok(/^\tlineageTag: [0-9a-f-]{36}$/m.test(t));
  }
  assert.deepEqual([...model.matchAll(/^ref table (\S+)$/gm)].map((m) => m[1]).sort(), Object.keys(tables).sort(), 'the model refers to exactly the tables there are');
  for (const m of fs.readFileSync(path.join(sm, 'relationships.tmdl'), 'utf8').matchAll(/(?:from|to)Column: (\w+)\.(\w+)/g)) assert.ok(tables[m[1]]?.cols.includes(m[2]), `relationship column ${m[1]}.${m[2]}`);
  const measures = Object.values(tables).flatMap((t) => t.measures.map((x) => x.name));
  for (const [tn, t] of Object.entries(tables)) for (const m of t.measures) {
    for (const r of m.dax.matchAll(/(\w+)\[([^\]]+)\]/g)) assert.ok(tables[r[1]]?.cols.includes(r[2]), `${tn}[${m.name}]: ${r[0]} is a column`);
    for (const r of m.dax.matchAll(/(?<![\w\]])\[([^\]]+)\]/g)) assert.ok(measures.includes(r[1]), `${tn}[${m.name}]: [${r[1]}] is a measure`);
    assert.equal((m.dax.match(/\(/g) || []).length, (m.dax.match(/\)/g) || []).length, `${m.name}: balanced parentheses`);
  }
  // the report: every field a visual uses is a column or measure of that table; the theme the report names is in the project
  const rp = path.join(P.dir, 'Empathia Estate.Report'); let fields = 0;
  for (const f of walk(rp).filter((x) => x.endsWith('visual.json'))) {
    const j = JSON.parse(fs.readFileSync(path.join(rp, f), 'utf8'));
    for (const role of Object.values(j.visual.query?.queryState || {})) for (const p of role.projections) {
      const fld = p.field.Measure || p.field.Column; const t = tables[fld.Expression.SourceRef.Entity]; fields += 1;
      assert.ok(p.field.Measure ? t?.measures.some((x) => x.name === fld.Property) : t?.cols.includes(fld.Property), `${f}: ${fld.Expression.SourceRef.Entity}.${fld.Property}`);
    }
  }
  assert.ok(fields >= 30, `${fields} fields bound`);
  const rj = JSON.parse(fs.readFileSync(path.join(rp, 'definition/report.json'), 'utf8')); const item = rj.resourcePackages[0].items[0];
  assert.equal(rj.themeCollection.customTheme.name, item.name); assert.ok(fs.existsSync(path.join(rp, 'StaticResources/RegisteredResources', item.path)));
  const pages = JSON.parse(fs.readFileSync(path.join(rp, 'definition/pages/pages.json'), 'utf8')); for (const p of pages.pageOrder) assert.ok(fs.existsSync(path.join(rp, 'definition/pages', p, 'page.json')), p);
  assert.equal(JSON.parse(fs.readFileSync(path.join(rp, 'definition.pbir'), 'utf8')).datasetReference.byPath.path, '../Empathia Estate.SemanticModel');
});

test('PBI-03 evidence backed: the organization’s rows, agreeing with the server’s summary; hashes in provenance and the audit; nothing published', async () => {
  const prov = JSON.parse(fs.readFileSync(path.join(P.dir, 'empathia-provenance.json'), 'utf8')); const s = (await c.call('GET', '/v1/reports/summary', { token: T.exec })).body;
  assert.equal(prov.organization, 'empathia-demo'); assert.equal(prov.exportedBy.role, 'exec');
  assert.equal(prov.rows.Rooms, s.rooms.total); assert.equal(prov.rows.Results, s.commissioning.applicableTests);
  const res = fs.readFileSync(path.join(P.dir, 'Empathia Estate.SemanticModel/definition/tables/Results.tmdl'), 'utf8');
  const notTested = (res.match(/"NOT_TESTED"/g) || []).length - 1;   // one in the Recorded results measure
  const coverage = prov.rows.Results ? (prov.rows.Results - notTested) / prov.rows.Results : null;
  assert.equal(coverage === null ? null : Math.round(coverage * 1e6), s.commissioning.coverage.value === null ? null : Math.round(s.commissioning.coverage.value * 1e6), 'the share recorded is the summary’s coverage');
  const issuesRows = (fs.readFileSync(path.join(P.dir, 'Empathia Estate.SemanticModel/definition/tables/Issues.tmdl'), 'utf8').match(/\{"[^"]+", "[^"]+", "[A-Z_]+", "(Low|Medium|High|Critical)", "OPEN"/g) || []).length;
  assert.equal(issuesRows, s.issues.open, 'open issues in the rows are the summary’s open issues');
  for (const [t, sha] of Object.entries(prov.tableSha256)) assert.match(sha, /^[0-9a-f]{64}$/, t);
  const fileSha = crypto.createHash('sha256').update(P.bytes).digest('hex'); assert.equal(P.headers.get('x-empathia-file-sha256'), fileSha);
  assert.equal(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE action = 'report.export' AND outcome = 'ALLOWED' AND detail->>'format' = 'pbip' AND detail->>'fileSha256' = '${fileSha}'`), '1');
  const readme = fs.readFileSync(path.join(P.dir, 'README.txt'), 'utf8');
  assert.match(readme, /has not yet opened this project in Power BI Desktop/); assert.match(readme, /Nothing has been published anywhere/); assert.match(prov.status, /Nothing has been published/);
});

test('PBI-04 another organization’s project is its own', async () => {
  const r = await get('other', '/v1/reports/powerbi.zip'); assert.equal(r.status, 200); const d = unzip(r.bytes, 'other');
  const prov = JSON.parse(fs.readFileSync(path.join(d, 'empathia-provenance.json'), 'utf8')); assert.equal(prov.organization, 'second-tenant');
  const all = walk(d).map((f) => fs.readFileSync(path.join(d, f), 'utf8')).join('\n');
  const mineRooms = h.asSuper("SELECT string_agg(r.code, ',') FROM app.room r JOIN app.tenant t ON t.id = r.tenant_id WHERE t.slug = 'empathia-demo'").split(',').filter(Boolean);
  for (const code of mineRooms) assert.ok(!all.includes(`"${code}"`), `${code} is not in another organization’s project`);
});
