// Connect (apps/demo/src/connect; founder's directive of 11 Nov 2026 §02–§05 and his decision 3): the people directory with first-class
// site champions, the verified app-link registry, schedule-aware meeting proposals, the confirmation write path, and the Microsoft
// Graph adapter against a mock transport. What these tests hold: every person and room is derived from records; every offered link has
// a source and is correctly encoded; across hundreds of random requests no proposed time breaks anyone's hours, shift, busy block or
// the room's bookings, in any time zone or daylight-saving week; one confirmation makes one meeting; a time taken between proposal
// and confirmation is refused; nothing is ever described as sent; and the Graph requests are the documented ones.
//   node --test tests/unit/demo-connect.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-connect-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as D from './connect/directory.ts'; export * as A from './connect/apps.ts'; export * as K from './connect/calendar.ts'; export * as G from './connect/graph.ts'; export * as T from './connect/store.ts'; export * as N from './campus/canon.ts'; export * as W from './workspace/store.ts'; export * as P from './access/policy.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { D, A, K, G, T, N, W, P } = await import(pathToFileURL(out).href);
const fresh = () => { mem.clear(); return W.seed(); };
const w0 = fresh(); const people = D.directory(w0); const by = (id) => people.find((p) => p.id === id);
const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const MON = new Date('2026-11-16T05:00:00Z');   // a Monday, before anyone's day starts

test('CN-01 the directory is derived: a champion and a backup for every building, the workspace’s own technicians, one holder per support role; all synthetic', () => {
  for (const b of D.ALL_BUILDINGS) { const c = by(`sc-${b.key}`); const k = by(`sc-${b.key}-b`); assert.ok(c && k, b.key); assert.equal(c.roleKey, 'sitechamp'); assert.deepEqual(c.sites, [b.key]); assert.ok(c.title.includes(b.name));
    assert.deepEqual(D.roomsOf(c), N.CAMPUS_ROOMS.filter((r) => r.building === b.key).map((r) => r.id), 'a champion knows exactly the rooms of their building'); }
  assert.deepEqual(people.filter((p) => p.kind === 'technician').map((p) => p.id), w0.staff.map((s) => s.id), 'the technicians are the ones ServiceHands dispatches');
  for (const s of w0.staff) { const p = by(s.id); assert.deepEqual([...p.sites], s.sites); assert.ok(p.shift, 'a technician works a shift'); assert.equal(p.name, s.name.replace(' (synthetic)', '').split(' — ')[0]); }
  assert.equal(new Set(people.map((p) => p.id)).size, people.length); assert.equal(new Set(people.map((p) => p.upn)).size, people.length, 'addresses are unique');
  for (const p of people) { assert.match(p.upn, /^[a-z]+\.[a-z]+\d*@(partner\.)?empathia\.example$/, p.upn); assert.match(p.phone, /^\+1 555 01\d\d$/, 'the range reserved for fiction');
    assert.doesNotThrow(() => new Intl.DateTimeFormat('en-GB', { timeZone: p.tz })); for (const id of p.escalatesTo) assert.ok(by(id), `${p.id} escalates to ${id}`);
    assert.ok(!/aon|kraft|heinz|stefanini|khc/i.test(JSON.stringify(p))); }
  assert.equal(people.length, 5 + w0.staff.length + 2 * D.ALL_BUILDINGS.length);
  assert.equal(D.freshnessOf(by('sc-MBK-b'), '2026-11-11').state, 'unknown'); assert.ok(people.some((p) => D.freshnessOf(p, '2026-11-11').state === 'stale') && people.some((p) => D.freshnessOf(p, '2026-11-11').state === 'confirmed'));
});
test('CN-02 "Who knows this room?" for all 90 rooms: the champion first when at work, otherwise the backup and it says why; then the site’s technicians; the Service Manager last', () => {
  assert.equal(N.CAMPUS_ROOMS.length, 90);
  for (const at of [new Date('2026-11-16T16:00:00Z'), new Date('2026-11-16T23:30:00Z'), new Date('2026-11-21T15:00:00Z')]) for (const r of N.CAMPUS_ROOMS) {
    const k = D.whoKnows(r.id, at, w0); assert.ok(k.length >= 3, r.id); const champ = by(`sc-${r.building}`); const backup = by(`sc-${r.building}-b`);
    if (D.isWorking(champ, at)) { assert.equal(k[0].person.id, champ.id); assert.match(k[0].why, /knows its \d+ rooms/); }
    else { assert.equal(k[0].person.id, backup.id); assert.match(k[0].why, /the champion is not at work now/); assert.equal(k[1].person.id, champ.id); }
    assert.equal(k[k.length - 1].person.id, 'p-svcmgr');
    for (const x of k.filter((y) => y.person.kind === 'technician')) assert.ok(x.person.sites.includes(r.building), `${x.person.id} does not cover ${r.building}`);
    for (const x of k) assert.equal(x.working, D.isWorking(x.person, at)); }
  assert.deepEqual(D.whoKnows('R-NO-SUCH', MON, w0), []);
});
test('CN-03 time is the platform’s own time-zone data: daylight-saving weeks, and the weeks when two regions are an hour closer', () => {
  assert.equal(D.localTime('America/Chicago', new Date('2026-01-15T15:00:00Z')).hhmm, '09:00'); assert.equal(D.localTime('America/Chicago', new Date('2026-07-15T15:00:00Z')).hhmm, '10:00');
  assert.equal(D.localTime('Europe/London', new Date('2026-07-15T15:00:00Z')).hhmm, '16:00');
  // 8–28 March 2026: Chicago has changed its clocks, London has not: five hours apart, not six
  const gap = (iso) => { const c = D.localTime('America/Chicago', new Date(iso)).hhmm; const l = D.localTime('Europe/London', new Date(iso)).hhmm; return Number(l.slice(0, 2)) - Number(c.slice(0, 2)); };
  assert.equal(gap('2026-03-02T15:00:00Z'), 6); assert.equal(gap('2026-03-16T15:00:00Z'), 5); assert.equal(gap('2026-04-06T15:00:00Z'), 6);
  const lon = by('sc-EGT'); assert.equal(lon.tz, 'Europe/London'); assert.equal(D.isWorking(lon, new Date('2026-11-16T08:30:00Z')), true); assert.equal(D.isWorking(lon, new Date('2026-11-16T17:00:00Z')), false, 'the day ends at 17:00');
  assert.equal(D.isWorking(lon, new Date('2026-11-21T10:00:00Z')), false, 'a Saturday'); assert.equal(D.isWorking(lon, new Date('2026-11-16T16:45:00Z'), new Date('2026-11-16T17:15:00Z')), false, 'a meeting must end inside the day');
  const tech = people.find((p) => p.shift?.name === 'Early'); assert.equal(D.isWorking(tech, new Date('2026-11-16T12:30:00Z')), true, '06:30 in Chicago, on the early shift'); assert.equal(D.isWorking(tech, new Date('2026-11-16T21:00:00Z')), false, 'after the shift');
  assert.match(D.availabilityLine(lon, new Date('2026-11-16T10:00:00Z')), /^At work now \(Mon 10:00 for them\); until 17:00/); assert.match(D.availabilityLine(lon, new Date('2026-11-16T22:00:00Z')), /^Not at work now/);
});
test('CN-04 every offered link has a source, is built from the documented format, encodes what it carries, and an unverified one is never built', () => {
  for (const a of Object.values(A.APPS)) { if (a.status === 'unverified') { assert.equal(A.linkFor(a.id, { users: ['a.b@empathia.example'], number: '+15550100' }), null, a.id); assert.ok(a.note.length > 20); continue; }
    assert.ok(a.source && a.opens && a.opened && a.fallback, a.id); if (a.status === 'verified') { assert.match(a.source, /^https:\/\/learn\.microsoft\.com\//); assert.equal(a.validated, '2026-11-11'); }
    assert.ok(!/\bsent\b(?!.*(Nothing|nothing|not))/i.test(a.opened) || /Nothing has been sent|nothing/i.test(a.opened), `${a.id}: "${a.opened}" must not say something was sent`);
    assert.ok(!/download|store|install the app/i.test(a.fallback), 'no invented download link'); }
  const u = ['amara.o’neil@empathia.example'.replace('’', "'"), 'bao.tanaka+rooms@empathia.example'];
  const chat = A.linkFor('teams.chat', { users: u, message: 'Atlas 4.218: far end can’t hear us & the panel says “connecting” + 2 more' });
  assert.ok(chat.startsWith('https://teams.microsoft.com/l/chat/0/0?users=')); assert.ok(!chat.includes(' ') && !/[{}]/.test(chat)); assert.ok(!/\+(?!rooms)/.test(chat.replace(/%2B/g, '')), 'a space is %20, never +'); assert.ok(chat.includes('%20') && chat.includes('%2B') && chat.includes('%26'));
  assert.equal(new URL(chat).searchParams.get('users'), u.join(',')); assert.equal(decodeURIComponent(chat.split('message=')[1]), 'Atlas 4.218: far end can’t hear us & the panel says “connecting” + 2 more');
  assert.equal(A.linkFor('teams.chat', { users: [] }), null); assert.equal(A.linkFor('teams.chat', { users: ['not an address'] }), null); assert.ok(!A.linkFor('teams.chat', { users: [u[1]] }).includes('message='), 'an empty message leaves no empty parameter');
  assert.equal(A.linkFor('teams.call', { users: [u[1]] }), 'https://teams.microsoft.com/l/call/0/0?users=bao.tanaka%2Brooms%40empathia.example');
  const mt = A.linkFor('teams.meeting', { users: u, subject: 'Camera presets: 4.218', startTime: '2026-11-17T09:00:00-06:00', endTime: '2026-11-17T09:30:00-06:00', content: 'From Empathia' });
  assert.match(mt, /^https:\/\/teams\.microsoft\.com\/l\/meeting\/new\?subject=Camera%20presets%3A%204\.218&startTime=2026-11-17T09%3A00%3A00-06%3A00&endTime=/); assert.ok(!/location/i.test(mt), 'a location cannot be given');
  for (const bad of ['2026-11-17T09:00', '2026-11-17 09:00:00', '']) assert.equal(A.linkFor('teams.meeting', { users: u, startTime: bad, endTime: '2026-11-17T09:30:00-06:00' }), null, 'times must carry their offset');
  assert.equal(A.linkFor('mail', { users: [u[1]], subject: 'Room 4.218', body: 'Line one\nLine two' }), 'mailto:bao.tanaka%2Brooms@empathia.example?subject=Room%204.218&body=Line%20one%0ALine%20two'); assert.equal(A.linkFor('mail', { users: u }), null, 'one address');
  assert.equal(A.linkFor('tel', { number: '+1 555 0142' }), 'tel:+15550142'); assert.equal(A.linkFor('tel', { number: 'call me' }), null);
  for (const p of people) { const l = A.linkFor('teams.chat', { users: [p.upn] }); assert.equal(new URL(l).searchParams.get('users'), p.upn); assert.match(A.linkFor('tel', { number: p.phone }), /^tel:\+155501\d\d$/); }
});
test('CN-05 property: across 400 random requests no proposed time breaks anyone’s hours or shift, overlaps a busy block or a room booking; times are on the half hour and in order', () => {
  const r = rng(7); const pick = (a) => a[Math.floor(r() * a.length)]; let proposals = 0; let none = 0;
  const rooms = ['R-ATL-4-218', 'R-ATL-4-220', null, null];
  for (let i = 0; i < 400; i += 1) {
    const w = fresh(); const all = D.directory(w); const n = 1 + Math.floor(r() * 4); const att = [...new Set(Array.from({ length: n }, () => pick(all)))];
    const from = new Date(Date.parse(pick(['2026-11-16', '2026-03-02', '2026-03-09', '2026-03-23', '2026-10-26', '2026-07-06'])) + Math.floor(r() * 4) * 86400000 + Math.floor(r() * 24) * 3600000 + Math.floor(r() * 60) * 60000);
    const ask = { attendees: att, roomId: pick(rooms), minutes: pick([15, 30, 45, 60, 90]), from, days: pick([2, 5, 7]) }; const a = T.adapterFor(w); const res = K.propose(a, ask);
    assert.equal(res.provenance, 'SIMULATED');
    if (!res.ok) { none += 1; assert.ok(res.why.length > 10 && res.tried.length >= 1, 'a refusal says why and what to try'); continue; }
    let prev = 0;
    for (const p of res.proposals) { proposals += 1; const s = Date.parse(p.start); const e = Date.parse(p.end);
      assert.equal((e - s) / 60000, ask.minutes); assert.equal(s % 1800000, 0, 'on the half hour'); assert.ok(s >= from.getTime() && s > prev, 'in the future, earliest first'); prev = s;
      for (const x of att) assert.ok(D.isWorking(x, new Date(s), new Date(e)), `${x.name} (${x.tz}) is not at work for ${p.start}`);
      assert.deepEqual(K.conflictsAt(a, ask, p.start, p.end), [], 'nothing stands in the way');
      for (const x of att) for (const b of K.simulatedBusy(x, s - 86400000, e + 86400000)) assert.ok(!(Date.parse(b.from) < e && Date.parse(b.to) > s), `${x.name} is busy`);
      assert.equal(p.local.length, att.length); for (const l of p.local) assert.match(l.label, /^(Mon|Tue|Wed|Thu|Fri) \d\d:\d\d$/); }
  }
  assert.ok(proposals > 500 && none > 5, `${proposals} proposals, ${none} requests with none`);
});
test('CN-06 across regions: people six hours apart are offered only the hours they share; a late shift and a far region with nothing in common are told so', () => {
  const w = fresh(); const lon = D.personById('sc-EGT', w); const chi = D.personById('p-syseng', w); const res = T.proposeFor(w, { attendees: [lon, chi], roomId: null, minutes: 30, from: MON, days: 5 });
  assert.ok(res.ok); for (const p of res.proposals) { const c = D.localTime('America/Chicago', new Date(p.start)).hhmm; const l = D.localTime('Europe/London', new Date(p.start)).hhmm; assert.ok(c >= '08:30' && c < '11:00', `Chicago ${c}`); assert.ok(l >= '14:30' && l < '17:00', `London ${l}`); assert.match(p.reason, /across 2 time zones/); }
  const late = D.directory(w).find((p) => p.shift?.name === 'Late'); const no = T.proposeFor(w, { attendees: [lon, late], roomId: null, minutes: 60, from: MON, days: 5 });
  assert.equal(no.ok, false); assert.match(no.why, /No time in the next 5 days suits everyone/); assert.match(no.tried[0], /working hours and shifts never overlap/);
  assert.equal(T.proposeFor(w, { attendees: [], roomId: null, minutes: 30, from: MON, days: 5 }).ok, false); assert.equal(T.proposeFor(w, { attendees: [chi], roomId: null, minutes: 5, from: MON, days: 5 }).ok, false);
});
const first = (w, ids, roomId = 'R-ATL-4-220') => { const res = T.proposeFor(w, { attendees: ids.map((id) => D.personById(id, w)), roomId, minutes: 30, from: MON, days: 5 }); assert.ok(res.ok); return res.proposals[0]; };
const conf = (p, key, ids, roomId = 'R-ATL-4-220') => ({ key, subject: 'Camera presets in 4.220', attendeeIds: ids, roomId, start: p.start, end: p.end, note: 'From the room page' });
test('CN-07 a meeting exists only after confirmation; one confirmation makes one meeting however often it is repeated; the room is then taken', () => {
  const w = fresh(); const ids = ['p-syseng', 'sc-ATL']; const p = first(w, ids);
  assert.equal(T.connectView(w).meetings.length, 0, 'asking for times records nothing'); assert.equal((w.bookings['R-ATL-4-220'] || []).length, 0);
  const m = T.confirm(w, 'employee', conf(p, 'k-0000-aaaa', ids), MON); assert.equal(m.id, 'MTG-0001'); assert.equal(m.state, 'RECORDED'); assert.ok(m.eventId.startsWith('SIM-EVT-'));
  assert.match(w.events[0].detail, /recorded in the simulated calendar after confirmation; no invitation left this browser/); assert.ok(!/\bsent\b/i.test(w.events[0].detail));
  for (let i = 0; i < 3; i += 1) { const again = T.confirm(w, 'employee', conf(p, 'k-0000-aaaa', ids), MON); assert.equal(again.id, 'MTG-0001'); assert.equal(again.repeated, true); }
  assert.equal(T.connectView(w).meetings.length, 1); assert.equal(w.bookings['R-ATL-4-220'].length, 1); assert.equal(w.events.filter((e) => e.type === 'meeting.recorded').length, 1, 'one ledger line');
  const other = T.confirm(w, 'exec', conf(p, 'k-0000-bbbb', ['p-ops']), MON); assert.match(other.why[0], /no longer free.*The room is taken then \(Camera presets in 4\.220\)/); assert.equal(w.events[0].outcome, 'DENIED');
  const same = T.confirm(w, 'exec', conf(p, 'k-0000-cccc', ['p-syseng'], null), MON); assert.match(same.why[0], /is busy then/, 'the attendee is now busy at that time');
  const next = first(w, ids); assert.notEqual(next.start, p.start, 'the next proposal avoids the recorded meeting');
});
test('CN-08 a time taken between the proposal and the confirmation is refused, says what took it, and records nothing', () => {
  const w = fresh(); const ids = ['p-svcmgr']; const p = first(w, ids);
  (w.bookings['R-ATL-4-220'] ||= []).push({ from: p.start.slice(0, 16), to: p.end.slice(0, 16), title: 'Fire drill' });   // someone else books the room meanwhile
  const r = T.confirm(w, 'svcmgr', conf(p, 'k-0000-dddd', ids), MON); assert.match(r.why[0], /The room is taken then \(Fire drill\)/); assert.match(r.why[1], /Nothing was recorded/); assert.equal(T.connectView(w).meetings.length, 0);
  const past = T.confirm(w, 'svcmgr', conf(p, 'k-0000-eeee', ids, null), new Date(Date.parse(p.start) + 60000)); assert.match(past.why[0], /has passed/);
  for (const [bad, re] of [[{ subject: 'x' }, /about/], [{ attendeeIds: [] }, /one and twelve/], [{ attendeeIds: ['nobody'] }, /not in the directory/], [{ key: 'short' }, /key/], [{ end: p.start }, /not valid/], [{ roomId: 'R-NO-SUCH' }, /not on record/], [{ attendeeIds: ['p-ops', 'p-ops'] }, /twice/]])
    assert.match(T.confirm(w, 'svcmgr', { ...conf(p, 'k-0000-ffff', ids, null), ...bad }, MON).why.join(' '), re);
});
test('CN-09 the role matrix, all sixteen: who may schedule and whose contact details each role is shown; a refusal is written down and records nothing', () => {
  const champ = by('sc-ATL'); const tech = by('tech-ana');
  for (const k of P.ROLE_KEYS) { const w = fresh(); const p = first(w, ['p-ops'], null); const r = T.confirm(w, k, conf(p, 'k-0000-0001', ['p-ops'], null), MON);
    assert.equal(!('why' in r), P.allows({ action: 'comms.compose' }, k), k); if ('why' in r) { assert.equal(w.events[0].outcome, 'DENIED'); assert.equal(T.connectView(w).meetings.length, 0); }
    assert.equal(T.maySeeContact(k, champ), !['visitor', 'qa'].includes(k), `${k} champion`); assert.equal(T.maySeeContact(k, tech), P.allows({ field: 'person.contact' }, k), `${k} technician`);
    const o = T.opened(w, k, 'teams.chat', tech.id, 'Atlas 4.218'); assert.equal(!('why' in o), T.maySeeContact(k, tech), `${k} opened`); if (!('why' in o)) assert.match(w.events[0].detail, /opened only; nothing was sent by Empathia/); }
  assert.deepEqual(P.ROLE_KEYS.filter((k) => !T.maySchedule(k)).sort(), ['qa', 'visitor']); assert.equal(T.maySeeContact('employee', champ), true); assert.equal(T.maySeeContact('employee', tech), false); assert.equal(T.maySeeContact('visitor', champ), false);
  const w = fresh(); assert.match(T.opened(w, 'ops', 'outlook.compose', tech.id, '').why[0], /not offered/);
});
test('CN-10 cancelling frees the people and the room; only whoever recorded it (or the Product Architect) cancels; stored state of the wrong shape reads as empty', () => {
  const w = fresh(); const ids = ['p-syseng']; const p = first(w, ids); const m = T.confirm(w, 'employee', conf(p, 'k-0000-9999', ids), MON);
  assert.match(T.cancel(w, 'exec', m.id).why[0], /recorded by the Employee/); assert.match(T.cancel(w, 'visitor', m.id).why[0], /does not cancel/); assert.match(T.cancel(w, 'employee', 'MTG-9999').why[0], /No such meeting/);
  assert.deepEqual(T.cancel(w, 'employee', m.id), { ok: true }); assert.equal(w.bookings['R-ATL-4-220'].length, 0); assert.match(T.cancel(w, 'employee', m.id).why[0], /already cancelled/);
  assert.equal(first(w, ids).start, p.start, 'the time is offered again');
  for (const bad of [null, 3, 'x', { meetings: 'no' }, { meetings: [null, { id: 5 }, { id: 'MTG-1', start: 'nope', end: 'nope', attendees: [] }], keys: [] }]) { const x = fresh(); x.cn = bad; const v = T.connectView(x); assert.ok(Array.isArray(v.meetings) && v.meetings.length === 0 && typeof v.keys === 'object'); assert.ok(T.proposeFor(x, { attendees: [D.personById('p-ops', x)], roomId: null, minutes: 30, from: MON, days: 3 }).ok); }
});
// ---- Microsoft Graph, against a mock transport. Fixtures follow the documented shapes (docs/surpass/M365_DEPLOYMENT_AND_TEST_GUIDE.md,
// read on learn.microsoft.com on 2026-11-11). Nothing here contacts Microsoft; nothing here is a verified integration.
const ORG = 'p.organiser@empathia.example';
const scheduleFixture = (items) => ({ status: 200, body: { value: items.map(([id, busy]) => ({ scheduleId: id, availabilityView: '0', scheduleItems: busy.map(([s, e, subject, status = 'busy']) => ({ isPrivate: false, status, subject, location: '', start: { dateTime: `${s}.0000000`, timeZone: 'UTC' }, end: { dateTime: `${e}.0000000`, timeZone: 'UTC' } })), workingHours: { daysOfWeek: ['monday'], startTime: '08:00:00.0000000', endTime: '17:00:00.0000000', timeZone: { name: 'UTC' } } })) } });
test('CN-11 Graph requests are the documented ones: getSchedule and create event, with the client’s transactionId, a Teams meeting, people required and the room a resource', () => {
  const q = G.getScheduleRequest(ORG, ['a@empathia.example', 'room@empathia.example'], '2026-11-16T14:00:00.000Z', '2026-11-16T22:00:00.000Z');
  assert.equal(q.method, 'POST'); assert.equal(q.path, '/users/p.organiser%40empathia.example/calendar/getSchedule'); assert.deepEqual(q.body, { schedules: ['a@empathia.example', 'room@empathia.example'], startTime: { dateTime: '2026-11-16T14:00:00', timeZone: 'UTC' }, endTime: { dateTime: '2026-11-16T22:00:00', timeZone: 'UTC' }, availabilityViewInterval: 30 });
  const c = G.createEventRequest(ORG, { transactionId: 'k-1234-5678', subject: 'S', body: 'B', start: '2026-11-16T15:00:00.000Z', end: '2026-11-16T15:30:00.000Z', attendees: ['a@empathia.example'], room: 'room@empathia.example', online: true });
  assert.equal(c.path, '/users/p.organiser%40empathia.example/events'); assert.equal(c.body.transactionId, 'k-1234-5678'); assert.equal(c.body.isOnlineMeeting, true); assert.equal(c.body.onlineMeetingProvider, 'teamsForBusiness');
  assert.deepEqual(c.body.attendees, [{ emailAddress: { address: 'a@empathia.example' }, type: 'required' }, { emailAddress: { address: 'room@empathia.example' }, type: 'resource' }]); assert.deepEqual(c.body.start, { dateTime: '2026-11-16T15:00:00', timeZone: 'UTC' });
  assert.equal(G.cancelEventRequest(ORG, 'AAMk=').path, '/users/p.organiser%40empathia.example/events/AAMk%3D/cancel');
  for (const v of Object.values(G.GRAPH_CALLS)) { assert.match(v.source, /^https:\/\/learn\.microsoft\.com\/en-us\/graph\//); assert.equal(v.validated, '2026-11-11'); }
});
test('CN-12 Graph responses: the documented schedule shape is read, free items and private subjects are handled, anything malformed is dropped', () => {
  const s = G.parseSchedule(scheduleFixture([['a@empathia.example', [['2026-11-16T15:00:00', '2026-11-16T16:00:00', 'Lunch'], ['2026-11-16T17:00:00', '2026-11-16T17:30:00', 'Hold', 'free']]]]).body);
  assert.deepEqual(s, [{ address: 'a@empathia.example', busy: [{ from: '2026-11-16T15:00:00.000Z', to: '2026-11-16T16:00:00.000Z', what: 'Lunch' }], provenance: 'MOCK' }]);
  assert.deepEqual(G.parseSchedule({ value: [{ scheduleId: 'a@x.example', scheduleItems: [{ isPrivate: true, status: 'busy', subject: 'Secret', start: { dateTime: '2026-11-16T15:00:00' }, end: { dateTime: '2026-11-16T16:00:00' } }] }] })[0].busy[0].what, 'Busy', 'a private subject is not repeated');
  for (const bad of [null, 5, {}, { value: 'x' }, { value: [null, 3, { scheduleId: 7 }, { scheduleId: 'a', scheduleItems: [{ start: {}, end: {} }, 'x'] }] }]) assert.doesNotThrow(() => G.parseSchedule(bad));
  assert.deepEqual(G.parseSchedule({ value: [{ scheduleId: 'a', scheduleItems: [{ start: {}, end: {} }] }] }), [{ address: 'a', busy: [], provenance: 'MOCK' }]);
});
test('CN-13 Graph errors: 401 and 403 are said in words and never retried; 429 waits what the service asked and resends the SAME request; one confirmation, one event', () => {
  const req = { transactionId: 'k-aaaa-bbbb', subject: 'S', body: '', start: '2026-11-16T15:00:00.000Z', end: '2026-11-16T15:30:00.000Z', attendees: ['a@empathia.example'], room: null, online: true };
  for (const [status, code, re] of [[401, 'unauthorized', /Sign in again/], [403, 'forbidden', /Ask your administrator for the Calendars\.ReadWrite permission/], [409, 'conflict', /calendar changed/], [500, 'failed', /answered 500\. Nothing was created/]]) {
    let calls = 0; const a = G.graphAdapter(ORG, () => { calls += 1; return { status }; }); const r = a.createEvent(req); assert.equal(r.ok, false); assert.equal(r.code, code); assert.match(r.message, re); assert.equal(calls, 1, `${status} is not retried`); }
  // throttled twice, then created: the service's own store of transactionIds makes the retry safe; here the mock counts what it was sent
  const seen = []; const events = new Map(); const transport = (r) => { seen.push(r); if (seen.length <= 2) return { status: 429, headers: { 'Retry-After': '7' } }; const id = events.get(r.body.transactionId) || `AAMk-${events.size + 1}`; events.set(r.body.transactionId, id); return { status: 201, body: { id } }; };
  const a = G.graphAdapter(ORG, transport, { retries: 3 }); const made = a.createEvent(req); assert.deepEqual(made, { ok: true, eventId: 'AAMk-1', provenance: 'MOCK' }); assert.deepEqual(a.waited, [7, 7]);
  assert.equal(seen.length, 3); assert.ok(seen.every((r) => JSON.stringify(r) === JSON.stringify(seen[0])), 'every retry is the same request, with the same transactionId'); assert.equal(events.size, 1);
  assert.deepEqual(a.createEvent(req), made, 'confirming again reaches the same event'); assert.equal(events.size, 1);
  const stuck = G.graphAdapter(ORG, () => ({ status: 429, headers: { 'retry-after': '30' } }), { retries: 1 }); const r = stuck.createEvent(req); assert.equal(r.code, 'throttled'); assert.equal(r.retryAfter, 30); assert.match(r.message, /wait 30 seconds/); assert.deepEqual(stuck.waited, [30, 30]);
  const noHeader = G.graphAdapter(ORG, () => ({ status: 429 }), { retries: 2 }); noHeader.createEvent(req); assert.deepEqual(noHeader.waited, [1, 2, 4], 'no header: exponential backoff');
  assert.equal(G.graphAdapter(ORG, () => ({ status: 202 })).cancelEvent('x').ok, true); assert.equal(G.graphAdapter(ORG, () => ({ status: 400 })).cancelEvent('x').ok, false);
  assert.deepEqual(G.graphAdapter(ORG, () => ({ status: 403 })).getSchedule(['a@empathia.example'], req.start, req.end), [], 'a refused read yields no schedule, never a guessed one');
  assert.deepEqual(a.connected(), [], 'not connected to any tenant');
});
test('CN-14 one scheduler, either adapter: given the same busy blocks through Graph’s response shape, the proposals are identical to the simulated calendar’s', () => {
  const w = fresh(); const att = ['p-syseng', 'sc-ATL', 'tech-dev'].map((id) => D.personById(id, w)); const ask = { attendees: att, roomId: 'R-ATL-4-218', minutes: 30, from: MON, days: 5 };
  const sim = T.adapterFor(w); const want = K.propose(sim, ask); assert.ok(want.ok);
  const transport = (r) => { const s = sim.getSchedule(r.body.schedules, `${r.body.startTime.dateTime}Z`, `${r.body.endTime.dateTime}Z`); return scheduleFixture(s.map((x) => [x.address, x.busy.map((b) => [b.from.slice(0, 19), b.to.slice(0, 19), b.what])])); };
  const graph = G.graphAdapter(ORG, transport); const got = K.propose(graph, ask); assert.ok(got.ok); assert.equal(got.provenance, 'MOCK');
  assert.deepEqual(got.proposals.map((p) => [p.start, p.end]), want.proposals.map((p) => [p.start, p.end])); assert.equal(graph.sent[0].path, `/users/${encodeURIComponent(ORG)}/calendar/getSchedule`);
});
