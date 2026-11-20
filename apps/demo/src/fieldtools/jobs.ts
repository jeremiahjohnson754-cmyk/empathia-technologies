/**
 * Field Tools jobs: calculations a technician keeps together for one site visit (a job), each with its inputs, a headline and a note.
 * Kept in this browser only (localStorage, behind try/catch): never sent anywhere, never a record of the platform, never evidence. A job
 * can be copied out as plain text for a crew message or a ticket. Limits keep a forgotten tab from filling the browser.
 */
import type { Value } from './calc.js';

export interface JobEntry { id: string; tool: string; values: Record<string, Value>; headline: string; note: string; at: string }
export interface Job { id: string; name: string; created: string; entries: JobEntry[] }
export interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void }

export const KEY = 'empathia.fieldtools.jobs.v1';
export const RECENT_KEY = 'empathia.fieldtools.recent.v1';
export const MAX_JOBS = 30; export const MAX_ENTRIES = 200; export const MAX_NAME = 80; export const MAX_NOTE = 500;

const id = () => Math.random().toString(36).slice(2, 10);
const clean = (s: string, max: number) => s.replace(/\s+/g, ' ').trim().slice(0, max);

export function loadJobs(store: Store | null): Job[] {
  try { const raw = store?.getItem(KEY); if (!raw) return []; const j = JSON.parse(raw); return Array.isArray(j) ? j.filter((x) => x && typeof x.id === 'string' && Array.isArray(x.entries)).slice(0, MAX_JOBS) : []; }
  catch { return []; }
}
export function saveJobs(store: Store | null, jobs: Job[]): boolean { try { store?.setItem(KEY, JSON.stringify(jobs.slice(0, MAX_JOBS))); return !!store; } catch { return false; } }

export function addJob(jobs: Job[], name: string, now = new Date()): { jobs: Job[]; job: Job | null; refused?: string } {
  const n = clean(name, MAX_NAME); if (n.length < 2) return { jobs, job: null, refused: 'Name the job (two characters or more).' };
  if (jobs.length >= MAX_JOBS) return { jobs, job: null, refused: `This browser keeps ${MAX_JOBS} jobs: delete one first.` };
  const job: Job = { id: id(), name: n, created: now.toISOString(), entries: [] }; return { jobs: [job, ...jobs], job };
}
export function addEntry(jobs: Job[], jobId: string, e: Omit<JobEntry, 'id' | 'at'>, now = new Date()): { jobs: Job[]; refused?: string } {
  const j = jobs.find((x) => x.id === jobId); if (!j) return { jobs, refused: 'Pick a job first.' };
  if (j.entries.length >= MAX_ENTRIES) return { jobs, refused: `A job keeps ${MAX_ENTRIES} calculations.` };
  const entry: JobEntry = { ...e, note: clean(e.note, MAX_NOTE), id: id(), at: now.toISOString() };
  return { jobs: jobs.map((x) => (x.id === jobId ? { ...x, entries: [entry, ...x.entries] } : x)) };
}
export const removeEntry = (jobs: Job[], jobId: string, entryId: string): Job[] => jobs.map((x) => (x.id === jobId ? { ...x, entries: x.entries.filter((e) => e.id !== entryId) } : x));
export const removeJob = (jobs: Job[], jobId: string): Job[] => jobs.filter((x) => x.id !== jobId);

export function jobReport(job: Job, describe: (e: JobEntry) => string): string {
  return [`${job.name} — Empathia Field Tools job`, `${job.entries.length} calculation${job.entries.length === 1 ? '' : 's'}, kept on one device`, '',
    ...[...job.entries].reverse().map((e, i) => `${i + 1}. ${describe(e)}`), '', 'Estimates from standard formulas; verify against manufacturer data, AVIXA standards and local codes.'].join('\n');
}

export function loadRecent(store: Store | null): string[] { try { const j = JSON.parse(store?.getItem(RECENT_KEY) || '[]'); return Array.isArray(j) ? j.filter((x) => typeof x === 'string').slice(0, 6) : []; } catch { return []; } }
export function pushRecent(store: Store | null, tool: string): string[] { const r = [tool, ...loadRecent(store).filter((x) => x !== tool)].slice(0, 6); try { store?.setItem(RECENT_KEY, JSON.stringify(r)); } catch { /* storage refused: recent stays in memory */ } return r; }

/** the browser's localStorage, or null where it is refused (private windows, blocked site data) */
export function browserStore(): Store | null { try { const s = window.localStorage; const k = '__ft'; s.setItem(k, '1'); s.removeItem(k); return s; } catch { return null; } }
