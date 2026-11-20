/**
 * Independent validation of a measured value: the server works the value out again from the evidence (migration 0040, ADR-0016;
 * founder, 17 Nov 2026, 19:05: "independent evidence validation").
 *
 * Until now a bench worked a value out in the browser and the server recorded what it was sent, with the file. The file proved that
 * something was uploaded, not that the number came from it. Here the server reads the evidence itself — the analysis package, and
 * through it each impulse response — runs the same analysis (packages/commissioning-engine/src/acoustics.ts) and gets its own value.
 * That value is the one recorded and judged. A value sent that differs from it is refused, with both numbers.
 *
 * What it can read: a package whose positions are synthetic reference signals (regenerated here from the decay, seed, rate and floor
 * the package states: the same generator gives the same samples), or response files uploaded as evidence (CSV, or WAV). What it
 * cannot read it does not accept: a package naming a file that was not uploaded has no value here.
 *
 * What this is not: it does not make a synthetic signal a measurement of a room (that stays SIMULATED), and it does not check that a
 * response file was recorded in the room it is said to be from. It checks arithmetic and provenance, which is what a server can check.
 */
import { analyseBands, meanOverPositions, readCsv, readWav, syntheticIR, type Analysis, type IR } from '@empathia/commissioning-engine/acoustics';
import type { RequestContext } from '../auth/context.js';
import type { ObjectStore } from '../storage/objectStore.js';
import { evidenceContent } from './commissioning.js';

/** The metrics the server works out itself, and the fit each is read from. */
export const RECOMPUTED: Record<string, 'T30' | 'T20'> = { t30_mid: 'T30', t20_mid: 'T20' };
export const TOLERANCE = 0.015;   // seconds: the bench and the server round to a hundredth
const MID = ['500 Hz', '1 kHz']; const MAX_SAMPLES = 3_000_000; const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const r2 = (n: number) => Math.round(n * 100) / 100;

export interface Recomputed { value: number | null; why: string[]; synthetic: boolean; positions: Array<{ position: string; source: string; t500: number | null; t1k: number | null }>; ms: number }

export async function recomputeReverberation(ctx: RequestContext, store: ObjectStore, evidenceId: string, metric: string): Promise<Recomputed> {
  const t0 = Date.now(); const fit = RECOMPUTED[metric]!; const out: Recomputed = { value: null, why: [], synthetic: false, positions: [], ms: 0 }; const fail = (w: string): Recomputed => ({ ...out, why: [w], ms: Date.now() - t0 });
  const file = await evidenceContent(ctx, store, evidenceId);
  let pkg: { kind?: unknown; positions?: unknown };
  try { pkg = JSON.parse(file.data.toString('utf8')) as typeof pkg; } catch { return fail('the evidence is not an analysis package the server can read (it is not JSON): a value for this test is worked out again from its evidence, so the evidence has to be the package the bench makes'); }
  if (!pkg || pkg.kind !== 'reverberation analysis package' || !Array.isArray(pkg.positions)) return fail('the evidence is not a reverberation analysis package (kind, positions): the server cannot work the value out from it');
  const ps = pkg.positions as Array<{ position?: unknown; response?: Record<string, unknown> }>;
  if (ps.length < 2 || ps.length > 8) return fail(`a reverberation figure is the mean of 2 to 8 positions; the package has ${ps.length}`);
  const bands: Analysis[][] = []; let samples = 0;
  for (const p of ps) {
    const label = String(p.position ?? bands.length + 1).slice(0, 12); const r = p.response || {}; let ir: IR; let source: string;
    if (r['synthetic'] === true) {
      const decay = Number(r['decaySeconds']); const seed = Number(r['seed']); const rate = Number(r['rate']); const floorDb = r['floorDb'] === undefined ? -80 : Number(r['floorDb']);
      if (!(decay >= 0.05 && decay <= 20) || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || ![8000, 16000, 22050, 24000, 32000, 44100, 48000].includes(rate) || !(floorDb <= -20 && floorDb >= -120)) return fail(`position ${label}: the synthetic response is described by a decay (0.05 to 20 s), a seed, a rate and a noise floor; this one is not`);
      samples += Math.round(Math.max(1.5, decay * 2.2) * rate); if (samples > MAX_SAMPLES) return fail('the responses are longer than the server will analyse in one request');
      ir = syntheticIR(decay, { rate, seed, floorDb }); source = `synthetic reference, decay ${decay} s, seed ${seed}`; out.synthetic = true;
    } else {
      const id = String(r['evidenceId'] ?? ''); if (!UUID.test(id)) return fail(`position ${label}: its response is neither a synthetic reference nor an uploaded file. A response file is uploaded as evidence and named by its id, so that the server can read it`);
      let f: Awaited<ReturnType<typeof evidenceContent>>; try { f = await evidenceContent(ctx, store, id); } catch (e) { if ((e as { code?: string }).code !== 'not_found') throw e; return fail(`position ${label}: the response file ${id} is not an evidence file of this organization`); }
      try { ir = /wav/.test(f.mediaType) || /\.wav$/i.test(f.fileName) ? readWav(f.data.buffer.slice(f.data.byteOffset, f.data.byteOffset + f.data.byteLength) as ArrayBuffer) : readCsv(f.data.toString('utf8')); }
      catch (e) { return fail(`position ${label}: ${f.fileName} could not be read as an impulse response: ${(e as Error).message}`); }
      samples += ir.samples.length; if (samples > MAX_SAMPLES) return fail('the responses are longer than the server will analyse in one request');
      source = `file ${f.fileName}`;
    }
    const a = analyseBands(ir); bands.push(a);
    const at = (band: string) => a.find((x) => x.band === band)?.fits.find((x) => x.name === fit);
    for (const band of MID) { const x = at(band); if (!x || x.seconds === null) out.why.push(`position ${label}, ${band}: ${fit} cannot be worked out: ${x?.refused || 'the band is not in the response'}`); }
    out.positions.push({ position: label, source, t500: at(MID[0]!)?.seconds ?? null, t1k: at(MID[1]!)?.seconds ?? null });
  }
  if (!out.why.length) { const means = meanOverPositions(bands); const pick = (band: string) => { const m = means.find((x) => x.band === band)!; return fit === 'T30' ? m.t30.mean : m.t20.mean; }; const a = pick(MID[0]!); const b = pick(MID[1]!);
    if (typeof a === 'number' && typeof b === 'number') out.value = r2((a + b) / 2); else out.why.push(`${fit} could not be averaged over the positions`); }
  out.ms = Date.now() - t0; return out;
}
