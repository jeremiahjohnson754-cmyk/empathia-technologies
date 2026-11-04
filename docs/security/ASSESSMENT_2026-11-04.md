# Security and vulnerability assessment — public website and investor demonstration (2026-11-04)

Owner-authorised assessment in the CEH mould of `apps/website`, `apps/demo`, their build chain and their Render deployment. Branch
`security/assessment` from `origin/phase3/legendary-experience`. This is a self-assessment by a build agent: it is **not** an audit,
a certification or a penetration test by an independent party, and it does not claim the sites are secure. It records what was tested,
what was found, what was fixed, and what was not tested.

## Scope

In scope: the source and built output of `apps/website` and `apps/demo` (with the shared `packages/ui`, `packages/design-tokens` code they
ship), their local servers (`apps/website/server/serve.mjs`, `apps/demo/server/serve.mjs`), `scripts/build.mjs --public`, `render.yaml`,
`pnpm-workspace.yaml` and the package manifests, git history reachable in this clone, and the owner's four Render static sites
(`empathia-website`, `empathia-demo`, `empathia-website-next`, `empathia-demo-next`). Nothing else was tested.

## Method

| Area | How |
|---|---|
| Recon | Inventory of both `dist/` trees (files, source maps, comments, version strings, manifest, robots, sitemap); Render service metadata through the Render API (read-only `list_services`); live fetch of all four sites attempted. |
| Injection / XSS | Grep of every sink (`dangerouslySetInnerHTML`, `innerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `Function`, `postMessage`, `window.open`, `location.*=`, `src=`, `srcdoc`) and every source (hash, query, storage, search text, form fields); browser injection of markup and `javascript:` payloads through the address. |
| Headers / CSP | `render.yaml` versus served responses of the local servers and of a bare static server with no headers (Render without a Blueprint). |
| Access control | D44 chunk loading, forged View-as roles, client bundle contents. |
| Secrets | `scripts/verify/scan-secrets.py` (tracked files), a wider pattern sweep (17 patterns, location and pattern name only) over both `dist/` trees and every blob reachable from every ref (118 commits, 2,479 blobs, clone not shallow). |
| Build chain | Lockfile presence, install command, lifecycle scripts, version ranges. |
| Local servers | Raw HTTP: traversal (plain, encoded, overlong UTF-8, NUL), malformed escapes, every method, HEAD, long URLs, host header, redirect abuse. |
| Links / forms | Every `target=_blank`, every external host in the output, `mailto:`/`tel:`, the Tally disclosure, redirect destinations. |
| Storage | Every localStorage/sessionStorage key of the demo filled with broken JSON, out-of-range indices, markup and `__proto__`. |
| "No request leaves" | Breadth-first crawl of up to 90 addresses for four roles with every off-origin request and CSP violation recorded; deliberate `fetch`, image and `sendBeacon` to another origin. |

Tests that carry this: `tests/security/public-sites.test.mjs` (node, 10 tests), `tests/browser/public-security.test.mjs` (Chromium, 13
checks, both sites served with **no** security header), `scripts/staging/validate-blueprints.py` P1-4 (strengthened),
`scripts/staging/verify-static.mjs` (unchanged; now runs under the larger header set). All registered in `scripts/test.mjs`.

## Findings

Severity follows CVSS 3.1 base scores, estimated by the assessor (not computed by a third party).

| ID | Finding | Severity | Status |
|---|---|---|---|
| SA-01 | `-next` sites served outside the Blueprint: none of render.yaml's headers or redirects apply | Medium 4.7 | Partly fixed; owner action open |
| SA-02 | Header set incomplete (no Permissions-Policy, COOP, CORP, `object-src`; HSTS without includeSubDomains) | Low 3.1 | Fixed (Blueprint sites; -next via SA-01) |
| SA-03 | No lockfile; every Render build resolves the full workspace tree afresh (`--no-frozen-lockfile`) | Medium 5.9 | Mitigated; lockfile open |
| SA-04 | Recon exposure: public `BUILD_MANIFEST.json`, React version string | Info | Accepted |
| SA-05 | Demo dev server stops on one malformed request; accepts every method; no stream error handling | Medium 6.5 (local) | Fixed |
| SA-06 | Redirects and open-redirect review | Info (no defect) | Verified |
| SA-07 | Secrets in repository, history, dist | Info (none found) | Verified |
| SA-08 | Outbound links and forms | Info (no defect) | Verified |
| SA-09 | Tampered tour step in sessionStorage crashes the tour layer | Low 2.0 | Fixed |
| SA-10 | Injection sinks | Info (no exploitable sink) | Verified; one accepted first-party sink |
| SA-11 | Client-side access control (D44, View-as) | Info (no defect) | Verified |
| SA-12 | "No request leaves the page" relied on code and on a header the -next demo does not get | Low 3.1 | Fixed (meta CSP) |

### SA-01 — the two `-next` sites do not get render.yaml's headers or redirects — Medium (AV:N/AC:H/PR:N/UI:R/S:C/C:L/I:L/A:N, 4.7)

**Evidence.** Render API `list_services`: `empathia-website-next` (srv-dbl7hpm1egvs73e0uj0g) and `empathia-demo-next`
(srv-dbl7hq0m7kps739gsgbg) were created 2026-11-04 00:14 UTC through the API (recovery index turn 745), track
`phase3/legendary-experience`, and are not named in `render.yaml` (which declares only `empathia-website` and `empathia-demo`). A
Blueprint's `headers:` and `routes:` apply only to the services it manages, so these two sites serve Render's defaults: no CSP, no
X-Frame-Options/frame-ancestors, no HSTS, no nosniff, no Referrer-Policy, no X-Robots-Tag on the demo, and no `/products/scouter` or
`/products/assurance-apex` redirects. **Not directly observed:** every live fetch of all four hosts was refused by this environment's
egress proxy (`CONNECT tunnel failed, response 403`), so the headers Render actually serves were not seen; the conclusion rests on how
the services were created. The same applies to the two Blueprint sites: whether Render applied the Blueprint's headers there was not
observed either.

**Fix.** (1) Both builds now write the CSP into every page as `<meta http-equiv="Content-Security-Policy">`, first in `<head>`, before
any script, preload or stylesheet (`scripts/security/policy.mjs` → `apps/website/build.mjs`, `apps/demo/build.mjs`). Served with no
header at all, the pages still refuse every off-origin script, style, font, image, connection, plugin, `<base>` and form post. A meta CSP
cannot carry `frame-ancestors`, so **framing (clickjacking) protection, HSTS and nosniff still need the headers**. (2)
`scripts/security/render-headers.mjs` reads render.yaml and adds the missing headers and redirect routes to both `-next` services
(dry run by default; `RENDER_API_KEY=… node scripts/security/render-headers.mjs --apply`; the key is read from the environment only and
never printed). The demo HTML already carries `<meta name="robots" content="noindex">` and the website's not-found page links a moved
address to its new place, so the missing robots header and redirects degrade gracefully.

**Tests.** public-sites SA-01 (every HTML file of both dists carries the exact policy, first in head); public-security PS-01, PS-07
(served with no headers: a deliberate `fetch`, image and `sendBeacon` to another origin are refused by the page itself), PS-02, PS-08.

**Status.** Partly fixed. **Owner action:** run `render-headers.mjs --apply` (or enter the headers in each `-next` service's dashboard
under Redirects/Rewrites and Headers), then confirm with `curl -sI https://empathia-website-next.onrender.com/` from a connected
machine. Also update the two `-next` build commands to the one in render.yaml (SA-03).

### SA-02 — incomplete header set — Low (AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N, 3.1)

**Evidence.** render.yaml (before): CSP without `object-src`; no Permissions-Policy, Cross-Origin-Opener-Policy or
Cross-Origin-Resource-Policy; HSTS `max-age=31536000` without `includeSubDomains`. The local servers sent X-Frame-Options only on HTML.

**Fix.** One policy (`scripts/security/policy.mjs`): CSP gains `object-src 'none'`; every response carries nosniff, `X-Frame-Options:
DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(),
microphone=(), payment=(), usb=()` (the demo uses none of these; its audio lab uses Web Audio, which needs no permission; autoplay and
fullscreen are left alone), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`; HSTS
`max-age=31536000; includeSubDomains` (no `preload`: the hosts are `*.onrender.com`, not the owner's domain). render.yaml declares the same
on both services; both local servers send it. The CSP keeps `script-src 'self'` with no `unsafe-inline`/`unsafe-eval`, `connect-src
'self'` (plus the lead API origin only when one is configured at build), `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'none'`.

**Tests.** public-sites SA-02 (render.yaml ≡ policy, no unsafe/third-party source), SA-05 (servers send it), validate-blueprints P1-4,
verify-static (17/17 under the new headers).

### SA-03 — build chain resolves dependencies afresh on every deploy — Medium (AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:N, 5.9)

**Evidence.** No `pnpm-lock.yaml` is committed (none in the tree or history of this clone). The Render build command
`npx --yes pnpm@10.18.3 install --no-frozen-lockfile` therefore resolves every transitive dependency of every workspace package
(including the enterprise API's, which the public build does not use) from the registry at build time; `npx` fetches pnpm itself without
an integrity pin. Direct dependencies are exact except `@types/react` and `@types/react-dom` (`^19.2.0`, type-only, never bundled). No
package has a pre/post-install or prepare script. pnpm 10 already skips dependency build scripts unless allow-listed.

**Fix (mitigation).** `--ignore-scripts` on the install in render.yaml (no lifecycle script of any package runs at build);
`minimumReleaseAge: 1440` in `pnpm-workspace.yaml` (pnpm ≥ 10.16 refuses a version published less than 24 hours ago, the window in which
compromised releases are usually caught). A lockfile could not be produced here: the toolchain is offline (no registry), so the
`--frozen-lockfile` switch the brief asks for is not possible yet.

**Tests.** public-sites SA-03 (both build commands carry `--ignore-scripts`, the workspace sets `minimumReleaseAge`, no install script,
no floating direct dependency except `@types/*`). **Not run:** a Render build with the new flags (it runs on the next deploy from this
branch's merge); if `minimumReleaseAge` ever blocks a pin newer than 24 h, the deploy fails and the previous deploy keeps serving.

**Status.** Mitigated. **Open:** on a connected machine run `pnpm install`, commit `pnpm-lock.yaml`, and change both render.yaml build
commands (and the two `-next` services' commands, set through the API) to `--frozen-lockfile`; optionally pin pnpm through Corepack with
its `+sha512` hash in `packageManager`.

### SA-04 — reconnaissance exposure — Info

**Evidence.** Source maps: none in either dist (moved to `.local/sourcemaps/`, checked by `dist-hygiene.mjs`). HTML comments: none.
Inline code: none except the website's JSON-LD data blocks (not executed; contain no `</`). Version strings: React `19.2.8` in the demo
bundle (client-only, no React Server Components, so the RSC advisories of late 2025 do not apply). Licence files (`OFL.txt`,
`*.LEGAL.txt`) name their upstreams. `BUILD_MANIFEST.json` is served by both sites: build time, file hashes, the demo URL, and the film
catalogue's rights status (`UNVERIFIED`); no secret, no path outside dist. robots: website `Allow: /` with a sitemap (absolute URLs from
`RENDER_EXTERNAL_URL` on Render); demo `noindex` (meta and, on Blueprint sites, `X-Robots-Tag`).

**Status.** Accepted: the manifest is used by tests and carries nothing confidential. Remove it from `dist` if the film rights status
should not be public.

### SA-05 — demo local server: one malformed request stops it — Medium for local/container use (AV:A/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H, 6.5)

**Evidence.** `curl http://127.0.0.1:47311/%E0%A4%A` → connection closed, server process exited with an uncaught `URIError` from
`decodeURIComponent`; the next request got no answer. It also served files for POST/PUT/any method, and neither server handled a read
error on the file stream (a file removed mid-read would throw). The servers bind 127.0.0.1 by default but 0.0.0.0 inside the compose
container. Not affected: traversal (plain, `%2e%2e`, `..%2f`, overlong UTF-8, NUL) returned 404 on both servers; the website server
already refused non-GET/HEAD and malformed escapes; header lines over 16 KB get 431 from Node. No error text or stack is ever returned.

**Fix.** Demo server: malformed escapes are a 404; GET/HEAD only (405 with `Allow`); `root + path.sep` containment; HEAD has no body; a
stream error destroys that response only. Website server: the same stream handling and HEAD. Both send the full header set (SA-02). The
unused Adobe Fonts branch of the demo server was removed (D7: Inter is self-hosted; the meta CSP would block it anyway).

**Tests.** public-sites SA-05 for each server: eight hostile paths (404/400/414/431, no leak), six methods (405), HEAD without body,
correct JavaScript MIME with nosniff, and the server still answers afterwards; website redirects never point off-site.

### SA-06 — redirects — Info (no defect)

Both redirect maps (`render.yaml` routes, `apps/website/redirects.json` used by the local server) name two fixed same-site
destinations. `//evil.example`, `/%2F%2Fevil.example`, `/\evil.example` and encoded variants never produce an off-site `Location`. No
page reads a destination from the address. Test: public-sites SA-06 and the redirect test.

### SA-07 — secrets — Info (none found)

`scan-secrets.py`: PASS, 1,098 tracked files, 0 findings, 18 allow-listed. History sweep (17 patterns incl. AWS, GitHub, Slack, OpenAI,
Anthropic, Google, ElevenLabs-shaped, Render, Stripe, npm, JWT, private keys, password assignments, credentialed connection strings): 34
hits in 12 files, every one in a currently tracked file already on the allow-list (documented development values in `.env.example`,
`deploy/render/api.env.template`, test and drill scripts); no hit exists only in history. Both dists: 0 hits. No `.env`, `.npmrc`, key or
certificate file is tracked. Values were never printed; only file, line and pattern name were read. Test: public-sites SA-07 (dist).

### SA-08 — outbound links and forms — Info (no defect)

Every `target="_blank"` in both sites carries `rel="noopener noreferrer"`. External hosts in the output: `tally.so` (enquiries),
`empathia-demo.onrender.com` / `empathia-website.onrender.com` (cross-links), plus non-loaded identifiers (`schema.org`, `www.w3.org`
SVG namespace, `react.dev` error links). The Tally link is a fixed `https://tally.so/r/VpG0Vy?source=<fixed key>` (the key is
`encodeURIComponent` of a constant, never visitor input), opened in a new tab, with the disclosure beside it ("Opens Empathia's enquiry
form on tally.so in a new tab. Tally … stores what you send in the EU"). The website has no `mailto:`/`tel:` link (the demo bundle's
only `tel:` is React's input-type table). Lead forms submit nothing natively (`form-action 'none'`) and say "not configured" until a lead
API is set at build time; then only that origin is added to `connect-src`. The Tally form itself was not modified or tested. Tests:
public-sites SA-04/SA-08, public-security PS-08, PS-10.

### SA-09 — tampered tour step crashes the tour layer — Low (AV:L/AC:H/PR:N/UI:R/S:U/C:N/I:N/A:L, 2.0)

**Evidence.** `apps/demo/src/tour/Tour.tsx` read `sessionStorage['empathia.demo.tour.v1']` with `Number(v)` and indexed `STEPS[i]!`
without a range check; `Guided.tsx` checked `Number.isInteger(i)` but not the range. A stored `999`, `-1` or `{"tour":"a","i":1e9}` makes
`STEPS[i]` undefined and the next property read throws. Only someone who can already write this origin's storage can set it (the viewer
themself, or an older build), so the impact is the viewer's own tab. A probe of the pre-fix build stalled and was stopped (cause not
isolated); the defect was confirmed by reading the code.

**Fix.** Both loaders accept only an integer within the tour; anything else means no tour. The other stores (workspace, Build a Room,
labs, decisions, Scouter, theme, View-as) already fell back on any parse error and checked a version or type; they were not changed and
pass the tests below.

**Tests.** public-security PS-04: every demo key filled with eight hostile values (broken JSON, out-of-range indices, markup,
`__proto__`) across seven routes: every page renders, no page error, no prototype pollution, no dialog. A wider probe (8 keys × 10 values
× 14 routes) on the fixed build: clean.

### SA-10 — injection sinks — Info (no exploitable sink)

No `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, `postMessage`/`message` listener or
`srcdoc` in `apps/website/src`, `apps/demo/src` or `packages/ui/src`. The one sink is `dangerouslySetInnerHTML` in
`apps/demo/src/pages/Learn.tsx` (lesson cards, casebook, formulas) fed by `signal-lib.json`, a first-party file copied from
`packages/domain-data/data/SIGNAL_LIB.json` at build and fetched same-origin: its markup is limited to `b, i, span, sub, sup` and SVG
shapes, with no event handler, `<script>` or `javascript:` (checked); the CSP blocks inline handlers and scripts even if that changed.
Accepted, with the note that the file must stay reviewed content. Hash, query, search text and storage reach the DOM only through React
text (escaped) or validated keys; dynamic `import()` URLs are built from constant workspace names and the build id, never from the
address. The website's not-found page writes the requested path with `textContent`. Tests: public-security PS-03 (markup, SVG, script,
iframe and `javascript:` payloads in eight address forms: nothing injected, no dialog, no CSP violation), PS-09.

### SA-11 — client-side access control — Info (no defect)

The demo's D44 policy is a demonstration on synthetic data and grants no real privilege. Verified: a forbidden address shows the access
page and its chunk is never fetched (existing demo-access A-01/A-04; PS-06 repeats it with no headers); a forged View-as role (`founder`,
`admin`, `root`, `__proto__`, `constructor`, case and whitespace variants, empty) falls back to a demonstration role and is overwritten in
storage (PS-05). `role-boot.js` copies any `/^[a-z]{2,10}$/` value to `data-role` before React mounts; it only selects a CSS colour and is
corrected on mount (Info). Nothing secret ships: the bundle holds the synthetic model, the policy tables and public URLs only (SA-07).

### SA-12 — "no request leaves the page" — Low (AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N, 3.1)

**Evidence.** The guarantee rested on the code (the demo calls only same-origin `signal-lib.json` and its own chunks) and on the CSP header,
which the `-next` demo does not receive (SA-01). **Fix:** the meta CSP (SA-01). **Tests:** PS-01 (deliberate exfiltration attempts are
refused by the page itself), PS-02 (breadth-first crawl of 90 addresses for each of architect, visitor, exec and installer: no off-origin
request, no CSP violation, no console error).

## Not tested

- The live sites: every request to the four `*.onrender.com` hosts was refused by this environment's egress proxy (403), so served headers,
  TLS, redirects and Render's behaviour were not observed; Render dashboard settings beyond `list_services` were not read.
- Running `render-headers.mjs --apply` (no API key in this environment, by design) and a Render build with the new install flags.
- Producing a lockfile and auditing the registry contents of dependencies (offline toolchain); no `pnpm audit`/advisory database check.
- Browsers other than Chromium (Playwright 1.56); assistive technology; mobile browsers.
- The Tally form and Tally's platform; the enterprise application, its API, `apps/enterprise-web`, Founder Studio; DNS; denial of service
  against Render; social engineering; physical security.
- Git history outside this clone.

## Residual risk

- Until SA-01's owner action is done, the `-next` sites can be framed (no `frame-ancestors`/X-Frame-Options), are not HSTS-pinned and
  lack nosniff; the meta CSP covers everything else.
- Until a lockfile is committed (SA-03), a malicious release older than 24 hours in any transitive dependency would enter the next build;
  `--ignore-scripts` stops it from running at install, not from being bundled if it is a bundled dependency.
- The Learn pages render first-party HTML (SA-10); a hostile change to `SIGNAL_LIB.json` in the repository would be limited by the CSP but
  could still change page markup.
- The demonstration's access policy is client-side by design; anyone can read the whole synthetic model. Real access control belongs to
  the authenticated application's server (Phase 2), which was not assessed here.
