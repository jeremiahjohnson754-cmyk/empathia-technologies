# SIGNAL canon and playability audit — 9 November 2026

Derived by reading the founder's `signal-standalone.html` as text (never executed) and comparing it with the v1.7 structural inventory
and with what the current build carries. Counts and identifiers only: no dialogue is reproduced here.

## The source

| Fact | Value | How it was established |
|---|---|---|
| Copies supplied | 6 files named `signal-standalone.html` | Attachment listing |
| Variant 1 (five copies, 27,825,274 bytes) | SHA-256 `80f8d992…8a466d` | Hash. This is the variant the v1.7 inventory was made from |
| Variant 2 (the latest upload, 27,825,253 bytes) | SHA-256 `1448c338…c9c772` | Hash |
| Difference between them | **One decision option.** Variant 1 carries a state flag (`"set": ["fallback"]`) on one choice in a later season; variant 2 does not. Everything else is byte-identical | Byte comparison: one differing span of 18 bytes against −3 |
| Which is canonical | **NEEDS FOUNDER RULING.** The flag changes whether that choice is remembered later. Until ruled, variant 1 (the inventoried one) is treated as canon and variant 2 as a candidate edit | — |

## The canon, counted from the source

Chapter identifiers in the source match the inventory exactly and in order (155 chapter sections, plus a title page).

| Part | Sections | Panels | Decisions | Quests | Beats |
|---|---:|---:|---:|---:|---:|
| Prologue | 11 | 27 | 0 | 0 | 0 |
| Season 1 | 12 | 334 | 37 | 11 | 44 |
| Season 2 | 11 | 243 | 38 | 10 | 38 |
| Season 3 | 11 | 244 | 40 | 10 | 37 |
| Season 4 | 11 | 169 | 32 | 10 | 41 |
| Season 5 | 11 | 108 | 30 | 10 | 22 |
| Season 6 | 11 | 69 | 30 | 10 | 12 |
| Season 7 | 11 | 71 | 30 | 10 | 11 |
| Season 8 | 11 | 64 | 30 | 10 | 11 |
| Season 9 | 11 | 64 | 30 | 10 | 11 |
| Season 10 | 11 | 77 | 30 | 10 | 11 |
| Season 11 | 11 | 73 | 30 | 10 | 11 |
| Season 12 | 11 | 67 | 30 | 10 | 11 |
| Eleven further sections with no season (`ch1`–`ch11`) | 11 | 0 | 0 | 0 | 0 |
| **Seasons 1–12** | **133** | **1,583** | **387** | **121** | **260** |

The earlier project figure of "133 chapters and 1,583 panels" is therefore correct **for seasons 1 to 12**; the whole file holds 155
chapter sections and 1,610 chapter panels once the prologue is counted. Decisions (387), quests (121) and beats (260) were counted
twice, by the inventory and by an independent pattern count of the source, and agree.

## What the current build carries

| Canon element | In the build today | Status |
|---|---|---|
| Story chapters and panels (133 / 1,583) | **None.** No canon chapter identifier appears anywhere in the application source | NOT IMPLEMENTED |
| Decisions that carry forward (387) | None | NOT IMPLEMENTED |
| Learning library: 161 lessons, 223 quizzes, 91 labs, 146 drills, 121 incidents, 62 cases, 125 formulas, 522 glossary terms | Present (`packages/domain-data/data/SIGNAL_LIB.json`) and used by the Learn pages | SYNTHETIC_DEMO |
| Authored episodes in the demonstration | A smaller authored set (`apps/demo/src/learn/model.ts`); these are not the canon chapters | SYNTHETIC_DEMO |
| Service Mode 0–5, twelve bosses, Competency Engine V2 | Not built | SPECIFIED |

**Plain reading:** the learning library survived; the story did not make it into the rebuilt product. Surpassing the original starts
with carrying all 133 chapters across unchanged, with a chapter-by-chapter diff that proves it.

## What stands in the way

1. **Where the canon may live.** The repository is public. The story's dialogue is the founder's unpublished work, and an earlier
   decision (D27) kept SIGNAL material off public surfaces until rights are cleared. Committing 1,583 panels of dialogue to a public
   repository cannot be undone. This needs the founder's word: make the repository private first, or approve publication.
2. **Which variant is canon** (above).
3. The source's 36 embedded media blocks (about 14 MB) need a rights line each before they ship anywhere.

Until then the extraction and the story player can be built and tested against the source held outside version control.
