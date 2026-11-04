# Enquiries through the hosted Tally form

Rebuilt 2026-11-03 from the recovered record of the work approved on 31 October (`docs/recovery/turns-480-579/`). The live Tally form is
**not modified** from here (standing rule: "Don't modify Tally forms"); no test entry has been submitted.

| Item | Value |
|---|---|
| Owner's approval | 2026-10-31 20:18 CT: use the hosted form, opened externally, not embedded |
| Form | "Connect with Empathia Technologies", `https://tally.so/r/VpG0Vy` (form id `VpG0Vy`) |
| Attribution | Owner's choice 2026-10-31 21:51 CT: a hidden `source` field; "Area of Interest" unchanged |
| Configured in | `apps/website/src/enquiry.ts` (one table: entry point → `source`; `enquiryUrl(source)`) |

## What the form holds (read-only check, 2026-11-03, `list_blocks`)

Full Name, Business Email, Company / Organization, Job Title (optional), Area of Interest (Enterprise Pilot, Product Demonstration,
Strategic Partnership, MSP / AV Integration Partnership, Investment Conversation, General Inquiry), Timeline (optional), Tell Us About Your
Opportunity, Privacy Acknowledgment naming Tally as the form provider. Thank-you page shown by Tally only after an accepted submission;
the website never shows a success message. **No hidden field yet**, so Tally ignores the `source` parameter until the owner adds it.

## The website

- Every entry point is `target="_blank" rel="noopener noreferrer"`; its accessible name ends "(opens the enquiry form on tally.so in a
  new tab)"; an external-link mark shows the same; the disclosure beside it names tally.so, EU storage, that nothing typed passes
  through the site, and the "Area of Interest" to choose. CSP unchanged: nothing from tally.so loads on the site.
- The site's own lead form (`LeadForm`) is rendered only in a build given an API (`build.mjs --api=<url>`); the enterprise API lead
  route and `tests/e2e/website-lead.e2e.mjs` stay intact.
- Privacy notice `/privacy#enquiries`: Tally as processor, Empathia Technologies as controller, the fields, EU storage as Tally states it,
  Tally's US email sub-processor for notifications, the `source` sentence, retention ("as long as needed, then deleted").

| Page | Button | `source` | Area of Interest named |
|---|---|---|---|
| Home founder section, `/founder` | Connect with the founder | `founder` | Investment Conversation or General Inquiry |
| `/request-demo`, `/contact` | Request a demonstration | `website-demo` | Product Demonstration |
| `/pilot-partners`, `/contact` | Explore an enterprise pilot | `website-pilot` | Enterprise Pilot |
| `/pilot-partners`, `/contact` | Discuss a partnership | `website-partner` | Strategic Partnership or MSP / AV Integration Partnership |
| `/about#investors`, `/contact` | Start an investor conversation | `website-investor` | Investment Conversation |
| `/contact` | Send an enquiry | `website-contact` | General Inquiry |

"About the founder" stays an internal link to `/founder` (same tab); "Connect with the founder" is the enquiry. Two distinct buttons,
never merged. The founder disclosure says the enquiry is marked for the founder and is not a private channel.

## The owner's Tally steps (not applied; owner's approval needed)

1. In the editor of `VpG0Vy`, type `/hidden`, insert a **Hidden fields** block, name one field exactly `source`, publish.
2. Make the consent text's "View Privacy Policy" a link to `https://<website>/privacy#enquiries` (with or after the deployment).
3. Decide email notifications (on: content passes through Tally's US email provider, which the notice discloses).
4. Choose a retention period (free plan: deletion by hand).
5. Switch on spam protection if the plan offers it.
6. Submit one test enquiry from `https://tally.so/r/VpG0Vy?source=founder`; check that the entry shows `source = founder`; delete it.

Tests: `tests/browser/website.test.mjs` W-enquiry-*, W-founder-*, W-founder-click (tally.so stubbed), W-privacy, W-*-form.
