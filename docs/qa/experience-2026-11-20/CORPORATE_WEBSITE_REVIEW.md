# The corporate website, read by four people (directive §11)

Founder, 20 Nov 2026 10:01: "Let's continue working to finishing up both websites." The website (apps/website, 32 built pages; staging
https://empathia-website-next.onrender.com) was read from its built pages and its source, page by page, as each of the directive's four
readers would arrive. What each one needs, where the site answers it, and what was changed.

| Reader | Needs to learn | Where the site answers | Next step offered | Gap found | Change |
|---|---|---|---|---|---|
| Enterprise buyer | what it is, for whom, what it costs, how to start small | home hero and lifecycle; "Who it is for" (four teams, each to /solutions); /pricing (list prices, labelled proposed); /pilots | Request a demo (header, every page); Build your Empathia; pilot packages | "Who it is for" was the home page's tenth section; /solutions and /experiences were linked only from the home page's cards | "Who it is for" moved to third; Solutions and Experiences in a new Explore column of the footer, on every page |
| Strategic partner | how a partnership or a pilot works, what it grants | /pilot-partners, /pilots ("What a purchase grants, and what it does not") | "Discuss a partnership" (enquiry form) | none material | — |
| Investor | the company, the founder, the product's real maturity, how to talk | home founder block; /founder; /proof (real, synthetic, specified); /about#investors; "Open the demo" leads to the investor experience | "Start an investor conversation" (enquiry form) | the investor entry lived only on /about and /contact; /about said its title and sentence twice | "Investor conversations" in the footer on every page; /about's section says it once |
| Technical evaluator | architecture, security, what is proven | /technology (canonical model, database authorization, append-only evidence, typed contracts, golden tests), /trust (in place, planned, not claimed), /proof | Open the demo; the Proof Center | none material | — |

## What was checked and holds

- Every page states its demonstration status: synthetic data, fictional venues and people, "Partly in the public demonstration" per
  product, "Proposed list prices … not a quote", FieldLink "a concept … No unit has been built", Collabora-SING "pilot not run yet".
- The links into the demonstration are intentional and land where they say (A9 of the site audit resolves every internal link; the
  staging website's demo links point at the staging demonstration, `empathia-demo-next`, checked live).
- The eight-width audit (SITE_AUDIT_8_WIDTHS.json): no P0 or P1 on any of the 32 pages at any width. Its 156 P2s on the website are
  the audit measuring an anchor's own box. Checked in the browser on /, /platform and /how-it-works at 390 and 1440 px: every link
  under 24 px tall is either a card, tile or strip title whose link is stretched over the whole item (`a::after`, `inset: 0`; the item
  is the press target), or a link inside a sentence (WCAG 2.5.8's inline exception). The other three are radio buttons and a checkbox
  inside their labels (/pilots, /pricing), where the whole label is the target.
- The founder's photograph, credentials (CTS, CAPM, CompTIA Network+) and words are unchanged.

## Checked after the change

- website 269/269, website-fold 37/37, website-follow 19/19, website-opening 19/19 on the changed build.
- The home page's sections now read: the lifecycle, the nine products, who it is for, the worlds, the workflow, the campus, …
- The footer at 1440 px: Products, Explore, Company (with Investor conversations), Policies.

## Not changed, and why

- The home page is long (fourteen sections). Each section is its own claim with its own evidence; shortening it is an editorial choice
  for the founder, not a defect. The order now puts who it is for before the worlds and the campus.
- No testimonials, customers or measurements were added: there are none to show.
