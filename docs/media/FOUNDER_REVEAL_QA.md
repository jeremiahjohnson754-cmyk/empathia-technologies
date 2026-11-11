# The founder page's ten-second introduction: what it is and what was checked

`/founder` on the corporate site. Markup `apps/website/src/founderStory.tsx`, timing `apps/website/src/reveal.ts` (ships as
`dist/founder.js`, under 4 kB, loaded on this page only), picture `apps/website/src/styles/founder.css`.

## What it does

The founder's own photograph, the same file, whole, never cropped, scaled, distorted or replaced, sits on a charcoal plate. Over ten
seconds light crosses it, his name and credentials arrive, and four lines are drawn from the photograph to the four words the product is
built on: People, Process, Technology, Communication. It then rests. Every layer but the photograph is decoration and is hidden from
assistive technology; a sentence for screen readers says what the drawing shows.

- Plays once per browser session, when the plate is in view. Replay is always offered; Pause is offered while it runs.
- With reduced motion, or with no script: no motion and no controls; the resting composition is what the markup and stylesheet draw.
- No layout shift: every box has the same position at the start, at the end and on the page without motion.
- No inline style, no key or scroll listener, no request.

## The founder's words

"The Missing Piece", his five paragraphs and "My Cinderella shoe." are rendered from `apps/website/src/founder.ts` exactly as written;
the browser suite compares the rendered text with those constants. Everything around them is the company describing its product; it names
no employer, customer or site and claims no endorsement.

## Checked (11 Nov 2026, Chromium, light and dark)

`tests/browser/website.test.mjs`: 246 passed, 0 failed in each scheme. The checks specific to this page cover the verbatim text, the
photograph (whole, square, inside its plate), widths from 320 to 1440 px, the full sequence in real time, pause and replay from pointer
and keyboard, reduced motion, no script, and layout shift.

Three checks were corrected the same day, each with its measurement in the test file: a byte-for-byte comparison of whole-hero
screenshots across two browser contexts (rasterisation of thin lines differs by up to 25/255; the plate is still compared pixel for
pixel), and the pause check (the pointer was left on a button whose hover colour changed when the first screenshot scrolled the page).

## Not checked

No person has watched it on a physical phone or with a screen reader. Browsers other than Chromium: NOT RUN.
