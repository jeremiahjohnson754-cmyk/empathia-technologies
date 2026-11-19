// Pricing and pilots (handoff v1.8 §4, ADR-023; founder direction 2026-11-09: the price list and the pilot options appear on the
// corporate site). Every price on these pages is read from the generated catalogue (packages/commercial/src/generated/catalog.ts, made
// from the founder's price list by packages/commercial/scripts/generate.mjs) and printed by usd(): no price is typed in this file.
// Each line carries its scope and limitation text; each pilot carries its go-live caveat. Self-serve purchase is not open: the only way
// forward from either page is the existing enquiry form (apps/website/src/enquiry.ts, unchanged). The readiness check on /pilots runs in
// the browser (src/pilot.ts) from what the visitor selects; it sends nothing anywhere and asks for no credential.
import React from 'react';
import type { Page } from './content';
import { Hero, Section, Actions, Note, EnquiryLink } from './ui.js';
import { SKUS, BUNDLES, PILOTS, SIGNAL_TERMS, FAMILIES, PRICE_LABEL, PILOT_RULES, READINESS_STATES, READINESS_MEANING, PRICE_BOOK, usd, unitLabel, choiceOf, isSuperseded } from '../../../packages/commercial/src/index.ts';
import { BuildYour, FourEstates, PriceParts } from './build-your.js';
import { ADDONS } from './build-view.js';
import { CONNECTORS } from '../../../packages/commercial/src/generated/connectors.ts';

const CAVEAT = PILOTS[0]!.caveat;
const REPLACED_NAME: Record<string, string> = { 'PRO-ROOM': 'Room licences (standard and large)', 'CORE-ENTERPRISE': 'Annual platform fee', 'CORE-STARTER': 'Annual platform fee', 'SEAT-ENTERPRISE': 'Licensed user' };
/** a product's name; a line the price books replaced is named by what replaced it */
const skuName = (id: string) => REPLACED_NAME[id] || SKUS.find((s) => s.sku === id)?.name || id;
const Price = ({ cents, unit }: { cents: number; unit: string }) => <div className="price"><b>{cents === 0 ? <>Free <span className="price__zero">({usd(0)})</span></> : usd(cents)}</b><span>{unit}</span></div>;
const ListPrice = () => <p className="listprice" data-price-label><span className="tag tag--declared"><i aria-hidden="true" />List price</span> {PRICE_LABEL} Prices are in US dollars, before any applicable tax.</p>;
const signal = (id: string) => SKUS.find((s) => s.sku === id)!;

const ListPrice3 = () => <p className="listprice" data-price-label="3"><span className="tag tag--declared"><i aria-hidden="true" />Proposed list prices</span> {PRICE_BOOK.label} Self-serve purchase is not open yet.</p>;
const pro = PRICE_BOOK.pilots[0]!;
/** The Pro pilot (founder 20:51: "maybe the $19.99 price can be a pilot package price for just pro and another complimentary product
 * item"; its limits and conversion terms set at 04:45: "Pilots must have explicit limits, customer-approved conversion, and no unexpected
 * charges"). The two terms the founder has not yet decided are shown apart, as still to be confirmed. */
const ProPilot = () => (
  <li data-pilot={pro.id} className="by-pilot"><div className="prices__what"><h3>{pro.name}</h3>
    <p>{pro.includes}: {pro.complementaryChoices.map((c) => skuName(c)).join(', or ')}.</p>
    <ul className="by-pilot__terms" aria-label="Pilot terms">{pro.terms.map((t) => <li key={t}>{t}.</li>)}</ul>
    {pro.proposedTerms.length ? <p className="by-pilot__open"><b>Still to be confirmed:</b> {pro.proposedTerms.join('; ')}.</p> : null}</div>
    <Price cents={pro.cents} unit={pro.unit} /></li>
);

function pricingPage(demoUrl: string): Page {
  return { path: '/pricing', nav: 'Pricing', script: 'build.js', title: 'Pricing: build your Empathia — Empathia Technologies', description: 'Choose your rooms, people and options and see the proposed list price every year, once, and over three and five years, line by line; four estates side by side; the pilots.', body: (
    <>
      <Hero label="Pricing" title="See what Empathia costs before you talk to anyone" lead="A platform fee once a year, a licence for each room and each person by the month, and optional hardware once. Choose your estate and every line is added up in front of you.">
        <ListPrice3 />
        <Actions><a className="btn btn--primary btn--lg" href="#build">Build your Empathia</a><a className="btn btn--lg" href="#four">Four estates side by side</a></Actions>
      </Hero>
      <BuildYour demoUrl={demoUrl} />
      <Section id="four" title="Four estates, side by side" lead="Ten, fifty, a hundred and fifty and five hundred rooms, each with its own room mix and number of people, so no estate borrows another’s assumptions." tone="deep"><FourEstates /></Section>
      <Section id="parts" title="What makes up the price" lead="Each part priced on its own and never counted twice; discounts are lines of their own."><PriceParts /></Section>
      <Section id="pilot-prices" title="Start with a pilot" lead="Bounded, with a fixed scope and length. Discounts never apply to a pilot.">
        <ul className="prices prices--grid"><ProPilot />{PILOTS.map((p) => <li key={p.sku} data-sku={p.sku}><div className="prices__what"><h3>{p.name}</h3><p>{p.scope}.</p><p className="prices__sku">{p.sku}</p></div><Price cents={p.cents} unit={`once, ${p.duration}`} /></li>)}</ul>
        <p className="caveat">{CAVEAT}.</p>
        <Actions><a className="btn btn--primary" href="/pilots">Check which pilot fits</a></Actions>
      </Section>
      <Section id="adds" title="Products you can add" lead="Priced by the month from the v1.5 list, which price book 3 keeps. Per-room products follow your room count in the builder; Search Party counts the assets the rooms do not already charge." tone="deep">
        <ul className="prices prices--grid">{ADDONS.map((a) => { const x = SKUS.find((k) => k.sku === a.sku)!; return <li key={a.sku} data-sku={a.sku}><div className="prices__what"><h3>{x.name}</h3><p>{x.scope}.</p><p className="prices__sku">{x.sku}</p></div><Price cents={x.cents} unit={unitLabel(x.billingUnit)} /></li>; })}</ul>
        <Actions><a className="btn" href="/pricing/catalogue" data-catalogue>Every product, line by line</a></Actions>
      </Section>
      <Section id="signal" title="SIGNAL and Learn" lead={`${signal('SIGNAL-FREE').scope}: free. The full story is a subscription.`}>
        <ul className="prices prices--grid">{SKUS.filter((x) => x.family === 'SIGNAL').map((x) => <li key={x.sku} data-sku={x.sku}><div className="prices__what"><h3>{x.name}</h3><p>{x.scope}.</p><p className="prices__sku">{x.sku}</p></div><Price cents={x.cents} unit={unitLabel(x.billingUnit)} /></li>)}</ul>
        <Actions><a className="btn" href="/pricing/catalogue#signal">Terms for 3, 6 and 12 months</a></Actions>
      </Section>
      <Section id="how-to-buy" title="How to buy today" lead="Self-serve purchase is not open yet, and no payment is taken on this site. An enquiry reaches a person, who confirms the scope and the terms in writing.">
        <div className="enquire__grid"><div className="enquire"><h3>Send us your estimate</h3><p>Copy it from the builder and paste it into the form; we reply with a quote, including implementation.</p><EnquiryLink source="website-pricing" primary id="pricing" /></div>
          <div className="enquire"><h3>Ask about a pilot</h3><p>Tell us the scope you have in mind.</p><EnquiryLink source="website-pilot" id="pricing-pilot" /></div></div>
      </Section>
    </>
  ) };
}

function cataloguePage(): Page {
  const rest = SKUS.filter((s) => s.family !== 'SIGNAL' && !isSuperseded(s.sku));
  const replaced = PRICE_BOOK.superseded.map((r) => ({ r, s: SKUS.find((x) => x.sku === r.sku)! }));
  const families = FAMILIES.filter((f) => rest.some((s) => s.family === f));
  return { path: '/pricing/catalogue', title: 'Full price list — Empathia Technologies', description: `The Empathia list prices: the platform fee, room and user licences of price book 3, ${SKUS.length - PRICE_BOOK.superseded.length} products by family, ${BUNDLES.length} bundles, the SIGNAL terms and the pilot packages, each with its scope and limits.`, body: (
    <>
      <Hero label="Pricing · full catalogue" title="The full price list, line by line" lead={`The platform fee, room and user licences of price book 3, then ${SKUS.length - PRICE_BOOK.superseded.length} products priced one by one, ${BUNDLES.length} bundles and ${PILOTS.length + PRICE_BOOK.pilots.length} pilots. Every line states what it covers and what it does not.`}>
        <ListPrice />
        <Actions><a className="btn btn--primary btn--lg" href="/pricing#build">Build your Empathia</a><a className="btn btn--lg" href="/pilots">The pilot packages</a></Actions>
      </Hero>
      <Section id="book" title="The platform fee, rooms and people" lead="Price book 3 (founder-approved, 19 November 2026): what every estate pays. The products below are added to it.">
        <ListPrice3 />
        <PriceParts />
        <Actions><a className="btn btn--primary" href="/pricing#build">Build your Empathia</a></Actions>
      </Section>
      <Section id="products" title="Products, by family" lead="Quantities are counted as each line says: per tenant, per managed room, per building, per asset. Vendor subscriptions and services are separate wherever a line says so." tone="deep">
        <div className="fams">{families.map((f) => (
          <section key={f} className="fam" aria-label={f}><h3>{f}</h3>
            <ul className="prices">{rest.filter((s) => s.family === f).map((s) => <li key={s.sku} data-sku={s.sku}><div className="prices__what"><h4>{s.name}</h4><p>{s.scope}.</p><p className="prices__sku">{s.sku}</p></div><Price cents={s.cents} unit={unitLabel(s.billingUnit)} /></li>)}</ul>
          </section>))}
        </div>
      </Section>
      <Section id="replaced" title="Replaced on 18 November 2026" lead="Price book 2 replaced these v1.5 lines everywhere, and price book 3 keeps them replaced. They are listed so that an earlier quote can still be read; none can be ordered.">
        <ul className="prices prices--grid">{replaced.map(({ r, s }) => <li key={r.sku} data-replaced={r.sku}><div className="prices__what"><h3>{s.name}</h3><p>{r.note}</p><p className="prices__sku">{r.sku} · replaced by {skuName(r.sku)}</p></div><div className="price price--was"><b><s>{usd(s.cents)}</s></b><span>{unitLabel(s.billingUnit)}, v1.5</span></div></li>)}</ul>
      </Section>
      <Section id="bundles" title="Bundles" lead="A bundle takes a percentage off each eligible monthly line of its own products. Quantities stay explicit; a bundle is never a flat price.">
        <Note>Price book 3 keeps all {BUNDLES.length} bundles whole, each with every product it held. Where a bundle held the Core platform or the Pro room, the platform fee and the room licences take their place and take its discount. Room licences take the bundle discount or the volume discount, whichever is larger, never both. The builder offers the {BUNDLES.filter((b) => b.skus.includes('PRO-ROOM')).length} bundles that hold room licences; the others are quoted.</Note>
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
        <Note>A SIGNAL Teams seat includes the named-user access its holder needs: the same person is never charged the {PRICE_BOOK.user.name.toLowerCase()} rate as well. The {usd(signal('SIGNAL-TRIAL').cents)} trial is one 14-day trial per person, with a clear choice before any renewal.</Note>
      </Section>
      <Section id="pilot-prices" title="Pilots" lead="Bounded packages with a fixed scope and length. Discounts never apply to them.">
        <ul className="prices prices--grid"><ProPilot />{PILOTS.map((p) => <li key={p.sku} data-sku={p.sku}><div className="prices__what"><h3>{p.name}</h3><p>{p.scope}.</p><p className="prices__sku">{p.sku}</p></div><Price cents={p.cents} unit={`once, ${p.duration}`} /></li>)}</ul>
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
              {cats.map((cat) => <optgroup key={cat} label={cat}>{CONNECTORS.filter((c) => c.category === cat).map((c) => { const ch = choiceOf(c); return <option key={c.key} value={c.key} data-model={ch.model} data-maturity={ch.maturity} data-label={ch.label}>{ch.maturity === 'VERIFIED' ? ch.label : `${ch.label} (planned, not connected)`}</option>; })}</optgroup>)}
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

export const commercialPages = (demoUrl: string): Page[] => [pricingPage(demoUrl), cataloguePage(), pilotsPage()];
