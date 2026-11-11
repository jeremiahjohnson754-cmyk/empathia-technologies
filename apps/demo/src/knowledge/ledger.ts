/**
 * The Technical Knowledge Ledger, as pure functions over the shared contract (contract.ts). One rule shapes every function here:
 * WHAT A READER IS SHOWN IS COMPUTED FROM WHAT THAT READER MAY READ, AND FROM NOTHING ELSE. `viewFor` cuts the ledger down with the
 * contract's `redactFor` once, and every result, snippet, count, citation, related line, back-link and "same question" group is then
 * derived from that cut-down list. There is no second path by which a private object of another customer, or an unverified one, can
 * leave a trace: not a title, not a number, not a placeholder.
 *
 * Also here: the reviewers' and administrators' decisions applied to the seed (through the contract's `promote`, which refuses a
 * model, an automation and an unnamed reviewer), the anonymiser used before a customer's object is shared, and the two small hooks
 * Search Party and Ask Empathia use. No storage and no rendering; the demonstration clock is the only date.
 */
import { DEMO_NOW, C } from '../campus/design.js';
import { BUILDINGS, SITE, buildingByKey, roomById, fullName, shortName, roomHref } from '../campus/canon.js';
import { SYMPTOMS } from '../here/model.js';
import { seed as seedWorkspace, type Workspace } from '../workspace/store.js';
import { championView } from '../champion/store.js';
import { allows } from '../access/policy.js';
import type { RoleKey } from '../registry.types.js';
import { ZONES, AUTHORITIES, redactFor, mayRead, isFact, compareAuthority, authorityOf, freshness, cite, promote, type ContentType, type Reader, type TrustZone, type Freshness } from './contract.js';
import { workedLine } from './calc.js';
import { ZONE1, ZONE2 } from './seed.universal.js';
import { ZONE3, ZONE4, ZONE5 } from './seed.tenants.js';
import { HOME_TENANT, OTHER_TENANT, type LedgerObject } from './types.js';

export { ZONES, AUTHORITIES, mayRead, isFact, freshness, cite, authorityOf };
/** The demonstration's date, from its fixed clock (campus/design.ts): freshness is the same on every visit and in every test. */
export const ASOF = new Date(DEMO_NOW).toISOString().slice(0, 10);
export const SEED: readonly LedgerObject[] = [...ZONE1, ...ZONE2, ...ZONE3, ...ZONE4, ...ZONE5];

// ------------------------------------------------------------------------------------------------------------ who is reading
/** The simulated directory of each customer: which roles are in which group. An imported document names groups; a reader needs one. */
export const DIRECTORY: Readonly<Record<string, Readonly<Record<string, readonly RoleKey[]>>>> = {
  [HOME_TENANT]: {
    'grp-av-engineering': ['syseng', 'designer', 'cxeng', 'architect'],
    'grp-service-desk': ['service', 'svcmgr', 'ops', 'architect'],
    'grp-network': ['syseng', 'ops', 'installer', 'architect'],
    'grp-workplace': ['employee', 'exec', 'steward', 'ipm', 'bpm', 'qa', 'sitechamp', 'architect'],
  },
  [OTHER_TENANT]: { 'grp-studio-bench': ['service', 'svcmgr', 'syseng', 'architect'] },
};
export const groupsOf = (role: RoleKey, tenant: string): string[] => Object.entries(DIRECTORY[tenant] || {}).filter(([, roles]) => roles.includes(role)).map(([g]) => g);
/** Who reviews unverified knowledge: the roles V2.5.3 lets decide an engineering review (AZ_ACTION review.decide). */
export const isReviewer = (role: RoleKey) => allows({ action: 'review.decide' }, role);
/** Who speaks for the customer about its own data: the roles V2.5.3 lets govern (AZ_ACTION govern). */
export const isTenantAdmin = (role: RoleKey) => allows({ action: 'govern' }, role);
/** A visitor is a guest in the building, not a member of the customer: they read what everyone may read and nothing of the customer's own. */
export const GUEST = 'guest';
export const readerFor = (role: RoleKey, tenant: string = HOME_TENANT): Reader => (role === 'visitor' ? { tenant: GUEST, role, groups: [], reviewer: false } : { tenant, role, groups: groupsOf(role, tenant), reviewer: isReviewer(role) });

// ------------------------------------------------------------------------------------------------------------ site champions' notes
const djb2 = (t: string) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0; return h.toString(36); };
export const isSiteNote = (id: string) => id.startsWith('site.');
/**
 * The local notes Site Champions have written about rooms (champion/store.ts, read through its `championView`), as unverified
 * candidates of the demonstration's customer: zone 5, read by its reviewers only, never shown as fact. A note becomes the customer's
 * knowledge only when a named reviewer approves it through the contract's `promote`; the champion who wrote it cannot (store.ts).
 * The id carries a hash of the room and the words, so a decision made about one note can never attach to a different one.
 * The note's words are someone's typing: they are kept and shown as text.
 */
export function siteNoteObjects(w: Workspace | null): LedgerObject[] {
  const seen = new Set<string>(); const out: LedgerObject[] = [];
  for (const n of championView(w).notes) {
    const room = roomById(n.roomId); const text = String(n.text).trim().slice(0, 400); if (!room || text.length < 1) continue;
    const id = `site.${djb2(`${n.roomId}\n${text}`)}`; if (seen.has(id)) continue; seen.add(id); const b = buildingByKey(room.building)?.name || room.building;
    out.push({
      id, title: `Site note on ${shortName(room)}, from the site champion of ${b}`, topic: `Site note ${id}`, domain: 'Site notes', contentType: 'case-study', difficulty: 'foundation', audience: 'Technicians', roles: [],
      objectives: ['Awaiting review: something a person on site noticed about this room. It is a candidate, not knowledge.'], zone: 5, tenant: HOME_TENANT, acl: { roles: [], groups: [] },
      sources: [{ system: 'site-champion-note', title: `From the site champion of ${b}, unreviewed`, version: typeof n.at === 'string' ? n.at.slice(0, 10) : null, authority: 9, rights: 'tenant-owned', derivation: 'OBSERVED', confidence: 0.6 }],
      state: 'DRAFT', reviewer: null, reviewedOn: null, reviewBy: null, body: [text], related: [room.id], tags: ['site-champion', 'observation'],
    });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------------------ decisions
/** What people have decided in this browser, kept apart from the seed and applied to it on every read. */
export interface Decisions {
  approved: Record<string, { by: string; on: string }>; rejected: Record<string, { by: string; on: string; why: string }>;
  consents: Record<string, { by: string; on: string; statement: string }>; released: Record<string, { by: string; on: string }>;
}
export const noDecisions = (): Decisions => ({ approved: {}, rejected: {}, consents: {}, released: {} });
const plusYear = (d: string) => `${Number(d.slice(0, 4)) + 1}${d.slice(4)}`;
export const sharedIdOf = (id: string) => `${id}.shared`;

// ---- anonymising a customer's object before it is shared
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PLACES: Record<string, string[]> = {
  [HOME_TENANT]: [SITE.name, SITE.enterprise.replace(/ \(synthetic\)$/, ''), ...BUILDINGS.flatMap((b) => [b.name, b.short]), 'Northstar'],
  [OTHER_TENANT]: ['Brindlewick Works', 'Brindlewick', 'Kiln Room', 'Long Gallery'],
};
type Rule = [kind: string, re: RegExp, to: string];
function rulesFor(tenant: string): Rule[] {
  const names = [...new Set(PLACES[tenant] || [])].sort((a, b) => b.length - a.length).map(esc).join('|');
  return [
    ...(names ? [['room names', new RegExp(`\\b(?:${names})\\s+\\d\\.\\d{3}\\b`, 'g'), 'a meeting room'] as Rule] : []),
    ['room codes', /\bR-[A-Z]{3}-\d-\d{3}\b/g, 'a room'], ['room numbers', /\b\d\.\d{3}\b/g, 'a room'],
    ['job numbers', /\b(?:ISS|WO)-\d{3,5}\b/g, 'a job'], ['document numbers', /\b[A-Z]{1,3}-\d{1,3}\b/g, 'a document'],
    ['dates', /\b\d{4}-\d{2}(?:-\d{2})?\b/g, 'an earlier date'], ['telephone extensions', /\bextension \d+\b/gi, 'an internal number'],
    ...(names ? [['customer and place names', new RegExp(`\\b(?:${names})(?:’s)?\\b`, 'g'), 'the customer'] as Rule] : []),
  ];
}
/** What in a text identifies the customer: names of the customer and its places, room and job numbers, dates, extensions. */
export function identifiersIn(text: string, tenant: string): string[] { return rulesFor(tenant).flatMap(([, re]) => text.match(re) || []); }
const textOf = (o: LedgerObject) => [o.title, o.topic, ...o.objectives, ...(o.body || []), ...(o.steps || []), ...(o.tree || []).flatMap((n) => [n.ask, n.yes, n.no]), ...(o.worked || []).flatMap((w) => [w.label, ...Object.values(w.about)]), ...(o.safety || []), o.verification || '', ...(o.tags || [])].join('\n');
/**
 * The anonymised copy of a customer's object, and what was taken out. Names, room and job numbers, dates and extensions are replaced
 * by plain words; links to the customer's rooms and jobs, its document name and what it superseded are dropped. The copy has its own
 * id, so the customer's own object stays private and unchanged.
 */
export function anonymise(o: LedgerObject): { object: LedgerObject; removed: Array<[string, number]>; statement: string } {
  const rules = rulesFor(o.tenant || ''); const n: Record<string, number> = {};
  const scrub = (s: string) => rules.reduce((t, [kind, re, to]) => t.replace(re, () => { n[kind] = (n[kind] || 0) + 1; return to; }), s);
  const keep = (id: string) => /^(cat:|symptom:|k2\.|z1\.|sh\.)/.test(id);
  const dropped = (o.related || []).filter((id) => !keep(id)).length; if (dropped) n['links to rooms, jobs and private records'] = dropped;
  const w = o.worked?.map((x) => ({ ...x, label: scrub(x.label), about: Object.fromEntries(Object.entries(x.about).map(([k, v]) => [k, scrub(v)])) }));
  const object: LedgerObject = {
    id: sharedIdOf(o.id), title: `Shared lesson: ${scrub(o.title)}`, topic: `Shared lesson: ${scrub(o.title)}`, domain: /^(Customer standards|Incidents|Procedures|Contacts)$/.test(o.domain) ? 'Shared lessons' : o.domain, contentType: o.contentType, difficulty: o.difficulty, audience: o.audience, roles: o.roles,
    objectives: o.objectives.map(scrub), zone: o.zone, tenant: o.tenant, acl: { roles: o.acl.roles, groups: [] },
    sources: [{ system: 'shared-with-consent', title: 'A customer’s contribution, anonymised', version: null, authority: authorityOf(o), rights: 'tenant-shared-with-consent', derivation: 'APPROVED' }],
    state: o.state, reviewer: o.reviewer, reviewedOn: o.reviewedOn, reviewBy: o.reviewBy, body: (o.body || []).map(scrub),
    ...(o.steps ? { steps: o.steps.map(scrub) } : {}), ...(o.tree ? { tree: o.tree.map((x) => ({ ask: scrub(x.ask), yes: scrub(x.yes), no: scrub(x.no) })) } : {}), ...(w ? { worked: w, calculations: w.map(workedLine) } : {}),
    ...(o.safety ? { safety: o.safety.map(scrub) } : {}), ...(o.verification ? { verification: scrub(o.verification) } : {}), related: (o.related || []).filter(keep), ...(o.relatedStandards ? { relatedStandards: o.relatedStandards } : {}),
    tags: (o.tags || []).filter((x) => !identifiersIn(x, o.tenant || '').length),
  };
  const removed = Object.entries(n); const statement = removed.length ? `Removed automatically: ${removed.map(([k, c]) => `${k} (${c})`).join(', ')}.` : 'Nothing that names the customer was found in the text.';
  return { object, removed, statement };
}

/** The seed with this browser's decisions applied. Every promotion goes through the contract's `promote`; one it refuses changes nothing. */
export function applyDecisions(seed: readonly LedgerObject[], d: Decisions): LedgerObject[] {
  const out: LedgerObject[] = [];
  for (const o of seed) {
    let cur = o; const a = d.approved[o.id]; const r = d.rejected[o.id];
    if (o.zone === 5 && a) {
      const p = promote(o, { to: 3, by: { name: a.by, kind: 'human-reviewer' }, on: a.on });
      if ('object' in p) cur = { ...(p.object as LedgerObject), reviewBy: plusYear(a.on), sources: o.sources.map((s) => ({ ...s, authority: Math.min(s.authority, 7) as typeof s.authority, derivation: 'APPROVED' as const })), tags: [...(o.tags || []), 'approved-from-candidate'] };
    } else if (o.zone === 5 && r) cur = { ...o, state: 'ARCHIVED' };
    out.push(cur);
    const c = d.consents[o.id]; const rel = d.released[o.id];
    if (cur.zone === 3 && c && rel) {
      const anon = anonymise(cur); if (identifiersIn(textOf(anon.object), cur.tenant || '').length) continue;   // defence in depth: nothing identifying is released
      const p = promote(anon.object, { to: 4, by: { name: rel.by, kind: 'human-reviewer' }, on: rel.on, consent: { by: c.by, on: c.on, anonymised: `${anon.statement} ${c.statement}`.trim() } });
      if ('object' in p) out.push({ ...(p.object as LedgerObject), reviewBy: plusYear(rel.on) });
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------------------ links into the demonstration
export interface Rel { id: string; kind: 'room' | 'issue' | 'device' | 'symptom' | 'object' | 'standard'; label: string; href: string }
let INCIDENTS: Map<string, string> | null = null;
const incidentTitle = (id: string) => (INCIDENTS ??= new Map(seedWorkspace().incidents.map((i) => [i.id, i.title]))).get(id);
/** What a related id is, without regard to who is reading: a room, a job, a device category or a symptom of the demonstration. */
export function resolveRecord(id: string): Rel | null {
  const room = roomById(id); if (room) return { id, kind: 'room', label: fullName(room), href: roomHref(room) };
  const job = incidentTitle(id); if (job) return { id, kind: 'issue', label: `${id} — ${job}`, href: `#/servicehands?id=${id}` };
  if (id.startsWith('cat:')) { const K = C.categories[id.slice(4)]; return K ? { id, kind: 'device', label: K.label, href: `#/find?q=${encodeURIComponent(K.label.toLowerCase())}` } : null; }
  if (id.startsWith('symptom:')) { const s = SYMPTOMS.find((x) => x.id === id.slice(8)); return s ? { id, kind: 'symptom', label: s.label, href: `#/here/R-ATL-4-218?step=wrong&s=${s.id}` } : null; }
  return null;
}
export const hrefOfObject = (id: string) => `#/knowledge/${encodeURIComponent(id)}`;

// ------------------------------------------------------------------------------------------------------------ searching
const STOP = new Set('a an and are as at be by can do does for from how i in is it its me my of on or our should that the their there this to us was we what when where which who why will with you your about into than then them they not no'.split(' '));
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9.+ -]+/g, ' ').replace(/\s+/g, ' ').trim();
const stem = (t: string) => (t.length > 4 ? t.replace(/(ies|es|s)$/, (m) => (m === 'ies' ? 'y' : '')) : t);
export const tokensOf = (q: string) => [...new Set(norm(q).slice(0, 200).split(' ').filter((t) => t.length > 1 && !STOP.has(t)).map(stem))].slice(0, 12);
const paragraphs = (o: LedgerObject) => [...(o.body || []), ...(o.steps || []), ...(o.tree || []).flatMap((n) => [n.ask, n.yes, n.no]), ...(o.calculations || []), o.applies || ''].filter(Boolean);
export interface Filters { domain?: string; type?: ContentType | ''; audience?: string; zone?: TrustZone | 0 }
export interface Found { object: LedgerObject; score: number; matched: number; snippet: string }
const clip = (s: string, n = 200) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : s);
function score(o: LedgerObject, tokens: string[]): { score: number; matched: number; snippet: string } {
  const title = norm(o.title); const meta = norm(`${o.topic} ${o.domain} ${(o.tags || []).join(' ')} ${o.contentType}`); const paras = paragraphs(o); const body = paras.map(norm);
  let s = 0; let matched = 0; let at = -1;
  for (const t of tokens) {
    const inTitle = title.includes(t); const inMeta = meta.includes(t); const i = body.findIndex((b) => b.includes(t));
    if (inTitle || inMeta || i >= 0) matched += 1;
    s += (inTitle ? 5 : 0) + (inMeta ? 2 : 0) + (i >= 0 ? 1 : 0); if (i >= 0 && at < 0) at = i;
  }
  return { score: s, matched, snippet: clip(paras[at >= 0 ? at : 0] || '') };
}
const passes = (o: LedgerObject, f: Filters) => (!f.domain || o.domain === f.domain) && (!f.type || o.contentType === f.type) && (!f.audience || o.audience === f.audience) && (!f.zone || o.zone === f.zone);

// ------------------------------------------------------------------------------------------------------------ the reader's view
export type Standing = 'strongest' | 'weaker' | 'superseded' | 'candidate' | 'not-approved';
export interface View {
  reader: Reader; /** everything this reader may read, and nothing else */ list: LedgerObject[];
  facets: { domains: Array<[string, number]>; types: Array<[string, number]>; audiences: Array<[string, number]>; zones: Array<[TrustZone, number]> };
  get: (id: string) => LedgerObject | null; search: (q: string, f?: Filters) => Found[];
  /** every readable object that answers the same question, strongest source first; never fewer than the object itself */
  sameQuestion: (o: LedgerObject) => Array<{ object: LedgerObject; standing: Standing }>;
  related: (o: LedgerObject) => Rel[]; usedIn: (o: LedgerObject) => LedgerObject[]; supersededBy: (o: LedgerObject) => LedgerObject | null;
  /** unverified objects awaiting a decision (empty for anyone who is not a reviewer of the owning customer) */ queue: LedgerObject[];
}
const count = <K extends string | number>(list: LedgerObject[], key: (o: LedgerObject) => K): Array<[K, number]> => { const m = new Map<K, number>(); for (const o of list) m.set(key(o), (m.get(key(o)) || 0) + 1); return [...m].sort((a, b) => String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true })); };
const refsOf = (o: LedgerObject) => [...(o.related || []), ...(o.relatedStandards || []), ...(o.prerequisites || []), ...(o.supersedes ? [o.supersedes] : [])];
export function viewFor(all: readonly LedgerObject[], reader: Reader): View {
  // A readable object may point at one this reader may not read (an incident review that cites a standard kept from them). The pointer
  // itself would say that the other exists, so it is dropped from the object the reader is given, not only from the page.
  const readable = redactFor(all, reader); const mine = new Set(readable.map((o) => o.id)); const exists = new Set(all.map((o) => o.id)); const seen = (id: string) => mine.has(id) || !exists.has(id);
  const list = readable.map((o): LedgerObject => { const { supersedes, ...rest } = o; return { ...rest, ...(o.related ? { related: o.related.filter(seen) } : {}), ...(o.relatedStandards ? { relatedStandards: o.relatedStandards.filter(seen) } : {}), ...(o.prerequisites ? { prerequisites: o.prerequisites.filter(seen) } : {}), ...(supersedes && seen(supersedes) ? { supersedes } : {}) }; });
  const byId = new Map(list.map((o) => [o.id, o]));
  const standingOf = (o: LedgerObject, first: boolean): Standing => (o.zone === 5 ? 'candidate' : o.state === 'SUPERSEDED' || o.state === 'ARCHIVED' ? 'superseded' : first ? 'strongest' : isFact(o) ? 'weaker' : 'not-approved');
  return {
    reader, list,
    facets: { domains: count(list, (o) => o.domain), types: count(list, (o) => o.contentType), audiences: count(list, (o) => o.audience), zones: count(list, (o) => o.zone) },
    get: (id) => byId.get(id) || null,
    search: (q, f = {}) => {
      const tokens = tokensOf(q); const pool = list.filter((o) => passes(o, f));
      if (!tokens.length) return pool.map((o) => ({ object: o, score: 0, matched: 0, snippet: clip(paragraphs(o)[0] || '') })).sort((a, b) => a.object.zone - b.object.zone || a.object.domain.localeCompare(b.object.domain) || a.object.title.localeCompare(b.object.title));
      return pool.map((o) => ({ object: o, ...score(o, tokens) })).filter((x) => x.matched === tokens.length).sort((a, b) => b.score - a.score || compareAuthority(a.object, b.object));
    },
    sameQuestion: (o) => { const g = list.filter((x) => x.topic === o.topic).sort(compareAuthority); const lead = g.find((x) => x.zone !== 5 && x.state !== 'SUPERSEDED' && x.state !== 'ARCHIVED'); return g.map((x) => ({ object: x, standing: standingOf(x, x === lead) })); },
    related: (o) => refsOf(o).flatMap((id): Rel[] => { const x = byId.get(id); if (x) return [{ id, kind: x.zone === 1 ? 'standard' : 'object', label: x.title, href: hrefOfObject(id) }]; const r = resolveRecord(id); return r ? [r] : []; }),
    usedIn: (o) => list.filter((x) => x.id !== o.id && refsOf(x).includes(o.id)),
    supersededBy: (o) => list.find((x) => x.supersedes === o.id) || null,
    queue: list.filter((o) => o.zone === 5 && o.state !== 'ARCHIVED'),
  };
}

// ------------------------------------------------------------------------------------------------------------ words for a page
export const STATE_WORD: Record<LedgerObject['state'], string> = { DRAFT: 'Draft', IN_REVIEW: 'In review', APPROVED: 'Approved', SUPERSEDED: 'Superseded', ARCHIVED: 'Rejected or archived' };
export const FRESH_WORD: Record<Freshness, string> = { CURRENT: 'Review is current', DUE: 'Review is due soon', STALE: 'Review is overdue', NEVER_REVIEWED: 'Not yet reviewed' };
export const STANDING_WORD: Record<Standing, string> = { strongest: 'Strongest source you can read', weaker: 'Weaker source', superseded: 'Superseded', candidate: 'Candidate — not fact', 'not-approved': 'Not approved — weaker source' };
export const TYPE_WORD: Partial<Record<ContentType, string>> = { concept: 'Concept', term: 'Term', 'reference-card': 'Reference card', calculation: 'Worked calculation', 'decision-tree': 'Decision tree', procedure: 'Procedure', 'failure-pattern': 'Failure pattern', 'case-study': 'Case', standard: 'Standard' };
/** How an object is labelled wherever it is shown: never as fact unless the contract says it is one. */
export const standingLabel = (o: LedgerObject): string => (o.zone === 5 ? (o.state === 'ARCHIVED' ? 'Rejected candidate' : 'Candidate — not fact') : isFact(o) ? 'Approved' : `${STATE_WORD[o.state]} — not approved`);

// ------------------------------------------------------------------------------------------------------------ the two hooks
export interface KnowledgeHit { id: string; title: string; href: string; snippet: string; label: string; citation: string; candidate: boolean; fact: boolean }
const hit = (f: Found): KnowledgeHit => ({ id: f.object.id, title: f.object.title, href: hrefOfObject(f.object.id), snippet: f.snippet, label: standingLabel(f.object), citation: cite(f.object, ASOF), candidate: f.object.zone === 5, fact: isFact(f.object) });
/** Search Party's hook: knowledge that matches the words, for this reader only. An unverified object is offered to its reviewers alone, and labelled. */
export function knowledgeHits(all: readonly LedgerObject[], reader: Reader, q: string, limit = 5): KnowledgeHit[] {
  if (!tokensOf(q).length) return [];
  return viewFor(all, reader).search(q).filter((f) => f.object.state !== 'ARCHIVED').slice(0, limit).map(hit);
}
export type KnowledgeAnswer =
  | { kind: 'answer'; lead: string; hit: KnowledgeHit; more: KnowledgeHit[] }
  /** nothing approved matches; a readable source that is not approved (a draft, or a candidate for its reviewers) is shown with its state, never as fact */
  | { kind: 'unapproved'; lead: string; hit: KnowledgeHit; more: KnowledgeHit[] }
  | { kind: 'abstain' };
export const ABSTAIN = 'I do not have an approved source for that.';
/**
 * Ask Empathia's hook. The question's words are matched against what this reader may read. An approved source answers, with its
 * citation. With no approved source the answer abstains; if a readable source that is not approved matches, it is shown beneath the
 * abstention with its state. Nothing is composed: the lead is the source's own first paragraph.
 */
export function answerFor(all: readonly LedgerObject[], reader: Reader, question: string): KnowledgeAnswer {
  const tokens = tokensOf(question); if (!tokens.length) return { kind: 'abstain' };
  const v = viewFor(all, reader); const need = tokens.length <= 2 ? tokens.length : Math.ceil(tokens.length * 0.6);
  const ranked = v.list.filter((o) => o.state !== 'ARCHIVED' && o.state !== 'SUPERSEDED').map((o) => ({ object: o, ...score(o, tokens) })).filter((x) => x.matched >= need && x.score >= 3)
    .sort((a, b) => b.matched - a.matched || b.score - a.score || compareAuthority(a.object, b.object));
  const lead = (f: Found) => clip((f.object.body || [])[0] || f.object.applies || f.snippet, 420);
  const facts = ranked.filter((x) => isFact(x.object)); const rest = ranked.filter((x) => !isFact(x.object));
  if (facts.length) return { kind: 'answer', lead: lead(facts[0]!), hit: hit(facts[0]!), more: [...facts.slice(1), ...rest].slice(0, 3).map(hit) };
  if (rest.length) return { kind: 'unapproved', lead: lead(rest[0]!), hit: hit(rest[0]!), more: rest.slice(1, 4).map(hit) };
  return { kind: 'abstain' };
}
