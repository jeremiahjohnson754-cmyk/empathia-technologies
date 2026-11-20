# Responsive visual evidence (deliverable F)

Real Chromium screenshots of the built sites, served locally, made by `scripts/verify/experience-shots.mjs`. Each is the top of the page
as a visitor first sees it at that width (the viewport, not the whole page), in the light theme, with reduced motion, as the architect
on the demonstration. Phones (under 600 px) are taken with touch and a coarse pointer, as a phone's browser reports them. Nothing is
edited after capture.

File names: `<site>-<page>-<width>-<label>.jpg`, where the label is `after` (this build) or `before` (the staged build ab22bb5, taken from
the live staging site, for the pages whose look changed).

| Page | What to look at |
|---|---|
| `site-home`, `site-platform`, `site-pricing` | the corporate website at each width (the 19 Nov follow-tab fix is on /platform) |
| `demo-campus-map` | the map's controls (the Full screen button first), pins and the synthetic line at every width |
| `demo-expo-live`, `demo-stadium-live` | the new move buttons on the picture; the stage at phone widths |
| `demo-search-party` | a search kept in the address (`?q=4.218&type=Room&focus=…`): the room shown with its words and filter |
| `demo-results` | the results page with its facets |
| `demo-lite-room` | Lite's room at each width |

Widths: 320, 360, 390, 430, 768, 1024, 1440, 1920 (the directive's eight). The behaviour behind the pictures (scrolling, gestures, full
screen, search state) is checked by the browser suites, not by these pictures: a clean screenshot does not prove working software.
