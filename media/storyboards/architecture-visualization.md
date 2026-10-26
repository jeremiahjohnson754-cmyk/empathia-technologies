# Architecture visualization film — render record

**Status: RENDERED_AND_VERIFIED** (2026-10-26T13:29:41.714Z). Rendered in this program by `scripts/media/render-architecture-film.mjs` from the
repository's own Mermaid diagrams; verified by ffprobe and a full ffmpeg decode. The film files are not committed (regenerate with the
script); their hashes are below and in `media/renders/architecture-visualization/RENDER_MANIFEST.json`.

| File | Resolution | Video | Duration | Audio | Bytes | SHA-256 | Full decode |
|---|---|---|---|---|---|---|---|
| `Empathia_Architecture_Visualization_3840x2160.mp4` | 3840×2160 | h264 High yuv420p 30/1 fps | 64.0 s | none | 17,722,905 | `6911f43da966e30682436c5a0b4b9e95b7810bff26e8ee67075a80b44e22eebb` | PASS |
| `Empathia_Architecture_Visualization_1920x1080.mp4` | 1920×1080 | h264 High yuv420p 30/1 fps | 64.0 s | none | 7,207,530 | `da21bb006e174c35a9846400663b079e484cce4f30b234c56ced3055d7dc06f7` | PASS |

## Content
Nine scenes, each a slide with a slow pan and one-second dissolves: title · system context · containers · the vertical slice ·
the data model · events · the integration flow · editions separation · closing card (“Synthetic data · production starter ·
not production-ready”). Sources: title card: How Empathia is built, `docs/architecture/diagrams/01-system-context.mmd`, `docs/architecture/diagrams/02-containers.mmd`, `docs/architecture/diagrams/03-vertical-slice.mmd`, `docs/architecture/diagrams/04-data-model.mmd`, `docs/architecture/diagrams/05-events.mmd`, `docs/architecture/diagrams/09-integration-flow.mmd`, `docs/architecture/diagrams/07-editions-separation.mmd`, title card: Synthetic data · production starter.

## Components and rights
* Footage: none — diagrams rendered from repository sources. Narration: none. Music: none.
* Fonts: the rendering machine's system UI fonts (DejaVu Sans in the diagrams); no font file is embedded or shipped.
* Rights status: **UNVERIFIED** — AI-generated in this program under the founder's direction; not in the media-rights ledger; not
  authorized for any external channel until the founder enters it in the ledger and approves the channel.

## Re-render
`node scripts/media/render-architecture-film.mjs` (needs the Mermaid CLI, Playwright Chromium and ffmpeg). Changing a diagram changes
the film; the manifest records the new hashes.
