/**
 * Convention, event-side journeys: Exhibitor Experience, Production & Broadcast, Venue Operations. A separate chunk from the public
 * journeys. An exhibitor sees its own booth only; event access never implies engineering access to the venue (v1.7 §3).
 * Every organisation named here is fictional.
 */
import { useState, type ComponentType } from 'react';
import { Notice } from '@empathia/ui';
import { Block, Chain, Ev, Rows, Said, ScreenHead, WorkBoard, type ChainNode, type ScreenProps, type Work } from '../kit.js';

const BOOTH = { name: 'Pelliwick Controls', booth: 'A4', size: '6 m × 3 m', power: '2 × 16 A (declared by the booth order)', network: 'Wired, 1 port (declared by the booth order)' };
const DEMOS = [{ at: '10:30', what: 'Room control in ten minutes' }, { at: '13:00', what: 'Scheduling panels: a walk-through' }, { at: '15:30', what: 'Questions and answers' }];
interface Lead { id: string; who: string; scope: string; at: string }
const LEADS: Lead[] = [
  { id: 'L-01', who: 'Attendee 0417 (name shared by consent)', scope: 'Name and work email, for one follow-up', at: 'Day 1, 10:42' },
  { id: 'L-02', who: 'Attendee 0932 (name shared by consent)', scope: 'Name only, for a meeting at the booth', at: 'Day 1, 11:15' },
  { id: 'L-03', who: 'Attendee 1108 (name shared by consent)', scope: 'Name and work email, for one follow-up', at: 'Day 1, 13:20' },
];
const MEETINGS = [{ id: 'M-1', who: 'Attendee 0932', when: 'Day 1, 14:00' }, { id: 'M-2', who: 'Attendee 0551', when: 'Day 2, 10:00' }];

function ExhibitorExperience({ world, journey, config }: ScreenProps) {
  const [leads, setLeads] = useState(LEADS); const [meet, setMeet] = useState<Record<string, 'Accepted' | 'Declined'>>({}); const [said, setSaid] = useState('');
  return (<>
    <ScreenHead world={world} journey={journey} config={config}><p className="ui-meta">A sample booth. You see this booth only: no other exhibitor’s leads, meetings or figures are in this view.</p></ScreenHead>
    <div className="w-two">
      <Block title={`My booth: ${BOOTH.name}`} sub={`Booth ${BOOTH.booth} · fictional exhibitor`} testId="booth">
        <Rows label="Booth order" rows={[{ k: 'Stand', v: BOOTH.size, ev: 'DECLARED' }, { k: 'Power', v: BOOTH.power }, { k: 'Network', v: BOOTH.network }]} />
        <h3>Demo schedule</h3>
        <ol className="w-cues">{DEMOS.map((d) => <li key={d.at}><span className="w-cues__t">{d.at}</span><span><b>{d.what}</b></span></li>)}</ol>
      </Block>
      <Block title="Opt-in leads" sub={`${leads.length} · each given with consent`} testId="leads">
        {leads.length ? <ul className="w-list">{leads.map((l) => <li key={l.id} data-lead={l.id}><b>{l.who}</b> <span className="ui-meta">{l.scope} · {l.at}</span> <button type="button" className="ui-btn ui-btn--danger w-btn" onClick={() => { setLeads(leads.filter((x) => x.id !== l.id)); setSaid(`${l.id} deleted. A deletion would also be sent to the attendee as a receipt.`); }} aria-label={`Delete lead ${l.id}`}>Delete</button></li>)}</ul>
          : <p className="ui-meta" data-testid="leads-empty">No leads are held. A lead exists only while the attendee’s consent does.</p>}
        <Said>{said || 'A lead is what the attendee chose to share, for the purpose shown, and can be deleted.'}</Said>
        <p className="ui-meta">Sample records <Ev state="SIMULATED" />. No badge scanner or CRM is connected.</p>
      </Block>
    </div>
    <Block title="Meeting requests" sub="accept or decline" testId="meetings">
      <ul className="w-list">{MEETINGS.map((m) => <li key={m.id}><b>{m.who}</b> <span className="ui-meta">{m.when}</span> {meet[m.id] ? <span className="ui-tag ui-tone--info">{meet[m.id]}</span> : <><button type="button" className="ui-btn w-btn" onClick={() => setMeet({ ...meet, [m.id]: 'Accepted' })} aria-label={`Accept meeting ${m.id}`}>Accept</button> <button type="button" className="ui-btn w-btn" onClick={() => setMeet({ ...meet, [m.id]: 'Declined' })} aria-label={`Decline meeting ${m.id}`}>Decline</button></>}</li>)}</ul>
    </Block>
  </>);
}

const p = (...rows: [string, string][]) => rows;
const KEYNOTE: ChainNode[] = [
  { id: 'k-mic', label: 'Speaker microphones', klass: 'Wireless headset and lectern microphones', stage: 'Source · keynote stage', link: 'RF to receivers, then audio over IP', evidence: 'DECLARED', state: 'Nominal', passport: p(['Tag', 'LXC-KN-MIC-01'], ['RF', 'Coordinated frequencies: plan declared, not scanned here']) },
  { id: 'k-cam', label: 'Stage cameras', klass: 'PTZ and manned system cameras', stage: 'Source · keynote theatre', link: 'SDI 12G', evidence: 'DECLARED', state: 'Nominal', passport: p(['Tag', 'LXC-KN-CAM-01'], ['Positions', 'Centre, left, right']) },
  { id: 'k-sw', label: 'Production switcher', klass: 'Production switcher with graphics', stage: 'Production · control position', link: 'Programme to screens and encoder', evidence: 'DECLARED', state: 'Nominal', passport: p(['Tag', 'LXC-KN-SW-01'], ['Operator', 'Show Producer (role, not a person)']) },
  { id: 'k-led', label: 'Stage LED wall', klass: 'Fine-pitch LED wall with processor', stage: 'Output · keynote stage', link: 'To stream encoder', evidence: 'MODELED', state: 'Degraded', passport: p(['Tag', 'LXC-KN-LED-01'], ['Note', 'One cabinet reports a temperature warning (simulated)'], ['Work order', 'VO-311, see Venue Operations']) },
  { id: 'k-enc', label: 'Stream encoder', klass: 'Streaming encoder', stage: 'Output · stream', evidence: 'UNAVAILABLE', state: 'Unknown', passport: p(['Tag', 'LXC-KN-ENC-01'], ['Note', 'No streaming platform is connected in this demonstration']) },
];
const CUES = [{ at: '09:25', cue: 'House to half, walk-in music out', state: 'Done' }, { at: '09:30', cue: 'Host on stage, title graphic', state: 'Next' }, { at: '09:34', cue: 'Keynote speaker, slides to wall', state: 'Later' }, { at: '10:05', cue: 'Poll on screen', state: 'Later' }, { at: '10:15', cue: 'Moderated questions', state: 'Later' }];

function ProductionBroadcast({ world, journey, config }: ScreenProps) {
  return (<>
    <ScreenHead world={world} journey={journey} config={config} />
    <div className="w-two">
      <Block title="Run of show: opening keynote" sub="scripted" testId="run-of-show">
        <ol className="w-cues">{CUES.map((c) => <li key={c.at} data-state={c.state}><span className="w-cues__t">{c.at}</span><span><b>{c.cue}</b></span><span className="ui-tag ui-tone--muted">{c.state}</span></li>)}</ol>
        <p className="ui-meta">A scripted sequence <Ev state="SIMULATED" />. No cue can be fired and no equipment can be driven from this page.</p>
      </Block>
      <Block title="Stage to stream" sub="read-only monitoring" testId="engineering"><Chain label="Keynote signal chain" nodes={KEYNOTE} /></Block>
    </div>
  </>);
}

const HALLS = [{ k: 'Hall A', v: 'Open · aisles clear', ev: 'DECLARED' as const }, { k: 'Keynote Theatre', v: 'Open · LED wall under watch', ev: 'MODELED' as const }, { k: 'Session Room 1', v: 'Open', ev: 'DECLARED' as const }, { k: 'Session Room 2', v: 'No report since doors', ev: 'UNKNOWN' as const }];
const WORK: Work[] = [
  { id: 'VO-311', title: 'Keynote LED wall: cabinet temperature warning', where: 'Keynote Theatre', priority: 'High', step: 2, disruptive: true, by: 'Show Producer' },
  { id: 'VO-312', title: 'Booth A3: network port not patched', where: 'Hall A', priority: 'Medium', step: 1, by: 'Exhibitor' },
  { id: 'VO-313', title: 'Session Room 2: hearing loop sign missing', where: 'Session Room 2', priority: 'Medium', step: 0, by: 'Facilities & Safety' },
];
function VenueOperations({ world, journey, config }: ScreenProps) {
  return (<>
    <ScreenHead world={world} journey={journey} config={config} />
    {config.roleId === 'convention_msp_delegated' && <Notice tone="info">A delegated engineer works under a time-limited delegation that the venue can revoke at once. This demonstration shows the label only; no delegation exists here.</Notice>}
    <div className="w-two">
      <Block title="Hall readiness" sub="this event only"><Rows label="Hall readiness" rows={HALLS} /></Block>
      <Block title="Scope" sub="what this view covers">
        <p>One event at one venue. Attendee identities, exhibitor leads and other events’ data are not part of venue operations and are not in this view.</p>
      </Block>
    </div>
    <Block title="Service requests" sub="one step at a time" testId="operations">
      <WorkBoard label="Service requests" initial={WORK} eventLive actor={config.label} verifier="a second person (Venue Operations)" />
      <p className="ui-meta">Work marked disruptive waits while a session is in progress in that room.</p>
    </Block>
  </>);
}

export const SCREENS: Record<string, ComponentType<ScreenProps>> = { 'exhibitor-experience': ExhibitorExperience, 'production-broadcast': ProductionBroadcast, 'venue-operations': VenueOperations };
