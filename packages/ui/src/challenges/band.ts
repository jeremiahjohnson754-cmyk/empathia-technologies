/**
 * The band for reach-cues, as the reference's chal_reach.js plays it on Web Audio: a count-in, then pads, kick, snare, hats and bass by
 * section (quiet in the intro and bridge, full in the choruses), and the last hit. `step` schedules one sixteenth note at audio time `t`.
 * Browser only; the cue engine (reach.ts) stays pure and the runner owns the clock.
 */
import type { Song } from './reach.js';
const CH = [[196, 246.9, 293.7, 98], [146.8, 185, 220, 73.4], [164.8, 196, 246.9, 82.4], [130.8, 164.8, 196, 65.4]];
export function band(ac: AudioContext, master: AudioNode, S: Song) {
  let nbuf: AudioBuffer | null = null;
  const voice = (t: number, type: OscillatorType, f0: number, f1: number, dur: number, vol: number, filt?: number) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.4); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g);
    if (filt) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filt; g.connect(fl); fl.connect(master); } else g.connect(master); o.start(t); o.stop(t + dur + 0.05); };
  const noise = (t: number, hp: number, dur: number, vol: number) => { if (!nbuf) { nbuf = ac.createBuffer(1, Math.round(ac.sampleRate * 0.5), ac.sampleRate); const d = nbuf.getChannelData(0); let seed = 4242; for (let i = 0; i < d.length; i += 1) { seed = (seed * 16807) % 2147483647; d[i] = seed / 1073741823.5 - 1; } }
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = nbuf; fl.type = hp > 0 ? 'highpass' : 'bandpass'; fl.frequency.value = Math.abs(hp); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05); };
  const sec = (t: number) => { let s: Song['secs'][number] | null = null; for (const x of S.secs) if (t >= x.t - 1e-6) s = x; return s; };
  /** One sixteenth note: i counts from the top of the count-in. */
  return function step(i: number, t: number) {
    const barN = Math.floor(i / 16), s16 = i % 16, s = sec(barN * S.bar + 1e-6), nm = s ? s.name : 'count', ch = CH[barN % 4]!, full = nm === 'chorus' || nm === 'chorus2' || nm === 'final';
    if (nm === 'count' || barN < 2) { if (s16 % 4 === 0) voice(t, 'square', s16 === 0 ? 1760 : 1320, 0, 0.05, 0.08); return; }
    if (nm === 'end') { if (s16 === 0 && barN === S.secs[S.secs.length - 1]!.b0) { voice(t, 'sine', 150, 45, 0.5, 0.9); noise(t, 3000, 1.8, 0.35); voice(t, 'sawtooth', ch[3]! * 2, 0, 1.4, 0.12, 900); } return; }
    if (s16 === 0) [0, 1, 2].forEach((j) => voice(t, 'sawtooth', ch[j]! * (full ? 2 : 1), 0, S.bar * 0.98, full ? 0.035 : 0.025, full ? 2600 : 900));
    if (nm === 'intro' || nm === 'bridge') { if (s16 % 4 === 2) noise(t, 7000, 0.04, 0.05); if (nm === 'bridge' && s16 === 0) voice(t, 'sine', 130, 50, 0.3, 0.5); return; }
    const kick = full || nm === 'pre' ? s16 % 4 === 0 : s16 === 0 || s16 === 8;
    if (kick) voice(t, 'sine', 140, 45, 0.32, 0.9);
    if (s16 === 4 || s16 === 12) { noise(t, -1800, 0.16, full ? 0.45 : 0.28); voice(t, 'triangle', 190, 0, 0.08, 0.15); }
    if (nm === 'pre' && s && barN === s.b0 + s.bars - 1 && s16 % 2 === 0) noise(t, -1800, 0.08, 0.08 + s16 / 60);
    if (s16 % 2 === 0) noise(t, 7000, s16 % 4 === 2 && full ? 0.18 : 0.04, 0.06);
    if (full ? s16 % 2 === 0 : s16 === 0 || s16 === 8) voice(t, 'sawtooth', ch[3]!, 0, full ? 0.2 : 0.45, 0.16, 500);
  };
}
