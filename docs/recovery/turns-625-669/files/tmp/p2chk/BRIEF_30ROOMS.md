# Brief: scale the reference room to the 30-room campus — FINAL EXECUTION MODE, approved scope only

Read /tmp/p2chk/BRIEF_COMMON.md (incl. UPDATE), docs/phase2/CANONICAL_CAMPUS.md, docs/phase2/REFERENCE_ROOM.md, packages/campus/src/{canon,
generate,matrix,catalogue,reference,projections}.ts, apps/demo/src/campus/*. Owner strategy: "create the first remarkable room with every
major connection working before multiplying it across 30 rooms" — the reference room R-ATL-4-218 is now verified; scale the SAME shared
architecture (no new features). Today 26 rooms are outlines (identity, archetype, capacity, floor only) and 3 have existing records.
Deliver:
1. Deterministic, seeded room designs for the 26 outline rooms from their archetypes (huddle, training, town hall, NOC, engineering lab,
   design review, multipurpose, etc. as the matrix defines), using ONLY catalogue models with verified specs (or class templates labelled
   "spec to verify"), so each room gets positions, units, installations, relationships, the engine-judged applicable tests and baseline
   status (most ACCEPTED with history; a realistic few COMMISSIONING/with open issues) — all via the commissioning/assurance engines, never
   hand-typed results. Keep the 4 existing rooms' records unchanged (reference room held state untouched; golden re-pinned once).
2. Every room opens in the same room view (3D + plan, layers, device panel, connections) with honest gaps where data is modeled; floor
   plates show real footprints; the campus/building glyphs reflect real open issues.
3. Search Party, Room Story, KPIs, FI scan (generalise the fixture where honest; otherwise state "scan replay designed for the reference room
   only") and ServiceHands read the same data; nothing else changes behaviour.
4. Performance: first-load must not balloon — generate lazily or keep the dataset compact; report bytes before/after; campus perf CN-17 within
   budget.
5. Tests: unit (determinism, every room's tests come from the engine, no hand-set results, catalogue-only models, existing rooms unchanged)
   and browser (open every room at 1440 and a sample at 360/768; no errors; no overflow). All existing suites green. Docs: CANONICAL_CAMPUS.md
   update + an honest coverage table per room (complete / modeled / gaps).
