# ADR-0022 · The support directory: organizations, contacts, support paths (migration 0044)

Status: accepted, 18 Nov 2026. Sources: `SOURCE_RECONCILIATION.md` item 2 ("who do I call for audio at this site, and who is their
backup, including people who never sign in. That is what the name Search Party meant first."); founder, 18 Nov 2026, 05:16: "the
teams outlook and copy contact info on search party can we also bring that back in this build".

## Decision

- **Records**: `app.organization` (owner, integrator, vendor, manufacturer, service provider), `app.contact` (name, role,
  organization, up to six channels, optionally the account they sign in with), `app.support_path` (site, domain, primary, backup,
  optional escalation contact, vendor and queue, hours).
- **Who**: recorded by someone who coordinates service, handoff or access (`service.triage`, `handoff.accept`,
  `access.coordinate`); a contact verified, and a path approved or rejected, by a data steward (`provenance.review`), never the
  recorder or proposer (database constraints as well as the API).
- **Rules**: a path names verified, current contacts and a backup who is someone else; one approved path per site and domain, an
  approval superseding the old; a rejection says why. A contact's identity never changes; a verified contact's channels never change
  (record a new contact); retired with a reason, never while on an approved path. Nothing is deleted.
- **Who to call**: `GET /v1/sites/{site}/support` and `GET /v1/rooms/{room}/support` (`?domain=`) answer from approved paths only,
  and say which domains have none.
- **Hand-offs** (`contactActions`): from a contact's channels the server builds "Chat in Teams" and "Call in Teams" (the Teams deep
  link forms published by Microsoft, as `apps/demo/src/connect/apps.sources.ts` records them), "Email (Outlook or your mail app)"
  (`mailto:`), "Call" (`tel:`, RFC 3966) and "Copy contact info". Each is a link into the viewer's own app; nothing is sent, no
  meeting booked, no connector used. Search Party's intent answers offer the same for a person who is a verified contact, and say
  why not otherwise. These are not presented as Microsoft 365 integrations.
- **Pages**: the flagship room page has a "Who to call" card (FL-39). The sandbox opens with three synthetic organizations, four
  verified contacts (two who sign in, two who never do) and approved audio and video paths at both sites; every address is on
  `example.org` and every number in 555-01xx.

## Not done here

- The browser-local People and Search Party pages keep their own synthetic directory; they do not read this one yet.
- No import of a customer's contact list; no data-quality queue for stale contacts.
