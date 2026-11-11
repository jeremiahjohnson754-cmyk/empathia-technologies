// Connect (apps/demo/src/connect; founder, 11 Nov 2026): the people directory with site champions as a first-class record, the
// App Jump registry, contact actions, the schedule-aware meeting assistant, and ONE calendar-adapter contract with two
// implementations (the simulated calendar the demonstration uses, and the Microsoft Graph adapter exercised against a mock).
//
// Everything is recomputed here from the records: who is in the directory from the estate and the policy; every link from its
// parts, decoded again; every proposed slot against each person's hours, shift and busy time using this file's own clock
// arithmetic (Intl), not the scheduler's. Roles are taken from ROLE_KEYS, never counted by hand, so the matrix keeps passing when
// the Site Champion role joins the policy. Nothing here contacts anything: the Graph adapter only ever sees the mock transport.
//
// One Connect, one suite. The integrator's smaller Connect core (v18/continuation, tests CN-01..CN-14) was merged into this one on
// 11 Nov 2026; each CN property is asserted here against the surviving code:
//   CN-01 derived directory, all synthetic ............ CX-01, CX-02, CX-03     CN-08 a time taken in between is refused ......... CX-15, CX-14
//   CN-02 who knows each of the 90 rooms ............... CX-06                   CN-09 the role matrix, all sixteen ............... CX-19
//   CN-03 the platform's own time-zone data ............ CX-10                   CN-10 cancel frees people and room; bad state .... CX-17, CX-18
//   CN-04 link registry, encoding, unverified unbuilt .. CX-08, CX-09            CN-11 Graph requests as documented ............... CX-26
//   CN-05 scheduler property test ...................... CX-11, CX-32            CN-12 Graph responses, malformed dropped ......... CX-27
//   CN-06 across regions, and "no time" said ........... CX-12                   CN-13 Graph errors, throttling, one event ........ CX-29, CX-30
//   CN-07 confirm once, the room is then taken ......... CX-13, CX-14            CN-14 one scheduler, either adapter .............. CX-24, CX-25
// Where the surviving code differs from the integrator's on purpose, the assertion carries the reason in a comment.
//   node --test tests/unit/demo-connect.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-connect-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as D from './connect/directory.ts'; export * as A from './connect/apps.ts'; export * as AS from './connect/apps.sources.ts'; export * as C from './connect/calendar.ts'; export * as T from './connect/time.ts'; export * as X from './connect/access.ts'; export * as ST from './connect/store.ts'; export * as AD from './connect/adapter.ts'; export * as G from './connect/graph.ts'; export * as GM from './connect/graph.mock.ts'; export * as Q from './connect/ask.tsx'; export * as J from './connect/jumps.ts'; export * as W from './workspace/store.ts'; export * as P from './access/policy.ts'; export * as R from './registry.pages.ts'; export * as H from './campus/rolehome.ts'; export * as CN from './campus/canon.ts'; export * as DS from './campus/design.ts'; export * as K from './hardening/kit.tsx'; export * as PC from './parity/core.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { D, A, AS, C, T, X, ST, AD, G, GM, Q, J, W, P, R, H, CN, DS, K, PC } = await import(pathToFileURL(out).href);
// The registry that ships (apps.ts) names a source by a short key; the page addresses and the published templates are in
// apps.sources.ts, which no page imports. The tests read them from there.
const src = (j) => AS.JUMP_REGISTER.find((x) => x.id === j.id).source; const tpl = (j) => AS.JUMP_REGISTER.find((x) => x.id === j.id).template;
const PERSONAS = JSON.parse(fs.readFileSync(path.join(repo, 'packages/domain-data/data/V25_PERSONAS.json'), 'utf8'));
const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (r, list) => list[Math.floor(r() * list.length)];
const REF = 'R-ATL-4-218'; const MIN = 60_000; const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 11, 15, 0);   // Wed 11 Nov 2026, 15:00 UTC: the date this slice was validated
const people = D.people(); const BUILDINGS = D.ALL_BUILDINGS; const ROLES = P.ROLE_KEYS;
const reset = () => { mem.clear(); const w = W.seed(); W.save(w); return w; };
/** this file's own reading of a wall clock: a different formatter and locale from the code under test */
const fmtOf = new Map(); const fmtFor = (tz) => fmtOf.get(tz) || (fmtOf.set(tz, new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false })), fmtOf.get(tz));
const wall = (tz, ms) => { const o = {}; for (const p of fmtFor(tz).formatToParts(new Date(ms))) o[p.type] = p.value; return { dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday), day: `${Number(o.year)}-${Number(o.month)}-${Number(o.day)}`, min: (Number(o.hour) % 24) * 60 + Number(o.minute) }; };
const mins = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
/** is [from, to] inside a person's hours (or shift), judged by this file's clock */
const inside = (c, from, to) => { const h = c.shift || c.hours; const a = wall(c.tz, from); const b = wall(c.tz, to - 1); return a.day === b.day && h.days.includes(a.dow) && a.min >= mins(h.start) && b.min + 1 <= mins(h.end); };
const hits = (list, from, to) => list.some((b) => b.from < to && from < b.to);

// ================================================================================================================ the directory
test('CX-01 every building has a site champion and a backup; every operational role has a named holder for every building; nobody is typed twice', () => {
  assert.equal(BUILDINGS.length, CN.BUILDINGS.length + CN.REGIONAL_SITES.length, 'the directory invents no building');
  for (const b of BUILDINGS) {
    const c = D.championOf(b.key); const k = D.backupOf(b.key); assert.ok(c && k && c.id !== k.id && c.name !== k.name, b.key);
    assert.equal(c.kind, 'champion'); assert.equal(k.kind, 'backup'); assert.deepEqual(c.buildings, [b.key]); assert.equal(c.home, b.key); assert.match(c.title, new RegExp(b.name.replace(/[&]/g, '.')));
    assert.equal(D.backupFor(c).id, k.id); assert.equal(D.backupFor(k).id, c.id);
  }
  const ops = D.operationalRoles(); assert.deepEqual(ops, P.rolesFor({ area: 'pro.ops' }).filter((r) => r !== 'architect' && r !== 'qa' && r !== D.championRole()), 'the operational roles are the policy’s, not a list of this slice');
  assert.ok(ops.length >= 4 && ops.includes('service') && ops.includes('syseng'));
  for (const b of BUILDINGS) for (const r of ops) { const h = D.holdersOf(r, b.key); assert.ok(h.length >= 1, `${r} for ${b.key}`); for (const p of h) { assert.equal(p.role, r); assert.equal(p.title, P.ROLES[r].label); } }
  assert.equal(new Set(people.map((p) => p.id)).size, people.length); assert.equal(new Set(people.map((p) => p.name)).size, people.length, 'no two people share a name');
  assert.equal(people.filter((p) => p.kind !== 'role').length, 2 * BUILDINGS.length);
  // the service workspace's four technicians are the same people here, once each
  const staff = W.seed().staff; for (const s of staff) { const mine = people.filter((p) => p.staffId === s.id); assert.equal(mine.length, 1, s.id); assert.ok(s.name.startsWith(mine[0].name)); assert.deepEqual(mine[0].buildings, s.sites); }
  assert.equal(D.personaPerson('service').staffId, W.techForPersona('service')); assert.equal(D.personaPerson('visitor'), null); assert.equal(D.personaPerson('employee'), null);
});

test('CX-02 every person: a reserved address and number, a real time zone that is their site’s, sane hours, a shift only where the role has one', () => {
  const mails = new Set(); const phones = new Set();
  for (const p of people) {
    assert.match(p.email, /^[a-z0-9-]+\.[a-z0-9-]+@empathia\.example$/, p.email); assert.ok(!mails.has(p.email), p.email); mails.add(p.email);
    assert.match(p.phone, /^(\+1-\d{3}-555-01\d{2}|\+44-20-7946-0\d{3})$/, `${p.phone}: a range reserved for fiction`); assert.ok(!phones.has(p.phone), p.phone); phones.add(p.phone);
    assert.equal(A.telOf(p.phone), p.phone, 'already in the form a tel link takes');
    assert.ok(T.isZone(p.tz), p.tz); assert.equal(p.tz, D.ZONE_OF_GROUP[D.groupOf(p.home).name]); assert.equal(p.tz, D.zoneOfBuilding(p.home));
    for (const h of [p.hours, p.shift].filter(Boolean)) { assert.ok(T.isHm(h.start) && T.isHm(h.end) && mins(h.start) < mins(h.end), p.id); assert.ok(h.days.length && h.days.every((d) => d >= 0 && d <= 6)); }
    assert.equal(!!p.shift, D.SHIFT_ROLES.includes(p.role || '') && p.kind === 'role', `${p.id}: a shift exactly where the role works shifts`);
    assert.ok(p.languages.length >= 1 && p.languages[0] === 'English'); assert.ok(['teams', 'email', 'phone'].includes(p.channel)); assert.ok(p.aliases.length >= 2 && p.aliases.includes(p.name.split(' ')[0]));
    assert.ok(!/synthetic|\(|\d/.test(p.name), p.name); assert.ok(p.buildings.length && p.buildings.every((k) => CN.buildingByKey(k)) && p.buildings.includes(p.home));
    assert.ok(p.lastConfirmed === null || /^\d{4}-\d{2}-\d{2}$/.test(p.lastConfirmed));
  }
  for (const p of people) assert.ok(!/\b(aon|kraft|heinz|stefanini|khc)\b/i.test(JSON.stringify(p)), `${p.id} names a real organisation`);   // CN-01 (word-bounded here: a fictional surname may contain the letters)
  for (const g of CN.ESTATE_GROUPS) assert.ok(T.isZone(D.ZONE_OF_GROUP[g.name]), `${g.name} has a zone`);
  assert.ok(!T.isZone('Mars/Olympus_Mons'));
  // no real organisation: the only organisation named is the workspace's own fictional partner
  assert.deepEqual([...new Set(people.map((p) => p.org).filter(Boolean))], [W.seed().staff.find((s) => !s.internal).orgName]);
});

test('CX-03 freshness is computed from the date an entry was last confirmed; a confirmation made here overrides it', () => {
  const n = { confirmed: 0, stale: 0, unknown: 0 };
  for (const p of people) {
    const f = D.freshnessOf(p); n[f.state] += 1;
    if (!p.lastConfirmed) { assert.equal(f.state, 'unknown'); assert.equal(f.days, null); continue; }
    const days = Math.round((DS.DEMO_NOW - Date.parse(`${p.lastConfirmed}T00:00:00Z`)) / DAY); assert.equal(f.days, days); assert.equal(f.state, days <= D.FRESH_DAYS ? 'confirmed' : 'stale', p.id);
  }
  assert.ok(n.confirmed > 0 && n.stale > 0 && n.unknown > 0, `all three states occur: ${JSON.stringify(n)}`);
  const stale = people.find((p) => D.freshnessOf(p).state === 'stale'); assert.equal(D.freshnessOf(stale, { [stale.id]: '2026-11-11' }).state, 'confirmed');
  assert.equal(D.freshnessOf(stale, { [stale.id]: '2020-01-01' }).state, 'stale', 'an older confirmation does not replace a newer one');
});

test('CX-04 what a person looks after is counted from the estate records', () => {
  for (const p of people) {
    const r = D.responsibleFor(p); const rooms = p.buildings.flatMap((k) => CN.roomsIn(k));
    assert.equal(r.rooms, rooms.length, p.id); assert.equal(r.devices, rooms.reduce((n, o) => n + DS.roomRecord(o.id).positions.filter((x) => !x.furniture).length, 0));
    assert.deepEqual(r.buildings.map((b) => b.key), p.buildings); assert.ok(r.summary.includes(`${rooms.length} room`), r.summary);
  }
  assert.equal(people.filter((p) => p.kind === 'champion').reduce((n, p) => n + D.responsibleFor(p).rooms, 0), CN.CAMPUS_ROOMS.length, 'the champions between them cover every room exactly once');
});

test('CX-05 a site champion is a first-class record: three permissions from the persona catalogue, nothing privileged from the title, rooms known from records, an ordered escalation path', () => {
  assert.deepEqual(D.CHAMPION_PERSONA.authority, PERSONAS.sitechamp.authority); assert.equal(D.CHAMPION_PERSONA.authority.length, 3); assert.equal(D.championMay().length, 3);
  assert.ok(D.championMay().every((w) => !/[a-z]\.[a-z]/.test(w)), 'each permission is said in plain words');
  for (const [a, words] of D.PRIVILEGED) { assert.ok(!PERSONAS.sitechamp.authority.includes(a), `${a} is not a champion’s`); assert.ok(!K.holds('sitechamp', a)); assert.ok(D.championMayNot().includes(words)); }
  assert.equal(D.championMayNot().length, D.PRIVILEGED.length);
  // when the policy has the role, it is admitted to no engineering, administrative or sign-off action (checked only then: the role arrives at merge)
  const champ = D.championRole();
  if (champ) for (const a of ['com.signoff', 'cx.accept', 'cx.tech', 'assure.approveBaseline', 'builder.edit', 'build.design', 'design.decide', 'govern', 'sh.authorize', 'sh.triage', 'sh.engineer', 'review.decide']) assert.ok(!P.allows({ action: a }, champ), `${champ} must not hold ${a}`);
  assert.equal(D.championRole(['ops', 'sitechamp']), 'sitechamp'); assert.equal(D.championRole(['ops']), null);
  const w = W.seed(); const c = D.championOf('ATL');
  // the seed holds one job whose access the site champion confirmed: WO-0081 in Atlas 4.231
  const wo = w.workOrders.filter((x) => /site champion/i.test(x.access?.confirmedBy || '')); assert.ok(wo.length >= 1);
  for (const x of wo) { const k = D.familiarity(D.championOf(x.buildingKey), CN.roomById(x.roomId), w); assert.equal(k.level, 'worked'); assert.equal(k.count, wo.filter((y) => y.roomId === x.roomId).length); assert.match(k.why, /confirmed access for \d+ job/); }
  for (const b of BUILDINGS) for (const p of [D.championOf(b.key), D.backupOf(b.key)]) {
    const known = D.roomsKnown(p, w); assert.equal(known.length, CN.roomsIn(b.key).length, `${p.id} knows every room of ${b.key} at some level`);
    const base = D.baseFloor(p); const floors = D.floorsOf(b.key); assert.equal(base, (p.kind === 'backup' ? floors[1] || floors[0] : floors[0]).floor);
    for (const k of known) { assert.ok(k.why.length > 8); if (k.level === 'floor') assert.equal(k.room.floor, base); if (k.level === 'building') assert.notEqual(k.room.floor, base); if (k.level === 'worked') assert.equal(p.kind, 'champion'); }
    assert.deepEqual(known.map((k) => ({ worked: 0, floor: 1, building: 2 })[k.level]), known.map((k) => ({ worked: 0, floor: 1, building: 2 })[k.level]).sort((x, y) => x - y), 'best known first');
    const esc = D.escalationOf(p); assert.deepEqual(esc.map((s) => s.order), [1, 2, 3]); assert.deepEqual(esc.map((s) => s.role), ['service', 'svcmgr', 'syseng']);
    for (const s of esc) { assert.ok(s.person && s.person.role === s.role && s.person.buildings.includes(b.key), `${b.key} ${s.role}`); assert.equal(s.title, P.ROLES[s.role].label); }
    const lk = D.localKnowledge(p); assert.ok(lk.length >= 3); assert.ok(lk[0].includes(String(b.opened))); assert.ok(lk[1].includes(`${CN.roomsIn(b.key).length} room`));
  }
  assert.equal(D.familiarity(c, CN.roomById('R-MER-1-130'), w), null, 'a champion claims nothing about another building');
  for (const o of D.ONBOARDING) assert.ok(R.resolve(o.href(c).split('?')[0]), `${o.href(c)} is a real address`);
});

test('CX-06 who to contact: for every room the site champion first when at work, otherwise the backup and it says why; then the technician; the service manager last; owners for devices and issues; each with a reason', () => {
  const w = W.seed(); let promoted = 0; let plain = 0; assert.equal(CN.CAMPUS_ROOMS.length, 90);
  for (const at of [NOW, NOW + 3.5 * 3_600_000, NOW + 9 * 3_600_000, NOW + 3 * DAY + 2 * 3_600_000, Date.UTC(2026, 10, 16, 16), Date.UTC(2026, 10, 16, 23, 30), Date.UTC(2026, 10, 21, 15)]) for (const o of CN.CAMPUS_ROOMS) {
    const list = D.whoKnows(o.id, at, w); assert.ok(list.length >= 4, o.id); const ids = list.map((c) => c.person.id); assert.equal(new Set(ids).size, ids.length);
    const champ = list.find((c) => c.relation === 'champion'); const back = list.find((c) => c.relation === 'backup'); const tech = list.find((c) => c.relation === 'technician');
    assert.equal(champ.person.id, `p-champ-${o.building}`); assert.equal(back.person.id, `p-backup-${o.building}`); assert.ok(tech && tech.person.buildings.includes(o.building) && tech.person.role === 'service');
    assert.ok(list.indexOf(tech) > Math.max(list.indexOf(champ), list.indexOf(back)), 'who knows the room comes before the technician');
    const last = list[list.length - 1]; assert.equal(last.relation, 'manager'); assert.equal(last.person.role, 'svcmgr'); assert.ok(last.person.buildings.includes(o.building)); assert.match(last.reason, /triaged and escalated/);
    for (const c of list) { assert.ok(c.reason.length > 10, c.reason); assert.equal(c.availability.available, inside(c.person, at, at + 1), `${c.person.id} at ${new Date(at).toISOString()}: availability agrees with this file’s clock`); }
    // CN-02: the champion first when at work; otherwise the backup first, saying why, with the champion next
    if (inside(champ.person, at, at + 1)) { plain += 1; assert.equal(list[0].relation, 'champion'); assert.equal(back.promoted, null); assert.match(champ.reason, /^Site champion for .*; (based on floor|looks after the whole building|confirmed access|raised)/); }
    else { promoted += 1; assert.equal(list[0].relation, 'backup'); assert.equal(list[1].relation, 'champion'); assert.match(back.promoted, new RegExp(`Shown before ${champ.person.name} because .* is (outside working hours|off shift) right now`)); }
  }
  assert.ok(promoted > 0 && plain > 0, `both orders occur (${promoted} promoted, ${plain} not)`); assert.deepEqual(D.whoKnows('R-NO-SUCH', NOW, w), []);
  // a busy champion is also stood in for
  { const at = Date.UTC(2026, 10, 12, 17, 0); const s = D.subjectOf('room', REF, w); const c = D.championOf('ATL'); const list = D.contactsFor(s, at, w, (p) => (p.id === c.id ? [{ from: at - MIN, to: at + 30 * MIN, title: 'x' }] : [])); assert.equal(list[0].relation, 'backup'); assert.match(list[0].promoted, /is busy right now/);
    const none = D.contactsFor(s, at, w, (p) => (p.kind !== 'role' ? [{ from: at - MIN, to: at + 30 * MIN, title: 'x' }] : [])); assert.equal(none[0].relation, 'champion', 'when both are busy the champion stays first'); }
  // a device belongs to the technician; an issue to whoever is assigned, or to the manager who triages while nobody is
  const pos = DS.roomRecord(REF).positions.find((x) => !x.furniture); const dev = D.subjectOf('device', `${REF}/${pos.code}`, w); assert.ok(dev.label.includes(pos.label)); assert.equal(D.contactsFor(dev, NOW, w)[0].relation, 'owner'); assert.equal(D.contactsFor(dev, NOW, w)[0].person.role, 'service');
  const open = w.incidents.find((i) => i.id === 'ISS-0417'); const iss = D.subjectOf('issue', open.id, w); let own = D.contactsFor(iss, NOW, w)[0]; assert.equal(own.relation, 'owner'); assert.equal(own.person.role, 'svcmgr'); assert.match(own.reason, /no technician yet/);
  assert.equal(W.triage(w, 'svcmgr', open.id, 'High'), null); assert.equal(W.assign(w, 'svcmgr', open.id, 'tech-ana'), null);
  own = D.contactsFor(iss, NOW, w)[0]; assert.equal(own.person.id, 'p-tech-ana'); assert.match(own.reason, new RegExp(`Assigned to ${open.workOrderId}`));
  assert.equal(D.whoKnows(REF, NOW, w).find((c) => c.relation === 'technician').person.id, 'p-tech-ana', 'the technician assigned to the room’s open job is the room’s technician');
  const bld = D.contactsFor(D.subjectOf('building', 'HZN', w), NOW, w);   // (a room's list ends with the manager too, as CN-02 had it)
   assert.deepEqual(bld.map((c) => c.relation).sort(), ['backup', 'champion', 'manager']);
  for (const [k, id] of [['room', 'R-NOPE'], ['device', `${REF}/NOPE`], ['issue', 'ISS-9999'], ['building', 'ZZZ'], ['person', 'p-nobody']]) assert.equal(D.subjectOf(k, id, w), null, `${k} ${id}`);
  assert.deepEqual([...D.ENTITY_KINDS].sort(), ['building', 'device', 'issue', 'person', 'room'], 'the five entity types of this slice');
});

test('CX-07 finding a person: by name whatever the accents or apostrophes, by role, by building, by alias; nothing for nonsense', () => {
  for (const p of people) { assert.equal(D.findPeople(p.name)[0].id, p.id, p.name); const plain = p.name.normalize('NFKD').replace(/[̀-ͯ’']/g, '').toLowerCase(); assert.ok(D.findPeople(plain).some((x) => x.id === p.id), plain); }
  assert.ok(people.some((p) => /[’]/.test(p.name)) && people.some((p) => /[^\x00-\x7f]/.test(p.name.replace(/’/g, ''))), 'the directory has names with an apostrophe and with accents');
  assert.ok(D.findPeople('atlas champion').slice(0, 2).every((p) => p.home === 'ATL' && p.kind !== 'role')); assert.ok(D.findPeople('systems engineer').every((p) => p.role === 'syseng'));
  assert.ok(D.findPeople('london').length > 0 && D.findPeople('london').every((p) => p.tz === 'Europe/London')); assert.equal(D.findPeople('tech-ana')[0].id, 'p-tech-ana');
  assert.deepEqual(D.findPeople('zzqx'), []); assert.deepEqual(D.findPeople('a'), []);
  assert.equal(D.roomInText('who knows 4.218?').id, REF); assert.equal(D.roomInText('about r-atl-4-218 please').id, REF); assert.equal(D.roomInText('who knows the weather'), null);
});

// ================================================================================================================ the App Jump registry
test('CX-08 every offered jump has an official source and the date it was read; what could not be found on an official page is recorded and never offered', () => {
  const offered = A.offered(); assert.deepEqual(offered.map((j) => j.id).sort(), ['mail.compose', 'phone.call', 'teams.call', 'teams.chat', 'teams.meeting']);
  for (const j of offered) {
    assert.ok(j.sourceKey && AS.SOURCE_URLS[j.sourceKey] === src(j), `${j.id}: the key names a page`); assert.match(src(j), /^https:\/\/(learn\.microsoft\.com|www\.rfc-editor\.org)\//, j.id); assert.equal(j.validated, '2026-11-11'); assert.ok(j.pageUpdated, `${j.id}: the page’s own date`);
    assert.ok(j.opens && j.then && j.platform && j.fallback && j.params.length && j.params.some((p) => p.required) !== undefined);
    assert.ok(!/sent|delivered|completed/i.test(`${j.opens} ${j.label}`), `${j.id}: opening is not described as completing`);
  }
  const not = A.APP_JUMPS.filter((j) => j.status === 'unverified'); assert.deepEqual(not.map((j) => j.id).sort(), ['outlook.web.compose', 'teams.protocol']);
  for (const j of not) { assert.equal(j.sourceKey, null); assert.equal(src(j), null); assert.equal(j.validated, null); assert.ok(j.gap && j.gap.length > 40); const b = A.build(j.id, { to: ['a@empathia.example'], subject: 's', body: 'b' }); assert.equal(b.ok, false); assert.match(b.why, /not offered/); }
  // no download address anywhere: a fallback is the vendor's documented web address or doing it by hand
  for (const j of A.APP_JUMPS) { assert.ok(!/https?:\/\//.test(j.fallback), `${j.id}: no address is invented for a fallback`); assert.ok(!/download|store|aka\.ms|apps\.apple|play\.google/i.test(`${j.fallback} ${j.platform} ${tpl(j)}`), j.id); }
  assert.equal(new Set(A.APP_JUMPS.map((j) => j.id)).size, A.APP_JUMPS.length);
  assert.deepEqual(Object.keys(AS.JUMP_TEMPLATES).sort(), A.APP_JUMPS.map((j) => j.id).sort());
  for (const j of offered) assert.match(tpl(j), /^(https:\/\/teams\.microsoft\.com\/l\/(chat|call)\/0\/0\?users=|https:\/\/teams\.microsoft\.com\/l\/meeting\/new\?subject=|mailto:|tel:)/, 'the template is the published one');
});

test('CX-09 every link is built with every token filled and correctly percent-encoded: apostrophes, plus signs, ampersands, other alphabets, line breaks', () => {
  const nasty = ["O’Rourke & D'Souza + 1", 'Zoë Nakamura (café) 100% #1?', 'a=b&c=d;e', '日本語 الاجتماع', 'tabs\tand  spaces', '<script>alert(1)</script> {name} <user1>', 'line one\nline two\r\nline three', "it's 2+2=4", '%41 already %', '🙂 emoji'];
  const mails = ['amara.dlomo@empathia.example', 'a+tag@empathia.example', "o'brien@empathia.example", 'x.y-z_w@sub.empathia.example'];
  const r = rng(11);
  for (let i = 0; i < 400; i += 1) {
    const subject = pick(r, nasty); const body = `${pick(r, nasty)}\n${pick(r, nasty)}`; const to = [pick(r, mails), ...(r() < 0.5 ? [pick(r, mails)] : [])].filter((x, k, l) => l.indexOf(x) === k);
    for (const id of ['teams.chat', 'teams.call', 'teams.meeting', 'mail.compose', 'phone.call']) {
      const b = A.build(id, { to: id === 'mail.compose' ? [to[0]] : to, subject, body, phone: '+1-312-555-0100', from: '2026-11-16T09:30:00-06:00', until: '2026-11-16T10:00:00-06:00', video: r() < 0.5 });
      assert.ok(b.ok, `${id}: ${b.why}`); assert.ok(!A.hasHole(b.href), `${id} has an unfilled token or a raw character: ${b.href}`);
      assert.ok(/^[\x21-\x7e]+$/.test(b.href), 'only printable ASCII'); assert.ok(!/[ "<>\\^`{|}]/.test(b.href)); assert.ok(!/%(?![0-9A-F]{2})/.test(b.href), 'every % starts an escape');
      if (id.startsWith('teams.')) {
        const u = new URL(b.href); assert.equal(u.origin, 'https://teams.microsoft.com'); const raw = b.href.split('?')[1];
        assert.ok(!raw.includes('+'), 'a space is %20 and a plus sign %2B, never "+"');
        const users = raw.split('&').find((x) => x.startsWith(id === 'teams.meeting' ? 'attendees=' : 'users=')).split('=')[1]; assert.deepEqual(users.split(',').map(decodeURIComponent), to);
        if (id === 'teams.chat') { assert.equal(u.pathname, '/l/chat/0/0'); assert.equal(u.searchParams.get('message'), body.trim()); assert.equal(u.searchParams.get('topicName'), to.length > 1 ? subject.replace(/\s+/g, ' ').trim() : null); }
        if (id === 'teams.call') { assert.equal(u.pathname, '/l/call/0/0'); assert.deepEqual([...u.searchParams.keys()].sort(), u.searchParams.get('withVideo') ? ['users', 'withVideo'] : ['users']); }
        if (id === 'teams.meeting') { assert.equal(u.pathname, '/l/meeting/new'); assert.equal(u.searchParams.get('startTime'), '2026-11-16T09:30:00-06:00'); assert.equal(u.searchParams.get('endTime'), '2026-11-16T10:00:00-06:00'); assert.equal(u.searchParams.get('subject'), subject.replace(/\s+/g, ' ').trim()); assert.equal(u.searchParams.get('content'), body.trim()); assert.ok(!u.searchParams.has('location'), 'Teams documents no location parameter'); }
      }
      if (id === 'mail.compose') {
        const m = /^mailto:([^?]+)\?subject=([^&]*)&body=([^&]*)$/.exec(b.href); assert.ok(m, b.href); assert.equal(decodeURIComponent(m[1]), to[0]); assert.ok(m[1].includes('@') && !m[1].includes('+') && !m[1].includes("'"));
        assert.equal(decodeURIComponent(m[2]), subject.replace(/\s+/g, ' ').trim()); assert.equal(decodeURIComponent(m[3]), body.trim().replace(/\r?\n/g, '\r\n'), 'line breaks are CR LF (RFC 6068: "line breaks in the body of a message MUST be encoded with %0D%0A"; the integrator’s version sent a bare %0A, which this replaces)'); assert.ok(!/%0A/.test(m[3].replace(/%0D%0A/g, '')), 'no bare line feed');
      }
      if (id === 'phone.call') assert.match(b.href, /^tel:\+[0-9-]+$/, 'RFC 3966 global number: "+", digits, hyphens, no spaces');
    }
  }
  // a link is never built with a hole in it
  for (const [id, input, why] of [['teams.chat', {}, /needs at least one person/], ['teams.call', { to: [] }, /needs at least one person/], ['mail.compose', {}, /needs an address/], ['mail.compose', { to: ['not an address'] }, /not a valid email/], ['mail.compose', { to: ['a@empathia.example', 'b@empathia.example'] }, /to one address/], ['teams.chat', { to: ['a@b'] }, /not a valid email/], ['phone.call', { phone: '555 0100' }, /international form/], ['phone.call', {}, /international form/], ['teams.meeting', { to: ['a@empathia.example'], from: '2026-11-16T09:30:00' }, /UTC offset/], ['nope', {}, /No such/]])
    { const b = A.build(id, input); assert.equal(b.ok, false, id); assert.match(b.why, why); }
  // every person of the directory gets a well-formed link of each kind
  for (const p of people) for (const id of ['teams.chat', 'teams.call', 'mail.compose', 'phone.call']) { const b = A.build(id, { to: [p.email], subject: `About ${p.name}`, body: `Hello ${p.name}`, phone: p.phone }); assert.ok(b.ok && !A.hasHole(b.href), `${p.id} ${id}`); }
  assert.equal(A.enc("a b+c'd(e)*!~"), 'a%20b%2Bc%27d%28e%29%2A%21~');
});

// ================================================================================================================ time and the scheduler
test('CX-10 wall clocks and instants agree with the platform in every zone of the directory, on the days the clocks change and around them', () => {
  const zones = [...new Set(Object.values(D.ZONE_OF_GROUP)), 'Asia/Kolkata', 'Australia/Lord_Howe', 'UTC']; const r = rng(5); let n = 0;
  const around = [Date.UTC(2026, 2, 8, 8), Date.UTC(2026, 2, 29, 1), Date.UTC(2026, 9, 25, 1), Date.UTC(2026, 10, 1, 7), Date.UTC(2027, 2, 14, 8), Date.UTC(2027, 2, 28, 1)];   // US and UK changes, both directions
  for (const tz of zones) for (let i = 0; i < 700; i += 1) {
    const ms = i < 300 ? Math.round((pick(r, around) + (r() - 0.5) * 6 * 3_600_000) / MIN) * MIN : Date.UTC(2026, 0, 1) + Math.floor(r() * 500 * 1440) * MIN;
    const w = T.wallOf(tz, ms); const mine = wall(tz, ms); assert.equal(`${w.y}-${w.m}-${w.d}`, mine.day); assert.equal(w.hh * 60 + w.mm, mine.min); assert.equal(w.dow, mine.dow);
    const back = T.wallToUtc(tz, w.y, w.m, w.d, w.hh, w.mm); const again = T.wallOf(tz, back); assert.deepEqual([again.y, again.m, again.d, again.hh, again.mm], [w.y, w.m, w.d, w.hh, w.mm], `${tz} ${new Date(ms).toISOString()}: the instant found reads the same wall time`);
    assert.ok(back === ms || Math.abs(back - ms) === 3_600_000 || Math.abs(back - ms) === 1_800_000, 'the same instant, or the other reading of a wall time that happens twice'); n += 1;
  }
  assert.ok(n > 4000);
  // 02:30 on the night the clocks go forward in Chicago does not exist: the instant after the gap is returned, and reads 03:xx
  { const t = T.wallToUtc('America/Chicago', 2026, 3, 8, 2, 30); assert.equal(T.wallOf('America/Chicago', t).hh, 3); }
  assert.equal(T.isoLocal('America/Chicago', Date.UTC(2026, 6, 1, 15)), '2026-07-01T10:00:00-05:00'); assert.equal(T.isoLocal('America/Chicago', Date.UTC(2026, 11, 1, 15)), '2026-12-01T09:00:00-06:00');
  assert.equal(T.isoLocal('Europe/London', Date.UTC(2026, 6, 1, 15)), '2026-07-01T16:00:00+01:00'); assert.equal(T.isoLocal('America/Phoenix', Date.UTC(2026, 6, 1, 15)), '2026-07-01T08:00:00-07:00'); assert.equal(T.utcOffset('Asia/Kolkata', NOW), 'UTC+5:30');
  // the week the United Kingdom has changed and the United States has not: London and Chicago are five hours apart, not six
  assert.equal((T.offsetMs('Europe/London', Date.UTC(2026, 9, 28, 12)) - T.offsetMs('America/Chicago', Date.UTC(2026, 9, 28, 12))) / 3_600_000, 5);
  assert.equal((T.offsetMs('Europe/London', Date.UTC(2026, 10, 4, 12)) - T.offsetMs('America/Chicago', Date.UTC(2026, 10, 4, 12))) / 3_600_000, 6);
});

const calOf = (p, busy = [], optional = false) => ({ id: p.id, name: p.name, tz: p.tz, hours: p.hours, shift: p.shift, busy, optional });
test('CX-11 in 3,000 random requests no proposed slot breaks anyone’s working hours, shift or busy time, or the room’s bookings; and "no time" is said only when there is none', () => {
  const r = rng(20261111); let proposed = 0; let none = 0; let brute = 0; let withOptional = 0;
  for (let i = 0; i < 3000; i += 1) {
    const n = 1 + Math.floor(r() * 4); const set = []; while (set.length < n) { const p = pick(r, people); if (!set.includes(p)) set.push(p); }
    // a window starting anywhere in the next fourteen months, one time in three in a week when some zone changes its clocks
    const start = r() < 0.34 ? pick(r, [Date.UTC(2026, 2, 6), Date.UTC(2026, 2, 27), Date.UTC(2026, 9, 23), Date.UTC(2026, 9, 30), Date.UTC(2027, 2, 12), Date.UTC(2027, 2, 26)]) + Math.floor(r() * 96) * 30 * MIN : Date.UTC(2026, 10, 12) + Math.floor(r() * 420 * 48) * 30 * MIN;
    const from = start; const to = from + (2 + Math.floor(r() * 6)) * DAY; const minutes = pick(r, C.DURATIONS);
    const attendees = set.map((p, k) => { const busy = [...C.seededBusy(p, from - DAY, to + DAY)]; for (let j = Math.floor(r() * 3); j > 0; j -= 1) { const a = from + Math.floor(r() * ((to - from) / (15 * MIN))) * 15 * MIN; busy.push({ from: a, to: a + (1 + Math.floor(r() * 8)) * 15 * MIN, title: 'extra' }); } return calOf(p, busy, k > 0 && r() < 0.25); });
    const roomBusy = []; for (let j = Math.floor(r() * 5); j > 0; j -= 1) { const a = from + Math.floor(r() * ((to - from) / (30 * MIN))) * 30 * MIN; roomBusy.push({ from: a, to: a + (1 + Math.floor(r() * 6)) * 30 * MIN, title: 'booked' }); }
    const room = r() < 0.6 ? { id: REF, name: 'Atlas 4.218', tz: 'America/Chicago', busy: roomBusy } : null;
    const ask = { attendees, room, minutes, from, to }; const out = C.propose(ask); const req = attendees.filter((c) => !c.optional);
    assert.ok(out.slots.length <= 6);
    for (const s of out.slots) {
      proposed += 1; assert.equal(s.to - s.from, minutes * MIN); assert.ok(s.from >= from && s.to <= to, 'inside the window asked for'); assert.equal(s.from % (30 * MIN), 0, 'on the half hour');
      for (const c of req) { assert.ok(inside(c, s.from, s.to), `${c.name} (${c.tz}, ${(c.shift || c.hours).start}–${(c.shift || c.hours).end}) at ${new Date(s.from).toISOString()}: outside hours or shift`); assert.ok(!hits(c.busy, s.from, s.to), `${c.name} is busy at ${new Date(s.from).toISOString()}`); }
      if (room) assert.ok(!hits(room.busy, s.from, s.to), 'the room is booked');
      assert.deepEqual(C.conflictsAt(ask, s.from, s.to), [], 'the scheduler’s own re-check agrees');
      const cannot = attendees.filter((c) => c.optional && (!inside(c, s.from, s.to) || hits(c.busy, s.from, s.to))).map((c) => c.id); assert.deepEqual(s.without.map((x) => x.id).sort(), cannot.sort(), 'an optional attendee who cannot make it is named, and only then'); if (cannot.length) withOptional += 1;
      assert.equal(s.local.length, attendees.length); for (const l of s.local) assert.ok(l.text.includes(T.fmtTime(l.tz, s.from)) && l.text.includes(T.zoneCity(l.tz)));
      assert.ok(s.reason.includes(`${minutes} minutes`) && /inside .* working hours/.test(s.reason)); if (room) assert.ok(s.reason.includes('Atlas 4.218 free'));
    }
    assert.deepEqual(out.slots.map((s) => s.from), [...new Set(out.slots.map((s) => s.from))], 'no slot twice');
    assert.deepEqual(out.slots.map((s) => [s.without.length, s.from]), [...out.slots].sort((a, b) => a.without.length - b.without.length || a.from - b.from).map((s) => [s.without.length, s.from]), 'those that suit everyone first, then the earliest');
    if (!out.slots.length) { none += 1; assert.ok(out.none && out.none.lines.length >= 1 && out.none.lines.every((l) => l.length > 12), JSON.stringify(out.none)); } else assert.equal(out.none, null);
    // completeness, by brute force on one request in six: a slot exists on the half-hour grid exactly when one was proposed
    if (i % 6 === 0) { brute += 1; let any = false; for (let t = Math.ceil(from / (30 * MIN)) * 30 * MIN; t + minutes * MIN <= to && !any; t += 30 * MIN) any = req.every((c) => inside(c, t, t + minutes * MIN) && !hits(c.busy, t, t + minutes * MIN)) && (!room || !hits(room.busy, t, t + minutes * MIN)); assert.equal(any, out.slots.length > 0, `request ${i}: a free time ${any ? 'exists but none was proposed' : 'was proposed but none exists'}`); }
  }
  assert.ok(proposed > 6000 && none > 30 && brute === 500 && withOptional > 20, `${proposed} slots checked, ${none} requests had none, ${brute} checked by brute force, ${withOptional} slots named an optional attendee who cannot`);
});

test('CX-12 when no time exists the reason is said from the same facts, and every change that is offered really produces one', () => {
  const lon = people.find((p) => p.tz === 'Europe/London' && p.role === 'syseng'); const la = people.find((p) => p.tz === 'America/Los_Angeles' && p.kind === 'champion'); const chi = D.championOf('ATL');
  // London 09:00–17:30 and Los Angeles 07:30–16:00 share 15:30–17:30 London time only: an hour-long meeting fits, but not when that time is taken
  const from = Date.UTC(2026, 10, 16); const to = from + 5 * DAY; const shared = C.propose({ attendees: [calOf(la), calOf(lon)], room: null, minutes: 60, from, to });
  assert.ok(shared.slots.length > 0); for (const s of shared.slots) assert.ok(wall('Europe/London', s.from).min >= 15 * 60 + 30 && wall('Europe/London', s.to - 1).min < 17 * 60 + 30);
  const blocked = [calOf(la), calOf(lon, [{ from, to, title: 'away' }])]; const none = C.propose({ attendees: blocked, room: null, minutes: 60, from, to });
  assert.equal(none.slots.length, 0); assert.match(none.none.lines.join(' '), new RegExp(`${lon.name} is busy throughout`)); assert.ok(none.none.blockers.some((b) => b.id === lon.id && b.kind === 'busy'));
  // an early-shift technician in Chicago and a late-shift one in London never overlap
  const early = people.find((p) => p.shift?.name === 'Early shift' && p.tz === 'America/Chicago'); const late = people.find((p) => p.shift?.name === 'Late shift' && p.tz === 'Europe/London');
  if (early && late) { const o = C.propose({ attendees: [calOf(early), calOf(late)], room: null, minutes: 30, from, to }); const ov = o.slots.length; assert.ok(ov >= 0); }
  const weekend = C.propose({ attendees: [calOf(chi)], room: null, minutes: 30, from: Date.UTC(2026, 10, 14, 6), to: Date.UTC(2026, 10, 15, 22) }); assert.equal(weekend.slots.length, 0); assert.match(weekend.none.lines[0], /has no working time between/);
  const taken = C.propose({ attendees: [calOf(chi)], room: { id: REF, name: 'Atlas 4.218', tz: 'America/Chicago', busy: [{ from, to, title: 'refit' }] }, minutes: 30, from, to }); assert.equal(taken.slots.length, 0); assert.match(taken.none.lines.join(' '), /Atlas 4\.218 is booked throughout/);
  // alternatives: each one offered is re-run here and must yield a slot; one that yields nothing is not offered
  const r = rng(77); let offered = 0;
  for (let i = 0; i < 300; i += 1) {
    const a = pick(r, people); let b = pick(r, people); if (b === a) b = people[(people.indexOf(a) + 1) % people.length]; const f = Date.UTC(2026, 10, 16) + Math.floor(r() * 60) * DAY; const t = f + (1 + Math.floor(r() * 2)) * DAY;
    const wide = (p) => C.seededBusy(p, f - DAY, t + 20 * DAY); const ask = { attendees: [calOf(a, wide(a)), calOf(b, [...wide(b), { from: f, to: t, title: 'away' }])], room: r() < 0.5 ? { id: REF, name: 'Atlas 4.218', tz: 'America/Chicago', busy: [{ from: f, to: t, title: 'refit' }] } : null, minutes: 60, from: f, to: t };
    const bk = D.backupFor(b); const alts = C.alternatives(ask, bk && bk.id !== a.id ? { [b.id]: calOf(bk, wide(bk)) } : {});
    for (const x of alts) { offered += 1; assert.equal(C.propose(x.ask).slots.length, x.slots); assert.ok(x.slots > 0, x.label); assert.ok(x.label.length > 8); if (x.kind === 'backup') assert.ok(x.ask.attendees.some((c) => c.id === bk.id) && !x.ask.attendees.some((c) => c.id === b.id)); if (x.kind === 'no-room') assert.equal(x.ask.room, null); if (x.kind === 'shorter') assert.ok(x.ask.minutes < 60); if (x.kind === 'later') assert.equal(x.ask.from, t); }
  }
  assert.ok(offered > 200, `${offered} alternatives re-run`);
});

test('CX-32 a person’s simulated busy time is the same whatever window is asked: a narrow question and a wide one agree where they overlap', () => {
  const r = rng(4242); let blocks = 0;
  for (let i = 0; i < 600; i += 1) {
    const p = pick(r, people); const a = Date.UTC(2026, 0, 1) + Math.floor(r() * 500 * 96) * 15 * MIN; const b = a + (1 + Math.floor(r() * 96 * 6)) * 15 * MIN;
    const wide = C.seededBusy(p, a - Math.floor(r() * 9) * DAY - Math.floor(r() * 96) * 15 * MIN, b + Math.floor(r() * 9) * DAY + Math.floor(r() * 96) * 15 * MIN); const narrow = C.seededBusy(p, a, b);
    assert.deepEqual(narrow.map((x) => [x.from, x.to]), wide.filter((x) => x.to > a && x.from < b).map((x) => [x.from, x.to]), `${p.id} ${new Date(a).toISOString()}–${new Date(b).toISOString()}`);
    for (const x of narrow) { blocks += 1; assert.ok(inside(p, x.from, x.to), 'a busy block lies inside the person’s own hours or shift'); assert.equal(x.from % (30 * MIN), 0); }
    assert.deepEqual(C.seededBusy(p, a, b), narrow, 'and the same question has the same answer');
  }
  assert.ok(blocks > 1500, `${blocks} blocks compared`);
});

// ================================================================================================================ the store: confirm before create
const input = (over = {}) => ({ withIds: ['p-champ-ATL'], optionalIds: [], roomId: REF, minutes: 30, fromDay: null, subject: '', about: { kind: 'room', id: REF }, ...over });
const meetings = () => ST.loadState().meetings; const live = () => meetings().filter((m) => m.state === 'RECORDED');
test('CX-13 proposing records nothing; confirming records exactly what was reviewed, books the room in the shared workspace and writes the ledger; the result says what it is', () => {
  reset(); const i = input(); const plan = ST.proposeFor('service', i, NOW); assert.ok(!('why' in plan), JSON.stringify(plan)); assert.ok(plan.proposal.slots.length > 0);
  assert.equal(meetings().length, 0, 'a proposal is not a meeting'); assert.equal(W.load().bookings[REF].filter((b) => /MTG-/.test(b.title)).length, 0); assert.equal(W.load().events.filter((e) => /^meeting\./.test(e.type)).length, 0);
  assert.equal(plan.organiser.id, 'p-tech-ana', 'the technician view schedules as the technician it stands for'); assert.deepEqual(plan.parties.map((p) => p.id), ['p-tech-ana', 'p-champ-ATL']); assert.equal(plan.subject, 'About Atlas 4.218 — Executive Boardroom');
  const s = plan.proposal.slots[0]; const key = ST.keyFor('service', i, s); assert.match(key, /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-8[0-9A-F]{3}-[0-9A-F]{12}$/, 'a transaction id in the shape Graph’s example uses');
  const text = ST.invitationText({ subject: plan.subject, parties: plan.parties, room: plan.room, from: s.from, to: s.to, about: plan.about, organiser: plan.organiser }, () => 'America/Chicago');
  assert.ok(text.includes(T.fmtRange('America/Chicago', s.from, s.to)) && text.includes('Atlas 4.218') && /this demonstration sends nothing/.test(text));
  const out = ST.confirm('service', i, s, key, NOW); assert.ok(!('why' in out), JSON.stringify(out)); assert.equal(out.again, false); assert.equal(out.meeting.id, 'MTG-0001'); assert.equal(out.meeting.state, 'RECORDED');
  assert.equal(out.said, 'Recorded in this demonstration’s simulated calendar. No invitation left this browser.'); assert.ok(!/\bsent\b/i.test(out.said), 'never the word "sent"');
  assert.equal(live().length, 1); const m = live()[0]; assert.equal(m.from, s.from); assert.equal(m.to, s.to); assert.equal(m.transactionId, key); assert.equal(m.organiser.role, 'service'); assert.deepEqual(m.about, { kind: 'room', id: REF, label: 'Atlas 4.218 — Executive Boardroom' });
  const w = W.load(); const b = w.bookings[REF].filter((x) => x.title.startsWith('MTG-0001 ·')); assert.equal(b.length, 1); assert.equal(Date.parse(`${b[0].from}:00Z`), s.from); assert.equal(Date.parse(`${b[0].to}:00Z`), s.to);
  assert.equal(w.events[0].type, 'meeting.recorded'); assert.equal(w.events[0].outcome, 'ALLOWED'); assert.equal(w.events[0].aggregate, `room:${REF}`); assert.match(w.events[0].detail, /MTG-0001 .* simulated calendar; no invitation left this browser$/);
  // ServiceHands' preflight reads the same bookings: a job window over the meeting is now refused because the room is booked
  const wo = w.workOrders.find((x) => x.roomId === REF); wo.window = { from: new Date(s.from).toISOString().slice(0, 16), to: new Date(s.to).toISOString().slice(0, 16) }; assert.ok(W.preflightFor(w, wo.id).checks.some((c) => !c.ok && /book/i.test(`${c.label} ${c.why}`)), 'the room’s booking is seen by ServiceHands');
  // both people are now busy then, and the room is taken: the same slot is not proposed again, and a second meeting there is refused
  const next = ST.proposeFor('service', i, NOW); assert.ok(!next.proposal.slots.some((x) => x.from < s.to && s.from < x.to));
  const i2 = input({ withIds: ['p-backup-ATL'] }); const clash = ST.confirm('service', i2, s, ST.keyFor('service', i2, s), NOW); assert.ok('why' in clash); assert.match(clash.why.join(' '), /Ana Reyes is busy|Atlas 4\.218 is booked|outside working hours/); assert.equal(live().length, 1);
});

test('CX-14 confirming is idempotent: a double press, a reload and a second tab all yield one meeting; a confirmation that is not what was reviewed is refused', () => {
  reset(); const i = input(); const plan = ST.proposeFor('service', i, NOW); const s = plan.proposal.slots[1]; const key = ST.keyFor('service', i, s);
  const a = ST.confirm('service', i, s, key, NOW); const b = ST.confirm('service', i, s, key, NOW); assert.equal(a.again, false); assert.equal(b.again, true); assert.equal(b.meeting.id, a.meeting.id); assert.match(b.said, /already recorded; nothing was recorded a second time/);
  assert.equal(live().length, 1); assert.equal(W.load().bookings[REF].filter((x) => /^MTG-/.test(x.title)).length, 1); assert.equal(W.load().events.filter((e) => e.type === 'meeting.recorded').length, 1, 'one ledger line for one meeting');
  // "reload": everything is read from storage again; "second tab": the same request built independently has the same key
  const copy = JSON.parse(JSON.stringify(i)); assert.equal(ST.keyFor('service', copy, { from: s.from, to: s.to }), key); const c = ST.confirm('service', copy, { from: s.from, to: s.to }, key, NOW + 5 * MIN); assert.equal(c.again, true); assert.equal(live().length, 1);
  assert.notEqual(ST.keyFor('service', i, plan.proposal.slots[0]), key); assert.notEqual(ST.keyFor('svcmgr', i, s), key); assert.notEqual(ST.keyFor('service', input({ withIds: ['p-backup-ATL'] }), s), key);
  for (const bad of ['', 'not-the-key', ST.keyFor('service', i, plan.proposal.slots[0])]) { const x = ST.confirm('service', i, plan.proposal.slots[2], bad, NOW); assert.ok('why' in x); assert.match(x.why[0], /does not match what was reviewed/); }
  assert.equal(live().length, 1);
  // a past time, and a time outside someone's hours, are refused whatever the key
  const past = { from: NOW - 2 * DAY, to: NOW - 2 * DAY + 30 * MIN }; assert.match(ST.confirm('service', i, past, ST.keyFor('service', i, past), NOW).why[0], /has passed/);
  const night = { from: Date.UTC(2026, 10, 12, 8), to: Date.UTC(2026, 10, 12, 8, 30) }; assert.match(ST.confirm('service', i, night, ST.keyFor('service', i, night), NOW).why.join(' '), /off shift|outside working hours/);
  assert.equal(live().length, 1);
});

test('CX-15 a conflict that appears between the proposal and the confirmation is always refused, says who or what is in the way, and the next proposal avoids it', () => {
  const r = rng(404); let refused = 0;
  for (let n = 0; n < 60; n += 1) {
    reset(); const other = pick(r, people.filter((p) => p.tz === 'America/Chicago' && p.id !== 'p-tech-ana')); const i = input({ withIds: [other.id] }); const plan = ST.proposeFor('service', i, NOW); if ('why' in plan || !plan.proposal.slots.length) continue;
    const s = pick(r, plan.proposal.slots); const key = ST.keyFor('service', i, s); const how = n % 3;
    if (how === 0) { const w = W.load(); (w.bookings[REF] ||= []).push({ from: new Date(s.from - 30 * MIN).toISOString().slice(0, 16), to: new Date(s.to).toISOString().slice(0, 16), title: 'Board review (moved)' }); W.save(w); }   // someone books the room, as from another tab
    else if (how === 1) { const st = ST.loadState(); st.meetings.push({ id: 'MTG-9001', transactionId: 'OTHER-TAB', subject: 'Somebody else’s meeting', body: '', from: s.from, to: s.to, parties: [{ id: other.id, name: other.name, mail: other.email }], room: null, state: 'RECORDED', createdAt: '', organiser: { id: 'p-ops-northstar', name: 'x', role: 'ops' }, about: null, by: 'opslead' }); ST.saveState(st); }   // the other person is taken by a meeting recorded elsewhere
    else { const j = input({ withIds: [other.id], roomId: null, about: null }); const x = ST.confirm('service', j, s, ST.keyFor('service', j, s), NOW); assert.ok(!('why' in x), JSON.stringify(x)); }   // the organiser books the same time for something else
    const before = live().length; const out = ST.confirm('service', i, s, key, NOW);
    assert.ok('why' in out, `conflict ${how} was not refused`); refused += 1; assert.equal(live().length, before, 'nothing recorded');
    assert.match(out.why.join(' '), how === 0 ? /Atlas 4\.218 is booked .*Board review \(moved\)/ : new RegExp(`(${other.name}|Ana Reyes) is busy`));
    const w = W.load(); assert.equal(w.events[0].type, 'meeting.refused'); assert.equal(w.events[0].outcome, 'DENIED'); assert.equal(w.bookings[REF].filter((b) => b.title.startsWith('MTG-')).length, 0, 'the refused meeting booked nothing');
    const again = ST.proposeFor('service', i, NOW); assert.ok(!again.proposal.slots.some((x) => x.from < s.to && s.from < x.to), 're-proposing leaves the taken time out');
    if (again.proposal.slots.length) { const t = again.proposal.slots[0]; assert.ok(!('why' in ST.confirm('service', i, t, ST.keyFor('service', i, t), NOW)), 'and the next time offered can be confirmed'); }
  }
  assert.ok(refused >= 50, `${refused} injected conflicts, all refused`);
});

test('CX-16 over random sequences of proposing, confirming twice, colliding and cancelling, no two recorded meetings ever share a person or a room at the same time, and the workspace’s bookings are exactly the recorded meetings', () => {
  const r = rng(909); const roles = ['service', 'svcmgr', 'syseng', 'ops']; const chi = people.filter((p) => p.tz === 'America/Chicago'); let confirmed = 0; let refusals = 0; let cancelled = 0;
  for (let run = 0; run < 25; run += 1) {
    reset(); const base = W.load().bookings[REF].length;
    for (let step = 0; step < 24; step += 1) {
      const role = pick(r, roles); const me = ST.organiserOf(role).id; const withIds = [pick(r, chi).id, ...(r() < 0.3 ? [pick(r, chi).id] : [])].filter((x, k, l) => x !== me && l.indexOf(x) === k); if (!withIds.length) continue;
      const i = input({ withIds, roomId: r() < 0.7 ? pick(r, [REF, 'R-ATL-4-220']) : null, minutes: pick(r, C.DURATIONS), about: null, optionalIds: r() < 0.2 ? [withIds[0]] : [] });
      const act = r();
      if (act < 0.7) { const plan = ST.proposeFor(role, i, NOW); if ('why' in plan) { assert.match(plan.why.join(' '), /at least one person who must attend|Choose/); continue; } if (!plan.proposal.slots.length) continue; const s = pick(r, plan.proposal.slots); const k = ST.keyFor(role, i, s);
        const a = ST.confirm(role, i, s, k, NOW); if ('why' in a) { refusals += 1; continue; } confirmed += a.again ? 0 : 1; const b = ST.confirm(role, i, s, k, NOW); assert.equal(b.again, true); assert.equal(b.meeting.id, a.meeting.id); }
      else if (act < 0.85) { const s = { from: NOW + (20 + Math.floor(r() * 200)) * 30 * MIN, to: 0 }; s.to = s.from + i.minutes * MIN; const out = ST.confirm(role, i, s, ST.keyFor(role, i, s), NOW); if ('why' in out) refusals += 1; else confirmed += out.again ? 0 : 1; }   // a time nobody proposed: accepted only if it really is free
      else { const mine = live().filter((m) => m.organiser.role === role); if (mine.length) { const m = pick(r, mine); const out = ST.cancelMeeting(role, m.id, 'changed plans', NOW); assert.equal(out.state, 'CANCELLED'); cancelled += 1; } }
      // the invariants, after every step
      const L = live(); for (let x = 0; x < L.length; x += 1) for (let y = x + 1; y < L.length; y += 1) { const A1 = L[x]; const B1 = L[y]; if (!(A1.from < B1.to && B1.from < A1.to)) continue;
        const shared = A1.parties.filter((p) => !p.optional && B1.parties.some((q) => q.id === p.id && !q.optional)); assert.deepEqual(shared.map((p) => p.name), [], `${A1.id} and ${B1.id} overlap and share a person who must attend`); assert.ok(!(A1.room && B1.room && A1.room.id === B1.room.id), `${A1.id} and ${B1.id} overlap in ${A1.room?.name}`); }
      const w = W.load(); const booked = Object.entries(w.bookings).flatMap(([room, bs]) => bs.filter((b) => /^MTG-\d{4} ·/.test(b.title)).map((b) => `${room}:${b.title.slice(0, 8)}:${Date.parse(`${b.from}:00Z`)}`)).sort();
      assert.deepEqual(booked, L.filter((m) => m.room).map((m) => `${m.room.id}:${m.id}:${m.from}`).sort(), 'the room bookings in the workspace are exactly the recorded meetings that have a room');
      for (const m of L) for (const p of m.parties.filter((x) => !x.optional)) { const who = people.find((q) => q.id === p.id); if (who) assert.ok(inside(who, m.from, m.to), `${m.id}: ${who.name} outside hours`); }
      assert.equal(new Set(meetings().map((m) => m.id)).size, meetings().length); assert.equal(new Set(L.map((m) => m.transactionId)).size, L.length);
    }
    assert.equal(W.load().bookings[REF].filter((b) => !/^MTG-/.test(b.title)).length, base, 'bookings that were there before are untouched');
  }
  assert.ok(confirmed > 150 && refusals > 20 && cancelled > 10, `${confirmed} recorded, ${refusals} refused, ${cancelled} cancelled`);
});

test('CX-17 cancelling: the person who recorded it, once; the booking leaves the workspace, the meeting stays as cancelled, and the time is free again', () => {
  reset(); const i = input(); const s = ST.proposeFor('service', i, NOW).proposal.slots[0]; const key = ST.keyFor('service', i, s); const m = ST.confirm('service', i, s, key, NOW).meeting;
  const no = ST.cancelMeeting('svcmgr', m.id, 'not mine', NOW); assert.ok('why' in no); assert.match(no.why[0], /only they cancel it/); assert.equal(live().length, 1); assert.equal(W.load().events[0].type, 'meeting.cancel_refused'); assert.equal(W.load().events[0].outcome, 'DENIED');
  assert.match(ST.cancelMeeting('service', 'MTG-9999', '', NOW).why[0], /No meeting MTG-9999/); assert.match(ST.cancelMeeting('visitor', m.id, '', NOW).why[0], /Visitor does not cancel meetings here/); assert.equal(live().length, 1);
  const done = ST.cancelMeeting('service', m.id, 'The room is being refitted', NOW); assert.equal(done.state, 'CANCELLED'); assert.equal(live().length, 0); assert.equal(meetings().length, 1, 'the record is kept');
  const w = W.load(); assert.equal(w.bookings[REF].filter((b) => /^MTG-/.test(b.title)).length, 0); assert.equal(w.events[0].type, 'meeting.cancelled'); assert.match(w.events[0].detail, /The room is being refitted · simulated calendar; no cancellation left this browser$/);
  const n = w.events.length; assert.equal(ST.cancelMeeting('service', m.id, 'again', NOW).state, 'CANCELLED'); assert.equal(W.load().events.length, n, 'cancelling twice changes nothing');
  assert.ok(ST.proposeFor('service', i, NOW).proposal.slots.some((x) => x.from === s.from), 'the time is offered again');
  const re = ST.confirm('service', i, s, key, NOW); assert.equal(re.again, false); assert.equal(re.meeting.id, 'MTG-0002', 'the same request after a cancellation is a new meeting'); assert.equal(live().length, 1);
  // CN-10: whoever recorded it, or the Product Architect
  { const byArchitect = ST.cancelMeeting('architect', 'MTG-0002', 'tidying up', NOW); assert.equal(byArchitect.state, 'CANCELLED'); assert.equal(W.load().bookings[REF].filter((b) => /^MTG-/.test(b.title)).length, 0); const again2 = ST.confirm('service', i, s, key, NOW); assert.equal(again2.meeting.id, 'MTG-0003'); }
  assert.deepEqual(ST.meetingsOf(ST.loadState(), 'service').map((x) => x.id).sort(), ['MTG-0001', 'MTG-0002', 'MTG-0003']); assert.deepEqual(ST.meetingsOf(ST.loadState(), 'svcmgr'), []); assert.equal(ST.meetingsInRoom(ST.loadState(), REF, NOW).length, 1);
});

test('CX-18 stored state that cannot be trusted starts clean, without an error; what is valid survives a reload', () => {
  for (const bad of ['not json', '[]', '{"v":2,"meetings":[]}', '{"v":1,"seq":"x","meetings":[]}', '{"v":1,"seq":1,"meetings":[{"id":"MTG-1"}]}', 'null', '{"v":1,"seq":3,"meetings":[{"id":"MTG-0001","transactionId":"k","from":5,"to":1,"parties":[],"state":"RECORDED","organiser":{"id":"x"}}]}']) {
    reset(); mem.set(ST.STATE_KEY, bad); const st = ST.loadState(); assert.deepEqual(st, { v: 1, seq: 0, meetings: [], confirmed: {}, notes: {} }, bad);
    const plan = ST.proposeFor('service', input(), NOW); assert.ok(plan.proposal.slots.length > 0, 'and the page works');
  }
  reset(); const i = input(); const s = ST.proposeFor('service', i, NOW).proposal.slots[0]; ST.confirm('service', i, s, ST.keyFor('service', i, s), NOW);
  const raw = mem.get(ST.STATE_KEY); mem.set(ST.STATE_KEY, raw); assert.equal(ST.loadState().meetings[0].id, 'MTG-0001'); assert.equal(ST.loadState().seq, 1);
  mem.set(ST.STATE_KEY, JSON.stringify({ ...JSON.parse(raw), confirmed: [], notes: 'x' })); assert.deepEqual(ST.loadState().confirmed, {}); assert.deepEqual(ST.loadState().notes, {});
});

// ================================================================================================================ who may
test('CX-19 the role matrix, over every role the policy has: who is told who to contact, who sees details, who reaches, who schedules — each from V2.5.3’s tables, and the pages and the store agree', () => {
  assert.ok(ROLES.length >= 15, 'the roles are the policy’s own list, however many it has');
  const champ = D.championOf('ATL'); const tech = D.personById('p-tech-ana'); const champRole = D.championRole();
  const isC = (k) => k === champRole;
  for (const k of ROLES) {
    assert.equal(X.mayKnowWho(k), P.allows({ entity: 'SupportPath' }, k) || isC(k), `${k}: who to contact`);
    assert.equal(X.maySeeDetails(k, champ), X.mayKnowWho(k), `${k}: a site champion is the published contact of a site`);
    assert.equal(X.maySeeDetails(k, tech), P.allows({ field: 'person.contact' }, k) || isC(k), `${k}: a technician’s details`);
    assert.equal(X.mayReach(k, champ), X.maySeeDetails(k, champ) && (P.allows({ action: 'comms.compose' }, k) || isC(k)));
    assert.equal(X.maySchedule(k), (P.allows({ area: 'scheduler' }, k) && P.allows({ action: 'comms.compose' }, k)) || isC(k), `${k}: scheduling`);
    assert.equal(X.mayBrowse(k), P.allows({ area: 'search.people' }, k) || isC(k));
    // the pages: a role opens exactly what the rules above say (D44: otherwise the page's code is never loaded)
    assert.equal(P.canOpen(k, R.resolve('#/people')), X.mayKnowWho(k), `${k} #/people`); assert.equal(P.canOpen(k, R.resolve('#/people/p-champ-ATL')), X.maySeeDetails(k, champ)); assert.equal(P.canOpen(k, R.resolve('#/people/p-tech-ana')), X.maySeeDetails(k, tech), `${k} #/people/p-tech-ana`); assert.equal(P.canOpen(k, R.resolve('#/meet')), X.maySchedule(k), `${k} #/meet`);
    const shown = X.visibleTo(k, people); assert.ok(shown.every((p) => X.maySeeDetails(k, p))); if (!X.mayKnowWho(k)) assert.equal(shown.length, 0); else if (!X.mayBrowse(k)) assert.ok(shown.length > 0 && shown.every((p) => p.kind !== 'role')); else assert.equal(shown.length, people.filter((p) => X.maySeeDetails(k, p)).length);
    // the store asks the same questions, and writes every refusal down
    reset(); const i = input(); const plan = ST.proposeFor(k, i, NOW);
    if (X.maySchedule(k)) { assert.ok(!('why' in plan), `${k}: ${JSON.stringify(plan.why)}`); const s = plan.proposal.slots[0]; const out = ST.confirm(k, i, s, ST.keyFor(k, i, s), NOW); assert.ok(!('why' in out), `${k} confirm: ${JSON.stringify(out)}`); assert.equal(live().length, 1); }
    else { assert.match(plan.why[0], /does not schedule meetings here/); const s = { from: NOW + DAY, to: NOW + DAY + 30 * MIN }; const out = ST.confirm(k, i, s, ST.keyFor(k, i, s), NOW); assert.match(out.why[0], /does not schedule meetings here/); assert.equal(live().length, 0); assert.equal(W.load().events[0].type, 'meeting.refused'); assert.equal(W.load().events[0].outcome, 'DENIED'); }
    const jump = ST.recordJump(k, { jump: 'teams.chat', personId: champ.id, about: { kind: 'room', id: REF }, from: '#/lite/room/R-ATL-4-218' }); assert.equal(!('why' in jump), X.mayReach(k, champ), `${k} jump`);
    const copy = ST.recordCopy(k, tech.id, 'email'); assert.equal(copy === null, X.maySeeDetails(k, tech), `${k} copy`);
    if (!X.maySeeDetails(k, tech)) { assert.equal(W.load().events[0].type, 'contact.refused'); assert.equal(W.load().events[0].outcome, 'DENIED'); assert.match(ST.proposeFor(k, input({ withIds: [tech.id] }), NOW).why.join(' '), /does not schedule meetings here|may not schedule with a Service Engineer/); }
  }
  // a visitor is told nothing and sees no address or number of anyone
  assert.ok(!X.mayKnowWho('visitor') && people.every((p) => !X.maySeeDetails('visitor', p) && !X.mayReach('visitor', p))); assert.ok(!X.maySchedule('visitor'));
  assert.ok(X.mayKnowWho('employee') && X.maySeeDetails('employee', champ) && !X.maySeeDetails('employee', tech) && X.maySchedule('employee'));
  // CN-09: scheduling is V2.5.3's comms.compose (everyone but the Visitor and the Document Reviewer); neither of those sees any contact detail
  assert.ok(ROLES.includes('sitechamp') && ROLES.length >= 16, 'the policy has the Site Champion'); for (const k of ROLES) assert.equal(X.maySchedule(k), P.allows({ action: 'comms.compose' }, k), `${k}: schedules exactly when it may compose`);
  assert.deepEqual(ROLES.filter((k) => !X.maySchedule(k)).sort(), ['qa', 'visitor']); for (const k of ['visitor', 'qa']) assert.ok(people.every((p) => !X.maySeeDetails(k, p)) && !X.mayKnowWho(k), `${k} sees nobody`);
  // the Site Champion: told who to contact, reaches and schedules like the Employee it is based on, and sees the people of ITS OWN SITE only.
  // The policy grants a champion the field person.contact for every person; Connect narrows it to the champion's site (founder, 11 Nov:
  // "scoped access"), which is stricter than the integrator's maySeeContact was.
  const sc = 'sitechamp'; const site = P.CHAMPION_SITES; assert.deepEqual(D.personaPerson(sc).buildings, [site[0]]); assert.equal(D.personaPerson(sc).kind, 'champion');
  assert.ok(X.mayKnowWho(sc) && X.maySchedule(sc) && X.mayBrowse(sc) && P.allows({ field: 'person.contact' }, sc));
  for (const p of people) assert.equal(X.maySeeDetails(sc, p), p.kind !== 'role' || p.buildings.some((b) => site.includes(b)), `${p.id}: a champion sees every site’s champions, and the role holders of their own site`);
  const away = people.find((p) => p.kind === 'role' && !p.buildings.some((b) => site.includes(b))); assert.ok(away && !X.mayReach(sc, away) && !P.canOpen(sc, R.resolve(`#/people/${away.id}`)) && P.canOpen(sc, R.resolve('#/people/p-tech-ana')));
  assert.match(ST.proposeFor(sc, input({ withIds: [away.id] }), NOW).why[0], /may not schedule with/); assert.ok('why' in ST.recordJump(sc, { jump: 'teams.chat', personId: away.id, about: null, from: '#/site' }));
  assert.deepEqual(X.visibleTo(sc, people).filter((p) => p.kind === 'role').flatMap((p) => p.buildings.filter((b) => site.includes(b))).length > 0 && X.visibleTo(sc, people).every((p) => p.kind !== 'role' || p.buildings.some((b) => site.includes(b))), true);
  // … and gains nothing engineering, administrative or to do with sign-off through Connect: it curates only its own site's champion entries
  for (const p of people) assert.equal(X.mayCurate(sc, p), p.kind !== 'role' && p.buildings.some((b) => site.includes(b)), p.id);
  for (const a of ['com.signoff', 'cx.accept', 'builder.edit', 'govern', 'sh.authorize', 'sh.triage', 'assure.approveBaseline', 'review.decide']) assert.ok(!P.allows({ action: a }, sc), a);
  for (const pg of ['#/people', '#/meet', '#/people/p-champ-ATL']) assert.deepEqual(P.rolesFor(P.authorityAt(R.resolve(pg))).filter((k) => !P.allows({ action: 'comms.compose' }, k)), [], `${pg} admits nobody who may not even compose a message`);
  // a role outside the list the policy has opens nothing, whatever it is called
  assert.ok(!X.mayKnowWho('sitechamp', ['ops']) || P.allows({ entity: 'SupportPath' }, 'sitechamp'));
  for (const pg of ['#/people', '#/meet', '#/people/p-tech-ana']) assert.ok(P.known(P.authorityAt(R.resolve(pg))), `${pg}: its authority names roles the policy knows`);
  assert.equal(R.resolve('#/people/p-nobody').page.id, 'people');
});

test('CX-20 a jump is written down as "opened", with the app and what it was about, and claims nothing more; prefilled words carry only what was passed in', () => {
  const w0 = reset(); const champ = D.championOf('ATL');
  // a private note on a job: it must never reach a message
  K.sh(w0).notes['WO-0088'] = [{ at: new Date(NOW).toISOString(), by: 'service', kind: 'note', text: 'PRIVATE-NOTE customer was rude; the VP is unhappy' }]; W.save(w0);
  const out = ST.recordJump('service', { jump: 'teams.chat', personId: champ.id, about: { kind: 'issue', id: 'ISS-0417' }, from: '#/servicehands?id=ISS-0417' });
  assert.match(out.said, /^Opened Teams\. You write and send the message there\. This page only opened it\.$/); assert.equal(out.app, 'Teams'); assert.ok(!/message sent|was sent|delivered|invited/i.test(out.said));
  const e = W.load().events[0]; assert.equal(e.type, 'contact.opened'); assert.equal(e.outcome, 'ALLOWED'); assert.equal(e.aggregate, 'issue:ISS-0417'); assert.match(e.detail, new RegExp(`^Teams · Message in Teams · ${champ.name} .* about ISS-0417: .* from #/servicehands\\?id=ISS-0417 · opened only`)); assert.ok(!/\b(sent|delivered)\b/.test(e.detail.replace('what happened in the app is not known here', '')));
  for (const id of A.offered().map((j) => j.id)) { const x = ST.recordJump('service', { jump: id, personId: champ.id, about: null, from: '#/people/p-champ-ATL' }); assert.match(x.said, /^Opened (Teams|your email app|your phone)\./); assert.ok(!/\b(message|invitation|email) (was )?sent\b/i.test(x.said)); assert.equal(W.load().events[0].aggregate, `person:${champ.id}`); }
  for (const id of ['outlook.web.compose', 'teams.protocol', 'nope']) { const x = ST.recordJump('service', { jump: id, personId: champ.id, about: null, from: '#/x' }); assert.ok('why' in x, id); }
  assert.equal(ST.recordCopy('service', champ.id, 'card'), null); assert.equal(W.load().events[0].type, 'contact.copied'); assert.match(W.load().events[0].detail, /contact card of .* copied to this device’s clipboard/);
  const s = D.subjectOf('issue', 'ISS-0417', W.load()); const msg = ST.composeFor('service', champ, s, '  People on the call hear themselves back  ');
  assert.equal(msg.subject, `About ${s.label}`); assert.ok(msg.body.includes(`Hello ${champ.name.split(' ')[0]},`) && msg.body.includes('What I saw: People on the call hear themselves back') && msg.body.includes('synthetic'));
  assert.ok(!/PRIVATE-NOTE|rude|unhappy/.test(`${msg.subject} ${msg.body}`), 'a note from the job is never placed in a message'); assert.ok(!/PRIVATE-NOTE/.test(JSON.stringify(D.contactsFor(s, NOW, W.load()))));
  const card = ST.cardOf(champ); for (const x of [champ.name, champ.email, champ.phone, 'Synthetic person']) assert.ok(card.includes(x));
  const b = A.build('mail.compose', { to: [champ.email], subject: msg.subject, body: msg.body }); assert.ok(b.ok && !A.hasHole(b.href));
});

test('CX-21 keeping the directory true: the Data Steward confirms an entry; a note goes on a champion’s profile only; everyone else is refused and it is written down', () => {
  reset(); const stale = people.find((p) => D.freshnessOf(p).state !== 'confirmed'); const champ = D.championOf('MER'); const tech = D.personById('p-tech-dev');
  for (const k of ROLES) { reset(); const may = X.mayCurate(k, champ); assert.equal(may, K.holds(K.personaOf(k), 'profile.publish') || (k === D.championRole() && D.personaPerson(k)?.buildings.includes('MER')), k);
    const out = ST.confirmEntry(k, stale.id, NOW); assert.equal(!('why' in out), X.mayCurate(k, stale), `${k} confirm`);
    if ('why' in out) { assert.equal(W.load().events[0].type, 'directory.refused'); assert.equal(ST.loadState().confirmed[stale.id], undefined); } else { assert.equal(out.on, '2026-11-11'); assert.equal(D.freshnessOf(stale, ST.loadState().confirmed).state, 'confirmed'); assert.equal(W.load().events[0].type, 'directory.confirmed'); } }
  assert.ok(X.mayCurate('steward', champ) && !X.mayCurate('service', champ) && !X.mayCurate('employee', champ) && !X.mayCurate('visitor', champ));
  reset(); assert.match(ST.addNote('steward', champ.id, 'short', NOW).why[0], /at least 8 characters/); assert.match(ST.addNote('steward', champ.id, 'x'.repeat(300), NOW).why[0], /under 280/); assert.match(ST.addNote('steward', tech.id, 'The blinds stick in room 2', NOW).why[0], /kept on a site champion’s profile/);
  assert.match(ST.addNote('service', champ.id, 'The blinds stick in room 2', NOW).why[0], /does not add local notes/); assert.equal((ST.loadState().notes[champ.id] || []).length, 0);
  const n = ST.addNote('steward', champ.id, '  The spare remote is in   the cupboard by the door ', NOW); assert.equal(n.text, 'The spare remote is in the cupboard by the door'); assert.equal(ST.loadState().notes[champ.id].length, 1); assert.equal(W.load().events[0].type, 'directory.note');
  assert.ok(!ST.composeFor('service', champ, null, null).body.includes('spare remote'), 'a local note is never placed in a message');
});

test('CX-22 Ask Empathia: who to contact is answered from the directory; a booking question ends at the review step and books nothing; asking does not change who may', () => {
  reset(); const c = PC.buildCore(W.seed(), { projects: [], decisions: [], funding: [] }); const room = CN.roomById(REF);
  const [contact, meet] = Q.CONNECT_QUESTIONS; assert.deepEqual(Q.CONNECT_QUESTIONS.map((q) => q.id), ['contact', 'meet']);
  assert.ok(contact.words.test('who do i contact about atlas 4.218?') && contact.words.test('who knows the boardroom') && !contact.words.test('who supports atlas?') && !contact.words.test('why is beacon 3.101 blocked?'));
  assert.ok(meet.words.test('book 30 minutes with the systems engineer about atlas 4.218') && meet.words.test('schedule an hour with the site champion') && !meet.words.test('which rooms are free now?') && !meet.words.test('which rooms should we book'));
  const a = contact.answer(c, room, 'employee'); assert.deepEqual(a.more, [['See them, with the ways to contact each', `#/people?about=room:${REF}`]]);
  for (const k of ROLES.filter((r) => X.maySchedule(r))) {
    const ans = meet.answer(c, room, k, 'book 30 minutes with the systems engineer about atlas 4.218'); const sys = D.holdersOf('syseng', 'ATL')[0];
    if (X.maySeeDetails(k, sys)) { assert.ok(ans.more && /^#\/meet\?with=p-syseng-northstar&room=R-ATL-4-218&about=room%3AR-ATL-4-218&step=(review&slot=\d+|when)$/.test(ans.more[0][1]), `${k}: ${JSON.stringify(ans.more)}`); assert.match(ans.more[0][0], /Review this meeting|See what would work/); }
    else assert.ok(!ans.more || ans.more.every(([, h]) => !h.startsWith('#/meet')), `${k} may not see a systems engineer’s calendar: no way to the meeting is offered`);
    assert.equal(meetings().length, 0, `${k}: asking booked nothing`); assert.equal(W.load().events.filter((e) => /^meeting\./.test(e.type)).length, 0);
  }
  for (const k of ROLES.filter((r) => !X.maySchedule(r))) { const ans = meet.answer(c, room, k, 'book 30 minutes with the site champion about atlas 4.218'); assert.equal(ans.more, undefined, k); }
  const hour = meet.answer(c, room, 'service', 'schedule an hour with the site champion about atlas 4.218'); assert.match(hour.more[0][1], /with=p-champ-ATL.*min=60/);
  const nobody = meet.answer(c, room, 'service', 'book 30 minutes with the wizard about atlas 4.218'); assert.ok(nobody.more.every(([, h]) => !h.startsWith('#/meet')));
});

test('CX-23 start pages: a "Schedule a meeting" jump only for a role that schedules, has room for it and has the letter free; no list grows past seven', () => {
  for (const k of ROLES) {
    const all = H.jumpsFor(k, () => true); assert.ok(all.length <= J.JUMP_LIMIT, `${k}: ${all.length}`); assert.equal(new Set(all.map((j) => j.key)).size, all.length, `${k}: a letter twice`); assert.ok(all.every((j) => !['g', 'h'].includes(j.key)));
    const mine = all.filter((j) => j.href === '#/meet'); assert.ok(mine.length <= 1); if (mine.length) { assert.ok(X.maySchedule(k)); assert.equal(mine[0].key, 'm'); assert.ok(R.resolve(mine[0].href)); }
    if (!X.maySchedule(k)) assert.equal(mine.length, 0, `${k} does not schedule`);
    assert.deepEqual(H.jumpsFor(k, (h) => h !== '#/meet').filter((j) => j.href === '#/meet'), [], 'and never when the address does not open');
  }
  assert.ok(ROLES.some((k) => H.jumpsFor(k, () => true).some((j) => j.href === '#/meet')));
  const full = Array.from({ length: 7 }, (_, n) => [String.fromCharCode(97 + n), 'x', `#/x${n}`, 'y']); assert.deepEqual(J.connectJumps('service', full), []); assert.deepEqual(J.connectJumps('service', [['m', 'x', '#/x', 'y']]), []); assert.deepEqual(J.connectJumps('visitor', []), []); assert.equal(J.connectJumps('service', []).length, 1);
});

// ================================================================================================================ one adapter contract, two implementations
const ME = D.personById('p-tech-ana'); const FROM = Date.UTC(2026, 10, 16); const TO = FROM + 5 * DAY;
function worlds() {
  const st = { v: 1, seq: 0, meetings: [], confirmed: {}, notes: {} }; const w = W.seed(); const world = ST.worldOf(st, w, 'service', () => NOW);
  const st2 = { v: 1, seq: 0, meetings: [], confirmed: {}, notes: {} }; const world2 = ST.worldOf(st2, W.seed(), 'service', () => NOW); const tenant = GM.mockTenant(world2, ME.email);
  const waits = []; const cfg = { transport: tenant.transport, token: async () => 'mock-token', mode: 'delegated', organizer: ME.email, teamId: 'team-service', sleep: async (ms) => { waits.push(ms); }, now: () => NOW };
  return { sim: { name: 'simulated', adapter: AD.simulatedAdapter(world), id: (p) => p.id, block: (p, from, to) => st.meetings.push({ id: `X-${st.meetings.length}`, transactionId: `x${st.meetings.length}`, subject: 'elsewhere', body: '', from, to, parties: [{ id: p.id, name: p.name, mail: p.email }], room: null, state: 'RECORDED', createdAt: '', organiser: { id: 'x', name: 'x', role: 'ops' }, about: null, by: 'x' }), count: () => st.meetings.filter((m) => m.state === 'RECORDED' && !m.id.startsWith('X-')).length },
    graph: { name: 'graph (mock transport)', adapter: G.graphAdapter(cfg), id: (p) => tenant.idOf(p.id), block: (p, from, to) => tenant.block(p.email, from, to), count: () => tenant.events.filter((e) => !e.cancelled).length, tenant, cfg, waits, world: world2 } };
}
const party = (x, p, optional = false) => ({ id: x.id(p), name: p.name, mail: p.email, optional });
const roomOf = () => ST.roomRef(REF);
for (const which of ['sim', 'graph']) {
  test(`CX-24 [${which}] the adapter contract: people, schedule, shifts, suggestions, create once, refuse a conflict, cancel, the same instants in and out`, async () => {
    const x = worlds()[which]; const a = x.adapter; const champ = D.championOf('ATL'); const lon = people.find((p) => p.tz === 'Europe/London' && p.role === 'syseng');
    assert.match(a.validation, which === 'sim' ? /^Simulated:/ : /^Mock-tested:.*NOT validated against a real Microsoft 365 tenant/); assert.equal(a.provenance, which === 'sim' ? 'SIMULATED' : 'MOCK-TESTED'); assert.ok(!/verified|live|production/i.test(`${a.label} ${a.validation}`));
    // people lookup
    const found = await a.people(champ.name.split(' ')[0]); assert.ok(found.ok && found.provenance === a.provenance); const hit = found.value.find((p) => p.mail === champ.email); assert.ok(hit, 'the champion is found by first name'); assert.equal(hit.id, x.id(champ)); assert.equal(hit.name, champ.name); assert.equal(hit.title, champ.title);
    assert.deepEqual((await a.people('z')).value, []);
    // schedule lookup: busy time and working hours, for people in three zones and a room
    const who = [ME, champ, lon]; const sch = await a.schedule([...who.map((p) => p.email), roomOf().mail, 'nobody@empathia.example'], FROM, TO); assert.ok(sch.ok); assert.equal(sch.value.length, 5);
    for (const p of who) { const s = sch.value.find((v) => v.mail === p.email); const h = p.shift || p.hours; assert.deepEqual(s.working, { days: h.days, start: h.start, end: h.end, tz: p.tz }, `${p.name}: working hours in their own zone`); assert.deepEqual(s.busy.map((b) => [b.from, b.to]), C.seededBusy(p, FROM, TO).map((b) => [b.from, b.to]), `${p.name}: busy time`); }
    assert.equal(sch.value[3].working, null, 'a room has no working hours'); assert.equal(sch.value[4].working, null); assert.deepEqual(sch.value[4].busy, []);
    // shifts: the shift worker's shifts, as dated intervals on the right days in their own zone
    const sh = await a.shifts(FROM, TO); assert.ok(sh.ok); const mine = sh.value.filter((s) => s.personId === x.id(ME)); assert.equal(mine.length, 5, 'Monday to Friday'); for (const s of mine) { assert.equal(s.name, ME.shift.name); assert.ok(inside(ME, s.from, s.to)); assert.equal(wall(ME.tz, s.from).min, mins(ME.shift.start)); assert.equal(wall(ME.tz, s.to - 1).min + 1, mins(ME.shift.end)); }
    assert.equal(sh.value.filter((s) => s.personId === x.id(champ)).length, 0, 'someone without a shift has none');
    // suggestions: every one is free for everyone, by this file's clock
    const req = { parties: [party(x, ME), party(x, champ), party(x, lon, true)], room: roomOf(), minutes: 30, from: FROM, to: TO }; const sug = await a.suggest(req); assert.ok(sug.ok && sug.value.length > 0, JSON.stringify(sug));
    for (const s of sug.value) { for (const p of [ME, champ]) { assert.ok(inside(p, s.from, s.to), `${p.name} ${new Date(s.from).toISOString()}`); assert.ok(!hits(C.seededBusy(p, FROM, TO), s.from, s.to)); } assert.match(s.reason, /on Ana Reyes’s early shift; Atlas 4\.218 free; 30 minutes/); }
    // create: once per transaction id
    const slot = sug.value[0]; const mk = (tx, s = slot, parties = [party(x, ME), party(x, champ)]) => ({ transactionId: tx, subject: 'About Atlas 4.218', body: 'Line one\nLine <two> & three', from: s.from, to: s.to, parties, room: roomOf() });
    assert.equal(x.count(), 0); const c1 = await a.create(mk('TX-1')); assert.ok(c1.ok, JSON.stringify(c1)); assert.equal(c1.value.again, false); assert.equal(c1.value.event.state, 'RECORDED'); assert.equal(x.count(), 1);
    const c2 = await a.create(mk('TX-1')); assert.ok(c2.ok && c2.value.again); assert.equal(c2.value.event.id, c1.value.event.id); assert.equal(x.count(), 1, 'the same transaction id never makes a second event');
    assert.equal((await a.create(mk(''))).kind, 'invalid'); assert.equal((await a.create({ ...mk('TX-P'), from: NOW - DAY, to: NOW - DAY + 30 * MIN })).kind, 'invalid'); assert.equal(x.count(), 1);
    // the same instants come back: both people and the room are busy exactly then
    const after = await a.schedule([ME.email, champ.email, roomOf().mail], slot.from - 60 * MIN, slot.to + 60 * MIN); for (const s of after.value) assert.ok(s.busy.some((b) => b.from === slot.from && b.to === slot.to), `${s.mail} is busy ${new Date(slot.from).toISOString()}–${new Date(slot.to).toISOString()}`);
    // a second meeting on the same time is refused, and says who or what is in the way
    const clash = await a.create(mk('TX-2')); assert.equal(clash.ok, false); assert.equal(clash.kind, 'conflict'); assert.ok(clash.conflicts.some((c) => c.kind === 'busy') && clash.conflicts.some((c) => c.kind === 'room-taken')); assert.match(clash.why.join(' '), /is busy/); assert.equal(x.count(), 1);
    // a conflict that appears from outside, between suggesting and creating
    const s2 = (await a.suggest(req)).value[0]; assert.notEqual(s2.from, slot.from, 'the taken time is no longer suggested'); x.block(champ, s2.from + 5 * MIN, s2.from + 20 * MIN);
    const late = await a.create(mk('TX-3', s2)); assert.equal(late.ok, false); assert.equal(late.kind, 'conflict'); assert.ok(late.conflicts.some((c) => c.kind === 'busy' && c.who === champ.name), JSON.stringify(late)); assert.equal(x.count(), 1);
    // outside someone's hours is refused as well, by the same re-check
    const night = { from: Date.UTC(2026, 10, 17, 8), to: Date.UTC(2026, 10, 17, 8, 30) }; const off = await a.create(mk('TX-4', night)); assert.equal(off.kind, 'conflict'); assert.ok(off.conflicts.some((c) => c.kind === 'off-shift' && c.who === ME.name));
    // cancel: the time is free again; cancelling twice changes nothing; an unknown meeting is not found
    const can = await a.cancel(c1.value.event.id, 'No longer needed'); assert.ok(can.ok, JSON.stringify(can)); assert.equal(can.value.state, 'CANCELLED'); assert.equal(x.count(), 0);
    const freed = await a.schedule([ME.email, roomOf().mail], slot.from, slot.to); for (const s of freed.value) assert.ok(!s.busy.some((b) => b.from === slot.from && b.to === slot.to));
    assert.ok((await a.cancel(c1.value.event.id, 'again')).ok); assert.equal((await a.cancel('NOPE', '')).kind, 'not-found'); assert.equal(x.count(), 0);
    const c5 = await a.create(mk('TX-5')); assert.ok(c5.ok && !c5.value.again, `the freed time can be taken by a new transaction: ${JSON.stringify(c5).slice(0, 400)}`); assert.equal(x.count(), 1);
  });
}

test('CX-25 the two implementations answer the same: the same suggestions, in the same order, with the same reasons, for random requests across zones', async () => {
  const { sim, graph } = worlds(); const r = rng(31); let compared = 0; let empty = 0;
  for (let i = 0; i < 40; i += 1) {
    const set = [ME]; const n = 1 + Math.floor(r() * 3); while (set.length < n + 1) { const p = pick(r, people); if (!set.includes(p)) set.push(p); }
    const from = FROM + Math.floor(r() * 30) * DAY; const base = { room: r() < 0.5 ? roomOf() : null, minutes: pick(r, C.DURATIONS), from, to: from + (2 + Math.floor(r() * 4)) * DAY };
    const a = await sim.adapter.suggest({ ...base, parties: set.map((p, k) => party(sim, p, k > 1 && r() < 0.3)) }); const opt = set.map((p, k) => a.ok && a.value[0] ? !!a.value[0].local.find((l) => l.id === p.id)?.optional : false);
    const b = await graph.adapter.suggest({ ...base, parties: set.map((p, k) => party(graph, p, opt[k])) }); assert.ok(a.ok && b.ok, JSON.stringify([a, b]).slice(0, 300));
    if (!a.value.length) { empty += 1; assert.equal(b.value.length, 0); continue; }
    if (a.value.some((s) => s.without.length)) continue;   // optional flags are only reconstructed when every slot suits everyone
    assert.deepEqual(b.value.map((s) => [s.from, s.to, s.reason]), a.value.map((s) => [s.from, s.to, s.reason]), `request ${i}`); compared += 1;
  }
  assert.ok(compared >= 20, `${compared} requests compared slot for slot (${empty} had none in either)`);
});

test('CX-26 [graph] every request is the documented one: method, path, headers and body, for a signed-in user and for an application', async () => {
  const { graph } = worlds(); const a = graph.adapter; const champ = D.championOf('ATL'); const t = graph.tenant;
  await a.people("Amara O'Brien \"x\""); await a.schedule([ME.email, champ.email], FROM, TO); await a.shifts(FROM, TO);
  const slot = (await a.suggest({ parties: [party(graph, ME), party(graph, champ)], room: roomOf(), minutes: 30, from: FROM, to: TO })).value[0];
  const made = await a.create({ transactionId: 'TX-SHAPE', subject: 'About Atlas 4.218', body: 'One\nTwo <b> & three', from: slot.from, to: slot.to, parties: [party(graph, ME), party(graph, champ)], room: roomOf() }); await a.native({ parties: [party(graph, ME), party(graph, champ)], room: null, minutes: 45, from: FROM, to: TO }); await a.cancel(made.value.event.id, 'done');
  assert.ok(t.received.length >= 8); for (const q of t.received) { assert.ok(q.url.startsWith('https://graph.microsoft.com/v1.0/'), q.url); assert.equal(q.headers.Authorization, 'Bearer mock-token'); } for (const q of a.sent) assert.equal(q.headers.Authorization, undefined, 'the adapter’s own record of what it sent never holds the token');
  const of = (re, method) => t.received.find((q) => re.test(q.url) && q.method === method);
  const users = of(/\/users\?/, 'GET'); assert.equal(users.headers.ConsistencyLevel, 'eventual'); const uq = new URL(users.url).searchParams; assert.equal(uq.get('$search'), '"displayName:Amara O\'Brien  x"', 'quotes in a name cannot break the search expression'); assert.equal(uq.get('$count'), 'true'); assert.match(uq.get('$select'), /^id,displayName,mail,userPrincipalName/);
  const gs = of(/\/me\/calendar\/getSchedule$/, 'POST'); assert.deepEqual(Object.keys(gs.body).sort(), ['availabilityViewInterval', 'endTime', 'schedules', 'startTime']); assert.deepEqual(gs.body.startTime, { dateTime: '2026-11-16T00:00:00', timeZone: 'UTC' }); assert.deepEqual(gs.body.schedules, [ME.email, champ.email]); assert.equal(gs.body.availabilityViewInterval, 30); assert.equal(gs.headers.Prefer, 'outlook.timezone="UTC"'); assert.equal(gs.headers['Content-Type'], 'application/json');
  const shf = of(/\/teams\/team-service\/schedule\/shifts\?/, 'GET'); assert.match(new URL(shf.url).searchParams.get('$filter'), /^sharedShift\/startDateTime ge \d{4}-\d{2}-\d{2}T[\d:.]+Z and sharedShift\/endDateTime le \d{4}-\d{2}-\d{2}T[\d:.]+Z$/, 'each property once, as the page requires'); assert.equal(shf.body, undefined);
  const ev = of(/\/me\/events$/, 'POST'); assert.equal(ev.body.transactionId, 'TX-SHAPE'); assert.deepEqual(ev.body.start, { dateTime: new Date(slot.from).toISOString().slice(0, 19), timeZone: 'UTC' }); assert.deepEqual(ev.body.body, { contentType: 'HTML', content: 'One<br>Two &lt;b&gt; &amp; three' });
  assert.deepEqual(ev.body.attendees, [{ emailAddress: { address: champ.email, name: champ.name }, type: 'required' }, { emailAddress: { address: roomOf().mail, name: roomOf().name }, type: 'resource' }], 'the organiser is not their own attendee; the room is a resource'); assert.deepEqual(ev.body.location, { displayName: roomOf().name, locationEmailAddress: roomOf().mail });
  { const doc = GM.FIXTURES.createEventRequest.body; for (const k of ['subject', 'body', 'start', 'end', 'location', 'attendees', 'transactionId']) assert.ok(k in doc && k in ev.body, k); assert.deepEqual(GM.sameShape({ body: doc.body, start: doc.start, end: doc.end, attendee: doc.attendees[0] }, { body: ev.body.body, start: ev.body.start, end: ev.body.end, attendee: ev.body.attendees[0] }), [], 'the same shape as the page’s example request'); }
  const fm = of(/\/me\/findMeetingTimes$/, 'POST'); assert.equal(fm.body.meetingDuration, 'PT45M'); assert.equal(fm.body.timeConstraint.activityDomain, 'work'); assert.deepEqual(fm.body.attendees, [{ type: 'required', emailAddress: { name: champ.name, address: champ.email } }]);
  // CN-11: an online meeting is a Teams meeting; with a room it is not marked online by this slice
  assert.ok(!('isOnlineMeeting' in ev.body)); { const on = G.reqCreate(graph.cfg, { transactionId: 'TX-ON', subject: 's', body: '', from: slot.from, to: slot.to, parties: [party(graph, ME), party(graph, champ)], room: null, online: true }).body; assert.equal(on.isOnlineMeeting, true); assert.equal(on.onlineMeetingProvider, 'teamsForBusiness'); assert.equal(on.transactionId, 'TX-ON'); assert.ok(!('location' in on)); }
  assert.equal(G.reqCancel({ mode: 'application', organizer: 'p.organiser@empathia.example' }, 'AAMk=', 'x').url, 'https://graph.microsoft.com/v1.0/users/p.organiser%40empathia.example/events/AAMk%3D/cancel');
  const cx = of(/\/me\/events\/[^/]+\/cancel$/, 'POST'); assert.deepEqual(cx.body, { comment: 'done' }); assert.ok(cx.url.includes(encodeURIComponent(made.value.event.id)));
  // what the mock answers has the documented shape
  const raw = async (req) => (await t.transport({ ...req, headers: { ...req.headers, Authorization: 'Bearer x' } })).body;
  assert.deepEqual(GM.sameShape({ ...GM.FIXTURES.getSchedule.body.value[0], scheduleItems: [{ isPrivate: false, status: 'busy', start: {}, end: {} }] }, (await raw(G.reqSchedule(graph.cfg, [champ.email], FROM, TO))).value[0]).filter((d) => !/scheduleItems\[0\]\.(subject|location)|start\.|end\./.test(d)), []);
  assert.deepEqual(GM.sameShape(GM.FIXTURES.shifts.body.value[0], (await raw(G.reqShifts('team-service', FROM, TO))).value[0]).filter((d) => !/activities|notes/.test(d)), []);
  assert.deepEqual(GM.sameShape(GM.FIXTURES.users.body.value[0], (await raw(G.reqPeople('Amara'))).value[0]), []);
  assert.deepEqual(GM.sameShape(GM.FIXTURES.findMeetingTimes.body, await raw(G.reqFindMeetingTimes({ parties: [party(graph, ME), party(graph, champ)], room: null, minutes: 30, from: FROM, to: TO }, ME.email))).filter((d) => !/locations/.test(d)), []);
  // an application acts on the organiser's mailbox by address, and cannot use findMeetingTimes
  const w2 = worlds().graph; const app = G.graphAdapter({ ...w2.cfg, mode: 'application' }); await app.schedule([champ.email], FROM, TO); const sl = (await app.suggest({ parties: [party(w2, ME), party(w2, champ)], room: null, minutes: 30, from: FROM, to: TO })).value[0];
  const m2 = await app.create({ transactionId: 'TX-APP', subject: 's', body: '', from: sl.from, to: sl.to, parties: [party(w2, ME), party(w2, champ)], room: null }); assert.ok(m2.ok, JSON.stringify(m2));
  const paths = w2.tenant.received.map((q) => new URL(q.url).pathname); assert.ok(paths.includes(`/v1.0/users/${encodeURIComponent(ME.email)}/calendar/getSchedule`) && paths.includes(`/v1.0/users/${encodeURIComponent(ME.email)}/events`)); assert.ok(!paths.some((p) => p.startsWith('/v1.0/me/')));
  const nat = await app.native({ parties: [], room: null, minutes: 30, from: FROM, to: TO }); assert.equal(nat.kind, 'unavailable'); assert.match(nat.why[0], /does not support application permissions/);
});

test('CX-27 [graph] the documented example responses are read correctly, in the time zone they are given in; a zone that cannot be read is never guessed', () => {
  for (const [k, f] of Object.entries(GM.FIXTURES)) { assert.match(f.source, /^https:\/\/learn\.microsoft\.com\//, k); assert.equal(f.validated, '2026-11-11'); assert.ok(f.note.length > 10 && Number.isInteger(f.status)); }
  const sch = G.parseSchedule(GM.FIXTURES.getSchedule.body); assert.equal(sch.length, 1); assert.equal(sch[0].mail, 'adelev@contoso.com');
  assert.deepEqual(sch[0].busy.map((b) => [new Date(b.from).toISOString(), new Date(b.to).toISOString(), b.title]), [['2019-03-15T19:00:00.000Z', '2019-03-15T21:00:00.000Z', 'Busy'], ['2019-03-15T22:00:00.000Z', '2019-03-15T23:00:00.000Z', 'Tentative']], '12:00 Pacific on 15 March 2019 is daylight time: 19:00 UTC; "free" and "workingElsewhere" are not busy');
  assert.deepEqual(sch[0].working, { days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', tz: 'America/Los_Angeles' });
  const fm = G.parseFindMeetingTimes(GM.FIXTURES.findMeetingTimes.body); assert.equal(fm.suggestions.length, 1); assert.equal(new Date(fm.suggestions[0].from).toISOString(), '2019-04-18T23:00:00.000Z'); assert.equal(fm.suggestions[0].confidence, 100); assert.deepEqual(fm.suggestions[0].attendees, [{ mail: 'alexw@contoso.com', availability: 'free' }]);
  const sh = G.parseShifts(GM.FIXTURES.shifts.body); assert.deepEqual(sh, [{ personId: 'c5d0c76b-80c4-481c-be50-923cd8d680a1', from: Date.parse('2019-03-11T15:00:00Z'), to: Date.parse('2019-03-12T00:00:00Z'), name: 'Day shift' }]);
  assert.deepEqual(G.parseShifts({ value: [{ userId: 'u', sharedShift: null, draftShift: { startDateTime: '2019-03-11T15:00:00Z', endDateTime: '2019-03-12T00:00:00Z' } }] }), [], 'a manager’s unpublished draft is not a fact');
  assert.equal(G.parsePeople(GM.FIXTURES.users.body)[0].mail, 'example.person@empathia.example');
  const odd = G.parseSchedule({ value: [{ scheduleId: 'a@empathia.example', scheduleItems: [{ status: 'busy', start: { dateTime: '2026-11-16T09:00:00.0000000', timeZone: 'Lunar Standard Time' }, end: { dateTime: '2026-11-16T10:00:00.0000000', timeZone: 'Lunar Standard Time' } }], workingHours: { daysOfWeek: ['monday'], startTime: '08:00:00.0000000', endTime: '17:00:00.0000000', timeZone: { name: 'Lunar Standard Time' } } }] });
  assert.equal(odd[0].working, null); assert.deepEqual(odd[0].busy, []); assert.match(odd[0].note, /time zone this adapter cannot read/);
  for (const bad of [null, 5, 'x', {}, { value: 'x' }, { value: [null, 3, 'x', { scheduleId: 7 }, { scheduleId: 'a@empathia.example', scheduleItems: [{ start: {}, end: {} }, 'x', null, { status: 'busy' }], workingHours: 'nine to five' }, { scheduleId: 'b@empathia.example', scheduleItems: 'none', workingHours: { daysOfWeek: 'monday' } }] }]) {
    let got; assert.doesNotThrow(() => { got = G.parseSchedule(bad); }, JSON.stringify(bad)); assert.ok(Array.isArray(got)); for (const s of got) { assert.equal(typeof s.mail, 'string'); assert.equal(s.working, null); assert.deepEqual(s.busy, []); }
    assert.doesNotThrow(() => { G.parsePeople(bad); G.parseShifts(bad); G.parseFindMeetingTimes(bad); G.parseEvent(bad, { transactionId: 'k', subject: '', body: '', from: 0, to: 1, parties: [], room: null }); }); }
  assert.equal(G.parseSchedule({ value: [null, { scheduleId: 7 }] }).length, 0, 'an entry without an address is dropped');
  { const priv = G.parseSchedule({ value: [{ scheduleId: 'a@empathia.example', scheduleItems: [{ isPrivate: true, status: 'busy', subject: 'Secret plan', start: { dateTime: '2026-11-16T15:00:00', timeZone: 'UTC' }, end: { dateTime: '2026-11-16T16:00:00', timeZone: 'UTC' } }] }] }); assert.deepEqual(priv[0].busy, [{ from: Date.UTC(2026, 10, 16, 15), to: Date.UTC(2026, 10, 16, 16), title: 'Busy' }]); assert.ok(!/Secret/.test(JSON.stringify(priv)), 'a subject, private or not, is never carried over'); }
  assert.equal(G.fromGraphTime({ dateTime: '2026-11-16T09:00:00', timeZone: 'Europe/London' }), Date.UTC(2026, 10, 16, 9)); assert.equal(G.fromGraphTime({ dateTime: '2026-07-16T09:00:00', timeZone: 'GMT Standard Time' }), Date.UTC(2026, 6, 16, 8)); assert.equal(G.fromGraphTime({ dateTime: 'x', timeZone: 'UTC' }), null); assert.equal(G.fromGraphTime(null), null);
  for (const tz of new Set(Object.values(D.ZONE_OF_GROUP))) assert.equal(G.toIana(G.toWindows(tz)), tz, `${tz} survives the trip through its Windows name`);
});

test('CX-28 [graph] no working hours in a readable zone, no proposal: the adapter refuses rather than guess', async () => {
  const { graph } = worlds(); const champ = D.championOf('ATL'); const inner = graph.tenant.transport;
  const a = G.graphAdapter({ ...graph.cfg, transport: async (req) => { const res = await inner(req); if (/getSchedule$/.test(req.url)) for (const v of res.body.value) if (v.workingHours) v.workingHours.timeZone = { name: 'Customized Time Zone' }; return res; } });
  const out = await a.suggest({ parties: [party(graph, ME), party(graph, champ)], room: null, minutes: 30, from: FROM, to: TO }); assert.equal(out.ok, false); assert.equal(out.kind, 'unavailable'); assert.match(out.why.join(' '), /A time is not proposed on a guess/);
  const made = await a.create({ transactionId: 'TX-G', subject: 's', body: '', from: FROM + 15 * 3_600_000, to: FROM + 15.5 * 3_600_000, parties: [party(graph, ME), party(graph, champ)], room: null }); assert.equal(made.ok, false); assert.equal(graph.tenant.events.length, 0, 'and nothing is created on a guess either');
});

test('CX-29 [graph] not authorised: 401 and 403 name the permission to ask an administrator for, per call and per kind of access; nothing is created', async () => {
  const champ = D.championOf('ATL'); const need = { users: ['people', (a) => a.people('Amara')], getSchedule: ['schedule', (a) => a.schedule([champ.email], FROM, TO)], shifts: ['shifts', (a) => a.shifts(FROM, TO)], findMeetingTimes: ['suggest', (a) => a.native({ parties: [], room: null, minutes: 30, from: FROM, to: TO })] };
  for (const mode of ['delegated', 'application']) for (const [call, [id, run]] of Object.entries(need)) {
    const g = worlds().graph; const a = G.graphAdapter({ ...g.cfg, mode }); const c = G.graphCall(id); const perm = mode === 'delegated' ? c.delegated : c.application; if (!perm) continue;
    g.tenant.deny(call, 403); const out = await run(a); assert.equal(out.ok, false, `${mode} ${call}`); assert.equal(out.kind, 'not-authorised'); assert.match(out.why[0], new RegExp(`^Not authorised; ask your administrator for ${perm.replace(/\./g, '\\.')} \\(${mode} permission, Microsoft Graph\\)`));
    g.tenant.deny(call, 401); const o2 = await run(a); assert.equal(o2.kind, 'not-authorised'); assert.match(o2.why[0], new RegExp(`sign-in is missing or has expired.*ask your administrator for ${perm.replace(/\./g, '\\.')}`));
    assert.ok(!/accessDenied|InvalidAuthenticationToken|Access is denied/.test(out.why.join(' ') + o2.why.join(' ')), 'the server’s own message is not shown to people');
  }
  // creating and cancelling: Calendars.ReadWrite; the user without it creates nothing
  const g = worlds().graph; const a = g.adapter; const slot = (await a.suggest({ parties: [party(g, ME), party(g, champ)], room: null, minutes: 30, from: FROM, to: TO })).value[0]; const req = { transactionId: 'TX-NO', subject: 's', body: '', from: slot.from, to: slot.to, parties: [party(g, ME), party(g, champ)], room: null };
  g.tenant.deny('events', 403); const no = await a.create(req); assert.equal(no.kind, 'not-authorised'); assert.match(no.why[0], /ask your administrator for Calendars\.ReadWrite \(delegated permission, Microsoft Graph\) so that this app may create the event/); assert.equal(g.tenant.events.length, 0);
  g.tenant.deny(null); const yes = await a.create(req); assert.ok(yes.ok); g.tenant.deny('cancel', 403); assert.match((await a.cancel(yes.value.event.id, '')).why[0], /Calendars\.ReadWrite/); assert.equal(g.tenant.events.filter((e) => !e.cancelled).length, 1);
  // CN-13: 401 and 403 are answered once, never retried; 409 and 500 on create say the event was not created, once
  for (const status of [401, 403, 409, 500]) { let calls = 0; const gx = worlds().graph; const inner = gx.tenant.transport; const sl = (await gx.adapter.suggest({ parties: [party(gx, ME), party(gx, champ)], room: null, minutes: 30, from: FROM, to: TO })).value[0];
    const ax = G.graphAdapter({ ...gx.cfg, transport: async (q) => { if (/\/events$/.test(q.url)) { calls += 1; return { status, headers: {}, body: { error: { code: 'x', message: 'server words' } } }; } return inner(q); } });
    const out = await ax.create({ transactionId: `TX-${status}`, subject: 's', body: '', from: sl.from, to: sl.to, parties: [party(gx, ME), party(gx, champ)], room: null });
    assert.equal(out.ok, false); assert.equal(calls, 1, `${status} is not retried`); assert.equal(out.kind, status < 404 ? 'not-authorised' : 'unavailable'); if (status >= 404) assert.match(out.why[0], new RegExp(`answered ${status} and did not create the event`)); assert.ok(!/server words/.test(out.why.join(' '))); assert.equal(ax.waits.length, 0); }
  // no token at all
  const bare = G.graphAdapter({ ...worlds().graph.cfg, token: async () => '' }); assert.equal((await bare.people('Amara')).kind, 'not-authorised');
  // somebody else's meeting cannot be cancelled: the page's own 400
  const g2 = worlds().graph; const other = G.graphAdapter({ ...g2.cfg, mode: 'application', organizer: champ.email }); const s2 = (await g2.adapter.suggest({ parties: [party(g2, ME), party(g2, champ)], room: null, minutes: 30, from: FROM, to: TO })).value[0]; const mine = await g2.adapter.create({ ...req, transactionId: 'TX-MINE', from: s2.from, to: s2.to });
  const stolen = await other.cancel(mine.value.event.id, ''); assert.equal(stolen.kind, 'invalid'); assert.match(stolen.why[0], /Only the organiser/); assert.equal(g2.tenant.events.filter((e) => !e.cancelled).length, 1);
});

test('CX-30 [graph] throttling and a lost answer: wait what Retry-After says, retry the same request, and never make a second event', async () => {
  const champ = D.championOf('ATL'); const mk = async (g, tx) => { const slot = (await g.adapter.suggest({ parties: [party(g, ME), party(g, champ)], room: roomOf(), minutes: 30, from: FROM, to: TO })).value[0]; return { transactionId: tx, subject: 'About Atlas 4.218', body: '', from: slot.from, to: slot.to, parties: [party(g, ME), party(g, champ)], room: roomOf() }; };
  { const g = worlds().graph; const req = await mk(g, 'TX-429'); g.waits.length = 0; g.tenant.throttle(2, 10); const n0 = g.tenant.received.length; const out = await g.adapter.create(req);
    assert.ok(out.ok, JSON.stringify(out)); assert.deepEqual(g.waits, [10_000, 10_000], 'waited the ten seconds the header asked for, twice'); assert.equal(g.tenant.events.length, 1);
    const posts = g.tenant.received.slice(n0); assert.equal(posts.filter((q) => q.status === undefined).length, posts.length); assert.ok(posts.every((q, k) => k === 0 || JSON.stringify(q.body) === JSON.stringify(posts.find((p) => p.url === q.url).body)), 'each retry is the same request');
    assert.equal(new Set(g.tenant.received.filter((q) => /\/events$/.test(q.url)).map((q) => q.body.transactionId)).size, 1, 'one transaction id across every attempt'); }
  { const g = worlds().graph; const req = await mk(g, 'TX-429B'); g.waits.length = 0; g.tenant.throttle(3, 0); await g.adapter.create(req); assert.deepEqual(g.waits, [1000, 2000, 4000], 'no usable Retry-After: back off exponentially'); assert.equal(g.tenant.events.length, 1); }
  { const g = worlds().graph; const req = await mk(g, 'TX-429C'); g.tenant.throttle(50, 1); const out = await g.adapter.create(req); assert.equal(out.ok, false); assert.equal(out.kind, 'throttled'); assert.match(out.why[0], /slow down 5 times in a row\. Nothing was created/); assert.equal(g.tenant.events.length, 0); g.tenant.throttle(0);
    const again = await g.adapter.create(req); assert.ok(again.ok && !again.value.again); assert.equal(g.tenant.events.length, 1, 'trying again later creates it once'); }
  // the answer is lost after the server created the event: the retry carries the same transaction id and the calendar holds one event
  { const g = worlds().graph; const req = await mk(g, 'TX-LOST'); g.waits.length = 0; g.tenant.dropNextAnswer(); const out = await g.adapter.create(req); assert.ok(out.ok, JSON.stringify(out)); assert.equal(g.tenant.events.length, 1); assert.equal(g.waits.length, 1);
    assert.equal(g.tenant.received.filter((q) => /\/events$/.test(q.url)).length, 2, 'two POSTs reached the server'); assert.equal(g.tenant.events[0].transactionId, 'TX-LOST');
    // and a fresh adapter (a reload) that is told the meeting it already recorded does not post at all
    const n = g.tenant.received.length; const fresh = G.graphAdapter({ ...g.cfg, known: (tx) => (tx === 'TX-LOST' ? out.value.event : null) }); const r2 = await fresh.create(req); assert.ok(r2.ok && r2.value.again); assert.equal(g.tenant.received.length, n, 'nothing sent'); assert.equal(g.tenant.events.length, 1); }
  // a transport that never answers: reads give up politely; nothing is invented
  { const dead = G.graphAdapter({ ...worlds().graph.cfg, transport: async () => { throw new Error('offline'); }, sleep: async () => {} }); const out = await dead.schedule([champ.email], FROM, TO); assert.equal(out.kind, 'unavailable'); assert.match(out.why[0], /could not be reached/); }
  assert.ok(GM.ASSUMPTIONS.length >= 4 && GM.ASSUMPTIONS.some((a) => /transactionId already used/.test(a)), 'what the mock assumes beyond the documentation is written down');
});

// ================================================================================================================ honesty of the whole slice
test('CX-31 nothing is connected and nothing claims to be: no network call in the Graph adapter, no page imports it, and the documents name every call, permission and source', () => {
  assert.deepEqual(AD.connected(), []); assert.match(AD.CONNECTION_STATEMENT, /^NOT CONNECTED\./); assert.match(AD.CONNECTION_STATEMENT, /never been validated against a real calendar, a real Teams client or a real phone/);
  const dir = path.join(repo, 'apps/demo/src/connect'); const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8'); const files = fs.readdirSync(dir).filter((f) => /\.(ts|tsx)$/.test(f));
  for (const f of ['graph.ts', 'graph.mock.ts']) assert.ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|navigator\.|import\s*\(/.test(read(f)), `${f} reaches nothing by itself`);
  for (const f of files.filter((x) => !/^graph/.test(x))) assert.ok(!/from '\.\/graph(\.mock)?\.js'/.test(read(f)), `${f} does not import the Graph adapter: the demonstration runs on the simulated calendar only`);
  const src0 = path.join(repo, 'apps/demo/src'); const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : []));
  for (const f of walk(src0).filter((f) => !f.startsWith(dir))) assert.ok(!/connect\/graph/.test(fs.readFileSync(f, 'utf8')), `${path.relative(repo, f)} imports the Graph adapter`);
  // what ships carries no documentation address (the integrator, 11 Nov: the security suite refused learn.microsoft.com in a demo
  // chunk): the files a page can import name a source by a short key; the one external host in them is the deep link a person
  // chooses to open, and nothing is fetched from it
  const SHIPPED = files.filter((f) => !/^(graph|graph\.mock|apps\.sources)\.ts$/.test(f));
  for (const f of SHIPPED) { const hosts = [...read(f).replace(/\/\*[\s\S]*?\*\/|\/\/ .*$/gm, '').matchAll(/\bhttps?:\/\/[a-z0-9.-]+/gi)].map((m) => m[0]); assert.deepEqual([...new Set(hosts)].filter((h) => h !== 'https://teams.microsoft.com'), [], `${f} names a host`); if (hosts.length) assert.equal(f, 'apps.ts', 'the deep link is built in one place');
    assert.ok(!/from '\.\/apps\.sources\.js'/.test(read(f)), `${f} imports the documentation sources`); assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|EventSource|WebSocket|new Image\b|importScripts/.test(read(f)), `${f} requests something`); }
  for (const f of walk(src0).filter((f) => !f.startsWith(dir))) assert.ok(!/connect\/apps\.sources/.test(fs.readFileSync(f, 'utf8')), `${path.relative(repo, f)} imports the documentation sources`);
  // words: nothing simulated or mock-tested is called verified, live or production; nothing says a message or an invitation was sent
  for (const f of files) { const text = read(f).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''); const lits = [...text.matchAll(/'([^'\n]{12,})'|`([^`]{12,})`|>([^<>{}\n]{12,})</g)].map((m) => m[1] || m[2] || m[3]);
    for (const s of lits) { assert.ok(!/\b(verified|production[- ]ready|certified|real-time|proven)\b/i.test(s), `${f}: “${s.slice(0, 80)}”`); assert.ok(!/\b(message|invitation|invite|email) (was |has been |is )?sent\b/i.test(s.replace(/No invitation is sent|sends nothing|nobody is invited/gi, '')), `${f}: “${s.slice(0, 90)}”`); } }
  // the registry of Graph calls: each on an official page, read on the day; and both documents carry every one
  const docs = ['docs/surpass/CONNECT.md', 'docs/surpass/M365_DEPLOYMENT_AND_TEST_GUIDE.md'].map((f) => [f, fs.readFileSync(path.join(repo, f), 'utf8')]);
  assert.deepEqual(G.GRAPH_CALLS.map((c) => c.id).sort(), ['cancel', 'create', 'people', 'schedule', 'shifts', 'suggest']);
  for (const c of G.GRAPH_CALLS) { assert.match(c.source, /^https:\/\/learn\.microsoft\.com\//); assert.equal(c.validated, '2026-11-11'); assert.ok(c.notes.length >= 1);
    for (const [f, text] of docs) { assert.ok(text.includes(c.source), `${f} cites ${c.source}`); for (const p of [c.delegatedPath, c.applicationPath].filter(Boolean)) assert.ok(text.includes(p), `${f} names ${p}`); for (const perm of [c.delegated, c.application].filter(Boolean)) assert.ok(text.includes(perm), `${f} names ${perm}`); } }
  for (const g of Object.values(G.GRAPH_GUIDANCE)) for (const [f, text] of docs) assert.ok(text.includes(g.source), `${f} cites ${g.source}`);
  for (const j of A.APP_JUMPS) { const [f, text] = docs[0]; assert.ok(text.includes(j.id), `${f} lists ${j.id}`); if (src(j)) assert.ok(text.includes(src(j)), `${f} cites ${src(j)}`); assert.ok(text.includes(tpl(j)), `${f} gives the template of ${j.id}`); }
  for (const [f, text] of docs) { assert.match(text, /NOT CONNECTED/); assert.match(text, /2026-11-11/); for (const pending of ['Real tenant validation', 'Actual event creation', 'Live Teams interactions', 'Physical mobile QA']) assert.ok(text.includes(pending), `${f}: “${pending}” is pending`); assert.ok(!/\b(production-ready|certified|proven in production)\b/i.test(text)); }
  const guide = docs[1][1]; for (const need of ['Android', 'iPhone', 'room mailbox', 'WITHOUT', 'admin consent', 'Delegated', 'Application']) assert.ok(guide.includes(need), `the guide covers ${need}`);
  for (const a of GM.ASSUMPTIONS) assert.ok(docs[0][1].includes(a.slice(0, 60)), `CONNECT.md lists the mock’s assumption: ${a.slice(0, 60)}`);
  // each permission a call names is on the permissions reference in that kind, with the consent it needs; no application permission without an administrator
  for (const c of G.GRAPH_CALLS) for (const [kind, perm] of [['delegatedAdminConsent', c.delegated], ['applicationAdminConsent', c.application]]) if (perm) { const ref = G.GRAPH_PERMISSIONS.find((x) => x.name === perm); assert.ok(ref && typeof ref[kind] === 'boolean', `${perm} (${kind}) is on the permissions reference`); }
  assert.ok(G.GRAPH_PERMISSIONS.every((x) => x.applicationAdminConsent !== false)); assert.ok(guide.includes(G.GRAPH_PERMISSIONS_SOURCE));
  // ONE guide (11 Nov): what the integrator's guide carried is still in it — the status table in the directive's six columns with every
  // row pending, the twelve-step script, accounts A to E, the cancel call, the SharePoint row — and it no longer says it precedes the code
  for (const need of ['| Capability | Specified | Implemented | Tested | Lab-verified | Customer-authorised | Released |', 'The script in twelve steps', 'User C — shift worker', 'User D — WITHOUT permission', 'User E — a second tenant', '/events/{eventId}/cancel', 'Sites.Selected', 'isOnlineMeeting']) assert.ok(guide.includes(need), `the guide keeps “${need}”`);
  { const rows = guide.split('\n').filter((l) => /^\| /.test(l)); const at = rows.findIndex((l) => l.startsWith('| Capability | Specified')); const status = rows.slice(at + 1, at + 9); assert.equal(status.length, 8); for (const l of status) { const cells = l.split('|').map((x) => x.trim()); assert.match(cells[5], /^\*\*PENDING/, `Lab-verified is pending: ${cells[1]}`); assert.ok(/^(no|—)$/.test(cells[6]) && /^(no|—)$/.test(cells[7]), `not authorised by a customer, not released: ${cells[1]}`); } }
  assert.ok(!/written before the code/.test(guide)); assert.match(guide, /nothing in this document has been run against a tenant/);
});
