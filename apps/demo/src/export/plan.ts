/**
 * The room's plan, drawn from its record for a document: the outline at its size, every device position by layer with its code, the
 * furniture, a scale bar and a legend. It is a drawing of the record (positions as designed or modelled), never a photograph or a
 * survey, and its caption says so. Plain SVG with no fonts or links to fetch, so the browser (canvas) and Node (sharp) rasterise the
 * same picture.
 */
import type { RoomRecord } from '../campus/design.js';
import { shortName } from '../campus/canon.js';

const LAYER: Record<string, { c: string; label: string }> = {
  display: { c: '#2E6FD8', label: 'Display' }, video: { c: '#7A3FD1', label: 'Video' }, audio: { c: '#0A7268', label: 'Audio' }, control: { c: '#B54708', label: 'Control' },
  network: { c: '#475467', label: 'Network' }, power: { c: '#B42318', label: 'Power' },
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function planSvg(r: RoomRecord): { svg: string; width: number; height: number } {
  const [W, L] = r.outline.dims; const pad = 60; const legendH = 70;
  const s = Math.min(900 / W, 900 / L); const w = Math.round(W * s + pad * 2); const h = Math.round(L * s + pad * 2 + legendH);
  const X = (x: number) => pad + x * s; const Y = (y: number) => pad + y * s;
  const dev = r.positions.filter((p) => !p.furniture); const furn = r.positions.filter((p) => p.furniture);
  const layers = [...new Set(dev.map((p) => p.layer))].filter((l) => LAYER[l]);
  const bar = W >= 8 ? 2 : 1;
  const parts: string[] = [];
  parts.push(`<rect width="${w}" height="${h}" fill="#ffffff"/>`);
  // the grid, one metre
  for (let gx = 0; gx <= W; gx += 1) parts.push(`<line x1="${X(gx)}" y1="${Y(0)}" x2="${X(gx)}" y2="${Y(L)}" stroke="#EEF2F6" stroke-width="1"/>`);
  for (let gy = 0; gy <= L; gy += 1) parts.push(`<line x1="${X(0)}" y1="${Y(gy)}" x2="${X(W)}" y2="${Y(gy)}" stroke="#EEF2F6" stroke-width="1"/>`);
  parts.push(`<rect x="${X(0)}" y="${Y(0)}" width="${W * s}" height="${L * s}" fill="none" stroke="#0F172A" stroke-width="4"/>`);
  for (const p of furn) { const fw = p.cat === 'table' ? Math.min(W * 0.5, 3.6) * s : p.cat === 'lectern' ? 0.7 * s : 0.9 * s; const fh = p.cat === 'table' ? Math.min(L * 0.35, 1.4) * s : p.cat === 'lectern' ? 0.5 * s : 0.5 * s;
    parts.push(`<rect x="${X(p.x) - fw / 2}" y="${Y(p.y) - fh / 2}" width="${fw}" height="${fh}" rx="6" fill="#F2F4F7" stroke="#98A2B3" stroke-width="1.5"/>`); }
  for (const p of dev) { const c = LAYER[p.layer]?.c || '#475467';
    parts.push(`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="9" fill="${c}" stroke="#ffffff" stroke-width="2"/>`);
    parts.push(`<text x="${X(p.x) + 12}" y="${Y(p.y) + 4}" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#1F2937">${esc(p.code)}</text>`); }
  // scale bar and title
  parts.push(`<line x1="${X(0)}" y1="${Y(L) + 28}" x2="${X(bar)}" y2="${Y(L) + 28}" stroke="#0F172A" stroke-width="3"/><text x="${X(bar) + 8}" y="${Y(L) + 33}" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#0F172A">${bar} m</text>`);
  parts.push(`<text x="${pad}" y="34" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" fill="#0F172A">${esc(`${shortName(r.outline)} — ${r.outline.name}`)}</text>`);
  parts.push(`<text x="${w - pad}" y="34" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#5B6676">${W} × ${L} m · ${r.outline.kind === 'reference' ? 'design record' : 'modelled'}</text>`);
  layers.forEach((l, i) => { const lx = pad + i * 130; const ly = h - 30;
    parts.push(`<circle cx="${lx + 8}" cy="${ly - 5}" r="8" fill="${LAYER[l]!.c}"/><text x="${lx + 22}" y="${ly}" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#1F2937">${LAYER[l]!.label}</text>`); });
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join('')}</svg>`, width: w, height: h };
}
