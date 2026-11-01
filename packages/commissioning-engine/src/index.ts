/**
 * @empathia/commissioning-engine — the Build a Room engines as a reusable TypeScript library.
 *
 *   classify → design checks → commissioning applicability → result labels and counts → lifecycle gates
 *   (+ re-verification after a substitution during recommissioning: substitution.ts, shared by the API and the demonstration)
 *   (+ positions, physical assets and installations: installations.ts, ADR-0012, shared the same way)
 *   (+ the design a re-acceptance binds, and the approval of a revision during recommissioning: binding.ts, shared the same way)
 *
 * Every function is deterministic and side-effect free. The demonstrator (V2.5.3 rc3 / 2.5.4) keeps its own copy of this logic in
 * `src/v25-60-room.js`; parity is enforced by test/parity.test.ts over 92 golden cases extracted from the demonstrator build.
 */
import type { Applicability, Classification, DesignFinding, ResultCounts, RoomDesignInput } from '@empathia/domain-types';
import { type Catalog, defaultCatalog } from './catalog.js';
import { classifyRoom, effectiveArchetype } from './classify.js';
import { designChecks } from './checks.js';
import { computeApplicability } from './applicability.js';
import { resultCounts } from './results.js';

export * from './catalog.js';
export * from './geometry.js';
export * from './classify.js';
export * from './checks.js';
export * from './applicability.js';
export * from './results.js';
export * from './recording.js';
export * from './lifecycle.js';
export * from './design.js';
export * from './substitution.js';
export * from './installations.js';
export * from './binding.js';

export const ENGINE_VERSION = '2.5.4-port.1';

export interface RoomAnalysis {
  engineVersion: string;
  classification: Classification;
  /** The archetype the checks and applicability acted on (approved unless stale, else suggested). */
  archetype: string | null;
  checks: DesignFinding[];
  applicability: Applicability;
  counts: ResultCounts;
}

/** The demonstrator's `v25RoomAnalyze` order: classify, run the design checks, judge applicability, count results. */
export function analyzeRoom(d: RoomDesignInput, C: Catalog = defaultCatalog): RoomAnalysis {
  const classification = classifyRoom(d, C);
  const archetype = effectiveArchetype(d, classification);
  const checks = designChecks(d, archetype, C);
  const applicability = computeApplicability(d, archetype, classification, C);
  const counts = resultCounts(applicability.rows, d.results);
  return { engineVersion: ENGINE_VERSION, classification, archetype, checks, applicability, counts };
}
