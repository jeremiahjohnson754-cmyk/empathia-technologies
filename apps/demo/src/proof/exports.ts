/**
 * Dossier exports (v1.6 Export Center, the part that is built): a JSON snapshot and a CSV of the tests, made in the browser from one
 * replay of the record so the two can never disagree, each with a provenance header and a SHA-256 of exactly the bytes handed over.
 * Redaction follows the reader: the executive export carries totals, deficiencies and blockers, not evidence references.
 * PDF, DOCX, XLSX and the evidence package are specified and not built; the page says so instead of offering them.
 */
import { DOSSIER_4218 as D, type Working } from '@empathia/proof-registry';

export type Redaction = 'executive' | 'engineering';
export interface Artifact { name: string; mime: string; text: string; sha256: string; bytes: number; redaction: Redaction; basis: 'snapshot' | 'working'; at: string }

const head = (w: Working, redaction: Redaction, role: string, at: string) => ({
  report: D.id, project: D.project, room: D.room.name, asset: D.asset.id, source_class: 'SYNTHETIC', not_live: true,
  basis: w.changed ? 'working record in this browser (events after the snapshot)' : 'reference snapshot', snapshot_generated_at: D.generatedAt,
  exported_at: at, exported_as: role, redaction,
});
export function toJson(w: Working, redaction: Redaction, role: string, at: string): string {
  const eng = redaction === 'engineering';
  return JSON.stringify({ ...head(w, redaction, role, at), acceptance: w.acceptance, totals: w.totals,
    blockers: w.blockers.map((b) => `${b.test} ${b.reason}`),
    deficiencies: w.deficiencies.map((x) => ({ id: x.id, severity: x.severity, test: x.test, statement: x.statement, owner: x.owner, action: x.action, state: x.state })),
    tests: w.tests.map((t) => ({ id: t.id, discipline: t.discipline, name: t.name, result: t.result, ...(eng ? { evidence: t.evidence, recorded_by: t.recordedBy?.label ?? null, verified_by: t.verifiedBy?.label ?? null } : { has_evidence: !!t.evidence }), changed_after_snapshot: t.changed })),
  }, null, 2) + '\n';
}
/** a cell a spreadsheet would run as a formula is neutralised (leading = + - @ tab CR), then quoted */
const cell = (v: string | number | boolean | null) => { let s = v === null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCsv(w: Working, redaction: Redaction, role: string, at: string): string {
  const eng = redaction === 'engineering'; const h = head(w, redaction, role, at);
  const meta = Object.entries(h).map(([k, v]) => `# ${k}: ${String(v).replace(/[\r\n]/g, ' ')}`);
  const cols = ['report', 'test_id', 'discipline', 'name', 'result', ...(eng ? ['evidence_id', 'verified_by'] : ['has_evidence']), 'changed_after_snapshot', 'source_class'];
  const rows = w.tests.map((t) => [D.id, t.id, t.discipline, t.name, t.result, ...(eng ? [t.evidence, t.verifiedBy?.label ?? null] : [!!t.evidence]), t.changed, 'SYNTHETIC'].map(cell).join(','));
  return [...meta, cols.join(','), ...rows].join('\n') + '\n';
}
export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function make(kind: 'json' | 'csv', w: Working, redaction: Redaction, role: string): Promise<Artifact> {
  const at = new Date().toISOString(); const text = kind === 'json' ? toJson(w, redaction, role, at) : toCsv(w, redaction, role, at);
  return { name: `${D.id}-${redaction}${w.changed ? '-working' : ''}.${kind}`, mime: kind === 'json' ? 'application/json' : 'text/csv', text, sha256: await sha256(text), bytes: new TextEncoder().encode(text).length, redaction, basis: w.changed ? 'working' : 'snapshot', at };
}
export function download(a: Artifact): void {
  const url = URL.createObjectURL(new Blob([a.text], { type: `${a.mime};charset=utf-8` })); const el = document.createElement('a');
  el.href = url; el.download = a.name; document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
