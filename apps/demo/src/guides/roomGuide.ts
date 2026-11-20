/**
 * "How do I use this room?" — the End User Success & Training Guide's room chapter, generated for every room from that room's own
 * record (founder's directive of 11 Nov 2026, §08, Product B):
 *   "A user entering a specific room should be able to open: 'How do I use this room?' The guide must retrieve the correct authorized
 *    room configuration. It should show: what equipment is installed; what the room supports; how to start a meeting; how to share
 *    content; how to use the microphone and camera; how to adjust appropriate controls; how to end the session; how to get help; who
 *    the local Site Champion is; where to find relevant approved documentation. Do not present control instructions for devices that
 *    are not in that room."
 *
 * So nothing here is typed per room. The room's panel (control/model.ts: what its equipment can route, show, hear and frame) decides
 * which sections exist and what each step says: a room with no camera has no camera section; a room with no touch panel is told how
 * it is operated instead; a room that cannot join a meeting is not told to start one. Every step names the kind of equipment it uses
 * (`uses`), so a test can prove no step mentions something the room lacks, and the page can ring it on the room's plan.
 * Wording is vendor-neutral and safe: nobody is asked to open a cabinet, unplug room equipment or change a setting an engineer set.
 * Status: DRAFT. An organisation's own edition replaces the generic wording with its approved instructions (a tenant's knowledge).
 */
import type { RoomRecord } from '../campus/design.js';
import { buildingByKey, shortName } from '../campus/canon.js';
import { panelOf, type Panel } from '../control/model.js';
import { kindsOf, plainEquipment, stageWord } from '../here/model.js';

export type SectionId = 'start' | 'share' | 'sound' | 'camera' | 'controls' | 'end' | 'help';
export interface GuideStep { do: string; why?: string; /** equipment categories this step touches; empty when it touches none */ uses: string[] }
export interface GuideSection { id: SectionId; title: string; lead: string; steps: GuideStep[] }
export interface RoomGuide {
  id: string; roomId: string; title: string; revision: string; status: 'DRAFT'; audience: string;
  /** one sentence a visitor reads at the door */ summary: string; equipment: string;
  supports: Array<{ what: string; yes: boolean; because: string }>;
  sections: GuideSection[]; lacks: string[]; /** how the room is operated */ operatedBy: 'touch panel' | 'room system' | 'the display’s own controls' | 'nothing to operate';
  objectives: string[]; sources: string[]; notReady: string | null;
}

const SCREEN_WORD: Record<string, string> = { display: 'screen', projector: 'projector', ledwall: 'video wall' };
const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? `the ${one}` : `the ${n === 2 ? 'two' : n === 3 ? 'three' : n} ${many}`);

export function operatedBy(p: Panel): RoomGuide['operatedBy'] { return p.touch ? 'touch panel' : p.compute || p.sources.some((s) => s.id === 'meeting') ? 'room system' : p.displays.length ? 'the display’s own controls' : 'nothing to operate'; }

/** The guide for one room. Pure: the same record always gives the same guide. */
export function roomGuide(r: RoomRecord): RoomGuide {
  const o = r.outline; const p = panelOf(r); const b = buildingByKey(o.building); const hw = r.positions.filter((x) => !x.furniture); const cats = new Set(hw.map((x) => x.cat));
  const meet = p.sources.some((s) => s.id === 'meeting'); const share = p.sources.some((s) => s.id === 'share'); const laptop = p.sources.some((s) => s.id === 'laptop'); const by = operatedBy(p);
  const screens = p.displays.length ? plural(p.displays.length, SCREEN_WORD[p.displays[0]!.cat] || 'screen') : ''; const tableMics = cats.has('mictable'); const ceilMics = cats.has('micceil'); const handMics = cats.has('micwireless'); const bar = cats.has('bar');
  const touch = p.touch ? ['touch'] : []; const sys = p.compute ? ['compute'] : bar ? ['bar'] : [];
  const at = by === 'touch panel' ? 'On the touch panel' : by === 'room system' ? 'On the room’s screen' : 'On the screen’s own remote or buttons';
  const stage = stageWord(r.lifecycle);
  const supports: RoomGuide['supports'] = [
    { what: 'A video meeting with people elsewhere', yes: meet && p.hears && p.cameras.length > 0, because: meet ? (p.hears && p.cameras.length ? 'It has a room system, a camera and microphones.' : !p.cameras.length ? 'It has a room system but no camera: people elsewhere will hear the room and not see it.' : 'It has no microphones of its own.') : 'It has no room system. Join from your own laptop.' },
    { what: 'Showing your laptop on the room’s screen', yes: laptop, because: laptop ? (share ? 'By cable or without one.' : 'By cable.') : 'It has no screen.' },
    { what: 'Being heard at the back of the room', yes: p.speakers.length > 0 && (ceilMics || tableMics || handMics), because: p.speakers.length && (ceilMics || tableMics || handMics) ? 'It has microphones and loudspeakers; whether your voice is lifted in the room depends on how it was set up.' : 'It is a room for talking at normal volume.' },
    { what: `Seating ${o.capacity}`, yes: true, because: `${o.name}.` },
  ];
  const sections: GuideSection[] = [];
  // ---- start
  if (meet) sections.push({ id: 'start', title: 'Start a meeting', lead: by === 'touch panel' ? 'The room joins the meeting itself. You do not need your laptop for sound or picture.' : 'The room joins the meeting itself.', steps: [
    { do: `${at}, look for your meeting. If the room was invited, it is listed with a Join button.`, why: 'Inviting the room when you book is what puts the meeting there.', uses: [...touch, ...sys] },
    { do: 'Press Join. Wait for the far end to appear before you start speaking.', uses: [...touch, ...sys] },
    { do: 'If your meeting is not listed, choose to join with a meeting number or code, and type the one in your invitation.', uses: [...touch, ...sys] },
    ...(p.displays.length ? [{ do: `Check ${screens}: you should see the people elsewhere${p.cameras.length ? ', and a small picture of this room' : ''}.`, uses: [p.displays[0]!.cat] }] : []),
  ] });
  else if (p.displays.length) sections.push({ id: 'start', title: 'Start a meeting', lead: 'This room does not join meetings by itself. Join from your own laptop, and use the room’s screen to see everyone.', steps: [
    { do: 'Join the meeting on your laptop as you would at your desk.', uses: [] },
    { do: `Show your laptop on ${screens} (see “Share your screen”).`, uses: [p.displays[0]!.cat] },
    { do: 'Use your laptop’s own microphone and camera, and sit where it can see and hear the people with you.', why: 'The room has nothing that sends its sound or picture to the meeting.', uses: [] },
  ] });
  // ---- share
  if (laptop) sections.push({ id: 'share', title: 'Share your screen', lead: share ? 'Two ways: without a cable, or with the cable at the table.' : 'Use the cable at the table.', steps: [
    ...(share ? [{ do: `Without a cable: ${at.toLowerCase()}, choose to share, and follow what it shows. It gives you a short code or a name to pick on your laptop.`, uses: [...touch, 'compute'] }] : []),
    { do: `With the cable: plug the cable at the table into your laptop${p.switcher ? '. The room switches to it' : ''}.`, why: 'If your laptop has no matching socket, ask the site champion where the adapters are kept.', uses: p.switcher ? ['switcher'] : [p.displays[0]!.cat] },
    { do: `Wait a few seconds for ${screens} to change. A blank screen for a moment is normal.`, uses: [p.displays[0]!.cat] },
    ...(meet ? [{ do: 'In a meeting, people elsewhere see your screen only after you choose to share it into the meeting as well.', uses: [...touch, ...sys] }] : []),
    { do: 'When you finish, unplug the cable from your laptop (not from the table) or stop sharing.', uses: [] },
  ] });
  // ---- sound
  if (p.hears || p.speakers.length || bar) sections.push({ id: 'sound', title: 'Be heard, and hear', lead: ceilMics ? 'The microphones are in the ceiling. Speak normally; there is nothing to pick up or switch on.' : tableMics ? 'The microphones are on the table.' : bar ? 'The microphone is in the bar under or over the screen.' : handMics ? 'The room has hand-held or clip-on microphones.' : 'The room has loudspeakers for what is played, and no microphones.', steps: [
    ...(ceilMics ? [{ do: 'Speak towards the table, not the wall. Everyone at the table is covered.', uses: ['micceil'] }] : []),
    ...(tableMics ? [{ do: 'Keep papers, cups and laptops off the table microphones, and do not move them.', why: 'They are placed so every seat is heard.', uses: ['mictable'] }] : []),
    ...(bar && !ceilMics && !tableMics ? [{ do: 'Sit facing the screen. The further you are from it, the quieter you sound to people elsewhere.', uses: ['bar'] }] : []),
    ...(handMics ? [{ do: 'For a hand-held or clip-on microphone: switch it on, hold or clip it a hand’s width below your chin, and put it back on its charger when you finish.', uses: ['micwireless'] }] : []),
    ...(p.hears ? [{ do: `To mute the room: ${at.toLowerCase()}, press the microphone button. A red or crossed microphone means people elsewhere cannot hear the room.`, uses: [...touch, ...sys] }] : []),
    ...(p.speakers.length || bar ? [{ do: `To change how loud the far end is: ${at.toLowerCase()}, use the volume control.`, uses: [...touch, ...sys, ...(p.speakers.length ? ['speaker'] : ['bar'])] }] : []),
  ] });
  // ---- camera
  if (p.cameras.length) sections.push({ id: 'camera', title: 'Be seen', lead: p.cameras.length > 1 ? `The room has ${p.cameras.length} cameras.` : 'The room has one camera.', steps: [
    { do: 'Look at the small picture of the room on the screen: that is what people elsewhere see.', uses: [cats.has('camera') ? 'camera' : 'bar'] },
    ...(by !== 'the display’s own controls' ? [{ do: `${at}, choose a camera view: ${p.cameras[0]!.presets.join(', ')}.`, why: 'A view is a saved position. Choosing one moves the camera for you.', uses: [...touch, ...sys, cats.has('camera') ? 'camera' : 'bar'] }] : []),
    { do: `To stop being seen: ${at.toLowerCase()}, turn the camera off. Do not cover or turn the camera by hand.`, uses: [...touch, ...sys, cats.has('camera') ? 'camera' : 'bar'] },
  ] });
  // ---- controls
  sections.push({ id: 'controls', title: 'What you can adjust', lead: by === 'touch panel' ? 'Everything you need is on the room’s touch panel.' : by === 'room system' ? 'This room has no touch panel. It is operated from what is shown on its screen.' : by === 'the display’s own controls' ? 'This room has no touch panel and no room system. The screen is operated with its own remote or buttons.' : 'There is no equipment to operate in this room.', steps: [
    ...(p.scenes.filter((s) => s.id !== 'off').map((s) => ({ do: `${s.label}: ${s.says}`, uses: [...touch, ...sys] }))),
    ...(p.displays.length > 1 && by !== 'the display’s own controls' ? [{ do: 'With more than one screen you can put a different thing on each.', uses: [...touch, p.displays[0]!.cat] }] : []),
    { do: 'Leave everything else as you found it. Settings behind a lock or a password are the engineers’.', uses: [] },
  ] });
  // ---- end
  sections.push({ id: 'end', title: 'When you finish', lead: 'Leave the room ready for the next person.', steps: [
    ...(meet ? [{ do: `${at}, press Leave or End. Check that the meeting has gone from the screen.`, why: 'A meeting left running keeps the microphones open.', uses: [...touch, ...sys] }] : []),
    ...(laptop ? [{ do: 'Take your cable adapter with you and leave the room’s cable on the table.', uses: [] }] : []),
    ...(handMics ? [{ do: 'Put hand-held and clip-on microphones back on their charger.', uses: ['micwireless'] }] : []),
    ...(p.displays.length ? [{ do: by === 'the display’s own controls' ? 'Switch the screen off with its remote.' : 'You do not need to switch anything off: the room turns itself off after a while.', uses: [p.displays[0]!.cat] }] : []),
    { do: 'Wipe the whiteboard, push the chairs in, and take your things.', uses: [] },
  ] });
  // ---- help
  sections.push({ id: 'help', title: 'If something is not working', lead: 'You do not need to know what is wrong. Say what you see.', steps: [
    { do: 'Open “In this room” for this room: it shows what to try, one step at a time, and writes down how it ended.', uses: [] },
    { do: 'If it is still wrong, report it from there. It becomes a job with a number, with what you tried attached.', uses: [] },
    { do: 'For something only someone local would know (where the adapters are, who has the key), ask the site champion.', uses: [] },
    { do: 'Do not open cabinets, unplug the room’s equipment or restart it at the wall.', why: 'It can lose settings, and some of it is not safe to handle.', uses: [] },
  ] });
  return {
    id: `EUG-ROOM-${o.id}`, roomId: o.id, title: `How to use ${shortName(o)}`, revision: 'draft 1', status: 'DRAFT', audience: 'Anyone using the room',
    summary: `${o.name}, ${b?.name || o.building}, floor ${o.floor}. It seats ${o.capacity}. ${meet ? 'The room joins meetings itself' : p.displays.length ? 'Bring your laptop: the room has a screen and does not join meetings itself' : 'It has no equipment to operate'}${by === 'touch panel' ? ', and is operated from a touch panel' : ''}.`,
    equipment: plainEquipment(r), supports, sections, lacks: p.lacks, operatedBy: by,
    objectives: ['Start and end a meeting in this room without help', 'Show your own screen', 'Know what to do, and what not to do, when something is not working'],
    sources: [`The room’s record (${hw.length} pieces of equipment, ${kindsOf(r).length} kinds)`, 'Empathia’s generic room instructions, draft'],
    notReady: stage.built ? null : `This room is ${stage.words}. Its equipment may not be installed or working yet.`,
  };
}

/** The words of a step that name equipment, by category: used by the tests to prove a guide never mentions what its room lacks. */
export const MENTIONS: ReadonlyArray<[re: RegExp, cats: readonly string[], what: string]> = [
  [/touch panel/i, ['touch'], 'a touch panel'], [/\bcameras?\b/i, ['camera', 'bar'], 'a camera'], [/ceiling/i, ['micceil'], 'ceiling microphones'], [/table microphones/i, ['mictable'], 'table microphones'],
  [/hand-held|clip-on/i, ['micwireless'], 'wireless microphones'], [/projector/i, ['projector'], 'a projector'], [/video wall/i, ['ledwall'], 'a video wall'], [/\bbar under or over\b/i, ['bar'], 'a video bar'],
];
