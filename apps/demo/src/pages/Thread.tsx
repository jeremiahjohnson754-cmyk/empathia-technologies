/**
 * #/thread?room=… — one room's record followed through every product (thread/slice.ts): Lite, engineering, commissioning, ServiceHands,
 * assurance and APEX. Each stage shows what is recorded there now, the records by id, the way in, and the next thing to do. The ids that
 * tie one stage to the next are listed, so the chain can be checked as one record. Everything is read live from the products' own stores
 * in this browser; nothing is copied here.
 */
import { useMemo, useState } from 'react';
import { PageHero, Card, Tag, Notice } from '@empathia/ui';
import { roomRecord, allRecords } from '../campus/design.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { personaOf, personaLabel } from '../build/store.js';
import { threadOf, type StageKey, type Row } from '../thread/slice.js';
import { handDeficiencyToService, HANDOFF_AUTHORITIES } from '../workspace/store.js';
import { openable } from './V25Nav.js';

export const SLICE_ROOM = 'R-ATL-7-112';
const ICON: Record<StageKey, 'map' | 'wrench' | 'check' | 'route' | 'shield' | 'chart'> = { lite: 'map', engineering: 'wrench', commissioning: 'check', service: 'route', assurance: 'shield', apex: 'chart' };

export function ThreadPage({ perspective, hash }: { perspective: string; hash: string }) {
  const persona = personaOf(perspective); const { w, apply } = useWorkspace(); const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);
  const roomId = /[?&]room=([A-Z0-9-]+)/.exec(hash)?.[1] || SLICE_ROOM; const r = useMemo(() => roomRecord(roomId), [roomId]);
  const withIssues = useMemo(() => allRecords().filter((x) => x.issues.some((i) => i.state === 'OPEN') && !['PLANNED', 'DESIGN_APPROVED', 'INSTALLATION_PENDING'].includes(x.lifecycle)), []);
  if (!r) return <section className="wk" data-testid="thread"><Notice tone="bad">There is no room {roomId} on the campus record.</Notice></section>;
  const t = threadOf(r, w);
  const hand = (x: Row) => { const h = x.handoff!; const res = apply((ws) => handDeficiencyToService(ws, persona, { ...h, roomId: r.outline.id, roomName: r.outline.name, buildingKey: r.outline.building, lifecycle: r.lifecycle }));
    setSaid('why' in res ? { ok: false, text: res.why.join(' · ') } : { ok: true, text: `${h.issueId} handed to ServiceHands as ${res.id}. Closing the job will not close the deficiency: its verified retest does.` }); };
  return (
    <section className="wk san th" data-native="workspace" data-testid="thread" data-room={t.room} data-complete={t.complete ? 'yes' : 'no'}>
      <PageHero product="commissioning" icon="route" eyebrow="One room, end to end" title={`${t.name} · ${t.room}`}
        lede={<>The same room followed through every product, read live from each product’s own records under the ids they share. A deficiency found in commissioning is handed to service; closing the job does not pass the test, the verified retest does; APEX records hypotheses, never a verified fault. Synthetic records, kept in this browser. Acting as <b>{personaLabel(persona)}</b>.</>} />
      <p className="build__row"><label className="kit-field">Room <select aria-label="Room" value={t.room} onChange={(e) => { location.hash = `#/thread?room=${e.target.value}`; }}>
        {[...(withIssues.some((x) => x.outline.id === t.room) ? [] : [r]), ...withIssues].map((x) => <option key={x.outline.id} value={x.outline.id}>{x.outline.id} · {x.outline.name}</option>)}</select></label></p>
      <ol className="th__rail" aria-label="The six stages" data-testid="th-rail">{t.stages.map((s) => <li key={s.key} data-stage={s.key} data-tone={s.tone}><a href={`#th-${s.key}`} onClick={(e) => { e.preventDefault(); document.getElementById(`th-${s.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><span className="th__n">{s.n}</span><b>{s.product}</b><span className="ui-meta">{s.status}</span></a></li>)}</ol>
      {t.complete ? <Notice tone="ok"><b>The thread is whole.</b> A deficiency was handed to service, the job was resolved, a verified retest closed the deficiency, and a case holds the diagnosis.</Notice>
        : <div data-testid="th-missing"><Notice tone="info"><b>Still to do on this room:</b> {t.missing.join(' · ')}.</Notice></div>}
      {t.stages.map((s) => <div id={`th-${s.key}`} key={s.key}><Card icon={ICON[s.key]} title={`${s.n} · ${s.product}: ${s.title}`} sub={s.status} testId={`th-${s.key}`}>
        <dl className="san__defs">{s.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {s.rows.length ? <ul className="build__list" data-testid={`th-${s.key}-rows`}>{s.rows.map((x) => <li key={x.id} data-id={x.id}>{x.href && openable(perspective as never, x.href) ? <a href={x.href}><b>{x.id}</b></a> : <b>{x.id}</b>} {x.tag ? <Tag tone={x.tone || 'muted'}>{x.tag}</Tag> : null} {x.text}{x.handoff ? <> <button type="button" className="ui-btn ui-btn--sm" data-testid="th-handoff" data-issue={x.handoff.issueId} onClick={() => hand(x)}>Hand {x.handoff.issueId} to ServiceHands</button></> : null}</li>)}</ul> : null}
        {s.key === 'commissioning' && said ? <div role={said.ok ? 'status' : 'alert'} data-testid="th-said"><Notice tone={said.ok ? 'ok' : 'bad'}>{said.ok ? null : <b>Refused. </b>}{said.text}</Notice></div> : null}
        {s.key === 'commissioning' && s.rows.some((x) => x.handoff) ? <p className="ui-meta">Handing a deficiency to service needs {HANDOFF_AUTHORITIES.join(' or ')}: the Service Manager or the Operations Lead.</p> : null}
        {s.next ? <p data-testid={`th-${s.key}-next`}><Tag tone="warn">next</Tag> {s.next}</p> : null}
        <p className="build__row">{openable(perspective as never, s.href) ? <a className="ui-btn ui-btn--sm" href={s.href} data-testid={`th-${s.key}-open`}>{s.open}</a> : <span className="ui-muted">{s.open}: not part of {personaLabel(persona)}’s work</span>}</p>
      </Card></div>)}
      <Card icon="route" title="The ids that carry the record" sub="What ties each stage to the next" testId="th-links">
        <ul className="build__list">{t.links.map((l, k) => <li key={k} data-from={l.from} data-to={l.to}><span className="ui-mono">{l.id}</span> · {l.what} <span className="ui-muted">({l.from} → {l.to})</span></li>)}</ul>
      </Card>
    </section>
  );
}
