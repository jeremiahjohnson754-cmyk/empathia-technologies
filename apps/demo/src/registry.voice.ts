/**
 * Pages of Empathia VOICE (Enterprise 3.0 directive 1A; founder scope confirmation 23 Nov 2026): telephony and UC intelligence, the
 * CallPath Digital Twin. Contract: registry.types.ts and README-routes.md.
 *
 * VOICE is a surface V2.5.3 never had, so who may open it is an explicit role list whose reason is voice/model.ts › WHY. The report
 * page uses V2.5.3's own authority for reporting a problem from a room (issue.report). A caller or a visitor who opens a CallPath gets
 * the access page, and the screen's code is never downloaded.
 *
 * `product: 'pro'` places the pages in Pro's menu for now. Whether VOICE (and FLOW, PRISM, SENTINEL, ACCORD, MissionProof, FORGE and
 * OMNIPRESENCE) become product keys beside the nine of D37/D40 is an open founder decision:
 * docs/handoff/FOUNDER_APPROVALS_AND_OPEN_DECISIONS.md, E3-D1.
 */
import type { PageDef } from './registry.types.js';
import { VOICE_ADMIN, VOICE_SUMMARY, VOICE_TECH, WHY } from './voice/model.js';

export const VOICE_PAGES: readonly PageDef[] = [
  {
    id: 'voice', title: 'VOICE', purpose: 'Telephony and UC intelligence: the CallPath Digital Twin, what each perspective reads, and the adapter register (simulation)', product: 'pro',
    path: '/voice', authority: { roles: [...VOICE_ADMIN, ...VOICE_TECH, ...VOICE_SUMMARY], why: WHY },
    load: () => import('./voice/VoicePage.js'),
    search: { keywords: 'voice telephony calling phone call quality sip rtp sbc trunk pstn uc provider teams phone zoom phone callpath jitter packet loss latency mos', aliases: ['voice', 'callpath', 'calling', 'telephony', 'call quality'] },
  },
  {
    id: 'voice.callpath', title: 'CallPath', purpose: 'One room’s call path: what is configured, what was observed on each hop, the quality samples and their method, and what is not known', product: 'pro',
    path: '/voice/callpath/:room', authority: { roles: [...VOICE_ADMIN, ...VOICE_TECH], why: WHY },
    sections: [{ id: 'voice.signalling', label: 'Session token and signalling-side detail', authority: { roles: [...VOICE_ADMIN], why: `${WHY}; a technician reads the path without signalling detail` } }],
    load: () => import('./voice/CallPathPage.js'),
    search: { keywords: 'callpath call path call flow digital twin hop endpoint switch uplink sbc provider packet loss jitter', aliases: ['call path', 'call flow', 'callpath atlas 4.218'], href: '#/voice/callpath/R-ATL-4-218' },
  },
  {
    id: 'voice.report', title: 'Report a calling problem', purpose: 'Say what went wrong with a call in a room; it becomes a job with the room attached, and you see only your own reports', product: 'pro',
    path: '/voice/report/:room', authority: { action: 'issue.report' },
    load: () => import('./voice/ReportPage.js'),
    search: { keywords: 'report calling problem call dropped audio breaking up cannot hear phone', aliases: ['report a calling problem', 'call dropped', 'bad call'], href: '#/voice/report/R-ATL-4-218' },
  },
];
