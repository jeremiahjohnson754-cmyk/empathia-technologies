/**
 * The Assurance estate model: V2.5.3's assuranceEstate, remedyOf, costScope, readyCheckOf, CHANGE_KINDS and maintenance signals, ported
 * to this campus's room records (13 Nov 2026, founder: "make sure your version of commissioning assurance apex surpasses v2.5.3's").
 * Every rule is written here and shown on the page that uses it. Nothing is monitored live. Where V2.5.3 seeded telemetry it did not hold
 * (restart counts, start-up times), this model uses only what the records and the service workspace hold, and says so.
 */
import { allRecords, openIssues, DEMO_NOW, type RoomRecord, type Issue } from '../campus/design.js';
import { BUILDINGS, shortName, seeded } from '../campus/canon.js';
import type * as S from '../workspace/store.js';

const DAY = 864e5;
const DONE = ['CLOSED', 'CANCELLED'];
const accepted = (r: RoomRecord) => r.lifecycle === 'ACCEPTED' || r.lifecycle === 'OPERATIONAL';
const current = (r: RoomRecord) => r.baselines.find((b) => b.state === 'CURRENT') || null;
const pendingB = (r: RoomRecord) => r.baselines.find((b) => b.state === 'PENDING_ACCEPTANCE') || null;
export const roomLabel = (r: RoomRecord) => `${shortName(r.outline)} — ${r.outline.name}`;

// ------------------------------------------------------------------------------------------------------------ criticality
export type Crit = 'Mission critical' | 'High' | 'Standard';
const MC = new Set(['TWN', 'CTL', 'TWR', 'EXE', 'AVP', 'OPS']);
const STD = new Set(['HUD', 'FOC']);
export const CRIT_RULE = 'Mission critical: town halls, control, tower and operations rooms, executive rooms and production rooms. Standard: huddle and focus rooms. Every other room is high.';
export const criticalityOf = (r: RoomRecord): Crit => (MC.has(r.outline.archetype) ? 'Mission critical' : STD.has(r.outline.archetype) ? 'Standard' : 'High');
export const CRIT_W: Record<Crit, number> = { 'Mission critical': 3, High: 2, Standard: 1 };

// ------------------------------------------------------------------------------------------------------------ what an issue touches
/** The device categories an issue names: its positions, or the category a missing-equipment check names in its title. */
export function issueCats(r: RoomRecord, i: Issue): string[] {
  const c = i.positions.map((p) => r.positions.find((q) => q.code === p)?.cat).filter((x): x is string => !!x);
  if (c.length) return c;
  const m = /^No (\w+) in/i.exec(i.title); return m ? [m[1]!.toLowerCase()] : [];
}
const LAYOUT_RX = /furniture moved|layout|no longer cover every seat|beyond the planning viewing distance|seat count|too crowded/i;
export const isLayoutIssue = (i: Issue) => LAYOUT_RX.test(i.title);
const roomIncidents = (r: RoomRecord, incidents: S.Incident[]) => incidents.filter((i) => i.roomId === r.outline.id && !DONE.includes(i.state));
/** an incident's text, read for the kind of equipment it is about */
const INC_CAT: Array<[RegExp, string]> = [[/camera|video|framing/i, 'camera'], [/display|screen|projector|wake/i, 'display'], [/microphone|speech|hear/i, 'micceil'], [/audio|echo|sound|dsp/i, 'dsp'], [/touch|panel|control/i, 'touch'], [/network|switch|port/i, 'switch'], [/booking|schedul/i, 'scheduler'], [/join|meeting|call|sign/i, 'compute']];
export const incidentCat = (i: S.Incident) => INC_CAT.find(([rx]) => rx.test(`${i.title} ${i.summary}`))?.[1] || 'compute';

// ------------------------------------------------------------------------------------------------------------ remedy and its cost
export type Remedy = 'recommission' | 'minor' | 'replace' | 'redesign';
export const REMEDY: Array<{ key: Remedy; label: string; tone: 'info' | 'warn' | 'bad'; what: string; rule: string }> = [
  { key: 'recommission', label: 'Recommissioning only', tone: 'info', what: 'Settings drifted. Restore or accept them, run the affected checks, record a new baseline.', rule: 'A new baseline waits for acceptance, or a low or medium issue is open: nothing has to be bought.' },
  { key: 'minor', label: 'Minor remediation', tone: 'warn', what: 'Something failed or is open with the service desk. A visit, a fix and a functional check.', rule: 'A recorded test failed, a high issue is open, or a service job is open in the room.' },
  { key: 'replace', label: 'Replacement', tone: 'warn', what: 'A device is failing repeatedly, or the design requires one that is not there.', rule: 'A service job recurs in the room, or the engine finds required equipment missing.' },
  { key: 'redesign', label: 'Redesign', tone: 'bad', what: 'The layout or the use of the room has moved beyond what the technology covers.', rule: 'An open issue says the layout no longer matches the design (furniture moved, seats beyond the planned coverage).' },
];
/** The mildest remedy a room's findings allow, checked from the most severe down (V2.5.3 remedyOf). */
export function remedyOf(r: RoomRecord, incidents: S.Incident[]): Remedy | null {
  const open = openIssues(r); const inc = roomIncidents(r, incidents);
  if (open.some(isLayoutIssue)) return 'redesign';
  if (inc.some((i) => i.recurrenceOf) || open.some((i) => /missing_required_equipment/.test(i.source))) return 'replace';
  if (r.counts.failed || open.some((i) => i.severity === 'High') || inc.length) return 'minor';
  if (pendingB(r) || open.length) return 'recommission';
  return null;
}

/** V2.5.3's rates (USD an hour, low and high) and device ranges by category, with service life in years. */
export const RATE = { labor: [95, 140], eng: [120, 165], com: [110, 150] } as const;
export const CAT_COST: Record<string, { label: string; cost: [number, number]; life: number; net: boolean }> = {
  display: { label: 'Display', cost: [2200, 6800], life: 6, net: true }, ledwall: { label: 'LED wall', cost: [68000, 120000], life: 8, net: true },
  camera: { label: 'Camera', cost: [2400, 5200], life: 6, net: true }, bar: { label: 'Video bar', cost: [1800, 3600], life: 5, net: true },
  micceil: { label: 'Ceiling microphone array', cost: [2800, 4400], life: 8, net: true }, micwireless: { label: 'Wireless microphone system', cost: [3800, 7200], life: 7, net: true },
  dsp: { label: 'Audio processor', cost: [2600, 6400], life: 9, net: true }, speaker: { label: 'Loudspeaker zone', cost: [600, 2400], life: 12, net: false },
  amp: { label: 'Amplifier', cost: [1400, 3200], life: 10, net: true }, compute: { label: 'Room compute', cost: [1900, 3400], life: 5, net: true },
  touch: { label: 'Touch controller', cost: [900, 1600], life: 6, net: true }, scheduler: { label: 'Scheduling panel', cost: [700, 1200], life: 6, net: true },
  control: { label: 'Control processor', cost: [1800, 3600], life: 8, net: true }, switcher: { label: 'Video switcher', cost: [2400, 7800], life: 8, net: true },
  encoder: { label: 'Stream encoder', cost: [1600, 3800], life: 6, net: true }, switch: { label: 'Access switch', cost: [1800, 4200], life: 7, net: true },
  projector: { label: 'Projector', cost: [1800, 5200], life: 6, net: true }, pdu: { label: 'Power distribution unit', cost: [600, 1400], life: 10, net: true },
};
const CEILING = ['micceil', 'speaker', 'sensor']; const RACKED = ['dsp', 'amp', 'compute', 'control', 'switcher', 'encoder', 'pdu', 'micwireless', 'switch'];
const AV_PROGRAM = ['micceil', 'micwireless', 'dsp', 'camera', 'bar', 'switcher', 'control', 'speaker', 'ledwall'];
/** The eighteen components V2.5.3 priced every scope with. */
export const BUDGET_COMPONENTS: Array<[string, string, 'capex' | 'opex' | 'reserve']> = [['equipment', 'Equipment', 'capex'], ['labor', 'Labor', 'capex'], ['programming', 'Programming', 'capex'], ['configuration', 'Configuration', 'capex'], ['commissioning', 'Commissioning', 'capex'], ['network', 'Network', 'capex'], ['power', 'Power', 'capex'], ['construction', 'Construction', 'capex'], ['furniture', 'Furniture', 'capex'], ['cabling', 'Cabling', 'capex'], ['licenses', 'Licenses', 'opex'], ['freight', 'Freight', 'capex'], ['tax', 'Tax assumption', 'capex'], ['contingency', 'Contingency', 'capex'], ['training', 'Training', 'capex'], ['support', 'Support', 'opex'], ['warranty', 'Warranty', 'capex'], ['lifecycle', 'Lifecycle replacement', 'reserve']];
export interface Scope { level: 'A' | 'B'; hw: Array<{ cat: string; qty: number; action: 'replace' | 'add' }>; relocate: number; furniture: 'move' | null; reconfig: boolean; extra: Array<[string, number, number, string]> }
export interface Cost { lines: Array<{ k: string; label: string; kind: string; lo: number; hi: number; note: string }>; capexLo: number; capexHi: number }
const r100 = (v: number) => Math.round(v / 100) * 100;
/** V2.5.3 costScope, for the scopes an assurance remedy produces (no new room, no LED wall, no catalog picks). */
export function costScope(sc: Scope): Cost {
  const T: Record<string, { lo: number; hi: number; notes: string[] }> = {}; for (const [k] of BUDGET_COMPONENTS) T[k] = { lo: 0, hi: 0, notes: [] };
  const add = (k: string, lo: number, hi: number, note?: string) => { T[k]!.lo += lo; T[k]!.hi += hi; if (note && !T[k]!.notes.includes(note)) T[k]!.notes.push(note); };
  const hrs = (k: string, a: number, b: number, rate: readonly [number, number] | readonly number[], note: string) => add(k, a * rate[0]!, b * rate[1]!, note);
  let reserve = 0;
  for (const h of sc.hw) {
    const C = CAT_COST[h.cat] || CAT_COST['compute']!; const q = h.qty;
    add('equipment', C.cost[0] * q, C.cost[1] * q, `${q} × ${C.label.toLowerCase()} at catalog range`);
    const ih = CEILING.includes(h.cat) || h.cat === 'camera' ? [4, 8] : h.cat === 'display' ? [6, 10] : RACKED.includes(h.cat) ? [1, 2] : [2, 4];
    hrs('labor', ih[0]! * q, ih[1]! * q, RATE.labor, `Install ${q} × ${C.label.toLowerCase()}`);
    hrs('configuration', q, q * 2, RATE.eng, 'Settings and the firmware baseline for each new device');
    if (C.net && h.action === 'add') { add('network', 150 * q, 400 * q, `${q} port${q === 1 ? '' : 's'} patched and configured`); add('cabling', 180 * q, 450 * q, `${q} new run${q === 1 ? '' : 's'}`); add('licenses', 40 * q, 90 * q, 'Device management, per device per year'); }
    else if (h.action === 'replace') add('cabling', 0, 150 * q, 'Existing runs reused; terminations renewed');
    if (h.action === 'add' && !RACKED.includes(h.cat) && h.cat !== 'speaker' && !C.net) add('power', 250 * q, 700 * q, 'New outlets');
    if (CEILING.includes(h.cat) && h.action === 'add') add('construction', 300 * q, 900 * q, 'Ceiling openings and making good');
    if (AV_PROGRAM.includes(h.cat)) hrs('programming', h.cat === 'micceil' ? 3 * q : 2, h.cat === 'micceil' ? 6 * q : 4, RATE.eng, h.cat === 'micceil' ? 'A new microphone zone in the audio processor' : `The room program learns the ${C.label.toLowerCase()}`);
    reserve += ((C.cost[0] + C.cost[1]) / 2) * q / C.life;
  }
  if (sc.hw.some((h) => AV_PROGRAM.includes(h.cat))) hrs('programming', 4, 10, RATE.eng, 'Room program and presets updated and versioned');
  if (sc.relocate) { hrs('labor', 3 * sc.relocate, 5 * sc.relocate, RATE.labor, `${sc.relocate} device${sc.relocate === 1 ? '' : 's'} relocated`); add('cabling', 250 * sc.relocate, 600 * sc.relocate, 'A new cable pathway for each moved device'); add('construction', 150 * sc.relocate, 400 * sc.relocate, 'Ceiling tiles opened and made good'); hrs('programming', 2, 4, RATE.eng, 'Zones and presets set for the new positions'); }
  if (sc.furniture === 'move') hrs('labor', 2, 4, RATE.labor, 'Furniture moved and set to the seat map');
  if (sc.reconfig) hrs('configuration', 2, 4, RATE.eng, 'Presets or frequencies set again and locked');
  for (const x of sc.extra) add(x[0], x[1], x[2], x[3]);
  const cm = sc.level === 'A' ? [3, 6, 'Functional checks for what was moved or re-aimed'] as const : [10, 18, 'Configuration, functional and operational phases for the changed systems'] as const;
  hrs('commissioning', cm[0], cm[1], RATE.com, cm[2]);
  const eq = T['equipment']!;
  if (eq.hi) { add('freight', eq.lo * 0.03, eq.hi * 0.05, '3 to 5% of equipment'); add('tax', eq.lo * 0.08, eq.hi * 0.08, 'An assumed 8% on equipment'); add('warranty', eq.lo * 0.04, eq.hi * 0.06, 'Extended cover, 4 to 6% of equipment'); add('support', eq.lo * 0.08, eq.hi * 0.1, '8 to 10% of equipment a year'); add('lifecycle', reserve * 0.9, reserve * 1.1, 'Equipment cost spread over its service life'); }
  const tr = sc.level === 'A' ? [0, 300] : [300, 800]; add('training', tr[0]!, tr[1]!, sc.level === 'A' ? 'The room guide is checked' : 'Room guide updated; one session for the people who use the room');
  const capK = BUDGET_COMPONENTS.filter((c) => c[2] === 'capex' && c[0] !== 'contingency').map((c) => c[0]);
  const subLo = capK.reduce((a, k) => a + T[k]!.lo, 0); const subHi = capK.reduce((a, k) => a + T[k]!.hi, 0); const p = sc.level === 'A' ? 0.08 : 0.12;
  add('contingency', subLo * p, subHi * p, `${Math.round(p * 100)}% of the capital lines`);
  const lines = BUDGET_COMPONENTS.map(([k, label, kind]) => ({ k, label, kind, lo: r100(T[k]!.lo), hi: r100(T[k]!.hi), note: T[k]!.notes.join('; ') }));
  const sum = (f: 'lo' | 'hi') => lines.filter((l) => l.kind === 'capex').reduce((a, l) => a + l[f], 0);
  return { lines, capexLo: sum('lo'), capexHi: sum('hi') };
}
/** What a remedy asks for in one room (V2.5.3 assureScope). */
export function scopeOf(r: RoomRecord, remedy: Remedy, incidents: S.Incident[]): Scope {
  const sc: Scope = { level: 'A', hw: [], relocate: 0, furniture: null, reconfig: true, extra: [] };
  const open = openIssues(r);
  if (remedy === 'minor') sc.extra = [['labor', 4 * RATE.labor[0], 8 * RATE.labor[1], 'A service visit to find and fix the fault'], ['equipment', 0, 600, 'Spares, if a part is needed']];
  if (remedy === 'replace') {
    sc.level = 'B'; const cats = new Map<string, { qty: number; action: 'replace' | 'add' }>();
    for (const i of open.filter((x) => /missing_required_equipment/.test(x.source))) for (const c of issueCats(r, i)) cats.set(c, { qty: 1, action: 'add' });
    for (const i of roomIncidents(r, incidents).filter((x) => x.recurrenceOf)) { const c = incidentCat(i); if (!cats.has(c)) cats.set(c, { qty: 1, action: 'replace' }); }
    sc.hw = [...cats].map(([cat, v]) => ({ cat, ...v }));
  }
  if (remedy === 'redesign') { sc.level = 'B'; sc.furniture = 'move'; sc.relocate = Math.max(1, new Set(open.filter(isLayoutIssue).flatMap((i) => i.positions)).size); }
  return sc;
}

// ------------------------------------------------------------------------------------------------------------ the estate
export type Worst = 'match' | 'drift' | 'fail' | 'none';
/** The same sort as the command center's rules (Estate.tsx asState), as of a moment: an issue opened later is not yet there. */
export function worstAt(r: RoomRecord, incidents: S.Incident[], t: number, nowReal = Date.now()): Worst {
  const opened = (i: Issue) => { const e = r.events.find((x) => x.type === 'issue.opened' && x.detail === i.title); return e ? Date.parse(e.at) : -Infinity; };
  const open = openIssues(r).filter((i) => opened(i) <= t);
  const inc = roomIncidents(r, incidents).filter((i) => DEMO_NOW - (nowReal - Date.parse(i.openedAt)) <= t);
  if (r.counts.failed || open.some((i) => i.severity === 'High')) return 'fail';
  const cur = current(r); if (!cur || Date.parse(cur.at) > t) return 'none';
  const p = pendingB(r); if ((p && Date.parse(p.at) <= t) || open.length || inc.length) return 'drift';
  return 'match';
}
export interface EstateRow { r: RoomRecord; remedy: Remedy | null; lo: number; hi: number; worst: Worst; crit: Crit }
export function assuranceEstate(incidents: S.Incident[], recs = allRecords()) {
  const rows: EstateRow[] = recs.map((r) => { const remedy = remedyOf(r, incidents); const c = remedy ? costScope(scopeOf(r, remedy, incidents)) : null; return { r, remedy, lo: c?.capexLo || 0, hi: c?.capexHi || 0, worst: worstAt(r, incidents, DEMO_NOW), crit: criticalityOf(r) }; });
  const byRemedy = Object.fromEntries(REMEDY.map((k) => { const l = rows.filter((x) => x.remedy === k.key); return [k.key, { n: l.length, lo: l.reduce((a, x) => a + x.lo, 0), hi: l.reduce((a, x) => a + x.hi, 0), rows: l }]; })) as Record<Remedy, { n: number; lo: number; hi: number; rows: EstateRow[] }>;
  const withRemedy = rows.filter((x) => x.remedy);
  return { rows, byRemedy, lo: withRemedy.reduce((a, x) => a + x.lo, 0), hi: withRemedy.reduce((a, x) => a + x.hi, 0), withRemedy };
}
/** Which way it is moving: the weekly scheduled run of every room with a baseline, over the last four weeks of the record (a modelled
 *  schedule: each run finds what the record held that day). */
export function assuranceTrend(incidents: S.Incident[], recs = allRecords()) {
  const W = 7 * DAY; const weeks = [];
  for (let w = 3; w >= 0; w -= 1) {
    const at = DEMO_NOW - w * W; const runs = recs.filter((r) => { const c = r.baselines.find((b) => b.state !== 'PENDING_ACCEPTANCE'); return c && Date.parse(c.at) <= at; }).map((r) => worstAt(r, incidents, at));
    const n = (k: Worst) => runs.filter((x) => x === k).length;
    weeks.push({ w, at, label: w === 0 ? 'This week' : w === 1 ? 'Last week' : `${w} weeks ago`, match: n('match'), drift: n('drift'), fail: n('fail'), total: runs.length });
  }
  return weeks;
}

// ------------------------------------------------------------------------------------------------------------ ready for the next session
export const READY_CHECKS: Array<{ key: string; label: string; cats: string[] }> = [
  { key: 'display', label: 'Display', cats: ['display', 'ledwall', 'projector'] }, { key: 'camera', label: 'Camera', cats: ['camera', 'bar'] },
  { key: 'microphones', label: 'Microphones', cats: ['micceil', 'mictable', 'micwireless'] }, { key: 'dsp', label: 'DSP', cats: ['dsp', 'amp', 'speaker'] },
  { key: 'compute', label: 'Compute', cats: ['compute', 'switcher', 'encoder'] }, { key: 'network', label: 'Network', cats: ['switch'] },
  { key: 'control', label: 'Control', cats: ['control', 'touch'] }, { key: 'service', label: 'Meeting service', cats: [] },
  { key: 'scheduler', label: 'Scheduler', cats: ['scheduler'] }, { key: 'layout', label: 'Room layout', cats: ['table', 'chairs', 'lectern'] },
  { key: 'issues', label: 'Known open issues', cats: [] },
];
export type ReadyOut = 'ready' | 'note' | 'attention';
export const READY_OUT: Record<ReadyOut, { label: string; tone: 'ok' | 'warn' | 'bad'; rule: string }> = {
  ready: { label: 'Ready', tone: 'ok', rule: 'Every check that applies passes.' },
  note: { label: 'Ready with note', tone: 'warn', rule: 'Usable, with something to know: a low or medium issue, a standard service job, or a baseline waiting for acceptance.' },
  attention: { label: 'Attention required', tone: 'bad', rule: 'Someone has to act first: a failed test, a high issue, or a high or mission-critical service job on that part of the room.' },
};
const SESS: Record<string, string[]> = { TWN: ['All-hands broadcast', 'Town hall rehearsal'], CTL: ['Shift handover', 'Broadcast run-through'], TWR: ['Shift handover'], EXE: ['Leadership planning review', 'Board review'], AVP: ['Broadcast run-through'], OPS: ['Operations stand-up', 'Shift handover'], BRD: ['Board review', 'Quarterly review'], TRN: ['Training session', 'Induction'], DIV: ['All-hands broadcast', 'Customer event'], COL: ['Team meeting', 'Supplier review'], WAR: ['Incident review', 'Planning sprint'], PLT: ['Quality review', 'Shift briefing'], LAB: ['Lab review', 'Design review'], STU: ['Recording session'], WHB: ['Workshop'], SIG: ['Rehearsal'], REC: ['Recording session'] };
/** The room's next session: a booking on the workspace if one exists, otherwise one generated for this demonstration (no calendar is read). */
export function nextSession(r: RoomRecord, w: S.Workspace): { title: string; at: string; generated: boolean } {
  const b = (w.bookings[r.outline.id] || [])[0]; if (b) return { title: b.title, at: b.from.slice(11, 16), generated: false };
  const rnd = seeded(`session:${r.outline.id}`); const opts = SESS[r.outline.archetype] || ['Team meeting'];
  return { title: opts[Math.floor(rnd() * opts.length)]!, at: `${String(9 + Math.floor(rnd() * 8)).padStart(2, '0')}:00`, generated: true };
}
export interface ReadyCheck { room: RoomRecord; crit: Crit; out: ReadyOut; evidence: number; checks: Array<{ key: string; label: string; out: ReadyOut | 'na'; why: string }>; first: { label: string; why: string } | null }
export function readyCheckOf(r: RoomRecord, incidents: S.Incident[]): ReadyCheck {
  const open = openIssues(r); const inc = roomIncidents(r, incidents); const has = new Set(r.positions.map((p) => p.cat));
  const checks = READY_CHECKS.map((c) => {
    if (c.key === 'issues') { const h = open.filter((i) => i.severity === 'High'); return { key: c.key, label: c.label, out: (h.length ? 'attention' : open.length || pendingB(r) ? 'note' : 'ready') as ReadyOut, why: h[0] ? h[0].title : open.length ? `${open.length} open issue${open.length === 1 ? '' : 's'}: ${open[0]!.title}` : pendingB(r) ? `baseline v${pendingB(r)!.version} waits for acceptance` : 'none open' }; }
    if (c.key === 'service') { const s = inc.filter((i) => incidentCat(i) === 'compute'); const bad = s.find((i) => i.severity !== 'Standard'); return { key: c.key, label: c.label, out: (bad ? 'attention' : s.length ? 'note' : 'ready') as ReadyOut, why: bad ? `${bad.id}: ${bad.title}` : s[0] ? `${s[0].id}: ${s[0].title}` : 'joins as commissioned' }; }
    if (c.key === 'layout') { const l = open.filter(isLayoutIssue); return { key: c.key, label: c.label, out: (l.some((i) => i.severity === 'High') ? 'attention' : l.length ? 'note' : 'ready') as ReadyOut, why: l[0] ? l[0].title : `${r.outline.capacity} seats as designed` }; }
    if (!c.cats.some((k) => has.has(k)) && !open.some((i) => issueCats(r, i).some((k) => c.cats.includes(k)))) return { key: c.key, label: c.label, out: 'na' as const, why: 'not in this room' };
    const iss = open.filter((i) => !isLayoutIssue(i) && issueCats(r, i).some((k) => c.cats.includes(k))); const jobs = inc.filter((i) => c.cats.includes(incidentCat(i)));
    const bad = iss.find((i) => i.severity === 'High') || null; const badJob = jobs.find((i) => i.severity !== 'Standard') || null;
    return { key: c.key, label: c.label, out: (bad || badJob ? 'attention' : iss.length || jobs.length ? 'note' : 'ready') as ReadyOut, why: bad ? bad.title : badJob ? `${badJob.id}: ${badJob.title}` : iss[0] ? iss[0].title : jobs[0] ? `${jobs[0].id}: ${jobs[0].title}` : 'as commissioned' };
  });
  const out: ReadyOut = checks.some((c) => c.out === 'attention') ? 'attention' : checks.some((c) => c.out === 'note') ? 'note' : 'ready';
  const f = checks.find((c) => c.out === 'attention') || checks.find((c) => c.out === 'note');
  return { room: r, crit: criticalityOf(r), out, evidence: r.counts.applicable ? Math.round((r.counts.verified / r.counts.applicable) * 100) : 0, checks, first: f ? { label: f.label, why: f.why } : null };
}
/** Every high and mission-critical room in use (accepted, or holding a current baseline while it is recommissioned), least ready first
 *  (V2.5.3 readyList). */
export function readyList(incidents: S.Incident[], recs = allRecords()): ReadyCheck[] {
  const w: Record<ReadyOut, number> = { attention: 0, note: 1, ready: 2 };
  return recs.filter((r) => criticalityOf(r) !== 'Standard' && (accepted(r) || !!current(r))).map((r) => readyCheckOf(r, incidents)).sort((a, b) => w[a.out] * 1e3 - CRIT_W[a.crit] * 100 + a.evidence - (w[b.out] * 1e3 - CRIT_W[b.crit] * 100 + b.evidence));
}

// ------------------------------------------------------------------------------------------------------------ change impact
export type ChangeKind = 'network' | 'firmware' | 'control' | 'device' | 'layout' | 'standard';
export const CHANGE_KINDS: Array<{ key: ChangeKind; label: string; reach: string; dims: string[] }> = [
  { key: 'network', label: 'Network change', reach: 'Every room and device behind the switch', dims: ['network', 'application', 'control', 'scheduling', 'signal'] },
  { key: 'firmware', label: 'Firmware change', reach: 'Every installed device of the kind, and the rooms they are in', dims: ['firmware', 'configuration', 'signal', 'camera', 'audio', 'display', 'control'] },
  { key: 'control', label: 'Control update', reach: 'Every room that runs the control profile', dims: ['control', 'configuration', 'display', 'camera', 'audio'] },
  { key: 'device', label: 'Device replacement', reach: 'The room, and everything that device feeds or is fed by', dims: ['presence', 'firmware', 'configuration', 'signal', 'camera', 'audio', 'display'] },
  { key: 'layout', label: 'Layout change', reach: 'The devices whose coverage depends on where people sit', dims: ['spatial', 'purpose', 'camera', 'audio', 'display'] },
  { key: 'standard', label: 'Standard change', reach: 'Every room and device the standard governs', dims: ['documentation', 'configuration', 'firmware'] },
];
const PROFILE: Record<string, string> = { FOC: 'Essentials', HUD: 'Essentials', COL: 'Collaborate', WHB: 'Collaborate', LAB: 'Collaborate', PLT: 'Collaborate', EXE: 'Present', BRD: 'Present', TRN: 'Present', DIV: 'Present', TWN: 'Broadcast', AVP: 'Broadcast', STU: 'Broadcast', SIG: 'Broadcast', REC: 'Broadcast', CTL: 'Operations', TWR: 'Operations', OPS: 'Operations', WAR: 'Operations' };
export const profileOf = (r: RoomRecord) => PROFILE[r.outline.archetype] || 'Collaborate';
/** What a change can be aimed at, for each kind. */
export function changeTargets(kind: ChangeKind, recs = allRecords()): Array<{ id: string; label: string }> {
  if (kind === 'network') return BUILDINGS.flatMap((b) => { const fl = [...new Set(recs.filter((r) => r.outline.building === b.key).map((r) => r.outline.floor))].sort((x, y) => x - y); return fl.length ? [{ id: `${b.key}`, label: `${b.short} distribution switch` }, ...fl.map((f) => ({ id: `${b.key}/${f}`, label: `${b.short} floor ${f} access switch` }))] : []; });
  if (kind === 'firmware') return Object.entries(CAT_COST).filter(([k]) => recs.some((r) => r.positions.some((p) => p.cat === k))).map(([k, v]) => ({ id: k, label: `${v.label} firmware` }));
  if (kind === 'control') return [...new Set(recs.map(profileOf))].map((p) => ({ id: p, label: `${p} control profile` }));
  if (kind === 'standard') return [{ id: 'firmware', label: 'Firmware baseline standard' }, { id: 'documentation', label: 'Room documentation standard' }];
  return recs.filter((r) => (kind === 'layout' ? true : r.positions.some((p) => !p.furniture))).map((r) => ({ id: r.outline.id, label: roomLabel(r) }));
}
/** What a change reaches: rooms and devices, mission-critical rooms first, and the dimensions to run again (V2.5.3 changeImpact). */
export function changeImpact(kind: ChangeKind, target: string, recs = allRecords()) {
  const K = CHANGE_KINDS.find((k) => k.key === kind)!;
  let rooms: RoomRecord[] = []; let devices = 0;
  const devs = (r: RoomRecord, f: (cat: string) => boolean = () => true) => r.positions.filter((p) => !p.furniture && f(p.cat)).length;
  if (kind === 'network') { const [b, f] = target.split('/'); rooms = recs.filter((r) => r.outline.building === b && (f === undefined || String(r.outline.floor) === f) && r.positions.some((p) => p.cat === 'switch' || CAT_COST[p.cat]?.net)); devices = rooms.reduce((a, r) => a + devs(r, (c) => !!CAT_COST[c]?.net), 0); }
  else if (kind === 'firmware') { rooms = recs.filter((r) => r.positions.some((p) => p.cat === target)); devices = rooms.reduce((a, r) => a + devs(r, (c) => c === target), 0); }
  else if (kind === 'control') { rooms = recs.filter((r) => profileOf(r) === target && r.positions.some((p) => p.cat === 'touch' || p.cat === 'control')); devices = rooms.reduce((a, r) => a + devs(r, (c) => c === 'touch' || c === 'control'), 0); }
  else if (kind === 'standard') { rooms = recs.filter((r) => r.positions.some((p) => !p.furniture)); devices = rooms.reduce((a, r) => a + devs(r), 0); }
  else { const r = recs.find((x) => x.outline.id === target); rooms = r ? [r] : []; devices = r ? (kind === 'layout' ? devs(r, (c) => ['camera', 'bar', 'micceil', 'mictable', 'speaker', 'display'].includes(c)) : devs(r)) : 0; }
  const order = [...rooms].sort((a, b) => CRIT_W[criticalityOf(b)] - CRIT_W[criticalityOf(a)]);
  const crit = order.filter((r) => criticalityOf(r) === 'Mission critical');
  const waves = ([['Mission critical', 1], ['High', 2], ['Standard', 3]] as const).map(([c, n]) => ({ wave: n, crit: c, rooms: order.filter((r) => criticalityOf(r) === c) })).filter((x) => x.rooms.length);
  const tests = rooms.length * K.dims.length;
  return { kind: K, rooms: order, devices, crit, waves, tests, hours: Math.max(1, Math.round((tests * 4 + rooms.length * 6) / 60)) };
}
/** The changes waiting in this demonstration (synthetic; none is made to real equipment). */
export function plannedChanges(recs = allRecords(), incidents: S.Incident[] = []): Array<{ id: string; name: string; kind: ChangeKind; target: string }> {
  const rec = incidents.find((i) => i.recurrenceOf); const recRoom = rec ? recs.find((r) => r.outline.id === rec.roomId) : null;
  const layoutRoom = recs.find((r) => openIssues(r).some(isLayoutIssue) && /Furniture moved/.test(openIssues(r).find(isLayoutIssue)!.title));
  const busiest = [...recs.reduce((m, r) => m.set(`${r.outline.building}/${r.outline.floor}`, (m.get(`${r.outline.building}/${r.outline.floor}`) || 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])[0]![0];
  const [bb, ff] = busiest.split('/'); const bn = BUILDINGS.find((b) => b.key === bb)!;
  return [
    { id: 'PC-01', name: `${bn.short} floor ${ff} access switch update`, kind: 'network', target: busiest },
    { id: 'PC-02', name: 'Firmware update for the audio processors', kind: 'firmware', target: 'dsp' },
    ...(recRoom && rec ? [{ id: 'PC-03', name: `Replace the ${(CAT_COST[incidentCat(rec)]?.label || 'device').toLowerCase()} in ${shortName(recRoom.outline)}`, kind: 'device' as const, target: recRoom.outline.id }] : []),
    { id: 'PC-04', name: `${bn.short} distribution switch update`, kind: 'network', target: bb! },
    { id: 'PC-05', name: 'Collaborate control profile update', kind: 'control', target: 'Collaborate' },
    ...(layoutRoom ? [{ id: 'PC-06', name: `Layout change in ${shortName(layoutRoom.outline)}: the commissioned seat map restored`, kind: 'layout' as const, target: layoutRoom.outline.id }] : []),
    { id: 'PC-07', name: 'Firmware baseline standard: quarterly validation', kind: 'standard', target: 'firmware' },
  ];
}

// ------------------------------------------------------------------------------------------------------------ early signals
export interface Signal { room: RoomRecord; code: string; label: string; cat: string; evidence: string[]; signs: number; deviceId: string }
/** Devices with at least two signs that point the same way, from what the records and the service desk hold. No telemetry is read and
 *  no failure date is predicted. */
export function maintenanceSignals(incidents: S.Incident[], recs = allRecords()): Signal[] {
  const out: Signal[] = [];
  for (const r of recs) {
    const all = incidents.filter((i) => i.roomId === r.outline.id); const open = openIssues(r);
    const seen = new Set<string>();   // one signal for each part of the room (V2.5.3's ready-check groups), on its first device
    for (const p of r.positions.filter((x) => !x.furniture)) {
      const group = READY_CHECKS.find((c) => c.cats.includes(p.cat))?.key || p.cat; if (seen.has(group)) continue;
      const jobs = all.filter((i) => incidentCat(i) === p.cat || (READY_CHECKS.find((c) => c.cats.includes(p.cat))?.cats.includes(incidentCat(i)) ?? false));
      const rec = jobs.filter((i) => i.recurrenceOf); const iss = open.filter((i) => i.positions.includes(p.code));
      const swapped = r.installations.filter((i) => i.position === p.code && i.removedAt);
      const inst = r.installations.find((i) => i.position === p.code && !i.removedAt); const life = CAT_COST[p.cat]?.life;
      const age = inst ? (DEMO_NOW - Date.parse(inst.installedAt)) / (365 * DAY) : 0;
      const ev = [
        jobs.length ? `${jobs.length} service job${jobs.length === 1 ? '' : 's'} on this part of the room${jobs.some((j) => !DONE.includes(j.state)) ? ', one still open' : ''}` : '',
        rec.length ? `${rec.length} recurrence${rec.length === 1 ? '' : 's'} of an earlier job` : '',
        iss.length ? `Open issue on the device: ${iss[0]!.title}` : '',
        swapped.length ? `The unit at this position was replaced ${swapped[0]!.removedAt!.slice(0, 10)}` : '',
        life && age > life * 0.75 ? `In service ${age.toFixed(1)} of its ${life} expected years` : '',
      ].filter(Boolean);
      if (ev.length >= 2) seen.add(group);
      if (ev.length >= 2) out.push({ room: r, code: p.code, label: p.label, cat: p.cat, evidence: ev, signs: ev.length, deviceId: `${r.outline.id}:${p.code}` });
    }
  }
  return out.sort((a, b) => b.signs - a.signs || CRIT_W[criticalityOf(b.room)] - CRIT_W[criticalityOf(a.room)]);
}

// ------------------------------------------------------------------------------------------------------------ design reviews
/** A design score from the engine's own design checks: 100, less 30 for each high finding, 12 for each medium and 5 for each low. */
export const designScore = (r: RoomRecord) => Math.max(0, 100 - r.findings.reduce((a, f) => a + (f.severity === 'High' ? 30 : f.severity === 'Medium' ? 12 : 5), 0));
export const REVIEW_RULE = 'A room is reviewed when its design score is under 70, or when a high design check fails. The score starts at 100 and loses 30 for each high finding of the engine’s design checks, 12 for each medium and 5 for each low. Modelled from the layout and the catalog.';
export function designReviews(recs = allRecords()) {
  return recs.map((r) => ({ r, score: designScore(r), high: r.findings.some((f) => f.severity === 'High') })).filter((x) => x.score < 70 || x.high).sort((a, b) => a.score - b.score);
}

// ------------------------------------------------------------------------------------------------------------ deficiencies: owner and target
export const TARGET_DAYS: Record<string, number> = { High: 14, Medium: 30, Low: 60 };
export const DUE_RULE = 'A deficiency’s target is set from the day it was found: 14 days for high, 30 for medium, 60 for low; in a room not yet installed, it is due before installation. Network equipment goes to the network team; what commissioning recorded goes to the integrator; what was reported after acceptance goes to internal AV.';
export function deficiencyMeta(r: RoomRecord, i: Issue) {
  const ev = r.events.find((e) => e.type === 'issue.opened' && e.detail === i.title)?.at
    || (/FAIL recorded/.test(i.source) ? r.events.filter((e) => e.type === 'commission.result_recorded' && /FAIL/.test(e.detail)).map((e) => e.at).sort()[0] : undefined)
    || r.events.find((e) => e.type === 'room.design_created')?.at || new Date(DEMO_NOW).toISOString();
  const found = Date.parse(ev); const due = found + (TARGET_DAYS[i.severity] || 30) * DAY;
  const cats = issueCats(r, i);
  if (['PLANNED', 'DESIGN_APPROVED', 'INSTALLATION_PENDING'].includes(r.lifecycle)) return { found: new Date(found).toISOString().slice(0, 10), due: 'before installation', late: false, owner: 'Integrator' };
  const owner = cats.includes('switch') ? 'Network team' : /commissioning|engine design check/.test(i.source) ? 'Integrator' : 'Internal AV';
  return { found: new Date(found).toISOString().slice(0, 10), due: new Date(due).toISOString().slice(0, 10), late: i.state !== 'RESOLVED' && due < DEMO_NOW, owner };
}

export const usdK = (v: number) => (v >= 1e6 ? `$${(v / 1e6).toFixed(1)}m` : `$${Math.round(v / 1000)}k`);
export const usdRange = (lo: number, hi: number) => (usdK(lo) === usdK(hi) ? usdK(lo) : `${usdK(lo)} – ${usdK(hi)}`);
