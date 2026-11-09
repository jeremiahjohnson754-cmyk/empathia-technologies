/**
 * #/compare (Core Compare: two things side by side on the same measures) and #/compare/<kind>: rooms, devices, standards, commissioned
 * (current vs commissioned), proposed (current vs proposed), change (before vs after), budget (estimate vs actual), baselines (old vs new
 * baseline). Every value is read from the Core records; a value the records do not hold is "—", never 0. V2.5.3 AZ_COMPARE decides who
 * may open each kind.
 */
import { useState, type ReactNode } from 'react';
import { PageHero, Segmented, EmptyState, Tag } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { allows } from '../access/policy.js';
import { shortName, fullName, roomById } from '../campus/canon.js';
import { openIssues, LAYERS, type RoomRecord } from '../campus/design.js';
import { load as loadDecisions } from '../decisions/store.js';
import { healthOf, fmtUsd, day, STANDARDS, type Core } from './core.js';
import { useCore, honest, Crumbs, Pills } from './ui.js';

type Row = [string, ReactNode, ReactNode, string?];
interface Kind { key: string; title: string; sub: string; a: string; b: string }
export const KINDS: Kind[] = [
  { key: 'rooms', title: 'Room vs room', sub: 'Two rooms on the same measures', a: 'Room A', b: 'Room B' },
  { key: 'devices', title: 'Device vs device', sub: 'Two devices: identity, state and lifecycle', a: 'Device A', b: 'Device B' },
  { key: 'standards', title: 'Standard vs standard', sub: 'What two standards ask for, and how well the estate meets them', a: 'Standard A', b: 'Standard B' },
  { key: 'commissioned', title: 'Current vs commissioned', sub: 'A room today against its baseline', a: 'Commissioned', b: 'Current' },
  { key: 'proposed', title: 'Current vs proposed', sub: 'A room today against the change being asked for', a: 'Current', b: 'Proposed' },
  { key: 'change', title: 'Before vs after', sub: 'What a recorded change did', a: 'Before', b: 'After' },
  { key: 'budget', title: 'Budget estimate vs actual', sub: 'Every figure a project has had, first to last', a: 'The figure before', b: 'This stage' },
  { key: 'baselines', title: 'Old baseline vs new baseline', sub: 'Two commissioning baselines of the same room', a: 'Older', b: 'Newer' },
];
const s = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));

export default function ComparePage({ role, params }: PageProps) {
  const core = useCore(); const kind = KINDS.find((k) => k.key === params['kind']);
  const mine = KINDS.filter((k) => allows({ compare: k.key }, role));
  if (params['kind'] && !kind) return <div className="pa"><EmptyState title={`Core Compare has no comparison called “${params['kind']}”`} icon="search" action={<a className="ui-btn" href="#/compare">Every comparison</a>} /></div>;
  if (!kind) return (
    <div className="pa" data-native="" data-testid="parity-compare">
      <PageHero eyebrow="Core · compare" title="Core Compare" product="pro" icon="layers" lede="Put two things side by side on the same measures. Every value is read from Core, and what differs is marked." meta={honest(['Read from Core', 'accent'], ['Synthetic data', 'warn'])} />
      <div className="kit-grid">{mine.map((k) => { const ex = example(core, k.key); return <a key={k.key} className="pa-card-link" href={`#/compare/${k.key}`}><h3>{k.title}</h3><p>{k.sub}</p><span className="pa-card-link__meta">{ex ? `${ex.label} · ${ex.diff} of ${ex.total} differ` : 'nothing on record to compare yet'}</span></a>; })}</div>
    </div>
  );
  return <div className="pa" data-native="" data-testid="parity-compare"><Crumbs items={[['Core Compare', '#/compare'], [kind.title]]} /><Pills label="Comparisons" items={mine.map((k) => ({ label: k.title, href: `#/compare/${k.key}`, on: k.key === kind.key }))} /><Kinded key={kind.key} core={core} kind={kind} /></div>;
}

function example(core: Core, k: string) { const pairs = options(core, k); if (pairs.length < 1) return null; const [a, b] = defaults(core, k, pairs); const rows = rowsFor(core, k, a, b); return { label: `${labelOf(pairs, a)}${k === 'rooms' || k === 'devices' || k === 'standards' ? ` and ${labelOf(pairs, b)}` : ''}`, diff: rows.filter(differs).length, total: rows.length }; }
const labelOf = (o: Array<[string, string]>, id: string) => o.find((x) => x[0] === id)?.[1] || id;
const differs = (r: Row) => String(r[1]) !== String(r[2]);
const rr = (core: Core, id: string) => core.rooms.find((r) => r.outline.id === id);

/** What can be picked for a kind: [id, label]. Kinds with one subject (a room, a project) pick it once. */
function options(core: Core, k: string): Array<[string, string]> {
  const rooms = (f: (r: RoomRecord) => boolean) => core.rooms.filter(f).map((r) => [r.outline.id, fullName(r.outline)] as [string, string]);
  if (k === 'rooms') return rooms(() => true);
  if (k === 'devices') return core.byType.Device.filter((d) => d.state !== 'End').map((d) => [d.id, d.name]);
  if (k === 'standards') return STANDARDS.map((x) => [x[0], `${x[0]} ${x[1]}`]);
  if (k === 'commissioned') return rooms((r) => r.baselines.some((b) => b.state === 'CURRENT'));
  if (k === 'proposed' || k === 'budget') return loadDecisions().projects.filter((p) => k === 'budget' || p.roomId).map((p) => [p.id, p.name]);
  if (k === 'change') return rooms((r) => r.installations.some((i) => i.removedAt));
  if (k === 'baselines') return rooms((r) => r.baselines.length >= 2);
  return [];
}
function defaults(core: Core, k: string, o: Array<[string, string]>): [string, string] {
  const has = (id: string) => o.some((x) => x[0] === id);
  if (k === 'rooms') return [has('R-BCN-3-101') ? 'R-BCN-3-101' : o[0]![0], has('R-BCN-2-121') ? 'R-BCN-2-121' : (o[1] || o[0])![0]];
  if (k === 'devices') { const a = o[0]![0]; const cat = core.byType.Device.find((d) => d.id === a)?.sub.split(' · ')[0]; const b = core.byType.Device.find((d) => d.id !== a && d.sub.split(' · ')[0] === cat && d.state !== 'End')?.id || (o[1] || o[0])![0]; return [a, b]; }
  if (k === 'standards') return [o[0]![0], (o[1] || o[0])![0]];
  return [o[0]![0], o[0]![0]];
}
const pair = (k: string) => k === 'rooms' || k === 'devices' || k === 'standards';

function rowsFor(core: Core, k: string, a: string, b: string): Row[] {
  if (k === 'rooms') { const A = rr(core, a), B = rr(core, b); if (!A || !B) return []; const m = (r: RoomRecord): Array<[string, unknown]> => [
    ['Building', roomById(r.outline.id) && shortName(r.outline).split(' ')[0]], ['Archetype', r.archetypeName], ['Seats', r.outline.capacity], ['Width × length × ceiling', `${r.outline.dims.join(' × ')} m`],
    ...LAYERS.filter((l) => l.key !== 'furniture').map((l) => [`${l.label} devices`, r.positions.filter((p) => p.layer === l.key).length] as [string, unknown]),
    ['Lifecycle', r.lifecycle], ['Applicable tests', r.counts.applicable], ['Verified tests', r.counts.verified], ['Open issues', openIssues(r).length], ['Health (rule)', `${healthOf(r)} of 100`], ['Baseline', r.baselines.find((x) => x.state === 'CURRENT') ? `v${r.baselines.find((x) => x.state === 'CURRENT')!.version}` : '—']];
    const ma = m(A), mb = m(B); return ma.map(([l, v], i) => [l, s(v), s(mb[i]![1])]); }
  if (k === 'devices') { const A = core.byType.Device.find((d) => d.id === a), B = core.byType.Device.find((d) => d.id === b); if (!A || !B) return []; const keys = [...new Set([...A.facts.map((f) => f[0]), ...B.facts.map((f) => f[0])])]; return [['Room', s(A.name.split(' · ')[1]), s(B.name.split(' · ')[1])], ...keys.map((key) => [key, s(A.facts.find((f) => f[0] === key)?.[1]), s(B.facts.find((f) => f[0] === key)?.[1])] as Row)]; }
  if (k === 'standards') { const A = core.byType.Standard.find((x) => x.id === a), B = core.byType.Standard.find((x) => x.id === b); if (!A || !B) return []; return A.facts.map(([l, v], i) => [l, v, s(B.facts[i]?.[1])]); }
  if (k === 'commissioned') { const r = rr(core, a); const bl = r?.baselines.find((x) => x.state === 'CURRENT'); if (!r || !bl) return []; const at = Date.parse(bl.at); const then = r.installations.filter((i) => Date.parse(i.installedAt) <= at && (!i.removedAt || Date.parse(i.removedAt) > at)); const now = r.installations.filter((i) => !i.removedAt);
    return [['Baseline', `v${bl.version}, design revision ${bl.revision}`, `v${bl.version} (current)`], ['Recorded', day(bl.at), r.events.length ? day(Math.max(...r.events.map((e) => Date.parse(e.at)))) : '—'], ['Signed by', s(bl.by), '—'], ['Units installed', then.length, now.length], ['Units', then.map((i) => i.asset).sort().join(', ') || '—', now.map((i) => i.asset).sort().join(', ') || '—'], ['Open issues', 0, openIssues(r).length, 'a baseline is accepted with none open'], ['Verified tests', `${r.counts.verified} of ${r.counts.applicable}`, `${r.counts.verified} of ${r.counts.applicable}`], ['Lifecycle', 'ACCEPTED', r.lifecycle]].map((x) => [x[0] as string, s(x[1]), s(x[2]), x[3] as string | undefined]); }
  if (k === 'proposed') { const p = loadDecisions().projects.find((x) => x.id === a); const r = p?.roomId ? rr(core, p.roomId) : undefined; if (!p || !r) return []; return [['Room', fullName(r.outline), fullName(r.outline)], ['What changes', 'as built', p.summary], ['Scope revision', '—', p.scopeRev], ['Lifecycle', r.lifecycle, 'recommissioning after the change'], ['Open issues', openIssues(r).length, 'each closed with its retest'], ['Capital (rough order of magnitude)', '—', fmtUsd(p.romUsd)], ['Governance', 'no change in delivery', p.state]].map((x) => [x[0] as string, s(x[1]), s(x[2])]); }
  if (k === 'change') { const r = rr(core, a); if (!r) return []; const gone = r.installations.filter((i) => i.removedAt); return gone.flatMap((g) => { const nu = r.installations.find((i) => i.position === g.position && !i.removedAt); const pos = r.positions.find((p) => p.code === g.position); return [[`Position ${g.position} (${pos?.catLabel || 'device'})`, g.asset, s(nu?.asset)], ['Why', s(g.removalReason || g.reason), s(nu?.reason)], ['When', `installed ${day(g.installedAt)}`, nu ? `installed ${day(nu.installedAt)}` : '—'], ['Basis', s(g.basis), s(nu?.basis)]] as Row[]; }); }
  if (k === 'budget') { const d = loadDecisions(); const p = d.projects.find((x) => x.id === a); if (!p) return []; const dec = d.decisions.filter((x) => x.projectId === p.id).slice(-1)[0]; const f = d.funding.find((x) => x.projectId === p.id);
    const stages: Array<[string, number | null, string]> = [[`Initial ROM · brief revision ${p.brief.rev}`, p.romUsd, 'the request, before any design'], [`Approved amount${dec ? ` · ${dec.decision.toLowerCase()} by ${dec.by}` : ''}`, dec?.decision === 'APPROVED' || p.state === 'APPROVED' || p.state === 'FUNDED' ? p.romUsd : null, 'the amount a named person approved'], [`Funded${f ? ` · ${f.costCenter}` : ''}`, f ? f.amount : null, 'money set aside against the approved scope'], ['Committed cost', null, 'orders placed: no actual cost is held in this demonstration'], ['Actual cost', null, 'invoices: not held']];
    return stages.map(([l, v, why], i) => { const prev = i ? stages[i - 1]![1] : null; const pct = v != null && prev ? Math.round(((v - prev) / prev) * 100) : null; return [l, i ? fmtUsd(prev) : '—', fmtUsd(v), `${why}${pct !== null ? ` · ${pct >= 0 ? '+' : ''}${pct}% on the figure before` : ''}`]; }); }
  if (k === 'baselines') { const r = rr(core, a); if (!r || r.baselines.length < 2) return []; const [o, n] = [...r.baselines].sort((x, y) => x.version - y.version).slice(-2) as [RoomRecord['baselines'][0], RoomRecord['baselines'][0]]; return [['Version', `v${o.version}`, `v${n.version}`], ['State', o.state, n.state], ['Design revision', o.revision, n.revision], ['Recorded', day(o.at), day(n.at)], ['Signed by', s(o.by), s(n.by)], ['Note', o.note, n.note]].map((x) => [x[0] as string, s(x[1]), s(x[2])]); }
  return [];
}

function Kinded({ core, kind }: { core: Core; kind: Kind }) {
  const opts = options(core, kind.key); const [d0, d1] = opts.length ? defaults(core, kind.key, opts) : ['', ''];
  const [a, setA] = useState(d0); const [b, setB] = useState(d1); const [only, setOnly] = useState<'all' | 'diff'>('all');
  if (!opts.length) return <EmptyState title={`Nothing on record to compare as “${kind.title}”`} icon="layers">The records hold no subject for this comparison yet.</EmptyState>;
  const rows = rowsFor(core, kind.key, a, b); const diff = rows.filter(differs).length; const shown = only === 'diff' ? rows.filter(differs) : rows;
  const pick = (v: string, set: (x: string) => void, label: string) => <label className="pa-field">{label}<select className="pa-select" value={v} onChange={(e) => set(e.target.value)}>{opts.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></label>;
  const p = kind.key === 'budget' ? loadDecisions().projects.find((x) => x.id === a) : null;
  return (
    <>
      <PageHero compact eyebrow="Core Compare" title={kind.title} product="pro" icon="layers" lede={kind.sub + '.'} meta={kind.key === 'budget' ? honest(['ROM estimate · not a quote', 'warn']) : honest(['Read from Core', 'accent'])} />
      <div className="pa-toolbar">
        <div className="pa-row-actions">{pick(a, setA, pair(kind.key) ? kind.a : kind.key === 'budget' || kind.key === 'proposed' ? 'Project' : 'Room')}{pair(kind.key) ? pick(b, setB, kind.b) : null}</div>
        <Segmented small label="Rows" value={only} onChange={setOnly} options={[{ value: 'all', label: 'All', count: rows.length }, { value: 'diff', label: 'Only what differs', count: diff }]} />
      </div>
      {p ? <p className="pa-note">{p.name}: {fmtUsd(p.romUsd)} rough order of magnitude at brief revision {p.brief.rev}; {p.state.replace(/_/g, ' ').toLowerCase()}. No committed or actual cost is held, so none is shown.</p> : null}
      <p className="pa-note" aria-live="polite"><b>{diff} of {rows.length} differ</b></p>
      <div className="pa-table-wrap"><table className="pa-table" data-testid="compare-table"><caption className="ui-sr">{kind.title}</caption>
        <thead><tr><th scope="col">Measure</th><th scope="col">{kind.a}</th><th scope="col">{kind.b}</th>{rows.some((r) => r[3]) ? <th scope="col">Note</th> : null}</tr></thead>
        <tbody>{shown.map((r, i) => <tr key={`${r[0]}-${i}`} className={differs(r) ? 'pa-diff' : undefined}><th scope="row">{r[0]}{differs(r) ? <span className="ui-sr"> (differs)</span> : null}</th><td>{r[1]}</td><td>{r[2]}</td>{rows.some((x) => x[3]) ? <td className="pa-note">{r[3] || ''}</td> : null}</tr>)}</tbody>
      </table></div>
      {only === 'diff' && !diff ? <p className="pa-note"><Tag tone="ok">identical</Tag> Nothing differs on these measures.</p> : null}
    </>
  );
}
