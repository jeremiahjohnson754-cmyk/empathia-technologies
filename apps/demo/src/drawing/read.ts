/**
 * Drawing Intelligence, reading (founder's directive of 11 Nov 2026, §10). What this file can honestly read:
 *   - a room plan saved as SVG with plain shapes and text: the room's outline, dimension annotations, device tags, network ports;
 *   - a device schedule and a bill of materials saved as CSV.
 * It reads text and numbers. It does not see: nothing here interprets a scanned sheet, a photograph, a PDF, a Visio or a CAD file.
 * Those are NOT BUILT, and a file of a kind it cannot read is refused with that reason.
 *
 * Every fact it produces carries how it is known, in the founder's six classes:
 *   EXTRACTED  read directly from a document's own text or geometry (a tag, a model number, a dimension as written);
 *   INFERRED   concluded from a convention, which may not hold here (the largest rectangle is the room; "CAM" means a camera);
 *   MODELED    computed from other facts (a position in metres from drawing units and a scale);
 *   OBSERVED   stated by a person who looked (a calibration length they measured);
 *   VERIFIED   a reviewer checked it against its source;   APPROVED   an engineer approved the conclusion.
 * This file produces only the first four. "Never claim dimensionally accurate reconstruction from insufficient information":
 * without a scale it gives no position in metres and asks for a calibration; when dimension annotations disagree it uses none.
 *
 * Imported text is untrusted. It is scanned as text, never displayed as markup and never run; what the page draws, it draws
 * itself from the numbers read here. Size and element counts are capped.
 */
export type Cls = 'OBSERVED' | 'EXTRACTED' | 'MODELED' | 'INFERRED' | 'VERIFIED' | 'APPROVED';
export const CLS_WORD: Record<Cls, string> = {
  OBSERVED: 'Observed: stated by a person who looked', EXTRACTED: 'Extracted: read from the document as written', MODELED: 'Modelled: computed from other facts', INFERRED: 'Inferred: concluded from a convention',
  VERIFIED: 'Verified: checked against its source by a reviewer', APPROVED: 'Approved: an engineer approved the conclusion',
};
export type DocKind = 'plan' | 'schedule' | 'bom';
export interface Doc { id: string; name: string; kind: DocKind; revision: string; text: string }
export const MAX_BYTES = 500_000; export const MAX_ELEMENTS = 4000;

/** What a file is, from its name and its first characters; null when it is a kind this reader does not read. */
export function kindOf(name: string, text: string): { kind: DocKind } | { why: string } {
  const ext = (/\.([A-Za-z0-9]+)$/.exec(name)?.[1] || '').toLowerCase(); const head = text.slice(0, 400).toLowerCase();
  if (text.length > MAX_BYTES) return { why: `“${name}” is larger than this reader accepts (${Math.round(MAX_BYTES / 1000)} kB).` };
  if (ext === 'svg') return /<svg[\s>]/.test(head) ? { kind: 'plan' } : { why: `“${name}” is named as an SVG drawing but does not contain one.` };
  if (ext === 'csv') { const first = head.split(/\r?\n/)[0] || ''; if (/\btag\b/.test(first)) return { kind: 'schedule' }; if (/\b(qty|quantity)\b/.test(first)) return { kind: 'bom' }; return { why: `“${name}” is a table, but its first row has neither a Tag column (a device schedule) nor a Qty column (a bill of materials).` }; }
  return { why: `“${name}” is ${ext ? `a .${ext} file` : 'a file with no type'}. This reader reads room plans saved as SVG and tables saved as CSV. PDF, Visio, CAD and image files are not read: that is not built.` };
}

// ------------------------------------------------------------------------------------------------------------ the plan
/** Tag prefixes and the kind of equipment each is taken to mean. A convention: every use of it is INFERRED. */
export const PREFIX: Readonly<Record<string, { cat: string; note?: string }>> = {
  CAM: { cat: 'camera' }, DISP: { cat: 'display' }, DIS: { cat: 'display' }, MON: { cat: 'display' }, PROJ: { cat: 'projector' }, BAR: { cat: 'bar' },
  MICC: { cat: 'micceil' }, MICT: { cat: 'mictable' }, MIC: { cat: 'micceil', note: 'the tag says microphone but not which kind; taken as a ceiling microphone' },
  SPK: { cat: 'speaker' }, LS: { cat: 'speaker' }, DSP: { cat: 'dsp' }, AMP: { cat: 'amp' }, SW: { cat: 'switch' }, TP: { cat: 'touch' }, UC: { cat: 'compute' }, PC: { cat: 'compute' }, CTL: { cat: 'control' }, RACK: { cat: 'rack' }, RK: { cat: 'rack' },
};
const TAG = /^([A-Z]{2,5})[-_ ]?(\d{1,3}[A-Z]?)$/; const PORT = /^NP[-_ ]?\d{1,3}$/;
export interface Drawn { tag: string; prefix: string; cat: string | null; note: string | null; /** drawing units */ px: number; py: number }
export interface Annot { text: string; metres: number; length: number; unitsPerMetre: number }
export interface PlanRead {
  doc: string; revision: string; elements: number; boundary: { x: number; y: number; w: number; h: number } | null; devices: Drawn[]; ports: Array<{ tag: string; px: number; py: number }>;
  annotations: Annot[]; /** drawing units to one metre, when the annotations agree; else null */ unitsPerMetre: number | null; scaleCls: Cls | null; printedScale: string | null;
  notes: string[]; /** things that mean the reading may be wrong */ doubts: string[];
}
const attrs = (s: string): Record<string, string> => { const o: Record<string, string> = {}; for (const m of s.matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g)) o[m[1]!.toLowerCase()] = m[2]!; return o; };
const num = (s: string | undefined): number => { const n = Number.parseFloat(s ?? ''); return Number.isFinite(n) ? n : 0; };
const plain = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#x?[0-9a-f]+;|&[a-z]+;/gi, ' ').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

export function readPlan(doc: Doc): PlanRead {
  const out: PlanRead = { doc: doc.id, revision: doc.revision, elements: 0, boundary: null, devices: [], ports: [], annotations: [], unitsPerMetre: null, scaleCls: null, printedScale: null, notes: [], doubts: [] };
  const t = doc.text.slice(0, MAX_BYTES);
  if (/<script[\s>]|<foreignobject[\s>]|\son\w+\s*=|javascript:/i.test(t)) out.doubts.push('The file contains script or embedded content. It was ignored: the drawing is read as text, and is never displayed or run.');
  if (/\stransform\s*=/.test(t)) out.doubts.push('The drawing moves or scales some of its parts (transforms). This reader does not follow them, so positions inside those parts may be wrong.');
  const rects: Array<{ x: number; y: number; w: number; h: number }> = []; const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []; const texts: Array<{ x: number; y: number; s: string }> = [];
  for (const m of t.matchAll(/<(rect|line)\b([^>]*?)\/?>|<text\b([^>]*)>([\s\S]*?)<\/text>/gi)) {
    if (++out.elements > MAX_ELEMENTS) { out.doubts.push(`The drawing has more than ${MAX_ELEMENTS} shapes; the rest were not read.`); break; }
    if (m[1]?.toLowerCase() === 'rect') { const a = attrs(m[2]!); const r = { x: num(a['x']), y: num(a['y']), w: num(a['width']), h: num(a['height']) }; if (r.w > 0 && r.h > 0) rects.push(r); }
    else if (m[1]?.toLowerCase() === 'line') { const a = attrs(m[2]!); lines.push({ x1: num(a['x1']), y1: num(a['y1']), x2: num(a['x2']), y2: num(a['y2']) }); }
    else { const a = attrs(m[3]!); const s = plain(m[4]!); if (s) texts.push({ x: num(a['x']), y: num(a['y']), s }); }
  }
  rects.sort((a, b) => b.w * b.h - a.w * a.h);
  if (rects[0]) { out.boundary = rects[0]; out.notes.push('The largest rectangle is taken as the room. If the room is another shape, or the sheet has a border, this is wrong.'); if (rects[1] && rects[1].w * rects[1].h > 0.8 * rects[0].w * rects[0].h) out.doubts.push('Two rectangles are nearly the same size; which one is the room is a guess.'); }
  else out.doubts.push('No rectangle was found to take as the room. Positions cannot be related to its walls.');
  for (const x of texts) {
    const s = x.s.toUpperCase(); const sc = /^SCALE\s*(1\s*[:/]\s*\d+)$/.exec(s); if (sc) { out.printedScale = sc[1]!.replace(/\s/g, ''); continue; }
    if (PORT.test(s)) { out.ports.push({ tag: s.replace(/[-_ ]/, '-'), px: x.x, py: x.y }); continue; }
    const dm = /^(\d+(?:[.,]\d+)?)\s*(MM|M)$/.exec(s);
    if (dm) { const metres = Number(dm[1]!.replace(',', '.')) / (dm[2] === 'MM' ? 1000 : 1); let best: { len: number; d: number } | null = null;
      for (const l of lines) { const len = Math.hypot(l.x2 - l.x1, l.y2 - l.y1); if (len < 1) continue; const d = Math.hypot((l.x1 + l.x2) / 2 - x.x, (l.y1 + l.y2) / 2 - x.y); if (d <= Math.max(40, len * 0.15) && (!best || d < best.d)) best = { len, d }; }
      if (best && metres > 0) out.annotations.push({ text: x.s, metres, length: best.len, unitsPerMetre: best.len / metres }); else out.notes.push(`“${x.s}” looks like a dimension, but no line is near enough to say what it measures.`);
      continue; }
    const tg = TAG.exec(s); if (!tg) continue; const p = PREFIX[tg[1]!];
    out.devices.push({ tag: `${tg[1]}-${tg[2]}`, prefix: tg[1]!, cat: p?.cat ?? null, note: p ? p.note ?? null : `the prefix “${tg[1]}” is not one this reader knows`, px: x.x, py: x.y });
  }
  if (out.printedScale) out.notes.push(`A scale of ${out.printedScale} is printed, but the file does not say what its units are, so it is not used. Dimension annotations are.`);
  if (out.annotations.length) { const u = out.annotations.map((a) => a.unitsPerMetre).sort((a, b) => a - b); const lo = u[0]!; const hi = u[u.length - 1]!;
    if ((hi - lo) / hi > 0.03) out.doubts.push(`The dimensions written on the drawing do not agree with each other: ${out.annotations.map((a) => `“${a.text}” over ${Math.round(a.length)} units`).join(', ')}. No scale is taken from them.`);
    else { out.unitsPerMetre = u[Math.floor(u.length / 2)]!; out.scaleCls = 'EXTRACTED'; } }
  const seen = new Set<string>(); for (const d of out.devices) { if (seen.has(d.tag)) out.doubts.push(`The tag ${d.tag} appears more than once on the plan.`); seen.add(d.tag); }
  return out;
}
/** A person gives the real length between two points of the drawing. It replaces whatever scale was read, and is theirs (OBSERVED). */
export function calibrate(p: PlanRead, a: { x1: number; y1: number; x2: number; y2: number; metres: number }): PlanRead | { why: string } {
  const len = Math.hypot(a.x2 - a.x1, a.y2 - a.y1); if (![a.x1, a.y1, a.x2, a.y2, a.metres].every(Number.isFinite) || len < 1) return { why: 'Choose two different points on the drawing.' };
  if (a.metres < 0.3 || a.metres > 200) return { why: 'Give the real distance between them in metres (0.3 to 200).' };
  return { ...p, unitsPerMetre: len / a.metres, scaleCls: 'OBSERVED', doubts: p.doubts.filter((d) => !/do not agree with each other/.test(d)), notes: [...p.notes, `The scale was set by a person: ${Math.round(len)} drawing units are ${a.metres} m.`] };
}

// ------------------------------------------------------------------------------------------------------------ the tables
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false; const s = text.slice(0, MAX_BYTES).replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) { const c = s[i]!;
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === ',' || c === ';') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c; }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim())).slice(0, 2000).map((r) => r.map((x) => x.replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 120)));
}
const col = (head: string[], ...names: string[]) => head.findIndex((h) => names.includes(h.toLowerCase().replace(/[^a-z]/g, '')));
export interface ScheduleRow { tag: string; description: string; model: string; network: boolean | null; line: number }
export interface ScheduleRead { doc: string; revision: string; rows: ScheduleRow[]; doubts: string[] }
export function readSchedule(doc: Doc): ScheduleRead {
  const rows = parseCsv(doc.text); const head = rows[0] || []; const out: ScheduleRead = { doc: doc.id, revision: doc.revision, rows: [], doubts: [] };
  const cTag = col(head, 'tag', 'devicetag'); const cDesc = col(head, 'description', 'device', 'type', 'category'); const cModel = col(head, 'model', 'modelnumber', 'partnumber'); const cNet = col(head, 'network', 'net', 'networked');
  if (cTag < 0) { out.doubts.push('The schedule has no Tag column, so its rows cannot be matched to the plan.'); return out; }
  if (cDesc < 0) out.doubts.push('The schedule has no Description column: what each device is comes only from its tag.'); if (cModel < 0) out.doubts.push('The schedule has no Model column: quantities cannot be compared with the bill of materials.');
  const seen = new Set<string>();
  rows.slice(1).forEach((r, i) => { const m = TAG.exec((r[cTag] || '').toUpperCase()); if (!m) { if ((r[cTag] || '').trim()) out.doubts.push(`Row ${i + 2}: “${r[cTag]}” is not a tag this reader understands.`); return; } const tag = `${m[1]}-${m[2]}`;
    if (seen.has(tag)) { out.doubts.push(`The tag ${tag} is listed twice in the schedule (row ${i + 2}).`); return; } seen.add(tag);
    const n = cNet >= 0 ? (r[cNet] || '').toLowerCase() : ''; out.rows.push({ tag, description: cDesc >= 0 ? r[cDesc] || '' : '', model: cModel >= 0 ? r[cModel] || '' : '', network: /^(y|yes|true|1)$/.test(n) ? true : /^(n|no|false|0)$/.test(n) ? false : null, line: i + 2 }); });
  return out;
}
export interface BomRow { model: string; description: string; qty: number; line: number }
export interface BomRead { doc: string; revision: string; rows: BomRow[]; doubts: string[] }
export function readBom(doc: Doc): BomRead {
  const rows = parseCsv(doc.text); const head = rows[0] || []; const out: BomRead = { doc: doc.id, revision: doc.revision, rows: [], doubts: [] };
  const cModel = col(head, 'model', 'modelnumber', 'partnumber'); const cQty = col(head, 'qty', 'quantity'); const cDesc = col(head, 'description', 'item');
  if (cModel < 0 || cQty < 0) { out.doubts.push('The bill of materials needs a Model column and a Qty column to be compared with anything.'); return out; }
  rows.slice(1).forEach((r, i) => { const model = r[cModel] || ''; const qty = Number(r[cQty]); if (!model) return; if (!Number.isInteger(qty) || qty < 0) { out.doubts.push(`Row ${i + 2}: the quantity “${r[cQty]}” for ${model} is not a whole number.`); return; } out.rows.push({ model, description: cDesc >= 0 ? r[cDesc] || '' : '', qty, line: i + 2 }); });
  return out;
}
/** What a schedule's own words say a device is, when they say it plainly. Stronger than a tag's prefix: it is EXTRACTED. */
const WORDS: ReadonlyArray<[RegExp, string]> = [[/\bceiling mic/i, 'micceil'], [/\btable mic/i, 'mictable'], [/\bwireless mic/i, 'micwireless'], [/\bvideo bar\b/i, 'bar'], [/\bcamera\b/i, 'camera'], [/\bprojector\b/i, 'projector'], [/\b(display|monitor|screen)\b/i, 'display'],
  [/\b(loudspeaker|speaker)\b/i, 'speaker'], [/\b(dsp|audio processor)\b/i, 'dsp'], [/\bamplifier\b/i, 'amp'], [/\bswitch\b/i, 'switch'], [/\btouch panel\b/i, 'touch'], [/\b(room compute|codec|uc compute)\b/i, 'compute'], [/\bcontrol processor\b/i, 'control'], [/\brack\b/i, 'rack']];
export const catFromWords = (description: string): string | null => WORDS.find(([re]) => re.test(description))?.[1] ?? null;
