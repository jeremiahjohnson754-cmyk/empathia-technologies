/**
 * RECORD IT, as the reference's chal_record.js has it. The vocal take: the gain ladder from mouth to converter (inverse square, mic
 * sensitivity, dBu, +18 dBu = 0 dBFS, preamp EIN −128 dBu, condenser self-noise, critical distance and direct-to-room ratio). The panel:
 * the 3-to-1 rule, comb-filter depth, polar patterns and NOM. The loudness delivery: BS.1770 gating per segment, ATSC A/85 −24 LKFS,
 * a true-peak ceiling — and the emergency alert relayed untouched. All figures are typical, not a product (CH-01).
 */
import { round, type Challenge, type CheckItem, type CState, type Readout } from './core.js';

const psum = (a: number[]) => 10 * Math.log10(a.reduce((s, v) => s + 10 ** (v / 10), 0));
export const MICS: Record<string, { t: string; S: number; self: number | null; phantom: boolean; min: number }> = { ldc: { t: 'Large-diaphragm condenser (cardioid)', S: -34, self: 12, phantom: true, min: 10 }, dyn: { t: 'Dynamic vocal mic (cardioid)', S: -54, self: null, phantom: false, min: 3 } };
export function take(st: CState) {
  const M = MICS[String(st['mic'])] || MICS['ldc']!, d = Number(st['d']), g = Number(st['g']), dist = 20 * Math.log10(d / 10), loud = 108 - dist, soft = 76 - dist, conv = (spl: number) => M.S + spl - 94 + 2.2 + g - 18;
  const roomN = 28 - 4.8, fan = st['fan'] ? 42 + (st['fanPos'] === 'rear' ? -20 : 0) : -99, atMic = psum([roomN, fan]), nRoom = conv(atMic), nPre = -128 + g - 18, nSelf = M.self != null ? conv(M.self) : -200;
  const noise = psum([nRoom, nPre, nSelf]), rt = st['room'] === 'treated' ? 0.3 : 0.6, Dc = 0.057 * Math.sqrt((2 * 26.25) / rt) * 1.7, drr = 20 * Math.log10(Dc / (d / 100)), live = !M.phantom || !!st['phantom'];
  return { M, loudSPL: loud, softSPL: soft, atMic, peak: live ? conv(loud) : -200, soft: live ? conv(soft) : -200, noise, nRoom, nPre, nSelf, drr, Dc, live, micLoud: M.S + loud - 94 + 2.2, micSoft: M.S + soft - 94 + 2.2 };
}
export const RECORD_TAKE: Challenge = {
  id: 'record-take', mode: 'record', icon: '⏺', title: 'Record a clean vocal take', time: 150, clock: 'until the singer has to leave', formula: 'dBFS = sensitivity + SPL − 94 + 2.2 + gain − 18',
  brief: (lv) => `One singer, one take: a soft verse (76 dB SPL at 10 cm) and a big chorus (peaks of 108 dB SPL at 10 cm). The fan in the corner hums at 42 dB SPL. Choose the mic and where it goes, then set the preamp gain so the chorus doesn’t clip and the verse isn’t buried in noise. ${['', 'Peaks between −18 and −3 dBFS, the verse 30 dB above the noise, and nothing clips.', 'Studio standard: peaks −12 to −6 dBFS, the verse 40 dB above the noise, no pops, not much room in the sound.', 'Mastery of the chain: 45 dB of quiet under the verse and a very dry vocal.', 'Mastery: the full standard, before the singer has to leave.'][lv]}`,
  init: () => ({ mic: 'ldc', d: 60, g: 55, phantom: false, pop: false, fan: true, fanPos: 'front', room: 'untreated', mon: 'speakers' }),
  controls: () => [
    { kind: 'select', key: 'mic', label: 'Microphone', options: [['ldc', MICS['ldc']!.t], ['dyn', MICS['dyn']!.t]] },
    { kind: 'slider', key: 'd', label: 'Mouth to mic', min: 2, max: 100, step: 1, unit: 'cm', log: true }, { kind: 'slider', key: 'g', label: 'Preamp gain', min: 0, max: 70, step: 1, unit: 'dB' },
    { kind: 'check', key: 'phantom', label: '48 V phantom power' }, { kind: 'check', key: 'pop', label: 'Pop filter' }, { kind: 'check', key: 'fan', label: 'The fan is running' },
    { kind: 'select', key: 'fanPos', label: 'The fan is…', options: [['front', 'behind the singer (in front of the mic)'], ['rear', 'behind the mic (in its null)']] },
    { kind: 'select', key: 'room', label: 'Room', options: [['untreated', 'Untreated bedroom (RT60 ≈ 0.6 s)'], ['treated', 'Treated room (RT60 ≈ 0.3 s)']] },
    { kind: 'select', key: 'mon', label: 'Singer monitors on', options: [['speakers', 'Speakers'], ['closed', 'Closed-back headphones']] }],
  readout: (st) => { const R = take(st); return [['chorus peaks', R.live ? `${round(R.peak, 1)} dBFS` : 'no signal', R.peak > 0 || !R.live ? 'bad' : ''], ['verse', R.live ? `${round(R.soft, 1)} dBFS` : '—'], ['noise floor', `${round(R.noise, 1)} dBFS`], ['verse above the noise', R.live ? `${round(R.soft - R.noise, 1)} dB` : '—'],
    ['loudest noise source', R.nRoom >= R.nPre && R.nRoom >= R.nSelf ? 'the room / fan' : R.nPre >= R.nSelf ? 'preamp' : 'mic self-noise'], ['direct-to-room', `${round(R.drr, 1)} dB`], ['critical distance (cardioid)', `${round(R.Dc, 2)} m`]]; },
  note: 'Gain structure is a ladder: each stage should sit comfortably between its own noise floor and its own clipping point. Set the gain for the loudest moment first, then check the quietest one clears the noise. Moving the mic closer raises the voice against the room — twice as close, 6 dB more voice — but go too close and plosives and proximity bass take over.',
  evaluate: (st, lv) => {
    const R = take(st), c: CheckItem[] = [], pk = [[0, 0], [-18, -3], [-12, -6], [-12, -6], [-12, -6]][lv]!, sn = [0, 30, 40, 45, 45][lv]!, drr = [0, 6, 10, 12, 12][lv]!, d = Number(st['d']);
    if (!R.live) return { instant: { title: 'No signal', joke: 'The meters are perfectly still. So is your career.', why: 'A condenser microphone needs 48 V phantom power from the preamp. Without it there is nothing to record.' } };
    if (R.peak > 0) return { instant: { title: 'The chorus clipped', joke: 'The best note of the night, now with built-in distortion.', why: `The chorus peaks at ${round(R.peak, 1)} dBFS. A converter can’t go past 0 dBFS; everything above is flattened, permanently. Lower the preamp gain (or back off the mic) and leave headroom.` } };
    c.push({ ok: R.peak >= pk[0]! && R.peak <= pk[1]!, w: 3, must: true, label: 'Chorus peaks', got: `${round(R.peak, 1)} dBFS`, want: `${pk[0]} to ${pk[1]} dBFS`, why: R.peak > pk[1]! ? 'Too hot — one louder note away from clipping.' : 'Too low — you’re throwing away bits and bringing noise up later.' });
    c.push({ ok: R.soft - R.noise >= sn, w: 3, must: true, label: 'The verse clears the noise', got: `${round(R.soft - R.noise, 1)} dB`, want: `≥ ${sn} dB`, why: `Noise here comes mostly from ${R.nRoom >= R.nPre && R.nRoom >= R.nSelf ? 'the room and the fan — turn the fan off or put it in the mic’s rear null, and move the mic closer.' : R.nPre >= R.nSelf ? 'the preamp: a dynamic mic needs a lot of gain. Move closer or use the condenser.' : 'the microphone’s own self-noise.'}` });
    c.push({ ok: R.drr >= drr, w: 2, label: 'Voice, not room', got: `${round(R.drr, 1)} dB direct-to-room`, want: `≥ ${drr} dB`, why: 'Past about a third of the critical distance the room’s reflections start to colour the vocal. Move the mic closer or treat the room.' });
    if (lv >= 2) {
      c.push({ ok: !!st['pop'] || d >= 15, w: 1.5, label: 'No popped plosives', got: st['pop'] ? 'pop filter' : `${d} cm, no filter`, want: 'pop filter under 15 cm', why: 'P and B sounds push a burst of air that hits a close diaphragm as a thump.' });
      c.push({ ok: d >= R.M.min, w: 1.5, label: 'No proximity-effect boom', got: `${d} cm`, want: `≥ ${R.M.min} cm for this mic`, why: 'Directional mics boost the bass as a source gets very close (proximity effect). Vocal dynamics are built for it; a studio condenser gets boomy.' });
      c.push({ ok: st['mon'] === 'closed', w: 1.5, must: true, label: 'No backing track in the vocal mic', got: st['mon'] === 'closed' ? 'closed-back headphones' : 'speakers', want: 'closed-back headphones', why: 'Speakers in the room play the backing into the microphone, and it can never be removed from the vocal track.' });
    }
    return { checks: c };
  },
};

// ------------------------------------------------------------------------------------------------------------------- the panel
export const PANEL_LV = [62, 56, 66, 58, 60]; export const PANEL_NM = ['Dr Osei', 'Ms Lind', 'Mr Farrow', 'Rev. Okafor', 'Prof. Ruiz']; export const PANEL_N = [0, 3, 4, 5, 5];
export const polar = (pat: string, th: number) => { const c = Math.cos(th); return pat === 'omni' ? 1 : pat === 'card' ? Math.max(1e-3, 0.5 + 0.5 * c) : Math.max(1e-3, Math.abs(0.37 + 0.63 * c)); };
export function panel(st: CState, lv: number) {
  const n = PANEL_N[lv]!, s = lv >= 3 ? 0.75 : 0.9, pat = String(st['pat']), auto = !!st['auto'], lev: number[] = [], drr: number[] = []; let worst = 0, wp: [number, number] | null = null;
  const dfac = pat === 'omni' ? 1 : pat === 'card' ? 1.7 : 1.9, Dc = 0.057 * Math.sqrt((2 * 150) / 0.8) * dfac, nom = auto ? 0 : 10 * Math.log10(n);
  for (let i = 0; i < n; i += 1) { const d = Number(st[`d${i}`]) / 100, spl = PANEL_LV[i]! - 20 * Math.log10(d); lev.push(-38 + spl - 94 + 2.2 + Number(st[`g${i}`]) - 18); drr.push(20 * Math.log10(Dc / d) - nom);
    for (let j = 0; j < n; j += 1) if (Math.abs(j - i) === 1) { const r = Math.hypot(s, d), th = Math.atan2(s, d), dj = Number(st[`d${j}`]) / 100, leak = 20 * Math.log10(dj / r) + 20 * Math.log10(polar(pat, th)) - (auto ? 15 : 0); if (!wp || leak > worst) { worst = leak; wp = [j, i]; } } }
  const a = 10 ** (worst / 20), comb = 20 * Math.log10((1 + a) / Math.max(1e-6, 1 - a)), mean = lev.reduce((x, y) => x + y, 0) / n;
  return { n, s, lev, worst, wp, comb, spread: Math.max(...lev) - Math.min(...lev), mean, drr, minDrr: Math.min(...drr) };
}
export const RECORD_PANEL: Challenge = {
  id: 'record-panel', mode: 'record', icon: '🎙', title: 'Record the panel discussion', time: 150, clock: 'until the moderator starts', formula: '3-to-1 rule: 20 × log₁₀(1 ÷ 3) ≈ −9.5 dB',
  brief: (lv) => `${PANEL_N[lv]} people at a table, each with a gooseneck condenser mic, recorded for the stream and the archive. Some are quiet, one is loud. Place each mic, set each trim, and stop the mics from hearing each other. ${['', 'Balance the voices within 3 dB and keep them out of each other’s mics.', 'Balance within 2 dB, pass the 3-to-1 rule on every neighbour, and keep the room out of it.', 'Five people, closer together, balanced within 1.5 dB and neighbours 12 dB down.', 'Mastery: the full panel, before the moderator starts.'][lv]}`,
  init: (lv) => { const s: CState = { pat: 'omni', auto: false }; for (let i = 0; i < PANEL_N[lv]!; i += 1) { s[`d${i}`] = [60, 35, 50, 45, 55][i]!; s[`g${i}`] = 36; } return s; },
  controls: (lv) => [{ kind: 'select', key: 'pat', label: 'Pickup pattern (all mics)', options: [['omni', 'Omnidirectional'], ['card', 'Cardioid'], ['super', 'Supercardioid']] }, { kind: 'check', key: 'auto', label: 'Automixer (only the talker’s mic opens)' },
    ...Array.from({ length: PANEL_N[lv]! }, (_x, i) => [{ kind: 'slider' as const, key: `d${i}`, label: `${PANEL_NM[i]}: mic distance`, min: 10, max: 80, step: 1, unit: 'cm' }, { kind: 'slider' as const, key: `g${i}`, label: `${PANEL_NM[i]}: trim`, min: 10, max: 60, step: 0.5, unit: 'dB' }]).flat()],
  readout: (st, lv) => { const C = panel(st, lv); const r: Readout = C.lev.map((v, i) => [`${PANEL_NM[i]} (${PANEL_LV[i]} dB SPL @1 m)`, `${round(v, 1)} dBFS avg`, v + 12 > 0 ? 'bad' : ''] as [string, string, '' | 'bad']);
    r.push(['level spread', `${round(C.spread, 1)} dB`], ['worst neighbour leak', C.wp ? `${PANEL_NM[C.wp[0]]} into ${PANEL_NM[C.wp[1]]}’s mic, ${round(C.worst, 1)} dB` : '—', C.worst > -9.5 ? 'bad' : ''], ['comb-filter ripple', `±${round(C.comb / 2, 1)} dB`], ['open mics', st['auto'] ? '1 (automixer)' : `${C.n} (+${round(10 * Math.log10(C.n), 1)} dB of room)`], ['worst direct-to-room', `${round(C.minDrr, 1)} dB`]); return r; },
  note: 'The 3-to-1 rule: keep each neighbour at least three times further from a mic than the person it belongs to, and their voice arrives about 9.5 dB down — too quiet to carve deep comb-filter notches when the two mics are mixed. Directional mics and an automixer buy you more.',
  evaluate: (st, lv) => {
    const C = panel(st, lv), c: CheckItem[] = [], tol = [0, 3, 2, 1.5, 1.5][lv]!, lk = [0, -6, -9.5, -12, -12][lv]!, dr = [0, 3, 6, 8, 8][lv]!;
    if (C.lev.some((v) => v + 12 > 0)) return { instant: { title: 'A voice clipped', joke: 'Mr Farrow laughed. The recorder did not survive it.', why: 'A speech average this hot puts the peaks (about 12 dB higher) past 0 dBFS. Bring the trim down.' } };
    c.push({ ok: C.spread <= tol, w: 3, must: true, label: 'Voices balanced', got: `${round(C.spread, 1)} dB between loudest and quietest`, want: `≤ ${tol} dB`, why: 'Loud and quiet talkers need different trims — and a quiet talker needs the mic closer before you add gain.' });
    c.push({ ok: C.mean >= -26 && C.mean <= -16, w: 2, label: 'Recording level', got: `${round(C.mean, 1)} dBFS average`, want: '−26 to −16 dBFS (peaks ≈ −14 to −4)', why: 'Speech peaks run about 12 dB over the average; leave headroom for the laugh.' });
    c.push({ ok: C.worst <= lk, w: 3, must: lv >= 2, label: 'Neighbours out of each other’s mics', got: `${round(C.worst, 1)} dB`, want: `≤ ${lk} dB`, why: 'Move each mic closer to its own talker (3-to-1), use a directional pattern, and turn on the automixer.' });
    c.push({ ok: C.minDrr >= dr, w: 2, label: 'Voice, not room', got: `${round(C.minDrr, 1)} dB`, want: `≥ ${dr} dB`, why: 'Every open mic hears the room. Close, directional mics and fewer open channels keep it dry.' });
    if (lv >= 2) { const ds = Array.from({ length: C.n }, (_x, i) => Number(st[`d${i}`])); c.push({ ok: ds.every((d) => d >= 15), w: 1, label: 'Room to move', got: `closest mic ${Math.min(...ds)} cm`, want: '≥ 15 cm', why: 'People turn their heads. At 10 cm a small turn changes the level by several dB and pops the plosives.' }); }
    return { checks: c };
  },
};

// ------------------------------------------------------------------------------------------------------------------- loudness
export const SEGMENTS = [
  { n: 'Anchor open', sn: 'Anchor', d: 40, L: -26, plr: 14 }, { n: 'News package + music bed', sn: 'Package', d: 60, L: -17, plr: 11 }, { n: 'Commercial (supplied)', sn: 'Commercial', d: 30, L: -14, plr: 7 },
  { n: 'Station flood-safety promo', sn: 'Promo', d: 30, L: -13, plr: 6 }, { n: 'Emergency alert (relayed as received)', sn: 'Alert 🔒', d: 15, L: -20, plr: 3, locked: true }, { n: 'Weather', sn: 'Weather', d: 50, L: -25, plr: 15 }, { n: 'Music outro', sn: 'Outro', d: 20, L: -12, plr: 9 },
] as const;
export function loudness(st: CState) {
  const lim = !!st['lim'], ceil = Number(st['ceil']);
  const seg = SEGMENTS.map((s, i) => { const locked = 'locked' in s && s.locked, g = locked ? 0 : Number(st[`g${i}`] || 0), raw = s.L + g + s.plr, tp = lim && !locked ? Math.min(raw, ceil) : raw, red = lim && !locked ? Math.max(0, raw - ceil) : 0;
    return { n: s.n, sn: s.sn, d: s.d, L: s.L + g - (red > 4 ? (red - 4) * 0.15 : 0), tp, red, locked }; });
  const prog = seg.filter((s) => !s.locked && s.L > -70), E = (a: typeof prog) => { let t = 0, e = 0; for (const s of a) { t += s.d; e += s.d * 10 ** (s.L / 10); } return 10 * Math.log10(e / t); };
  const ung = E(prog), gated = prog.filter((s) => s.L > ung - 10);
  return { seg, I: E(gated.length ? gated : prog), tpMax: Math.max(...prog.map((s) => s.tp)), maxRed: Math.max(...prog.map((s) => s.red)) };
}
const stdTarget = (std: unknown) => (std === 'a85' ? -24 : std === 'r128' ? -23 : -14);
export const RECORD_LOUD: Challenge = {
  id: 'record-loud', mode: 'record', icon: '📏', title: 'Deliver the programme at the right loudness', time: 150, clock: 'until air', formula: 'Integrated loudness = gated energy average of the programme → −24 LKFS',
  brief: (lv) => `A local-news half-hour is going out on a U.S. broadcast channel. Viewers have complained it’s too loud — the commercial and the station’s own flood-safety promo jump out, the anchor is too quiet. Set each segment’s gain so the programme meets the broadcast loudness practice. ${['', 'Integrated loudness −24 LKFS ±2 dB.', 'Pick the right standard, ±1 dB, and no segment more than 3 LU from the target.', 'Every segment within 2 LU, true peaks under −2 dBTP, and no audible over-limiting.', 'Mastery: the full delivery spec, before air.'][lv]}`,
  init: (lv) => { const s: CState = { std: lv >= 2 ? 'r128' : 'a85', lim: false, ceil: -1, alertEdited: false }; SEGMENTS.forEach((x, i) => { if (!('locked' in x)) s[`g${i}`] = 0; }); return s; },
  controls: (lv) => [
    { kind: 'action', key: 'alertEdited', label: '🔉 Turn the emergency alert down to match', set: { alertEdited: true }, finish: true },
    ...(lv >= 2 ? [{ kind: 'select' as const, key: 'std', label: 'Delivery standard', options: [['a85', 'ATSC A/85 — −24 LKFS (U.S. broadcast)'], ['r128', 'EBU R 128 — −23 LUFS (European broadcast)'], ['str', 'Streaming platform — −14 LUFS']] as Array<[string, string]> }] : []),
    ...SEGMENTS.flatMap((s, i) => ('locked' in s ? [] : [{ kind: 'slider' as const, key: `g${i}`, label: `${s.n} — gain`, min: -15, max: 15, step: 0.5, unit: 'dB' }])),
    { kind: 'check', key: 'lim', label: 'True-peak limiter on the output' }, { kind: 'select', key: 'ceil', label: 'Limiter ceiling', options: [[-1, '−1 dBTP'], [-2, '−2 dBTP'], [-3, '−3 dBTP']] }],
  readout: (st) => { const R = loudness(st), T0 = stdTarget(st['std']); const r: Readout = R.seg.map((s) => [s.sn, `${round(s.L, 1)} LKFS · peak ${round(s.tp, 1)} dBTP${s.locked ? ' · relayed untouched' : ''}`, !s.locked && Math.abs(s.L - T0) > 2 ? 'bad' : ''] as [string, string, '' | 'bad']);
    r.push(['integrated', `${round(R.I, 1)} LKFS`], ['target', `${T0} (${st['std'] === 'a85' ? 'ATSC A/85' : st['std'] === 'r128' ? 'EBU R 128' : 'a streaming platform'})`], ['highest true peak', `${round(R.tpMax, 1)} dBTP`, R.tpMax > -2 ? 'bad' : ''], ['limiting', st['lim'] ? `up to ${round(R.maxRed, 1)} dB` : 'off']); return r; },
  note: 'Loudness meters (ITU-R BS.1770) measure what people hear, not peaks: K-weighting, then an energy average over time, ignoring silence (the −70 absolute gate) and quiet passages 10 LU below the average (the relative gate). U.S. broadcast practice (ATSC A/85, required for commercials by law) is −24 LKFS; EBU R 128 is −23 LUFS. A limiter catches peaks — it can’t fix loudness without squashing.',
  evaluate: (st, lv) => {
    if (st['alertEdited']) return { instant: { title: 'You edited an emergency alert', joke: 'The loudest thing on air is now the one message that had to be heard.', why: 'Emergency messages are relayed exactly as received — their wording and their level belong to the emergency managers who issued them. Measure your programme around them; never re-level, trim or talk over the alert.' } };
    const R = loudness(st), T0 = -24, c: CheckItem[] = [], tol = [0, 2, 1, 1, 1][lv]!, sw = [0, 99, 3, 2, 2][lv]!;
    if (lv >= 2) c.push({ ok: st['std'] === 'a85', w: 2, must: true, label: 'The right standard', got: st['std'] === 'a85' ? 'ATSC A/85' : st['std'] === 'r128' ? 'EBU R 128' : 'streaming', want: 'ATSC A/85 (U.S. broadcast)', why: 'A U.S. broadcast channel works to ATSC A/85 (−24 LKFS); the CALM Act makes it law for commercials. R 128 is the European practice; −14 LUFS is a streaming normalisation level.' });
    c.push({ ok: Math.abs(R.I - T0) <= tol, w: 3, must: true, label: 'Integrated loudness', got: `${round(R.I, 1)} LKFS`, want: `${T0} ±${tol}`, why: 'Bring the loud segments down and the quiet ones up; integrated loudness is an energy average, so the loud segments dominate it.' });
    if (lv >= 2) { const worst = R.seg.filter((s) => !s.locked).reduce((m, s) => (Math.abs(s.L - T0) > Math.abs(m.L - T0) ? s : m)); c.push({ ok: Math.abs(worst.L - T0) <= sw, w: 2.5, must: true, label: 'No segment jumps out', got: `${worst.n} at ${round(worst.L, 1)}`, want: `every segment within ${sw} LU of ${T0}`, why: 'Viewers reach for the remote at the jumps, not at the average. The commercial and the promo are the usual offenders.' }); }
    if (lv >= 3) { c.push({ ok: R.tpMax <= -2, w: 2, must: true, label: 'True peaks', got: `${round(R.tpMax, 1)} dBTP`, want: '≤ −2 dBTP', why: 'Lossy encoders downstream overshoot; A/85 recommends −2 dBTP. A true-peak limiter set to −2 does it.' }); c.push({ ok: R.maxRed <= 4, w: 1, label: 'Not squashed by the limiter', got: `${round(R.maxRed, 1)} dB of limiting`, want: '≤ 4 dB', why: 'Use gain for loudness and the limiter only for the odd peak.' }); }
    return { checks: c };
  },
};
