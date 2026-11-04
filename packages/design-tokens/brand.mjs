/**
 * Empathia brand assets (founder decision D39, 2026-11-03: name and emblem cleared for use). One source for the website, the
 * investor demonstration and the enterprise application. Build scripts copy what they serve with copyBrand(); pages link the files
 * by these names (iconLinks). The SVGs are drawn by media/brand/concepts/draw.py — regenerate there and copy here, never edit by hand;
 * the PNGs and favicon.svg are derived by make-brand.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BRAND_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'brand');
/** Role → file (D39). favicon = the small shield (reads at 16 px); app icons = the tile (the original square carried forward). */
export const BRAND = Object.freeze({
  emblem: 'emblem.svg',              // flagship: drafting compass on the Spartan aspis, ≥ 96 px (website lockups)
  emblemSmall: 'emblem-small.svg',   // 16–64 px: shell headers and the website header
  appTile: 'app-tile.svg',           // app icon only
  owl: 'owl.svg',                    // the Agora Owl: not-found and no-access pages only, a supporting illustration
  originalMark: 'original-mark.svg', // the original V2.5.3 mark, kept unchanged (single-colour glyph)
  favicon: 'favicon.svg', favicon32: 'favicon-32.png', appleTouch: 'apple-touch-icon.png', icon192: 'icon-192.png', icon512: 'icon-512.png',
  social: 'emblem-1024.png',         // large raster for social cards; never loaded by a page
});
/** What a page may link (everything but the social raster, which only social cards fetch). */
export const PAGE_ROLES = Object.freeze(['emblem', 'emblemSmall', 'appTile', 'owl', 'originalMark', 'favicon', 'favicon32', 'appleTouch', 'icon192', 'icon512']);

/** Copy the named roles (default: everything a page may link) into dest/brand/. Returns the copied file names. */
export function copyBrand(dest, roles = PAGE_ROLES) {
  const out = path.join(dest, 'brand'); fs.mkdirSync(out, { recursive: true });
  return roles.map((r) => { const f = BRAND[r]; if (!f) throw new Error(`unknown brand role ${r}`); fs.copyFileSync(path.join(BRAND_DIR, f), path.join(out, f)); return f; });
}

/**
 * The <head> lines every surface uses for its icons. `base` is the path from the page to its root ('' for a page at the root,
 * '/' for absolute paths on a static host with nested pages). With `manifest`, also links the web app manifest written by writeManifest.
 */
export const iconLinks = (base = '', { manifest = false } = {}) => [
  `<link rel="icon" href="${base}brand/favicon.svg" type="image/svg+xml">`,
  `<link rel="icon" href="${base}brand/favicon-32.png" sizes="32x32" type="image/png">`,
  `<link rel="apple-touch-icon" href="${base}brand/apple-touch-icon.png">`,
  ...(manifest ? [`<link rel="manifest" href="${base}manifest.webmanifest">`] : []),
].join('');

/** Write dest/manifest.webmanifest (the tile at 192 and 512; Graphite as the theme and background colour). */
export function writeManifest(dest, { name, shortName = 'Empathia', startUrl = './', themeColor = '#0e1012', backgroundColor = '#0e1012', display = 'standalone' }) {
  const m = { name, short_name: shortName, start_url: startUrl, scope: './', display, theme_color: themeColor, background_color: backgroundColor,
    icons: [{ src: 'brand/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'brand/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'brand/favicon.svg', sizes: 'any', type: 'image/svg+xml' }] };
  fs.writeFileSync(path.join(dest, 'manifest.webmanifest'), JSON.stringify(m, null, 1) + '\n');
  return m;
}

/** Insert lines into an HTML document's <head> once (idempotent: skipped when the first tag is already there); at 'start' right after
 *  <meta charset> (or <head>), at 'end' just before </head>. */
export function injectHead(html, lines, { at = 'end' } = {}) {
  const first = lines.match(/<[^>]+>/)?.[0];
  if (!first || html.includes(first)) return html;
  if (at === 'start') { const m = /<meta charset[^>]*>/i.exec(html) || /<head[^>]*>/i.exec(html); if (m) return html.slice(0, m.index + m[0].length) + `\n${lines}` + html.slice(m.index + m[0].length); }
  return html.replace(/<\/head>/i, `${lines}\n</head>`);
}

const TOKENS_DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const TOKENS = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'tokens.json'), 'utf8'));

/**
 * Everything a surface ships from this package, in one call from its build script: the brand files (copyBrand), the self-hosted
 * Inter faces (dist/fonts) and theme-init.js, and — with `manifest` — manifest.webmanifest. Returns decorate(html), which puts
 * theme-init (a blocking script, so the stored theme is applied before first paint), the font preloads (D38: 'website' three faces,
 * 'app' two) and the icon links into a page's <head>. themeInit: false leaves a page's authored data-theme alone (a surface that has
 * no light composition yet must not follow a light system setting). Run node packages/design-tokens/build-tokens.mjs first (scripts/build.mjs does).
 */
export function shipBrandAndType(dist, { base = '', preload = 'app', manifest = null, themeInit = true } = {}) {
  copyBrand(dist);
  fs.mkdirSync(path.join(dist, 'fonts'), { recursive: true });
  for (const f of fs.readdirSync(path.join(TOKENS_DIST, 'fonts'))) fs.copyFileSync(path.join(TOKENS_DIST, 'fonts', f), path.join(dist, 'fonts', f));
  fs.copyFileSync(path.join(TOKENS_DIST, 'theme-init.js'), path.join(dist, 'theme-init.js'));
  if (manifest) writeManifest(dist, manifest);
  const preloads = (TOKENS.fontFaces.preload[preload] || []).map((f) => `<link rel="preload" href="${base}fonts/${f}" as="font" type="font/woff2" crossorigin>`).join('');
  return (html) => injectHead(injectHead(html, `${themeInit ? `<script src="${base}theme-init.js"></script>` : ''}${preloads}`, { at: 'start' }), iconLinks(base, { manifest: !!manifest }));
}

/** The CSS a surface concatenates before its own: the @font-face rules (url()s relative to the stylesheet) and the tokens. */
export const tokenCss = () => ['fonts.css', 'tokens.css'].map((f) => `/* packages/design-tokens/dist/${f} */\n${fs.readFileSync(path.join(TOKENS_DIST, f), 'utf8')}`).join('\n');
