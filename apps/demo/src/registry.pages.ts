/**
 * The page registry: every native page of the demonstration, assembled from one file per slice so the slices never edit the same
 * lines. The shell (App.tsx) resolves an address here, asks the policy, and only then calls the page's `load()`.
 *   registry.shell.ts   the shell slice: investor start, Scouter, the policy page            (owner: rebuild/demo-shell)
 *   registry.spaces.ts  campus, rooms, Lite spaces, Build a Room, Search Party, Field Intel   (owner: rebuild/demo-spaces)
 *   registry.ops.ts     Mission Control, Pro, ServiceHands, commissioning, APEX, Learn …     (owner: rebuild/demo-ops)
 *   registry.parity.ts  the V2.5.3 parity areas: records, sets, ledger, compare, ask, control, V1.4 … (owner: uplift/parity-areas)
 *   registry.worlds.ts  the world-first entry: choose a world, a world's journeys, a journey's screen (owner: v18/worlds)
 * See README-routes.md.
 */
import type { PageDef } from './registry.types.js';
import type { Resolved } from './access/policy.js';
import { SHELL_PAGES } from './registry.shell.js';
import { SPACES_PAGES } from './registry.spaces.js';
import { OPS_PAGES } from './registry.ops.js';
import { PARITY_PAGES } from './registry.parity.js';
import { PROOF_PAGES } from './registry.proof.js';
import { WORLD_PAGES } from './registry.worlds.js';
import { KNOWLEDGE_PAGES } from './registry.knowledge.js';

export const PAGES: readonly PageDef[] = [...SHELL_PAGES, ...SPACES_PAGES, ...OPS_PAGES, ...PARITY_PAGES, ...PROOF_PAGES, ...WORLD_PAGES, ...KNOWLEDGE_PAGES];

interface Compiled { page: PageDef; segs: string[]; rest: boolean; score: number }
const compile = (page: PageDef, path: string): Compiled => {
  const segs = path.split('/').filter(Boolean); const rest = segs[segs.length - 1] === '*'; if (rest) segs.pop();
  // more literal segments first, then more segments, then no wildcard
  return { page, segs, rest, score: segs.filter((s) => !s.startsWith(':')).length * 1000 + segs.length * 10 + (rest ? 0 : 1) };
};
let table: Compiled[] | null = null;
const routes = () => (table ??= PAGES.flatMap((p) => [p.path, ...(p.alias || [])].map((x) => compile(p, x))).sort((a, b) => b.score - a.score));

/** Split '#/a/b?x=1~trail' into decoded path segments and the query (V2.5.3 addresses may carry a '~' passport trail; it is ignored here). */
export function parseHash(hash: string): { segs: string[]; query: URLSearchParams } {
  const h = hash.replace(/^#?\/?/, ''); const qi = h.indexOf('?');
  const path = (qi >= 0 ? h.slice(0, qi) : h).split('~')[0]!; const qs = qi >= 0 ? h.slice(qi + 1).split('~')[0]! : '';
  const segs = path.split('/').filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
  return { segs, query: new URLSearchParams(qs) };
}

/** The registered page at this address, with its parameters; null when no native page claims it. */
export function resolve(hash: string): Resolved | null {
  const { segs, query } = parseHash(hash);
  for (const r of routes()) {
    if (r.rest ? segs.length < r.segs.length : segs.length !== r.segs.length) continue;
    const params: Record<string, string> = {}; let ok = true;
    r.segs.forEach((s, i) => { if (!ok) return; if (s.startsWith(':')) params[s.slice(1)] = segs[i]!; else if (s !== segs[i]) ok = false; });
    if (ok) { if (r.rest) params['*'] = segs.slice(r.segs.length).join('/'); return { page: r.page, params, query }; }
  }
  return null;
}
export const pageById = (id: string) => PAGES.find((p) => p.id === id);
/** The address of a page, filling its ':name' parameters (missing ones are dropped from the end). */
export function hrefOf(id: string, params: Record<string, string> = {}, query?: Record<string, string>): string {
  const p = pageById(id); if (!p) return '#/investor';
  const segs: string[] = []; for (const s of p.path.split('/').filter(Boolean)) { if (s === '*') break; if (s.startsWith(':')) { const v = params[s.slice(1)]; if (v == null) break; segs.push(encodeURIComponent(v)); } else segs.push(s); }
  const q = query && Object.keys(query).length ? `?${new URLSearchParams(query)}` : '';
  return `#/${segs.join('/')}${q}`;
}
