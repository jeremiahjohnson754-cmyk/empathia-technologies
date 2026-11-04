# Enquiries through the hosted Tally form

**Status:** integrated on branch `restoration/enquiry-tally`. **Not merged and not deployed.** The owner's rule is that nothing merges or
deploys until the restoration release gates pass and the owner approves deployment. The live sites (`main`) are unchanged.

| Item | Value |
|---|---|
| Owner's approval | 2026-10-31 20:18 CT: use the hosted form, opened externally, not embedded |
| Form | "Connect with Empathia Technologies", `https://tally.so/r/VpG0Vy` (form id `VpG0Vy`, workspace `nrpbzN`) |
| Configured in | `apps/website/src/enquiry.ts` and `apps/demo/src/enquiry.ts`. The two must name the same URL; test `W-enquiry-source` checks it. |

## What was verified before the site's own form was replaced

I read the form's configuration with the connected Tally tool, read-only: `load_form`, no edits and no publish. I also fetched the public
page. I did **not** submit a test entry, because that would create a real enquiry in the owner's account.

| Check | Finding |
|---|---|
| Fields | Full Name (required), Business Email (required), Company / Organization, Job Title, Area of Interest (required, one of: Enterprise Pilot, Product Demonstration, Strategic Partnership, MSP / AV Integration Partnership, Investment Conversation, General Inquiry), Timeline (dropdown), Tell Us About Your Opportunity (required), Privacy Acknowledgment (required checkbox) |
| Disclosure on the form | "I understand that Empathia Technologies will use my information to review and respond to this inquiry, and that Tally processes and stores the submission as the form provider. View Privacy Policy" |
| Thank-you page | "Thank you for connecting with Empathia Technologies. Your inquiry has been received. …" Tally shows it only after a submission it has accepted. The site itself never shows a success message. |
| Hidden fields and pre-fill | None. Each entry point therefore tells the visitor which "Area of Interest" to choose. |
| Settings | Tally's defaults; no general settings configured. Theme: background `#212121`, text `#f4f4f4`, accent `#008080`, button `#000000`. |
| Search engines | The public page carries `noindex,nofollow`. |

## What changed on the two sites

**Corporate website** (`apps/website`). In a build without an API, which is the default, every entry point opens the hosted form in a new
tab. The page shows the disclosure beside each button.

| Page | Entry points | Choice named |
|---|---|---|
| Request a demonstration | "Request a demonstration" | Product Demonstration |
| Pilots (`/pilot-partners`) | "Explore an enterprise pilot"; a new **Partnerships** section with "Discuss a partnership" | Enterprise Pilot; Strategic Partnership or MSP / AV Integration Partnership |
| Contact | "Send an enquiry" | General Inquiry |
| Founder | "Start an investor conversation" in the closing band | Investment Conversation |
| About | A new **Investor conversations** section | Investment Conversation |

How the entry points behave:
- **Navigation.** The navigation's "Request a demo" and the home page's call to action still go to the site's own Request a demonstration page.
  That page shows the disclosure, so visitors read where they are going before they leave the site.
- **New tab.** Every link is `target="_blank" rel="noopener noreferrer"`. Its accessible name ends "(opens the enquiry form on tally.so in a new tab)",
  and an external-link mark shows the same to sighted visitors.
- **Security headers.** The site's CSP is unchanged, because nothing from tally.so loads on the site. `Referrer-Policy: no-referrer` means Tally is
  not told which page sent the visitor.
- **Privacy notice.** A new **Enquiries** section (`/privacy#enquiries`) says:
  - the form is hosted by Tally;
  - nothing typed in it passes through the site;
  - which fields are collected;
  - Empathia Technologies is the controller and Tally the processor;
  - Tally states the data is encrypted and stored in Europe (Google Cloud, Belgium);
  - Tally's sub-processors include a US email provider, used when Tally sends Empathia a notification;
  - enquiries are kept only as long as needed and then deleted.

  The old sentence saying enquiries go to "Empathia's own service" is gone from this build. The "Your rights" section and the Contact page
  point to the form.
- **The site's own form** (`LeadForm`) is still in the code. It is rendered only when a build is given an API (`build.mjs --api=<url>`), so
  the enterprise API's lead route, its spam and consent checks, and `tests/e2e/website-lead.e2e.mjs` (6/6) stay intact for when the API is deployed.

**Investor demonstration** (`apps/demo`):
- **"Work with Empathia" on the investor start:** four entry points (pilot, partnership, investor conversation, guided demonstration), each
  naming the choice to make. The disclosure says that nothing done in the demonstration is sent with the enquiry, and links to the website's
  privacy notice and founder page.
- **The footer of every page:** "Contact Empathia" (new tab) and "The founder". Its sentence now reads: "Nothing is connected to a real
  system; the only way out is Empathia's enquiry form, which opens on tally.so."
- **Footer link size:** footer links now meet a 24 px target, and 44 px on phones.

## Tests

| Suite | Result |
|---|---|
| `tests/browser/website.test.mjs` | 77/77. The old check that the disabled form says it is not configured is replaced by stronger ones, at 1440 and 390 px: |
| | each entry point's URL, new tab, `noopener noreferrer` and accessible wording |
| | the disclosure and its privacy link beside each button |
| | no form of the site's own and no sent/received wording on those pages |
| | a real click opening the form in a new tab (tally.so stubbed) while the page stays put |
| | the privacy notice's content |
| | the website and the demo naming the same form |
| `tests/browser/demo-enquiry.test.mjs` (new) | 14/14: the four entry points and the footer link at both widths, the disclosure, a real click (stubbed), no outside request from the demonstration's own pages |
| `tests/browser/demo.test.mjs` | 138/138 |
| `tests/e2e/website-lead.e2e.mjs` | 6/6 (the API-backed form path, unchanged) |
| Site audit `--strict` | 164 checks, P0 0, P1 0. P2 92 → 71 and P3 556 → 538 against the committed audit (footer and target-size fixes). |

## Remaining privacy and configuration requirements (owner's decisions; nothing changed in Tally)

1. **Link the privacy policy from the form.** In the consent checkbox, "View Privacy Policy" is plain text, not a link. Make it a link to
   `https://<website>/privacy#enquiries`. It should go live **with or after** the deployment of this branch: the live site's privacy page
   (`main`) still says forms go to "Empathia's own service", which is not true of the Tally form.
2. **Until this branch is deployed, don't point anyone at the form.** The form is public now (no-index, but anyone with the link can
   submit), while the live privacy notice is inaccurate for it. Deploying this branch fixes that, after the release gates and your approval.
3. **Email notifications.** Confirm whether Tally emails you new submissions. If it does, the content passes through Tally's US email
   provider, which the new notice discloses. If you turn notifications off, check the Tally inbox instead.
4. **Retention.** Pick a period, for example 12 months after the last exchange. On Tally's free plan, deletion is manual; automatic
   deletion needs the Business plan. The notice now says "as long as needed, then deleted". A stated period would be stronger.
5. **Spam protection.** Check what the form's settings offer and switch it on. Not verified from Tally's public pages.
6. **A test submission.** Submit one test enquiry yourself, check the thank-you page and any notification, then delete it.
7. **Brand continuity (optional).** Theme changes apply to the live form immediately, so they wait for your approval. To match the
   sites: background `#090C11`, text `#F6F2EC`, accent `#2ED6C5`, button `#2ED6C5` with text `#04211E`, and Poppins if Tally offers it.
8. **Branding.** Tally's free plan keeps Tally branding on the form. Removing it is a paid Pro feature.

## Sources

- Tally, GDPR: https://tally.so/help/gdpr
- Tally, privacy policy: https://tally.so/privacy
- Tally, embedding forms (developer docs): https://developers.tally.so/widgets/embeds
- Tally, pricing: https://tally.so/pricing
