/**
 * #/story/<roomId> — one room's entire story, assembled by ./assemble.ts from the records the demonstration already holds. The summary is
 * computed from the entries; each entry shows when, who, what changed (from → to), why where recorded, its evidence label and the page
 * that holds the record. The perspective changes density, never data: a visitor reads the narrative, an engineer persona sees the
 * technical detail (test ids, evidence references, instruments, provenance), an executive sees impact and status. It grants nothing.
 */
import { useMemo } from 'react';
import { Tag, Notice, Composition, type Tone } from '@empathia/ui';
import { assembleStory, storyRooms, densityOf, EVIDENCE_MEANING, type Evidence, type StoryEntry, type Density, type Story } from './assemble.js';
import { buildEstate } from '../search/estate.js';
import { assemble } from '../workspace/records.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { loadDraft, personaOf, personaLabel } from '../build/store.js';

export const EVIDENCE_TONE: Record<Evidence, Tone> = { PASS_VERIFIED: 'ok', VERIFIED: 'ok', OBSERVED: 'info', DERIVED: 'info', DECLARED: 'muted', MODELED: 'warn', SIMULATED: 'warn', PASS_UNVERIFIED: 'warn', FAIL: 'bad', INCONCLUSIVE: 'warn', NOT_SUPPORTED: 'warn', NOT_TESTED: 'muted', UNKNOWN: 'muted' };
const DENSITY_WORDS: Record<Density, string> = { narrative: 'the narrative', technical: 'technical detail — test ids, evidence references, instruments, provenance', impact: 'impact and status' };
const utc = (s: string) => `${s.slice(0, 10)} ${s.slice(11, 16)} UTC`;
function rel(s: string): string {
  const m = Math.round((Date.now() - Date.parse(s)) / 6e4);
  if (m < 0) return `in ${Math.round(-m / 1440)} days`;
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; if (m < 1440) return `${Math.round(m / 60)} h ago`; if (m < 2880) return 'yesterday';
  return `${Math.round(m / 1440)} days ago`;
}
const plural = (n: number, w: string, ws = `${w}s`) => `${n} ${n === 1 ? w : ws}`;
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; } };

export function StoryPage({ perspective, hash }: { perspective: string; hash: string }) {
  const roomId = decodeURIComponent(/^#\/story\/([^?/]*)/.exec(hash)?.[1] || '');
  const density = densityOf(perspective); const persona = personaOf(perspective);
  const { w } = useWorkspace(); const draft = loadDraft();
  const draftKey = draft ? `${draft.events.length}|${draft.events[0]?.at || ''}|${draft.design.lifecycle}` : '';
  const est = useMemo(() => buildEstate(draft), [draftKey]);   // eslint-disable-line react-hooks/exhaustive-deps
  const story = useMemo(() => assembleStory(roomId, { draft, w, est, R: assemble(w, draft) }), [roomId, w, est]);   // eslint-disable-line react-hooks/exhaustive-deps
  const rooms = useMemo(() => storyRooms(est), [est]);
  if (!story.found) return <RoomPicker roomId={roomId} rooms={rooms} />;
  const go = (key: string) => { const h = document.getElementById(`story-${key}`); if (!h) return; h.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); h.focus({ preventScroll: true }); };
  const s = story.summary;
  return (
    <article className="story" data-density={density} data-testid="story" aria-labelledby="story-title">
      <header className="build__head story__head">
        <div><p className="kicker">A room’s entire story · synthetic records only</p><h1 id="story-title">{story.room.name}</h1>
          <p className="ui-muted"><code>{story.room.id}</code>{story.room.building && <> · {story.room.building}</>}{story.room.site && <> · {story.room.site}</>} · {story.room.source}</p>
          <p className="ui-muted story__persp">Acting as <b>{personaLabel(persona)}</b> (perspective <code>{perspective}</code>): you see {DENSITY_WORDS[density]}. A perspective changes how much is shown, never what is recorded — and it grants nothing.</p></div>
        <div className="build__state"><label className="ui-muted" htmlFor="story-room">Room</label><select id="story-room" value={story.roomId} onChange={(e) => { location.hash = `#/story/${e.target.value}`; }}>{rooms.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
      </header>
      <Summary story={story} density={density} />
      <nav className="story__nav" aria-label="Lifecycle stages of this story"><ol>{story.stages.map((st, i) => <li key={st.key}><button type="button" className={st.entries.length ? 'has' : 'none'} onClick={() => go(st.key)} aria-label={`${st.label}: ${st.entries.length ? plural(st.entries.length, 'record') : 'no record yet'}`}><span className="story__n" aria-hidden="true">{i + 1}</span><span>{st.label}</span><b aria-hidden="true">{st.entries.length || '—'}</b></button></li>)}</ol></nav>
      <ol className="story__chapters">{story.stages.map((st, i) => (
        <li key={st.key} className="story__stage" data-stage={st.key} data-count={st.entries.length}>
          <h2 id={`story-${st.key}`} tabIndex={-1} className="story__h"><span className="story__n" aria-hidden="true">{i + 1}</span>{st.label}<span className="story__hc">{st.entries.length ? plural(st.entries.length, 'record') : 'No record yet'}</span></h2>
          {!st.entries.length ? <p className="story__empty"><b>No record yet.</b> {st.empty}</p> : <ol className="story__entries">{st.entries.map((e) => <Entry key={e.id} e={e} density={density} />)}</ol>}
        </li>))}</ol>
      <section className="story__gaps" aria-labelledby="story-gaps-h" data-testid="story-gaps">
        <h2 id="story-gaps-h" className="story__h">What this story cannot show yet</h2>
        <p className="ui-muted">The demonstration does not model these, so the story leaves them out rather than filling them in.</p>
        <ul>{story.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
      </section>
      <details className="story__legend"><summary>What the evidence labels mean</summary><dl>{(Object.keys(EVIDENCE_MEANING) as Evidence[]).map((k) => <div key={k}><dt><Tag tone={EVIDENCE_TONE[k]}>{k}</Tag></dt><dd>{EVIDENCE_MEANING[k]}</dd></div>)}</dl></details>
      <p className="ui-meta story__sources">Assembled in this browser from: {story.sources.join('; ')} · {plural(s.ledgerEvents, 'ledger event')} about this room · <a href={`#/v25/ledger?room=${story.roomId}`}>open this room’s ledger</a>. Every person, room, device and figure is invented; nothing is connected to a real system.</p>
    </article>
  );
}

function Summary({ story, density }: { story: Story; density: Density }) {
  const s = story.summary; const total = s.evidence.reduce((n, [, v]) => n + v, 0);
  const open = density === 'narrative' ? s.open.slice(0, 3) : s.open;
  return (
    <section className="story__summary" aria-label="Summary, computed from the records below" data-testid="story-summary">
      <dl>
        <div><dt>Current state</dt><dd><b data-testid="story-state">{s.state?.value || 'not recorded'}</b><span className="ui-meta">{s.state?.source || ''}</span></dd></div>
        <div><dt>Accepted baseline</dt><dd>{s.baseline ? <><b data-testid="story-baseline">v{s.baseline.version} · {s.baseline.state}</b><span className="ui-meta">{s.baseline.at ? <>published <time dateTime={s.baseline.at} title={utc(s.baseline.at)}>{density === 'technical' ? utc(s.baseline.at) : rel(s.baseline.at)}</time></> : 'time not recorded'}{s.baseline.by ? ` by ${s.baseline.by}` : ''} · {s.baseline.source}</span></> : <><b data-testid="story-baseline">none accepted</b><span className="ui-meta">no acceptance on record</span></>}</dd></div>
        <div><dt>Open items</dt><dd><b data-testid="story-open">{s.open.length}</b>{open.length > 0 && <ul className="story__open">{open.map((o) => <li key={o.text}><a href={o.href}>{o.text}</a></li>)}{open.length < s.open.length && <li className="ui-meta">+{s.open.length - open.length} more</li>}</ul>}{!s.open.length && <span className="ui-meta">nothing open on record</span>}</dd></div>
        <div><dt>Evidence on record</dt><dd><b data-testid="story-completeness">{s.stagesWithRecords} of {s.stageCount} stages</b><span className="ui-meta">{plural(s.entries, 'record')}{s.tests ? ` · ${s.tests.text} — ${s.tests.source}` : ' · no test results held'}</span></dd></div>
      </dl>
      {density !== 'narrative' && total > 0 && <Composition label="Records by evidence label" total={total} parts={s.evidence.map(([k, v]) => ({ key: k, label: k, value: v, tone: EVIDENCE_TONE[k] }))} />}
    </section>
  );
}

function Entry({ e, density }: { e: StoryEntry; density: Density }) {
  const tech = density === 'technical'; const exec = density === 'impact';
  const n = e.items?.length || 0;
  return (
    <li className={`story__entry${e.outcome === 'DENIED' ? ' story__entry--denied' : ''}${e.state ? ' story__entry--state' : ''}`} data-entry={e.id} data-evidence={e.evidence}>
      <div className="story__when">{e.at ? <time dateTime={e.at} title={utc(e.at)}>{tech ? utc(e.at) : exec ? e.at.slice(0, 10) : rel(e.at)}</time> : e.state ? <span title="A state read from the current records, not an event">current state</span> : <span>time not recorded</span>}</div>
      <div className="story__card">
        <p className="story__what">{e.what}</p>
        <p className="story__tags">{e.outcome === 'DENIED' && <Tag tone="bad">REFUSED</Tag>}<Tag tone={EVIDENCE_TONE[e.evidence]}>{e.evidence}</Tag>{(e.from || e.to) && <span className="story__ft">{e.from || '—'} → {e.to || '—'}</span>}</p>
        {!(e.state && !e.who) && <p className="story__who">{e.who || 'who: not recorded'}{e.phase ? <span className="ui-meta"> · {e.phase}</span> : null}</p>}
        {e.detail && !(exec && e.impact) && <p className="story__detail">{e.detail}</p>}
        {e.why ? <p className="story__why"><span>Why</span> {e.why}</p> : e.why === null && tech ? <p className="story__why story__why--none">No reason recorded.</p> : null}
        {exec && e.impact && <p className="story__impact">{e.impact}</p>}
        {tech && e.tech.length > 0 && <dl className="story__tech">{e.tech.map(([k, v], i) => <div key={`${k}${i}`}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
        {n > 0 && (tech ? <details className="story__more" open={n <= 6}><summary>{plural(n, 'record')} behind this entry</summary><ul className="story__items">{e.items!.map((x) => <li key={x.id}>{x.evidence && <Tag tone={EVIDENCE_TONE[x.evidence]}>{x.evidence}</Tag>} {x.at && <span className="ui-meta">{utc(x.at)} · </span>}{x.who && <span className="ui-meta">{x.who} · </span>}{x.text}</li>)}</ul></details> : <p className="ui-meta">{plural(n, 'record')} behind this entry{exec ? '' : ' — an engineer perspective lists them'}.</p>)}
        <p className="story__go"><a className="story__link" href={e.href}>{e.linkLabel}</a><span className="ui-meta"> · {e.source}</span></p>
      </div>
    </li>
  );
}

function RoomPicker({ roomId, rooms }: { roomId: string; rooms: Array<{ id: string; label: string; subtitle: string }> }) {
  return (
    <section className="story" data-testid="story-picker">
      <header className="build__head"><div><p className="kicker">A room’s entire story · synthetic records only</p><h1>{roomId ? 'This room is not in the demonstration' : 'Pick a room to read its story'}</h1>
        <p className="ui-muted">{roomId ? <>No room <code>{roomId}</code> is held by this demonstration’s records. </> : null}Each story is assembled from the records the demonstration holds, from request to lesson.</p></div></header>
      {roomId && <Notice tone="info"><p className="story__note">Build a room in <a href="#/v25/build">Build a Room</a> and its story appears here as <code>R-DEMO-0001</code>.</p></Notice>}
      <ul className="story__rooms">{rooms.map((r) => <li key={r.id}><a href={`#/story/${r.id}`}><b>{r.label}</b><span className="ui-meta">{r.subtitle}</span></a></li>)}</ul>
    </section>
  );
}
