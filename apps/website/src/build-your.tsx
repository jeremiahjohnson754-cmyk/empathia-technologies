// Build Your Empathia (founder 18 Nov 2026 19:39: "once an investor or an enterprise buyer can select 150 rooms, configure their
// environment, see transparent annual and long-term costs, compare equivalent offerings, and instantly open the actual product
// demonstration … That's an interactive enterprise sales platform"; Price Book 3, 19 Nov 04:45).
// Pre-rendered with the 50-room headquarters estate, so the page reads complete without its script; the controls are added by
// src/build.ts (dist/build.js) and are hidden until it runs, so nothing on the page is a dead control.
import React from 'react';
import { PRICE_BOOK, usd, platformFee, BUNDLES } from '../../../packages/commercial/src/index.ts';
import { PRODUCT_LAUNCHES, launchHref } from '../../../packages/ui/src/launches.ts';
import { EnquiryLink } from './ui.js';
import { PROFILES, ADDONS, ROOM_BUNDLES, addonInfo, DEFAULT_STATE, compute, receiptHtml, stateHash, rangeText, roomsOf, type BuildState } from './build-view.js';

const Num = ({ id, label, min, max, value, wide }: { id: string; label: string; min: number; max: number; value: number; wide?: boolean }) => (
  <label className={`by__num${wide ? ' by__num--wide' : ''}`}><span>{label}</span>
    <input type="number" inputMode="numeric" min={min} max={max} step={1} defaultValue={value} data-by={id} /></label>
);
/** one room group: its rooms, its devices in total, and what those rooms can hold */
const Group = ({ kind, title, says, rooms, devices }: { kind: 'small' | 'mid' | 'large'; title: string; says: string; rooms: number; devices: number }) => (
  <fieldset className="by__group" data-group={kind}><legend>{title} <small>{says}</small></legend>
    <div className="by__pair"><Num id={`${kind}Rooms`} label="Rooms" min={0} max={100000} value={rooms} /><Num id={`${kind}Devices`} label="Devices in them" min={0} max={100000000} value={devices} wide /></div>
    <p className="by__range" data-by-range={kind}>{rangeText(kind, rooms)}</p>
  </fieldset>
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
  const e = compute(DEFAULT_STATE); const s = DEFAULT_STATE;
  const hw = PRICE_BOOK.hardware; const S = PRICE_BOOK.rooms.standard; const L = PRICE_BOOK.rooms.large;
  const pro = PRODUCT_LAUNCHES['pro']!;
  return (
    <section className="section by" id="build" aria-labelledby="by-h" data-build>
      <div className="wrap by__wrap">
        <div className="by__head">
          <h2 id="by-h">Build your Empathia</h2>
          <p className="lede">Your rooms, their devices, your people and options in; what it costs every year, once, and over five years, line by line, discounts included. Every figure is a proposed list price from price book 3, added up in front of you.</p>
          <p className="by__nojs" data-by-nojs>Shown: a 50-room headquarters. With scripts on, every number here can be changed; the four estates below need no script.</p>
        </div>
        <div className="by__grid">
          <form className="by__controls" data-by-controls hidden aria-label="Your estate" noValidate>
            <fieldset className="by__presets"><legend>Start from an estate</legend>
              {PROFILES.map((p, i) => <button key={p.rooms} type="button" className="by__preset" data-preset={i} aria-pressed={p.rooms === roomsOf(s) ? 'true' : 'false'}><b>{p.rooms} rooms</b><span>{p.says}</span></button>)}
            </fieldset>
            <Group kind="small" title="Rooms with up to 8 devices" says={`${usd(S.cents)} a room a month, devices included`} rooms={s.smallRooms} devices={s.smallDevices} />
            <Group kind="mid" title="Rooms with 9 to 19 devices" says={`${usd(S.cents)} a room, 8 devices included, then ${usd(S.perDeviceCents)} a device`} rooms={s.midRooms} devices={s.midDevices} />
            <Group kind="large" title="Large rooms, 20 devices or more" says={`${usd(L.cents)} a room, 20 devices included, then ${usd(L.perDeviceCents)} a device`} rooms={s.largeRooms} devices={s.largeDevices} />
            <p className="by__hint by__rule">Devices are the verified, unique assets in service in each room’s commissioned baseline; spares, stock, retired devices and virtual endpoints do not count, and device charges are never retroactive.</p>
            <div className="by__q"><label htmlFor="by-users"><b>Licensed users</b><span>Named staff; guests are never charged</span></label>
              <input id="by-users" type="number" inputMode="numeric" min={0} max={1000000} step={1} defaultValue={s.users} data-by="users" />
              <input type="range" min={0} max={2000} step={1} defaultValue={s.users} data-by-range-users aria-label="Licensed users, slider" /></div>
            <label className="by__small" hidden><input type="checkbox" data-by-small /><span><b>We started with 24 rooms or fewer</b><small>Growing to 30 rooms then adds at most {usd(PRICE_BOOK.growth.grace.capCents)} a year to the platform fee</small></span></label>
            <fieldset className="by__adds"><legend>Add products <small>v1.5 list prices</small></legend>
              {ADDONS.map((a) => { const i = addonInfo(a.sku); return <label key={a.sku} className="by__add"><input type="checkbox" data-by-add={a.sku} /><span><b>{i.name}</b><small>{usd(i.cents)} {i.unit}</small></span></label>; })}
            </fieldset>
            <div className="by__q by__outside" data-by-outside hidden><label htmlFor="by-outside"><b>Assets outside rooms</b><span>Spares, stock and loaners Search Party manages</span></label>
              <input id="by-outside" type="number" inputMode="numeric" min={0} max={100000000} step={1} defaultValue={0} data-by="outside" /></div>
            <label className="by__bundle"><span><b>Bundle</b><small>A bundle’s discount applies to its own products; room licences take it or the volume discount, whichever is larger</small></span>
              <select data-by-bundle defaultValue=""><option value="">No bundle</option>{ROOM_BUNDLES.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.discount} off)</option>)}</select></label>
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
            <p className="by__label"><span className="tag tag--declared"><i aria-hidden="true" />Price book 3</span> {PRICE_BOOK.label}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const stateOf = (p: (typeof PROFILES)[number]): BuildState => ({ ...DEFAULT_STATE, smallRooms: p.smallRooms, smallDevices: p.smallDevices, midRooms: p.midRooms, midDevices: p.midDevices, largeRooms: p.largeRooms, largeDevices: p.largeDevices, users: p.users });

/** The four estates side by side, each computed by estimate() and each one click from the builder. */
export function FourEstates() {
  const cols = PROFILES.map((p) => ({ p, e: compute(stateOf(p)) }));
  const row = (label: string, f: (c: (typeof cols)[number]) => React.ReactNode, k: string) => <tr data-row={k}><th scope="row">{label}</th>{cols.map((c) => <td key={c.p.rooms}>{f(c)}</td>)}</tr>;
  const amt = (...ids: string[]) => (c: (typeof cols)[number]) => { const t = c.e.recurring.filter((x) => ids.includes(x.id)).reduce((a, l) => a + l.cents, 0); return t > 0 ? usd(t) : t < 0 ? `−${usd(-t)}` : '—'; };
  return (
    <div className="tablewrap" role="region" aria-label="Four estates, side by side" tabIndex={0}><table className="terms by-four" data-four>
      <caption>Four estates at proposed list prices, before tax, with no add-ons and no hardware</caption>
      <thead><tr><th scope="col">Estate</th>{cols.map((c) => <th scope="col" key={c.p.rooms} data-col={c.p.rooms}>{c.p.rooms} rooms<small>{c.p.says}</small></th>)}</tr></thead>
      <tbody>
        {row('Rooms: up to 8 / 9–19 / 20+ devices', (c) => `${c.p.smallRooms} / ${c.p.midRooms} / ${c.p.largeRooms}`, 'groups')}
        {row('Devices', (c) => c.e.devices.toLocaleString('en-US'), 'devices')}
        {row('Licensed users', (c) => c.p.users, 'users')}
        {row('Platform fee, a year', (c) => usd(c.e.band.cents), 'platform')}
        {row('Room licences, a year', amt('ROOM-STD', 'ROOM-LRG'), 'rooms')}
        {row('Device charges, a year', amt('DEVICE-STD', 'DEVICE-LRG'), 'devices-charged')}
        {row('Volume discount, a year', amt('DISCOUNT-VOLUME'), 'volume')}
        {row('Licensed users, a year', amt('USER'), 'user')}
        {row('Every year', (c) => <b>{usd(c.e.annualRecurringCents)}</b>, 'annual')}
        {row('Three years', (c) => usd(c.e.threeYearCents), 'three')}
        {row('Five years', (c) => usd(c.e.fiveYearCents), 'five')}
        {row('Per room, a year', (c) => usd(c.e.perRoomAnnualCents), 'per-room')}
        {row('Per device, a year', (c) => (c.e.perDeviceAnnualCents === null ? '—' : usd(c.e.perDeviceAnnualCents)), 'per-device')}
        <tr><th scope="row"><span className="sr-only">Open</span></th>{cols.map((c) => <td key={c.p.rooms}><a href={`/pricing${stateHash(stateOf(c.p))}`} data-open={c.p.rooms}>Change these numbers</a></td>)}</tr>
      </tbody>
    </table></div>
  );
}

/** What makes up the price: the platform fee, the room licences and devices, people, discounts, hardware and implementation. */
export function PriceParts() {
  const b = PRICE_BOOK; const g = b.growth; const S = b.rooms.standard; const L = b.rooms.large;
  const at = (d: number) => usd((d >= 20 ? L.cents + Math.max(0, d - 20) * L.perDeviceCents : S.cents + Math.max(0, d - 8) * S.perDeviceCents));
  return (
    <div className="by-parts">
      <article className="card" data-part="platform"><h3>Platform fee, once a year</h3>
        <div className="tablewrap" role="region" aria-label="Platform fee by estate size" tabIndex={0}><table className="terms"><thead><tr><th scope="col">Rooms</th><th scope="col">A year</th></tr></thead>
          <tbody>{b.platform.map((p) => <tr key={p.id} data-band={p.id}><th scope="row">{`${p.from}–${p.to}`}</th><td><b>{usd(p.cents)}</b></td></tr>)}
            <tr data-band="PLATFORM-GROWTH"><th scope="row">{g.from}–44</th><td><b>{usd(g.baseCents)} + {usd(g.perRoomCents)}</b> for each room past {g.from - 1}</td></tr>
            <tr data-band="PLATFORM-ENTERPRISE"><th scope="row">45 or more</th><td><b>{usd(g.enterpriseCents)}</b>, firm: it does not rise with more rooms</td></tr></tbody></table></div>
        <p>No room added past 24 raises the fee by more than {usd(g.perRoomCents)} a year. If you started with {g.grace.startedAtOrBelow} rooms or fewer, growing to {g.grace.throughRooms} adds at most {usd(g.grace.capCents)} (so {usd(platformFee(g.grace.throughRooms, true).cents)} at {g.grace.throughRooms} rooms), then {usd(g.perRoomCents)} a room again, reaching {usd(g.enterpriseCents)} at 48 rooms. {g.notice}</p>
        <p>{g.explains} Anything beyond the standard platform is its own named line on a quote, never part of this fee.</p></article>
      <article className="card" data-part="rooms"><h3>Rooms and their devices, by the month</h3>
        <ul className="prices"><li data-rate={S.id}><div className="prices__what"><h4>Standard room</h4><p>Up to {b.roomRule.largeFromDevices - 1} devices; {S.includedDevices} included, then {usd(S.perDeviceCents)} a device a month.</p></div><div className="price"><b>{usd(S.cents)}</b><span>{S.unit}</span></div></li>
          <li data-rate={L.id}><div className="prices__what"><h4>Large room</h4><p>{b.roomRule.largeFromDevices} devices or more; {L.includedDevices} included, then {usd(L.perDeviceCents)} a device a month.</p></div><div className="price"><b>{usd(L.cents)}</b><span>{L.unit}</span></div></li></ul>
        <p>A room with 8 devices is {at(8)}, with 12 {at(12)}, with 19 {at(19)}, with 20 {at(20)}, with 25 {at(25)}. No added device raises a room by more than {usd(L.perDeviceCents)}.</p>
        <p>What counts: {b.roomRule.counts}; {b.roomRule.excludes} do not count. {b.roomRule.billing}</p></article>
      <article className="card" data-part="users"><h3>People, by the month</h3>
        <ul className="prices"><li data-rate={b.user.id}><div className="prices__what"><h4>{b.user.name}</h4><p>{b.user.note}</p></div><div className="price"><b>{usd(b.user.cents)}</b><span>{b.user.unit}</span></div></li></ul></article>
      <article className="card" data-part="discounts"><h3>Discounts, shown as lines of their own</h3>
        <p><b>Volume:</b> the monthly licence of rooms {b.volume.tranches.map((t) => `${t.from}${t.to ? `–${t.to}` : ' and up'} is ${t.pct} % off`).join(', ')}; standard rooms are counted first, then large rooms. Device charges are not volume-discounted, so adding a room or a device never lowers a bill.</p>
        <p><b>Bundles:</b> each of the {BUNDLES.length} bundles takes its discount off its own products. In the three that held Core and the Pro room, the platform fee and the room licences take their place. {b.volume.rule}</p>
        <p><b>Search Party</b> counts {b.searchParty.counts}.</p></article>
      <article className="card" data-part="once"><h3>Once, and only if you choose</h3>
        <ul className="prices">{b.hardware.map((h) => <li key={h.id} data-rate={h.id}><div className="prices__what"><h4>{h.name}</h4><p>{h.note}</p></div><div className="price"><b>{usd(h.cents)}</b><span>proposed, {h.unit}</span></div></li>)}</ul>
        <p>Implementation is a one-time quote set by your rooms, sites, integrations, data and training. It is never a fixed figure on this site.</p>
        <p><a href="/fieldlink">What FieldLink is, and why you do not need it</a></p></article>
      <article className="card" data-part="protection"><h3>If you are already a customer</h3>
        <ul className="by-protect">{b.protection.terms.map((t) => <li key={t}>{t}</li>)}</ul></article>
    </div>
  );
}
