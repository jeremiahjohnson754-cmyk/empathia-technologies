# Connector inventory (70/10 task 70-0)

**12 November 2026.** What each connector attached to the engineering session did when asked, so that nothing on the site or in the
product claims a connector that was never made to work. No account names, addresses, identifiers or balances are recorded here; the
probes read only the signed-in account's own identity or workspace list, and changed nothing.

"Responds" means a read-only call returned the account's own data on 12 Nov. It does not mean the product integrates with the
service: **no connector below is a product integration**, and none is presented to customers as one. The product's own adapters
are listed, with their real state (NOT_CONFIGURED in this build), in the Living Campus's adapter registry.

| Connector | Probe on 12 Nov | Result | Used for this product so far |
|---|---|---|---|
| Render | workspace fallback | the session holds no default workspace (by design, the tool asks before choosing one); deploy listing for the two staging services works when the service is named | staging deploy checks of `phase3/legendary-experience` (the deploy listings are in the checkpoint) |
| Figma | identity | responds | called earlier in the session; the outcome is not in the surviving record, so nothing here depends on it |
| Postman | identity | responds | called earlier in the session; the outcome is not in the surviving record, so nothing here depends on it |
| Supabase | organisation list | responds (one organisation, no project used) | none |
| Sentry | organisation list | responds | none |
| Netlify | user | responds (no sites) | none |
| Lovable | identity | responds | none |
| Framer | workspace list | responds | none |
| Webflow | — | not probed today | called earlier in the session; the outcome is not in the surviving record, so nothing here depends on it |
| Superhuman Docs | identity | responds | none |
| Tally | workspace list | responds | none (standing rule: Tally is not modified) |
| Hive | workspace list | responds | none |
| Canva | brand kits | responds (no brand kits) | none |
| Mobbin | collections | **fails: the service requires a paid plan** | none; no purchase made |
| vidIQ | credit balance | responds | called earlier in the session; the outcome is not in the surviving record, so nothing here depends on it; nothing published |
| TinyFish | wallet | responds (billable service) | 12 Nov 06:4x, with the founder's permission to visit the staging sites: three page fetches and one browser run against the two staging sites only, as a health check (metered at a few cents at most); nothing private sent |
| Adobe (Express, fonts) | — | not probed today | called earlier in the session; the outcome is not in the surviving record, so nothing here depends on it; nothing published |
| ElevenLabs (restricted creative connector) | — | not probed today | called earlier in the session; the outcome is not in the surviving record, so nothing here depends on it. Direct API calls from the workspace were refused by the network gateway (403) and, by the founder's instruction, not retried. The one shipped narration take (`tour-a-05`) is owner-approved and checked by its sha256 |
| Firecrawl | — | not probed today (billable per request) | called earlier in the session; the outcome is not in the surviving record, so nothing here depends on it |
| Claude artifacts, Claude Docs | — | not probed today | engineering notes only; nothing public |

## Rules that follow from this

- A connector that responds is a tool the engineer can use, not a feature of Empathia. The website and the Living Campus name no
  connector as an integration (unit test `connector-claims`: no connector name in either app's source, except Tally as the
  disclosed enquiry-form processor and the narration's generated-voice provenance line).
- Billable connectors (TinyFish, Firecrawl, vidIQ credits) are not run without a task that needs them; paid upgrades (Mobbin) are a
  purchase and need the founder's word.
- Nothing private (repository, credentials, customer records) is sent to an external creative or research connector without
  authorization; the probes above sent no repository content.
- NOT RUN: any end-to-end product integration with these services. None exists.
