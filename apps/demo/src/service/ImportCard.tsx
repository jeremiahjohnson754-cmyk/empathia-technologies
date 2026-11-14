/**
 * The import card on ServiceHands: choose a CSV or an Empathia queue export, see the dry run row by row, then raise the ready rows.
 * Nothing is written before "Import"; each import is written to the audit trail with the file's name, size, SHA-256 and the counts.
 */
import { useState } from 'react';
import { Card, Notice, Tag } from '@empathia/ui';
import { dryRun, commit, MAX_ROWS, type DryRun } from './importer.js';
import * as S from '../workspace/store.js';
import type { useWorkspace } from '../workspace/useWorkspace.js';

async function sha256(text: string) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join(''); }
const TONE = { ready: 'ok', refused: 'bad', duplicate: 'muted', closed: 'muted' } as const;
const WORD = { ready: 'Ready', refused: 'Refused', duplicate: 'Already open', closed: 'Closed in the file' } as const;

export function ImportCard({ w, persona, apply }: { w: S.Workspace; persona: string; apply: ReturnType<typeof useWorkspace>['apply'] }) {
  const [run, setRun] = useState<(DryRun & { sha: string; bytes: number }) | null>(null); const [done, setDone] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const read = async (f: File | undefined) => {
    setDone(null); setErr(null); setRun(null); if (!f) return;
    if (!/\.(csv|json)$/i.test(f.name)) { setErr('Choose a .csv file or an Empathia .json queue export.'); return; }
    const text = await f.text(); const r = dryRun(f.name, text, w); setRun({ ...r, sha: await sha256(text), bytes: f.size });
  };
  const go = () => {
    if (!run) return; let made: string[] = []; let refused: Array<{ line: number; why: string[] }> = [];
    apply((x) => { const c = commit(run, x, persona, S.raiseIncident); made = c.made; refused = c.refused;
      x.events.unshift({ at: new Date().toISOString(), by: persona, type: 'service.imported', aggregate: run.file, detail: `${run.file} · ${run.bytes.toLocaleString('en-US')} bytes · SHA-256 ${run.sha} · ${c.made.length} raised, ${run.refused} refused, ${run.duplicate} already open${c.refused.length ? `, ${c.refused.length} refused on raising` : ''}`, outcome: c.made.length ? 'ALLOWED' : 'DENIED' }); return null; });
    setDone(made.length ? `${made.length} request${made.length === 1 ? '' : 's'} raised: ${made.join(', ')}. Each waits for triage.` : `Nothing was raised${refused.length ? `: ${refused[0]!.why.join(' ')}` : '.'}`); setRun(null);
  };
  return (
    <Card icon="inbox" title="Import service requests" sub={`A CSV (Room, Title; Summary and Severity optional) or an Empathia queue export, up to ${MAX_ROWS} rows. You see every row before anything is raised.`} testId="sh-import">
      <label className="ui-btn">Choose a file<input type="file" accept=".csv,.json,text/csv,application/json" className="ui-visually-hidden" data-testid="sh-import-file" onChange={(e) => { void read(e.target.files?.[0]); e.target.value = ''; }} /></label>
      {err ? <div role="alert"><Notice tone="bad">{err}</Notice></div> : null}
      {done ? <div role="status" data-testid="sh-import-done"><Notice tone="ok">{done}</Notice></div> : null}
      {run ? <div data-testid="sh-import-run" data-ready={run.ready} data-refused={run.refused} data-duplicate={run.duplicate}>
        {run.fatal ? <div role="alert"><Notice tone="bad"><b>{run.file} cannot be imported.</b> {run.fatal}</Notice></div> : <>
          <p><b>{run.file}</b> · {run.rows.length} row{run.rows.length === 1 ? '' : 's'}: <Tag tone="ok">{run.ready} ready</Tag> <Tag tone="bad">{run.refused} refused</Tag> <Tag tone="muted">{run.duplicate} already open</Tag>{run.closed ? <> <Tag tone="muted">{run.closed} closed in the file</Tag></> : null} <span className="ui-meta">SHA-256 {run.sha.slice(0, 16)}…</span></p>
          <div className="san__scroll"><table className="pa-table"><thead><tr><th scope="col">Line</th><th scope="col">Room</th><th scope="col">Title</th><th scope="col">Requested severity</th><th scope="col">Result</th></tr></thead>
            <tbody>{run.rows.map((r) => <tr key={r.line} data-testid="sh-import-row" data-state={r.state}><td className="num">{r.line}</td><td>{r.roomName}</td><td>{r.title || '—'}</td><td>{r.severity || '—'}</td><td><Tag tone={TONE[r.state]}>{WORD[r.state]}</Tag>{r.why.length ? <div className="ui-meta">{r.why.join('; ')}</div> : null}</td></tr>)}</tbody></table></div>
          <p className="wk-note">A requested severity is written into the request for triage to decide; formula-looking cells are refused, never run.</p>
          <button type="button" className="ui-btn ui-btn--primary" disabled={!run.ready} onClick={go} data-testid="sh-import-go">Import {run.ready} request{run.ready === 1 ? '' : 's'}</button> <button type="button" className="ui-btn" onClick={() => setRun(null)}>Cancel</button></>}
      </div> : null}
    </Card>
  );
}
