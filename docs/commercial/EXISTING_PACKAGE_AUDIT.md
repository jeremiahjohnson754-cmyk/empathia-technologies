# Existing package audit and pricing discrepancy register

Task #238, step 1 of the founder's 60/10 Master Commercial Pricing Architecture (18 Nov 2026, 19:39). This is the source audit the
directive asks for first: what is priced today, where each price comes from, and where it conflicts with the 19:39 baseline. **No
rate was changed silently.** The founder decided the main conflicts at 20:51 the same evening: "Let's use the updated pricing all
the way there maybe the $19.99 price can be a pilot package price for just pro and another complimentary product item but the
updated pricing is king here". The decisions are recorded in §3; the v2 rates live in `packages/commercial/src/pricebook.ts`.

Only public price fields appear here. The internal columns of the founder's price files (the basis of each price, its review state),
the internal financial models and every hardware unit cost stay in the private handoff and are never copied into this repository.

## 1. Where prices live today

| Source | What it holds | Status in its own words | Published? |
|---|---|---|---|
| `packages/commercial/src/generated/catalog.ts`, generated from the founder's four v1.5 CSVs (handoff v1.7, kept outside the repository; SHA-256 of each in `PRICE_SOURCE`) | 34 SKUs, 7 bundles (5–8 % off eligible monthly lines), 4 fixed-price pilots, SIGNAL terms | Every CSV row is marked "proposed, not published"; the founder directed on 9 Nov 2026 that the list appear on the corporate site | Yes: `/pricing`, `/pricing/catalogue`, `/pilots` (every figure printed from the catalogue by `usd()`) |
| The founder's 19:39 baseline (18 Nov 2026) | User seat, two room rates, three small-estate platform fees, an enterprise platform fee, FieldLink proposed prices | "Proposed prices, not yet independently validated market rates or binding customer offers" | FieldLink prices only (`/fieldlink`, labelled proposed and illustrative) |
| Demonstration (`apps/demo`) | No prices | — | No |
| Investor and founder models (`Empathia_Financial_Model.xlsx`, `Empathia_Profitability_Model.xlsx`, private) | Planning assumptions that disagree with each other (the private reconciliation note says so) | Planning assumptions | No; never copied here |

## 2. What is priced today (v1.5, as published)

**Platform and seats.** Core Starter $149.99 a tenant a month; Core Enterprise $1,099.99 a tenant a month; Enterprise named user $9.99
a month.

**Per room, per month.** Pro room $19.99; Commissioning $12.99; Assurance $9.99; Field Intelligence reachability $23.99; ServiceHands
$7.99. Field Intelligence advanced validation is $39.99 per validated space.

**Other units.** Lite $349.99 a building; Search Party $0.45 a managed asset (minimum $49.99, not additive); Space Optimizer $14.99 an
analysed space; Experiences $249.99 a venue, $39.99 an active event; Learn $21.99 a named learner; Managed connector adapter $24.99 a
connected platform.

**Per tenant, per month.** Harmony $129.99; Instant Connect $89.99; Engineering Vault $99.99; Device Evaluation $79.99; Scouter $199.99;
Procurement $179.99; Green Lifecycle $99.99; APEX $179.99; Power BI connector $49.99; Engineering Standards $89.99; Drawing
Intelligence $149.99; Control Studio $149.99; Premium Support $249.99.

**SIGNAL.** Free demo; $1.99 14-day trial; Individual $24.99 a month (or $69.99 / 3, $129.99 / 6, $239.99 / 12 months); Teams $44.99
a seat a month (or $129.99 / 3, $249.99 / 6, $479.99 / 12 months).

**Bundles** (a percentage off eligible monthly lines; never off tax, fees, services or pilots): Workplace Essentials 5 %, Service
Intelligence 6 %, Engineering Lifecycle 7 %, Spatial Experiences 5 %, Unified Estate 8 %, Convention Event Operations 6 %, Campus
Learning & Experience 6 %.

**Pilots** (one time, fixed scope): Self-Serve Discovery $49.99 / 14 days; Read-Only Live Connector $199.99 / 30 days (≤ 5 rooms);
Controlled Hardware Validation $499.99 / 30 days (≤ 10 rooms); Multi-Site Evaluation $1,499.99 / 45 days (≤ 3 sites, ≤ 25 rooms).

**Not priced anywhere:** implementation and professional services (the site says "separately scoped"), MSP and integrator terms,
education, houses of worship and non-profit terms, volume discounts beyond bundles, contract terms longer than a month (except SIGNAL).

## 3. Discrepancy register

| # | Item | Published today (v1.5) | 19:39 baseline | Conflict | Proposed resolution (founder decides) |
|---|---|---|---|---|---|
| D-01 | Room licence | Pro room $19.99 / room / month, one rate | Standard room (0–19 devices) $39.99; large room (20 or more) $74.99 | Rate doubles or more; a second tier appears; the v1.5 rate has no device threshold | Founder picks: (a) adopt the 19:39 room tiers as the platform room licence and retire PRO-ROOM with a migration note, or (b) keep PRO-ROOM for Pro alone and add the tiers as a new "Empathia room" licence. Nothing changes on the site until chosen. |
| D-02 | Platform fee | Core Starter $149.99 / month ($1,799.88 a year); Core Enterprise $1,099.99 / month ($13,199.88 a year) | Below 25 rooms: $2,499 / $3,499 / $4,999 a year by room band; 25 rooms and up: from $15,000 a year | Different unit (tenant-month vs a year by room band) and different amounts at every size | Replace the two Core lines with the banded annual fee, or keep Core as the fee's monthly form. Needs a decision before the calculator can be built on one price book. |
| D-03 | Named user | $9.99 / named user / month | $9.99 / user / month | None in the amount; "licensed user" vs "named staff user" wording | Keep $9.99; settle one definition (named, active staff; public guests never charged), as the site already says. |
| D-04 | The 25-room step | No step (Core is flat) | $4,999 at 24 rooms to $15,000 at 25 | +$10,001 a year for one room | The directive asks for options with their impact, not a silent change; the founder's $15,000 is not replaced. Options to be modelled in step 3. |
| D-05 | Room classification | No device count | 0–19 vs 20+ devices | Which devices count (spare, retired, virtual, unlicensed)? | Proposed: count devices installed and in service in the room's current baseline; spares, retired and virtual endpoints do not count. Needs approval. |
| D-06 | Field Intelligence advanced validation | $39.99 per validated space | Not mentioned | Same figure as the new standard room rate, different meaning | Keep as is; label the unit plainly so the two $39.99 lines are never confused. |
| D-07 | Bundles | 7 bundles, 5–8 % off eligible lines | Asks for packages by customer path (small estate, mid-market, enterprise, MSP, integrator, education, worship and non-profit, venues) | Bundles are product groups, not customer paths; no small-estate or MSP offer | Keep the bundles as discount rules; build the customer-path packages on top of them in step 2, each marked Pricing Pending Approval or Custom Quote where no approved price exists. |
| D-08 | Implementation | "Separately scoped" | One-time, scope-based quote | None | Show ranges or Request a quote; never a fixed price the founder has not set. |
| D-09 | FieldLink | Not in v1.5 | Nano $249, Edge $1,499, Pulse $499, proposed | None on the site (already labelled proposed and illustrative) | Add to the price book as optional hardware, status "proposed concept"; unit costs stay private. |
| D-10 | Pilots | Four fixed prices | Asks for a pilot catalogue (nine categories) with conversion terms | Five of the nine categories have no price | The four keep their prices; the others are Pricing Pending Approval until set. |

### Decisions (founder, 18 Nov 2026 20:51)

| # | Decision | Where it lives |
|---|---|---|
| D-01 | **Decided.** The 19:39 room tiers replace the v1.5 Pro room everywhere: standard $39.99, large $74.99 a room a month. The v1.5 $19.99 becomes the proposed price of a pilot: Pro plus one more product, included. | `PRICE_BOOK.rooms`; `PRICE_BOOK.superseded`; `PRICE_BOOK.pilots[PILOT-PRO-PLUS]` (price founder-suggested; terms drafted, pending approval) |
| D-02 | **Decided.** The banded annual platform fee replaces Core Starter and Core Enterprise. | `PRICE_BOOK.platform` |
| D-03 | Follows D-01/D-02: one licensed-user line at $9.99; the v1.5 named-user SKU is replaced so nobody is charged twice. | `PRICE_BOOK.user`; `superseded` |
| D-04 | **Kept as directed.** $15,000 from 25 rooms, shown as a starting figure, with the step named on every estimate between 20 and 30 rooms. Transition options are modelled for review only. | `estimate()` notes |
| D-05 | Not answered: the proposed device rule is used and marked pending approval. | `PRICE_BOOK.roomRule` |
| D-06…D-10 | Unchanged: as proposed above; anything without an approved price is Pricing Pending Approval or Custom Quote. | — |

## 4. Next steps (each its own commit)

1. Done: price book 2 and the estimate engine (`packages/commercial/src/{pricebook,estimate}.ts`), tested to the cent against the
   founder's own illustration ($52,185.00 at 50 rooms; $215,038.80 and $219,781.80 at 310 rooms with seven FieldLink devices) and at
   1, 9, 10, 19, 20, 24, 25, 26, 50, 150, 500 and 501 rooms, recomputed independently.
2. Build Your Empathia on `/pricing`, with "See this package in action" opening the matching demonstration view, and the price list
   pages moved to price book 2.
3. Still for the founder: the Pro pilot's terms (room cap, length, which products may be the included one), the device rule (D-05),
   whether bundle discounts carry over to v2, the 25-room transition policy.
