/**
 * The demonstration's access policy (D44): one deny-by-default policy over every page, section and action. It is a faithful port of
 * V2.5.3's 12-authz.js (AZ_AREA / canViewRoute / canPerform / tabsFor), whose tables are extracted into ./v253.ts. The rail, the home
 * tabs, the sections and the buttons all render from it, so a role never sees a tab, button or screen it cannot use; a forbidden
 * address shows the Agora Owl access page and never loads the screen's code.
 *
 * Deny by default: an authority the tables do not name resolves to no role at all; an address no page or legacy area claims resolves to
 * V2.5.3's `none` area (the Product Architect only). Every surface names its authority (registry.types.ts › Authority).
 *
 * This is a demonstration of authorization, not security: the whole synthetic model is in the page. Real access is decided by the
 * authenticated application's server, which is least privilege on its own (docs/security).
 */
import type { Authority, PageDef, RoleKey, SectionDef, ActionDef } from '../registry.types.js';
import * as V from './v253.js';

// ------------------------------------------------------------------ roles
/** V2.5.3's fourteen roles in its own role-list order (ROLE_KEYS), then the Document Reviewer the Phase 2 demonstration added. */
export const ROLE_KEYS: readonly RoleKey[] = ['ops', 'svcmgr', 'service', 'syseng', 'designer', 'installer', 'cxeng', 'ipm', 'bpm', 'steward', 'exec', 'employee', 'visitor', 'architect', 'qa'];
export const isRole = (r: unknown): r is RoleKey => typeof r === 'string' && (ROLE_KEYS as readonly string[]).includes(r);
/** The role the demonstration opens as: V2.5.3's Product Architect, who sees the complete platform and can View as every role. */
export const DEFAULT_ROLE: RoleKey = 'architect';

export interface RoleInfo {
  key: RoleKey;
  label: string;
  /** two-letter avatar, from V2.5.3 (ROLE.ava) */
  initials: string;
  /** the name of the role's home, from V2.5.3 (ROLE.home): "Briefing", "Proof board" … */
  home: string;
  /** the domain line of the role veil and the View-as list, from V2.5.3 (ROLE_UI.sub) */
  domain: string;
  blurb: string;
  /** what the role is given, verbatim from V2.5.3 (AZ_ROLE) */
  work: string;
}
const QA: RoleInfo = { key: 'qa', label: 'Document Reviewer', initials: 'QA', home: 'Review desk', domain: 'Quality', blurb: 'Accepts or returns evidence they neither recorded nor verified', work: 'commissioning records, evidence, baselines and the ledger, to accept or return what others recorded and verified (ADR-0005)' };
export const ROLES: Readonly<Record<RoleKey, RoleInfo>> = Object.fromEntries([
  ...V.AZ_KEYS.map((k) => [k, { key: k, label: V.ROLE[k].label, initials: V.ROLE[k].ava, home: V.ROLE[k].home, domain: V.ROLE_UI[k].sub, blurb: V.ROLE[k].blurb, work: V.AZ_ROLE[k] } satisfies RoleInfo]),
  ['qa', QA],
]) as Record<RoleKey, RoleInfo>;

// ------------------------------------------------------------------ the Document Reviewer (not in V2.5.3)
/** ADR-0005 added an independent reviewer; V2.5.3 has no such role, so its grants are listed here, explicitly and narrowly. */
const QA_AREAS = new Set(['home', 'investor', 'v25.build', 'search', 'commissioning', 'commissioning.room', 'ledger', 'assurance.history', 'decisions', 'lessons', 'gate']);
const QA_ACTIONS = new Set(['review.decide', 'cx.accept', 'decision.record', 'favourite']);
const QA_FIELDS = new Set(['commissioning.record', 'assurance.evidence', 'history']);

// ------------------------------------------------------------------ authority → roles
type Table = Readonly<Record<string, readonly string[]>>;
const areaRoles = (k: string): readonly string[] | undefined => (V.AZ_AREA as Record<string, readonly [readonly string[], string]>)[k]?.[0] ?? (V.AZ_AREA_V25 as Record<string, readonly [readonly string[], string]>)[k]?.[0];
const from = (t: unknown, k: string) => (t as Table)[k];
const withQa = (roles: readonly string[] | undefined, qa: boolean): RoleKey[] | undefined => roles && [...roles, ...(qa ? ['qa'] : [])].filter(isRole);

/** The roles an authority admits. Anything unresolvable admits nobody. */
export function rolesFor(a: Authority): RoleKey[] {
  if ('all' in a) return a.all.length ? a.all.map(rolesFor).reduce((x, y) => x.filter((r) => y.includes(r))) : [];
  if ('roles' in a) return a.roles.filter(isRole);
  if ('area' in a) return withQa(areaRoles(a.area), QA_AREAS.has(a.area)) ?? [];
  if ('action' in a) return withQa(from(V.AZ_ACTION, a.action), QA_ACTIONS.has(a.action)) ?? [];
  if ('field' in a) return withQa(from(V.AZ_FIELD, a.field), QA_FIELDS.has(a.field)) ?? [];
  if ('compare' in a) return withQa(from(V.AZ_COMPARE, a.compare), false) ?? [];
  if ('lens' in a) return withQa(from(V.AZ_LENS, a.lens), false) ?? [];
  if ('layer' in a) return withQa(from(V.AZ_LAYER, a.layer), false) ?? [];
  if ('entity' in a) return withQa(from(V.AZ_ENTITY, a.entity), false) ?? [];
  return [];
}
/** Does the authority name something the tables know? (A registered surface whose authority is unknown is a defect: tests fail on it.) */
export function known(a: Authority): boolean {
  if ('all' in a) return a.all.length > 0 && a.all.every(known);
  if ('roles' in a) return a.roles.length > 0 && a.roles.every(isRole) && a.why.length > 0;
  if ('area' in a) return !!areaRoles(a.area);
  if ('action' in a) return !!from(V.AZ_ACTION, a.action);
  if ('field' in a) return !!from(V.AZ_FIELD, a.field);
  if ('compare' in a) return !!from(V.AZ_COMPARE, a.compare);
  if ('lens' in a) return !!from(V.AZ_LENS, a.lens);
  if ('layer' in a) return !!from(V.AZ_LAYER, a.layer);
  if ('entity' in a) return !!from(V.AZ_ENTITY, a.entity);
  return false;
}
export const allows = (a: Authority, role: RoleKey) => rolesFor(a).includes(role);
/** A short, human statement of where an authority comes from (shown on the access page and the policy page). */
export function describe(a: Authority): string {
  if ('all' in a) return a.all.map(describe).join(' and ');
  if ('roles' in a) return a.why;
  if ('area' in a) return `${(V.AZ_AREA as Record<string, readonly [unknown, string]>)[a.area]?.[1] ?? (V.AZ_AREA_V25 as Record<string, readonly [unknown, string]>)[a.area]?.[1] ?? a.area} (V2.5.3 area “${a.area}”)`;
  const [kind, key] = Object.entries(a)[0] as [string, string];
  return `V2.5.3 ${kind} “${key}”`;
}

// ------------------------------------------------------------------ pages, sections, actions
export interface Resolved { page: PageDef; params: Record<string, string>; query: URLSearchParams }
/** The authority for this exact address: the page's, narrowed by its view/query refinement when it has one. */
export const authorityAt = (r: Resolved): Authority => { const x = r.page.authorityFor?.(r.params, r.query); return x ? { all: [r.page.authority, x] } : r.page.authority; };
export const canOpen = (role: RoleKey, r: Resolved) => allows(authorityAt(r), role);
export const whoCanOpen = (r: Resolved) => ROLE_KEYS.filter((k) => canOpen(k, r));
const sectionOf = (page: PageDef, id: string): SectionDef | undefined => page.sections?.find((s) => s.id === id);
/** A section is visible when the role may open the page and the section's own authority admits it. Unknown section ids are hidden. */
export const canSee = (role: RoleKey, r: Resolved, sectionId: string) => { const s = sectionOf(r.page, sectionId); return !!s && canOpen(role, r) && allows(s.authority, role); };
/**
 * An action is usable when the role may open the page and the action's authority admits it. The action is looked up on the page first,
 * then in the global catalogue (every V2.5.3 AZ_ACTION key is an action id). Unknown ids are refused.
 */
export function canDo(role: RoleKey, r: Resolved | null, actionId: string): boolean {
  const own: ActionDef | undefined = r?.page.actions?.find((x) => x.id === actionId);
  const a: Authority | undefined = own?.authority ?? (from(V.AZ_ACTION, actionId) ? { action: actionId } : undefined);
  if (!a) return false;
  return (!r || canOpen(role, r)) && allows(a, role);
}

// ------------------------------------------------------------------ legacy addresses (#/area/...: boundary pages)
/** The V2.5 pages' areas: V2.5.3 resolved #/v25/<page> through its own registry; each maps to the 12-authz area that owns that work. */
const V25: Record<string, Authority> = {
  'v25.home': { area: 'home' }, 'v25.persona': { area: 'home' }, 'v25.record': { area: 'home' },
  'v25.intake': { area: 'intake' }, 'v25.vendor': { area: 'projects' }, 'v25.decisions': { area: 'decisions' }, 'v25.project': { area: 'projects' },
  'v25.design': { area: 'builder' }, 'v25.scouter': { area: 'scouter' }, 'v25.lite': { area: 'lite' }, 'v25.fi': { area: 'agent' }, 'v25.fipv': { area: 'agent' },
  'v25.commissioning': { area: 'commissioning' }, 'v25.tracker': { area: 'commissioning' }, 'v25.coverage': { area: 'service.coverage' },
  'v25.service': { area: 'servicehands' }, 'v25.assurance': { area: 'assurance' }, 'v25.apex': { area: 'assurance.analysis' }, 'v25.exec': { area: 'pro.exec' },
  'v25.learn': { area: 'learn' }, 'v25.ledger': { area: 'ledger' }, 'v25.walkthrough': { area: 'investor' }, 'v25.build': { area: 'v25.build' },
  'v25.policy': { roles: ROLE_KEYS, why: 'the V2.5 Policy page: a demonstration of authorization, shown to every role' },
};
/** The authority for a legacy area key (registry.ts › areaKey). Unknown keys fall to V2.5.3's `none` area: the Product Architect only. */
export const legacyAuthority = (key: string): Authority => V25[key] ?? (areaRoles(key) ? { area: key } : { area: 'none' });

// ------------------------------------------------------------------ home tabs (V2.5.3 tabsFor, filtered as renderTabs did)
export interface HomeTab { key: string; label: string; icon: string; href: string; act?: 'viewas' }
/**
 * The role's home tabs, after V2.5.3's tabsFor: its own labels and order, kept only where the role can open the address
 * (`open` answers that through the registry, so a tab never leads to a refusal), with V2.5.3's "View as" tab for the Product Architect.
 */
export function tabsFor(role: RoleKey, open: (href: string) => boolean, translate: (legacyHref: string) => string = (h) => h): HomeTab[] {
  const base = role === 'qa' ? [['home', 'Review', 'home', '#/home'], ['commissioning', 'Records', 'check', '#/commissioning'], ['search', 'Search', 'search', '#/search']] : (V.TABS as Record<string, readonly (readonly string[])[]>)[role] ?? [['home', 'Home', 'home', '#/home']];
  const out: HomeTab[] = [];
  for (const [key, label, icon, href, act] of base) {
    if (act === 'roles') { out.push({ key: 'viewas', label: label!, icon: icon!, href: '', act: 'viewas' }); continue; }
    const to = translate(href!);
    if (open(to) && !out.some((t) => t.href === to)) out.push({ key: key!, label: label!, icon: icon!, href: to });
  }
  return out;
}

/** How much of the platform a role reaches: V2.5.3's azSurfaces / azSurfaceTotal, shown on the View-as list. */
export const surfaces = (role: RoleKey) => { const keys = Object.keys(V.AZ_AREA).filter((k) => k !== 'none'); return { surfaces: keys.filter((k) => allows({ area: k }, role)).length, of: keys.length }; };
