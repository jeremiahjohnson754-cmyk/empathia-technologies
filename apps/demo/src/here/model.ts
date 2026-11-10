/**
 * In this room — the model behind #/here (founder, 10 Nov: "Someone walks into an unfamiliar room, opens Empathia, discovers the
 * equipment, sees the space in Lite, searches for its support history, identifies an issue, receives guided assistance, and documents
 * the outcome — all through one connected experience").
 *
 * Everything here is read from the room's own record (campus/design.ts) and the shared workspace (workspace/store.ts): the equipment
 * is the room's positions, the history is its jobs, its replaced units and what was done in the room before, and "what this points
 * at" follows the room's recorded connections from one kind of equipment to the next. The guidance is written for the equipment the
 * room actually has: a step that needs a touch panel is not offered in a room without one.
 *
 * Nothing here contacts a device. A step asks a person to look, press a button meant for them, or say what they see. Nothing asks
 * anyone to open a cabinet, unplug room equipment or change a setting that belongs to the commissioned room.
 */
import type { Connection } from '@empathia/domain-types';
import type { RoomRecord, Position } from '../campus/design.js';
import type { Workspace } from '../workspace/store.js';
import { roomIssues, moves, type OpenIssue } from '../campus/metrics.js';
import { CAMPUS_ROOMS, buildingByKey, fullName, shortName, type RoomOutline } from '../campus/canon.js';

export type Group = 'audio' | 'video' | 'display' | 'control' | 'network' | 'other';
export type SymptomId = 'far-cant-hear' | 'room-cant-hear' | 'echo' | 'no-camera' | 'framing' | 'blank' | 'laptop' | 'frozen' | 'join' | 'other';
export type Tier = 'person' | 'technician';

export interface Symptom {
  id: SymptomId; group: Group; icon: 'mic' | 'speaker' | 'camera' | 'display' | 'control' | 'network' | 'info';
  /** what the person notices, in their words */
  label: string;
  /** the title a job takes when this is reported */
  title: string;
  /** the kinds of equipment the fault can sit in, in the order the signal travels; each stage lists the kinds that can fill it */
  path: string[][];
  /** what the ringed equipment is, said under the picture */
  says: string;
  /** words in an existing report that mean the same thing */
  words: RegExp;
}

const MICS = ['micceil', 'mictable', 'micwireless'];
const SCREENS = ['display', 'projector', 'ledwall'];
export const SYMPTOMS: Symptom[] = [
  { id: 'far-cant-hear', group: 'audio', icon: 'mic', label: 'People on the call can’t hear the room', title: 'People on the call cannot hear the room', path: [[...MICS, 'bar'], ['dsp'], ['compute']], says: 'the way the room’s voices travel to the call', words: /can.?t hear (the room|us)|microphone|mic\b|speech (level|intelligib)|reported low/i },
  { id: 'room-cant-hear', group: 'audio', icon: 'speaker', label: 'The room can’t hear the call', title: 'The room cannot hear the call', path: [['compute', 'bar'], ['dsp'], ['amp'], ['speaker']], says: 'the way the call’s sound travels to the room’s loudspeakers', words: /no (sound|audio)|can.?t hear (the call|them)|far.end audio|loudspeaker|volume|silent|audio drops? out|loses audio/i },
  { id: 'echo', group: 'audio', icon: 'speaker', label: 'People on the call hear themselves back', title: 'Echo heard by the people on the call', path: [['speaker'], [...MICS, 'bar'], ['dsp']], says: 'where an echo is made and where it is removed', words: /echo|hear themselves|feedback|howl/i },
  { id: 'no-camera', group: 'video', icon: 'camera', label: 'People on the call can’t see the room', title: 'No picture from the room camera', path: [['camera', 'bar'], ['switcher'], ['compute']], says: 'the way the room’s picture travels to the call', words: /no video|no picture|camera (shows|is|does)|black picture|can.?t see (the room|us)/i },
  { id: 'framing', group: 'video', icon: 'camera', label: 'The camera shows the wrong part of the room', title: 'The camera does not frame the room', path: [['camera', 'bar'], ['touch', 'control']], says: 'the camera, and the control that holds its presets', words: /fram|preset|wrong (view|part)|cover every seat|furniture moved|out of (the )?picture/i },
  { id: 'blank', group: 'display', icon: 'display', label: 'The room screen is blank', title: 'The room screen is blank', path: [['compute'], ['switcher'], SCREENS], says: 'the way a picture travels to the room screen', words: /blank|black screen|does not wake|no picture on|standby|screen (is )?(off|dark)|projector/i },
  { id: 'laptop', group: 'display', icon: 'display', label: 'My laptop won’t show on the screen', title: 'A laptop does not show on the room screen', path: [['switcher', 'compute'], SCREENS], says: 'where a laptop’s picture enters and where it is shown', words: /laptop|present(ing)?|cable|hdmi|share (my|the) screen|input/i },
  { id: 'frozen', group: 'control', icon: 'control', label: 'The touch panel doesn’t respond', title: 'The touch panel does not respond', path: [['touch', 'scheduler'], ['control'], ['switch']], says: 'the touch panel, what it controls through, and the network it is powered by', words: /touch ?panel|panel (is|does|frozen)|frozen|unresponsive|control/i },
  { id: 'join', group: 'network', icon: 'network', label: 'The room won’t join the meeting', title: 'The room does not join the meeting', path: [['scheduler', 'touch'], ['compute'], ['switch']], says: 'what joins the meeting, and the network it joins through', words: /join|calls? dropped|connect|network|calendar|invite/i },
  { id: 'other', group: 'other', icon: 'info', label: 'Something else', title: 'A problem in the room', path: [], says: '', words: /$^/ },
];
export const symptomOf = (id: string | null | undefined): Symptom | null => SYMPTOMS.find((s) => s.id === id) || null;
export const GROUP_WORD: Record<Group, string> = { audio: 'Sound', video: 'Camera', display: 'Screen', control: 'Touch panel and control', network: 'Joining and network', other: 'Other' };

// ------------------------------------------------------------------------------------------------------------ arriving
const norm = (s: string) => s.toLowerCase().replace(/[—–-]/g, ' ').replace(/[^a-z0-9. ]+/g, ' ').replace(/\s+/g, ' ').trim();
/** Rooms a person may mean by what they typed: a name, a number, a building, or the code printed on the door label. */
export function findRooms(text: string, limit = 8): RoomOutline[] {
  const q = norm(text); if (!q) return [];
  const exact = CAMPUS_ROOMS.find((r) => r.id.toLowerCase() === text.trim().toLowerCase()); if (exact) return [exact];
  const words = q.split(' ');
  const scored = CAMPUS_ROOMS.map((r) => {
    const b = buildingByKey(r.building); const hay = norm(`${fullName(r)} ${b?.name || ''} ${r.aliases.join(' ')} floor ${r.floor}`);
    if (!words.every((w) => hay.includes(w))) return null;
    const num = r.number.toLowerCase(); const s = (words.includes(num) ? 6 : words.some((w) => num.startsWith(w)) ? 3 : 0) + (norm(shortName(r)) === q ? 6 : 0) + (norm(r.name).startsWith(q) ? 2 : 0) + (r.kind === 'reference' ? 0.5 : 0);
    return { r, s };
  }).filter((x): x is { r: RoomOutline; s: number } => !!x);
  return scored.sort((a, b) => b.s - a.s || a.r.id.localeCompare(b.r.id)).slice(0, limit).map((x) => x.r);
}
/** What the door label says: the address of this page for this room. A phone that reads it opens the room here. */
export const labelFor = (roomId: string, base: string) => `${base}#/here/${roomId}`;

// ------------------------------------------------------------------------------------------------------------ what is in the room
export interface Kind { cat: string; label: string; layer: Position['layer']; count: number; codes: string[] }
const PLURAL: Record<string, string> = { switch: 'Network switches', compute: 'UC room computes', micwireless: 'Wireless microphone systems' };
export const many = (label: string, n: number, cat = '') => (n === 1 ? label : PLURAL[cat] || `${label.replace(/ \(DSP\)$/, '')}s`);
/** The room's equipment by kind, in the order a person meets it: what they look at, what they are seen and heard by, what they press. */
const ORDER = ['display', 'projector', 'ledwall', 'camera', 'bar', 'micceil', 'mictable', 'micwireless', 'speaker', 'touch', 'scheduler', 'compute', 'switcher', 'encoder', 'dsp', 'amp', 'control', 'switch', 'rack'];
export function kindsOf(r: RoomRecord): Kind[] {
  const m = new Map<string, Kind>();
  for (const p of r.positions) { if (p.furniture) continue; const k = m.get(p.cat) || { cat: p.cat, label: p.catLabel, layer: p.layer, count: 0, codes: [] }; k.count += 1; k.codes.push(p.code); m.set(p.cat, k); }
  const at = (c: string) => { const i = ORDER.indexOf(c); return i < 0 ? ORDER.length : i; };
  return [...m.values()].sort((a, b) => at(a.cat) - at(b.cat));
}
/** The room in a sentence a newcomer can use. */
export function plainEquipment(r: RoomRecord): string {
  const k = kindsOf(r); if (!k.length) return 'No equipment is recorded for this room yet.';
  const seen = k.filter((x) => !['dsp', 'amp', 'control', 'switch', 'rack', 'compute', 'switcher', 'encoder'].includes(x.cat)); const hidden = k.length - seen.length;
  const list = seen.map((x) => `${x.count === 1 ? (/^([aeiou]|LED)/i.test(x.label) ? 'an' : 'a') : x.count} ${many(x.label, x.count, x.cat).toLowerCase().replace('led wall', 'LED wall')}`);
  const said = list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0] || '';
  return `${said ? `You can see ${said}.` : ''}${hidden ? ` ${said ? 'Behind them' : 'Out of sight'}, ${hidden === 1 ? 'one more kind of equipment does' : `${hidden} more kinds of equipment do`} the processing and the networking.` : ''}`.trim();
}

// ------------------------------------------------------------------------------------------------------------ its history
export interface HistoryRow { at: string; kind: 'job' | 'issue' | 'unit' | 'baseline' | 'lifecycle' | 'exception' | 'visit'; title: string; detail: string; state: string; tone: 'ok' | 'warn' | 'bad' | 'info' | 'muted'; id: string; group: Group | null; live: boolean; href: string | null }
const LIVE = new Set(['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'REOPENED']);
const JOB_WORD: Record<string, [string, HistoryRow['tone']]> = {
  OPEN: ['Reported, waiting to be looked at', 'warn'], TRIAGED: ['Reviewed, waiting for a technician', 'warn'], ASSIGNED: ['A technician is assigned', 'info'], ACCEPTED: ['The technician has accepted the job', 'info'], IN_PROGRESS: ['Being worked on', 'info'], VERIFYING: ['Fixed, being checked', 'info'],
  RESOLVED: ['Fixed and checked', 'ok'], CLOSED: ['Closed', 'ok'], REOPENED: ['Came back, reopened', 'bad'], CANCELLED: ['Cancelled', 'muted'],
};
export const jobWords = (state: string): [string, HistoryRow['tone']] => JOB_WORD[state] || [state, 'info'];
/** Which kind of problem a title is about, from its words; null when the words do not say. */
export function groupOf(title: string): Group | null {
  if (/echo|audio|sound|hear|microphone|\bmic\b|speech|loudspeaker|speaker|volume|interpretation|intelligib/i.test(title)) return 'audio';
  if (/camera|video|framing|picture from/i.test(title)) return 'video';
  if (/display|screen|projector|blank|standby|led wall|viewing distance|sightline|gallery wall/i.test(title)) return 'display';
  if (/touch ?panel|control|panel/i.test(title)) return 'control';
  if (/network|join|calls? dropped|switch|bridge|connect/i.test(title)) return 'network';
  return null;
}
export interface Visit { id: string; roomId: string; roomName: string; role: string; at: string; symptom: SymptomId; group: Group; note: string; tried: Array<{ id: string; text: string; result: 'fixed' | 'same' | 'skipped' }>; outcome: 'fixed' | 'reported' | 'joined'; incidentId: string | null; fixedBy: string | null; suspects: string[] }

/**
 * Everything on record about the room, newest first: its ServiceHands jobs (open and past), the issues of its record, the units that
 * were replaced, baseline and lifecycle changes, and what people did in the room through this page.
 */
export function historyOf(r: RoomRecord, w: Workspace | null, visits: Visit[] = []): { rows: HistoryRow[]; open: number; summary: string[] } {
  const id = r.outline.id; const rows: HistoryRow[] = [];
  const jobs = (w?.incidents || []).filter((i) => i.roomId === id); const jobIds = new Set(jobs.map((j) => j.id));
  for (const j of jobs) { const [word, tone] = jobWords(j.state); rows.push({ at: j.openedAt, kind: 'job', title: j.title, detail: `ServiceHands job · ${word}${j.recurrenceOf ? ` · came back after ${j.recurrenceOf}` : ''}`, state: j.state, tone, id: j.id, group: groupOf(j.title), live: LIVE.has(j.state), href: '#/servicehands' }); }
  for (const i of r.issues) if (!jobIds.has(i.id)) rows.push({ at: '', kind: 'issue', title: i.title.replace(/ \([a-z_]+:[A-Z0-9-]+\)$/, ''), detail: `On the room’s record · ${i.source}`, state: i.state, tone: i.state === 'RESOLVED' ? 'ok' : i.severity === 'High' ? 'bad' : 'warn', id: i.id, group: groupOf(i.title), live: i.state !== 'RESOLVED', href: null });
  for (const m of moves(r)) { if (m.kind === 'issue') continue; rows.push({ at: m.at, kind: m.kind, title: m.kind === 'unit' ? m.title : m.kind === 'baseline' ? 'Commissioning baseline changed' : m.kind === 'lifecycle' ? 'The room’s stage changed' : m.title, detail: `${m.from} → ${m.to} · ${m.by}`, state: m.kind.toUpperCase(), tone: 'muted', id: `${m.kind}:${m.at}`, group: m.kind === 'unit' ? groupOf(m.title) : null, live: false, href: null }); }
  for (const v of visits.filter((x) => x.roomId === id && x.outcome === 'fixed')) { const s = symptomOf(v.symptom); rows.push({ at: v.at, kind: 'visit', title: s?.title || 'A problem in the room', detail: `Fixed in the room by the person who noticed it${v.fixedBy ? `: ${v.fixedBy}` : ''}`, state: 'FIXED_IN_ROOM', tone: 'ok', id: v.id, group: v.group, live: false, href: null }); }
  rows.sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0) || (b.at || '0').localeCompare(a.at || '0'));
  const open = rows.filter((x) => x.live).length; const summary: string[] = [];
  const by = new Map<Group, HistoryRow[]>(); for (const x of rows) if (x.group && (x.kind === 'job' || x.kind === 'issue' || x.kind === 'visit')) by.set(x.group, [...(by.get(x.group) || []), x]);
  for (const [g, list] of [...by].sort((a, b) => b[1].length - a[1].length)) {
    const live = list.filter((x) => x.live).length; const last = list.map((x) => x.at).filter(Boolean).sort().pop();
    summary.push(`${GROUP_WORD[g]}: ${list.length} on record${live ? `, ${live} still open` : ', none open'}${last ? `. Most recent ${last.slice(0, 10)}` : ''}.`);
  }
  const swaps = rows.filter((x) => x.kind === 'unit'); if (swaps.length) summary.push(`${swaps.length === 1 ? 'One unit has' : `${swaps.length} units have`} been replaced since the room was accepted${swaps[0]!.at ? `; the latest on ${swaps[0]!.at.slice(0, 10)}` : ''}.`);
  if (!rows.length) summary.push('Nothing has been reported in this room, and nothing has been changed since it was handed over.');
  return { rows, open, summary };
}
/** How many times the same kind of problem was fixed in the room, by the people in it, in the last thirty days. */
export function repeats(visits: Visit[], roomId: string, group: Group, nowMs = Date.now()): number {
  return visits.filter((v) => v.roomId === roomId && v.group === group && v.outcome === 'fixed' && nowMs - Date.parse(v.at) < 30 * 864e5).length;
}

// ------------------------------------------------------------------------------------------------------------ what a symptom points at
export interface Suspects { stages: Array<{ label: string; positions: Position[] }>; positions: Position[]; codes: string[]; links: Connection[];
  /** open reports about the same kind of problem in this room, the ones whose words describe this very symptom first */
  known: OpenIssue[]; /** ids of the known reports whose words describe this very symptom */ same: string[] }
/** The equipment of this room a symptom can sit in, in signal order, with the recorded connections between them and what is already reported. */
export function suspectsOf(r: RoomRecord, symptom: Symptom, w: Workspace | null): Suspects {
  const stages: Suspects['stages'] = [];
  for (const cats of symptom.path) { const ps = r.positions.filter((p) => !p.furniture && cats.includes(p.cat)); if (ps.length) stages.push({ label: [...new Set(ps.map((p) => p.catLabel))].join(' or '), positions: ps }); }
  const positions = stages.flatMap((s) => s.positions); const codes = positions.map((p) => p.code); const set = new Set(codes);
  const links = r.connections.filter((c) => !c.removed && set.has(c.from) && set.has(c.to));
  const all = roomIssues(r, w);
  const same = symptom.group === 'other' ? [] : all.filter((i) => symptom.words.test(i.title)).map((i) => i.id);
  // a design finding on the room's record is history, not something a person in the room adds to: only jobs in progress are offered, plus anything whose words are this symptom
  const known = symptom.group === 'other' ? [] : all.filter((i) => same.includes(i.id) || (i.live && groupOf(i.title) === symptom.group)).sort((a, b) => (same.includes(b.id) ? 1 : 0) - (same.includes(a.id) ? 1 : 0));
  return { stages, positions, codes, links, known, same };
}

// ------------------------------------------------------------------------------------------------------------ guided help
export interface Step { id: string; tier: Tier; do: string; look: string; uses: string[]; caution?: string; link?: { href: string; label: string } }
interface Ctx { has: (...cats: string[]) => boolean; codes: (...cats: string[]) => string[]; panel: string; screen: string; room: string; id: string }
interface Tpl { id: string; tier: Tier; needs?: string[]; uses?: string[]; do: (c: Ctx) => string; look: (c: Ctx) => string; caution?: string; link?: (c: Ctx) => { href: string; label: string } }
const REJOIN: Tpl = { id: 'rejoin', tier: 'person', needs: ['touch', 'compute', 'bar'], uses: ['touch', 'compute'], do: (c) => `Leave the meeting and join it again from ${c.panel}.`, look: () => 'After joining again, the problem is gone.' };
const GUIDES: Record<SymptomId, Tpl[]> = {
  'far-cant-hear': [
    { id: 'mute', tier: 'person', needs: ['touch', 'compute', 'bar'], uses: ['touch'], do: (c) => `Look at the microphone button on ${c.panel}. If it is red or crossed out, press it once.`, look: () => 'The button is no longer red, and the people on the call say they hear you.' },
    { id: 'wireless', tier: 'person', needs: ['micwireless'], uses: ['micwireless'], do: () => 'Pick up the hand-held or clip-on microphone. Check that it is switched on and that its battery light is not red.', look: () => 'The microphone’s light is steady, and the people on the call hear the person holding it.' },
    { id: 'speak', tier: 'person', needs: ['micceil', 'mictable', 'bar'], uses: ['micceil', 'mictable', 'bar'], do: () => 'Say a sentence at your normal volume from where you sit, and ask the people on the call whether they hear it. Try it from one more seat.', look: () => 'They hear you clearly from every seat in use. If only some seats are quiet, remember which: that goes in the report.' },
    { id: 'device', tier: 'person', needs: ['compute', 'bar'], uses: ['compute', 'bar'], do: () => 'In the meeting’s audio settings, check that the microphone is the room’s own and not a laptop in the room.', look: () => 'The microphone named for the room is the one selected.' },
    REJOIN,
    { id: 'baseline', tier: 'technician', needs: ['dsp'], uses: ['dsp', 'micceil', 'mictable', 'micwireless'], do: () => 'Open the room’s tests and compare the microphone level recorded today with the value the room was commissioned at.', look: () => 'The level is inside the commissioned range. A level well under it points at the microphone or its input on the audio processor, not at the meeting.', caution: 'Do not change the audio processor from the room. Its settings are part of the commissioned room: a change needs a work order and a retest.', link: (c) => ({ href: `#/room/${c.id}?tab=tests`, label: 'Open the room’s tests' }) },
  ],
  'room-cant-hear': [
    { id: 'volume', tier: 'person', needs: ['touch', 'compute', 'bar'], uses: ['touch', 'speaker'], do: (c) => `Raise the room volume on ${c.panel} to about the middle.`, look: () => 'You hear the people on the call from the room’s loudspeakers.' },
    { id: 'device', tier: 'person', needs: ['compute', 'bar'], uses: ['compute', 'bar'], do: () => 'In the meeting’s audio settings, check that the speaker is the room’s own and not a laptop.', look: () => 'The speaker named for the room is the one selected.' },
    { id: 'level', tier: 'person', uses: ['compute', 'display', 'projector', 'ledwall'], do: (c) => `Ask someone on the call to speak while you watch ${c.screen}: a moving level beside their name means their sound is arriving.`, look: () => 'Their level moves while they speak. If it moves and the room stays silent, the fault is in this room; if it does not move, it is at their end.' },
    REJOIN,
    { id: 'each', tier: 'technician', needs: ['speaker'], uses: ['speaker', 'amp'], do: () => 'With call audio playing, listen at each loudspeaker in turn.', look: () => 'Every loudspeaker plays. One silent loudspeaker points at that loudspeaker or its amplifier channel; all of them silent points upstream, at the amplifier or the audio processor.', caution: 'Listen only. Do not unplug or re-patch loudspeaker lines from the room.' },
  ],
  echo: [
    { id: 'second', tier: 'person', do: () => 'Ask whether anyone in the room has also joined the meeting on a laptop or a phone. Have them mute it and turn its speaker off.', look: () => 'The echo stops as soon as the second device is silent. This is the most common cause.' },
    { id: 'lower', tier: 'person', needs: ['touch', 'compute', 'bar'], uses: ['touch', 'speaker'], do: (c) => `Lower the room volume a few steps on ${c.panel}.`, look: () => 'The echo is quieter or gone. If it only happens when the room is loud, say so in the report.' },
    { id: 'when', tier: 'person', do: () => 'Notice whether the echo is there from the start of the call or only after some minutes.', look: () => 'You can say when it starts. That one fact tells the engineer where to look first.' },
    { id: 'reference', tier: 'technician', needs: ['dsp'], uses: ['dsp', 'speaker'], do: () => 'Check the room’s history for a change to the audio since it was commissioned: a re-tune, a replaced loudspeaker or amplifier.', look: () => 'The history shows no audio change. If it shows one, the echo canceller may no longer be given the same signal the loudspeakers play, and it removes the wrong thing.', caution: 'Say what you found; do not re-tune from the room. Echo cancellation is retested after any change.', link: (c) => ({ href: `#/room/${c.id}?tab=history`, label: 'Open the room’s history' }) },
  ],
  'no-camera': [
    { id: 'cover', tier: 'person', needs: ['camera', 'bar'], uses: ['camera', 'bar'], do: () => 'Look at the camera. If it has a privacy cover, slide it open. If it is turned towards the wall, it may be parked: start the meeting and watch whether it turns back.', look: () => 'The lens is uncovered and faces the room.' },
    { id: 'button', tier: 'person', needs: ['touch', 'compute'], uses: ['touch'], do: (c) => `Check the camera button on ${c.panel}. If it is crossed out, press it once.`, look: (c) => `Your own picture appears on ${c.screen}.` },
    { id: 'device', tier: 'person', needs: ['compute', 'bar'], uses: ['compute', 'bar'], do: () => 'In the meeting’s video settings, check that the camera is the room’s own.', look: () => 'The camera named for the room is the one selected.' },
    REJOIN,
    { id: 'source', tier: 'technician', needs: ['switcher'], uses: ['switcher', 'camera'], do: (c) => `On the camera page of ${c.panel}, check that the room camera is the chosen source on the video switcher.`, look: () => 'The room camera is selected and its picture reaches the meeting. A picture on the switcher’s preview but not in the meeting points at the room compute.' },
    { id: 'swap', tier: 'technician', needs: ['camera'], uses: ['camera'], do: () => 'Check the room’s history for a camera replacement.', look: () => 'No replacement, or a replacement whose tests were run again. A replaced camera is not trusted until its presets and its tests are redone.', link: (c) => ({ href: `#/room/${c.id}?tab=history`, label: 'Open the room’s history' }) },
  ],
  framing: [
    { id: 'preset', tier: 'person', needs: ['touch'], uses: ['touch', 'camera'], do: (c) => `On ${c.panel}, open the camera page and press the first preset.`, look: () => 'The picture shows the whole table and everyone seated at it.' },
    { id: 'furniture', tier: 'person', uses: ['camera', 'bar'], do: () => 'Compare the furniture with the plan beside this step. Tables or chairs moved out of place can put people outside the picture.', look: () => 'The furniture is where the plan shows it. If it has been moved and you can move it back safely, do; if not, say so in the report.' },
    { id: 'hands', tier: 'person', needs: ['camera'], uses: ['camera'], do: () => 'Leave the camera itself alone. If the preset is wrong, report it.', look: () => 'Nothing to see: this step is here so the camera is not turned by hand.', caution: 'A camera turned by hand loses its presets, and its motor can be damaged.' },
  ],
  blank: [
    { id: 'wake', tier: 'person', needs: ['touch', 'scheduler'], uses: ['touch'], do: (c) => `Tap ${c.panel} once to wake the room.`, look: (c) => (c.has('projector') ? 'The projector lights within about a minute and shows the room’s start page.' : `Within about ten seconds ${c.screen} shows the room’s start page.`) },
    { id: 'light', tier: 'person', needs: SCREENS, uses: SCREENS, do: (c) => `Look for a small light on the edge of ${c.screen}.`, look: () => 'A steady light means it has power. No light at all means it has none: report that, and do not open any cabinet or reach behind the screen.' },
    { id: 'source', tier: 'person', needs: ['touch'], uses: ['touch', ...SCREENS], do: (c) => `On ${c.panel}, choose what should be shown: the meeting, or the laptop input.`, look: (c) => `${c.screen[0]!.toUpperCase()}${c.screen.slice(1)} shows what you chose.` },
    { id: 'which', tier: 'technician', needs: SCREENS, uses: ['compute', 'switcher', ...SCREENS], do: (c) => `Work out which is dark: ${c.screen} itself, or the picture sent to it. Bring up its own menu from its buttons.`, look: () => 'If its own menu appears, the screen works and the fault is the source or the cable between. If nothing appears and there is no light, it is the screen or its power.' },
  ],
  laptop: [
    { id: 'cable', tier: 'person', do: () => 'Check that the cable is pushed fully into your laptop. If your laptop needs an adapter and the room has a second one, try it.', look: () => 'Your laptop notices a second screen within a few seconds.' },
    { id: 'input', tier: 'person', needs: ['touch'], uses: ['touch', ...SCREENS], do: (c) => `On ${c.panel}, choose the laptop input.`, look: (c) => `${c.screen[0]!.toUpperCase()}${c.screen.slice(1)} shows your laptop.` },
    { id: 'settings', tier: 'person', do: () => 'On the laptop, open its display settings and choose to duplicate or extend the screen.', look: () => 'The room screen shows the laptop’s picture.' },
    { id: 'inputs', tier: 'technician', needs: ['switcher'], uses: ['switcher'], do: () => 'With a laptop you know to be good, try each table input in turn and watch the switcher’s source page.', look: () => 'Every input shows. One dead input points at that cable or its wall plate; all dead points at the switcher.' },
  ],
  frozen: [
    { id: 'hold', tier: 'person', needs: ['touch', 'scheduler'], uses: ['touch', 'scheduler'], do: (c) => `Touch and hold the middle of ${c.panel} for two seconds.`, look: () => 'The panel lights and shows this room’s name.' },
    { id: 'name', tier: 'person', needs: ['touch', 'scheduler'], uses: ['touch', 'scheduler'], do: () => 'Read the room name on the panel.', look: (c) => `It says ${c.room}. A panel that names another room is controlling that other room: report it.` },
    { id: 'leave', tier: 'person', do: () => 'Leave the panel and its cable plugged in. You can still hold your meeting from a laptop while this is reported.', look: () => 'Nothing to see: this step is here so the panel is not unplugged.', caution: 'The panel is powered through its network cable. Unplugging it can leave it worse than you found it.' },
    { id: 'which', tier: 'technician', needs: ['touch'], uses: ['touch', 'control', 'switch'], do: () => 'Note which it is: the panel is dark, or it is lit and says it is offline.', look: () => 'Dark means it has lost power, which reaches it over its network cable from the switch. Lit but offline means it has power and has lost the control processor or the network path to it.' },
  ],
  join: [
    { id: 'invite', tier: 'person', uses: ['touch', 'scheduler'], do: () => 'Check that the meeting invitation includes this room. The room joins the meetings it was invited to.', look: (c) => `The meeting appears on ${c.panel} with a Join button.` },
    { id: 'byid', tier: 'person', needs: ['touch'], uses: ['touch', 'compute'], do: (c) => `If it does not appear, choose “Join by ID” on ${c.panel} and type the meeting number from the invitation.`, look: () => 'The room joins the meeting.' },
    { id: 'neighbours', tier: 'person', do: () => 'Ask whether the room next door has the same problem.', look: () => 'Only this room is affected. If several rooms are, it is a network or service problem: say so, and one report covers them all.' },
    { id: 'scope', tier: 'technician', needs: ['switch', 'compute'], uses: ['compute', 'switch'], do: () => 'Decide the scope before anything else: one room or several.', look: () => 'One room failing points at its room compute or its network port. Several failing at once points at the floor’s network or the meeting service, and the room is not where it is fixed.' },
  ],
  other: [],
};
/** The steps for this symptom in this room: only those the room's equipment allows; a technician's steps follow the ones anyone can do. */
export function stepsFor(r: RoomRecord, symptom: SymptomId, tier: Tier): Step[] {
  const cats = new Set(r.positions.filter((p) => !p.furniture).map((p) => p.cat));
  const has = (...c: string[]) => c.some((x) => cats.has(x)); const codes = (...c: string[]) => r.positions.filter((p) => c.includes(p.cat)).map((p) => p.code);
  const panel = has('touch') ? 'the touch panel' : has('scheduler') ? 'the panel by the door' : 'the meeting screen';
  const screen = has('ledwall') ? 'the LED wall' : has('projector') && !has('display') ? 'the projection screen' : 'the room screen';
  const c: Ctx = { has, codes, panel, screen, room: shortName(r.outline), id: r.outline.id };
  return GUIDES[symptom].filter((t) => (tier === 'technician' || t.tier === 'person') && (!t.needs || has(...t.needs)))
    .map((t) => ({ id: t.id, tier: t.tier, do: t.do(c), look: t.look(c), uses: codes(...(t.uses || [])), ...(t.caution ? { caution: t.caution } : {}), ...(t.link ? { link: t.link(c) } : {}) }));
}
export const RESULT_WORD: Record<'fixed' | 'same' | 'skipped', string> = { fixed: 'That fixed it', same: 'No change', skipped: 'Could not be done' };

/** Rooms worth walking into first: the reference room, then rooms whose records hold something to find. */
export function worthAVisit(records: RoomRecord[], n = 4): RoomOutline[] {
  const ref = records.find((r) => r.outline.kind === 'reference'); const out: RoomOutline[] = ref ? [ref.outline] : []; const seen = new Set<string>(out.map((o) => o.archetype));
  for (const r of records) { if (out.length >= n) break; if (r.outline.kind === 'reference' || seen.has(r.outline.archetype) || !stageWord(r.lifecycle).built) continue; if (r.issues.some((i) => i.state !== 'RESOLVED') && r.positions.some((p) => !p.furniture)) { out.push(r.outline); seen.add(r.outline.archetype); } }
  return out;
}

/** What each kind of equipment is for, for someone who has never been in the room. */
export const WHAT_IT_DOES: Record<string, string> = {
  display: 'Shows the meeting and whatever is being shared.', projector: 'Throws the picture onto the screen at the front.', ledwall: 'A large screen built from LED panels.',
  camera: 'Shows the room to the people on the call.', bar: 'A camera, microphones and loudspeakers in one unit, usually under the screen.',
  micceil: 'Picks up voices from the seats beneath it.', mictable: 'Picks up voices from the seats around it.', micwireless: 'Hand-held and clip-on microphones for a presenter.',
  speaker: 'Plays the call’s sound into the room.', touch: 'Where you start a meeting, change the volume and choose what is shown.', scheduler: 'Shows the room’s bookings, by the door.',
  compute: 'The computer that runs the meeting.', switcher: 'Chooses which picture goes to which screen.', encoder: 'Sends the room’s picture and sound out as a stream or a recording.',
  dsp: 'Mixes the microphones, removes echo and feeds the loudspeakers. Usually out of sight.', amp: 'Drives the loudspeakers. Usually out of sight.',
  control: 'Carries the touch panel’s commands to the rest of the room.', switch: 'Connects the room’s equipment to the network, and powers some of it.', rack: 'The cabinet that holds the equipment you do not see.',
};
/** The room's stage in words for someone who does not know the lifecycle. `built` is false while there is nothing to walk into. */
export const STAGE_WORD: Record<string, { words: string; tone: 'ok' | 'warn' | 'info' | 'muted'; built: boolean }> = {
  PLANNED: { words: 'Planned, not built yet', tone: 'muted', built: false }, DESIGN_APPROVED: { words: 'Designed, not built yet', tone: 'muted', built: false }, INSTALLATION_PENDING: { words: 'Waiting to be installed', tone: 'muted', built: false },
  INSTALLED_UNVERIFIED: { words: 'Installed, not tested yet', tone: 'info', built: true }, COMMISSIONING: { words: 'Being tested before hand-over', tone: 'warn', built: true },
  ACCEPTED: { words: 'Tested and accepted', tone: 'ok', built: true }, OPERATIONAL: { words: 'In service', tone: 'ok', built: true },
};
export const stageWord = (lifecycle: string) => STAGE_WORD[lifecycle] || { words: lifecycle.toLowerCase().replace(/_/g, ' '), tone: 'info' as const, built: true };
