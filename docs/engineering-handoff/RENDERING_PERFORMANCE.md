# Rendering performance in the 3D worlds

How the live 3D scenes keep their pace, what was measured, and what a new world should reuse. Written 25 Nov 2026 with the work on
roadmap item A19. The founder named spatial rendering performance the biggest concern on 24 Nov 2026 (30 frames a second suggested
as the interactive target, 60 as the ideal) and, on the stadium's crowd, decided:

> Preserve full graphical detail for nearby spectators. Simplify distant spectators dynamically. Preserve crowd density, atmosphere
> and visual identity. Maintain a full-quality override. Ensure engineering overlays, measurements and interactive objects remain
> accurate. Apply reusable optimization techniques to future worlds where appropriate. You shouldn't have to sacrifice the cinematic
> experience to accommodate less powerful hardware. The engine should intelligently balance fidelity and responsiveness.

Everything here lives in one file, `apps/demo/src/play/gl.ts`, the WebGL2 renderer shared by the campus, the stadium, the expo hall
and the 3D map.

## What has and has not been measured

Every frame rate in this repository is of the test machine: two cores, no graphics processor, Chromium drawing WebGL in software.
It is a regression figure. **No visitor's device has been measured**, and 30 frames a second on ordinary hardware is a target until
one is. What is the same on every machine is the count: triangles and draw calls a frame.

Measured on that machine, a frame costs about a millisecond for every thousand triangles sent to be drawn, and 0.1 to 0.2 of a
millisecond for every thousand pixels. A scene is therefore bound by one or the other, and which one decides what helps:

| Scene | Triangles a frame | Draw calls | Bound by |
|---|---|---|---|
| Campus | 28,412 | 103 | pixels |
| Expo hall | 6,708 | 132 | pixels |
| Stadium, before 25 Nov | 104,474 | 59 | triangles first, then pixels |
| Stadium, whole crowd | 53,174 | 155 | both |

## The rule of order

Measure before changing anything, and give up first what nobody can see.

1. **Do not send what cannot be seen.** Costs nothing in the picture, so it is always on.
2. **Draw distant things simply**, only on a machine that cannot hold the pace.
3. **Draw fewer pixels**, only if that machine is still slow.
4. **Never below the floor, and never against the visitor's choice**: full quality can be pinned.

## The techniques, and how a new world uses them

### 1. One-sided faces (`quadVerts`)

A thing that is only ever seen from one side is one face, not a box. The stadium's window lights on distant towers were boxes 0.1 m
thick: twelve triangles each, two of them visible. They were 39,024 of the scene's 104,474 triangles. Use `boxVerts` for things a
visitor can walk round; `quadVerts` for signs, windows, screens, markings, anything flat against something else.

### 2. Faces sorted by the way they look (`figureFaces`, `facesSeen`)

Where many things stand square to the same axes (a seated crowd, rows of desks, shelving), keep each group's faces in runs by
direction, in one buffer, and send only the runs that can look at the eye. The graphics card would discard the others anyway, but
only after working on every corner of them. The test errs toward drawing: it never withholds a face that looks at the eye
(`tests/unit/render-cost.test.mjs`, RC-04).

### 3. Not sending what is outside the view (`boundOf`, `sphereInView`, `Renderer.seen`)

Every mesh carries the sphere that holds it. `r.seen(mesh, pad)` is false only when that sphere is wholly outside one side of the
view. Build a large world in pieces the size of a section, a room or a block, not as one mesh, so that this has something to leave
out. It never leaves out a point the view draws (RC-03).

### 4. Level of detail by size on the screen (`pixelsTall`, `lodLevel`, `Renderer.lod`, `figureFar`)

What decides is how tall a thing is in the pixels actually drawn, not how many metres away it is: that follows the camera, the lens,
the size of the canvas and the adaptive detail together. A spectator at least 6 drawn pixels tall is drawn whole; smaller, simply;
with a band of 15% either side so nothing on the line flickers. The distance used for a group is to its nearest edge, so the nearest
member decides and nothing near the camera is ever simplified.

The simple figure (`figureFar`) is one face on the figure's diagonal, leaning back. From any direction in its quarter, at or above
the seat, it covers exactly the area the whole figure covers (two visible sides and the head: the sums are equal term for term), in
the figure's own colours. So a far crowd keeps every person, in place, as dense and as bright as before. What changes is its shape:
a slanted mark, sideways by at most 0.22 m of its 0.8 m, which at the size where it is used is under two pixels. A new world's own
far form should hold to the same test: the same covered area and colour from every direction it can be seen from (RC-06).

`r.lod(...)` returns "whole" unless the scene is too slow to draw whole (below), and always "whole" when full quality is pinned.

### 5. Adaptive detail, in two stages (`DetailGovernor`)

About once a second the governor looks at the pace.

- A scene that has a simple way to draw its distant things says so (`r.gov.simplifies = true`). When it cannot hold 24 frames a
  second, the first thing that happens is that distant things are drawn simply. No pixel is touched in that second.
- If it is still slow, it draws fewer pixels: the canvas keeps its size on the page and the picture is scaled up, never below half
  resolution, and full resolution comes back for good if the minimum buys less than 1.25 times the speed.
- A machine that holds the pace gives up neither. A slow start does not cost a capable machine its whole figures: after three seconds
  well clear of the target they are tried again, once, and kept if the pace holds.

### 6. The full-quality override

- In the address: `?detail=full` pins full resolution and every figure whole, whatever the pace.
- On the page: the stadium's console has "Full quality", which does the same at once and hands the choice back when unticked.
- For looking at the simple drawing itself: `?lod=simple` draws distant things simply whatever the pace (with `?detail=full` the
  pixels stay full). Tests use the pair to compare the two drawings at the same resolution.

### 7. What must not depend on any of this

Overlays, labels, modeled measurements, device markers and anything a visitor can select are drawn from the model, not from the
crowd's buffers, and are never simplified. The stadium's suite checks that the modeled level of every section, every label and its
position, and the triangles each overlay adds are identical with the crowd whole and simple (SLV-19).

### 8. A counted budget beside every frame-rate floor

The renderer counts the draw calls and triangles of each frame and puts them on its canvas (`data-draws`, `data-tris`). Each scene's
suite holds it to a budget that is the same on every machine: stadium 60,000 triangles and 180 draw calls, campus 32,000 and 120,
expo hall 8,000 and 150. A new world gets a budget on the day it gets a scene.

## Checklist for a new world

- Build it in pieces (sections, rooms, blocks), each its own mesh.
- Use one-sided faces for anything flat against something else.
- Where there are hundreds of the same thing, give it face runs and a far form, and prove the far form covers what the whole one does.
- Call `r.pace(ms)` every frame; set `r.gov.simplifies` if there is a far form; ask `r.seen` and `r.lod` when drawing.
- Show the visitor what is happening (the note under the scene) and offer "Full quality".
- Open pixel-comparison tests with `?detail=full` (see `TESTING_AND_EVIDENCE.md`).
- Give its suite a counted budget and a frame-rate floor, and record what it measures (`tests/lib/frame-rates.mjs`).

## Not done

- Device figures: representative desktop and phone benchmarks (rendering, navigation response, memory, a larger environment) need
  real devices. An in-app check a visitor can run and export is planned, not built.
- The campus and the expo hall are bound by pixels and have no far forms; neither needs one at its present size.
- The "Full quality" control is on the stadium's page only; the campus and the expo hall have the address switch.
- Indexed geometry (sharing the corners of a face between its two triangles) is untried; it may cut the work per triangle further.
