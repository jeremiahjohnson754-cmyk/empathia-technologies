# Acceptance A4: Founder Studio verified privately from the authorized source

**Authorization:** the founder, 12 Nov 2026 09:15 CT: use the existing V2.5.3 Founder Edition as the baseline instead of waiting for
V2.5.4; private, access-controlled, never deployed publicly; missing film assets reported, never invented or replaced.

## What was built (12 Nov 2026)

- `node apps/founder-studio/build.mjs --founder-edition=legacy/source/v253/Empathia-Living-Campus-V2.5.3-engineer-private.html`
  (Founder Edition SHA-256 `604cc748…`, the engineer-private V2.5.3 held in the repository's ignored legacy folder). The Founder Edition is
  copied into the studio **unchanged**.
- Private: the studio's launcher serves on this machine only and requires the launch key; the build's manifest says INTERNAL_ONLY. It is
  not part of `--public`, not on Render, not in any public dist.
- Fixed on the way:
  - the documents index walked the whole disk and bundled untracked folders (tool caches and `.local`, which holds private material),
    49 MB of script; it now takes only Markdown the repository tracks (246 documents, 4.7 MB);
  - the film player requested films that are not on the computer (a 404 in the console); the launcher now answers `GET /api/films`
    with the films it can serve, and the player says "not on this computer" without requesting a missing file;
  - the suite now **blocks** every request that does not go to this machine (it had only recorded them), as the standing rule for legacy
    HTML requires.
- Films: `apps/founder-studio/scripts/place-films.mjs` hashes the files provided and links a film only when its SHA-256 matches the
  curated record. **5 of 36 curated films are present** (FA, F01, IE, F02P, SyncLab). **Missing (31):** FL, FT, FB, F02, F03, IE-trailer,
  IE-teaser, M2, M60, M30, M15, F04, S01–S19. Each missing film shows as not on this computer; none is replaced.

## Result

`node tests/browser/founder-studio.test.mjs apps/founder-studio/dist .local/private/founder-studio-run`: **19 passed, 0 failed, 0 not
run** (12 Nov 2026), outside requests blocked. Evidence (screenshots, results) is kept privately under `.local/private/founder-studio-run`.

## Still open

- The 31 missing films (needed from the founder's media archive); then rerun with `place-films.mjs` and the suite.
- H.264 playback is checked in a browser that has the decoder only where the test machine has one (S-09b records it either way).
- The founder's own walk-through of the studio (functional and visual acceptance) is his to give.
