/**
 * Mission Control — the action center. One list of the governed steps that are yours to take now, across every product, grouped by
 * product, newest first; and the operational exceptions in your scope. Every row opens the record, where the server decides again.
 * The page computes nothing: GET /v1/mission-control does, with the same rules as each record.
 */
import { useMemo, useState } from 'react';
import { Empty, ErrorState, Loading, Notice, Tag } from '@empathia/ui';
import { api, useQuery } from '../api.js';
import { href } from '../router.js';

type Product = 'projects' | 'rooms' | 'commissioning' | 'service' | 'apex' | 'field' | 'learn';
interface Action { product: Product; kind: string; ref: string; title: string; detail: string; href: string; authority: string; at: string | null }
interface Exception { product: string; ref: string; title: string; detail: string; href: string; severity: 'high' | 'medium' | 'low'; at: string | null }
interface Board { me: { name: string; role: string; siteScoped: boolean }; actions: Action[]; total: number; byProduct: Record<string, number>; exceptions: Exception[]; scanned: Record<string, number>; note: string }

const LABEL: Record<Product, string> = { projects: 'Projects', rooms: 'Rooms', commissioning: 'Commissioning', service: 'ServiceHands', apex: 'APEX', field: 'Field Intelligence', learn: 'Learn' };
const ORDER: Product[] = ['service', 'commissioning', 'apex', 'projects', 'rooms', 'field', 'learn'];
const age = (s: string | null) => { if (!s) return ''; const h = Math.round((Date.now() - Date.parse(s)) / 36e5); return h < 1 ? 'just now' : h < 48 ? `${h} h ago` : `${Math.round(h / 24)} d ago`; };

export function MissionControl() {
  const q = useQuery<Board>('mission', () => api.call('getV1MissionControl' as never) as Promise<Board>);
  const [only, setOnly] = useState<Product | 'all'>('all');
  const groups = useMemo(() => { const g = new Map<Product, Action[]>(); for (const a of q.data?.actions || []) { if (only !== 'all' && a.product !== only) continue; g.set(a.product, [...(g.get(a.product) || []), a]); } return ORDER.filter((p) => g.has(p)).map((p) => [p, g.get(p)!] as const); }, [q.data, only]);
  if (q.error) return <section className="page"><ErrorState error={q.error} retry={q.reload} /></section>;
  if (!q.data) return <section className="page"><Loading label="Collecting what needs you" /></section>;
  const b = q.data;
  return (
    <section className="page mission" data-testid="mission">
      <header className="page__head"><div><p className="kicker">Mission Control</p><h1>{b.total ? `${b.total} step${b.total === 1 ? '' : 's'} need${b.total === 1 ? 's' : ''} you` : 'Nothing needs you right now'}</h1>
        <p className="ui-meta">{b.me.name} · {b.me.role}{b.me.siteScoped ? ' · your sites only' : ''}. {b.note} <a href={href('reports')}>Reports</a> · <a href={href('executive')}>Executive passports</a></p></div></header>

      <nav className="mission__filter" aria-label="Filter by product" data-testid="mission-filter">
        <button type="button" className={`sp__chip${only === 'all' ? ' on' : ''}`} aria-pressed={only === 'all'} onClick={() => setOnly('all')}>All <span className="mission__n">{b.total}</span></button>
        {ORDER.filter((p) => b.byProduct[p]).map((p) => <button key={p} type="button" className={`sp__chip${only === p ? ' on' : ''}`} aria-pressed={only === p} onClick={() => setOnly(p)}>{LABEL[p]} <span className="mission__n">{b.byProduct[p]}</span></button>)}
      </nav>

      <div className="mission__grid">
        <div className="stack" data-testid="mission-actions">
          {!groups.length ? <Empty title="Nothing is waiting on you">Steps appear here when a record reaches a state your role moves forward — a work order to verify, a pass recorded by someone else, a diagnosis to review.</Empty> : null}
          {groups.map(([p, items]) => <section key={p} className="mission__group" aria-labelledby={`mg-${p}`}><h2 id={`mg-${p}`} className="h3">{LABEL[p]} <span className="mission__n">{items.length}</span></h2>
            <ul className="mission__list">{items.map((a, i) => <li key={`${a.ref}-${a.kind}-${i}`}><a href={a.href} className="mission__item"><span className="mission__title">{a.title}</span><span className="ui-meta">{a.detail} · <span className="mono">{a.authority}</span>{a.at ? ` · ${age(a.at)}` : ''}</span></a></li>)}</ul></section>)}
        </div>
        <aside className="stack" aria-label="Exceptions" data-testid="mission-exceptions">
          <h2 className="h3">Exceptions in your scope</h2>
          {b.exceptions.length ? <ul className="mission__list">{b.exceptions.map((e, i) => <li key={i}><a href={e.href} className="mission__item"><span className="mission__title"><Tag tone={e.severity === 'high' ? 'bad' : 'warn'}>{e.severity}</Tag> {e.title}</span><span className="ui-meta">{e.detail}{e.at ? ` · ${age(e.at)}` : ''}</span></a></li>)}</ul> : <Notice tone="muted">No open high or critical issue, no unassigned urgent work order, no Field Intelligence session ended abnormally this week.</Notice>}
          <p className="ui-meta">Scanned: {Object.entries(b.scanned).map(([k, v]) => `${v} ${k.replace(/([A-Z])/g, ' $1').toLowerCase()}`).join(' · ')}.</p>
        </aside>
      </div>
    </section>
  );
}
