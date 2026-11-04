/**
 * Search Party scenarios on the canonical campus. Each scenario starts from one record and answers one question with grouped, counted
 * relationships, each carrying its provenance. The support organisation, agreements, people and competencies are SYNTHETIC
 * DEMONSTRATION FIXTURES (owner decision 2026-11-01): no real company, contract or credential is implied; competencies read
 * "Internal competency · declared / lab-evidenced / reviewer-verified" — never "certified".
 */
import { ROOMS, roomById, fullName, roomHref, shortName, buildingByKey, REFERENCE_ROOM_ID } from '../campus/canon.js';
import { allRecords, roomRecord, openIssues } from '../campus/design.js';

export interface SItem { id: string; label: string; detail: string; rel: string; provenance: string; href?: string }
export interface SGroup { key: string; label: string; items: SItem[] }
export interface Scenario { id: string; title: string; question: string; hero?: 'A' | 'B' | 'C'; start: { id: string; label: string; href?: string }; groups: SGroup[]; answer: string; cannot: string[]; acts?: Array<{ label: string; href: string }> }

export const FIXTURE = 'synthetic demonstration fixture';
/** Fictional organisations (names from the V2.5.3 source, all invented there). */
const ORG = {
  AV: { name: 'Larkspur Managed Services', kind: 'Managed service provider' }, NET: { name: 'Fernhill Network Services', kind: 'Network provider' },
  PWR: { name: 'Velmoor Electrical', kind: 'Electrical contractor' }, MEDIA: { name: 'Saffron Hill Broadcast', kind: 'AV / technology integrator' }, INT: { name: 'Brightwater AV Integration', kind: 'AV / technology integrator' },
};
/** The fictional partner organisations, for the Organizations tab. */
export const ORGS = Object.values(ORG);
const fict = (n: string) => `${n} (fictional organisation)`;
type Comp = 'declared' | 'lab-evidenced' | 'reviewer-verified';
const TECHS: Array<{ id: string; name: string; site: boolean; comps: Record<string, Comp>; tz: string; load: number }> = [
  { id: 'T-01', name: 'Technician A (synthetic)', site: true, comps: { 'Video systems': 'reviewer-verified', 'Audio DSP': 'lab-evidenced', Network: 'declared' }, tz: 'America/Chicago', load: 2 },
  { id: 'T-02', name: 'Technician B (synthetic)', site: true, comps: { 'Audio DSP': 'reviewer-verified', 'Video systems': 'declared' }, tz: 'America/Chicago', load: 4 },
  { id: 'T-03', name: 'Technician C (synthetic)', site: false, comps: { 'Video systems': 'reviewer-verified', 'Control systems': 'lab-evidenced' }, tz: 'America/New_York', load: 1 },
  { id: 'T-04', name: 'Technician D (synthetic)', site: true, comps: { Network: 'reviewer-verified', Power: 'lab-evidenced' }, tz: 'America/Chicago', load: 0 },
];
export const COMP_LABEL = (c: Comp) => `Internal competency · ${c}`;

export const SCENARIO_IDS = ['S1', 'S2', 'S3', 'S4', 'S5'] as const;
export const SCENARIO_TITLES: Record<string, string> = {
  S1: 'If this switch fails, what is affected?', S2: 'Who supports this space?', S3: 'Dispatch the right expert', S4: 'Repair, verify, learn', S5: 'Is this a pattern across the campus?',
};

export function scenario(id: string, roomId = REFERENCE_ROOM_ID): Scenario | null {
  const room = roomById(roomId) ? roomId : REFERENCE_ROOM_ID;
  const o = roomById(room)!; const rec = roomRecord(room)!; const B = buildingByKey(o.building)!;
  if (id === 'S1') {
    const sw = `NN-${o.building}-${o.floor}`; const same = ROOMS.filter((r) => r.building === o.building && r.floor === o.floor);
    const devs = same.flatMap((r) => roomRecord(r.id)!.positions.filter((p) => !p.furniture && p.layer !== 'furniture' && p.cat !== 'rack').map((p) => ({ r, p })));
    return {
      id, title: SCENARIO_TITLES.S1!, question: `If ${B.short} floor ${o.floor} access switch fails, what is affected?`, start: { id: sw, label: `${B.short} floor ${o.floor} access switch (${sw})` },
      groups: [
        { key: 'rooms', label: 'Rooms on this switch', items: same.map((r) => ({ id: r.id, label: fullName(r), detail: roomRecord(r.id)!.lifecycle, rel: 'CONNECTS_TO', provenance: 'DECLARED (floor network design, synthetic)', href: roomHref(r) })) },
        { key: 'devices', label: 'Networked devices in those rooms', items: devs.map(({ r, p }) => ({ id: `${r.id}/${p.code}`, label: `${p.label} · ${shortName(r)}`, detail: `position ${p.code} · asset ${p.asset || '—'} · identity ${p.identity}`, rel: 'FEEDS', provenance: 'MODELED (proposed connection)', href: `${roomHref(r)}?device=${p.code}` })) },
        { key: 'upstream', label: 'Upstream', items: [{ id: `NN-${o.building}-D`, label: `${B.short} distribution switch`, detail: 'uplink of every floor switch', rel: 'UPLINKS_TO', provenance: 'DECLARED (network design, synthetic)' }, { id: `PN-${o.building}-${o.floor}`, label: `${B.short} floor ${o.floor} power panel`, detail: 'powers the switch', rel: 'POWERED_BY', provenance: 'DECLARED (electrical schedule, synthetic)' }] },
      ],
      answer: `${same.length} room${same.length === 1 ? '' : 's'} and ${devs.length} networked device positions depend on this switch through recorded or proposed connections.`,
      cannot: ['An unrecorded cable is invisible here.', 'Connections inside the designed rooms are MODELED by the engine’s rules, not traced.', 'Nothing is monitored: whether the switch is up now is unknown.'],
    };
  }
  if (id === 'S2') {
    const media = o.building === 'HZN';
    return {
      id, title: SCENARIO_TITLES.S2!, hero: 'A', question: `Who supports ${fullName(o)}?`, start: { id: room, label: fullName(o), href: roomHref(o) },
      groups: [
        { key: 'paths', label: 'Support paths', items: [['AV', media ? 'Media Services Lead' : 'Service Engineer', 'Critical rooms: on site within 30 minutes'], ['Network', 'Network Engineer', 'Loss of service: response within 1 hour'], ['Power and facilities', 'Facilities Lead', 'Safety or loss of power: immediate']].map(([d, role, t]) => ({ id: `SUP-${o.building}-${d!.slice(0, 3).toUpperCase()}`, label: `${B.short} ${d} support`, detail: `primary: ${role} (synthetic role) · ${t}`, rel: 'SUPPORTED_BY', provenance: `${FIXTURE} (V2.5.3 support paths)` })) },
        { key: 'agreements', label: 'Agreements', items: [media ? ORG.MEDIA : ORG.AV, ORG.NET, ORG.PWR].map((x) => ({ id: `AGR-${x.name.split(' ')[0]}`, label: `synthetic support agreement (demonstration fixture) — ${fict(x.name)}`, detail: x.kind, rel: 'ESCALATES_TO', provenance: FIXTURE })) },
        { key: 'people', label: 'People with a matching internal competency', items: TECHS.filter((t) => t.site).map((t) => ({ id: t.id, label: t.name, detail: Object.entries(t.comps).map(([k, v]) => `${k}: ${COMP_LABEL(v)}`).join(' · '), rel: 'COVERS', provenance: FIXTURE })) },
        { key: 'installer', label: 'Integrator of record', items: [{ id: 'ORG-INT', label: fict(ORG.INT.name), detail: `${ORG.INT.kind} · no real company implied`, rel: 'INTEGRATED_BY', provenance: FIXTURE }] },
      ],
      answer: `Three support paths cover ${shortName(o)}; each names a synthetic role, a fictional escalation organisation and a response target.`,
      cannot: ['No real contract, company or employee credential is implied.', 'Availability right now is not modelled.'],
      acts: [{ label: 'Open ServiceHands', href: '#/v25/service' }],
    };
  }
  if (id === 'S3') {
    const iss = openIssues(rec)[0]; const need = iss && /camera|video|sightline/i.test(iss.title) ? 'Video systems' : 'Audio DSP';
    const gate = (t: (typeof TECHS)[number]) => [t.site ? null : 'no site access to this building', t.comps[need] ? null : `no internal competency in ${need}`].filter(Boolean) as string[];
    const ok = TECHS.filter((t) => !gate(t).length).sort((a, b) => a.load - b.load); const no = TECHS.filter((t) => gate(t).length);
    return {
      id, title: SCENARIO_TITLES.S3!, hero: 'B', question: `Who should go to ${shortName(o)}${iss ? ` for “${iss.title}”` : ''}?`, start: { id: iss?.id || room, label: iss ? iss.title : fullName(o), href: roomHref(o) },
      groups: [
        { key: 'eligible', label: `Pass every hard gate (${need}, site access)`, items: ok.map((t, i) => ({ id: t.id, label: `${i + 1}. ${t.name}`, detail: `${COMP_LABEL(t.comps[need]!)} · open jobs ${t.load} (preference: fewer first) · ${t.tz} (declared)`, rel: 'ELIGIBLE', provenance: FIXTURE })) },
        { key: 'gated', label: 'Refused by a hard gate (never overridable)', items: no.map((t) => ({ id: t.id, label: t.name, detail: gate(t).join(' · '), rel: 'GATED', provenance: FIXTURE })) },
      ],
      answer: ok.length ? `${ok.length} technician${ok.length === 1 ? '' : 's'} pass the hard gates; the order is a preference (fewer open jobs) a dispatcher may change with a reason. Gates are never overridden.` : 'No technician passes the hard gates: escalate to the support path.',
      cannot: ['Competencies are internal and synthetic, each shown with its verification state; none grants authority on its own.', 'Assignment is an explicit dispatcher action in ServiceHands; nothing is auto-assigned.', 'No travel estimate is made.'],
      acts: [{ label: 'Dispatch in ServiceHands', href: '#/v25/service' }],
    };
  }
  if (id === 'S4') {
    const ref = roomRecord(REFERENCE_ROOM_ID)!; const re = ref.reopened;
    return {
      id, title: SCENARIO_TITLES.S4!, hero: 'C', question: 'How was the camera at Atlas 4.218 repaired, verified and turned into learning?', start: { id: 'AS-0112', label: 'Camera unit AS-0112 at Atlas 4.218', href: `${roomHref(roomById(REFERENCE_ROOM_ID)!)}?device=${ref.positions.find((p) => p.cat === 'camera')?.code || ''}` },
      groups: [
        { key: 'change', label: 'The replacement', items: ref.installations.filter((x) => ref.positions.find((p) => p.code === x.position)?.cat === 'camera').map((x) => ({ id: `${x.position}/${x.asset}`, label: `${x.asset} at ${x.position}`, detail: `${x.installedAt.slice(0, 10)}${x.removedAt ? ` → ${x.removedAt.slice(0, 10)} (${x.removalReason})` : ' → current'}`, rel: 'INSTALLED_AT', provenance: x.basis })) },
        { key: 'reopened', label: 'Tests reopened and re-verified', items: re.map((x) => ({ id: x.testId, label: x.testId, detail: x.reasons.join('; '), rel: 'REOPENED_BY', provenance: 'commissioning engine (re-run, independently verified)' })) },
        { key: 'held', label: 'What still holds acceptance', items: (ref.nextStep?.blockers || []).map((b, i) => ({ id: `B-${i}`, label: b, detail: ref.exception ? `${ref.exception.id} pending approval` : '', rel: 'BLOCKS', provenance: 'commissioning engine gate' })) },
        { key: 'learn', label: 'Learning', items: [{ id: 'CASE-4218-CAM', label: 'Learn case: camera replacement and re-verification (synthetic, sanitized)', detail: 'competency EVIDENCE only — it never authorises work', rel: 'TEACHES', provenance: FIXTURE, href: '#/v25/learn' }] },
      ],
      answer: `The unit changed, the position stayed. ${re.length} tests were reopened by the replacement, re-run and verified by a different person; acceptance is still held by the engine.`,
      cannot: ['A closed ticket is not recommissioning: re-acceptance is decided by the engine’s gate.', 'Baseline v1 stays CURRENT until v2 is accepted.'],
      acts: [{ label: 'Open the reference room', href: roomHref(roomById(REFERENCE_ROOM_ID)!) }, { label: 'Core Replay', href: `#/replay/${REFERENCE_ROOM_ID}` }],
    };
  }
  if (id === 'S5') {
    const recs = allRecords(); const by = new Map<string, Array<{ r: string; t: string; s: string }>>();
    for (const r of recs) for (const i of openIssues(r)) { const cat = r.positions.find((p) => i.positions.includes(p.code))?.layer || 'room'; const l = by.get(cat) || []; l.push({ r: r.outline.id, t: i.title, s: i.severity }); by.set(cat, l); }
    const groups: SGroup[] = [...by].sort((a, b) => b[1].length - a[1].length).map(([cat, l]) => ({ key: cat, label: `${cat[0]!.toUpperCase()}${cat.slice(1)} issues`, items: l.map((x) => ({ id: `${x.r}:${x.t}`, label: `${shortName(roomById(x.r)!)} — ${x.t}`, detail: x.s, rel: 'AFFECTS', provenance: 'room record (synthetic)', href: roomHref(roomById(x.r)!) })) }));
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    return {
      id, title: SCENARIO_TITLES.S5!, hero: undefined, question: 'Do open issues cluster by system across the thirty rooms?', start: { id: 'SITE-NORTH', label: 'Northstar Innovation Campus' }, groups,
      answer: `${total} open issue${total === 1 ? '' : 's'} across ${new Set(groups.flatMap((g) => g.items.map((i) => i.id.split(':')[0]))).size} rooms, grouped by the system of the device they name.`,
      cannot: ['A cluster is a prompt to look, not a root cause.', 'Issues come from synthetic records; nothing is monitored.'],
    };
  }
  return null;
}
export const scenarioCount = (s: Scenario) => s.groups.reduce((n, g) => n + g.items.length, 0);
