// Build Your Empathia (founder 18 Nov 2026 19:39: "once an investor or an enterprise buyer can select 150 rooms, configure their
// environment, see transparent annual and long-term costs, compare equivalent offerings, and instantly open the actual product
// demonstration … That's an interactive enterprise sales platform"; 20:51: "the updated pricing is king").
// Pre-rendered with the founder's own 50-room illustration, so the page reads complete without its script; the controls are added by
// src/build.ts (dist/build.js) and are hidden until it runs, so nothing on the page is a dead control.
import React from 'react';
import { PRICE_BOOK, usd, platformFee } from '../../../packages/commercial/src/index.ts';
import { PRODUCT_LAUNCHES, launchHref } from '../../../packages/ui/src/launches.ts';
import { EnquiryLink } from './ui.js';
import { PROFILES, ADDONS, addonInfo, DEFAULT_STATE, compute, receiptHtml, stateHash } from './build-view.js';

const Qty = ({ id, label, hint, min, max, value }: { id: string; label: string; hint: string; min: number; max: number; value: number }) => (
  <div className="by__q">
    <label htmlFor={`by-${id}`}><b>{label}</b><span>{hint}</span></label>
    <input id={`by-${id}`} type="number" inputMode="numeric" min={min} max={max} step={1} defaultValue={value} data-by={id} />
    <input type="range" min={min} max={max} step={1} defaultValue={value} data-by-range={id} aria-label={`${label}, slider`} />
  </div>
);
const Step = ({ id, name, price }: { id: 'nano' | 'edge' | 'pulse'; name: string; price: number }) => (
  <div className="by__step" role="group" aria-label={`FieldLink ${name}`}>
    <span className="by__stepname"><b>{name}</b><small>{usd(price)} each, proposed</small></span>
    <span className="by__stepper">
      <button type="button" className="by__sb" data-by-step={id} data-d="-1" aria-label={`One fewer ${name}`}>−</button>
      <output data-by-out={id} aria-live="polite">0</output>
      <button type="button" className="by__sb" data-by-step={id} data-d="1" aria-label={`One more ${name}`}>+</button>
    </span>
  </div>
);

export function BuildYour({ demoUrl }: { demoUrl: string }) {
  const e = compute(DEFAULT_STATE);
  const hw = PRICE_BOOK.hardware;
  const pro = PRODUCT_LAUNCHES['pro']!;
  return (
    <section className="section by" id="build" aria-labelledby="by-h" data-build>
      <div className="wrap by__wrap">
        <div className="by__head">
          <h2 id="by-h">Build your Empathia</h2>
          <p className="lede">Rooms, people and options in; what it costs every year, once, and over five years out, line by line. Every figure is a proposed list price from price book 2, added up in front of you.</p>
          <p className="by__nojs" data-by-nojs>Shown: the founder’s 50-room illustration. With scripts on, every number here can be changed; the four estates below need no script.</p>
        </div>
        <div className="by__grid">
          <form className="by__controls" data-by-controls hidden aria-label="Your estate" noValidate>
            <fieldset className="by__presets"><legend>Start from an estate</legend>
              {PROFILES.map((p, i) => <button key={p.rooms} type="button" className="by__preset" data-preset={i} aria-pressed={p.rooms === DEFAULT_STATE.rooms ? 'true' : 'false'}><b>{p.rooms} rooms</b><span>{p.says}</span></button>)}
            </fieldset>
            <Qty id="rooms" label="Rooms" hint="Every room Empathia looks after" min={1} max={1000} value={DEFAULT_STATE.rooms} />
            <Qty id="large" label="Large rooms" hint={`${PRICE_BOOK.roomRule.largeFromDevices} or more devices in service`} min={0} max={1000} value={DEFAULT_STATE.large} />
            <Qty id="users" label="Licensed users" hint="Named staff; guests are never charged" min={0} max={2000} value={DEFAULT_STATE.users} />
            <label className="by__small" hidden><input type="checkbox" data-by-small /><span><b>We started with 24 rooms or fewer</b><small>Growing to 30 rooms then adds at most {usd(PRICE_BOOK.growth.grace.capCents)} a year to the platform fee</small></span></label>
            <Qty id="devices" label="Devices (optional)" hint="For the cost per device and Search Party, priced per device" min={0} max={20000} value={DEFAULT_STATE.devices} />
            <fieldset className="by__adds"><legend>Add products <small>v1.5 list prices</small></legend>
              {ADDONS.map((a) => { const i = addonInfo(a.sku); return <label key={a.sku} className="by__add"><input type="checkbox" data-by-add={a.sku} /><span><b>{i.name}</b><small>{usd(i.cents)} {i.unit}</small></span></label>; })}
            </fieldset>
            <fieldset className="by__hw"><legend>FieldLink hardware <small>optional; Empathia works without it</small></legend>
              <Step id="nano" name="Nano" price={hw[0]!.cents} /><Step id="edge" name="Edge" price={hw[1]!.cents} /><Step id="pulse" name="Pulse" price={hw[2]!.cents} />
            </fieldset>
            <p className="by__mini" data-by-mini><span>Every year <b data-by-mini-annual>{usd(e.annualRecurringCents)}</b></span><a href="#by-receipt">See every line</a></p>
          </form>
          <div className="by__out">
            <div className="by__receipt" id="by-receipt" tabIndex={-1} data-by-receipt aria-live="polite" aria-atomic="false" dangerouslySetInnerHTML={{ __html: receiptHtml(e) }} />
            <div className="by__act">
              <EnquiryLink source="website-pricing" primary id="build" />
              <button type="button" className="btn" data-by-copy hidden>Copy this estimate</button>
              <a className="btn" href={launchHref(demoUrl, pro, '/pricing#build')} data-launch={pro.id}>See it in the demonstration</a>
            </div>
            <p className="by__hint" data-by-hint hidden>Copied estimates paste straight into the form’s message, with a link back to these numbers.</p>
            <p className="by__label"><span className="tag tag--declared"><i aria-hidden="true" />Price book 2</span> {PRICE_BOOK.label}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The four estates side by side (directive §7), each computed by estimate() and each one click from the builder. */
export function FourEstates() {
  const cols = PROFILES.map((p) => ({ p, e: compute({ ...DEFAULT_STATE, rooms: p.rooms, large: p.large, users: p.users }) }));
  const row = (label: string, f: (c: (typeof cols)[number]) => React.ReactNode, k: string) => <tr data-row={k}><th scope="row">{label}</th>{cols.map((c) => <td key={c.p.rooms}>{f(c)}</td>)}</tr>;
  const amt = (id: string) => (c: (typeof cols)[number]) => { const l = c.e.recurring.find((x) => x.id === id); return l ? usd(l.cents) : '—'; };
  return (
    <div className="tablewrap" role="region" aria-label="Four estates, side by side" tabIndex={0}><table className="terms by-four" data-four>
      <caption>Four estates at proposed list prices, before tax, with no add-ons and no hardware</caption>
      <thead><tr><th scope="col">Estate</th>{cols.map((c) => <th scope="col" key={c.p.rooms} data-col={c.p.rooms}>{c.p.rooms} rooms<small>{c.p.says}</small></th>)}</tr></thead>
      <tbody>
        {row('Large rooms', (c) => c.p.large, 'large')}
        {row('Licensed users', (c) => c.p.users, 'users')}
        {row('Platform fee, a year', (c) => `${usd(c.e.band.cents)}${c.e.band.startingAt ? ' (from)' : ''}`, 'platform')}
        {row('Standard rooms, a year', amt('ROOM-STD'), 'std')}
        {row('Large rooms, a year', amt('ROOM-LRG'), 'lrg')}
        {row('Licensed users, a year', amt('USER'), 'user')}
        {row('Every year', (c) => <b>{usd(c.e.annualRecurringCents)}</b>, 'annual')}
        {row('Three years', (c) => usd(c.e.threeYearCents), 'three')}
        {row('Five years', (c) => usd(c.e.fiveYearCents), 'five')}
        {row('Per room, a year', (c) => usd(c.e.perRoomAnnualCents), 'per-room')}
        {row('Per user, a year', (c) => (c.e.perUserAnnualCents === null ? '—' : usd(c.e.perUserAnnualCents)), 'per-user')}
        <tr><th scope="row"><span className="sr-only">Open</span></th>{cols.map((c) => <td key={c.p.rooms}><a href={`/pricing${stateHash({ ...DEFAULT_STATE, rooms: c.p.rooms, large: c.p.large, users: c.p.users })}`} data-open={c.p.rooms}>Change these numbers</a></td>)}</tr>
      </tbody>
    </table></div>
  );
}

/** What makes up the price: the platform fee bands, the two room rates, the user rate, hardware and implementation. */
export function PriceParts() {
  const b = PRICE_BOOK; const g = b.growth;
  return (
    <div className="by-parts">
      <article className="card" data-part="platform"><h3>Platform fee, once a year</h3>
        <div className="tablewrap" role="region" aria-label="Platform fee by estate size" tabIndex={0}><table className="terms"><thead><tr><th scope="col">Rooms</th><th scope="col">A year</th></tr></thead>
          <tbody>{b.platform.map((p) => <tr key={p.id} data-band={p.id}><th scope="row">{`${p.from}–${p.to}`}</th><td><b>{usd(p.cents)}</b></td></tr>)}
            <tr data-band="PLATFORM-GROWTH"><th scope="row">{g.from}–{g.from + Math.ceil((g.enterpriseCents - g.baseCents) / g.perRoomCents) - 2}</th><td><b>{usd(g.baseCents)} + {usd(g.perRoomCents)}</b> for each room past {g.from - 1}</td></tr>
            <tr data-band="PLATFORM-ENTERPRISE"><th scope="row">{g.from + Math.ceil((g.enterpriseCents - g.baseCents) / g.perRoomCents) - 1} or more</th><td><b>from {usd(g.enterpriseCents)}</b></td></tr></tbody></table></div>
        <p>No room added past 24 raises the fee by more than {usd(g.perRoomCents)} a year. If you started with {g.grace.startedAtOrBelow} rooms or fewer, growing to {g.grace.throughRooms} adds at most {usd(g.grace.capCents)} (so {usd(platformFee(g.grace.throughRooms, true).cents)} at {g.grace.throughRooms} rooms), then {usd(g.perRoomCents)} a room again. {g.notice}</p>
        <p>{g.explains} The enterprise fee for a given estate is confirmed in a quote.</p></article>
      <article className="card" data-part="rooms"><h3>Rooms, by the month</h3>
        <ul className="prices"><li data-rate={b.rooms.standard.id}><div className="prices__what"><h4>Standard room</h4><p>Up to {b.roomRule.largeFromDevices - 1} devices in service.</p></div><div className="price"><b>{usd(b.rooms.standard.cents)}</b><span>{b.rooms.standard.unit}</span></div></li>
          <li data-rate={b.rooms.large.id}><div className="prices__what"><h4>Large room</h4><p>{b.roomRule.largeFromDevices} or more devices in service.</p></div><div className="price"><b>{usd(b.rooms.large.cents)}</b><span>{b.rooms.large.unit}</span></div></li></ul>
        <p>What counts, as proposed: {b.roomRule.counts}; {b.roomRule.excludes} do not count. The rule waits for approval.</p></article>
      <article className="card" data-part="users"><h3>People, by the month</h3>
        <ul className="prices"><li data-rate={b.user.id}><div className="prices__what"><h4>{b.user.name}</h4><p>{b.user.note}</p></div><div className="price"><b>{usd(b.user.cents)}</b><span>{b.user.unit}</span></div></li></ul></article>
      <article className="card" data-part="once"><h3>Once, and only if you choose</h3>
        <ul className="prices">{b.hardware.map((h) => <li key={h.id} data-rate={h.id}><div className="prices__what"><h4>{h.name}</h4><p>{h.note}</p></div><div className="price"><b>{usd(h.cents)}</b><span>proposed, {h.unit}</span></div></li>)}</ul>
        <p>Implementation is a one-time quote set by your rooms, sites, integrations, data and training. It is never a fixed figure on this site.</p>
        <p><a href="/fieldlink">What FieldLink is, and why you do not need it</a></p></article>
    </div>
  );
}
