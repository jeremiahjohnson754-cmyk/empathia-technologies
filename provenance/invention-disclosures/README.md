# Invention-disclosure records

**Attorney-review material. Not a patent application, not a patent grant, no novelty or patentability opinion.**

Five factual records of methods that are actually implemented in code in these repositories, prepared so that counsel can decide whether anything merits a search or a filing. Each states the problem, the method, where the code is (file:line at the commits named), how it was developed (from git history only), and open prior-art questions. None of them says the method is new: that is for a prior-art search and counsel.

| ID | Title | Main code |
|---|---|---|
| ID-01 | Evidence-gated commissioning results with enforced verification separation (PASS_UNVERIFIED / PASS_VERIFIED) | `packages/commissioning-engine/src/recording.ts`, `results.ts`; `database/migrations/0003_commissioning_evidence.sql` |
| ID-02 | Design-driven commissioning applicability with signature-based plan recompilation | `packages/commissioning-engine/src/classify.ts`, `applicability.ts`; `services/enterprise-api/src/domain/rooms.ts` |
| ID-03 | Relationship-graph impact analysis with ownership-propagated, site-scoped visibility | `packages/relationship-engine/src/index.ts`; `services/enterprise-api/src/domain/read.ts` |
| ID-04 | Multi-dimension room assurance that separates drift from design gaps | `packages/assurance-engine/src/assess.ts`, `layout.ts`; demonstrator `src/57-derive-assure.js`, `src/v25-093-assure.js` |
| ID-05 | Input-hash invalidation of approved engineering drawings (REVIEW_REQUIRED) feeding design deficiencies | `services/enterprise-api/src/domain/rooms.ts`; demonstrator `src/v25-60-room.js` |

Common to all records:

- **Contributors (as evidenced):** code and documents written by Claude (Anthropic) in Claude sessions, directed by the founder ([Founder name]); see `../AI_ASSISTANCE_RECORD.md`. Who conceived each idea — the founder in the specification packages under `Empathia_V25/inputs/`, or the AI while implementing — is **not recorded** and is FOUNDER_TO_SUPPLY. Inventorship is a legal question for counsel.
- **Disclosure status:** builds embodying ID-01, ID-02 and ID-05 exist in the frozen 2.5.x investor packages, which have **not** been distributed externally (distribution not authorized). Counsel should confirm whether any showing to third parties (demonstrations, decks, films) amounts to a disclosure and its dates.
- Line numbers refer to the monorepo at commit `41fb895` and the demonstrator worktree `source-254` at commit `b8986d1`.
