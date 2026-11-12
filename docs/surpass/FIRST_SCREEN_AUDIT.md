# 90-1 · The corporate site's first screen

Audited on 12 Nov 2026 on the built site. The audit asked what a buyer sees before scrolling, and where the detail starts. Detail can move one click or one scroll further down, but nothing is removed.

## Measured before the change (build of `835079b`)

| Page | 1440×900: words above the fold | Actions on the first screen | 390×844: words |
|---|---|---|---|
| Home | 85 | 2, but the buttons were cut off at the bottom edge | 53 |
| Products | 41 | none | 41 |
| Platform | 48 | none | 53 |
| Solutions | 46 | none | 48 |
| Pricing | 75 | 2 | 75 |

The home page already makes one promise: *Every room. Every device. Every decision. With its evidence.* Its first screen names one product (Living Campus) and no industries, AI or integrations, so the copy was not trimmed. Two things were wrong:

1. **Home, desktop:** the headline ran to five lines ("With its / evidence."), which pushed *Request a demonstration* and *Explore the live demo* below the fold at 1440×900 and 1366×768.
2. **Every page that tells the story** (products, platform, solutions, how it works, technology, trust, pilot partners, films) opened with a large headline and a lead but **no action**. The reader had to scroll to find anything to do.

## Changed

- **Home:** the display headline is set smaller and the top padding is reduced. The four-line promise and both actions now fit fully on the first screen at 1440×900, 1366×768 and 390×844. The lifecycle line peeks above the fold as the place where the detail starts.
- **Each story page** has exactly one primary action under its lead, chosen for that page:

  | Page | Action |
  |---|---|
  | Products, How it works, Films | the live demo |
  | Platform | *See the record in the live demo* |
  | Solutions | *Request a demonstration for your team* |
  | Technology, Trust | the Proof Center |
  | Pilot partners | *Check which pilot fits* |

  About already had *About the founder*, so no second action was added there.
- Form, legal and founder pages are unchanged.

Captures at 1440×900 are in `first-screen/`: `before_-1440.jpg` and `after_-1440.jpg` for home; `before_platform_-1440.jpg` and `after_platform_-1440.jpg`; `before_products_-1440.jpg` and `after_products_-1440.jpg`.

## Test

The test file is `tests/browser/website-fold.test.mjs`, registered in `scripts/test.mjs`. It checks 12 pages at three sizes, and each page must show:

- one h1, fully visible;
- one or two actions in the hero;
- the first action as the primary button, fully visible.

A further check confirms the home page still links products, how it works, proof and pricing below the fold.

| Build | Result |
|---|---|
| Old build | 11 pass, 26 fail. This confirms the test catches the problem. |
| New build | 37 of 37 pass, light and dark. |

The existing website suites also pass on the new build, light and dark: `website` 246 of 246, `website-pilot` 54 of 54.

## Related: 90-3

The platform list in the pilot check now labels each catalogue entry *(planned, not connected)*. The readiness reasons still use the plain name, read from `data-label`.
