/**
 * #/families — the platform's six families (founder decision E3-D1, 23 Nov 2026): the nine products and the eight further
 * capabilities, each with its place in the demonstration or a plain "not built yet". A link is shown only where the current
 * perspective may open it; a capability that is not built has no link at all.
 */
import { PageHero, Notice, Tag, FAMILIES } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';

export default function FamiliesPage({ role }: PageProps) {
  const opens = (h: string) => { const r = resolve(h); return !!r && canOpen(role, r); };
  const all = FAMILIES.flatMap((f) => f.members); const built = all.filter((m) => m.built).length;
  return (<div className="vc" data-testid="families">
    <PageHero eyebrow="Empathia · one platform" title="Six families, one record" product="mission-control" icon="layers" lede={`${all.length} capabilities share one record of every room, device, person and job: the nine products and ${all.length - 9} further capabilities. ${built === all.length ? 'All of them can be opened in this demonstration; the eight further capabilities are simulations.' : `${built} can be opened in this demonstration; ${all.length - built} are specified and not built yet.`}`} />
    <Notice tone="info">Everything here runs on synthetic data, and nothing is connected to a live system. Each capability’s own page says what it does not do yet.</Notice>
    {FAMILIES.map((f) => (<section key={f.id} className="vc-sec" aria-labelledby={`fam-${f.id}`} data-family={f.id}>
      <h2 id={`fam-${f.id}`}>{f.name}</h2><p className="ui-muted">{f.says}</p>
      <ul className="mp-deps">{f.members.map((m) => (<li key={m.id} className="mp-dep" data-cap={m.id} data-ready={m.built ? 'READY' : 'UNKNOWN'}>
        <h3>{m.built && m.demo && opens(`#${m.demo}`) ? <a href={`#${m.demo}`} data-testid={`fam-open-${m.id}`}>{m.name}</a> : m.name}</h3>
        <p><Tag tone={m.kind === 'product' ? 'info' : 'accent'}>{m.kind === 'product' ? 'One of the nine products' : 'Capability'}</Tag> {m.built ? (m.demo && !opens(`#${m.demo}`) ? <Tag tone="muted">Not open to this perspective</Tag> : <Tag tone="ok">In the demonstration</Tag>) : <Tag tone="warn">Not built yet</Tag>}</p>
        <p>{m.says}</p></li>))}</ul>
    </section>))}
  </div>);
}
