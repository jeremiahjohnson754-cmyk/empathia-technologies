/**
 * Mix the Stream: SIGNAL's flagship lab boss (founder, 12 Nov 2026, 14:40 CT): mix a church's room and its live stream on a 32-channel
 * digital console, in five rooms made for this lab only (a basement fellowship hall, a small, a medium and a large church, and a mega
 * church), each harder than the last. Everything here is a teaching model, worked out in octave bands from textbook formulas: inverse-
 * square spreading, Sabine's reverberation time, critical distance, a static compressor curve, potential acoustic gain as a feedback
 * margin, alignment delay from the speed of sound, and a K-weighted loudness estimate for the stream. It is not a measurement and not a
 * replacement for a real console or a real room, and the lab says so. No real venue, product or brand is represented. Pure.
 */

// ------------------------------------------------------------------------------------------------ bands and the arithmetic of decibels
export const BANDS = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export const BAND_LABEL = ['31', '63', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
export const NB = BANDS.length;
/** A-weighting at the octave centres (IEC 61672), for a room's dB(A). */
export const A_WEIGHT = [-39.4, -26.2, -16.1, -8.6, -3.2, 0, 1.2, 1.0, -1.1, -6.6];
/** An octave-band approximation of the K-weighting (ITU-R BS.1770) used for the stream's loudness. */
export const K_WEIGHT = [-14, -6, -2, -0.5, 0, 0, 2.5, 4, 4, 4];
export const SILENT = -120;
export const db2p = (db: number) => (db <= SILENT ? 0 : 10 ** (db / 10));
export const p2db = (p: number) => (p <= 0 ? SILENT : 10 * Math.log10(p));
/** Power sum of levels in dB: 0 dB + 0 dB = +3 dB. */
export const dbSum = (xs: number[]) => p2db(xs.reduce((a, x) => a + db2p(x), 0));
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const round1 = (x: number) => Math.round(x * 10) / 10;

// ------------------------------------------------------------------------------------------------ sources
export type Kind = 'speech' | 'vocal' | 'kick' | 'snare' | 'toms' | 'oh' | 'bass' | 'egtr' | 'agtr' | 'keys' | 'choir' | 'amb' | 'play' | 'click';
export interface SourceProfile { label: string; shape: number[]; level: number; crest: number; hpf: number; mic: boolean; ring: number; nominal: number; vocal: boolean; says: string }
const P = (label: string, shape: number[], level: number, crest: number, hpf: number, mic: boolean, ring: number, vocal: boolean, says: string): SourceProfile => {
  const norm = dbSum(shape); return { label, shape: shape.map((x) => x - norm), level, crest, hpf, mic, ring, nominal: -18 - level, vocal, says };
};
/** What each kind of input sounds like at the stagebox with the preamp at 0 dB: an octave-band shape (summed to 0 dB), its RMS level in
 *  dBFS, its crest factor (peak above RMS), the high-pass it wants, whether it is a microphone (and so can feed back), and the band it
 *  rings in first. `nominal` is the preamp gain that puts its RMS at -18 dBFS. */
export const SOURCES: Record<Kind, SourceProfile> = {
  speech: P('Pastor (headset)', [-40, -30, -14, -6, -2, 0, -2, -6, -14, -26], -52, 14, 100, true, 6, true, 'Speech: most of what matters is 1–4 kHz. Low end is mostly breath and handling noise.'),
  vocal: P('Vocal', [-40, -28, -12, -4, -1, 0, -1, -4, -10, -20], -46, 16, 100, true, 6, true, 'A handheld vocal mic. Loud singers peak far above their average.'),
  kick: P('Kick', [-6, 0, -4, -10, -16, -20, -16, -14, -20, -30], -36, 18, 30, true, 2, false, 'All weight at 50–100 Hz, a click near 3–4 kHz. Big transients.'),
  snare: P('Snare', [-30, -20, -8, -2, 0, -3, -4, -6, -10, -18], -34, 20, 80, true, 4, false, 'Body near 200 Hz, crack near 1–5 kHz; the peakiest source on stage.'),
  toms: P('Toms', [-24, -10, -2, 0, -6, -10, -12, -14, -18, -28], -40, 18, 60, true, 3, false, 'Low and boomy, with long ring.'),
  oh: P('Overheads', [-40, -30, -18, -12, -8, -6, -3, 0, 0, -4], -46, 18, 150, true, 7, false, 'Cymbals and the kit as a whole; the low end here is just bleed.'),
  bass: P('Bass (DI)', [-4, 0, -2, -6, -12, -18, -24, -30, -36, -44], -28, 12, 30, false, 0, false, 'A line-level direct box: no microphone, no feedback, all low end.'),
  egtr: P('Electric guitar', [-40, -24, -8, -2, 0, -2, -4, -10, -22, -36], -34, 12, 80, true, 5, false, 'A miked amp: mids, little true lows or highs.'),
  agtr: P('Acoustic (DI)', [-36, -20, -8, -4, -2, 0, -2, -4, -8, -18], -36, 14, 80, false, 0, false, 'A piezo pickup through a DI: bright, can boom near 200 Hz.'),
  keys: P('Keys (line)', [-14, -6, -2, 0, -2, -3, -4, -6, -10, -18], -24, 12, 40, false, 0, false, 'Line level, already loud: the preamp usually needs very little.'),
  choir: P('Choir mic', [-40, -30, -14, -6, -2, 0, -1, -4, -10, -20], -56, 14, 120, true, 5, true, 'A distant condenser over a group: quiet, so it needs gain, so it feeds back first.'),
  amb: P('Room mic (stream)', [-30, -18, -10, -6, -4, -3, -4, -6, -10, -18], -54, 10, 60, true, 4, false, 'The room and the congregation, for the stream only. Never in the mains or wedges.'),
  play: P('Playback (video)', [-12, -6, -3, -1, 0, -1, -2, -3, -6, -12], -18, 12, 30, false, 0, false, 'A laptop or video playback, already mastered and loud.'),
  click: P('Click track', [-60, -60, -50, -30, -10, 0, -6, -20, -40, -60], -16, 6, 30, false, 0, false, 'For the band’s ears only. If the room or the stream hears it, the service hears a metronome.'),
};

// ------------------------------------------------------------------------------------------------ the five rooms (made for this lab)
export type GroupKind = 'sub' | 'main' | 'array' | 'center' | 'front' | 'delay' | 'wedge';
export interface SpeakerGroup { key: string; kind: GroupKind; label: string; x: number; y: number; z: number; aim: number; spread: number; bands: [number, number]; ref: number; line?: boolean; delayable?: boolean }
export interface Room {
  key: string; name: string; tier: string; difficulty: 1 | 2 | 3 | 4 | 5; seats: number; dims: [number, number, number]; absorption: number;
  channels: number; foh: [number, number]; targetDbA: number; balcony?: number; groups: SpeakerGroup[]; inputs: Array<[Kind, string]>; traps: string[]; brief: string;
}
const wedges = (n: number, w: number): SpeakerGroup[] => Array.from({ length: n }, (_, i) => ({ key: `w${i + 1}`, kind: 'wedge' as const, label: `Wedge ${i + 1}`, x: (w * (i + 1)) / (n + 1), y: 2.2, z: 0.3, aim: -Math.PI / 2, spread: 0.9, bands: [2, 9] as [number, number], ref: 104 }));
/** Five fictional rooms, invented for this lab: none is a real venue. Dimensions in metres (width, length, height); the stage is at y = 0. */
export const ROOMS: Room[] = [
  { key: 'basement', name: 'Fellowship hall basement', tier: 'Basement', difficulty: 1, seats: 60, dims: [10, 14, 2.6], absorption: 0.27, channels: 8, foh: [5, 11], targetDbA: 84,
    groups: [{ key: 'mL', kind: 'main', label: 'Main left (on a stand)', x: 1.2, y: 1.5, z: 1.8, aim: Math.PI / 2, spread: 1.2, bands: [3, 9], ref: 112 }, { key: 'mR', kind: 'main', label: 'Main right (on a stand)', x: 8.8, y: 1.5, z: 1.8, aim: Math.PI / 2, spread: 1.2, bands: [3, 9], ref: 112 },
      { key: 'sub', kind: 'sub', label: 'Subwoofer', x: 5, y: 1, z: 0.3, aim: Math.PI / 2, spread: 3.2, bands: [0, 2], ref: 122 }, ...wedges(2, 10)],
    inputs: [['speech', 'Pastor'], ['vocal', 'Lead vocal'], ['agtr', 'Acoustic'], ['keys', 'Keys'], ['vocal', 'Harmony'], ['play', 'Laptop'], ['amb', 'Room mic'], ['vocal', 'Spare mic']],
    traps: ['The laptop’s preamp is set as if it were a microphone: it clips.', 'The low ceiling makes everything louder than it looks.'],
    brief: 'Eight channels, a low ceiling, sixty folding chairs. Get clean gain, a clear voice, and a stream that is not too quiet.' },
  { key: 'small', name: 'Small church (150 seats)', tier: 'Small church', difficulty: 2, seats: 150, dims: [12, 18, 5], absorption: 0.2, channels: 16, foh: [6, 15], targetDbA: 88,
    groups: [{ key: 'mL', kind: 'main', label: 'Main left', x: 1, y: 1.5, z: 3.4, aim: Math.PI / 2, spread: 1.1, bands: [3, 9], ref: 116 }, { key: 'mR', kind: 'main', label: 'Main right', x: 11, y: 1.5, z: 3.4, aim: Math.PI / 2, spread: 1.1, bands: [3, 9], ref: 116 },
      { key: 'sub', kind: 'sub', label: 'Subwoofer', x: 6, y: 0.8, z: 0.3, aim: Math.PI / 2, spread: 3.2, bands: [0, 2], ref: 126 },
      { key: 'cf', kind: 'center', label: 'Center fill', x: 6, y: 0.6, z: 0.6, aim: Math.PI / 2, spread: 1.4, bands: [4, 9], ref: 100, delayable: true }, ...wedges(3, 12)],
    inputs: [['speech', 'Pastor'], ['speech', 'Lectern'], ['vocal', 'Lead vocal'], ['vocal', 'BGV 1'], ['vocal', 'BGV 2'], ['agtr', 'Acoustic'], ['keys', 'Keys L'], ['keys', 'Keys R'], ['bass', 'Bass'], ['kick', 'Kick'], ['snare', 'Snare'], ['oh', 'Overheads'], ['play', 'Video'], ['amb', 'Room L'], ['amb', 'Room R'], ['click', 'Click']],
    traps: ['The click track is assigned to the main mix.', 'The center fill is not delayed to the mains.'],
    brief: 'Sixteen channels and a small band. Something on channel 16 should never reach the congregation.' },
  { key: 'medium', name: 'Medium church (400 seats)', tier: 'Medium church', difficulty: 3, seats: 400, dims: [20, 26, 7], absorption: 0.22, channels: 24, foh: [10, 20], targetDbA: 92,
    groups: [{ key: 'mL', kind: 'main', label: 'Main left', x: 2, y: 2, z: 5, aim: Math.PI / 2, spread: 1, bands: [3, 9], ref: 120 }, { key: 'mR', kind: 'main', label: 'Main right', x: 18, y: 2, z: 5, aim: Math.PI / 2, spread: 1, bands: [3, 9], ref: 120 },
      { key: 'sub', kind: 'sub', label: 'Subwoofers (pair)', x: 10, y: 1, z: 0.3, aim: Math.PI / 2, spread: 3.2, bands: [0, 2], ref: 132 },
      { key: 'cf', kind: 'center', label: 'Center fill', x: 10, y: 1, z: 6, aim: Math.PI / 2, spread: 1.2, bands: [4, 9], ref: 112, delayable: true },
      { key: 'ff', kind: 'front', label: 'Front fills', x: 10, y: 0.4, z: 0.5, aim: Math.PI / 2, spread: 1.6, bands: [4, 9], ref: 98, delayable: true }, ...wedges(4, 20)],
    inputs: [['speech', 'Pastor'], ['speech', 'Lectern'], ['vocal', 'Lead vocal'], ['vocal', 'BGV 1'], ['vocal', 'BGV 2'], ['vocal', 'BGV 3'], ['choir', 'Choir L'], ['choir', 'Choir R'], ['agtr', 'Acoustic'], ['egtr', 'Electric'], ['keys', 'Keys L'], ['keys', 'Keys R'], ['bass', 'Bass'], ['kick', 'Kick'], ['snare', 'Snare'], ['toms', 'Toms'], ['oh', 'OH L'], ['oh', 'OH R'], ['play', 'Video L'], ['play', 'Video R'], ['amb', 'Room L'], ['amb', 'Room R'], ['vocal', 'Announce'], ['click', 'Click']],
    traps: ['The choir mics need gain, and gain brings them to the edge of feedback.', 'Two fills need delays, each its own.'],
    brief: 'A full band, a choir and two fills. The choir is where it rings first.' },
  { key: 'large', name: 'Large church (1,200 seats, balcony)', tier: 'Large church', difficulty: 4, seats: 1200, dims: [30, 38, 10], absorption: 0.23, channels: 32, foh: [15, 28], targetDbA: 94, balcony: 26,
    groups: [{ key: 'aL', kind: 'array', label: 'Line array left (flown)', x: 4, y: 2, z: 8, aim: Math.PI / 2, spread: 0.8, bands: [3, 9], ref: 118, line: true }, { key: 'aR', kind: 'array', label: 'Line array right (flown)', x: 26, y: 2, z: 8, aim: Math.PI / 2, spread: 0.8, bands: [3, 9], ref: 118, line: true },
      { key: 'sub', kind: 'sub', label: 'Sub array', x: 15, y: 1, z: 0.3, aim: Math.PI / 2, spread: 2.6, bands: [0, 2], ref: 132 },
      { key: 'ff', kind: 'front', label: 'Front fills', x: 15, y: 0.4, z: 0.5, aim: Math.PI / 2, spread: 1.6, bands: [4, 9], ref: 100, delayable: true },
      { key: 'ub', kind: 'delay', label: 'Under-balcony delays', x: 15, y: 27, z: 2.6, aim: Math.PI / 2, spread: 1.6, bands: [4, 9], ref: 104, delayable: true }, ...wedges(5, 30)],
    inputs: [['speech', 'Pastor'], ['speech', 'Lectern'], ['vocal', 'Lead vocal'], ['vocal', 'BGV 1'], ['vocal', 'BGV 2'], ['vocal', 'BGV 3'], ['vocal', 'BGV 4'], ['choir', 'Choir L'], ['choir', 'Choir C'], ['choir', 'Choir R'], ['agtr', 'Acoustic'], ['egtr', 'Electric 1'], ['egtr', 'Electric 2'], ['keys', 'Keys L'], ['keys', 'Keys R'], ['keys', 'Organ'], ['bass', 'Bass'], ['kick', 'Kick'], ['snare', 'Snare top'], ['snare', 'Snare bottom'], ['toms', 'Tom 1'], ['toms', 'Tom 2'], ['oh', 'OH L'], ['oh', 'OH R'], ['play', 'Video L'], ['play', 'Video R'], ['amb', 'Room L'], ['amb', 'Room R'], ['amb', 'Crowd'], ['vocal', 'Announce'], ['vocal', 'Spare'], ['click', 'Click']],
    traps: ['A 2.2-second room: reverb added to the mains turns the words to mush.', 'The under-balcony seats hear the delays first unless they are delayed.'],
    brief: 'Thirty-two channels, a reverberant room and a balcony. The room already has all the reverb it needs.' },
  { key: 'mega', name: 'Mega church (4,000 seats)', tier: 'Mega church', difficulty: 5, seats: 4000, dims: [50, 60, 16], absorption: 0.5, channels: 32, foh: [25, 40], targetDbA: 96,
    groups: [{ key: 'aL', kind: 'array', label: 'Line array left', x: 8, y: 3, z: 13, aim: Math.PI / 2, spread: 0.8, bands: [3, 9], ref: 122, line: true }, { key: 'aC', kind: 'array', label: 'Line array center', x: 25, y: 2, z: 14, aim: Math.PI / 2, spread: 0.8, bands: [3, 9], ref: 118, line: true },
      { key: 'aR', kind: 'array', label: 'Line array right', x: 42, y: 3, z: 13, aim: Math.PI / 2, spread: 0.8, bands: [3, 9], ref: 122, line: true },
      { key: 'sub', kind: 'sub', label: 'Cardioid sub array', x: 25, y: 1.5, z: 0.4, aim: Math.PI / 2, spread: 2.4, bands: [0, 2], ref: 138 },
      { key: 'ff', kind: 'front', label: 'Front fills', x: 25, y: 0.4, z: 0.5, aim: Math.PI / 2, spread: 1.6, bands: [4, 9], ref: 102, delayable: true },
      { key: 'dt', kind: 'delay', label: 'Delay towers', x: 25, y: 34, z: 9, aim: Math.PI / 2, spread: 1.2, bands: [3, 9], ref: 114, delayable: true }, ...wedges(6, 50)],
    inputs: [['speech', 'Pastor'], ['speech', 'Lectern'], ['vocal', 'Lead vocal'], ['vocal', 'Lead 2'], ['vocal', 'BGV 1'], ['vocal', 'BGV 2'], ['vocal', 'BGV 3'], ['vocal', 'BGV 4'], ['choir', 'Choir L'], ['choir', 'Choir C'], ['choir', 'Choir R'], ['agtr', 'Acoustic'], ['egtr', 'Electric 1'], ['egtr', 'Electric 2'], ['keys', 'Keys L'], ['keys', 'Keys R'], ['keys', 'Synth'], ['bass', 'Bass'], ['kick', 'Kick'], ['snare', 'Snare'], ['toms', 'Tom 1'], ['toms', 'Tom 2'], ['oh', 'OH L'], ['oh', 'OH R'], ['play', 'Video L'], ['play', 'Video R'], ['play', 'Tracks'], ['amb', 'Room L'], ['amb', 'Room R'], ['amb', 'Crowd'], ['vocal', 'Host'], ['click', 'Click']],
    traps: ['Every scene changes what is live, on a clock.', 'The delay towers are 34 m out: a mistake there is heard by thousands.', 'Tracks are mastered hot.'],
    brief: 'The boss level: a 4,000-seat room, three arrays, delay towers and a service that moves on without you. Keep the room and the stream right through every scene.' },
];
export const roomOf = (k: string) => ROOMS.find((r) => r.key === k) || ROOMS[0]!;

// ------------------------------------------------------------------------------------------------ the console
export interface EqBand { f: number; g: number; q: number }
export interface Strip {
  kind: Kind; name: string; gain: number; hpf: number; eq: EqBand[]; comp: { on: boolean; thr: number; ratio: number; att: number; rel: number };
  mute: boolean; fader: number; main: boolean; wedge: number[]; rev: number; dly: number; stream: number;
}
export interface Fx { revTime: number; revPre: number; revMain: number; revStream: number; dlyMs: number; dlyFb: number; dlyMain: number; dlyStream: number }
export interface Mix { room: string; strips: Strip[]; main: number; sub: number; stream: number; wedgeMaster: number[]; delays: Record<string, number>; fx: Fx }
export const OFF = -90;
export const defaultEq = (): EqBand[] => [{ f: 100, g: 0, q: 1 }, { f: 400, g: 0, q: 1 }, { f: 2500, g: 0, q: 1 }, { f: 8000, g: 0, q: 1 }];
/** The console as it is handed over: every room starts unmixed, some with the room's traps already set. */
export function freshMix(roomKey: string): Mix {
  const r = roomOf(roomKey); const nW = r.groups.filter((g) => g.kind === 'wedge').length;
  const strips: Strip[] = r.inputs.map(([kind, name]) => {
    const s = SOURCES[kind]; const gain = kind === 'play' && r.key === 'basement' ? 34 : Math.round(s.nominal - 8);
    return { kind, name, gain, hpf: 0, eq: defaultEq(), comp: { on: false, thr: -12, ratio: 3, att: 10, rel: 120 }, mute: false, fader: -10, main: kind !== 'amb', wedge: Array.from({ length: nW }, () => OFF), rev: OFF, dly: OFF, stream: kind === 'amb' ? -10 : OFF };
  });
  return { room: r.key, strips, main: 0, sub: 0, stream: 0, wedgeMaster: Array.from({ length: nW }, () => 0), delays: Object.fromEntries(r.groups.filter((g) => g.delayable).map((g) => [g.key, 0])), fx: { revTime: 1.8, revPre: 20, revMain: -10, revStream: -10, dlyMs: 350, dlyFb: 25, dlyMain: OFF, dlyStream: OFF } };
}
export const LAYER = 8;
export const layersOf = (n: number) => Array.from({ length: Math.ceil(n / LAYER) }, (_, i) => [i * LAYER, Math.min(n, (i + 1) * LAYER)] as [number, number]);

// ------------------------------------------------------------------------------------------------ scenes: what is live
export type Scene = 'soundcheck' | 'worship' | 'sermon' | 'video' | 'response';
export const SCENES: Array<{ key: Scene; label: string; says: string }> = [
  { key: 'soundcheck', label: 'Soundcheck', says: 'Everyone plays and sings in turn. Set gain, high-pass and EQ.' },
  { key: 'worship', label: 'Worship', says: 'Full band, vocals, choir. Vocals on top, no feedback, a stream that sounds like being there.' },
  { key: 'sermon', label: 'Sermon', says: 'One voice. Close every mic nobody is using; the words must be clear in every seat and online.' },
  { key: 'video', label: 'Video', says: 'Playback only, mastered loud. The stream must not jump in level.' },
  { key: 'response', label: 'Response', says: 'Keys and voices quietly under the pastor: speech still on top.' },
];
const LIVE: Record<Scene, (k: Kind) => boolean> = {
  soundcheck: (k) => k !== 'click', worship: (k) => k !== 'speech' && k !== 'play', sermon: (k) => k === 'speech' || k === 'amb',
  video: (k) => k === 'play' || k === 'amb', response: (k) => k === 'speech' || k === 'keys' || k === 'vocal' || k === 'amb' || k === 'agtr',
};
/** How loud a source is in a scene relative to its full level: live sources play; silent ones are only bleed (and a click is always running). */
export const liveOffset = (scene: Scene, k: Kind) => (k === 'click' ? 0 : LIVE[scene](k) ? (scene === 'response' && k !== 'speech' ? -8 : 0) : -32);

// ------------------------------------------------------------------------------------------------ channel processing
/** High-pass at 12 dB per octave below its corner. */
export const hpfAt = (f: number, fc: number) => (fc <= 0 || f >= fc ? 0 : Math.max(-48, -12 * Math.log2(fc / f)));
/** A peaking EQ band's effect at frequency f: a bell in log frequency, width set by Q (higher Q, narrower). */
export const eqAt = (f: number, b: EqBand) => (b.g === 0 ? 0 : b.g * Math.exp(-((Math.log2(f / b.f)) ** 2) / (2 * (0.7 / Math.max(0.3, b.q)) ** 2)));
export const eqCurve = (s: Pick<Strip, 'eq' | 'hpf'>, f: number) => hpfAt(f, s.hpf) + s.eq.reduce((a, b) => a + eqAt(f, b), 0);
/** The static compressor curve: above the threshold, the output rises 1 dB for every `ratio` dB in. */
export const compOut = (inDb: number, thr: number, ratio: number) => (inDb <= thr ? inDb : thr + (inDb - thr) / Math.max(1, ratio));
export interface ChannelOut { pre: number[]; post: number[]; rms: number; peak: number; gr: number; clip: boolean; live: boolean }
export function channel(s: Strip, scene: Scene): ChannelOut {
  const src = SOURCES[s.kind]; const live = liveOffset(scene, s.kind);
  const pre = src.shape.map((sh) => src.level + s.gain + sh + live);
  const shaped = pre.map((x, b) => x + eqCurve(s, BANDS[b]!));
  const rmsIn = dbSum(shaped); const gr = s.comp.on ? rmsIn - compOut(rmsIn, s.comp.thr, s.comp.ratio) : 0;
  const post = shaped.map((x) => x - gr);
  const rms = dbSum(post); const transientKept = s.comp.on ? (s.comp.att <= 3 ? 0.15 : s.comp.att <= 15 ? 0.45 : 0.8) : 1;
  const peak = dbSum(pre) + src.crest - gr * (1 - transientKept) + Math.max(0, ...s.eq.map((b) => b.g)) * 0.5;
  return { pre, post, rms, peak, gr, clip: peak > 0, live: live > -10 };
}

// ------------------------------------------------------------------------------------------------ the room
/** Sabine: RT60 = 0.161 V / A, with A the room's absorption (surface area times the average absorption coefficient). */
export function rt60(r: Room) { const [w, l, h] = r.dims; const V = w * l * h; const S = 2 * (w * l + w * h + l * h); return 0.161 * V / (S * r.absorption); }
export const volume = (r: Room) => r.dims[0] * r.dims[1] * r.dims[2];
/** Critical distance, Dc = 0.057 √(Q V / RT60): past it the reverberant sound is louder than the direct sound. */
export const criticalDistance = (r: Room, Q = 8) => 0.057 * Math.sqrt((Q * volume(r)) / rt60(r));
export const SPEED = 343;
export const dist3 = (g: { x: number; y: number; z: number }, x: number, y: number, z = 1.2) => Math.max(0.5, Math.hypot(g.x - x, g.y - y, g.z - z));
/** Level of a speaker group at a point, relative to its 1 m level: -20 log10(d) for a point source; a line array loses -10 log10(d)
 *  in its near field (to about a third of the room) and -20 log10(d) beyond; off-axis loss from the group's dispersion. */
export function spread(g: SpeakerGroup, x: number, y: number, depth: number) {
  const d = dist3(g, x, y); const nf = depth / 3;
  const along = g.line ? (d <= nf ? -10 * Math.log10(d) : -10 * Math.log10(nf) - 20 * Math.log10(d / nf)) : -20 * Math.log10(d);
  const ang = Math.atan2(y - g.y, x - g.x); const off = Math.abs(((ang - g.aim + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  return along - (off > g.spread ? Math.min(18, (off - g.spread) * 14) : 0);
}
/** The delay a fill needs so its sound arrives just after the mains' (10 ms precedence), in ms, at the seats it covers. */
export function delayNeeded(r: Room, g: SpeakerGroup) {
  const mains = r.groups.filter((m) => m.kind === 'main' || m.kind === 'array'); const tx = g.x, ty = g.kind === 'delay' ? g.y + 6 : g.kind === 'front' ? 3 : 5;
  const dm = Math.min(...mains.map((m) => dist3(m, tx, ty))); const df = dist3(g, tx, ty); return Math.max(0, round1(((dm - df) / SPEED) * 1000 + 10));
}

// ------------------------------------------------------------------------------------------------ the whole mix
export interface Analysis {
  scene: Scene; ch: ChannelOut[]; main: number[]; mainRms: number; mainPeak: number; stream: number[]; streamLufs: number; streamPeak: number; ambRel: number; revRel: number; revMainRel: number;
  fohBand: number[]; fohDbA: number; feedback: Array<{ i: number; where: string; margin: number; ring: number }>; clarity: number; delays: Array<{ key: string; label: string; need: number; set: number; err: number }>;
  openMics: number; clickLeak: boolean; lowEnd: number; rt60: number; dc: number;
}
const wedgeRoom = (r: Room) => r.groups.filter((g) => g.kind === 'wedge');
/** Feedback margin of a microphone: how many dB of gain are left before the loop through a loudspeaker reaches unity. Every dB of preamp
 *  over its nominal, of send or fader, takes a dB away; a cut at the frequency it rings in gives it back. */
export function feedbackMargins(r: Room, m: Mix): Analysis['feedback'] {
  const out: Analysis['feedback'] = []; const base: Record<string, number> = { speech: 6, vocal: 8, choir: -2, amb: -8, kick: 16, snare: 14, toms: 14, oh: 4, egtr: 12 };
  const mainBase = (k: Kind) => (k === 'choir' ? 3 : k === 'speech' ? 8 : 10) + r.difficulty * 1.2 - (rt60(r) - 1) * 2;
  m.strips.forEach((s, i) => {
    const src = SOURCES[s.kind]; if (!src.mic || s.mute) return; const over = s.gain - src.nominal; const cut = -Math.min(0, eqAt(BANDS[src.ring]!, { ...s.eq.reduce((a, b) => (Math.abs(Math.log2(b.f / BANDS[src.ring]!)) < Math.abs(Math.log2(a.f / BANDS[src.ring]!)) ? b : a)) }));
    s.wedge.forEach((w, j) => { if (w <= OFF + 1) return; out.push({ i, where: wedgeRoom(r)[j]?.label || `Wedge ${j + 1}`, margin: round1((base[s.kind] ?? 10) - over - w - (m.wedgeMaster[j] || 0) + cut), ring: src.ring }); });
    if (s.main && s.fader > OFF + 1) out.push({ i, where: 'Main PA', margin: round1(mainBase(s.kind) - over - s.fader - m.main + cut), ring: src.ring });
  });
  return out;
}
export function analyse(m: Mix, scene: Scene): Analysis {
  const r = roomOf(m.room); const ch = m.strips.map((s) => channel(s, scene)); const on = (s: Strip, x: number) => (s.mute ? OFF : x);
  const toMain = ch.map((c, i) => { const s = m.strips[i]!; return s.main ? c.post.map((x) => on(s, x + s.fader)) : c.post.map(() => SILENT); });
  const revIn = BANDS.map((_, b) => dbSum(ch.map((c, i) => on(m.strips[i]!, c.post[b]! + m.strips[i]!.fader + m.strips[i]!.rev))));
  const revOut = revIn.map((x, b) => x - 4 + (b < 3 ? -6 : b > 7 ? -4 : 0) + 10 * Math.log10(Math.max(0.3, m.fx.revTime)));
  const dlyIn = BANDS.map((_, b) => dbSum(ch.map((c, i) => on(m.strips[i]!, c.post[b]! + m.strips[i]!.fader + m.strips[i]!.dly))));
  const dlyOut = dlyIn.map((x) => x - 3 + 10 * Math.log10(1 / (1 - Math.min(0.9, m.fx.dlyFb / 100))));
  const main = BANDS.map((_, b) => dbSum([...toMain.map((x) => x[b]!), revOut[b]! + m.fx.revMain, dlyOut[b]! + m.fx.dlyMain]) + m.main);
  const streamDry = BANDS.map((_, b) => dbSum(ch.map((c, i) => on(m.strips[i]!, c.post[b]! + m.strips[i]!.fader + m.strips[i]!.stream))));
  const amb = BANDS.map((_, b) => dbSum(ch.map((c, i) => (m.strips[i]!.kind === 'amb' ? on(m.strips[i]!, c.post[b]! + m.strips[i]!.fader + m.strips[i]!.stream) : SILENT))));
  const revS = revOut.map((x) => x + m.fx.revStream); const dlyS = dlyOut.map((x) => x + m.fx.dlyStream);
  const stream = BANDS.map((_, b) => dbSum([streamDry[b]!, revS[b]!, dlyS[b]!]) + m.stream);
  const lufs = (xs: number[]) => round1(p2db(xs.reduce((a, x, b) => a + db2p(x + K_WEIGHT[b]!), 0)) - 0.7);
  const streamLufs = lufs(stream); const streamRms = dbSum(stream); const mainRms = dbSum(main);
  const peakOf = (route: (i: number) => number) => Math.max(SILENT, ...ch.map((c, i) => (m.strips[i]!.mute ? SILENT : c.peak + route(i))));
  const streamPeak = round1(Math.max(peakOf((i) => m.strips[i]!.fader + m.strips[i]!.stream + m.stream), streamRms + 9));
  const mainPeak = round1(Math.max(peakOf((i) => (m.strips[i]!.main ? m.strips[i]!.fader + m.main : SILENT)), mainRms + 9));
  // the room at the mix position
  const [rw, rl] = r.dims; const [fx, fy] = r.foh;
  const fohBand = BANDS.map((_, b) => {
    const parts = r.groups.filter((g) => g.kind !== 'wedge' && b >= g.bands[0] && b <= g.bands[1]).map((g) => {
      const drive = g.kind === 'sub' ? main[b]! + m.sub : main[b]!; return drive + g.ref + spread(g, fx, fy, rl);
    });
    const direct = dbSum(parts); const revField = direct + 20 * Math.log10(Math.max(1, Math.hypot(fx - rw / 2, fy) / criticalDistance(r))) - 3;
    return dbSum([direct, revField]);
  });
  const fohDbA = round1(dbSum(fohBand.map((x, b) => x + A_WEIGHT[b]!)));
  // speech clarity in the mains: the vocals' 1–4 kHz against everything else there
  const isVox = (i: number) => SOURCES[m.strips[i]!.kind].vocal; const sb = [5, 6, 7];
  const vox = dbSum(sb.flatMap((b) => toMain.filter((_, i) => isVox(i) && ch[i]!.live).map((x) => x[b]!)));
  const rest = dbSum(sb.flatMap((b) => [...toMain.filter((_, i) => !isVox(i) || !ch[i]!.live).map((x) => x[b]!), revOut[b]! + m.fx.revMain + m.main]));
  const clarity = round1(vox - rest - (rt60(r) > 1.6 ? (rt60(r) - 1.6) * 4 : 0));
  const delays = r.groups.filter((g) => g.delayable).map((g) => { const need = delayNeeded(r, g); const set = m.delays[g.key] ?? 0; return { key: g.key, label: g.label, need, set, err: round1(set - need) }; });
  const openMics = m.strips.filter((s, i) => SOURCES[s.kind].mic && s.kind !== 'amb' && !s.mute && !ch[i]!.live).length;
  const ci = m.strips.findIndex((s) => s.kind === 'click'); const clickLeak = ci >= 0 && !m.strips[ci]!.mute && ((m.strips[ci]!.main && m.strips[ci]!.fader > -60) || m.strips[ci]!.stream > -60);
  const lowEnd = round1(dbSum(fohBand.slice(0, 3)) - dbSum(fohBand.slice(4, 8)));
  return { scene, ch, main, mainRms, mainPeak, stream, streamLufs, streamPeak, ambRel: round1(dbSum(amb) + m.stream - streamRms), revRel: round1(dbSum(revS) + m.stream - streamRms), revMainRel: round1(dbSum(revOut.map((x) => x + m.fx.revMain)) - dbSum(toMain.flatMap((x) => x))),
    fohBand, fohDbA, feedback: feedbackMargins(r, m), clarity, delays, openMics, clickLeak, lowEnd, rt60: round1(rt60(r)), dc: round1(criticalDistance(r)) };
}

// ------------------------------------------------------------------------------------------------ scoring: the goals of each scene
export interface Goal { key: string; label: string; ok: boolean; value: string; why: string; weight: number }
export function goals(m: Mix, a: Analysis): Goal[] {
  const r = roomOf(m.room); const live = a.ch.map((c, i) => ({ c, s: m.strips[i]! })).filter((x) => x.c.live && !x.s.mute);
  const hot = live.filter((x) => x.c.peak > -3).length, cold = live.filter((x) => x.c.peak < -24).length, clips = a.ch.filter((c, i) => c.clip && !m.strips[i]!.mute).length;
  const needHpf = live.filter((x) => SOURCES[x.s.kind].hpf >= 80 && x.s.hpf < SOURCES[x.s.kind].hpf * 0.7).length;
  const worstFb = a.feedback.length ? Math.min(...a.feedback.map((f) => f.margin)) : 99;
  const vComp = live.filter((x) => SOURCES[x.s.kind].vocal && x.s.comp.on && x.c.gr >= 2 && x.c.gr <= 10).length, vAll = live.filter((x) => SOURCES[x.s.kind].vocal).length;
  const clarityNeed = a.scene === 'sermon' || a.scene === 'response' ? 10 : 3;
  const G: Goal[] = [
    { key: 'gain', label: 'Gain staging', ok: clips === 0 && hot === 0 && cold === 0, value: `${clips} clipping · ${hot} too hot · ${cold} too quiet`, why: 'Every live channel peaks between -24 and -3 dBFS: loud enough to sit above the noise, with headroom for the moment it gets louder.', weight: 15 },
    { key: 'hpf', label: 'High-pass', ok: needHpf === 0, value: `${needHpf} live channel${needHpf === 1 ? '' : 's'} without one`, why: 'Voices and guitars carry nothing useful below 80–100 Hz, only rumble, breath and stage boom that muddy the low end.', weight: 6 },
    { key: 'feedback', label: 'Feedback margin', ok: worstFb >= 3, value: a.feedback.length ? `worst ${worstFb} dB` : 'no open mic loops', why: 'Every microphone keeps at least 3 dB before it rings: through the wedges and through the mains. Cut the ring frequency or bring the send down.', weight: 15 },
    ...(a.scene === 'video' ? [] : [{ key: 'clarity', label: 'Words on top', ok: a.clarity >= clarityNeed, value: `${a.clarity} dB (need ${clarityNeed})`, why: 'In the mains, the voices’ 1–4 kHz sits above everything else there; in a long room, reverberation eats into it.', weight: 15 }]),
    { key: 'spl', label: 'Room level', ok: Math.abs(a.fohDbA - (a.scene === 'sermon' ? r.targetDbA - 8 : r.targetDbA)) <= 4, value: `${a.fohDbA} dB(A) at the mix position (target ${a.scene === 'sermon' ? r.targetDbA - 8 : r.targetDbA})`, why: 'Loud enough to fill the room, not loud enough to hurt: the target depends on the room and the moment.', weight: 8 },
    { key: 'lufs', label: 'Stream loudness', ok: Math.abs(a.streamLufs + 16) <= 1.5, value: `${a.streamLufs} LUFS (target -16 ± 1.5)`, why: 'People at home hear the stream bus, not the room: it needs its own level, held steady from scene to scene.', weight: 12 },
    { key: 'tp', label: 'Stream peaks', ok: a.streamPeak <= -1, value: `${a.streamPeak} dBTP (limit -1)`, why: 'Peaks above -1 dB distort when the stream is encoded.', weight: 5 },
    { key: 'amb', label: 'Room in the stream', ok: a.ambRel >= -20 && a.ambRel <= -8, value: `${a.ambRel} dB of the stream`, why: 'Close mics alone sound like a studio: a little of the room mics makes the stream sound like being there.', weight: 5 },
    { key: 'click', label: 'Click stays with the band', ok: !a.clickLeak, value: a.clickLeak ? 'the click is in the mains or the stream' : 'only in the band’s ears', why: 'The click track is for the musicians’ monitors only.', weight: 6 },
    { key: 'open', label: 'Unused mics closed', ok: a.openMics <= (a.scene === 'worship' || a.scene === 'soundcheck' ? 99 : 1), value: `${a.openMics} open and not in use`, why: 'Every open mic adds room noise and brings feedback closer. In a sermon, close the band and choir.', weight: 6 },
  ];
  if (vAll) G.push({ key: 'comp', label: 'Voices compressed', ok: vComp >= Math.ceil(vAll / 2), value: `${vComp} of ${vAll} voices with 2–10 dB of gain reduction`, why: 'A compressor evens a voice out so the quiet words carry and the loud ones do not jump; 3–6 dB is a good start.', weight: 5 });
  if (a.delays.length) G.push({ key: 'delay', label: 'Fills aligned', ok: a.delays.every((d) => Math.abs(d.err) <= 3), value: a.delays.map((d) => `${d.label} ${d.set} ms (needs ${d.need})`).join(' · '), why: 'A fill closer to the listener must wait for the mains’ sound: delay = extra distance ÷ 343 m/s, plus about 10 ms.', weight: 8 });
  if (a.rt60 > 1.6) G.push({ key: 'revmain', label: 'No reverb in a live room', ok: a.revMainRel <= -18, value: `${a.revMainRel} dB of the mains`, why: `This room already rings for ${a.rt60} s. Adding reverb to the mains blurs the words; give the reverb to the stream.`, weight: 6 });
  else if (a.scene !== 'video') G.push({ key: 'revstream', label: 'Reverb for the stream', ok: a.revRel >= -22 && a.revRel <= -10, value: `${a.revRel} dB of the stream`, why: 'The stream hears close mics, which sound dry; a little reverb on the stream puts the voices back in a room.', weight: 5 });
  if (a.scene !== 'sermon') G.push({ key: 'low', label: 'Low end in balance', ok: a.lowEnd >= -6 && a.lowEnd <= 6, value: `${a.lowEnd} dB lows over mids`, why: 'Subs and mains together: some weight under the music, never a boom that hides the words.', weight: 4 });
  return G;
}
export function score(gs: Goal[]) { const t = gs.reduce((a, g) => a + g.weight, 0); return Math.round((100 * gs.reduce((a, g) => a + (g.ok ? g.weight : 0), 0)) / t); }
export const PASS = 75;
/** The scenes each room is played through; the boss (mega) is played on a clock. */
export const sceneOrder = (r: Room): Scene[] => (r.difficulty <= 1 ? ['soundcheck', 'worship', 'sermon'] : r.difficulty <= 3 ? ['soundcheck', 'worship', 'sermon', 'video'] : ['soundcheck', 'worship', 'sermon', 'video', 'response']);
export const BOSS_SECONDS = 75;

// ------------------------------------------------------------------------------------------------ the formulas the lab shows, with numbers
export function calculations(m: Mix, a: Analysis, sel: number) {
  const r = roomOf(m.room); const s = m.strips[sel]; const c = a.ch[sel]; const [w, l, h] = r.dims; const S = 2 * (w * l + w * h + l * h);
  const out: Array<{ name: string; eq: string; value: string }> = [
    { name: 'Reverberation time (Sabine)', eq: 'RT60 = 0.161 V / (S ᾱ)', value: `0.161 × ${volume(r)} m³ / (${Math.round(S)} m² × ${r.absorption}) = ${a.rt60} s` },
    { name: 'Critical distance', eq: 'Dc = 0.057 √(Q V / RT60)', value: `0.057 × √(8 × ${volume(r)} / ${a.rt60}) = ${a.dc} m; the mix position is ${round1(Math.hypot(r.foh[0] - w / 2, r.foh[1]))} m from the stage` },
    { name: 'Inverse-square law', eq: 'L₂ = L₁ − 20 log₁₀(d₂ / d₁)', value: `each doubling of distance from a point source: −6 dB; from a line array in its near field: −3 dB` },
  ];
  if (s && c) {
    out.push({ name: `Gain staging (${s.name})`, eq: 'level = source + preamp gain', value: `${SOURCES[s.kind].level} dBFS + ${s.gain} dB = ${round1(dbSum(c.pre))} dBFS RMS, peaks ${round1(c.peak)} dBFS` });
    if (s.comp.on) out.push({ name: 'Compressor', eq: 'out = T + (in − T) / R', value: `${round1(dbSum(c.post) + c.gr)} dB in, T ${s.comp.thr}, R ${s.comp.ratio}:1 → ${round1(dbSum(c.post))} dB out, ${round1(c.gr)} dB of gain reduction` });
  }
  for (const d of a.delays) out.push({ name: `Delay: ${d.label}`, eq: 't = Δd / 343 m/s + 10 ms', value: `needs ${d.need} ms; set ${d.set} ms (${d.err >= 0 ? '+' : ''}${d.err})` });
  out.push({ name: 'Delay effect in time', eq: 'repeat = 60 000 / BPM per beat', value: `${m.fx.dlyMs} ms = one beat at ${Math.round(60000 / Math.max(1, m.fx.dlyMs))} BPM` });
  out.push({ name: 'Adding levels', eq: 'L = 10 log₁₀(Σ 10^(Lᵢ/10))', value: 'two equal sources together are +3 dB, not double the decibels' });
  return out;
}
