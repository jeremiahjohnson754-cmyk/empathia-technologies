#!/usr/bin/env node
// Role transitions after V2.5.3: the role veil on every switch (initials, name, domain, where it lands, the role's colour, ~0.9 s;
// visual only, never focus), skipped under reduced motion and during tours; the role colour in the avatar, the header role bar, the
// current product's halo and the greeting — never the theme (D9) or the teal accent (D8); per-role home tabs from the policy.
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-rolemotion');
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };

{ const t = await open('#/campus/scouter', { role: 'architect' }); const p = t.page;
  await p.click('[data-testid=viewas-open]'); await p.click('[data-testid=viewas-sheet] [data-role-key=designer]'); await p.waitForSelector('.veil', { timeout: 2000 }).catch(() => undefined);
  const v = await p.evaluate(() => { const el = document.querySelector('.veil'); if (!el) return null; const cs = getComputedStyle(el); return { hidden: el.getAttribute('aria-hidden'), pe: cs.pointerEvents, text: el.innerText, ava: getComputedStyle(el.querySelector('.veil__ava')).backgroundColor, want: getComputedStyle(document.documentElement).getPropertyValue('--role-designer').trim(), focusInside: el.contains(document.activeElement) }; });
  ok('M-01', 'the veil shows the initials, name, domain and that the designer stays on Scouter, in the designer’s colour', v && /DE/.test(v.text) && /Designer/.test(v.text) && /Design desk · stays on Scouter/.test(v.text) && v.ava === rgb(v.want), JSON.stringify(v));
  ok('M-02', 'the veil is visual only: aria-hidden, no pointer events, never focused', v && v.hidden === 'true' && v.pe === 'none' && !v.focusInside);
  await p.waitForTimeout(1100);
  ok('M-03', 'the veil is gone after about 0.9 s', await p.locator('.veil').count() === 0);
  await p.click('[data-testid=viewas-open]'); await p.click('[data-testid=viewas-sheet] [data-role-key=visitor]'); await p.waitForTimeout(150);
  const land = await p.evaluate(() => ({ text: document.querySelector('.veil')?.innerText || '', hash: location.hash }));
  ok('M-04', 'switching to a role that cannot open the page lands on that role’s home, and the veil says where', /lands on/.test(land.text) && !/scouter/.test(land.hash) && !/access/.test(land.hash), JSON.stringify(land));
  await p.waitForTimeout(1100);
  ok('M-05', 'after landing, the visitor sees no access page', await p.locator('[data-testid=access-page]').count() === 0);
  ok('M-06', 'no console error', !t.errs.length, t.errs.join(' | ')); await t.close(); }

{ const t = await open('#/investor', { role: 'architect', reduced: true });
  await t.page.selectOption('.persp select', 'exec'); await t.page.waitForTimeout(120);
  ok('M-07', 'reduced motion: no veil, the switch still happens and is announced', await t.page.locator('.veil').count() === 0 && /Now viewing as Executive/.test(await t.page.locator('#route-announcer').innerText())); await t.close(); }

{ const t = await open('#/investor', { role: 'architect' });
  await t.page.evaluate(() => { location.hash = '#/tours/investor?scenario=7'; }); await t.page.waitForTimeout(150);
  ok('M-08', 'during a guided tour the persona follows the step without a veil', await t.page.locator('.veil').count() === 0 && await t.page.locator('[data-testid=tour]').count() === 1);
  await t.close(); }

for (const role of ['exec', 'service', 'cxeng', 'steward']) {
  const t = await open('#/campus/scouter', { role: 'ops' }); const p = t.page;
  const before = await p.evaluate(() => ({ theme: document.documentElement.dataset.theme || '', accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), bg: getComputedStyle(document.body).backgroundColor }));
  await p.selectOption('.persp select', role); await p.waitForTimeout(1200);
  const c = await p.evaluate((r) => { const want = getComputedStyle(document.documentElement).getPropertyValue(`--role-${r}`).trim(); const q = (s) => document.querySelector(s); return { want, ava: getComputedStyle(q('[data-testid=viewas-open] .ava')).backgroundColor, bar: getComputedStyle(q('.rolebar')).backgroundImage, greet: getComputedStyle(q('.greet__who')).color, halo: q('.shell__product[aria-current]') ? getComputedStyle(q('.shell__product[aria-current]')).boxShadow : 'none', theme: document.documentElement.dataset.theme || '', accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), bg: getComputedStyle(document.body).backgroundColor, tabs: Array.from(document.querySelectorAll('[data-testid=hometabs] a')).map((a) => a.textContent) }; }, role);
  const w = rgb(c.want);
  ok(`M-09-${role}`, `${role}: avatar, header role bar and greeting take the role’s colour`, c.ava === w && c.bar.includes(w) && c.greet === w, JSON.stringify(c));
  ok(`M-10-${role}`, `${role}: the theme, the page ground and the teal accent do not change with the role`, c.theme === before.theme && c.accent === before.accent && c.bg === before.bg);
  ok(`M-11-${role}`, `${role}: home tabs are the role’s own (V2.5.3 tabsFor)`, c.tabs.length >= 1, c.tabs.join(','));
  await t.close();
}
{ const t = await open('#/v25/build', { role: 'designer' });
  const halo = await t.page.evaluate(() => { const a = document.querySelector('.shell__product[aria-current]'); return { a: a?.textContent, s: a ? getComputedStyle(a).boxShadow : '', want: getComputedStyle(document.documentElement).getPropertyValue('--role-designer').trim() }; });
  ok('M-12', 'the current product carries a halo in the role’s colour', halo.a && /Lite/.test(halo.a) && /(rgba?|color)\(/.test(halo.s) && halo.s !== 'none', JSON.stringify(halo));
  await t.close(); }
await done();
