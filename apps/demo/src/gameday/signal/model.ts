/**
 * The Critical Signal — the model behind #/gameday/incident/camera-feed (founder, 10 Nov 2026: "A camera feed or production signal
 * becomes unavailable during a simulated event… a real connected workflow, not ten isolated scripted screens").
 *
 * One set of records, read here and nowhere copied:
 *   - the signal chain is six equipment records of the stadium estate (estate/stadium.ts), in the order the picture travels; a hop
 *     that is not on record is reported as missing, never invented;
 *   - what each hop shows is produced by a SIMULATED scenario for the incident (no device is asked anything), what a hop without an
 *     indicator must be doing is INFERRED from its neighbours, and what the estate record states is KNOWN;
 *   - the recovery procedure is chosen by the hop those observations isolate, and uses the standby that is on record;
 *   - the incident itself is the game-day engine's (gameday/engine.ts): this file adds no state machine of its own.
 *
 * Safe by construction: every procedure step is something done at a control surface made for it. Nothing asks anyone to open
 * equipment, move or re-seat a cable, switch power, defeat a protection, climb or work at height; each procedure says so.
 * Fictional venue, synthetic records. Nothing here is monitored and no reading comes from an instrument.
 */
import { indexOf, pathOf, type Asset, type Estate, type EstateNode, type Index } from '../../estate/model.js';
import { STADIUM } from '../../estate/stadium.js';
import { FAULTS, PHASE, STEPS, type FaultId, type GameDay, type Incident, type Step, type Team } from '../engine.js';
import { SIGNAL_FAULT } from './access.js';

export const FAULT = SIGNAL_FAULT as FaultId;
/** Which of the platform's cameras the incident is about. */
export const CAMERA = 3;
export type HopId = 'camera' | 'fibre' | 'patch' | 'ccu' | 'router' | 'switcher';

interface HopDef {
  id: HopId;
  /** the estate record this hop is */
  asset: string;
  /** what it does for the picture, in plain words */
  does: string;
  /** where a person can see whether the picture passes this hop; null when the hop has nothing to look at (a cable) */
  tap: string | null;
  /** how it hands the picture on */
  link: string;
  /** the standby on record for it, when there is one */
  backup: string | null;
  team: Team;
  /** who looks after it on an event day: a position, never a person */
  post: string;
}
/** The chain names records only. Labels, classes, counts, rooms and levels are read from the estate when the chain is built. */
const DEF: readonly HopDef[] = [
  { id: 'camera', asset: 'STA-CAM-MAIN-A01', does: 'Makes the picture.', tap: 'the operator’s viewfinder, reported over the intercom', link: 'Hybrid fibre camera cable', backup: null, team: 'broadcast', post: 'Camera crew at the platform' },
  { id: 'fibre', asset: 'STA-CAM-MAIN-A02', does: 'Carries the picture, and the camera’s power and control, from the platform to the equipment room.', tap: null, link: 'Lands on the broadcast fibre patch', backup: 'STA-CAM-MAIN-A03', team: 'broadcast', post: 'Duty broadcast engineer' },
  { id: 'patch', asset: 'STA-MER-A02', does: 'Joins each camera’s fibre to its camera control unit.', tap: 'the circuit lights on the patch field', link: 'Fibre lead to the camera control unit', backup: 'STA-CAM-MAIN-A03', team: 'technology', post: 'Venue technology engineer' },
  { id: 'ccu', asset: 'STA-MER-A04', does: 'Powers and controls the camera, and turns what arrives on the fibre into a video signal.', tap: 'the unit’s link and output lights, shown on the camera control panel', link: 'Video to the router', backup: 'STA-MER-A05', team: 'broadcast', post: 'Vision engineer' },
  { id: 'router', asset: 'STA-BCR-A02', does: 'Sends each source to where it is needed: the switcher, the multiviewer wall and replay.', tap: 'the source status on the router control panel', link: 'Video to the production switcher', backup: null, team: 'broadcast', post: 'Duty broadcast engineer' },
  { id: 'switcher', asset: 'STA-BCR-A01', does: 'Where the director cuts between cameras to make the programme.', tap: 'the camera’s input status on the switcher', link: 'Programme output', backup: null, team: 'broadcast', post: 'Technical director' },
];
/** Where the loss is noticed: the wall the gallery watches. A record, like every hop. */
const SEEN_AT = 'STA-BCR-A03';
export const HOP_IDS: readonly HopId[] = DEF.map((d) => d.id);

export interface Hop extends Omit<HopDef, 'asset' | 'backup'> { n: number; asset: Asset; place: EstateNode; level: EstateNode | null; backup: Asset | null }
export interface Chain { hops: Hop[]; seenAt: { asset: Asset; place: EstateNode } | null; missing: string[]; index: Index }
let cached: Chain | null = null;
/** Build the chain from an estate's records. Every hop is an asset record in a place record; anything not found is listed in `missing`. */
export function chainOf(e: Estate = STADIUM): Chain {
  if (e === STADIUM && cached) return cached;
  const index = indexOf(e); const assets = new Map(e.assets.map((a) => [a.id, a])); const missing: string[] = []; const hops: Hop[] = [];
  const levelOf = (id: string) => pathOf(index, id).find((n) => n.kind === 'level') || null;
  for (const d of DEF) {
    const asset = assets.get(d.asset); const place = asset ? index.byId.get(asset.room) : undefined;
    if (!asset || !place) { missing.push(d.asset); continue; }
    const backup = d.backup ? assets.get(d.backup) || null : null; if (d.backup && !backup) missing.push(d.backup);
    const { asset: _a, backup: _b, ...rest } = d; void _a; void _b;
    hops.push({ ...rest, n: hops.length + 1, asset, place, level: levelOf(place.id), backup });
  }
  const seen = assets.get(SEEN_AT); const seenPlace = seen ? index.byId.get(seen.room) : undefined; if (!seen || !seenPlace) missing.push(SEEN_AT);
  const chain: Chain = { hops, seenAt: seen && seenPlace ? { asset: seen, place: seenPlace } : null, missing, index };
  if (e === STADIUM) cached = chain;
  return chain;
}
export const hopOf = (c: Chain, id: HopId | null | undefined): Hop | null => c.hops.find((h) => h.id === id) || null;
/** A hop's name for a sentence: the record's label, and which unit of it when the record counts several. */
export const hopName = (h: Hop): string => (h.id === 'camera' ? `Camera ${CAMERA}` : h.id === 'fibre' ? `Camera ${CAMERA} fibre, primary path` : h.id === 'ccu' ? `Camera ${CAMERA} control unit` : h.asset.label);
/** The places the chain passes through, in order, each once. */
export const placesOf = (c: Chain): EstateNode[] => { const out: EstateNode[] = []; for (const h of c.hops) if (!out.some((p) => p.id === h.place.id)) out.push(h.place); return out; };

// ------------------------------------------------------------------------------------------------------------ the incident
/** The incident this page is about: the latest one of this fault in the event (an open one if there is one). */
export function incidentOf(g: GameDay): Incident | null {
  const mine = g.incidents.filter((i) => i.fault === FAULT);
  return mine.find((i) => i.step !== 'VERIFIED') || mine[mine.length - 1] || null;
}
const at = (s: Step) => STEPS.indexOf(s);
export const reached = (i: Incident | null, s: Step): boolean => !!i && at(i.step) >= at(s);
/**
 * The scenario: which hop has failed in this incident. It is decided by the incident's number alone, so the same incident always
 * tells the same story and a second incident in the same event tells a different one. This is the SIMULATED part; nothing was read.
 */
export function failedHopOf(incidentId: string): HopId {
  const n = Number(/(\d+)$/.exec(incidentId)?.[1] || 0);
  return HOP_IDS[((n % HOP_IDS.length) + HOP_IDS.length) % HOP_IDS.length]!;
}

// ------------------------------------------------------------------------------------------------------------ observations
/** How an observation is known. SIMULATED: produced by this demonstration's scenario. INFERRED: reasoned from other observations. KNOWN: stated by the estate record. */
export type Provenance = 'SIMULATED' | 'INFERRED' | 'KNOWN';
/** What is seen at a hop: the picture passes it, the picture arrives and stops here, or nothing arrives. */
export type Reading = 'passes' | 'stops' | 'nothing';
export interface Observation { hop: HopId; provenance: Provenance; reading: Reading | null; text: string; source: string }
export const READING_WORD: Record<Reading, string> = { passes: 'Picture passes', stops: 'Loss starts here', nothing: 'Nothing arrives' };
export const PROVENANCE_HELP: Record<Provenance, string> = {
  SIMULATED: 'Produced by this demonstration’s scenario for the incident. No device was asked and nothing was read from an instrument.',
  INFERRED: 'Reasoned from the observations either side of it. Nobody looked at this item itself.',
  KNOWN: 'Stated by the estate record. A record says what was installed, not what it is doing now.',
};

/**
 * The simulated adapter: what each point of the chain shows for a scenario. `failed` is the hop that has stopped passing the picture
 * (null: none); `via` is the hop that was put on its standby, once a fix has been made. Each hop gets what its record states (KNOWN),
 * and then either a simulated indication (where the hop has something to look at) or an inference from its neighbours (where it has not).
 */
export function observe(c: Chain, scenario: { incident: string; failed: HopId | null; via?: HopId | null }): Observation[] {
  const f = scenario.failed ? c.hops.findIndex((h) => h.id === scenario.failed) : -1; const out: Observation[] = [];
  const simulated = new Map<HopId, Reading>();
  for (const [k, h] of c.hops.entries()) if (h.tap) simulated.set(h.id, f < 0 || k < f ? 'passes' : k === f ? 'stops' : 'nothing');
  for (const [k, h] of c.hops.entries()) {
    const stateWord = h.asset.state === 'IN_SERVICE' ? 'in service' : h.asset.state === 'ATTENTION' ? 'needing attention' : 'planned, not yet installed';
    out.push({ hop: h.id, provenance: 'KNOWN', reading: null, source: `Estate record ${h.asset.id}`,
      text: `${h.asset.label}${h.asset.qty > 1 ? ` (${h.asset.qty} on record)` : ''}: ${h.asset.cls.toLowerCase()}, recorded ${stateWord} since ${h.asset.installed} in ${h.place.name}. ${h.backup ? `A standby is on record: ${h.backup.label.toLowerCase()} (${h.backup.id}).` : 'No separate standby is on record for it.'}` });
    const usesStandby = scenario.via === h.id && f < 0;
    if (h.tap) {
      const r = simulated.get(h.id)!;
      const said = h.id === 'camera' ? (r === 'passes' ? 'The operator reports a picture in the viewfinder: the camera is making one.' : 'The operator reports no picture in the viewfinder: the camera is not making one.')
        : r === 'passes' ? `A picture arrives and is passed on${usesStandby ? ', on the standby' : ''}.` : r === 'stops' ? 'A picture arrives, and nothing is passed on.' : 'Nothing arrives.';
      out.push({ hop: h.id, provenance: 'SIMULATED', reading: r, text: said, source: `Simulated indication for ${scenario.incident}: ${h.tap}` });
    } else {
      // nothing to look at on this hop: reason from the nearest hops that do show something
      const before = c.hops.slice(0, k).reverse().find((x) => x.tap); const after = c.hops.slice(k + 1).find((x) => x.tap);
      const rb = before ? simulated.get(before.id)! : 'passes'; const ra = after ? simulated.get(after.id)! : 'nothing';
      const r: Reading = ra !== 'nothing' ? 'passes' : rb !== 'passes' ? 'nothing' : 'stops';
      const names = `${before ? hopName(before).toLowerCase() : 'the source'} and ${after ? hopName(after).toLowerCase() : 'the output'}`;
      const said = r === 'passes' ? `A picture arrives after it, so it passed through here${usesStandby ? ' on the standby' : ''}.` : r === 'nothing' ? 'No picture leaves the hop before it, so none can be here.' : `A picture leaves the hop before it and nothing arrives at the hop after it. This is the only thing between them.`;
      out.push({ hop: h.id, provenance: 'INFERRED', reading: r, text: said, source: `Inferred from the indications at ${names}; this item has nothing of its own to look at` });
    }
  }
  return out;
}
/** The reading for a hop: its simulated indication, or the inference where it has none. */
export const readingOf = (obs: readonly Observation[], hop: HopId): Observation | null => obs.find((o) => o.hop === hop && o.reading !== null) || null;
export interface Isolation { hop: HopId | null; by: Provenance | null; why: string }
/** Which hop the observations isolate: the one hop where the picture is seen, or reasoned, to arrive and stop. None, or more than one, isolates nothing. */
export function isolate(c: Chain, obs: readonly Observation[]): Isolation {
  const stops = c.hops.filter((h) => readingOf(obs, h.id)?.reading === 'stops');
  if (stops.length !== 1) return { hop: null, by: null, why: stops.length ? 'More than one point claims to be where the picture stops. The observations disagree.' : c.hops.every((h) => readingOf(obs, h.id)?.reading === 'passes') ? 'The picture passes every point of the chain.' : 'No single point shows a picture arriving and stopping.' };
  const h = stops[0]!; const o = readingOf(obs, h.id)!; const k = c.hops.indexOf(h); const prev = c.hops[k - 1]; const next = c.hops[k + 1];
  return { hop: h.id, by: o.provenance, why: `${prev ? `The picture passes ${hopName(prev).toLowerCase()}` : 'This is where the picture is made'}${next ? `, and nothing arrives at ${hopName(next).toLowerCase()}` : ''}. ${o.provenance === 'INFERRED' ? `${hopName(h)} has nothing of its own to look at, so this is inferred from the points either side of it.` : `${hopName(h)} itself shows a picture arriving and none leaving.`}` };
}

// ------------------------------------------------------------------------------------------------------------ recovery procedures
export interface ProcStep { id: string; do: string; at: HopId | 'seen' }
export interface Procedure {
  id: string; hop: HopId | null; title: string;
  /** what was done, as the outcome records it */
  restores: string | null;
  steps: ProcStep[];
  /** what nobody does during the event, and why the procedure does not need it */
  never: string[];
  /** what happens to the failed item afterwards */
  after: string;
  /** the records the procedure touches, standby included */
  uses: string[];
}
const TELL = `Tell the director camera ${CAMERA} is not available, so nobody cuts to it. The other cameras on the platform cover the play.`;
const WALL = `Look at the camera ${CAMERA} tile on the multiviewer wall, then tell the director the camera is back.`;
const PROC: Record<HopId, { title: string; restores: string; steps: Array<[string, HopId | 'seen']>; never: string[]; after: string }> = {
  camera: { title: `Restart camera ${CAMERA} from its control panel`, restores: `camera ${CAMERA} restarted from the camera control panel`,
    steps: [[TELL, 'switcher'], [`On the camera control panel in the Broadcast Control Room, use the panel’s own restart for camera ${CAMERA}. The camera crew stand back from the camera while it restarts.`, 'ccu'], ['Ask the camera operator whether the viewfinder shows a picture again.', 'camera'], [WALL, 'seen']],
    never: ['Nobody opens the camera or pulls its cable during the event.', 'Nobody leaves the platform floor or reaches over its rail.'], after: `If the restart does not bring the picture back, camera ${CAMERA} stays out of the show and the camera crew exchange it when the bowl is empty.` },
  fibre: { title: `Move camera ${CAMERA} to its backup fibre path`, restores: `camera ${CAMERA} moved to the backup fibre path`,
    steps: [[TELL, 'switcher'], [`On the camera control panel, choose the backup path for camera ${CAMERA}. The changeover is a labelled control made for this: no cable is moved.`, 'ccu'], [`Check the patch field’s circuit light for camera ${CAMERA} on the backup path.`, 'patch'], [WALL, 'seen']],
    never: ['Nobody pulls, cleans or re-seats a fibre connector during the event.', 'Nobody goes to the cable route. It runs high in the stand and is inspected with the bowl empty, by people equipped for it.'], after: 'The primary path is marked out of use on its record and inspected after the event.' },
  patch: { title: `Take camera ${CAMERA} off the failed patch circuit, on its backup path`, restores: `camera ${CAMERA} moved to the backup path, which lands on another patch field`,
    steps: [[TELL, 'switcher'], [`On the camera control panel, choose the backup path for camera ${CAMERA}. It lands on a different patch field, so the failed circuit is no longer in the way. No patch lead is moved.`, 'ccu'], [`Check that the camera control unit shows its link for camera ${CAMERA}.`, 'ccu'], [WALL, 'seen']],
    never: ['Nobody re-patches the fibre patch field during the event: one wrong lead takes another camera off the programme.', 'The equipment room is entered only by the people named for it.'], after: 'The failed circuit is marked out of use on the patch record and tested after the event.' },
  ccu: { title: `Assign camera ${CAMERA} to the standby camera control unit`, restores: `camera ${CAMERA} assigned to the standby camera control unit`,
    steps: [[TELL, 'switcher'], [`On the camera control panel, assign camera ${CAMERA} to the standby unit. The assignment is made on the panel: no cable is moved.`, 'ccu'], [`Check the standby unit’s link and output lights for camera ${CAMERA}.`, 'ccu'], [`Ask the vision engineer to match camera ${CAMERA} to the other cameras again. ${WALL}`, 'seen']],
    never: ['The failed unit stays in its rack, powered as it was found. Nobody pulls it, or its power lead, during the event.'], after: 'The failed unit is exchanged in the workshop after the event, and the standby goes back to being the standby.' },
  router: { title: `Take camera ${CAMERA} through the router’s second input`, restores: `camera ${CAMERA} taken through the router’s second input`,
    steps: [[TELL, 'switcher'], [`On the router control panel, choose the source “CAM ${CAMERA} B”, the camera control unit’s second output, for the switcher’s camera ${CAMERA} input.`, 'router'], [`Check the source status for camera ${CAMERA} on the router control panel.`, 'router'], [WALL, 'seen']],
    never: ['Nobody moves a video cable at the back of the router during the event.', 'Nobody restarts the router: every camera passes through it.'], after: 'The first input is marked out of use on the router’s record and tested after the event.' },
  switcher: { title: `Give camera ${CAMERA} a spare input on the production switcher`, restores: `camera ${CAMERA} given a spare input on the production switcher`,
    steps: [[`Tell the director the camera ${CAMERA} button will not work for a moment. The other cameras on the platform cover the play.`, 'switcher'], [`On the router control panel, send camera ${CAMERA} to the switcher’s spare input.`, 'router'], [`On the switcher’s set-up page, give that input to the camera ${CAMERA} button.`, 'switcher'], [`Ask the director to take camera ${CAMERA} to preview and back, then look at its tile on the multiviewer wall.`, 'seen']],
    never: ['Nobody restarts the switcher during the event: the programme passes through it.', 'Nobody moves a cable at the back of the switcher.'], after: 'The failed input is marked out of use on the switcher’s record and tested after the event.' },
};
/** The procedure for the hop the observations isolate. With nothing isolated, the only safe procedure is to hold and call for help. */
export function procedureFor(c: Chain, hop: HopId | null): Procedure {
  const h = hopOf(c, hop);
  if (!h) return { id: 'hold', hop: null, title: `Keep camera ${CAMERA} out of the show and call the duty broadcast engineer`, restores: null,
    steps: [{ id: 'hold-1', do: TELL, at: 'switcher' }, { id: 'hold-2', do: 'Call the duty broadcast engineer and read out what each point of the chain shows.', at: 'seen' }],
    never: ['Nothing is changed on a guess. A change made at the wrong point can take a working camera off the programme.'], after: 'The incident stays open until the failed point is found.', uses: c.seenAt ? [c.seenAt.asset.id] : [] };
  const p = PROC[h.id]; const steps = p.steps.map(([text, where], i) => ({ id: `${h.id}-${i + 1}`, do: text, at: where }));
  const uses = new Set<string>([h.asset.id]); if (h.backup) uses.add(h.backup.id);
  for (const s of steps) { if (s.at === 'seen') { if (c.seenAt) uses.add(c.seenAt.asset.id); } else { const x = hopOf(c, s.at); if (x) uses.add(x.asset.id); } }
  return { id: `proc-${h.id}`, hop: h.id, title: p.title, restores: p.restores, steps, never: p.never, after: p.after, uses: [...uses] };
}

// ------------------------------------------------------------------------------------------------------------ what was done, and the proof
export interface OutcomeInput { restored: boolean; done: string[]; note: string }
/** What is wrong with an outcome before it is recorded; empty when it can be. */
export function outcomeProblems(p: Procedure, o: OutcomeInput): string[] {
  const why: string[] = [];
  if (o.note.length > 300) why.push('Keep the note under 300 characters.');
  if (o.restored && !p.restores) why.push('This procedure does not restore the feed. Record that it is not restored, and the incident stays with the duty broadcast engineer.');
  if (o.restored && p.restores) { const left = p.steps.filter((s) => !o.done.includes(s.id)); if (left.length) why.push(`Tick each step as it is done: ${left.length} of ${p.steps.length} ${left.length === 1 ? 'is' : 'are'} not ticked.`); }
  if (!o.restored && o.note.trim().length < 8) why.push('Say what happened in a few words (at least 8 characters), so the next person does not start from nothing.');
  return why;
}
/** The words kept on the incident when the fix is recorded. */
export const outcomeNote = (p: Procedure, o: OutcomeInput): string => `${p.restores}; ${p.steps.length} of ${p.steps.length} procedure steps done${o.note.trim() ? `; note: ${o.note.trim()}` : ''}`;

export interface Evidence { id: 'wall' | 'tap' | 'cut' | 'tagged'; label: string; record: string; required: boolean }
/** The named evidence a check can cite, for the hop that was put right. The first is required: the picture, seen where it was missed. */
export function evidenceFor(c: Chain, hop: HopId | null): Evidence[] {
  const h = hopOf(c, hop); const seen = c.seenAt; const sw = hopOf(c, 'switcher'); const out: Evidence[] = [];
  if (seen) out.push({ id: 'wall', label: `The camera ${CAMERA} tile on the ${seen.asset.label.toLowerCase()} shows a picture`, record: seen.asset.id, required: true });
  if (h) { const look = h.tap ? h : c.hops.slice(c.hops.indexOf(h) + 1).find((x) => x.tap) || h; out.push({ id: 'tap', label: `The picture is shown passing at ${look.tap ? look.tap.replace(/, (reported|shown) .*$/, '') : hopName(look).toLowerCase()}${h.backup ? `, on ${h.backup.label.toLowerCase()}` : ''}`, record: (h.backup || look.asset).id, required: false }); }
  if (sw) out.push({ id: 'cut', label: `The director took camera ${CAMERA} to preview and back without a break`, record: sw.asset.id, required: false });
  if (h) out.push({ id: 'tagged', label: `${hopName(h)} is marked out of use on its record, for after the event`, record: h.asset.id, required: false });
  return out;
}
/** What is wrong with the evidence a check names; empty when the check can be recorded. */
export function evidenceProblems(all: readonly Evidence[], chosen: readonly string[]): string[] {
  const picked = all.filter((e) => chosen.includes(e.id)); const why: string[] = [];
  for (const e of all) if (e.required && !picked.includes(e)) why.push(`Name the evidence that the picture is back: “${e.label}”.`);
  if (picked.length < 2) why.push('Name at least two pieces of evidence. One look at one screen is not an independent check.');
  return why;
}
export const evidenceNote = (all: readonly Evidence[], chosen: readonly string[]): string => `evidence: ${all.filter((e) => chosen.includes(e.id)).map((e) => `${e.label} (${e.record})`).join('; ')}`;

// ------------------------------------------------------------------------------------------------------------ history and people
/** An earlier incident on this chain. Synthetic history of earlier simulated event days at a fictional venue; nothing here happened. */
export interface Prior { id: string; day: string; asset: string; title: string; cause: string; fix: string; checkedBy: string; provenance: 'SYNTHETIC' }
export const PRIOR: readonly Prior[] = [
  { id: 'HLS-INC-0412', day: 'Simulated event day, 14 September 2026', asset: 'STA-CAM-MAIN-A02', title: 'Camera 3 picture broke up in the second half', cause: 'Water in the primary path’s connector at the platform', fix: 'Moved to the backup path for the event; the connector was replaced the next day', checkedBy: 'Event Producer / Show Caller', provenance: 'SYNTHETIC' },
  { id: 'HLS-INC-0388', day: 'Simulated event day, 30 August 2026', asset: 'STA-MER-A04', title: 'Camera 2 stopped answering its control panel', cause: 'A camera control unit stopped responding', fix: 'Camera 2 assigned to the standby unit; the failed unit was exchanged in the workshop', checkedBy: 'Venue Operations Lead', provenance: 'SYNTHETIC' },
  { id: 'HLS-INC-0351', day: 'Simulated event day, 16 August 2026', asset: 'STA-BCR-A02', title: 'Router source for camera 5 showed black', cause: 'One input of the video router failed', fix: 'The second input was chosen for the event; the input was repaired afterwards', checkedBy: 'Event Producer / Show Caller', provenance: 'SYNTHETIC' },
  { id: 'HLS-INC-0297', day: 'Simulated event day, 19 July 2026', asset: 'STA-CAM-MAIN-A02', title: 'Camera 3 lost its picture during warm-up', cause: 'The primary path was strained where it leaves the platform', fix: 'Moved to the backup path; the primary path was re-run after the event', checkedBy: 'Venue Operations Lead', provenance: 'SYNTHETIC' },
];
export interface History { prior: Array<Prior & { hop: HopId }>; thisEvent: Array<{ id: string; title: string; step: Step; phase: string }>; summary: string[] }
/** What is on record about this chain: earlier incidents on its equipment, most recent first, and the other broadcast incidents of this event. */
export function historyOf(c: Chain, g: GameDay, current: Incident | null): History {
  const prior = PRIOR.map((p) => { const h = c.hops.find((x) => x.asset.id === p.asset); return h ? { ...p, hop: h.id } : null; }).filter((x): x is Prior & { hop: HopId } => !!x);
  const thisEvent = g.incidents.filter((i) => i.id !== current?.id && FAULTS[i.fault].system === FAULTS[FAULT].system).map((i) => ({ id: i.id, title: FAULTS[i.fault].title, step: i.step, phase: PHASE[i.openedIn].label }));
  const summary: string[] = [];
  const by = new Map<HopId, number>(); for (const p of prior) by.set(p.hop, (by.get(p.hop) || 0) + 1);
  for (const [hop, n] of [...by].sort((a, b) => b[1] - a[1])) { const h = hopOf(c, hop)!; summary.push(`${h.asset.label}: ${n === 1 ? 'one earlier incident' : `${n} earlier incidents`} on record.`); }
  if (!prior.length) summary.push('No earlier incident is on record for this chain.');
  summary.push(thisEvent.length ? `${thisEvent.length === 1 ? 'One other broadcast incident' : `${thisEvent.length} other broadcast incidents`} in this event.` : 'No other broadcast incident in this event.');
  return { prior, thisEvent, summary };
}
export const TEAM_WORD: Record<Team, string> = { gates: 'Gates', concessions: 'Concessions', medical: 'Medical', broadcast: 'Broadcast', technology: 'Venue technology' };
export interface Post { team: Team; teamWord: string; onPost: number; posts: Array<{ post: string; hops: HopId[] }>; owner: boolean }
/** Who is responsible for each part of the chain: positions, never people, with how many of the team are on post in this phase of the event. */
export function peopleOf(c: Chain, g: GameDay): Post[] {
  const out: Post[] = [];
  for (const h of c.hops) {
    let t = out.find((x) => x.team === h.team); if (!t) { t = { team: h.team, teamWord: TEAM_WORD[h.team], onPost: PHASE[g.phase].staff[h.team], posts: [], owner: FAULTS[FAULT].owner === h.team }; out.push(t); }
    const p = t.posts.find((x) => x.post === h.post); if (p) p.hops.push(h.id); else t.posts.push({ post: h.post, hops: [h.id] });
  }
  return out.sort((a, b) => Number(b.owner) - Number(a.owner));
}
