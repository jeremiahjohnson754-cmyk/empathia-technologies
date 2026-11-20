/**
 * BUILD IT, as the reference's chal_build.js has it. Pick the gear (some of it is a joke: instant fail), then the settings that work
 * together. Home studio: Sabine RT60 with textbook absorption coefficients (125 Hz · 500 Hz · 2 kHz), axial room modes, round-trip latency.
 * Game stream: bits per pixel, upload headroom, encoder load, mix peak, lip sync (EBU R37 at L2, ATSC IS-191 at L3+). Wireless plan:
 * carrier spacing and third-/fifth-order intermodulation. Spacing and guard values are typical coordination practice, not a regulation.
 */
import { round, type Challenge, type CheckItem, type Control, type CState, type Readout, type Result } from './core.js';

export interface GearOpt { id: string; t: string; icon: string; v: 'ok' | 'soft' | 'fail'; joke?: string; why?: string; must?: boolean; lat?: number; k?: number }
export interface GearSlot { key: string; label: string; opts: GearOpt[]; optional?: boolean; w?: number; want?: string }
export const slotControls = (slots: GearSlot[]): Control[] => slots.map((sl) => ({ kind: 'slots', key: sl.key, label: sl.label, options: sl.opts.map((o) => ({ id: o.id, label: `${o.icon} ${o.t}` })) }));
/** Joke gear is an instant failure; a soft choice becomes a failed check with its reason; an empty row is a must-pass failure. */
export function gearCheck(slots: GearSlot[], st: CState, c: CheckItem[]): Result | null {
  for (const sl of slots) { const o = sl.opts.find((x) => x.id === st[sl.key]);
    if (!o) { if (!sl.optional) c.push({ ok: false, w: 2, must: true, label: `${sl.label}: nothing chosen`, why: 'Every part of the chain has to exist.' }); continue; }
    if (o.v === 'fail') return { instant: { title: `${o.t} as the ${sl.label.toLowerCase()}`, joke: o.joke || '', why: o.why || '' } };
    c.push({ ok: o.v !== 'soft', w: sl.w || 1.5, must: !!o.must, label: sl.label, got: o.t, ...(o.v === 'soft' && sl.want ? { want: sl.want } : {}), why: o.why || '' }); }
  return null;
}

// ------------------------------------------------------------------------------------------------------------------- home studio
const ABS: Record<string, number[]> = { wall: [0.29, 0.05, 0.07], wood: [0.15, 0.1, 0.06], carpet: [0.08, 0.57, 0.71], rug: [0.05, 0.35, 0.55], panel: [0.2, 0.95, 0.95], trap: [0.65, 0.99, 0.95], curtain: [0.14, 0.55, 0.7], egg: [0.03, 0.08, 0.2], glass: [0.35, 0.18, 0.07], door: [0.14, 0.06, 0.1] };
const SAB: Record<string, number[]> = { sofa: [0.6, 1.4, 1.6], shelf: [0.3, 0.6, 0.8], person: [0.2, 0.45, 0.5] };
export const ROOM = { Lx: 3.5, Ly: 3.0, Lz: 2.5 };
export function room(st: CState) {
  const { Lx, Ly, Lz } = ROOM, V = Lx * Ly * Lz, floor = Lx * Ly, ceil = floor, wallsAll = 2 * (Lx + Ly) * Lz, win = 1.5, door = 1.8, pA = 0.72, panels = Number(st['panels']), traps = Number(st['traps']), egg = !!st['egg'];
  const walls = wallsAll - win - door - (panels + traps) * pA - (egg ? 6 : 0), S = floor + ceil + wallsAll;
  return [0, 1, 2].map((b) => {
    let A = walls * ABS['wall']![b]! + ceil * ABS['wall']![b]! + door * ABS['door']![b]! + (st['curtain'] ? 3 * ABS['curtain']![b]! + Math.max(0, win - 3) : win * ABS['glass']![b]!) + panels * pA * ABS['panel']![b]! + traps * pA * ABS['trap']![b]! + (egg ? 6 * ABS['egg']![b]! : 0);
    A += st['floor'] === 'carpet' ? floor * ABS['carpet']![b]! : st['floor'] === 'rug' ? 4 * ABS['rug']![b]! + (floor - 4) * ABS['wood']![b]! : floor * ABS['wood']![b]!;
    A += (st['sofa'] ? SAB['sofa']![b]! : 0) + (st['shelf'] ? SAB['shelf']![b]! : 0) + SAB['person']![b]!;
    const am = Math.min(0.95, A / S); return { A, rt: (0.161 * V) / A, ey: (0.161 * V) / (-S * Math.log(1 - am)), am };
  });
}
export const roomModes = () => [ROOM.Lx, ROOM.Ly, ROOM.Lz].map((L) => [1, 2, 3, 4, 5].map((n) => (343 * n) / (2 * L)).filter((f) => f <= 300));
export const latency = (st: CState) => ((2 * Number(st['buf'])) / Number(st['fs'])) * 1000 + 2;
export const STUDIO_SLOTS: GearSlot[] = [
  { key: 'iface', label: 'Audio interface', opts: [
    { id: 'i2', t: '2-in/2-out USB audio interface (mic preamps, 48 V phantom, headphone out)', icon: '🎚', v: 'ok' },
    { id: 'i8', t: '8-input rack interface', icon: '🗄', v: 'ok', why: 'Works. You paid for six inputs you won’t use today.' },
    { id: 'mouse', t: 'A computer mouse', icon: '🖱', v: 'fail', joke: 'The mouse is the one thing on the desk guaranteed not to record your voice.', why: 'An audio interface contains microphone preamps (to raise millivolts to line level), an analogue-to-digital converter and a headphone amplifier. A mouse contains a button, a wheel and optimism.' },
    { id: 'hub', t: 'A USB hub', icon: '🔌', v: 'fail', joke: 'Plenty of ports. No ears.', why: 'A hub only passes data between USB devices. There’s no preamp and no converter inside to turn a microphone’s signal into numbers.' },
    { id: 'tv', t: 'A smart TV', icon: '📺', v: 'fail', joke: 'Big screen, eleven inputs, none of them for a microphone. It will tell you the weather.', why: 'Its inputs are for pictures. You need microphone preamps and converters.' }] },
  { key: 'mic', label: 'Microphone', opts: [
    { id: 'ldc', t: 'Large-diaphragm condenser (cardioid, needs 48 V phantom)', icon: '🎙', v: 'ok' },
    { id: 'dyn', t: 'Dynamic cardioid vocal mic', icon: '🎤', v: 'ok' },
    { id: 'lap', t: 'The laptop’s built-in mic', icon: '💻', v: 'soft', why: 'It works — and hears the laptop fan, the keyboard and the whole room. Fine for a voice memo, not a vocal take.' },
    { id: 'smoke', t: 'A smoke detector', icon: '🚨', v: 'fail', joke: 'It has a grille and it lives on the ceiling. That’s where the resemblance ends.', why: 'It detects smoke, not sound. Leave it on the ceiling — it’s there to keep you alive.' },
    { id: 'bt', t: 'Bluetooth earbuds’ built-in mic', icon: '🎧', v: 'fail', joke: 'Your vocal, now available in phone-call quality.', why: 'Bluetooth headset mode sends the mic as narrow-band, heavily compressed call audio (often a 16 kHz sample rate) with 100–200 ms of delay. It can’t make a studio take.' }] },
  { key: 'comp', label: 'Computer', opts: [
    { id: 'lapt', t: 'Laptop or desktop: recent CPU, 16 GB RAM, SSD', icon: '🖥', v: 'ok' },
    { id: 'old', t: 'A 12-year-old netbook with a spinning hard drive', icon: '🐢', v: 'soft', why: 'It might record two tracks. Any more and it clicks, drops out and freezes on the best take of your life.' },
    { id: 'mouse2', t: 'A computer mouse', icon: '🖱', v: 'fail', joke: 'You’ve bought the part of the computer that clicks.', why: 'The rest of the computer is traditionally attached. The recording software, the storage and the processor all live in the computer itself.' }] },
  { key: 'daw', label: 'Recording software', opts: [
    { id: 'daw', t: 'A digital audio workstation (multitrack recorder and editor)', icon: '🎛', v: 'ok' },
    { id: 'free', t: 'A free, open-source multitrack recorder', icon: '🆓', v: 'ok' },
    { id: 'sheet', t: 'A spreadsheet', icon: '📊', v: 'fail', joke: 'It has rows, columns and — if you squint — faders.', why: 'It cannot record a single sample. A DAW records, edits and mixes multitrack audio.' },
    { id: 'call', t: 'A video-call app', icon: '📞', v: 'fail', joke: 'Your vocal has been noise-suppressed into a ghost.', why: 'Call apps are built to make speech survive a bad network: noise suppression, automatic gain and echo cancellation change your voice on purpose, and they record one mixed track.' }] },
  { key: 'mon', label: 'Monitoring while you sing', opts: [
    { id: 'closed', t: 'Closed-back headphones', icon: '🎧', v: 'ok' },
    { id: 'open', t: 'Open-back headphones', icon: '🎧', v: 'soft', why: 'They leak: the backing track and click bleed into a sensitive microphone.' },
    { id: 'spk', t: 'Studio monitors (speakers) only', icon: '🔈', v: 'soft', why: 'Perfect for mixing. While you record, the speakers play straight into the microphone.' },
    { id: 'bt2', t: 'Bluetooth earbuds', icon: '🦷', v: 'fail', joke: 'You are now singing a duet with yourself, a beat late.', why: 'Bluetooth audio adds roughly 100–300 ms of delay. You hear the track late and sing behind it. Use wired headphones.' }] },
  { key: 'cable', label: 'Mic to interface', opts: [
    { id: 'xlr', t: 'XLR microphone cable', icon: '〰', v: 'ok' },
    { id: 'hose', t: 'A garden hose', icon: '🟢', v: 'fail', joke: 'Technically an acoustic waveguide. Practically, a hose.', why: 'A microphone needs a balanced, shielded three-conductor cable (XLR): two signal wires in opposite polarity so interference cancels, plus a shield.' },
    { id: 'spkc', t: 'A speaker cable', icon: '🔗', v: 'fail', joke: 'Heavy, orange, wrong.', why: 'Speaker cable is two heavy unshielded conductors for amplifier power, with the wrong connectors. A mic’s tiny balanced signal needs XLR.' }] },
];
const RT = (lv: number) => (lv >= 3 ? [0.2, 0.4] : lv === 2 ? [0.2, 0.45] : [0.15, 0.6]);
const LAT = [0, 20, 12, 10, 10];
export const BUILD_STUDIO: Challenge = {
  id: 'build-studio', mode: 'build', icon: '🏠', title: 'Build a home recording studio', time: 180, clock: 'until the singer arrives', formula: 'RT60 = 0.161 × V ÷ A (A = Σ area × absorption coefficient)',
  brief: (lv) => `A spare bedroom — 3.5 × 3.0 × 2.5 m, drywall, a wooden floor, one window — has to record a singer. Pick the gear, treat the room and set the recorder. Wrong box, instant fail; soft choices cost points. ${['', 'Get a working chain and a room that isn’t an echo chamber.', 'A proper vocal room: reverb time 0.20–0.45 s in the mids and highs, bass traps in the corners, treatment where the reflections hit the mic, and low latency.', 'A room you’d charge for: 0.20–0.40 s, balanced across frequency, four bass traps, and latency under 10 ms.', 'Mastery: the studio standard, before the singer arrives.'][lv]}`,
  init: () => ({ iface: '', mic: '', comp: '', daw: '', mon: '', cable: '', floor: 'wood', panels: 0, traps: 0, curtain: false, egg: false, sofa: false, shelf: false, behind: false, sides: false, cloud: false, oneWall: false, fs: 44100, bits: 24, buf: 512, dm: false, phantom: false, pop: false, stand: true }),
  controls: (lv) => [...slotControls(STUDIO_SLOTS),
    { kind: 'select', key: 'floor', label: 'Floor', options: [['wood', 'Bare wooden floor'], ['rug', 'A 2 × 2 m rug'], ['carpet', 'Wall-to-wall carpet on underlay']] },
    { kind: 'stepper', key: 'panels', label: 'Absorption panels (5 cm mineral wool, 0.6 × 1.2 m)', min: 0, max: 16 }, { kind: 'stepper', key: 'traps', label: 'Corner bass traps (10 cm)', min: 0, max: 8 },
    { kind: 'check', key: 'curtain', label: 'Heavy curtain over the window' }, { kind: 'check', key: 'sofa', label: 'A sofa' }, { kind: 'check', key: 'shelf', label: 'A full bookshelf' }, { kind: 'check', key: 'egg', label: 'A wall of egg cartons' },
    ...(lv >= 2 ? (['behind', 'sides', 'cloud', 'oneWall'] as const).map((k, i) => ({ kind: 'check' as const, key: k, label: ['Panels: behind the singer (the wall the mic faces)', 'Panels: side walls at the first reflection points', 'Panels: a ceiling cloud over the mic', 'Panels: all of them on one wall behind the mic'][i]! })) : []),
    { kind: 'select', key: 'fs', label: 'Sample rate', options: [[8000, '8 kHz'], [44100, '44.1 kHz'], [48000, '48 kHz'], [96000, '96 kHz'], [192000, '192 kHz']] },
    { kind: 'select', key: 'bits', label: 'Bit depth', options: [[16, '16-bit'], [24, '24-bit'], [32, '32-bit float']] },
    { kind: 'select', key: 'buf', label: 'Buffer size', options: [32, 64, 128, 256, 512, 1024].map((b) => [b, `${b} samples`] as [number, string]) },
    { kind: 'check', key: 'dm', label: 'Direct (zero-latency) monitoring on the interface' }, { kind: 'check', key: 'phantom', label: '48 V phantom power on' }, { kind: 'check', key: 'pop', label: 'Pop filter' }, { kind: 'check', key: 'stand', label: 'Mic on a stand (not hand-held)' }],
  readout: (st, lv) => { const R = room(st), T = RT(lv), L = latency(st), bad = (x: number) => (x >= T[0]! && x <= T[1]! ? '' : 'bad') as '' | 'bad';
    return [['RT60 500 Hz', `${round(R[1]!.rt, 2)} s (Eyring ${round(R[1]!.ey, 2)})`, bad(R[1]!.rt)], ['RT60 2 kHz', `${round(R[2]!.rt, 2)} s`, bad(R[2]!.rt)], ['RT60 125 Hz', `${round(R[0]!.rt, 2)} s`], ['target', `${T[0]}–${T[1]} s`], ['mean absorption', `${round(R[1]!.am * 100, 0)}%`], ['latency', st['dm'] ? 'direct monitoring ≈ 0 ms' : `${round(L, 1)} ms round trip`, st['dm'] || L <= LAT[lv]! ? '' : 'bad'], ['room volume', '26.3 m³']] as Readout; },
  note: 'Sabine’s formula: RT60 = 0.161 × volume ÷ total absorption (m² sabins). Each absorber’s sabins = its area × its absorption coefficient at that frequency. Carpet and thin panels soak up mids and highs; only thick, deep traps touch the bass. The numbers are standard textbook coefficients; a measured room always wins.',
  evaluate: (st, lv) => {
    const c: CheckItem[] = [], inst = gearCheck(STUDIO_SLOTS, st, c); if (inst) return inst;
    const R = room(st), L = latency(st), T = RT(lv), fs = Number(st['fs']), buf = Number(st['buf']), bits = Number(st['bits']), traps = Number(st['traps']), panels = Number(st['panels']);
    if (st['mic'] === 'ldc') c.push({ ok: !!st['phantom'], w: 2, must: true, label: 'The condenser has power', got: st['phantom'] ? '48 V on' : 'phantom off — no signal', want: '48 V phantom on', why: 'A condenser microphone needs 48 V phantom power from the interface to work at all.' });
    c.push({ ok: fs >= 44100, w: 2, must: true, label: 'Sample rate', got: `${fs} Hz`, want: '44.1 or 48 kHz', why: 'At 8 kHz nothing above 4 kHz can exist (the Nyquist limit is half the sample rate): telephone quality, no consonants.' });
    if (lv >= 2) c.push({ ok: bits >= 24, w: 1, label: 'Bit depth', got: `${bits}-bit`, want: '24-bit or 32-bit float', why: '24-bit leaves room to record peaks at −12 dBFS without bringing up the noise floor; 16-bit is for delivery.' });
    c.push({ ok: !!st['dm'] || L <= LAT[lv]!, w: 2, must: lv >= 2, label: 'The singer hears herself in time', got: st['dm'] ? 'direct monitoring' : `${round(L, 1)} ms`, want: `≤ ${LAT[lv]} ms, or direct monitoring`, why: 'Past about 10 ms of delay in the headphones, singers start to feel it; past 20 ms they hear an echo. Smaller buffer, or monitor through the interface directly.' });
    if (buf <= 64 && (st['comp'] === 'old' || fs >= 96000)) c.push({ ok: false, w: 1, label: 'No clicks and drop-outs', got: `${buf} samples at ${fs} Hz`, want: 'a buffer the computer can keep up with', why: 'Tiny buffers leave the computer a fraction of a millisecond per block. Miss one and you hear a click in the recording.' });
    c.push({ ok: R[1]!.rt >= T[0]! && R[1]!.rt <= T[1]!, w: 2.5, must: lv >= 2, label: 'Reverb time in the mids (500 Hz)', got: `${round(R[1]!.rt, 2)} s`, want: `${T[0]}–${T[1]} s`, why: R[1]!.rt > T[1]! ? 'Too live: the vocal carries the room’s ring on it forever. Add absorption — panels, carpet, curtains, soft furniture.' : 'Too dead: a tiny room this dry feels oppressive and the bass is still ringing.' });
    c.push({ ok: R[2]!.rt >= T[0]! && R[2]!.rt <= T[1]!, w: 2, must: lv >= 2, label: 'Reverb time in the highs (2 kHz)', got: `${round(R[2]!.rt, 2)} s`, want: `${T[0]}–${T[1]} s`, why: 'Hard walls and glass keep the top end ringing. Broadband panels fix mids and highs together.' });
    if (lv >= 3) c.push({ ok: Math.abs(R[2]!.rt / R[1]!.rt - 1) <= 0.35, w: 1.5, label: 'Balanced across frequency', got: `${round(R[2]!.rt / R[1]!.rt, 2)}× (2 kHz vs 500 Hz)`, want: '0.65–1.35×', why: 'Treating only the highs (thin foam, cartons) leaves a dull, boomy room.' });
    if (lv >= 2) c.push({ ok: traps >= (lv >= 3 ? 4 : 2), w: 1.5, label: 'Bass traps in the corners', got: String(traps), want: `≥ ${lv >= 3 ? 4 : 2}`, why: 'The room’s first modes (49, 57 and 69 Hz here) ring long after the note. Corners are where every mode has pressure maximum — deep traps there shorten them.' });
    if (lv >= 2) c.push({ ok: !!st['behind'] && !st['oneWall'] && panels >= 2, w: 1.5, label: 'Panels where the mic hears reflections', got: [st['behind'] ? 'behind the singer' : '', st['sides'] ? 'side walls' : '', st['cloud'] ? 'ceiling' : '', st['oneWall'] ? 'all on one wall' : ''].filter(Boolean).join(', ') || 'nowhere in particular', want: 'behind the singer, then the sides and ceiling', why: 'A cardioid mic faces the singer, so it hears the wall behind her best. Panels there matter most; piling every panel on the wall behind the mic treats the one wall it rejects.' });
    if (st['egg']) c.push({ ok: false, w: 1, label: 'Egg cartons', got: 'a wall of them', want: 'real absorbers', why: 'A myth: thin paper pulp absorbs a little treble and nothing below. It’s also a fire load — choose treatment with a fire rating.' });
    if (lv >= 2) { c.push({ ok: !!st['pop'], w: 1, label: 'Pop filter', got: st['pop'] ? 'yes' : 'no', why: 'Plosives (p, b) hit a close mic as a burst of air — a thump no EQ can fully remove.' }); c.push({ ok: !!st['stand'], w: 1, label: 'Mic on a stand', got: st['stand'] ? 'yes' : 'hand-held', why: 'Holding a studio mic adds handling noise and changes distance every word.' }); }
    return { checks: c };
  },
};

// ------------------------------------------------------------------------------------------------------------------- game stream
export const STREAM_RES: Record<string, [number, number, number]> = { '720p30': [1280, 720, 30], '720p60': [1280, 720, 60], '1080p30': [1920, 1080, 30], '1080p60': [1920, 1080, 60], '1440p60': [2560, 1440, 60] };
export const STREAM_SLOTS: GearSlot[] = [
  { key: 'src', label: 'Game machine', opts: [
    { id: 'pc', t: 'Gaming PC: the game and the stream on one machine', icon: '🖥', v: 'ok' }, { id: 'con', t: 'Console, plus a PC that runs the stream', icon: '🎮', v: 'ok' },
    { id: 'fridge', t: 'A smart fridge', icon: '🧊', v: 'fail', joke: 'It has a screen and Wi-Fi. It does not have your game.', why: 'You need the machine that runs the game (a PC or a console) and one that encodes the stream.' }] },
  { key: 'cap', label: 'Capture', opts: [
    { id: 'none', t: 'No capture card', icon: '∅', v: 'ok' }, { id: 'hdmi', t: 'HDMI capture card with passthrough', icon: '📥', v: 'ok' },
    { id: 'micro', t: 'A microwave oven', icon: '🍿', v: 'fail', joke: 'It has a turntable and a display. It captures only leftovers.', why: 'A capture card turns the console’s HDMI output into video the streaming PC can encode. A microwave heats food — and leaks a little 2.45 GHz energy right onto your 2.4 GHz Wi-Fi.' },
    { id: 'ctrl', t: 'A second controller', icon: '🕹', v: 'fail', joke: 'Player two has joined. The stream has not.', why: 'A controller sends button presses into the console; nothing comes back out of it. Video has to be captured from the console’s HDMI output.' }] },
  { key: 'mic', label: 'Microphone', opts: [
    { id: 'usbdyn', t: 'Dynamic mic on a boom arm, close to your mouth', icon: '🎤', v: 'ok' }, { id: 'head', t: 'Gaming headset mic', icon: '🎧', v: 'ok' },
    { id: 'desk', t: 'Condenser mic on the desk, a metre away', icon: '🎙', v: 'soft', why: 'At a metre it hears the keyboard, the fans and the room more than you.' },
    { id: 'walkie', t: 'A walkie-talkie', icon: '📻', v: 'fail', joke: '“Welcome to the stream. Over.”', why: 'Two-way radios are narrow-band voice links with push-to-talk. The stream needs a microphone into the computer.' }] },
  { key: 'cam', label: 'Camera', opts: [
    { id: 'web', t: '1080p webcam', icon: '📷', v: 'ok', lat: 70 }, { id: 'mirror', t: 'Mirrorless camera with clean HDMI into a second capture', icon: '📸', v: 'ok', lat: 110 },
    { id: 'door', t: 'A doorbell camera', icon: '🔔', v: 'fail', joke: 'Viewers now see a fisheye of your porch at 15 frames a second.', why: 'Doorbell cameras stream to their maker’s servers with seconds of delay, not into your streaming software.' }] },
  { key: 'light', label: 'Light on your face', opts: [
    { id: 'key', t: 'Soft LED panel, 45° to one side (key light)', icon: '💡', v: 'ok' }, { id: 'ring', t: 'Ring light in front of you', icon: '⭕', v: 'ok' },
    { id: 'top', t: 'The ceiling light only', icon: '🔆', v: 'soft', why: 'Top light puts your eyes in shadow; a dim face makes the webcam raise its gain, which means noise.' },
    { id: 'rgb', t: 'An RGB strip behind you, nothing in front', icon: '🌈', v: 'soft', why: 'A lovely background and a silhouette where your face should be.' },
    { id: 'disco', t: 'A disco ball', icon: '🪩', v: 'fail', joke: 'Your face is lit for one frame in forty-eight.', why: 'Moving specular spots strobe across the lens; the camera’s auto-exposure pumps. You need steady, soft light on your face.' }] },
  { key: 'net', label: 'Connection', opts: [
    { id: 'eth', t: 'Wired Ethernet to the router', icon: '🔌', v: 'ok', k: 1 },
    { id: 'wifi', t: 'Wi-Fi from the next room', icon: '📶', v: 'soft', k: 0.7, why: 'Wi-Fi retransmits lost packets; the upload rate wobbles and frames drop. Wire it.' },
    { id: 'hot', t: 'A phone hotspot', icon: '📱', v: 'soft', k: 0.5, why: 'Cellular upload swings with every passing bus, and there may be a data cap.' }] },
];
export const UPLOAD = [0, 20, 8, 5, 5];
export function stream(st: CState, lv: number) {
  const n = (k: string) => Number(st[k]); const R = STREAM_RES[String(st['res'])]!, px = R[0] * R[1] * R[2], bpp = (n('br') * 1000) / px, netO = STREAM_SLOTS[5]!.opts.find((o) => o.id === st['net']), eff = UPLOAD[lv]! * (netO ? netO.k! : 1);
  const total = (n('br') + n('ab')) / 1000, cpu = (st['src'] === 'con' ? 15 : 55) + 5 + (st['enc'] === 'hw' ? 3 : (px / 1e6) * (st['enc'] === 'swf' ? 0.45 : 0.9));
  const camO = STREAM_SLOTS[3]!.opts.find((o) => o.id === st['cam']), lead = (camO?.lat ? camO.lat : 70) - 10 - n('off');
  const pk = 10 * Math.log10(10 ** ((n('mic_l') + 10) / 10) + 10 ** ((n('game') + 8) / 10));
  return { px, bpp, eff, total, use: total / eff, cpu, lead, pk, diff: n('mic_l') - n('game') };
}
export const BUILD_STREAM: Challenge = {
  id: 'build-stream', mode: 'build', icon: '🎮', title: 'Build a game-streaming setup', time: 180, clock: 'until you go live', formula: 'bits per pixel = bitrate ÷ (width × height × fps) · use ≤ 75% of your upload',
  brief: (lv) => `Build a live game stream for “the live game-streaming platform” (ingest limit 8,000 kbps, keyframe every 2 s). Your measured upload speed: ${UPLOAD[lv]} Mbps. ${['', 'Get a working, watchable stream.', 'Make it look good for a fast game within the upload you have, keep the mix right and the lips in sync.', 'Tight upload, strict sync, and a stream key you must keep secret.', 'Mastery: the tight brief, before you go live.'][lv]}`,
  init: () => ({ src: '', cap: '', mic: '', cam: '', light: '', net: '', res: '1080p60', br: 9000, enc: 'sws', kf: 0, ab: 160, mic_l: -8, game: -10, off: 0, key: true }),
  controls: (lv) => [...slotControls(STREAM_SLOTS),
    { kind: 'select', key: 'res', label: 'Resolution and frame rate', options: Object.keys(STREAM_RES).map((k) => [k, k] as [string, string]) },
    { kind: 'slider', key: 'br', label: 'Video bitrate', min: 1000, max: 12000, step: 100, unit: 'kbps' },
    { kind: 'select', key: 'enc', label: 'Encoder', options: [['hw', 'GPU (hardware)'], ['swf', 'CPU, fast preset'], ['sws', 'CPU, slow preset']] },
    { kind: 'select', key: 'kf', label: 'Keyframe interval', options: [[0, 'Auto'], [1, '1 s'], [2, '2 s'], [4, '4 s'], [10, '10 s']] },
    { kind: 'select', key: 'ab', label: 'Audio bitrate', options: [[96, '96 kbps'], [128, '128 kbps'], [160, '160 kbps'], [320, '320 kbps']] },
    { kind: 'slider', key: 'mic_l', label: 'Mic level (average)', min: -40, max: 0, step: 1, unit: 'dBFS' }, { kind: 'slider', key: 'game', label: 'Game level (average)', min: -40, max: 0, step: 1, unit: 'dBFS' },
    ...(lv >= 2 ? [{ kind: 'slider' as const, key: 'off', label: 'Delay the mic to match the camera', min: 0, max: 200, step: 5, unit: 'ms' }] : []),
    ...(lv >= 3 ? [{ kind: 'check' as const, key: 'key', label: 'Show the stream key on screen while setting up' }] : [])],
  readout: (st, lv) => { const C = stream(st, lv), bppMin = lv >= 2 ? 0.07 : 0.05, syncW = lv >= 3 ? [45, 15] : [60, 40], b = (ok: boolean) => (ok ? '' : 'bad') as '' | 'bad';
    const r: Readout = [['upload used', `${round(C.use * 100, 0)}% of ${round(C.eff, 1)} Mbps`, b(C.use <= 0.75)], ['picture', `${round(C.bpp, 3)} bits per pixel`, b(C.bpp >= bppMin)], ['CPU load', `${Math.round(C.cpu)}%`, b(C.cpu <= 90)], ['mic above game', `${C.diff >= 0 ? '+' : ''}${C.diff} dB`, b(C.diff >= 6 && C.diff <= 14)], ['mix peak', `${round(C.pk, 1)} dBFS`, b(C.pk <= -1)]];
    if (lv >= 2) r.push(['lip sync (audio early +)', `${C.lead > 0 ? '+' : ''}${Math.round(C.lead)} ms`, b(C.lead <= syncW[1]! && C.lead >= -syncW[0]!)]);
    r.push(['video + audio', `${round(C.total, 2)} Mbps`], ['platform limit', '8,000 kbps']); return r; },
  note: 'Bits per pixel tells you how thinly the bitrate is spread: the same 6,000 kbps looks far better at 720p60 than at 1080p60 in a fast game. Leave a quarter of your upload spare. Webcams deliver their picture tens of milliseconds after the microphone’s sound — delay the mic to match (clap on camera to measure it).',
  evaluate: (st, lv) => {
    const c: CheckItem[] = [], inst = gearCheck(STREAM_SLOTS, st, c); if (inst) return inst;
    const C = stream(st, lv), bppMin = lv >= 2 ? 0.07 : 0.05, syncW = lv >= 3 ? [45, 15] : [60, 40], br = Number(st['br']), kf = Number(st['kf']), ab = Number(st['ab']);
    if (st['src'] === 'con') c.push({ ok: st['cap'] === 'hdmi', w: 2, must: true, label: 'The console’s picture reaches the PC', got: st['cap'] === 'hdmi' ? 'HDMI capture' : 'no capture card', want: 'an HDMI capture card', why: 'A console’s video leaves by HDMI; the streaming PC needs a capture card to receive it.' });
    c.push({ ok: br <= 8000, w: 2, must: true, label: 'Within the platform’s ingest limit', got: `${br} kbps`, want: '≤ 8,000 kbps', why: 'Above the limit the platform refuses the stream or viewers can’t keep up.' });
    c.push({ ok: C.use <= 0.75, w: 2.5, must: true, label: 'Upload headroom', got: `${round(C.use * 100, 0)}% of the usable upload`, want: '≤ 75%', why: 'Upload speed isn’t constant. Use more than about three-quarters and every dip becomes dropped frames.' });
    c.push({ ok: C.bpp >= bppMin, w: 2, label: 'Picture quality for a fast game', got: `${round(C.bpp, 3)} bpp at ${st['res']}`, want: `≥ ${bppMin} bpp`, why: 'Spread too few bits over too many pixels and fast motion turns to blocks. Lower the resolution or frame rate until the bitrate you can afford is enough.' });
    c.push({ ok: C.cpu <= 90, w: 2, must: true, label: 'The computer keeps up', got: `${Math.round(C.cpu)}% CPU`, want: '≤ 90%', why: 'A software encoder on the same machine as the game fights it for the processor: the game stutters and the encoder skips frames. Use the GPU’s hardware encoder or a faster preset.' });
    c.push({ ok: lv >= 2 ? kf === 2 : (kf >= 1 && kf <= 4) || kf === 0, w: 1.5, must: lv >= 2, label: 'Keyframe interval', got: kf ? `${kf} s` : 'auto', want: lv >= 2 ? '2 s' : '1–4 s', why: 'The platform needs a full frame every 2 seconds so viewers can join and its transcoders can cut the stream into segments.' });
    c.push({ ok: ab >= 128, w: 1, label: 'Audio bitrate', got: `${ab} kbps`, want: '≥ 128 kbps', why: 'At 96 kbps game music and voice together get swirly.' });
    c.push({ ok: C.diff >= (lv >= 2 ? 6 : 4) && C.diff <= (lv >= 2 ? 14 : 18), w: 2, label: 'Voice sits above the game', got: `${C.diff >= 0 ? '+' : ''}${C.diff} dB`, want: lv >= 2 ? '+6 to +14 dB' : '+4 to +18 dB', why: 'Viewers came for you: your voice needs to ride clearly over the game, without the game disappearing.' });
    c.push({ ok: C.pk <= -1, w: 2, must: true, label: 'No clipping in the mix', got: `${round(C.pk, 1)} dBFS peak`, want: '≤ −1 dBFS', why: 'Mic and game add together. Bring both down until the combined peaks stay under −1 dBFS.' });
    if (lv >= 2) c.push({ ok: C.lead <= syncW[1]! && C.lead >= -syncW[0]!, w: 2, must: true, label: 'Lips in sync', got: C.lead > 0 ? `audio ${Math.round(C.lead)} ms early` : `audio ${Math.round(-C.lead)} ms late`, want: `early ≤ ${syncW[1]} ms, late ≤ ${syncW[0]} ms`, why: `Sound arriving before the lips move is noticed quickly (${lv >= 3 ? 'ATSC IS-191' : 'EBU R37'} windows). Delay the mic by about the camera’s latency.` });
    if (lv >= 3) c.push({ ok: !st['key'], w: 2, must: true, label: 'Stream key kept secret', got: st['key'] ? 'visible on screen' : 'hidden', want: 'never shown', why: 'Anyone with your stream key can broadcast as you. Treat it like a password; if it was ever on screen, reset it.' });
    return { checks: c };
  },
};

// ------------------------------------------------------------------------------------------------------------------- wireless plan
export const RF_N = [0, 4, 6, 8, 8];
export interface RfConflict { i: number; why: string; k: 'space' | 'tv' | 'ifb' | 'im3' | 'im5' }
export function rf(st: CState, lv: number) {
  const n = RF_N[lv]!, tv = lv >= 2, ifb = lv >= 3 ? 536.5 : null, o5 = lv >= 3, F: number[] = []; for (let i = 0; i < n; i += 1) F.push(Number(st[`f${i}`]));
  const tx = ifb ? [...F, ifb] : F, P: Array<{ f: number; o: 3 | 5; a: number; b: number }> = [], conf: RfConflict[] = [];
  for (let a = 0; a < tx.length; a += 1) for (let b = 0; b < tx.length; b += 1) if (a !== b) { P.push({ f: 2 * tx[a]! - tx[b]!, o: 3, a, b }); if (o5) P.push({ f: 3 * tx[a]! - 2 * tx[b]!, o: 5, a, b }); }
  const nm = (k: number) => (k === F.length && ifb ? 'IEM' : `M${k + 1}`);
  F.forEach((f, i) => {
    F.forEach((g, j) => { if (j > i && Math.abs(f - g) < 0.4 - 1e-9) conf.push({ i, why: `M${i + 1} and M${j + 1} are only ${round(Math.abs(f - g) * 1000, 0)} kHz apart`, k: 'space' }); });
    if (tv && f > 524 - 0.25 && f < 530 + 0.25) conf.push({ i, why: `M${i + 1} is inside (or on the edge of) the TV channel`, k: 'tv' });
    if (ifb && Math.abs(f - ifb) < 0.4) conf.push({ i, why: `M${i + 1} is on top of the in-ear transmitter`, k: 'ifb' });
    for (const p of P) { const lim = p.o === 3 ? 0.1 : 0.05; if (Math.abs(p.f - f) < lim - 1e-9) conf.push({ i, why: `M${i + 1} is hit by ${p.o === 3 ? '2×' : '3×'}${nm(p.a)} − ${p.o === 3 ? '' : '2×'}${nm(p.b)} (${round(p.f, 3)} MHz, ${p.o === 3 ? '3rd' : '5th'} order)`, k: p.o === 3 ? 'im3' : 'im5' }); }
  });
  return { F, P, conf, tv, ifb, o5 };
}
export const BUILD_RF: Challenge = {
  id: 'build-rf', mode: 'build', icon: '📡', title: 'Build a wireless mic frequency plan', time: 180, clock: 'until soundcheck', formula: 'Third-order intermod = 2f₁ − f₂ · fifth order = 3f₁ − 2f₂',
  brief: (lv) => `${RF_N[lv]} wireless microphones, one tuning range (518–542 MHz). Transmitters near each other mix: every pair makes new “intermod” frequencies, and if one lands on a mic’s carrier, that mic hisses and drops out on stage. The house frequency coordinator signs off whatever you build. ${['', 'Keep the mics 0.4 MHz apart and clear of third-order products.', 'A local TV station occupies 524–530 MHz now — stay out of it.', 'Eight mics, the TV channel, the house in-ear transmitter at 536.500 MHz, and fifth-order products too.', 'Mastery: the full plan, before soundcheck.'][lv]}`,
  init: (lv) => { const s: CState = {}; for (let i = 0; i < RF_N[lv]!; i += 1) s[`f${i}`] = round(520 + i, 3); return s; },
  controls: (lv) => [{ kind: 'action', key: 'same', label: 'Put every mic on 530.000 MHz “to keep it simple”', set: Object.fromEntries(Array.from({ length: RF_N[lv]! }, (_x, i) => [`f${i}`, 530])) },
    ...Array.from({ length: RF_N[lv]! }, (_x, i) => ({ kind: 'slider' as const, key: `f${i}`, label: `Mic ${i + 1}`, min: 518, max: 542, step: 0.025, unit: 'MHz' }))],
  readout: (st, lv) => { const A = rf(st, lv); if (!A.conf.length) return [['plan', '✓ No conflicts in this model']]; const r: Readout = A.conf.slice(0, 8).map((c) => ['conflict', `✗ ${c.why}`, 'bad']); if (A.conf.length > 8) r.push(['conflict', `… and ${A.conf.length - 8} more`, 'bad']); return r; },
  note: 'Coordinators avoid even spacing, keep carriers apart, and check every pair’s products. Real plans also check the TV channels in your area, the rules for your country and an on-site scan — this model shows the arithmetic, not a licence.',
  evaluate: (st, lv) => {
    const A = rf(st, lv), F = A.F, c: CheckItem[] = [];
    if (F.every((f) => Math.abs(f - F[0]!) < 1e-9)) return { instant: { title: 'Every mic on one frequency', joke: 'Eight mics, one channel: the receivers pick whichever transmitter is loudest this second.', why: 'Each wireless system needs its own carrier frequency. Two transmitters on one frequency don’t share — they fight, and the receiver swaps between them with bursts of noise.' } };
    const count = (k: RfConflict['k']) => A.conf.filter((x) => x.k === k).length;
    c.push({ ok: !count('space'), w: 2.5, must: true, label: 'Carriers spaced apart', got: `${count('space')} pair(s) too close`, want: '≥ 400 kHz between mics', why: 'Receivers need room either side of their carrier; closer than this they hear their neighbours.' });
    c.push({ ok: !count('im3'), w: 3, must: true, label: 'Clear of third-order intermod', got: `${count('im3')} hit(s)`, want: 'none within 100 kHz of a carrier', why: 'The strongest product is 2f₁ − f₂. Nudge one mic by a few hundred kHz and the products move twice as far.' });
    if (A.tv) c.push({ ok: !count('tv'), w: 2.5, must: true, label: 'Out of the occupied TV channel', got: `${count('tv')} mic(s) in it`, want: 'none in 524–530 MHz (with a 250 kHz guard)', why: 'A TV transmitter is far more powerful than a bodypack. Inside its channel, it wins.' });
    if (A.ifb) c.push({ ok: !count('ifb'), w: 2, must: true, label: 'Clear of the in-ear transmitter', got: count('ifb') ? 'too close' : 'clear', want: '≥ 400 kHz away', why: 'The in-ear system is a transmitter in the same room; it also makes intermod with every mic.' });
    if (A.o5) c.push({ ok: !count('im5'), w: 2, must: true, label: 'Clear of fifth-order intermod', got: `${count('im5')} hit(s)`, want: 'none within 50 kHz', why: 'Weaker, but with eight carriers there are dozens of them. A good plan clears them too.' });
    return { checks: c };
  },
};
