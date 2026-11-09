/**
 * The estates registry (v1.8.1 §3): one canonical record set per world, read by every engine. Lite, Search Party, the Space Optimizer and
 * the Showroom Builder take a node id from here; none of them keeps its own copy of a room. The Enterprise estate is the original 90-room
 * estate in `campus/` and joins this registry when its adapter lands; until then `ESTATES.enterprise` is absent on purpose, not empty.
 */
import type { Estate, WorldKey } from './model.js';
import { UNIVERSITY } from './university.js';
import { STADIUM } from './stadium.js';
import { CONVENTION } from './convention.js';
export * from './model.js';
export const ESTATES: Partial<Record<WorldKey, Estate>> = { university: UNIVERSITY, stadium: STADIUM, convention: CONVENTION };
export const estateOf = (w: WorldKey): Estate | undefined => ESTATES[w];
