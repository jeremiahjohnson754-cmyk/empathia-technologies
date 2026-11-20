/**
 * The tenant-owned part of the Technical Knowledge Ledger, all of it SYNTHETIC: zone 3 (private to one customer), zone 4 (a customer's
 * contribution released with consent, anonymised and reviewed) and zone 5 (observations and AI-generated candidates awaiting review).
 * Two fictional customers: Northstar (`corporate_demo`, the demonstration estate, whose rooms and jobs are the demo's own records) and
 * Brindlewick Works (`brindlewick_demo`), which exists so that the page and the tests can show one customer's reader receiving none
 * of the other's private knowledge. The approvals, reviewers and consent records here are part of that fiction and say so.
 */
import type { ContentType, SourceAuthority, SourceRef } from './contract.js';
import type { RoleKey } from '../registry.types.js';
import { worked, workedLine, type Worked } from './calc.js';
import { DISPLAY_QUESTION } from './seed.universal.js';
import { HOME_TENANT, OTHER_TENANT, TECHNICAL, NETWORK, type LedgerObject } from './types.js';

interface T { id: string; tenant: string; title: string; domain: string; type: ContentType; topic?: string; goal: string; body: string[]; steps?: string[]; worked?: Worked[]; readers?: readonly RoleKey[]; audience?: LedgerObject['audience']; authority: SourceAuthority; doc: string; version: string; reviewer: string; reviewedOn: string; reviewBy: string; state?: LedgerObject['state']; supersedes?: string; related?: string[]; standards?: string[]; tags?: string[] }
const own = (tenant: string, doc: string, version: string, authority: SourceAuthority): SourceRef => ({ system: `tenant:${tenant}/${doc}`, title: doc, version, authority, rights: 'tenant-owned', derivation: 'APPROVED' });
const t = (x: T): LedgerObject => ({
  id: x.id, title: x.title, topic: x.topic || x.title, domain: x.domain, contentType: x.type, difficulty: 'practitioner', audience: x.audience || (x.readers ? 'Technicians' : 'Everyone'), roles: x.readers || [],
  objectives: [x.goal], zone: 3, tenant: x.tenant, acl: { roles: x.readers || [], groups: [] }, sources: [own(x.tenant, x.doc, x.version, x.authority)],
  state: x.state || 'APPROVED', reviewer: x.reviewer, reviewedOn: x.reviewedOn, reviewBy: x.reviewBy, body: x.body,
  ...(x.steps ? { steps: x.steps } : {}), ...(x.worked ? { worked: x.worked, calculations: x.worked.map(workedLine) } : {}), ...(x.supersedes ? { supersedes: x.supersedes } : {}),
  ...(x.related ? { related: x.related } : {}), ...(x.standards ? { relatedStandards: x.standards } : {}), tags: x.tags || [],
});
const NS_BOARD = 'AV Standards Board, Northstar (synthetic record)'; const NS_SVC = 'Service Manager, Northstar (synthetic record)';
const BW_GROUP = 'Studio Standards Group, Brindlewick Works (synthetic record)';
const SUPPORT: readonly RoleKey[] = ['service', 'svcmgr', 'syseng', 'installer', 'cxeng', 'ops', 'steward', 'architect'];

export const ZONE3: readonly LedgerObject[] = [
  // ---- Northstar (corporate_demo)
  t({ id: 'cd.std.display.v2', tenant: HOME_TENANT, title: 'Northstar room standard RS-02, issue 2: main display size', domain: 'Customer standards', type: 'standard', topic: DISPLAY_QUESTION, goal: 'Apply Northstar’s planning rule for the main display of a meeting room.',
    authority: 4, doc: 'Room standard RS-02', version: 'issue 2', reviewer: NS_BOARD, reviewedOn: '2026-06-15', reviewBy: '2027-06-15', supersedes: 'cd.std.display.v1',
    body: ['In Northstar meeting rooms the main display is sized so that the farthest seat is no more than six times the image height away where the room is used for documents and spreadsheets, and no more than eight times where it is used only for presentations and video.',
      'Boardrooms use the six-times rule without exception. Where one display cannot meet it, the room is given a second display or repeater screens, not a waiver.',
      'This is Northstar’s planning rule. A design of record is still confirmed against the image size standard.'],
    worked: [worked('heightFromDistance', 'Smallest image height for a boardroom whose farthest seat is 6.3 m away', 'image height = farthest distance ÷ factor', { d: 6.3, factor: 6 }, { d: 'm — distance to the farthest seat', factor: 'ratio — Northstar’s rule for document rooms' }, 'm', 2)],
    related: ['R-ATL-4-218', 'cat:display', 'k2.disp.sizing', 'k2.disp.diagonal'], standards: ['z1.avixa-v202-01'], tags: ['display', 'room standard'] }),
  t({ id: 'cd.std.display.v1', tenant: HOME_TENANT, title: 'Northstar room standard RS-02, issue 1 (withdrawn): main display size', domain: 'Customer standards', type: 'standard', topic: DISPLAY_QUESTION, goal: 'Know what the withdrawn issue said and why it was replaced.',
    authority: 4, doc: 'Room standard RS-02', version: 'issue 1', reviewer: NS_BOARD, reviewedOn: '2024-03-01', reviewBy: '2025-03-01', state: 'SUPERSEDED',
    body: ['Issue 1 allowed the farthest seat to be eight times the image height away in every room.', 'It was withdrawn when people in the far seats of boardrooms could not read financial tables. Issue 2 replaces it.'], related: ['cat:display'], tags: ['display', 'withdrawn'] }),
  t({ id: 'cd.std.network', tenant: HOME_TENANT, title: 'Northstar AV network standard NS-01: VLANs, multicast and marking', domain: 'Customer standards', type: 'standard', goal: 'Configure and check a Northstar switch that carries AV.',
    authority: 4, doc: 'AV network standard NS-01', version: 'issue 3', reviewer: NS_BOARD, reviewedOn: '2026-08-01', reviewBy: '2027-08-01', readers: NETWORK, audience: 'Network and IT',
    body: ['AV devices are on dedicated VLANs for each building. UC room computes are on their own VLAN, with access to the meeting service only.',
      'IGMP snooping is on at every switch that carries an AV VLAN, and the building’s distribution switch is the querier.',
      'Clock traffic has the highest-priority queue and media the next. Switches trust markings on AV ports only.',
      'Energy-efficient Ethernet is off on ports carrying networked audio.',
      'After a switch is replaced, its configuration is compared with this standard before its rooms are returned to service. This line was added after ISS-0402.'],
    related: ['ISS-0402', 'cat:switch', 'k2.net.vlan', 'k2.net.igmp', 'k2.net.qos'], tags: ['network standard', 'vlan', 'igmp'] }),
  t({ id: 'cd.inc.iss-0417', tenant: HOME_TENANT, title: 'Incident review: far-end audio drops in Atlas 4.218 (ISS-0417, after ISS-0380)', domain: 'Incidents', type: 'case-study', goal: 'Know what is established about the recurring audio fault in the boardroom, and what is not.',
    authority: 7, doc: 'Incident review ISS-0417', version: 'draft 2', reviewer: NS_SVC, reviewedOn: '2026-10-30', reviewBy: '2026-11-20', readers: TECHNICAL,
    body: ['Remote participants hear echo and then lose the room for a few seconds, mostly in calls longer than 40 minutes with more than six microphones open. An earlier echo report in the same room, ISS-0380, was closed after the audio processor was re-tuned.',
      'What is established: the fault has come back, and it goes with long calls and many open microphones. What is not established: the cause. No measurement has yet separated the echo canceller from the automatic mixer or from the room.',
      'Until it is diagnosed, board meetings in this room are given the fifteen-minute check, and Atlas 4.220 is held as a fallback.'],
    related: ['R-ATL-4-218', 'ISS-0417', 'ISS-0380', 'symptom:echo', 'symptom:room-cant-hear', 'cat:dsp', 'cat:micceil', 'k2.aec.failure', 'k2.gain.nom'], tags: ['echo', 'recurrence', 'boardroom'] }),
  t({ id: 'cd.inc.iss-0402', tenant: HOME_TENANT, title: 'Incident review: calls dropped on the annex switch (ISS-0402)', domain: 'Incidents', type: 'case-study', goal: 'Know what happened on the annex switch and what changed afterwards.',
    authority: 7, doc: 'Incident review ISS-0402', version: 'final', reviewer: NS_SVC, reviewedOn: '2026-10-22', reviewBy: '2027-04-22', readers: TECHNICAL,
    body: ['Three rooms on the same access switch reported dropped calls on the same afternoon. Service was restored and verified.',
      'The review found no record of the switch’s configuration having been compared with the network standard after it was last replaced. The standard now requires that comparison before rooms are returned to service.'],
    related: ['R-NST-2-101', 'ISS-0402', 'symptom:join', 'cat:switch', 'k2.net.igmp-failure', 'cd.std.network'], tags: ['network', 'switch', 'dropped calls'] }),
  t({ id: 'cd.inc.iss-0398', tenant: HOME_TENANT, title: 'Incident review: projector blank at the start of class in Atlas 4.231 (ISS-0398)', domain: 'Incidents', type: 'case-study', goal: 'Know why the training room’s projector was blank and what the review asked for.',
    authority: 7, doc: 'Incident review ISS-0398', version: 'final', reviewer: NS_SVC, reviewedOn: '2026-03-30', reviewBy: '2026-09-30', readers: TECHNICAL,
    body: ['The display was blank although the source was selected on the panel. The input mapping had drifted from the commissioned configuration; it was restored and verified.',
      'Nothing recorded who changed the mapping or when. The review asked for every change to a room in service to be raised as a change.'],
    related: ['R-ATL-4-231', 'ISS-0398', 'symptom:blank', 'cat:projector', 'cat:control', 'k2.chg.procedure', 'k2.disp.blank-tree'], tags: ['projector', 'configuration drift'] }),
  t({ id: 'cd.proc.board-day', tenant: HOME_TENANT, title: 'Northstar procedure: the fifteen-minute check before a board meeting in Atlas 4.218', domain: 'Procedures', type: 'procedure', goal: 'Prove the boardroom works before the board sits down.',
    authority: 6, doc: 'Service procedure SP-07', version: 'issue 1', reviewer: NS_SVC, reviewedOn: '2026-09-01', reviewBy: '2027-03-01',
    body: ['Done from the room by the person supporting the meeting. It uses the room exactly as the board will.'],
    steps: ['Thirty minutes before, confirm the meeting is on the room’s panel.', 'Place a test call from the panel to the service desk and ask them what they hear and see.',
      'Speak from the chair’s seat and from the farthest seat. The far end confirms both are clear.', 'Share a page of figures from the room’s own input and read it from the farthest seat.',
      'Check that the camera’s wide view shows every chair.', 'If anything fails, tell the meeting’s organiser at once, offer Atlas 4.220 as the fallback, and report it from the room’s page.'],
    related: ['R-ATL-4-218', 'R-ATL-4-220', 'cat:camera', 'cat:display', 'k2.cam.framing'], tags: ['board meeting', 'pre-flight'] }),
  t({ id: 'cd.contacts.atlas', tenant: HOME_TENANT, title: 'Northstar contacts: who supports the rooms in the Atlas building', domain: 'Contacts', type: 'reference-card', goal: 'Reach the right team for a room in Atlas.',
    authority: 6, doc: 'Support directory, Atlas', version: '2026-10', reviewer: NS_SVC, reviewedOn: '2026-10-05', reviewBy: '2027-01-05', readers: SUPPORT,
    body: ['Service desk, the first call: internal extension 4100, staffed 07:00 to 19:00 on working days.', 'Duty technician for Atlas: reached through the service desk; on site 08:00 to 17:00.',
      'AV engineering, for escalation: the Systems Engineer on call, reached through the service desk only.', 'Support for a board meeting is booked two working days ahead through the Service Manager.',
      'People’s names and personal numbers are not kept in this record.'], related: ['R-ATL-4-218'], tags: ['contacts', 'support'] }),
  // ---- Brindlewick Works (brindlewick_demo): the second, fictional customer
  t({ id: 'bw.std.display', tenant: OTHER_TENANT, title: 'Brindlewick studio standard D-4: main display size', domain: 'Customer standards', type: 'standard', topic: DISPLAY_QUESTION, goal: 'Apply Brindlewick’s planning rule for the main display of a review studio.',
    authority: 4, doc: 'Studio standard D-4', version: 'issue 5', reviewer: BW_GROUP, reviewedOn: '2026-05-20', reviewBy: '2027-05-20',
    body: ['In Brindlewick review studios the farthest seat is no more than five times the image height from the main display, because drawings are read at full detail.', 'This is Brindlewick’s planning rule. A design of record is confirmed against the image size standard.'],
    related: ['cat:display', 'k2.disp.sizing'], standards: ['z1.avixa-v202-01'], tags: ['display', 'studio standard'] }),
  t({ id: 'bw.inc.kiln-room', tenant: OTHER_TENANT, title: 'Brindlewick incident review: echo on supplier calls in the Kiln Room', domain: 'Incidents', type: 'case-study', goal: 'Know what caused the echo in the Kiln Room and how it was closed.',
    authority: 7, doc: 'Incident review KR-22', version: 'final', reviewer: BW_GROUP, reviewedOn: '2026-07-11', reviewBy: '2027-01-11', readers: TECHNICAL,
    body: ['Suppliers heard themselves on calls with the Kiln Room after glass partitions were fitted along one wall.', 'Acoustic treatment was added opposite the glass, and the room was commissioned again and verified on a test call.'],
    related: ['symptom:echo', 'cat:dsp', 'k2.aec.failure'], tags: ['echo', 'glass'] }),
  t({ id: 'bw.proc.launch-day', tenant: OTHER_TENANT, title: 'Brindlewick procedure: launch-day check for the Long Gallery', domain: 'Procedures', type: 'procedure', goal: 'Prove the Long Gallery works before a launch.',
    authority: 6, doc: 'Studio procedure LG-3', version: 'issue 2', reviewer: BW_GROUP, reviewedOn: '2026-08-19', reviewBy: '2027-02-19',
    body: ['Done from the gallery floor an hour before doors.'], steps: ['Play the launch film from the gallery’s own source and listen from the back row.', 'Check the lectern microphone from the lectern and the hand-held from the floor.', 'Confirm the stream’s picture and sound with the person watching it remotely.'],
    related: ['cat:projector', 'cat:micwireless'], tags: ['launch', 'pre-flight'] }),
  t({ id: 'bw.contacts.rota', tenant: OTHER_TENANT, title: 'Brindlewick contacts: studio AV support rota', domain: 'Contacts', type: 'reference-card', goal: 'Reach the studio support team.',
    authority: 6, doc: 'Studio support rota', version: '2026-10', reviewer: BW_GROUP, reviewedOn: '2026-10-01', reviewBy: '2027-01-01', readers: SUPPORT,
    body: ['Studio support bench: internal extension 2210, 08:00 to 18:00.', 'Out of hours: the duty producer decides whether to call anyone in.'], tags: ['contacts'] }),
];

// ---------------------------------------------------------------------------------------------- zone 4: shared with consent
const shared = (x: { id: string; tenant: string; title: string; domain: string; goal: string; body: string[]; by: string; on: string; anonymised: string; related: string[]; tags: string[] }): LedgerObject => ({
  id: x.id, title: x.title, topic: x.title, domain: x.domain, contentType: 'case-study', difficulty: 'practitioner', audience: 'Technicians', roles: TECHNICAL, objectives: [x.goal], zone: 4, tenant: x.tenant, acl: { roles: [], groups: [] },
  sources: [{ system: 'shared-with-consent', title: 'A customer’s contribution, anonymised', version: null, authority: 7, rights: 'tenant-shared-with-consent', derivation: 'APPROVED' }],
  state: 'APPROVED', reviewer: 'Knowledge reviewer (synthetic record)', reviewedOn: x.on, reviewBy: `${Number(x.on.slice(0, 4)) + 1}${x.on.slice(4)}`, body: x.body, related: x.related, tags: x.tags, consent: { by: x.by, on: x.on, anonymised: x.anonymised },
});
export const ZONE4: readonly LedgerObject[] = [
  shared({ id: 'sh.furniture-echo', tenant: HOME_TENANT, title: 'Shared lesson: echo came back after a furniture change', domain: 'Echo cancellation', goal: 'Treat a furniture change as a change to the room’s audio.', by: 'Data steward of the contributing customer (synthetic record)', on: '2026-09-12',
    anonymised: 'The customer, the building, the room, the dates, the job numbers and every person were removed. Equipment is described by category only.',
    body: ['A boardroom that had been free of echo for a year began returning echo to remote participants. Nothing in the equipment had been changed. The table had been replaced with a longer one, and two ceiling microphones were now above its glass end.',
      'The echo canceller’s settings were right for the old layout. Commissioning the microphone coverage again and verifying echo cancellation on a test call resolved it.',
      'The lesson: a furniture change is a change to the room’s audio system. The room’s record should say so, and the people who move furniture should know to tell the AV team.'], related: ['symptom:echo', 'cat:micceil', 'k2.aec.failure', 'k2.chg.procedure'], tags: ['echo', 'furniture', 'lesson'] }),
  shared({ id: 'sh.lapsed-licence', tenant: OTHER_TENANT, title: 'Shared lesson: a lapsed room licence that looked like a hardware fault', domain: 'UC compute', goal: 'Check the room’s account before its hardware.', by: 'Operations lead of the contributing customer (synthetic record)', on: '2026-08-03',
    anonymised: 'The customer, the site, the room, the dates and every person were removed. No product or service is named.',
    body: ['A room stopped joining meetings. Its compute was replaced, and the new one did the same. The room’s account had lost its licence when a subscription was renewed without it.',
      'The lesson: a room’s account, licence and calendar are checked before its hardware. A failure that survives a hardware swap was never in the hardware.'], related: ['symptom:join', 'cat:compute', 'k2.uc.join-failure'], tags: ['licence', 'join', 'lesson'] }),
];

// ---------------------------------------------------------------------------------------------- zone 5: unverified
const cand = (x: { id: string; tenant: string; title: string; domain: string; topic?: string; body: string[]; ai: boolean; confidence: number; related: string[]; tags: string[] }): LedgerObject => ({
  id: x.id, title: x.title, topic: x.topic || x.title, domain: x.domain, contentType: 'case-study', difficulty: 'practitioner', audience: 'Technicians', roles: TECHNICAL, objectives: ['Awaiting review: this is a candidate, not knowledge.'], zone: 5, tenant: x.tenant, acl: { roles: [], groups: [] },
  sources: [x.ai ? { system: 'candidate-generator (simulated: no model runs in this demonstration)', title: 'AI-generated candidate, unreviewed', version: null, authority: 10, rights: 'tenant-owned', derivation: 'INFERRED', confidence: x.confidence }
    : { system: 'field-note', title: 'A technician’s observation, unreviewed', version: null, authority: 9, rights: 'tenant-owned', derivation: 'OBSERVED', confidence: x.confidence }],
  state: 'DRAFT', reviewer: null, reviewedOn: null, reviewBy: null, body: x.body, related: x.related, tags: [...x.tags, x.ai ? 'ai-generated' : 'observation'],
});
export const ZONE5: readonly LedgerObject[] = [
  cand({ id: 'cd.cand.obs-air', tenant: HOME_TENANT, ai: false, confidence: 0.6, title: 'Observation from the field: the ceiling microphone nearest the door in Atlas 4.218 picks up air noise in the afternoon', domain: 'Microphones',
    body: ['Noted by the duty technician on two afternoons: a steady rushing sound at the far end when the microphone nearest the door is open.', 'It was heard, not measured. It has not been linked to ISS-0417.'], related: ['R-ATL-4-218', 'ISS-0417', 'cat:micceil', 'cat:hvac'], tags: ['noise'] }),
  cand({ id: 'cd.cand.ai-cause', tenant: HOME_TENANT, ai: true, confidence: 0.35, title: 'AI-generated candidate: a possible cause of the far-end audio drops in Atlas 4.218', domain: 'Echo cancellation',
    body: ['Candidate, not a finding. The pattern in ISS-0417, long calls with more than six microphones open, would fit the automatic mixer’s limit on open microphones, or the echo canceller adapting again.', 'No measurement supports either. A reviewer decides whether it is worth testing.'], related: ['R-ATL-4-218', 'ISS-0417', 'cat:dsp', 'k2.gain.nom'], tags: ['hypothesis'] }),
  cand({ id: 'cd.cand.ai-display', tenant: HOME_TENANT, ai: true, confidence: 0.3, title: 'AI-generated candidate: a proposed display rule for Northstar huddle rooms', domain: 'Customer standards', topic: DISPLAY_QUESTION,
    body: ['Candidate, not a standard. It proposes that in huddle rooms the farthest seat be no more than four times the image height from the display.', 'It has no source and no review.'], related: ['cat:display'], tags: ['display'] }),
  cand({ id: 'bw.cand.obs-cast', tenant: OTHER_TENANT, ai: false, confidence: 0.5, title: 'Observation (Brindlewick): the Long Gallery projector shows a colour cast after warming up', domain: 'Displays',
    body: ['Seen by the studio bench on three mornings. Not measured.'], related: ['cat:projector'], tags: ['projector'] }),
];
