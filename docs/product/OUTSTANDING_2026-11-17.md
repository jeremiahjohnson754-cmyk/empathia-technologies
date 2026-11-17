# State and outstanding work (17 Nov 2026)

This replaces `OUTSTANDING_2026-11-16.md` as the current list. Everything named here is committed on `v18/continuation`.

## What the public sites serve

- **Staging** (`empathia-demo-next`, `empathia-website-next`, branch `phase3/legendary-experience`): **`bfdda7b`**, staged on 14 Nov.
- **Production** (`main`): unchanged. It waits for the founder's word.
- **Not on either yet:** the six-stage thread page, the SIGNAL title page, Engineer start, the phone-width fixes, and everything
  below. A commit is staged only after a full regression passes on that exact commit.

## Regression history since `bfdda7b`

| Commit | Result |
|---|---|
| `1cde8b5` | Failed `demo-field-ux`: a 23 px link on the deficiency workbench. Fixed in `d77e55e`. Not staged |
| `d77e55e` | Failed a unit test: the API client's operation count was left at 168 when the thread route was added. Fixed in `52fce09`. Not staged |
| `52fce09` | Failed `demo-deadends`: on Engineer start, a persona who may not inject a fault was offered five switches that only repeated a refusal. Fixed in `4914a32`. Not staged |
| `4914a32` | Failed `demo-offline` OF-08 (43 passed, 1 failed; 78 other light suites passed): the SIGNAL title page asked for its 1.8 MB sprite sheet on every visit, so opening the story library offline logged a failed request. Fixed in the next commit. Not staged |
| the head | Running: one regression for everything, the connected page's suite included |

The head contains everything below. The connected page does not exist in a public build (no server address), so staging the head
changes nothing a visitor can reach there beyond the fixes and the pages already listed.

## Built on 17 Nov

1. **Demonstration sandboxes and sessions on the server** (ADR-0013, `0033`, `0035`): a synthetic tenant per visitor, a key shown once,
   sessions per role, reset without deleting, caps and storage ceilings, a demonstration-only deployment mode.
   `tests/security/demo-sandbox.test.mjs` DS-01…16.
2. **Phase 1 field records in the database** (`0034`): mounting versions, hookups against the design, field moves decided by someone
   other than their recorder, notes; in the room's thread with their audit history. `tests/security/field-record.test.mjs` FRS-01…09.
3. **The demo connected to the server** (`#/connected`, only in a build given `DEMO_API_URL`): nineteen steps from the field record to
   an APEX case, each as its own person; a step tried as someone else shows the server's refusal; the thread and the audit history
   are read from the server; a resume code opens the same sandbox in another browser. `tests/browser/demo-connected.test.mjs`
   CN-01…10, light and dark. See `CONNECTED_DEMO.md`.
4. **Refusals on the record they were aimed at**: a request refused by the central authority check is now a row of that room's,
   issue's or work order's audit history.
5. **Engineer start**: no switches for a persona who cannot use them.

## Decisions that are the founder's

- **Hosting the demonstration API and its database.** Without it the connected page cannot be on a public site. What it takes, and
  the platform's listed prices on 17 Nov, are in `CONNECTED_DEMO.md`. Nothing has been created.
- **Production.** Unchanged since before the pause.

## Outstanding

- Finish the regression of the head; if it passes, stage that commit and verify both `-next` deploys.
- **#167, the rest:** the demo's other pages (Build a Room, the field record page, ServiceHands, Assurance, APEX) still use the
  browser's records. Only `#/connected` reads and writes the server.
- **#163** SIGNAL feel: the display face (needs the font file), reading toolbar, chapter progress, panel wash and bubbles, contents.
- **#164** corporate website on phones; **#165** the four worlds; **#166** ServiceHands ITIL depth, traceability matrix, analytics,
  AI controls. Each starts by testing the audit's claim before changing anything.
- Earlier: APEX by asset id; the Pro restyle; the zipped evidence package; imports from other products (#144); the university
  flagship (#142); SIGNAL/Learn (#146); Figma × Lite parity (#147); the Phase A state document (#141); the films (need the
  founder's files again); refresh-plan and field-record exports in the format verification; field moves in Lite's 3D view.
