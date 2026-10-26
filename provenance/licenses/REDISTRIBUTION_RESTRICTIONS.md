# Redistribution restrictions

What may not leave the founder's control, and why. Engineering record for counsel; not a legal opinion.

## 1. Software

| Material | Restriction | Basis |
|---|---|---|
| The monorepo (`empathia-technologies`) and the demonstrator source (`Empathia_V25/work/source*`) | Not for distribution. Engineering review only under an agreement chosen by the founder. Never part of an investor package. | `../CLASSIFICATION.md` (CONFIDENTIAL_TECHNICAL / RESTRICTED_IP) |
| Frozen release packages (2.5.1.1, 2.5.2 rc1, 2.5.3 rc1–rc3, investor and engineer) | **Not authorized for external distribution.** The independent page-API security assessment is NOT VERIFIED — EXTERNAL TEST REQUIRED; owner conditions open. Engineer editions: authorized technical reviewers only. | `../release-history/RELEASE_LINEAGE.md`; tag messages in the demonstrator repository |
| 2.5.4 development build (Founder Edition) | Internal only. | not a release |
| Historical V1.2–V1.4.1 copies | Do not redistribute. Subject to the historical-release audit and its recall/replacement plan (access-controlled, `Empathia_V25/legal/historical-releases/`), which records copies containing material that must not be shared. No notice, recall or replacement has been sent by this program. | that audit |
| Builds that bundle React (Founder Studio, enterprise web) | If ever given to anyone, ship the generated `*.LEGAL.txt` with the bundle (MIT notice). | `THIRD_PARTY_LICENSES.md` |

## 2. Media

The access-controlled rights ledger is `Empathia_V25/legal/media-rights/MEDIA_RIGHTS_LEDGER.csv` (private repository; referenced here by path, not copied). The monorepo's `media/manifests/MEDIA_MANIFEST.json` maps every probed media file to that ledger.

State of the ledger read on 2026-10-26: **310 assets — 40 VERIFIED (first-party UI captures, investor channel only, owner decision 2026-10-24), 240 UNVERIFIED, 30 EXCLUDED.** The monorepo manifest probed 2,230 media files: 277 UNVERIFIED, 60 EXCLUDED, **1,893 NOT_IN_LEDGER** (never assessed — treat as not distributable).

| Media family | Status | Why |
|---|---|---|
| Hosted synthetic narration ("Brian") in the 2:00 master, campaign films and the investor film set (incl. film 5, "Founder's vision") | UNVERIFIED — not distributable | No copy of the provider's terms, plan or commercial-use grant at creation; the only statement is an internal assertion. Evidence file: `Empathia_V25/legal/media-rights/evidence/NARRATION_AND_FOOTAGE_EVIDENCE.md`. |
| Generated footage (one 8 s clip, GEN-01) inside campaign film F04 | UNVERIFIED — not distributable | as above; terms retrieved later post-date creation |
| Local-model campus voice-over (172 lines) | UNVERIFIED — not distributable | model licence documented; output rights and upstream training data not established |
| 30 test-pattern clips | EXCLUDED — never distributable | owner decision 2026-10-23; quarantined |
| 40 first-party UI captures | VERIFIED for the **investor** channel only | owner classification 2026-10-24; not public, customer or commercial |
| Project-synthesised score (2:00 film) | UNVERIFIED as part of a film whose narration is unverified | the score itself is recorded as synthesised in code by the project; no legal review |
| Everything NOT_IN_LEDGER (1,893 files: renders, intermediates, screenshots, voice stems …) | Not assessed — not distributable until ledgered | `media/manifests/MEDIA_MANIFEST.csv` |

Only assets that are VERIFIED **for the intended channel** may enter an externally distributed build (standing rule; enforced in the demonstrator by its media gate and deny-list `Empathia_V25/legal/distribution/DISTRIBUTION_DENYLIST.sha256`).

## 3. Names and marks

- No trademark clearance has been done for "Empathia" or any product name (Search Party, ServiceHands, Intake Portal, Empathia Pro, Assurance / APEX, Field Intelligence, Lite, Scouter, SIGNAL, Onboard, Collaboro-Sing, Frontline, …). See `../chain-of-title/CHAIN_OF_TITLE_CHECKLIST.md`.
- Third-party platform names appear only in the internal integration catalogue as interface targets (CONTRACT_ONLY). They imply no partnership, certification or endorsement and must not appear in investor material.

## 4. Personal data

Git histories (`../source-manifest/GIT_HISTORY.json`) contain author names and e-mail addresses, including the founder's personal address on four demonstrator commits. Keep this vault within the founder and counsel. Hashed identifiers elsewhere in the workspace are not presumed anonymous (`Empathia_V25/legal/distribution/PERSONAL_DATA_REVIEW.md`).

## Open questions for counsel

1. Rights in the hosted synthetic narration and generated footage, under the terms in force at creation (2026-10-05 to 10-15) — not established.
2. Output rights of the local TTS model's voice-over.
3. Whether any material connected to a past or present employer or client is present in the inputs or earlier releases (see chain-of-title checklist, item "Existing workplace projects").
4. Ownership and protectability of AI-assisted code and documents (`../AI_ASSISTANCE_RECORD.md`).
