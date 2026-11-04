// Contrast and contract tests for tokens v2, in both themes (Graphite dark, Paper light).
//   node --test packages/design-tokens/test/*.test.mjs        (needs node packages/design-tokens/build-tokens.mjs for the CSS checks)
// Rules: every text colour on every ground ≥ 4.5:1 (WCAG 1.4.3); accents and non-text colours ≥ 3:1 (1.4.11); the accent is also link
// text, so it is held to 4.5:1; the nine products are held to 4.5:1 on the main grounds so their names can be set in their colour.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const T = JSON.parse(fs.readFileSync(path.join(pkg, 'tokens.json'), 'utf8'));
const MODES = ['dark', 'light'];
const own = (o) => Object.entries(o).filter(([k]) => !k.startsWith('$'));

const rgb = (c) => {
  const m = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/.exec(c);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  const h = c.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
};
const over = (fg, bg) => { const f = rgb(fg), b = rgb(bg); const mix = (x, y) => Math.round(x * f.a + y * (1 - f.a)); return `#${[mix(f.r, b.r), mix(f.g, b.g), mix(f.b, b.b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`; };
const lum = (c) => { const { r, g, b } = rgb(c); const l = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const hue = (c) => { const { r, g, b } = rgb(c); const R = r / 255, G = g / 255, B = b / 255; const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn; if (!d) return 0; let h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; h *= 60; return h < 0 ? h + 360 : h; };
const hueGap = (a, b) => { const d = Math.abs(hue(a) - hue(b)) % 360; return Math.min(d, 360 - d); };

const col = (k, m) => T.color[k][m];
const GROUNDS = ['bg', 'bg2', 'panel', 'panel2'];
const MAIN = ['bg', 'panel', 'panel2'];
const atLeast = (fg, bgName, m, min, label) => { const r = contrast(fg, col(bgName, m)); assert.ok(r >= min, `${label} on --${bgName} (${m}): ${r.toFixed(2)}:1 < ${min}:1`); };

for (const m of MODES) {
  test(`${T.theme[m].name} (${m}): text on every ground ≥ 4.5:1`, () => {
    for (const t of ['tx', 'tx2', 'tx3']) for (const g of GROUNDS) atLeast(col(t, m), g, m, 4.5, `--${t}`);
  });
  test(`${T.theme[m].name} (${m}): the accent ≥ 4.5:1 as link text on every ground, its ink ≥ 4.5:1 on it, focus = accent`, () => {
    for (const g of GROUNDS) atLeast(col('accent', m), g, m, 4.5, '--accent');
    assert.ok(contrast(col('accent-ink', m), col('accent', m)) >= 4.5, `--accent-ink on --accent (${m})`);
    assert.equal(col('focus', m), col('accent', m));
    // a selected row (accent-bg over panel) keeps primary text readable
    for (const g of ['bg', 'panel']) assert.ok(contrast(col('tx', m), over(col('accent-bg', m), col(g, m))) >= 4.5, `--tx on --accent-bg over --${g} (${m})`);
  });
  test(`${T.theme[m].name} (${m}): statuses as text ≥ 4.5:1 on every ground; data series ≥ 3:1`, () => {
    for (const s of ['ok', 'warn', 'bad', 'info']) for (const g of GROUNDS) atLeast(col(s, m), g, m, 4.5, `--${s}`);
    for (const s of ['indigo', 'violet']) for (const g of GROUNDS) atLeast(col(s, m), g, m, 3, `--${s}`);
  });
  test(`${T.theme[m].name} (${m}): the serious tone reads on its own ground and on panels`, () => {
    for (const g of MAIN) atLeast(col('serious', m), g, m, 4.5, '--serious');
    for (const g of ['bg', 'panel']) assert.ok(contrast(col('serious', m), over(col('serious-bg', m), col(g, m))) >= 4.5, `--serious on --serious-bg over --${g} (${m})`);
    for (const g of ['bg', 'panel']) assert.ok(contrast(col('tx', m), over(col('serious-bg', m), col(g, m))) >= 4.5, `--tx on --serious-bg over --${g} (${m})`);
  });
  test(`${T.theme[m].name} (${m}): control boundaries (--line3) ≥ 3:1`, () => {
    for (const g of GROUNDS) atLeast(col('line3', m), g, m, 3, '--line3');
  });
  test(`${T.theme[m].name} (${m}): the nine product colours ≥ 4.5:1 on bg/panel/panel2, ≥ 3:1 on bg2, their ink ≥ 4.5:1 on them`, () => {
    for (const [id, p] of own(T.product)) {
      for (const g of MAIN) atLeast(p[m], g, m, 4.5, `--p-${id}`);
      atLeast(p[m], 'bg2', m, 3, `--p-${id}`);
      const ink = contrast(p[m], '#ffffff') >= contrast(p[m], '#0e1012') ? '#ffffff' : '#0e1012';
      assert.ok(contrast(ink, p[m]) >= 4.5, `ink on --p-${id} (${m}): ${contrast(ink, p[m]).toFixed(2)}`);
    }
  });
  test(`${T.theme[m].name} (${m}): teal stays the accent only — no product colour sits on the accent's hue (≥ 20°)`, () => {
    for (const [id, p] of own(T.product)) {
      assert.notEqual(p[m].toLowerCase(), col('accent', m).toLowerCase(), `--p-${id} equals the accent`);
      assert.ok(hueGap(p[m], col('accent', m)) >= 20, `--p-${id} (${m}) is ${hueGap(p[m], col('accent', m)).toFixed(0)}° from the accent`);
    }
  });
  test(`${T.theme[m].name} (${m}): the nine product colours are told apart from one another (hue ≥ 18° or luminance ≥ 1.3:1)`, () => {
    const ps = own(T.product);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i][1][m], b = ps[j][1][m];
      assert.ok(hueGap(a, b) >= 18 || contrast(a, b) >= 1.3, `${ps[i][0]} vs ${ps[j][0]} (${m}): ${hueGap(a, b).toFixed(0)}°, ${contrast(a, b).toFixed(2)}:1`);
    }
  });
  test(`${T.theme[m].name} (${m}): equipment class colours ≥ 3:1 on the plan ground and panels; evidence states ≥ 4.5:1 on panel`, () => {
    for (const [id, c] of own(T.class)) for (const g of GROUNDS) atLeast(c[m], g, m, 3, `--c-${id}`);
    for (const [id, c] of own(T.evidence)) for (const g of MAIN) atLeast(c[m], g, m, 4.5, `--ev-${id}`);
  });
}

test('D37: the nine products in the canonical order', () => {
  assert.deepEqual(own(T.product).map(([, p]) => p.name), ['Mission Control', 'Lite', 'Pro', 'Search Party', 'ServiceHands', 'Commissioning & Assurance', 'APEX', 'Field Intelligence', 'Learn']);
});

test('D7: Inter everywhere — the sans and display stacks lead with Inter; no Poppins or Adobe kit family', () => {
  assert.match(T.font.sans, /^"Inter",/);
  assert.match(T.font.display, /^"Inter Display", "Inter",/);
  assert.doesNotMatch(JSON.stringify(T.font), /poppins|acumin/i);
});

test('D38: the faces exist as WOFF2 and the website preload stays within ≈ 88 KB', () => {
  for (const f of T.fontFaces.faces) {
    const b = fs.readFileSync(path.join(pkg, 'fonts', f.file));
    assert.equal(b.toString('latin1', 0, 4), 'wOF2', `${f.file} is WOFF2`);
    assert.equal(b.readUInt32BE(8), b.length, `${f.file}: header length matches the file`);
  }
  const bytes = (list) => list.reduce((s, f) => s + fs.statSync(path.join(pkg, 'fonts', f)).size, 0);
  assert.equal(T.fontFaces.preload.website.length, 3);
  assert.ok(bytes(T.fontFaces.preload.website) <= 88 * 1024, `website preload ${bytes(T.fontFaces.preload.website)} B`);
  assert.ok(bytes(T.fontFaces.preload.app) <= 60 * 1024, `app preload ${bytes(T.fontFaces.preload.app)} B`);
  assert.ok(fs.existsSync(path.join(pkg, 'fonts', 'OFL.txt')), 'the OFL travels with the fonts');
});

test('generated CSS: system default, data-theme on any element, stages stay dark, reduced motion', { skip: !fs.existsSync(path.join(pkg, 'dist/tokens.css')) && 'not built (node packages/design-tokens/build-tokens.mjs)' }, () => {
  const css = fs.readFileSync(path.join(pkg, 'dist/tokens.css'), 'utf8');
  assert.match(css, /@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme="dark"\]\) \{/);
  assert.match(css, /\n\[data-theme="light"\] \{/, 'light on any element, not only :root');
  assert.match(css, /\n\[data-theme="dark"\], \[data-stage\] \{/, 'dark on any element; stages stay dark (D36)');
  for (const [id] of own(T.product)) assert.ok(css.includes(`--p-${id}:`) && css.includes(`--p-${id}-ink:`), `--p-${id}`);
  assert.match(css, /prefers-reduced-motion: reduce/);
  const fonts = fs.readFileSync(path.join(pkg, 'dist/fonts.css'), 'utf8');
  assert.equal((fonts.match(/@font-face/g) || []).length, T.fontFaces.faces.length);
  assert.match(fonts, /font-display: swap/);
  const init = fs.readFileSync(path.join(pkg, 'dist/theme-init.js'), 'utf8');
  assert.ok(init.includes('"empathia.theme"') && init.length < 400, 'theme-init uses the shared key and stays tiny');
});
