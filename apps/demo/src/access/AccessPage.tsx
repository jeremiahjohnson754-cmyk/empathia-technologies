/**
 * The Agora Owl access page (D39, D44). Shown in place of a screen the current role may not open; the screen's code is never loaded.
 * It says what the address is, names only the roles that can open this exact address (view and query included) and offers View as
 * for each of them. It never reveals data from the screen itself. The same owl, without the roles, is the not-found page.
 */
import type { RoleKey } from '../registry.types.js';
import { ROLES } from './policy.js';

export function AccessPage({ role, title, purpose, who, home, own, onRole, onViewAs }: { role: RoleKey; title: string; purpose?: string; who: RoleKey[]; home: string; own: { label: string; href: string }[]; onRole: (r: RoleKey) => void; onViewAs: () => void }) {
  return (
    <section className="owlpage" aria-labelledby="owl-h" data-testid="access-page">
      <img className="owlpage__owl" src="brand/owl.svg" alt="" width="112" height="112" />
      <div className="owlpage__b">
        <p className="kicker">Not part of this role’s work</p>
        <h1 id="owl-h" tabIndex={-1}>{title} is not open to the {ROLES[role].label}</h1>
        {purpose && <p className="lead">{purpose}.</p>}
        <p>A role is given what its work needs and nothing else, so this screen was not loaded for the {ROLES[role].label}.</p>
        {own.length > 0 && <><h2 className="owlpage__h2" id="owl-own">What the {ROLES[role].label} can open</h2>
          <ul className="owlpage__own" aria-labelledby="owl-own" data-testid="access-own">{own.map((o) => <li key={o.href}><a href={o.href}>{o.label}</a></li>)}</ul></>}
        {who.length > 0 ? (<>
          <h2 className="owlpage__h2" id="owl-who">Roles whose work it is</h2>
          <ul className="owlpage__who" aria-labelledby="owl-who" data-testid="access-who">
            {who.map((k) => <li key={k}><button type="button" className="owlpage__role" data-r={k} data-role-key={k} onClick={() => onRole(k)}><span className="ava" aria-hidden="true">{ROLES[k].initials}</span><span><b>View as {ROLES[k].label}</b><span className="ui-meta">{ROLES[k].domain}</span></span></button></li>)}
          </ul>
        </>) : <p>No role opens this address.</p>}
        <p className="owlpage__acts"><a className="ui-btn ui-btn--primary" href={home}>Back to {ROLES[role].home}</a> <button type="button" className="ui-btn" onClick={onViewAs}>View as another role</button></p>
        <p className="ui-meta">Switching perspective in this demonstration grants nothing: the authenticated application's server decides real access.</p>
      </div>
    </section>
  );
}

export function NotFound({ hash, home }: { hash: string; home: string }) {
  return (
    <section className="owlpage" aria-labelledby="nf-h" data-testid="not-found">
      <img className="owlpage__owl" src="brand/owl.svg" alt="" width="112" height="112" />
      <div className="owlpage__b">
        <p className="kicker">Unknown address</p>
        <h1 id="nf-h" tabIndex={-1}>This address is not part of the Living Campus</h1>
        <p className="ui-muted">Address <code>{hash.length > 120 ? `${hash.slice(0, 120)}…` : hash}</code></p>
        <p className="owlpage__acts"><a className="ui-btn ui-btn--primary" href={home}>Back home</a> <a className="ui-btn" href="#/investor">Investor start</a></p>
      </div>
    </section>
  );
}
