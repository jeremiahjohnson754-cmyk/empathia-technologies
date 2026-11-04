/**
 * Search Party scenario pages: #/search/scenarios (the five questions) and #/search/scenarios/<S1…S5>?room=<id>.
 * List first (the accessible, complete answer), then a compact graph whose category groups show an accurate count and expand in place
 * ("+N more", keyboard reachable). Every record in the graph is in the list and vice versa.
 */
import { useMemo, useState } from 'react';
import { Tag, Notice } from '@empathia/ui';
import { ROOMS, fullName, REFERENCE_ROOM_ID } from '../campus/canon.js';
import { scenario, scenarioCount, SCENARIO_IDS, SCENARIO_TITLES, type Scenario, type SGroup } from './scenarios.js';
import { Stage } from '../spatial/Spatial.js';

const HERO: Record<string, string> = { A: 'Hero experience A', B: 'Hero experience B', C: 'Hero experience C' };
const PER = 3;

export function ScenariosPage({ hash }: { hash: string }) {
  const p = hash.replace(/^#\/?/, '').split('?')[0]!.split('/'); const q = new URLSearchParams(/\?(.*)$/.exec(hash)?.[1] || '');
  const room = q.get('room') || REFERENCE_ROOM_ID; const id = p[2];
  if (!id) return <Index room={room} />;
  const s = (SCENARIO_IDS as readonly string[]).includes(id) ? scenario(id, room) : null;
  if (!s) return <section className="sp"><h1>Unknown scenario</h1><Notice tone="warn">There is no Search Party scenario “{id}”. <a href="#/search/scenarios">See the five scenarios</a></Notice></section>;
  return <ScenarioView s={s} room={room} />;
}

function RoomPick({ room, base }: { room: string; base: string }) {
  return <label className="sp__pick">Room <select value={room} onChange={(e) => { location.hash = `${base}?room=${e.target.value}`; }}>{ROOMS.map((r) => <option key={r.id} value={r.id}>{fullName(r)}</option>)}</select></label>;
}

function Index({ room }: { room: string }) {
  return (
    <section className="sp" data-testid="sp-scenarios">
      <p className="kicker">Search Party · scenarios</p><h1>Five questions, answered from recorded relationships</h1>
      <p className="ui-muted">Each starts from one record of the synthetic campus. Support organisations, agreements, people and competencies are labelled synthetic demonstration fixtures.</p>
      <RoomPick room={room} base="#/search/scenarios" />
      <ol className="sp__scen">{SCENARIO_IDS.map((id) => { const s = scenario(id, room)!; return <li key={id}><a href={`#/search/scenarios/${id}?room=${room}`} data-testid={`sp-scen-${id}`}><span className="ui-meta">{id}{s.hero ? ` · ${HERO[s.hero]}` : ''}</span><b>{SCENARIO_TITLES[id]}</b><span className="ui-muted">{s.question}</span><span className="ui-meta">{scenarioCount(s)} related records in {s.groups.length} groups</span></a></li>; })}</ol>
    </section>
  );
}

function ScenarioView({ s, room }: { s: Scenario; room: string }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setOpen((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const total = scenarioCount(s);
  return (
    <section className="sp" data-testid="sp-scenario" data-scenario={s.id}>
      <nav aria-label="Breadcrumb" className="crumbs"><ol><li><a href="#/search">Search Party</a></li><li><a href={`#/search/scenarios?room=${room}`}>Scenarios</a></li><li><span aria-current="page">{s.id}</span></li></ol></nav>
      <p className="kicker">{s.id}{s.hero ? ` · ${HERO[s.hero]}` : ''}</p><h1>{s.title}</h1>
      <p className="lead">{s.question}</p>
      {s.id !== 'S4' && s.id !== 'S5' && <RoomPick room={room} base={`#/search/scenarios/${s.id}`} />}
      <div className="sp__answer" role="status"><p><Tag tone="ok">ANSWERED</Tag> <span className="ui-muted">from {total} recorded relationships</span></p><p className="sp__summary">{s.answer}</p></div>
      <div className="sp__two">
        <div className="sp__lists" data-testid="sp-list">
          <h2 className="build__h">Start: {s.start.href ? <a href={s.start.href}>{s.start.label}</a> : s.start.label}</h2>
          {s.groups.map((g) => <details key={g.key} open={g.items.length <= 6} className="sp__group" data-testid={`sp-group-${g.key}`}><summary><b>{g.label}</b> <span className="sp__count" data-count={g.items.length}>{g.items.length}</span></summary>
            {g.items.length ? <ul className="sp__edges">{g.items.map((i) => <li key={i.id} data-item={i.id}><span className="sp__rel">{i.rel}</span> {i.href ? <a href={i.href}><b>{i.label}</b></a> : <b>{i.label}</b>}{i.detail && <span className="ui-muted"> · {i.detail}</span>} <span className="ui-meta">· {i.provenance}</span></li>)}</ul> : <p className="ui-muted">None recorded.</p>}
          </details>)}
        </div>
        <Stage label={`Compact graph of ${s.title}`} testId="sp-graph"><Graph s={s} open={open} toggle={toggle} /></Stage>
      </div>
      <Notice tone="warn"><b>What this answer cannot claim.</b><ul className="sp__why">{s.cannot.map((c) => <li key={c}>{c}</li>)}</ul></Notice>
      {s.acts && <p className="row-actions">{s.acts.map((a) => <a key={a.href} className="ui-btn" href={a.href}>{a.label}</a>)}</p>}
    </section>
  );
}

/** Radial: the start in the centre, one spoke per group, up to three records per group until expanded. */
function Graph({ s, open, toggle }: { s: Scenario; open: Set<string>; toggle: (k: string) => void }) {
  const W = 640, H = 480, cx = W / 2, cy = H / 2; const n = s.groups.length;
  const spokes = s.groups.map((g, i) => { const a = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2; return { g, a, x: cx + Math.cos(a) * 120, y: cy + Math.sin(a) * 120 }; });
  const shown = (g: SGroup) => (open.has(g.key) ? g.items : g.items.slice(0, PER));
  return (
    <div className="sp__gwrap">
      <svg className="stage__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${s.groups.length} groups around ${s.start.label}; the list beside it holds every record`}>
        {spokes.map(({ g, a, x, y }) => { const items = shown(g); return <g key={g.key}>
          <line x1={cx} y1={cy} x2={x} y2={y} className="sp__edge" />
          {items.map((it, j) => { const b = a + (j - (items.length - 1) / 2) * (open.has(g.key) ? 0.12 : 0.28); const r = 190 + (open.has(g.key) ? (j % 3) * 22 : 0); const ix = cx + Math.cos(b) * r, iy = cy + Math.sin(b) * r; return <g key={it.id}><line x1={x} y1={y} x2={ix} y2={iy} className="sp__edge" /><circle cx={ix} cy={iy} r={6} className="sp__leaf" /><title>{`${it.rel} ${it.label}`}</title></g>; })}
          <circle cx={x} cy={y} r={20} className="sp__hub" /><text x={x} y={y + 5} textAnchor="middle" className="sp__hubn">{g.items.length}</text>
        </g>; })}
        <circle cx={cx} cy={cy} r={26} className="sp__centre" /><text x={cx} y={cy + 44} textAnchor="middle" className="sp__lab">{s.start.label.length > 34 ? `${s.start.label.slice(0, 33)}…` : s.start.label}</text>
      </svg>
      <ul className="sp__legend">{s.groups.map((g) => <li key={g.key}><span>{g.label}</span> <b data-testid={`sp-gcount-${g.key}`}>{g.items.length}</b>{g.items.length > PER && <button type="button" className="sp__more" aria-expanded={open.has(g.key)} onClick={() => toggle(g.key)} data-testid={`sp-more-${g.key}`}>{open.has(g.key) ? 'Show fewer' : `+${g.items.length - PER} more`}</button>}</li>)}</ul>
    </div>
  );
}

export const useScenario = (id: string, room: string) => useMemo(() => scenario(id, room), [id, room]);
