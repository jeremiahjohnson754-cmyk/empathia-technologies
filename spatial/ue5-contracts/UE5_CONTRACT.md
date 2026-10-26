# Unreal Engine 5 contract — SPECIFIED ONLY

**Nothing here is implemented.** No Unreal Engine project, plugin, asset or build exists in the workspace (read-only search of
`/home/claude` for `.uproject`, `.uasset`, `.umap` on 2026-10-26: none). The demonstrator's Experiences and Onboard pages say so
themselves ("UE5 not run", `src/v25-47-onboard.js` 6, 35) and use the browser SVG renderer as the fallback.

## Intended contract
* **Interchange:** the room-scene JSON `empathia.room-scene.v1` (`spatial/browser-3d/SCENE_CONTRACT.md`), metres and degrees, plan frame
  x right / y down converted to the engine's left-handed Z-up frame by the importer (x → X, y → −Y or as agreed, z → Z; centimetres).
* **Direction:** Empathia → engine only (visualisation, walkthroughs, training). The engine never writes design, commissioning or evidence
  records and never controls a device.
* **Identity:** every actor carries the canonical id (`PA-…`, `R-…`) so a click in the engine can open the record in Empathia.
* **Honesty:** rendered values show their provenance; simulated behaviour (audio coverage, camera framing) is labelled SIMULATED.
* **Distribution:** packaged builds follow the same distribution rules as the editions (not authorized for external distribution).

## Roadmap (proposal)
1. Importer prototype: scene JSON → static level with generic meshes per category (needs an Unreal licence decision and a developer).
2. Walkthrough of seeded synthetic rooms; screenshot parity check against the browser view.
3. Optional: a pixel-streamed or packaged experience for Experiences / Onboard, after a security review.
