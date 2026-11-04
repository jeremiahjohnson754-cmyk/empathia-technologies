/**
 * Shared parts of the V2.5.3 parity pages (#/list, #/set, #/ledger, #/compare, #/ask, #/control, #/v14 …): the Core model hook, the
 * honest-label chips, crumbs and pill navigation, record rows that open a record's passport, and a facts table. Every figure on these
 * pages is counted from the records in ./core.ts; a role sees only the record types its V2.5.3 authority admits (AZ_ENTITY).
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Chip, Icon, List, ListRow, EmptyState, Tag, type IconName } from '@empathia/ui';
import { allows } from '../access/policy.js';
import type { RoleKey } from '../registry.types.js';
import { load as loadWorkspace } from '../workspace/store.js';
import { load as loadDecisions } from '../decisions/store.js';
import { buildCore, TYPES, PROV_TEXT, type Core, type EntityType, type Rec, type Prov } from './core.js';

/** The Core model of this browser's demonstration: the room records plus the shared workspace and the decision desk, read once per page. */
export function useCore(): Core { return useMemo(() => buildCore(loadWorkspace(), loadDecisions()), []); }
/** May this role see records of this type? V2.5.3's AZ_ENTITY, through the same policy as every page. */
export const canEntity = (role: RoleKey, t: EntityType) => allows({ entity: t }, role);
export const visible = (role: RoleKey, recs: Rec[]) => recs.filter((r) => canEntity(role, r.type));
export const recHref = (r: Pick<Rec, 'type' | 'id'>) => `#/list/${r.type}/${encodeURIComponent(r.id)}`;
export const toneOf = (t: Rec['tone']) => (t === 'ok' || t === 'warn' || t === 'bad' || t === 'info' ? t : 'muted');

/** The labels V2.5.3 put under every title ("Synthetic data", "Modeled · not measured", …): small chips, never a banner. */
export function honest(...labels: Array<[string, 'warn' | 'info' | 'muted' | 'accent' | 'ok']>): ReactNode[] {
  return labels.map(([l, t]) => <Chip key={l} small tone={t}>{l}</Chip>);
}
export const PROV_LABEL: Record<Prov, string> = { KNOWN: 'Known', INFERRED: 'Inferred', SIMULATED: 'Simulated' };
export function ProvTag({ prov }: { prov: Prov }) {
  return <span className="pa-prov" data-prov={prov} title={PROV_TEXT[prov]}><Tag tone={prov === 'KNOWN' ? 'ok' : prov === 'INFERRED' ? 'info' : 'warn'}>{PROV_LABEL[prov]}</Tag></span>;
}

export function Crumbs({ items }: { items: Array<[string, string?]> }) {
  return (
    <nav className="pa-crumbs" aria-label="Breadcrumb"><ol>
      {items.map(([l, h], i) => <li key={i}>{h && i < items.length - 1 ? <a href={h}>{l}</a> : <span aria-current={i === items.length - 1 ? 'page' : undefined}>{l}</span>}</li>)}
    </ol></nav>
  );
}
/** V2.5.3's pill row: links between the views of one area, the current one marked. */
export function Pills({ items, label }: { items: Array<{ label: string; href: string; on: boolean; count?: number }>; label: string }) {
  return (
    <nav className="pa-pills" aria-label={label}>
      {items.map((p) => <a key={p.href} className={`pa-pill${p.on ? ' pa-pill--on' : ''}`} href={p.href} aria-current={p.on ? 'page' : undefined}>{p.label}{p.count !== undefined ? <span className="pa-pill__n">{p.count}</span> : null}</a>)}
    </nav>
  );
}
export function TypeIcon({ type, tone }: { type: EntityType; tone?: Rec['tone'] }) {
  return <span className={`pa-ticon kit-s--${tone === 'bad' ? 'bad' : tone === 'warn' ? 'warn' : tone === 'ok' ? 'ok' : 'accent'}`} aria-hidden="true"><Icon name={TYPES[type].icon as IconName} size={16} /></span>;
}
/** A list of records, each opening its passport; long lists show 12 then "Show n more". */
export function RecList({ recs, label, empty, step = 12, trailing }: { recs: Rec[]; label: string; empty?: string; step?: number; trailing?: (r: Rec) => ReactNode }) {
  const [n, setN] = useState(step);
  if (!recs.length) return <EmptyState title={empty || 'No records match'} icon="inbox">Nothing in this demonstration’s records fits; the count is zero, not unknown.</EmptyState>;
  return (
    <>
      <List label={label}>
        {recs.slice(0, n).map((r) => (
          <ListRow key={`${r.type}:${r.id}`} href={recHref(r)} title={r.name} sub={<>{r.sub} · <span className="pa-id">{r.id}</span></>} leading={<TypeIcon type={r.type} tone={r.tone} />}
            trailing={trailing ? trailing(r) : r.state ? <Tag tone={toneOf(r.tone)}>{r.state.replace(/_/g, ' ').toLowerCase()}</Tag> : undefined} chevron />
        ))}
      </List>
      {recs.length > n ? <p className="pa-more"><button type="button" className="ui-btn ui-btn--quiet" onClick={() => setN(n + step * 2)}>Show {Math.min(step * 2, recs.length - n)} more of {recs.length - n}</button></p> : null}
    </>
  );
}
export function FactsTable({ facts, caption }: { facts: Array<[string, ReactNode]>; caption?: string }) {
  return (
    <dl className="pa-facts" aria-label={caption}>
      {facts.map(([k, v]) => <div key={k} className="pa-facts__row"><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}
/** A section with a title and a quiet note on the right (V2.5.3's "zone"). */
export function Zone({ title, note, children, id }: { title: string; note?: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <section className="pa-zone" aria-labelledby={id ? `${id}-h` : undefined} id={id}>
      <header className="pa-zone__head"><h2 id={id ? `${id}-h` : undefined}>{title}</h2>{note ? <p className="pa-zone__note">{note}</p> : null}</header>
      {children}
    </section>
  );
}
/** A small horizontal bar chart (labels, values, the largest bar full width); readable as a list by a screen reader. */
export function Bars({ rows, label, unit = '' }: { rows: Array<{ label: string; value: number; tone?: string; href?: string; note?: string }>; label: string; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="pa-bars" aria-label={label}>
      {rows.map((r) => {
        const body = <><span className="pa-bars__l">{r.label}</span><span className="pa-bars__track" aria-hidden="true"><span className={`pa-bars__fill kit-s--${r.tone || 'accent'}`} style={{ inlineSize: `${(r.value / max) * 100}%` }} /></span><b className="pa-bars__v">{r.value.toLocaleString('en-US')}{unit}</b>{r.note ? <span className="pa-bars__n">{r.note}</span> : null}</>;
        return <li key={r.label}>{r.href ? <a className="pa-bars__row" href={r.href}>{body}</a> : <span className="pa-bars__row">{body}</span>}</li>;
      })}
    </ul>
  );
}
