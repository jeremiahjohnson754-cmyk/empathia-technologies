/**
 * A small PDF 1.4 writer for the server's data reports (founder, 18 Nov 2026, 07:49: "exportable reports pdf only for data reports";
 * task #209). No dependency: text in the two standard fonts every PDF reader carries (Helvetica, Helvetica-Bold), WinAnsi encoded,
 * wrapped by the fonts' own advance widths, paginated (US Letter) with a running footer, simple tables with a repeated header row, and
 * document metadata. Characters outside WinAnsi are written as "?" and counted, so a report never claims to show what it cannot.
 * The output is deterministic for the same input: the creation date is the report's own timestamp, and no random identifier is used.
 */
const W_REG: Record<number, number> = {};
// Helvetica advance widths (Adobe AFM, 1/1000 em) for code points 32–126
'278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584'
  .split(' ').forEach((w, i) => { W_REG[32 + i] = Number(w); });
const CP1252: Record<number, number> = { 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2026: 0x85, 0x20ac: 0x80, 0x2122: 0x99 };

export interface Encoded { bytes: number[]; missing: number }
export function winAnsi(s: string): Encoded {
  const bytes: number[] = []; let missing = 0;
  for (const ch of s) { const c = ch.codePointAt(0)!;
    if (c >= 32 && c <= 126) bytes.push(c); else if (c >= 0xa0 && c <= 0xff) bytes.push(c); else if (CP1252[c]) bytes.push(CP1252[c]!);
    else if (c === 0x2192) bytes.push(0x2d, 0x3e); else if (c === 0x2265) bytes.push(0x3e, 0x3d); else if (c === 0x2264) bytes.push(0x3c, 0x3d); else if (c === 0x2212) bytes.push(0x2d);
    else if (c === 9 || c === 10) bytes.push(32); else { bytes.push(0x3f); missing += 1; } }
  return { bytes, missing };
}
const width = (bytes: number[], size: number, bold: boolean) => bytes.reduce((a, b) => a + (W_REG[b] ?? 556), 0) * size / 1000 * (bold ? 1.06 : 1);
export const textWidth = (s: string, size: number, bold = false) => width(winAnsi(s).bytes, size, bold);
const lit = (bytes: number[]) => '(' + bytes.map((b) => (b === 0x28 || b === 0x29 || b === 0x5c ? '\\' + String.fromCharCode(b) : b < 32 || b > 126 ? '\\' + b.toString(8).padStart(3, '0') : String.fromCharCode(b))).join('') + ')';

export function wrap(s: string, size: number, max: number, bold = false): string[] {
  const out: string[] = []; let line = '';
  for (const word of s.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (textWidth(next, size, bold) <= max) { line = next; continue; }
    if (line) out.push(line);
    if (textWidth(word, size, bold) <= max) { line = word; continue; }
    let piece = ''; for (const ch of word) { if (textWidth(piece + ch, size, bold) > max) { out.push(piece); piece = ''; } piece += ch; } line = piece;
  }
  if (line) out.push(line); return out.length ? out : [''];
}

export type Block = { kind: 'title'; text: string } | { kind: 'h'; text: string } | { kind: 'p'; text: string; muted?: boolean } | { kind: 'kv'; rows: Array<[string, string]> }
  | { kind: 'table'; cols: Array<{ label: string; w: number; right?: boolean }>; rows: string[][] } | { kind: 'gap'; h: number };
export interface Doc { title: string; author: string; subject: string; createdAt: Date; footer: string; blocks: Block[] }

const PW = 612, PH = 792, M = 54, CW = PW - 2 * M, INK = '0.06 0.09 0.16', MUTED = '0.36 0.40 0.46', TEAL = '0.04 0.45 0.41';

/** render the document: returns the PDF bytes and how many characters had to be written as "?" */
export function renderPdf(d: Doc): { pdf: Buffer; pages: number; substituted: number } {
  const pages: string[][] = []; let ops: string[] = []; let y = PH - M; let substituted = 0;
  const newPage = () => { ops = []; pages.push(ops); y = PH - M; };
  const ensure = (h: number) => { if (y - h < M + 24) newPage(); };
  const text = (x: number, yy: number, s: string, size: number, bold = false, color = INK) => { const e = winAnsi(s); substituted += e.missing; ops.push(`BT ${color} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td ${lit(e.bytes)} Tj ET`); };
  const rule = (yy: number, color = '0.84 0.87 0.90') => ops.push(`${color} RG 0.6 w ${M} ${yy.toFixed(2)} m ${PW - M} ${yy.toFixed(2)} l S`);
  newPage();
  for (const b of d.blocks) {
    if (b.kind === 'gap') { y -= b.h; continue; }
    if (b.kind === 'title') { const ls = wrap(b.text, 20, CW, true); ensure(ls.length * 26 + 10); for (const l of ls) { text(M, y - 20, l, 20, true, TEAL); y -= 26; } y -= 6; rule(y); y -= 12; continue; }
    if (b.kind === 'h') { const ls = wrap(b.text, 13, CW, true); ensure(ls.length * 18 + 30); y -= 8; for (const l of ls) { text(M, y - 13, l, 13, true); y -= 18; } y -= 2; continue; }
    if (b.kind === 'p') { for (const l of wrap(b.text, 10, CW)) { ensure(14); text(M, y - 10, l, 10, false, b.muted ? MUTED : INK); y -= 14; } y -= 4; continue; }
    if (b.kind === 'kv') { for (const [k, v] of b.rows) { const ls = wrap(v, 10, CW - 138); const kl = wrap(k, 10, 130, true); const n = Math.max(ls.length, kl.length); ensure(n * 14); kl.forEach((kk, i) => text(M, y - 10 - i * 14, kk, 10, true, MUTED)); ls.forEach((l, i) => text(M + 138, y - 10 - i * 14, l, 10)); y -= n * 14 + 2; } y -= 4; continue; }
    if (b.kind === 'table') {
      const total = b.cols.reduce((a, c) => a + c.w, 0); const ws = b.cols.map((c) => c.w / total * CW);
      const head = () => { ensure(36); let x = M; b.cols.forEach((c, i) => { const s = wrap(c.label, 9, ws[i]! - 6, true)[0]!; text(c.right ? x + ws[i]! - 3 - textWidth(s, 9, true) : x + 3, y - 10, s, 9, true, MUTED); x += ws[i]!; }); y -= 15; rule(y + 2, '0.60 0.65 0.70'); };
      head();
      for (const r of b.rows) {
        const cells = r.map((v, i) => wrap(v ?? '', 9, ws[i]! - 6)); const h = Math.max(...cells.map((c) => c.length)) * 12 + 4;
        if (y - h < M + 24) { newPage(); head(); }
        let x = M; cells.forEach((ls, i) => { ls.forEach((l, j) => text(b.cols[i]!.right ? x + ws[i]! - 3 - textWidth(l, 9) : x + 3, y - 10 - j * 12, l, 9)); x += ws[i]!; });
        y -= h; rule(y + 1);
      }
      y -= 8; continue;
    }
  }
  // footers, then the file
  const n = pages.length;
  pages.forEach((p, i) => { const e = winAnsi(`${d.footer} · page ${i + 1} of ${n}`); substituted += e.missing; p.push(`BT ${MUTED} rg /F1 8 Tf ${M} 30 Td ${lit(e.bytes)} Tj ET`); });
  const objs: string[] = [];
  const add = (s: string) => { objs.push(s); return objs.length; };
  const catalog = add(''); const pagesObj = add(''); const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'); const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids: number[] = [];
  for (const p of pages) { const stream = p.join('\n'); const c = add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${c} 0 R >>`)); }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objs[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
  const t = d.createdAt; const p2 = (x: number) => String(x).padStart(2, '0');
  const date = `D:${t.getUTCFullYear()}${p2(t.getUTCMonth() + 1)}${p2(t.getUTCDate())}${p2(t.getUTCHours())}${p2(t.getUTCMinutes())}${p2(t.getUTCSeconds())}Z`;
  const info = add(`<< /Title ${lit(winAnsi(d.title).bytes)} /Author ${lit(winAnsi(d.author).bytes)} /Subject ${lit(winAnsi(d.subject).bytes)} /Creator (Empathia enterprise API) /Producer (Empathia report writer) /CreationDate (${date}) >>`);
  let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'; const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return { pdf: Buffer.from(out, 'latin1'), pages: n, substituted };
}
