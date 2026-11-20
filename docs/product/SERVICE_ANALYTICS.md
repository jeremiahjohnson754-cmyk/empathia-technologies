# ServiceHands analytics — `#/v25/service/analytics`

Founder, 14 Nov 2026: *"ServiceHands analytics that can be measured by project per quarter per monthly trend analysis … specific vendor
analytics so individual vendor(s) are always kept accountable."* With 13 Nov's *"advanced drill-down and drill-up in all analytics"*.

**Data.** `apps/demo/src/service/history.ts`: a SYNTHETIC service history: fifteen months (August 2025 to October 2026), seeded and
deterministic, ~300 jobs across the campus rooms, plus this browser's own ServiceHands requests. Each job names its room, building, layer,
severity, the SLA target it is held to, the vendor the support agreement (`parity/core.ts` AGREEMENTS) names for that building and layer
(no active agreement → the internal team, stated as a gap), the unit it was about (an asset ID from the room's installation record), the
project the room belongs to on the decision desk, and its times. Every vendor and organisation name is fictional. The history is
labelled synthetic on every chart, in the page's lede and in every export's provenance. It is not telemetry. Each vendor's performance
profile is a stated, fixed parameter of the generator, and is not measured. One vendor is set to slowly worsen so that the scorecard has an
accountability case to show.

**Measures** (`service/analytics.ts`, defined on the page and in every export):
- opened and closed in the period;
- the backlog at the period's end;
- response and restore within SLA (2/24/48 h and 8/48/120 h, with business days counted as 24 h);
- median time to restore;
- the first-time-fix and reopen rates.

Nothing to measure is shown as `—`, never as 0% or 100%. The vendor scorecard's targets are 90% response and 85% restore within SLA. It flags:
- a vendor below either target;
- a median time to restore that rose by more than 20% (the last three months against the three before);
- a reopen rate of 15% or more.

**Drill.** Each of these narrows the whole page, and the state is in the address:
- a vendor;
- a building;
- a project;
- a month or quarter, by clicking the chart.

The path drills back up: estate › building › project › vendor › period. The jobs behind the figures are listed, each with its room and asset ID.

**Export.** Six formats of exactly the drilled view (`export/serviceAnalytics.ts`). Each carries the trend, the scorecard with its flags, the views by building, by project and by layer, every job, and the definitions.

**Who.** Service managers, operations, executives, programme managers and the architect. Technicians, installers and employees are not
shown vendor performance, and the ServiceHands page links the analytics only for a role that may open it.

**Verified:**
- `tests/unit/service-analytics.test.mjs` (SA-01…04): the measures on hand-worked jobs, determinism, vendor attribution against the agreements, and the accountability flag;
- `tests/browser/demo-service-analytics.test.mjs` (SAB-01…06, phone, clean);
- `scripts/verify/export-formats.mjs`: the estate by month, and one vendor drilled in by quarter.
