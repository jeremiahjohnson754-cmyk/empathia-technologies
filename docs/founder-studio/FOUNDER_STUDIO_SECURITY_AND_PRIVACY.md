# Founder Studio security and privacy

Directive 18 Nov 2026 21:34, §16: "Private/public separation, protected evidence, and data-exposure review." Reviewed 19 Nov 2026.
Every statement below names the code, test or scan that supports it. The automated checks run in the exact-commit regression; the
byte-level scan in §4 was run for this review on the public sites built from 89d5d83's sources.

## 1. Where private material lives

| Material | Where | Never |
|---|---|---|
| The Founder Studio archive (Artifact A, 26 Oct 2026) and its extraction | `.local/reference/2026-11-18-founder-studio/` (git-ignored) | committed, published, sent to a connector |
| The private origins archive (founder vision and receipts) | the same folder, as the founder supplied it, unmodified and unextracted | read into any page, bundle, endpoint or document |
| The Founder Edition page and the five film masters the studio plays | the private store outside the repository (`~/.empathia-private/founder-studio`) | in the repository: `apps/founder-studio/PRIVATE_ASSETS.json` lists names, sizes and SHA-256 only |
| Pricing cost assumptions, margins, the pricing model and its reports | `.local/pricing/` (git-ignored) | in the repository or on any public page |
| The founder's directives, verbatim | `.local/directives/` (git-ignored) | published |

Tests: `tests/unit/private-assets.test.mjs` PA-01 (the manifest holds names, sizes and hashes, and nothing else), PA-02 (none of the
private files is tracked; the studio's built page and generated documents are git-ignored), PA-03 (the default store is outside the
repository) and the rest of that file; `tests/unit/private-bucket.test.mjs`.

## 2. The Founder Studio is private by construction

`apps/founder-studio/server/serve.mjs` serves the studio from the founder's own computer only: it binds to 127.0.0.1, refuses any
other Host header (a DNS-rebinding guard), needs a per-launch access key (kept afterwards in an HttpOnly, SameSite=Strict cookie),
serves only its own folder and the film files named in its index, lists no directories, and makes no network call of its own. Its
content-security policy allows connections to its own origin and the platform API only. Tests: `tests/browser/founder-studio.test.mjs`.

The studio is not deployed to any public host. Nothing in `render.yaml` serves it.

## 3. The public founder page

`/founder` carries the founder's name, his approved photograph (`apps/website/src/founder.ts`, unchanged by instruction), his own
quotation and fortune-cookie photograph (13 Nov 2026), and only his three credentials (CTS, CAPM, CompTIA Network+). Its images are
the founder photograph, the fortune photograph, a product capture and the brand emblem; none comes from either archive.

`tests/browser/website.test.mjs` W-founder-page fails if the page claims any other credential (SHRM-CP, CMP, CTS-D, CTS-I) or carries
anything of the origins archive: "B3 Integrated", receipts, "origins archive", "chronology", or the 20 November 2025 founder-vision
date, which is not presented as independently authenticated. No relative is named and no affiliation is implied
(`docs/founder-studio/PUBLIC_PAGE_CONTENT_AUDIT.md`).

## 4. Data-exposure scan of the public sites (this review)

Built `apps/website/dist` (246 files) and `apps/demo/dist` (1,042 files) were compared with the private material:

| Check | Result |
|---|---|
| Every member of both archives (112 files of 200 bytes or more: 16 of the studio archive, 96 of the origins archive), every private-store file and every reference file, by SHA-256, against every public file | no public file is identical to any of them |
| Source maps in either public site | none (they are moved out at build time, red-team RT-20) |
| Text files of both sites for "origins archive", the archive's file name, "B3 Integrated", "contractor invoice", the 20 November 2025 date, and the names of real organisations that must not appear (AON, Kraft Heinz, Stefanini, KHC) | no match |

A hash comparison finds copies, not re-encodings or paraphrase; the content audits in §3 and the tests in §5 cover what a person
would recognise.

## 5. Commercial confidentiality on the public sites

- `tests/browser/website-pricing.test.mjs` BY-10: the pricing script makes no network or storage call and carries no cost, margin or
  supplier figure; BY-13: neither pricing page carries cost or margin wording or the internal FieldLink unit costs.
- `tests/browser/website-fieldlink.test.mjs` FL-10: no bill-of-materials, cost-of-goods, margin or supplier figure appears anywhere on
  the built website.
- Price Book 3's public fields (`packages/commercial/src/pricebook.ts`) hold list prices and rules only; the model's costs and margins
  stay in `.local/pricing/`.

## 6. The public sites' own security

`tests/browser/public-security.test.mjs` (the content-security policy in the page, no request leaves the site, injection, tampering,
View-as), `scripts/staging/verify-static.mjs` (the declared headers on the static sites) and, on staging, `demo-edge` (TLS, CORS,
authentication). Results are in each staging record (`docs/releases/STAGING_2026-11-19.md`).

## Not covered

- The studio has not been reviewed by a person other than its builder; the founder's own walkthrough is the next check.
- Re-encoded or edited copies of private images or films would not match by hash; none is known, and the public pages' images are
  listed in §3.
