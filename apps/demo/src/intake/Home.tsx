/**
 * #/request — the Intake front door (founder directive 19 Nov 2026 §03): one question, one place to type, four choices and "Not sure?".
 * What is typed is read by word lists (no AI), shown back as an editable suggestion with the words that produced it, and starts a draft
 * only when the person says so. Beside it: the person's drafts, what is waiting on them, and their recent requests. Identity is the role
 * being shown, never an invented name (§03: "show a truthful fallback rather than inventing employee details").
 */
import { useMemo, useRef, useState } from 'react';
import { PageHero, Tag, Icon, Chip, EmptyState } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { fullName, roomById } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { load as loadDesk } from '../decisions/store.js';
import { CARDS, blank, kindOf, goalLabel } from './model.js';
import { read, type Reading } from './classify.js';
import { loadRecords, saveDraft, standing, stateOf } from './store.js';
import { IntakeNav, RequestItem, KIND_ICON } from './parts.js';

export default function Home({ role }: PageProps) {
  const { w } = useWorkspace(); const desk = useMemo(() => loadDesk(), []);
  const [text, setText] = useState(''); const [reading, setReading] = useState<Reading | null>(null); const [why, setWhy] = useState<string | null>(null);
  const cardsRef = useRef<HTMLDivElement>(null); const readRef = useRef<HTMLDivElement>(null);
  const all = useMemo(() => loadRecords().filter((r) => r.role === role), [role]); const drafts = all.filter((r) => stateOf(r) === 'DRAFT'); const sent = all.filter((r) => stateOf(r) === 'SUBMITTED');
  const waiting = sent.filter((r) => { const s = standing(r, w, desk); return s.state === 'HELD' || s.owner === 'You'; });
  const lastSite = sent.find((r) => r.roomId)?.roomId; const site = lastSite ? roomById(lastSite) : null;
  const describe = (e: { preventDefault: () => void }) => { e.preventDefault(); const r = read(text); setReading(r); setWhy(r ? null : 'Say a few words about what you need, or choose one of the four below.'); requestAnimationFrame(() => readRef.current?.focus()); };
  const begin = (r: Reading) => {
    const d = blank(r.kind, { need: text.trim().slice(0, 600), goals: r.goals, ...(r.roomId ? { roomId: r.roomId, building: roomById(r.roomId)!.building } : {}) });
    const k = kindOf(r.kind); if (['scouter', 'optimizer', 'report'].includes(k.goes)) { location.hash = `#/request/${r.kind}${r.roomId ? `?room=${r.roomId}` : ''}`; return; }
    const out = saveDraft(role, d, null, 'what'); if ('why' in out) { setWhy(out.why.join(' ')); return; }
    location.hash = `#/request/new?draft=${out.id}&step=what`;
  };
  return (
    <div className="ik ik-home" data-native="" data-testid="ik-home">
      <IntakeNav role={role} here="home" />
      <PageHero eyebrow="Intake" icon="plus" product="pro" title="What can we help you create, improve, or fix?" lede="Tell us what your space needs. We’ll help you take it from idea to reality."
        meta={[<Tag key="s" tone="warn">Synthetic data</Tag>, <span key="r" data-testid="ik-who">Asking as the {ROLES[role].label} · no directory is connected, so no name is shown</span>, ...(site ? [<span key="b">Recently: {fullName(site)}</span>] : [])]}
        actions={<form className="ik-describe" onSubmit={describe} data-testid="ik-describe" role="search" aria-label="Describe what you need">
          <label htmlFor="ik-describe-t" className="ik-sr">Describe what you need</label>
          <textarea id="ik-describe-t" rows={2} maxLength={600} placeholder="Describe what you need…" value={text} onChange={(e) => { setText(e.target.value); setReading(null); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); describe(e); } }} data-testid="ik-describe-text" />
          <button type="submit" className="ui-btn ui-btn--primary" data-testid="ik-describe-go">Get started</button>
        </form>} />

      {(reading || why) && <div className="ik-reading" ref={readRef} tabIndex={-1} data-testid="ik-reading" data-kind={reading?.kind} data-confident={reading ? String(reading.confident) : undefined} aria-live="polite">
        {reading ? <>
          <p className="ik-reading__h"><Icon name={KIND_ICON[reading.kind]} size={22} /><span>{reading.confident ? 'This sounds like' : 'We will take it as'} <b>{kindOf(reading.kind).label.toLowerCase()}</b>{reading.roomId ? <> in <b>{fullName(roomById(reading.roomId)!)}</b></> : null}.</span></p>
          {reading.goals.length > 0 && <p className="ik-goalline"><span className="ui-meta">You mentioned:</span> {reading.goals.map((g) => <Chip key={g} small tone="muted">{goalLabel(g)}</Chip>)}</p>}
          <p className="ui-meta" data-testid="ik-reading-basis">{reading.basis}</p>
          <p className="ik-reading__acts"><button type="button" className="ui-btn ui-btn--primary" onClick={() => begin(reading)} data-testid="ik-reading-start">Start: {kindOf(reading.kind).label}</button>
            <button type="button" className="ui-btn" onClick={() => cardsRef.current?.querySelector<HTMLElement>('a')?.focus()} data-testid="ik-reading-other">Choose something else</button></p>
        </> : <p className="ui-muted">{why}</p>}
      </div>}

      <div className="ik-cards" ref={cardsRef} data-testid="ik-cards">
        {CARDS.map((c) => <a key={c.id} className="ik-card" href={`#/request/new?card=${c.id}`} data-testid={`ik-card-${c.id}`}><Icon name={c.icon} size={26} /><b>{c.label}</b><span>{c.blurb}</span>
          <span className="ik-card__kinds">{c.kinds.map((k) => kindOf(k).label).join(' · ')}</span></a>)}
        <a className="ik-card ik-card--unsure" href="#/request/general" data-testid="ik-card-unsure"><Icon name="info" size={26} /><b>Not sure?</b><span>Say it in your own words. The right team picks it up, and nobody needs the technical words.</span></a>
      </div>

      <div className="ik-panels">
        <section className="ik-panel" aria-labelledby="ik-drafts-h" data-testid="ik-drafts"><h2 id="ik-drafts-h">Carry on</h2>
          {drafts.length ? <ul className="rq-mine">{drafts.slice(0, 3).map((r) => <RequestItem key={r.id} r={r} w={w} desk={desk} role={role} />)}</ul> : <p className="ui-muted">No drafts. A request you start is kept here until you send it.</p>}</section>
        <section className="ik-panel" aria-labelledby="ik-wait-h" data-testid="ik-waiting"><h2 id="ik-wait-h">Waiting for you</h2>
          {waiting.length ? <ul className="rq-mine">{waiting.slice(0, 3).map((r) => <RequestItem key={r.id} r={r} w={w} desk={desk} role={role} />)}</ul> : <p className="ui-muted">Nothing is waiting for you.</p>}</section>
        <section className="ik-panel" aria-labelledby="ik-recent-h" data-testid="ik-recent"><h2 id="ik-recent-h">Your recent requests</h2>
          {sent.length ? <><ul className="rq-mine">{sent.slice(0, 3).map((r) => <RequestItem key={r.id} r={r} w={w} desk={desk} role={role} />)}</ul>{sent.length > 3 && <p><a href="#/requests">All {sent.length} requests</a></p>}</>
            : <EmptyState title="Nothing asked for yet" icon="inbox">Requests you send from this browser are listed here, with where each stands.</EmptyState>}</section>
      </div>
    </div>
  );
}
