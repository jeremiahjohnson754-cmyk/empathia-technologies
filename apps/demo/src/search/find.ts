/**
 * The demonstration-wide search: one index over the V2.5.3 search destinations (label, description, keywords — `v253-destinations.json`,
 * extracted unchanged from the legacy inventory), the products, the campus (buildings and the thirty rooms) and the device categories,
 * with aliases for the words people actually type ("tv" finds displays, "mic" microphones, "4.218" the reference room). Pure and local:
 * nothing leaves the page, and an empty or unmatched query says so.
 */
import DEST from './v253-destinations.json';
import { BUILDINGS, ROOMS, fullName, roomHref, ARCHETYPE_NAME } from '../campus/canon.js';
import { allRecords, C } from '../campus/design.js';

export interface Hit { id: string; kind: 'room' | 'building' | 'device' | 'product' | 'page' | 'tour'; label: string; description: string; href: string; terms: string; score?: number; why?: string }

/** Words people type → the words the index uses. */
export const ALIASES: Record<string, string[]> = {
  tv: ['display'], screen: ['display'], monitor: ['display'], panel: ['touch', 'display'], beamer: ['projector'], mic: ['microphone'], mics: ['microphone'], microphone: ['microphone'],
  speaker: ['loudspeaker', 'speaker'], loudspeaker: ['speaker'], codec: ['compute', 'video bar'], pc: ['compute'], camera: ['camera', 'video'], cam: ['camera'], ptz: ['camera'],
  dsp: ['audio processor', 'dsp'], amp: ['amplifier'], switch: ['switch', 'network'], network: ['switch', 'network'], wifi: ['network'], rack: ['rack'], power: ['pdu', 'power'],
  ticket: ['servicehands', 'service', 'work order'], incident: ['servicehands', 'issue'], repair: ['servicehands'], dispatch: ['servicehands'], kpi: ['executive', 'passports'], dashboard: ['mission control'],
  scan: ['field intelligence', 'scan'], survey: ['field intelligence'], baseline: ['assurance', 'baseline'], drift: ['assurance'], commissioning: ['commissioning'], cx: ['commissioning'],
  training: ['learn', 'training'], course: ['learn'], lesson: ['learn'], who: ['search party', 'support'], support: ['support', 'search party'], tour: ['tour', 'guided'], demo: ['tour'],
  boardroom: ['boardroom', 'executive'], townhall: ['townhall', 'town hall'], auditorium: ['townhall'], huddle: ['huddle'], classroom: ['training'], lab: ['lab'],
};

const PRODUCTS: Hit[] = [
  ['Mission Control', '#/v25', 'What changed, what matters, what needs action', 'home dashboard overview'],
  ['Lite', '#/v25/build', 'Build a Room and the living campus', 'design room builder spatial 3d scouter'],
  ['Pro', '#/suite/pro', 'Operational intelligence, portfolio, service performance', 'operations command center'],
  ['Search Party', '#/search', 'Universal entity search and relationship intelligence', 'graph relationships who supports'],
  ['ServiceHands', '#/v25/service', 'Service requests, dispatch, field work and closure', 'ticket work order technician'],
  ['Commissioning & Assurance', '#/suite/commission', 'Plans, evidence, verification, acceptance, baselines', 'tests acceptance baseline drift'],
  ['APEX', '#/v25/apex', 'Cited hypotheses, bounded actions', 'diagnosis'],
  ['Field Intelligence', '#/v25/fi', 'What the collector declares, observes and verifies', 'scan collector telemetry'],
  ['Learn', '#/v25/learn', 'Evidence-backed cases and training', 'signal labs lessons training'],
].map(([label, href, description, terms]) => ({ id: `product:${label}`, kind: 'product' as const, label: label!, description: description!, href: href!, terms: `${label} ${terms}`.toLowerCase() }));

const TOURS: Hit[] = [
  { id: 'tour:a', kind: 'tour', label: 'Tour A — The Living Campus', description: 'Campus → building → room → 3D → device → Search Party → Core Replay', href: '#/tours/a', terms: 'tour guided living campus a' },
  { id: 'tour:b', kind: 'tour', label: 'Tour B — Engineering Intelligence', description: 'Field Intelligence → commissioning → evidence → assurance → Search Party', href: '#/tours/b', terms: 'tour guided engineering intelligence b' },
  { id: 'tour:c', kind: 'tour', label: 'Tour C — Learn by Doing', description: 'SIGNAL scenario → lab → diagnosis → competency evidence → back to the room', href: '#/tours/c', terms: 'tour guided learn by doing c' },
];

let index: Hit[] | null = null;
export function searchIndex(): Hit[] {
  if (index) return index;
  const pages: Hit[] = (DEST as Array<{ href: string; label: string; description: string; keywords: string }>).map((d) => ({ id: `page:${d.href}`, kind: 'page', label: d.label, description: d.description, href: d.href, terms: `${d.label} ${d.description} ${d.keywords}`.toLowerCase() }));
  const buildings: Hit[] = BUILDINGS.map((b) => ({ id: `building:${b.key}`, kind: 'building', label: b.name, description: b.purpose, href: `#/campus/${b.key}`, terms: `${b.name} ${b.short} ${b.key} ${b.purpose}`.toLowerCase() }));
  const rooms: Hit[] = ROOMS.map((r) => ({ id: `room:${r.id}`, kind: 'room', label: fullName(r), description: `${ARCHETYPE_NAME[r.archetype]} · ${r.capacity} seats · ${r.kind === 'reference' ? 'reference room' : r.kind === 'earlier' ? 'earlier record' : 'modelled'}`, href: roomHref(r), terms: `${fullName(r)} ${r.id} ${r.number} ${ARCHETYPE_NAME[r.archetype]} ${r.aliases.join(' ')}`.toLowerCase() }));
  // device categories: which rooms have one (from the generated records, so the answer matches the room view)
  const byCat = new Map<string, string[]>();
  for (const rec of allRecords()) for (const p of rec.positions) if (!p.furniture) { const l = byCat.get(p.cat) || []; if (!l.includes(rec.outline.id)) l.push(rec.outline.id); byCat.set(p.cat, l); }
  const devices: Hit[] = [...byCat].map(([cat, ids]) => { const K = C.categories[cat]; const first = ROOMS.find((r) => r.id === ids[0])!; return { id: `device:${cat}`, kind: 'device', label: `${K?.label || cat}`, description: `in ${ids.length} room${ids.length === 1 ? '' : 's'} — first: ${fullName(first)}`, href: `${roomHref(first)}?tab=devices`, terms: `${K?.label || cat} ${cat}`.toLowerCase() }; });
  index = [...PRODUCTS, ...TOURS, ...buildings, ...rooms, ...devices, ...pages];
  return index;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.\- ]+/g, ' ').trim();
const KIND_WEIGHT: Record<Hit['kind'], number> = { room: 3, product: 3, building: 2, tour: 2, device: 2, page: 1 };

/** Rank the index for a query. Every token (or one of its aliases) must match; label hits outrank description hits. */
export function find(query: string, limit = 12): Hit[] {
  const q = norm(query).slice(0, 80); if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean).slice(0, 6);
  const out: Hit[] = [];
  for (const h of searchIndex()) {
    const label = h.label.toLowerCase(); let score = 0; const why: string[] = []; let all = true;
    for (const t of tokens) {
      const alts = [t, ...(ALIASES[t] || [])];
      const inLabel = alts.find((a) => label.includes(a)); const inTerms = alts.find((a) => h.terms.includes(a));
      if (inLabel) { score += label.startsWith(inLabel) ? 6 : 4; if (inLabel !== t) why.push(`“${t}” → ${inLabel}`); }
      else if (inTerms) { score += 2; if (inTerms !== t) why.push(`“${t}” → ${inTerms}`); }
      else { all = false; break; }
    }
    if (all && score) out.push({ ...h, score: score * 10 + KIND_WEIGHT[h.kind], why: why.join(', ') || undefined });
  }
  out.sort((a, b) => b.score! - a.score! || a.label.localeCompare(b.label));
  // one destination per address
  const seen = new Set<string>(); return out.filter((h) => (seen.has(h.href) ? false : (seen.add(h.href), true))).slice(0, limit);
}
