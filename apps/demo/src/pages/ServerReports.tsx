/**
 * #/reports/server — the server's data exports (connected builds only; founder, 18 Nov 2026, 07:49): the estate data report as a PDF, and a
 * Power BI project of the organization's records for the customer's own Power BI. Both are made by the enterprise API after it checks the
 * person's authority; both are recorded in the audit history with their SHA-256, which this page shows next to the file it saved. Nothing
 * is published anywhere: the Power BI project is opened and published, if at all, by the customer, in their own Power BI, with their sign-in.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, Notice, Tag } from '@empathia/ui';
import { connected, SandboxGone, type Availability, type Sandbox } from '../connected/client.js';
import { PEOPLE } from './Flagship.js';

const save = (bytes: ArrayBuffer, type: string, name: string) => { const url = URL.createObjectURL(new Blob([bytes], { type })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); };
const FILES = [
  { key: 'pdf', path: '/v1/reports/estate.pdf', title: 'Estate data report (PDF)', what: 'The organization’s figures — rooms, commissioning coverage and verification, issues, work orders, devices — each with its definition, read with this person’s own scope. Data reports export as PDF only.' },
  { key: 'pbi', path: '/v1/reports/powerbi.zip', title: 'Power BI project (PBIP)', what: 'A semantic model of the organization’s records with DAX measures that use the same definitions as the PDF, three report pages and an Empathia theme, zipped. Open it in your own Power BI Desktop; every row names the records it came from.' },
];

export function ServerReportsPage() {
  const c = useMemo(() => connected(), []);
  const [avail, setAvail] = useState<Availability | null>(null); const [sb, setSb] = useState<Sandbox | null>(() => c.sandbox());
  const [who, setWho] = useState('exec'); const [busy, setBusy] = useState<string | null>(null); const [said, setSaid] = useState<Record<string, { ok: boolean; text: string; sha?: string }>>({});
  useEffect(() => { let on = true; void c.availability().then((a) => { if (on) setAvail(a); }); return () => { on = false; }; }, [c]);
  const open = async () => { setBusy('open'); try { const a = await c.open(); if (a.ok && a.body) setSb(a.body); else setSaid({ open: { ok: false, text: `The server answered ${a.status}: ${a.detail}` } }); } catch (e) { setSaid({ open: { ok: false, text: (e as Error).message } }); } finally { setBusy(null); } };
  const get = async (f: (typeof FILES)[number]) => { setBusy(f.key); setSaid((s) => ({ ...s, [f.key]: undefined as never }));
    try { const r = await c.download(who, f.path);
      if (r.ok) { save(r.bytes, r.type, r.name); setSaid((s) => ({ ...s, [f.key]: { ok: true, text: `${r.name} · ${(r.bytes.byteLength / 1024).toFixed(1)} KB · recorded in the audit history`, sha: r.sha } })); }
      else setSaid((s) => ({ ...s, [f.key]: { ok: false, text: `The server refused (${r.status}): ${r.detail}` } })); }
    catch (e) { if (e instanceof SandboxGone) setSb(null); setSaid((s) => ({ ...s, [f.key]: { ok: false, text: (e as Error).message } })); } finally { setBusy(null); } };
  return <section className="wk" data-native="workspace" data-testid="srv-reports">
    <header className="wk-head"><h1>Reports from the server</h1>
      <p className="wk-lede">Exports the enterprise API makes from the sandbox’s records, only for the people who answer for the figures: the executive, the operations lead, the service manager and the security administrator. Anyone else is refused, and the refusal is recorded.</p></header>
    {avail && !avail.enabled ? <div data-testid="srv-off"><Notice tone="warn">The demonstration server is not taking sandboxes right now{avail.reason ? `: ${avail.reason}` : ''}.</Notice></div> : null}
    {!sb ? <Card icon="spark" title="Open a sandbox" testId="srv-open"><p className="build__row"><button type="button" className="ui-btn ui-btn--primary" disabled={!!busy || !avail?.enabled} onClick={() => void open()} data-testid="srv-open-btn">Open a sandbox</button></p>{said['open'] ? <Notice tone="bad">{said['open'].text}</Notice> : null}</Card> : <>
      <div className="build__row sq-bar"><label className="kit-field">Acting as <select value={who} onChange={(e) => setWho(e.target.value)} data-testid="srv-who">{PEOPLE.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label></div>
      <div className="pj-grid">{FILES.map((f) => <Card key={f.key} icon="download" title={f.title} testId={`srv-${f.key}`}>
        <p>{f.what}</p>
        <p className="build__row"><button type="button" className="ui-btn ui-btn--primary" disabled={!!busy} onClick={() => void get(f)} data-testid={`srv-get-${f.key}`}>{busy === f.key ? 'Asking the server…' : 'Download'}</button></p>
        {said[f.key] ? <div data-testid={`srv-said-${f.key}`} data-ok={said[f.key]!.ok}><Notice tone={said[f.key]!.ok ? 'ok' : 'bad'}>{said[f.key]!.text}{said[f.key]!.sha ? <> · SHA-256 <code title={said[f.key]!.sha}>{said[f.key]!.sha!.slice(0, 16)}…</code></> : null}</Notice></div> : null}
        {f.key === 'pbi' ? <p className="ui-meta"><Tag tone="muted">not published</Tag> Empathia publishes nothing to Power BI. The project is written to Microsoft’s published PBIP and PBIR schemas and the TMDL format; Empathia has not yet opened it in Power BI Desktop, and its README says so.</p> : null}
      </Card>)}</div>
    </>}
    <p className="ui-meta">Every record in a sandbox is synthetic. The files are made on the server and handed to this browser; nothing is sent anywhere else.</p>
  </section>;
}
