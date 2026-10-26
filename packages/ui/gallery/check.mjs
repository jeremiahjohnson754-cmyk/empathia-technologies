#!/usr/bin/env node
/**
 * Gallery check (Playwright, Chromium): console errors, horizontal scroll at 390 px, Tab reachability of every focusable element,
 * roving tabs, drawer focus management, theme switching, and the "no bare PASS" rule; plus screenshots into
 * media/screenshots/design-system/. Results → packages/ui/gallery/GALLERY_CHECK.json (PASS / FAIL per check).
 *   node packages/ui/gallery/build.mjs && node packages/ui/gallery/check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const shots = path.join(repo, 'media/screenshots/design-system'); fs.mkdirSync(shots, { recursive: true });
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const url = pathToFileURL(path.join(here, 'dist/index.html')).href;
const results = []; const ok = (id, name, pass, detail = '') => { results.push({ id, name, result: pass ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 600) }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id} ${name}${pass ? '' : ` — ${detail}`}`); };
const b = await chromium.launch();
try {
  const errors = [];
  const open = async (w, theme, extra = '') => {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, colorScheme: theme === 'dark' ? 'dark' : 'light' });
    p.on('pageerror', (e) => errors.push(`${theme}@${w}: ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error') errors.push(`${theme}@${w}: ${m.text()}`); });
    await p.goto(`${url}?theme=${theme}${extra}`); await p.waitForSelector('#tokens'); return p;
  };
  // screenshots and scroll checks in both themes
  for (const theme of ['light', 'dark']) {
    const d = await open(1280, theme);
    ok(`G-theme-${theme}`, `theme ${theme} sets data-theme on <html>`, (await d.evaluate(() => document.documentElement.getAttribute('data-theme'))) === theme);
    await d.screenshot({ path: path.join(shots, `gallery-${theme}-desktop.jpg`), type: 'jpeg', quality: 78, fullPage: true });
    await d.screenshot({ path: path.join(shots, `gallery-${theme}-desktop-top.jpg`), type: 'jpeg', quality: 82 });
    await d.close();
    const m = await open(390, theme);
    const wide = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    ok(`G-390-${theme}`, `no horizontal page scroll at 390 px (${theme})`, wide.sw <= wide.w + 1, JSON.stringify(wide));
    await m.screenshot({ path: path.join(shots, `gallery-${theme}-390.jpg`), type: 'jpeg', quality: 78, fullPage: true });
    await m.close();
  }
  const dr = await open(1280, 'dark', '&drawer=open');
  await dr.waitForSelector('.ui-drawer'); await dr.screenshot({ path: path.join(shots, 'gallery-dark-drawer.jpg'), type: 'jpeg', quality: 82 }); await dr.close();

  // keyboard
  const k = await open(1280, 'light');
  const ids = await k.evaluate(() => {
    const sel = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const els = [...document.querySelectorAll(sel)].filter((e) => e.getAttribute('tabindex') !== '-1' && e.getClientRects().length);
    els.forEach((e, i) => e.setAttribute('data-gid', String(i)));
    return els.length;
  });
  const seen = new Set();
  await k.focus('body');
  for (let i = 0; i < ids + 10; i += 1) { await k.keyboard.press('Tab'); const g = await k.evaluate(() => document.activeElement?.getAttribute('data-gid')); if (g != null) seen.add(g); }
  ok('G-tab', `every focusable element is reachable with Tab (${ids} elements)`, seen.size === ids, `reached ${seen.size} of ${ids}`);
  await k.focus('#tab-overview'); await k.keyboard.press('ArrowRight');
  ok('G-roving', 'tabs: → moves selection and focus to the next tab', await k.evaluate(() => document.activeElement?.id === 'tab-devices' && document.activeElement.getAttribute('aria-selected') === 'true'));
  const opener = k.getByRole('button', { name: 'Open drawer' });
  await opener.focus(); await opener.press('Enter'); await k.waitForSelector('.ui-drawer');
  const inside = await k.evaluate(() => !!document.activeElement?.closest('.ui-drawer'));
  let trapped = true; for (let i = 0; i < 12; i += 1) { await k.keyboard.press('Tab'); if (!(await k.evaluate(() => !!document.activeElement?.closest('.ui-drawer')))) trapped = false; }
  for (let i = 0; i < 6; i += 1) { await k.keyboard.press('Shift+Tab'); if (!(await k.evaluate(() => !!document.activeElement?.closest('.ui-drawer')))) trapped = false; }
  await k.keyboard.press('Escape');
  const closed = (await k.locator('.ui-drawer').count()) === 0;
  const back = await k.evaluate(() => document.activeElement?.textContent === 'Open drawer');
  ok('G-drawer', 'drawer: focus moves in, Tab and Shift+Tab stay inside, Esc closes, focus returns to the opener', inside && trapped && closed && back, JSON.stringify({ inside, trapped, closed, back }));
  const bare = await k.evaluate(() => [...document.querySelectorAll('.ui-badge')].map((e) => e.textContent || '').filter((t) => /(^|[^_A-Za-z])PASS([^_A-Za-z]|$)/.test(t)));
  ok('G-nobarepass', 'no status badge reads a bare PASS', bare.length === 0, bare.join(' | '));
  const sortBtn = k.locator('th button', { hasText: 'Evidence' }).first();
  await sortBtn.click(); await sortBtn.click();
  ok('G-sort', 'sortable header sets aria-sort', (await k.locator('th[aria-sort]').first().getAttribute('aria-sort')) === 'descending');
  await k.close();
  ok('G-console', 'no page errors or console errors in either theme', errors.length === 0, errors.join(' | '));
} finally { await b.close(); }
const failed = results.filter((r) => r.result === 'FAIL').length;
fs.writeFileSync(path.join(here, 'GALLERY_CHECK.json'), JSON.stringify({ check: 'ui-gallery', at: new Date().toISOString(), chromium: 'playwright 1.56.0 bundled build', passed: results.length - failed, failed, results, notRun: [{ id: 'G-a11y-audit', name: 'automated WCAG audit (axe or equivalent)', result: 'NOT_RUN', why: 'no accessibility audit engine is installed offline' }, { id: 'G-sr', name: 'screen-reader walkthrough', result: 'NOT_RUN', why: 'needs a person with assistive technology' }] }, null, 2));
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
