/** The investor start (2.5.5 landing composition): three ways in, the seven scenarios with their problems, the View-as shelf. */
import type { PageProps, RoleKey } from '../registry.types.js';
import { WorkWith } from '../enquiry/WorkWith.js';
import { AREAS, NATIVE } from '../registry.js';
import { ROLES, ROLE_KEYS } from '../access/policy.js';
import { PageHero, Chip, ProgressBar, StatusDot, PRODUCTS } from '@empathia/ui';
import { useViewAs } from '../viewas/context.js';

const SCENARIOS = [
  ['If this switch fails, what is affected?', 'Nobody can say what a failing device takes down. Search Party shows the room, the switch, its uplink, the rooms that share it and the power behind it, each with its freshness.'],
  ['Field Intelligence: what the collector declares', 'Monitoring tools report what a configuration file says, not what is true. Every observation is labelled declared, observed, verified, modeled, unknown or unavailable.'],
  ['Room optimisation in Lite', 'Rooms are changed on a hunch. Lite states a prediction with its uncertainty and never calls a scenario a measurement.'],
  ['Commissioning and governance', 'Rooms are accepted without proof. An adaptive plan states why each test applies, and an approval is refused in front of you with every unresolved item named.'],
  ['Incident → service → retest → closure', 'Repairs close on a technician\'s word. Hard gates before dispatch, evidence in the field, independent verification, and the baseline that decides whether it is fixed.'],
  ['Learn', 'Lessons stay in people\'s heads. Reviewed cases are written from what actually happened, with permission and de-identification, and training never grants authority.'],
  ['The connected ecosystem', 'Every system has its own numbers. Mission Control, 27 KPI passports with numerator and denominator, and the ledger behind every state.'],
] as const;
/** The shelf: the roles an investor most often wants to see the platform as, one tap each (the full list is in View as). */
const SHELF: RoleKey[] = ['exec', 'ops', 'designer', 'service', 'cxeng', 'employee', 'visitor'];

export default function Landing({ role }: PageProps) {
  const va = useViewAs();
  const native = AREAS.filter((a) => NATIVE.has(a.key)).length;
  return (
    <>
      <PageHero eyebrow="Investor demonstration" icon="spark" className="landing-hero"
        title="Every state here has a guard, an actor and an event behind it."
        lede="Declared is not verified; modeled is not measured — and the product says so itself. Three ways in:"
        meta={[<Chip key="s" small icon="play">{SCENARIOS.length} guided scenarios</Chip>, <Chip key="r" small icon="users">{ROLE_KEYS.length} roles to view as</Chip>, <Chip key="p" small icon="products">{PRODUCTS.length} products, one platform</Chip>]}
        aside={<div className="landing-hero__aside"><ProgressBar label="Addresses rebuilt natively" value={native} max={AREAS.length} valueText={`${native} of ${AREAS.length}`} tone="accent" /><StatusDot state="modelled" label="Synthetic, in-browser" /></div>}
        actions={<div className="start">
          <a className="go launch" href="#/v25/build"><b>Launch interactive room builder</b><span>Design a room and watch it reach drawings, commissioning, Search Party and Pro.</span></a>
          <a className="go" href="#/tours/investor"><b>Watch a guided scenario</b><span>Seven scenarios · about 14 minutes</span></a>
          <a className="go" href="#problems"><b>What each workflow solves</b><span>The customer problem behind each scenario</span></a>
        </div>} />
      <section className="shelf" aria-labelledby="shelf-h">
        <h2 id="shelf-h">See it as the people who use it</h2>
        <p className="ui-meta">Each role is given what its work needs and nothing else; the tabs, buttons and screens change with it.</p>
        <ul className="shelf__list">
          {SHELF.map((k) => <li key={k}><button type="button" className="shelf__role" data-r={k} data-role-key={k} aria-pressed={k === role} onClick={() => va.switchTo(k)}><span className="ava" aria-hidden="true">{ROLES[k].initials}</span><span><b>{ROLES[k].label}</b><span>{ROLES[k].home}</span></span></button></li>)}
          <li><button type="button" className="shelf__role shelf__more" onClick={va.open}><span className="ava" aria-hidden="true">+</span><span><b>Every role</b><span>View as…</span></span></button></li>
        </ul>
      </section>
      <section id="problems" className="scen">
        <h2>Seven scenarios</h2>
        <ol>{SCENARIOS.map(([t, p], i) => <li key={t}><a href={`#/tours/investor?scenario=${i + 1}`}><b>{i + 1} · {t}</b></a><p><i>The problem</i> {p}</p></li>)}</ol>
      </section>
      <WorkWith />
      <section className="status">
        <h2>Coverage</h2>
        <p>This demonstration is built as modular pages from the Living Campus V2.5.3 source. {native} of {AREAS.length} address areas (86 areas and 19 V2.5 pages) land on a native page; <a href="#/parity">the full map of every original address</a> is computed from the page registry, never typed.</p>
      </section>
    </>
  );
}
