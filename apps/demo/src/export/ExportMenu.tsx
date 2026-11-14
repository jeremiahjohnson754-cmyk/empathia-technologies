/**
 * The export card of a record page: one report, six real files (./render.ts), written in the browser from the record on screen and
 * handed to the browser as a download. Nothing is uploaded and nothing leaves the page. Each file made is written to the
 * workspace's audit trail with its size and SHA-256, so the file a person holds can be checked against the record of its making.
 * The role it is made as is printed in every file and grants nothing.
 */
import { useState } from 'react';
import { Card, Icon, Notice, Tag } from '@empathia/ui';
import { FORMATS, type Format, type Report } from './model.js';
import { emblemPng } from './mark.js';
import { useWorkspace } from '../workspace/useWorkspace.js';

export interface Made { name: string; format: Format; bytes: number; sha: string; ms: number }

function save(name: string, mime: string, bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function ExportMenu({ make, by, title = 'Export', sub, testId = 'export-menu' }: { make: () => Report | Promise<Report>; by: string; title?: string; sub?: string; testId?: string }) {
  const { apply } = useWorkspace();
  const [busy, setBusy] = useState<Format | null>(null); const [last, setLast] = useState<Made | null>(null); const [err, setErr] = useState<string | null>(null);
  const go = async (f: Format) => {
    setBusy(f); setErr(null);
    try {
      const t0 = performance.now();
      const [{ render, sha256Hex }, mark] = await Promise.all([import('./render.js'), f === 'pdf' || f === 'docx' || f === 'pptx' ? emblemPng() : Promise.resolve(undefined)]);
      const { prepareMedia, canvasRaster } = await import('./media.js'); const rep = f === 'csv' ? await make() : await prepareMedia(await make(), canvasRaster); const out = await render(rep, f, mark); const sha = await sha256Hex(out.bytes);
      save(out.name, out.mime, out.bytes);
      const m: Made = { name: out.name, format: f, bytes: out.bytes.length, sha, ms: Math.round(performance.now() - t0) }; setLast(m);
      apply((w) => { w.events.unshift({ at: new Date().toISOString(), by, type: 'export.created', aggregate: rep.scope.roomId || rep.id, detail: `${out.name} · ${m.bytes.toLocaleString('en-US')} bytes · SHA-256 ${sha}`, outcome: 'ALLOWED' }); return null; });
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  };
  return <Card icon="download" title={title} sub={sub || 'Six files from this record, written in your browser'} testId={testId}>
    <div className="xp-grid" role="group" aria-label={`${title}: choose a format`}>
      {FORMATS.map((x) => <button key={x.f} type="button" className="ui-btn xp-btn" onClick={() => go(x.f)} disabled={!!busy} aria-busy={busy === x.f} data-testid={`export-${x.f}`} data-format={x.f}>
        <Icon name="download" size={16} /><span className="xp-btn__t"><b>{x.label}</b><span className="ui-meta">{busy === x.f ? 'Writing…' : x.what}</span></span>
      </button>)}
    </div>
    {last ? <p className="wk-note" role="status" data-testid="export-last"><Tag tone="ok">Saved</Tag> {last.name} · {(last.bytes / 1024).toFixed(1)} KB · SHA-256 <code title={last.sha}>{last.sha.slice(0, 16)}…</code> · recorded in the audit trail</p> : null}
    {err ? <div role="alert"><Notice tone="bad"><b>The file was not written.</b> {err}</Notice></div> : null}
    <p className="wk-note">Every file says what it is: synthetic records, results as recorded (nothing measured), devices as classes, connections proposed, and the role it was made as, which grants nothing.</p>
  </Card>;
}
