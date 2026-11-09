# Connectors — what is really available (checked 9 November 2026)

Checked by calling each one, not from the connector directory. "Used" means used for this iteration's work.

| Connector | Access | Used for | Note |
|---|---|---|---|
| Render | Working: four static sites listed, deploys readable | Reading service and deploy state; staging deploys follow `phase3/legendary-experience` | No API, database or worker service exists on Render |
| GitHub (repository) | Working: push and fetch | Every slice pushed | The repository is public |
| Figma | Signed in (Pro team, admin) | Not used this iteration | The "Rebuild direction" frames exist from 4 November. New screens (Proof Center, QR Hub, dossier, worlds, pricing) are not yet in Figma |
| Postman | Signed in (admin) | Not used yet | Next: a collection for the six Proof Registry routes from `docs/api/openapi.json` |
| Sentry | Signed in (one organization) | Not used | No project is wired to the sites. Adding it means a third-party request from pages that today make none, so it needs the founder's decision |
| Supabase | Signed in, no projects | Not used | The backend is its own PostgreSQL schema with row-level security; nothing is to be replaced |
| ElevenLabs | Tools respond | Not used this iteration | Generated audio cannot be fetched into this workspace, so no narration take has been mixed into Film 13 |
| Adobe, Canva, HyperFrames, vidIQ, SketchUp, Mobbin, TinyFish, Firecrawl, Webflow, Framer, Lovable, Tally, Hive, Superhuman Docs, Mermaid, tldraw | Listed; not exercised this iteration | — | Used only where a real output needs them. Tally stays untouched (standing rule) |
| CircleCI, Descript | Not connected | — | BLOCKED until connected; nothing waits on them |

Nothing proprietary was sent to any external service this iteration.
