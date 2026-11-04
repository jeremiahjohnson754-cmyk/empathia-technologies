#!/usr/bin/env node
// The phone shell (backlog 11, UX-10): up to 820 px one compact bar — emblem, find, View as, menu — and a drawer with every product
// (colour mark, one-line purpose, the current one marked in words) and the theme choice; header under 120 px before content; every
// product in two taps; the role's home tabs as a bottom bar; 44 px targets; no sideways scroll; desktop keeps the rail inline.
import { harness, repo } from './demo-shell-lib.mjs';
import path from 'node:path';
// the one canonical list (packages/ui/src/products.ts, D37/D40): the rail and the menu are checked against it for drift
const { checkProductOrder, PRODUCT_NAMES } = await import(path.join(repo, 'packages/ui/src/products.ts'));
const { ok, open, main, done } = await harness('demo-phoneshell');

for (const w of [360, 390, 768]) {
  const t = await open('#/campus/scouter', { role: 'architect', w, h: 800 }); const p = t.page;
  // QUALITY_UPLIFT shell: there is no inline product rail any more (products live in the More sheet at every width); on a phone the
  // role's rail is the bottom tab bar and the bar carries no product row
  const m = await p.evaluate(() => ({ top: Math.round(document.getElementById('main').getBoundingClientRect().top), over: document.documentElement.scrollWidth - innerWidth, emblem: !!document.querySelector('header .shell__emblem')?.naturalWidth, rail: document.querySelectorAll('.shell__rail').length, more: !!document.querySelector('[data-testid=hometabs] [data-testid=menu-open]') }));
  ok(`P-${w}-01`, `${w} px: the header takes ${m.top} px before content (< 120), the emblem loads, products sit behind More in the tab bar`, m.top < 120 && m.emblem && m.rail === 0 && m.more, JSON.stringify(m));
  ok(`P-${w}-02`, `${w} px: no sideways scroll`, m.over <= 0, m.over);
  const small = await p.$$eval('header button, header a, [data-testid=hometabs] a, [data-testid=hometabs] button', (els) => els.filter((e) => e.offsetParent && getComputedStyle(e).display !== 'none').map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 14) || e.className, w: Math.round(r.width), h: Math.round(r.height) }; }).filter((r) => r.w < 44 || r.h < 44));
  ok(`P-${w}-03`, `${w} px: every header and tab target is at least 44 × 44`, !small.length, JSON.stringify(small));
  const tabs = await p.evaluate(() => { const n = document.querySelector('[data-testid=hometabs]'); const r = n.getBoundingClientRect(); return { pos: getComputedStyle(n).position, bottom: Math.round(innerHeight - r.bottom) }; });
  ok(`P-${w}-04`, `${w} px: the role’s home tabs are the bottom bar`, tabs.pos === 'fixed' && tabs.bottom <= 1, JSON.stringify(tabs));
  await p.click('[data-testid=menu-open]'); await p.waitForSelector('[data-testid=menu]');
  const menu = await p.evaluate(() => { const d = document.querySelector('[data-testid=menu]'); return { role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), inside: d.contains(document.activeElement), products: Array.from(d.querySelectorAll('.drawer__product > a')).map((a) => ({ n: a.querySelector('.drawer__pn').textContent, purpose: !!a.querySelector('.drawer__pp')?.textContent, mark: getComputedStyle(a.querySelector('.pmark')).backgroundColor })), scouter: !!Array.from(d.querySelectorAll('.drawer__pages a')).find((a) => /Scouter/.test(a.textContent)), theme: !!d.querySelector('[data-testid=theme-switch]') }; });
  const names = menu.products.map((x) => x.n.replace(' (current)', ''));
  ok(`P-${w}-05`, `${w} px: the menu is a dialog listing the nine products in canonical order with colour and purpose, the current one marked in words`, menu.role === 'dialog' && menu.modal === 'true' && menu.inside && !checkProductOrder(names, { requireAll: false }).length && names.length >= 7 && menu.products.every((x) => x.purpose) && new Set(menu.products.map((x) => x.mark)).size === menu.products.length && menu.products.some((x) => /\(current\)/.test(x.n) && /Lite/.test(x.n)), JSON.stringify(menu));
  ok(`P-${w}-06`, `${w} px: Scouter is listed under Lite and the theme choice is in the menu`, menu.scouter && menu.theme);
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  ok(`P-${w}-07`, `${w} px: Escape closes the menu and focus returns to the menu button`, await p.locator('[data-testid=menu]').count() === 0 && await p.evaluate(() => document.activeElement?.dataset.testid) === 'menu-open');
  let reached = 0; const missed = [];
  for (let i = 0; i < menu.products.length; i++) {
    await p.click('[data-testid=menu-open]'); await p.locator('.drawer__product > a').nth(i).click(); await p.waitForTimeout(350);
    if (await p.locator('[data-testid=access-page], [data-testid=not-found]').count() === 0 && (await main(p)).length > 20 && await p.locator('[data-testid=menu]').count() === 0) reached += 1; else missed.push(menu.products[i].n);
  }
  ok(`P-${w}-08`, `${w} px: every product is reached in two taps (menu, product)`, reached === menu.products.length, missed.join(','));
  await p.click('[data-testid=menu-open]'); await p.click('[data-testid=menu] [data-theme-choice=light]'); await p.waitForTimeout(100);
  const th = await p.evaluate(() => ({ t: document.documentElement.dataset.theme, s: localStorage.getItem('empathia.theme') })); await p.keyboard.press('Escape');
  ok(`P-${w}-09`, `${w} px: the theme choice works from the menu and is remembered`, th.t === 'light' && th.s === 'light', JSON.stringify(th));
  await p.click('[data-testid=viewas-open]');
  ok(`P-${w}-10`, `${w} px: View as is one tap away`, await p.locator('[data-testid=viewas-sheet]').count() === 1); await p.keyboard.press('Escape');
  await p.click('.find__btn'); await p.waitForTimeout(80); await p.keyboard.type('which camera'); await p.waitForTimeout(150);
  const opt = await p.locator('#find-list [role=option]').first().innerText().catch(() => ''); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok(`P-${w}-11`, `${w} px: find expands from its button and answers “which camera” with Scouter`, /Scouter/.test(opt) && /#\/campus\/scouter/.test(p.url()), opt);
  // QUALITY_UPLIFT: the per-page note row is gone; the bar carries a small "Synthetic data" chip and the footer one synthetic-data line
  ok(`P-${w}-12`, `${w} px: the synthetic-data chip stays in the bar on one line, and no note row stacks above the page`, await p.evaluate(() => { const n = document.querySelector('header .synth-chip'); return !!n && n.getBoundingClientRect().height < 30 && /Synthetic data/.test(n.textContent) && !document.querySelector('.shell__note'); }));
  ok(`P-${w}-13`, `${w} px: no console error`, !t.errs.length, t.errs.join(' | ')); await t.close();
}
{ const t = await open('#/investor', { role: 'architect', w: 1440 }); const p = t.page;
  // QUALITY_UPLIFT shell (V2.5.3 aurora): the role's tabs are a left icon rail on desktop, ending in More; the products are switched
  // through More (the product sheet) instead of an inline row, so the sheet is what keeps the canonical order now
  const d = await p.evaluate(() => { const r = document.querySelector('[data-testid=hometabs]').getBoundingClientRect(); return { left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), vh: innerHeight, tabs: document.querySelectorAll('[data-testid=hometabs] .hometab').length, menu: 0, theme: getComputedStyle(document.querySelector('header [data-testid=theme-switch]')).display, find: getComputedStyle(document.querySelector('.find__box')).display, bell: !!document.querySelector('header [data-testid=notifications]') }; });
  await p.click('[data-testid=menu-open]'); d.menu = await p.locator('.drawer__product').count();
  const order = await p.$$eval('.drawer__product > a .drawer__pn', (a) => a.map((x) => x.textContent.replace(' (current)', '').trim())); await p.keyboard.press('Escape');
  // every product with a registered page (nine once the spaces and ops slices have landed theirs)
  ok('P-1440-01', 'desktop: a left icon rail (the role’s tabs + More), the theme switch, find and notifications in the bar, every product in More', d.left === 0 && d.w < 120 && d.h > d.vh * 0.8 && d.tabs >= 3 && d.menu >= 8 && d.theme !== 'none' && d.find !== 'none' && d.bell, JSON.stringify(d));
  ok('P-1440-02', 'desktop: the product sheet keeps the canonical order of packages/ui products.ts (D37/D40), no drift', !checkProductOrder(order, { requireAll: false }).length && order.every((n) => PRODUCT_NAMES.includes(n)), checkProductOrder(order, { requireAll: false }).join('; ') || order.join(','));
  ok('P-1440-03', 'desktop: no sideways scroll, no console error', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && !t.errs.length, t.errs.join(' | '));
  // QUALITY_UPLIFT checks: route focus lands on the h1 without a ring (mouse and keyboard), the synthetic line appears once, the bell works
  const ring = async () => p.evaluate(() => { const a = document.activeElement; return { tag: a?.tagName, ring: a ? getComputedStyle(a).outlineStyle : '' }; });
  await p.locator('[data-testid=hometabs] a', { hasText: 'Campus' }).click(); await p.waitForTimeout(500); const r1 = await ring();
  await p.locator('[data-testid=hometabs] a', { hasText: 'Search' }).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(500); const r2 = await ring();
  ok('P-1440-04', 'desktop: after navigating from the rail (mouse, then keyboard) the h1 has focus and draws no ring', r1.tag === 'H1' && r1.ring === 'none' && r2.tag === 'H1' && r2.ring === 'none', JSON.stringify([r1, r2]));
  const once = await p.evaluate(() => ({ tags: [...document.querySelectorAll('.ui-tag, .synth-chip')].filter((e) => /synthetic data/i.test(e.textContent)).map((e) => e.closest('header') ? 'bar' : e.closest('footer') ? 'foot' : 'page'), banner: /DEMONSTRATION · SYNTHETIC DATA/.test(document.body.innerText), stacked: !!document.querySelector('.shell__role, .greet, .shell__note') }));
  ok('P-1440-05', 'desktop: one chip in the bar and one footer line say “Synthetic data”; no per-page banner, no greeting/breadcrumb row', once.tags.join() === 'bar,foot' && !once.banner && !once.stacked, JSON.stringify(once));
  await p.click('[data-testid=notifications]'); const np = await p.evaluate(() => ({ open: !!document.getElementById('notes-panel'), items: document.querySelectorAll('#notes-panel li').length, label: document.querySelector('[data-testid=notifications]').getAttribute('aria-label') }));
  await p.keyboard.press('Escape'); const nb = await p.evaluate(() => ({ closed: !document.getElementById('notes-panel'), focus: document.activeElement?.dataset.testid }));
  ok('P-1440-06', 'desktop: notifications open a panel of the open service incidents (counted from the records, named in the button), Escape closes it and returns focus', np.open && new RegExp(`: ${np.items} open service`).test(np.label) && nb.closed && nb.focus === 'notifications', JSON.stringify({ ...np, ...nb }));
  await p.keyboard.press('/'); await p.waitForTimeout(60); ok('P-1440-07', 'desktop: “/” focuses quick find', await p.evaluate(() => document.activeElement?.id) === 'find-in');
  await t.close(); }
await done();
