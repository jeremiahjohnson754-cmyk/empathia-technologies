import { Empty, ErrorState, Loading } from '@empathia/ui';
import { api, useQuery } from '../api.js';

type Items = { items: Array<{ id: number; kind: string; title: string; link: string | null; created_at: string }> };
const toHash = (link: string | null) => (link && link.startsWith('/v1/rooms/') ? `#/rooms/${link.split('/')[3]}` : null);

export function Inbox() {
  const q = useQuery<Items>('inbox', () => api.call('getV1Notifications') as never);
  return (
    <section className="page">
      <header className="page__head"><div><h1>Inbox</h1><p className="lede">Notifications for your role, written by the outbox worker when something needs you.</p></div></header>
      {q.error ? <ErrorState error={q.error} retry={q.reload} /> : !q.data ? <Loading /> : !q.data.items.length ? <Empty title="Nothing needs you" /> :
        <ol className="inbox">{q.data.items.map((n) => { const h = toHash(n.link); return <li key={n.id}><span className="ui-meta">{new Date(n.created_at).toLocaleString()}</span><span>{h ? <a href={h}>{n.title}</a> : n.title}</span><span className="ui-meta mono">{n.kind}</span></li>; })}</ol>}
    </section>
  );
}
