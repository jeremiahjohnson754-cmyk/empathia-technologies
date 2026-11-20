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

## 2026-11-13: in colour, and the quotation

Founder, 20:16 CT: the founder page's motion graphics "more animated, more alive and futures looking and colorful vibrant clean
realistic but simple enough not to be completely over the top", and his quotation with the fortune-cookie slip on the page.

- **Colour.** The four lines and words take their layer's colour at rest and in motion: People teal `#2dd4bf`, Process violet `#a78bfa`,
  Technology amber `#fbbf24`, Communication pink `#f472b6`.
- **Added to the ten seconds**, all inside the original timing:
  - an aurora of the four colours rises behind the photograph (0.4 s to 9.8 s), then settles to a faint glow;
  - each word pings once as it arrives (4.4 s to 6.3 s);
  - a pulse runs back from every word to the photograph (5.6 s to 7.3 s);
  - one small comet crosses the top of the plate (7.3 s to 8.9 s).
- **Unchanged.** Every new layer ends on its resting value, so the resting composition is still, pixel for pixel, the page with no
  script. The photograph is untouched.
- **Checks.** The whole founder suite (WR-*, WS-*) passes unchanged in both schemes. WS-quote checks the quotation word for word against
  `apps/website/src/founderQuote.ts`, and checks the photograph and the section's place.
- **The quotation.** It sits in its own section, "Before the explanation", between the founding story and the thinking behind the
  company. The slip is his photograph (`apps/website/media/keepsake`, cropped to the slip and the hand). The slip settles into place and
  its halo turns once as the section scrolls in (scroll-driven, never under reduced motion).
