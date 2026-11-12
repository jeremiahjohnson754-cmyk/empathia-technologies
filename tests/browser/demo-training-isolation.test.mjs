#!/usr/bin/env node
// 90-6, negative authorization (founder, 12 Nov 2026): a training simulation can never change a real record. For each role that can open
// them, the suite first lets the real stores exist (ServiceHands seeds the shared workspace; Knowledge seeds the tenants' library), takes
// a byte-exact copy of every stored record, then runs every kind of training there is:
//   - the three flagship labs on their own pages (Mix the Stream with its boss clock, Light the Stage, Shoot the Service);
//   - the same labs embedded in SIGNAL S01E05, S01E07 and S01E10;
//   - Learn's instrument labs;
//   - Service Mode on a real room's case (TC-R-BCN-3-225, which is built from that room's service incident), declared twice;
//   - a SIGNAL incident run (SM-01);
//   - a timed SIGNAL drill, which the shared workspace hook records in its training list.
// Afterwards every record outside training is compared with the copy. Allowed to change: the training stores themselves (lab, story and
// Learn progress), and in the shared workspace only `training` and new ledger lines of type training.* that say they grant nothing.
// Everything else (incidents, work orders, APEX and Learn cases, staff, field sessions, licences, the tenants' knowledge, requests,
// field queue, control, connect, documents, decisions) must be byte-identical. A role that may not open a training page is refused and
// is recorded as such; the comparison still runs.
//   node tests/browser/demo-training-isolation.test.mjs
import { harness } from './demo-shell-lib.mjs';
import { unlockInit } from './signal-unlock.mjs';
const { ok, open, done } = await harness('demo-training-isolation');

// stores a training run is allowed to write (its own progress), and view preferences that are not records
const TRAINING = new Set(['empathia.mixlab.v1', 'empathia.lightlab.v1', 'empathia.videolab.v1', 'empathia.signal.story.v1', 'empathia.demo.labs.v1', 'empathia.demo.learn.v1', 'empathia.demo.lessons.v1']);
const PREFS = /^empathia\.(demo\.perspective|theme|demo\.tour\.v1|demo\.campus\.view|lite\.lens|demo\.guided\.v1)$|^__/;
const WS = 'empathia.demo.workspace.v1';
const snap = (p) => p.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])));
const settle = (p, ms = 300) => p.waitForTimeout(ms);
const tryClick = async (p, sel) => { const l = p.locator(sel).first(); if (await l.count() && await l.isVisible().catch(() => false)) { await l.scrollIntoViewIfNeeded().catch(() => undefined); await l.click({ timeout: 2000 }).catch(() => undefined); return true; } return false; };

/** compare: every non-training key identical; the workspace identical except `training` and new training.* ledger lines */
function compare(before, after) {
  const bad = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (TRAINING.has(k) || PREFS.test(k)) continue;
    if (k === WS) {
      if (!before[k] || !after[k]) { if (before[k] !== after[k]) bad.push(`${k}: ${before[k] ? 'removed' : 'created'} by training`); continue; }
      const b = JSON.parse(before[k]), a = JSON.parse(after[k]);
      for (const f of Object.keys({ ...b, ...a })) {
        if (f === 'training' || f === 'events') continue;
        if (JSON.stringify(b[f]) !== JSON.stringify(a[f])) bad.push(`workspace.${f} changed`);
      }
      const n = a.events.length - b.events.length; const added = a.events.slice(0, Math.max(0, a.events.length - b.events.length + 0));
      // the ledger is newest-first and capped at 500: the old lines must still follow the new ones, in order
      const fresh = []; let i = 0; while (i < a.events.length && JSON.stringify(a.events[i]) !== JSON.stringify(b.events[0])) fresh.push(a.events[i++]);
      if (b.events.length && i === a.events.length) bad.push('workspace.events: the earlier ledger is no longer there');
      else if (JSON.stringify(a.events.slice(i, i + Math.min(b.events.length, 500 - fresh.length))) !== JSON.stringify(b.events.slice(0, Math.min(b.events.length, 500 - fresh.length)))) bad.push('workspace.events: an earlier ledger line was altered');
      for (const e of fresh) if (!/^training\./.test(e.type) || !/never (a credential or an author|grants work author)/.test(e.detail)) bad.push(`workspace.events: a training run wrote “${e.type}” (${String(e.detail).slice(0, 60)})`);
      void n; void added;
      continue;
    }
    if (before[k] !== after[k]) bad.push(`${k}: ${before[k] == null ? 'created' : after[k] == null ? 'removed' : 'changed'} by training`);
  }
  return bad;
}

async function runTraining(t, role) {
  const p = t.page; const done = []; const refused = [];
  const visit = async (hash, init) => { await p.goto(p.url().split('#')[0] + '?r=' + Math.random().toString(36).slice(2) + hash); await p.waitForSelector('main h1', { timeout: 10000 }).catch(() => undefined); await settle(p, 400); if (init) void init;
    const no = await p.locator('[data-testid=access-page]').count(); if (no) refused.push(hash); return !no; };
  // 1. the flagship labs on their own pages
  if (await visit('#/labs/mix')) { await tryClick(p, '[data-testid=mx-check]'); await tryClick(p, '[data-testid=mx-room-mega]'); await tryClick(p, '[data-testid=mx-boss]'); await settle(p, 600); await tryClick(p, '[data-testid=mx-check]'); await tryClick(p, '[data-testid=mx-mute-0]'); done.push('mix'); }
  if (await visit('#/labs/light')) { await tryClick(p, '[data-testid=lx-check]'); await tryClick(p, '[data-testid=lx-look-worship]'); await tryClick(p, '[data-testid=lx-check]'); done.push('light'); }
  if (await visit('#/labs/video')) { await tryClick(p, '[data-testid=vx-next]'); await tryClick(p, '[data-testid=vx-next]'); await tryClick(p, '[data-testid=vx-cut]'); done.push('video'); }
  // 2. the same labs inside their SIGNAL chapters (the chapter's decisions already made)
  for (const [ch, check] of [['s01e05', 'lx-check'], ['s01e07', 'vx-next'], ['s01e10', 'mx-check']]) {
    if (await visit(`#/story/${ch}`)) { if (await tryClick(p, '[data-testid=story-flagship-open]')) { await settle(p, 1200); await tryClick(p, `[data-testid=${check}]`); done.push(`story ${ch}`); } }
  }
  // 3. Learn's instrument labs: press the first lab's controls
  if (await visit('#/learn/labs')) { const n = await p.locator('main [data-testid=labs] button').count(); for (let i = 0; i < Math.min(n, 12); i++) await p.locator('main [data-testid=labs] button').nth(i).click({ timeout: 1500 }).catch(() => undefined); done.push('learn labs'); }
  // 4. Service Mode on a real room's case, built from its service incident: declared twice
  if (await visit('#/learn/service/TC-R-BCN-3-225')) {
    if (await tryClick(p, '[data-testid=start-clock]')) { await p.waitForSelector('[data-testid=case-actions]', { timeout: 5000 }).catch(() => undefined);
      await tryClick(p, '[data-testid=case-actions] .ln-choice >> nth=0'); await tryClick(p, '.ln-act:has-text("Diagnose")'); await tryClick(p, '.ln-act:has-text("Repair")'); await tryClick(p, '.ln-act:has-text("Verify")');
      await tryClick(p, '.ln-choice:has-text("baseline")'); await tryClick(p, '[data-testid=declare]'); await settle(p, 400);
      await tryClick(p, 'button:has-text("Take it again")'); await tryClick(p, '.ln-act:has-text("Repair")'); await tryClick(p, '[data-testid=declare]'); done.push('service mode'); }
  }
  // 5. a SIGNAL incident run
  if (await visit('#/learn/service/SM-01')) { if (await tryClick(p, 'button:has-text("Start the incident")')) { await tryClick(p, '[data-testid=incident-actions] button >> nth=0'); await tryClick(p, '[data-testid=incident-actions] button >> nth=1'); await tryClick(p, 'button:has-text("Declare")'); done.push('signal incident'); } }
  // 6. a timed SIGNAL drill (recorded into the workspace's training list through the shared hook)
  if (await visit('#/learn/practice')) { if (await tryClick(p, '.ln-kinds button')) { await tryClick(p, '[data-testid=drills] a'); await settle(p, 300);
    for (let i = 0; i < 10; i++) { const b = p.locator('.svc__detail button').nth(i); if (!(await b.count())) break; await b.click({ timeout: 1200 }).catch(() => undefined); await settle(p, 120); } done.push('drill'); } }
  return { done, refused, role };
}

for (const role of ['service', 'architect', 'steward', 'visitor']) {
  const t = await open('#/v25/service', { role: 'service', sw: false, init: unlockInit('s01e11') });
  const p = t.page;
  // let the real stores exist: ServiceHands seeds the shared workspace, Knowledge the tenants' library, Here and Requests their own
  for (const h of ['#/v25/service', '#/knowledge', '#/here', '#/request']) { await p.goto(p.url().split('#')[0] + '#' + h.slice(1)); await settle(p, 500); }
  await p.evaluate((r) => localStorage.setItem('empathia.demo.perspective', r), role); await p.reload(); await settle(p, 500);
  const before = await snap(p);
  const ran = await runTraining(t, role);
  const after = await snap(p);
  const bad = compare(before, after);
  const ws = before[WS] ? JSON.parse(before[WS]) : null;
  ok(`TI-${role}`, `as ${role}: ${ran.done.length} training runs (${ran.done.join(', ') || 'none open'}${ran.refused.length ? `; refused: ${ran.refused.length}` : ''}) change no incident, work order, case or tenant record`, !!ws && ws.incidents.length > 0 && bad.length === 0, bad.slice(0, 8).join(' | '));
  if (role === 'service') { const nb = JSON.parse(before[WS]).events.length, na = JSON.parse(after[WS]).events.length, tl = JSON.parse(after[WS]).events.slice(0, Math.max(0, na - nb)).map((e) => e.type);
    ok('TI-service-ledger', 'the training did write to the shared ledger, so the check above was exercised: only training.* lines, each saying it grants nothing', na > nb && tl.every((x) => /^training\./.test(x)), `${nb} → ${na}: ${tl.join(', ')}`); }
  if (role === 'service') ok('TI-service-ran', 'the ServiceHands technician ran every kind of training (labs, story labs, Learn labs, Service Mode, a SIGNAL incident, a drill)', ['mix', 'light', 'video', 'story s01e10', 'service mode', 'signal incident', 'drill'].every((x) => ran.done.includes(x)), ran.done.join(', '));
  if (role === 'visitor') ok('TI-visitor-refused', 'the Visitor may practise in the flagship labs but is refused Service Mode on a real room’s case', ran.done.includes('mix') && !ran.done.includes('service mode') && ran.refused.some((h) => /learn\/service/.test(h)), JSON.stringify(ran));
  ok(`TI-${role}-clean`, 'no page error during the runs', !t.errs.length, t.errs.slice(0, 3).join(' | '));
  await t.close();
}

// the negative case proves the check can fail: a real change to an incident is caught
{ const b = { [WS]: JSON.stringify({ v: 1, incidents: [{ id: 'INC-1', state: 'OPEN' }], events: [{ type: 'x', detail: 'y' }], training: [] }) };
  const a = { [WS]: JSON.stringify({ v: 1, incidents: [{ id: 'INC-1', state: 'RESOLVED' }], events: [{ type: 'service.incident_resolved', detail: 'by a drill' }, { type: 'x', detail: 'y' }], training: [] }) };
  const bad = compare(b, a);
  ok('TI-guard', 'the comparison itself catches a changed incident and a non-training ledger line', bad.some((x) => /workspace\.incidents/.test(x)) && bad.some((x) => /service\.incident_resolved/.test(x)), bad.join(' | ')); }
await done();
