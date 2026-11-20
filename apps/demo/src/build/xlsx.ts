/**
 * A small .xlsx writer for Build a Room's workbook (V2.5.3 v25XlsxBuild/v25XlsxZip, restored 12 Nov 2026): Office Open XML sheets with
 * inline strings, numbers, formulas with their cached value, a frozen header row, an autofilter and list validation, packed in a zip
 * with stored (uncompressed) entries. No library; nothing leaves the page.
 */
export type CellValue = string | number | boolean | null | { f: string; v: string | number };
export interface Sheet { name: string; header?: string[]; rows: CellValue[][]; validations?: Array<{ col: number; list: string[] }> }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
export const col = (i: number): string => { let s = ''; let n = i + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
/** Sheet names: at most 31 characters, none of []:*?/\, unique. */
export function sheetName(name: string, used: Set<string>): string {
  const base = (name.replace(/[[\]:*?/\\]/g, ' ').trim() || 'Sheet').slice(0, 31); let n = base, k = 2;
  while (used.has(n.toLowerCase())) { const suf = ` (${k++})`; n = base.slice(0, 31 - suf.length) + suf; }
  used.add(n.toLowerCase()); return n;
}
/** A text cell that a spreadsheet would read as a formula is kept as text (CSV/formula injection). */
const safeText = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);

function cell(ref: string, v: CellValue, style: number): string {
  const s = ` s="${style}"`;
  if (v == null || v === '') return `<c r="${ref}"${s}/>`;
  if (typeof v === 'object') return typeof v.v === 'number' ? `<c r="${ref}"${s}><f>${esc(v.f)}</f><v>${v.v}</v></c>` : `<c r="${ref}"${s} t="str"><f>${esc(v.f)}</f><v>${esc(String(v.v))}</v></c>`;
  if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
  if (typeof v === 'boolean') return `<c r="${ref}"${s} t="b"><v>${v ? 1 : 0}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(safeText(String(v)))}</t></is></c>`;
}
function sheetXml(sh: Sheet): string {
  const all = [...(sh.header ? [sh.header as CellValue[]] : []), ...sh.rows]; const ncol = Math.max(1, ...all.map((r) => r.length)); const last = col(ncol - 1);
  const width = (i: number) => Math.min(60, Math.max(10, ...all.map((r) => { const x = r[i]; return String(x == null ? '' : typeof x === 'object' ? x.v : x).length + 2; })));
  const rows = all.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => cell(`${col(ci)}${ri + 1}`, v, sh.header && ri === 0 ? 1 : 0)).join('')}</row>`).join('');
  const pane = sh.header ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  const filter = sh.header && sh.rows.length ? `<autoFilter ref="A1:${last}${all.length}"/>` : '';
  const dv = sh.rows.length ? (sh.validations || []).map((x) => `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${col(x.col)}2:${col(x.col)}${all.length}"><formula1>"${esc(x.list.join(','))}"</formula1></dataValidation>`).join('') : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${last}${Math.max(1, all.length)}"/>${pane}<sheetFormatPr defaultRowHeight="15"/><cols>${Array.from({ length: ncol }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${width(i)}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData>${filter}${dv ? `<dataValidations count="${(sh.validations || []).length}">${dv}</dataValidations>` : ''}</worksheet>`;
}
const CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml';
export function buildXlsx(sheets: Sheet[], title: string): Uint8Array {
  const used = new Set<string>(); const names = sheets.map((s) => sheetName(s.name, used));
  const files: Array<[string, string]> = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${CT}.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="${CT}.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${CT}.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'],
    ['docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(title)}</dc:title><dc:creator>Empathia demonstrator (synthetic data)</dc:creator></cp:coreProperties>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${sheets.some((s) => s.header && s.rows.length) ? `<definedNames>${sheets.map((s, i) => (s.header && s.rows.length ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(names[i]!.replace(/'/g, "''"))}'!$A$1:$${col(Math.max(1, s.header.length) - 1)}$${s.rows.length + 1}</definedName>` : '')).join('')}</definedNames>` : ''}</workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'],
    ...sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)] as [string, string]),
  ];
  return zipStore(files);
}

let CRC: Uint32Array | null = null;
export function crc32(b: Uint8Array): number {
  if (!CRC) { CRC = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
  let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]!) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0;
}
/** A zip with stored entries (method 0), UTF-8 names. */
export function zipStore(entries: Array<[string, string | Uint8Array]>): Uint8Array {
  const enc = new TextEncoder(); const files = entries.map(([n, d]) => ({ name: enc.encode(n), data: typeof d === 'string' ? enc.encode(d) : d, off: 0, crc: 0 }));
  const size = files.reduce((s, f) => s + 30 + f.name.length + f.data.length + 46 + f.name.length, 22); const out = new Uint8Array(size); const dv = new DataView(out.buffer); let p = 0;
  const DATE = (2026 - 1980) << 9 | 1 << 5 | 1; // a fixed date, so the same workbook is the same bytes
  for (const f of files) { f.crc = crc32(f.data); f.off = p;
    dv.setUint32(p, 0x04034b50, true); dv.setUint16(p + 4, 20, true); dv.setUint16(p + 6, 0x0800, true); dv.setUint16(p + 8, 0, true); dv.setUint16(p + 10, 0, true); dv.setUint16(p + 12, DATE, true);
    dv.setUint32(p + 14, f.crc, true); dv.setUint32(p + 18, f.data.length, true); dv.setUint32(p + 22, f.data.length, true); dv.setUint16(p + 26, f.name.length, true); dv.setUint16(p + 28, 0, true);
    out.set(f.name, p + 30); out.set(f.data, p + 30 + f.name.length); p += 30 + f.name.length + f.data.length; }
  const cd = p;
  for (const f of files) {
    dv.setUint32(p, 0x02014b50, true); dv.setUint16(p + 4, 20, true); dv.setUint16(p + 6, 20, true); dv.setUint16(p + 8, 0x0800, true); dv.setUint16(p + 10, 0, true); dv.setUint16(p + 12, 0, true); dv.setUint16(p + 14, DATE, true);
    dv.setUint32(p + 16, f.crc, true); dv.setUint32(p + 20, f.data.length, true); dv.setUint32(p + 24, f.data.length, true); dv.setUint16(p + 28, f.name.length, true);
    dv.setUint16(p + 30, 0, true); dv.setUint16(p + 32, 0, true); dv.setUint16(p + 34, 0, true); dv.setUint16(p + 36, 0, true); dv.setUint32(p + 38, 0, true); dv.setUint32(p + 42, f.off, true);
    out.set(f.name, p + 46); p += 46 + f.name.length; }
  dv.setUint32(p, 0x06054b50, true); dv.setUint16(p + 4, 0, true); dv.setUint16(p + 6, 0, true); dv.setUint16(p + 8, files.length, true); dv.setUint16(p + 10, files.length, true);
  dv.setUint32(p + 12, p - cd, true); dv.setUint32(p + 16, cd, true); dv.setUint16(p + 20, 0, true);
  return out;
}
