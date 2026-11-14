#!/usr/bin/env node
// Field engineer UX on a phone (40/10 directive: "field workspace"; FIELD_ENGINEER_UX_QA.md). On the pages a field engineer uses on site,
// at 390 × 844: nothing scrolls sideways; every visible control in the page is at least 24 × 24 CSS px (WCAG 2.2 target size, AA) and the
// share at the comfortable 44 px is reported; every control has a name a screen reader can say; no console error; nothing leaves the page.
//   node tests/browser/demo-field-ux.test.mjs
import fs from 'node:fs'; import path from 'node:path';
import { harness, repo } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-field-ux');
const PAGES = [
  ['#/commissioning/room/R-ATL-4-218', 'installer', 'the room record with its registers'],
  ['#/commissioning/deficiencies', 'cxeng', 'the deficiency workbench'],
  ['#/commissioning/instruments/reverb', 'cxeng', 'the reverberation instrument'],
  ['#/commissioning/instruments/sti', 'cxeng', 'the STI workflow'],
  ['#/v25/asset?a=AS-0112', 'service', 'an asset’s life'],
  ['#/v25/service', 'service', 'ServiceHands as the technician'],
  ['#/request', 'employee', 'the 45-second request'],
];
const evidence = [];
for (const [hash, role, what] of PAGES) {
  const t = await open(hash, { role, sw: false, w: 390, h: 844 }); const p = t.page; await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const vis = (el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && !el.closest('[hidden],[inert],details:not([open]) > :not(summary)'); };
    const els = [...document.querySelectorAll('main button, main a[href], main input:not([type=hidden]), main select, main summary, main [role=button], main [role=radio], main [role=tab]')].filter(vis);
    const name = (el) => (el.getAttribute('aria-label') || el.labels?.[0]?.textContent || el.closest('label')?.textContent || el.textContent || el.getAttribute('title') || el.getAttribute('placeholder') || el.getAttribute('alt') || '').trim();
    const sizeOf = (el) => { const b = (el.matches('input[type=checkbox],input[type=radio],input[type=file]') && el.closest('label')) ? el.closest('label').getBoundingClientRect() : el.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; };
    const inline = (el) => el.tagName === 'A' && getComputedStyle(el).display === 'inline' && (el.parentElement?.textContent || '').trim().length > (el.textContent || '').trim().length + 2;   // a link inside a sentence is exempt (WCAG 2.5.8 inline exception)
    const small = els.filter((el) => !inline(el)).map((el) => [el, sizeOf(el)]).filter(([, [w, h]]) => w < 24 || h < 24).map(([el, s]) => `${el.tagName.toLowerCase()} “${name(el).slice(0, 30)}” ${s.join('×')}`);
    const comfy = els.filter((el) => !inline(el)).filter((el) => { const [w, h] = sizeOf(el); return w >= 44 && h >= 44; }).length;
    const unnamed = els.filter((el) => !name(el)).map((el) => el.outerHTML.slice(0, 80));
    return { over: document.documentElement.scrollWidth - document.documentElement.clientWidth, n: els.length, small, comfy, unnamed };
  });
  evidence.push({ page: hash, role, what, ...r });
  ok(`FU ${hash}`, `${what} on a phone: no sideways scroll; every control at least 24 px and named`, r.over <= 0 && !r.small.length && !r.unnamed.length && !t.errs.length && !t.off.length,
    `overflow ${r.over} · ${r.n} controls, ${r.comfy} at 44 px · small: ${r.small.slice(0, 3).join(', ')} · unnamed: ${r.unnamed.slice(0, 2).join(', ')} ${t.errs.slice(0, 1)}`);
  await t.close();
}
fs.mkdirSync(path.join(repo, 'tests/evidence'), { recursive: true }); fs.writeFileSync(path.join(repo, 'tests/evidence/demo-field-ux.json'), JSON.stringify({ at: new Date().toISOString(), viewport: '390x844', pages: evidence }, null, 1));
await done();
