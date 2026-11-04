#!/usr/bin/env node
/**
 * Regenerate the self-hosted Inter faces in packages/design-tokens/fonts/ (committed; the build only copies them, so a host without
 * Python or the OTF files still builds). Run on a machine that has the Inter OTFs (Debian/Ubuntu: fonts-inter) and python3 fontTools:
 *
 *   node packages/design-tokens/make-fonts.mjs [--src=/usr/share/fonts/opentype/inter]
 *
 * 1. fontTools subsets each face listed in tokens.json → fontFaces.faces to Latin (tokens.json → fontFaces.unicodeRange) with the
 *    layout features the interface uses, keeping CFF outlines.
 * 2. The subset OTF is packed as WOFF2. With the python `brotli` module fontTools writes WOFF2 itself; without it this script packs the
 *    WOFF2 here with Node's built-in Brotli: CFF-flavoured fonts carry no glyf/loca, so every table uses the null transform and the
 *    container is just a header, a table directory and one Brotli stream (W3C WOFF 2.0, sections 4–5).
 * Inter is © The Inter Project Authors, SIL Open Font License 1.1 (fonts/OFL.txt).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(fs.readFileSync(path.join(here, 'tokens.json'), 'utf8'));
const src = (process.argv.find((a) => a.startsWith('--src=')) || '').split('=')[1] || '/usr/share/fonts/opentype/inter';
const out = path.join(here, 'fonts');
fs.mkdirSync(out, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'empathia-fonts-'));
const hasBrotli = spawnSync('python3', ['-I', '-c', 'import brotli'], { encoding: 'utf8' }).status === 0;
const features = 'kern,liga,calt,ccmp,locl,mark,mkmk,tnum,case,frac,sups';

const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];
const base128 = (n) => { const b = []; do { b.unshift(n & 0x7f); n >>>= 7; } while (n); return Buffer.from(b.map((v, i) => (i < b.length - 1 ? v | 0x80 : v))); };

/** Pack an SFNT (OpenType/CFF) buffer as WOFF2 with null transforms. */
export function sfntToWoff2(sfnt) {
  const flavor = sfnt.readUInt32BE(0); const n = sfnt.readUInt16BE(4);
  const tables = [];
  for (let i = 0; i < n; i++) { const o = 12 + i * 16; tables.push({ tag: sfnt.toString('latin1', o, o + 4), offset: sfnt.readUInt32BE(o + 8), length: sfnt.readUInt32BE(o + 12) }); }
  if (tables.some((t) => t.tag === 'glyf' || t.tag === 'loca')) throw new Error('TrueType outlines need the glyf/loca transform; use fontTools with brotli');
  tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  const dir = Buffer.concat(tables.map((t) => { const k = KNOWN.indexOf(t.tag); const head = k >= 0 ? Buffer.from([k]) : Buffer.concat([Buffer.from([63]), Buffer.from(t.tag, 'latin1')]); return Buffer.concat([head, base128(t.length)]); }));
  const data = Buffer.concat(tables.map((t) => sfnt.subarray(t.offset, t.offset + t.length)));
  const comp = zlib.brotliCompressSync(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_LGWIN]: 24, [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_FONT, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length } });
  const totalSfntSize = 12 + 16 * n + tables.reduce((s, t) => s + ((t.length + 3) & ~3), 0);
  const unpadded = 48 + dir.length + comp.length; const length = (unpadded + 3) & ~3;
  const h = Buffer.alloc(48);
  h.write('wOF2', 0, 'latin1'); h.writeUInt32BE(flavor, 4); h.writeUInt32BE(length, 8); h.writeUInt16BE(n, 12); h.writeUInt16BE(0, 14);
  h.writeUInt32BE(totalSfntSize, 16); h.writeUInt32BE(comp.length, 20); h.writeUInt16BE(1, 24); h.writeUInt16BE(0, 26);
  // metadata and private blocks: none (offsets and lengths stay 0)
  return Buffer.concat([h, dir, comp, Buffer.alloc(length - unpadded)]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const unicodes = T.fontFaces.unicodeRange.replace(/\s+/g, '');
  for (const f of T.fontFaces.faces) {
    const otf = path.join(src, f.source);
    if (!fs.existsSync(otf)) { console.error(`missing ${otf} (install fonts-inter or pass --src=)`); process.exit(1); }
    const sub = path.join(tmp, f.file.replace(/\.woff2$/, '.otf'));
    const args = ['-I', '-m', 'fontTools.subset', otf, `--unicodes=${unicodes}`, `--layout-features=${features}`, '--no-hinting', '--desubroutinize', '--name-IDs=0,1,2,3,4,5,6,13,14', `--output-file=${hasBrotli ? path.join(out, f.file) : sub}`];
    if (hasBrotli) args.push('--flavor=woff2');
    const r = spawnSync('python3', args, { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stdout + r.stderr); process.exit(1); }
    if (!hasBrotli) fs.writeFileSync(path.join(out, f.file), sfntToWoff2(fs.readFileSync(sub)));
    console.log(`${f.file}: ${fs.statSync(path.join(out, f.file)).size} bytes (${hasBrotli ? 'fontTools' : 'node brotli'})`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
