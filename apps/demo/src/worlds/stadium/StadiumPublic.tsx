/**
 * Stadium, public journeys: Attend Game and Find Amenities. Fan-facing and read-only; nothing of the venue's AV, broadcast or network
 * systems is in this module (EMP-REQ-0403/0409).
 */
import { useState, type ComponentType } from 'react';
import { Notice } from '@empathia/ui';
import { Block, Ev, Fresh, Pick, Plan, Rows, ScreenHead, type ScreenProps } from '../kit.js';
import { AMENITIES, FIXTURE, KIND_LABEL, TICKETS, TIMELINE, VIEW, VISITING, ZONES, amenity, centre, metres, nearest, wayTo, type AmenityKind } from './data.public.js';

function AttendGame({ world, journey, config }: ScreenProps) {
  const away = config.roleId === 'away_fan';
  const tickets = away ? [VISITING, ...TICKETS] : TICKETS;
  const [tid, setTid] = useState(tickets[0]!.id);
  const [stepFree, setStepFree] = useState(false);
  const t = tickets.find((x) => x.id === tid) ?? tickets[0]!;
  const way = wayTo(t, stepFree);
  const near = nearest(t.section, ['food', 'restroom', 'accessible-restroom', 'first-aid', 'guest-services']).slice(0, 5);
  return (<>
    <ScreenHead world={world} journey={journey} config={config}><p className="ui-meta">{FIXTURE}. Tickets, routes and statuses are sample data.</p></ScreenHead>
    {away && <Notice tone="info">Visiting-supporter guidance is shown because you chose Away Fan. It is an opt-in preference and is never inferred from where you sit, what you buy or what you say.</Notice>}
    {config.roleId === 'premium_guest' && <Notice tone="info">Premium areas open only with an authorised ticket entitlement. This demonstration holds none, so the public journey is shown.</Notice>}
    <div className="w-two">
      <Block title="Your seat" sub="choose a sample ticket" testId="seat">
        <label className="w-field"><span>Ticket</span>
          <select value={t.id} onChange={(e) => setTid(e.target.value)} data-testid="ticket">{tickets.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
        <label className="w-check"><input type="checkbox" checked={stepFree || !!t.platform} disabled={!!t.platform} onChange={(e) => setStepFree(e.target.checked)} data-testid="step-free" /> <span>Step-free route (no stairs)</span></label>
        <h3>Your way in</h3>
        <ol className="w-way" data-testid="way">{way.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        <p className="ui-meta">About {way.metres} m <Ev state="MODELED" /> from the plan, not surveyed. {stepFree || t.platform ? 'Lifts: ' : 'Gate: '}<Fresh state={amenity(stepFree && !t.platform ? t.lift : t.gate).state} age={amenity(stepFree && !t.platform ? t.lift : t.gate).age} /></p>
      </Block>
      <Plan label={`Plan of ${world.place}: section ${t.section} highlighted, with the way from ${amenity(t.gate).label}${stepFree && !t.platform ? ' by lift' : ''}`} view={VIEW} zones={ZONES} places={AMENITIES.filter((x) => x.kind === 'gate' || x.kind === 'lift')} lit={[t.section]} route={way.points} selected={t.gate}
        caption={<>2D plan · not to scale · the dashed line is the way in. The same steps are listed beside it.</>} />
    </div>
    <div className="w-two">
      <Block title="Near your seat" sub="nearest first">
        <ul className="w-list">{near.map(({ x, m }) => <li key={x.id}><b>{x.label}</b> <span className="ui-meta">{m} m · {x.stepFree ? 'step-free' : 'has steps'}</span> <Fresh state={x.state} age={x.age} /></li>)}</ul>
      </Block>
      <Block title="Match day" sub="synthetic timeline">
        <Rows label="Match-day timeline" rows={TIMELINE.map((x) => ({ k: x.at, v: x.what }))} />
        <p className="ui-meta">Times are relative to kick-off in a synthetic fixture <Ev state="SIMULATED" />. No clock, feed or ticketing system is connected.</p>
      </Block>
    </div>
  </>);
}

const FILTERS: readonly (readonly [AmenityKind | 'all', string])[] = [['all', 'All'], ['food', 'Food'], ['restroom', 'Restrooms'], ['accessible-restroom', 'Accessible'], ['first-aid', 'First aid'], ['guest-services', 'Guest services'], ['water', 'Water']];
function FindAmenities({ world, journey, config }: ScreenProps) {
  const [kind, setKind] = useState<AmenityKind | 'all'>('all');
  const [sel, setSel] = useState<string>('food-n');
  const seat = config.roleId === 'away_fan' ? VISITING : TICKETS[0]!;
  const list = AMENITIES.filter((x) => x.kind !== 'gate' && x.kind !== 'lift' && (kind === 'all' || x.kind === kind)).map((x) => ({ x, m: metres(centre(seat.section), [x.x, x.y]) })).sort((p, q) => p.m - q.m);
  const s = list.find((p) => p.x.id === sel)?.x ?? list[0]?.x;
  return (<>
    <ScreenHead world={world} journey={journey} config={config}><p className="ui-meta">From {seat.label}. Change the seat in Attend Game.</p></ScreenHead>
    <Pick label="Kind of amenity" value={kind} options={FILTERS} onChange={setKind} />
    <div className="w-two">
      <Block title="Amenities" sub={`${list.length} shown · nearest first`} testId="amenities">
        <ul className="w-list w-list--pick">{list.map(({ x, m }) => (
          <li key={x.id}><button type="button" className="w-item" aria-pressed={s?.id === x.id} onClick={() => setSel(x.id)} data-amenity={x.id}><b>{x.label}</b><span className="ui-meta">{KIND_LABEL[x.kind]} · {m} m · {x.stepFree ? 'step-free' : 'has steps'}</span><Fresh state={x.state} age={x.age} /></button></li>))}</ul>
      </Block>
      <div>
        <Plan label={`Plan of ${world.place}: ${s ? s.label : 'no amenity'} selected, from section ${seat.section}`} view={VIEW} zones={ZONES} places={list.map((p) => p.x)} lit={[seat.section]} selected={s?.id} onSelect={setSel} route={s ? [centre(seat.section), [s.x, s.y]] : undefined}
          caption={<>2D plan · pick an amenity in the list (or on the plan) to see where it is.</>} />
        {s && (
          <Block title={s.label} sub={KIND_LABEL[s.kind]} testId="amenity-detail">
            <p><Fresh state={s.state} age={s.age} /></p>
            {s.state === 'Unknown' && <p className="ui-meta">No source reported this status in the snapshot, so none is claimed. Guest services can confirm.</p>}
            {s.menu && (<>
              <ul className="w-menu" aria-label={`Menu at ${s.label}`}>{s.menu.map((m) => <li key={m.item}><b>{m.item}</b><span>{m.price}</span><span className="ui-meta">Declared allergens: {m.allergens}</span></li>)}</ul>
              <p className="ui-meta">Prices and allergens are sample data <Ev state="DECLARED" /> by a synthetic menu record. Always ask at the counter about allergens.</p>
            </>)}
          </Block>)}
      </div>
    </div>
  </>);
}

export const SCREENS: Record<string, ComponentType<ScreenProps>> = { 'attend-game': AttendGame, 'find-amenities': FindAmenities };
