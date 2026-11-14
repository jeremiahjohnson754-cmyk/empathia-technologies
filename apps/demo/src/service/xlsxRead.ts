/**
 * Reading a workbook (.xlsx) for an import, in the browser: the sheet named "Requests" (Empathia's own export names it so) or else the
 * first sheet, as rows of text. Cached values are read, never formulas evaluated: a cell that holds a formula comes back as "=<formula>"
 * so the importer refuses it like a CSV formula cell. Bounded: at most 1 MB of file, 8 MB of sheet XML, 201 rows, 40 columns; a file
 * that is not a workbook is refused with the reason.
 */
const MAX_FILE = 1_000_000, MAX_XML = 8_000_000, MAX_ROWS = 201, MAX_COLS = 40;
const unxml = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&');
const colIndex = (ref: string) => { const m = /^([A-Z]+)/.exec(ref); if (!m) return -1; let n = 0; for (const ch of m[1]!) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
const texts = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unxml(m[1]!)).join('');

export async function readXlsx(buf: ArrayBuffer): Promise<{ sheet: string; rows: string[][] }> {
  if (buf.byteLength > MAX_FILE) throw new Error('the workbook is over 1 MB');
  const { default: JSZip } = await import('jszip');
  let zip: InstanceType<typeof JSZip>; try { zip = await JSZip.loadAsync(buf); } catch { throw new Error('not a workbook (.xlsx): the file is not a zip package'); }
  const read = async (path: string) => { const f = zip.file(path); if (!f) return null; const t = await f.async('string'); if (t.length > MAX_XML) throw new Error(`${path} is too large to read`); return t; };
  const wb = await read('xl/workbook.xml'); if (!wb) throw new Error('not a workbook (.xlsx): no xl/workbook.xml');
  const rels = (await read('xl/_rels/workbook.xml.rels')) || '';
  const sheets = [...wb.matchAll(/<sheet\b[^>]*\bname="([^"]*)"[^>]*\br:id="([^"]*)"/g)].map((m) => ({ name: unxml(m[1]!), rid: m[2]! }));
  if (!sheets.length) throw new Error('the workbook has no sheets');
  const pick = sheets.find((x) => x.name === 'Requests') || sheets[0]!;
  const target = new RegExp(`<Relationship\\b[^>]*\\bId="${pick.rid}"[^>]*\\bTarget="([^"]*)"`).exec(rels)?.[1] || new RegExp(`<Relationship\\b[^>]*\\bTarget="([^"]*)"[^>]*\\bId="${pick.rid}"`).exec(rels)?.[1];
  if (!target) throw new Error(`the sheet “${pick.name}” has no part`);
  const sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  const xml = await read(sheetPath); if (!xml) throw new Error(`the sheet “${pick.name}” could not be read`);
  const sstXml = (await read('xl/sharedStrings.xml')) || ''; const sst = [...sstXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]!));
  const rows: string[][] = [];
  for (const rm of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    if (rows.length >= MAX_ROWS) break;
    const row: string[] = [];
    for (const cm of rm[1]!.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1]!; const body = cm[2] || ''; const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1] || ''; const t = /\bt="([^"]*)"/.exec(attrs)?.[1] || 'n';
      const i = ref ? colIndex(ref) : row.length; if (i < 0 || i >= MAX_COLS) continue;
      const f = /<f\b[^>]*>([\s\S]*?)<\/f>/.exec(body)?.[1]; const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      const val = f !== undefined ? `=${unxml(f)}` : t === 's' ? (sst[Number(v)] ?? '') : t === 'inlineStr' ? texts(body) : t === 'b' ? (v === '1' ? 'TRUE' : 'FALSE') : v !== undefined ? unxml(v) : '';
      while (row.length < i) row.push(''); row[i] = val;
    }
    rows.push(row);
  }
  return { sheet: pick.name, rows };
}
