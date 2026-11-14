#!/usr/bin/env node
// "Waiting for you" on each working role's start page (founder, 14 Nov 2026: mission control centred on the work needing to be done).
//   WF-01  the service manager's page already opens on the triage (no second 'waiting' list)
//   WF-02  the installer sees the deficiency they own to fix, and the systems engineer sees one whose retest passed to verify and close
//   WF-03  an intelligibility exception waiting for approval reaches the systems engineer
//   WF-04  a role nothing waits on is told so
//   node tests/browser/demo-waiting.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-waiting');
const zone = (p) => p.locator('[data-testid=rh-zone][data-zone=waiting]');
const def = (o) => ({ id: 'R-ATL-4-220:SYN-1', title: 'Far end hears an echo', severity: 'Medium', waivable: true, owner: 'installer', openedAt: '2026-11-01T09:00:00.000Z', targetDate: '2099-01-01', rootCause: null, action: null, fixedBy: null, retest: null, exception: null, deferral: null, closedBy: null, history: [], ...o });

{ const t = await open('#/home', { role: 'svcmgr', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.evaluate(() => localStorage.removeItem('empathia.demo.workspace.v1')); await p.reload(); await p.locator('[data-testid=rh-zone]').first().waitFor();
  const first = await p.locator('[data-testid=rh-zone]').first().getAttribute('data-zone'); const w = await zone(p).count();
  ok('WF-01', 'the service manager’s page already opens on the triage; no second list is added', first === 'triage' && w === 0, `${first} · waiting ${w}`);
  await t.close(); }

{ const t = await open('#/home', { role: 'installer', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.evaluate((d) => localStorage.setItem('empathia.demo.deficiencies.v1', JSON.stringify({ [d.id]: d })), def({ state: 'IN_PROGRESS' })); await p.reload(); await zone(p).waitFor();
  const inst = await zone(p).innerText(); await t.close();
  const s = await open('#/home', { role: 'syseng', sw: false }); const q = s.page; q.setDefaultTimeout(20000);
  await q.evaluate((d) => localStorage.setItem('empathia.demo.deficiencies.v1', JSON.stringify({ [d.id]: d })), def({ state: 'PENDING_RETEST', rootCause: 'CONFIGURATION', action: 'AEC reference re-routed', fixedBy: 'installer', retest: { result: 'PASS', evidence: 'EV-0042', by: 'cxeng', at: '2026-11-14T10:00:00Z' } }));
  await q.evaluate(() => localStorage.setItem('empathia.demo.sti.v1', JSON.stringify({ exceptions: [{ id: 'IX-001', positions: ['Behind the column'], approvedBy: null, requestedBy: 'cxeng' }] })));
  await q.reload(); await zone(q).waitFor(); const sys = await zone(q).innerText();
  ok('WF-02', 'the installer sees the deficiency they own to fix; the systems engineer sees the one whose retest passed, to verify and close', /Fix: Far end hears an echo/.test(inst) && /Verify and close: Far end hears an echo/.test(sys), `${inst.slice(0, 80)} || ${sys.slice(0, 80)}`);
  ok('WF-03', 'an intelligibility exception waiting for approval reaches the systems engineer', /Approve or refuse: intelligibility exception IX-001/.test(sys));
  await s.close(); }

{ const t = await open('#/home', { role: 'cxeng', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.evaluate(() => { localStorage.removeItem('empathia.demo.deficiencies.v1'); localStorage.removeItem('empathia.demo.workspace.v1'); }); await p.reload(); await zone(p).waitFor();
  const txt = await zone(p).innerText();
  ok('WF-04', 'a role nothing waits on is told so', /Nothing waits on your role right now|Verify the fix/.test(txt), txt.slice(0, 120));
  ok('WF-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }
await done();
