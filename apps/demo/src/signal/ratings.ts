/**
 * SIGNAL story ratings, season reviews and the loadout. Restored 11 November 2026 to the founder's build package
 * (docs/04-engine-specs.md §10 and the reference runtime ratings.js; the reference wins).
 *
 * Six ratings from FIRST attempts only (retries teach but do not rewrite the record): Competence, Evidence discipline, Trust,
 * Safety/authority, Technical debt (higher is less debt), Leadership/readiness. Each starts from a neutral prior (3 units at 0.72) and
 * every observation adds v×w. Story Score = the weighted mean. Every season finale ends with a review: below 65 the story ends (game
 * over) until the season is retried or the story restarted. Seasons 10–12 draw a loadout from the ratings, locked at the Season 9 review.
 * Pure: the data it reads is the build's signal/ratings.json (decisions with their options, seasons and tiers of every piece, titles).
 */
import type { Progress } from './story.js';

export interface RatingsIndex {
  dec: Record<string, { cid: string; se: number; dims: string[]; sev: number; q: string; opts: Record<string, { c?: 1; f?: 1 }> }>;
  seasonOf: Record<string, number>; tierOf: Record<string, number>;
  titles: Record<string, Record<string, string>>; drillKind: Record<string, { type: string; domain: string }>;
}
export const DIMS = [
  ['comp', 'Competence', 'Did you actually demonstrate the technical skill?'],
  ['evid', 'Evidence discipline', 'Did you observe, test and verify rather than guess?'],
  ['trust', 'Trust', 'How much confidence do Maya’s team and stakeholders have in her?'],
  ['safe', 'Safety / authority', 'Did you respect boundaries and escalate correctly?'],
  ['debt', 'Technical debt', 'How few unresolved shortcuts and weak decisions piled up? (Higher is less debt.)'],
  ['lead', 'Leadership / readiness', 'Did you communicate, document and prepare other people?'],
] as const;
export type Dim = (typeof DIMS)[number][0];
export const WEIGHT: Record<Dim, number> = { comp: 0.22, evid: 0.18, trust: 0.15, safe: 0.2, debt: 0.12, lead: 0.13 };
export const PASS = 65;
export const RESOURCES = [
  ['budget', 'Budget', ['trust', 'debt'], ['Bare minimum — every purchase is a fight you usually lose', 'Constrained — one priority a year', 'Funded — the plan you asked for']],
  ['team', 'Team', ['lead'], ['Bare minimum — you and one junior nobody trained', 'A small team, partly trained', 'A trained team that can act without you']],
  ['monitoring', 'Monitoring & tools', ['evid'], ['Bare minimum — you hear about failures from users', 'Partial — some systems watched', 'Outcome-based monitoring on everything that matters']],
  ['redundancy', 'Redundancy', ['comp', 'debt'], ['Bare minimum — single points of failure everywhere', 'One backup, not independent', 'Independent, tested backups']],
  ['authority', 'Authority & access', ['safe', 'trust'], ['Bare minimum — every change escalates; owners don’t call back', 'Owners answer, slowly', 'Owners trust you and sign off fast']],
  ['docs', 'Documentation', ['lead', 'debt'], ['Bare minimum — tribal knowledge only', 'Partial runbooks', 'Current runbooks and an exception register']],
] as const;
export const LEVEL = ['Bare minimum', 'Limited', 'Full'] as const;

export interface Ratings { dims: Record<Dim, { score: number; n: number }>; score: number; pass: boolean; notes: Array<{ dim: Dim; w: number; t: string }>; debt: number; seen: number }
export interface Review { score: number; pass: boolean; at: number; dims: Record<Dim, number>; loadout?: Loadout }
export type Loadout = Record<string, { lvl: 0 | 1 | 2; v: number; label: string; text: string }>;

/** Ratings over seasons up to `maxSe` (or exactly `onlySe`), from first attempts. */
export function ratingsFor(P: Progress, X: RatingsIndex, maxSe: number, onlySe?: number): Ratings {
  const acc = Object.fromEntries(DIMS.map(([k]) => [k, { s: 0.72 * 3, w: 3, n: 0 }])) as Record<Dim, { s: number; w: number; n: number }>;
  const notes: Ratings['notes'] = []; let debt = 0, seen = 0;
  const add = (dim: Dim, v: number, w: number, note?: string | null) => { const a = acc[dim]; a.s += v * w; a.w += w; a.n += 1; if (note && v < 0.5) notes.push({ dim, w: w * (1 - v), t: note }); };
  const inScope = (se: number | undefined) => se != null && se <= maxSe && (!onlySe || se === onlySe);
  const se = (kind: string, id: string) => X.seasonOf[`${kind}:${id}`];
  const title = (kind: string, id: string) => X.titles[kind]?.[id] || id;
  for (const st of Object.values(P.chapters)) for (const [id, c] of Object.entries(st.choices)) {
    const d = X.dec[id]; if (!d || !inScope(d.se) || !c.first) continue; seen += 1;
    const first = c.first; const timeout = first === 'TIMEOUT'; const o = d.opts[first] || {}; const canonical = !!o.c, fail = !!o.f;
    const v = timeout ? 0 : canonical ? 1 : fail ? 0 : 0.5, w = d.sev, lab = `“${d.q}” (${d.cid.toUpperCase()})`;
    add('comp', v, w * 0.5, fail ? `A failing call: ${lab}` : null);
    add('trust', v, w, v < 0.5 ? `${timeout ? 'You ran out of time: ' : 'The team lost confidence: '}${lab}` : null);
    for (const k of d.dims) if (k !== 'debt' && k in WEIGHT) add(k as Dim, v, w * 1.5, v < 0.5 ? `Weak judgment: ${lab}` : null);
    if (fail && d.dims.includes('safe')) add('safe', 0, w * 2, `A boundary or safety call went wrong: ${lab}`);
    if (!canonical) { add('debt', v, w, `A shortcut or unresolved choice: ${lab}`); debt += 1; } else add('debt', 1, w * 0.5);
    if (timeout) add('lead', 0, 1, `Nobody led when the clock ran out: ${lab}`);
  }
  for (const [id, r] of Object.entries(P.quizzes)) { if (!inScope(se('quiz', id))) continue; seen += 1; const f = r.first / (r.total || 1);
    add('comp', f, 1 + 0.25 * ((X.tierOf[`quiz:${id}`] || 1) - 1), f < 0.5 ? `Low first score: ${title('quiz', id)}` : null); }
  for (const [id, r] of Object.entries(P.drills)) { if (!inScope(se('drill', id))) continue; seen += 1; const v = r.first ? 1 : r.passed ? 0.45 : 0.15; const k = X.drillKind[id];
    add('comp', v, 1, v < 0.5 ? `Missed the drill “${title('drill', id)}” on the first try` : null);
    if (k && (k.type === 'firstfail' || k.type === 'clues')) add('evid', v, 1);
    if (k && k.domain === 'Safety') add('safe', v, 1.5, v < 0.5 ? `A safety sequence in the wrong order: ${title('drill', id)}` : null); }
  for (const [id, r] of Object.entries(P.labs)) { if (!inScope(se('lab', id))) continue; seen += 1; const t = r.passTry || (r.passed ? r.tries || 1 : 0);
    const v = !r.passed ? 0.1 : t <= 1 ? 1 : t === 2 ? 0.7 : t === 3 ? 0.45 : 0.25;
    add('comp', v, 1.5, v < 0.5 ? `Guessed at (or never fixed) “${title('lab', id)}”` : null); add('evid', v, 1); }
  for (const [id, r] of Object.entries(P.incidents)) { if (!inScope(se('incident', id))) continue; seen += 1; const o = r.first, why = r.firstWhy, nm = `the live incident “${title('incident', id)}”`;
    if (o === 'fail' && why === 'boundary') { add('safe', 0, 3, `Crossed a safety or authority boundary in ${nm}`); add('comp', 0, 2); add('trust', 0.2, 1); continue; }
    if (o === 'proven') { add('comp', 1, 2); add('evid', 1, 2); add('trust', 1, 1); add('safe', 1, 0.5); add('lead', 0.85, 0.7); add('debt', 1, 0.7); }
    else if (o === 'partial') { add('comp', 0.55, 2); add('evid', 0.25, 2, `Restored ${nm} without proving it`); add('debt', 0.35, 1, `Left the root cause of ${nm} open`); debt += 1; }
    else { add('comp', 0.1, 2, `Failed ${nm}`); if (why === 'clock') add('lead', 0.3, 1, `Ran out the clock in ${nm}`); else { add('evid', 0, 2, `Declared ${nm} fixed while it was still broken`); add('debt', 0, 1.5); debt += 1; } add('trust', 0.3, 1); } }
  for (const [id, r] of Object.entries(P.meltdowns || {})) { if (!inScope(se('meltdown', id))) continue; seen += 1; const o = r.first, g = ({ S: 1, A: 0.88, B: 0.72, C: 0.55, D: 0.38 } as Record<string, number>)[r.firstGrade] ?? 0.4, nm = `the meltdown “${title('meltdown', id)}”`;
    if (r.firstWhy === 'boundary') { add('safe', 0, 5, `Crossed a boundary in ${nm}`); add('comp', 0.1, 4); add('trust', 0.2, 2); continue; }
    add('comp', o === 'fail' ? 0.15 : g, 4, o === 'fail' ? `Lost ${nm}` : null); add('evid', o === 'proven' ? 1 : o === 'partial' ? 0.3 : 0.1, 3); add('lead', o === 'fail' ? 0.3 : g, 2); add('trust', o === 'fail' ? 0.25 : g, 2); }
  for (const k of Object.keys(P.skips)) { const i = k.indexOf(':'); if (!inScope(se(k.slice(0, i), k.slice(i + 1)))) continue; add('comp', 0, 0.6, `Skipped a recommended check (${k.slice(i + 1)})`); add('debt', 0, 0.4); debt += 1; }
  const per: Record<string, number> = {}; const picked = notes.sort((a, b) => b.w - a.w).filter((n) => { per[n.dim] = (per[n.dim] || 0) + 1; return per[n.dim]! <= 2; }).slice(0, 6);
  const dims = {} as Ratings['dims']; let score = 0;
  for (const [k] of DIMS) { const a = acc[k]; const v = Math.round((100 * a.s) / a.w); dims[k] = { score: v, n: a.n }; score += v * WEIGHT[k]; }
  return { dims, score: Math.round(score), pass: Math.round(score) >= PASS, notes: picked, debt, seen };
}
export function loadoutOf(r: Ratings): Loadout { const o: Loadout = {};
  for (const [id, label, from, texts] of RESOURCES) { const v = from.reduce((t, k) => t + r.dims[k as Dim].score, 0) / from.length; const lvl = (v >= 80 ? 2 : v >= PASS ? 1 : 0) as 0 | 1 | 2; o[id] = { lvl, v: Math.round(v), label, text: texts[lvl] }; }
  return o; }
/** The loadout in force: locked at the Season 9 review, otherwise the forecast from every season so far (ratings.js srCurrentLoadout). */
export const currentLoadout = (P: Progress, X: RatingsIndex): Loadout => (P.reviews?.['S9']?.loadout as Loadout | undefined) || loadoutOf(ratingsFor(P, X, 99));
/** A requirement such as {"team": 2} or "team:2,budget:1" is met when every resource's level reaches it. */
export function parseReq(req: unknown): Record<string, number> { if (typeof req !== 'string') return (req && typeof req === 'object' ? req : {}) as Record<string, number>; const o: Record<string, number> = {}; for (const part of req.split(',')) { const m = /^(\w+):(\d)$/.exec(part.trim()); if (m) o[m[1]!] = Number(m[2]); } return o; }
export const resMet = (lo: Loadout, req: unknown) => Object.entries(parseReq(req)).every(([k, v]) => (lo[k]?.lvl ?? -1) >= v);
export const resWhy = (lo: Loadout, req: unknown) => Object.entries(parseReq(req)).filter(([k, v]) => !((lo[k]?.lvl ?? -1) >= v)).map(([k, v]) => `${lo[k]?.label || k}: ${lo[k] ? LEVEL[lo[k]!.lvl].toLowerCase() : '?'} — needs ${LEVEL[v as 0 | 1 | 2]?.toLowerCase() || v}`).join(' · ');
export const band = (v: number) => (v >= 80 ? 'high' : v >= PASS ? 'mid' : 'low');
/** Submit a season review: the record the reference keeps (with the loadout at Season 9). */
export function submitReview(P: Progress & { reviews?: Record<string, Review> }, X: RatingsIndex, season: number, now: number): Review {
  const r = ratingsFor(P, X, season); const rv: Review = { score: r.score, pass: r.pass, at: now, dims: Object.fromEntries(Object.entries(r.dims).map(([k, v]) => [k, v.score])) as Record<Dim, number> };
  if (season === 9) rv.loadout = loadoutOf(r); return rv;
}
/** Retry a season (game over): that season's first attempts of every kind, its decisions and skips, and every review from it on, are
 *  forgotten, so they can be earned again; earlier seasons keep their record. */
export function retrySeason<T extends Progress & { reviews?: Record<string, Review> }>(P: T, X: RatingsIndex, season: number): T {
  const keep = <R>(bag: Record<string, R>, kind: string) => Object.fromEntries(Object.entries(bag).filter(([id]) => X.seasonOf[`${kind}:${id}`] !== season));
  const chapters = Object.fromEntries(Object.entries(P.chapters).map(([cid, st]) => [cid, { ...st, choices: Object.fromEntries(Object.entries(st.choices).filter(([id]) => X.dec[id]?.se !== season)) }]));
  const skips = Object.fromEntries(Object.entries(P.skips).filter(([k]) => { const i = k.indexOf(':'); return X.seasonOf[`${k.slice(0, i)}:${k.slice(i + 1)}`] !== season; }));
  const reviews = Object.fromEntries(Object.entries(P.reviews || {}).filter(([k]) => Number(k.slice(1)) < season));
  return { ...P, chapters, skips, reviews, quizzes: keep(P.quizzes, 'quiz'), drills: keep(P.drills, 'drill'), labs: keep(P.labs, 'lab'), incidents: keep(P.incidents, 'incident'), meltdowns: keep(P.meltdowns || {}, 'meltdown') };
}
