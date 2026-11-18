/**
 * A Power BI project of the organization's own records (founder, 18 Nov 2026, 07:49: "if someone has a PowerBI setup let's have empathia
 * create premium gorgeous evidence backed dashboards and data analytics visualizations for them on actual PowerBI like it makes all the dax
 * calculations the scripting and arraignment"; task #208).
 *
 * What it is: a Power BI Project folder (PBIP), zipped: a semantic model in TMDL (four tables of the caller's records, their relationships,
 * DAX measures, each measure's definition in its description) and a report in the PBIR format (three pages of visuals and an Empathia
 * theme). The rows are embedded in each table's Power Query source, so the project opens with nothing to connect; every row carries the
 * identifiers of the records it came from (room, test, issue, work order codes), and empathia-provenance.json says who exported it, when,
 * under which scope, with a SHA-256 per table.
 *
 * What it is not: nothing is published. The customer opens the folder in their own Power BI Desktop and publishes it, if they choose, with
 * their own sign-in. The JSON files are written to Microsoft's published schemas (validated in tests/security/powerbi-export.test.mjs);
 * the TMDL follows Microsoft's TMDL documentation. Opening in Power BI Desktop has not been run here (it needs Windows) and is said so
 * in the project's README until it has been.
 *
 * The measures are the KPI summary's own definitions (domain/analytics.ts), so the dashboard and the server's figures agree; a test
 * recomputes each from the exported rows and compares it with /v1/reports/summary.
 */
import crypto from 'node:crypto';
import type { RequestContext } from '../auth/context.js';
import { canonical } from './dataReport.js';
import { zip } from './zip.js';

export const EXPORT = ['project.decide', 'handoff.accept', 'service.assign', 'policy.configure'];
const NAME = 'Empathia Estate';
const S = 'https://developer.microsoft.com/json-schemas/fabric';

type Kind = 'string' | 'int64' | 'double' | 'dateTime';
interface Col { name: string; type: Kind; hidden?: boolean; summarize?: boolean; description: string }
interface Measure { name: string; dax: string; format: string; description: string; folder?: string }
interface Table { name: string; description: string; cols: Col[]; rows: Array<Array<string | number | null>>; measures: Measure[] }

/** a deterministic GUID-shaped tag from a name, so the same project has the same lineage tags */
const tag = (s: string) => { const h = crypto.createHash('sha256').update(`empathia/${s}`).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };
const q = (n: string) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(n) ? n : `'${n.replace(/'/g, "''")}'`);
const mType: Record<Kind, string> = { string: 'text', int64: 'Int64.Type', double: 'number', dateTime: 'datetime' };
const mLit = (v: string | number | null, k: Kind): string => {
  if (v === null || v === undefined) return 'null';
  if (k === 'string') return `"${String(v).replace(/"/g, '""').replace(/[\r\n\t]+/g, ' ')}"`;
  if (k === 'int64') return String(Math.trunc(Number(v)));
  if (k === 'double') return Number.isFinite(Number(v)) ? String(Number(v)) : 'null';
  const d = new Date(String(v)); if (Number.isNaN(d.getTime())) return 'null';
  return `#datetime(${d.getUTCFullYear()}, ${d.getUTCMonth() + 1}, ${d.getUTCDate()}, ${d.getUTCHours()}, ${d.getUTCMinutes()}, ${d.getUTCSeconds()})`;
};
const desc = (text: string, ind: string) => text.split(/\n/).map((l) => `${ind}/// ${l}`).join('\n');

function tableTmdl(t: Table): string {
  const out: string[] = [desc(t.description, ''), `table ${q(t.name)}`, `\tlineageTag: ${tag(`table/${t.name}`)}`, ''];
  for (const m of t.measures) {
    out.push(desc(m.description, '\t'), `\tmeasure ${q(m.name)} = ${m.dax}`, `\t\tformatString: ${m.format}`, ...(m.folder ? [`\t\tdisplayFolder: ${m.folder}`] : []), `\t\tlineageTag: ${tag(`measure/${t.name}/${m.name}`)}`, '');
  }
  for (const c of t.cols) {
    out.push(desc(c.description, '\t'), `\tcolumn ${q(c.name)}`, `\t\tdataType: ${c.type}`, ...(c.type === 'dateTime' ? ['\t\tformatString: yyyy-mm-dd hh:nn'] : []), ...(c.hidden ? ['\t\tisHidden'] : []),
      `\t\tlineageTag: ${tag(`column/${t.name}/${c.name}`)}`, `\t\tsummarizeBy: ${c.summarize ? 'sum' : 'none'}`, `\t\tsourceColumn: ${c.name}`, '');
  }
  const typ = `type table [${t.cols.map((c) => `${q(c.name).replace(/^'(.*)'$/, '#"$1"')} = ${mType[c.type]}`).join(', ')}]`;
  const rows = t.rows.map((r) => `{${r.map((v, i) => mLit(v, t.cols[i]!.type)).join(', ')}}`).join(', ');
  out.push(`\tpartition ${q(t.name)} = m`, '\t\tmode: import', '\t\tsource =', '\t\t\t\tlet', `\t\t\t\t    Source = #table(${typ}, {${rows}})`, '\t\t\t\tin', '\t\t\t\t    Source', '');
  return out.join('\n') + '\n';
}

// ------------------------------------------------------------------------------------------------------------------ report (PBIR)
type Field = { t: string; c?: string; m?: string };
const field = (f: Field) => (f.m ? { Measure: { Expression: { SourceRef: { Entity: f.t } }, Property: f.m } } : { Column: { Expression: { SourceRef: { Entity: f.t } }, Property: f.c! } });
const proj = (f: Field) => ({ field: field(f), queryRef: `${f.t}.${f.m || f.c}`, nativeQueryRef: f.m || f.c });
const lit = (s: string) => ({ expr: { Literal: { Value: `'${s.replace(/'/g, "''")}'` } } });
interface Vis { name: string; type: string; x: number; y: number; w: number; h: number; roles?: Record<string, Field[]>; title?: string; text?: string }
function visualJson(v: Vis, z: number) {
  const visual: Record<string, unknown> = { visualType: v.type };
  if (v.roles) visual['query'] = { queryState: Object.fromEntries(Object.entries(v.roles).map(([role, fs]) => [role, { projections: fs.map(proj) }])) };
  if (v.text) visual['objects'] = { general: [{ properties: { paragraphs: [{ textRuns: [{ value: v.text }] }] } }] } as unknown;
  if (v.title) visual['visualContainerObjects'] = { title: [{ properties: { show: { expr: { Literal: { Value: 'true' } } }, text: lit(v.title) } }] };
  if (v.roles) visual['drillFilterOtherVisuals'] = true;
  return { $schema: `${S}/item/report/definition/visualContainer/2.4.0/schema.json`, name: v.name, position: { x: v.x, y: v.y, z, width: v.w, height: v.h, tabOrder: z }, visual };
}

const THEME = {
  name: 'Empathia', dataColors: ['#0A7268', '#2C5FA8', '#B54708', '#6B4FA0', '#067647', '#B42318', '#5B6676', '#0E8F83'],
  background: '#FFFFFF', foreground: '#0F172A', tableAccent: '#0A7268', good: '#067647', neutral: '#B54708', bad: '#B42318', maximum: '#0A7268', center: '#D7DDE5', minimum: '#EEF5F4',
  textClasses: { title: { fontFace: 'Segoe UI Semibold', fontSize: 14, color: '#0F172A' }, header: { fontFace: 'Segoe UI Semibold', fontSize: 12, color: '#0F172A' }, label: { fontFace: 'Segoe UI', fontSize: 10, color: '#5B6676' }, callout: { fontFace: 'Segoe UI Light', fontSize: 32, color: '#0A7268' } },
};

export interface Project { files: Array<{ path: string; data: string }>; provenance: Record<string, unknown>; tables: Table[] }

export async function buildProject(ctx: RequestContext, now = new Date()): Promise<Project> {
  const scope = ctx.p.siteScope; const args: unknown[] = scope?.length ? [scope] : [];
  const where = scope?.length ? 'WHERE b.site_id = ANY($1::uuid[])' : '';
  const data = await ctx.tx(async (qq) => {
    const rooms = (await qq.query<{ code: string; name: string; lifecycle: string; building: string; site: string; occupancy: number | null; floor: number | null }>(
      `SELECT r.code, r.name, r.lifecycle, b.name AS building, s.name AS site, r.occupancy, r.floor FROM app.room r JOIN app.building b ON b.id = r.building_id JOIN app.site s ON s.id = b.site_id ${where} ORDER BY r.code`, args)).rows;
    const results = (await qq.query<{ room: string; test_id: string; label: string; domain: string; phase: number; result: string; recorded_at: string | null; verified_at: string | null }>(`
      WITH latest AS (SELECT DISTINCT ON (p.room_id) p.id, p.room_id FROM app.cx_plan p JOIN app.room r ON r.id = p.room_id JOIN app.building b ON b.id = r.building_id ${where} ORDER BY p.room_id, p.compiled_at DESC, p.id DESC)
      SELECT r.code AS room, pr.test_id, pr.label, pr.domain, pr.phase, coalesce(cr.result_label, 'NOT_TESTED') AS result, cr.recorded_at, cr.verified_at
        FROM latest l JOIN app.room r ON r.id = l.room_id JOIN app.cx_plan_row pr ON pr.plan_id = l.id AND pr.applicable
        LEFT JOIN app.current_result cr ON cr.room_id = l.room_id AND cr.test_id = pr.test_id ORDER BY r.code, pr.test_id`, args)).rows;
    const issues = (await qq.query<{ code: string; room: string; category: string; severity: string; state: string; title: string; created_at: string; resolved_at: string | null }>(`
      SELECT i.code, r.code AS room, i.category, i.severity, i.state, i.title, i.created_at,
             (SELECT min(ev.at) FROM app.issue_event ev WHERE ev.issue_id = i.id AND ev.kind = 'resolved') AS resolved_at
        FROM app.room_issue i JOIN app.room r ON r.id = i.room_id JOIN app.building b ON b.id = r.building_id ${where} ORDER BY i.code`, args)).rows;
    const wos = (await qq.query<{ code: string; issue: string; state: string; severity: string | null; work_type: string | null; created_at: string; closed_at: string | null }>(`
      SELECT w.code, i.code AS issue, w.state, w.severity, w.work_type, w.created_at, w.closed_at FROM app.work_order w JOIN app.room_issue i ON i.id = w.issue_id JOIN app.room r ON r.id = i.room_id JOIN app.building b ON b.id = r.building_id ${where} ORDER BY w.code`, args)).rows;
    return { rooms, results, issues, wos };
  });

  const tables: Table[] = [
    { name: 'Rooms', description: 'One row per room the exporting person may see (app.room), with its building, site and lifecycle.', measures: [
      { name: 'Rooms', dax: 'COUNTROWS(Rooms)', format: '0', description: 'Rooms in the current filter context. Source: Rooms (app.room).', folder: 'Estate' }],
      cols: [{ name: 'RoomCode', type: 'string', description: 'The room’s code in Empathia (app.room.code): the key the other tables use.' }, { name: 'Room', type: 'string', description: 'The room’s name.' },
        { name: 'Lifecycle', type: 'string', description: 'PLANNED, DESIGN_APPROVED, INSTALLATION_PENDING, INSTALLED_UNVERIFIED, COMMISSIONING, ACCEPTED, IN_SERVICE… as recorded.' },
        { name: 'Building', type: 'string', description: 'The building’s name.' }, { name: 'Site', type: 'string', description: 'The site’s name.' },
        { name: 'Floor', type: 'int64', description: 'The floor the room is on.' }, { name: 'Seats', type: 'int64', description: 'The room’s occupancy as recorded.' }],
      rows: data.rooms.map((r) => [r.code, r.name, r.lifecycle, r.building, r.site, r.floor, r.occupancy]) },
    { name: 'Results', description: 'One row per applicable test of each room’s latest compiled commissioning plan (app.cx_plan_row), with its current result label (app.current_result), NOT_TESTED where none.', measures: [
      { name: 'Applicable tests', dax: 'COUNTROWS(Results)', format: '#,0', folder: 'Commissioning', description: 'Applicable tests of the latest plan of each room. Same as the KPI summary’s applicableTests.' },
      { name: 'Recorded results', dax: 'CALCULATE(COUNTROWS(Results), Results[Result] <> "NOT_TESTED")', format: '#,0', folder: 'Commissioning', description: 'Applicable tests with any recorded result.' },
      { name: 'Coverage', dax: 'DIVIDE([Recorded results], [Applicable tests])', format: '0.0%', folder: 'Commissioning', description: 'Tests with any recorded result ÷ applicable tests (latest plan of each room). Blank when there are no applicable tests, never zero.' },
      { name: 'Passes', dax: 'CALCULATE(COUNTROWS(Results), Results[Result] IN {"PASS_VERIFIED", "PASS_UNVERIFIED"})', format: '#,0', folder: 'Commissioning', description: 'Recorded passes, verified or not.' },
      { name: 'Verified share of passes', dax: 'DIVIDE(CALCULATE(COUNTROWS(Results), Results[Result] = "PASS_VERIFIED"), [Passes])', format: '0.0%', folder: 'Commissioning', description: 'PASS_VERIFIED ÷ all recorded passes (PASS_VERIFIED + PASS_UNVERIFIED). A pass verified by someone other than its recorder.' },
      { name: 'Current fail rate', dax: 'DIVIDE(CALCULATE(COUNTROWS(Results), Results[Result] = "FAIL"), [Recorded results])', format: '0.0%', folder: 'Commissioning', description: 'Current FAIL results ÷ recorded results.' }],
      cols: [{ name: 'RoomCode', type: 'string', hidden: true, description: 'The room (Rooms[RoomCode]).' }, { name: 'TestId', type: 'string', description: 'The test’s id in the commissioning catalogue.' }, { name: 'Test', type: 'string', description: 'What the test checks.' },
        { name: 'Domain', type: 'string', description: 'Audio, video, control, network…' }, { name: 'Phase', type: 'int64', description: 'The catalogue phase of the test (1–5).' },
        { name: 'Result', type: 'string', description: 'PASS_VERIFIED, PASS_UNVERIFIED, FAIL, NOT_SUPPORTED, INCONCLUSIVE or NOT_TESTED: the current result label, never a bare PASS.' },
        { name: 'RecordedAt', type: 'dateTime', description: 'When the current result was recorded (UTC).' }, { name: 'VerifiedAt', type: 'dateTime', description: 'When it was independently verified (UTC), if it was.' }],
      rows: data.results.map((r) => [r.room, r.test_id, r.label, r.domain, r.phase, r.result, r.recorded_at, r.verified_at]) },
    { name: 'Issues', description: 'Deficiencies and design issues of the rooms (app.room_issue), with when each was first resolved (app.issue_event).', measures: [
      { name: 'Open issues', dax: 'CALCULATE(COUNTROWS(Issues), Issues[State] = "OPEN")', format: '#,0', folder: 'Service', description: 'Issues whose state is OPEN.' },
      { name: 'Open high or critical', dax: 'CALCULATE(COUNTROWS(Issues), Issues[State] = "OPEN", Issues[Severity] IN {"High", "Critical"})', format: '#,0', folder: 'Service', description: 'Open issues of High or Critical severity.' },
      { name: 'Mean hours to resolve a deficiency', dax: 'AVERAGEX(FILTER(Issues, Issues[Category] = "INSTALLATION_COMMISSIONING_DEFICIENCY" && NOT ISBLANK(Issues[ResolvedAt])), DATEDIFF(Issues[CreatedAt], Issues[ResolvedAt], SECOND) / 3600)', format: '0.0', folder: 'Service', description: 'From an installation or commissioning deficiency’s creation to its first resolution, in hours, averaged over the resolved ones. Blank when none is resolved.' }],
      cols: [{ name: 'IssueCode', type: 'string', description: 'The issue’s code.' }, { name: 'RoomCode', type: 'string', hidden: true, description: 'The room (Rooms[RoomCode]).' }, { name: 'Category', type: 'string', description: 'DESIGN_DEFICIENCY, INSTALLATION_COMMISSIONING_DEFICIENCY…' },
        { name: 'Severity', type: 'string', description: 'Low, Medium, High, Critical.' }, { name: 'State', type: 'string', description: 'OPEN, RESOLVED, CLOSED…' }, { name: 'Title', type: 'string', description: 'What the issue is.' },
        { name: 'CreatedAt', type: 'dateTime', description: 'When it was raised (UTC).' }, { name: 'ResolvedAt', type: 'dateTime', description: 'When it was first resolved (UTC), if it was.' }],
      rows: data.issues.map((r) => [r.code, r.room, r.category, r.severity, r.state, r.title, r.created_at, r.resolved_at]) },
    { name: 'WorkOrders', description: 'Field work orders raised on issues (app.work_order).', measures: [
      { name: 'Work orders', dax: 'COUNTROWS(WorkOrders)', format: '#,0', folder: 'Service', description: 'Work orders in the current filter context.' },
      { name: 'Open work orders', dax: 'CALCULATE(COUNTROWS(WorkOrders), NOT WorkOrders[State] IN {"CLOSED", "RESOLVED", "CANCELLED"})', format: '#,0', folder: 'Service', description: 'Work orders not CLOSED, RESOLVED or CANCELLED.' }],
      cols: [{ name: 'WorkOrderCode', type: 'string', description: 'The work order’s code.' }, { name: 'IssueCode', type: 'string', hidden: true, description: 'The issue it works (Issues[IssueCode]).' },
        { name: 'State', type: 'string', description: 'OPEN, TRIAGED, ASSIGNED, ACCEPTED, IN_PROGRESS, VERIFYING, RESOLVED, CLOSED, REOPENED…' }, { name: 'Severity', type: 'string', description: 'As triaged.' },
        { name: 'WorkType', type: 'string', description: 'As triaged.' }, { name: 'CreatedAt', type: 'dateTime', description: 'When it was raised (UTC).' }, { name: 'ClosedAt', type: 'dateTime', description: 'When it was closed (UTC), if it was.' }],
      rows: data.wos.map((r) => [r.code, r.issue, r.state, r.severity, r.work_type, r.created_at, r.closed_at]) },
  ];
  const tableSha = Object.fromEntries(tables.map((t) => [t.name, crypto.createHash('sha256').update(canonical(t.rows)).digest('hex')]));
  const provenance = { schema: 'empathia.powerbi-export/1', organization: ctx.p.tenantSlug, exportedBy: { name: ctx.p.name, role: ctx.p.role }, exportedAt: now.toISOString(),
    scope: scope?.length ? 'the sites the exporting person is scoped to' : 'every site of the organization', rows: Object.fromEntries(tables.map((t) => [t.name, t.rows.length])), tableSha256: tableSha,
    definitions: 'Every measure is the KPI summary’s own definition (GET /v1/reports/summary); its description in the model says how it is worked out.',
    status: 'Generated by Empathia from the organization’s records. Written to Microsoft’s published PBIP/PBIR JSON schemas and the TMDL format; not yet opened in Power BI Desktop by Empathia. Nothing has been published: open the folder in your own Power BI Desktop and publish it with your own sign-in if you choose.' };

  const sm = `${NAME}.SemanticModel`; const rp = `${NAME}.Report`; const files: Array<{ path: string; data: string }> = [];
  const json = (p: string, o: unknown) => files.push({ path: p, data: JSON.stringify(o, null, 2) + '\n' });
  json(`${NAME}.pbip`, { $schema: `${S}/pbip/pbipProperties/1.0.0/schema.json`, version: '1.0', artifacts: [{ report: { path: rp } }], settings: { enableAutoRecovery: true } });
  json(`${sm}/definition.pbism`, { $schema: `${S}/item/semanticModel/definitionProperties/1.0.0/schema.json`, version: '4.2', settings: {} });
  json(`${sm}/.pbi/editorSettings.json`, { $schema: `${S}/item/semanticModel/editorSettings/1.0.0/schema.json`, autodetectRelationships: false, parallelQueryLoading: true, typeDetectionEnabled: false, relationshipImportEnabled: false });
  files.push({ path: `${sm}/definition/database.tmdl`, data: 'database\n\tcompatibilityLevel: 1567\n\n' });
  files.push({ path: `${sm}/definition/model.tmdl`, data: ['model Model', '\tculture: en-US', '\tdefaultPowerBIDataSourceVersion: powerBI_V3', '\tsourceQueryCulture: en-US', '', ...tables.map((t) => `ref table ${q(t.name)}`), ''].join('\n') + '\n' });
  const rels: Array<[string, string, string, string]> = [['Results', 'RoomCode', 'Rooms', 'RoomCode'], ['Issues', 'RoomCode', 'Rooms', 'RoomCode'], ['WorkOrders', 'IssueCode', 'Issues', 'IssueCode']];
  files.push({ path: `${sm}/definition/relationships.tmdl`, data: rels.map(([ft, fc, tt, tc]) => `relationship ${tag(`rel/${ft}/${fc}`)}\n\tfromColumn: ${ft}.${fc}\n\ttoColumn: ${tt}.${tc}\n`).join('\n') + '\n' });
  for (const t of tables) files.push({ path: `${sm}/definition/tables/${t.name}.tmdl`, data: tableTmdl(t) });

  json(`${rp}/definition.pbir`, { $schema: `${S}/item/report/definitionProperties/2.0.0/schema.json`, version: '4.0', datasetReference: { byPath: { path: `../${sm}` } } });
  json(`${rp}/definition/version.json`, { $schema: `${S}/item/report/definition/versionMetadata/1.0.0/schema.json`, version: '2.0.0' });
  json(`${rp}/definition/report.json`, { $schema: `${S}/item/report/definition/report/3.3.0/schema.json`, themeCollection: { customTheme: { name: 'Empathia.json', reportVersionAtImport: { visual: '2.4.0', report: '3.3.0', page: '2.1.0' }, type: 'RegisteredResources' } },
    resourcePackages: [{ name: 'RegisteredResources', type: 'RegisteredResources', items: [{ name: 'Empathia.json', path: 'Empathia.json', type: 'CustomTheme' }] }], settings: { useStylableVisualContainerHeader: true, defaultDrillFilterOtherVisuals: true } });
  files.push({ path: `${rp}/StaticResources/RegisteredResources/Empathia.json`, data: JSON.stringify(THEME, null, 2) + '\n' });
  const pages: Array<{ name: string; title: string; visuals: Vis[] }> = [
    { name: 'overview', title: 'Estate overview', visuals: [
      { name: 'title', type: 'textbox', x: 24, y: 16, w: 1232, h: 56, text: `Empathia estate · ${ctx.p.tenantSlug} · exported ${now.toISOString().slice(0, 10)} by ${ctx.p.name}. Every figure is counted from the organization’s records; operational performance is not monitored.` },
      { name: 'rooms', type: 'card', x: 24, y: 88, w: 290, h: 120, roles: { Values: [{ t: 'Rooms', m: 'Rooms' }] }, title: 'Rooms' },
      { name: 'coverage', type: 'card', x: 338, y: 88, w: 290, h: 120, roles: { Values: [{ t: 'Results', m: 'Coverage' }] }, title: 'Commissioning coverage' },
      { name: 'verified', type: 'card', x: 652, y: 88, w: 290, h: 120, roles: { Values: [{ t: 'Results', m: 'Verified share of passes' }] }, title: 'Verified share of passes' },
      { name: 'openhc', type: 'card', x: 966, y: 88, w: 290, h: 120, roles: { Values: [{ t: 'Issues', m: 'Open high or critical' }] }, title: 'Open high or critical issues' },
      { name: 'bylifecycle', type: 'clusteredBarChart', x: 24, y: 232, w: 600, h: 460, roles: { Category: [{ t: 'Rooms', c: 'Lifecycle' }], Y: [{ t: 'Rooms', m: 'Rooms' }] }, title: 'Rooms by lifecycle' },
      { name: 'bysite', type: 'tableEx', x: 648, y: 232, w: 608, h: 460, roles: { Values: [{ t: 'Rooms', c: 'Site' }, { t: 'Rooms', c: 'Building' }, { t: 'Rooms', m: 'Rooms' }, { t: 'Results', m: 'Coverage' }, { t: 'Issues', m: 'Open issues' }] }, title: 'By site and building' }] },
    { name: 'commissioning', title: 'Commissioning', visuals: [
      { name: 'byresult', type: 'clusteredColumnChart', x: 24, y: 24, w: 600, h: 320, roles: { Category: [{ t: 'Results', c: 'Result' }], Y: [{ t: 'Results', m: 'Applicable tests' }] }, title: 'Current result of every applicable test' },
      { name: 'byphase', type: 'clusteredColumnChart', x: 648, y: 24, w: 608, h: 320, roles: { Category: [{ t: 'Results', c: 'Phase' }], Y: [{ t: 'Results', m: 'Recorded results' }, { t: 'Results', m: 'Applicable tests' }] }, title: 'Recorded against applicable, by phase' },
      { name: 'rooms', type: 'tableEx', x: 24, y: 368, w: 1232, h: 328, roles: { Values: [{ t: 'Rooms', c: 'RoomCode' }, { t: 'Rooms', c: 'Room' }, { t: 'Rooms', c: 'Lifecycle' }, { t: 'Results', m: 'Applicable tests' }, { t: 'Results', m: 'Coverage' }, { t: 'Results', m: 'Verified share of passes' }, { t: 'Results', m: 'Current fail rate' }] }, title: 'Room by room' }] },
    { name: 'service', title: 'Issues and work orders', visuals: [
      { name: 'open', type: 'card', x: 24, y: 24, w: 290, h: 120, roles: { Values: [{ t: 'Issues', m: 'Open issues' }] }, title: 'Open issues' },
      { name: 'mttr', type: 'card', x: 338, y: 24, w: 290, h: 120, roles: { Values: [{ t: 'Issues', m: 'Mean hours to resolve a deficiency' }] }, title: 'Mean hours to resolve a deficiency' },
      { name: 'openwo', type: 'card', x: 652, y: 24, w: 290, h: 120, roles: { Values: [{ t: 'WorkOrders', m: 'Open work orders' }] }, title: 'Open work orders' },
      { name: 'byseverity', type: 'clusteredBarChart', x: 24, y: 168, w: 600, h: 260, roles: { Category: [{ t: 'Issues', c: 'Severity' }], Y: [{ t: 'Issues', m: 'Open issues' }] }, title: 'Open issues by severity' },
      { name: 'wostate', type: 'clusteredBarChart', x: 648, y: 168, w: 608, h: 260, roles: { Category: [{ t: 'WorkOrders', c: 'State' }], Y: [{ t: 'WorkOrders', m: 'Work orders' }] }, title: 'Work orders by state' },
      { name: 'issues', type: 'tableEx', x: 24, y: 452, w: 1232, h: 244, roles: { Values: [{ t: 'Issues', c: 'IssueCode' }, { t: 'Rooms', c: 'Room' }, { t: 'Issues', c: 'Severity' }, { t: 'Issues', c: 'State' }, { t: 'Issues', c: 'Title' }] }, title: 'Every issue' }] },
  ];
  json(`${rp}/definition/pages/pages.json`, { $schema: `${S}/item/report/definition/pagesMetadata/1.1.0/schema.json`, pageOrder: pages.map((p) => p.name), activePageName: pages[0]!.name });
  for (const p of pages) {
    json(`${rp}/definition/pages/${p.name}/page.json`, { $schema: `${S}/item/report/definition/page/2.1.0/schema.json`, name: p.name, displayName: p.title, displayOption: 'FitToPage', height: 720, width: 1280 });
    p.visuals.forEach((v, i) => json(`${rp}/definition/pages/${p.name}/visuals/${v.name}/visual.json`, visualJson(v, i)));
  }
  json('empathia-provenance.json', provenance);
  files.push({ path: 'README.txt', data: [`${NAME}: a Power BI project of ${ctx.p.tenantSlug}'s records, exported ${now.toISOString()} by ${ctx.p.name} (${ctx.p.role}).`, '',
    `Open ${NAME}.pbip in Power BI Desktop (Windows). The data is inside the project; nothing needs connecting.`,
    'Three pages: Estate overview, Commissioning, Issues and work orders. Every measure says in its description how it is worked out.',
    'Each row carries the codes of the Empathia records it came from; empathia-provenance.json gives the SHA-256 of every table.', '',
    'Status: written to Microsoft\'s published PBIP/PBIR JSON schemas and the TMDL format. Empathia has not yet opened this project in Power BI Desktop.',
    'Nothing has been published anywhere. Publishing is yours to do, from Power BI Desktop, with your own sign-in.', ''].join('\r\n') });
  return { files, provenance, tables };
}

export async function powerBiZip(ctx: RequestContext, now = new Date()) {
  await ctx.require(EXPORT, 'export a Power BI project', { type: 'Report', id: 'powerbi' });
  const p = await buildProject(ctx, now); const bytes = zip(p.files, now); const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  await ctx.audit(null, 'report.export', 'ALLOWED', { type: 'Report', id: 'powerbi' }, { format: 'pbip', fileSha256: sha, files: p.files.length, rows: p.provenance['rows'], tableSha256: p.provenance['tableSha256'] });
  return { bytes, sha, fileName: `empathia-powerbi-${ctx.p.tenantSlug}-${now.toISOString().slice(0, 10)}.zip` };
}
