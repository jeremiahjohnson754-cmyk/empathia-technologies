# ADR-0016 · The server works a measured value out again from its evidence

Date: 18 Nov 2026 · Status: accepted · Migration: `0040_measurement_validation.sql` · Tests: `tests/security/criteria.test.mjs`
CR-13 (and CR-01…12, which now send real analysis packages); `tests/browser/demo-flagship.test.mjs` FL-31

Founder, 17 Nov 2026, 19:05: "independent evidence validation." ADR-0014 named the gap: "The server does not recompute the value
from the evidence file. It records the value the recorder sends, with the file."

## What was wrong

A bench in a page ran the analysis and sent a number. The server stored the number beside an uploaded file. The file proved that
something was uploaded; nothing checked that the number came from it. A request could send 0.8 s with a package that says 1.42 s,
and the database would judge the 0.8.

## Decision

1. **One analysis, used by both sides.** The reverberation analysis moved, unchanged, from the demonstration
   (`apps/demo/src/bench/reverb.ts`) to the shared engine (`@empathia/commissioning-engine/acoustics`). The page imports it from
   there; so does the server. There is no second implementation to drift.
2. **The server recomputes before it records** (`services/enterprise-api/src/domain/recompute.ts`). For a measurement that answers a
   test in a metric the server can work out (`t30_mid`, `t20_mid`), it reads the evidence, which must be the analysis package, and
   through it each position's impulse response:
   - a synthetic reference is regenerated from the decay, seed, rate and noise floor the package states (the same generator gives
     the same samples);
   - a measured response is a file uploaded as evidence (CSV, or WAV: `audio/wav` is now an accepted evidence type, checked by its
     RIFF/WAVE header) and named in the package by the id the server gave it.
   It runs the analysis and takes the mean of the fit at 500 Hz and 1 kHz over 2 to 8 positions.
3. **The server's figure is the record.** The value stored and judged is the one the server worked out. The value sent is kept beside
   it in `validation`, with the method and, per position, the source read and the figures obtained. `validation` is immutable with
   the rest of the measurement.
4. **What does not follow from the evidence is refused, and nothing is recorded** (422, with the reason): evidence that is not an
   analysis package; a value sent that differs from the recomputed one by more than 0.015 s (both numbers are named); a package
   containing synthetic signals offered with any provenance but SIMULATED; a position whose response is neither synthetic nor an
   uploaded file; a file that is not this organization's evidence; fewer than two or more than eight positions; a response the
   analysis cannot fit.
5. **The table holds the rule too.** The result guard (0037) gains a line: PASS on a test with a criterion, in a metric the server
   works out, is refused on a measurement with no `validation`. The database cannot repeat the analysis; it holds that the analysis
   was done. A row written round the API therefore passes nothing (CR-13).
6. **Order of refusals.** Who may record, on what room and in which metric are checked before any file is read, so a caller with
   no standing learns nothing about a file from the refusal.

## Consequences

- A page cannot make a room pass by sending a number. It can only send evidence the server reads the same way.
- The demonstration's sandbox stores short text notes only (ADR-0013), so a loaded response file cannot be recorded there: the
  page analyses it, says so before the attempt, and shows the server's refusal. Synthetic reference signals record as SIMULATED.
  Outside a sandbox response files upload normally (CR-13 does it with WAV files).
- Requests bound the work: at most eight positions and three million samples in one request.

## Not decided here, and known limits

- **This checks arithmetic and provenance, not acoustics.** It does not show that a response file was recorded in the room it is
  said to be from, with the instrument named, at the positions given. That stays with the independent verifier of the result and
  the instrument's calibration record.
- **Only reverberation.** Intelligibility, noise floor, coverage and limiter level are still recorded as sent, with their evidence
  file. Each needs its analysis in the shared engine first.
- **The tolerance is 0.015 s** because both sides round to a hundredth. It is not an uncertainty of measurement.
- **The package is read as JSON whatever its media type** (the sandbox stores text). A package's own `value` and per-band figures
  are ignored: only the responses are used.
- Recomputation is synchronous in the request. Long responses at high sample rates take longer; there is no queue.
