# Engineering Instrument Bench

Status, 14 Nov 2026. This is a deliverable of the 40/10 Commissioning Engineering Workstation directive. It records only what is built and tested. Anything not built is listed as not built.

## What is built

### Reverberation from impulse responses

The instrument lives at `#/commissioning/instruments/reverb`. It is open to the roles that hold the commissioning area.

| | |
|---|---|
| **Input** | Up to eight measured impulse responses, one per source/receiver position. WAV (16-, 24- or 32-bit PCM, or 32-bit float; the first channel) or CSV (time in s, amplitude). Each file is read in the browser and fingerprinted with SHA-256. Nothing is uploaded. |
| **Figures** | EDT (0 to −10 dB), T20 (−5 to −25 dB) and T30 (−5 to −35 dB), broadband and in octave bands from 125 Hz to 4 kHz. |
| **Refusals** | A figure is not shown when the response's dynamic range does not reach 10 dB beyond its evaluation range (T20 needs 35 dB, T30 45 dB). It is also not shown when the decay does not reach that range before the noise. The page states the range it measured. |
| **Quality notes** | Non-linearity ξ = 1000·(1 − r²) per mille, flagged over 10 ‰. Curvature C = 100·(T30/T20 − 1) %, flagged over 10 %. Dynamic range below 45 dB is noted. |
| **The decay** | The Schroeder curve for any position and band, with the shaded evaluation range and the fitted line to −60 dB. |
| **The mean** | Per band over all positions. Refused figures are left out of the mean and counted (n). |
| **Target** | A target T20 and tolerance taken from the project's policy. Each band is marked within, above or below. This is a comparison, not a commissioning result. The test is still recorded by the commissioning engineer, with the files as evidence, and verified by someone else. |
| **Measurement chain** | Declared on the page as one of: calibrated measurement microphone; measurement microphone without calibration on file; phone or consumer microphone; not declared. A phone microphone is never treated as a calibrated measurement microphone, and its figures are labelled indicative and not commissioning evidence. The same applies when the chain is undeclared. |
| **Synthetic reference** | A button adds a reference response: noise decaying at exactly 0.70 s over a floor 85 dB down. It is a known answer for checking the instrument and is labelled *synthetic reference* in the table, on the page and in every export. |
| **Export** | Six files (PDF, DOCX, XLSX, CSV, PPTX, JSON). They contain the positions with their SHA-256, every band and fit with its refusal, the quality notes, the mean, the target comparison, the declared chain and the method. Export making is written to the audit trail, as for every export. |

Code: `apps/demo/src/bench/reverb.ts` (the analysis), `apps/demo/src/pages/ReverbBench.tsx` (the page) and `apps/demo/src/export/reverb.ts` (the report).

### What the instrument does not do

- It does not estimate decay times from a photograph or from a room's dimensions. Lite's Sabine estimate is a model, and it is labelled as one.
- It does not measure level. There is no SPL, and therefore no level calibration step yet.
- It does not compute STI. STI has its own workflow, below.
- It does not reproduce ISO 3382-2 or any other paid standard. The method follows its published approach, written from first principles. The octave filters approximate the standard's filters, and band results are labelled as such.
- It does not write the result into the room's commissioning record. That link (instrument → test → evidence) is **not built**. Today the export is the evidence file an engineer attaches.

### Speech intelligibility (STI)

The STI workflow lives at `#/commissioning/instruments/sti` (code in `apps/demo/src/bench/sti.ts`, `pages/StiBench.tsx` and `export/sti.ts`). It records the STI meter's readings at each listener position. They can be imported from a CSV or entered by hand, and each reading carries its meter, its chain and whether the room was occupied. The readings are compared with the **project's** policy. A policy is named and versioned, for example `POL-STI-MEET-1`, and no threshold is presented as a requirement of a standard. The workflow computes no STI.

The workflow rules:

- Too few positions give no verdict.
- Mixed occupied and unoccupied conditions, repeated positions, uncalibrated meters and phone readings are each flagged. Phone readings are indicative only.
- A shortfall may be carried by an **intelligibility exception record**:
  - it covers the positions below the policy, and only those;
  - it needs a reason and compensating measures;
  - it expires in the future, at most within a year;
  - it is requested by someone who records results and approved by someone else (separation of duties);
  - it is never available for a life-safety (voice alarm) policy, and never founded on phone readings.
- Every request and approval, and every refusal, is audited.

STI is checked by these suites:

- `tests/unit/bench-sti.test.mjs` (ST-01..03)
- `tests/browser/demo-sti.test.mjs` (STI-01..06)
- the export check, where the STI report opens in all six formats

## Not yet built from the directive's bench

- RTA and SPL: they need a calibration chain and live audio, and the frame refuses the microphone without a declared capability.
- The video, network and control instruments.

## Tests

| Suite | What it proves |
|---|---|
| `tests/unit/bench-reverb.test.mjs` (RV-01..07) | Recovers known decay times; the decay curve is the textbook line; refusals fire on short range; octave filters pass and stop; WAV and CSV readers round-trip; quality notes and position means. See `ACOUSTIC_MEASUREMENT_VALIDATION.md`. |
| `tests/browser/demo-reverb.test.mjs` (RB-01..07) | The page end to end: references labelled, curve drawn, T30 refused on a 40 dB WAV, a non-WAV refused, target marking, phone-chain warning, JSON export with SHA-256 and the synthetic label, visitor not shown, no phone overflow. |
| `scripts/verify/export-formats.mjs` | The reverberation report opens in all six formats and carries the synthetic label, the refusal text and the chain warning. |
