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

## Owner's pre-rollout checklist (none of these is done; each needs your action and evidence)

Do these in order. Tally applies some changes at once and others only when you press **Publish**, so publish after step 2 and check
the live page each time.

1. **Privacy link** *(after this branch is deployed: the live privacy page is not yet correct for Tally, D-32)*.
   - In the Tally editor, open the form and select the words "View Privacy Policy" in the Privacy Acknowledgment checkbox.
   - Add a link to `https://empathia-website.onrender.com/privacy#enquiries` (or the production domain, once there is one).
   - Publish.
   - Test: open `https://tally.so/r/VpG0Vy` in a private window and click the link. It must open the Enquiries section of the deployed
     notice, and that section must name Tally.
   - Evidence: a screenshot of the opened section.
2. **Spam protection.**
   - In the editor, type `/recaptcha` on an empty line just above the Submit button. Tally offers reCAPTCHA v2 free on every plan.
   - Publish, then check that the challenge shows on the live form.
   - Privacy: reCAPTCHA is a Google service. The notice's Enquiries section then needs one more sentence saying the form uses Google
     reCAPTCHA to stop spam. I add it when you confirm this step.
3. **Email notifications.** Open the form's **Settings**, scroll to "Email notifications", and decide on "Self email notifications".
   - **On:** each enquiry is emailed to you through Tally's US email provider. The notice already discloses that.
   - **Off:** check the Tally inbox. The notice can stay as it is, or I can drop the sentence.
   - Tell me which, so the notice matches.
4. **Retention (12 months, if you approve).** Deletion is manual on the free plan; automatic deletion needs Tally Business.
   - On the first working day of each month, open the form's **Submissions** and delete every enquiry whose last exchange is more than 12
     months old. Then empty Tally's Trash; Tally removes deleted responses from backups within 90 days.
   - When you approve the period, I change the notice from "as long as needed" to "12 months after our last exchange".
5. **One real test submission.**
   - Submit one enquiry from a phone, with your own address and "Test — please delete" in the message.
   - Confirm three things: the thank-you page shows; the entry appears in Submissions; the notification arrives, if step 3 is on.
   - Then delete the entry and empty the Trash.
   - Evidence: screenshots of the thank-you page and of the entry before deletion.
6. **The updated Empathia privacy notice is deployed.**
   - After your deployment approval and the merge, open `https://empathia-website.onrender.com/privacy` and check that it shows the
     "Enquiries" section and no longer says "Empathia's own service".
   - Open `/contact` and press "Send an enquiry": the form must open in a new tab.
   - Evidence: the deploy id from Render and the two checks.

Optional, at any time and only on your approval: match the form's theme to the sites. Background `#090C11`, text `#F6F2EC`, accent `#2ED6C5`,
button `#2ED6C5` with text `#04211E`. Theme changes apply to the live form immediately. Tally branding stays on the free plan.

## Enquiry attribution: a hidden `source` field (owner's choice, 2026-10-31 21:51 CT; prepared for task #337, NOT applied)

**Decision.** The owner chose a hidden source field, so founder-directed and other enquiries arrive labelled with the entry point the
visitor used. The existing "Area of Interest" question stays exactly as it is. The visitor still chooses it; the source is
recorded in addition.

**Status.** Nothing is changed in Tally, and no test entry is submitted. The site's links do not carry the parameter yet. Both happen
in task #337, after the release gates, and the Tally steps only with the owner's approval.

### The Tally configuration, for the owner to apply (free plan; Tally help: Hidden fields)

1. Open the form "Connect with Empathia Technologies" (`VpG0Vy`) in the editor.
2. On an empty line (anywhere on page 1; it is invisible to respondents), type `/hidden` and insert a **Hidden fields** block.
3. Name one field exactly `source`, in lowercase. Add no other hidden fields.
4. Press **Publish**. Respondents see no change.
5. Check: open `https://tally.so/r/VpG0Vy?source=founder` and confirm the form looks exactly as before.

   The real check is the one approved test submission (checklist step 5). Its entry must show `source = founder` in **Submissions**.

   Tally fills a hidden field from a URL parameter of the same name. A link without the parameter leaves the field empty; Tally
   documents no error for that case, and the approved test submission confirms the behaviour. Tally's help confirms hidden fields
   appear in Submissions. It does not say whether they appear in exports or notification emails, so check that on the test entry.

### The CTA → `source` mapping (applied in code in task #337)

The form URL becomes `https://tally.so/r/VpG0Vy?source=<value>`. The values are lowercase, contain no personal data, and only name the
entry point.

| Site | Entry point | Button | `source` |
|---|---|---|---|
| Website | Founder page and home founder row: "Connect with the founder" (task #337 adds it beside "About the founder") | Connect with the founder | `founder` |
| Website | Request a demonstration | Request a demonstration | `website-demo` |
| Website | Pilots | Explore an enterprise pilot | `website-pilot` |
| Website | Pilots → Partnerships | Discuss a partnership | `website-partner` |
| Website | About → Investor conversations | Start an investor conversation | `website-investor` |
| Website | Contact | Send an enquiry | `website-contact` |
| Demo | Investor start → Work with Empathia | Explore an enterprise pilot | `demo-pilot` |
| Demo | Investor start → Work with Empathia | Discuss a partnership | `demo-partner` |
| Demo | Investor start → Work with Empathia | Start an investor conversation | `demo-investor` |
| Demo | Investor start → Work with Empathia | Request a guided demonstration | `demo-demo` |
| Demo | Footer of every page | Contact Empathia | `demo-footer` |

The founder page's closing band today carries "Start an investor conversation". Task #337 replaces it with "Connect with the founder"
(`founder`) and keeps "About the founder" as the internal link to the biography. Those are two distinct buttons, never merged.

### How the code change will be made (task #337)

- **One table in code.** `apps/website/src/enquiry.ts` and `apps/demo/src/enquiry.ts` gain a `source` per topic and a helper,
  `enquiryUrl(source)`, which appends `?source=<value>` with `encodeURIComponent`. The base URL stays a single constant per site, and
  the parity test compares the base URLs.
- **Tests.**
  - Each button's `href` equals the base URL plus its exact `source`.
  - The founder CTA carries `source=founder`, and "About the founder" stays an internal link.
  - No two entry points share a value unless the table says so.
  - The stubbed click opens the URL with the parameter.
- **Privacy.** The parameter names the button, not the visitor. The `Referrer-Policy: no-referrer` header still hides the page path,
  and the privacy notice adds one sentence: "The link tells Tally which button you used (for example 'founder'), so we can route your
  enquiry; it carries nothing about you."
- **Wording.** The founder disclosure says the enquiry goes through Empathia's enquiry form and is marked for the founder. It does
  not promise a private channel, a personal reply or a reply time.

## Sources

- Tally, GDPR: https://tally.so/help/gdpr
- Tally, privacy policy: https://tally.so/privacy
- Tally, embedding forms (developer docs): https://developers.tally.so/widgets/embeds
- Tally, pricing: https://tally.so/pricing
- Tally, reCAPTCHA: https://tally.so/help/recaptcha
- Tally, self email notifications: https://tally.so/help/self-email-notifications
- Tally, hidden fields: https://tally.so/help/hidden-fields
