/**
 * The demonstration's drawing package: a synthetic meeting room in two revisions, as the three files Drawing Intelligence reads.
 * Invented for this demonstration; the model numbers are made up and name no manufacturer. Revision A is drawn with problems on
 * purpose, so there is something to find: a camera drawn on top of the display, a tag nobody can read, an amplifier in the schedule
 * that is not on the plan, three ceiling microphones in the bill of materials against two in the schedule, and two network ports
 * for seven networked devices.
 */
import type { Doc } from './read.js';

const plan = (rev: string, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 1140">
  <title>Meeting room 3.07 — AV plan, revision ${rev}</title>
  <rect x="100" y="100" width="620" height="940" fill="none" stroke="black"/>
  <line x1="100" y1="60" x2="720" y2="60" stroke="black"/><text x="410" y="50">6200 mm</text>
  <line x1="60" y1="100" x2="60" y2="1040" stroke="black"/><text x="40" y="570">9.40 m</text>
  <text x="640" y="1100">SCALE 1:50</text>
${body}
</svg>`;
const PLAN_A = plan('A', `  <text x="410" y="110">DISP-01</text><text x="410" y="118">CAM-01</text>
  <text x="410" y="400">MICC-01</text><text x="410" y="700">MICC-02</text>
  <text x="250" y="400">SPK-01</text><text x="570" y="400">SPK-02</text>
  <text x="680" y="1000">DSP-01</text><text x="690" y="960">UC-01</text><text x="410" y="560">TP-01</text>
  <text x="300" y="900">XYZ-01</text>
  <text x="700" y="1020">NP-01</text><text x="700" y="1032">NP-02</text>`);
const PLAN_B = plan('B', `  <text x="410" y="110">DISP-01</text><text x="410" y="160">CAM-01</text>
  <text x="410" y="400">MICC-01</text><text x="410" y="760">MICC-02</text>
  <text x="250" y="400">SPK-01</text><text x="570" y="400">SPK-02</text>
  <text x="680" y="1000">DSP-01</text><text x="690" y="960">UC-01</text><text x="410" y="560">TP-01</text>
  <text x="640" y="1000">SW-01</text><text x="680" y="930">AMP-01</text>
  <text x="700" y="1020">NP-01</text><text x="700" y="1032">NP-02</text>`);
const SCHEDULE_A = `Tag,Description,Model,Network
DISP-01,Display 75 in,D75-A,Y
CAM-01,PTZ camera,C12-P,Y
MICC-01,Ceiling microphone,M9-C,Y
MICC-02,Ceiling microphone,M9-C,Y
SPK-01,Loudspeaker,S6,N
SPK-02,Loudspeaker,S6,N
DSP-01,Audio processor,A16,Y
UC-01,Room compute,U4,Y
TP-01,Touch panel,T10,Y
AMP-01,Amplifier,P2,N
`;
const SCHEDULE_B = `${SCHEDULE_A}SW-01,Network switch,N24-P,Y\n`;
const BOM_A = `Model,Description,Qty
D75-A,Display 75 in,1
C12-P,PTZ camera,1
M9-C,Ceiling microphone,3
S6,Loudspeaker,2
A16,Audio processor,1
U4,Room compute,1
T10,Touch panel,1
P2,Amplifier,1
`;
const BOM_B = `${BOM_A.replace('M9-C,Ceiling microphone,3', 'M9-C,Ceiling microphone,2')}N24-P,Network switch,1\n`;

export const SAMPLE_NAME = 'Meeting room 3.07 (synthetic)';
export const SAMPLE: Readonly<Record<'A' | 'B', readonly Doc[]>> = {
  A: [{ id: 'AV-301-A', name: 'AV-301 plan rev A.svg', kind: 'plan', revision: 'A', text: PLAN_A }, { id: 'AV-601-A', name: 'AV-601 device schedule rev A.csv', kind: 'schedule', revision: 'A', text: SCHEDULE_A }, { id: 'AV-701-A', name: 'AV-701 bill of materials rev A.csv', kind: 'bom', revision: 'A', text: BOM_A }],
  B: [{ id: 'AV-301-B', name: 'AV-301 plan rev B.svg', kind: 'plan', revision: 'B', text: PLAN_B }, { id: 'AV-601-B', name: 'AV-601 device schedule rev B.csv', kind: 'schedule', revision: 'B', text: SCHEDULE_B }, { id: 'AV-701-B', name: 'AV-701 bill of materials rev B.csv', kind: 'bom', revision: 'B', text: BOM_B }],
};
