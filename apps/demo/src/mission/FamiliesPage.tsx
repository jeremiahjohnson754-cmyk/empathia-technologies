/**
 * #/families — the platform map (founder, 23 Nov 2026: "One platform, six product families, shared engineering intelligence").
 * Three things, read from the same file as the corporate website (packages/ui families.ts): one issue followed through the families
 * at one room; the six families with the question each answers, their members and where their records go; and what all seventeen
 * share. Every link is checked for the current role: a capability this perspective may not open is named without a link.
 * 24 Nov 2026, design pass: the page leads with the platform as one picture (./Plate.tsx, the figure the website draws), and the issue
 * is drawn as one path with the family beside each stop, as on the website, so the two sites show the platform the same way.
 */
import { PageHero, Notice, Tag, FAMILIES, SHARED, THREAD, POSITIONING, launchById } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { Plate } from './Plate.js';

export default function FamiliesPage({ role }: PageProps) {
  const opens = (h: string) => { const r = resolve(h); return !!r && canOpen(role, r); };
  const all = FAMILIES.flatMap((f) => f.members); const built = all.filter((m) => m.built).length;
  return (<div className="vc" data-testid="families">
    <PageHero eyebrow="Empathia · the platform" title={POSITIONING.line} product="mission-control" icon="layers" lede={POSITIONING.lead}
      meta={[<span key="f">{FAMILIES.length} families</span>, <span key="c">{all.length} capabilities</span>, <Tag key="b" tone={built === all.length ? 'ok' : 'warn'}>{built === all.length ? 'All open in this demonstration' : `${built} open in this demonstration`}</Tag>]} />
    <Plate opens={opens} />
    <Notice tone="info">Everything here runs on synthetic data, and nothing is connected to a live system. The eight capabilities beside the nine core products are simulations; each one’s own page says what it does not do yet.</Notice>
    <section className="vc-sec" aria-labelledby="fam-thread-h" data-testid="fam-thread"><h2 id="fam-thread-h">One issue, followed through the families</h2>
      <p className="ui-muted">A calling problem in Atlas 4.218. Every stop is the same room and the same records, read by a different family.</p>
      <ol className="pl-thread">{THREAD.map((t, i) => { const l = launchById(t.launch); const href = l ? `#${l.route}` : null; const f = FAMILIES.find((x) => x.id === t.family); return (
        <li key={t.launch} data-thread={t.launch}><p className="pl-thread__fam">{f?.name}</p><span className="pl-thread__n" aria-hidden="true">{i + 1}</span>
          <div><h3>{href && opens(href) ? <a href={href} data-testid={`fam-thread-${t.launch}`}>{t.title}</a> : t.title}</h3><p>{t.says}</p></div></li>); })}</ol>
    </section>
    {FAMILIES.map((f) => (<section key={f.id} className="vc-sec" aria-labelledby={`fam-${f.id}`} data-family={f.id}>
      <h2 id={`fam-${f.id}`}>{f.name}</h2><p><b>{f.asks}</b> <span className="ui-muted">{f.hands}</span></p>
      <ul className="mp-deps om-claims">{f.members.map((m) => (<li key={m.id} className="mp-dep" data-cap={m.id} data-ready={m.built ? 'READY' : 'UNKNOWN'}>
        <h3>{m.built && m.demo && opens(`#${m.demo}`) ? <a href={`#${m.demo}`} data-testid={`fam-open-${m.id}`}>{m.name}</a> : m.name}</h3>
        <p><Tag tone={m.kind === 'product' ? 'info' : 'accent'}>{m.kind === 'product' ? 'Core product' : 'Capability'}</Tag> {m.built ? (m.demo && !opens(`#${m.demo}`) ? <Tag tone="muted">Not open to this perspective</Tag> : <Tag tone="ok">In the demonstration</Tag>) : <Tag tone="warn">Not built yet</Tag>}</p>
        <p>{m.says}</p></li>))}</ul>
    </section>))}
    <section className="vc-sec" aria-labelledby="fam-shared-h" data-testid="fam-shared"><h2 id="fam-shared-h">What all seventeen share</h2>
      <p className="ui-muted">The families are six views of one engineering record, not six products that were joined afterward.</p>
      <ul className="mp-deps om-claims">{SHARED.map((s) => <li key={s.id} className="mp-dep" data-shared={s.id} data-ready="READY"><h3>{s.title}</h3><p>{s.says}</p></li>)}</ul>
    </section>
  </div>);
}
