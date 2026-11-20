/**
 * Harborlight Stadium — the venue-side model: signal chains with device passports, the run of show, modelled crowd acoustics, and the
 * operations queue. Fictional and synthetic; device positions carry a class template, never an invented make, model or serial.
 * Loaded only for the production, engineering and operations journeys.
 */
import type { ChainNode, Work } from '../kit.js';

const p = (...rows: [string, string][]) => rows;
export const CHAINS: Record<'pa' | 'broadcast', { label: string; nodes: ChainNode[] }> = {
  pa: { label: 'Bowl public address: announcer to loudspeakers', nodes: [
    { id: 'pa-mic', label: 'Announcer microphone', klass: 'Wired dynamic microphone', stage: 'Source · announce booth', link: 'Analogue balanced, 1 pair', evidence: 'DECLARED', state: 'Nominal', passport: p(['Tag', 'HLS-PA-MIC-01'], ['Owner', 'Venue AV'], ['Last check', 'Pre-event line check: simulated pass']) },
    { id: 'pa-io', label: 'Booth stage box', klass: 'Networked audio I/O, 16 in / 8 out', stage: 'Conversion · announce booth', link: 'Audio over IP, primary and secondary network', evidence: 'DECLARED', state: 'Nominal', passport: p(['Tag', 'HLS-PA-IO-02'], ['Network', 'Audio VLAN, redundant'], ['Power', 'UPS-backed circuit B4']) },
    { id: 'pa-dsp', label: 'Bowl audio processor', klass: 'Audio DSP, matrix and loudspeaker management', stage: 'Processing · rack room 2', link: 'Audio over IP to amplifier rooms', evidence: 'MODELED', state: 'Nominal', passport: p(['Tag', 'HLS-PA-DSP-01'], ['Preset', 'Match day, bowl + concourse'], ['Baseline', 'Commissioning baseline: not in this demonstration']) },
    { id: 'pa-amp', label: 'East stand amplifiers', klass: 'Networked power amplifier, 4 channel', stage: 'Amplification · amp room east', link: 'Loudspeaker cable, 8 runs', evidence: 'DECLARED', state: 'Degraded', passport: p(['Tag', 'HLS-PA-AMP-E3'], ['Note', 'Channel 3 reports a load out of tolerance (simulated)'], ['Work order', 'WO-2207, see Venue Operations']) },
    { id: 'pa-spk', label: 'East stand loudspeakers', klass: 'Weatherised line-array element', stage: 'Output · east canopy', evidence: 'UNKNOWN', state: 'Unknown', passport: p(['Tag', 'HLS-PA-LS-E3'], ['Coverage', 'Sections 131–132'], ['Note', 'No measurement position reports for this zone']) },
  ] },
  broadcast: { label: 'Broadcast video: cameras to programme output', nodes: [
    { id: 'bc-cam', label: 'Camera position 1 (high wide)', klass: 'System camera with long lens', stage: 'Source · west gantry', link: 'Fibre, hybrid camera cable', evidence: 'DECLARED', state: 'Nominal', passport: p(['Tag', 'HLS-BC-CAM-01'], ['Owner', 'Production partner (fictional)'], ['Rights', 'Footage needs source permission; none is held here']) },
    { id: 'bc-ccu', label: 'Camera control', klass: 'Camera control unit', stage: 'Control · broadcast compound', link: 'SDI 12G', evidence: 'DECLARED', state: 'Nominal', passport: p(['Tag', 'HLS-BC-CCU-01'], ['Sync', 'Locked to house reference (declared)']) },
    { id: 'bc-rtr', label: 'Video router', klass: 'Hybrid SDI / IP video router', stage: 'Routing · broadcast compound', link: 'IP video, redundant paths', evidence: 'MODELED', state: 'Nominal', passport: p(['Tag', 'HLS-BC-RTR-01'], ['Paths', 'Main and backup, modelled from the routing table']) },
    { id: 'bc-sw', label: 'Vision switcher', klass: 'Production switcher, 2 M/E', stage: 'Production · gallery', link: 'Programme, clean feed', evidence: 'DECLARED', state: 'Nominal', passport: p(['Tag', 'HLS-BC-SW-01'], ['Operator', 'Director (role, not a person)']) },
    { id: 'bc-enc', label: 'Programme encoder', klass: 'Contribution encoder', stage: 'Output · broadcast compound', link: 'To the scoreboard processor and to distribution', evidence: 'UNAVAILABLE', state: 'Unknown', passport: p(['Tag', 'HLS-BC-ENC-01'], ['Note', 'No encoder source is connected in this demonstration']) },
    { id: 'bc-led', label: 'Scoreboard processor', klass: 'LED video processor', stage: 'Output · scoreboard', evidence: 'DECLARED', state: 'Nominal', passport: p(['Tag', 'HLS-LED-PRC-01'], ['Canvas', 'North scoreboard']) },
  ] },
};

export const RUN_OF_SHOW: { at: string; cue: string; source: string; state: 'Done' | 'Next' | 'Later' }[] = [
  { at: '−30:00', cue: 'Doors film and safety announcement', source: 'Playback A, announcer', state: 'Done' },
  { at: '−05:00', cue: 'Teams enter', source: 'Camera 1, camera 3, bowl music', state: 'Done' },
  { at: '00:00', cue: 'Kick-off', source: 'Camera 1, crowd microphones', state: 'Next' },
  { at: '+22:00', cue: 'Sponsor read (fictional sponsor)', source: 'Announcer, scoreboard graphic 4', state: 'Later' },
  { at: '+45:00', cue: 'Half-time show', source: 'Playback B, camera 2', state: 'Later' },
];
/** Crowd acoustics per stand: LAeq over one minute and LAFmax, as separate metrics. MODELED: there is no calibrated sensor here. */
export const ACOUSTICS: { zone: string; laeq: number | null; lafmax: number | null; note?: string }[] = [
  { zone: 'North stand', laeq: 92, lafmax: 104 }, { zone: 'South stand', laeq: 95, lafmax: 108 }, { zone: 'West stand', laeq: 89, lafmax: 101 },
  { zone: 'East stand', laeq: null, lafmax: null, note: 'No measurement position: a gap in coverage, so no value is given' },
];
export const GATES: { gate: string; state: string; queue: string; age: number }[] = [
  { gate: 'Gate A', state: 'Open', queue: 'Short', age: 6 }, { gate: 'Gate B', state: 'Open', queue: 'Short', age: 6 }, { gate: 'Gate C', state: 'Open', queue: 'Long', age: 4 }, { gate: 'Gate D', state: 'Open', queue: 'Medium', age: 9 },
];
export const WORK: Work[] = [
  { id: 'WO-2207', title: 'East stand amplifier channel 3: load out of tolerance', where: 'Amp room east', priority: 'High', step: 2, disruptive: true, by: 'AV / IT Engineer' },
  { id: 'WO-2208', title: 'Accessible restroom east: door closer failed', where: 'East concourse', priority: 'High', step: 1, by: 'Guest Services' },
  { id: 'WO-2209', title: 'South Counter: no status reported since doors', where: 'South concourse', priority: 'Medium', step: 0, by: 'Venue Operations Lead' },
  { id: 'WO-2210', title: 'Concourse display 14: frozen image', where: 'North concourse', priority: 'Low', step: 3, by: 'Guest Services' },
];
