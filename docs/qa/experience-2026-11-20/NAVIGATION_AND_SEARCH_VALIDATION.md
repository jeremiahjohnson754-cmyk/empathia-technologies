# Navigation and search validation (deliverable D)

Directive §3 (navigation, context between products) and §5 (Search Party). The demonstration has three search surfaces:

| Surface | Where | Component |
|---|---|---|
| The header's Search Party bar | every page (`/`, ⌘K or Ctrl K) | `apps/demo/src/shell/Shell.tsx` (`#find-in`) |
| Search Party | `#/search`, its tabs | `apps/demo/src/search/SearchParty.tsx` |
| The results page and the search bars on home pages | `#/find?q=…`, Mission Control, role homes | `apps/demo/src/search/SearchBar.tsx` |

All three search the same synthetic records in the page (nothing leaves the browser). People, issues and projects are shown only to a role
that may open their pages (`visible(role)` in SearchBar, the policy in the header bar), so a search never discloses more than the page would.

## The eighteen cases (§5)

| # | Case | Checked by | Notes |
|---|---|---|---|
| 1 | Empty search | SB-08, SB-20, SP-01 | the empty bar opens on questions the records answer; the empty results page explains what to type |
| 2 | Exact match | SB-02, S-07 | “4.218” leads with the reference room |
| 3 | Partial match | SC-03 (new) | “boardr” offers boardrooms |
| 4 | Multiword | SC-04 (new), SB-13 | “atlas boardroom” narrows on both words; a sentence is read as conditions |
| 5 | Minor misspellings | SB-13, S-22 | corrected and said (“Showing results for boardroom”) |
| 6 | Mixed case | SC-06 (new) | “BoArDrOoM” gives what “boardroom” gives |
| 7 | Room name | S-07, SB-02 | a room named outright leads the results |
| 8 | Room or device ID | SB-02, S-08 | 4.218; a physical unit opens its room with the position selected |
| 9 | Building or campus | SC-09 (new) | “Atlas” offers Atlas HQ |
| 10 | Manufacturer and model | — | **not available, by design**: the synthetic catalogue names no makers (no real brands); S-03 checks that no make, model or serial is invented. Search by category, position or asset ID instead |
| 11 | Issue, work order, project | SC-11 (new), SP-03 | ISS-0417, WO-0088; issues by their words |
| 12 | Person, department, vendor, owner | SP-04, SP-07 | people by title, only for roles that may open them; **vendors are not in the index** (register D-10) |
| 13 | With filters | SP-05, JR-*-01, JR-*-08 | facets with counts; Search Party's type filter kept in the address |
| 14 | Zero results | SB-07, S-09, SB-15 | said in words, with the way on (never a dead end) |
| 15 | Many results | SB-17, S-02 | twelve, then all; “N more in Search Party” |
| 16 | Clear and reset | S-10, SC-*-16 (new), JR-*-07 (new) | a visible clear control in all three bars (the browser's own one is not drawn by every browser); Escape clears, then leaves |
| 17 | Keyboard | SB-03, S-05, SB-05 | arrows move, Enter opens, Escape closes; ARIA 1.2 combobox; results announced politely |
| 18 | Selected on mobile | SC-phone-18 (new), S-14/15 | a tap on a result opens it; the results fit the window and scroll inside |

“(new)” are checks added on 20 Nov in `tests/browser/demo-search-journey.test.mjs`; the others were already in demo-searchbar,
demo-search-parity and demo-searchparty-bar and still run in the regression.

## Context between products (§3)

The directive's example, pressed through the real pages at 390 × 844 and 1440 × 900 (`demo-search-journey`, JR-*):

1. Search Party: “4.218”, filtered to Rooms, the room chosen → the address now carries `?q=4.218&type=Room&focus=Room:R-ATL-4-218` (JR-01).
2. Open the room → its Devices tab → Lite → Commissioning, each for the same room (JR-02).
3. On Commissioning the trail offers the last place of work (“Back to …”) and, beside it, **“Your search: …”** (JR-03).
4. Browser Back returns to the search exactly as it was: words, filter, room chosen and shown (JR-04); a refresh keeps it (JR-05);
   “Your search” from another page returns to it (JR-06).
5. The results page keeps its facet after a result is opened and Back is pressed (JR-08).

Before 20 Nov, Search Party held its words, filter and choice only in the page's memory: leaving it and coming back (Back, the trail, a
refresh) showed an empty search. The room → Search Party → ServiceHands → room journey of 18 Nov (demo-return-trail, RT-*) is unchanged:
the main chip still leads to the last place of work, and the search is a second, quieter link, so RT-03 holds.

## Deep links, breadcrumbs, keyboard

- Deep links: every route opens by its address (demo-route-sweep, 143 routes at two widths); Search Party, the results page and the map
  keep their state in the address (`?q`, `?type`, `?focus`, `?sel`, `?facet`; the map's level and room are in its route).
- Breadcrumbs: the map's own trail (campus → building → floor → room) and the page crumbs; checked by demo-map and the room suites.
- Keyboard: the map (arrows move, Q/E turn, +/− zoom), Expo LIVE and Stadium LIVE (arrows turn and tilt, +/− zoom, Shift+arrows move
  along the hall: GS-xpo-11, GS-slv-07), the search comboboxes (above).

Results of the run: END_TO_END_TEST_RESULTS.md.
