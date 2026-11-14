/**
 * The six writers of a Report (./model.ts). Each returns the bytes of a native file:
 *   xlsx  Office Open XML workbook (../build/xlsx.ts): a Summary sheet with COUNTIF totals over the tables (cached values computed
 *         here, so the file reads right before a spreadsheet recalculates), one sheet per table with a frozen, filterable header, a
 *         Provenance sheet and a Dictionary sheet; text that would run as a formula is kept as text.
 *   csv   the report's primary table (or its largest), provenance as # lines, formula-injection safe.
 *   json  a dossier: schema, export id, scope, provenance, every table, the structured entities, and a SHA-256 of the canonical body.
 *   docx  an editable Word document (docx): title page, header with the shield and the name, page-numbered footer, headings, fact
 *         tables, data tables with a repeated header row.
 *   pdf   a structured PDF (pdf-lib): real text, wrapped and paginated, tables with repeated headers, page numbers, document metadata.
 *         Its standard font covers Windows-1252: the few characters outside it (arrows, ≥) are written as their plain equivalents and
 *         counted (pdfSubstitutions); the Word and JSON files keep them as they are.
 *   pptx  a native PowerPoint deck (pptxgenjs): title, summary with the figures, status, a native chart, the main tables, provenance.
 * The libraries are imported only when a file is asked for, so they never weigh on the page.
 */
import { buildXlsx, sheetName, type CellValue, type Sheet } from '../build/xlsx.js';
import { cellText, fileName, FORMATS, type Format, type FileOut, type Report, type Table } from './model.js';

const BRAND = { teal: '0A7268', ink: '0F172A', muted: '5B6676', line: 'D7DDE5', soft: 'EEF5F4', bad: 'B42318', warn: 'B54708', ok: '067647' };
const toneHex = (t: string) => (t === 'ok' ? BRAND.ok : t === 'bad' ? BRAND.bad : t === 'warn' ? BRAND.warn : BRAND.muted);
const mime = (f: Format) => FORMATS.find((x) => x.f === f)!.mime;
const enc = (s: string) => new TextEncoder().encode(s);
const tablesOf = (r: Report) => r.sections.filter((s) => s.table).map((s) => s.table!) as Table[];
const safeCsv = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ------------------------------------------------------------------------------------------------------------------------- xlsx
export function toXlsx(r: Report): FileOut {
  const tables = tablesOf(r); const used = new Set<string>();
  const summaryName = sheetName('Summary', used); const names = tables.map((t) => sheetName(t.title, used));
  const quoted = (n: string) => `'${n.replace(/'/g, "''")}'`;
  const totals: CellValue[][] = [];
  tables.forEach((t, ti) => {
    const ci = t.cols.findIndex((c) => c.kind === 'status'); if (ci < 0) return;
    const L = colLetter(ci); const values = [...new Set(t.rows.map((x) => cellText(x[t.cols[ci]!.key] ?? null)))].filter(Boolean);
    for (const v of values) totals.push([`${t.title}: ${v}`, { f: `COUNTIF(${quoted(names[ti]!)}!${L}:${L},"${v.replace(/"/g, '""')}")`, v: t.rows.filter((x) => cellText(x[t.cols[ci]!.key] ?? null) === v).length }]);
    totals.push([`${t.title}: total rows`, { f: `COUNTA(${quoted(names[ti]!)}!A:A)-1`, v: t.rows.length }]);
  });
  const summary: Sheet = { name: summaryName, header: ['Field', 'Value'], rows: [
    ['Report', r.title], ['Subtitle', r.subtitle], ['Report id', r.id], ['Status', r.status.label], ['Why', r.status.why],
    ['Tenant', r.scope.tenant], ['Site', r.scope.site], ['Building', r.scope.building], ['Floor', r.scope.floor], ['Room', r.scope.room],
    ['Generated (UTC)', r.generatedAt], ['Generated as', r.role], ['Build', r.build], ['Summary', r.headline],
    ...r.kpis.map((k) => [k.label, k.note ? `${k.value} (${k.note})` : k.value] as CellValue[]),
    ...totals,
  ] };
  const sheets: Sheet[] = [summary, ...tables.map((t, i) => ({ name: names[i]!, header: t.cols.map((c) => c.label), rows: t.rows.map((row) => t.cols.map((c) => { const v = row[c.key]; return v == null ? null : c.kind === 'number' && typeof v === 'number' ? v : String(v); })) }))];
  sheets.push({ name: sheetName('Provenance', used), header: ['Statement'], rows: r.provenance.map((p) => [p]) });
  sheets.push({ name: sheetName('Dictionary', used), header: ['Sheet', 'Column', 'Kind', 'Meaning'], rows: tables.flatMap((t, i) => t.cols.map((c) => [names[i]!, c.label, c.kind || 'text', `${t.title}: ${c.label}${t.note ? ` (${t.note})` : ''}`])) });
  return { name: fileName(r, 'xlsx'), mime: mime('xlsx'), bytes: buildXlsx(sheets, r.title), format: 'xlsx' };
}
const colLetter = (i: number): string => { let s = ''; let n = i + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

// ------------------------------------------------------------------------------------------------------------------------- csv
export function toCsv(r: Report): FileOut {
  const t = tablesOf(r).find((x) => x.title === r.primary) || tablesOf(r).sort((a, b) => b.rows.length - a.rows.length)[0];
  const q = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [...[`${r.title} · ${t ? t.title : 'no table'}`, ...r.provenance, `Generated ${r.generatedAt} as ${r.role} · build ${r.build}`].map((p) => `# ${p.replace(/\n/g, ' ')}`)];
  if (t) { lines.push(t.cols.map((c) => q(c.label)).join(',')); for (const row of t.rows) lines.push(t.cols.map((c) => { const v = row[c.key]; return typeof v === 'number' ? String(v) : q(safeCsv(cellText(v ?? null))); }).join(',')); }
  return { name: fileName(r, 'csv'), mime: mime('csv'), bytes: enc('﻿' + lines.join('\r\n') + '\r\n'), format: 'csv' };
}

// ------------------------------------------------------------------------------------------------------------------------- json
export async function toJson(r: Report): Promise<FileOut> {
  const body = {
    schema: 'empathia.dossier/1', exportId: `${r.id}:${r.generatedAt}`, kind: r.kind, title: r.title, subtitle: r.subtitle, scope: r.scope,
    status: r.status, generatedAt: r.generatedAt, generatedAs: r.role, build: r.build, provenance: r.provenance, headline: r.headline, kpis: r.kpis,
    tables: Object.fromEntries(tablesOf(r).map((t) => [t.title, { columns: t.cols.map((c) => ({ key: c.key, label: c.label, kind: c.kind || 'text' })), rows: t.rows, note: t.note || null }])),
    entities: r.dossier,
  };
  const canonical = JSON.stringify(body);
  const integrity = { algorithm: 'SHA-256', of: 'the JSON text of every field above, in this order, without this integrity block', value: await sha256Hex(enc(canonical)) };
  return { name: fileName(r, 'json'), mime: mime('json'), bytes: enc(JSON.stringify({ ...body, integrity }, null, 2) + '\n'), format: 'json' };
}

// ------------------------------------------------------------------------------------------------------------------------- docx
export async function toDocx(r: Report, mark?: Uint8Array): Promise<FileOut> {
  const D = await import('docx');
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table: DTable, TableRow, TableCell, WidthType, ShadingType, AlignmentType, Header, Footer, PageNumber, BorderStyle, ImageRun, PageBreak, TableLayoutType } = D;
  const border = { style: BorderStyle.SINGLE, size: 4, color: BRAND.line };
  const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
  const P = (text: string, o: { bold?: boolean; size?: number; color?: string; after?: number; italic?: boolean } = {}) => new Paragraph({ spacing: { after: o.after ?? 120 }, children: [new TextRun({ text, bold: o.bold, size: o.size, color: o.color, italics: o.italic })] });
  const facts = (rows: Array<[string, string]>) => new DTable({ width: { size: 100, type: WidthType.PERCENTAGE }, borders, layout: TableLayoutType.FIXED, columnWidths: [2600, 6400],
    rows: rows.map(([k, v]) => new TableRow({ children: [
      new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: BRAND.soft }, children: [P(k, { bold: true, size: 18, after: 40 })] }),
      new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, children: [P(v, { size: 18, after: 40 })] })] })) });
  const grid = (t: Table) => new DTable({ width: { size: 100, type: WidthType.PERCENTAGE }, borders,
    rows: [new TableRow({ tableHeader: true, children: t.cols.map((c) => new TableCell({ shading: { type: ShadingType.CLEAR, color: 'auto', fill: BRAND.teal }, children: [P(c.label, { bold: true, size: 16, color: 'FFFFFF', after: 30 })] })) }),
      ...t.rows.map((row) => new TableRow({ cantSplit: true, children: t.cols.map((c) => { const v = cellText(row[c.key] ?? null); return new TableCell({ children: [new Paragraph({ spacing: { after: 30 }, alignment: c.kind === 'number' ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text: v, size: 16, bold: c.kind === 'status', color: c.kind === 'status' ? statusHex(v) : undefined })] })] }); }) }))] });
  const headerKids = [...(mark ? [new ImageRun({ type: 'png', data: mark, transformation: { width: 16, height: 16 } })] : []), new TextRun({ text: `  Empathia Technologies · ${r.title}`, size: 16, color: BRAND.muted })];
  const body: Array<InstanceType<typeof Paragraph> | InstanceType<typeof DTable>> = [];
  body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Summary', color: BRAND.ink })] }));
  body.push(P(r.headline, { size: 22 }));
  body.push(facts(r.kpis.map((k) => [k.label, k.note ? `${k.value} — ${k.note}` : k.value])));
  for (const s of r.sections) {
    body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280 }, children: [new TextRun({ text: s.heading, color: BRAND.ink })] }));
    for (const t of s.text || []) body.push(P(t));
    if (s.facts?.length) body.push(facts(s.facts));
    for (const b of s.bullets || []) body.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: b, size: 20 })] }));
    if (s.table) { if (s.table.note) body.push(P(s.table.note, { italic: true, size: 16, color: BRAND.muted })); body.push(s.table.rows.length ? grid(s.table) : P('None on record.', { italic: true })); }
  }
  body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280 }, children: [new TextRun({ text: 'Provenance', color: BRAND.ink })] }));
  for (const p of r.provenance) body.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: p, size: 18 })] }));
  const doc = new Document({
    creator: 'Empathia Technologies (synthetic demonstration)', title: r.title, subject: r.subtitle, description: r.headline, keywords: `${r.kind}, ${r.scope.roomId}, synthetic`,
    styles: { default: { document: { run: { font: 'Calibri', size: 20, color: '1F2937' } } }, paragraphStyles: [{ id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: { size: 28, bold: true, color: BRAND.ink }, paragraph: { spacing: { before: 240, after: 120 } } }] },
    sections: [
      { properties: {}, children: [
        ...(mark ? [new Paragraph({ spacing: { after: 200 }, children: [new ImageRun({ type: 'png', data: mark, transformation: { width: 48, height: 48 } })] })] : []),
        P('EMPATHIA TECHNOLOGIES', { bold: true, size: 20, color: BRAND.teal, after: 600 }),
        P(r.title, { bold: true, size: 48, color: BRAND.ink, after: 160 }),
        P(r.subtitle, { size: 26, color: BRAND.muted, after: 400 }),
        new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: `Status: ${r.status.label}`, bold: true, size: 26, color: toneHex(r.status.tone) }), new TextRun({ text: `  ·  ${r.status.why}`, size: 20, color: BRAND.muted })] }),
        facts([['Report id', r.id], ['Tenant', r.scope.tenant], ['Site', r.scope.site], ['Building', r.scope.building], ['Floor', r.scope.floor], ['Room', r.scope.room], ['Generated (UTC)', r.generatedAt], ['Generated as', `${r.role} (a perspective; it grants nothing)`], ['Build', r.build]]),
        P('', { after: 200 }), ...r.provenance.slice(0, 2).map((p) => P(p, { italic: true, size: 18, color: BRAND.muted })),
        new Paragraph({ children: [new PageBreak()] })] },
      { properties: {}, headers: { default: new Header({ children: [new Paragraph({ children: headerKids })] }) },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${r.id} · synthetic demonstration · page `, size: 16, color: BRAND.muted }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: BRAND.muted }), new TextRun({ text: ' of ', size: 16, color: BRAND.muted }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: BRAND.muted })] })] }) },
        children: body },
    ],
  });
  const bytes = new Uint8Array(await Packer.toArrayBuffer(doc));
  return { name: fileName(r, 'docx'), mime: mime('docx'), bytes, format: 'docx' };
}
const statusHex = (v: string) => (/^(pass|accepted|closed|resolved|proven|complete|done|match)/i.test(v) ? BRAND.ok : /^(fail|blocked|open · high|high|failed)/i.test(v) ? BRAND.bad : /^(not run|partial|open|pending|awaiting|gap|drift|inconclusive)/i.test(v) ? BRAND.warn : '1F2937');

// ------------------------------------------------------------------------------------------------------------------------- pdf
/** characters outside Windows-1252, written as their plain equivalent in the PDF (and counted) */
const SUBST: Record<string, string> = { '→': '->', '←': '<-', '↔': '<->', '≥': '>=', '≤': '<=', '≈': '~', '≠': '!=', '−': '-', '✓': 'v', '✗': 'x', ' ': ' ', ' ': ' ', ' ': ' ' };
export let pdfSubstitutions = 0;
const winAnsi = (s: string) => { let out = ''; for (const ch of s) { const c = ch.codePointAt(0)!; if (SUBST[ch] != null && !(c >= 0x20 && c < 0x7f)) { out += SUBST[ch]; pdfSubstitutions++; } else if (c < 0x20) out += ' '; else if (c > 0xff && !'€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.includes(ch)) { out += '?'; pdfSubstitutions++; } else out += ch; } return out; };
export async function toPdf(r: Report, mark?: Uint8Array): Promise<FileOut> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib'); pdfSubstitutions = 0;
  const hex = (h: string) => rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
  const doc = await PDFDocument.create();
  doc.setTitle(r.title); doc.setSubject(r.subtitle); doc.setAuthor('Empathia Technologies (synthetic demonstration)'); doc.setCreator('Empathia demonstration export'); doc.setProducer('pdf-lib');
  doc.setKeywords([r.kind, r.scope.roomId, 'synthetic']); doc.setCreationDate(new Date(r.generatedAt)); doc.setModificationDate(new Date(r.generatedAt)); doc.setLanguage('en');
  const F = await doc.embedFont(StandardFonts.Helvetica); const B = await doc.embedFont(StandardFonts.HelveticaBold); const I = await doc.embedFont(StandardFonts.HelveticaOblique);
  const img = mark ? await doc.embedPng(mark) : null;
  const W = 612, H = 792, M = 54; const CW = W - 2 * M;   // US Letter, 0.75 in margins
  let page = doc.addPage([W, H]); let y = H - M;
  const pages: Array<ReturnType<typeof doc.addPage>> = [page];
  const newPage = () => { page = doc.addPage([W, H]); pages.push(page); y = H - M - 26; };
  const wrap = (text: string, font: typeof F, size: number, width: number) => { const words = winAnsi(text).split(/\s+/); const lines: string[] = []; let cur = '';
    for (const w0 of words) { let w = w0; while (font.widthOfTextAtSize(w, size) > width) { let k = w.length; while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), size) > width) k--; lines.push(cur ? cur : w.slice(0, k)); if (cur) { cur = ''; continue; } w = w.slice(k); }
      const t = cur ? `${cur} ${w}` : w; if (font.widthOfTextAtSize(t, size) <= width) cur = t; else { lines.push(cur); cur = w; } }
    if (cur) lines.push(cur); return lines.length ? lines : [''] };
  const need = (h: number) => { if (y - h < M + 20) newPage(); };
  const text = (s: string, o: { font?: typeof F; size?: number; color?: string; gap?: number; x?: number; width?: number } = {}) => { const size = o.size || 10; const font = o.font || F; const lines = wrap(s, font, size, o.width || CW);
    for (const ln of lines) { need(size * 1.35); page.drawText(ln, { x: o.x ?? M, y: y - size, size, font, color: hex(o.color || '1F2937') }); y -= size * 1.35; } y -= o.gap ?? 6; };
  const heading = (s: string) => { need(96); /* a heading never ends a page alone: room for it and the first lines under it */ y -= 8; page.drawRectangle({ x: M, y: y - 18, width: 3, height: 16, color: hex(BRAND.teal) }); text(s, { font: B, size: 14, color: BRAND.ink, x: M + 10, width: CW - 10, gap: 6 }); };
  const table = (t: { cols: Array<{ label: string; kind?: string }>; rows: string[][] }, widths?: number[]) => {
    const n = t.cols.length; const wts = widths || t.cols.map((_, i) => Math.max(1, Math.min(4, Math.max(t.cols[i]!.label.length, ...t.rows.slice(0, 60).map((rw) => (rw[i] || '').length)) / 12)));
    const sum = wts.reduce((a, b) => a + b, 0); const cw = wts.map((w0) => (w0 / sum) * CW); const size = n > 6 ? 7.5 : 8.5; const pad = 3;
    const drawHead = () => { const lines = t.cols.map((c, i) => wrap(c.label, B, size, cw[i]! - 2 * pad)); const h = Math.max(...lines.map((l) => l.length)) * size * 1.25 + 2 * pad; need(h + size * 2);
      let x = M; page.drawRectangle({ x: M, y: y - h, width: CW, height: h, color: hex(BRAND.teal) });
      lines.forEach((ls, i) => { ls.forEach((ln, k) => page.drawText(ln, { x: x + pad, y: y - pad - size - k * size * 1.25, size, font: B, color: rgb(1, 1, 1) })); x += cw[i]!; }); y -= h; };
    drawHead();
    t.rows.forEach((rw, ri) => { const lines = rw.map((v, i) => wrap(v || '', t.cols[i]!.kind === 'status' ? B : F, size, cw[i]! - 2 * pad)); const h = Math.max(...lines.map((l) => l.length)) * size * 1.25 + 2 * pad;
      if (y - h < M + 20) { newPage(); drawHead(); }
      if (ri % 2) page.drawRectangle({ x: M, y: y - h, width: CW, height: h, color: hex('F6F8FA') });
      let x = M; lines.forEach((ls, i) => { const st = t.cols[i]!.kind === 'status'; ls.forEach((ln, k) => page.drawText(ln, { x: t.cols[i]!.kind === 'number' ? x + cw[i]! - pad - (st ? B : F).widthOfTextAtSize(ln, size) : x + pad, y: y - pad - size - k * size * 1.25, size, font: st ? B : F, color: hex(st ? statusHex(rw[i] || '') : '1F2937') })); x += cw[i]!; });
      page.drawLine({ start: { x: M, y: y - h }, end: { x: M + CW, y: y - h }, thickness: 0.4, color: hex(BRAND.line) }); y -= h; });
    y -= 10; };
  // the title page
  page.drawRectangle({ x: 0, y: H - 10, width: W, height: 10, color: hex(BRAND.teal) });
  if (img) page.drawImage(img, { x: M, y: H - M - 44, width: 40, height: 40 });
  y = H - M - 60; text('EMPATHIA TECHNOLOGIES', { font: B, size: 10, color: BRAND.teal, gap: 70 });
  text(r.title, { font: B, size: 26, color: BRAND.ink, gap: 8 }); text(r.subtitle, { size: 14, color: BRAND.muted, gap: 26 });
  text(`Status: ${r.status.label}`, { font: B, size: 14, color: toneHex(r.status.tone), gap: 2 }); text(r.status.why, { size: 10, color: BRAND.muted, gap: 20 });
  table({ cols: [{ label: 'Field' }, { label: 'Value' }], rows: [['Report id', r.id], ['Tenant', r.scope.tenant], ['Site', r.scope.site], ['Building', r.scope.building], ['Floor', r.scope.floor], ['Room', r.scope.room], ['Generated (UTC)', r.generatedAt], ['Generated as', `${r.role} (a perspective; it grants nothing)`], ['Build', r.build]] }, [1, 3]);
  for (const p of r.provenance.slice(0, 3)) text(p, { font: I, size: 9, color: BRAND.muted, gap: 2 });
  // the body
  newPage(); heading('Summary'); text(r.headline, { size: 11, gap: 10 });
  table({ cols: [{ label: 'Measure' }, { label: 'Value' }, { label: 'Note' }], rows: r.kpis.map((k) => [k.label, k.value, k.note || '']) }, [2, 1, 3]);
  for (const s of r.sections) {
    heading(s.heading); for (const t of s.text || []) text(t, { size: 10 });
    if (s.facts?.length) table({ cols: [{ label: 'Field' }, { label: 'Value' }], rows: s.facts.map(([a, b]) => [a, b]) }, [1, 3]);
    for (const b of s.bullets || []) text(`•  ${b}`, { size: 10, gap: 2, x: M + 8, width: CW - 8 });
    if (s.table) { if (s.table.note) text(s.table.note, { font: I, size: 8.5, color: BRAND.muted }); if (s.table.rows.length) table({ cols: s.table.cols, rows: s.table.rows.map((rw) => s.table!.cols.map((c) => cellText(rw[c.key] ?? null))) }); else text('None on record.', { font: I, size: 10 }); }
  }
  heading('Provenance'); for (const p of r.provenance) text(`•  ${p}`, { size: 9.5, gap: 2, x: M + 8, width: CW - 8 });
  // headers and footers, now that the page count is known
  pages.forEach((pg, i) => {
    if (i > 0) { pg.drawText(winAnsi(`Empathia Technologies · ${r.title}`), { x: M, y: H - M + 14, size: 8, font: F, color: hex(BRAND.muted) }); pg.drawLine({ start: { x: M, y: H - M + 8 }, end: { x: W - M, y: H - M + 8 }, thickness: 0.5, color: hex(BRAND.line) }); }
    const foot = winAnsi(`${r.id} · synthetic demonstration · page ${i + 1} of ${pages.length}`); pg.drawText(foot, { x: W - M - F.widthOfTextAtSize(foot, 8), y: M - 24, size: 8, font: F, color: hex(BRAND.muted) });
  });
  return { name: fileName(r, 'pdf'), mime: mime('pdf'), bytes: await doc.save(), format: 'pdf' };
}

// ------------------------------------------------------------------------------------------------------------------------- pptx
export async function toPptx(r: Report, mark?: Uint8Array): Promise<FileOut> {
  const Pptx = (await import('pptxgenjs')).default; const p = new Pptx();
  p.layout = 'LAYOUT_WIDE'; p.title = r.title; p.subject = r.subtitle; p.author = 'Empathia Technologies (synthetic demonstration)'; p.company = 'Empathia Technologies';
  const markData = mark ? `data:image/png;base64,${b64(mark)}` : null;
  p.defineSlideMaster({ title: 'EMP', background: { color: 'FFFFFF' }, objects: [
    { rect: { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: BRAND.teal } } },
    ...(markData ? [{ image: { x: 0.5, y: 6.95, w: 0.3, h: 0.3, data: markData } }] : []),
    { text: { text: `Empathia Technologies · ${r.id} · synthetic demonstration`, options: { x: 0.9, y: 6.95, w: 9, h: 0.3, fontSize: 9, color: BRAND.muted, fontFace: 'Calibri' } } },
  ], slideNumber: { x: 12.3, y: 6.95, fontSize: 9, color: BRAND.muted } });
  const title = (s: ReturnType<typeof p.addSlide>, t: string, sub?: string) => { s.addText(t, { x: 0.5, y: 0.35, w: 12.3, h: 0.7, fontSize: 26, bold: true, color: BRAND.ink, fontFace: 'Calibri' }); if (sub) s.addText(sub, { x: 0.5, y: 1.0, w: 12.3, h: 0.45, fontSize: 13, color: BRAND.muted, fontFace: 'Calibri' }); };
  // 1 · title
  const s1 = p.addSlide(); s1.background = { color: BRAND.ink };
  if (markData) s1.addImage({ data: markData, x: 0.6, y: 0.6, w: 0.8, h: 0.8 });
  s1.addText('EMPATHIA TECHNOLOGIES', { x: 0.6, y: 1.6, w: 12, h: 0.4, fontSize: 14, bold: true, color: '45CFC1', charSpacing: 2 });
  s1.addText(r.title, { x: 0.6, y: 2.2, w: 12, h: 1.4, fontSize: 40, bold: true, color: 'FFFFFF' });
  s1.addText(r.subtitle, { x: 0.6, y: 3.6, w: 12, h: 0.6, fontSize: 20, color: 'C9D3DF' });
  s1.addText(`${r.status.label}`, { x: 0.6, y: 4.6, w: 6, h: 0.5, fontSize: 18, bold: true, color: r.status.tone === 'ok' ? '5EE6A8' : r.status.tone === 'bad' ? 'FF8A80' : 'FFC46B' });
  s1.addText(`${r.scope.site} · ${r.scope.building} · ${r.scope.room}\nGenerated ${r.generatedAt.slice(0, 16).replace('T', ' ')} UTC as ${r.role} · build ${r.build}\n${r.provenance[0] || ''}`, { x: 0.6, y: 5.4, w: 12, h: 1.2, fontSize: 12, color: 'AAB6C4', valign: 'top' });
  // 2 · the summary in figures
  const s2 = p.addSlide({ masterName: 'EMP' }); title(s2, 'In brief', r.headline);
  const k = r.kpis.slice(0, 8); const per = Math.min(4, k.length) || 1; const kw = 12.3 / per;
  k.forEach((x, i) => { const cx = 0.5 + (i % per) * kw; const cy = 1.9 + Math.floor(i / per) * 2.3;
    s2.addShape(p.ShapeType.roundRect, { x: cx + 0.08, y: cy, w: kw - 0.24, h: 2.0, fill: { color: BRAND.soft }, line: { color: BRAND.line }, rectRadius: 0.08 });
    s2.addText(x.value, { x: cx + 0.25, y: cy + 0.15, w: kw - 0.6, h: 0.9, fontSize: 30, bold: true, color: BRAND.teal });
    s2.addText(x.label, { x: cx + 0.25, y: cy + 1.0, w: kw - 0.6, h: 0.45, fontSize: 13, bold: true, color: BRAND.ink });
    if (x.note) s2.addText(x.note, { x: cx + 0.25, y: cy + 1.4, w: kw - 0.6, h: 0.5, fontSize: 10, color: BRAND.muted, valign: 'top' }); });
  // 3 · status and why
  const s3 = p.addSlide({ masterName: 'EMP' }); title(s3, `Status: ${r.status.label}`, r.status.why);
  const why = r.sections.find((s) => s.bullets?.length); /* the first section with bullets: for a completion package, the acceptance decision */ if (why) s3.addText(why.bullets!.slice(0, 8).map((b) => ({ text: b, options: { bullet: true, breakLine: true } })), { x: 0.6, y: 1.7, w: 6.2, h: 4.8, fontSize: 15, color: '1F2937', valign: 'top', paraSpaceAfter: 6 });
  if (r.chart) { s3.addChart(p.ChartType.bar, r.chart.series.map((sr) => ({ name: sr.name, labels: [...r.chart!.categories].reverse(), values: [...sr.values].reverse() })) /* a horizontal bar chart draws its first category at the bottom: reversed so it reads top-down */, { x: 7.0, y: 1.6, w: 5.8, h: 4.9, barDir: 'bar', barGrouping: 'stacked', valAxisLabelFormatCode: '0', chartColors: [BRAND.ok, BRAND.bad, BRAND.warn, '98A2B3'], showLegend: true, legendPos: 'b', showTitle: true, title: r.chart.title, titleFontSize: 13, catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, dataLabelFontSize: 9 }); }
  // 4… · the tables, a page of rows each
  for (const t of tablesOf(r)) {
    const st = t.cols.filter((c) => c.kind === 'status'); const cols = [...t.cols.filter((c) => c.kind !== 'status').slice(0, 7 - st.length), ...st]; const per2 = 12; const chunks = Math.max(1, Math.ceil(t.rows.length / per2));
    for (let c = 0; c < Math.min(chunks, 3); c++) {
      const s = p.addSlide({ masterName: 'EMP' }); title(s, t.title, `${t.rows.length} rows${chunks > 1 ? ` · ${c + 1} of ${Math.min(chunks, 3)}${chunks > 3 ? ' (the full table is in the workbook)' : ''}` : ''}${t.note ? ` · ${t.note}` : ''}`);
      const rows = t.rows.slice(c * per2, (c + 1) * per2);
      if (!rows.length) { s.addText('None on record.', { x: 0.6, y: 1.8, w: 12, h: 0.5, fontSize: 16, italic: true, color: BRAND.muted }); continue; }
      s.addTable([cols.map((cc) => ({ text: cc.label, options: { bold: true, color: 'FFFFFF', fill: { color: BRAND.teal } } })), ...rows.map((rw) => cols.map((cc) => { const v = cellText(rw[cc.key] ?? null); return { text: v.length > 90 ? `${v.slice(0, 88)}…` : v, options: cc.kind === 'status' ? { bold: true, color: statusHex(v) } : cc.kind === 'number' ? { align: 'right' as const } : {} }; }))],
        { x: 0.5, y: 1.6, w: 12.3, fontSize: 10, fontFace: 'Calibri', color: '1F2937', border: { type: 'solid', pt: 0.5, color: BRAND.line }, autoPage: false, valign: 'middle' });
    }
  }
  // last · provenance
  const sp = p.addSlide({ masterName: 'EMP' }); title(sp, 'What this deck is, and is not');
  sp.addText(r.provenance.map((x) => ({ text: x, options: { bullet: true, breakLine: true } })), { x: 0.6, y: 1.4, w: 12.1, h: 5.2, fontSize: 14, color: '1F2937', valign: 'top', paraSpaceAfter: 6 });
  // pptxgenjs 4.0.1 ignores compression whenever an outputType is given, and writes every part stored: the package is re-zipped
  // with deflate by the same JSZip the library uses (a 1.6 MB deck becomes ~0.2 MB; the parts are byte-for-byte the same)
  const stored = await p.write({ outputType: 'uint8array' }) as Uint8Array;
  const JSZip = (await import('jszip')).default; const z = await JSZip.loadAsync(stored);
  const out = await z.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 }, mimeType: mime('pptx') });
  return { name: fileName(r, 'pptx'), mime: mime('pptx'), bytes: out, format: 'pptx' };
}
function b64(u: Uint8Array): string { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); }

/** every format of one report */
export async function render(r: Report, f: Format, mark?: Uint8Array): Promise<FileOut> {
  switch (f) {
    case 'xlsx': return toXlsx(r);
    case 'csv': return toCsv(r);
    case 'json': return toJson(r);
    case 'docx': return toDocx(r, mark);
    case 'pdf': return toPdf(r, mark);
    case 'pptx': return toPptx(r, mark);
  }
}
