/**
 * Scouter (part of Lite, D41): device evaluation against a room's requirements. A port of V2.5.3's Scouter model — its fifteen
 * dimensions and weights (SCOUT_DIMS, SCOUT_WEIGHTS) and its nine lifecycle states (SCOUT_STATES) — as a pure function:
 *
 *   1. Hard gates first, never traded against a score: the lifecycle state allows designs, the category fits the room archetype, the
 *      network has the ports and the power budget, every must-have dimension reaches its minimum, the unit cost is inside the budget.
 *      A must-have that cannot be confirmed (no score yet) is a gate that is NOT met: unknown is never pass.
 *   2. Then a weighted score over the dimensions that HAVE a score, with the coverage of the weight it rests on stated beside it.
 *      Unknown dimensions are left out, never counted as zero and never as average.
 *   3. Every score carries its basis (MEASURED, VERIFIED, DECLARED, MODELED, UNKNOWN). Spatial fit is MODELED from the room geometry
 *      with the Lite rules below; a modeled value is never presented as a measurement.
 *
 * Every candidate, brand, model, figure and room here is synthetic (the invented V2.5.3 brands Vantora, Orvique and Sonarith).
 */

export type Dim = 'ux' | 'audio' | 'video' | 'spatial' | 'mgmt' | 'mon' | 'net' | 'sec' | 'interop' | 'deploy' | 'comm' | 'support' | 'life' | 'tco' | 'evidence';
/** V2.5.3 SCOUT_DIMS: key, label, what it asks */
export const DIMS: readonly (readonly [Dim, string, string])[] = [
  ['ux', 'User experience', 'How it feels to the people in the room'],
  ['audio', 'Audio', 'Pickup or playback quality for speech'],
  ['video', 'Video', 'Image quality and framing'],
  ['spatial', 'Spatial fit', 'Does its coverage suit this room: modeled with the Lite engine'],
  ['mgmt', 'Management', 'Remote configuration and firmware'],
  ['mon', 'Monitoring', 'Health and alerts it can report'],
  ['net', 'Network fit', 'Against the current network standard and the ports that are free'],
  ['sec', 'Security fit', 'Authentication, encryption and patching'],
  ['interop', 'Interoperability', 'With what is already installed'],
  ['deploy', 'Deployment', 'How hard it is to install'],
  ['comm', 'Commissioning', 'How much there is to set up and verify'],
  ['support', 'Supportability', 'Spares, skills and the support path'],
  ['life', 'Lifecycle', 'How long it will be sold and supported'],
  ['tco', 'Cost of ownership', 'Unit cost, installation and five years of running'],
  ['evidence', 'Operational evidence', 'How it has behaved in this estate'],
];
/** V2.5.3 SCOUT_WEIGHTS */
export const WEIGHTS: Readonly<Record<Dim, number>> = { ux: 1, audio: 1.3, video: 1.3, spatial: 1.6, mgmt: 0.9, mon: 0.7, net: 0.8, sec: 0.9, interop: 1.1, deploy: 0.6, comm: 0.6, support: 1, life: 1, tco: 1, evidence: 1 };

export type LifeState = 'WATCH' | 'EVALUATE' | 'PILOT' | 'CONDITIONAL' | 'APPROVED' | 'PREFERRED' | 'SUNSET' | 'REPLACE' | 'BLOCKED';
/** V2.5.3 SCOUT_STATES: key, label, tone, meaning, may it be chosen for a new design */
export const STATES: Readonly<Record<LifeState, { label: string; tone: 'muted' | 'info' | 'warn' | 'ok' | 'bad'; meaning: string; selectable: boolean }>> = {
  WATCH: { label: 'Watch', tone: 'muted', meaning: 'Announced or new to the market. Not for designs yet.', selectable: false },
  EVALUATE: { label: 'Evaluate', tone: 'info', meaning: 'Being assessed on paper. Not for designs yet.', selectable: false },
  PILOT: { label: 'Pilot', tone: 'info', meaning: 'On trial in one or two rooms. Selectable with a pilot plan.', selectable: true },
  CONDITIONAL: { label: 'Conditional', tone: 'warn', meaning: 'Approved only where its condition is met.', selectable: true },
  APPROVED: { label: 'Approved', tone: 'ok', meaning: 'May be used in any new design.', selectable: true },
  PREFERRED: { label: 'Preferred', tone: 'ok', meaning: 'The standard choice for its category.', selectable: true },
  SUNSET: { label: 'Sunset', tone: 'warn', meaning: 'Still supported, no longer chosen for new designs.', selectable: false },
  REPLACE: { label: 'Replace', tone: 'bad', meaning: 'Installed units should be planned out.', selectable: false },
  BLOCKED: { label: 'Blocked', tone: 'bad', meaning: 'Must not be bought or installed.', selectable: false },
};

export type Basis = 'MEASURED' | 'VERIFIED' | 'DECLARED' | 'MODELED' | 'UNKNOWN';
export interface Score { value: number; basis: Exclude<Basis, 'UNKNOWN'>; note: string }
export type Category = 'camera' | 'display' | 'micceil' | 'bar';
export const CATEGORY_LABEL: Readonly<Record<Category, string>> = { camera: 'PTZ camera', display: 'Display', micceil: 'Ceiling microphone array', bar: 'Video bar' };

export interface Candidate {
  id: string; category: Category; brand: string; model: string; state: LifeState;
  /** a CONDITIONAL candidate's condition, checked against the room: max seats, or archetypes */
  condition?: { maxSeats?: number; archetypes?: readonly string[]; text: string };
  archetypes: readonly string[];
  ports: number; poeW: number; unitCost: number; install: number; run5y: number;
  /** geometry the spatial model needs: display diagonal (in), camera horizontal field of view (degrees) and reach (m), mic coverage (m²) */
  geometry: { diagonalIn?: number; hfovDeg?: number; reachM?: number; coverM2?: number };
  scores: Partial<Record<Exclude<Dim, 'spatial'>, Score>>;
  /** units in this (synthetic) estate, for the evidence line */
  installed?: { units: number; incidents12m: number };
}

export interface Room { id: string; name: string; archetype: string; seats: number; lengthM: number; widthM: number; freePorts: number; poeBudgetW: number; pilotPlan: boolean }
export interface Requirement { category: Category; mustHave: readonly { dim: Dim; min: number }[]; budget: number }

export interface Gate { id: 'state' | 'condition' | 'archetype' | 'ports' | 'power' | 'musthave' | 'budget'; label: string; met: boolean; why: string }
export interface DimResult { dim: Dim; label: string; weight: number; value: number | null; basis: Basis; note: string }
export interface Evaluation {
  candidate: Candidate;
  gates: Gate[];
  eligible: boolean;
  /** weighted score 0–100 over the dimensions that have a score; null when none has */
  score: number | null;
  /** share (0–1) of the total weight the score rests on */
  coverage: number;
  confidence: 'High' | 'Medium' | 'Low';
  dims: DimResult[];
  /** 1-based among eligible candidates; null when not eligible */
  rank: number | null;
}

/** Lite's spatial rules (MODELED): display height against the farthest viewer, camera width at the far wall, microphone coverage. */
export function spatialFit(c: Candidate, room: Room): Score | null {
  const g = c.geometry; const far = room.lengthM;
  if (c.category === 'display' && g.diagonalIn) {
    // image height of a 16:9 diagonal, then the farthest viewer against six image heights (detailed viewing at four)
    const h = g.diagonalIn * 0.0254 * 9 / Math.hypot(16, 9); const ratio = far / h;
    const value = ratio <= 4 ? 5 : ratio <= 6 ? 4 : ratio <= 7 ? 3 : ratio <= 8 ? 2 : 1;
    return { value, basis: 'MODELED', note: `Image height ${h.toFixed(2)} m; farthest seat ${far.toFixed(1)} m is ${ratio.toFixed(1)} image heights away (comfortable up to 6).` };
  }
  if ((c.category === 'camera' || c.category === 'bar') && g.hfovDeg && g.reachM) {
    const width = 2 * far * Math.tan((g.hfovDeg / 2) * Math.PI / 180); const covers = width / room.widthM; const reach = g.reachM / far;
    const value = Math.max(1, Math.min(5, Math.round(Math.min(covers, 1.4) * 2.5 + Math.min(reach, 1.2) * 1.5 - 0.6)));
    return { value, basis: 'MODELED', note: `Frames ${width.toFixed(1)} m at the far wall for a ${room.widthM.toFixed(1)} m room; framing reach ${g.reachM} m for ${far.toFixed(1)} m.` };
  }
  if (c.category === 'micceil' && g.coverM2) {
    const area = room.lengthM * room.widthM; const share = g.coverM2 / area;
    const value = share >= 1.2 ? 5 : share >= 1 ? 4 : share >= 0.8 ? 3 : share >= 0.6 ? 2 : 1;
    return { value, basis: 'MODELED', note: `One array covers ${g.coverM2} m² of a ${area.toFixed(0)} m² room (${Math.round(share * 100)}%).` };
  }
  return null;
}

/** Evaluate every candidate of the requirement's category for the room: gates, then the weighted score, then the rank. */
export function evaluate(room: Room, req: Requirement, candidates: readonly Candidate[]): Evaluation[] {
  const totalW = DIMS.reduce((s, [d]) => s + WEIGHTS[d], 0);
  const out: Evaluation[] = candidates.filter((c) => c.category === req.category).map((c) => {
    const spatial = spatialFit(c, room);
    const dims: DimResult[] = DIMS.map(([d, label]) => {
      const s = d === 'spatial' ? spatial : c.scores[d as Exclude<Dim, 'spatial'>];
      return s ? { dim: d, label, weight: WEIGHTS[d], value: s.value, basis: s.basis, note: s.note } : { dim: d, label, weight: WEIGHTS[d], value: null, basis: 'UNKNOWN', note: 'No score yet: left out of the total, not counted as zero.' };
    });
    const st = STATES[c.state];
    const gates: Gate[] = [];
    gates.push({ id: 'state', label: 'Lifecycle allows new designs', met: st.selectable && (c.state !== 'PILOT' || room.pilotPlan), why: c.state === 'PILOT' && !room.pilotPlan ? 'Pilot: needs a pilot plan for this room, and there is none.' : `${st.label}: ${st.meaning}` });
    if (c.condition) {
      const okSeats = c.condition.maxSeats == null || room.seats <= c.condition.maxSeats; const okArch = !c.condition.archetypes || c.condition.archetypes.includes(room.archetype);
      gates.push({ id: 'condition', label: 'Its approval condition holds here', met: okSeats && okArch, why: `${c.condition.text}${okSeats && okArch ? '' : ` — not met for ${room.seats} seats, ${room.archetype}.`}` });
    }
    gates.push({ id: 'archetype', label: 'Suits this kind of room', met: c.archetypes.includes(room.archetype), why: c.archetypes.includes(room.archetype) ? `Listed for ${room.archetype}.` : `Not listed for ${room.archetype} (listed: ${c.archetypes.join(', ')}).` });
    gates.push({ id: 'ports', label: 'Network ports are free', met: c.ports <= room.freePorts, why: `Needs ${c.ports}, ${room.freePorts} free on the room segment.` });
    gates.push({ id: 'power', label: 'Power over the network cable fits', met: c.poeW <= room.poeBudgetW, why: c.poeW ? `Draws ${c.poeW} W, ${room.poeBudgetW} W left on the switch.` : 'Mains powered.' });
    const miss = req.mustHave.map((m) => ({ m, r: dims.find((x) => x.dim === m.dim)! })).filter(({ m, r }) => r.value == null || r.value < m.min);
    gates.push({ id: 'musthave', label: 'Every must-have is reached', met: miss.length === 0, why: miss.length ? miss.map(({ m, r }) => r.value == null ? `${r.label}: no score, so it cannot be confirmed` : `${r.label} ${r.value} below ${m.min}`).join('; ') + '.' : req.mustHave.map((m) => `${dims.find((x) => x.dim === m.dim)!.label} ≥ ${m.min}`).join(', ') + '.' });
    gates.push({ id: 'budget', label: 'Inside the unit budget', met: c.unitCost <= req.budget, why: `Unit ${money(c.unitCost)} against ${money(req.budget)}.` });
    const known = dims.filter((x) => x.value != null);
    const w = known.reduce((s, x) => s + x.weight, 0);
    const score = w ? Math.round((known.reduce((s, x) => s + x.weight * (x.value as number), 0) / w / 5) * 100) : null;
    const coverage = w / totalW;
    const soft = known.filter((x) => x.basis === 'MODELED' || x.basis === 'DECLARED').reduce((s, x) => s + x.weight, 0) / (w || 1);
    const confidence: Evaluation['confidence'] = coverage >= 0.85 && soft <= 0.35 ? 'High' : coverage >= 0.6 ? 'Medium' : 'Low';
    return { candidate: c, gates, eligible: gates.every((g) => g.met), score, coverage, confidence, dims, rank: null };
  });
  out.sort((a, b) => Number(b.eligible) - Number(a.eligible) || (b.score ?? -1) - (a.score ?? -1) || b.coverage - a.coverage || a.candidate.id.localeCompare(b.candidate.id));
  let n = 0; for (const e of out) e.rank = e.eligible ? ++n : null;
  return out;
}
export const money = (n: number) => `$${n.toLocaleString('en-US')}`;
/** Five-year cost of ownership: unit, installation and five years of running. */
export const fiveYear = (c: Candidate) => c.unitCost + c.install + c.run5y;
