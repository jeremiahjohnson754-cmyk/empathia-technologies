// The demo's address space is the legacy one (#/area/...), so every link an investor has seen keeps working. Each legacy area resolves
// to a native page when one exists, otherwise to a boundary page that states the area's migration status from the parity ledger
// (generated into ./generated/parity.json at build time; never edited by hand). areaOf mirrors the original router's azArea.
import parity from './generated/parity.json';
import { resolve } from './registry.pages.js';
export interface AreaStatus { key: string; label: string; target: string; status: string; newRoute: string; }
/** The representative address of a legacy area key (V2.5.3 azArea in reverse); the parity overview and the tours use it. */
export function hrefOfArea(key: string): string {
  if (key.startsWith('v25.')) return key === 'v25.home' ? '#/v25' : `#/v25/${key.slice(4)}`;
  const [a, b] = key.split('.');
  if (a === 'set') return `#/set/${{ devices: 'dev', rooms: 'room', issues: 'iss', docs: 'doc', changes: 'chg' }[b!] || b}:all`;
  if (a === 'agent' && b === 'arch') return '#/agent/architecture';
  if (a === 'assurance' && b === 'room') return '#/assurance/room/R-ATL-4-218';
  if (a === 'assurance' && (b === 'recommission' || b === 'history')) return `#/assurance/room/R-ATL-4-218/${b}`;
  if (a === 'assurance' && b === 'analysis') return '#/assurance?view=analysis';
  if (a === 'assurance' && b === 'portfolio') return '#/set/as:worst';
  if (a === 'commissioning' && b === 'room') return '#/commissioning/room/R-ATL-4-218';
  if (a === 'scouter' && b === 'anatomy') return '#/scouter/anatomy';
  if (['signage', 'itsm', 'schedule', 'geometry', 'diagnostics', 'robot', 'camera', 'optimize', 'operations'].includes(a!)) return `#/v14/${a}`;
  if (a === 'registry') return '#/pro/registry';
  if (a === 'qr') return '#/lite/qr';
  if (a === 'none') return '#/parity';
  return b ? `#/${a}/${b}` : `#/${a}`;
}
/** Areas with a native page in this shell: computed from the page registry, never listed by hand (every V2.5.3 address must land on a finished screen). */
export const NATIVE: { has: (key: string) => boolean } = { has: (key) => !!resolve(hrefOfArea(key)) };
export const AREAS: AreaStatus[] = parity as AreaStatus[];
/** The 86 legacy address areas (the V2.5 pages are listed separately in the ledger). */
export const AREA_COUNT = AREAS.filter((a) => !a.key.startsWith('v25.') || a.key === 'v25.build').length;
const SUB: Record<string, string[]> = { search: ['quality', 'ownership', 'support', 'graph', 'people', 'projects', 'orgs', 'activity', 'vault'], pro: ['assets', 'issues', 'ops', 'eng', 'exec'], service: ['coverage', 'fixes'], lite: ['services', 'guides'], intake: ['new'], servicehands: ['new'], commissioning: ['room'], agent: ['arch'], scouter: ['anatomy'] };
export function areaKey(hash: string): string {
  const p = (hash.replace(/^#\/?/, '').split('?')[0] || '').split('~')[0]!.split('/').filter(Boolean); const a = p[0] || 'home'; const b = p[1] || '';
  if (a === 'assurance') { if (!b) return 'assurance'; if (['ready', 'signals', 'change'].includes(b)) return `assurance.${b}`; if (b === 'room') return p[3] === 'ready' ? 'assurance.ready' : p[3] === 'recommission' ? 'assurance.recommission' : p[3] === 'history' ? 'assurance.history' : 'assurance.room'; return 'assurance'; }
  if (a === 'search' && b === 'coverage') return 'service.coverage';
  if (a === 'suite') return ({ pro: 'pro', lite: 'lite', scouter: 'scouter', intake: 'intake', budget: 'budget', commission: 'commissioning', assurance: 'assurance', standards: 'pro.eng', operations: 'pro.ops', learn: 'learn', core: 'core', integrations: 'fabric' } as Record<string, string>)[b] || 'none';
  if (a === 'v25') return b ? `v25.${b}` : 'v25.home';   // every V2.5 page is its own ledger row (v25.fi, v25.service, …); #/v25 is Mission Control
  if (SUB[a] && SUB[a]!.includes(b)) return `${a}.${b}`;
  return a;
}
export const areaOf = (hash: string): AreaStatus | undefined => { const k = areaKey(hash); return AREAS.find((x) => x.key === k) || AREAS.find((x) => x.key === 'none'); };
