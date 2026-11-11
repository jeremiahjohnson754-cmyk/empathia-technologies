/**
 * The one way the Knowledge Ledger changes, kept in this browser. Every action names who is acting (the View-as role), is checked
 * against V2.5.3's authorities through the policy (review.decide for reviewers, govern for the customer's administrator), is
 * validated, and writes a line in the workspace ledger: allowed with what was decided, or DENIED with the reason. A refusal changes
 * nothing. Promotions go through the contract's `promote`, so a model or an automation can propose and can never approve.
 * Stored state that cannot be read starts clean, without an error. Synthetic; nothing leaves the page.
 */
import type { Workspace } from '../workspace/store.js';
import { log, deny, personaOf } from '../hardening/kit.js';
import { ROLES } from '../access/policy.js';
import type { RoleKey } from '../registry.types.js';
import { mayRead, promote } from './contract.js';
import { SEED, applyDecisions, noDecisions, readerFor, isReviewer, isTenantAdmin, anonymise, siteNoteObjects, isSiteNote, type Decisions } from './ledger.js';
import { advance, freshState, objectsOf, STEPS, type IngestAction, type IngestState } from './ingest.js';
import { HOME_TENANT, tenantName, type LedgerObject } from './types.js';

const KEY = 'empathia.demo.knowledge.v1';
export interface Stored { v: 1; decisions: Decisions; ingest: IngestState }
export type Refusal = { why: string[] };
export interface Done { said: string; state: Stored }
const fresh = (): Stored => ({ v: 1, decisions: noDecisions(), ingest: freshState() });
const isMap = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
/** Is what was stored something this page wrote? Anything else is discarded and the ledger starts from its seed. */
function sound(x: unknown): x is Stored {
  if (!isMap(x) || x['v'] !== 1) return false; const d = x['decisions']; const g = x['ingest'];
  if (!isMap(d) || !['approved', 'rejected', 'consents', 'released'].every((k) => isMap(d[k]))) return false;
  if (!isMap(g) || g['v'] !== 1 || !Array.isArray(g['done']) || !(g['done'] as unknown[]).every((s) => (STEPS as readonly unknown[]).includes(s)) || !Array.isArray(g['reports'])) return false;
  const src = g['source']; const ix = g['index'];
  return isMap(src) && isMap(src['docs']) && Array.isArray(src['log']) && typeof src['seq'] === 'number' && isMap(ix) && isMap(ix['items']) && Array.isArray(ix['scope']) && isMap(ix['kinds']) && typeof ix['stage'] === 'string' && ix['tenant'] === HOME_TENANT;
}
export function loadState(): Stored { try { const s = localStorage.getItem(KEY); const x: unknown = s ? JSON.parse(s) : null; return sound(x) ? x : fresh(); } catch { return fresh(); } }
const keep = (s: Stored) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* the decisions last the page */ } };

/**
 * The whole ledger as it stands in this browser: the seed, the Site Champions' notes held in the shared workspace `w`, and what was
 * imported, with every decision applied. Unredacted: a reader is given `viewFor(allObjects(…), reader)`, never this list.
 */
export const allObjects = (s: Stored, w: Workspace | null): LedgerObject[] => [...applyDecisions([...SEED, ...siteNoteObjects(w)], s.decisions), ...applyDecisions(objectsOf(s.ingest.index), { ...s.decisions, approved: {}, rejected: {} })];

export type LedgerAction =
  | { t: 'review'; id: string; decision: 'approve' | 'reject'; name: string; why?: string; /** who claims to approve: a person (default), or a model or automation, which is always refused */ as?: 'ai' | 'system' }
  | { t: 'consent'; id: string; by: string; statement: string } | { t: 'release'; id: string; name: string } | { t: 'withdraw'; id: string } | { t: 'undo' }
  | { t: 'ingest'; a: IngestAction };
const today = () => new Date().toISOString().slice(0, 10);
const NONE = 'No knowledge object has that address.';

/** Change the ledger. `w` is the workspace copy being changed (useWorkspace().apply), for the audit line. */
export function act(w: Workspace, role: RoleKey, action: LedgerAction): Refusal | Done {
  const s = loadState(); const persona = personaOf(role); const reader = readerFor(role); const who = ROLES[role].label; const on = today();
  const done = (state: Stored, type: string, aggregate: string, said: string): Done => { keep(state); log(w, persona, type, aggregate, `${said} · ${who}`); return { said, state }; };
  const no = (type: string, aggregate: string, why: string) => deny(w, persona, type, aggregate, [why]);

  if (action.t === 'ingest') {
    const r = advance(s.ingest, action.a, { admin: isTenantAdmin(role), reviewer: isReviewer(role), reader, at: new Date().toISOString() });
    return 'refused' in r ? no(`knowledge.source.${action.a.t}`, 'document-source', r.refused) : done({ ...s, ingest: r.state }, `knowledge.source.${action.a.t}`, 'document-source', `${r.said} · simulated source`);
  }
  if (action.t === 'undo') {
    if (!isTenantAdmin(role)) return no('knowledge.undo', 'knowledge', `The ${who} does not administer the customer’s knowledge.`);
    return done({ ...s, decisions: noDecisions() }, 'knowledge.undo', 'knowledge', 'Every review and sharing decision made in this browser was undone');
  }
  // a Site Champion's note is decided by someone else: the role that writes them can never approve or reject one, whatever else it holds
  if (action.t === 'review' && isSiteNote(action.id) && role === 'sitechamp') return no('knowledge.review', action.id, 'A site champion’s note is approved by someone else. The person who wrote it cannot decide on it; a reviewer does.');
  // from here on the action is about one object, and it must be one this reader may read: an object they may not read does not exist for them
  const o = allObjects(s, w).find((x) => x.id === action.id); if (!o || !mayRead(o, reader).ok) return { why: [NONE] };
  const d = s.decisions;
  if (action.t === 'review') {
    if (o.id.startsWith('src.')) return { why: ['An imported document is reviewed on the document sources page, against the version that was read.'] };
    if (o.zone !== 5 || o.state === 'ARCHIVED') return { why: ['It is not awaiting review.'] };
    if (action.as) { const p = promote(o, { to: 3, by: { name: action.name || 'automation', kind: action.as }, on }); return no('knowledge.review', o.id, 'refused' in p ? p.refused : 'Knowledge is promoted by a named person.'); }
    if (!isReviewer(role)) return no('knowledge.review', o.id, `The ${who} does not review knowledge. A reviewer of ${tenantName(o.tenant)} decides.`);
    const name = action.name.trim().slice(0, 80);
    if (action.decision === 'reject') {
      if (!name) return { why: ['Name the reviewer.'] }; const why = (action.why || '').trim().slice(0, 200); if (why.length < 8) return { why: ['Say why it is rejected (at least 8 characters).'] };
      return done({ ...s, decisions: { ...d, rejected: { ...d.rejected, [o.id]: { by: name, on, why } } } }, 'knowledge.rejected', o.id, `Candidate rejected by ${name}: ${why}`);
    }
    const p = promote(o, { to: 3, by: { name, kind: 'human-reviewer' }, on }); if ('refused' in p) return { why: [p.refused] };
    return done({ ...s, decisions: { ...d, approved: { ...d.approved, [o.id]: { by: name, on } } } }, 'knowledge.approved', o.id, `Candidate approved by ${name} as ${tenantName(o.tenant)}’s own knowledge (zone 5 → zone 3)`);
  }
  if (action.t === 'consent') {
    if (!isTenantAdmin(role)) return no('knowledge.consent', o.id, `The ${who} cannot give ${tenantName(o.tenant)}’s consent. Its administrator can.`);
    if (o.zone !== 3 || o.tenant !== HOME_TENANT || o.state !== 'APPROVED') return { why: ['Only approved knowledge of your own customer can be shared.'] };
    const by = action.by.trim().slice(0, 80); const statement = action.statement.trim().slice(0, 300); const why: string[] = [];
    if (!by) why.push('Name who is giving the customer’s consent.'); if (statement.length < 20) why.push('Say what the consent covers and what must stay out (at least 20 characters).');
    if (why.length) return { why };
    return done({ ...s, decisions: { ...d, consents: { ...d.consents, [o.id]: { by, on, statement } }, released: Object.fromEntries(Object.entries(d.released).filter(([k]) => k !== o.id)) } }, 'knowledge.consent', o.id, `Consent to share an anonymised copy recorded by ${by}. It is not shared until a reviewer releases it`);
  }
  if (action.t === 'release') {
    if (!isReviewer(role)) return no('knowledge.release', o.id, `The ${who} does not release shared knowledge. A reviewer does, after the customer’s consent.`);
    const c = d.consents[o.id]; if (!c) return { why: ['The customer’s administrator has not recorded consent for this. Nothing is shared without it.'] };
    const anon = anonymise(o); const p = promote(anon.object, { to: 4, by: { name: action.name.trim(), kind: 'human-reviewer' }, on, consent: { by: c.by, on: c.on, anonymised: `${anon.statement} ${c.statement}` } });
    if ('refused' in p) return { why: [p.refused] };
    return done({ ...s, decisions: { ...d, released: { ...d.released, [o.id]: { by: action.name.trim().slice(0, 80), on } } } }, 'knowledge.released', o.id, `Anonymised copy released by ${action.name.trim().slice(0, 80)} with ${c.by}’s consent (zone 3 → zone 4). The original stays private`);
  }
  // withdraw
  if (!isTenantAdmin(role)) return no('knowledge.withdraw', o.id, `The ${who} cannot withdraw ${tenantName(o.tenant)}’s consent. Its administrator can.`);
  if (!d.consents[o.id]) return { why: ['No consent is recorded for this.'] };
  const without = (m: Record<string, unknown>) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== o.id));
  return done({ ...s, decisions: { ...d, consents: without(d.consents) as Decisions['consents'], released: without(d.released) as Decisions['released'] } }, 'knowledge.withdrawn', o.id, 'Consent withdrawn. The shared copy is no longer offered to anyone');
}
