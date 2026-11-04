/**
 * The demo's page contract (owned by the shell slice). A page is registered once, in a registry file, as a PageDef: its address, the
 * product it belongs to, the V2.5.3 authority that decides who may open it, its sections and actions (each naming its own authority),
 * and a lazy `load` for its code. The shell matches the address, asks the access policy, and only calls `load()` when the current role
 * may open that exact address: a forbidden address shows the Agora Owl access page and never downloads the screen's chunk (D44).
 *
 * Read apps/demo/src/README-routes.md before adding a page.
 */
import type { ComponentType } from 'react';

/** The fifteen demonstration roles: the fourteen of V2.5.3 (AZ_KEYS) and `qa`, the Document Reviewer of ADR-0005. */
export type RoleKey = 'visitor' | 'employee' | 'exec' | 'service' | 'svcmgr' | 'syseng' | 'designer' | 'installer' | 'cxeng' | 'ipm' | 'bpm' | 'ops' | 'steward' | 'architect' | 'qa';

/** The nine products in the canonical order (D37/D40) — the ids of packages/design-tokens (--p-<id>) and packages/ui products — plus `shell` for the investor start and other platform pages. */
export type ProductKey = import('@empathia/ui').ProductId | 'shell';

/**
 * Who may use something, named by its V2.5.3 authority. The policy resolves it against the tables extracted from V2.5.3
 * (apps/demo/src/access/v253.ts). Anything it cannot resolve is denied to every role (deny by default).
 *   area     an AZ_AREA key (pages):              { area: 'campus' }
 *   field    an AZ_FIELD key (sections):          { field: 'technical' }
 *   action   an AZ_ACTION key (buttons):          { action: 'sh.triage' }
 *   compare  an AZ_COMPARE key (Core Compare):    { compare: 'budget' }
 *   lens     an AZ_LENS key (Lite modes):         { lens: 'engineer' }
 *   layer    an AZ_LAYER key (spatial layers):    { layer: 'network' }
 *   entity   an AZ_ENTITY key (record types):     { entity: 'WorkOrder' }
 *   roles    an explicit list, only for surfaces V2.5.3 never had; `why` says where the rule comes from.
 * `all` combines authorities: a role needs every one of them (a section inside a page also needs the page).
 */
export type Authority =
  | { area: string } | { field: string } | { action: string } | { compare: string } | { lens: string } | { layer: string } | { entity: string }
  | { roles: readonly RoleKey[]; why: string }
  | { all: readonly Authority[] };

/** A part of a page that some roles see and others do not (a panel, a tab, a column group). Rendered through <Section id>. */
export interface SectionDef { id: string; label: string; authority: Authority }
/** Something a role does (a button, a submit, a state transition). Rendered through <Action id> or checked with can(id). */
export interface ActionDef { id: string; label: string; authority: Authority }

/** What a page component receives. `can`/`sees` answer from the policy for the current role; a page never decides access itself. */
export interface PageProps {
  role: RoleKey;
  /** the full hash, e.g. '#/campus/ATL/4/R-ATL-4-218?view=devices' */
  hash: string;
  /** named path parameters from the PageDef path, e.g. { building: 'ATL', floor: '4', room: 'R-ATL-4-218' } */
  params: Record<string, string>;
  query: URLSearchParams;
  /** may the current role use this action (an id from this page's `actions`, or any registered action id)? */
  can: (actionId: string) => boolean;
  /** may the current role see this section (an id from this page's `sections`)? */
  sees: (sectionId: string) => boolean;
}

export interface PageDef {
  /** stable, dotted, unique: 'campus.room', 'servicehands.dispatch' */
  id: string;
  /** the page's name in the rail menu, search, the access page and the role veil ("lands on …") */
  title: string;
  /** one line on what it is for (search results and the access page) */
  purpose: string;
  product: ProductKey;
  /**
   * The address pattern, without '#': segments are literals or ':name' parameters; a trailing '*' matches the rest.
   * '/campus/:building/:floor/:room'. More specific patterns win over less specific ones regardless of order.
   */
  path: string;
  /** other addresses that open the same page (e.g. the V2.5.3 address '/scouter' for '/campus/scouter'); same pattern syntax */
  alias?: readonly string[];
  /** who may open it */
  authority: Authority;
  /**
   * Optional refinement by the exact address (view/query): return the authority for THIS address, e.g. the Lite lens in ?mode=,
   * or a stricter one for ?view=analysis. The access page names only the roles that pass both `authority` and this.
   */
  authorityFor?: (params: Record<string, string>, query: URLSearchParams) => Authority | undefined;
  sections?: readonly SectionDef[];
  actions?: readonly ActionDef[];
  /** lazy import of the page module; the module's default export is the page component */
  load: () => Promise<{ default: ComponentType<PageProps> }>;
  /** search-bar entries for this page (label defaults to title); aliases are extra words people type */
  search?: { keywords?: string; aliases?: readonly string[]; href?: string };
  /** true: listed in the product menu as the product's landing page */
  landing?: boolean;
}
