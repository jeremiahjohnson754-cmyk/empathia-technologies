/**
 * Who the critical-signal incident is for (founder, 10 Nov 2026: "the authorized broadcast engineer"). The stadium's role
 * configurations are the venue's roles in this demonstration; three short lists say what each may do with the incident:
 *   open    read the incident: the technical roles, and the two roles that check a fix
 *   work    acknowledge, dispatch and fix: the technical roles only
 *   verify  check the fix: any role that may open it, except the one that made the fix (the engine refuses that)
 * Every other configuration, a fan or a guest above all, is refused at the address: the registry asks `signalAuthority` before the
 * page's code is fetched, so a refused configuration never downloads it (D44). This module is deliberately tiny and imports nothing:
 * the registry and the game-day page read it without pulling in the incident itself.
 *
 * Presentation, not security: the whole synthetic model ships with the demonstration, and choosing a configuration grants nothing.
 */
export const SIGNAL_FAULT = 'camera-feed';
export const SIGNAL_WORK: readonly string[] = ['stadium.broadcast_engineer', 'stadium.av_it_engineer', 'stadium.service_technician', 'stadium.msp_engineer'];
export const SIGNAL_VERIFY: readonly string[] = [...SIGNAL_WORK, 'stadium.event_producer', 'stadium.venue_ops_lead'];
export const SIGNAL_OPEN: readonly string[] = SIGNAL_VERIFY;
export const mayOpenSignal = (config: string | null | undefined): boolean => !!config && SIGNAL_OPEN.includes(config);
export const mayWorkSignal = (config: string | null | undefined): boolean => !!config && SIGNAL_WORK.includes(config);
export const mayVerifySignal = (config: string | null | undefined): boolean => !!config && SIGNAL_VERIFY.includes(config);
export const SIGNAL_WHY = 'Game-day incidents are worked by the stadium’s broadcast and engineering role configurations and checked by its production and operations leads (founder, 10 Nov 2026). A guest, public or other configuration is shown gates, queues and advice only';

/** The registry's refinement for the incident's address: nothing more to ask when the configuration may open it; otherwise nobody may. */
export const signalAuthority = (as: string | null | undefined): { roles: readonly never[]; why: string } | undefined => (mayOpenSignal(as) ? undefined : { roles: [], why: SIGNAL_WHY });

export const SIGNAL_STEPS = ['alert', 'where', 'chain', 'history', 'observe', 'procedure', 'outcome', 'verify', 'report', 'return'] as const;
export type SignalStep = (typeof SIGNAL_STEPS)[number];
export const isSignalStep = (s: unknown): s is SignalStep => typeof s === 'string' && (SIGNAL_STEPS as readonly string[]).includes(s);
/** The incident's address for a configuration, at a step. The step is in the address so it can be linked to and survives a reload. */
export const signalHref = (as: string, step?: SignalStep): string => `#/gameday/incident/${SIGNAL_FAULT}?as=${encodeURIComponent(as)}${step && step !== 'alert' ? `&step=${step}` : ''}`;
