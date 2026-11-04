/**
 * Shared pieces of the operational workspaces: the page head (product kicker, title, who you are acting as), the workspace extension
 * each workspace keeps beside the shared demonstration workspace (src/workspace/store.ts, unchanged), the ledger helpers that write the
 * same event shape the shared store writes, and a clock that tests can hold still.
 */
import type { ReactNode } from 'react';
import * as S from '../workspace/store.js';
import { holds, personaLabel, personaOf } from '../build/store.js';

export { holds, personaLabel, personaOf };
/** What the operational workspaces add to the shared workspace (kept in the same record, so Reset and every page see one state). */
export interface Ext {
  dx?: { overrides: Array<{ woId: string; techId: string; reason: string; by: string; at: string; rankWas: number }>; reassigned: Array<{ woId: string; from: string; to: string; reason: string; by: string; at: string }> };
  sh?: {
    intake: Record<string, { entry: string; category: string; answers: Array<[string, string]>; attachments: string[]; assetId: string | null }>;
    notes: Record<string, Array<{ at: string; by: string; kind: 'note' | 'blocker' | 'escalation' | 'part'; text: string; cleared?: string | null }>>;
    resolution: Record<string, { code: string; rootCause: string; by: string; at: string }>;
    fiEvidence: Record<string, Array<{ at: string; by: string; findingId: string; text: string; provenance: 'SIMULATED' | 'INFERRED' | 'KNOWN' }>>;
    cancelled: Record<string, { reason: string; by: string; at: string; prevState: string }>;
  };
  rp?: { applied: Array<{ roomId: string; scenario: string; by: string; at: string }> };
}
export type WX = S.Workspace & Ext;
export const sh = (w: WX) => (w.sh ||= { intake: {}, notes: {}, resolution: {}, fiEvidence: {}, cancelled: {} });
export const dx = (w: WX) => (w.dx ||= { overrides: [], reassigned: [] });

export const now = () => new Date().toISOString();
export function log(w: S.Workspace, by: string, type: string, aggregate: string, detail: string, outcome: 'ALLOWED' | 'DENIED' = 'ALLOWED') { w.events.unshift({ at: now(), by, type, aggregate, detail, outcome }); w.events = w.events.slice(0, 500); }
export function deny(w: S.Workspace, by: string, type: string, aggregate: string, why: string[]): S.Refusal { log(w, by, type, aggregate, `refused: ${why.join('; ')}`, 'DENIED'); return { why }; }
export function need(w: S.Workspace, persona: string, authority: string | string[], type: string, aggregate: string): S.Refusal | null {
  const a = ([] as string[]).concat(authority);
  return a.some((x) => holds(persona, x)) ? null : deny(w, persona, type, aggregate, [`${personaLabel(persona)} does not hold ${a.join(' or ')}`]);
}
export const when = (s: string | null | undefined) => (s ? s.slice(0, 16).replace('T', ' ') : '—');
export const param = (hash: string, k: string) => { const m = new RegExp(`[?&]${k}=([^&]+)`).exec(hash); if (!m) return null; try { return decodeURIComponent(m[1]!); } catch { return m[1]!; } };

/** The head of every operational workspace: product kicker, the page title (the only h1), who you are acting as, and the page actions. */
export function OpsHead({ kicker, title, persona, lead, actions, product }: { kicker: string; title: string; persona: string; lead?: ReactNode; actions?: ReactNode; product?: string }) {
  return (
    <header className="ops__head" data-product={product}>
      <div className="ops__title">
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="ui-muted ops__as">Acting as <b>{personaLabel(persona)}</b> in this interactive demonstration. {lead}</p>
      </div>
      {actions ? <div className="ops__actions">{actions}</div> : null}
    </header>
  );
}

/** A refusal from a rule, shown where the action was taken, with every reason. */
export function Refused({ r }: { r: S.Refusal | null }) {
  if (!r) return null;
  return <div role="alert" className="ops-refused" data-testid="refusal"><b>Refused.</b><ul>{r.why.map((x) => <li key={x}>{x}</li>)}</ul></div>;
}

/**
 * Where another role acts, a perspective sees nothing at all (D44, and the shell's contract in README-routes.md: no button, no disabled
 * control, no refusal message). Kept as a component so every such place is marked in the source; `who`/`what` document the owner.
 */
export function NotYours(_: { who: string; what: string }) { return null; }
