/**
 * One report, six files (founder, 13 Nov 2026: "real PNG, JPEG, XLSX, DOCX, PDF, JSON and PPTX generation ... true native file
 * structures"). A product builds a format-neutral Report once from its records; ./render.ts writes it as XLSX, CSV, DOCX, PDF, PPTX and
 * a JSON dossier, so the six files can never disagree. Nothing here touches the DOM, so the same code runs in the browser (a Blob) and
 * in Node (scripts/verify/export-formats.mjs writes the samples and reopens every one).
 *
 * Honesty travels with the data: every report carries its provenance lines (synthetic, modelled, simulated, as recorded), the role it
 * was made as (a perspective that grants nothing), the build, and the time. No figure is typed: each comes from the record it names.
 */
export type Cell = string | number | null;
export interface Col { key: string; label: string; kind?: 'text' | 'number' | 'date' | 'status'; width?: number }
export interface Table { title: string; cols: Col[]; rows: Array<Record<string, Cell>>; note?: string }
export interface Section { id: string; heading: string; text?: string[]; facts?: Array<[string, string]>; bullets?: string[]; table?: Table }
export type Tone = 'ok' | 'warn' | 'bad' | 'muted';
export interface Report {
  schema: 'empathia.report/1';
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  scope: { tenant: string; site: string; building: string; floor: string; room: string; roomId: string };
  status: { label: string; tone: Tone; why: string };
  generatedAt: string;
  role: string;
  build: string;
  provenance: string[];
  headline: string;
  kpis: Array<{ label: string; value: string; note?: string }>;
  /** a small chart a report may carry: categories and named series of counts */
  chart?: { title: string; categories: string[]; series: Array<{ name: string; values: number[]; tone?: Tone | 'info' }> };
  sections: Section[];
  /** pictures the report carries: drawings made from the record (svg, rasterised before writing) and photographs captured in the field */
  media?: Media[];
  /** addresses a reader can follow: the record's own pages and documents */
  links?: Link[];
  /** the table the CSV carries (by title); the largest table when absent */
  primary?: string;
  /** the structured entities for the JSON dossier (ids and relationships) */
  dossier: Record<string, unknown>;
}
/** A picture in a report. `svg` is turned into `bytes` (PNG) by prepareMedia before a writer sees it; a writer skips an item without bytes. */
export interface Media { id: string; title: string; caption: string; source: string; kind: 'drawing' | 'photo' | 'screenshot'; mime: 'image/png' | 'image/jpeg'; width: number; height: number; bytes?: Uint8Array; svg?: string; sha256?: string }
export interface Link { label: string; url: string; note?: string }
export interface FileOut { name: string; mime: string; bytes: Uint8Array; format: Format }
export type Format = 'pdf' | 'docx' | 'xlsx' | 'csv' | 'pptx' | 'json';
export const FORMATS: Array<{ f: Format; label: string; what: string; mime: string }> = [
  { f: 'pdf', label: 'PDF', what: 'the report to read, print or send', mime: 'application/pdf' },
  { f: 'docx', label: 'Word', what: 'the same report, editable', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { f: 'xlsx', label: 'Excel', what: 'every table as a sheet, with totals', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { f: 'pptx', label: 'PowerPoint', what: 'a short deck for a review', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  { f: 'json', label: 'JSON dossier', what: 'the structured record, with its schema', mime: 'application/json' },
  { f: 'csv', label: 'CSV', what: 'the main table, plain', mime: 'text/csv' },
];
/** A file name safe on every system: the report's id and kind, never a person's name. */
export const fileName = (r: Report, f: Format) => `${r.id}-${r.kind}`.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-') + `.${f}`;
export const cellText = (v: Cell) => (v == null ? '' : String(v));
