# Device performance results

Measurements of the 3D worlds on real hardware. Started 25 Nov 2026 on the founder's direction (24 and 25 Nov 2026): representative
desktop and mobile benchmarks covering rendering, navigation response, memory and larger spatial environments, taken on actual
customer hardware before any further optimisation against a test machine.

**No customer device has been measured yet.** This file exists so that the first results have a place and a method.

## How a result is taken

1. On the device, open the demonstration's performance check: `#/play/performance` on the demonstration's address (also `#/performance`).
2. Close other heavy programs, plug in a laptop or phone if it is in a power-saving mode, and press **Run the check**. Keep the page
   in front for about a minute. If the page is hidden the check stops and says so; run it again.
3. Under **Keep this result**, choose **JSON dossier** (and **PDF** to read). Nothing is uploaded: the file is written in the browser.
4. Add the file's figures to the table below, with the date and what the device is. Keep the JSON beside this file under
   `docs/performance/results/` only if it names nothing private: the file holds the browser's description of the device (processor
   threads, rounded memory, screen, graphics, browser) and no name, address or identifier of a person.

Run it three times and record the middle result: one run is one moment.

## What the check measures

| | What | How |
|---|---|---|
| Rendering | Frames a second, the usual frame, the slow frame (1 in 20) and the slowest | The time between frames as the browser reports it |
| A larger environment | The largest synthetic district that holds 30 and 60 frames a second | One block of about 12,500 triangles drawn 1, 2, 4, 8, 16 and 32 times at full quality |
| The scenes as a visitor meets them | Campus Life, Stadium LIVE and Expo LIVE: pace, the detail each drew at, whether distant figures were simplified | Each opened at its own page's size and left to adapt as it does for a visitor |
| Navigation response | The time from opening a scene to its first frame | Includes downloading the scene if the browser does not already hold it |
| Memory | JavaScript memory, where the browser reports it | Chromium browsers only; it is not graphics memory, which no browser reports to a page |

The targets are the founder's (24 Nov 2026): 30 frames a second to be interactive, 60 to be smooth. A target is "held" when the pace
is at or above it and no more than one frame in twenty runs a quarter longer than the target allows, so an average that hides stutter
does not count.

## Results

| Date | Device (as described by whoever ran it) | Browser | Graphics (as reported) | Held 30 up to (triangles) | Held 60 up to (triangles) | Campus | Stadium | Expo | Notes |
|---|---|---|---|---|---|---|---|---|---|
| — | none yet | | | | | | | | |

## The test machine, for comparison only

Not a customer device and not a figure to quote for one: two processor threads, no graphics processor, Chromium drawing WebGL in
software (SwiftShader). In the check's short form it did not hold 30 frames a second at any size of the synthetic environment
(15 at 12,492 triangles, 7 at 49,968; larger sizes too slow to measure). A full run on it is not recorded here because it says
nothing about hardware a customer uses.
