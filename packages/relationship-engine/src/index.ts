/**
 * @empathia/relationship-engine — Search Party's relationship model as a reusable library.
 *
 * A typed, directed multigraph of facts ("Room R-PLN-0001 PLANS_DEVICE PlannedAsset PA-0004"), each edge with provenance.
 * Provides: neighbourhood traversal to a depth (breadth-first, both directions, with the inverse labels from the RELS
 * vocabulary), downstream impact analysis over chosen relation types, shortest path, and a visibility predicate the caller supplies
 * (the server passes its authorization rule; edges to nodes the caller may not see are dropped, never shown as "hidden").
 * Deterministic graph algorithms — no machine learning. Complexity: O(V + E) per traversal.
 */
import RELS from '@empathia/domain-data/data/RELS.json' with { type: 'json' };
import TYPES from '@empathia/domain-data/data/TYPES.json' with { type: 'json' };

export interface NodeRef { type: string; id: string }
export interface Edge { from: NodeRef; rel: string; to: NodeRef; provenance: string }
export const RELATIONS = RELS as unknown as Record<string, [string, string]>;     // rel → [forward label, inverse label]
export const NODE_TYPES = TYPES as unknown as Record<string, [string, string, string]>;
export const key = (n: NodeRef) => `${n.type}:${n.id}`;

export class Graph {
  private out = new Map<string, Edge[]>();
  private inn = new Map<string, Edge[]>();
  readonly edges: Edge[] = [];
  constructor(edges: Edge[] = []) { for (const e of edges) this.add(e); }
  add(e: Edge): void {
    if (!RELATIONS[e.rel]) throw new Error(`unknown relation ${e.rel}`);
    this.edges.push(e);
    (this.out.get(key(e.from)) || this.out.set(key(e.from), []).get(key(e.from))!).push(e);
    (this.inn.get(key(e.to)) || this.inn.set(key(e.to), []).get(key(e.to))!).push(e);
  }
  outgoing(n: NodeRef) { return this.out.get(key(n)) || []; }
  incoming(n: NodeRef) { return this.inn.get(key(n)) || []; }
}

export interface Step { node: NodeRef; depth: number; via: { rel: string; label: string; from: NodeRef; provenance: string } | null }

/** Everything within `depth` hops of `start`, in both directions, labelled from the start's point of view. */
export function neighbourhood(g: Graph, start: NodeRef, depth = 2, canSee: (n: NodeRef) => boolean = () => true, limit = 500): Step[] {
  if (!canSee(start)) return [];
  const seen = new Set([key(start)]); const out: Step[] = [{ node: start, depth: 0, via: null }]; const q: Step[] = [out[0]!];
  while (q.length && out.length < limit) {
    const s = q.shift()!;
    if (s.depth >= depth) continue;
    const next: Array<[NodeRef, string, string, string]> = [
      ...g.outgoing(s.node).map((e) => [e.to, e.rel, RELATIONS[e.rel]![0], e.provenance] as [NodeRef, string, string, string]),
      ...g.incoming(s.node).map((e) => [e.from, e.rel, RELATIONS[e.rel]![1], e.provenance] as [NodeRef, string, string, string]),
    ];
    for (const [n, rel, label, provenance] of next) {
      if (seen.has(key(n)) || !canSee(n)) continue;
      seen.add(key(n));
      const st: Step = { node: n, depth: s.depth + 1, via: { rel, label, from: s.node, provenance } };
      out.push(st); q.push(st);
    }
  }
  return out;
}

/** Downstream impact: what depends on `start` through the given relation types (forward direction only). */
export function impact(g: Graph, start: NodeRef, rels: string[] = ['FEEDS', 'CONNECTS_TO', 'PLANS_DEVICE', 'HAS_DEVICE'], canSee: (n: NodeRef) => boolean = () => true): NodeRef[] {
  const seen = new Set([key(start)]); const q = [start]; const hit: NodeRef[] = [];
  while (q.length) {
    const n = q.shift()!;
    for (const e of g.outgoing(n)) {
      if (!rels.includes(e.rel) || seen.has(key(e.to)) || !canSee(e.to)) continue;
      seen.add(key(e.to)); hit.push(e.to); q.push(e.to);
    }
  }
  return hit;
}

/** Shortest undirected path between two nodes (breadth-first), or null. */
export function path(g: Graph, a: NodeRef, b: NodeRef, canSee: (n: NodeRef) => boolean = () => true): Edge[] | null {
  const prev = new Map<string, Edge>(); const seen = new Set([key(a)]); const q = [a];
  while (q.length) {
    const n = q.shift()!;
    if (key(n) === key(b)) { const p: Edge[] = []; let k = key(b); while (prev.has(k)) { const e = prev.get(k)!; p.unshift(e); k = key(e.from) === k ? key(e.to) : key(e.from); } return p; }
    for (const e of [...g.outgoing(n), ...g.incoming(n)]) {
      const o = key(e.from) === key(n) ? e.to : e.from;
      if (seen.has(key(o)) || !canSee(o)) continue;
      seen.add(key(o)); prev.set(key(o), e); q.push(o);
    }
  }
  return null;
}
