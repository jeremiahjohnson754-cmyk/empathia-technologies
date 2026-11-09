/**
 * A journey's screen (#/world/<world>/<journey>?as=<role configuration>).
 *
 * The presentation gate (D44): a journey is shown only to a role configuration of its own world that is presented it. Anyone else gets
 * the owl page, and the screen's code is not loaded: the restricted screens of a world are a separate chunk from its public ones, so a
 * public journey never downloads the engineering topology. The gate is presentation, not security — the whole synthetic model ships
 * with the demonstration; in the product the signed-in server decides every request.
 *
 * Late work fails closed: a chunk that resolves after the context changed is dropped (scope.ts).
 */
import { useEffect, useState, type ComponentType } from 'react';
import { Loading, Button } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { useViewAs } from '../viewas/context.js';
import { WORLDS, isWorld, configFor, journeyAt, journeyHref, journeysFor, journeyTarget, presents, whoPresents, worldHref, type Journey, type RoleConfig, type World, type WorldKey } from './registry.js';
import { enterContext, contextOf, contextKey, contextEpoch, current } from './scope.js';
import { enterpriseTarget } from './enterprise.js';
import { Crumbs, Synthetic, type ScreenProps } from './kit.js';
import { UnknownWorld } from './WorldPage.js';

type Screens = Record<string, ComponentType<ScreenProps>>;
type Loader = () => Promise<{ SCREENS: Screens }>;
/** One chunk per world and audience. Named files, so the build's chunk names say what they are (…Public-<hash>.js, …Pro-<hash>.js). */
const LOADERS: Record<Exclude<WorldKey, 'enterprise'>, Record<'public' | 'pro', Loader>> = {
  stadium: { public: () => import('./stadium/StadiumPublic.js'), pro: () => import('./stadium/StadiumPro.js') },
  university: { public: () => import('./university/UniversityPublic.js'), pro: () => import('./university/UniversityPro.js') },
  convention: { public: () => import('./convention/ConventionPublic.js'), pro: () => import('./convention/ConventionPro.js') },
};

export default function JourneyPage({ role, params, query }: PageProps) {
  const w = params.world;
  if (!isWorld(w)) return <UnknownWorld what="This world is not part of the demonstration" />;
  const journey = journeyAt(w, params.journey || '');
  if (!journey) return <UnknownWorld what={`${WORLDS[w].name} has no journey at this address`} />;
  const config = configFor(w, query.get('as'));
  enterContext(contextOf(`${w}/${journey.slug}`, config.id, role));
  if (journey.enterprise) return <EnterpriseHandOff key={contextKey()} world={WORLDS[w]} journey={journey} role={role} />;
  if (!presents(config, journey)) return <WorldGate world={WORLDS[w]} journey={journey} config={config} />;
  return <ScreenHost key={contextKey()} world={WORLDS[w]} journey={journey} config={config} />;
}

function ScreenHost({ world, journey, config }: ScreenProps) {
  const [C, setC] = useState<ComponentType<ScreenProps> | null>(null);
  const [err, setErr] = useState(false); const [n, setN] = useState(0);
  useEffect(() => {
    const started = contextEpoch(); let live = true; setErr(false);
    LOADERS[world.key as Exclude<WorldKey, 'enterprise'>][journey.module || 'public']()
      .then((m) => { if (!live || !current(started)) return; const S = m.SCREENS[journey.slug]; if (S) setC(() => S); else setErr(true); })
      .catch(() => { if (live && current(started)) setErr(true); });
    return () => { live = false; };
  }, [world.key, journey.id, n]);
  if (err) return <section className="loadfail" role="alert"><h1 tabIndex={-1}>{journey.title} did not load</h1><p>The screen’s code could not be fetched. Nothing was changed.</p><Button kind="primary" onClick={() => setN(n + 1)}>Try again</Button></section>;
  if (!C) return <Loading label={`Loading ${journey.title}`} />;
  return <div className="w w-screen" data-world={world.key} data-journey={journey.slug} data-config={config.id} data-testid="world-screen"><C world={world} journey={journey} config={config} /></div>;
}

/** The owl page of a world: what the journey is, the role configurations whose work it is, and what this one can open. Loads nothing. */
function WorldGate({ world, journey, config }: { world: World; journey: Journey; config: RoleConfig }) {
  const who = whoPresents(journey); const own = journeysFor(config);
  return (
    <section className="owlpage" aria-labelledby="wg-h" data-world={world.key} data-testid="world-access-page">
      <img className="owlpage__owl" src="brand/owl.svg" alt="" width="112" height="112" />
      <div className="owlpage__b">
        <Crumbs items={[{ label: 'Start', href: '#/investor' }, { label: 'Worlds', href: '#/worlds' }, { label: world.name, href: worldHref(world.key, config.id) }, { label: journey.title }]} />
        <p className="kicker">Not part of this role’s work <Synthetic /></p>
        <h1 id="wg-h" tabIndex={-1}>{journey.title} is not open to the {config.label}</h1>
        <p className="lead">{journey.blurb}</p>
        <p>A role is presented what its work needs and nothing else, so this screen was not loaded for the {config.label}.</p>
        {own.length > 0 && <><h2 className="owlpage__h2" id="wg-own">What the {config.label} can open</h2>
          <ul className="owlpage__own" aria-labelledby="wg-own" data-testid="world-access-own">{own.map((x) => <li key={x.id}><a href={journeyTarget(x, config).href}>{x.title}</a></li>)}</ul></>}
        <h2 className="owlpage__h2" id="wg-who">Roles whose work it is</h2>
        <ul className="owlpage__own" aria-labelledby="wg-who" data-testid="world-access-who">{who.map((r) => <li key={r.id}><a href={journeyHref(journey, r.id)} data-role-config={r.id}>Open as {r.label}</a></li>)}</ul>
        <p className="owlpage__acts"><a className="ui-btn ui-btn--primary" href={worldHref(world.key, config.id)}>Back to {world.name}</a> <a className="ui-btn" href={worldHref(world.key, config.id, { panel: 'roles' })}>All roles and advanced tools</a></p>
        <p className="ui-meta">Opening as another role in this demonstration grants nothing: the signed-in application’s server decides real access.</p>
      </div>
    </section>
  );
}

/** An Enterprise journey has no screen of its own: it is a way into the existing demonstration, behind the same access policy. */
function EnterpriseHandOff({ world, journey, role }: { world: World; journey: Journey; role: PageProps['role'] }) {
  const va = useViewAs(); const t = enterpriseTarget(journey, role);
  return (
    <div className="w w-world" data-world="enterprise" data-testid="world-handoff">
      <Crumbs items={[{ label: 'Start', href: '#/investor' }, { label: 'Worlds', href: '#/worlds' }, { label: world.name, href: worldHref('enterprise') }, { label: journey.title }]} />
      <p className="kicker w-kicker">{world.name} · {world.place} (fictional) <Synthetic /></p>
      <h1 tabIndex={-1}>{journey.title}</h1>
      <p className="lead">{journey.blurb}</p>
      {!t ? <p>No View-as role opens this journey’s page.</p>
        : t.switches ? <p><button type="button" className="ui-btn ui-btn--primary w-btn" onClick={() => { va.switchTo(t.as); setTimeout(() => { location.hash = t.href; }, 0); }}>Open as {ROLES[t.as].label} through View as</button> <span className="ui-meta">The {ROLES[role].label} does not open this page; View as changes the role and says so.</span></p>
          : <p><a className="ui-btn ui-btn--primary w-btn" href={t.href}>Open {journey.title}</a></p>}
      <p><a className="ui-btn ui-btn--quiet w-btn" href={worldHref('enterprise')}>Back to {world.name}</a></p>
    </div>
  );
}
