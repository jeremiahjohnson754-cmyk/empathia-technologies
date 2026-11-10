/**
 * A world's page (v1.8 §3.1–3.3): its 4–6 journeys first, then — one action further — "All roles and advanced tools" (the world's role
 * configurations grouped by purpose, never one long list), "Show all features" and "What can I do here?". A first visit gets a short
 * tour that can be skipped. The role configuration lives in the address (?as=), so links, reloads and the back button all agree and
 * nothing is stored.
 */
import { useState, type ReactNode } from 'react';
import { Icon, Notice } from '@empathia/ui';
import type { PageProps, RoleKey } from '../registry.types.js';
import { PAGES, hrefOf } from '../registry.pages.js';
import { ROLES } from '../access/policy.js';
import { useViewAs } from '../viewas/context.js';
import { WORLDS, PURPOSES, isWorld, configFor, configById, groupsOf, journeysOf, journeysFor, journeyTarget, presents, specifiedOnly, whoPresents, worldHref, type Journey, type RoleConfig, type World } from './registry.js';
import { enterContext, contextOf, contextKey } from './scope.js';
import { enterpriseTarget, opens } from './enterprise.js';
import { Crumbs, Synthetic } from './kit.js';
import { Emblem } from './WorldsPage.js';

type PanelKey = 'roles' | 'all' | 'what';
/** The tour is skipped for the rest of the visit (kept in memory only: nothing about a visitor is stored). */
let tourSkipped = false;
const KIND: Record<string, string> = { public: 'Public', student: 'Student', teaching: 'Teaching', exhibiting: 'Exhibitor', production: 'Production', engineering: 'Engineering', operations: 'Operations', leadership: 'Leadership' };

export function UnknownWorld({ what }: { what: string }) {
  return (
    <section className="owlpage" aria-labelledby="uw-h" data-testid="world-unknown">
      <img className="owlpage__owl" src="brand/owl.svg" alt="" width="112" height="112" />
      <div className="owlpage__b"><p className="kicker">Unknown address</p><h1 id="uw-h" tabIndex={-1}>{what}</h1>
        <p>There are four worlds: Enterprise, Stadium, University and Convention.</p>
        <p className="owlpage__acts"><a className="ui-btn ui-btn--primary" href="#/worlds">Choose a world</a> <a className="ui-btn" href="#/investor">Investor start</a></p></div>
    </section>
  );
}

export default function WorldPage({ role, params, query }: PageProps) {
  const w = params.world;
  if (!isWorld(w)) return <UnknownWorld what="This world is not part of the demonstration" />;
  const config = configFor(w, query.get('as'));
  enterContext(contextOf(w, config.id, role));
  return <WorldView key={contextKey()} world={WORLDS[w]} config={config} role={role} asked={query.get('as')} panel={query.get('panel')} />;
}

function WorldView({ world, config, role, asked, panel: firstPanel }: { world: World; config: RoleConfig; role: RoleKey; asked: string | null; panel: string | null }) {
  const va = useViewAs();
  const ent = world.key === 'enterprise';
  const [panel, setPanel] = useState<PanelKey | null>(firstPanel === 'roles' || firstPanel === 'all' || firstPanel === 'what' ? firstPanel : null);
  const [tour, setTour] = useState(!tourSkipped);
  const journeys = journeysOf(world.key);
  const foreign = !!asked && configById(asked)?.world !== world.key;
  const viewing = ent ? ROLES[role].label : config.label;
  const toggle = (k: PanelKey) => setPanel((p) => (p === k ? null : k));
  const go = (r: RoleKey, href?: string) => { va.switchTo(r); if (href) setTimeout(() => { location.hash = href; }, 0); };

  const card = (x: Journey): ReactNode => {
    const body = (tag: string, note?: string) => <><span className="w-jcard__k">{tag}</span><b>{x.title}</b><span className="w-jcard__d">{x.blurb}</span>{note && <span className="w-jcard__as">{note}</span>}<span className="w-jcard__go" aria-hidden="true"><Icon name="arrow-right" size={16} /></span></>;
    if (ent) {
      const t = enterpriseTarget(x, role); if (!t) return null;
      return <li key={x.id}>{t.switches
        ? <button type="button" className="w-jcard" data-journey={x.slug} onClick={() => go(t.as, t.href)}>{body(KIND[x.kind]!, `Opens as ${ROLES[t.as].label} through View as`)}</button>
        : <a className="w-jcard" data-journey={x.slug} href={t.href}>{body(KIND[x.kind]!)}</a>}</li>;
    }
    const t = journeyTarget(x, config);
    return <li key={x.id}><a className="w-jcard" data-journey={x.slug} href={t.href}>{body(KIND[x.kind]!, t.switches ? `Opens as ${t.as.label}` : undefined)}</a></li>;
  };

  return (
    <div className="w w-world" data-world={world.key} data-testid="world">
      <Crumbs items={[{ label: 'Start', href: '#/investor' }, { label: 'Worlds', href: '#/worlds' }, { label: world.name }]} />
      <header className="w-hero">
        <Emblem world={world.key} />
        <div>
          <p className="kicker w-kicker">World · {world.place} (fictional) <Synthetic /></p>
          <h1 tabIndex={-1}>{world.name}</h1>
          <p className="lead">{world.about}</p>
          <p className="w-as" data-testid="world-as">Viewing as <b>{viewing}</b> <span className="ui-meta">{ent ? 'the View-as role; the access policy decides what it opens' : 'a presentation choice: it grants nothing'}</span></p>
        </div>
      </header>
      {foreign && <Notice tone="info">The address asked for a role of another world. A role is never carried from one world into another, so this world opens as {config.label}.</Notice>}

      {tour && (
        <section className="w-tour" aria-labelledby="tour-h" data-testid="world-tour">
          <h2 id="tour-h">A one-minute tour</h2>
          <ol>
            <li><b>Pick a journey.</b> The cards below are the everyday tasks of this world.</li>
            <li><b>Read the labels.</b> Every screen says SYNTHETIC and how each figure is known; nothing here is connected to a real system.</li>
            <li><b>Go deeper when you want.</b> “All roles and advanced tools” lists every role of this world by purpose.</li>
          </ol>
          <button type="button" className="ui-btn w-btn" onClick={() => { tourSkipped = true; setTour(false); }} data-testid="skip-tour">Skip tour</button>
        </section>
      )}

      <section aria-labelledby="j-h" className="w-journeys">
        <div className="w-block__h"><h2 id="j-h">Journeys</h2><span className="ui-meta">{journeys.length} to choose from</span></div>
        <ul className="w-jcards" data-testid="journeys">{journeys.map(card)}</ul>
      </section>

      <div className="w-acts" role="group" aria-label="More in this world">
        <a className="ui-btn w-btn" href={`#/estate/${world.key}${!ent && config.id !== world.defaultConfig ? `?as=${encodeURIComponent(config.id)}` : ''}`} data-testid="open-estate">Explore the estate</a>
        <button type="button" className="ui-btn w-btn" aria-expanded={panel === 'roles'} aria-controls="w-panel" onClick={() => toggle('roles')} data-testid="advanced-open">All roles and advanced tools</button>
        <button type="button" className="ui-btn w-btn" aria-expanded={panel === 'all'} aria-controls="w-panel" onClick={() => toggle('all')} data-testid="all-features">Show all features</button>
        <button type="button" className="ui-btn w-btn" aria-expanded={panel === 'what'} aria-controls="w-panel" onClick={() => toggle('what')} data-testid="what-can-i-do">What can I do here?</button>
      </div>

      <div id="w-panel" className="w-panel" aria-live="polite">
        {panel === 'roles' && (
          <section aria-labelledby="roles-h" data-testid="advanced">
            <h2 id="roles-h">All roles and advanced tools</h2>
            <p className="ui-meta" data-testid="advanced-count">{world.roleCount} role configurations in {world.name}, grouped by purpose. Choosing one changes what is presented; it grants nothing.</p>
            {groupsOf(world.key).map((g) => (
              <section key={g.purpose} className="w-group" aria-labelledby={`g-${g.purpose}`} data-purpose={g.purpose}>
                <h3 id={`g-${g.purpose}`}>{PURPOSES[g.purpose].label} <span className="ui-meta">{g.configs.length} · {PURPOSES[g.purpose].about}</span></h3>
                <ul className="w-roles">
                  {g.configs.map((r) => <li key={r.id} data-role-config={r.id}>{ent ? <EnterpriseRole r={r} role={role} onView={(k) => go(k)} /> : (
                    <a className="w-role" href={worldHref(world.key, r.id)} aria-current={r.id === config.id ? 'true' : undefined}>
                      <b>{r.label}</b>
                      <span className="ui-meta">{specifiedOnly(r) ? 'Specified; no screen of its own yet. Opens the public journeys' : `${journeysFor(r).length} journeys${r.id === config.id ? ' · viewing now' : ''}`}</span>
                    </a>)}</li>)}
                </ul>
              </section>
            ))}
            {ent && <p className="w-viewas"><button type="button" className="ui-btn w-btn" onClick={() => va.open()} data-testid="world-viewas">Open View as</button> <span className="ui-meta">The demonstration’s fifteen View-as roles are unchanged and stay available everywhere.</span></p>}
          </section>
        )}
        {panel === 'all' && (
          <section aria-labelledby="all-h" data-testid="all">
            <h2 id="all-h">Everything in {world.name}</h2>
            <ul className="w-all">
              {journeys.map((x) => <li key={x.id}><b>{x.title}</b> <span className="ui-meta">{ent ? `opens ${x.enterprise!.href.slice(1)}` : x.configs === 'all' ? 'every role of this world' : whoPresents(x).map((r) => r.label).join(', ')}{x.also ? ` · ${x.also.what}: ${x.also.configs.map((id) => configById(id)!.label).join(', ')}` : ''}</span></li>)}
            </ul>
            {ent ? (<>
              <h3>Product surfaces the {ROLES[role].label} can open</h3>
              <ul className="w-links" data-testid="all-surfaces">{PAGES.filter((p) => p.landing && !p.path.includes(':') && opens(role, hrefOf(p.id))).map((p) => <li key={p.id}><a href={hrefOf(p.id)}>{p.title}</a></li>)}</ul>
              <p className="ui-meta">3D rooms and the 3D campus load only when you open them. <a href="#/parity">Every original address</a> still works.</p>
            </>) : <p className="ui-meta">This world is drawn in 2D. It has no 3D scene in this demonstration, so none is ever downloaded; the plan and the lists are the product, not a fallback.</p>}
          </section>
        )}
        {panel === 'what' && (
          <section aria-labelledby="what-h" data-testid="what">
            <h2 id="what-h">What can I do here?</h2>
            <p>As <b>{viewing}</b> you can:</p>
            <ul className="w-all">
              {ent ? journeys.map((x) => { const t = enterpriseTarget(x, role); return t && !t.switches ? <li key={x.id}><a href={t.href}>{x.title}</a> <span className="ui-meta">{x.blurb}</span></li> : null; })
                : journeys.filter((x) => presents(config, x)).map((x) => <li key={x.id}><a href={journeyTarget(x, config).href}>{x.title}</a> <span className="ui-meta">{x.blurb}</span></li>)}
            </ul>
            <p>You cannot, in any role: reach a real system, change a device, or see a real person’s data. Nothing here is connected to anything, and choosing a role grants nothing — in the product, the signed-in server decides every request.</p>
            <p className="ui-meta">Other journeys of this world open as the role whose work they are; the card says which.</p>
          </section>
        )}
      </div>
      <p className="w-skip"><a className="ui-btn ui-btn--quiet w-btn" href="#/worlds">Choose another world</a></p>
    </div>
  );
}

function EnterpriseRole({ r, role, onView }: { r: RoleConfig; role: RoleKey; onView: (k: RoleKey) => void }) {
  const k = r.roleKey ?? r.nearest;
  if (!k) return <div className="w-role w-role--spec"><b>{r.label}</b><span className="ui-meta">Specified; the demonstration has no perspective for it yet</span></div>;
  const here = r.roleKey === role;
  return (
    <button type="button" className="w-role" aria-pressed={here} onClick={() => onView(k)} data-role-key={k}>
      <b>{r.label}</b>
      <span className="ui-meta">{r.roleKey ? (here ? 'Viewing now' : `View as ${ROLES[k].label}`) : `No perspective of its own yet. View as the nearest: ${ROLES[k].label}`}</span>
    </button>
  );
}
