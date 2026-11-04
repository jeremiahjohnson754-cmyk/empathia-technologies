#!/usr/bin/env node
// Destructive-action safeguards: every action in the SAFEGUARDS registry (apps/demo/src/safeguards/Safeguards.tsx) is driven here. Each
// opens a modal dialog (role=dialog, aria-modal, labelled and described) naming the object; a named safeguard keeps its button disabled
// until the exact name is typed (case matters); Escape and Cancel change nothing and return focus to the opener; Tab stays inside; an
// irreversible action says it cannot be undone; a reversible one offers Undo, which restores the previous state exactly. 390/768/1440.
//   node tests/browser/demo-destructive.test.mjs
import fs from 'node:fs'; import path from 'node:path';
import { suite, repo } from './demo-ops-harness.mjs';
const KEYS = [...fs.readFileSync(path.join(repo, 'apps/demo/src/safeguards/Safeguards.tsx'), 'utf8').matchAll(/\{ key: '([a-z.]+)', area/g)].map((m) => m[1]);
await suite('demo-destructive', 4489, async ({ ok, open, goto, smallTargets, clearState, VIEWPORTS }) => {
  const WS = (page) => page.evaluate(() => localStorage.getItem('empathia.demo.workspace.v1'));
  const DS = (page) => page.evaluate(() => localStorage.getItem('empathia.demo.decisions.v1'));
  const covered = new Set();
  for (const [w, hgt, tag] of VIEWPORTS) {
    const { ctx, page, errs, ext } = await open(w, hgt);
    await goto(page, '#/service', 'svcmgr'); await clearState(page); await page.reload(); await page.waitForSelector('[data-testid=dispatch]');
    /** Opens the dialog with `opener`, checks semantics, wrong name, Escape, Tab; returns after the dialog is closed again. */
    const probe = async (key, opener, object, read) => {
      covered.add(key); const before = await read();
      await page.locator(opener).first().click(); await page.waitForSelector('[data-testid=confirm-dialog]');
      const d = await page.evaluate(() => { const x = document.querySelector('[data-testid=confirm-dialog]'); return { role: x.getAttribute('role'), modal: x.getAttribute('aria-modal'), lab: !!document.getElementById(x.getAttribute('aria-labelledby')), desc: !!document.getElementById(x.getAttribute('aria-describedby')), key: x.dataset.safeguard, inside: x.contains(document.activeElement), text: x.innerText }; });
      ok(`DD-${tag}-${key}-1`, `${key}: a modal dialog, labelled and described, names the object and takes focus`, d.role === 'dialog' && d.modal === 'true' && d.lab && d.desc && d.key === key && d.inside && (!object || d.text.includes(object)), JSON.stringify({ ...d, text: d.text.slice(0, 120) }));
      if (object) { await page.fill('[data-testid=confirm-name]', object.toUpperCase() === object ? object.toLowerCase() : object.toUpperCase());
        ok(`DD-${tag}-${key}-2`, `${key}: a name that differs (case included) keeps the action disabled`, await page.locator('[data-testid=confirm-go]').isDisabled()); }
      for (let k = 0; k < 8; k++) await page.keyboard.press('Tab');
      ok(`DD-${tag}-${key}-3`, `${key}: Tab stays inside the dialog`, await page.evaluate(() => document.querySelector('[data-testid=confirm-dialog]').contains(document.activeElement)));
      await page.keyboard.press('Escape'); await page.waitForTimeout(80);
      ok(`DD-${tag}-${key}-4`, `${key}: Escape closes it, nothing changes, focus returns to the opener`, (await page.locator('[data-testid=confirm-dialog]').count()) === 0 && before === await read() && await page.evaluate((o) => document.activeElement === document.querySelector(o), opener));
      await page.locator(opener).first().click(); await page.waitForSelector('[data-testid=confirm-dialog]');
      return d;
    };
    const confirmIt = async (object, reason) => { if (reason) await page.fill('[data-testid=confirm-reason]', reason); if (object) await page.fill('[data-testid=confirm-name]', object); await page.click('[data-testid=confirm-go]'); await page.waitForTimeout(150); };
    const undoes = async (key, read, before) => { ok(`DD-${tag}-${key}-5`, `${key}: Undo is offered and restores the previous state exactly`, (await page.locator('[data-testid=undo]').count()) === 1 && (await page.click('[data-testid=undo]'), await page.waitForTimeout(120), before === await read())); };

    // dispatch.reset
    await page.click('[data-job=ISS-0417]'); await page.click('[data-testid=triage]'); await page.waitForTimeout(100);
    let before = await WS(page); await probe('dispatch.reset', '[data-testid=reset-workspace]', 'reset workspace', () => WS(page));
    await confirmIt('reset workspace'); ok(`DD-${tag}-dispatch.reset-6`, 'dispatch.reset: the workspace is back at the seed', !JSON.parse(await WS(page)).events.some((e) => e.type === 'service.triaged'));
    await undoes('dispatch.reset', () => WS(page), before);
    // dispatch.unassign
    await goto(page, '#/service?id=ISS-0421', 'svcmgr'); await page.locator('[data-eligible=true] [data-testid=assign]').first().click(); await page.waitForTimeout(120);
    before = await WS(page); await probe('dispatch.unassign', '[data-testid=withdraw]', null, () => WS(page));
    ok(`DD-${tag}-dispatch.unassign-r`, 'dispatch.unassign: the action needs a reason before it works', await page.locator('[data-testid=confirm-go]').isDisabled());
    await confirmIt(null, 'Technician called to another site'); ok(`DD-${tag}-dispatch.unassign-6`, 'dispatch.unassign: the job is back to ready-to-assign', /TRIAGED/.test(await page.locator('[data-testid=job-detail]').innerText()));
    await undoes('dispatch.unassign', () => WS(page), before);
    // servicehands.cancel (the work order is assigned again by the Undo above)
    const wo = JSON.parse(await WS(page)).incidents.find((i) => i.id === 'ISS-0421').workOrderId;
    await goto(page, `#/servicehands/wo/${wo}`, 'svcmgr'); before = await WS(page);
    const dc = await probe('servicehands.cancel', '[data-testid=cancel-wo]', wo, () => WS(page));
    ok(`DD-${tag}-servicehands.cancel-u`, 'servicehands.cancel: says it can be undone', /You can undo this/.test(dc.text));
    await confirmIt(wo, 'Requester withdrew the request'); ok(`DD-${tag}-servicehands.cancel-6`, 'servicehands.cancel: the incident is CANCELLED and the record kept', /CANCELLED/.test(await page.locator('main').innerText()) && /record and its history are kept/.test(await page.locator('main').innerText()));
    await undoes('servicehands.cancel', () => WS(page), before);
    // servicehands.close on a resolved incident (ISS-0402 is RESOLVED in the seed): irreversible, says so
    await goto(page, '#/servicehands?id=ISS-0402', 'svcmgr'); await page.selectOption('[data-testid=rc-code]', 'RC-NETWORK'); await page.fill('[data-testid=rc-root]', 'Access switch port profile reverted'); await page.click('[data-testid=rc-save]'); await page.waitForTimeout(80);
    await page.check('[data-testid=cl-confirmed]');
    const dl = await probe('servicehands.close', '[data-testid=close]', 'ISS-0402', () => WS(page));
    ok(`DD-${tag}-servicehands.close-n`, 'servicehands.close: says it cannot be undone', /cannot be undone/.test(dl.text));
    await confirmIt('ISS-0402'); ok(`DD-${tag}-servicehands.close-6`, 'servicehands.close: CLOSED, and no Undo is offered for an irreversible action', /CLOSED/.test(await page.locator('main').innerText()) && (await page.locator('[data-testid=undo]').count()) === 0);
    // decisions.reject (irreversible), decisions.reset, decisions.withdraw
    await goto(page, '#/v25/decisions', 'exec'); const twn = page.locator('[data-project=PRJ-NST-TWN]'); await twn.locator('[data-testid=dec-reason]').fill('Out of scope for this financial year');
    const dr = await probe('decisions.reject', '[data-project=PRJ-NST-TWN] [data-testid=dec-reject]', 'PRJ-NST-TWN', () => DS(page));
    ok(`DD-${tag}-decisions.reject-n`, 'decisions.reject: says it cannot be undone', /cannot be undone/.test(dr.text)); await confirmIt('PRJ-NST-TWN');
    before = await DS(page); await probe('decisions.reset', '[data-testid=reset-decisions]', 'reset decisions', () => DS(page)); await confirmIt('reset decisions');
    ok(`DD-${tag}-decisions.reset-6`, 'decisions.reset: the rejection is gone (back at the seed)', !/REJECTED/.test(await page.locator('[data-testid=decision-log]').innerText()));
    await undoes('decisions.reset', () => DS(page), before);
    await goto(page, '#/decisions', 'architect'); before = await DS(page);
    await probe('decisions.withdraw', '[data-memory=DEC-0003] [data-testid=mem-withdraw]', null, () => DS(page)); await confirmIt(null);
    ok(`DD-${tag}-decisions.withdraw-6`, 'decisions.withdraw: the decision is withdrawn', (await page.locator('[data-memory=DEC-0003]').count()) === 0);
    await undoes('decisions.withdraw', () => DS(page), before);
    // replay.apply
    await goto(page, '#/replay/R-ATL-4-218', 'svcmgr'); before = await WS(page);
    await probe('replay.apply', '[data-testid=rp-apply]', 'R-ATL-4-218', () => WS(page)); await confirmIt('R-ATL-4-218');
    ok(`DD-${tag}-replay.apply-6`, 'replay.apply: the scenario changed the workspace', before !== await WS(page));
    await undoes('replay.apply', () => WS(page), before);
    // labs.reset (needs a result first)
    await page.evaluate(() => localStorage.setItem('empathia.demo.labs.v1', JSON.stringify({ v: 1, results: { 'svcmgr:hear': { lab: 'hear', title: 'Audio Lab', domain: 'Audio', passed: true, at: new Date().toISOString(), persona: 'svcmgr', attempts: 1, mode: 'simulator' } } })));
    await goto(page, '#/learn/labs', 'svcmgr'); await page.waitForSelector('[data-testid=labs-reset]:not([disabled])', { timeout: 8000 });
    const LS = () => page.evaluate(() => localStorage.getItem('empathia.demo.labs.v1')); before = await LS();
    await probe('labs.reset', '[data-testid=labs-reset]', 'clear results', LS); await confirmIt('clear results');
    ok(`DD-${tag}-labs.reset-6`, 'labs.reset: the results are cleared', !/svcmgr:hear/.test(await LS()));
    await undoes('labs.reset', LS, before);
    if (tag === 'phone') { await page.click('[data-testid=labs-reset]'); await page.waitForSelector('[data-testid=confirm-dialog]'); const s = await smallTargets(page); ok(`DD-${tag}-44`, 'dialog controls are at least 44 px tall on a phone and the dialog fits the screen', !s.length && await page.evaluate(() => { const r = document.querySelector('.sg-dialog').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), s.join(' | ')); await page.keyboard.press('Escape'); }
    ok(`DD-${tag}-99`, 'no page error, no console error, no request leaves the page', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
    await ctx.close();
  }
  ok('DD-registry', 'every destructive action in the registry was driven by this suite', KEYS.length >= 9 && KEYS.every((k) => covered.has(k)), `${KEYS.filter((k) => !covered.has(k)).join(', ')} not covered of ${KEYS.join(', ')}`);
});
