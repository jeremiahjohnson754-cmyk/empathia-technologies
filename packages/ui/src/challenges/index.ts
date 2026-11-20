/** SIGNAL challenges: thirteen small physical models in five modes (spec §13). */
export * from './core.js';
import type { Challenge } from './core.js';
import * as Hear from './hear.js';
import * as See from './see.js';
import * as Reach from './reach.js';
import * as Build from './build.js';
import * as Record from './record.js';
export { Hear, See, Reach, Build, Record };
export const CHALLENGES: Challenge[] = [Hear.HEAR_COMP, Hear.HEAR_EQ, See.SEE_FOCUS, See.SEE_MOIRE, See.SEE_PROMO, Reach.REACH_LIGHT, Reach.REACH_CUES, Build.BUILD_STUDIO, Build.BUILD_STREAM, Build.BUILD_RF, Record.RECORD_TAKE, Record.RECORD_PANEL, Record.RECORD_LOUD];
export const byId = (id: string): Challenge => { const c = CHALLENGES.find((x) => x.id === id); if (!c) throw new Error(`unknown challenge ${id}`); return c; };
