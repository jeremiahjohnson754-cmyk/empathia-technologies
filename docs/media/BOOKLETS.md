# The guides as printed booklets

Founder, 13 Nov 2026: make the IT onboarding success and end-user guides "look super cool like Adobe InDesign booklets with our emblem
and the corporate information … and screenshots of Lite, the various rooms and equipment".

`node scripts/media/make-booklets.mjs [--room=R-ATL-4-218]` (needs `node apps/demo/build.mjs` first) writes to `apps/website/media/booklets/`:

| Booklet | From | Pages |
|---|---|---|
| End-User Success Guide · Atlas 4.218 | `guides/roomGuide.ts` (the room's own guide), `guides/chapters.ts`, the plan drawn from the record (`export/plan.ts`), screenshots of the room in Lite, its equipment on the room-guide page, "In a room", and its floor on the campus map | 17 |
| IT Onboarding Success Guide | `onboard/program.ts` by phase, its knowledge checks with answers, the 30/60/90-day competencies, the organisation's own fields (`onboard/profile.ts`, "not recorded" where none is held), the rooms the starter will look after with screenshots | 18 |

- Set in Inter (the site's own font files) on US Letter by Chromium's print engine: a full-bleed cover with the emblem, chapter openers
  numbered by sequence, two-column chapters, figures with captions, a running footer with page numbers, a tagged PDF with an outline.
- Every screenshot is taken from the built demonstration, never drawn; every word is the product's own content. Both say DRAFT and
  synthetic on the cover and on every page. No credential is claimed for the writing (the founder's credentials are CTS, CAPM and
  CompTIA Network+; the onboarding guide names those three only as examples of pathways a person may choose).
- `BOOKLETS.json` records each file's pages, bytes and SHA-256. The website offers them on `/products#guides`; `website.test.mjs`
  `W-booklets` fetches each one and checks its SHA-256.
- Not done: an organisation's own edition (its approved instructions replace the generic wording), translations, other rooms.
