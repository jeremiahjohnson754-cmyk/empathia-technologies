/**
 * The film's sound, all of it made here (no licensed music or effects): a quiet room tone under the scenes, and the comb filter you can
 * hear at a seat — noise played twice, the second copy delayed by that seat's Δt and scaled by its reflection gain. Nothing makes a
 * sound until the viewer has chosen sound on; levels are kept low (founder rule: user opt-in precedes sound, never loud).
 */
import { reflection, type Rig, type Seat, C } from './acoustics.js';

let ctx: AudioContext | null = null; let bed: { stop: () => void } | null = null; let comb: { stop: () => void } | null = null;
const Ctor = (): typeof AudioContext | null => (typeof window === 'undefined' ? null : (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || null));
/** Called from the viewer's own click (a browser allows sound only after one). */
export function enableSound(): boolean { const K = Ctor(); if (!K) return false; try { ctx ||= new K(); void ctx.resume(); return true; } catch { return false; } }
export const soundReady = () => !!ctx && ctx.state !== 'closed';
function noise(seconds: number, kind: 'brown' | 'pink'): AudioBuffer {
  const c = ctx!; const n = Math.floor(c.sampleRate * seconds); const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0);
  let last = 0; let b0 = 0; let b1 = 0; let b2 = 0;
  for (let i = 0; i < n; i += 1) { const w = Math.random() * 2 - 1;
    if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11; } }
  return b;
}
/** A barely-there room tone for the sanctuary scenes. */
export function roomTone(on: boolean): void {
  bed?.stop(); bed = null; if (!on || !ctx) return;
  const src = ctx.createBufferSource(); src.buffer = noise(4, 'brown'); src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
  const g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 1.5);
  src.connect(lp).connect(g).connect(ctx.destination); src.start();
  bed = { stop: () => { try { g.gain.cancelScheduledValues(ctx!.currentTime); g.gain.setTargetAtTime(0, ctx!.currentTime, 0.2); src.stop(ctx!.currentTime + 0.8); } catch { /* already stopped */ } } };
}
/** Three seconds of what a seat hears: the direct sound plus the ceiling's copy, Δt later. Returns false when sound is off. */
export function listenAt(s: Seat, rig: Rig): boolean {
  if (!ctx) return false; comb?.stop();
  const src = ctx.createBufferSource(); src.buffer = noise(3, 'pink');
  const direct = ctx.createGain(); direct.gain.value = 1;
  const late = ctx.createDelay(0.05); late.delayTime.value = s.dl / C; const lg = ctx.createGain(); lg.gain.value = reflection(s, rig);
  const out = ctx.createGain(); out.gain.value = 0; out.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.15); out.gain.setValueAtTime(0.12, ctx.currentTime + 2.7); out.gain.linearRampToValueAtTime(0, ctx.currentTime + 3);
  src.connect(direct).connect(out); src.connect(late).connect(lg).connect(out); out.connect(ctx.destination); src.start(); src.stop(ctx.currentTime + 3.05);
  comb = { stop: () => { try { src.stop(); } catch { /* done */ } } };
  return true;
}
export function silence(): void { bed?.stop(); bed = null; comb?.stop(); comb = null; }
