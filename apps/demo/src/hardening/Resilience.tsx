/**
 * Resilience (#/hardening): how the demonstration behaves when a part of it fails — each operational workspace loads as its own file
 * and a failure shows a named alert with Try again; a workspace that fails while drawing is caught the same way; every destructive
 * action carries a named confirmation or Undo. "Show a drawing failure" demonstrates the second case on this page itself.
 */
import { useState } from 'react';
import type { WorkspaceProps } from './lazy.js';
import { OpsHead, personaOf } from './kit.js';
import { OPS_WORKSPACES } from './opsRoutes.js';
import { SAFEGUARDS } from '../safeguards/Safeguards.js';

function Boom(): null { throw new Error('demonstration: a drawing failure, caught by the workspace guard'); }

export default function Resilience({ perspective }: WorkspaceProps) {
  const [boom, setBoom] = useState(false);
  return (
    <section className="ops" data-testid="resilience">
      <OpsHead kicker="Hardening" title="Resilience" persona={personaOf(perspective)} lead={<>What happens when part of the demonstration fails, and what protects you from an action you did not mean.</>} />
      <section className="ops-card" aria-labelledby="ws-h"><h2 id="ws-h">Workspaces, each loaded on its own</h2>
        <p className="ops-note">If one does not arrive, its page says which, why in plain words, and offers Try again (a fresh request) and, after a second failure, a reload. The rest of the demonstration keeps working.</p>
        <ul className="ops-list">{OPS_WORKSPACES.map((w) => <li key={w.href}><a href={w.href}>{w.name}</a> <span className="ops-meta">{w.purpose}</span></li>)}</ul></section>
      <section className="ops-card" aria-labelledby="sg-h"><h2 id="sg-h">Destructive-action safeguards</h2>
        <div className="ops-table-wrap"><table className="ops-table" data-testid="safeguards"><caption className="ui-sr">Every destructive action and its safeguard</caption><thead><tr><th scope="col">Where</th><th scope="col">Action</th><th scope="col">Safeguard</th></tr></thead>
          <tbody>{SAFEGUARDS.map((s) => <tr key={s.key}><td>{s.area}</td><td>{s.action}</td><td>{s.named ? 'Type the name to confirm' : 'Confirm'}{s.reversibility === 'undo' ? ' · Undo after' : ' · cannot be undone, and says so'}<div className="ops-meta">{s.why}</div></td></tr>)}</tbody></table></div></section>
      <section className="ops-card" aria-labelledby="bm-h"><h2 id="bm-h">See a drawing failure handled</h2>
        <p className="ops-note">This makes this page fail on purpose while drawing. The guard replaces it with a named alert; Try again brings it back. Nothing is stored or sent.</p>
        <button type="button" className="ui-btn" onClick={() => setBoom(true)} data-testid="boom">Show a drawing failure</button>
        {boom ? <Boom /> : null}</section>
    </section>
  );
}
