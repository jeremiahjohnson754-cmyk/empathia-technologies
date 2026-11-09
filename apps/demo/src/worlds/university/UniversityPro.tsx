/**
 * University, campus-side journeys: Teaching & Research and Campus Technology. A separate chunk from the public journeys. No student
 * timetable, assignment or record is in this module (EMP-REQ-0437): the classroom estate is rooms and device classes only.
 */
import { useState, type ComponentType } from 'react';
import { Block, Chain, Ev, Pick, Rows, Said, ScreenHead, WorkBoard, type ChainNode, type Evidence, type ScreenProps, type Work } from '../kit.js';

// ---- synthetic data: teaching spaces and the classroom AV estate (class templates only; nothing is measured)
type Health = 'Healthy' | 'Monitor' | 'Action needed' | 'No data';
interface Space { id: string; name: string; building: string; kind: string; seats: number; health: Health; note: string }
const SPACES: Space[] = [
  { id: 'SCI-110', name: 'Lecture theatre', building: 'Science Hall', kind: 'Tiered lecture theatre', seats: 240, health: 'Monitor', note: 'Projector lamp hours near the replacement threshold (declared by the device record)' },
  { id: 'SCI-204', name: 'Teaching lab', building: 'Science Hall', kind: 'Teaching laboratory', seats: 36, health: 'Healthy', note: 'No open work' },
  { id: 'ENG-020', name: 'Maker studio', building: 'Engineering Centre', kind: 'Active-learning studio', seats: 48, health: 'Healthy', note: 'No open work' },
  { id: 'ENG-115', name: 'Seminar room', building: 'Engineering Centre', kind: 'Seminar room', seats: 24, health: 'Action needed', note: 'Ceiling microphone reported silent (simulated incident)' },
  { id: 'ART-204', name: 'Seminar room', building: 'Arts Hall', kind: 'Seminar room', seats: 20, health: 'Healthy', note: 'No open work' },
  { id: 'ART-010', name: 'Recital room', building: 'Arts Hall', kind: 'Performance room', seats: 120, health: 'No data', note: 'Nothing has reported from this room, so no state is claimed' },
  { id: 'LIB-301', name: 'Group study room', building: 'Hollis Library', kind: 'Study room', seats: 8, health: 'Healthy', note: 'No open work' },
  { id: 'UNI-001', name: 'Union hall', building: 'Student Union', kind: 'Multipurpose hall', seats: 300, health: 'Monitor', note: 'Lectern microphone battery low (declared)' },
];
const p = (...rows: [string, string][]) => rows;
const chainFor = (s: Space): ChainNode[] => {
  const mic = s.health === 'Action needed'; const none = s.health === 'No data'; const ev: Evidence = none ? 'UNKNOWN' : 'DECLARED';
  return [
    { id: 'src', label: 'Lectern inputs', klass: 'Lectern connection plate (HDMI, USB-C)', stage: 'Source · lectern', link: 'HDMI over twisted pair', evidence: ev, state: none ? 'Unknown' : 'Nominal', passport: p(['Tag', `${s.id}-IN-01`], ['Owner', 'Campus AV / IT']) },
    { id: 'mic', label: 'Room microphones', klass: s.seats > 100 ? 'Wireless lectern and handheld microphones' : 'Ceiling microphone array', stage: 'Source · room', link: 'Audio over IP', evidence: ev, state: none ? 'Unknown' : mic ? 'Degraded' : 'Nominal', passport: p(['Tag', `${s.id}-MIC-01`], ['Note', mic ? 'Reported silent; see the work order below' : 'No open work']) },
    { id: 'sw', label: 'Presentation switcher', klass: 'Presentation switcher with audio DSP', stage: 'Processing · lectern rack', link: 'HDMI and audio over IP', evidence: ev, state: none ? 'Unknown' : 'Nominal', passport: p(['Tag', `${s.id}-SW-01`], ['Network', 'Campus AV VLAN (declared)']) },
    { id: 'disp', label: s.seats > 60 ? 'Projector and screen' : 'Flat-panel display', klass: s.seats > 60 ? 'Laser or lamp projector, class by throw distance' : 'Large-format display', stage: 'Output · front wall', link: 'To lecture capture', evidence: ev, state: none ? 'Unknown' : s.health === 'Monitor' && s.id === 'SCI-110' ? 'Degraded' : 'Nominal', passport: p(['Tag', `${s.id}-DSP-01`], ['Lifecycle', s.id === 'SCI-110' ? 'Replacement due this year (modelled plan)' : 'Within planned life (modelled plan)']) },
    { id: 'cap', label: 'Lecture capture', klass: 'Capture appliance', stage: 'Output · recording', evidence: 'UNAVAILABLE', state: 'Unknown', passport: p(['Tag', `${s.id}-CAP-01`], ['Note', 'No capture platform is connected in this demonstration']) },
  ];
};
const WORK: Work[] = [
  { id: 'CT-481', title: 'ENG-115 ceiling microphone silent', where: 'Engineering Centre', priority: 'High', step: 1, by: 'Faculty / Instructor' },
  { id: 'CT-482', title: 'SCI-110 projector: plan lamp replacement', where: 'Science Hall', priority: 'Medium', step: 2, disruptive: true, by: 'Campus AV / IT Engineer' },
  { id: 'CT-483', title: 'UNI-001 lectern microphone battery', where: 'Student Union', priority: 'Low', step: 0, by: 'Campus Staff' },
];
const SESSION = { course: 'Circuits and Signals — lecture', room: 'SCI-110', when: 'Today 09:00' };
const READY: { k: string; v: string; ev: Evidence }[] = [
  { k: 'Display', v: 'Works; lamp near replacement', ev: 'DECLARED' }, { k: 'Lectern microphone', v: 'Paired', ev: 'DECLARED' },
  { k: 'Hearing loop', v: 'Fitted; not tested this term', ev: 'UNKNOWN' }, { k: 'Lecture capture', v: 'Not connected in this demonstration', ev: 'UNAVAILABLE' }, { k: 'Seats', v: '240, with 6 wheelchair spaces', ev: 'DECLARED' },
];
const LABS = [{ id: 'ENG-L3', name: 'Electronics lab 3', free: 'Free 13:00–17:00' }, { id: 'SCI-L1', name: 'Imaging suite', free: 'Free tomorrow' }, { id: 'ENG-L5', name: 'Anechoic room', free: 'Booked all week' }];

function TeachingResearch({ world, journey, config }: ScreenProps) {
  const [record, setRecord] = useState(false); const [asked, setAsked] = useState<string[]>([]);
  return (<>
    <ScreenHead world={world} journey={journey} config={config}><p className="ui-meta">A sample session and sample labs. No course, enrolment or booking system is connected.</p></ScreenHead>
    <div className="w-two">
      <Block title={`Is ${SESSION.room} ready?`} sub={`${SESSION.course} · ${SESSION.when}`} testId="readiness">
        <Rows label={`Readiness of ${SESSION.room}`} rows={READY.map((r) => ({ k: r.k, v: r.v, ev: r.ev }))} />
        <label className="w-check"><input type="checkbox" checked={record} onChange={(e) => setRecord(e.target.checked)} data-testid="record" /> <span>Ask for this session to be recorded</span></label>
        <Said>{record ? 'Recording asked for. It would start only after the institution’s consent notice is shown to the room; nothing is recorded in this demonstration.' : 'Recording is off, which is the default.'}</Said>
      </Block>
      <Block title="Research spaces" sub="ask for a slot" testId="labs">
        <ul className="w-list">{LABS.map((l) => <li key={l.id}><b>{l.name}</b> <span className="ui-meta">{l.id} · {l.free} <Ev state="SIMULATED" /></span> {asked.includes(l.id) ? <span className="ui-tag ui-tone--info" data-testid="lab-asked">Request held locally</span> : <button type="button" className="ui-btn w-btn" onClick={() => setAsked([...asked, l.id])} aria-label={`Ask for a slot in ${l.name}`}>Ask for a slot</button>}</li>)}</ul>
        <Said>{asked.length ? `${asked.length} request${asked.length > 1 ? 's' : ''} held in this page only. Nothing was sent.` : 'A request stays in this page; nothing is sent anywhere.'}</Said>
      </Block>
    </div>
  </>);
}

const STATES: readonly (readonly ['all' | Health, string])[] = [['all', 'All'], ['Action needed', 'Action needed'], ['Monitor', 'Monitor'], ['Healthy', 'Healthy'], ['No data', 'No data']];
function CampusTechnology({ world, journey, config }: ScreenProps) {
  const [f, setF] = useState<'all' | Health>('all'); const [sel, setSel] = useState('ENG-115');
  const list = SPACES.filter((s) => f === 'all' || s.health === f); const s = list.find((x) => x.id === sel) ?? list[0];
  return (<>
    <ScreenHead world={world} journey={journey} config={config}><p className="ui-meta">{SPACES.length} teaching spaces. Health is modelled from synthetic device records; no room is monitored.</p></ScreenHead>
    <Pick label="Room state" value={f} options={STATES} onChange={setF} />
    <div className="w-two">
      <Block title="Classroom AV estate" sub={`${list.length} of ${SPACES.length} rooms`} testId="estate">
        {list.length ? <ul className="w-list w-list--pick">{list.map((x) => <li key={x.id}><button type="button" className="w-item" aria-pressed={s?.id === x.id} onClick={() => setSel(x.id)} data-room={x.id}><b>{x.id} · {x.name}</b><span className="ui-meta">{x.building} · {x.kind} · {x.seats} seats</span><span className="w-health" data-health={x.health}><span className="w-dot" data-state={x.health === 'Healthy' ? 'Nominal' : x.health === 'No data' ? 'Unknown' : 'Degraded'} aria-hidden="true" />{x.health} <Ev state={x.health === 'No data' ? 'UNKNOWN' : 'MODELED'} /></span></button></li>)}</ul>
          : <p className="ui-meta" data-testid="estate-empty">No room is in this state.</p>}
      </Block>
      {s && <Block title={`${s.id}: signal chain`} sub={s.note} testId="room-chain"><Chain key={s.id} label={`${s.id} signal chain`} nodes={chainFor(s)} /></Block>}
    </div>
    <Block title="Service workflow" sub="one step at a time" testId="service">
      <WorkBoard label="Classroom service work" initial={WORK} eventLive actor={config.label} verifier="a second person (Campus AV / IT)" />
      <p className="ui-meta">Work marked disruptive waits for a gap in teaching: here the teaching day counts as in progress.</p>
    </Block>
  </>);
}

export const SCREENS: Record<string, ComponentType<ScreenProps>> = { 'teaching-research': TeachingResearch, 'campus-technology': CampusTechnology };
