/**
 * Original CTS-I practice questions (Empathia, 18 Nov 2026), written against the duties of AVIXA's published CTS-I content outline. None
 * is from, or reconstructed from, any AVIXA exam. Rigging and electrical questions teach recognition and process; they are not
 * instructions to rig or wire, which belong to qualified people under the codes that apply.
 */
import type { Q } from './types.js';

const q = (id: string, domain: string, task: string, topic: string, stem: string, options: [string, string, string, string], answer: 0 | 1 | 2 | 3, why: string, extra: Partial<Q> = {}): Q =>
  ({ id: `ctsi-${id}`, cert: 'CTS-I', domain, task, topic, stem, options, answer, why, ...extra });

export const CTSI_BANK: Q[] = [
  // ---------------------------------------------------------------- A pre-installation
  q('a1-01', 'A', 'A1', 'Documents', 'The drawings and the specification disagree about a display size. What should the installer do?',
    ['Install the larger one', 'Install the one in the drawings', 'Raise an RFI and wait for a written answer', 'Ask the client informally'], 2, 'Conflicts in the contract documents are resolved in writing through an RFI; the order of precedence is a contract matter, not the installer’s guess.'),
  q('a1-02', 'A', 'A1', 'Documents', 'On a drawing at 1/4″ = 1′-0″, a wall measures 5 inches. How long is the wall?',
    ['5 ft', '10 ft', '20 ft', '40 ft'], 2, '1/4″ represents 1 ft, so 1″ is 4 ft; 5″ × 4 = 20 ft.', { math: true }),
  q('a1-03', 'A', 'A1', 'Documents', 'Which document tells you the order and position of equipment in each rack?',
    ['The signal flow diagram', 'The rack elevation', 'The reflected ceiling plan', 'The equipment schedule only'], 1, 'Rack elevations show each device’s position, rack units, panels and power.'),
  q('a1-04', 'A', 'A1', 'Documents', 'Where would you look to find where a ceiling loudspeaker sits relative to lights and sprinklers?',
    ['The reflected ceiling plan', 'The rack elevation', 'The cable schedule', 'The functional diagram'], 0, 'The RCP coordinates every ceiling device.'),
  q('a2-01', 'A', 'A2', 'Site survey', 'Before the install, the survey finds a ceiling 6 inches lower than the drawings show. What next?',
    ['Install anyway', 'Record it with measurements and photos and report it so the design can be checked', 'Raise the ceiling', 'Shorten the mounts on site'], 1, 'Report differing site conditions; mounts, sightlines and coverage may all change.'),
  q('a3-01', 'A', 'A3', 'Facility readiness', 'Which condition shows the room is not ready for finish AV installation?',
    ['Permanent power energised', 'Construction dust and open ceilings with trades still working', 'Network drops tested', 'Room secured and lockable'], 1, 'Dust ruins projectors and fans; open work exposes equipment to damage and theft. Wait or protect.'),
  q('a3-02', 'A', 'A3', 'Facility readiness', 'Who confirms that the AV circuits are installed and energised?',
    ['The AV installer by guessing', 'The electrical contractor, with the circuit identification', 'The client’s receptionist', 'The equipment supplier'], 1, 'The electrical trade provides and identifies the circuits; AV verifies they are where the drawings say before relying on them.'),
  q('a4-01', 'A', 'A4', 'Preparation', 'Why bench-test and pre-configure equipment in the shop before going to site?',
    ['To use up shop time', 'To find dead units and configuration problems where it is cheapest to fix them', 'Because site power is unreliable', 'To void the warranty sooner'], 1, 'Staging catches failures and lets programming start before site access, shortening time on site.'),
  q('a4-02', 'A', 'A4', 'Preparation', 'What should be on the install kit list besides tools and parts?',
    ['Nothing else', 'The current drawings, test equipment, labels, PPE and the contacts for site access', 'Only the client’s invoice', 'Spare cables only'], 1, 'Arrive with what you need to work safely and finish: documents, test gear, labels, PPE, access arrangements.'),

  // ---------------------------------------------------------------- B ongoing project
  q('b1-01', 'B', 'B1', 'Field reports', 'What belongs in a daily field report?',
    ['Only hours worked', 'Work completed, issues, delays and their causes, instructions received, safety events', 'The installer’s opinions of the client', 'Nothing if the day went well'], 1, 'Daily reports are the project’s factual record; a well-kept one settles disputes later.'),
  q('b1-02', 'B', 'B1', 'Field reports', 'A worker is slightly injured on site. What is required?',
    ['Nothing if they keep working', 'First aid as needed and an injury report following the company and site procedures', 'A note in the punch list', 'Tell the client next week'], 1, 'Every injury is reported through the site process, however minor; it protects the worker and the project.'),
  q('b2-01', 'B', 'B2', 'Allied trades', 'Your backboxes must be installed before the drywall is hung. Who do you coordinate with?',
    ['The painter', 'The drywall and electrical trades, through the site schedule', 'The client’s IT team', 'The equipment supplier'], 1, 'Rough-in happens with the trades who close the walls; miss the window and walls are cut later.'),
  q('b3-01', 'B', 'B3', 'Field modifications', 'A sprinkler pipe blocks the drawn projector position. What is the correct process?',
    ['Move the projector wherever it fits', 'Stop, document the conflict, and get an approved modification before proceeding', 'Ask the plumber to move the pipe', 'Leave the projector out'], 1, 'Field modifications are approved and recorded so the design still works and the as-builts are true.'),

  // ---------------------------------------------------------------- C rough-in
  q('c1-01', 'C', 'C1', 'Deinstallation', 'When removing an existing system, what should be done first?',
    ['Cut all cables at the wall', 'Confirm what is to be removed, salvaged or reused; label and document it; make circuits safe through the right trade', 'Throw everything in a skip', 'Leave old cables in the ceiling'], 1, 'Know what stays and what goes, keep a record, and leave nothing live or abandoned against the rules.'),
  q('c2-01', 'C', 'C2', 'Substructure', 'A display mount is fixed only into drywall with plastic anchors. What is wrong?',
    ['Nothing if the display is light', 'The load must go into structure or engineered backing rated for it', 'Plastic anchors are too expensive', 'Drywall is too strong'], 1, 'Mounts go into structure or blocking rated for the load, with the manufacturer’s hardware.'),
  q('c2-02', 'C', 'C2', 'Rigging', 'What does the working load limit (WLL) of a shackle mean?',
    ['The load at which it breaks', 'The maximum load it is rated to carry in service', 'Its weight', 'The load at which it bends'], 1, 'WLL is the rated service load: breaking strength divided by a design factor. Never exceed it; never use unrated hardware.', { tool: 'design-factor' }),
  q('c2-03', 'C', 'C2', 'Rigging', 'A two-leg bridle’s included angle increases from 60° to 120°. What happens to each leg’s tension?',
    ['It halves', 'It stays the same', 'It rises to equal the whole load', 'It falls to zero'], 2, 'Each leg carries W ÷ (2 cos(θ/2)): at 60° about 0.58 W, at 120° the whole W. Wider angles multiply tension.', { tool: 'two-leg-bridle', math: true }),
  q('c3-01', 'C', 'C3', 'Pulling cable', 'What is the usual maximum pulling tension for a 4-pair category cable?',
    ['5 lbf', '25 lbf (110 N)', '100 lbf', 'There is no limit'], 1, 'Structured-cabling practice limits 4-pair UTP to 25 lbf; more stretches the pairs and degrades performance.'),
  q('c3-02', 'C', 'C3', 'Pulling cable', 'What is the typical minimum bend radius for installed 4-pair UTP?',
    ['1 × the cable diameter', '4 × the cable diameter', '20 × the cable diameter', 'No minimum'], 1, 'About four times the outside diameter for UTP in place; tighter bends disturb the twists.'),
  q('c3-03', 'C', 'C3', 'Pulling cable', 'You pass cable through a fire-rated wall. What must happen to the penetration?',
    ['Nothing', 'It is firestopped with a listed system to restore the rating', 'It is taped', 'It is left open for future cables'], 1, 'Any penetration in a rated assembly must be restored with a listed firestop system.'),
  q('c3-04', 'C', 'C3', 'Pulling cable', 'Why leave a service loop at each end of a run?',
    ['To use more cable', 'To allow re-termination and equipment movement without a new pull', 'It is required for grounding', 'It improves bandwidth'], 1, 'A neat, dressed service loop allows rework and rack service.'),

  // ---------------------------------------------------------------- D install
  q('d1-01', 'D', 'D1', 'Rack', 'How is height measured in a 19-inch rack?',
    ['In inches', 'In rack units (1 RU = 1.75 in)', 'In centimeters', 'In shelves'], 1, 'One rack unit is 1.75 in (44.45 mm).', { math: true }),
  q('d1-02', 'D', 'D1', 'Rack', 'A rack has 42 RU. Devices take 3, 2, 1, 4 and 2 RU, with 1 RU vent panels between each pair. How many RU remain?',
    ['26', '28', '30', '32'], 0, '3 + 2 + 1 + 4 + 2 = 12 RU of devices, plus 4 vents between five devices = 16 RU used; 42 − 16 = 26 RU remain.', { math: true }),
  q('d2-01', 'D', 'D2', 'Rack wiring', 'Why separate power and signal cables on opposite sides of a rack?',
    ['For appearance', 'To reduce induced noise and make service easier', 'Code requires colored cables', 'To save cable ties'], 1, 'Separation keeps mains fields off signal cables and keeps the rack serviceable.'),
  q('d2-02', 'D', 'D2', 'Rack wiring', 'What is the purpose of strain relief at the rear of rack equipment?',
    ['To hold labels', 'To keep the weight of cables off the connectors', 'To ground the rack', 'To increase airflow'], 1, 'Unsupported cable weight pulls connectors loose; lacing bars and ties take the strain.'),
  q('d4-01', 'D', 'D4', 'Mounting', 'Before hanging a projector, what must be confirmed?',
    ['The lens color', 'The mount and structure are rated for the load, with a secondary safety attachment where required', 'The projector’s IP address', 'The screen size only'], 1, 'Overhead equipment is mounted to rated structure with the manufacturer’s hardware and a secondary safety where the specification or code requires it.'),
  q('d4-02', 'D', 'D4', 'Mounting', 'A ceiling speaker with a 90° conical pattern sits 7 ft above seated ears. What diameter does it cover at ear height?',
    ['7 ft', '10 ft', '14 ft', '21 ft'], 2, 'D = 2 × h × tan(45°) = 2 × 7 = 14 ft.', { math: true, tool: 'ceiling-speakers' }),
  q('d5-01', 'D', 'D5', 'Termination', 'What is the maximum untwist of pairs at an RJ45 termination for Category 5e and above?',
    ['0.5 in (13 mm)', '1 in', '2 in', 'No limit'], 0, 'Keep twists to within about 13 mm of the termination; more degrades crosstalk performance.'),
  q('d5-02', 'D', 'D5', 'Termination', 'Which connector is used for 12G-SDI?',
    ['RJ45', '75 Ω BNC', '50 Ω BNC', 'XLR'], 1, 'SDI is a 75 Ω system; use 75 Ω BNC connectors and coax rated for the data rate.'),
  q('d5-03', 'D', 'D5', 'Termination', 'A balanced line is terminated with pins 2 and 3 swapped at one end. What results?',
    ['No signal', 'The signal is polarity-inverted', 'The shield is lost', 'Phantom power stops'], 1, 'Swapping hot and cold inverts polarity; in a mix with other sources it can cancel.'),
  q('d5-04', 'D', 'D5', 'Termination', 'Which test confirms a terminated category link meets its category’s performance?',
    ['A continuity tester', 'A certification test with a cable certifier', 'A tone generator', 'A multimeter'], 1, 'Continuity proves wiring; certification measures insertion loss, crosstalk, return loss and length against the category limits.'),
  q('d6-01', 'D', 'D6', 'Network settings', 'A device has IP 10.20.30.40/24 and gateway 10.20.31.1. What is wrong?',
    ['Nothing', 'The gateway is not on the device’s subnet, so the device cannot reach other networks', 'The address is public', 'The mask is too large'], 1, 'With /24 the subnet is 10.20.30.0–255; a gateway must be on it (for example 10.20.30.1).', { math: true, tool: 'subnet' }),
  q('d6-02', 'D', 'D6', 'Network settings', 'A device shows address 169.254.12.7. What does it tell you?',
    ['It has a static address', 'It did not get a DHCP answer and assigned itself a link-local address', 'It is on the internet', 'It is multicasting'], 1, '169.254.0.0/16 is link-local (APIPA): the device asked for DHCP and got no reply.', { tool: 'subnet' }),
  q('d6-03', 'D', 'D6', 'Network settings', 'What must be set on a device besides IP address, mask and gateway to reach a server by name?',
    ['A DNS server', 'A VLAN tag on the device', 'A MAC address', 'A multicast address'], 0, 'DNS resolves names to addresses; without it only addresses work.'),
  q('d7-01', 'D', 'D7', 'Control', 'A control system talks to a display over RS-232 but gets no response. What should you check first?',
    ['The display’s brightness', 'Baud rate and settings, and the cable pinout (straight or null-modem)', 'The HDCP version', 'The speaker impedance'], 1, 'RS-232 needs matching baud rate, data bits, parity and stop bits, and the right TX/RX crossing.'),
  q('d8-01', 'D', 'D8', 'Testing', 'In what order should a new system be tested?',
    ['Everything at once at full level', 'Each cable and device, then each signal path, then the whole system against the design', 'Only the whole system', 'Only what the client asks about'], 1, 'Test from the bottom up: cables, devices, paths, then the system against the documents.'),
  q('d8-02', 'D', 'D8', 'Testing', 'Which signal is commonly used to check loudspeaker coverage and frequency response?',
    ['A 1 kHz sine only', 'Pink noise', 'Music at full level', 'White noise at maximum'], 1, 'Pink noise has equal energy per octave, matching how an RTA displays bands.'),
  q('d9-01', 'D', 'D9', 'Calibration', 'Delay is set on an under-balcony loudspeaker. What is the goal?',
    ['It plays before the main system', 'Its sound arrives just after the main system’s, so listeners localize to the stage', 'It plays at the same level as the main', 'It plays only high frequencies'], 1, 'Align to the main arrival and add a small offset so precedence keeps the image on stage.', { tool: 'delay-alignment' }),
  q('d9-02', 'D', 'D9', 'Calibration', 'A calibrated SPL meter reads 86 dB at 4 m from a loudspeaker. Ignoring the room, what would it read at 8 m?',
    ['83 dB', '80 dB', '78 dB', '43 dB'], 1, 'Doubling the distance from a point source loses about 6 dB: 86 − 6 = 80 dB.', { math: true, tool: 'inverse-square' }),
  q('d9-03', 'D', 'D9', 'Calibration', 'When calibrating a display, why use test patterns rather than content?',
    ['They look better', 'Known patterns show black level, white level, geometry and color objectively', 'They are required by HDCP', 'Content is copyrighted'], 1, 'Patterns with known values let you set brightness, contrast, sharpness and color repeatably.'),

  // ---------------------------------------------------------------- E closeout
  q('e1-01', 'E', 'E1', 'Demonstration', 'What is demonstrated to the client at closeout?',
    ['That the equipment is expensive', 'That the system performs to the specification, function by function', 'Only that it powers on', 'The programming code'], 1, 'Demonstrate against the documents, with the client’s representative, and record acceptance.'),
  q('e2-01', 'E', 'E2', 'Training', 'Which training approach suits occasional users best?',
    ['A technical lecture on signal flow', 'Hands-on practice of common tasks, with a one-page guide in the room', 'Emailing the manuals', 'No training'], 1, 'Teach the tasks they will do, let them do them, and leave a simple guide.'),
  q('e3-01', 'E', 'E3', 'Documentation', 'What are as-built drawings?',
    ['The original design drawings', 'Drawings updated to show what was actually installed, including field changes', 'Sales drawings', 'Shop drawings before approval'], 1, 'As-builts are the record for everyone who services the system later.'),
  q('e3-02', 'E', 'E3', 'Documentation', 'Which should be handed over with the as-builts?',
    ['Nothing else', 'Programming and configuration files, manuals, warranties and test results', 'The installer’s timesheets', 'The bid documents of other bidders'], 1, 'The owner needs everything required to operate, restore and service the system.'),

  // ---------------------------------------------------------------- F post-project
  q('f1-01', 'F', 'F1', 'Maintenance', 'Which belongs on a preventive maintenance checklist?',
    ['Replacing working equipment', 'Cleaning filters and fans, checking connections, firmware and configuration backups, verifying function', 'Rewriting the needs analysis', 'Changing the room layout'], 1, 'Scheduled checks keep small problems small and records current.'),
  q('f2-01', 'F', 'F2', 'Repair', 'A device fails within its warranty. What is the right process?',
    ['Repair it yourself inside', 'Record the fault and serial number, get an RMA, and restore service with a spare if available', 'Throw it away', 'Wait for the client to notice'], 1, 'Opening a device often voids warranty; use the manufacturer’s RMA process and keep the room running.'),
  q('f2-02', 'F', 'F2', 'Repair', 'After restoring a failed system, what is the final step?',
    ['Leave', 'Verify the full function with the user and record cause, fix and parts used', 'Reset everything to defaults', 'Order a second spare'], 1, 'Verify, then record: the next technician depends on the history.'),
];
