/**
 * Search Party — universal entity discovery and relationship intelligence, as a pure library shared by the enterprise API (real,
 * tenant- and site-scoped data) and the investor demonstration (synthetic data in the page). Nothing here reads a database or the
 * network: the caller supplies a Catalogue (the nodes it is allowed to show) and a Graph (the edges among them, every edge with its
 * provenance). An intent answers a question from those two only, and says UNKNOWN or PARTIAL when the graph cannot support an answer:
 * it never manufactures a relationship.
 */
import { Graph, neighbourhood, impact, path, key, RELATIONS, NODE_TYPES, type NodeRef, type Edge, type Step } from '@empathia/relationship-engine';
export { Graph, neighbourhood, impact, path, key, RELATIONS, NODE_TYPES };
export type { NodeRef, Edge, Step };

// ------------------------------------------------------------------------------------------------ catalogue
export interface SearchNode extends NodeRef {
  label: string;
  subtitle?: string;
  /** facet values: site, building, lifecycle, severity, state, role … — only what the caller may show */
  facets?: Record<string, string>;
  /** where this node's existence comes from (table / event / synthetic seed) */
  provenance: string;
  /** a route in the hosting application (never cross-application) */
  href?: string;
  keywords?: string[];
}
export interface Catalogue { nodes: SearchNode[]; edges: Edge[]; /** what the catalogue covers and what it does not (honest coverage indicator) */ coverage: Coverage }
export interface Coverage { types: Record<string, number>; edges: number; keyed?: number; legacyCodeOnly?: number; notes: string[] }
export const nodeKey = key;

// ------------------------------------------------------------------------------------------------ search
export interface SearchQuery { q?: string; type?: string | null; facets?: Record<string, string>; limit?: number }
export interface SearchResult { items: Array<SearchNode & { score: number; matched: string }>; total: number; facets: { type: Record<string, number>; [facet: string]: Record<string, number> } }

// codes keep their hyphens and slashes (R-PLN-0001 is one term, never 'r', 'pln' and '0001'); everything else collapses to words
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 \-\/.]+/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s: string) => norm(s).split(/\s+/).filter(Boolean);

/** Rank nodes for a query: exact id > id prefix > label phrase > every token in label/subtitle/keywords > any token. Facets count the *visible* result set only. */
export function search(cat: Catalogue, query: SearchQuery): SearchResult {
  const q = norm(query.q || ''); const toks = tokens(query.q || '');
  const scored: SearchResult['items'] = [];
  for (const n of cat.nodes) {
    if (query.type && n.type !== query.type) continue;
    if (query.facets && Object.entries(query.facets).some(([k, v]) => v && n.facets?.[k] !== v)) continue;
    const hay = `${n.label} ${n.subtitle || ''} ${(n.keywords || []).join(' ')} ${n.type} ${NODE_TYPES[n.type]?.[0] || ''}`;
    const hn = norm(hay); const idn = norm(n.id);
    let score = 0; let matched = '';
    if (!q) { score = 1; matched = 'all'; }
    else if (idn === q) { score = 100; matched = 'id'; }
    else if (idn.startsWith(q)) { score = 80; matched = 'id prefix'; }
    else if (norm(n.label) === q) { score = 75; matched = 'label'; }
    else if (hn.includes(q)) { score = 60; matched = 'phrase'; }
    else { const hit = toks.filter((t) => t.length >= 2 && (hn.includes(t) || idn.includes(t))); if (hit.length === toks.length && toks.length) { score = 40 + hit.length; matched = 'all terms'; } else if (hit.length && hit.length * 2 >= toks.length) { score = 10 + hit.length; matched = `${hit.length}/${toks.length} terms`; } }
    if (score > 0) scored.push({ ...n, score, matched });
  }
  scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  const facets: SearchResult['facets'] = { type: {} };
  for (const n of scored) { facets.type[n.type] = (facets.type[n.type] || 0) + 1; for (const [k, v] of Object.entries(n.facets || {})) { (facets[k] = facets[k] || {})[v] = (facets[k]![v] || 0) + 1; } }
  return { items: scored.slice(0, query.limit ?? 50), total: scored.length, facets };
}

// ------------------------------------------------------------------------------------------------ layout (radial by depth; deterministic; bounded)
export interface Placed { node: NodeRef; x: number; y: number; depth: number }
/** Place the start at the centre and each depth on a ring, nodes grouped by the parent they were reached through. Deterministic; O(n). */
export function radialLayout(steps: Step[], width: number, height: number, maxNodes = 150): Placed[] {
  const shown = steps.slice(0, maxNodes); const cx = width / 2, cy = height / 2;
  const maxDepth = Math.max(0, ...shown.map((s) => s.depth)); const ringGap = Math.min(cx, cy) / (maxDepth + 1.2);
  const byDepth = new Map<number, Step[]>(); for (const s of shown) (byDepth.get(s.depth) || byDepth.set(s.depth, []).get(s.depth)!).push(s);
  const angle = new Map<string, number>(); const out: Placed[] = [];
  for (let d = 0; d <= maxDepth; d++) {
    const ring = byDepth.get(d) || [];
    // order children next to their parent's angle so edges are short
    const ordered = d === 0 ? ring : [...ring].sort((a, b) => (angle.get(key(a.via!.from)) || 0) - (angle.get(key(b.via!.from)) || 0));
    ordered.forEach((s, i) => { const a = d === 0 ? 0 : (i / ordered.length) * Math.PI * 2 - Math.PI / 2; angle.set(key(s.node), a); const r = d * ringGap; out.push({ node: s.node, x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy + Math.sin(a) * r), depth: d }); });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ intents
export type Confidence = 'OBSERVED' | 'DERIVED' | 'UNKNOWN';
export interface IntentItem { node: NodeRef; label: string; via?: string; provenance: string }
export interface IntentAction { label: string; href?: string; kind: 'navigate' | 'copy' | 'mailto' | 'teams'; payload?: string; /** when the host cannot do this, it says so instead of pretending */ available: boolean; note?: string }
export interface IntentAnswer {
  intent: string; question: string; target: NodeRef | null; status: 'ANSWERED' | 'PARTIAL' | 'UNKNOWN';
  summary: string; items: IntentItem[]; evidence: string[]; uncertainty: string[]; confidence: Confidence; actions: IntentAction[];
}
/** Facts the host can answer from records the graph does not carry as edges (approvals, authority holders, baseline diffs). Every one is optional: a missing fact is reported as uncertainty, never invented. */
export interface Facts {
  /** who approved what on a room, from the audit/record of approvals (actor display + what + when) */
  approvals?: (room: NodeRef) => Array<{ what: string; by: string; at: string; provenance: string }>;
  /** people in scope who hold an authority, with the names of those excluded by separation of duties for this target */
  holders?: (authority: string, target: NodeRef | null) => { people: Array<{ id: string; name: string; role: string }>; excluded: Array<{ name: string; why: string }>; provenance: string } | null;
  /** the baseline lineage of a room: versions with their result labels and design revision */
  baselines?: (room: NodeRef) => Array<{ id: string; version: number; state: string; designRevision: number; results: Record<string, string>; publishedBy: string; publishedAt: string }> | null;
  /** the host's hard-gated candidates for the work order remedying an issue (qualification from verified records, availability from the
   *  work window and leave on record), or null when there is none or the caller may not see the ranking */
  qualified?: (issue: NodeRef) => { workOrder: string; eligible: Array<{ id: string; name: string; reasons: string[] }>; ineligible: Array<{ id: string; name: string; fails: string[] }>; provenance: string } | null;
  /** contact actions the host can offer for a person (never fabricated: available=false when no channel is configured) */
  contact?: (personId: string) => IntentAction[];
}
export interface IntentContext { graph: Graph; nodes: Map<string, SearchNode>; facts: Facts; canSee?: (n: NodeRef) => boolean }

interface IntentDef { id: string; label: string; examples: string[]; match: (q: string) => boolean; needs: string[]; answer: (ctx: IntentContext, target: NodeRef | null, question: string) => IntentAnswer }
const lbl = (ctx: IntentContext, n: NodeRef) => ctx.nodes.get(key(n))?.label || `${n.type} ${n.id}`;
const base = (intent: string, question: string, target: NodeRef | null): IntentAnswer => ({ intent, question, target, status: 'UNKNOWN', summary: '', items: [], evidence: [], uncertainty: [], confidence: 'UNKNOWN', actions: [] });
const edgesOf = (ctx: IntentContext, n: NodeRef, rels: string[], dir: 'out' | 'in' | 'both' = 'both') => [
  ...(dir !== 'in' ? ctx.graph.outgoing(n).filter((e) => rels.includes(e.rel)).map((e) => ({ other: e.to, rel: e.rel, label: RELATIONS[e.rel]![0], provenance: e.provenance })) : []),
  ...(dir !== 'out' ? ctx.graph.incoming(n).filter((e) => rels.includes(e.rel)).map((e) => ({ other: e.from, rel: e.rel, label: RELATIONS[e.rel]![1], provenance: e.provenance })) : []),
].filter((x) => !ctx.canSee || ctx.canSee(x.other));

export const INTENTS: IntentDef[] = [
  { id: 'responsible', label: 'Who is responsible for this?', examples: ['Who is responsible for this room?', 'Who owns this asset?'], match: (q) => /\b(responsible|owner|owns|accountable|in charge)\b/.test(q), needs: ['Room|Asset|Site|Building'],
    answer(ctx, target, question) {
      const a = base('responsible', question, target); if (!target) { a.uncertainty.push('name a room, building, site or device'); return a; }
      const hits = edgesOf(ctx, target, ['OWNED_BY', 'PRIMARY_CONTACT', 'BACKUP_CONTACT', 'SUPPORTED_BY', 'FIRST_LINE', 'ENGINEERING_CONTACT', 'ESCALATES_TO', 'ASSIGNED_TO'], 'both');
      a.items = hits.map((h) => ({ node: h.other, label: lbl(ctx, h.other), via: h.label, provenance: h.provenance }));
      if (a.items.length) { a.status = 'ANSWERED'; a.confidence = hits.every((h) => /DECLARED|RECORD|table/.test(h.provenance)) ? 'OBSERVED' : 'DERIVED'; a.summary = `${a.items.length} responsible or contact relationship${a.items.length === 1 ? '' : 's'} recorded for ${lbl(ctx, target)}.`; }
      else { a.status = 'UNKNOWN'; a.summary = `No ownership or support relationship is recorded for ${lbl(ctx, target)}.`; a.uncertainty.push('ownership, support paths and contacts are not yet modelled for this record: the graph holds no OWNED_BY / PRIMARY_CONTACT / SUPPORTED_BY edge; nothing is inferred from job titles'); }
      for (const h of hits) if (h.other.type === 'Person' && ctx.facts.contact) a.actions.push(...ctx.facts.contact(h.other.id));
      return a;
    } },
  { id: 'approved', label: 'Who approved the current design?', examples: ['Which engineer approved the current design?', 'Who approved this?'], match: (q) => /\b(approved|approver|signed off|accepted)\b/.test(q), needs: ['Room'],
    answer(ctx, target, question) {
      const a = base('approved', question, target); if (!target || target.type !== 'Room') { a.uncertainty.push('approvals are recorded per room: name a room'); return a; }
      const ap = ctx.facts.approvals?.(target) || null;
      if (ap === null) { a.summary = 'The approval record is not available to this view.'; a.uncertainty.push('the host did not supply approval records'); return a; }
      if (!ap.length) { a.status = 'UNKNOWN'; a.summary = `No approval is recorded for ${lbl(ctx, target)}: its design is not approved.`; a.evidence.push('approval record (audit): none'); return a; }
      a.status = 'ANSWERED'; a.confidence = 'OBSERVED'; a.summary = `${ap.length} approval${ap.length === 1 ? '' : 's'} on record for ${lbl(ctx, target)}: ${ap.map((x) => `${x.what} by ${x.by}`).join('; ')}.`;
      a.items = ap.map((x) => ({ node: { type: 'Approval', id: `${x.what}@${x.at}` }, label: `${x.what} — ${x.by}`, via: x.at, provenance: x.provenance }));
      a.evidence.push(...ap.map((x) => `${x.provenance}: ${x.what} ${x.at}`)); return a;
    } },
  { id: 'connected', label: 'What is connected to this device?', examples: ['What devices are connected to this DSP?', 'What connects to this switch?'], match: (q) => /\b(connected|connects|plugged|wired|feeds|uplink)\b/.test(q) && !/depend/.test(q), needs: ['PlannedAsset|Device'],
    answer(ctx, target, question) {
      const a = base('connected', question, target); if (!target) { a.uncertainty.push('name a device'); return a; }
      const hits = edgesOf(ctx, target, ['CONNECTS_TO', 'FEEDS', 'UPLINKS_TO', 'POWERED_BY', 'CONTROLS', 'PROPOSED_LINK']);
      a.items = hits.map((h) => ({ node: h.other, label: lbl(ctx, h.other), via: h.label, provenance: h.provenance }));
      a.status = a.items.length ? 'ANSWERED' : 'UNKNOWN'; a.confidence = hits.length ? (hits.every((h) => /MODELED|PROPOSED/.test(h.provenance)) ? 'DERIVED' : 'OBSERVED') : 'UNKNOWN';
      a.summary = a.items.length ? `${a.items.length} connection${a.items.length === 1 ? '' : 's'} recorded for ${lbl(ctx, target)}.` : `No connection is recorded for ${lbl(ctx, target)}.`;
      if (hits.some((h) => /MODELED|PROPOSED/.test(h.provenance))) a.uncertainty.push('some connections are proposed by the design rules (MODELED), not observed on the installed system');
      return a;
    } },
  { id: 'depends', label: 'What depends on this?', examples: ['Which rooms depend on this network switch?', 'If this switch fails, what is affected?'], match: (q) => /\b(depend|depends|affected|affect|fails|failure|impact|take[s]? down|downstream)\b/.test(q), needs: ['PlannedAsset|Device|NetworkNode|PowerNode'],
    answer(ctx, target, question) {
      const a = base('depends', question, target); if (!target) { a.uncertainty.push('name a device, switch or power node'); return a; }
      const hit = impact(ctx.graph, target, ['FEEDS', 'CONNECTS_TO', 'PLANS_DEVICE', 'HAS_DEVICE', 'UPLINKS_TO', 'POWERED_BY', 'CONTROLS'], ctx.canSee || (() => true));
      const rooms = new Set<string>();
      for (const n of hit) { for (const e of ctx.graph.incoming(n)) if ((e.rel === 'PLANS_DEVICE' || e.rel === 'HAS_DEVICE') && (!ctx.canSee || ctx.canSee(e.from))) rooms.add(key(e.from)); }
      for (const e of ctx.graph.incoming(target)) if ((e.rel === 'PLANS_DEVICE' || e.rel === 'HAS_DEVICE') && (!ctx.canSee || ctx.canSee(e.from))) rooms.add(key(e.from));
      a.items = [...hit.map((n) => ({ node: n, label: lbl(ctx, n), via: 'downstream', provenance: 'graph traversal (FEEDS/CONNECTS_TO/UPLINKS_TO/POWERED_BY/CONTROLS)' })), ...[...rooms].map((k) => { const [type, ...id] = k.split(':'); const n = { type: type!, id: id.join(':') }; return { node: n, label: lbl(ctx, n), via: 'room affected', provenance: 'PLANS_DEVICE/HAS_DEVICE' }; })];
      a.status = a.items.length ? 'ANSWERED' : 'UNKNOWN'; a.confidence = a.items.length ? 'DERIVED' : 'UNKNOWN';
      a.summary = a.items.length ? `${hit.length} downstream device${hit.length === 1 ? '' : 's'} and ${rooms.size} room${rooms.size === 1 ? '' : 's'} depend on ${lbl(ctx, target)}.` : `Nothing recorded depends on ${lbl(ctx, target)}.`;
      a.uncertainty.push('impact follows recorded edges only; an unrecorded cable or an undeclared uplink is invisible here'); return a;
    } },
  { id: 'can-approve', label: 'Who can approve this exception?', examples: ['Who can approve this commissioning exception?', 'Who can approve this design?'], match: (q) => /\b(who can|who may|who is allowed|able to approve|can approve|can decide)\b/.test(q), needs: ['Room|BaselineException'],
    answer(ctx, target, question) {
      const a = base('can-approve', question, target);
      const authority = /exception|baseline/.test(question) ? 'baseline.approve' : /classif/.test(question) ? 'room.classify.approve' : /accept/.test(question) ? 'customer.accept' : /fund/.test(question) ? 'funding.authorize' : 'room.design.approve';
      const h = ctx.facts.holders?.(authority, target) || null;
      if (!h) { a.summary = 'The policy model is not available to this view.'; a.uncertainty.push('authority holders are resolved by the server from memberships and delegations; this view did not receive them'); return a; }
      a.items = h.people.map((p) => ({ node: { type: 'Person', id: p.id }, label: `${p.name} (${p.role})`, via: authority, provenance: h.provenance }));
      a.status = a.items.length ? 'ANSWERED' : 'UNKNOWN'; a.confidence = 'OBSERVED';
      a.summary = a.items.length ? `${a.items.length} ${a.items.length === 1 ? 'person holds' : 'people hold'} ${authority}${h.excluded.length ? `; ${h.excluded.length} excluded by separation of duties` : ''}.` : `Nobody in scope holds ${authority}.`;
      for (const x of h.excluded) a.uncertainty.push(`${x.name}: ${x.why}`);
      a.evidence.push(`${h.provenance}: authority ${authority}`); return a;
    } },
  { id: 'qualified', label: 'Which technician is qualified and available?', examples: ['Which technician is qualified and available to investigate this issue?'], match: (q) => /\b(qualified|available|technician|skill|competen)\b/.test(q), needs: ['RoomIssue'],
    answer(ctx, target, question) {
      const a = base('qualified', question, target);
      const qf = target && ctx.facts.qualified ? ctx.facts.qualified(target) : null;
      if (qf) {
        a.items = qf.eligible.map((e) => ({ node: { type: 'Person', id: e.id }, label: e.name, via: `passes every hard gate for ${qf.workOrder}${e.reasons.length ? `: ${e.reasons.join('; ')}` : ''}`, provenance: qf.provenance }));
        a.status = 'ANSWERED'; a.confidence = 'OBSERVED';
        a.summary = qf.eligible.length ? `${qf.eligible.length} of ${qf.eligible.length + qf.ineligible.length} people in the service pool pass the hard gates for ${qf.workOrder}.` : `Nobody in the service pool passes the hard gates for ${qf.workOrder}.`;
        for (const x of qf.ineligible) a.evidence.push(`${x.name}: ${x.fails.join('; ')}`);
        a.uncertainty.push('availability is the work window, leave and open-job capacity on record; calendars are not connected');
        return a;
      }
      const hits = target ? edgesOf(ctx, target, ['ASSIGNED_TO', 'RESOLVED_BY', 'HAS_SKILL']) : [];
      a.items = hits.map((h) => ({ node: h.other, label: lbl(ctx, h.other), via: h.label, provenance: h.provenance }));
      a.status = a.items.length ? 'PARTIAL' : 'UNKNOWN'; a.confidence = a.items.length ? 'OBSERVED' : 'UNKNOWN';
      a.summary = a.items.length ? `${a.items.length} assignment${a.items.length === 1 ? '' : 's'} recorded; qualification and availability are not modelled.` : 'Qualification and availability are not modelled yet.';
      a.uncertainty.push('skills, competencies and availability (calendar) are not part of the data model today; nothing is inferred from role names'); return a;
    } },
  { id: 'vendor', label: 'Which vendor supports this system?', examples: ['Which vendor supports this system?'], match: (q) => /\b(vendor|supplier|integrator|supports|support agreement|msp)\b/.test(q), needs: ['PlannedAsset|Device|Room'],
    answer(ctx, target, question) {
      const a = base('vendor', question, target); if (!target) { a.uncertainty.push('name a device or room'); return a; }
      const hits = edgesOf(ctx, target, ['SUPPLIED_BY', 'INTEGRATED_BY', 'SUPPORTED_BY', 'UNDER_AGREEMENT', 'CONTRACTS_WITH']);
      a.items = hits.map((h) => ({ node: h.other, label: lbl(ctx, h.other), via: h.label, provenance: h.provenance }));
      a.status = a.items.length ? 'ANSWERED' : 'UNKNOWN'; a.confidence = a.items.length ? 'OBSERVED' : 'UNKNOWN';
      a.summary = a.items.length ? `${a.items.length} supplier/support relationship${a.items.length === 1 ? '' : 's'} recorded.` : `No supplier, integrator or support agreement is recorded for ${lbl(ctx, target)}.`;
      if (!a.items.length) a.uncertainty.push('vendor and support-agreement records are not yet captured; no manufacturer is inferred from a device category'); return a;
    } },
  { id: 'baseline-diff', label: 'What changed between baseline versions?', examples: ['What changed between baseline v1 and v2?'], match: (q) => /\b(baseline|changed between|v1|v2|version)\b/.test(q), needs: ['Room'],
    answer(ctx, target, question) {
      const a = base('baseline-diff', question, target); if (!target || target.type !== 'Room') { a.uncertainty.push('baselines belong to a room: name a room'); return a; }
      const lin = ctx.facts.baselines?.(target) || null;
      if (lin === null) { a.summary = 'Baseline lineage is not available to this view.'; a.uncertainty.push('the host did not supply the lineage'); return a; }
      if (lin.length < 2) { a.status = lin.length ? 'PARTIAL' : 'UNKNOWN'; a.summary = lin.length ? `Only baseline v${lin[0]!.version} exists for ${lbl(ctx, target)}; there is nothing to compare yet.` : `${lbl(ctx, target)} has no baseline: it has not been accepted.`; a.evidence.push(`baseline versions: ${lin.length}`); return a; }
      const m = /v(\d+)\D+v(\d+)/.exec(question); const va = m ? Number(m[1]) : lin[lin.length - 2]!.version; const vb = m ? Number(m[2]) : lin[lin.length - 1]!.version;
      const A = lin.find((x) => x.version === va), B = lin.find((x) => x.version === vb);
      if (!A || !B) { a.summary = `Versions ${va} and ${vb} are not both in the lineage (${lin.map((x) => 'v' + x.version).join(', ')}).`; a.uncertainty.push('named versions missing'); return a; }
      const keys = new Set([...Object.keys(A.results), ...Object.keys(B.results)]); const changed: string[] = [];
      for (const k of keys) if (A.results[k] !== B.results[k]) changed.push(`${k}: ${A.results[k] || '—'} → ${B.results[k] || '—'}`);
      a.status = 'ANSWERED'; a.confidence = 'OBSERVED';
      a.summary = `v${va} (design revision ${A.designRevision}, ${A.state}) → v${vb} (design revision ${B.designRevision}, ${B.state}): ${changed.length} result label${changed.length === 1 ? '' : 's'} changed${A.designRevision !== B.designRevision ? '; the design revision changed' : ''}; ${keys.size - changed.length} unchanged.`;
      a.items = changed.map((c) => ({ node: { type: 'CommissioningTest', id: c.split(':')[0]! }, label: c, via: 'result label', provenance: 'app.assurance_baseline.results' }));
      a.evidence.push(`v${va} published ${A.publishedAt} by ${A.publishedBy}`, `v${vb} published ${B.publishedAt} by ${B.publishedBy}`);
      if (!changed.length) a.uncertainty.push('the labels are identical: the versions differ in the result objects and evidence they bind, which this comparison does not list'); return a;
    } },
];

/** Pick the intent for a question and answer it; unmatched questions get an honest UNKNOWN with the supported examples. */
export function ask(ctx: IntentContext, question: string, target: NodeRef | null): IntentAnswer {
  const q = question.toLowerCase();
  const def = INTENTS.find((i) => i.match(q));
  if (!def) { const a = base('none', question, target); a.summary = 'This question is not one Search Party can answer from the graph.'; a.uncertainty.push(`supported questions: ${INTENTS.map((i) => i.label).join(' · ')}`); return a; }
  return def.answer(ctx, target, question);
}
