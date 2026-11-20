# Competitor price references for Build Your Empathia

Task #238, step 5. The founder asked on 18 Nov 2026 at 19:39 to "compare equivalent offerings". The 60/10 pricing directive adds
the rule: competitor comparisons use only sourced public prices with their retrieval dates. Anything else says "Not independently
verified".

None of these offerings does what Empathia does as a whole. Each covers **one part of the job**: room licensing and management for
one vendor's devices, or support and replacement cover. A comparison must say which part it covers and what it leaves out. It must
never say or imply that the offering is equivalent, that Empathia integrates with it, or that it is a partner.

| Offering | Published price | Covers | Does not cover (against Empathia) | Source, retrieved |
|---|---|---|---|---|
| Microsoft Teams Rooms Pro | **$40.00 a room a month, paid yearly** (annual subscription, auto-renews) | Teams Rooms licensing and management for certified Teams devices: access control, remote configuration, device analytics, ITSM integration | Rooms on other platforms; design, commissioning evidence, baselines, service history, the estate's relationships | [Microsoft, "Compare Teams Rooms plans"](https://www.microsoft.com/en-us/microsoft-teams/microsoft-teams-rooms/compare-rooms-plans), 19 Nov 2026 |
| Microsoft Teams Rooms Basic | **Free**, up to 25 rooms, on a certified Teams device | Enrolment, inventory and automatic software updates | Everything Pro adds; everything above | Same page, 19 Nov 2026 |
| Microsoft Teams Rooms Pro (Ireland) | €34.70 a room a month, paid yearly, before VAT | As Pro | As Pro | [Microsoft Ireland, Teams Rooms Pro](https://www.microsoft.com/en-ie/microsoft-teams/teamsroomspro?rtc=1), 19 Nov 2026 |
| Logitech Select for Rooms | **$399 a room a year**; $249 where a Rally Bar Huddle, MeetUp or MeetUp 2 is the main camera | Logitech device management, 24/7 Tier II support with a one-hour response, cover for up to five years, next-business-day replacement where possible, onsite spares | Other makers' devices; everything Empathia records about the room beyond its Logitech devices | [Logitech Select service plan](https://www.logitech.com/products/video-conferencing/room-solutions/select-premium-service-plan.html), 19 Nov 2026 |
| Q-SYS Reflect Enterprise Manager | **Not publicly listed.** Priced per system and per monitored peripheral, by tier (Basic, Standard, Professional) | Monitoring of Q-SYS systems and their peripherals | Non-Q-SYS estates; the rest of the lifecycle | [Q-SYS support FAQ](https://support.qsys.com/faq-%7C-how-does-the-enterprise-manager-subscription-pricing-work) (marked archived), 19 Nov 2026. Not independently verified. |

## How the builder will use this (next release)

A "What else you might pay for parts of this job" panel beside the receipt shows, for the same estate:

- Teams Rooms Pro: rooms × $40 × 12, for Teams rooms only.
- Logitech Select: rooms × $399, for Logitech rooms only.

Each line carries its coverage note and its source, linked with its retrieval date. The panel shows no "savings" figure, because
the scopes differ. Offerings with no public price say "Not publicly listed". Before each release the prices are fetched again. A
price that cannot be re-fetched is dropped, not kept.
