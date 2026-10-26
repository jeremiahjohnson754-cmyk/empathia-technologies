# Empathia Founder Studio

The founder's local hub: sit down, explore the whole ecosystem, change room layouts, open dashboards, inspect equipment, run scenarios,
watch the films, and read how it is built. It runs on your own computer; nothing is sent anywhere.

## Build and launch

```bash
node apps/founder-studio/build.mjs --founder-edition=<path to Empathia-Living-Campus-v2.5.4-nomedia.html>
# then, from apps/founder-studio/dist/:
#   macOS   "Start Founder Studio.command"     Windows   Start-Founder-Studio.bat     Linux   ./start-founder-studio.sh
#   or      node server/serve.mjs [--port=4310] [--films=/path/to/your/films]
```

The launcher binds to `127.0.0.1` only, refuses other Host headers, and asks for a per-launch access key (in the URL it prints; kept
afterwards in an HttpOnly, SameSite=Strict cookie). Films are served from the folder you pass with `--films` (or the paths in the film
index); copy the film files there — they are not inside the package.

Without Node, `index.html` opens from disk with the demonstrators, documents and films that do not need the launcher; persona switching,
the data inspector and saved states need the launcher.

## The 27 destinations

| Group | Destinations |
|---|---|
| Start | Mission Control · The Enterprise Platform · Build a Room with Lite |
| Seven operational products | Search Party · Empathia Pro · Universal Commissioning · Assurance / APEX · Field Intelligence · ServiceHands · Intake Portal |
| Expansion products | Drawing Intelligence · Scouter · Procurement · Control Studio · Learn · SIGNAL · Onboard · Experiences · Collaboro-Sing · Frontline |
| Experience | Interactive Scenarios · Media Library |
| Engineering | Architecture Explorer · Engineering Documentation · Product Maturity |
| Vault | IP & Provenance Vault · Settings and Demo Reset |

Each product page opens the Founder Edition demonstrator (2.5.4 development build) as the right persona, through the demonstrator's own
persona control, and states the product's maturity on the evidence ladder — never higher than the evidence supports.

## What the studio is and is not

* It is the **Founder Edition**: everything, for the founder. It is not the Investor Edition and must not be sent to investors: it
  contains engineering-only controls, the source viewer and the vault index.
* The **Investor Experience** and the **Private Engineer Edition** are separate, frozen packages (`apps/investor-demo`,
  `apps/engineer-demo` point to them); the **source vault** (`provenance/`) is separate again. See
  `docs/product/EDITIONS_AND_PACKAGES.md`.
* The demonstrator inside is a front-end demonstration of authorization, not production security. All data is synthetic.

Tests: `tests/browser/founder-studio.test.mjs` (studio), `tests/e2e/founder-townhall.e2e.mjs` (the Build a Room town-hall journey),
`tests/media/decode-films.mjs` (every curated film decoded in full).
