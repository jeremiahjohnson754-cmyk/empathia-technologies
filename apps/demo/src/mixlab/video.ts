/**
 * Shoot the Service: SIGNAL's video flagship lab (founder, 12 Nov 2026). Two cameras, an LED wall, house lights on the mains, a switcher
 * and a stream with its own audio. Set the format, shutter, iris, ISO, ND and white balance; cut the service on cue; and line the sound
 * up with the picture. A teaching model: banding is the fractional part of the wall's refresh (or the lights' flicker) over the
 * shutter's time, exposure is the incident-meter equation, lip-sync is frames times frame time. Pure.
 */
export const FPS = [23.976, 25, 29.97, 50, 59.94] as const;
export const SHUTTERS = [24, 25, 30, 48, 50, 60, 100, 120, 125, 250, 500, 1000];
export const ISOS = [100, 200, 400, 800, 1600, 3200, 6400];
export const STOPS = [1.8, 2, 2.8, 4, 5.6, 8, 11, 16];
export const WALL_HZ = 3840; export const MAINS_FLICKER = 120; export const METER_C = 250;
export interface Cam { shutter: number; iso: number; f: number; nd: number; wb: number }
export interface Rig { fps: number; cams: Cam[]; audioDelay: number; pgm: number; pvw: number; key: boolean }
export interface Shot { key: string; label: string; lux: number; cct: number }
export const SHOTS: Shot[] = [{ key: 'wide', label: 'Cam 1 · wide of the stage', lux: 900, cct: 4300 }, { key: 'tight', label: 'Cam 2 · tight on the pastor', lux: 1200, cct: 4300 }];
export const SOURCES = ['Cam 1 · wide', 'Cam 2 · tight', 'Slides', 'Lyrics'];
export const CUES: Array<{ key: string; label: string; pgm: number; key_: boolean; says: string }> = [
  { key: 'walkin', label: 'Walk-in', pgm: 2, key_: false, says: 'Before the service: the welcome slide on the stream.' },
  { key: 'worship', label: 'Worship', pgm: 0, key_: true, says: 'The wide shot with the lyrics keyed over it.' },
  { key: 'sermon', label: 'Sermon', pgm: 1, key_: false, says: 'Tight on the pastor, nothing over the face.' },
  { key: 'video', label: 'Announcements video', pgm: 2, key_: false, says: 'Full-screen playback, no camera.' },
];
/** Fraction of a flicker or refresh cycle a shutter catches: 0 (or 1) is clean; in between, bands roll through the picture. */
export const bandFraction = (hz: number, shutter: number) => { const x = hz / shutter; return Math.round((x - Math.floor(x)) * 1000) / 1000; };
export const banded = (hz: number, shutter: number) => { const f = bandFraction(hz, shutter); return f > 0.05 && f < 0.95; };
/** Shutter angle: 360° × frame rate × exposure time. */
export const angle = (fps: number, shutter: number) => Math.round((360 * fps) / shutter);
/** Exposure error in stops: the scene's EV at this ISO (log₂(E·ISO / C)) less the ND and the camera's EV (log₂(N² / t)). Positive is over. */
export const evError = (c: Cam, lux: number) => Math.round((Math.log2((lux * c.iso) / METER_C) - c.nd - Math.log2((c.f * c.f) * c.shutter)) * 10) / 10 + 0;
export const frameMs = (fps: number) => 1000 / fps;
/** Video through the stream path: camera, switcher and encoder each hold a frame. */
export const VIDEO_FRAMES = 3;
export const lipSyncError = (r: Rig) => Math.round(r.audioDelay - VIDEO_FRAMES * frameMs(r.fps)) + 0;
export interface VGoal { key: string; label: string; ok: boolean; value: string; why: string }
export function videoGoals(r: Rig, cue: number): VGoal[] {
  const g: VGoal[] = [];
  r.cams.forEach((c, i) => { const s = SHOTS[i]!; const ev = evError(c, s.lux); const an = angle(r.fps, c.shutter);
    g.push({ key: `wall${i}`, label: `Cam ${i + 1}: no bands on the LED wall`, ok: !banded(WALL_HZ, c.shutter), value: `${WALL_HZ} ÷ ${c.shutter} = ${Math.round((WALL_HZ / c.shutter) * 1000) / 1000} refreshes per exposure`, why: 'The wall redraws thousands of times a second. If the shutter catches a fraction of a redraw, a band rolls through the picture: pick a shutter that catches whole ones.' });
    g.push({ key: `flicker${i}`, label: `Cam ${i + 1}: no flicker from the house lights`, ok: !banded(MAINS_FLICKER, c.shutter), value: `${MAINS_FLICKER} Hz ÷ ${c.shutter} = ${Math.round((MAINS_FLICKER / c.shutter) * 100) / 100}`, why: 'Lights on 60 Hz mains pulse 120 times a second; a shutter that catches whole pulses (1/60, 1/120) does not flicker.' });
    g.push({ key: `exp${i}`, label: `Cam ${i + 1}: exposed`, ok: Math.abs(ev) <= 0.5, value: `${ev > 0 ? '+' : ''}${ev} stops`, why: 'Within half a stop: faces neither blown out nor muddy. Iris, ND, ISO and shutter all move it.' });
    g.push({ key: `wb${i}`, label: `Cam ${i + 1}: white balance`, ok: Math.abs(c.wb - s.cct) <= 300, value: `${c.wb} K on ${s.cct} K light`, why: 'Set the camera to the light’s colour temperature or white looks blue or orange.' });
    g.push({ key: `motion${i}`, label: `Cam ${i + 1}: natural motion`, ok: an >= 170 && an <= 360, value: `${an}° shutter`, why: '180° to 360° looks natural; much faster stutters, slower smears. 360° at 59.94 is 1/60.' });
  });
  g.push({ key: 'sync', label: 'Lip-sync on the stream', ok: Math.abs(lipSyncError(r)) <= 10, value: `${r.audioDelay} ms of audio delay; video is ${VIDEO_FRAMES} frames (${Math.round(VIDEO_FRAMES * frameMs(r.fps))} ms) late`, why: 'The picture is held a frame at each step; the sound must wait as long, or mouths and words come apart.' });
  const C = CUES[cue]!; g.push({ key: 'cue', label: `On cue: ${C.label}`, ok: r.pgm === C.pgm && r.key === C.key_, value: `program is ${SOURCES[r.pgm]}${r.key ? ' + lyrics' : ''}`, why: C.says });
  return g;
}
export const videoScore = (gs: VGoal[]) => Math.round((100 * gs.filter((g) => g.ok).length) / gs.length);
export const freshVideo = (): Rig => ({ fps: 50, cams: [{ shutter: 50, iso: 800, f: 4, nd: 0, wb: 5600 }, { shutter: 100, iso: 1600, f: 2.8, nd: 0, wb: 3200 }], audioDelay: 0, pgm: 0, pvw: 1, key: false });
