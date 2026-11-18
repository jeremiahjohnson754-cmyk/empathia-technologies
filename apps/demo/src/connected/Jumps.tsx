/**
 * Platform jumps on connected builds (0047; founder, 18 Nov 2026, 07:49): links that open the organization's own portal for a platform
 * (its device cloud, its meeting-room portal, its DSP management, its ITSM…) in a new tab of the person's own browser. Every address is
 * the server's answer: the organization's, a room's or unit's own recorded address, or the vendor's documented sign-in address. Nothing
 * is sent to a platform and nothing is read from it; a jump is not an integration and the panel says so. A platform nobody has set is
 * listed as not set, never as a link. Recording an address is one governed request; the server decides who may.
 */
import { useCallback, useEffect, useState } from 'react';
import { Notice, Tag } from '@empathia/ui';
import type { Connected } from './client.js';

export interface Jump { key: string; name: string; vendor: string; for: string; opens: string; own: boolean; recordedAt: string | null }
export interface Jumps { subject: 'room' | 'device'; ref: string; items: Jump[]; unset: Array<{ key: string; name: string }>; note: string; may: { record: boolean; configure: boolean } }
export const host = (u: string) => { try { return new URL(u).host; } catch { return u; } };

export function JumpLinks({ items, testId }: { items: Jump[]; testId?: string }) {
  return <ul className="jp-links" data-testid={testId}>{items.map((j) => <li key={j.key} data-jump={j.key}>
    <a href={j.opens} target="_blank" rel="noopener noreferrer" data-testid={`jump-${j.key}`}>Open in {j.name}</a>
    <span className="ui-meta">{host(j.opens)} · {j.own ? 'this one’s own address' : 'the organization’s portal'} · {j.for}</span></li>)}</ul>;
}

/** the jumps for one room (or unit) of the sandbox, read as `who`, with the form to record its own address when the server allows */
export function SubjectJumps({ c, who, subject, refCode, onRefused }: { c: Connected; who: string; subject: 'room' | 'device'; refCode: string; onRefused?: (text: string) => void }) {
  const base = subject === 'room' ? `/v1/rooms/${encodeURIComponent(refCode)}/platforms` : `/v1/assets/${encodeURIComponent(refCode)}/platforms`;
  const [j, setJ] = useState<Jumps | null>(null); const [err, setErr] = useState(''); const [plat, setPlat] = useState(''); const [url, setUrl] = useState(''); const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null); const [busy, setBusy] = useState(false);
  const read = useCallback(async () => { try { const a = await c.call<Jumps>(who, 'GET', base); if (a.ok) { setJ(a.body); setErr(''); } else { setJ(null); setErr(`${a.status}: ${a.detail}`); } } catch (e) { setErr((e as Error).message); } }, [c, who, base]);
  useEffect(() => { void read(); }, [read]);
  const record = async () => { setBusy(true); setSaid(null);
    try { const a = await c.call(who, 'POST', base, { platform: plat, url: url.trim() });
      if (a.ok) { setSaid({ ok: true, text: `Recorded. The server kept any earlier address as replaced.` }); setUrl(''); await read(); }
      else { const t = `The server refused (${a.status}): ${a.detail}${a.reasons?.length ? ` — ${a.reasons.join('; ')}` : ''}`; setSaid({ ok: false, text: t }); onRefused?.(t); } }
    catch (e) { setSaid({ ok: false, text: (e as Error).message }); } finally { setBusy(false); } };
  if (err) return <p className="ui-muted" data-testid="jumps-error">The jumps could not be read: {err}</p>;
  if (!j) return <p className="ui-muted">Reading the jumps…</p>;
  const choices = [...j.items.map((x) => ({ key: x.key, name: x.name })), ...j.unset];
  return <div className="jp" data-testid={`jumps-${subject}`} data-ref={j.ref}>
    {j.items.length ? <JumpLinks items={j.items} testId="jumps-links" /> : <p className="ui-muted">No platform address is set for this {subject} or for the organization yet.</p>}
    {j.unset.length ? <p className="ui-meta" data-testid="jumps-unset">Not set: {j.unset.map((u) => u.name).join(', ')}.</p> : null}
    <p className="ui-meta jp-note">{j.note}</p>
    {j.may.record ? <details className="jp-record"><summary>Record where this {subject} is in a platform</summary>
      <div className="build__row">
        <label className="kit-field">Platform <select value={plat} onChange={(e) => setPlat(e.target.value)} data-testid="jumps-platform"><option value="">Choose…</option>{choices.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</select></label>
        <label className="kit-field">Its address (https) <input type="url" inputMode="url" value={url} placeholder="https://…" maxLength={400} onChange={(e) => setUrl(e.target.value)} data-testid="jumps-url" /></label>
        <button type="button" className="ui-btn ui-btn--sm" disabled={busy || !plat || !/^https:\/\/\S+$/.test(url.trim())} onClick={() => void record()} data-testid="jumps-record">Record</button>
      </div>
      {said ? <div data-testid="jumps-said" data-ok={said.ok}><Notice tone={said.ok ? 'ok' : 'bad'}>{said.text}</Notice></div> : null}
    </details> : <p className="ui-meta"><Tag tone="muted">read only</Tag> Recording an address is for the people who design, install, serve or triage this {subject}.</p>}
  </div>;
}
