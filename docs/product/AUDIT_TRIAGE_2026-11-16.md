# Triage of the two external audits (16 Nov 2026)

The founder sent two audit documents on 16 Nov 2026, with the V2.5.5 engineer edition, V2.5.3 live and the SIGNAL standalone. The
founder's order of work: the outstanding list first, then these as later tasks. This file records what was taken from the audits, as
tasks, and what is not done without the founder's word. The audits themselves are kept out of the repository.

## The three files

| File | Finding |
|---|---|
| V2.5.3 live | Byte-identical to the copy already held. |
| SIGNAL standalone | Byte-identical to the copy inventoried earlier. |
| V2.5.5 engineer edition | New. Read statically, never run. Over V2.5.3 it adds an **Engineer start** page: three inspection demonstrations (room design, commissioning verification, issue handoff), each with an inspection sheet (what to inspect, evidence states, the security boundary, source references, the tests that cover it, failure handling) and five injectable faults. It also adds a back link in the room builder. Task #162. |

## Taken as tasks

| Task | From the audits |
|---|---|
| #161 | The vertical slice (the founder's own bar). Built: `VERTICAL_SLICE.md`. |
| #162 | V2.5.5 parity: the Engineer start page, inspection sheets, fault injection. Built: `ENGINEER_START.md`. |
| #163 | SIGNAL must feel like SIGNAL: compare Learn with the standalone and close the gaps. Begun: the title page (`docs/restoration/SIGNAL_INVENTORY.md`). |
| #164 | The corporate website on phones: length, hierarchy, a sticky call to action, product loops, measured Web Vitals, WCAG. |
| #165 | The four worlds: one-click entry, the world kept across products, breadcrumbs, search in Lite, phone 3D performance. |
| #166 | ServiceHands depth (problem, known error, change), a traceability matrix, Six Sigma analytics, AI controls. |

## Claims not yet checked

The audits state several things about the live sites as fact. They are not accepted or rejected here until a test shows which:
- that a world does not open directly from the experience picker;
- that rooms lack furniture and device overlays;
- that the chosen world is lost between products;
- that buttons lead nowhere.

Tasks #164 and #165 start by testing each claim in a browser.

One claim is already known to be out of date: "no real screenshots". The website carries ten captures of the current demonstration,
taken on 14 Nov, each with its route, commit and hash.

## Not done without the founder's word

- **Client logos, testimonials, partner or press badges.** There are none to show; inventing them is ruled out.
- **Outcome figures** ("3× faster", percentages). No measured figure exists; none will be written.
- **Analytics or tracking** (Google Analytics, Sentry or similar), paid services, a live device integration.
- **Claims of integrations.** Only what is built is described, and adapters stay labelled NOT_CONFIGURED until they are verified.
- **Footage.** No film is presented as real footage; the SIGNAL canon holds (no real brands, no cloned voices).
