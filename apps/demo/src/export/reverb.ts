/**
 * The reverberation report: what #/commissioning/instruments/reverb shows, as a Report (./model.ts) — each position with its file's
 * fingerprint, every band and fit with its refusals and quality notes, the mean over positions, the comparison with the project's target
 * (a comparison, not a commissioning result), the declared measurement chain and the method. Synthetic references are labelled as such.
 */
import { SITE } from '../campus/canon.js';
import { quality, meanOverPositions, type Analysis } from '../bench/reverb.js';
import type { Report, Tone } from './model.js';
import type { MadeBy } from './cx.js';

export interface Position { name: string; bytes: number; sha: string; rate: number; bits: number; channels: number; seconds: number; format: 'wav' | 'csv'; synthetic: boolean; bands: Analysis[] }
export type Chain = 'calibrated' | 'measurement' | 'consumer' | 'unknown';
/** what each declared chain lets the figures claim. Decay times are relative (a slope), so calibration of level matters less than for SPL,
 *  but a consumer microphone's processing (automatic gain, noise suppression) can bend a decay: never treated as a measurement microphone. */
export const CHAINS: Record<Chain, { label: string; tone: Tone; note: string; claim: string }> = {
  calibrated: { label: 'Measurement microphone, calibration certificate on file', tone: 'ok', note: 'A measurement microphone with a current calibration: the decay figures can be reported as measured, with the certificate attached to the test as evidence.', claim: 'Declared chain: a calibrated measurement microphone (its certificate belongs with the evidence).' },
  measurement: { label: 'Measurement microphone, no calibration on file', tone: 'warn', note: 'Decay times are slopes, so they do not depend on the level calibration; attach the calibration before any level (SPL) figure is reported from this chain.', claim: 'Declared chain: a measurement microphone without calibration on file (decay times only; no level figures).' },
  consumer: { label: 'Phone or other consumer microphone', tone: 'bad', note: 'A phone or consumer microphone is not a calibrated measurement microphone. Its automatic gain and noise suppression can bend a decay: these figures are indicative only and do not stand as commissioning evidence.', claim: 'Declared chain: a phone or consumer microphone — indicative only, not commissioning evidence.' },
  unknown: { label: 'Not declared', tone: 'warn', note: 'Say what made the recordings before the figures are used as evidence: the chain decides what they can claim.', claim: 'The measurement chain was not declared: indicative only until it is.' },
};
const r3 = (v: number | null | undefined) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : null);

export function reverbPackage(x: { positions: Position[]; chain: Chain; target: { seconds: number; tolPct: number } | null }, by: MadeBy): Report {
  const means = meanOverPositions(x.positions.map((p) => p.bands)); const ch = CHAINS[x.chain]; const synth = x.positions.filter((p) => p.synthetic).length;
  const cmp = (v: number | null) => (x.target && v !== null ? Math.round(((v - x.target.seconds) / x.target.seconds) * 1000) / 10 : null);
  const outside = x.target ? means.filter((m) => { const o = cmp(m.t20.mean); return o !== null && Math.abs(o) > x.target!.tolPct; }) : [];
  const t1k = means.find((m) => m.band === '1 kHz') || means[0];
  const status: Report['status'] = x.chain === 'consumer' || x.chain === 'unknown'
    ? { label: 'Indicative only', tone: 'warn', why: ch.claim }
    : !x.target ? { label: 'No target set', tone: 'muted', why: 'measured figures without a project target to compare' }
      : outside.length ? { label: `${outside.length} band${outside.length === 1 ? '' : 's'} outside the target`, tone: 'warn', why: outside.map((m) => `${m.band} ${cmp(m.t20.mean)! > 0 ? '+' : ''}${cmp(m.t20.mean)}%`).join('; ') }
        : { label: 'Within the target', tone: 'ok', why: `every band with a T20 within ±${x.target.tolPct}% of ${x.target.seconds} s` };
  const rows = x.positions.flatMap((p, i) => p.bands.flatMap((a) => a.fits.map((f) => ({ pos: `P${i + 1}`, band: a.band, fig: f.name, range: `${f.from} to ${f.to} dB`, res: f.refused ? 'Refused' : 'Given', s: r3(f.seconds), r: f.r, dr: a.dynamicRange, why: f.refused || '' }))));
  const charted = means.filter((m) => m.t20.mean !== null);
  return {
    schema: 'empathia.report/1', id: `RV-${by.at.slice(0, 10)}-${x.positions.length}P`, kind: 'reverberation',
    title: 'Reverberation from impulse responses', subtitle: `${x.positions.length} position${x.positions.length === 1 ? '' : 's'} · EDT, T20 and T30 by octave band${synth ? ` · ${synth} synthetic reference${synth === 1 ? '' : 's'}` : ''}`,
    scope: { tenant: SITE.enterprise, site: SITE.name, building: '—', floor: '—', room: 'The room the engineer measured', roomId: '' },
    status, generatedAt: by.at, role: by.role, build: by.build, primary: 'Fits',
    provenance: [
      ...(synth ? [`Synthetic references included: ${synth} of the positions ${synth === 1 ? 'is a SYNTHETIC REFERENCE' : 'are SYNTHETIC REFERENCES'}, noise decaying at exactly 0.70 s, a known answer for checking the instrument; ${synth === 1 ? 'it describes' : 'they describe'} no room.`] : []),
      'Worked out in the browser from the files listed, each fingerprinted with SHA-256; nothing was uploaded.',
      ch.claim,
      'Method after the published approach of ISO 3382-2 (Schroeder integration, noise subtraction and truncation, least-squares fits); the standard is not reproduced. Octave filters are an approximation of the standard filters.',
      'A comparison with a project target is not a commissioning result: the test is recorded by the commissioning engineer, with these files as evidence, and verified by someone else.',
      `Made as ${by.role}: a perspective on the record, which grants no permission.`,
    ],
    headline: `${x.positions.length} position${x.positions.length === 1 ? '' : 's'} analysed. Mean T20 at ${t1k?.band || '1 kHz'}: ${t1k?.t20.mean ?? '—'} s (n=${t1k?.t20.n ?? 0}).${x.target ? ` Target ${x.target.seconds} s ± ${x.target.tolPct}%: ${outside.length ? `${outside.map((m) => m.band).join(', ')} outside.` : 'every band with a T20 within.'}` : ' No target set.'}`,
    kpis: [
      { label: 'Positions', value: String(x.positions.length), note: synth ? `${synth} synthetic reference${synth === 1 ? '' : 's'}` : 'measured files' },
      { label: `Mean T20, ${t1k?.band || '1 kHz'}`, value: t1k?.t20.mean === null || !t1k ? '—' : `${t1k.t20.mean} s`, note: `n=${t1k?.t20.n ?? 0}` },
      { label: `Mean T30, ${t1k?.band || '1 kHz'}`, value: t1k?.t30.mean === null || !t1k ? '—' : `${t1k.t30.mean} s`, note: `n=${t1k?.t30.n ?? 0}` },
      { label: 'Target', value: x.target ? `${x.target.seconds} s ± ${x.target.tolPct}%` : 'none set' },
      { label: 'Measurement chain', value: ch.label },
    ],
    ...(charted.length ? { chart: { title: 'Mean T20 by band, seconds', categories: charted.map((m) => m.band), series: [{ name: 'Mean T20 (s)', tone: 'info' as const, values: charted.map((m) => m.t20.mean!) }] } } : {}),
    sections: [
      { id: 'positions', heading: 'The positions and their files', table: { title: 'Positions', cols: [{ key: 'p', label: 'Position' }, { key: 'f', label: 'File' }, { key: 'k', label: 'Kind', kind: 'status' }, { key: 'rate', label: 'Rate (Hz)', kind: 'number' }, { key: 'bits', label: 'Bits', kind: 'number' }, { key: 'len', label: 'Length (s)', kind: 'number' }, { key: 'dr', label: 'Dynamic range (dB)', kind: 'number' }, { key: 'sha', label: 'SHA-256' }],
        rows: x.positions.map((p, i) => ({ p: `P${i + 1}`, f: p.name, k: p.synthetic ? 'SYNTHETIC REFERENCE' : `measured (${p.format.toUpperCase()})`, rate: p.rate, bits: p.bits, len: p.seconds, dr: p.bands[0]!.dynamicRange, sha: p.sha })) } },
      { id: 'means', heading: 'The mean over positions', text: ['Refused figures are left out of a mean; n is how many positions gave the figure.'], table: { title: 'Means', cols: [{ key: 'b', label: 'Band' }, { key: 'e', label: 'EDT (s)', kind: 'number' }, { key: 'en', label: 'n', kind: 'number' }, { key: 't2', label: 'T20 (s)', kind: 'number' }, { key: 't2n', label: 'n', kind: 'number' }, { key: 't3', label: 'T30 (s)', kind: 'number' }, { key: 't3n', label: 'n', kind: 'number' }, { key: 'vs', label: x.target ? `T20 against ${x.target.seconds} s (%)` : 'Against a target' }],
        rows: means.map((m) => { const o = cmp(m.t20.mean); return { b: m.band, e: m.edt.mean, en: m.edt.n, t2: m.t20.mean, t2n: m.t20.n, t3: m.t30.mean, t3n: m.t30.n, vs: o === null ? (x.target ? 'no T20' : 'no target set') : `${o > 0 ? '+' : ''}${o}% (${Math.abs(o) <= x.target!.tolPct ? 'within' : o > 0 ? 'above' : 'below'})` }; }) } },
      { id: 'fits', heading: 'Every band and fit, with its refusals', table: { title: 'Fits', cols: [{ key: 'pos', label: 'Position' }, { key: 'band', label: 'Band' }, { key: 'fig', label: 'Figure' }, { key: 'range', label: 'Range' }, { key: 'res', label: 'Result', kind: 'status' }, { key: 's', label: 'Seconds', kind: 'number' }, { key: 'r', label: 'r', kind: 'number' }, { key: 'dr', label: 'Dynamic range (dB)', kind: 'number' }, { key: 'why', label: 'Refused because' }], rows } },
      { id: 'quality', heading: 'Measurement quality', bullets: (() => { const q = x.positions.flatMap((p, i) => p.bands.flatMap((a) => quality(a).map((n) => `P${i + 1} ${a.band}: ${n}`))); return q.length ? q : ['Every decay is straight over the ranges shown (ξ ≤ 10 ‰), T30 agrees with T20 within 10 %, and every response has at least 45 dB of range.']; })() },
      { id: 'method', heading: 'Method', facts: [
        ['Start', 'the direct sound: the first sample within 20 dB of the peak'], ['Noise', 'the mean energy of the last tenth, subtracted; the decay cut where its 10 ms energy comes within 5 dB of the floor'],
        ['Decay curve', 'Schroeder backward integration of the squared response, in dB'], ['Fits', 'least squares over EDT 0 to −10 dB, T20 −5 to −25 dB, T30 −5 to −35 dB; extrapolated to 60 dB'],
        ['Refusals', 'a figure needs 10 dB of range beyond its evaluation range (T20 35 dB, T30 45 dB) and a decay that reaches it'], ['Quality', 'ξ = 1000·(1 − r²) per mille (flagged over 10 ‰); curvature C = 100·(T30/T20 − 1) % (flagged over 10 %)'],
        ['Bands', '125 Hz to 4 kHz, zero-phase fourth-order band-pass; an approximation of the standard filters'], ['Validation', 'checked against synthetic responses of known decay time: tests/unit/bench-reverb.test.mjs'],
      ] },
    ],
    dossier: { chain: x.chain, target: x.target, positions: x.positions.map((p, i) => ({ id: `P${i + 1}`, file: p.name, sha256: p.sha, synthetic: p.synthetic, rate: p.rate, bits: p.bits, seconds: p.seconds, bands: p.bands.map((a) => ({ band: a.band, dynamicRange: a.dynamicRange, noiseDb: a.noiseDb, truncatedAt: a.truncatedAt, fits: a.fits.map((f) => ({ name: f.name, seconds: f.seconds, r: f.r, refused: f.refused })) })) })), means },
  };
}
