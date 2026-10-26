# Browser 3D scene contract

## What exists
* **Renderer (demonstrator only):** `Empathia_V25/work/source-254/src/87-ui-lite3d.js` — a small 3D engine drawing to **SVG** with a
  perspective camera (yaw, pitch 12–89°, zoom, pan), shaded boxes and discs, depth sorting, cut-away walls, floor overlays and labels.
  Input: drag to turn, pinch or buttons to zoom, double-tap to reset, arrow keys when focused; every drag has a button equivalent;
  honours reduced motion. **No WebGL, no three.js, no React Three Fiber** exist anywhere in the workspace.
* **Scene builder:** `v25RbScene` (`src/v25-61-room-ui.js` 55–63) — floor polygon from the outline, walls as boxes 0.12 m thick and
  min(ceiling, 2.4 m) high, each device as a box of its category's `size` (ceiling mounts at ceiling − 0.2 m, floor mounts at 0),
  furniture optional, labels optional.
* **Export (the contract):** the "Export scene contract (JSON)" button (`v25-rb-scene`, `src/v25-61-room-ui.js` 243) writes
  `<room>-scene-contract.json`:

```json
{
  "schema": "empathia.room-scene.v1",
  "note": "scene contract for an external renderer; the browser view is not a native UE5 build",
  "units": "m",
  "room": { "id": "R-…", "outline": [[0, 0], [18, 0], [18, 26], [0, 26]], "ceiling": 6 },
  "objects": [
    { "id": "PA-0001", "category": "display", "model": "generic", "generic": true,
      "x": 9, "y": 0.2, "z": 1.2, "rotDeg": 0, "mount": "wall", "size": [1.65, 0.12] }
  ]
}
```
`size` is `[width, depth]` in metres from the category (`V25_ROOM_CATS`); heights are the renderer's choice today.

## SPECIFIED ONLY — production viewer
A production 3D view (React Three Fiber / three.js in the enterprise web app) should:
1. read `GET /v1/rooms/<code>` and build the same scene server-independently (or the API should serve `empathia.room-scene.v1` directly —
   not implemented);
2. treat the scene as **read-only visualisation**: edits go through the 2D editor contract (`docs/frontend/FRONTEND_ENGINEERING.md` §7);
3. add per-category heights and simple meshes keyed by `category` (generic shapes — no manufacturer models);
4. show provenance (MODELED / DECLARED / PHOTO_INFERRED) on hover and keep a 2D fallback, keyboard camera controls and reduced motion;
5. version the contract (`empathia.room-scene.v2` for breaking changes) and validate exports against a JSON Schema derived from this page.
