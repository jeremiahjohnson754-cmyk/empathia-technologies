# Metric integrity audit

Deliverable B of the founder's commercial-readiness directive (25 Nov 2026, §4, "Priority Zero"). An external, buyer-oriented review of
the demonstration's home page (25 Nov 2026, from screenshots) found numbers that seemed to contradict each other. Each was reproduced from
the seeded synthetic records at `1fa2a07e`, traced to its computation, and either corrected or explained on the page. Every figure is
MODELED from synthetic records when the page opens; none is measured, monitored or live.

## 1. Findings, root causes and corrections

| # | What the page showed | Reproduced | What each number was | Root cause | Correction |
|---|---|---|---|---|---|
| M1 | "2 jobs need you today" | Yes | Open and triaged service requests on the whole campus (ISS-0417, ISS-0421) | A campus count in a sentence addressed to the viewer | The headline is now the viewer's own items (`actions.yours`); the campus's open requests stay a tile, "Open service requests" |
| M2 | "6 rooms need action" | Yes | Rooms with an open High issue or a score in Action required | Correct, but undefined, and no room is in Action required (the six are there because of High issues) | Named "rooms at risk" (`rooms.at_risk`), stated as a part of the rooms needing attention |
| M3 | "21 decisions are waiting" | Yes | Every priority that is not a Resume: 18 Take action + 3 Review | 18 of the 21 are work to do, not decisions | Decisions are only Review items (an exception, a baseline, a funding approval): 3 on the campus; the viewer's count is shown |
| M4 | "33 items" and "Priority actions 33" | Yes | The items waiting for the viewed role (the Operations Lead: 33 of 34; funding is the executive's) | Correct and consistent, but a third headline beside M1 and M3 | This is now the headline; its parts by verb (to act on, to resume, to review) are shown and add up to it |
| M5 | Campus health 99 while 18 rooms need attention and 6 issues are critical | Yes | The mean of 135 scored rooms, most at 100 | A mean hides its range: the six rooms at risk score 77–84 or cannot be scored | The score is unchanged (no number is lowered for effect). The status beside it is never Healthy while a room is at risk; the at-risk count and the lowest room are shown with it |
| M6 | Every building 97–100 and green | Yes | The mean of each building's scored rooms | As M5 | Each area (floor, building, site, campus) takes the band of its mean, raised to Monitor while any of its rooms is at risk: Atlas, Meridian, Beacon, Horizon and Westmere now show amber with their count |
| M7 | Atlas 99 while Atlas 4.218 is 77 with a High issue | Yes | As M6 | As M5 | "1 at risk · lowest Atlas 4.218, 77" beside Atlas's 99 |
| M8 | "Healthy · 135 of 140 rooms scored" and "Healthy rooms 131 of 140" | Yes | 135 scored = 131 healthy + 4 monitor + 0 action; 5 not scored | Both correct; the relation was never shown | The Healthy rooms tile shows "4 monitor · 0 action required · 5 not scored", which adds up to 140 |
| M9 | The sentence names Atlas 4.218 (ISS-0417) first; the button opens ISS-0421 in Atlas 4.220 | Yes | The sentence read the attention queue; the button read the newest live request | Two independent selections | One selection: the first room in the attention queue and its most severe issue name the sentence and open the button |
| M10 | (found during the audit) Unscored rooms with an open High design deficiency listed after rooms with one Low issue | Yes | The queue sorted by score only, unscored last | Unknown treated as lowest priority | Rooms at risk first, scored or not |
| M11 | (found during the audit) "Rooms needing attention" opened the Action required list, which is empty | Yes | A link to `health=action` | Wrong drill-down | It opens the rooms list filtered to that population (new filter: needing attention, at risk); "Critical issues" opens the rooms at risk |

## 2. Canonical definitions

`apps/demo/src/campus/definitions.ts` holds one entry per number Mission Control shows: a stable id, its label (one label for one
number), meaning, what it counts, what it leaves out, its denominator, its evidence class, its freshness and its role visibility. The page
lists them under "How these numbers are counted". The computations stay in `campus/metrics.ts` and `campus/mission.ts`; the definitions
hold no logic.

| Id | Label | Population | Relation |
|---|---|---|---|
| `actions.yours` | Waiting for you | Items whose work is the viewed role's and that it can open | The headline; its verb parts add up to it |
| `actions.decisions` | Decisions to review | Your Review items | Part of `actions.yours` |
| `actions.all` | Actionable items on record | Every item that waits for a person | `actions.yours` is the role's part |
| `actions.overdue` | Overdue actions | Not computed | No record carries a due date; declared NOT_AVAILABLE rather than invented |
| `requests.open` | Open service requests | Live ServiceHands requests, campus-wide | Each is also an open issue of its room |
| `rooms.attention` | Rooms needing attention | At risk, any open issue, or below 88 | Of every room |
| `rooms.at_risk` | Rooms at risk | An open High issue or a score below 75, scored or not | Part of `rooms.attention` |
| `issues.open` | Open issues | Record issues not resolved plus live requests (one per id) | Of every issue |
| `issues.critical` | Critical issues | Open issues of severity High | Part of `issues.open`; each makes its room at risk |
| `health.average` | Campus health | Average of scored rooms; status never Healthy with a room at risk | An average, shown with the lowest room |
| `rooms.healthy` | Healthy rooms | Scored rooms at 88 or more | Healthy + monitor + action required + not scored = all rooms |

The health formula and the bands are the documented V2.5.3 rules (100, less 15 per open High issue, 8 per Medium, 4 per Low, up to 30
for failed tests and up to 20 for tests not yet run; 88 or more Healthy, 75–87 Monitor, below 75 Action required). They were not changed;
the at-risk rule was added beside them.

## 3. Where the same rules now apply

Mission Control (hero, tiles, campus status list, the 3D map's building colors), the campus, building and floor pages (score captions,
building pills, the side preview, the building list), the rooms list (new Attention filter), the executive start page (summary, tiles,
buildings ordered by rooms at risk), the investor welcome's score, and Lite's building colors (Lite's readiness stays a separate metric,
verified tests and open issues, and is not merged with health). Room-level health is unchanged.

## 4. Automated evidence

- `tests/unit/metric-integrity.test.mjs` (MI-01…08): the bands add up to every room; rooms at risk and needing attention are counted from
  the rooms and at risk is a part of attention; no area with a room at risk reads Healthy (campus, every building, every floor) while the
  average itself is not lowered; an unscored room is never Healthy and one with a High issue is at risk and queued first; closing the
  critical request lowers the counts everywhere; for every role the headline's parts add up and decisions are only Review items; the
  record the sentence names is the record the button opens; every home number has a complete definition and claims no evidence it lacks.
- `tests/browser/demo-core.test.mjs` MC-*-count and MC-*-first: on the rendered page, at desktop and phone width in both color schemes,
  the headline equals Priority actions and its parts add up; the button carries ISS-0417, the sentence names ISS-0417 and Atlas 4.218, and
  the page the button opens is ISS-0417's (checked on that page, not only on the home page).
- `tests/unit/demo-rolehome.test.mjs` RH-06: the executive's summary says "averages", names the rooms at risk and the lowest room.

## 5. Limits

The figures are synthetic and modeled. Overdue actions cannot be computed until records carry due dates. No export or report in the
demonstration computes campus or building health (checked: nothing under `apps/demo/src/export*` reads `campusStats`, `buildingStats` or
`roomHealth`); room-level exports carry the room's own figures, which this pass did not change.
