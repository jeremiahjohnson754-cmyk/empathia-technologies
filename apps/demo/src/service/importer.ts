/**
 * Importing service requests into ServiceHands (founder, 14 Nov 2026: "the same export and import file system as commissioning and
 * apex … do the same for ServiceHands"). A file is read in the browser, checked row by row, and shown as a dry run before anything is
 * written; only then are the accepted rows raised, each through the same rule as a request raised by hand (`raiseIncident`).
 *
 * Accepted: CSV (a header row; `#` lines before it are provenance and skipped, as Empathia's own CSV writes them) and Empathia's JSON
 * dossier of a service queue (its "Requests" table), so a queue exported here can be brought back. At most 200 rows and 1 MB.
 * Every row needs a room the campus record knows (its ID, alone or as "Name (ID)") and a title; a summary and a requested severity may
 * come with it. What an import never does:
 *   - run a spreadsheet formula: a value starting = + - @ is refused (one exported by Empathia starts with an apostrophe, which is removed);
 *   - decide severity: a requested severity is written into the summary and the request is raised as Standard, for triage to decide;
 *   - raise a duplicate: a row matching an open request in the same room by title is skipped and said so.
 */
import { roomById, fullName } from '../campus/canon.js';
import type * as S from '../workspace/store.js';

export type RowState = 'ready' | 'refused' | 'duplicate' | 'closed';
export interface ImportRow { line: number; roomId: string; roomName: string; building: string; title: string; summary: string; severity: string | null; state: RowState; why: string[] }
export interface DryRun { file: string; kind: 'csv' | 'json' | 'xlsx'; rows: ImportRow[]; ready: number; refused: number; duplicate: number; closed: number; fatal: string | null }
const SEVERITIES = ['Mission critical', 'High', 'Standard'];
export const MAX_ROWS = 200; export const MAX_BYTES = 1_000_000;

/** RFC 4180: quoted fields, doubled quotes, commas and line breaks inside quotes; a BOM is removed. */
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, ''); const out: string[][] = []; let row: string[] = []; let f = ''; let q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]!;
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; continue; }
    if (ch === '"' && f === '') q = true; else if (ch === ',') { row.push(f); f = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(f); out.push(row); row = []; f = ''; } else f += ch;
  }
  if (f !== '' || row.length) { row.push(f); out.push(row); }
  return out.filter((r) => r.some((x) => x.trim() !== ''));
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z]/g, '');
const ALIASES: Record<string, string[]> = { room: ['room', 'roomid', 'roomname'], title: ['title', 'request', 'issue', 'subject'], summary: ['summary', 'description', 'details', 'need'], severity: ['severity', 'priority'], state: ['state', 'status'] };
function columnOf(header: string[], key: string): number { const want = ALIASES[key]!; const hs = header.map(norm); for (const a of want) { const i = hs.indexOf(a); if (i >= 0) return i; } return -1; }
const roomIdIn = (v: string) => (/\b(R-[A-Z]{3}-\d+-\d+)\b/.exec(v) || [])[1] || null;
/** a cell as text: Empathia's own leading apostrophe removed; a formula-looking value is refused, never evaluated */
function cell(v: string | undefined, label: string, why: string[]): string { let s = (v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').trim(); if (s.startsWith("'") && /^'[=+\-@]/.test(s)) s = s.slice(1); else if (/^[=+\-@]/.test(s)) why.push(`${label} looks like a spreadsheet formula and is not imported`); return s; }

function check(line: number, raw: { room?: string; title?: string; summary?: string; severity?: string; state?: string }, w: S.Workspace, seen: Set<string>): ImportRow {
  const why: string[] = [];
  const roomText = cell(raw.room, 'the room', why); const title = cell(raw.title, 'the title', why); const summary = cell(raw.summary, 'the summary', why); const sev = cell(raw.severity, 'the severity', why);
  const id = roomIdIn(roomText); const o = id ? roomById(id) : null;
  if (!roomText) why.push('no room'); else if (!o) why.push(`room “${roomText.slice(0, 60)}” is not in the campus record (give its ID, e.g. R-ATL-4-218)`);
  if (!title) why.push('no title'); else if (title.length < 3 || title.length > 140) why.push('a title is 3 to 140 characters');
  if (summary.length > 1000) why.push('a summary is at most 1000 characters');
  const severity = sev ? SEVERITIES.find((s) => s.toLowerCase() === sev.toLowerCase()) || null : null;
  if (sev && !severity) why.push(`severity “${sev.slice(0, 30)}” is not one of ${SEVERITIES.join(', ')}`);
  const key = `${o?.id}|${title.toLowerCase()}`;
  const dup = !why.length && (w.incidents.some((i) => i.roomId === o!.id && !['CLOSED', 'CANCELLED'].includes(i.state) && i.title.toLowerCase() === title.toLowerCase()) || seen.has(key));
  if (!why.length) seen.add(key);
  const closed = !why.length && !dup && /^(closed|cancelled|canceled)\b/i.test((raw.state ?? '').trim());   // an exported closed request is not raised again
  return { line, roomId: o?.id || roomText, roomName: o ? fullName(o) : roomText, building: o?.building || '', title, summary, severity, state: why.length ? 'refused' : dup ? 'duplicate' : closed ? 'closed' : 'ready', why: dup ? ['an open request in this room already has this title'] : closed ? ['the file says this request is closed: it is not raised again'] : why };
}

/** Read a file and check every row; nothing is written. */
export function dryRun(file: string, text: string, w: S.Workspace): DryRun {
  const empty = (fatal: string, kind: 'csv' | 'json' = 'csv'): DryRun => ({ file, kind, rows: [], ready: 0, refused: 0, duplicate: 0, closed: 0, fatal });
  if (new TextEncoder().encode(text).length > MAX_BYTES) return empty(`the file is over ${MAX_BYTES / 1e6} MB`);
  const seen = new Set<string>(); let rows: ImportRow[]; let kind: 'csv' | 'json' = 'csv';
  if (/\.json$/i.test(file) || /^\s*\{/.test(text)) {
    kind = 'json'; let j: { schema?: string; kind?: string; tables?: Record<string, { rows?: Array<Record<string, unknown>> }> };
    try { j = JSON.parse(text); } catch { return empty('the JSON could not be read', 'json'); }
    const t = j.tables?.['Requests']?.rows; if (j.schema !== 'empathia.dossier/1' || !Array.isArray(t)) return empty('a JSON import is an Empathia service queue export (its Requests table)', 'json');
    if (t.length > MAX_ROWS) return empty(`at most ${MAX_ROWS} rows at a time (the file has ${t.length})`, 'json');
    rows = t.map((r, i) => check(i + 1, { room: String(r['room'] ?? ''), title: String(r['title'] ?? ''), summary: '', severity: String(r['sev'] ?? ''), state: String(r['state'] ?? '') }, w, seen));
  } else {
    return dryRunTable(file, parseCsv(text), w, 'csv');
  }
  return summarise(file, kind, rows);
}
const summarise = (file: string, kind: DryRun['kind'], rows: ImportRow[]): DryRun => ({ file, kind, rows, ready: rows.filter((r) => r.state === 'ready').length, refused: rows.filter((r) => r.state === 'refused').length, duplicate: rows.filter((r) => r.state === 'duplicate').length, closed: rows.filter((r) => r.state === 'closed').length, fatal: null });
/** A table of cells (a CSV, or a workbook's sheet read by ./xlsxRead.ts): provenance lines (#…) before the header are skipped. */
export function dryRunTable(file: string, parsed: string[][], w: S.Workspace, kind: DryRun['kind'] = 'csv'): DryRun {
  const empty = (fatal: string): DryRun => ({ file, kind, rows: [], ready: 0, refused: 0, duplicate: 0, closed: 0, fatal });
  const seen = new Set<string>(); const skip = Math.max(0, parsed.findIndex((r) => !(r[0] || '').startsWith('#')));
  const all = parsed.slice(skip).filter((r) => r.some((c) => (c || '').trim()));
  if (!all.length) return empty('the file has no rows');
  const head = all[0]!; const c = { room: columnOf(head, 'room'), title: columnOf(head, 'title'), summary: columnOf(head, 'summary'), severity: columnOf(head, 'severity'), state: columnOf(head, 'state') };
  if (c.room < 0 || c.title < 0) return empty('the header names no room column or no title column (Room, Title; Summary and Severity are optional)');
  const body = all.slice(1); if (body.length > MAX_ROWS) return empty(`at most ${MAX_ROWS} rows at a time (the file has ${body.length})`);
  const rows = body.map((r, i) => check(skip + i + 2, { room: r[c.room], title: r[c.title], summary: c.summary >= 0 ? r[c.summary] : '', severity: c.severity >= 0 ? r[c.severity] : '', state: c.state >= 0 ? r[c.state] : '' }, w, seen));
  return summarise(file, kind, rows);
}

/** Raise the ready rows, each through the hand-raised rule; returns the request IDs made and anything refused on the way. */
export function commit(run: DryRun, w: S.Workspace, persona: string, raise: typeof S.raiseIncident): { made: string[]; refused: Array<{ line: number; why: string[] }> } {
  const made: string[] = []; const refused: Array<{ line: number; why: string[] }> = [];
  for (const r of run.rows.filter((x) => x.state === 'ready')) {
    const summary = [r.summary, r.severity && r.severity !== 'Standard' ? `Requested severity: ${r.severity} (for triage to decide).` : '', `Imported from ${run.file}, line ${r.line}.`].filter(Boolean).join(' ');
    const out = raise(w, persona, { roomId: r.roomId, roomName: r.roomName, buildingKey: r.building, title: r.title, summary });
    if ('id' in out) made.push(out.id); else refused.push({ line: r.line, why: out.why });
  }
  return { made, refused };
}
