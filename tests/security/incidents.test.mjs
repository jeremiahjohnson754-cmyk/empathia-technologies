// Operational incidents (migration 0039, ADR-0015; founder, 17 Nov 2026: "prioritize operational incident intelligence").
// Every check goes to the API or to the database.
//   IN-01  an incident is reported on a room in service: before acceptance the API refuses it, and so does the table
//   IN-02  anyone who can see the room reports one; the report is validated; it is listed with ServiceHands in the room's thread and is
//          not among commissioning's deficiencies
//   IN-03  what was reported never changes, an incident is never deleted, and nobody writes "recurring": the database works it out
//   IN-04  a repeat is the same kind of incident in the same room within thirty days; another kind is not one
//   IN-05  the workflow belongs to the people whose work it is; a blocked incident's correction waits; "fixed" says how it was resolved
//   IN-06  the reporter confirms the room works again, or says it does not (the work goes back and the resolution no longer stands);
//          whoever fixed it does not confirm it; closing is by someone who neither fixed nor confirmed
//   IN-07  two doors, each for its own: the deficiency door refuses an incident, the incident door does not know a deficiency
//   IN-08  an incident is handed to ServiceHands like any issue: a work order, its need and its gated candidates
//   IN-09  an escalation is recorded once; a Critical incident is never deferred
//   IN-10  intelligence is what the records add up to: totals, kinds, time to resolve, repeats, and a status per room derived from its
//          open incidents; another organization sees none of it
//   IN-11  the thirty days are counted: the same kind forty-five days before is not repeated, ten days before is
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict';
import { setup, client, registerRoom, documentRoom } from '../integration/harness.mjs';

let h, c, sb; const T = {}; const J = (x) => JSON.stringify(x); let ROOM = '', R = ''; const HALL = '/v1/rooms/UNI-SCI-110';
const call = (token, method, p, o = {}) => c.call(method, p, { token, ...o });
const report = (token, o = {}, base = R) => call(token, 'POST', `${base}/incidents`, { body: { issueType: 'no_audio', domain: 'audio', severity: 'High', title: 'No sound from the ceiling loudspeakers', description: 'The far end cannot be heard since this morning (synthetic).', detectedDuring: 'user_report', userImpact: 'major_disruption', ...o } });
const step = (token, code, body) => call(token, 'POST', `/v1/incidents/${code}/steps`, { body });
const get = async (code, token = T.svcmgr) => (await call(token, 'GET', `/v1/incidents/${code}`)).body;
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

before(async () => {
  h = await setup({ db: 'empathia_incidents', port: 4155, env: { DEMO_SESSIONS: 'on' } }); c = client(h.base); h.asSuper('UPDATE app.demo_config SET enabled = true');
  const o = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); assert.equal(o.status, 201, J(o.body)); sb = o.body.sandbox; T.people = o.body.personas;
  for (const role of ['requestor', 'syseng', 'installer', 'cxeng', 'exec', 'qa_reviewer', 'opslead', 'svcmgr', 'service']) T[role] = (await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: sb.id, key: sb.key, role } })).body.accessToken;
  // the scenario room, taken to acceptance through the API so that there is a room in service
  ROOM = (await call(T.cxeng, 'GET', '/v1/rooms?limit=50')).body.items.find((r) => r.canonicalRef !== 'UNI-SCI-110').code; R = `/v1/rooms/${ROOM}`;
  await registerRoom(c, ROOM, T.installer); assert.equal((await call(T.syseng, 'POST', `${R}/lifecycle`, { body: { to: 'COMMISSIONING' } })).status, 200);
  const ev = (await call(T.cxeng, 'POST', '/v1/evidence', { raw: 'synthetic observation', headers: { 'content-type': 'text/plain', 'x-file-name': 'obs.txt' } })).body.id;
  const rows = () => call(T.cxeng, 'GET', R).then((r) => r.body.commissioning.rows.filter((x) => x.applicable));
  for (const r of await rows()) { const w = await call(T.cxeng, 'POST', `${R}/results`, { body: { testId: r.test_id, state: 'PASS', evidenceId: ev, evidenceKind: r.evidence[0], instrument: 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09' } }); assert.equal(w.status, 201, `${r.test_id}: ${J(w.body)}`); }
  for (const r of await rows()) assert.equal((await call(T.qa_reviewer, 'POST', `${R}/results/${r.test_id}/verify`)).status, 200, r.test_id);
  const ops = T.people.find((p) => p.role === 'opslead'); assert.equal((await call(T.qa_reviewer, 'POST', '/v1/delegations', { body: { granteeId: ops.id, authority: 'customer.accept', reason: 'synthetic: QA verified and does not accept', days: 2 } })).status, 201);
  // (added 18 Nov: acceptance also needs the documentation packet approved and signed by both sides, 0043)
  await documentRoom(c, R.replace('/v1/rooms/', ''), { submit: T.installer, review: T.qa_reviewer, vendor: T.opslead, internal: T.syseng });
  const acc = await call(T.opslead, 'POST', `${R}/lifecycle`, { body: { to: 'ACCEPTED' } }); assert.equal(acc.status, 200, J(acc.body));
});
after(async () => { await h.app.stop(); });

test('IN-01 an incident is reported on a room in service: before acceptance the API refuses it, and so does the table', async () => {
  const early = await report(T.requestor, {}, HALL); assert.equal(early.status, 422, J(early.body)); assert.match(J(early.body), /is reported on a room in service/); assert.match(J(early.body), /Before acceptance, what goes wrong is a deficiency/);
  // round the API: an issue of the incident category on that room, then its detail
  assert.throws(() => h.asSuper(`WITH i AS (INSERT INTO app.room_issue (tenant_id, room_id, code, key, category, check_name, severity, title, rationale, first_seen_rev, last_seen_rev)
      SELECT r.tenant_id, r.id, 'INC-9001', 'incident:INC-9001', 'OPERATIONAL_INCIDENT', 'no_audio', 'High', 'written directly', 'written directly to the table', 1, 1 FROM app.room r WHERE r.canonical_ref = 'UNI-SCI-110' RETURNING id, tenant_id, room_id)
    INSERT INTO app.incident (issue_id, tenant_id, room_id, entry_type, issue_type, domain, detected_during, user_impact, description, reported_by, reported_role)
      SELECT i.id, i.tenant_id, i.room_id, 'OPERATIONAL_INCIDENT', 'no_audio', 'audio', 'user_report', 'major_disruption', 'written directly to the table', (SELECT person_id FROM app.membership WHERE tenant_id = i.tenant_id LIMIT 1), 'requestor' FROM i`), /reported on a room in service/);
  assert.equal(h.asSuper("SELECT count(*) FROM app.room_issue WHERE code = 'INC-9001'"), '0', 'and the issue went with it');
});

test('IN-02 anyone who can see the room reports one; the report is validated; it is with ServiceHands in the thread, not among the deficiencies', async () => {
  for (const [o, re] of [[{ severity: 'Critical', userImpact: 'none' }, /affects someone/], [{ device: 'PA-9999' }, /not a device of/]]) { const r = await report(T.requestor, o); assert.equal(r.status, 422, J(r.body)); assert.match(J(r.body), re); }
  assert.equal((await report(T.requestor, { issueType: 'haunted' })).status, 400); assert.equal((await report(T.requestor, { description: 'short' })).status, 400);
  assert.equal((await c.call('POST', `${R}/incidents`, { body: {} })).status, 401, 'not without signing in');
  const ok = await report(T.requestor); assert.equal(ok.status, 201, J(ok.body)); T.first = ok.body.incident; assert.match(T.first, /^INC-\d{4}$/); assert.equal(ok.body.repeats, null);
  const inc = await get(T.first, T.requestor); assert.equal(inc.status, 'OPEN'); assert.equal(inc.youReported, true); assert.equal(inc.reportedRole, 'requestor'); assert.equal(inc.issueTypeName, 'No audio');
  const th = (await call(T.cxeng, 'GET', `${R}/thread`)).body; const svc = th.stages.find((s) => s.key === 'service').records; const cx = th.stages.find((s) => s.key === 'commissioning').records;
  assert.deepEqual(svc.incidents.map((i) => i.code), [T.first]); assert.ok(!(cx.issues || []).some((i) => i.code === T.first), 'an incident is not a commissioning deficiency');
  assert.equal((await call(T.exec, 'GET', '/v1/incidents')).body.items.length, 1, 'anyone of the organization may read it');
});

test('IN-03 what was reported never changes, an incident is never deleted, and the database works out recurrence whatever is written', async () => {
  assert.throws(() => h.asSuper("UPDATE app.incident SET description = 'rewritten after the fact, quietly'"), /does not change/);
  assert.throws(() => h.asSuper("UPDATE app.incident SET issue_type = 'user_error'"), /does not change/);
  assert.throws(() => h.asSuper('DELETE FROM app.incident'), /never deleted/);
  const k = await h.appConn(); try { await assert.rejects(() => k.simple("UPDATE app.incident SET reported_at = now() - interval '1 year'"), /permission denied|does not change/); } finally { await k.end(); }
});

test('IN-04 a repeat is the same kind of incident in the same room within thirty days; another kind is not one', async () => {
  const other = await report(T.service, { issueType: 'video_no_signal', domain: 'video', title: 'The display shows no picture', detectedDuring: 'support_round', severity: 'Medium', userImpact: 'moderate_disruption' }); assert.equal(other.status, 201, J(other.body)); assert.equal(other.body.repeats, null); T.video = other.body.incident;
  const again = await report(T.opslead, { title: 'No sound again in the afternoon', detectedDuring: 'production' }); assert.equal(again.status, 201, J(again.body)); assert.equal(again.body.repeats, T.first, 'the database found the earlier one'); T.second = again.body.incident; assert.match(again.body.note, /within 30 days/);
  assert.equal(h.asSuper(`SELECT (SELECT code FROM app.room_issue WHERE id = n.recurrence_of) FROM app.incident n JOIN app.room_issue i ON i.id = n.issue_id WHERE i.code = '${T.second}'`), T.first);
});

test('IN-05 the workflow belongs to the people whose work it is; a blocked incident waits; "fixed" says how it was resolved', async () => {
  assert.equal((await step(T.requestor, T.first, { step: 'start', ownerRole: 'service', targetDate: day(2) })).status, 403, 'the reporter does not assign the work');
  const started = await step(T.svcmgr, T.first, { step: 'start', ownerRole: 'service', targetDate: day(2) }); assert.equal(started.status, 200, J(started.body)); assert.equal(started.body.status, 'IN_PROGRESS');
  assert.equal((await call(T.exec, 'POST', `/v1/incidents/${T.first}/block`, { body: { blocked: true, reason: 'waiting for a part' } })).status, 403);
  const blocked = await call(T.svcmgr, 'POST', `/v1/incidents/${T.first}/block`, { body: { blocked: true, reason: 'waiting for the replacement amplifier (synthetic)' } }); assert.equal(blocked.status, 200, J(blocked.body)); assert.equal(blocked.body.status, 'BLOCKED');
  const fix = { step: 'fixed', rootCause: 'EQUIPMENT_FAULT', action: 'Amplifier channel failed; the amplifier was replaced and levels reset (synthetic)', resolutionType: 'hardware_replacement' };
  const waits = await step(T.service, T.first, fix); assert.equal(waits.status, 422, J(waits.body)); assert.match(J(waits.body), /is blocked \(waiting for the replacement amplifier/);
  assert.equal((await call(T.svcmgr, 'POST', `/v1/incidents/${T.first}/block`, { body: { blocked: false } })).body.status, 'IN_PROGRESS');
  assert.equal((await step(T.service, T.first, { ...fix, resolutionType: undefined })).status, 400, 'how it was resolved is part of the correction');
  assert.equal((await step(T.exec, T.first, fix)).status, 403);
  const fixed = await step(T.service, T.first, fix); assert.equal(fixed.status, 200, J(fixed.body)); assert.equal(fixed.body.status, 'AWAITING_CONFIRMATION'); assert.equal(fixed.body.resolutionType, 'hardware_replacement'); assert.equal(typeof fixed.body.hoursToResolve, 'number');
});

test('IN-06 the reporter confirms, or says it is not fixed; whoever fixed it does not confirm; closing is by someone else again', async () => {
  assert.equal((await step(T.service, T.first, { step: 'confirm', restored: true, note: 'sounds fine to me' })).status, 403, 'the technician who fixed it is not asked whether it works');
  const no = await step(T.requestor, T.first, { step: 'confirm', restored: false, note: 'still silent on the left side' }); assert.equal(no.status, 200, J(no.body)); assert.equal(no.body.status, 'IN_PROGRESS'); assert.equal(no.body.resolutionType, null, 'the resolution no longer stands');
  assert.equal((await step(T.service, T.first, { step: 'fixed', rootCause: 'CONFIGURATION', action: 'Left output was muted in the processor; unmuted and saved (synthetic)', resolutionType: 'configuration_fix' })).status, 200);
  const yes = await step(T.requestor, T.first, { step: 'confirm', restored: true, note: 'both sides play; a call was made to check' }); assert.equal(yes.status, 200, J(yes.body)); assert.equal(yes.body.confirmation.result, 'PASS'); assert.match(yes.body.confirmation.evidence, /confirmed by requestor/);
  assert.equal((await step(T.requestor, T.first, { step: 'close' })).status, 403, 'the reporter does not close the desk’s record');
  const closed = await step(T.svcmgr, T.first, { step: 'close' }); assert.equal(closed.status, 200, J(closed.body)); assert.equal(closed.body.status, 'CLOSED'); assert.ok(closed.body.closedAt);
  const hist = (await get(T.first)).history.map((e) => e.kind); assert.ok(hist.includes('blocked') && hist.includes('unblocked') && hist.filter((k) => k === 'workflow').length >= 5, J(hist));
  // the technician confirming their own fix on an incident they reported themselves: the engine's separation still holds
  const mine = await report(T.service, { issueType: 'device_offline', domain: 'network', title: 'Room panel offline after the update', severity: 'Low', userImpact: 'minor_annoyance', detectedDuring: 'support_round' }); const code = mine.body.incident;
  await step(T.svcmgr, code, { step: 'start', ownerRole: 'service', targetDate: day(3) }); await step(T.service, code, { step: 'fixed', rootCause: 'FIRMWARE', action: 'Panel firmware reinstalled and the panel re-enrolled (synthetic)', resolutionType: 'firmware_update' });
  const own = await step(T.service, code, { step: 'confirm', restored: true, note: 'panel is back online' }); assert.equal(own.status, 200, 'the reporter may say it works');
  const selfClose = await step(T.svcmgr, code, { step: 'close' }); assert.equal(selfClose.status, 200, J(selfClose.body)); T.panel = code;
});

test('IN-07 two doors, each for its own', async () => {
  const wrong = await call(T.cxeng, 'POST', `/v1/issues/${T.second}/deficiency`, { body: { step: 'start', ownerRole: 'service', targetDate: day(2) } }); assert.equal(wrong.status, 422, J(wrong.body)); assert.match(J(wrong.body), /is an operational incident: it is worked through \/v1\/incidents/);
  const design = h.asSuper("SELECT code FROM app.room_issue WHERE category <> 'OPERATIONAL_INCIDENT' LIMIT 1");
  if (design) { assert.equal((await step(T.svcmgr, design, { step: 'start', ownerRole: 'service', targetDate: day(2) })).status, 404); assert.equal((await call(T.svcmgr, 'GET', `/v1/incidents/${design}`)).status, 404); }
  assert.equal((await step(T.svcmgr, 'INC-9999', { step: 'close' })).status, 404);
});

test('IN-08 an incident is handed to ServiceHands like any issue', async () => {
  const wo = await call(T.svcmgr, 'POST', `/v1/issues/${T.second}/work-orders`, { body: { note: 'handed over from the service desk (synthetic)' } }); assert.equal(wo.status, 201, J(wo.body));
  const code = wo.body.workOrderId; assert.equal((await call(T.svcmgr, 'POST', `/v1/work-orders/${code}/triage`, { body: { severity: 'High', scope: 'no audio in the room', risk: 'meetings cannot be held' } })).status, 200);
  const cands = (await call(T.svcmgr, 'GET', `/v1/work-orders/${code}/candidates`)).body; assert.ok(cands.eligible.length >= 1, J(cands)); assert.deepEqual((await get(T.second)).workOrders, [code]);
  const th = (await call(T.cxeng, 'GET', `${R}/thread`)).body.stages.find((s) => s.key === 'service').records; assert.deepEqual(th.incidents.find((i) => i.code === T.second).workOrders, [code]);
});

test('IN-09 an escalation is recorded once; a Critical incident is never deferred', async () => {
  const e = await call(T.svcmgr, 'POST', `/v1/incidents/${T.second}/escalate`, { body: { reason: 'second failure in a day: to the integrator’s service lead (synthetic)' } }); assert.equal(e.status, 200, J(e.body)); assert.ok(e.body.escalated.at);
  const twice = await call(T.svcmgr, 'POST', `/v1/incidents/${T.second}/escalate`, { body: { reason: 'again, to someone else' } }); assert.equal(twice.status, 422); assert.match(J(twice.body), /escalated already/);
  assert.throws(() => h.asSuper("UPDATE app.incident SET escalation_reason = 'rewritten quietly' WHERE escalation_reason IS NOT NULL"), /recorded once/);
  const crit = await report(T.opslead, { issueType: 'control_system_failure', domain: 'control', severity: 'Critical', title: 'The room cannot be started at all', userImpact: 'executive_impact', detectedDuring: 'production' }); assert.equal(crit.status, 201, J(crit.body)); T.critical = crit.body.incident;
  const defer = await step(T.svcmgr, T.critical, { step: 'defer', reason: 'next quarter', until: day(60) }); assert.equal(defer.status, 422, J(defer.body)); assert.match(J(defer.body), /not deferred|is not deferred/);
  const low = await step(T.svcmgr, T.video, { step: 'defer', reason: 'the display is replaced in the refresh next month (synthetic)', until: day(30) }); assert.equal(low.status, 200, J(low.body)); assert.equal(low.body.status, 'DEFERRED');
});

test('IN-10 intelligence is what the records add up to; another organization sees none of it', async () => {
  const x = (await call(T.exec, 'GET', '/v1/incidents/intelligence?days=30')).body; const t = x.totals;
  assert.deepEqual([t.incidents, t.closed, t.deferred, t.criticalOpen, t.repeats, t.escalated, t.resolved], [5, 2, 1, 1, 1, 1, 2], J(t));
  assert.equal(t.open, 2, 'the second no-audio incident and the critical one'); assert.ok(t.meanHoursToResolve !== null && t.meanHoursToResolve >= 0 && t.medianHoursToResolve !== null);
  const audio = x.byIssueType.find((k) => k.key === 'no_audio'); assert.deepEqual([audio.incidents, audio.open, audio.repeats, audio.resolved, audio.name], [2, 1, 1, 1, 'No audio']);
  assert.deepEqual(x.byResolutionType.map((k) => k.key).sort(), ['configuration_fix', 'firmware_update'], 'the replaced amplifier did not fix it and is not counted as its resolution');
  assert.deepEqual(x.repeats.map((r) => [r.incident, r.repeats]), [[T.second, T.first]]);
  const room = x.rooms.find((r) => r.room === ROOM); assert.deepEqual([room.status, room.open, room.criticalOpen, room.closed], ['DOWN', 2, 1, 2], J(room)); assert.match(room.why, /most severe Critical/);
  assert.ok(!x.rooms.some((r) => r.room !== ROOM), 'the lecture theatre is not in service and is not given a status'); assert.match(x.basis, /not a measurement of the room/);
  // close the critical one: the room's status follows its open incidents
  await step(T.svcmgr, T.critical, { step: 'start', ownerRole: 'service', targetDate: day(1) }); await step(T.service, T.critical, { step: 'fixed', rootCause: 'CONFIGURATION', action: 'Control processor program reloaded from the released version (synthetic)', resolutionType: 'software_patch' });
  await step(T.opslead, T.critical, { step: 'confirm', restored: true, note: 'room starts from the panel' }); await step(T.svcmgr, T.critical, { step: 'close' });
  const after = (await call(T.exec, 'GET', '/v1/incidents/intelligence?days=30')).body.rooms.find((r) => r.room === ROOM); assert.deepEqual([after.status, after.criticalOpen], ['DEGRADED', 0], J(after));
  // another organization
  const o2 = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); const t2 = o2.body.session.accessToken;
  assert.equal((await call(t2, 'GET', '/v1/incidents')).body.items.length, 0); assert.equal((await call(t2, 'GET', `/v1/incidents/${T.first}`)).status, 404); assert.equal((await call(t2, 'GET', '/v1/incidents/intelligence')).body.totals.incidents, 0);
});

test('IN-11 the thirty days are counted: the same kind forty-five days before is not a repeat, ten days before is', async () => {
  const old = (code, type, daysAgo) => h.asSuper(`WITH i AS (INSERT INTO app.room_issue (tenant_id, room_id, code, key, category, check_name, severity, title, rationale, first_seen_rev, last_seen_rev)
      SELECT r.tenant_id, r.id, '${code}', 'incident:${code}', 'OPERATIONAL_INCIDENT', '${type}', 'Low', 'an earlier incident (test fixture)', 'an earlier incident, dated back (test fixture)', 1, 1 FROM app.room r WHERE r.code = '${ROOM}' AND r.tenant_id = (SELECT tenant_id FROM app.demo_sandbox WHERE id = '${sb.id}') RETURNING id, tenant_id, room_id)
    INSERT INTO app.incident (issue_id, tenant_id, room_id, entry_type, issue_type, domain, detected_during, user_impact, description, reported_by, reported_role, reported_at)
      SELECT i.id, i.tenant_id, i.room_id, 'OPERATIONAL_INCIDENT', '${type}', 'control', 'support_round', 'minor_annoyance', 'an earlier incident, dated back (test fixture)', (SELECT person_id FROM app.membership WHERE tenant_id = i.tenant_id AND role_key = 'service' LIMIT 1), 'service', now() - interval '${daysAgo} days' FROM i`);
  old('INC-8045', 'firmware_issue', 45); old('INC-8010', 'ui_ux_issue', 10);
  const far = await report(T.service, { issueType: 'firmware_issue', domain: 'control', severity: 'Low', title: 'Firmware prompt on the touch panel', userImpact: 'minor_annoyance', detectedDuring: 'support_round' }); assert.equal(far.status, 201, J(far.body)); assert.equal(far.body.repeats, null, 'forty-five days is outside the window');
  const near = await report(T.service, { issueType: 'ui_ux_issue', domain: 'control', severity: 'Low', title: 'Buttons on the panel are mislabelled', userImpact: 'minor_annoyance', detectedDuring: 'support_round' }); assert.equal(near.status, 201, J(near.body)); assert.equal(near.body.repeats, 'INC-8010');
});
