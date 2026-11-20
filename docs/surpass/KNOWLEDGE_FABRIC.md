# Knowledge Fabric: the Technical Knowledge Ledger and governed document ingestion

Status on 2026-11-11: built in the investor demonstration (`apps/demo/src/knowledge/`), on synthetic data, in the browser.
**The document source is SIMULATED. A real document library is NOT CONNECTED: there is no tenant, no application registration, no
credential, and nothing has been validated against a real library.** Malware scanning is NOT implemented. Embeddings are NOT built
(search is by words). Multilingual content is NOT built. This note says what exists, what the rules are, and what a real connector
would have to do.

Founder's directive of 11 November 2026 (§07, §09): "The Knowledge Ledger needs to be powerful without compromising customer
confidentiality." "No customer should be able to search another customer's private incidents or documentation." "A user who cannot
read the source document must not receive its private content through an AI summary, search snippet, cached embedding, exported
report, or related-object description." "Do not silently convert uncertain extracted text into verified engineering facts." "Treat
imported documents as untrusted content." "Do not reproduce copyrighted standards without proper licensing."

## 1. What is where

| File | What it is |
|---|---|
| `knowledge/contract.ts` | The shared contract (owned by the integrator; not edited by this lane): the knowledge object, the five zones, `mayRead`, `redactFor`, `promote`, `compareAuthority`, `freshness`, `cite`. |
| `knowledge/calc.ts` | The calculator behind every worked example. A result on a page is computed from its inputs, never typed. |
| `knowledge/seed.universal.ts` | Zone 1 (ten metadata-only references to public standards) and zone 2 (59 Empathia-authored objects). |
| `knowledge/seed.tenants.ts` | Zones 3, 4 and 5 for two synthetic customers: `corporate_demo` (Northstar, the demonstration estate) and `brindlewick_demo` (Brindlewick Works, fictional, there to prove isolation). |
| `knowledge/ledger.ts` | Pure functions: the reader, `viewFor`, search, "the same question", related lines, back-links, the anonymiser, decisions applied through `promote`, Site Champions' notes as candidates, and the two hooks. |
| `knowledge/ingest.ts` | The simulated source and the real sync engine and journey. |
| `knowledge/store.ts` | The one write path: authority, validation, refusal with the reason, a ledger line. State in `localStorage['empathia.demo.knowledge.v1']`. |
| `knowledge/KnowledgePage.tsx` | `#/knowledge`, `#/knowledge/<id>`. |
| `knowledge/IngestPage.tsx` | `#/knowledge/sources`. |
| `knowledge/hooks.tsx` | Search Party (`#/search?q=…`) and Ask Empathia (`#/ask`). |

## 2. The five trust zones

| Zone | Name | Who reads it |
|---|---|---|
| 1 | Public or licensed | Everyone. Here: title, number and what it applies to. The text of a standard is never held. |
| 2 | Empathia-authored, reviewed | Everyone. |
| 3 | Tenant-private | That customer only, and within it only the readers its source lists. |
| 4 | Shared with consent | Everyone: a customer's contribution released with its recorded consent, anonymised, and reviewed by a person. |
| 5 | Unverified | Reviewers of the owning customer. Observations, AI-generated candidates, Site Champions' notes, and every imported document until a person approves it. Never shown as fact. |

**The honest state of zones 1 and 2.** Every object in them was written for this demonstration by an AI system. Unit tests recompute
every worked example; no engineer has reviewed the text. So each object is `IN_REVIEW` with no reviewer, its source carries the
weakest authority in the hierarchy (10), `isFact` is false, and the page, Search Party and Ask Empathia show it with that state and
never as fact. When a named engineer has reviewed the library, change the one constant `REVIEW` in `seed.universal.ts`.

## 3. The access test, and why nothing leaks

One function decides: `mayRead(object, reader)` in the contract. Deny by default. A reader is `{ tenant, role, groups, reviewer }`:
`readerFor(role, tenant)` in `ledger.ts`. A visitor is a guest, not a member of any customer.

Every surface is built from `viewFor(all, reader)`, which calls the contract's `redactFor` once and derives everything else from the
cut-down list: results, snippets, facet counts, citations, "the same question" groups, related lines, back-links and the review queue.
There is no second path. Two details matter:

- A readable object can point at one the reader may not read (an incident review citing a standard kept from them). The pointer is
  removed from the object the reader is given, not only from the page, because the pointer itself would say that the other exists.
- An address the reader may not read answers exactly like an address that does not exist.

Promotion is the contract's `promote`. A zone-5 object becomes zone 3 only when a named human reviewer approves it; a model, an
automation, an unnamed reviewer and a Site Champion deciding on their own note are refused, with a DENIED line in the ledger. Sharing
(zone 3 to zone 4) takes three things: the customer's administrator records consent; the object is anonymised (`anonymise`: customer
and place names, room and job numbers, document numbers, dates and extensions are replaced, and links to rooms and jobs dropped); a
reviewer releases the copy. The original stays private, and withdrawing consent removes the copy.

Reviewer is V2.5.3's `review.decide` (Systems Engineer, Designer, Commissioning Engineer, Product Architect). Administrator is
V2.5.3's `govern` (Data Steward, Product Architect).

Tests (`tests/unit/demo-knowledge.test.mjs`): isolation over every object, both customers and all sixteen roles; in the browser, the
second customer's reader has none of the first customer's private titles anywhere in the page.

## 4. Governed ingestion (SIMULATED)

The journey is ten steps with state and a rule each (`ingest.ts › advance`): Connect, Authorize, Select scope, Preview, Classify,
Import, Validate, Index, Approve, Surface. The source is a synthetic library of twelve documents held in the page. `connected()`
returns `[]`.

**A Microsoft Graph source exists and is MOCK-TESTED only** (`graph.source.ts`, `graph.source.mock.ts`,
`tests/unit/demo-knowledge-graph.test.mjs`). It reads one SharePoint site's document library into the same engine through
`applyDelta`, so scope, refusals, flags, review state and removal behave identically whatever answered. It has never been answered
by a real library, no page imports it, and `connected()` still returns `[]`. Its calls, its fail-closed decisions, what is not
built and the questions only a tenant answers are in [M365_DEPLOYMENT_AND_TEST_GUIDE.md](M365_DEPLOYMENT_AND_TEST_GUIDE.md).

What the engine does, and tests hold it to:

- **Initial import and incremental sync** from a delta token; a token the source no longer knows causes a full read.
- **Rename** (same object, approval kept), **update** (version history kept; the approval of the old text is void and the document
  returns to review), **deletion** (the entry and everything derived from it leave), **permission revocation** (a reader removed at
  the source loses the object, its snippets and its citations on the next sync; a document with no listed reader is not imported at
  all, because an empty access list must never mean "everyone").
- **Conflict detection**: two documents stating different numbers for the same thing are both kept and flagged; nothing is chosen.
  A conflict is told only to someone who may read both sides.
- **Throttle**: retried up to four times, waiting the longer of what the source asked and an exponential backoff (waits are reported,
  not slept). Still throttled: nothing changes.
- **Stale source** notice after seven days without a read. **Disconnect** removes the whole index. A narrower scope removes what is
  now outside it at once.
- **Extraction** keeps, for every fact and relationship, its source document and version, a derivation label (EXTRACTED or INFERRED
  here; the contract's ladder is OBSERVED / EXTRACTED / MODELED / INFERRED / VERIFIED / APPROVED) and a confidence.
- **Untrusted content**: text is stored and rendered as text. Instruction-like text is flagged, mined for nothing, holds the document
  back from approval and changes nothing else. A file type outside the allow-list (`.md .txt .docx .pdf`), a file over 5 MB and a file
  that cannot be read as text are refused with the reason.

Property test: over random sequences of add, rename, move, update, delete, revoke, grant, throttle and approve, the incremental index
always equals a fresh full import, and no reader in any role reads a document against the source's access list.

## 5. What a real connector would be

Checked on 2026-11-11 against the vendor's own documentation. Names below are quoted from those pages. Nothing here has been run.

| Need | What the documentation names | Source |
|---|---|---|
| Read only the sites a customer selects | Permission `Sites.Selected` (site collection); finer scopes `Lists.SelectedOperations.Selected`, `ListItems.SelectedOperations.Selected`, `Files.SelectedOperations.Selected`. Roles assigned per resource: `read`, `write`, `owner`, `fullcontrol`. A grant is made with `POST /sites/{siteId}/permissions` (body: `roles`, `grantedToIdentities`); granting on a site needs `Sites.FullControl.All`. | https://learn.microsoft.com/en-us/graph/permissions-selected-overview (page dated 2024-11-07) |
| Read changes instead of scanning | `GET /sites/{siteId}/drive/root/delta` or `GET /drives/{drive-id}/root/delta`. Follow `@odata.nextLink` until `@odata.deltaLink` is returned, and store that for the next read. `token=latest` returns only a current delta link. A deleted item carries the `deleted` facet. A token that can no longer be served returns `410 Gone` with a `Location` header for a fresh enumeration. | https://learn.microsoft.com/en-us/graph/api/driveitem-delta?view=graph-rest-1.0 |
| See permission changes | Header `Prefer: deltashowremovedasdeleted, deltatraversepermissiongaps, deltashowsharingchanges`; items changed only in sharing carry the `@microsoft.graph.sharedChanged` annotation. `Prefer: hierarchicalsharing` limits sharing information to the root of a permission hierarchy and items with explicit changes. | same page |
| Slow down when asked | `429 Too Many Requests` with a `Retry-After` header: wait that long; with no header, back off exponentially; do not retry at once; prefer change tracking and change notifications to polling. | https://learn.microsoft.com/en-us/graph/throttling (page dated 2025-01-15) |
| Be told when something changed | Change notifications support `driveItem`, on the root folder of a drive (`/drives/{id}/root`); a subscription lasts at most 42,300 minutes (under 30 days) and must be renewed; delivery by webhook, event hub or event grid; stated latency under a minute on average and up to six hours. | https://learn.microsoft.com/en-us/graph/change-notifications-overview (page dated 2025-03-05) |

Not verified today, so described only in general terms: the properties of a subscription request, how a notification endpoint is
validated when a subscription is created, and the lifecycle notifications sent when a subscription needs attention. They are on
other pages of the same documentation and must be read before any of this is built.

**An open design question that the documentation raises.** The delta page says that processing permissions correctly requires
`Sites.FullControl.All`. That is far more than read access to selected sites. Until this is settled with a real tenant, the safe
design is: read content with the selected-sites permission, read each item's permissions explicitly, deny by default when they cannot
be read, and re-check access at read time rather than trusting a cached list.

What a real connector also needs and does not have here: the customer's written authorisation; credentials held on a server and never
in a page; an audit record of every read; malware scanning before any parsing; a parser sandbox; size and rate limits enforced on the
server; per-tenant storage and encryption keys; deletion on request; and a test against a real library with real permission
inheritance, which is where the hard cases are.

## 6. What is NOT built

- A real connector, authentication, a server, per-tenant storage. Everything is one browser's `localStorage`.
- Malware scanning is NOT implemented. File parsing: the simulated documents are text; no `.docx` or `.pdf` is parsed.
- Embeddings are NOT built, so there is no cached vector to leak and no semantic search; matching is by words with simple stemming.
- Ask Empathia composes nothing. It returns a source's own first paragraph with its citation, or abstains.
- Multilingual content. Export of knowledge to reports. Review reminders. Identity for reviewers: a reviewer's name is typed, and the
  role is the View-as role of the demonstration.
- The anonymiser is a set of patterns for the two synthetic customers. A real one needs the customer's own vocabulary and a person's
  review of every copy, which the release step already requires.
