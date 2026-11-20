# Release readiness (deliverable I)

As of 20 Nov 2026, for the staging build **fe30ba9** (13fd15f's experience work and the website's four-perspective pass; both static sites live on staging; production unchanged on the 31 Oct build, by
the founder's choice of 19 Nov: staging only).

## Summary

The demonstration and the corporate website are in a good state **for a guided investor demonstration on synthetic data**. Everything
the founder singled out on 20 Nov is fixed and checked: the maps and 3D worlds no longer take the page's scrolling on a phone, a booth
in Expo LIVE takes you to it, the stadium and the expo can be moved without dragging, and Search Party keeps its place across products.
The exact-commit regression passed (287 suites, 0 failures, 2 not run as always) and all live checks on staging pass.

This is **not** a recommendation to call anything production-ready: the product is an investor demonstration, and the items below
stand.

## Defects

| Severity | Open | Fixed today |
|---|---|---|
| P0 | 0 | 0 |
| P1 | 0 | 8 (D-01..D-07, D-16) |
| P2 | 0 known in the flows inspected | 7 (D-08, D-09, D-12..D-15, D-17) |
| P3 | 1 open (D-10 vendors not searchable), 1 by design (D-11 manufacturer/model: no real brands) | 1 (D-18) |

Register: UX_UI_DEFECT_REGISTER.md. The eight-width audit of both sites (464 page × width checks) found no P0 or P1.

## Blockers

None for staging. For production: the founder's word (release control); nothing in this work changes that.

## Maturity, stated as the sites state it

- The demonstration runs on synthetic data in the browser; no customer, device or live system is connected. Simulated, modeled,
  declared, observed and verified values are labelled as such.
- The 3D worlds (Campus Life, Stadium LIVE, Expo LIVE) are first versions on fictional venues.
- SIGNAL Season 2: 329 of 339 lines are voiced with named AI preset voices; 10 are captions.
- Pricing on the website is proposed list prices, not a quote; self-serve purchase is not open.

## Known limitations of this verification

- Touch was driven through Chromium's own touch input; no physical iPhone or Android phone and no Safari were available.
- WebGL is drawn in software in the test browser: no frame-rate claim is made.
- The accessibility audit is in-house (rules A1–A10), not axe-core.
- Journeys A–H of the directive are covered where the product implements them (see END_TO_END_TEST_RESULTS.md and the suites named
  in NAVIGATION_AND_SEARCH_VALIDATION.md and SPATIAL_MAP_QA.md); parts that are simulated in the demonstration say so on screen.

## Recommendation

Keep fe30ba9 on staging for the founder's review (regression 287/0/2; live checks 25/25). Production stays on the 31 Oct build until the
founder decides otherwise.
