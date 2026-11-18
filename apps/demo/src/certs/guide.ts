/**
 * The study guides (Empathia, 18 Nov 2026): what each duty of each exam asks you to know, the math and physics underneath, and how to
 * prepare and sit the exam. Written in our own words from general AV practice and the duties of AVIXA's published content outlines; it
 * is not AVIXA material and does not reproduce any AVIXA course, book, standard or exam. Standards are named, never quoted.
 */
import type { CertId } from './facts.js';

export interface Formula { f: string; say: string; tool?: string }
export interface Section { id: string; title: string; body: string[]; points?: string[]; formulas?: Formula[]; traps?: string[] }
export interface DomainGuide { domain: string; sections: Section[] }

// ------------------------------------------------------------------------------------------------ the math and physics, shared
export const MATH: Section[] = [
  { id: 'decibels', title: 'Decibels: the one idea behind half the exam', body: [
    'A decibel is a ratio on a logarithmic scale. It is never an amount on its own: 0 dB means “the same as the reference”, not “nothing”. Every dB question is really “which ratio, and is it a power or a field quantity?”',
    'Power-like quantities (watts, intensity) use 10·log. Field quantities whose square is power (volts, amps, sound pressure) use 20·log. Doubling power is +3 dB; doubling voltage or pressure is +6 dB, because doubling voltage into the same load quadruples power.',
    'References turn a ratio into a level: dB SPL is relative to 20 µPa, dBu to 0.775 V, dBV to 1 V, dBm to 1 mW. Pro line level is +4 dBu (1.228 V); consumer is −10 dBV (0.316 V); the gap is about 11.8 dB, not 14.',
  ], formulas: [
    { f: 'ΔdB = 10·log(P₂ ÷ P₁)', say: 'power ratio', tool: 'convert' }, { f: 'ΔdB = 20·log(V₂ ÷ V₁)', say: 'voltage or pressure ratio', tool: 'convert' },
    { f: 'L_total = 10·log Σ 10^(Lᵢ/10)', say: 'adding uncorrelated sources', tool: 'add-levels' }, { f: 'dBu = 20·log(V ÷ 0.775)', say: 'line level', tool: 'signal-level' },
  ], points: ['+3 dB = twice the power; +10 dB = ten times the power and roughly “twice as loud” to the ear.', '+6 dB = twice the voltage or pressure; +20 dB = ten times.', 'Two equal uncorrelated sources: +3 dB. Ten of them: +10 dB. Two identical in-phase signals: up to +6 dB.', 'A 10 dB louder source dominates: adding a source 10 dB quieter adds only 0.4 dB.'],
    traps: ['Using 20·log for a power ratio (doubling power is not +6 dB).', 'Treating dB as additive amounts: 80 dB + 80 dB is 83 dB, not 160 dB.', 'Mixing dBu and dBV without the 2.2 dB offset.'] },
  { id: 'inverse', title: 'Distance, the inverse square law and the room', body: [
    'Sound from a small source spreads over a sphere whose area grows with the square of the distance, so intensity falls with distance squared and level falls 6 dB every time the distance doubles. A long line source in its near field spreads over a cylinder: 3 dB per doubling.',
    'Indoors, the direct sound falls by the inverse square law but the reverberant sound stays roughly constant through the room. Where the two are equal is the critical distance; beyond it more amplifier power raises the reverberation as much as the speech, and intelligibility depends on directivity and the room, not loudness.',
  ], formulas: [
    { f: 'ΔL = 20·log(d₂ ÷ d₁)', say: 'point source, free field', tool: 'inverse-square' }, { f: 'SPL_d = S + 10·log(P) − 20·log(d)', say: 'sensitivity, power, distance', tool: 'spl-listener' },
    { f: 'Dc = 0.141·√(Q·R), R = S·ᾱ ÷ (1 − ᾱ)', say: 'critical distance (metric)', tool: 'critical-distance' },
  ], traps: ['Forgetting that sensitivity is quoted at 1 W and 1 m: convert power first, then distance.', 'Expecting the inverse square law to hold deep in a reverberant room.'] },
  { id: 'electrical', title: 'Ohm’s law, power, current and heat', body: [
    'Four quantities, two laws: V = I·R and P = V·I. Any two give the other two. In AV they answer whether an amplifier sees a safe load, how much current a rack draws, how many circuits it needs and how much heat the room must lose.',
    'Speaker loads: equal impedances in series add; in parallel divide by the count. Constant-voltage (70 V / 100 V) systems turn the question around: the amplifier sees the sum of the transformer taps, and Z = V² ÷ P tells you the load that sum presents.',
    'Every watt an AV system draws ends up as heat in the room: 1 W ≈ 3.412 BTU/h, and 12,000 BTU/h is one ton of cooling. Circuits carrying a continuous load are commonly loaded to 80 % of the breaker rating.',
  ], formulas: [
    { f: 'V = I·R; P = V·I = I²·R = V² ÷ R', say: 'Ohm’s and Joule’s laws', tool: 'ohms-law' }, { f: 'I = P ÷ (V·PF); 3φ: I = P ÷ (√3·V·PF)', say: 'current from load', tool: 'watts-amps' },
    { f: 'Z_parallel = Z ÷ n; Z_series = Σ Z', say: 'speaker loads', tool: 'speaker-impedance' }, { f: 'BTU/h = W × 3.412', say: 'heat load', tool: 'watts-amps' },
    { f: 'VD = 2·K·I·L ÷ CM (K ≈ 12.9 for copper)', say: 'voltage drop, single phase', tool: 'voltage-drop' },
  ], traps: ['Parallel loads go down, not up: four 8 Ω speakers in parallel are 2 Ω.', 'A 20 A breaker carries 16 A continuously, not 20.'] },
  { id: 'display', title: 'Display and projection geometry', body: [
    'Image size follows from the content and the farthest viewer, not the wall. Classic rules of thumb set the farthest viewer at about 4 (inspection), 6 (detailed) or 8 (general) image heights, with the closest at about 2 heights. AVIXA’s DISCAS standard (ANSI/AVIXA V202.01) replaces the rules of thumb with a method based on the smallest element that must be read.',
    'From a diagonal and an aspect ratio, Pythagoras gives width and height. A throw ratio is distance divided by image width. Projected contrast is (image + ambient) over ambient on the screen, so ambient light, not the projector’s data-sheet contrast, usually sets what the audience sees. ANSI/INFOCOMM 3M-2011 defines how projected image contrast is measured, with targets by content type.',
  ], formulas: [
    { f: 'H = D · a_h ÷ √(a_w² + a_h²)', say: 'height from diagonal', tool: 'screen-size' }, { f: 'farthest ≈ k·H (k = 4, 6, 8)', say: 'rule of thumb', tool: 'viewing-distance' },
    { f: 'D_throw = TR × W', say: 'throw distance', tool: 'throw-distance' }, { f: 'L_image = (CR − 1) × L_ambient; lm = fL × ft² ÷ gain', say: 'brightness for a contrast', tool: 'projector-lumens' },
    { f: 'pixel blends beyond ≈ 3438 × pixel pitch', say: 'one arcminute', tool: 'pixel-acuity' },
  ], traps: ['Using the width where the height is asked.', 'A bigger image from the same projector is dimmer and lower in contrast.'] },
  { id: 'signals', title: 'Video signals, bandwidth and the links that carry them', body: [
    'Uncompressed video rate is pixels per frame (including blanking) × frames per second × bits per pixel. Bits per pixel is bits per colour × samples per pixel: 3 for 4:4:4/RGB, 2 for 4:2:2, 1.5 for 4:2:0.',
    'A link carries a payload after its line coding: HDMI 2.0’s 18 Gb/s carries about 14.4 Gb/s of video; 3G-SDI 2.97 Gb/s; 12G-SDI 11.88 Gb/s. If the format’s rate exceeds the payload, it needs chroma subsampling, lower bit depth or frame rate, or compression.',
    'EDID tells a source what the display accepts; HDCP must be supported at every hop for protected content. Most intermittent long-run problems are links at their limit.',
  ], formulas: [{ f: 'rate = H_total × V_total × fps × bpp', say: 'uncompressed bandwidth', tool: 'video-bandwidth' }, { f: 'bpp = bits × (3 | 2 | 1.5)', say: '4:4:4 | 4:2:2 | 4:2:0', tool: 'video-bandwidth' }] },
  { id: 'acoustics', title: 'Rooms: reverberation, modes, noise and gain before feedback', body: [
    'Reverberation time (RT60) is how long sound takes to decay 60 dB after the source stops. Sabine’s estimate is 0.161 V ÷ A in metric (0.049 V ÷ A in feet), where A is the total absorption. Speech rooms want short RT; ANSI/ASA S12.60 sets limits for US classrooms with a 35 dBA background noise ceiling.',
    'Wavelength is speed of sound ÷ frequency (343 m/s, about 1,130 ft/s at 20 °C). Low frequencies have long wavelengths, which is why rooms have modes at f = c ÷ 2L and why small absorbers do little for bass.',
    'Potential acoustic gain (PAG) and needed acoustic gain (NAG) ask whether a reinforcement system can reach the farthest listener before it feeds back. Halving the talker-to-microphone distance buys 6 dB; doubling the number of open microphones costs 3 dB.',
  ], formulas: [
    { f: 'RT60 = 0.161·V ÷ A (m) = 0.049·V ÷ A (ft)', say: 'Sabine', tool: 'rt60-sabine' }, { f: 'λ = c ÷ f', say: 'wavelength', tool: 'wavelength' }, { f: 'f = c ÷ 2L', say: 'first axial mode', tool: 'room-modes' },
    { f: 'PAG = 20log D₀ + 20log D₁ − 20log Ds − 20log D₂ − 10log NOM − FSM', say: 'gain before feedback', tool: 'pag-nag' }, { f: 'NAG = 20·log(D₀ ÷ EAD)', say: 'needed gain', tool: 'pag-nag' },
    { f: 'Δt = Δd ÷ c', say: 'delay alignment', tool: 'delay-alignment' },
  ] },
  { id: 'network', title: 'Networks for AV', body: [
    'An IPv4 address and its mask divide into network and host parts. The usable hosts in a /p subnet are 2^(32−p) − 2. A device needs an address, a mask, a gateway on its own subnet to reach others, and DNS to reach names. 169.254.x.x means DHCP did not answer.',
    'AV-over-IP and networked audio are real-time: they want VLANs to contain them, QoS so the network honours their priority, IGMP snooping with a querier so multicast reaches only the ports that joined it, and PoE budgets that cover every powered device by class.',
  ], formulas: [{ f: 'hosts = 2^(32−p) − 2', say: 'usable addresses', tool: 'subnet' }, { f: 'PoE: 15.4 / 30 / 60 / 90 W at the port', say: 'class 3 / 4 / 6 / 8', tool: 'poe-budget' }] },
];

// ------------------------------------------------------------------------------------------------ exam strategy, shared
export const STRATEGY: Section[] = [
  { id: 'plan', title: 'A study plan that works', body: [
    'Start from the published outline, not a book’s chapters: the duty weights tell you where the points are. Spend time in proportion to the weight and inversely to how well you already know it.',
    'Study by doing. Every formula in the math section has a Field Tools calculator; work a problem by hand, then check it there, until you no longer need the check.',
  ], points: ['Weeks 1–2: read the outline; take a short practice exam cold to find your weak duties.', 'Weeks 3–6: one duty at a time, guide then questions; keep a list of every question you missed and why.', 'Weeks 7–8: calculation drills daily; full timed practice exams; review only what you missed.', 'Last days: the formula sheet from memory, sleep, and the route to the test centre.'] },
  { id: 'reading', title: 'Reading the question', body: [
    'Find what is actually asked before reading the options: the first step, the best choice, the most likely cause, the minimum value. Words like first, best, most and least change the answer.',
    'Several options are often true statements; only one answers this question. A technically correct option that skips a step the process requires (documenting, asking, testing) is usually the wrong one.',
  ], points: ['Cover the options, answer in your head, then look for your answer.', 'Eliminate the two clearly wrong options first; decide between the last two on the exact words of the question.', 'In process questions, the answer that documents, coordinates or verifies before acting is usually the one.', 'In calculation questions, the wrong options are the usual mistakes: width for height, 10·log for voltage, forgetting −2 hosts.'] },
  { id: 'time', title: 'Time and the test day', body: [
    'Each exam allows 150 minutes: about 78 seconds a question for CTS and 82 for CTS-D and CTS-I. Do a first pass answering everything you can, mark the slow ones, and come back. An unanswered question cannot earn credit, so answer every one.',
    'Some questions are unscored pilot items, and you cannot tell which: give each one your best answer and move on.',
    'You will have the test centre’s on-screen calculator and a note board, nothing of your own. Practise with a basic calculator so the real one is not new, and write your key formulas on the note board when you start.',
  ] },
  { id: 'after', title: 'After the exam', body: ['Keep your list of what you studied: renewal needs renewal units over three years, and the same habits earn them. If you do not pass, the score report’s duty-by-duty breakdown tells you where to spend the next weeks; the handbook sets how soon you may retake.'] },
];

// ------------------------------------------------------------------------------------------------ per certification, per duty
export const GUIDES: Record<CertId, DomainGuide[]> = {
  CTS: [
    { domain: 'A', sections: [
      { id: 'needs', title: 'Needs analysis: activities before equipment', body: ['Ask what people will do, who they are, what content they use and where they sit. The output is a documented, agreed set of needs that the design answers and later changes are measured against.'],
        points: ['Interview end users, not only the sponsor; include IT, facilities and accessibility.', 'Record functional requirements in measurable terms.', 'Prioritise with the client when the budget cannot meet everything.'] },
      { id: 'survey', title: 'Site survey: measure what the design will depend on', body: ['Bring back dimensions, ceiling type and plenum status, structure for mounts, power and network locations, ambient light at the screen, background noise with HVAC running, and the delivery route. Photos with references and a marked-up plan make it usable by someone who was not there.'] },
      { id: 'scope', title: 'Scope: the boundary of the job', body: ['Inclusions, exclusions, responsibilities and deliverables. A responsibility matrix settles who provides power, data and structure. Anything added later goes through a change order with its cost and time.'] },
      { id: 'design', title: 'Design basics: display, audio, video, control', body: ['Size images from the content and the farthest viewer; check contrast against the ambient light; choose microphone patterns to reject what you do not want; use balanced lines for long runs; plan EDID and HDCP through switchers and extenders; place conferencing cameras near the display; know which control methods need line of sight.'] },
    ] },
    { domain: 'B', sections: [
      { id: 'integrate', title: 'Integrating: build it so it can be serviced', body: ['Heavy equipment low in the rack; blanks for airflow; power and signal separated and crossing at 90°; both ends of every cable labelled; terminations to standard (XLR pin 2 hot, the same T568 scheme at both ends); lines tested before amplifiers are connected; gain set stage by stage for signal-to-noise and headroom.'],
        traps: ['Fixing hum by lifting a safety ground. Never: break the loop in the signal path.'] },
      { id: 'manage', title: 'Managing the integration', body: ['Coordinate with the trades before they cover your work; keep a daily log; process changes formally; send submittals before buying; store deliveries securely; keep the as-builts current as the build changes.'] },
    ] },
    { domain: 'C', sections: [{ id: 'support', title: 'Supporting the people who use it', body: ['Gather symptoms before acting; restore service, then find the cause; train tasks, not devices, with a one-page guide in the room; monitor remotely so faults are found before users report them; know whether an SLA promises response or resolution.'] }] },
    { domain: 'D', sections: [{ id: 'service', title: 'Servicing: maintain, troubleshoot, record', body: ['Preventive maintenance on a schedule (filters, fans, hours, firmware with configuration backups); troubleshooting from the simple and likely, then half-splitting the signal path; returns through the manufacturer’s RMA; and a record of every visit, cause and fix.'] }] },
  ],
  'CTS-D': [
    { domain: 'A', sections: [{ id: 'needs', title: 'From people to requirements to a program', body: ['Functional requirements describe outcomes users need, measurably; user stories and benchmark visits make them concrete. A client technology master plan sets room types and tiers across an estate. The program report turns needs into space-by-space requirements and the infrastructure other disciplines must provide, early enough to shape the building.'] }] },
    { domain: 'B', sections: [
      { id: 'arch', title: 'Architecture and interiors', body: ['Room proportions, ceiling heights and sightlines set what images and loudspeakers can do. Coordinate on the reflected ceiling plan, the finishes (glass, hard surfaces) and the furniture that defines viewing positions.'] },
      { id: 'mep', title: 'Structure, MEP, IT, acoustics, life safety', body: ['Give the structural engineer loads and positions. Ask electrical for technical power and circuits where the load needs them, and mechanical for quiet air (NC targets) and rack cooling. Agree VLANs, QoS, multicast and access control with IT. Work with the acoustician on RT, isolation (STC) and noise. Interface with fire alarm and mass notification as the authority having jurisdiction requires.'], points: ['Conduit fill (US practice): 53 % one cable, 31 % two, 40 % more than two.', 'No more than 360° of bends between pull points.', 'Classroom background noise ceiling under ANSI/ASA S12.60: 35 dBA.'] },
    ] },
    { domain: 'C', sections: [{ id: 'docs', title: 'Design and documents', body: ['Concept first (systems, major components, infrastructure, budget), revised to the site and the A&E documents, then the final drawing package: signal flow, plans, RCP coordination, elevations, rack elevations, details and schedules; with a specification (often Division 27, 27 41 00) and a bill of materials that agree with the drawings. Know performance versus prescriptive specifications and how RFIs and changes flow.'] }] },
    { domain: 'D', sections: [{ id: 'deploy', title: 'Deploying the design', body: ['Review submittals against the design intent, answer RFIs, verify performance with a defined process (ANSI/AVIXA 10:2013) and measurements tied to standards (projected contrast, audio coverage uniformity), and close out with as-builts, manuals, training and programming files delivered.'] }] },
  ],
  'CTS-I': [
    { domain: 'A', sections: [{ id: 'pre', title: 'Before you install', body: ['Read the documents until you can explain the system; resolve conflicts through RFIs; survey the site against the drawings; confirm the facility is ready (power energised, room clean and secure); bench-test and pre-configure; arrive with documents, test gear, labels and PPE.'], points: ['Scale: at 1/4″ = 1′-0″, 1 inch is 4 ft; at 1/8″, 8 ft.', '1 RU = 1.75 in.'] }] },
    { domain: 'B', sections: [{ id: 'ongoing', title: 'On a live site', body: ['Daily reports with work done, issues, delays, instructions and safety events; coordination with the trades who close walls and ceilings; field modifications approved before they are made and recorded for the as-builts.'] }] },
    { domain: 'C', sections: [{ id: 'rough', title: 'Rough-in and first fix', body: ['Deinstall with a record of what stays and goes. Mount to rated structure with the manufacturer’s hardware. Pull within the cable’s limits (about 25 lbf and a 4× bend radius for 4-pair UTP), restore firestopping, leave dressed service loops.'], traps: ['Wider bridle angles multiply leg tension: at 120° each leg carries the whole load.'] }] },
    { domain: 'D', sections: [
      { id: 'install', title: 'Racks, terminations and settings', body: ['Racks built to the elevation, power and signal on opposite sides, strain relief and labels. Terminations to standard: untwist within 13 mm, 75 Ω BNC for SDI, consistent polarity. Network settings: address, mask, a gateway on the subnet, DNS; 169.254 means no DHCP answer. Control: match RS-232 settings and pinout.'] },
      { id: 'test', title: 'Testing and calibration', body: ['Test bottom-up: cables (certify category links), devices, paths, then the system against the documents. Calibrate with known signals: pink noise and an RTA for loudspeakers, SPL against the design, delays aligned to the main arrivals plus a small precedence offset, displays with test patterns.'] },
    ] },
    { domain: 'E', sections: [{ id: 'close', title: 'Closeout', body: ['Demonstrate function by function against the specification and record acceptance; train users on tasks; hand over as-builts, programming and configuration files, manuals, warranties and test results.'] }] },
    { domain: 'F', sections: [{ id: 'post', title: 'After the project', body: ['Preventive maintenance on a schedule, warranty repairs through RMA, service restored with spares where possible, and every visit recorded.'] }] },
  ],
};

/** how the three differ, in words, for the comparison page */
export const DIFFERENCES: { title: string; body: string }[] = [
  { title: 'Breadth against depth', body: 'CTS covers the whole life of an AV system at a working level. CTS-D and CTS-I each take one part of it, design or installation, much deeper, and both require a current CTS first.' },
  { title: 'Whose decisions', body: 'CTS-D is about decisions made on paper before anything is bought: requirements, coordination with architects and engineers, drawings and specifications, verification. CTS-I is about decisions made on site: reading those documents, building to them, testing, calibrating and handing over.' },
  { title: 'Where the points are', body: 'CTS puts 35 % on creating solutions. CTS-D puts 38 % on developing and documenting designs and 28 % on coordinating with other professionals. CTS-I puts 39 % on installing systems.' },
  { title: 'The math', body: 'All three use the same physics. CTS asks you to apply it; CTS-D to design with it (gain before feedback, reverberation, bandwidth, image sizing); CTS-I to verify it on site (scale, rack units, levels at distance, subnetting, bridle angles).' },
  { title: 'Which first', body: 'CTS first, always. Then the specialty that matches the work you do: if you draw systems, CTS-D; if you build them, CTS-I. Many people hold both.' },
];
