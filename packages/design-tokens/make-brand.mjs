#!/usr/bin/env node
/**
 * Regenerate the derived brand files in packages/design-tokens/brand/ (committed, so a host without sharp still builds):
 * favicon.svg (= emblem-small.svg), favicon-32.png (small shield), apple-touch-icon.png 180 / icon-192.png / icon-512.png (the tile),
 * emblem-1024.png (the flagship, social cards only). Renders with sharp when it can be found, otherwise with Playwright's Chromium.
 *   node packages/design-tokens/make-brand.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const B = path.join(here, 'brand');
const repo = path.resolve(here, '../..');
const JOBS = [['emblem-small.svg', 'favicon-32.png', 32], ['app-tile.svg', 'apple-touch-icon.png', 180], ['app-tile.svg', 'icon-192.png', 192], ['app-tile.svg', 'icon-512.png', 512], ['emblem.svg', 'emblem-1024.png', 1024]];
const find = (name) => [path.join(repo, 'node_modules', name), `/opt/npm-tools/node_modules/${name}`, `/home/claude/.npm-global/lib/node_modules/${name}`].find((p) => fs.existsSync(path.join(p, 'package.json')));

fs.copyFileSync(path.join(B, 'emblem-small.svg'), path.join(B, 'favicon.svg'));
const sharpDir = find('sharp');
if (sharpDir) {
  const sharp = createRequire(path.join(sharpDir, 'package.json'))(sharpDir);
  for (const [src, out, s] of JOBS) {
    const svg = fs.readFileSync(path.join(B, src));
    await sharp(svg, { density: Math.max(72, Math.ceil((72 * s) / 320) * 2) }).resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, palette: s <= 192 }).toFile(path.join(B, out));
  }
} else {
  const { chromium } = await import(path.join(find('playwright'), 'index.mjs'));
  const b = await chromium.launch();
  for (const [src, out, s] of JOBS) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${fs.readFileSync(path.join(B, src)).toString('base64')}" width="${s}" height="${s}" style="display:block"></body></html>`);
    await p.screenshot({ path: path.join(B, out), omitBackground: true }); await p.close();
  }
  await b.close();
}
for (const [, out] of JOBS) console.log(`${out}: ${fs.statSync(path.join(B, out)).size} bytes`);
