# Standards traceability

Status, 14 Nov 2026. This is a deliverable of the 40/10 directive. Its rules are:

> "Do not reproduce paid standards without authorization."
>
> "A licensed standards registry (never reproduce paid standards)."

## The rule this repository follows

A standard is **named, never reproduced**. Where the product follows a published method, it describes the method in its own words, written from first principles, and says that it follows the approach. It never quotes clause text, tables, figures, normative coefficients or acceptance limits from a paid standard.

**Every threshold is a project policy.** The policy is named and versioned (for example `POL-STI-MEET-1`). It is never presented as the standard's requirement.

There is **no licensed standards registry** in this repository. No paid standard has been licensed, so none is stored. The registry the directive describes is **not built**. Building it needs the founder's licensing decision, which is a spending and licensing escalation.

## Where a standard is named, and how

Found by searching the engine, its data and the demonstration (`packages/domain-data`, `packages/commissioning-engine`, `apps/demo/src`) on 14 Nov 2026.

| Standard (named only) | Where | How it is used |
|---|---|---|
| ISO 3382-2 (reverberation) | `V25_TESTS.json` (the townhall reverberation test's method), `bench/reverb.ts`, `export/reverb.ts`, the reverberation page | The instrument follows the published approach: Schroeder integration and least-squares fits over EDT, T20 and T30, with dynamic-range refusals. It is written from first principles. The octave filters are an approximation and are labelled so. Validation is against synthetic known-answer decays (`ACOUSTIC_MEASUREMENT_VALIDATION.md`). |
| IEC 60268-16 (STI) | `V25_TESTS.json`, the knowledge seed | Named as the STI method in test descriptions. **No STI is computed.** The STI workflow records the meter's readings and compares them with a project policy (`bench/sti.ts`). |
| IEC 61672 (sound level meters), BS.1770 (loudness) | `mixlab/model.ts` | Named in the mix-lab's teaching model. No limit from either is reproduced. |
| ISO 9613-1 (air absorption) | `LEARN_V253.json`, `lite/data/v253.ts` | Named as the source of the air-absorption idea in Lite's labelled acoustic *model*. A model is never a measurement. |
| IEEE 802.3 (PoE), 802.1Q (VLANs), 1588 (PTP) | knowledge seed | Named in knowledge articles as the technologies involved. No text is reproduced. |
| ANSI/AVIXA 10:2013 (performance verification) | knowledge seed, `parity/core.ts` | Named as the industry's performance-verification standard. The founder's credentials (CTS) are stated separately and accurately. No clause is reproduced. |
| ISO 8601 (dates) | throughout | The date format. |

## Checks that hold this

- **Searchable.** The search above can be re-run: `grep -rhoE "(ISO|IEC|ANSI|AVIXA|IEEE|BS)[ -/]?[0-9]…" packages apps/demo/src`. A new standard name should come with a row here.
- **Export files.** Exported files carry the same wording:
  - "the standard is not reproduced" (reverberation);
  - "reproduces no standard" (STI);
  - "not a requirement quoted from a standard" (STI policy).

  These are checked by `scripts/verify/export-formats.mjs`.

## Not built

- The licensed standards registry: storing licensed documents, licence scope, holders and expiry, and access rules for who may read them. This waits for a licensing decision.
- Mapping each test to a clause of a licensed standard. This is only possible once a standard is licensed. Until then, tests name their method in the product's own words (`COMMISSIONING_TEST_CATALOG.md`).
