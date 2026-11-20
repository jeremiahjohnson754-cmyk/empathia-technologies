/**
 * Pictures for the writers: a drawing made as SVG is rasterised to PNG once (the browser draws it on a canvas; Node passes sharp), a
 * photograph kept as a data URL becomes its bytes, and every picture gets the SHA-256 of the bytes that go into the files.
 */
import type { Media, Report } from './model.js';
import { sha256Hex } from './render.js';

export type Raster = (svg: string, width: number, height: number) => Promise<Uint8Array | undefined>;
export function dataUrlBytes(u: string): { mime: 'image/png' | 'image/jpeg'; bytes: Uint8Array } | null {
  const m = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(u); if (!m) return null;
  const bin = atob(m[2]!); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return { mime: m[1] as 'image/png' | 'image/jpeg', bytes: b };
}
/** the size of a PNG or JPEG from its header (0×0 when it cannot be read) */
export function imageSize(b: Uint8Array): { width: number; height: number } {
  if (b[0] === 0x89 && b[1] === 0x50) return { width: (b[16]! << 24) | (b[17]! << 16) | (b[18]! << 8) | b[19]!, height: (b[20]! << 24) | (b[21]! << 16) | (b[22]! << 8) | b[23]! };
  for (let i = 2; i < b.length - 9;) { if (b[i] !== 0xff) { i++; continue; } const t = b[i + 1]!; const len = (b[i + 2]! << 8) | b[i + 3]!;
    if (t >= 0xc0 && t <= 0xcf && t !== 0xc4 && t !== 0xc8 && t !== 0xcc) return { height: (b[i + 5]! << 8) | b[i + 6]!, width: (b[i + 7]! << 8) | b[i + 8]! }; i += 2 + len; }
  return { width: 0, height: 0 };
}
export async function prepareMedia(r: Report, raster: Raster): Promise<Report> {
  if (!r.media?.length) return r;
  const media: Media[] = [];
  for (const m of r.media) {
    let bytes = m.bytes; if (!bytes && m.svg) bytes = await raster(m.svg, m.width, m.height);
    if (!bytes) continue;   // a picture that could not be made is left out, never replaced
    media.push({ ...m, svg: undefined, bytes, mime: m.svg ? 'image/png' : m.mime, sha256: await sha256Hex(bytes) });
  }
  return { ...r, media };
}
/** the browser's rasteriser: the SVG drawn on a canvas at twice its size, as PNG */
/** the browser's rasteriser as JPEG (white ground: JPEG has no transparency) */
export async function canvasJpeg(svg: string, width: number, height: number): Promise<Uint8Array | undefined> {
  try { const img = new Image(); img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; await img.decode();
    const c = document.createElement('canvas'); c.width = width * 2; c.height = height * 2; const g = c.getContext('2d'); if (!g) return undefined; g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height); const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.9)); return blob ? new Uint8Array(await blob.arrayBuffer()) : undefined; } catch { return undefined; }
}
export const canvasRaster: Raster = async (svg, width, height) => {
  try {
    // a data: URL, which the page's CSP allows for images (img-src 'self' data:); blob: is not allowed and is not needed
    const img = new Image(); img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; await img.decode();
    const c = document.createElement('canvas'); c.width = width * 2; c.height = height * 2; const g = c.getContext('2d'); if (!g) return undefined;
    g.drawImage(img, 0, 0, c.width, c.height); const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/png')); return blob ? new Uint8Array(await blob.arrayBuffer()) : undefined;
  } catch { return undefined; }
};
