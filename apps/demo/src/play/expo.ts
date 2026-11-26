/**
 * The Northlight Technology Expo in Hall A of the Larkspur Exchange Convention Center (the canon of worlds/convention), as 3D geometry
 * and records for Expo LIVE (task #181, first slice). Twenty exhibitors and the Empathia showcase, the main stage and two presentation
 * zones, registration, a lounge and the food court, under a high trussed roof on a grid of columns. The venue, the expo and every
 * exhibitor are fictional; no real exhibitor, brand or floor plan is reproduced. Metres; x along the hall, z across it, y up.
 */
export type Cat = 'Audio' | 'Displays' | 'Networks' | 'Control' | 'Collaboration' | 'Showcase';
export interface Booth { id: string; name: string; cat: Cat; about: string; demo: string; x: number; z: number; w: number; d: number; color: string }
export const HALL = { x0: -60, x1: 60, z0: -36, z1: 36, h: 18 };
const CAT_COL: Record<Cat, string> = { Audio: '#2C5FA8', Displays: '#B54708', Networks: '#0E8F83', Control: '#6B4FA0', Collaboration: '#C2553F', Showcase: '#0A7268' };
const E: Array<[string, Cat, string, string]> = [
  ['Quillfinch Audio', 'Audio', 'Ceiling microphones and room loudspeakers', 'A beamforming microphone tracks a talker across a mock meeting table'],
  ['Tamber & Rook Displays', 'Displays', 'Large-format and fine-pitch LED displays', 'A fine-pitch LED wall beside a projection screen, same content'],
  ['Osmoor Networks', 'Networks', 'Switching for audio and video over IP', 'A live multicast map: streams, their bandwidth and their clocks'],
  ['Pelliwick Controls', 'Control', 'Room control and scheduling panels', 'A booking panel and a touch panel driving the same room'],
  ['Harrowgate Collaboration', 'Collaboration', 'Meeting-room bars and cameras', 'A video bar framing three people as they move'],
  ['Venn & Sable Acoustics', 'Audio', 'Acoustic treatment and measurement services', 'Before-and-after decay curves of a treated room'],
  ['Lumenwake Projection', 'Displays', 'Projection for lecture halls and auditoria', 'Edge-blended projection across a curved screen'],
  ['Corrie Fold Systems', 'Networks', 'Monitoring for AV estates', 'Device health across a fictional campus'],
  ['Brightmoor Signage', 'Displays', 'Digital signage and wayfinding', 'Wayfinding that changes with the hall’s sessions'],
  ['Kettleby Wireless', 'Audio', 'Wireless microphones and frequency coordination', 'A frequency plan for a busy hall'],
  ['Ashgrove Lighting', 'Control', 'Architectural and presentation lighting', 'Scenes for lecture, video call and presentation'],
  ['Marrow Lane Racks', 'Networks', 'Racks, power and cable management', 'A dressed rack with labeled patching'],
  ['Teasel Conferencing', 'Collaboration', 'Huddle and boardroom kits', 'A huddle room that starts a call in one touch'],
  ['Orrin Hearing Access', 'Audio', 'Assistive listening and hearing loops', 'A loop you can hear through the booth’s receivers'],
  ['Stonechat Capture', 'Collaboration', 'Lecture capture and streaming', 'A lecture recorded with slides and captions'],
  ['Larkhill Processing', 'Audio', 'DSP and room processing', 'Echo cancellation on and off, side by side'],
  ['Wexcombe Display Mounts', 'Displays', 'Mounts, lifts and structures', 'A motorised lift taking a display out of a desk'],
  ['Fennimore Control Systems', 'Control', 'Programmable control and automation', 'A room that turns itself on as people arrive'],
  ['Pinecroft Network Security', 'Networks', 'Securing AV on the enterprise network', 'Segmented AV traffic and its policies'],
  ['Hollin Bay Interpreting', 'Collaboration', 'Interpretation and captioning services', 'Live captions on a screen, labeled as a demonstration'],
];
export const BOOTHS: Booth[] = [
  ...E.map(([name, cat, about, demo], i): Booth => { const row = Math.floor(i / 5), col = i % 5; return { id: `${'ABCD'[row]}${col + 1}`, name, cat, about, demo, x: -38 + col * 15, z: -22 + row * 11.5, w: 9, d: 7, color: CAT_COL[cat] }; }),
  { id: 'E1', name: 'Empathia', cat: 'Showcase', about: 'Rooms that explain themselves: design, commissioning proof, service and learning on one record', demo: 'The lecture theater SCI-110 from design to acceptance, live on a screen', x: 40, z: -16, w: 16, d: 12, color: CAT_COL.Showcase },
];
export const STAGE = { x: 50, z: 18, w: 18, d: 12 };
export const ZONES = [{ id: 'p1', label: 'Presentation zone 1', x: 40, z: 6 }, { id: 'p2', label: 'Presentation zone 2', x: -50, z: 26 }];
export const REG = { x: -54, z: -26 }; export const LOUNGE = { x: -50, z: 8 }; export const FOOD = { x: 20, z: 28 };
export interface Session { id: string; at: string; title: string; where: string; zone: 'stage' | 'p1' | 'p2'; poll: { q: string; options: string[] } }
export const SESSIONS: Session[] = [
  { id: 's1', at: '09:30', title: 'Opening keynote: rooms that explain themselves', where: 'Main stage', zone: 'stage', poll: { q: 'What slows your room handovers most?', options: ['Missing documentation', 'Untested rooms', 'Unclear ownership', 'Late changes'] } },
  { id: 's2', at: '11:00', title: 'Audio over IP without the guesswork', where: 'Presentation zone 1', zone: 'p1', poll: { q: 'Which clocking problem have you met?', options: ['Two grandmasters', 'Wrong domain', 'Mixed sample rates', 'None yet'] } },
  { id: 's3', at: '13:30', title: 'Commissioning: proof before handover', where: 'Main stage', zone: 'stage', poll: { q: 'Who signs off your rooms today?', options: ['The installer', 'An engineer who did not install', 'The client', 'Nobody formally'] } },
  { id: 's4', at: '15:00', title: 'Designing the accessible meeting room', where: 'Presentation zone 2', zone: 'p2', poll: { q: 'Which access feature is most often missed?', options: ['Hearing loop', 'Captions', 'Reachable controls', 'Step-free route'] } },
];
/** modeled footfall at a booth (people an hour), from its distance to the entrance and the stage and the session on: MODELED, not counted */
export function footfall(b: Booth, session: Session | null): number {
  const toEntrance = Math.hypot(b.x - -60, b.z - 0), toStage = Math.hypot(b.x - STAGE.x, b.z - STAGE.z);
  const pull = session ? (session.zone === 'stage' ? 1 + 18 / (toStage + 6) : 1) : 1;
  return Math.round((90 + 2600 / (toEntrance + 20) + (b.cat === 'Showcase' ? 60 : 0)) * pull);
}
export const FOOTFALL_NOTE = 'MODELED, not counted: people an hour from each booth’s distance to the entrance and to the session running, with no sensor, camera or badge data behind it.';
