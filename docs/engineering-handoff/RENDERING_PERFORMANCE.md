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

## What counts as the same picture

The founder's direction (24 Nov 2026): acceptable visual differences are defined from the quality requirements, not derived from what
a new drawing happens to produce. So the limits a simplified drawing must meet were written and committed before the simplified crowd
was built into a page or measured, and a drawing that fails them is changed; the limits are not. They are in
`tests/lib/picture-diff.mjs` and pinned by `tests/unit/picture-diff.test.mjs`, which also shows what they refuse (a crowd that is
dimmer, thinner, another colour, or smeared into its average) and what they accept (the same crowd with each person a pixel aside).

The whole drawing and the simple one are compared in the same view, at the same still moment and the same resolution.

| | Requirement it comes from | Limit |
|---|---|---|
| NEAR | "Preserve full graphical detail for nearby spectators" | Nothing 6.9 drawn pixels or taller is ever simplified. Where nothing is simplified, zero pixels differ |
| COLOUR | "Preserve crowd density… and visual identity" | In blocks of 16 pixels (about 0.4° of the eye at a desk), the difference of the average colour in CIELAB, where about 1 is not seen, about 2.3 is the least an eye notices side by side, and about 5 is seen at a glance: average block ≤ 1.0; 99 of 100 blocks ≤ 2.3; no block above 5.0 |
| TEXTURE | "Preserve… atmosphere"; a crowd must read as people in rows, not a smear | In each block with texture, the variation of lightness against the whole drawing's: the middle block within 0.90 to 1.10; 95 of 100 blocks within 0.80 to 1.25 (an eye tells two contrasts apart at roughly a tenth to a fifth) |
| STILL | "You shouldn't have to sacrifice the cinematic experience" | Two readings of a still simple picture are the same picture |

COLOUR and TEXTURE are judged only over the blocks in which the two pictures differ at all, so the sky, the pitch and the city, which
are identical, cannot make the crowd look better than it is.

What these do not judge: the change seen in motion, as a camera crosses the line between whole and simple. The band around the line
keeps a section from flickering, but whether the moment of change is noticed needs a person's eye on a real device. Not done.

A new world's far forms are held to the same limits, by the same file.

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
- Indexed geometry (sharing the corners of a face between its two triangles) is untried. Deliberately not pursued now: the founder's
  direction (24 Nov 2026) is not to spend engineering time chasing 30 frames a second on a test machine without a graphics processor
  before there are representative measurements on customer hardware. The next piece of this work is the means to take those
  measurements, not more optimisation against this machine.
