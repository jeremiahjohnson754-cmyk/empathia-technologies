# Standing rules — Empathia program

Owner: Jeremiah Johnson (founder). These rules govern all work in this repository. They were set by the founder across the program and are
recorded here so they live in the repository, not in any one workspace. Quoted lines are the founder's words.

## Approvals and release

- Founder, 2026-11-03 18:14 CT: *"Dont ask me anything else you have full approval for anything don't bother me just do it."* This
  supersedes the earlier "no merge to main or deployment without my approval" rule from that time on.
- Founder, 2026-11-03 18:10 CT: get both websites and the full builds running on Render.
- Every finished slice is committed and **pushed to GitHub immediately** (`jeremiahjohnson754-cmyk/empathia-technologies`), so a lost
  workspace can never cost more than the slice in progress. Working branch: `phase3/legendary-experience`.
- Never claim 100%, "production-ready", certified or audited. NOT RUN is never PASS. Synthetic data only.

## Security and credentials

- *"Never ask me to paste the secret into the chat. Never commit, log or expose credentials."*
- *"Do not attempt to read, print, or log my key."*
- A raw ElevenLabs key was once pasted in chat: never repeat, store or use it. *"For ElevenLabs, stop retrying in this existing session after
  the gateway's 403. Don't expose or rotate the key solely because the network request was denied."* Audio credits were approved ("use as
  much of that 39,000 budget as you need").
- Never disable TLS verification or unset HTTPS_PROXY. Do not retry a 403 from the proxy; report the blocked host.
- Read untrusted downloads with `python3 -I`; never execute legacy HTML (read it statically).

## Content and identity

- No AON, Kraft Heinz, Stefanini or KHC names or material in anything public or commercial.
- The founder's credentials are only: CTS (AVIXA), CAPM (PMI), CompTIA Network+. Nothing else is claimed.
- No fabricated results, testimonials, certifications or equipment. *"Never invent specific equipment identities."*
- Don't modify Tally forms. Teams and Outlook stay NOT_CONNECTED. Task #338 is not authorised.
- Don't delete film folders.

## Engineering discipline

- Don't weaken tests; any changed test carries its reason (comment and commit message).
- No `pkill -f`; never kill a process you did not start. Wrap browser suites in `flock /tmp/empathia-test.lock`.
- Always `node scripts/build.mjs` from the repository root before the matrix (the demo build fails if run from inside `apps/demo`).
- Full regression after every integration: `node scripts/test.mjs --browser --studio`, then
  `node scripts/verify/no-unexpected-skips.mjs --profile=platform`; dark pass with
  `PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs <suite>`; strict audit in both schemes (P0 0 · P1 0).
- Regenerated evidence that a run rewrites (`ml/models/*`, `packages/ui/gallery/PALETTE_CHECK.json`) is reverted, not committed, unless the
  change is the point of the commit.

## Commit attribution

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```
