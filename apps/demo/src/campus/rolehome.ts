/**
 * Where each role starts (founder, 10 November: "what each role's starting page is different … get them working on what they need to be
 * working on now, with navigation buttons, shortcuts and jump-to buttons").
 *
 * V2.5.3 gave every role its own home (viewHomeFor: Welcome, Today, Briefing, Today's work, Drawing board, Ledger, Service delivery,
 * Design desk, Field package, Proof board, Delivery timeline, Projects) with the Mission Control strip "What changed / What matters /
 * What needs my decision". The rebuild had one Mission Control for all. This module is the model of those homes on the rebuild's own
 * records: for a role it returns the one thing to start with, the places to jump to, the strip, the figures and the queues.
 *
 * Rules:
 *   - every figure and row is computed from the records passed in (rooms, the service workspace, the programme); nothing is invented
 *     here, and a role whose records hold nothing is told so in words;
 *   - every address is offered only if the role may open it (`opens`, D44): the model never names a place the role cannot use;
 *   - a role is shown only its own kind of figure: a visitor and an employee are never shown health scores, issues or money.
 */
import type { RoleKey } from '../registry.types.js';
import { CHAMPION_SITES, ROLES } from '../access/policy.js';
import { allRecords, PEOPLE, type RoomRecord } from './design.js';
import { REFERENCE_ROOM_ID, SITE, buildingByKey, roomById, roomHref, shortName } from './canon.js';
import { attentionQueue, campusStats, roomHealth, roomIssues } from './metrics.js';
import { flow, priorities, prioritiesFor, type Priority } from './mission.js';
import { programme } from './programme.js';
import { techForPersona, type Workspace } from '../workspace/store.js';
import { connectJumps } from '../connect/jumps.js';
import { syntheticHistory } from '../service/history.js';
import { vendorScorecard, months } from '../service/analytics.js';
import { deviceRegister, registerStats } from './registers.js';
import { readRegister } from './registerStore.js';

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted';
export interface Link { label: string; href: string }
export interface Jump extends Link { /** the letter pressed after "g" */ key: string; sub: string }
export interface Row { id: string; title: string; sub: string; href?: string; tone?: Tone; tag?: string }
export interface Zone { id: string; title: string; hint?: string; rows: Row[]; empty: string; more?: Link }
export interface Tile { label: string; value: string; unit?: string; hint?: string; tone?: Tone; href?: string }
export interface Strip { changed: Row[]; matters: Row[]; decide: Row[]; cols: Array<'changed' | 'matters' | 'decide'> }
export interface Start {
  role: RoleKey;
  /** the home's name, from V2.5.3 (ROLE.home): "Today's work", "Proof board" … */
  name: string;
  headline: string;
  summary: string;
  primary: (Link & { why: string }) | null;
  jumps: Jump[];
  strip: Strip | null;
  tiles: Tile[];
  zones: Zone[];
  /** how the figures on this page are known */
  basis: string;
}

/** The home's name is V2.5.3's own (ROLE.home, carried in the policy): one source, never retyped here. */
export const homeName = (role: RoleKey) => ROLES[role].home;
/** Roles whose start page is Mission Control itself (V2.5.3: viewHome). */
export const MISSION_ROLES: readonly RoleKey[] = ['ops', 'architect'];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const lower1 = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const who = (p: string | null | undefined) => (p ? (PEOPLE[p] || p).replace(' (synthetic)', '') : 'nobody yet');
const LIVE = new Set(['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'RESTORED', 'PENDING_VERIFICATION']);
const DAY = 864e5;
const fromPriority = (p: Priority): Row => ({ id: p.id, title: p.title, sub: `${p.where} · ${p.decides}`, href: p.href, tone: p.tone, tag: p.verb });

/** The jump list of a role: its own destinations in the order its work runs, each offered only if it opens. Letters are unique per role. */
const JUMPS: Record<RoleKey, Array<[key: string, label: string, href: string, sub: string]>> = {
  visitor: [['w', 'Find the way', '#/lite/way', 'Step by step from where you are'], ['p', 'Places', '#/search', 'Reception, parking, somewhere to wait'], ['l', 'The campus', '#/lite', 'Buildings and public places'], ['e', 'In a room', '#/here', 'What is here, and what to try']],
  employee: [['r', 'My room', `#/lite/room/${REFERENCE_ROOM_ID}?mode=user`, 'How it works and whether it is ready'], ['f', 'Find a room', '#/lite', 'By building, floor and what you need'], ['p', 'Places', '#/lite/services', 'Help desk, coffee, post, quiet pods'], ['s', 'Search', '#/search', 'Rooms, places and guides'], ['n', 'Report a problem', '#/servicehands/new', 'In plain words, followed to closure'], ['q', 'Ask for something', '#/request', 'A room, equipment, a replacement'], ['e', 'In a room', '#/here', 'What is here, and what to try']],
  sitechamp: [['m', 'My site', '#/site', 'Rooms, visits, problems and what you know'], ['e', 'In a room', '#/here', 'What is here, and what to try'], ['n', 'Report a problem', '#/servicehands/new', 'In plain words, followed to closure'], ['a', 'Attest for a room', '#/scan/SIM-AV-0042', 'Tell the approvers how it works for people'], ['f', 'Find a room', '#/lite', 'By building, floor and what you need'], ['s', 'Search', '#/search', 'Rooms, people and who supports what'], ['q', 'Ask for something', '#/request', 'A room, equipment, a replacement']],
  exec: [['p', 'Portfolio', '#/pro/exec', 'Risk, readiness and exposure'], ['c', 'Campus', '#/campus', 'Every building and its rooms'], ['b', 'Budget', '#/budget', 'Every figure a project has had'], ['d', 'Decisions', '#/decisions', 'What was decided, by whom, on what'], ['s', 'Search', '#/search', 'Ask about anything on record'], ['q', 'Ask for something', '#/request', 'A room, equipment, a replacement']],
  service: [['j', 'My jobs', '#/servicehands', 'Accept, start, record, hand back'], ['i', 'Issues', '#/pro/issues', 'Open in your coverage'], ['r', 'The room', '#/room', 'Atlas 4.218 as a technician sees it'], ['x', 'Known fixes', '#/service/fixes', 'What worked before'], ['s', 'Search', '#/search', 'A device, a room, a serial'], ['e', 'In a room', '#/here', 'What is here, and what to try']],
  svcmgr: [['d', 'Dispatch board', '#/service', 'Triage and assign'], ['c', 'Coverage', '#/search/coverage', 'Who supports what, and the gaps'], ['j', 'ServiceHands', '#/servicehands', 'Every job and its stage'], ['i', 'Issues', '#/pro/issues', 'Open across the campus'], ['x', 'Known fixes', '#/service/fixes', 'The fix library'], ['q', 'Ask for something', '#/request', 'A room, equipment, a replacement'], ['e', 'In a room', '#/here', 'What is here, and what to try']],
  syseng: [['q', 'Requests', '#/intake', 'To triage and to scope'], ['b', 'Room Builder', '#/builder', 'Design with the full engine'], ['c', 'Commissioning', '#/commissioning', 'Checks, evidence, sign-off'], ['u', 'Scouter', '#/scouter', 'Does this device suit this room'], ['o', 'Space Optimizer', '#/optimizer/university', 'Three ways to equip a room'], ['n', 'Ask for something', '#/request', 'A room, equipment, a replacement']],
  designer: [['q', 'Intake', '#/intake', 'Requests waiting for a brief'], ['b', 'Room Builder', '#/builder', 'Design with the full engine'], ['u', 'Scouter', '#/scouter', 'Does this device suit this room'], ['t', 'Studio', '#/studio', 'Lay out a room by hand'], ['o', 'Space Optimizer', '#/optimizer/university', 'Three ways to equip a room'], ['n', 'Ask for something', '#/request', 'A room, equipment, a replacement']],
  installer: [['j', 'My jobs', '#/servicehands', 'Accept, start, record, hand back'], ['i', 'Installation', '#/install', 'Work orders, evidence, verification'], ['k', 'Handoffs', '#/handoff', 'Who handed what to whom'], ['r', 'The room', '#/room', 'Atlas 4.218 as built'], ['e', 'In a room', '#/here', 'What is here, and what to try']],
  cxeng: [['c', 'Checks', '#/commissioning', 'Every room’s tests and evidence'], ['x', 'Deficiencies', '#/commissioning/deficiencies', 'Open, by owner'], ['k', 'Handoffs', '#/handoff', 'Ready for commissioning, ready for service'], ['a', 'Baselines', '#/assurance', 'Rooms against what was commissioned'], ['p', 'Proof', '#/proof', 'The dossier and what it rests on'], ['e', 'In a room', '#/here', 'What is here, and what to try']],
  ipm: [['p', 'Projects', '#/projects', 'Governance, delivery and funding'], ['i', 'Installation', '#/install', 'Field execution'], ['k', 'Handoffs', '#/handoff', 'Open and blocked'], ['c', 'Campus', '#/campus', 'Where the work is']],
  bpm: [['p', 'Portfolio', '#/projects', 'Every project you sponsor'], ['d', 'Decisions', '#/decisions', 'What was decided and why'], ['l', 'Lessons', '#/lessons', 'What the last project taught'], ['b', 'Budget', '#/budget', 'Estimate against actual'], ['q', 'Ask for something', '#/request', 'A room, equipment, a replacement']],
  steward: [['r', 'Records', '#/search', 'Every record and its source'], ['q', 'Quality', '#/search/quality', 'What is missing or unverified'], ['l', 'Ledger', '#/ledger', 'Every change, allowed or refused'], ['x', 'The registers', '#/pro/registry', 'Devices and rooms as registers']],
  qa: [['c', 'Records', '#/commissioning', 'Evidence waiting for review'], ['p', 'Proof', '#/proof', 'The dossier and its claims'], ['s', 'Search', '#/search', 'Find a record']],
  ops: [['c', 'Campus', '#/campus', 'Every building and its rooms'], ['s', 'Search', '#/search', 'Search Party'], ['r', 'The room', '#/room', 'Atlas 4.218'], ['d', 'Dispatch board', '#/service', 'Triage and assign'], ['a', 'Assurance', '#/assurance', 'Rooms against their baseline'], ['t', 'Tours', '#/tours', 'Guided scenarios'], ['q', 'Ask for something', '#/request', 'A room, equipment, a replacement']],
  architect: [['c', 'Campus', '#/campus', 'Every building and its rooms'], ['s', 'Search', '#/search', 'Search Party'], ['r', 'The room', '#/room', 'Atlas 4.218'], ['w', 'Worlds', '#/worlds', 'Enterprise, Stadium, University, Convention'], ['t', 'Tours', '#/tours', 'Guided scenarios'], ['l', 'SIGNAL', '#/story', 'The story, chapter by chapter'], ['q', 'Ask for something', '#/request', 'A room, equipment, a replacement']],
};
export function jumpsFor(role: RoleKey, opens: (href: string) => boolean): Jump[] {
  return [...JUMPS[role], ...connectJumps(role, JUMPS[role])].filter(([, , href]) => opens(href)).map(([key, label, href, sub]) => ({ key, label, href, sub }));
}

export interface Inputs { role: RoleKey; w: Workspace | null; opens: (href: string) => boolean; recs?: RoomRecord[]; now?: number; draft?: { code: string; name: string } | null }

/** The Mission Control strip of V2.5.3 for a role: what changed in the last day, what matters, what waits for this role's decision. */
function stripFor(i: Inputs, mine: Priority[], cols: Strip['cols']): Strip {
  const now = i.now ?? Date.now(); const recs = i.recs || allRecords();
  const changed: Row[] = (i.w?.events || []).filter((e) => e.by !== 'system' && now - Date.parse(e.at) <= DAY)   /* a person's change, not the workspace being set up */.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3).map((e, n) => ({ id: `chg-${n}`, title: `${e.type.replace(/^[a-z]+\./, '').replace(/_/g, ' ')} · ${e.aggregate}`, sub: `${e.detail}${e.outcome === 'DENIED' ? ' · refused' : ''}`, tone: e.outcome === 'DENIED' ? 'bad' : 'info' }));
  const matters = mine.filter((p) => p.verb !== 'Review').slice(0, 3).map(fromPriority);
  const decide = mine.filter((p) => p.verb === 'Review').slice(0, 3).map(fromPriority);
  void recs;
  return { changed, matters, decide, cols };
}

function startCore(i: Inputs): Start {
  const { role, w, opens } = i; const recs = i.recs || allRecords(); const now = i.now ?? Date.now();
  const open = (href: string) => opens(href.split('?')[0]!);
  const link = (href: string | undefined) => (href && open(href) ? href : undefined);
  const all = priorities(w, recs); const { mine } = prioritiesFor(role, open, all);
  const jumps = jumpsFor(role, open);
  const base = { role, name: ROLES[role].home, jumps };
  const incidents = (w?.incidents || []); const live = incidents.filter((x) => LIVE.has(x.state));
  const wos = (w?.workOrders || []).filter((x) => !['DONE', 'CANCELLED'].includes(x.state));
  const roomName = (id: string, fallback = id) => { const o = roomById(id); return o ? shortName(o) : fallback; };
  const P = programme();
  const first = (rows: Row[]) => rows.find((r) => r.href);
  const primaryOf = (rows: Row[], verb: string, why: string): Start['primary'] => { const r = first(rows); return r ? { label: `${verb} ${r.id}`, href: r.href!, why } : null; };

  switch (role) {
    case 'visitor': {
      const atl = buildingByKey('ATL');
      return { ...base, headline: 'Welcome.', summary: `You are at ${SITE.name}. Reception is in ${atl?.name || 'Atlas HQ'}; the way there is step by step, from where you are standing.`,
        primary: open('#/lite/way') ? { label: 'Find the way', href: '#/lite/way', why: 'From the visitor parking to reception' } : null,
        strip: null, tiles: [], zones: [], basis: 'A synthetic campus: no real building, host or meeting.' };
    }
    case 'employee': {
      const mine0 = recs.find((r) => r.outline.id === REFERENCE_ROOM_ID) || recs[0]!; const b = buildingByKey(mine0.outline.building);
      const known = roomIssues(mine0, w).filter((x) => x.state !== 'RESOLVED');
      const near = recs.filter((r) => r.outline.id !== mine0.outline.id && r.outline.building === mine0.outline.building).sort((a, c) => Math.abs(a.outline.floor - mine0.outline.floor) - Math.abs(c.outline.floor - mine0.outline.floor) || a.outline.number.localeCompare(c.outline.number)).slice(0, 6);
      const asked = incidents.filter((x) => x.history[0]?.by === 'requestor');   // the persona an employee or a visitor reports as (build/store.ts)
      const roomRow = (r: RoomRecord): Row => { const k = roomIssues(r, w).length; return { id: r.outline.id, title: `${shortName(r.outline)} · ${r.outline.name}`, sub: `${r.archetypeName} · floor ${r.outline.floor}${k ? ' · a problem is on record' : ''}`, href: link(`#/lite/room/${r.outline.id}?mode=user`), tone: k ? 'warn' : 'ok', tag: k ? 'Known problem' : undefined }; };
      return { ...base, headline: 'Your day on campus.', summary: `Your room is ${shortName(mine0.outline)}, ${mine0.outline.name}, in ${b?.name || mine0.outline.building} on floor ${mine0.outline.floor}. ${known.length ? `${plural(known.length, 'problem')} ${known.length === 1 ? 'is' : 'are'} on record for it and being looked at.` : 'No problem is on record for it.'}`,
        primary: open(`#/lite/room/${mine0.outline.id}`) ? { label: `Open ${shortName(mine0.outline)}`, href: `#/lite/room/${mine0.outline.id}?mode=user`, why: 'How the room works, and how to start a meeting' } : null,
        strip: null, tiles: [],
        zones: [
          { id: 'near', title: 'Rooms near yours', hint: `${b?.name || ''}, nearest floor first`, rows: near.map(roomRow), empty: 'No other room is modelled in this building.', more: open('#/lite') ? { label: 'Every room', href: '#/lite' } : undefined },
          { id: 'asked', title: 'What you reported', hint: 'Followed to closure', rows: asked.slice(0, 4).map((x) => ({ id: x.id, title: x.title, sub: `${roomName(x.roomId, x.roomName)} · ${x.state.toLowerCase().replace(/_/g, ' ')}`, tone: LIVE.has(x.state) ? 'warn' : 'ok' })), empty: 'You have reported nothing. If something in a room is not working, say so in plain words.', more: open('#/servicehands/new') ? { label: 'Report a problem', href: '#/servicehands/new' } : undefined },
        ], basis: 'Rooms and problems are synthetic records; nothing here is a live booking or sensor.' };
    }
    case 'sitechamp': {
      // The champion's Mission Control: their own site, computed from the same records every other role reads. No health scores, no money,
      // no engineering figures: what is wrong here, who is coming, and what waits for the champion.
      const site = CHAMPION_SITES[0]!; const b = buildingByKey(site); const mineRecs = recs.filter((r) => r.outline.building === site);
      const withProblem = mineRecs.filter((r) => roomIssues(r, w).some((x) => x.state !== 'RESOLVED'));
      const visits = wos.filter((x) => x.buildingKey === site); const toConfirm = visits.filter((x) => !x.access);
      const here = live.filter((x) => x.buildingKey === site);
      const first = toConfirm[0];
      return { ...base, headline: toConfirm.length ? `${plural(toConfirm.length, 'visit')} to ${b?.short || site} wait${toConfirm.length === 1 ? 's' : ''} for you to confirm access.` : `${b?.name || site} is your site.`,
        summary: `${plural(mineRecs.length, 'room')} here. ${withProblem.length ? `${plural(withProblem.length, 'room')} ${withProblem.length === 1 ? 'has' : 'have'} a problem on record` : 'No room has a problem on record'}; ${here.length ? `${plural(here.length, 'job')} ${here.length === 1 ? 'is' : 'are'} being followed` : 'no job is open'}. You report, confirm access, check rooms against their record and say what you know. You do not change settings, run tests or approve.`,
        primary: open('#/site') ? { label: first ? `Confirm access for ${first.id}` : 'Open my site', href: '#/site', why: first ? `${first.title}` : 'Rooms, visits, problems and what you know' } : null,
        strip: null,
        tiles: [
          { label: 'Rooms at my site', value: String(mineRecs.length), hint: b?.name || site, tone: 'info', href: link('#/site') },
          { label: 'With a problem on record', value: String(withProblem.length), hint: withProblem.length ? 'being followed' : 'none', tone: withProblem.length ? 'warn' : 'ok', href: link('#/site') },
          { label: 'Visits planned', value: String(visits.length), hint: toConfirm.length ? `${toConfirm.length} to confirm access` : 'access confirmed', tone: toConfirm.length ? 'warn' : 'ok', href: link('#/site') },
        ],
        zones: [
          { id: 'visits', title: 'Visits to my site', hint: 'Say they can get in', rows: visits.slice(0, 5).map((x) => ({ id: x.id, title: x.title, sub: `${roomName(x.roomId)} · ${x.access ? `access confirmed by ${x.access.confirmedBy}` : 'access not yet confirmed'}`, href: link('#/site'), tone: x.access ? 'ok' as Tone : 'warn' as Tone, tag: x.access ? 'Confirmed' : 'To confirm' })), empty: 'No visit is planned for this site.' },
          { id: 'problems', title: 'Problems on record here', hint: 'Walk in and add what you see', rows: here.slice(0, 5).map((x) => ({ id: x.id, title: x.title, sub: `${roomName(x.roomId, x.roomName)} · ${x.state.toLowerCase().replace(/_/g, ' ')}`, href: link(`#/here/${x.roomId}`), tone: 'warn' as Tone })), empty: 'No problem is being followed at this site.', more: open('#/here') ? { label: 'Walk into a room', href: '#/here' } : undefined },
        ], basis: 'Rooms, jobs and visits are synthetic records of one site; nothing here is a live booking, sensor or schedule.' };
    }
    case 'exec': {
      const c = campusStats(w); const funded = P.funding.reduce((s, f) => s + f.amount, 0); const unfunded = P.projects.filter((p) => p.governance === 'APPROVED' && !P.funding.some((f) => f.projectId === p.id));
      const decide = mine.filter((p) => p.verb === 'Review').map(fromPriority);
      const byBuilding: Row[] = [...c.buildings, ...c.sites].filter((s) => s.rooms).sort((a, b) => (a.score ?? 101) - (b.score ?? 101)).slice(0, 6).map((s) => ({ id: s.b.key, title: s.b.name, sub: `${plural(s.rooms, 'room')} · ${plural(s.open, 'open issue')}${s.high ? `, ${s.high} high` : ''} · ${s.verifiedPct == null ? 'no test on record' : `${s.verifiedPct}% of tests verified`}`, href: link(`#/campus/${s.b.key}`), tone: s.band === 'healthy' ? 'ok' : s.band === 'monitor' ? 'warn' : s.band === 'action' ? 'bad' : 'muted', tag: s.score == null ? 'Not scored' : `${s.score}` }));
      return { ...base, headline: `${plural(decide.length, 'decision')} wait${decide.length === 1 ? 's' : ''} for a sponsor.`,
        summary: `The campus stands at ${c.score ?? '—'} of 100 across ${c.scored} scored rooms: ${c.healthy} healthy, ${c.action} needing action. $${Math.round(funded / 1000)}k is authorised across ${P.funding.length} of ${plural(P.projects.length, 'project')}${unfunded.length ? `; ${unfunded.map((p) => p.id).join(', ')} ${unfunded.length === 1 ? 'is' : 'are'} approved and not yet funded` : ''}.`,
        primary: primaryOf(decide, 'Decide', 'The oldest decision that is yours') || (open('#/pro/exec') ? { label: 'Open the portfolio', href: '#/pro/exec', why: 'Nothing waits for your decision' } : null),
        strip: stripFor(i, mine, ['matters', 'decide']),
        tiles: [
          { label: 'Campus health', value: String(c.score ?? '—'), unit: '/100', hint: `mean of ${c.scored} rooms · healthy is 88 or more`, tone: c.band === 'healthy' ? 'ok' : c.band === 'monitor' ? 'warn' : 'bad', href: link('#/campus') },
          { label: 'Rooms healthy', value: String(c.healthy), unit: ` of ${c.rooms}`, hint: `${c.monitor} being watched`, tone: 'ok', href: link('#/campus') },
          { label: 'Tests verified', value: c.verifiedPct == null ? '—' : String(c.verifiedPct), unit: c.verifiedPct == null ? '' : '%', hint: 'recorded by one person, verified by another', tone: 'info', href: link('#/assurance') },
          { label: 'Funding authorised', value: `$${Math.round(funded / 1000)}k`, hint: `${P.funding.length} of ${P.projects.length} projects · not a quote`, tone: 'info', href: link('#/budget') },
        ],
        zones: [
          { id: 'decide', title: 'Decisions waiting for a sponsor', hint: String(decide.length), rows: decide, empty: 'Nothing is waiting for a sponsor.', more: open('#/decisions') ? { label: 'Decision memory', href: '#/decisions' } : undefined },
          { id: 'portfolio', title: 'The portfolio, weakest first', hint: 'Health is modelled from the records, not measured', rows: byBuilding, empty: 'No building has a scored room.' },
        ], basis: 'MODELED from the synthetic records when this page opened; not live monitoring, and no figure is a quote.' };
    }
    case 'service': case 'installer': {
      const me = techForPersona(role); const myWos = wos.filter((x) => x.techId === me).sort((a, b) => (a.window?.from || '9').localeCompare(b.window?.from || '9'));
      const jobRow = (x: typeof wos[number]): Row => ({ id: x.id, title: x.title, sub: `${roomName(x.roomId)} · ${x.workType} · ${x.state.toLowerCase().replace(/_/g, ' ')}${x.window ? ` · window ${x.window.from.slice(11, 16)}–${x.window.to.slice(11, 16)}` : ''}`, href: link(`#/servicehands/wo/${x.id}`), tone: x.state === 'ASSIGNED' ? 'warn' : 'info', tag: x.state === 'ASSIGNED' ? 'To accept' : x.state === 'ACCEPTED' ? 'To start' : 'In progress' });
      const queue = mine.filter((p) => p.verb !== 'Review').map(fromPriority);
      const installing = recs.filter((r) => r.lifecycle === 'INSTALLATION_PENDING' || r.lifecycle === 'INSTALLED_UNVERIFIED');
      const nowJob = myWos[0];
      const zones: Zone[] = [
        { id: 'jobs', title: role === 'installer' ? 'Your package' : 'Your jobs', hint: 'Assigned to you, earliest window first', rows: myWos.map(jobRow), empty: 'No work order is assigned to you.', more: open('#/servicehands') ? { label: 'Every job', href: '#/servicehands' } : undefined },
        role === 'installer'
          ? { id: 'install', title: 'Rooms being installed', hint: 'Installation pending, or installed and not yet verified', rows: installing.map((r) => ({ id: r.outline.id, title: `${shortName(r.outline)} · ${r.outline.name}`, sub: `${r.lifecycle.toLowerCase().replace(/_/g, ' ')}${r.nextStep?.blockers.length ? ` · held: ${r.nextStep.blockers[0]}` : ''}`, href: link(roomHref(r.outline)), tone: r.nextStep?.blockers.length ? 'warn' : 'info' })), empty: 'No room is waiting for installation.', more: open('#/install') ? { label: 'Installation', href: '#/install' } : undefined }
          : { id: 'queue', title: 'Queue', hint: 'Most severe first', rows: queue, empty: 'Nothing is open in your work.', more: open('#/pro/issues') ? { label: 'All issues in your work', href: '#/pro/issues' } : undefined },
      ];
      return { ...base, headline: nowJob ? `${roomName(nowJob.roomId)}: ${lower1(nowJob.title)}` : role === 'installer' ? 'Nothing booked today.' : `${plural(queue.length, 'item')} in your work.`,
        summary: `${plural(myWos.length, 'work order')} ${myWos.length === 1 ? 'is' : 'are'} assigned to you${myWos.filter((x) => x.state === 'ASSIGNED').length ? `, ${myWos.filter((x) => x.state === 'ASSIGNED').length} still to accept` : ''}. ${role === 'installer' ? `${plural(installing.length, 'room')} ${installing.length === 1 ? 'is' : 'are'} in installation.` : `${plural(live.length, 'service request')} ${live.length === 1 ? 'is' : 'are'} live across the campus.`}`,
        primary: nowJob && link(`#/servicehands/wo/${nowJob.id}`) ? { label: nowJob.state === 'ASSIGNED' ? `Accept ${nowJob.id}` : `Continue ${nowJob.id}`, href: `#/servicehands/wo/${nowJob.id}`, why: `${roomName(nowJob.roomId)} · ${nowJob.workType}` } : primaryOf(queue, 'Open', 'The most severe item in your work'),
        strip: role === 'service' ? stripFor(i, mine, ['changed', 'matters']) : null, tiles: [], zones,
        basis: 'The clocks and windows are synthetic: nothing here is a live system.' };
    }
    case 'svcmgr': {
      const triage = incidents.filter((x) => x.state === 'OPEN'); const staff = w?.staff || [];
      const load: Row[] = staff.map((s) => { const n = wos.filter((x) => x.techId === s.id).length; return { id: s.id, title: s.name.replace(' (synthetic)', ''), sub: `${plural(n, 'open work order')}${s.internal ? '' : ` · ${s.orgName || 'vendor'}`}`, tone: (n > 2 ? 'warn' : 'muted') as Tone, tag: String(n) }; }).sort((a, b) => Number(b.tag) - Number(a.tag));
      const unassigned = wos.filter((x) => !x.techId);
      const triRows: Row[] = triage.map((x) => ({ id: x.id, title: x.title, sub: `${x.id} · ${roomName(x.roomId, x.roomName)} · ${x.severity} · opened ${x.openedAt.slice(0, 10)}`, href: link(`#/v25/service?id=${x.id}`) || link('#/service'), tone: x.severity === 'Standard' ? 'warn' : 'bad', tag: 'To triage' }));
      return { ...base, headline: `${plural(live.length, 'request')} live, ${triage.length} to triage.`,
        summary: `${plural(wos.length, 'work order')} ${wos.length === 1 ? 'is' : 'are'} open, ${unassigned.length} with nobody assigned. ${plural(staff.length, 'technician')} on the roster, ${staff.filter((s) => !s.internal).length} from a vendor.`,
        primary: primaryOf(triRows, 'Triage', 'Severity first, then who may do the work') || (open('#/service') ? { label: 'Open the dispatch board', href: '#/service', why: 'Nothing waits for triage' } : null),
        strip: stripFor(i, mine, ['changed', 'matters', 'decide']),
        tiles: [
          { label: 'Live requests', value: String(live.length), hint: `${incidents.length - live.length} closed on record`, tone: live.length ? 'warn' : 'ok', href: link('#/service') },
          { label: 'To triage', value: String(triage.length), hint: 'opened, no severity decision yet', tone: triage.length ? 'bad' : 'ok', href: link('#/service') },
          { label: 'Open work orders', value: String(wos.length), hint: `${unassigned.length} unassigned`, tone: unassigned.length ? 'warn' : 'info', href: link('#/servicehands') },
          { label: 'Technicians', value: String(staff.length), hint: `${staff.filter((s) => !s.internal).length} vendor`, tone: 'muted', href: link('#/search/coverage') },
        ],
        zones: [
          { id: 'triage', title: 'To triage', hint: 'Oldest first', rows: triRows, empty: 'Nothing waits for triage.', more: open('#/service') ? { label: 'Dispatch board', href: '#/service' } : undefined },
          { id: 'load', title: 'Engineer load', hint: 'Open work per person: capacity, not a ranking', rows: load, empty: 'No technician is on the roster.' },
        ], basis: 'Computed from the demonstration’s service workspace in this browser; not a live service desk.' };
    }
    case 'syseng': case 'designer': {
      const st = flow(w, i.draft || null, recs); const at = (k: string) => st.find((s) => s.key === k)!;
      const review = mine.filter((p) => p.verb === 'Review').map(fromPriority);
      const findings = recs.filter((r) => r.findings.length).sort((a, b) => b.findings.length - a.findings.length).slice(0, 5).map((r) => ({ id: r.outline.id, title: `${shortName(r.outline)} · ${r.outline.name}`, sub: `${plural(r.findings.length, 'design finding')} · ${r.archetypeName}`, href: link(roomHref(r.outline)), tone: 'warn' as Tone }));
      const inDesign = recs.filter((r) => r.lifecycle === 'PLANNED').slice(0, 6).map((r) => ({ id: r.outline.id, title: `${shortName(r.outline)} · ${r.outline.name}`, sub: `${r.archetypeName} · planned, not yet approved`, href: link(roomHref(r.outline)), tone: 'info' as Tone }));
      const pipeline: Tile[] = (['intake', 'design', 'procurement', 'installation', 'commissioning', 'acceptance'] as const).map((k) => ({ label: at(k).label, value: String(at(k).count), hint: at(k).blocked ? `${at(k).blocked} held` : at(k).help, tone: at(k).blocked ? 'warn' : 'info', href: link(k === 'intake' ? '#/intake' : at(k).href) }));
      const designer = role === 'designer';
      return { ...base, headline: designer ? `${plural(at('design').count, 'room')} on the desk.` : 'Every room from request to baseline.',
        summary: `${plural(at('intake').count, 'request')} on record, ${plural(at('design').count, 'room')} in design, ${at('commissioning').count} in commissioning${at('commissioning').blocked ? ` (${at('commissioning').blocked} held)` : ''}. ${plural(review.length, 'review')} wait${review.length === 1 ? 's' : ''} for ${designer ? 'a designer' : 'an engineer'}.${i.draft ? ` Your draft ${i.draft.code} is part-way.` : ''}`,
        primary: i.draft && open('#/v25/build') ? { label: `Resume ${i.draft.code}`, href: '#/v25/build', why: `${i.draft.name}: a Build a Room draft` } : primaryOf(review, 'Review', designer ? 'Installed, but not as you drew it' : 'An engineer’s decision is needed') || (open('#/builder') ? { label: 'Open Room Builder', href: '#/builder', why: 'Nothing waits for review' } : null),
        strip: stripFor(i, mine, ['matters', 'decide']), tiles: pipeline,
        zones: [
          { id: 'review', title: designer ? 'Waiting for a designer' : 'Waiting for an engineer', hint: String(review.length), rows: review, empty: `Nothing is waiting for ${designer ? 'a designer' : 'an engineer'}.` },
          designer ? { id: 'design', title: 'On the desk', hint: 'Planned, not yet approved', rows: inDesign, empty: 'No room is in design.', more: open('#/builder') ? { label: 'Room Builder', href: '#/builder' } : undefined }
            : { id: 'findings', title: 'Design findings', hint: 'Rooms whose design the engine questions', rows: findings, empty: 'The engine has no finding on any room.' },
        ], basis: 'Counts are read from each room’s lifecycle, baselines and open issues; MODELED, not measured.' };
    }
    case 'cxeng': case 'qa': {
      const board = recs.filter((r) => r.lifecycle === 'COMMISSIONING' || r.lifecycle === 'INSTALLED_UNVERIFIED' || r.baselines.some((b) => b.state === 'PENDING_ACCEPTANCE'));
      const blocked = board.filter((r) => r.nextStep?.blockers.length || r.counts.failed);
      const app = board.reduce((s, r) => s + r.counts.applicable, 0); const ver = board.reduce((s, r) => s + r.counts.verified, 0);
      const pend = recs.filter((r) => r.baselines.some((b) => b.state === 'PENDING_ACCEPTANCE'));
      const rows: Row[] = [...board].sort((a, b) => Number(!!(b.nextStep?.blockers.length || b.counts.failed)) - Number(!!(a.nextStep?.blockers.length || a.counts.failed))).map((r) => ({ id: r.outline.id, title: `${shortName(r.outline)} · ${r.outline.name}`, sub: `${r.counts.verified} of ${r.counts.applicable} tests verified${r.counts.failed ? ` · ${r.counts.failed} failed` : ''}${r.nextStep?.blockers.length ? ` · held: ${r.nextStep.blockers[0]}` : ''}`, href: link(`${roomHref(r.outline)}?tab=tests`), tone: r.counts.failed ? 'bad' : r.nextStep?.blockers.length ? 'warn' : 'info', tag: r.counts.failed || r.nextStep?.blockers.length ? 'Blocked' : undefined }));
      const review = mine.filter((p) => p.verb === 'Review').map(fromPriority);
      const qa = role === 'qa';
      return { ...base, headline: qa ? `${plural(review.length, 'record')} wait${review.length === 1 ? 's' : ''} for review.` : `${plural(board.length, 'room')} wait${board.length === 1 ? 's' : ''} for proof.`,
        summary: `${blocked.length ? `${shortName(blocked[0]!.outline)} is blocked${blocked.length > 1 ? `, with ${blocked.length - 1} more` : ''}. ` : ''}${ver} of ${app} applicable tests on the board are verified by a second person. ${plural(pend.length, 'baseline')} wait${pend.length === 1 ? 's' : ''} for a reviewer.`,
        primary: qa ? primaryOf(review, 'Review', 'You neither recorded nor verified it') : (rows[0]?.href ? { label: `Open ${rows[0].title.split(' · ')[0]}`, href: rows[0].href, why: rows[0].tag === 'Blocked' ? 'Blocked rooms first' : 'The next room on the board' } : null),
        strip: stripFor(i, mine, ['changed', 'matters', 'decide']),
        tiles: qa ? [] : [
          { label: 'Rooms waiting for proof', value: String(board.length), tone: 'info', href: link('#/commissioning') },
          { label: 'Sign-off blocked', value: String(blocked.length), hint: blocked.map((r) => shortName(r.outline)).join(', ') || 'None', tone: blocked.length ? 'bad' : 'ok', href: link('#/commissioning/deficiencies') },
          { label: 'Tests verified', value: app ? String(Math.round((ver / app) * 100)) : '—', unit: app ? '%' : '', hint: `${ver} of ${app} on this board`, tone: 'info' },
          { label: 'Baselines to accept', value: String(pend.length), hint: 'recorded, waiting for a reviewer', tone: pend.length ? 'warn' : 'ok', href: link('#/assurance') },
        ],
        zones: [
          qa ? { id: 'review', title: 'Waiting for your review', hint: 'Evidence you neither recorded nor verified', rows: review, empty: 'Nothing is waiting for review.' }
            : { id: 'board', title: 'Who has each room, and what it waits for', hint: 'Blocked first', rows, empty: 'No room is waiting for proof.', more: open('#/commissioning') ? { label: 'Commissioning', href: '#/commissioning' } : undefined },
        ], basis: 'A test counts as verified only when a second person verified it; the counts are from the synthetic records.' };
    }
    case 'ipm': case 'bpm': {
      const bpm = role === 'bpm';
      const charter = P.projects.map((p) => { const q = P.requests.find((x) => x.id === p.requestId); const f = P.funding.find((x) => x.projectId === p.id); const last = [...P.decisions].filter((d) => d.projectId === p.id).sort((a, b) => b.at.localeCompare(a.at))[0];
        return { id: p.id, title: bpm ? (q?.title || p.id) : `${p.id} · ${p.delivery.toLowerCase().replace(/_/g, ' ')}`, sub: bpm ? `${p.id} · ${p.governance.toLowerCase()}${f ? ` · $${Math.round(f.amount / 1000)}k authorised` : ' · not yet funded'}${last ? ` · last decision ${last.decision.toLowerCase()} at scope ${last.scopeRev}` : ''}` : `${p.roomIds.map((r) => roomName(r)).join(', ')} · ${p.history.length ? `${p.history[p.history.length - 1]!.to.toLowerCase().replace(/_/g, ' ')} since ${p.history[p.history.length - 1]!.at.slice(0, 10)}` : 'no movement on record'}`, href: link('#/projects'), tone: (p.governance === 'FUNDED' ? 'ok' : 'warn') as Tone, tag: p.governance === 'FUNDED' ? 'Funded' : 'Approved' }; });
      const st = flow(w, null, recs); const field = st.filter((s) => s.key === 'installation' || s.key === 'commissioning' || s.key === 'acceptance');
      const decide = mine.filter((p) => p.verb === 'Review').map(fromPriority);
      const recent = P.projects.flatMap((p) => p.history.map((h) => ({ p, h }))).filter((x) => now - Date.parse(x.h.at) <= 30 * DAY).sort((a, b) => b.h.at.localeCompare(a.h.at)).map((x, n) => ({ id: `${x.p.id}-${n}`, title: `${x.p.id} moved to ${x.h.to.toLowerCase().replace(/_/g, ' ')}`, sub: x.h.at.slice(0, 10), href: link('#/projects'), tone: 'info' as Tone }));
      return { ...base, headline: `${plural(P.projects.length, 'project')} ${bpm ? 'carry a business need you own' : 'in flight'}.`,
        summary: bpm ? `${P.funding.length} of ${P.projects.length} funded. ${decide.length ? `${plural(decide.length, 'decision')} wait${decide.length === 1 ? 's' : ''} for you.` : 'No decision is waiting.'}` : `${field.map((s) => `${plural(s.count, 'room')} in ${s.label.toLowerCase()}${s.blocked ? ` (${s.blocked} held)` : ''}`).join(', ')}.`,
        primary: bpm ? (primaryOf(decide, 'Decide', 'Waiting for your decision') || (open('#/projects') ? { label: 'Open the portfolio', href: '#/projects', why: 'No decision is waiting' } : null)) : (open('#/projects') ? { label: 'Open the projects', href: '#/projects', why: 'Governance, delivery and funding' } : null),
        strip: stripFor(i, mine, bpm ? ['matters', 'decide'] : ['changed', 'matters']), tiles: bpm ? [] : field.map((s) => ({ label: s.label, value: String(s.count), hint: s.blocked ? `${s.blocked} held` : s.help, tone: (s.blocked ? 'warn' : 'info') as Tone, href: link(s.href) })),
        zones: [
          { id: 'projects', title: bpm ? 'Project charters' : 'Projects', hint: bpm ? 'The need, the sponsor’s decision, the money' : 'Delivery state and last movement', rows: charter, empty: 'No project is on record.', more: open('#/projects') ? { label: 'Portfolio', href: '#/projects' } : undefined },
          bpm ? { id: 'decide', title: 'Waiting for your decision', rows: decide, empty: 'No decision is waiting for you.' } : { id: 'recent', title: 'The last thirty days', hint: 'Movements on record', rows: recent, empty: 'No project moved in the last thirty days.' },
        ], basis: 'Projects, decisions and funding are synthetic records; no figure is a quote.' };
    }
    case 'steward': {
      const pos = recs.flatMap((r) => r.positions.filter((p) => !p.furniture)); const n = (s: string) => pos.filter((p) => p.identity === s).length;
      const gaps = recs.map((r) => ({ r, g: r.coverage.filter((c) => c.state === 'gap') })).filter((x) => x.g.length).sort((a, b) => b.g.length - a.g.length);
      const lessons = (w?.learnCases || []).filter((c) => c.state === 'SME_REVIEWED');
      const denied = (w?.events || []).filter((e) => e.outcome === 'DENIED').slice(-4).reverse();
      return { ...base, headline: `${n('VERIFIED')} of ${pos.length} device positions are verified.`,
        summary: `${n('OBSERVED')} observed, ${n('DECLARED')} declared and ${n('UNKNOWN')} unknown. ${plural(gaps.length, 'room')} ${gaps.length === 1 ? 'has' : 'have'} a gap in ${gaps.length === 1 ? 'its' : 'their'} record. ${plural(lessons.length, 'lesson')} wait${lessons.length === 1 ? 's' : ''} for a steward’s approval.`,
        primary: open('#/search/quality') ? { label: 'Open record quality', href: '#/search/quality', why: 'What is missing or unverified, by record' } : null,
        strip: stripFor(i, mine, ['changed', 'decide']),
        tiles: [
          { label: 'Verified', value: String(n('VERIFIED')), unit: ` of ${pos.length}`, hint: 'identity confirmed by a second source', tone: 'ok', href: link('#/search/quality') },
          { label: 'Observed', value: String(n('OBSERVED')), hint: 'seen, not yet verified', tone: 'info' },
          { label: 'Declared', value: String(n('DECLARED')), hint: 'stated by a person, not seen', tone: 'warn' },
          { label: 'Unknown', value: String(n('UNKNOWN')), hint: 'nothing recorded', tone: n('UNKNOWN') ? 'bad' : 'ok' },
        ],
        zones: [
          { id: 'gaps', title: 'Rooms with a gap in the record', hint: 'Most gaps first', rows: gaps.slice(0, 6).map(({ r, g }) => ({ id: r.outline.id, title: `${shortName(r.outline)} · ${r.outline.name}`, sub: `${plural(g.length, 'gap')}: ${g.map((x) => x.area).join(', ')}`, href: link(roomHref(r.outline)), tone: 'warn' as Tone })), empty: 'No room has a gap in its record.' },
          { id: 'refused', title: 'Changes that were refused', hint: 'The ledger keeps refusals too', rows: denied.map((e, k) => ({ id: `den-${k}`, title: `${e.type.replace(/_/g, ' ')} · ${e.aggregate}`, sub: `${e.detail} · ${who(e.by)}`, tone: 'bad' as Tone })), empty: 'No change was refused.', more: open('#/ledger') ? { label: 'The ledger', href: '#/ledger' } : undefined },
        ], basis: 'Identity states are DECLARED, OBSERVED or VERIFIED as recorded; nothing here was measured by this page.' };
    }
    default: {   // ops, architect: Mission Control itself; this model gives them the jump list and the strip
      const q = attentionQueue(w); const top = q[0];
      return { ...base, headline: 'Mission Control', summary: top ? `${shortName(top.r.outline)} comes first (${roomHealth(top.r, w).why}).` : 'No room needs attention.',
        primary: top && open(roomHref(top.r.outline)) ? { label: `Open ${shortName(top.r.outline)}`, href: roomHref(top.r.outline), why: 'The room that needs attention first' } : null,
        strip: stripFor(i, mine, ['changed', 'matters', 'decide']), tiles: [], zones: [], basis: 'MODELED from the records; not live monitoring.' };
    }
  }
}

/**
 * The work each role holds, added to its home (founder, 14 Nov 2026: "make the mission control of every role much much better … center
 * it around the work needing to be done"):
 *   - service manager and executive: the vendors that fall short of their agreements (the synthetic service history's scorecard, last six
 *     months), each opening its own drill on Service analytics;
 *   - installer and commissioning engineer: the rooms whose device register is not complete (phase 1 cannot start), with the count and
 *     the install photographs, each opening the room's registers.
 * Offered only where the role may open the page it leads to (D44). Rows are records; the history is labelled synthetic where it is used.
 */
export function startFor(i: Inputs): Start {
  const s = startCore(i); const open = (href: string) => i.opens(href.split('?')[0]!);
  const recs = i.recs || allRecords();
  if ((i.role === 'svcmgr' || i.role === 'exec') && open('#/v25/service/analytics')) {
    const card = vendorScorecard(syntheticHistory(), months(6)); const short = card.filter((v) => v.flags.length);
    s.zones = [...s.zones, { id: 'vendors', title: 'Vendors against their agreements', hint: `${short.length} need attention · last six months, synthetic service history`,
      rows: card.map((v) => ({ id: v.vendor, title: v.name, sub: v.flags.length ? v.flags[0]! : `within targets · restore within SLA ${v.s.restoreSla ?? '—'}% · ${v.jobs} jobs`, tone: v.flags.length ? 'warn' as const : 'ok' as const, tag: v.flags.length ? `${v.flags.length}` : undefined, href: `#/v25/service/analytics?m=6&v=${encodeURIComponent(v.vendor)}` })),
      empty: 'No vendor has service on record.', more: { label: 'Service analytics', href: '#/v25/service/analytics' } }];
    s.tiles = [...s.tiles, { label: 'Vendors needing attention', value: String(short.length), unit: ` of ${card.length}`, hint: 'below the SLA targets, or worsening (synthetic history)', tone: short.length ? 'warn' : 'ok', href: '#/v25/service/analytics?m=6' }];
  }
  if ((i.role === 'installer' || i.role === 'cxeng') && open('#/commissioning/room/x')) {
    const rooms = recs.filter((r) => ['INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED', 'COMMISSIONING'].includes(r.lifecycle));
    const rows = rooms.map((r) => { const st = readRegister(r.outline.id); const reg = registerStats(deviceRegister(r, st.entries)); const photos = (st.photos.before ? 1 : 0) + (st.photos.after ? 1 : 0);
      return { r, reg, row: { id: r.outline.id, title: `${shortName(r.outline)} · ${r.outline.name}`, sub: `${reg.done} of ${reg.total} devices registered · ${photos} of 2 install photographs`, tone: reg.done < reg.total ? 'warn' as const : 'ok' as const, tag: `${reg.pct}%`, href: `#/commissioning/room/${r.outline.id}` } }; })
      .sort((a, b) => a.reg.pct - b.reg.pct);
    const todo = rows.filter((x) => x.reg.done < x.reg.total).length;
    s.zones = [...s.zones, { id: 'register', title: i.role === 'installer' ? 'Devices to register' : 'Registers before phase 1', hint: `${todo} room${todo === 1 ? '' : 's'} not complete · every device’s serial; hostname and address when networked`, rows: rows.map((x) => x.row), empty: 'No room is being installed or commissioned.' }];
  }
  return s;
}
