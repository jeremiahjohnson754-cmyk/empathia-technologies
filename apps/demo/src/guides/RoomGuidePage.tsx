/**
 * #/guide/room/<room> — "How do I use this room?" (the End User Success & Training Guide's room chapter; founder's directive of
 * 11 Nov 2026 §08). Generated from the room's own record by guides/roomGuide.ts, so it never describes equipment the room lacks.
 * Read like a page of a reference book: what the room is and supports, then each task as numbered steps beside the room's plan with
 * the equipment for that task ringed; then who the local site champion is and where to go when something is not working.
 * #/guide — find a room's guide. Every guide is a DRAFT of generic wording: an organisation's own edition replaces it.
 */
import { useEffect, useMemo, useState } from 'react';
import { PageHero, Chip, EmptyState, Icon, Notice } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { ALL_BUILDINGS } from '../connect/directory.js';
import { CAMPUS_ROOMS, buildingByKey, fullName, roomById, shortName } from '../campus/canon.js';
import { roomRecord, LAYERS, type Layer } from '../campus/design.js';
import { Stage, PlanView } from '../spatial/Spatial.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { availabilityLine, whoKnows } from '../connect/directory.js';
import { maySeeContact } from '../connect/store.js';
import { roomGuide, type SectionId } from './roomGuide.js';

const ALL_LAYERS = new Set<Layer>(LAYERS.map((l) => l.key));

function Index({ role }: Pick<PageProps, 'role'>) {
  const [q, setQ] = useState(''); const text = q.trim().toLowerCase();
  const rooms = CAMPUS_ROOMS.filter((r) => !text || `${fullName(r)} ${buildingByKey(r.building)?.name}`.toLowerCase().includes(text));
  void role;
  return (
    <div className="pa gd" data-native="" data-testid="guide-index">
      <PageHero compact eyebrow="End User Success & Training Guide" title="How do I use this room?" product="lite" icon="book" lede="Choose a room. Its guide is written from what is actually in it: how to start a meeting, share your screen, be heard and seen, and what to do when something is not working."
        meta={[<Chip key="d" small tone="warn">Draft</Chip>, <Chip key="s" small tone="warn">Synthetic rooms</Chip>, <Chip key="n" small tone="muted">{CAMPUS_ROOMS.length} rooms</Chip>]} />
      <div className="ui-field gd-find"><label htmlFor="gd-q">Room name, number or building</label><input id="gd-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" data-testid="guide-q" /></div>
      {rooms.length ? ALL_BUILDINGS.filter((b) => rooms.some((r) => r.building === b.key)).map((b) => (
        <section key={b.key} className="gd-sec" aria-label={b.name}><h2>{b.name}</h2>
          <ul className="gd-rooms" data-testid="guide-rooms">{rooms.filter((r) => r.building === b.key).map((r) => <li key={r.id}><a href={`#/guide/room/${r.id}`} data-room={r.id}><b>{shortName(r)}</b><span>{r.name} · seats {r.capacity}</span></a></li>)}</ul></section>))
        : <EmptyState title="No room matches" icon="search">Try a number such as 4.218, or a building.</EmptyState>}
    </div>
  );
}

export default function RoomGuidePage({ role, params }: PageProps) {
  const id = params['room']; const o = id ? roomById(id) : undefined; const { w } = useWorkspace();
  const [active, setActive] = useState<SectionId | null>(null);
  const r = useMemo(() => (o ? roomRecord(o.id) : undefined), [o]); const g = useMemo(() => (r ? roomGuide(r) : undefined), [r]);
  useEffect(() => { setActive(null); }, [id]);
  if (!id) return <Index role={role} />;
  if (!o || !r || !g) return <div className="pa gd" data-native="" data-testid="guide-missing"><h1 className="ui-visually-hidden">Room not found</h1><EmptyState title="No room with that identifier" icon="search" action={<a className="ui-btn" href="#/guide">Choose a room</a>}>The guide is written for rooms on record.</EmptyState></div>;
  const opens = (href: string) => { const x = resolve(href.split('?')[0]!); return !!x && canOpen(role, x); };
  const sec = g.sections.find((s) => s.id === active) || null; const uses = new Set((sec ? sec.steps : []).flatMap((s) => s.uses));
  const marked = new Set(r.positions.filter((p) => !p.furniture && uses.has(p.cat)).map((p) => p.code));
  const champion = whoKnows(o.id, new Date(), w)[0]; const B = buildingByKey(o.building);
  return (
    <div className="pa gd" data-native="" data-testid="guide" data-room={o.id}>
      <PageHero compact eyebrow={`End User Success & Training Guide · ${B?.name || o.building}`} title={g.title} product="lite" icon="book" lede={g.summary}
        meta={[<Chip key="d" small tone="warn">Draft · {g.revision}</Chip>, <Chip key="s" small tone="warn">Synthetic room</Chip>]} />
      {g.notReady ? <Notice tone="warn">{g.notReady}</Notice> : null}

      <div className="gd-cols">
        <div className="gd-main">
          <section className="gd-block" aria-labelledby="gd-what"><h2 id="gd-what">What is in the room</h2><p data-testid="guide-equipment">{g.equipment}</p>
            <table className="gd-supports" data-testid="guide-supports"><caption className="ui-visually-hidden">What the room supports</caption><thead><tr><th scope="col">You can</th><th scope="col">Here</th><th scope="col">Because</th></tr></thead>
              <tbody>{g.supports.map((s) => <tr key={s.what} data-yes={s.yes ? 'yes' : 'no'}><th scope="row">{s.what}</th><td><span className="gd-yn"><Icon name={s.yes ? 'check' : 'close'} size={16} /> {s.yes ? 'Yes' : 'No'}</span></td><td>{s.because}</td></tr>)}</tbody></table>
          </section>
          {g.sections.map((s, n) => (
            <section key={s.id} className="gd-block gd-task" aria-labelledby={`gd-${s.id}`} data-section={s.id} data-active={active === s.id ? 'yes' : 'no'}>
              <header><h2 id={`gd-${s.id}`}><span className="gd-num">{n + 1}</span> {s.title}</h2>
                {s.steps.some((x) => x.uses.length) ? <button type="button" className="ui-btn ui-btn--sm gd-show" aria-pressed={active === s.id} onClick={() => setActive(active === s.id ? null : s.id)} data-act="show">{active === s.id ? 'Shown on the plan' : 'Show on the plan'}</button> : null}</header>
              <p className="gd-lead">{s.lead}</p>
              <ol className="gd-steps">{s.steps.map((x, i) => <li key={i}><p>{x.do}</p>{x.why ? <p className="gd-why">{x.why}</p> : null}</li>)}</ol>
              {s.id === 'controls' && opens(`#/control/${o.id}`) ? <p className="gd-link"><a className="ui-btn" href={`#/control/${o.id}`} data-testid="guide-practise">Practise on this room’s panel</a> <span className="gd-note">A simulated panel: nothing in a real room changes.</span></p> : null}
              {s.id === 'help' ? <p className="gd-link">{opens(`#/here/${o.id}`) ? <a className="ui-btn ui-btn--primary" href={`#/here/${o.id}?step=wrong`} data-testid="guide-help">Something is not working here</a> : null} {opens('#/request') ? <a className="ui-btn" href="#/request">Ask for something</a> : null}</p> : null}
            </section>))}
        </div>

        <aside className="gd-side" aria-label="The room">
          <Stage label={`Plan of ${shortName(o)}${sec ? `, with the equipment for “${sec.title}” ringed` : ''}`} testId="guide-stage">
            <PlanView w={o.dims[0]} l={o.dims[1]} h={o.dims[2]} positions={r.positions} connections={[]} layers={ALL_LAYERS} selected={null} onSelect={() => undefined} showLinks={false} marked={marked} markWord="used in this step" />
          </Stage>
          <p className="gd-caption" data-testid="guide-caption" aria-live="polite">{sec ? (marked.size ? `Ringed: what “${sec.title}” uses (${marked.size} ${marked.size === 1 ? 'piece' : 'pieces'} of equipment).` : `“${sec.title}” uses no equipment of the room.`) : 'The room from above. Choose “Show on the plan” beside a task to see what it uses.'}</p>
          {champion ? <section className="gd-champ" data-testid="guide-champion" aria-labelledby="gd-champ-h"><h2 id="gd-champ-h">Your site champion</h2>
            <p><b>{role === 'visitor' ? 'A local colleague' : champion.person.name}</b><span>{champion.person.title}</span></p>
            <p className="gd-note">{role === 'visitor' ? 'Ask your host or the front desk to reach them.' : availabilityLine(champion.person, new Date())}</p>
            {role !== 'visitor' && opens('#/people') ? <p><a className="ui-btn ui-btn--sm" href={`#/people?room=${o.id}`} data-testid="guide-who">{maySeeContact(role, champion.person) ? 'Reach them, and who else knows this room' : 'Who knows this room'}</a></p> : null}
            <p className="gd-note">For what only someone local knows: where the adapters are, who has the key, which room is free.</p></section> : null}
          <section className="gd-meta" aria-label="About this guide"><dl><div><dt>Guide</dt><dd><code>{g.id}</code></dd></div><div><dt>Status</dt><dd>Draft, {g.revision}: generic wording, not yet reviewed by a person</dd></div><div><dt>Written from</dt><dd>{g.sources.join('; ')}</dd></div><div><dt>For</dt><dd>{g.audience}</dd></div></dl>
            <button type="button" className="ui-btn ui-btn--sm gd-print" onClick={() => window.print()} data-testid="guide-print">Print or save as PDF</button></section>
        </aside>
      </div>
      <p className="gd-note gd-foot"><a href="#/guide">Another room’s guide</a>{opens(`#/lite/room/${o.id}`) ? <> · <a href={`#/lite/room/${o.id}?mode=user`}>This room in Lite</a></> : null}</p>
    </div>
  );
}
