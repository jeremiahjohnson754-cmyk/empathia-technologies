/**
 * SIGNAL Physics in Motion: the 24 simulation models the 36 physics labs use, as controls, a model, a readout and a check, without
 * drawing. Restored 11 November 2026 to the founder's build package (docs/04-engine-specs.md §6 and the reference runtime physics.js;
 * the reference wins). Textbook models simplified for learning, flagged RV-39 in the source; every figure is illustrative.
 * The reference also defines `wavelength` and `bits`, which no lab uses; they are ported too, for completeness.
 */
import type { Check } from './labs.js';

export type PState = Record<string, number | boolean>;
export type Control =
  | { kind: 'slider'; key: string; label: string; min: number; max: number; step: number; unit?: string; log?: boolean }
  | { kind: 'select'; key: string; label: string; options: Array<{ value: number; text: string }> }
  | { kind: 'toggle'; key: string; label: string };
export interface PhysLab { id: string; type: 'physics'; sim: string; start: PState; goal?: unknown; [k: string]: unknown }
export interface Sim { aria: string; controls: (L: PhysLab) => Control[]; model: (s: PState, L: PhysLab) => Record<string, number | boolean | unknown>; read: (m: Record<string, unknown>, s: PState, L: PhysLab) => Array<[string, string]>; check: (m: Record<string, unknown>, s: PState, L: PhysLab) => Check }

const C0 = 343;
const r = (x: number, n = 0) => { const p = 10 ** n; return Math.round(x * p) / p; };
const inGoal = (v: number, g: unknown) => Array.isArray(g) && v >= (g[0] as number) && v <= (g[1] as number);
const N = (L: PhysLab, k: string, d?: number) => (typeof L[k] === 'number' ? (L[k] as number) : (d as number));
const G = (L: PhysLab) => L.goal as [number, number];
const sl = (key: string, label: string, min: number, max: number, step: number, unit?: string, log?: boolean): Control => ({ kind: 'slider', key, label, min, max, step, unit, log });
const pass = (notes: string[] = []): Check => ({ ok: true, why: [], notes });
const fail = (why: string): Check => ({ ok: false, why: [why] });
const n = (s: PState, k: string) => Number(s[k]);
type M = Record<string, number>;

export const SIMS: Record<string, Sim> = {
  waves: { aria: 'Two loudspeakers radiating toward a row of seats; the listener marker shows where the waves add or cancel.',
    controls: () => [sl('f', 'Frequency', 50, 2000, 1, 'Hz', true), sl('x', 'Listener position along the row', 0, 12, 0.05, 'm')],
    model: (s, L) => { const s1 = L['s1'] as number[], s2 = L['s2'] as number[], ly = N(L, 'rowY'); const d1 = Math.hypot(n(s, 'x') - s1[0]!, ly - s1[1]!), d2 = Math.hypot(n(s, 'x') - s2[0]!, ly - s2[1]!), dd = Math.abs(d2 - d1), ph = (2 * Math.PI * n(s, 'f') * dd) / C0;
      const re = 1 + Math.cos(ph), im = Math.sin(ph); return { dd, lvl: 20 * Math.log10(Math.max(1e-4, Math.sqrt(re * re + im * im)) / 2), notch: dd > 0.001 ? C0 / (2 * dd) : Infinity }; },
    read: (m) => { const x = m as M; return [['path difference', `${r(x.dd!, 3)} m`], ['time difference', `${r((x.dd! / C0) * 1000, 2)} ms`], ['first notch here', Number.isFinite(x.notch) ? `${Math.round(x.notch!)} Hz` : '—'], ['level vs one speaker ×2', `${r(x.lvl!, 1)} dB`]]; },
    check: (m, s, L) => { const lvl = (m as M).lvl!; if (L.goal === 'notch') return lvl <= -15 ? pass([`At ${s['f']} Hz and ${s['x']} m the two arrivals cancel: ${r(lvl, 1)} dB.`]) : fail(`Not a cancellation yet (${r(lvl, 1)} dB). Find where the path difference is half a wavelength.`); return lvl >= -1 ? pass() : fail(`The arrivals aren’t adding (${r(lvl, 1)} dB).`); } },
  invsq: { aria: 'A loudspeaker and a listener whose distance you set; the level falls 6 dB each time the distance doubles.',
    controls: () => [sl('d', 'Listener distance', 1, 64, 0.1, 'm', true)],
    model: (s, L) => ({ lvl: N(L, 'l1') - 20 * Math.log10(n(s, 'd')) }),
    read: (m, s, L) => [['level at 1 m', `${L['l1']} dB SPL`], ['distance', `${s['d']} m`], ['level here', `${r((m as M).lvl!, 1)} dB SPL`], ['change from 1 m', `${r((m as M).lvl! - N(L, 'l1'), 1)} dB`]],
    check: (m, s, L) => (inGoal((m as M).lvl!, L.goal) ? pass([`At ${s['d']} m: ${r((m as M).lvl!, 1)} dB SPL.`]) : fail(`Level here is ${r((m as M).lvl!, 1)} dB; the goal is ${G(L)[0]}–${G(L)[1]} dB.`)) },
  wavelength: { aria: 'Wavefronts meeting a pillar; long waves bend around it, short waves leave a shadow.',
    controls: () => [sl('f', 'Frequency', 50, 8000, 1, 'Hz', true)],
    model: (s, L) => { const lam = C0 / n(s, 'f'); return { lam, ratio: lam / N(L, 'size') }; },
    read: (m, s, L) => { const x = m as M; return [['wavelength', `${r(x.lam!, 3)} m`], ['pillar', `${L['size']} m`], ['wavelength ÷ pillar', `${r(x.ratio!, 2)}`], ['behind the pillar', x.ratio! > 2 ? 'wraps around (little shadow)' : x.ratio! < 0.5 ? 'deep shadow' : 'partial shadow']]; },
    check: (m, s, L) => (Math.abs((m as M).ratio! - 1) <= N(L, 'tol', 0.05) ? pass([`${s['f']} Hz has a wavelength equal to the pillar.`]) : fail(`Wavelength is ${r((m as M).ratio!, 2)}× the pillar. Find where it equals the pillar.`)) },
  soundspeed: { aria: 'A sound pulse from the stage to a delay tower; its speed depends on air temperature.',
    controls: () => [sl('T', 'Air temperature', -10, 40, 0.1, '°C')],
    model: (s, L) => { const c = 331.3 + 0.606 * n(s, 'T'); return { c, ms: (N(L, 'dist') / c) * 1000 }; },
    read: (m, s, L) => [['speed of sound', `${r((m as M).c!, 1)} m/s`], ['distance', `${L['dist']} m`], ['travel time', `${r((m as M).ms!, 2)} ms`]],
    check: (m, s, L) => (inGoal((m as M).ms!, L.goal) ? pass() : fail(`Travel time is ${r((m as M).ms!, 2)} ms; the goal is ${G(L)[0]}–${G(L)[1]} ms.`)) },
  loop: { aria: 'A signal circulating mic → speaker → mic; each lap it grows or shrinks by the loop gain.',
    controls: (L) => [sl('g', 'Loop gain per lap', N(L, 'gmin', -12), 3, 0.1, 'dB')],
    model: (s) => { const k = 10 ** (n(s, 'g') / 20); return { k, after10: k ** 10 }; },
    read: (m, s) => [['loop gain', `${s['g']} dB`], ['each lap ×', `${r((m as M).k!, 3)}`], ['after 10 laps ×', `${r((m as M).after10!, 3)}`], ['behaviour', n(s, 'g') >= 0 ? 'rings and grows: FEEDBACK' : n(s, 'g') > -3 ? 'rings a long time' : 'dies away']],
    check: (m, s, L) => (inGoal(n(s, 'g'), L.goal) ? pass() : fail(n(s, 'g') >= 0 ? 'At or above 0 dB the loop grows: feedback.' : `Set the loop gain with the stability margin the goal asks for (${G(L)[0]} to ${G(L)[1]} dB).`)) },
  ohm: { aria: 'A circuit feeding loads; the current and the breaker respond to the load you plan.',
    controls: () => [sl('w', 'Load on the circuit', 0, 3600, 10, 'W')],
    model: (s, L) => { const I = n(s, 'w') / N(L, 'volts'); return { I, pct: I / N(L, 'breaker') }; },
    read: (m, s, L) => [['voltage', `${L['volts']} V`], ['load', `${s['w']} W`], ['current I = P/V', `${r((m as M).I!, 2)} A`], ['breaker', `${L['breaker']} A (${Math.round((m as M).pct! * 100)}%)`]],
    check: (m, s, L) => (inGoal(n(s, 'w'), L.goal) ? pass() : fail(`The goal is a load of ${G(L)[0]}–${G(L)[1]} W: ${(L['goalWhy'] as string) || 'the most you can plan without passing the limit line.'}`)) },
  sampling: { aria: 'A spinning wheel filmed by a camera; at some speeds it seems to stop or run backwards.',
    controls: () => [sl('rps', 'Wheel speed', 0, 60, 0.1, 'rev/s')],
    model: (s, L) => { const fps = N(L, 'fps'), per = 1 / N(L, 'spokes'), adv = (n(s, 'rps') / fps) % per, ap = adv > per / 2 ? adv - per : adv; return { apparent: ap * fps }; },
    read: (m, s, L) => { const a = (m as M).apparent!; return [['real speed', `${s['rps']} rev/s`], ['camera', `${L['fps']} fps`], ['spokes', `${L['spokes']}`], ['camera sees', Math.abs(a) < 0.02 ? 'FROZEN' : `${a < 0 ? 'backwards' : 'forwards'} ${r(Math.abs(a), 2)} rev/s`]]; },
    check: (m, s) => (Math.abs((m as M).apparent!) < 0.02 && n(s, 'rps') > 0.5 ? pass([`At ${s['rps']} rev/s the wheel moves exactly one spoke-gap (or a whole number of them) per frame.`]) : fail('The wheel isn’t frozen on camera yet.')) },
  fspl: { aria: 'A wireless transmitter and receiver; path loss, body and obstacle loss, and the margin left.',
    controls: (L) => [sl('d', 'Distance to the antenna', 1, 200, 0.5, 'm', true), { kind: 'toggle', key: 'body', label: `Performer’s body between mic and antenna (−${L['bodyLoss']} dB)` }, { kind: 'toggle', key: 'frame', label: `Steel frame in the way (−${L['frameLoss']} dB)` }],
    model: (s, L) => { const fspl = 20 * Math.log10(n(s, 'd') / 1000) + 20 * Math.log10(N(L, 'f')) + 32.44, extra = (s['body'] ? N(L, 'bodyLoss') : 0) + (s['frame'] ? N(L, 'frameLoss') : 0), rx = N(L, 'tx') - fspl - extra; return { fspl, extra, rx, margin: rx - N(L, 'sens') }; },
    read: (m) => { const x = m as M; return [['free-space loss', `${r(x.fspl!, 1)} dB`], ['obstacles', `${x.extra} dB`], ['received', `${r(x.rx!, 1)} dBm`], ['margin over sensitivity', `${r(x.margin!, 1)} dB`]]; },
    check: (m, s, L) => { const x = m as M; const ok = x.margin! >= N(L, 'goalMargin') && (!L['needBody'] || !!s['body']) && (!L['needFrame'] || !!s['frame']); return ok ? pass() : fail(`Margin is ${r(x.margin!, 1)} dB with the real obstacles on; you need ≥ ${L['goalMargin']} dB.${L['needBody'] && !s['body'] ? ' Turn on the body loss — she will turn her back.' : ''}`); } },
  color: { aria: 'Your RGB mix beside a target white; a readout shows how close you are.',
    controls: () => [sl('r', 'Red', 0, 255, 1), sl('g', 'Green', 0, 255, 1), sl('b', 'Blue', 0, 255, 1)],
    model: (s, L) => { const t = L['target'] as number[]; return { d: Math.sqrt((n(s, 'r') - t[0]!) ** 2 + (n(s, 'g') - t[1]!) ** 2 + (n(s, 'b') - t[2]!) ** 2) }; },
    read: (m, s, L) => [['your mix', `R${s['r']} G${s['g']} B${s['b']}`], ['target', `${L['targetLabel']}`], ['distance', `${Math.round((m as M).d!)}`]],
    check: (m, s, L) => ((m as M).d! <= N(L, 'tol', 24) ? pass() : fail(`Not a match yet (distance ${Math.round((m as M).d!)}). Warm white is lots of red, less green, much less blue.`)) },
  fourier: { aria: 'A waveform built from a fundamental and its odd harmonics, drawn live.',
    controls: () => [sl('h3', '3rd harmonic amplitude', 0, 1, 0.01), sl('h5', '5th harmonic amplitude', 0, 1, 0.01), sl('h7', '7th harmonic amplitude', 0, 1, 0.01)],
    model: (s) => ({ err: Math.abs(n(s, 'h3') - 1 / 3) + Math.abs(n(s, 'h5') - 1 / 5) + Math.abs(n(s, 'h7') - 1 / 7) }),
    read: (m, s, L) => [['fundamental', `${L['f0']} Hz`], ['3rd', `${3 * N(L, 'f0')} Hz × ${s['h3']}`], ['5th', `${5 * N(L, 'f0')} Hz × ${s['h5']}`], ['7th', `${7 * N(L, 'f0')} Hz × ${s['h7']}`]],
    check: (m) => ((m as M).err! <= 0.06 ? pass() : fail('Not square yet: odd harmonics at 1/n of the fundamental.')) },
  throw: { aria: 'Side view of a theatre: the screen, a ceiling beam, and a projector whose position and lens you set.',
    controls: (L) => [sl('d', 'Projector distance', 2, N(L, 'dMax', 14), 0.1, 'm'), sl('tr', 'Throw ratio (lens)', 0.5, 2.5, 0.05, ':1')],
    model: (s, L) => { const b = L['beam'] as number[]; return { w: n(s, 'd') / n(s, 'tr'), inBeam: n(s, 'd') >= b[0]! - 0.3 && n(s, 'd') <= b[1]! + 0.3 }; },
    read: (m, s, L) => { const b = L['beam'] as number[]; return [['image width = distance ÷ throw ratio', `${r((m as M).w!, 2)} m`], ['target width', `${L['width']} m`], ['beam zone', `${b[0]}–${b[1]} m from the screen`], ['projector', m['inBeam'] ? 'IN THE BEAM ZONE' : 'clear of the beam']]; },
    check: (m, s, L) => { const why: string[] = []; const w = (m as M).w!, b = L['beam'] as number[], lenses = L['lenses'] as number[] | undefined;
      if (Math.abs(w - N(L, 'width')) > N(L, 'tol', 0.1)) why.push(`Image is ${r(w, 2)} m wide; the screen is ${L['width']} m.`);
      if (m['inBeam']) why.push(`The projector sits in the beam zone (${b[0]}–${b[1]} m): the beam blocks the light or the mount.`);
      if (lenses && lenses.every((x) => Math.abs(x - n(s, 'tr')) > 0.02)) why.push(`Pick a throw ratio the specified lenses actually have: ${lenses.join(' or ')} : 1.`);
      return why.length ? { ok: false, why } : pass([`${r(n(s, 'd'), 1)} m with a ${s['tr']}:1 lens fills ${L['width']} m, clear of the beam.`]); } },
  ceiling: { aria: 'Plan view of a ceiling loudspeaker grid: each covers a circle at ear height; gaps show where nobody is covered.',
    controls: () => [sl('s', 'Loudspeaker spacing', 1.5, 9, 0.05, 'm')],
    model: (s, L) => { const D = 2 * (N(L, 'hc') - N(L, 'he')) * Math.tan(((N(L, 'theta') / 2) * Math.PI) / 180), rr = D / 2, worst = n(s, 's') / Math.SQRT2; return { D, r: rr, worst, covered: rr >= worst - 1e-9, n: Math.ceil(N(L, 'roomW') / n(s, 's')) * Math.ceil(N(L, 'roomL') / n(s, 's')) }; },
    read: (m, s, L) => { const x = m as M; return [['coverage D = 2(Hc − He)·tan(θ/2)', `${r(x.D!, 2)} m`], ['worst point = spacing ÷ √2', `${r(x.worst!, 2)} m from the nearest loudspeaker`], ['coverage radius', `${r(x.r!, 2)} m`], [`loudspeakers for ${L['roomW']} × ${L['roomL']} m`, `${x.n}`]]; },
    check: (m, s, L) => { const x = m as M; const why: string[] = [];
      if (!m['covered']) why.push(`Holes between every four loudspeakers: the worst point is ${r(x.worst!, 2)} m away but coverage only reaches ${r(x.r!, 2)} m. Minimum overlap needs spacing ≤ D ÷ √2 = ${r(x.D! / Math.SQRT2, 2)} m.`);
      if (n(s, 's') < N(L, 'minS', 0)) why.push(`Much denser than needed (${x.n} loudspeakers): more cost and more overlapping arrivals. Minimum overlap is enough here.`);
      return why.length ? { ok: false, why } : pass([`Spacing ${s['s']} m: every point at ear height is inside a loudspeaker's coverage, with ${x.n} loudspeakers.`]); } },
  sabine: { aria: 'A decaying sound in a room; add absorption and the decay shortens.',
    controls: () => [sl('A', 'Absorption added (panels)', 0, 400, 1, 'm² sabins')],
    model: (s, L) => { const A = N(L, 'A0') + n(s, 'A'); return { A, rt: (0.161 * N(L, 'V')) / A }; },
    read: (m, s, L) => [['room volume', `${L['V']} m³`], ['total absorption', `${(m as M).A} m²`], ['RT60 = 0.161·V/A', `${r((m as M).rt!, 2)} s`]],
    check: (m, s, L) => (inGoal((m as M).rt!, L.goal) ? pass() : fail(`RT60 is ${r((m as M).rt!, 2)} s; target ${G(L)[0]}–${G(L)[1]} s.`)) },
  bits: { aria: 'A sine wave sampled with the bit depth you choose; the staircase shows quantization.',
    controls: () => [sl('n', 'Bit depth', 1, 24, 1, 'bits')],
    model: (s) => ({ dr: 6.02 * n(s, 'n') + 1.76, levels: 2 ** n(s, 'n') }),
    read: (m) => [['levels', (m as M).levels!.toLocaleString('en-US')], ['dynamic range ≈ 6.02·n + 1.76', `${r((m as M).dr!, 1)} dB`]],
    check: (m, s, L) => (inGoal((m as M).dr!, L.goal) ? pass() : fail(`Dynamic range is ${r((m as M).dr!, 1)} dB; the goal is ${G(L)[0]}–${G(L)[1]} dB.`)) },
  lens: { aria: 'A lens forming an image; move the sensor until the blur circle shrinks to a point.',
    controls: (L) => [sl('di', 'Sensor distance behind the lens', N(L, 'f'), N(L, 'f') * 1.2, 0.01, 'mm')],
    model: (s, L) => { const ideal = 1 / (1 / N(L, 'f') - 1 / (N(L, 'subject') * 1000)); return { ideal, blur: (Math.abs(n(s, 'di') - ideal) / ideal) * 400 }; },
    read: (m, s, L) => [['focal length', `${L['f']} mm`], ['subject', `${L['subject']} m`], ['sensor at', `${s['di']} mm`], ['blur circle', `${r((m as M).blur!, 2)} (arb.)`]],
    check: (m) => ((m as M).blur! <= 0.5 ? pass() : fail(`Still soft: the image forms ${r((m as M).ideal!, 2)} mm behind the lens.`)) },
  lever: { aria: 'A beam on two supports carrying one load; move the load and each support’s share changes.',
    controls: (L) => [sl('x', 'Load position from the left support', 0, N(L, 'span'), 0.05, 'm')],
    model: (s, L) => { const R2 = (N(L, 'load') * n(s, 'x')) / N(L, 'span'); return { R1: N(L, 'load') - R2, R2 }; },
    read: (m, s, L) => [['load', `${L['load']} kg`], ['left support', `${r((m as M).R1!, 1)} kg (rated ${L['r1']})`], ['right support', `${r((m as M).R2!, 1)} kg (rated ${L['r2']})`]],
    check: (m, s, L) => { const x = m as M; return x.R1! <= N(L, 'r1') && x.R2! <= N(L, 'r2') ? pass(['Both supports within their (illustrative) ratings. In real life the rigger and the engineer decide.']) : fail(`A support is over its rating: left ${r(x.R1!, 1)}/${L['r1']}, right ${r(x.R2!, 1)}/${L['r2']} kg.`); } },
  entropy: { aria: 'How many guesses a password takes at your chosen length and character set.',
    controls: () => [sl('n', 'Length', 4, 32, 1, 'characters'), sl('k', 'Character set size', 10, 94, 1, 'symbols')],
    model: (s, L) => { const bits = n(s, 'n') * Math.log2(n(s, 'k')); return { bits, secs: 2 ** (bits - 1) / N(L, 'rate') }; },
    read: (m, s, L) => { const sec = (m as M).secs!; const y = sec / 31557600; const human = y > 1e6 ? '> a million years' : y > 1 ? `${r(y, 1)} years` : sec > 86400 ? `${r(sec / 86400, 1)} days` : sec > 3600 ? `${r(sec / 3600, 1)} hours` : `${r(sec, 1)} s`; return [['entropy n·log2(k)', `${r((m as M).bits!, 1)} bits`], ['guesses/s (illustrative)', N(L, 'rate').toExponential(0)], ['average time to guess', human]]; },
    check: (m, s, L) => ((m as M).bits! >= N(L, 'goalBits') ? pass() : fail(`Only ${r((m as M).bits!, 1)} bits; the policy needs ≥ ${L['goalBits']}.`)) },
  drift: { aria: 'A perfect reference clock and a drifting one; the gap grows with time and with the error in parts per million.',
    controls: (L) => [sl('ppm', 'Clock error', 0.001, 100, 0.001, 'ppm', true), sl('hours', 'Time since the reference was lost', 0.1, N(L, 'hoursMax', 24), 0.1, 'h')],
    model: (s, L) => { const fps = N(L, 'fps', 29.97), drift = n(s, 'ppm') * 1e-6 * n(s, 'hours') * 3600, at = n(s, 'ppm') * 1e-6 * N(L, 'goalHours', 1) * 3600; return { drift, frames: drift * fps, goalFrames: at * fps, fps }; },
    read: (m, s, L) => { const x = m as M; return [['drift = ppm × 10⁻⁶ × t', `${r(x.drift! * 1000, 3)} ms`], [`in frames at ${x.fps}`, `${r(x.frames!, 3)}`], [`after ${N(L, 'goalHours', 1)} h`, `${r(x.goalFrames!, 3)} frames`]]; },
    check: (m, s, L) => { const g = (L.goal as number[]) || [0, 0.5], f = (m as M).goalFrames!, h = N(L, 'goalHours', 1); return f >= g[0]! && f <= g[1]! ? pass([`At ${s['ppm']} ppm the clock slips ${r(f, 3)} frames in ${h} h — inside the goal.`]) : fail(`After ${h} h this clock is off by ${r(f, 3)} frames. The goal is ${g[0]}–${g[1]} frames.`); } },
  lipsync: { aria: 'A flash on the picture track and a beep on the sound track; the gap between them is the lip-sync offset.',
    controls: (L) => [sl('audio', 'Audio path delay', 0, N(L, 'audioMax', 400), 1, 'ms')],
    model: (s, L) => { const off = n(s, 'audio') - N(L, 'video', 0); return { off, frames: off / (1000 / N(L, 'fps', 29.97)) }; },
    read: (m, s, L) => { const x = m as M; return [['video path', `${N(L, 'video', 0)} ms`], ['audio path', `${s['audio']} ms`], ['offset = audio − video', `${r(x.off!, 1)} ms (${r(x.frames!, 2)} frames)`], ['heard as', x.off! < 0 ? 'sound EARLY' : x.off! > 0 ? 'sound late' : 'in sync']]; },
    check: (m, s, L) => { const w = (L['window'] as number[]) || [-15, 45], off = (m as M).off!; return off >= w[0]! && off <= w[1]! ? pass([`Offset ${r(off, 1)} ms: inside the window.`]) : fail(`Offset ${r(off, 1)} ms is outside the acceptable window (${w[0]} to +${w[1]} ms; sound early is noticed sooner than sound late).`); } },
  loudness: { aria: 'A loudness meter across a programme: one segment stands out; the gain trims it toward the target.',
    controls: (L) => { const segs = L['segs'] as Array<[string, number]>; return [sl('g', `Gain on ${(segs[N(L, 'adjust', 1)] || ['segment'])[0]}`, -20, 10, 0.5, 'dB')]; },
    model: (s, L) => { const segs = (L['segs'] as Array<[string, number]>).map((x, i) => ({ name: x[0], lufs: x[1] + (i === N(L, 'adjust', 1) ? n(s, 'g') : 0) })); return { segs, adj: segs[N(L, 'adjust', 1)] }; },
    read: (m, s, L) => [...(m['segs'] as Array<{ name: string; lufs: number }>).map((x): [string, string] => [x.name, `${r(x.lufs, 1)} LUFS`]), ['target', `${L['target']} LUFS (±${N(L, 'tol', 1)})`]],
    check: (m, s, L) => { const a = m['adj'] as { name: string; lufs: number }; const d = a.lufs - N(L, 'target'); return Math.abs(d) <= N(L, 'tol', 1) ? pass([`${a.name} now sits at ${r(a.lufs, 1)} LUFS — at the target.`]) : fail(`${a.name} is ${r(Math.abs(d), 1)} LU ${d > 0 ? 'louder' : 'quieter'} than the target. Gain = target − measured.`); } },
  fresnel: { aria: 'A microwave link across a valley with a ridge, the first Fresnel zone, and rain crossing the path.',
    controls: (L) => [sl('rain', 'Rain rate', 0, 100, 1, 'mm/h'), sl('h', 'Dish height (both ends)', 5, N(L, 'hMax', 60), 1, 'm')],
    model: (s, L) => { const D = N(L, 'D', 18), f = N(L, 'f', 7), obs = (L['obs'] as number[]) || [9, 30], d1 = obs[0]!, oh = obs[1]!, d2 = D - d1;
      const rr = 17.32 * Math.sqrt((d1 * d2) / (f * D)), clr = n(s, 'h') - oh, ratio = clr / rr; const diff = ratio >= 0.6 ? 0 : ratio >= 0 ? 6 * (1 - ratio / 0.6) : Math.min(30, 6 + 20 * -ratio);
      const gamma = N(L, 'k', 0.0035) * Math.max(0, n(s, 'rain')) ** N(L, 'alpha', 1.25), fade = gamma * D; return { r: rr, clr, ratio, diff, gamma, fade, margin: N(L, 'clearMargin', 18) - fade - diff, D }; },
    read: (m) => { const x = m as M; return [['Fresnel radius at the ridge', `${r(x.r!, 1)} m`], ['clearance', `${r(x.clr!, 1)} m (${Math.round(x.ratio! * 100)}% of r)`], ['diffraction loss', `${r(x.diff!, 1)} dB`], ['rain fade A = γ·d', `${r(x.gamma!, 3)} dB/km × ${x.D} km = ${r(x.fade!, 1)} dB`], ['fade margin left', `${r(x.margin!, 1)} dB`]]; },
    check: (m, s, L) => { const x = m as M; const why: string[] = []; if (n(s, 'rain') < N(L, 'stormRain', 30)) why.push(`Test it in the storm: set the rain to at least ${N(L, 'stormRain', 30)} mm/h.`);
      if (x.margin! < N(L, 'goalMargin', 3)) why.push(`Only ${r(x.margin!, 1)} dB of margin left; the link needs ≥ ${N(L, 'goalMargin', 3)} dB. ${x.ratio! < 0.6 ? 'The ridge is inside the Fresnel zone — clear it.' : 'Rain is eating the margin.'}`);
      return why.length ? { ok: false, why } : pass([`In ${s['rain']} mm/h rain the hop keeps ${r(x.margin!, 1)} dB of margin.`]); } },
  shannon: { aria: 'Several cellular links bonded together; the stack must reach the line the encoder needs.',
    controls: (L) => [sl('n', 'Bonded links', 1, N(L, 'nMax', 6), 1), ...(L['snrFixed'] == null ? [sl('snr', 'Signal-to-noise per link', -5, 30, 0.5, 'dB')] : [])],
    model: (s, L) => { const snr = L['snrFixed'] != null ? N(L, 'snrFixed') : n(s, 'snr'), C = N(L, 'B', 5) * Math.log2(1 + 10 ** (snr / 10)); return { snr, C, use: n(s, 'n') * N(L, 'eff', 0.5) * C }; },
    read: (m, s, L) => { const x = m as M; return [['SNR', `${x.snr} dB (${r(10 ** (x.snr! / 10), 2)}×)`], ['C = B·log2(1+S/N) per link', `${r(x.C!, 2)} Mb/s`], [`usable (${Math.round(N(L, 'eff', 0.5) * 100)}% × ${s['n']} links)`, `${r(x.use!, 2)} Mb/s`], ['encoder needs', `${N(L, 'need', 8)} Mb/s`]]; },
    check: (m, s, L) => ((m as M).use! >= N(L, 'need', 8) ? pass([`${s['n']} links carry ${r((m as M).use!, 1)} Mb/s — enough.`]) : fail(`Usable capacity ${r((m as M).use!, 1)} Mb/s is below the ${N(L, 'need', 8)} Mb/s the encoder needs.`)) },
  poll: { aria: 'Three hours of a room: outages and monitoring polls. An outage is seen only if a poll lands inside it.',
    controls: () => [sl('T', 'Polling interval', 1, 30, 0.5, 'min'), sl('ph', 'First poll at', 0, 14, 1, 'min past the hour')],
    model: (s, L) => { const hours = N(L, 'hours', 3), span = hours * 60, outs: Array<[number, number]> = []; const polls: number[] = [];
      for (let h = 0; h < hours; h += 1) outs.push([h * 60 + N(L, 'outStart'), h * 60 + N(L, 'outStart') + N(L, 'outLen')]); for (let t = n(s, 'ph'); t < span; t += n(s, 'T')) polls.push(t);
      const seen = outs.filter((o) => polls.some((p) => p >= o[0] && p < o[1])).length; return { outs: outs.length, seen, load: (N(L, 'devices') * 60) / n(s, 'T'), pReq: Math.min(1, N(L, 'dReq') / n(s, 'T')), guaranteed: n(s, 'T') <= N(L, 'dReq') }; },
    read: (m, s, L) => { const x = m as M; return [['outages seen (this timing)', `${x.seen} of ${x.outs}`], [`chance a ${L['dReq']}-min outage is seen, any timing`, `${Math.round(x.pReq! * 100)}%`], [`polls per hour (${L['devices']} devices)`, `${Math.round(x.load!).toLocaleString('en-US')} / ${N(L, 'budget').toLocaleString('en-US')}`]]; },
    check: (m, s, L) => { const x = m as M; if (!m['guaranteed']) return fail(`A ${L['dReq']}-minute outage can still fall between two polls ${s['T']} minutes apart (P = ${Math.round(x.pReq! * 100)}%). The interval must be no longer than the shortest outage that matters.`);
      if (x.load! > N(L, 'budget')) return fail(`Every outage is seen — but ${Math.round(x.load!).toLocaleString('en-US')} polls an hour is more than the monitoring server’s budget of ${N(L, 'budget').toLocaleString('en-US')}.`);
      return pass([`Any outage of ${L['dReq']} minutes or more is now seen, whatever its timing — and the server can keep up. Event-driven alerts still see it sooner.`]); } },
  flicker: { aria: 'A camera frame under lights pulsing at twice the mains frequency; bands appear unless the shutter holds a whole number of pulses.',
    controls: (L) => [{ kind: 'select', key: 'fps', label: 'Frame rate', options: ((L['fpsList'] as number[]) || [25, 29.97, 50, 59.94]).map((f) => ({ value: f, text: `${f} fps` })) }, sl('x', 'Shutter speed 1/x — x', 25, 1000, 1, '', true)],
    model: (s, L) => { const f = 2 * N(L, 'mains'), ts = 1 / n(s, 'x'), k = f * ts, sinc = Math.abs(Math.sin(Math.PI * k) / (Math.PI * k)); const nn = Math.round(f / n(s, 'fps')); return { f, n: k, depth: N(L, 'm') * sinc, angle: 360 * n(s, 'fps') * ts, alias: Math.abs(f - nn * n(s, 'fps')) }; },
    read: (m, s, L) => { const x = m as M; return [['light pulses', `${x.f} Hz (mains ${L['mains']} Hz × 2)`], ['pulses per exposure t·f', `${r(x.n!, 2)}`], ['band depth', `${r(x.depth! * 100, 1)}% of brightness`], ['shutter angle', `${Math.round(x.angle!)}°`], ['bands move at', x.alias! < 0.05 ? 'standing still' : `${r(x.alias!, 2)} Hz`]]; },
    check: (m, s, L) => { const x = m as M; if (x.angle! > 360.5) return fail(`A 1/${s['x']} s shutter is longer than one frame at ${s['fps']} fps (${Math.round(x.angle!)}°). The shutter can’t stay open longer than a frame.`);
      if (x.depth! > N(L, 'goal')) return fail(`Bands ${r(x.depth! * 100, 1)}% deep: 1/${s['x']} s holds ${r(x.n!, 2)} light pulses. Make it a whole number.`);
      return pass([`1/${s['x']} s holds ${r(x.n!, 2)} pulses — the bands average out${x.alias! < 0.05 ? `, and at ${s['fps']} fps they would stand still anyway.` : '.'}`]); } },
  fiber: { aria: 'A plan of three fibre routes from the equipment room to the stage rack, and the chosen link’s loss against the optics’ budget.',
    controls: (L) => [{ kind: 'select', key: 'route', label: 'Route', options: (L['routes'] as Array<{ name: string }>).map((x, i) => ({ value: i, text: x.name })) }, { kind: 'select', key: 'fiber', label: 'Fiber', options: (L['fibers'] as Array<{ name: string }>).map((x, i) => ({ value: i, text: x.name })) }],
    model: (s, L) => { const rt = (L['routes'] as Array<{ name: string; m: number; conn: number; splice: number; blocked?: string }>)[n(s, 'route')]!, f = (L['fibers'] as Array<{ name: string; att: number; budget: number; reach: number }>)[n(s, 'fiber')]!;
      const att = (f.att * rt.m) / 1000, con = rt.conn * N(L, 'conn'), spl = rt.splice * N(L, 'splice'), loss = att + con + spl; return { rt, f, att, con, spl, loss, margin: f.budget - loss, reach: rt.m <= f.reach }; },
    read: (m) => { const rt = m['rt'] as { m: number }, f = m['f'] as { budget: number; reach: number }, x = m as M; return [['length', `${rt.m} m`], ['fiber α·d', `${r(x.att!, 2)} dB`], ['connectors + splices', `${r(x.con! + x.spl!, 2)} dB`], ['total loss', `${r(x.loss!, 2)} dB`], ['budget · margin', `${f.budget} dB · ${r(x.margin!, 2)} dB`], ['reach', m['reach'] ? `within ${f.reach} m` : `BEYOND ${f.reach} m`]]; },
    check: (m, s, L) => { const rt = m['rt'] as { m: number; blocked?: string }, f = m['f'] as { name: string; budget: number; reach: number }, x = m as M;
      if (rt.blocked) return fail(rt.blocked); if (!m['reach']) return fail(`${f.name} reaches only ${f.reach} m at this speed; this route is ${rt.m} m.`);
      if (x.margin! < N(L, 'needMargin')) return fail(`Margin is ${r(x.margin!, 2)} dB; the spec asks for at least ${L['needMargin']} dB (for ageing, repairs and dirty connectors).`);
      return pass([`${r(x.loss!, 2)} dB of loss against a ${f.budget} dB budget leaves ${r(x.margin!, 2)} dB — the route the drawings promised.`]); } },
  cooling: { aria: 'The equipment room’s heat load against its cooling, with all units running and with one unit out.',
    controls: () => [sl('n', 'Cooling units', 1, 5, 1), { kind: 'toggle', key: 'out', label: 'Show one unit out for maintenance' }],
    model: (s, L) => { const cap = n(s, 'n') * N(L, 'unit'), capOut = (n(s, 'n') - 1) * N(L, 'unit'), now = s['out'] ? capOut : cap; return { cap, capOut, now, btu: N(L, 'load') * 1000 * 3.412, warm: now < N(L, 'load') }; },
    read: (m, s, L) => { const x = m as M; return [['heat load', `${L['load']} kW ≈ ${Math.round(x.btu!).toLocaleString('en-US')} BTU/h`], ['capacity, all units', `${x.cap} kW`], ['capacity, one unit out', `${x.capOut} kW`], ['room', m['warm'] ? 'HEATING UP' : 'holding']]; },
    check: (m, s, L) => { const x = m as M; if (x.capOut! < N(L, 'load')) return fail(`With one unit out, ${x.capOut} kW of cooling can’t carry ${L['load']} kW of heat. N+1 means the rest still cope.`); if (n(s, 'n') > N(L, 'maxUnits')) return fail('Covered — but more units than the mechanical engineer needs; the smallest N+1 set is enough.');
      return pass([`${s['n']} units: with one out, ${x.capOut} kW still carries ${L['load']} kW. The mechanical engineer of record selects the real units.`]); } },
};

export const phyInit = (L: PhysLab): PState => ({ ...L.start });
/** Set a control as the reference's controls do: sliders clamp to their range; selects take only their options; toggles take booleans. */
export function phySet(L: PhysLab, s: PState, key: string, v: number | boolean): PState {
  const c = SIMS[L.sim]?.controls(L).find((x) => x.key === key); if (!c) return s;
  if (c.kind === 'toggle') return typeof v === 'boolean' ? { ...s, [key]: v } : s;
  if (typeof v !== 'number' || !Number.isFinite(v)) return s;
  if (c.kind === 'select') return c.options.some((o) => o.value === v) ? { ...s, [key]: v } : s;
  return { ...s, [key]: Math.max(c.min, Math.min(c.max, v)) };
}
export function phyCheck(L: PhysLab, s: PState): Check { const S = SIMS[L.sim]; if (!S) return { ok: false, why: [`missing simulation ${L.sim}`] }; return S.check(S.model(s, L), s, L); }
export function phyRead(L: PhysLab, s: PState): Array<[string, string]> { const S = SIMS[L.sim]; return S ? S.read(S.model(s, L), s, L) : []; }
