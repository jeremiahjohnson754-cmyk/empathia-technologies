# Empathia Experience System v1

Version 1, 2026-10-31. One brand across the corporate website, the investor demonstration and the enterprise application.
- **Values:** `docs/design-system/experience-tokens.json`, the single source of truth.
- **Figma:** the same values as Figma variables. The file is listed under "Figma" below.
- **Code:** `apps/website/src/styles/site.css` (custom properties) and `apps/website/src/ui.tsx` (components).

## Point of view

Empathia's subject is **evidence**: what is declared, modeled, observed or verified, and who said so. The visual system makes that
distinction physical rather than decorative.

- **The evidence line.** The signature element is the lifecycle drawn as one continuous rule: Request → Design → Authorize → Commission
  → Verify → Baseline → Operate → Learn. Each stop carries the kind of evidence it adds. The line draws once on the home page, then
  holds still.
- **Evidence tags.** Six states, each a colour paired with a word, never colour alone: Verified (green), Observed (signal), Declared
  (silver), Modeled (violet), Simulated (amber), Unknown (grey, dashed). Every value in the product carries one.
- **Records as hero imagery.** Instead of stock photography, the home page shows a room record, with "synthetic" written on it, until
  a film is cleared for the site.
- **Restraint.** One accent, one entrance animation and no decorative glow on text. Contrast beats atmosphere.

## Foundations

| Role | Token | Value | Use |
|---|---|---|---|
| Ground | obsidian | `#090C11` | page background |
| Surface | graphite / graphite-2 | `#11161D` / `#171D26` | cards, deep sections / hover, record cards |
| Warm surface | graphite-warm | `#1D1B19` | the founder section only (human, not system) |
| Lines | line / line-strong | `#26303C` / `#3A4656` | dividers / control and card borders |
| Text | text / text-2 / text-3 | `#F6F2EC` / `#C3BCB2` / `#A29B92` (warm whites and greys) | headings and body / secondary / meta |
| Intelligence accent | signal | `#2ED6C5` (ink on it: `#04211E`) | primary action, links, focus, "observed" |
| Depth | ultramarine | `#4C63FF` | hero light, later stops of the evidence line |
| Attention | amber | `#F3B54A` | "simulated", notes, synthetic-data labels, preview banner |
| Learn | violet | `#A487FF` | "modeled", Learn and SIGNAL only |
| States | ok / danger | `#4CC38A` / `#FF6F6A` | "verified" / errors |

Contrast, measured by the audit's A5 rule: no text pair on the site falls below 4.5:1, or 3:1 for large text. Text-3 was raised from `#7D8896` to `#8A95A3`
(token file updated) so that small meta text clears 4.5:1 on graphite surfaces as well.

**Type: inviting, not severe** (owner direction, 2026-10-31 16:34 CT: "inviting and warm — Netflix, Adobe, Pixel style").
- **Family:** Poppins 400/500/700, a warm geometric sans with round bowls and open shapes, in the same family of feeling as Netflix
  Sans and Google's Pixel type. It is self-hosted from `apps/website/fonts/` under the SIL OFL 1.1, as Latin subsets of about 10 KB each
  with the bold and regular weights preloaded, so no font is requested from a third party.
- **Why not those brands' own fonts:** Netflix Sans and Adobe Clean are proprietary. Google Sans Flex is open, but its files could not
  be fetched into this workspace; it can replace Poppins in one line once the WOFF files are added.
- **Mono:** ui-monospace, used only for record identifiers.

| Style | Size | Line height | Tracking |
|---|---|---|---|
| Display | clamp 38–72 px, Bold | 1.06 | −0.025em; the last line Medium in text-2 |
| H1 | clamp 36–58 px, Bold | 1.1 | −0.02em |
| H2 | clamp 27–38 px, Bold | 1.18 | −0.015em |
| Card titles | 20 px, Bold | — | — |
| Lead | 17–20 px, Regular | 1.65 | — |
| Body | 17 px, Regular (16 px on phones) | 1.7 | — |
| UI (buttons, nav, labels, tags) | — , Medium | — | no positive tracking |

**Space and shape.**
- Spacing steps: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 px.
- Radii: controls are pills (999), fields 14, cards 22, media 26. Rounder shapes keep the friendlier type company.
- Page width: 1200; text measure about 680 (about 64 characters).

**Motion.**
- 140 / 220 / 350 ms with `cubic-bezier(.2,.7,.2,1)`.
- One orchestrated entrance: the evidence line draws and its stops rise, about 1.2 s in total.
- Under `prefers-reduced-motion: reduce`, nothing animates.

**Touch targets.**
- Minimum 44 px for every control on phones: buttons 48, navigation 52, footer links 32 (inline exception).
- 24 px minimum everywhere (WCAG 2.5.8).

## Components (code ↔ Figma)

| Component | Code | Variants and states |
|---|---|---|
| Button | `.btn`, `.btn--primary`, `.btn--quiet` | default, hover, focus (2 px signal ring), disabled |
| Evidence tag | `Tag` / `.tag--{state}` | verified, observed, declared, modeled, simulated, unknown |
| Card | `Cards` / `.card`, `.card--link` | static; link (the whole card is the target; focus ring on the title link) |
| Evidence line | `EvidenceLine` / `.eline` | horizontal at 8 columns, 4 columns at 960 px or less, vertical at 640 px or less |
| Record card | `RecordCard` / `.record` | — |
| Film player | `FilmPlayer` / `.film` | captions track, transcript disclosure, disclosure line; built in only when cleared |
| Founder | `Portrait`, `Credentials`, `.quote` | large (founder page), small (home) |
| Lead form | `LeadForm` / `.leadform` | not configured (disabled), sending, sent (reference), refused (reason), offline |
| Navigation | `Shell` / `.top`, `.nav`, `.menu` | desktop bar; phone menu (aria-expanded, Escape closes, click outside closes) |

## Figma

**File:** [Empathia — Experience System v1](https://www.figma.com/design/n6IyoAdwNpD5DnWbKeptIa) (key `n6IyoAdwNpD5DnWbKeptIa`), in "Jeremiah
Johnson's team". It was built on 2026-10-31 with the connected Figma tools.

| Page | Contents |
|---|---|
| Foundations | 44 variables in the "Empathia" collection (Dark mode): 16 colours, 6 evidence states aliased to colours, 10 spacing steps, 4 radii, 8 type sizes. 10 text styles; 2 effects (media elevation, focus ring); a specimen board. |
| Components | Button (3 × 5 = 15 variants, ≥ 44 px), Evidence tag (6), Form field (4), Consent checkbox (6), Form status (4), Film card (Ready / Pending rights clearance), Top navigation (desktop, mobile, mobile open), Founder card (wide, stacked), Product card. Supporting components: ledger row, credential chip, door card, lifecycle step. Auto layout throughout; fills, strokes, radii and spacing bound to variables. |
| Website — Home | Desktop 1440 and mobile 390 frames |
| Website — Founder | Desktop 1440 and mobile 390 frames |
| Accessibility notes | Focus order, 44 px targets, contrast pairs with ratios, reduced motion, captions |

**Known differences between Figma and the shipped code** (code is the reference for layout until reconciled):
- **Font.** Figma now uses Poppins, like the code: 10 text styles and 445 text nodes were moved off Inter. The mono label style is
  Roboto Mono in Figma and ui-monospace in code. The Figma file also has `radius/field` (14) and `radius/checkbox` (10), so the
  pill radius does not turn checkboxes and status messages into stadiums.
- **Portrait.** The Founder card shows a labelled placeholder. The upload to Figma was refused by this workspace's network policy. To
  finish it, drag `apps/website/media/founder/1200.jpg` onto the "Portrait" layer of both Founder card variants and switch off
  "Placeholder note".
- **Home frames.** These are a first composition: the film panel sits below the hero, and the navigation has fewer items. The code
  puts the record card or film beside the headline and adds Products and Founder to the navigation.
- **Form status reference.** Figma shows "LEAD-XXXXXX"; the code shows the first 8 characters of the receipt id.
- **Colours.** Figma matches the code's warm text colours: text `#F6F2EC` (17.6:1 on obsidian), text-2 `#C3BCB2` (10.4:1), text-3
  `#A29B92` (7.1:1).
- **Code Connect and visual-regression baselines.** Neither is set up yet.

Screenshots of the Figma pages are in the handoff (`figma/`).
