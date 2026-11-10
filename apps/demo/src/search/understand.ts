/**
 * Reading a search the way a person meant it. `find()` matches words; this reads the sentence: "bordrooms over 12 seats at atlas with
 * a camera" becomes rooms · boardroom · more than 12 seats · Atlas HQ · has a camera, and the answer is counted from the ninety room
 * records, not looked up. It says how it read the query, which words it corrected and which it could not use, and when nothing
 * matches it says which single condition to drop to get an answer. Pure and local: no model, no network; every figure is computed from
 * the same records the room pages show.
 */
import { find, searchIndex, ALIASES, type Hit } from './find.js';
import { BUILDINGS, REGIONAL_SITES, CAMPUS_ROOMS as ROOMS, fullName, roomHref, ARCHETYPE_NAME, type RoomOutline } from '../campus/canon.js';
import { allRecords, openIssues, C, type RoomRecord, type Layer } from '../campus/design.js';

export type FilterKind = 'state' | 'place' | 'kind' | 'seats' | 'floor' | 'has' | 'lacks' | 'issues' | 'text';
export interface Filter { kind: FilterKind; label: string; /** the words that produce this filter again when typed */ phrase: string; test: (r: RoomRecord) => boolean; note?: (r: RoomRecord) => string }
export interface Fix { from: string; to: string }
export interface Row { id: string; label: string; detail: string; href: string }
export interface Suggest { label: string; q: string }
export interface Reading {
  query: string; corrected: string; fixes: Fix[]; unread: string[];
  /** 'answer': the query was read as conditions on rooms or devices and the result is computed; 'lookup': it names something to open */
  mode: 'answer' | 'lookup' | 'empty';
  ask: 'list' | 'count' | 'largest' | 'smallest'; subject: 'rooms' | 'devices';
  filters: Filter[]; said: string; lead: string; rows: Row[]; total: number; outOf: number;
  hits: Hit[]; loose: boolean; next: Suggest[]; withheld: string | null;
}

const STOP = new Set(('a an the of in at on for to and or me my our we i show find list give get see all any every which what whats is are there that those these do does did have has having ' +
  'please can you tell about room rooms space spaces need needs their its it be been were was now currently right us where who whose them than then so by from into').split(' '));
const SITES = [...BUILDINGS, ...REGIONAL_SITES];
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9.:<>=+\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Words for the kinds of room, longest first so "executive collaboration" is not read as "collaboration": [words, archetypes, label, phrase]. */
const KIND_WORDS: Array<[RegExp, string[], string, string]> = ([
  ['executive collaboration|executive', ['EXE'], 'Executive Collaboration', 'executive'], ['board ?rooms?', ['BRD'], 'Boardroom', 'boardroom'], ['huddles?', ['HUD'], 'Huddle Room', 'huddle'], ['focus', ['FOC'], 'Focus Room', 'focus'],
  ['collaboration', ['COL', 'EXE', 'WHB', 'PLT'], 'a collaboration room of any kind', 'collaboration'], ['training|classrooms?', ['TRN'], 'Training Room', 'training'], ['town ?halls?|auditoriums?|lecture halls?', ['TWN'], 'Townhall', 'townhall'],
  ['control towers?', ['OPS'], 'Operations Control Tower', 'control tower'], ['control rooms?', ['CTL', 'OPS'], 'a control room or control tower', 'control room'], ['labs?|laborator(?:y|ies)', ['LAB'], 'Engineering Lab', 'lab'],
  ['war rooms?', ['WAR'], 'Operations War Room', 'war room'], ['studios?', ['STU'], 'Studio', 'studio'], ['whiteboard(?:ing)?', ['WHB'], 'Whiteboarding Collaboration', 'whiteboarding'], ['video towers?', ['TWR'], 'Video Tower', 'video tower'],
  ['av-over-ip|av over ip|avoip', ['AVP'], 'AV-over-IP Presentation', 'av-over-ip'], ['divisible', ['DIV'], 'Divisible Room', 'divisible'], ['receptions?', ['REC'], 'Reception', 'reception'], ['signage|concourses?', ['SIG'], 'Concourse and Signage', 'signage'],
] as Array<[string, string[], string, string]>).map(([re, codes, label, phrase]) => [new RegExp(`\\b(?:${re})\\b`), codes, label, phrase]);

const STATES: Array<[RegExp, string, string, (r: RoomRecord) => boolean]> = [
  [/\b(?:held|on hold|blocked|not accepted|awaiting acceptance|waiting for acceptance)\b/, 'acceptance held', 'held', (r) => r.lifecycle === 'COMMISSIONING' && !!r.nextStep && r.nextStep.blockers.length > 0],
  [/\b(?:in commissioning|being commissioned|commissioning)\b/, 'in commissioning', 'in commissioning', (r) => r.lifecycle === 'COMMISSIONING'],
  [/\b(?:accepted)\b/, 'accepted', 'accepted', (r) => r.lifecycle === 'ACCEPTED'],
  [/\b(?:operational|in service|in operation)\b/, 'operational', 'operational', (r) => r.lifecycle === 'OPERATIONAL'],
  [/\b(?:planned|in planning)\b/, 'planned', 'planned', (r) => r.lifecycle === 'PLANNED'],
];
const LAYER_WORDS: Record<string, Layer> = { audio: 'audio', sound: 'audio', video: 'video', camera: 'video', display: 'display', picture: 'display', control: 'control', network: 'network', power: 'power' };
const FILTER_WORDS = new Set(('held hold blocked accepted commissioning commissioned operational service planned planning over under more fewer less least most between above below minimum maximum min max up seats seat seating ' +
  'people persons person seater attendees fits fit holds floor ground with without no lacking missing includes including containing how many number count largest biggest smallest issues issue problems problem faults fault broken failing open ' +
  'status site type sector').split(' '));

/** Which equipment categories a typed word means ("tv" → display, "mic" → the three kinds of microphone). */
const DEVICE_PHRASES: Record<string, string[]> = { 'video wall': ['ledwall'], 'led wall': ['ledwall'], 'touch screen': ['touch'], touchscreen: ['touch'], soundbar: ['bar'], 'sound bar': ['bar'], 'ceiling mic': ['micceil'], 'table mic': ['mictable'], 'wireless mic': ['micwireless'], 'room pc': ['compute'] };
export function categoriesFor(word: string): string[] {
  const w = word.toLowerCase().trim(); const all = Object.entries(C.categories).map(([k, v]) => [k, String((v as { label: string }).label).toLowerCase().replace(/\s*\(.*\)/, '')] as const);
  // a word names a category when it is the label, or a word of the label other than a leading describer: "microphone" is all three kinds
  // of microphone, "panel" both panels; "video", "audio" and "wireless" alone name nothing, and neither do words like "system"
  const GENERIC = /^(system|element|device|block|unit)/;
  const named = (a: string) => { const e = all.filter(([, l]) => l === a).map(([k]) => k); if (e.length || a.length < 3 || GENERIC.test(a)) return e;
    return all.filter(([, l]) => { const ws = l.split(' '); return a.includes(' ') ? l.startsWith(a) : ws.some((x, i) => x.startsWith(a) && (i > 0 || ws.length === 1)); }).map(([k]) => k); };
  for (const t of [w, w.replace(/s$/, ''), w.replace(/es$/, '')]) {
    if (t.length < 2) continue; if (DEVICE_PHRASES[t]) return DEVICE_PHRASES[t]!; if (C.categories[t]) return [t];
    const own = named(t); if (own.length) return own;
    for (const a of ALIASES[t] || []) { const c = named(a); if (c.length) return c; }                              // "tv" → display, "speaker" → loudspeaker
  }
  return [];
}
const catLabel = (cats: string[], word: string) => (cats.length === 1 ? String((C.categories[cats[0]!] as { label: string }).label).toLowerCase().replace(/\s*\(.*\)/, '') : (ALIASES[word.replace(/s$/, '')]?.[0] || word.replace(/s$/, '')));
const article = (s: string) => (/^[aeiou]/.test(s) ? 'an' : 'a');

// ── typing mistakes ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Edit distance where swapping two neighbouring letters counts once ("baordroom"). */
export function distance(a: string, b: string): number {
  const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 3;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array<number>(n).fill(0)]); for (let j = 0; j <= n; j++) d[0]![j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1; d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
  }
  return d[m]![n]!;
}
let vocab: Map<string, number> | null = null;
/** Every word that can be searched for, with how many records carry it (a commoner word wins a tie). */
export function vocabulary(): Map<string, number> {
  if (vocab) return vocab; const v = new Map<string, number>(); const add = (w: string, k = 1) => { if (w.length >= 3 && !/^\d/.test(w)) v.set(w, (v.get(w) || 0) + k); };
  for (const h of searchIndex()) for (const w of new Set(norm(`${h.label} ${h.terms}`).split(/[ .:\-]+/))) add(w);
  for (const r of ROOMS) for (const w of new Set(norm(`${r.intent} ${r.sector || ''} ${r.roster?.archetype || ''} ${r.aliases.join(' ')}`).split(/[ .:\-]+/))) add(w);
  for (const w of [...FILTER_WORDS, ...Object.keys(ALIASES), ...Object.keys(LAYER_WORDS), ...SITES.flatMap((b) => norm(`${b.name} ${b.short}`).split(' '))]) add(w, 3);
  for (const [, , , phrase] of KIND_WORDS) for (const w of phrase.split(' ')) add(w, 3);
  for (const w of 'boardroom boardrooms huddle classroom auditorium townhall studio laboratory reception signage'.split(' ')) add(w, 3);
  return (vocab = v);
}
const known = (w: string): boolean => (w.length > 4 && /s$/.test(w) && known(w.replace(/e?s$/, ''))) || STOP.has(w) || FILTER_WORDS.has(w) || /\d/.test(w) || w.length < 5 || vocabulary().has(w) || !!ALIASES[w] || categoriesFor(w).length > 0 || [...vocabulary().keys()].some((k) => k.startsWith(w));
/** The nearest searchable word to a mistyped one, or null when nothing is near enough to be sure. */
export function correct(word: string): string | null {
  if (known(word)) return null; const max = word.length >= 9 ? 2 : 1; let best: string | null = null; let bd = 9; let bf = -1;
  for (const [k, f] of vocabulary()) {
    if (Math.abs(k.length - word.length) > max) continue; const d = distance(word, k); if (d > max) continue;
    if (k[0] !== word[0]) continue;                                                         // a different first letter is a different word ("zoom" is not "room")
    if (d < bd || (d === bd && (f > bf || (f === bf && k < best!)))) { best = k; bd = d; bf = f; }
  }
  return best;
}

// ── reading ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const NUM = '(?<![\\d.])(\\d{1,4})(?![\\d.])';
interface Parsed { ask: Reading['ask']; filters: Filter[]; rest: string; fit: number | null; deviceWord: { word: string; cats: string[] } | null; wantsIssues: boolean; roomsSaid: boolean }

function parse(text: string, may: (field: string) => boolean): Parsed {
  let t = ` ${text} `; const filters: Filter[] = []; let ask: Reading['ask'] = 'list'; let fit: number | null = null; let wantsIssues = false;
  const take = (re: RegExp, on: (m: RegExpExecArray) => void) => { let m: RegExpExecArray | null; let guard = 0; while ((m = re.exec(t)) && guard++ < 6) { on(m); t = `${t.slice(0, m.index)} ${t.slice(m.index + m[0].length)}`; } };
  const roomsSaid = /\b(rooms?|spaces?)\b/.test(t);
  if (/\b(how many|number of|count)\b/.test(t)) { ask = 'count'; t = t.replace(/\b(how many|number of|count)\b/g, ' '); }
  if (/\b(largest|biggest|most seats)\b/.test(t)) { ask = 'largest'; t = t.replace(/\b(largest|biggest|most seats)\b/g, ' '); }
  if (/\b(smallest|fewest seats)\b/.test(t)) { ask = 'smallest'; t = t.replace(/\b(smallest|fewest seats)\b/g, ' '); }
  // operators people who like them type: status:held  site:atlas  seats>20
  take(/\b(?:status|state):([a-z]+)\b/, (m) => { t += ` ${m[1] === 'held' ? 'held' : m[1]} `; });
  take(/\b(?:site|building):([a-z]+)\b/, (m) => { t += ` ${m[1]} `; });
  take(/\b(?:type|kind):([a-z]+)\b/, (m) => { t += ` ${m[1]} `; });
  const UNIT = '(?:\\s*(?:seats?|people|persons?|attendees))?';
  const seats = (label: string, phrase: string, test: (n: number) => boolean) => filters.push({ kind: 'seats', label, phrase, test: (r) => test(r.outline.capacity) });
  take(new RegExp(`\\bbetween ${NUM} (?:and|to|-) ${NUM}${UNIT}`), (m) => { const a = Math.min(+m[1]!, +m[2]!), b = Math.max(+m[1]!, +m[2]!); seats(`${a} to ${b} seats`, `between ${a} and ${b} seats`, (n) => n >= a && n <= b); });
  take(new RegExp(`(?:\\bseats? ?)?(?:\\b(?:over|more than|above|greater than)|>) ?${NUM}${UNIT}`), (m) => { const a = +m[1]!; seats(`more than ${a} seats`, `over ${a} seats`, (n) => n > a); });
  take(new RegExp(`(?:\\bseats? ?)?(?:\\b(?:at least|minimum|min)|>=) ?${NUM}${UNIT}|${NUM} ?(?:\\+|or more)${UNIT}`), (m) => { const a = +(m[1] ?? m[2])!; seats(`${a} seats or more`, `at least ${a} seats`, (n) => n >= a); });
  take(new RegExp(`(?:\\bseats? ?)?(?:\\b(?:under|fewer than|less than|below)|<) ?${NUM}${UNIT}`), (m) => { const a = +m[1]!; seats(`fewer than ${a} seats`, `under ${a} seats`, (n) => n < a); });
  take(new RegExp(`(?:\\bseats? ?)?(?:\\b(?:up to|at most|maximum|max)|<=) ?${NUM}${UNIT}|${NUM} or (?:fewer|less)${UNIT}`), (m) => { const a = +(m[1] ?? m[2])!; seats(`${a} seats or fewer`, `up to ${a} seats`, (n) => n <= a); });
  take(new RegExp(`\\b(?:for|seats?|seating|fits?|holds?) ?[:=]? ?${NUM}${UNIT}|${NUM} ?(?:seats?|people|persons?|attendees|seater)\\b`), (m) => { const a = +(m[1] ?? m[2])!; fit = a; seats(`room for ${a}`, `for ${a} people`, (n) => n >= a); });
  take(new RegExp(`\\bfloor ${NUM}\\b|\\b${NUM}(?:st|nd|rd|th) floor\\b|\\b(ground) floor\\b`), (m) => { const f = m[3] ? 1 : +(m[1] ?? m[2])!; filters.push({ kind: 'floor', label: `floor ${f}`, phrase: `floor ${f}`, test: (r) => r.outline.floor === f }); });
  // open issues, optionally on one layer ("audio problems")
  take(/\b(?:(no|without|with no|zero) )?(?:(audio|sound|video|camera|display|picture|control|network|power) )?(?:open )?(issues?|problems?|faults?|defects?|broken|failing)\b/, (m) => {
    wantsIssues = true; if (!may('ask.engineering')) return; const neg = !!m[1]; const layer = m[2] ? LAYER_WORDS[m[2]]! : null; const what = layer ? `open ${layer} issue` : 'open issue';
    const has = (r: RoomRecord) => openIssues(r).some((i) => !layer || i.positions.some((p) => r.positions.find((x) => x.code === p)?.layer === layer));
    filters.push(neg ? { kind: 'issues', label: `no ${what}`, phrase: `no ${layer ? `${layer} ` : 'open '}issues`, test: (r) => !has(r) }
      : { kind: 'issues', label: `an ${what}`, phrase: layer ? `${layer} issues` : 'open issues', test: has, note: (r) => openIssues(r).map((i) => i.title).slice(0, 1).join('') });
  });
  for (const [re, label, phrase, test] of STATES) take(re, () => { if (!filters.some((f) => f.kind === 'state')) filters.push({ kind: 'state', label, phrase, test }); });
  // equipment a room has or lacks
  const dev = (neg: boolean) => (m: RegExpExecArray) => {
    let words = m[1]!.trim().split(' '); let any = false;
    for (let guard = 0; guard < 4 && words.length; guard++) {
      let cats: string[] = []; let n = Math.min(3, words.length); for (; n >= 1; n--) { cats = categoriesFor(words.slice(0, n).join(' ')); if (cats.length) break; }
      if (!cats.length) break; const name = catLabel(cats, words.slice(0, n).join(' ')); const count = (r: RoomRecord) => r.positions.filter((p) => cats.includes(p.cat)).length; any = true; words = words.slice(n);
      filters.push(neg ? { kind: 'lacks', label: `no ${name}`, phrase: `without ${article(name)} ${name}`, test: (r) => count(r) === 0 }
        : { kind: 'has', label: `has ${article(name)} ${name}`, phrase: `with ${article(name)} ${name}`, test: (r) => count(r) > 0, note: (r) => plural(count(r), name) });
      if (words[0] === 'and' || words[0] === 'or' || words[0] === 'plus') { const rest = words.slice(1).filter((w, i) => !(i === 0 && /^(an?|any|the)$/.test(w))); if (rest.length && categoriesFor(rest[0]!).length + (rest[1] ? categoriesFor(`${rest[0]} ${rest[1]}`).length : 0)) words = rest; else break; } else break;
    }
    t += ` ${any ? words.join(' ') : m[1]} `;
  };
  take(/\b(?:without|lacking|missing|with no|no) (?:an? |any |the )?([a-z]+(?: [a-z-]+){0,6})/, dev(true));
  take(/\b(?:with|having|has|have|includes?|including|containing) (?:an? |any |the )?([a-z]+(?: [a-z-]+){0,6})/, dev(false));
  // places: a building or a site by its name, its short name or its code
  const places = SITES.filter((b) => { const re = new RegExp(`\\b(?:${[norm(b.name), norm(b.short), b.key.toLowerCase()].join('|')})\\b`, 'g'); if (!re.test(t)) return false; t = t.replace(re, ' '); return true; });
  if (places.length) filters.push({ kind: 'place', label: places.map((b) => b.name).join(' or '), phrase: places.map((b) => `at ${b.short.toLowerCase()}`).join(' '), test: (r) => places.some((b) => b.key === r.outline.building) });
  for (const [re, codes, label, phrase] of KIND_WORDS) if (re.test(t) && !filters.some((f) => f.kind === 'kind')) { t = t.replace(new RegExp(re.source, 'g'), ' '); filters.push({ kind: 'kind', label, phrase, test: (r) => codes.includes(r.outline.archetype) }); }
  // a bare piece of equipment in a counting question: "how many cameras"
  let deviceWord: Parsed['deviceWord'] = null;
  if (ask === 'count' && !roomsSaid) for (const w of t.trim().split(/\s+/)) { if (STOP.has(w) || w.length < 2) continue; const cats = categoriesFor(w); if (cats.length) { deviceWord = { word: w, cats }; t = t.replace(new RegExp(`\\b${w}\\b`), ' '); break; } }
  return { ask, filters, rest: t.replace(/\s+/g, ' ').trim(), fit, deviceWord, wantsIssues, roomsSaid };
}

const hay = (o: RoomOutline) => norm(`${fullName(o)} ${o.id} ${o.aliases.join(' ')} ${o.intent} ${ARCHETYPE_NAME[o.archetype] || ''} ${o.sector || ''} ${o.roster?.archetype || ''} ${o.roster?.showcase || ''}`);
const rowOf = (r: RoomRecord, notes: string[]): Row => ({ id: r.outline.id, label: fullName(r.outline), href: roomHref(r.outline),
  detail: [ARCHETYPE_NAME[r.outline.archetype] || r.outline.archetype, plural(r.outline.capacity, 'seat'), r.lifecycle.toLowerCase().replace(/_/g, ' '), ...notes].filter(Boolean).join(' · ') });
/** The words that produce these filters again: used for the "drop one condition" suggestions, and tested to read back the same. */
export const canonical = (filters: Filter[]) => `rooms ${filters.map((f) => f.phrase).join(' ')}`.trim();

const STARTERS: Suggest[] = [
  { label: 'Boardrooms with more than 12 seats', q: 'boardrooms over 12 seats' }, { label: 'Rooms whose acceptance is held', q: 'rooms held' }, { label: 'How many cameras are on record', q: 'how many cameras' },
  { label: 'Training rooms without a projector', q: 'training rooms without a projector' }, { label: 'The largest room', q: 'largest room' }, { label: 'The reference room', q: '4.218' },
];

/** Read a query. `may` answers whether the viewing role sees a field (open issues are engineering information). */
export function understand(query: string, opts: { may?: (field: string) => boolean; limit?: number } = {}): Reading {
  const may = opts.may || (() => true); const limit = opts.limit ?? 12; const raw = norm(query).slice(0, 120);
  const base: Reading = { query, corrected: raw, fixes: [], unread: [], mode: 'empty', ask: 'list', subject: 'rooms', filters: [], said: '', lead: '', rows: [], total: 0, outOf: ROOMS.length, hits: [], loose: false, next: STARTERS, withheld: null };
  if (!raw) return base;
  // 1 · typing mistakes, word by word
  const fixes: Fix[] = []; const corrected = raw.split(' ').map((w) => { if (/[:<>=+]/.test(w)) return w; const c = correct(w); if (c) { fixes.push({ from: w, to: c }); return c; } return w; }).join(' ');
  // 2 · conditions
  const p = parse(corrected, may); const recs = allRecords(); const filters = [...p.filters]; const unread: string[] = [];
  const structural = filters.length > 0 || p.ask !== 'list' || !!p.deviceWord;
  const words = p.rest.split(' ').filter((w) => w && !STOP.has(w) && !FILTER_WORDS.has(w));
  if (structural) for (const w of words) {
    const alts = [w, ...(ALIASES[w] || [])]; const test = (r: RoomRecord) => { const h = hay(r.outline); return alts.some((a) => h.includes(a)); };
    if (recs.some(test)) filters.push({ kind: 'text', label: `mentions “${w}”`, phrase: w, test }); else unread.push(w);
  }
  const ORDER: FilterKind[] = ['kind', 'state', 'place', 'floor', 'seats', 'has', 'lacks', 'issues', 'text']; filters.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  const withheld = p.wantsIssues && !may('ask.engineering') ? 'Open issues are engineering information and are not shown to this role, so that condition was left out.' : null;
  // 3 · what to open: the plain index, with the corrected words; then without the small words; then any word
  let hits = find(corrected, limit); let loose = false;
  if (!hits.length && words.length) hits = find(words.join(' '), limit);
  if (!hits.length && words.length > 1) { const seen = new Map<string, { h: Hit; n: number }>(); for (const w of words) for (const h of find(w, 40)) { const e = seen.get(h.id) || { h, n: 0 }; e.n++; seen.set(h.id, e); } hits = [...seen.values()].sort((a, b) => b.n - a.n || b.h.score! - a.h.score!).slice(0, limit).map((e) => e.h); loose = hits.length > 0; }
  const out: Reading = { ...base, corrected, fixes, unread, ask: p.ask, filters, hits, loose, withheld, next: [] };
  // words the conditions could not use, but the index knows all of them together ("the commissioning dashboard"): that is something to open
  const named = unread.length > 0 && p.ask === 'list' && !loose && hits.length > 0;
  if (named) { out.filters = []; out.unread = []; }
  if (!structural || named) { out.mode = hits.length ? 'lookup' : 'empty'; out.said = hits.length ? '' : `Nothing on record matches “${query.trim()}”.`; out.next = hits.length ? [] : STARTERS; return out; }
  // 4 · the answer, counted from the records
  out.mode = 'answer'; const match = recs.filter((r) => filters.every((f) => f.test(r))); const cond = filters.map((f) => f.label).join(', ');
  if (p.deviceWord) {
    const { cats, word } = p.deviceWord; const name = catLabel(cats, word); const n = match.reduce((s, r) => s + r.positions.filter((x) => cats.includes(x.cat)).length, 0); const withIt = match.filter((r) => r.positions.some((x) => cats.includes(x.cat)));
    out.subject = 'devices'; out.said = `Counting ${name} positions${cond ? ` in rooms: ${cond}` : ' across the estate'}`; out.total = n; out.lead = `${plural(n, `${name} position`)} in ${plural(withIt.length, 'room')}${cond ? '' : ` of ${recs.length}`}.`;
    out.rows = withIt.sort((a, b) => b.positions.filter((x) => cats.includes(x.cat)).length - a.positions.filter((x) => cats.includes(x.cat)).length).slice(0, limit).map((r) => rowOf(r, [plural(r.positions.filter((x) => cats.includes(x.cat)).length, name)]));
    out.next = [{ label: `Rooms without ${article(name)} ${name}`, q: `rooms without ${article(name)} ${name}` }, { label: `Rooms with ${article(name)} ${name} whose acceptance is held`, q: `rooms held with ${article(name)} ${name}` }];
    return out;
  }
  const order = SITES.map((b) => b.key); const byPlace = (a: RoomRecord, b: RoomRecord) => order.indexOf(a.outline.building) - order.indexOf(b.outline.building) || a.outline.number.localeCompare(b.outline.number, undefined, { numeric: true });
  const sorted = [...match].sort(p.ask === 'largest' ? (a, b) => b.outline.capacity - a.outline.capacity : p.ask === 'smallest' || p.fit !== null ? (a, b) => a.outline.capacity - b.outline.capacity || byPlace(a, b) : byPlace);
  out.total = match.length; out.said = `Rooms${cond ? `: ${cond}` : ''}`;
  out.rows = sorted.slice(0, p.ask === 'largest' || p.ask === 'smallest' ? Math.min(5, limit) : limit).map((r) => rowOf(r, filters.map((f) => f.note?.(r) || '').filter(Boolean)));
  const top = sorted[0];
  out.lead = !match.length ? 'No room on record meets all of these.'
    : p.ask === 'largest' ? `The largest is ${fullName(top!.outline)} with ${plural(top!.outline.capacity, 'seat')}${match.length > 1 ? `, of ${plural(match.length, 'room')} that match` : ''}.`
    : p.ask === 'smallest' ? `The smallest is ${fullName(top!.outline)} with ${plural(top!.outline.capacity, 'seat')}${match.length > 1 ? `, of ${plural(match.length, 'room')} that match` : ''}.`
    : p.fit !== null ? `${plural(match.length, 'room')} of ${recs.length} ${match.length === 1 ? 'has' : 'have'} room for ${p.fit}. The closest fit is ${fullName(top!.outline)} (${plural(top!.outline.capacity, 'seat')}).`
    : `${plural(match.length, 'room')} of ${recs.length}.`;
  // 5 · never a dead end: with no match, say which single condition to drop; with many, how to narrow
  if (!match.length && filters.length > 1) out.next = filters.map((f, i) => { const others = filters.filter((_, k) => k !== i); const n = recs.filter((r) => others.every((x) => x.test(r))).length; return { n, s: { label: `Without “${f.label}”: ${plural(n, 'room')}`, q: canonical(others) } }; }).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).map((x) => x.s);
  else if (!match.length) out.next = STARTERS;
  else if (match.length > 3 && p.ask !== 'largest' && p.ask !== 'smallest') {
    const narrow: Suggest[] = []; const has = (k: FilterKind) => filters.some((f) => f.kind === k);
    if (!has('state')) for (const [, label, phrase, test] of STATES.slice(0, 3)) { const n = match.filter(test).length; if (n && n < match.length) narrow.push({ label: `${label}: ${n}`, q: `${canonical(filters)} ${phrase}` }); }
    if (!has('place')) { const by = new Map<string, number>(); for (const r of match) by.set(r.outline.building, (by.get(r.outline.building) || 0) + 1); const [k, n] = [...by].sort((a, b) => b[1] - a[1])[0]!; const b = SITES.find((x) => x.key === k)!; if (n < match.length) narrow.push({ label: `at ${b.name}: ${n}`, q: `${canonical(filters)} at ${b.short.toLowerCase()}` }); }
    if (!has('seats')) { const n = match.filter((r) => r.outline.capacity >= 20).length; if (n && n < match.length) narrow.push({ label: `20 seats or more: ${n}`, q: `${canonical(filters)} at least 20 seats` }); }
    out.next = narrow.slice(0, 4);
  }
  return out;
}
