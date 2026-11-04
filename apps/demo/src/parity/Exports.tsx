/**
 * #/exports (Reports and exports: what the numbers are made of, as files). Every export is the same records a page shows for this role,
 * with a provenance header: build, demonstration clock, role, rule and whether the figures are recorded, inferred or simulated. Files are
 * made in the browser (a Blob); nothing is uploaded. CSV cells that a spreadsheet would run as a formula are neutralised.
 */
import { useState } from 'react';
import { PageHero, Card, Icon, Tag } from '@empathia/ui';
import type { PageProps, RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { load as loadWorkspace } from '../workspace/store.js';
import { DEMO_NOW, TYPES, type Core, type Rec } from './core.js';
import { useCore, honest, Pills, canEntity } from './ui.js';
import { ALL_SETS } from './sets.js';
import { allows } from '../access/policy.js';
import { setAuthority } from './sets.js';
declare const process: { env: Record<string, string | undefined> };

interface Ex { key: string; title: string; how: string; rows: (c: Core) => Array<Record<string, string | number | null>> }
interface Fam { key: string; label: string; items: Ex[] }
const recRows = (recs: Rec[]) => recs.map((r) => ({ id: r.id, type: r.type, name: r.name, state: r.state || null, building: r.building || null, room: r.roomId || null, provenance: r.prov, source: r.source, ...Object.fromEntries(r.facts.map(([k, v]) => [k.toLowerCase().replace(/[^a-z0-9]+/g, '_'), v])) }));
export const FAMS: Fam[] = [
  { key: 'pro', label: 'Pro · issues and devices', items: ALL_SETS.filter((s) => s.family.key === 'iss' || s.family.key === 'dev').map((s) => ({ key: s.key, title: s.title, how: s.how, rows: (c: Core) => recRows(s.items(c)) })) },
  { key: 'rooms', label: 'Rooms and assurance', items: ALL_SETS.filter((s) => s.family.key === 'room' || s.family.key === 'as').map((s) => ({ key: s.key, title: s.title, how: s.how, rows: (c: Core) => recRows(s.items(c)) })) },
  { key: 'records', label: 'Documents and changes', items: ALL_SETS.filter((s) => s.family.key === 'doc' || s.family.key === 'chg').map((s) => ({ key: s.key, title: s.title, how: s.how, rows: (c: Core) => recRows(s.items(c)) })) },
  { key: 'service', label: 'ServiceHands', items: [
    { key: 'sh:incidents', title: 'Service incidents', how: 'Every incident of this browser’s ServiceHands workspace, requesters withheld.', rows: () => loadWorkspace().incidents.map((i) => ({ id: i.id, room: i.roomId, building: i.buildingKey, title: i.title, severity: i.severity, state: i.state, opened: i.openedAt, restored: i.restoredAt, closed: i.closedAt, work_order: i.workOrderId, provenance: 'KNOWN' })) },
    { key: 'sh:workorders', title: 'Work orders', how: 'Every work order with its state and technician (synthetic people).', rows: () => loadWorkspace().workOrders.map((x) => ({ id: x.id, incident: x.incidentId, room: x.roomId, type: x.workType, state: x.state, technician: x.techId, opened: x.openedAt, provenance: 'KNOWN' })) },
  ] },
  { key: 'projects', label: 'Projects and budget', items: [
    { key: 'pj:projects', title: 'Projects on the decision desk', how: 'Each project with its governance state and rough order of magnitude.', rows: (c) => recRows(c.byType.Project) },
    { key: 'pf:budget', title: 'Budget scenarios', how: 'The rough order of magnitude of each project; no actual cost is held.', rows: (c) => recRows(c.byType.BudgetScenario) },
  ] },
];
const AUTH: Record<string, string> = { 'sh:incidents': 'sh:x', 'sh:workorders': 'sh:x', 'pj:projects': 'pj:x', 'pf:budget': 'pf:x' };
const mayExport = (role: RoleKey, e: Ex) => allows(setAuthority(AUTH[e.key] || e.key), role);

export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;   // a spreadsheet would run it as a formula
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(rows: Array<Record<string, unknown>>, header: string[]): string {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return [...header.map((h) => `# ${h.replace(/[\r\n]+/g, ' ')}`), cols.map(csvCell).join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n') + '\r\n';
}
function save(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ExportsPage({ role, params }: PageProps) {
  const core = useCore(); const [said, setSaid] = useState('');
  const fams = FAMS.map((f) => ({ ...f, items: f.items.filter((e) => mayExport(role, e)) })).filter((f) => f.items.length);
  const fam = fams.find((f) => f.key === params['family']) || fams[0];
  const header = (e: Ex, n: number) => [`Empathia demonstration export: ${e.title}`, `Rule: ${e.how}`, `Rows: ${n}`, `Role: ${ROLES[role].label} (a perspective; it grants nothing)`, `Demonstration clock: ${new Date(DEMO_NOW).toISOString()}`, `Build: ${process.env.DEMO_BUILD_ID || 'dev'}`, 'Synthetic data: every record is invented and connected to no real system'];
  const filtered = (e: Ex) => e.rows(core).filter((r) => !r.type || canEntity(role, r.type as keyof typeof TYPES));
  const go = (e: Ex, kind: 'csv' | 'json' | 'copy') => {
    const rows = filtered(e); const h = header(e, rows.length); const base = `empathia-${e.key.replace(/[^a-z0-9]+/gi, '-')}`;
    if (kind === 'csv') { save(`${base}.csv`, toCsv(rows, h), 'text/csv;charset=utf-8'); setSaid(`${e.title}: ${rows.length} rows saved as CSV.`); }
    else if (kind === 'json') { save(`${base}.json`, JSON.stringify({ provenance: h, rows }, null, 2), 'application/json'); setSaid(`${e.title}: ${rows.length} rows saved as JSON.`); }
    else { const text = `${e.title}: ${rows.length} records. ${e.how} (Empathia demonstration, synthetic data.)`; (navigator.clipboard?.writeText(text) || Promise.reject(new Error('no clipboard'))).then(() => setSaid('Summary copied.'), () => setSaid(`Copying is blocked here; the summary is: ${text}`)); }
  };
  return (
    <div className="pa" data-testid="parity-exports">
      <PageHero eyebrow="Reports and exports" title="What the numbers are made of, as files" product="pro" icon="download"
        lede="Every export is the same records the page shows for your role, with the same rule, demonstration clock and a provenance header that says whether the figures are recorded, inferred or simulated."
        meta={honest(['Synthetic data', 'warn'], ['Role projection · not security', 'muted'], ['Made in your browser · nothing uploaded', 'accent'])} />
      {fams.length ? <>
        <Pills label="Export families" items={fams.map((f) => ({ label: f.label, href: `#/exports/${f.key}`, on: f.key === fam!.key, count: f.items.length }))} />
        <div className="kit-grid">{fam!.items.map((e) => { const n = filtered(e).length; return (
          <Card key={e.key} title={e.title} icon="download" sub={e.how} footer={<span className="pa-note"><b>{n}</b> records · <a href={`#/set/${e.key}`}>open the records</a></span>}>
            <div className="pa-row-actions">
              <button type="button" className="ui-btn" onClick={() => go(e, 'csv')} data-testid={`export-csv-${e.key}`}><Icon name="download" size={16} /> CSV · {n}</button>
              <button type="button" className="ui-btn" onClick={() => go(e, 'json')}><Icon name="download" size={16} /> JSON · {n}</button>
              <button type="button" className="ui-btn ui-btn--quiet" onClick={() => go(e, 'copy')}>Copy summary</button>
            </div>
          </Card>); })}</div>
        <p className="pa-note" aria-live="polite" data-testid="export-said">{said || <><Tag tone="muted">CSV and JSON</Tag> Pictures and PDFs of a page come from the browser’s own print.</>}</p>
      </> : <p className="pa-note">No export family is part of this role’s work.</p>}
    </div>
  );
}
