# Interim lead capture with Tally: proposal for the owner's approval

Status: **PROPOSAL. Not configured, not published, not connected.** Nothing on this page has been created in Tally or changed on
the website. The website's forms keep saying they cannot send yet, with the send button disabled, until the owner approves one of
the options below. Researched 2026-10-31 from Tally's own pages (sources at the end). Tally's terms and plans can change, so
re-check them on the day of setup.

## Why Tally, and what it replaces

The site's lead forms already work end to end against the enterprise API's lead route (`POST /v1/public/leads`: consent required,
a honeypot, a minimum fill time, a receipt reference; tested in `tests/e2e/website-lead.e2e.mjs`). That route needs the enterprise
API and a database deployed, which costs money and exposes a service. Tally receives enquiries with nothing for us to host. It is an
**interim** solution: when the enterprise API is deployed, the forms can point back to it.

## What Tally states about privacy (from its GDPR page)

| Topic | What Tally states | What it means here |
|---|---|---|
| Where data is stored | Google Cloud in Belgium; "All Tally form data is encrypted both in transit and at rest, and stored in Europe." | Enquiries are held in the EU by a third party, not by Empathia's own service. |
| Who can process submissions | Google Cloud (Belgium, hosting). Opt-in only: SendGrid (US) for email notifications, Cloudflare (EU) for file uploads, Stripe (US) for payments. | **If email notifications are switched on, the enquiry content passes through SendGrid in the US.** Leave file uploads and payments off. |
| Roles | The form creator is the controller; Tally is the processor. A DPA is accepted with the Terms ("It is not necessary to sign this document."). | Empathia Technologies is the controller of every enquiry. |
| Retention | The creator controls retention. Deleted responses leave backups within 90 days. **Automatic deletion after a set period requires the Business plan.** | On the free plan, someone must delete old enquiries by hand on a schedule. |
| Use of data | Tally says it does not sell personal data or use it for marketing. | — |

Not established from Tally's pages: whether an embedded form sets cookies, and what spam protection the free plan includes. Both
must be checked in the Tally editor before going live.

## What the plans include (from Tally's pricing page)

- **Free:** unlimited forms and submissions under fair use, notification emails to yourself, webhooks, a custom thank-you page.
  Tally branding stays on the form.
- **Pro ($24/month as listed):** removes the branding, adds a custom (sub)domain, custom CSS and partial submissions.
- **Business ($74/month as listed):** controlled data retention (automatic deletion).

The free plan is enough for an interim enquiry form. No purchase is needed or proposed.

## Three configurations

### A. Link out to a Tally-hosted form (recommended)

- The site keeps its own pages. Each "Request a brief / pilot / partner" area shows one button, "Open the enquiry form", plus a line
  that says the form is hosted by Tally, in the EU.
- Clicking it opens `https://tally.so/r/<form-id>`, Tally's hosted page.
- **No change to the site's security headers** (CSP). The site still loads nothing from third parties.
- Visitors who never click send nothing to Tally.

### B. Embed the Tally form in the page

- Loads `https://tally.so/widgets/embed.js` and an iframe from `tally.so` on the contact pages.
- **Requires a CSP change** on both static sites' headers in `render.yaml`: `script-src 'self' https://tally.so` and
  `frame-src https://tally.so`. Today the policy is `default-src 'self'`, with `script-src 'self'`.
- Every visitor of those pages loads Tally's script, whether or not they write anything.
- Looks more integrated, but weakens the site's "no third-party loads" position. Not recommended for an interim form.

### C. Keep the forms off

- This is how things are today: the forms say they cannot send yet. The contact page gives no address to write to.

## The exact form, if A or B is approved

Mirror the site's current form so nothing new is collected:

| Field | Type | Required | Notes |
|---|---|---|---|
| Enquiry type | Hidden field `kind` | yes | `investor`, `pilot` or `partner`, passed by the link from the page that sent the visitor |
| Name | Short text | yes | |
| Organization | Short text | yes | |
| Work email | Email | yes | |
| Role or pilot scope | Dropdown | no | the same options as the site's form for that kind |
| Message | Long text | yes | |
| Consent | Checkbox | yes | "I agree that Empathia Technologies stores this message, through its form provider Tally (data stored in the EU), to answer it. See the privacy notice." |
| Origin page | Hidden field `originPage` | — | filled by Tally from the page path |

Settings:
- No file uploads, no payments, no partial submissions.
- Thank-you text: "Thank you. Your message reached Empathia Technologies. We answer within N business days." **The owner must choose
  N, or drop the sentence.**
- Notification emails to the owner: **the owner's choice.** On, the content passes through SendGrid (US). Off, the owner checks the
  Tally inbox.
- Retention: the owner deletes enquiries older than an agreed period (for example 12 months) by hand. The privacy notice states it.

## Website changes this needs (not made; ready to make on approval)

1. **The privacy notice must change.** It currently says the site "loads nothing from third parties" and that forms send data "to
   Empathia's own service". With Tally, the second statement becomes untrue, and with option B the first does too. The new text must:
   - name Tally as the form provider;
   - say the data is stored in the EU;
   - say whether email notifications route through the US;
   - state the retention period.
2. **The lead form component** shows option A's button (or option B's embed) instead of the disabled form. The disabled state remains
   for any build without a configured form.
3. **Tests.**
   - Option A: the site audit checks that each enquiry button points at the approved form URL and that the privacy notice names the
     provider.
   - Option B: the deploy-headers test is updated to the new CSP, and a browser test checks that the iframe loads only from tally.so.
   - The existing API lead tests stay; the route still exists for later.

## What needs the owner's approval

1. Option A, B or C.
2. Email notifications on or off (the SendGrid / US point).
3. The retention period, and who deletes old enquiries.
4. The thank-you wording (the reply-time promise).
5. Permission for Claude to create the form in the connected Tally workspace, unpublished first for review. Publishing is a separate
   approval.

## Sources

- Tally, GDPR: https://tally.so/help/gdpr
- Tally, privacy policy: https://tally.so/privacy
- Tally, embedding forms (developer docs): https://developers.tally.so/widgets/embeds
- Tally, pricing: https://tally.so/pricing
