/**
 * "Choose a world" (v1.8 §3, V18-JOURNEY-01): exactly four world cards before any role, and a skip path for people who know the
 * demonstration. A world is a presentation choice: it grants nothing, loads no 3D scene and stores nothing.
 */
import type { PageProps } from '../registry.types.js';
import { WORLD_KEYS, WORLDS, journeysOf, worldHref, type WorldKey } from './registry.js';
import { enterContext, contextOf } from './scope.js';
import { Crumbs, Synthetic } from './kit.js';

/** A small drawing of the kind of place each world is (decorative; drawn from the tokens, different in shape for each world). */
export function Emblem({ world }: { world: WorldKey }) {
  return (
    <svg className="w-emblem" viewBox="0 0 120 72" aria-hidden="true" focusable="false">
      {world === 'enterprise' && <><rect x="10" y="30" width="26" height="34" rx="3" className="w-emblem__f" /><rect x="42" y="14" width="30" height="50" rx="3" className="w-emblem__l" /><rect x="78" y="38" width="32" height="26" rx="3" className="w-emblem__f" />{[22, 32, 42, 52].map((y) => <line key={y} x1="48" x2="66" y1={y} y2={y} className="w-emblem__l" />)}</>}
      {world === 'stadium' && <><ellipse cx="60" cy="36" rx="52" ry="30" className="w-emblem__l" /><ellipse cx="60" cy="36" rx="38" ry="19" className="w-emblem__l" /><rect x="40" y="27" width="40" height="18" rx="2" className="w-emblem__f" /><line x1="60" x2="60" y1="27" y2="45" className="w-emblem__l" /></>}
      {world === 'university' && <><rect x="38" y="24" width="44" height="26" rx="3" className="w-emblem__f" /><rect x="8" y="12" width="22" height="20" rx="3" className="w-emblem__l" /><rect x="90" y="12" width="22" height="20" rx="3" className="w-emblem__l" /><rect x="8" y="44" width="22" height="20" rx="3" className="w-emblem__l" /><rect x="90" y="44" width="22" height="20" rx="3" className="w-emblem__l" /><path d="M30 22 L38 30 M90 22 L82 30 M30 54 L38 46 M90 54 L82 46" className="w-emblem__l" /></>}
      {world === 'convention' && <><rect x="8" y="10" width="104" height="52" rx="4" className="w-emblem__l" />{[0, 1, 2, 3, 4].flatMap((i) => [0, 1, 2].map((r) => <rect key={`${i}-${r}`} x={16 + i * 19} y={18 + r * 14} width="12" height="8" rx="1.5" className={(i + r) % 3 === 0 ? 'w-emblem__f' : 'w-emblem__l'} />))}</>}
    </svg>
  );
}

export default function WorldsPage({ role }: PageProps) {
  enterContext(contextOf('worlds', '', role));
  return (
    <div className="w w-worlds" data-testid="worlds">
      <Crumbs items={[{ label: 'Start', href: '#/investor' }, { label: 'Worlds' }]} />
      <p className="kicker">Four worlds, one platform <Synthetic /></p>
      <h1 tabIndex={-1}>Choose a world</h1>
      <p className="lead">Pick the kind of place you care about. Each opens with a handful of everyday journeys; every role and advanced tool is one step further in. Choosing a world or a role here changes what is presented, never what is permitted.</p>
      <ul className="w-cards" aria-label="Worlds">
        {WORLD_KEYS.map((k) => { const w = WORLDS[k]; return (
          <li key={k}>
            <a className="w-card" href={worldHref(k)} data-world={k} data-testid="world-card">
              <Emblem world={k} />
              <span className="w-card__b">
                <b className="w-card__t">{w.name}</b>
                <span className="w-card__p">{w.place} <span className="ui-meta">fictional</span></span>
                <span className="w-card__l">{w.line}</span>
                <span className="ui-meta">{journeysOf(k).length} journeys · {w.roleCount} role configurations</span>
              </span>
            </a>
          </li>); })}
      </ul>
      <p className="w-skip"><a className="ui-btn w-btn" href="#/investor" data-testid="worlds-skip">Skip: go to the investor start</a> <a className="ui-btn ui-btn--quiet w-btn" href="#/home">Open Mission Control</a></p>
      <ul className="w-notes">
        <li>Everything is synthetic: invented places, people and figures, connected to no real system.</li>
        <li>2D first: no 3D scene is downloaded until you open one.</li>
        <li>The places are fictional and stand for a kind of venue; no real venue, institution or partner is represented.</li>
      </ul>
    </div>
  );
}
