/**
 * Original CTS-D practice questions (Empathia, 18 Nov 2026), written against the duties of AVIXA's published CTS-D content outline. None
 * is from, or reconstructed from, any AVIXA exam. Standards are named by their published designation only; none is quoted.
 */
import type { Q } from './types.js';

const q = (id: string, domain: string, task: string, topic: string, stem: string, options: [string, string, string, string], answer: 0 | 1 | 2 | 3, why: string, extra: Partial<Q> = {}): Q =>
  ({ id: `ctsd-${id}`, cert: 'CTS-D', domain, task, topic, stem, options, answer, why, ...extra });

export const CTSD_BANK: Q[] = [
  // ---------------------------------------------------------------- A needs assessment
  q('a1-01', 'A', 'A1', 'Functional requirements', 'Which is a functional requirement rather than a technical specification?',
    ['A 98-inch 4K display', 'Remote students can read the instructor’s handwriting on the board from home', 'A 12 × 12 matrix switcher', 'Dante-enabled microphones'], 1,
    'A functional requirement states what users must be able to do and how well. Equipment choices come later, in the design that meets it.'),
  q('a1-02', 'A', 'A1', 'Functional requirements', 'What is the value of user stories in a needs assessment?',
    ['They replace drawings', 'They capture tasks from the user’s point of view, so requirements trace to real activities', 'They set the budget', 'They are required by code'], 1,
    'A story such as “as a lecturer I want to start recording without help” gives the designer a testable outcome and a reason.'),
  q('a1-03', 'A', 'A1', 'Benchmarking', 'Why visit or benchmark comparable spaces during needs assessment?',
    ['To copy their equipment list', 'To give the client concrete reference experiences to react to and to calibrate expectations', 'To win the competitor’s client', 'Because the specification demands it'], 1,
    'Clients judge experiences better than specifications. Benchmarks surface expectations early.'),
  q('a2-01', 'A', 'A2', 'Technology master plan', 'A university wants every classroom of a type to work the same way. Which document sets that standard across the estate?',
    ['A single-room drawing package', 'The client technology master plan with room-type standards', 'A punch list', 'A rack elevation'], 1,
    'The master plan defines room types, tiers and standards so design and support scale across buildings and years.'),
  q('a2-02', 'A', 'A2', 'Technology master plan', 'Why are room “tiers” (basic, standard, advanced) useful in a master plan?',
    ['They force every room to the highest tier', 'They match capability and cost to the activities of each room type while keeping operation consistent', 'They remove the need for needs analysis', 'They are mandated by AVIXA'], 1,
    'Tiers scale capability to use, keep the user experience consistent, and simplify spares and support.'),
  q('a3-01', 'A', 'A3', 'Program report', 'What should an AV program report contain?',
    ['Only the equipment list', 'The needs, the functional requirements per space, and the infrastructure the spaces will need from other disciplines', 'The installer’s schedule', 'Marketing material'], 1,
    'The program report turns needs into space-by-space requirements and infrastructure needs (power, data, structure, acoustics, sightlines) early enough for the architect to plan them.'),
  q('a3-02', 'A', 'A3', 'Program report', 'When is the AV program report most valuable to the architect?',
    ['After construction documents are issued', 'Early, during programming and schematic design', 'At closeout', 'Only during bidding'], 1,
    'Room size, ceiling height, sightlines and structure are cheapest to change early; that is when AV needs must be known.'),

  // ---------------------------------------------------------------- B coordination
  q('b1-01', 'B', 'B1', 'Architecture', 'The architect proposes a 9 ft ceiling in a 60-seat lecture room. Why might the AV designer object?',
    ['Ceiling tiles are hard to cut', 'The image may not be tall enough for the farthest viewers while staying above the heads of those in front', 'Microphones need a high ceiling', 'Projectors need a tall ceiling to cool'], 1,
    'Image height follows from the farthest viewer; the bottom of the image must clear the heads in front. Ceiling height constrains both.', { tool: 'screen-for-room' }),
  q('b1-02', 'B', 'B1', 'Architecture', 'Which architectural drawing shows lights, diffusers, sprinklers, speakers and projectors on the ceiling?',
    ['The floor plan', 'The reflected ceiling plan (RCP)', 'The site plan', 'The elevation'], 1, 'The RCP shows the ceiling as if reflected onto the floor; AV devices are coordinated there with the other ceiling trades.'),
  q('b1-03', 'B', 'B1', 'Architecture', 'Glass walls are proposed for a videoconference room. What should the designer raise?',
    ['Nothing', 'Reflections, privacy, acoustic isolation and camera backgrounds', 'Glass blocks Wi-Fi completely', 'Glass increases projector brightness'], 1,
    'Glass reflects sound and light, carries sound between rooms, shows a busy background to the far end and may need privacy film.'),
  q('b2-01', 'B', 'B2', 'Structure', 'A 300 lb LED wall will hang from a ceiling. What does the AV designer give the structural engineer?',
    ['The colour of the LED', 'Loads and attachment points (point loads, dynamic factors where relevant) for the engineer to design to', 'The installer’s name', 'Nothing; the installer handles it'], 1,
    'AV states loads and positions; the structural engineer of record designs and approves the support.'),
  q('b3-01', 'B', 'B3', 'Electrical', 'Why might the AV design call for isolated-ground or technical-power circuits?',
    ['They are cheaper', 'To reduce noise on the AV equipment ground and separate AV loads from noisy building loads', 'They remove the need for protective earth', 'Code requires them in every room'], 1,
    'Technical power and isolated-ground receptacles keep noisy loads and ground currents off AV equipment. They never remove protective earth.'),
  q('b3-02', 'B', 'B3', 'Mechanical', 'HVAC noise in a boardroom is measured at NC 45. What is the likely consequence?',
    ['None', 'Microphones and listeners will struggle: background noise too high for good speech pickup and intelligibility', 'Better cooling of the rack', 'Lower power use'], 1,
    'Conference and teaching rooms are typically designed to around NC 25–30 or quieter; NC 45 masks speech and fills microphones with noise.'),
  q('b3-03', 'B', 'B3', 'Conduit', 'In US practice, what is the usual maximum fill for a conduit with more than two cables?',
    ['25 %', '31 %', '40 %', '53 %'], 2, 'The National Electrical Code’s fill table allows 53 % for one conductor, 31 % for two and 40 % for more than two; AV designs follow the same limits for pulling and heat.'),
  q('b3-04', 'B', 'B3', 'Conduit', 'Why limit the total bends between pull points in a conduit run?',
    ['For appearance', 'Each bend adds pulling tension; too many make a pull impossible or damage the cable', 'To reduce the conduit cost', 'Because inspectors count bends for fun'], 1, 'Bends multiply friction. Common practice (and the NEC for conduit) limits a run to 360° of bends between pull points.'),
  q('b4-01', 'B', 'B4', 'IT', 'Why does the designer agree a VLAN and QoS plan with IT for AV-over-IP and conferencing?',
    ['To bypass IT security', 'To separate and prioritise real-time AV traffic so it is reliable and does not disturb other traffic', 'Because multicast requires public addresses', 'To avoid using switches'], 1,
    'Real-time media needs predictable latency and loss; VLANs contain it and QoS (DSCP markings honoured by the network) prioritises it.'),
  q('b4-02', 'B', 'B4', 'IT', 'IT requires 802.1X on all ports. What does this mean for AV devices?',
    ['Nothing', 'Each device must authenticate (or be explicitly handled) before it gets network access', 'Devices need public IP addresses', 'Multicast is forbidden'], 1, 'Port-based access control: devices that cannot authenticate need a plan agreed with IT (supported credentials or a managed exception).'),
  q('b5-01', 'B', 'B5', 'Acoustics', 'A lecture hall has an RT60 of 2.5 s. What should the designer expect?',
    ['Excellent speech intelligibility', 'Poor intelligibility; acoustic treatment is needed before electronics can help much', 'Better bass', 'Nothing until the system is installed'], 1, 'Long reverberation smears speech. Speech rooms are typically designed well under 1 s; loudspeakers cannot undo the room.', { tool: 'rt60-sabine' }),
  q('b5-02', 'B', 'B5', 'Acoustics', 'For US core learning spaces, ANSI/ASA S12.60 sets a maximum background noise of about:',
    ['25 dBA', '35 dBA', '45 dBA', '55 dBA'], 1, 'S12.60 sets 35 dBA one-hour average background noise for core learning spaces (with reverberation limits by room volume).'),
  q('b5-03', 'B', 'B5', 'Acoustics', 'What does a wall’s STC rating describe?',
    ['How much it absorbs sound inside the room', 'How well it blocks airborne sound between spaces', 'Its fire rating', 'Its structural strength'], 1, 'Sound Transmission Class rates airborne isolation between spaces; absorption (NRC, α) is a different property.'),
  q('b6-01', 'B', 'B6', 'Life safety', 'A venue’s sound system must interface with the fire alarm. What is the usual requirement?',
    ['The AV system ignores alarms', 'AV programme audio mutes (or yields) when the alarm or mass notification sounds, as the authority having jurisdiction requires', 'The fire alarm plays through the AV system by default', 'Only the projector turns off'], 1, 'Life safety signals must be heard; the AHJ and the codes decide how AV audio yields to them.'),
  q('b7-01', 'B', 'B7', 'Project-specific', 'A museum gallery includes an AV exhibit. Who else must the AV designer coordinate with?',
    ['Only the electrician', 'The exhibit designer and the content producers', 'Nobody', 'Only IT'], 1, 'Exhibits, theatres and content-driven spaces bring their own professionals; the design must fit their content and their sightlines.'),

  // ---------------------------------------------------------------- C develop and document
  q('c1-01', 'C', 'C1', 'Conceptual design', 'What should a conceptual AV design show?',
    ['Every cable number', 'System types, major components and how they serve the requirements, with order-of-magnitude cost and infrastructure', 'Shop drawings', 'The installer’s schedule'], 1, 'Concept: the approach, the main parts, what they need from the building, and a budget estimate to test against.'),
  q('c1-02', 'C', 'C1', 'Display design', 'Detailed content will be read by viewers up to 36 ft away. What image height is needed by the 6× rule of thumb?',
    ['4 ft', '6 ft', '8 ft', '9 ft'], 1, 'Height = farthest ÷ 6 = 36 ÷ 6 = 6 ft. Use DISCAS (ANSI/AVIXA V202.01) for a design of record.', { math: true, tool: 'screen-for-room' }),
  q('c1-03', 'C', 'C1', 'Audio design', 'A sound system must achieve 6 dB more gain before feedback. Which single change provides it?',
    ['Doubling the number of open microphones', 'Halving the talker-to-microphone distance', 'Doubling the loudspeaker power', 'Adding a second loudspeaker'], 1, 'PAG improves 6 dB each time Ds halves (20·log 2). Doubling open microphones costs 3 dB; power changes nothing about feedback.', { math: true, tool: 'pag-nag' }),
  q('c1-04', 'C', 'C1', 'Audio design', 'What is the critical distance in a room?',
    ['Where the loudspeaker is hung', 'Where direct and reverberant sound are equal in level', 'The distance to the farthest listener', 'The distance a cable can run'], 1, 'Beyond critical distance the reverberant field dominates and intelligibility falls; directive loudspeakers and treatment extend it.', { tool: 'critical-distance' }),
  q('c1-05', 'C', 'C1', 'Audio design', 'Which metric does a designer use to state and verify speech intelligibility?',
    ['THD', 'Speech Transmission Index (STI)', 'Signal-to-noise ratio of the amplifier', 'Watts per channel'], 1, 'STI (measured with STIPA) rates intelligibility from 0 to 1, accounting for noise and reverberation.'),
  q('c1-06', 'C', 'C1', 'Video design', 'A 4K60 4:4:4 8-bit signal must cross a building. Which link alone can carry it uncompressed?',
    ['HDMI 1.4', '3G-SDI', 'HDMI 2.0 over suitable active fiber', 'HDBaseT 2.0 without compression'], 2, 'About 14.3 Gb/s with blanking: beyond HDMI 1.4 (8.16 Gb/s payload), 3G-SDI and uncompressed HDBaseT 2.0; within HDMI 2.0’s 14.4 Gb/s.', { math: true, tool: 'video-bandwidth' }),
  q('c2-01', 'C', 'C2', 'Coordination', 'The architect moves a column, blocking the planned projector sightline. What does the designer do?',
    ['Keep the design and hope', 'Revise the design to the new conditions and issue the change through the agreed process', 'Tell the installer to adjust on site', 'Move the column back'], 1, 'Revise to site and A&E conditions formally, so every document agrees.'),
  q('c3-01', 'C', 'C3', 'Drawings', 'Which drawing shows how signals flow between devices regardless of where they are?',
    ['Floor plan', 'Functional (signal flow) diagram', 'Rack elevation', 'Reflected ceiling plan'], 1, 'The signal-flow (functional or line) diagram shows connections and signal types, not physical location.'),
  q('c3-02', 'C', 'C3', 'Drawings', 'Which drawing shows the order and height of equipment in a rack?',
    ['Rack elevation', 'Signal flow', 'Site plan', 'Section'], 0, 'The rack elevation shows each device’s position and rack units, with blanks, vents and power.'),
  q('c3-03', 'C', 'C3', 'Drawings', 'Plans are drawn at 1/8″ = 1′-0″. A run measures 6 inches on the plan. How long is it?',
    ['6 ft', '24 ft', '48 ft', '96 ft'], 2, '1/8″ represents 1 ft, so 1″ is 8 ft; 6″ × 8 = 48 ft.', { math: true }),
  q('c4-01', 'C', 'C4', 'Specifications', 'What is the difference between a performance and a prescriptive specification?',
    ['There is none', 'A performance spec states required results; a prescriptive spec names the products and methods', 'A performance spec lists brands only', 'A prescriptive spec has no drawings'], 1, 'Performance specs allow competition on how; prescriptive specs fix what. Many AV specs mix both with “or equal” rules.'),
  q('c4-02', 'C', 'C4', 'Specifications', 'In the CSI MasterFormat, audio-video systems are usually specified in:',
    ['Division 09', 'Division 26', 'Division 27', 'Division 33'], 2, 'Division 27 is Communications; audio-video systems sit within it (27 41 00).'),
  q('c4-03', 'C', 'C4', 'Documentation', 'Why must the bill of materials agree with the drawings and the specification?',
    ['For appearance', 'Bidders price from them; any conflict becomes a question, a change or a claim', 'It does not matter', 'Manufacturers require it'], 1, 'Coordinated documents get comparable bids and fewer RFIs and change orders.'),
  q('c4-04', 'C', 'C4', 'Documentation', 'Which document answers a contractor’s question about the design during construction?',
    ['A punch list', 'A response to a request for information (RFI)', 'A submittal', 'A purchase order'], 1, 'RFIs ask; the designer’s formal response clarifies, and if it changes scope it leads to a change order.'),

  // ---------------------------------------------------------------- D deploy
  q('d1-01', 'D', 'D1', 'Execution', 'What is the designer’s role in reviewing submittals?',
    ['Approve whatever is sent', 'Check that proposed products and drawings meet the design intent and specification', 'Order the equipment', 'Install the system'], 1, 'Submittal review catches substitutions and errors before they are bought and built.'),
  q('d2-01', 'D', 'D2', 'Verification', 'Which AVIXA standard addresses verifying that an AV system performs as designed?',
    ['ANSI/AVIXA 10:2013 Audiovisual Systems Performance Verification', 'ANSI/INFOCOMM 3M-2011', 'ANSI/AVIXA F501.01:2015', 'ANSI/ASA S12.60'], 0, 'The performance verification standard defines a process and a library of verification items for systems.'),
  q('d2-02', 'D', 'D2', 'Verification', 'Which AVIXA standard measures the contrast of a projected image system?',
    ['ANSI/INFOCOMM 3M-2011', 'ANSI/AVIXA 10:2013', 'ANSI/AVIXA V202.01:2016', 'ANSI/INFOCOMM 2M-2010'], 0, '3M-2011 defines projected image system contrast ratio and its measurement; V202.01 is DISCAS (image sizing).'),
  q('d2-03', 'D', 'D2', 'Verification', 'The audio coverage uniformity of a listening area is verified to which AVIXA standard?',
    ['ANSI/AVIXA A102.01:2017', 'ANSI/INFOCOMM 3M-2011', 'ANSI/AVIXA F501.01:2015', 'ANSI/AVIXA 4:2012'], 0, 'A102.01 (which succeeded ANSI/INFOCOMM 1M-2009) covers audio coverage uniformity in enclosed listener areas.'),
  q('d3-01', 'D', 'D3', 'Closeout', 'Which is part of closeout for the design team?',
    ['Writing the needs analysis', 'Confirming as-builts, manuals, training and programming files are delivered', 'Bidding the project', 'Surveying the site'], 1, 'Closeout delivers the record of what was built and how to run it, and confirms the training happened.'),

  // ---------------------------------------------------------------- physics
  q('m-01', 'C', 'C1', 'Acoustics', 'A room is 12 × 8 × 3 m with average absorption coefficient 0.25. What is its Sabine RT60?',
    ['', '', '', ''], 1, 'computed below', { math: true, tool: 'rt60-sabine' }),
  q('m-02', 'C', 'C1', 'Acoustics', 'The first axial mode along a 6.86 m room length is at about:',
    ['12.5 Hz', '25 Hz', '50 Hz', '100 Hz'], 1, 'f = c ÷ 2L = 343 ÷ 13.72 = 25 Hz.', { math: true, tool: 'room-modes' }),
  q('m-03', 'C', 'C1', 'Electrical', 'A 100 ft run of 12 AWG copper carries 16 A at 120 V single phase. About how much voltage is dropped?',
    ['1.6 V', '3.2 V', '6.3 V', '12.6 V'], 2, 'VD = 2 × 12.9 × 16 × 100 ÷ 6530 ≈ 6.3 V (5.3 %): more than the usual 3 % branch target.', { math: true, tool: 'voltage-drop' }),
  q('m-04', 'C', 'C1', 'Light', 'A screen must reach 15:1 contrast with 5 fL of ambient light reflected from it. What image luminance is needed?',
    ['50 fL', '70 fL', '75 fL', '80 fL'], 1, 'CR = (L + A) ÷ A → L = (CR − 1) × A = 14 × 5 = 70 fL.', { math: true, tool: 'projector-lumens' }),
];

// m-01 is computed here so the question can never disagree with its explanation
{
  const V = 12 * 8 * 3, S = 2 * (12 * 8 + 12 * 3 + 8 * 3), A = S * 0.25, rt = 0.161 * V / A; const m = CTSD_BANK.find((x) => x.id === 'ctsd-m-01')!;
  const opts = [rt / 2, rt, rt * 2, rt * 4].map((x) => `${x.toFixed(2)} s`) as [string, string, string, string];
  m.options = opts; m.answer = 1; m.why = `V = ${V} m³; S = 2(96 + 36 + 24) = ${S} m²; A = S × ᾱ = ${A} m² sabins; RT60 = 0.161 × ${V} ÷ ${A} = ${rt.toFixed(2)} s.`;
}
