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

export interface Picture { name: string; label: string; svg: string; width: number; height: number; aggregate: string }
export function ExportMenu({ make, by, title = 'Export', sub, testId = 'export-menu', pictures, data, says }: { make: () => Report | Promise<Report>; by: string; title?: string; sub?: string; testId?: string; /** the closing line, where the usual one would be untrue of this report (the performance check does measure something: 25 Nov 2026) */ says?: string; /** drawings offered as PNG and JPEG beside the six files */ pictures?: Picture[] ; /** a data report (founder, 18 Nov 2026): PDF only, and only for the roles that answer for the figures (the server's own rule for its estate report) */ data?: { role: string; roles: string[] } }) {
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
  const allowed = !data || data.roles.includes(data.role); const formats = data ? FORMATS.filter((x) => x.f === 'pdf') : FORMATS;
  return <Card icon="download" title={title} sub={sub || (data ? 'A data report, as a PDF written in your browser' : 'Six files from this record, written in your browser')} testId={testId}>
    {data ? <p className="wk-note" data-testid={`${testId}-data`} data-allowed={allowed}>{allowed ? 'A data report is exported as a PDF only: the figures as this view shows them, their definitions and where they come from.' : 'Data reports are exported as PDFs by the executive, the operations lead, the service manager or the architect. This role reads the view; it does not export it.'}</p> : null}
    {allowed ? <div className="xp-grid" role="group" aria-label={`${title}: choose a format`}>
      {formats.map((x) => <button key={x.f} type="button" className="ui-btn xp-btn" onClick={() => go(x.f)} disabled={!!busy} aria-busy={busy === x.f} data-testid={`export-${x.f}`} data-format={x.f}>
        <Icon name="download" size={16} /><span className="xp-btn__t"><b>{x.label}</b><span className="ui-meta">{busy === x.f ? 'Writing…' : x.what}</span></span>
      </button>)}
    </div> : null}
    {pictures?.length && allowed ? <div className="xp-grid xp-grid--pics" role="group" aria-label="Pictures">{pictures.flatMap((pic) => (['png', 'jpeg'] as const).map((k) => <button key={`${pic.name}-${k}`} type="button" className="ui-btn xp-btn" disabled={!!busy} data-testid={`export-pic-${k}`} data-format={`pic-${k}`}
      onClick={async () => { setBusy('csv'); setErr(null); try { const { canvasRaster, canvasJpeg } = await import('./media.js'); const { sha256Hex } = await import('./render.js'); const t0 = performance.now();
        const bytes = k === 'png' ? await canvasRaster(pic.svg, pic.width, pic.height) : await canvasJpeg(pic.svg, pic.width, pic.height); if (!bytes) throw new Error('This browser could not draw the picture.');
        const name = `${pic.name}.${k === 'png' ? 'png' : 'jpg'}`; save(name, k === 'png' ? 'image/png' : 'image/jpeg', bytes); const sha = await sha256Hex(bytes);
        setLast({ name, format: 'csv', bytes: bytes.length, sha, ms: Math.round(performance.now() - t0) });
        apply((w) => { w.events.unshift({ at: new Date().toISOString(), by, type: 'export.created', aggregate: pic.aggregate, detail: `${name} · ${bytes.length.toLocaleString('en-US')} bytes · SHA-256 ${sha}`, outcome: 'ALLOWED' }); return null; });
      } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); } }}>
      <Icon name="download" size={16} /><span className="xp-btn__t"><b>{pic.label} · {k.toUpperCase()}</b><span className="ui-meta">{k === 'png' ? 'a sharp picture for a document' : 'a small picture for a message'}</span></span></button>))}</div> : null}
    {last ? <p className="wk-note" role="status" data-testid="export-last"><Tag tone="ok">Saved</Tag> {last.name} · {(last.bytes / 1024).toFixed(1)} KB · SHA-256 <code title={last.sha}>{last.sha.slice(0, 16)}…</code> · recorded in the audit trail</p> : null}
    {err ? <div role="alert"><Notice tone="bad"><b>The file was not written.</b> {err}</Notice></div> : null}
    <p className="wk-note">{says || 'Every file says what it is: synthetic records, results as recorded (nothing measured), devices as classes, connections proposed, and the role it was made as, which grants nothing.'}</p>
  </Card>;
}
