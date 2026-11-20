# Acoustic measurement validation

Status, 14 Nov 2026. This is a deliverable of the 40/10 directive. It records how the reverberation instrument (`apps/demo/src/bench/reverb.ts`) is checked against answers known in advance, and what those checks do and do not prove.

## The reference data

The references are exponentially decaying Gaussian noise with a decay time set exactly: the amplitude falls by a factor of 1000 (60 dB) in RT seconds. An independent noise floor is added at a chosen level below the start. Their energies add, as in a real measurement.

The generator is seeded, so every run sees the same samples. The expected output is defined by construction rather than by running the analyser, which keeps the check from being circular.

Within the noise of a single realisation, a correct Schroeder/least-squares analysis must return the set decay time at every evaluation range. The decay curve must be a straight line falling 60 dB in RT.

## Results (`node --test tests/unit/bench-reverb.test.mjs`, 7/7 on 14 Nov 2026)

| Check | Reference | Requirement | Observed |
|---|---|---|---|
| RV-01 known decay times | RT 0.4, 0.8 and 1.6 s; floor −80 dB | EDT, T20 and T30 within 4 %; r < −0.99 | pass |
| RV-02 the decay curve | RT 0.8 s; floor −90 dB | −10, −20 and −30 dB at RT·d/60, within 1.5 dB | pass |
| RV-03 refusals | floor −40 dB and −30 dB | T30 refused at 40 dB of range ("needs 45 dB") while T20 is still given within 6 %; T20 and T30 both refused at 30 dB | pass |
| RV-04 octave filters | 1 kHz tone | 0 ± 0.5 dB at 1 kHz; at least 20 dB down at 250 Hz and 4 kHz | pass |
| RV-05 bands | RT 0.70 s; floor −85 dB | the bands are named; the broadband value from one realisation is within 3 %; each octave from 250 Hz to 4 kHz, averaged over 16 realisations, is within 6 % | pass |
| RV-06 readers | 16-bit WAV written and read back; CSV | rate, length, bits and channels preserved; T20 within 5 % after the round trip; malformed files refused with reasons | pass |
| RV-07 quality and means | clean and short-range references | no note on a clean decay; a short range is noted; refused figures are left out of a mean and counted | pass |

## One finding the tests record

A single noise realisation filtered into one octave varies by roughly ±10–20 % at the lower bands. This was seen in a sweep over seeds at RT 0.70 s:

| Band | Mean T20 | Standard deviation |
|---|---|---|
| 250 Hz | 0.727 s | 0.050 s |
| 1 kHz | 0.703 s | 0.029 s |
| 4 kHz | 0.700 s | 0.016 s |
| Broadband | 0.701 s | 0.005 s |

This is a property of the method, not a defect. A narrow band contains fewer independent cycles in the evaluation window. It is also why measurement practice uses several source and receiver positions.

The instrument therefore averages positions. RV-05 tests the band figures the way a field engineer would read them: as a mean over positions, not as a single realisation. The first draft of RV-05 asserted ±10 % on one realisation per band. It failed, and the failure was correct. The test was rewritten to match the method, and the reason is written above it.

The slight high bias at 250 Hz (about 4 %) comes from the band filter's own ringing adding to the decay at low frequency. It is inside the 6 % tolerance. It is one reason band results are labelled as coming from approximate filters.

## What this does not prove

- **Real rooms.** Synthetic decays are single-slope and diffuse. Coupled spaces, strong early reflections and non-exponential decays are reported through the curvature and ξ notes, but no real-room reference dataset with independently measured results has been run. Running one needs a licensed or published dataset and its reference values. **NOT RUN.**
- **Against other software.** No comparison has been made with an established analyser on the same files. **NOT RUN.**
- **Microphone chains.** Nothing here validates a microphone. The page asks for the chain to be declared, and treats a phone or consumer microphone as indicative only.
- **Filter compliance.** The octave filters are not tested against the standard's filter class tolerances.
