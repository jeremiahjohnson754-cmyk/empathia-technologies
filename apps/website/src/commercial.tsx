// Pricing and pilots (handoff v1.8 §4, ADR-023; founder direction 2026-11-09: the price list and the pilot options appear on the
// corporate site). Every price on these pages is read from the generated catalogue (packages/commercial/src/generated/catalog.ts, made
// from the founder's price list by packages/commercial/scripts/generate.mjs) and printed by usd(): no price is typed in this file.
// Each line carries its scope and limitation text; each pilot carries its go-live caveat. Self-serve purchase is not open: the only way
// forward from either page is the existing enquiry form (apps/website/src/enquiry.ts, unchanged). The readiness check on /pilots runs in
// the browser (src/pilot.ts) from what the visitor selects; it sends nothing anywhere and asks for no credential.
import React from 'react';
import type { Page } from './content';
import { Hero, Section, Actions, Note, EnquiryLink } from './ui.js';
import { SKUS, BUNDLES, PILOTS, SIGNAL_TERMS, FAMILIES, PRICE_LABEL, PILOT_RULES, READINESS_STATES, READINESS_MEANING, usd, unitLabel, choiceOf, quote } from '../../../packages/commercial/src/index.ts';
import { CONNECTORS } from '../../../packages/commercial/src/generated/connectors.ts';

const CAVEAT = PILOTS[0]!.caveat;
const skuName = (id: string) => SKUS.find((s) => s.sku === id)?.name || id;
const Price = ({ cents, unit }: { cents: number; unit: string }) => <div className="price"><b>{cents === 0 ? <>Free <span className="price__zero">({usd(0)})</span></> : usd(cents)}</b><span>{unit}</span></div>;
const ListPrice = () => <p className="listprice" data-price-label><span className="tag tag--declared"><i aria-hidden="true" />List price</span> {PRICE_LABEL} Prices are in US dollars, before any applicable tax.</p>;
const seat = SKUS.find((s) => s.sku === 'SEAT-ENTERPRISE')!;
const signal = (id: string) => SKUS.find((s) => s.sku === id)!;

/** The three bundles the short page leads with (the other four are in the full list). */
const FEATURED = ['WORKPLACE-ESSENTIALS', 'SERVICE-INTELLIGENCE', 'ENGINEERING-LIFECYCLE'];
const OUTCOMES: { title: string; body: string; href: string; go: string }[] = [
  { title: 'See it on synthetic data first', body: 'A bounded pilot at a fixed price shows the whole record working before anything of yours is connected.', href: '#pilot-prices', go: 'The four pilots' },
  { title: 'Know what every room costs to run', body: 'A platform base, a per-room licence and a per-person seat. The quantities are yours; the arithmetic is shown.', href: '#example', go: 'A worked example' },
  { title: 'Buy a lifecycle, not a parts list', body: 'A bundle groups the products one team uses together and takes a stated percentage off each of its monthly lines.', href: '#bundles', go: 'Three bundles' },
];
/** One worked example, computed by the same quote() the readiness check uses: nothing on this page is added up by hand. */
function Example() {
  const q = quote({ quantities: { 'CORE-ENTERPRISE': 1, 'PRO-ROOM': 25, 'SEAT-ENTERPRISE': 40, COMMISSION: 25 }, bundle: 'WORKPLACE-ESSENTIALS', pilot: 'PILOT-READONLY' });
  return (
    <div className="tablewrap" role="region" aria-label="A worked example" tabIndex={0}><table className="terms quote" data-quote>
      <caption>25 rooms and 40 named users on Workplace Essentials, starting with the read-only pilot</caption>
      <thead><tr><th scope="col">Line</th><th scope="col">Quantity</th><th scope="col">List price</th><th scope="col">Discount</th><th scope="col">Amount</th></tr></thead>
      <tbody>
        {q.monthly.map((l) => <tr key={l.sku} data-line={l.sku}><th scope="row">{l.name}{l.note ? <small> {l.note}</small> : null}</th><td>{l.quantity}</td><td>{usd(l.unitCents)}</td><td>{l.discountPct ? `${l.discountPct}%` : '—'}</td><td><b>{usd(l.cents)}</b></td></tr>)}
        <tr className="quote__total" data-total="monthly"><th scope="row" colSpan={4}>Each month, before tax</th><td><b>{usd(q.monthlyCents)}</b></td></tr>
        {q.oneTime.map((l) => <tr key={l.sku} data-line={l.sku}><th scope="row">{l.name} <small>one time; never discounted</small></th><td>{l.quantity}</td><td>{usd(l.unitCents)}</td><td>—</td><td><b>{usd(l.cents)}</b></td></tr>)}
        <tr className="quote__total" data-total="once"><th scope="row" colSpan={4}>Once, before tax</th><td><b>{usd(q.oneTimeCents)}</b></td></tr>
      </tbody>
    </table></div>
  );
}

function pricingPage(): Page {
  const featured = FEATURED.map((id) => BUNDLES.find((b) => b.id === id)).filter((b): b is (typeof BUNDLES)[number] => !!b);
  return { path: '/pricing', nav: 'Pricing', title: 'Pricing — Empathia Technologies', description: `How Empathia is priced: a named-user seat, ${featured.length} bundles for the commonest estates, ${PILOTS.length} bounded pilots and SIGNAL, with one worked total. The full price list is one click deeper.`, body: (
    <>
      <Hero label="Pricing" title="Start with a pilot. Pay for what you run." lead="A fixed-price pilot first, then a seat for each person and a licence for each room. Every figure on this page is a list price, and the one total below is added up in front of you.">
        <ListPrice />
        <Actions><a className="btn btn--primary btn--lg" href="/pilots">Check which pilot fits</a><a className="btn btn--lg" href="/pricing/catalogue">The full price list</a></Actions>
      </Hero>
      <Section id="outcomes" title="What you are paying for">
        <div className="cards cards--3">{OUTCOMES.map((o) => <article key={o.title} className="card"><h3>{o.title}</h3><p>{o.body}</p><p><a href={o.href}>{o.go}</a></p></article>)}</div>
      </Section>
      <Section id="pilot-prices" title="Four pilots, each a fixed price" lead="One-time packages with a fixed scope and length. Bundle discounts never apply to them.">
        <ul className="prices prices--grid">{PILOTS.map((p) => <li key={p.sku} data-sku={p.sku}><div className="prices__what"><h3>{p.name}</h3><p>{p.scope}.</p><p className="prices__sku">{p.sku}</p></div><Price cents={p.cents} unit={`once, ${p.duration}`} /></li>)}</ul>
        <p className="caveat">{CAVEAT}.</p>
        <Actions><a className="btn btn--primary" href="/pilots">Check which pilot fits</a></Actions>
      </Section>
      <Section id="seats" title="People" lead="Staff are licensed by name. Public guests are never charged per user." tone="deep">
        <ul className="prices prices--solo"><li data-sku={seat.sku}><div className="prices__what"><h3>{seat.name}</h3><p>{seat.scope}.</p><p className="prices__sku">{seat.sku}</p></div><Price cents={seat.cents} unit={unitLabel(seat.billingUnit)} /></li></ul>
      </Section>
      <Section id="bundles" title="Three bundles for the commonest estates" lead="A bundle takes a percentage off each eligible monthly line of its own products. Quantities stay explicit; a bundle is never a flat price.">
        <div className="cards cards--3">{featured.map((b) => (
          <article key={b.id} className="card bundle" data-bundle={b.id}>
            <p className="bundle__pct"><b>{b.discount}</b> off eligible lines</p><h3>{b.name}</h3><p>{b.summary}.</p>
            <ul className="bundle__skus" aria-label={`Products in ${b.name}`}>{b.skus.map((x) => <li key={x}>{skuName(x)}</li>)}</ul>
          </article>))}
        </div>
        <p className="caveat">Bundles never discount tax, payment fees, external licences, services or pilot fees.</p>
        <Actions><a className="btn" href="/pricing/catalogue#bundles">All {BUNDLES.length} bundles</a></Actions>
      </Section>
      <Section id="example" title="One total, added up in front of you" lead="An example estate, priced line by line from the list. These are the only charges: there is no set-up fee, no per-guest fee and no connector fee hidden behind the total. Tax, and any vendor’s own subscription, are separate and are said so." tone="deep">
        <Example />
        <Note>The example is arithmetic on list prices, not an offer. Your own quantities change the lines, never the rules.</Note>
      </Section>
      <Section id="signal" title="SIGNAL and Learn" lead={`${signal('SIGNAL-FREE').scope}: free. The full story is a subscription.`}>
        <ul className="prices prices--grid">{SKUS.filter((x) => x.family === 'SIGNAL').map((x) => <li key={x.sku} data-sku={x.sku}><div className="prices__what"><h3>{x.name}</h3><p>{x.scope}.</p><p className="prices__sku">{x.sku}</p></div><Price cents={x.cents} unit={unitLabel(x.billingUnit)} /></li>)}</ul>
        <Actions><a className="btn" href="/pricing/catalogue#signal">Terms for 3, 6 and 12 months</a></Actions>
      </Section>
      <Section id="full" title="Everything else, line by line" lead={`The complete list has ${SKUS.length} products in ${FAMILIES.length} families, all ${BUNDLES.length} bundles and the SIGNAL terms, each with what it covers and what it does not.`} tone="deep">
        <Actions><a className="btn btn--lg" href="/pricing/catalogue" data-catalogue>Open the full price list</a></Actions>
      </Section>
      <Section id="how-to-buy" title="How to buy today" lead="Self-serve purchase is not open yet, and no payment is taken on this site. An enquiry reaches a person, who confirms the scope and the terms in writing.">
        <div className="enquire"><h3>Ask about a price or a pilot</h3><p>Tell us the products and the quantities you have in mind.</p><EnquiryLink source="website-pilot" primary id="pricing" /></div>
      </Section>
    </>
  ) };
}

function cataloguePage(): Page {
  const rest = SKUS.filter((s) => s.family !== 'SIGNAL' && s.sku !== seat.sku);
  const families = FAMILIES.filter((f) => rest.some((s) => s.family === f));
  return { path: '/pricing/catalogue', title: 'Full price list — Empathia Technologies', description: `The Empathia list prices: ${SKUS.length} products by family, ${BUNDLES.length} bundles, the SIGNAL terms and the ${PILOTS.length} pilot packages, each with its scope and limits.`, body: (
    <>
      <Hero label="Pricing · full catalogue" title="The full price list, line by line" lead={`${SKUS.length} products priced one by one, ${BUNDLES.length} bundles and ${PILOTS.length} bounded pilots. Every line states what it covers and what it does not.`}>
        <ListPrice />
        <Actions><a className="btn btn--primary btn--lg" href="/pricing">Back to the short version</a><a className="btn btn--lg" href="/pilots">The pilot packages</a></Actions>
      </Hero>
      <Section id="seats" title="People" lead="Staff are licensed by name. Public guests are never charged per user.">
        <ul className="prices prices--solo"><li data-sku={seat.sku}><div className="prices__what"><h3>{seat.name}</h3><p>{seat.scope}.</p><p className="prices__sku">{seat.sku}</p></div><Price cents={seat.cents} unit={unitLabel(seat.billingUnit)} /></li></ul>
      </Section>
      <Section id="products" title="Products, by family" lead="Quantities are counted as each line says: per tenant, per managed room, per building, per asset. Vendor subscriptions and services are separate wherever a line says so." tone="deep">
        <div className="fams">{families.map((f) => (
          <section key={f} className="fam" aria-label={f}><h3>{f}</h3>
            <ul className="prices">{rest.filter((s) => s.family === f).map((s) => <li key={s.sku} data-sku={s.sku}><div className="prices__what"><h4>{s.name}</h4><p>{s.scope}.</p><p className="prices__sku">{s.sku}</p></div><Price cents={s.cents} unit={unitLabel(s.billingUnit)} /></li>)}</ul>
          </section>))}
        </div>
      </Section>
      <Section id="bundles" title="Bundles" lead="A bundle takes a percentage off each eligible monthly line of its own products. Quantities stay explicit; a bundle is never a flat price.">
        <div className="cards cards--2">{BUNDLES.map((b) => (
          <article key={b.id} className="card bundle" data-bundle={b.id}>
            <p className="bundle__pct"><b>{b.discount}</b> off eligible lines</p><h3>{b.name}</h3><p>{b.summary}.</p>
            <ul className="bundle__skus" aria-label={`Products in ${b.name}`}>{b.skus.map((s) => <li key={s}>{skuName(s)}</li>)}</ul>
            <p className="bundle__rule">{b.rule}.</p>
          </article>))}
        </div>
      </Section>
      <Section id="signal" title="SIGNAL and Learn" lead={`${signal('SIGNAL-FREE').scope}: free. The full story is a subscription, by the month or for a term.`} tone="deep">
        <ul className="prices prices--grid">{SKUS.filter((s) => s.family === 'SIGNAL').map((s) => <li key={s.sku} data-sku={s.sku}><div className="prices__what"><h3>{s.name}</h3><p>{s.scope}.</p><p className="prices__sku">{s.sku}</p></div><Price cents={s.cents} unit={unitLabel(s.billingUnit)} /></li>)}</ul>
        <div className="tablewrap" role="region" aria-label="SIGNAL subscription terms" tabIndex={0}><table className="terms">
          <caption>SIGNAL subscription terms</caption>
          <thead><tr><th scope="col">Plan</th><th scope="col">Term</th><th scope="col">Price for the term</th><th scope="col">Per month</th><th scope="col">Saving</th></tr></thead>
          <tbody>{SIGNAL_TERMS.map((t) => <tr key={t.sku + t.term} data-term={`${t.sku}/${t.months}`}><th scope="row">{skuName(t.sku)}</th><td>{t.term}</td><td><b>{usd(t.cents)}</b> {t.unit}</td><td>${t.monthly}</td><td>{t.savingPct === '0.0' ? '—' : `${t.savingPct}%`}</td></tr>)}</tbody>
        </table></div>
        <Note>A SIGNAL Teams seat includes the named-user access its holder needs: the same person is never charged the {seat.name} rate as well. The {usd(signal('SIGNAL-TRIAL').cents)} trial is one 14-day trial per person, with a clear choice before any renewal.</Note>
      </Section>
      <Section id="pilot-prices" title="Pilots" lead="Four bounded, one-time packages. Bundle discounts never apply to them.">
        <ul className="prices prices--grid">{PILOTS.map((p) => <li key={p.sku} data-sku={p.sku}><div className="prices__what"><h3>{p.name}</h3><p>{p.scope}.</p><p className="prices__sku">{p.sku}</p></div><Price cents={p.cents} unit={`once, ${p.duration}`} /></li>)}</ul>
        <p className="caveat">{CAVEAT}.</p>
        <Actions><a className="btn btn--primary" href="/pilots">Check which pilot fits</a></Actions>
      </Section>
      <Section id="how-to-buy" title="How to buy today" lead="Self-serve purchase is not open yet, and no payment is taken on this site. An enquiry reaches a person, who confirms the scope and the terms in writing.">
        <div className="enquire"><h3>Ask about a price or a pilot</h3><p>Tell us the products and the quantities you have in mind.</p><EnquiryLink source="website-pilot" primary id="pricing" /></div>
      </Section>
    </>
  ) };
}

function pilotsPage(): Page {
  const cats = [...new Set(CONNECTORS.map((c) => c.category))];
  return { path: '/pilots', nav: 'Pilots', script: 'pilot.js', title: 'Pilot packages and readiness — Empathia Technologies', description: `The ${PILOTS.length} Empathia pilot packages with their prices, scope and limits, and a readiness check that tells you which one fits before any purchase.`, body: (
    <>
      <Hero label="Pilots" title="A bounded pilot, checked before you buy" lead="Four packages with a fixed price and a fixed scope. The readiness check below tells you which one fits, what it needs from your side, and what is not offered today.">
        <ListPrice />
        <Actions><a className="btn btn--primary btn--lg" href="#readiness">Check your readiness</a><a className="btn btn--lg" href="/pricing">Pricing</a></Actions>
      </Hero>
      <Section id="packages" title="The four packages">
        <div className="pkgs">{PILOTS.map((p) => { const r = PILOT_RULES[p.sku]; return (
          <article key={p.sku} className="card pkg" data-pilot={p.sku}>
            <h3>{p.name}</h3>
            <p className="pkg__price"><b>{usd(p.cents)}</b> <span>once · {p.duration}</span></p>
            <p>{p.scope}.</p>
            <dl className="pkg__scope"><div><dt>Rooms</dt><dd>up to {r.roomLimit}</dd></div><div><dt>Sites</dt><dd>up to {r.siteLimit}</dd></div><div><dt>Live sources</dt><dd>{r.connectorLimit || 'none'}</dd></div></dl>
            <p className="caveat">{p.caveat}.</p>
          </article>); })}
        </div>
      </Section>
      <Section id="readiness" title="Pilot readiness" lead="Four questions. The answer is worked out on this page from what you select: nothing is sent anywhere, and nothing here asks for a password, a key or any other credential." tone="deep">
        <div className="wiz" data-wizard>
          <fieldset className="wiz__q"><legend><span className="wiz__n" aria-hidden="true">1</span>Which pilot?</legend>
            <div className="opts">{PILOTS.map((p, i) => <label key={p.sku} className="opt"><input type="radio" name="sku" value={p.sku} defaultChecked={i === 0} /><span><b>{p.name}</b><small>{usd(p.cents)} once · {p.duration}</small></span></label>)}</div>
          </fieldset>
          <fieldset className="wiz__q"><legend><span className="wiz__n" aria-hidden="true">2</span>Which source platform?</legend>
            <label className="wiz__field" htmlFor="wiz-connector">The system the pilot would read from</label>
            <select id="wiz-connector" name="connector" defaultValue="NONE" aria-describedby="wiz-connector-note">
              <option value="NONE">No live source (a synthetic tenant only)</option>
              {cats.map((cat) => <optgroup key={cat} label={cat}>{CONNECTORS.filter((c) => c.category === cat).map((c) => { const ch = choiceOf(c); return <option key={c.key} value={c.key} data-model={ch.model} data-maturity={ch.maturity}>{ch.label}</option>; })}</optgroup>)}
              <option value="NOT_LISTED">A platform that is not listed</option>
            </select>
            <p className="wiz__note" id="wiz-connector-note">The {CONNECTORS.length} entries are the connector catalogue: target platforms named for interface planning. No entry implies a partnership, a certification or a working connection, and none has a verified connector today.</p>
          </fieldset>
          <fieldset className="wiz__q"><legend><span className="wiz__n" aria-hidden="true">3</span>How much is in scope?</legend>
            <div className="wiz__row"><label className="wiz__field">Rooms<input type="number" name="rooms" min={1} max={999} step={1} defaultValue={1} inputMode="numeric" /></label><label className="wiz__field">Sites<input type="number" name="sites" min={1} max={99} step={1} defaultValue={1} inputMode="numeric" /></label></div>
          </fieldset>
          <fieldset className="wiz__q"><legend><span className="wiz__n" aria-hidden="true">4</span>Who can approve?</legend>
            <div className="opts opts--stack">
              <label className="opt"><input type="radio" name="approver" value="TENANT_ADMIN" /><span><b>I can</b><small>I am the administrator who accepts the terms and authorizes the source</small></span></label>
              <label className="opt"><input type="radio" name="approver" value="CAN_OBTAIN" /><span><b>Someone I can ask</b><small>I know the administrator and will ask them</small></span></label>
              <label className="opt"><input type="radio" name="approver" value="UNKNOWN" defaultChecked /><span><b>Not sure yet</b><small>I do not know who that is</small></span></label>
            </div>
          </fieldset>
          <div className="wiz__go"><button className="btn btn--primary btn--lg" type="button" data-check>Check readiness</button><noscript><p className="wiz__note">The readiness check needs JavaScript. The four packages above and the enquiry form below work without it.</p></noscript></div>
          <section className="wiz__result" data-result tabIndex={-1} aria-live="polite" aria-labelledby="wiz-result-h" hidden><h3 id="wiz-result-h">Your readiness</h3><div data-result-body /></section>
        </div>
        <dl className="rstates">{READINESS_STATES.map((s) => <div key={s} data-s={s}><dt>{READINESS_MEANING[s].label}</dt><dd>{READINESS_MEANING[s].meaning}</dd></div>)}</dl>
      </Section>
      <Section id="what-payment-grants" title="What a purchase grants, and what it does not">
        <div className="cards cards--3">
          <article className="card"><h3>The software, for that scope</h3><p>A confirmed payment grants the software entitlement for the pilot you bought and its limits. Nothing more.</p></article>
          <article className="card"><h3>Never a connection</h3><p>Reading from one of your systems needs a separate authorization by your own administrator, through that system’s own sign-in. Payment alone never opens it.</p></article>
          <article className="card"><h3>Never control</h3><p>A pilot is read-only. No device is commanded, moved or reconfigured, and no network is scanned.</p></article>
        </div>
      </Section>
      <Section id="enquire" title="The next step" lead="Self-serve purchase is not open yet, so there is no checkout here. Send your scope through the enquiry form and a person replies with the terms in writing." tone="deep">
        <div className="enquire"><h3>Send your pilot scope</h3><p>Name the pilot, the source platform, the rooms and sites, and who can approve. The readiness check above gives you the words.</p><EnquiryLink source="website-pilot" primary id="pilots" /></div>
      </Section>
    </>
  ) };
}

export const commercialPages = (): Page[] => [pricingPage(), cataloguePage(), pilotsPage()];
