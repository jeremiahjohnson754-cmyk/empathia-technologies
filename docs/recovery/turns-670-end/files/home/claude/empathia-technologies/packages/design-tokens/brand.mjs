/**
 * Empathia brand assets (founder decision D39, 2026-11-03: name and emblem cleared for use). One source for the website, the
 * investor demonstration and the enterprise application. Build scripts copy what they serve with copyBrand(); pages link the files
 * by these names. Drawn by media/brand/concepts/draw.py; regenerate there and copy here, never edit the SVGs by hand.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BRAND_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'brand');
/** Role → file. favicon = the small shield (reads at 16 px); app icons = the tile (the original square carried forward). */
export const BRAND = {
  emblem: 'emblem.svg',              // flagship: drafting compass on the Spartan aspis, ≥ 96 px
  emblemFlat: 'emblem-flat.svg',     // flat colour: print, single-colour, embroidery
  emblemSmall: 'emblem-small.svg',   // 16–64 px: shell headers
  appTile: 'app-tile.svg',           // app icon
  owl: 'owl.svg',                    // mascot: not-found and empty states
  originalMark: 'original-mark.svg', // the original V2.5.3 mark, kept unchanged (single-colour glyph)
  favicon: 'favicon.svg', favicon32: 'favicon-32.png', appleTouch: 'apple-touch-icon.png', icon192: 'icon-192.png', icon512: 'icon-512.png',
  social: 'emblem-1024.png',         // large raster for social cards; never loaded by a page
};
/** Copy the named roles (default: everything a page may link) into dest/brand/. Returns the copied file names. */
export function copyBrand(dest, roles = ['emblem', 'emblemSmall', 'owl', 'originalMark', 'favicon', 'favicon32', 'appleTouch', 'icon192', 'icon512']) {
  const out = path.join(dest, 'brand'); fs.mkdirSync(out, { recursive: true });
  return roles.map((r) => { const f = BRAND[r]; if (!f) throw new Error(`unknown brand role ${r}`); fs.copyFileSync(path.join(BRAND_DIR, f), path.join(out, f)); return f; });
}
/** The <head> lines every surface uses for its icons (paths relative to the page's root). */
export const iconLinks = (base = '') => [
  `<link rel="icon" href="${base}brand/favicon.svg" type="image/svg+xml">`,
  `<link rel="icon" href="${base}brand/favicon-32.png" sizes="32x32" type="image/png">`,
  `<link rel="apple-touch-icon" href="${base}brand/apple-touch-icon.png">`,
].join('');
