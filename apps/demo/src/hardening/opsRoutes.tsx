/**
 * The operational workspaces of the investor demonstration (Phase 2): their addresses in the legacy #/ space and their code-split
 * chunks. App.tsx asks `opsPage` first; null means the address is not one of these and the shell's own pages and boundary pages apply.
 *
 *   #/service, #/service/coverage, #/dispatch         Dispatch: the Service Delivery Command Center (queue, board, matching, coverage)
 *   #/servicehands, #/servicehands/new, …/wo/<id>     ServiceHands: request → intake → … → closure → learning; the technician workspace
 *   #/replay, #/replay/<room>                         Core Replay: a room's history, read-only playback
 *   #/v25/fi/scan/<room>                              Field Intelligence scan replay
 *   #/decisions, #/v25/decisions                      Decision Memory and the Decision desk (governed approve / hold / reject / fund)
 *   #/learn/labs, #/learn/labs/<lab>                  Learn labs: Audio, Camera and Lighting labs and the SIGNAL fault labs
 *   #/hardening                                       Resilience: how a workspace that fails to load or to draw is handled
 */
import type { ReactNode } from 'react';
import { lazyWorkspace } from './lazy.js';

declare const process: { env: Record<string, string | undefined> };
/** Each workspace is a build entry at ws/<name>.js (apps/demo/build.mjs WORKSPACES), versioned by the build id; a retry adds ?retry=n. */
export const wsUrl = (name: string, attempt = 0) => new URL(`ws/${name}.js?v=${process.env.DEMO_BUILD_ID || 'dev'}${attempt ? `&retry=${attempt}` : ''}`, document.baseURI).href;
const ws = (name: string) => (attempt: number) => import(/* the URL is computed so a retry is a fresh fetch */ wsUrl(name, attempt));

const Dispatch = lazyWorkspace('Dispatch board', ws('dispatch'));
const ServiceHands = lazyWorkspace('ServiceHands', ws('servicehands'));
const Replay = lazyWorkspace('Core Replay', ws('replay'));
const FiScan = lazyWorkspace('Field Intelligence scan', ws('fiscan'));
const Decisions = lazyWorkspace('Decisions', ws('decisions'));
const Labs = lazyWorkspace('Learn labs', ws('labs'));
const Resilience = lazyWorkspace('Resilience', ws('resilience'));

/** The workspaces by address, for the resilience page and the tests. */
export const OPS_WORKSPACES: Array<{ name: string; href: string; purpose: string }> = [
  { name: 'Dispatch board', href: '#/service', purpose: 'Queue, board, explained matching, assignment and coverage' },
  { name: 'ServiceHands', href: '#/servicehands', purpose: 'Request to closure, the technician workspace, evidence and learning' },
  { name: 'Core Replay', href: '#/replay', purpose: 'A room’s history, played back read-only' },
  { name: 'Field Intelligence scan', href: '#/v25/fi/scan/R-ATL-4-218', purpose: 'What a room scan observes, with its provenance and policy limits' },
  { name: 'Decisions', href: '#/v25/decisions', purpose: 'Approve, hold, reject and fund, each bound to a scope revision; Decision Memory' },
  { name: 'Learn labs', href: '#/learn/labs', purpose: 'Audio, Camera and Lighting labs and the SIGNAL fault labs' },
];

export function opsPath(hash: string): string[] { return (hash.replace(/^#\/?/, '').split('?')[0] || '').split('/').filter(Boolean).map((x) => { try { return decodeURIComponent(x); } catch { return x; } }); }

export function opsPage(hash: string, perspective: string): ReactNode | null {
  const p = opsPath(hash); const props = { perspective, hash };
  if ((p[0] === 'service' && (!p[1] || ['coverage', 'board', 'queue'].includes(p[1]))) || p[0] === 'dispatch') return <Dispatch {...props} />;
  if (p[0] === 'servicehands') return <ServiceHands {...props} />;
  if (p[0] === 'replay') return <Replay {...props} />;
  if (p[0] === 'v25' && p[1] === 'fi' && p[2] === 'scan') return <FiScan {...props} />;
  if (p[0] === 'decisions' || (p[0] === 'v25' && p[1] === 'decisions')) return <Decisions {...props} />;
  if (p[0] === 'learn' && p[1] === 'labs') return <Labs {...props} />;
  if (p[0] === 'hardening') return <Resilience {...props} />;
  return null;
}
