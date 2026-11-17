#!/usr/bin/env node
// Engineer start (#/engineer; V2.5.5 Engineer Edition, read statically on 16 Nov 2026): three inspection demonstrations with their
// sheets, and faults an engineering persona injects to see how a step fails.
//   ES-01  the systems engineer sees the three demonstrations, no fault injected, and each inspection sheet with its six parts
//   ES-02  a designer may read the page but not inject a fault: the refusal says who can
//   ES-03  with "missing geometry" injected, Build a Room refuses a new room with the fault's reason and creates nothing
//   ES-04  switched off again, the same room is created
//   ES-05  phone width: nothing scrolls sideways; an employee is not admitted; no console error; nothing requested off the page
//   node tests/browser/demo-engineer-start.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-engineer-start');
const t = await open('#/engineer', { role: 'syseng', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
const as = async (role, hash) => { await p.evaluate(([r, h]) => { localStorage.setItem('empathia.demo.perspective', r); location.hash = h; }, [role, hash]); await p.reload(); await p.waitForTimeout(350); };
await p.evaluate(() => { for (const k of ['empathia.demo.faults.v1', 'empathia.demo.build.v1']) localStorage.removeItem(k); for (const k of Object.keys(localStorage)) if (/^empathia\.demo\.(build|draft)/.test(k)) localStorage.removeItem(k); }); await p.reload();

{ await p.getByTestId('engineer-start').waitFor();
  const cards = await p.locator('[data-testid^=eng-card-]').count(); const status = await p.getByTestId('eng-status').innerText();
  await p.locator('[data-testid=eng-card-cx] a:has-text("Read the inspection sheet")').click(); await p.waitForTimeout(300);
  const sheet = await p.getByTestId('eng-sheet-cx').innerText(); const openNow = await p.getByTestId('eng-sheet-cx').evaluate((d) => d.open);
  ok('ES-01', 'three demonstrations, no fault injected, and an inspection sheet with its six parts', cards === 3 && /none/.test(status) && openNow && ['What to inspect', 'Evidence states', 'Security boundary', 'Source references', 'Tests that cover it', 'Failure handling'].every((x) => sheet.includes(x)) && /PASS_VERIFIED/.test(sheet) && /lifecycle\.ts/.test(sheet), status.slice(0, 80)); }

{ await as('designer', '#/engineer'); await p.getByTestId('eng-fault-missingGeometry').click(); await p.waitForTimeout(200);
  const why = await p.getByTestId('eng-refused').innerText();
  ok('ES-02', 'a designer reads the page but may not inject a fault', /does not inject faults/.test(why) && (await p.locator('[data-fault=missingGeometry]').getAttribute('data-on')) === 'no', why.slice(0, 120)); }

const create = async () => { await p.waitForSelector('#b-length'); await p.fill('#b-length', '5'); await p.fill('#b-width', '4'); await p.click('button:has-text("Create the room")'); await p.waitForTimeout(400); };
{ await as('syseng', '#/engineer'); await p.getByTestId('eng-fault-missingGeometry').click(); await p.waitForTimeout(200);
  const status = await p.getByTestId('eng-status').innerText();
  await p.getByTestId('eng-go-design').click(); await p.waitForTimeout(800); await create();
  const refusal = (await p.locator('[role=alert]').allInnerTexts()).join(' '); const made = await p.locator('.build__state').count();
  ok('ES-03', 'with missing geometry injected, a new room is refused with the fault’s reason and nothing is created', /Missing geometry/.test(status) && /fault injected \(missing geometry\)/.test(refusal) && made === 0 && /#\/v25\/build/.test(await p.evaluate(() => location.hash)), refusal.slice(0, 140)); }

{ await as('syseng', '#/engineer'); await p.getByTestId('eng-fault-missingGeometry').click(); await p.waitForTimeout(200);
  const off = /none/.test(await p.getByTestId('eng-status').innerText());
  await p.getByTestId('eng-go-design').click(); await p.waitForTimeout(800); await create();
  ok('ES-04', 'switched off again, the same room is created', off && (await p.locator('.build__state').count()) === 1, (await p.locator('[role=alert]').allInnerTexts()).join(' ').slice(0, 120));
  ok('ES-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (/^empathia\.demo\.(faults|build|draft)/.test(k)) localStorage.removeItem(k); }); }
await t.close();
{ const m = await open('#/engineer', { role: 'cxeng', sw: false, w: 390, h: 844 }); await m.page.getByTestId('engineer-start').waitFor();
  const sw = await m.page.evaluate(() => document.documentElement.scrollWidth - innerWidth); await m.close();
  const e = await open('#/engineer', { role: 'employee', sw: false }); await e.page.waitForTimeout(1500); const denied = !(await e.page.getByTestId('engineer-start').count()); await e.close();
  ok('ES-05', 'phone width: nothing scrolls sideways; an employee is not admitted', sw <= 1 && denied, `overflow ${sw}px · denied ${denied}`); }
await done();
