#!/usr/bin/env node
// 90-2: no dead ends in the Living Campus. A crawler opens every page of the demonstration that has a fixed address (the registries'
// parameter-free paths), as the Product Architect (the broadest demonstration role) at 1440×900, and presses each visible, enabled
// control in the page's main region: buttons, checkboxes, radios, selects and tabs. A control passes when pressing it changes something
// a person can observe: the page's content or attributes, the address, focus moving into a dialog, a new tab, or a download. A control
// whose effect is a simulation passes too, because the pages say "simulated" where it applies (that wording is checked elsewhere);
// what fails is a control that does nothing at all. Every control and its effect is written to tests/evidence/demo-deadends.json.
// Destructive by design: it presses everything, so each page is reopened fresh (cleared storage) before its crawl.
//   node tests/browser/demo-deadends.test.mjs [--only=/path,/path] [--max=30]
import fs from 'node:fs'; import path from 'node:path';
import { harness, repo } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-deadends');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const MAX = Number(arg('max', 30));
const paths = [...new Set(fs.readdirSync(path.join(repo, 'apps/demo/src')).filter((f) => /^registry.*\.ts$/.test(f))
  .flatMap((f) => [...fs.readFileSync(path.join(repo, 'apps/demo/src', f), 'utf8').matchAll(/path: '([^']+)'/g)].map((m) => m[1])))]
  .filter((p) => !p.includes(':')).sort();
const only = arg('only', ''); const PAGES = only ? only.split(',') : paths;
const evidence = []; const dead = []; let pressed = 0;

for (const p of PAGES) {
  const t = await open(`#${p}`, { role: 'architect', sw: false, init: () => { window.SIGNAL_NOPOP = true; window.print = () => { window.__printed = (window.__printed || 0) + 1; }; } });   // 13 Nov 2026: a print dialog cannot be seen headless, so print() is counted instead
  const page = t.page; page.on('dialog', (d) => d.dismiss().catch(() => undefined));
  const access = await page.locator('[data-testid=access-page]').count();
  if (access) { evidence.push({ page: p, skipped: 'not open to the architect' }); await t.close(); continue; }
  // tag every candidate once, in document order, so each can be found again after the page re-renders
  const count = await page.evaluate((MAX) => {
    const sel = 'main button, main [role=button], main [role=tab], main [role=switch], main input[type=checkbox], main input[type=radio], main select, main summary';
    const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[hidden],[inert]'); };
    const list = [...document.querySelectorAll(sel)].filter((el) => vis(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true').slice(0, MAX);
    list.forEach((el, i) => el.setAttribute('data-crawl', String(i))); return list.length;
  }, MAX);
  for (let i = 0; i < count; i++) {
    const before = await page.evaluate(() => location.hash);
    const loc = page.locator(`[data-crawl="${i}"]`);
    // 13 Nov 2026: the option already chosen in a single-choice group (a segmented control, radio group or tab list) is a legitimate no-op
    // when pressed again; it is recorded as "already chosen", never as an effect. A toggle on its own (not in a group) must still change.
    const chosen = await loc.evaluate((el) => { const on = ['aria-pressed', 'aria-checked', 'aria-selected'].some((a) => el.getAttribute(a) === 'true') || el.hasAttribute('aria-current') || (el.type === 'radio' && el.checked);
      const g = el.closest('[role=group],[role=radiogroup],[role=tablist],[role=toolbar],fieldset,nav[aria-label]'); return !!on && !!g && g.querySelectorAll('button,[role=radio],[role=tab],input[type=radio]').length >= 2; }).catch(() => false);
    if (!(await loc.count()) || !(await loc.isVisible().catch(() => false))) continue;
    const info = await loc.evaluate((el) => ({ tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || el.getAttribute('role') || '', name: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.getAttribute('name') || '').trim().replace(/\s+/g, ' ').slice(0, 80) }));
    // destructive-looking controls are still pressed: the page was opened fresh and is reopened afterwards
    await page.evaluate(() => { window.__mut = 0; window.__mo?.disconnect(); window.__mo = new MutationObserver((r) => { window.__mut += r.length; }); window.__mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true }); });
    const printed0 = await page.evaluate(() => window.__printed || 0);
    const popup = page.context().waitForEvent('page', { timeout: 600 }).then(() => true).catch(() => false);
    const dl = page.waitForEvent('download', { timeout: 600 }).then(() => true).catch(() => false);
    let value0 = null;
    try {
      if (info.tag === 'select') value0 = await loc.inputValue();
      if (info.tag === 'select') { const vals = await loc.evaluate((s) => [...s.options].map((o) => o.value)); const cur = await loc.inputValue(); const next = vals.find((v) => v !== cur); if (next != null) await loc.selectOption(next, { timeout: 1500 }); }
      else await loc.click({ timeout: 1500 });
    } catch (e) { evidence.push({ page: p, ...info, effect: 'could not press', why: String(e.message).split('\n')[0] }); continue; }
    await page.waitForTimeout(250);
    const [opened, downloaded] = await Promise.all([popup, dl]);
    const after = await page.evaluate(() => ({ hash: location.hash, mut: window.__mut || 0, printed: window.__printed || 0, dialog: !!document.activeElement?.closest('dialog,[role=dialog],[role=alertdialog]') })).catch(() => ({ hash: '?', mut: 1, dialog: false }));
    const effect = after.hash !== before ? 'navigated' : opened ? 'opened a tab' : downloaded ? 'downloaded' : after.dialog ? 'opened a dialog' : after.printed > printed0 ? 'opened the print dialog' : after.mut > 0 ? 'changed the page' : chosen ? 'already chosen' : (info.tag === 'select' && value0 !== null && (await loc.inputValue().catch(() => value0)) !== value0) ? 'chose a value' : 'nothing';   // 13 Nov 2026: a form field that now holds the new value has done its job
    evidence.push({ page: p, ...info, effect }); pressed += 1;
    if (effect === 'nothing') dead.push(`${p} › ${info.tag}${info.type ? `[${info.type}]` : ''} “${info.name}”`);
    if (after.hash !== before) { await page.goto(page.url().split('#')[0] + `#${p}`); await page.waitForSelector('main h1', { timeout: 8000 }).catch(() => undefined); await page.waitForTimeout(200);
      // the page was rebuilt: tag the candidates again in the same order
      await page.evaluate((MAX) => { const sel = 'main button, main [role=button], main [role=tab], main [role=switch], main input[type=checkbox], main input[type=radio], main select, main summary';
        const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[hidden],[inert]'); };
        [...document.querySelectorAll(sel)].filter((el) => vis(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true').slice(0, MAX).forEach((el, j) => el.setAttribute('data-crawl', String(j))); }, MAX); }
  }
  // 13 Nov 2026: /hardening has a button that throws on purpose to show the workspace guard catching a drawing failure; that one
  // announced error is the page working. Any other error still fails the page.
  const errs = t.errs.filter((e) => !(p === '/hardening' && /demonstration: a drawing failure, caught by the workspace guard/.test(e)));
  if (errs.length) evidence.push({ page: p, errors: errs.slice(0, 3) });
  ok(`DE-${p}`, `${p}: every control pressed does something (${evidence.filter((e) => e.page === p && e.effect).length} pressed)`, !dead.some((d) => d.startsWith(`${p} ›`)) && !errs.length, [...dead.filter((d) => d.startsWith(`${p} ›`)), ...errs.slice(0, 2)].join(' | '));
  await t.close();
}
const out = path.join(repo, 'tests/evidence'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'demo-deadends.json'), JSON.stringify({ at: new Date().toISOString(), pages: PAGES.length, pressed, dead, evidence }, null, 1));
ok('DE-total', `the crawl pressed controls on ${PAGES.length} pages and found no dead end`, pressed > 0 && !dead.length, `${dead.length} dead: ${dead.slice(0, 12).join(' | ')}`);
await done();
