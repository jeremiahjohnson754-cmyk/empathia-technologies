/**
 * Stadium, venue-side journeys: Broadcast & Production, Venue Engineering, Venue Operations. A separate chunk from the public journeys;
 * it is loaded only after the presentation gate admits a venue role configuration.
 */
import { useState, type ComponentType } from 'react';
import { Notice } from '@empathia/ui';
import { Block, Chain, Ev, Pick, Rows, ScreenHead, WorkBoard, type ScreenProps } from '../kit.js';
import { ACOUSTICS, CHAINS, GATES, RUN_OF_SHOW, WORK } from './data.pro.js';

function BroadcastProduction({ world, journey, config }: ScreenProps) {
  return (<>
    <ScreenHead world={world} journey={journey} config={config} />
    <div className="w-two">
      <Block title="Run of show" sub="relative to kick-off" testId="run-of-show">
        <ol className="w-cues">{RUN_OF_SHOW.map((c) => <li key={c.at} data-state={c.state}><span className="w-cues__t">{c.at}</span><span><b>{c.cue}</b><span className="ui-meta">{c.source}</span></span><span className="ui-tag ui-tone--muted">{c.state}</span></li>)}</ol>
        <p className="ui-meta">A scripted sequence <Ev state="SIMULATED" />. No cue can be fired from this page.</p>
      </Block>
      <Block title="Crowd acoustics by stand" sub="one-minute window" testId="acoustics">
        <Rows label="Crowd acoustics by stand" rows={ACOUSTICS.map((z) => ({ k: z.zone, sub: z.note, v: z.laeq == null ? 'No value' : <>LAeq,1 min {z.laeq} dB · LAFmax {z.lafmax} dB</>, ev: z.laeq == null ? 'UNKNOWN' as const : 'MODELED' as const }))} />
        <p className="ui-meta">LAeq is an average over a stated interval; LAFmax is a maximum. They are different metrics and are never merged into one “loudness”. These are modelled, not measured: there is no calibrated sensor in this demonstration, and nothing here identifies a person or a group of supporters.</p>
      </Block>
    </div>
    <Block title="Overlay export" sub="approval and rights">
      <p><button type="button" className="ui-btn w-btn" disabled aria-describedby="ovl-why">Export acoustic overlay</button></p>
      <p className="ui-meta" id="ovl-why">Unavailable here: an overlay for broadcast needs an approval and source permissions for footage and official data. The demonstration holds neither.</p>
    </Block>
  </>);
}

function VenueEngineering({ world, journey, config }: ScreenProps) {
  const [k, setK] = useState<'pa' | 'broadcast'>('pa');
  return (<>
    <ScreenHead world={world} journey={journey} config={config} />
    <Pick label="Signal chain" value={k} options={[['pa', 'Bowl public address'], ['broadcast', 'Broadcast video']]} onChange={setK} />
    <Block title={CHAINS[k].label} sub="read-only monitoring" testId="engineering">
      <Chain key={k} label={CHAINS[k].label} nodes={CHAINS[k].nodes} />
    </Block>
    <Notice tone="warn">Active acoustic tests are not run during an event and need the operator’s permission. This page has no control that can start one.</Notice>
  </>);
}

function VenueOperations({ world, journey, config }: ScreenProps) {
  const [live, setLive] = useState(true);
  return (<>
    <ScreenHead world={world} journey={journey} config={config} />
    <div className="w-two">
      <Block title="Gates" sub="status and queue">
        <Rows label="Gates" rows={GATES.map((g) => ({ k: g.gate, v: `${g.state} · queue ${g.queue.toLowerCase()}`, sub: `declared ${g.age} min before this snapshot`, ev: 'DECLARED' as const }))} />
      </Block>
      <Block title="Event state" sub="drives the event-time gate">
        <Pick label="Event state" value={live ? 'live' : 'ended'} options={[['live', 'Event in progress'], ['ended', 'Event ended']]} onChange={(v) => setLive(v === 'live')} />
        <p className="ui-meta">A switch for this demonstration <Ev state="SIMULATED" />: while the event is in progress, disruptive work cannot be marked done.</p>
      </Block>
    </div>
    <Block title="Incidents and service work" sub="one step at a time" testId="operations">
      <WorkBoard label="Incidents and service work" initial={WORK} eventLive={live} actor={config.label} verifier="a second person (Venue Operations)" />
    </Block>
  </>);
}

export const SCREENS: Record<string, ComponentType<ScreenProps>> = { 'broadcast-production': BroadcastProduction, 'venue-engineering': VenueEngineering, 'venue-operations': VenueOperations };
