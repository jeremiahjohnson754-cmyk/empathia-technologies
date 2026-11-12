# 90-6 · Boundary review: the public demonstration and the website

Written 12 Nov 2026 against commit `30f5edd` and later. This is the engineering team's own review, not an independent assessment. It covers the two public apps: the Living Campus demonstration (`apps/demo`) and the corporate website (`apps/website`). It does not cover a production deployment.

The enterprise API and its row-level security are covered separately in `THREAT_MODEL.md` and `tests/security/*`.

For each boundary the review lists:

- what an attacker or a curious visitor would try;
- the control in place;
- the negative tests that try it and fail.

Test IDs are given as written in the suites, so anyone can rerun the suite and find the same check.

## Status words

| Word | Meaning |
|---|---|
| PASS | The check ran on the commit named in `docs/design-transformation/TEST_RESULTS.md` and passed. |
| NOT RUN | No such test exists. NOT RUN is never a pass. |

## 1. Role isolation: who you are

| Attempt | Control | Negative tests |
|---|---|---|
| Write a role that does not exist (founder, admin, `__proto__`) into stored settings | The stored role is checked against the demonstration's 15 roles. Anything else falls back to a demonstration role. | `public-security` PS-05 |
| Put broken JSON, out-of-range values or markup in any stored key | Every reader validates what it reads. A damaged value never breaks a page and never pollutes a prototype. | `public-security` PS-04; `demo-access` R1-04; `demo-hardening` (damaged saved data) |
| Choose a role through the address (`?role=`, `?perspective=`, `?as=architect`, `__proto__[role]`) | No address parameter sets the role. `as=` selects only a presentation configuration, which grants nothing (registry: "choosing a world or a role configuration grants nothing"). | **`demo-boundaries` BD-01**, BD-03 (new, 90-6) |
| Reload to shed a refusal | The role and the refusal survive a reload. | **`demo-boundaries` BD-02** (new) |
| The UI shows a button the role lacks | Buttons and sections a role may not use are absent, not merely disabled. | `demo-access` A-11, A-12; `demo` DX-19; `demo-control` C-02 |

## 2. Direct address of a denied page

| Attempt | Control | Negative tests |
|---|---|---|
| Type the address of a page the role may not open | The access page (the Agora Owl) is shown, and the screen's code is never downloaded. | `demo-access` A-01, A-06, A-08; `public-security` PS-06 |
| Do the same with no server headers, offline, or on a slow network | The same check runs in the page itself, so the saved offline app does not widen what a role is shown. The screen is never shown while it loads. | PS-06; `demo-offline` OF-22; **`demo-boundaries` BD-04** (new) |
| An unknown or very long address, or hostile query values | The not-found page shows them as text, shortened. Hostile query values fall back to the defaults. | `demo-access` A-09, A-16, A-17; `public-security` PS-03, PS-09 |

## 3. QR codes and link tampering

| Attempt | Control | Negative tests |
|---|---|---|
| Use a scanned label to get more than the label's holder may see | A label identifies a thing; it never grants authority. A visitor sees what the label names and where, and nothing else. | `demo-proof` QR-05, QR-06 |
| Forge a label (extra field, wrong version), or use a web address, a script address or markup | The label is refused and never opened. | `demo-proof` QR-09, QR-11 |
| A label that was replaced, withdrawn or expired, or that is unknown | Each says so, and none opens a passport. | `demo-proof` QR-07, QR-10 |
| Use a label to probe whether a record exists in another customer's estate | Another tenant's label reads exactly like an unknown one. | `demo-proof` QR-08 |

## 4. Tenant boundaries and private documentation

> "No customer should be able to search another customer's private incidents or documentation."

| Attempt | Control | Negative tests |
|---|---|---|
| Read the first customer's private documents as the second customer | Private objects are filtered by tenant before rendering. No title, id, document number, job number or sentence appears anywhere in the page. | `demo-knowledge` T-02, T-03, T-04, T-07 |
| Search for the first customer's words | Nothing of it is found. | `demo-knowledge` T-06 |
| Shared knowledge leaking identity | Only what was shared with recorded consent reaches another customer, anonymised. Withdrawing the consent removes it. Only a reviewer, by name, can release it. | `demo-knowledge` S-02, S-05, S-06, S-07, T-05 |
| A visitor reading customer material | A visitor is a guest of no customer and reads only public material. | `demo-knowledge` T-08 |
| A server bypass (the enterprise API) | Row-level security is forced on the runtime role, and a forged direct call returns 403. | `tests/security/*`; `enterprise-web` W-09 |

## 5. Equipment control without consent

All control in the demonstration is simulated: nothing is sent to equipment, and the page says so.

| Attempt | Control | Negative tests |
|---|---|---|
| An employee reaching engineer controls | Engineer mode is absent for that role. | `demo-control` C-02 |
| Turning the camera or microphones back on under privacy | While privacy is on, a camera preset and un-muting are refused with the reason. | `demo-control` C-10, C-11 |
| Arming a commissioning run without the local operator's consent | Only the consenting local operator can arm. The commissioning lead is refused. Arming needs two confirmations, and the run is labelled SIMULATION. | `demo` F-09; `enterprise-web` W-70, W-71 |
| Treating training as permission | A completed check or drill is recorded as training. It never grants authority. | `demo-learn` LN-39; `enterprise-web` W-73 |

## 5a. Training can never change a real record (founder, 12 Nov 2026)

> "Ensuring that training simulations can't modify real ServiceHands incidents or tenant data."

`demo-training-isolation` (12 checks) first lets the real stores exist (ServiceHands' shared workspace, the tenants' knowledge library, Here, Requests) and copies every stored record byte for byte. It then runs every kind of training as the technician, the architect, the steward and the visitor:

- the three flagship labs (with the boss clock);
- the same labs inside S01E05, S01E07 and S01E10;
- Learn's instrument labs;
- **Service Mode on a real room's case built from its service incident**, declared twice;
- a SIGNAL incident;
- a timed drill.

It then compares the records with the copy.

| What | Rule |
|---|---|
| Must be byte-identical | Incidents, work orders, APEX and Learn cases, staff, field sessions, licences, the tenants' knowledge, requests, field queue, control, connect, documents and decisions. |
| Allowed to change | The training stores themselves, the workspace's `training` list, and new ledger lines of type `training.*` that each say they never grant a credential or authorization. |
| Earlier ledger lines | Must still be there, unaltered. |

Results:

| Check | Result |
|---|---|
| TI-service, TI-architect, TI-steward, TI-visitor | No real record changed. |
| TI-service-ledger | Training did write to the ledger, so the comparison was exercised. |
| TI-visitor-refused | The visitor may practise but is refused Service Mode on a real case. |
| TI-guard | The comparison itself catches a changed incident and a non-training ledger line. |

## 6. Media rights and claims

| Attempt | Control | Negative tests |
|---|---|---|
| Name a vendor as if it were integrated | Every vendor name on either site is in a register with its evidence. The 83 catalogue entries are labelled "planned, not connected". | `vendor-claims` (unit, 7); `connector-claims` (unit) |
| Show unverified film as product footage | The website shows a film only when it is verified. Unverified films are left out at build time and listed in the build line. SIGNAL footage is labelled as generated. | website build; `signal-cinematic` (unit) |
| Forbidden claims (certifications, awards, testimonials, real organisations) | Every page is scanned against the forbidden list. | `website` (FORBIDDEN list); `demo-worlds` (unit) |

## 7. Reliability under reload, offline and slow networks

| Condition | Control | Tests |
|---|---|---|
| Reload | Work, role and game-day phase survive a reload. | `demo-offline` OF-05, OF-09, OF-41; **BD-02** |
| Offline | The saved app opens. Queued results are sent once, in order, with conflicts surfaced. | `demo-offline` OF-05 to OF-50 |
| A part of the app fails to load | A named alert with *Try again*. The rest keeps working. | `demo-hardening` HZ-01 to HZ-08; `demo-access` A-14, A-15, R1-05 |
| Slow network | A loading line, then the page. A forbidden page is refused throughout. | **`demo-boundaries` BD-04, BD-05** (new) |
| Content Security Policy | Scripts come from self only, and requests to other origins are refused, even with no server headers. | `public-security` PS-01, PS-07; `demo-hardening` HZ-13 |

## NOT RUN: said plainly

| What | Why it has not run |
|---|---|
| A penetration test by an independent third party | None has been done. Status: **NOT VERIFIED — EXTERNAL TEST REQUIRED**. |
| Real identity-provider, tenant and Microsoft 365 boundaries | No real tenant or identity provider is connected (see `VENDOR_NAME_REGISTER.json`). Every check above runs against synthetic data and the demonstration's own roles. |
| Real equipment control | Nothing in either app controls equipment. A real control path would need its own review before it existed. |
| Load and abuse-rate testing of the public hosts | Not done. |
