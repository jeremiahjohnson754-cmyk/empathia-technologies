# Empathia Living Campus V2.5.3 — Initial Source Inspection Findings
**31 October 2026 — inspection of the two uploaded HTML files, not a runtime acceptance test.**

## Confirmed from the files

- `Empathia-Living-Campus-V2.5.3-live.html`: 6,957,144 characters; 2 inline `<script>` elements, including a 6,541,086-character main script.
- `Empathia-Living-Campus-V2.5.3-offline.html`: 6,957,159 characters; 2 inline `<script>` elements, including a 6,541,096-character main script.
- Both are labelled *V2.5.3* and explicitly identify the experience as synthetic/demo. This supports the need to preserve evidence labels and separate public demo from authenticated enterprise operations.
- Original code contains named features around Mission Control, Lite, Scouter, Search Party, Commissioning, ServiceHands, Field Intelligence, Learn/SIGNAL, room-building, analytics and graph views. Keyword presence **does not establish complete or tested operation**.
- `SIGNAL_SEASONS` lists twelve seasons. The literal `SIGNAL_EPISODES` array contains three playable IDs: **S1E1, S1E2 and S1E6**. The broader SIGNAL standalone HTML separately preserved in the user's materials describes **133 story chapters and 1,583 panels**. These should be reconciled, not assumed synonymous.
- The primary script includes a `VO_LINES` narration catalog (172 indexed entries detected by source pattern), `VO_DUR` duration map, `CINE_FILMS` cinematic definitions, `voPlay`, and media resolving through `mediaUrl` and `mediaHas`.
- The HTML documents contain no `<audio>` or `<video>` playback nodes in their initial DOM and do not embed media data payload elements. They do contain JavaScript templates that construct video players at runtime. The audio player relies on media IDs or external media manifest paths. **A functioning video/voice catalog was not demonstrated by these two HTML files alone**; the original external media libraries must be located or produced and tested.
- Embedded source includes simulated device data, fake/example URLs and product status labels. These must not be converted into unqualified operational/commercial claims.

## Must verify against the private repository

1. Original, full Founder Studio assets and product staging implementation.
2. Entire historical SIGNAL authored content vs the small playable V2.5.3 episode selection.
3. All playable videos and narrations and their licensed source masters.
4. Role-aware user journeys, every product route, export, service and evidence workflow.
5. Backend authentication, RLS, authority guards and persistence. **A synthetic public demo is not evidence of production readiness.**
6. The exact current GitHub commit and deployed Render build IDs, as opposed to the uploaded historical HTML build's identifiers.
7. Accessible, responsive live browser behavior with real mobile screenshots and automated tests.

## Recommendation

Freeze a safe branch, build a route/feature/media parity ledger, restore verified behavior first, then execute the Figma/Adobe cinematic redesign without losing domain logic or test coverage. The 35/10 master build brief contains the full work program.
