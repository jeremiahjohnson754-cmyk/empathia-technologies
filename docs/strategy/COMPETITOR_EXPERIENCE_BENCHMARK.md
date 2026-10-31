# Competitive Experience Benchmark

**Empathia Technologies: internal strategy document**

| Field | Value |
|---|---|
| Prepared | 2026-10-31 |
| Retrieval date for every source | 2026-10-31 |
| Status | Draft for internal review. Not for external distribution. |
| Scope | Public web experience (marketing pages and public documentation) of AV/IT and workplace platforms, plus one creative benchmark. This is **not** an audit of competitors' products. |
| Empathia baseline | Early stage. Public site and investor demo run on synthetic data only. No customers, no certifications, no production integrations. |

---

## 1. Read this first: method and limitations

1. **Retrieval tool.** Pages were read with WebFetch, which turns HTML into text and answers questions about it using a small model. Text in quotation marks below is the wording that tool returned. Before any of it is quoted outside this document, check it against the live page.
2. **Allowlist restrictions.** Most of the requested URLs were refused at first by the session's URL allowlist. Some were then reached through WebSearch result links or links that appeared on other fetched pages. Four requested pages (Radial, Utelogy, Xyte homepage, Vyopta platform page) could not be retrieved at all. Section 2 gives the status of each.
3. **No screenshots were captured.** Layout, visual hierarchy, typography, colour, contrast, motion and real mobile behaviour cannot be seen in extracted text. Where this document says something about them, it rests only on clues in the markup: viewport meta tags, skip links, alt attributes, carousel controls. Anything else is marked "not observable from page text".
4. **"Time to value" rubric.** Judged from the order of the text only, not from visual prominence.
   - *Immediate*: the headline or first sentence says what the product does.
   - *Early*: the value appears in the subheadline or the next section.
   - *Delayed*: the headline is abstract or packaging-led, and concrete value appears further down.
5. **Absence is not evidence.** If a capability is not on a marketing or docs page, that does not mean the product lacks it. Every Empathia differentiation in Section 6 is a hypothesis to test, not a finding.
6. **No paid tools.** No Firecrawl or other paid tool was used.
7. **Competitor statistics are not reusable.** Figures quoted below are recorded as the competitor states them. They are not verified and must not be reused in Empathia materials.

---

## 2. Retrieval status

| # | Requested page | Status | What was actually read |
|---|---|---|---|
| 1 | https://radial.to/ (creative benchmark) | **Not retrieved** | Blocked by the allowlist. Five WebSearch queries returned no radial.to results, only dictionary pages and Radial Engineering news, which was excluded on purpose. No substitute was used. |
| 2 | https://www.utelogy.com/ | **Not retrieved** | Blocked on the first attempt, and again after the URL appeared as a link in a trade-press article. Section 5 uses that one dated trade-press item, clearly labelled as secondary, for capability context only. It is not used as experience evidence. |
| 3 | https://www.xyte.ai/ | **Not retrieved** (homepage) | Blocked. `https://www.xyte.io/platform/connect` returned a 302 redirect to `https://www.xyte.ai/platform/connect`, which was also blocked. That redirect shows the company has moved to the xyte.ai domain. Substitute: official docs page `https://docs.xyte.io/docs/ai-teammate`. |
| 4 | https://www.crestron.com/Products/Featured-Solutions/XiO-Cloud | **Retrieved** (second attempt) | Fetched after the official SW-XIOC catalog page linked to it. The catalog page was also read. |
| 5 | https://help.qsys.com/Content/Reflect/reflect_overview.htm | **Retrieved** | Fetched after it appeared as a search result. |
| 6 | https://learn.microsoft.com/en-us/microsoftteams/rooms/managed-meeting-rooms-portal | **Retrieved** (equivalent URL) | The en-us URL was blocked. The same article was read at the locale-neutral URL `https://learn.microsoft.com/MicrosoftTeams/rooms/managed-meeting-rooms-portal`. |
| 7 | https://www.vyopta.com/our-platform | **Not retrieved** as requested | Blocked. The vyopta.com "Our Platform" search results (`?p=209955`, `?p=205436`) return a 302 to `https://workforceexperience.hp.com/wxp-collaboration/`, which was blocked. Substitutes: the HP WXP marketing page (Latin America/Caribbean English locale), which says "WXP Collaboration, formerly Vyopta", and the HP WXP Collaboration docs page. |
| 8 | https://www.appspace.com/ | **Retrieved** (equivalent URL) | Read at `https://appspace.com/` (canonical `https://www.appspace.com/`). A search result (`?p=133255`) also resolved to an Appspace blog post dated July 29, 2026, which was read too. |
| 9 | https://www.servicenow.com/products/workplace-service-delivery.html | **Retrieved** | Fetched after it appeared as a search result. |

---

## 3. Page-by-page observations

### 3.1 Radial (creative benchmark only; not an AV competitor)

**Not retrieved. Nothing was observed.** No Radial-derived patterns appear in this document. The two themes it was meant to inform are concise visual-editor storytelling and ownership-first messaging. Where Section 7 touches those themes, the recommendations are Empathia's own and need validating against the live page.

Product question raised by this gap: if Empathia wants ownership-first messaging, it must first confirm what data export and portability actually exist today. Section 8 applies.

### 3.2 Utelogy

**Official homepage not retrieved. No experience observations.** For capability context, see Section 5. That context comes from one company-supplied trade-press item (AV Beat, 2026-01-20), not from utelogy.com.

### 3.3 Xyte (homepage not retrieved; official docs used as substitute)

All observations below come from `https://docs.xyte.io/docs/ai-teammate`. Its metadata says it was updated 2026-08-05. This is a docs page, so the homepage hierarchy, CTAs and marketing trust signals are **not observable**.

- **Headline and time to value: Immediate (for a docs page).** Title "AI Teammate". The opening line is "The Xyte AI Teammate is your intelligent assistant built directly into the Xyte platform."
- **Hierarchy and IA.**
  - Page sections: Overview, Note, How to Access, Use Cases & Sample Prompts, Where the Data Comes From & How It Works, Current Capabilities, Coming Soon.
  - Docs top bar: Home, Guides, API Reference, Discussions.
  - Guide sections: Getting Started, Using the Portal, Edge, Supported Devices & Models, Cloud Connectors, Service Integrations, Security & Access, Troubleshooting, FAQ, and Xyte AI (AI Teammate, Xyte MCP Server, Xyte CLI).
- **Proof.** One screenshot under Current Capabilities, and a table of use cases with sample prompts. No video, GIFs or diagrams.
- **CTAs and friction.** No sign-up or demo CTA. Beta access goes through a Customer Success Manager.
- **Trust signals.** Interactions "follow Xyte's security and permissions model", so users see only data they already have access to. The page says nothing about human approval before device commands run.
- **Capabilities stated.**
  - Current: incident monitoring, space status overviews, incident analytics, device management (move and rename), firmware management, ticket management, incident control (resolve, snooze, set delay), and device commands.
  - Coming Soon: customer insights, AI-suggested actions, manual search, a mobile version, voice mode, and bulk device updates.
- **Notable pattern.** The page keeps "Current Capabilities" and "Coming Soon" in separate sections.
- **Notable inconsistency.** The capabilities list says commands can be sent "from mobile", but the use-case table and Coming Soon list mark the mobile version as not yet available. A Note gives the beta status "as of Oct 2025", which is older than the page's own update date.
- **Motion, visual, accessibility, mobile.** Accessibility is not mentioned. Motion is not observable from page text. Mobile is inconsistent, as noted above.

### 3.4 Crestron XiO Cloud (Featured Solutions page, with SW-XIOC catalog page)

- **Headline and time to value: Early.**
  - The headline names the product and its packaging rather than an outcome: "XiO Cloud and xio cloud premium".
  - Subheadline: "Two powerful subscription options to deploy and manage all your workplace technology through the XiO Cloud® platform."
  - The outcome comes in the next section: "Keep rooms working, meetings moving, and teams productive".
- **Hierarchy and IA.**
  - Several promotional banners sit **above** the main heading: design resources, a CTI LMS notice, DM NVX (repeated), the NY Giants Draft Room (repeated), Crestron Home, a Spotify Camp Nou story, the product catalog, and True Blue Community.
  - Then the main content, in order:
    1. Heading.
    2. "Two subscription tiers".
    3. A Premium "snapshot" section with headings named after charts: "Device offline incidents", "Firmware releases", "Room usage over time", "Room occupancy over time", "Uptime by device".
    4. "Lifecycle of a space", in four stages: Deploy, Monitor, Manage, and "Evolve with XiO Cloud Premium".
    5. Supported devices, including third-party partners and the XiO Cloud Gateway.
    6. Tier comparison tables.
    7. A contact form.
  - The top navigation was not captured in the text; footer groups were.
  - The catalog page uses a breadcrumb and Overview / Specifications / Resources / Models & Accessories tabs.
- **Proof.**
  - Chart and image graphics are present, but every image had empty alt text in the extracted content.
  - No demo video, interactive tour or live demo.
  - Two named case studies (Spotify Camp Nou / FC Barcelona and the New York Giants Draft Room) are reached through banners.
  - The catalog page links to the XiO Cloud Service User Guide and a product-certificate search.
- **CTAs and friction.**
  - Many "Learn More" banners point away from the topic.
  - "Learn more" jumps to the tier section.
  - The contact form is headed "We'll contact you." Visible fields: a country dropdown and a consent statement, protected by reCAPTCHA. Other fields were not captured.
  - On the catalog page, the free tier requires registration ("Visit the Licensing and Registration Hub"). Other options: "Have a question?", "Add to a Project", "Find a Dealer".
  - The catalog page bands Premium pricing by device count (1–99, 100–499, 500+) but shows no prices.
  - The extracted text is ambiguous about which features are free and which are Premium: the checkmarks did not survive extraction, and the base tier is called "free" in one place and a "subscription tier" in another.
- **Trust signals.**
  - "built on the Microsoft® Azure® platform", and a "Secure first" heading.
  - Two named case studies.
  - On the catalog page: Azure "unlimited scalability", deploying "thousands of devices simultaneously", and availability "with local performance and redundancy". These are vendor claims.
  - A footer link to "Commitment to Security".
  - No certifications are listed on either page.
- **Capabilities stated.**
  - Zero-touch provisioning: pre-configured devices are acquired and provisioned automatically when they connect, and devices can be claimed in bulk by CSV.
  - Pushing settings, firmware, program files and logos.
  - A hierarchical space tree (spaces, floors, buildings, campuses).
  - SMS and email alerts; online/offline status and room health; Maintenance Mode; a Device Register.
  - Pushing messages to digital signage.
  - Premium: third-party devices via SDK and Gateway drivers, ServiceNow integration, historical analytics, dashboards, and an API.
  - Catalog page: a program library with version rollback.
- **Motion, visual, accessibility, mobile.**
  - Motion: not observable from page text.
  - Alt text was empty on every captured image, and there is no accessibility statement.
  - A device-width viewport meta tag is present. The page says the platform is reachable "anywhere in the world through a simple web browser".
  - The catalog page mentions the Crestron Device Assistant app for claiming devices.

### 3.5 Q-SYS Reflect (help documentation)

- **Headline and time to value: Immediate.** Title "Q-SYS Reflect". The opening reads "Q-SYS Reflect is a powerful and intuitive platform designed to manage and monitor your Q-SYS systems." It is available starting with Q-SYS version 8.2.
- **Hierarchy and IA.** The docs are structured by task:
  1. Getting Started: Release Notes, Getting Started, Identity Provider Setup, Overview, Users and Roles, Licensing Portal.
  2. Accessing Reflect.
  3. Reflect Manager Pages: Domains, Alerts & Notifications, Audit Log, Organizations, Assets, Space Manager, System Reliability, System Explorer, API Requests.
  4. Monitoring: Status, Event Log.
  5. Core Management: Network, Access Management, Licensing, Files, Utilities.
  6. System Management: User Control Interfaces, Telephony, Video, Dynamic Pairing, "Design Backup and Restore (Beta)".

  There is a breadcrumb, and the footer shows "Q-SYS 10.5.1".
- **Proof.** Text only. The one image is the Q-SYS logo. No screenshots, diagrams or video.
- **CTAs and friction.** "Log into the Reflect website" goes to reflect.qsc.com/login, and "Getting Started with Reflect" goes to a registration topic. There is no trial or sales CTA: the page serves existing users, not prospects.
- **Trust signals.**
  - Federated SSO through QSC ID.
  - Secure Communication (encrypted device and control connections).
  - 802.1X per LAN interface, device certificates, and security policies.
  - User roles, access control, and secure access tokens.
  - An Audit Log of user actions.
  - No third-party certifications are named.
- **Notable.**
  - Design backup and restore exists, labelled Beta.
  - The API is described as "free".
  - Health is reviewed through System Reliability reports and System Explorer.
- **Motion, visual, accessibility, mobile.** Accessibility is not mentioned. A viewport meta tag is present. Motion is not observable from page text.

### 3.6 Microsoft Teams Rooms Pro Management Portal (Microsoft Learn)

- **Headline and time to value: Immediate.**
  - Title: "Microsoft Teams Rooms Pro Management Portal".
  - Opening: "The Teams Rooms Pro Management portal provides a view of the health of your meeting rooms and helps to facilitate your existing monitoring tools and practices."
  - A scope statement follows straight away: "This feature is only available in the commercial, GCC, GCC-High and DoD clouds as of now."
  - The footer says "Last updated on 2025-01-27". The metadata `updated_at` is 2025-12-18.
- **Hierarchy and IA.**
  1. Overview.
  2. Terminology (a table).
  3. Incidents view.
  4. Types of Incidents.
  5. Health status (Critical/Important and Warning tables).
  6. Responding to Incidents ("Needs Action" and "System Investigating").
  7. Rooms View.
  8. Room Detail: Status and Changes.
  9. Active Ticket: Overview, Notes, Attachments, History.

  There is a "Skip to main content" link, a table of contents, Reading mode, and an "In this article" list.
- **Proof.** Text only. The interface is described in prose ("top panel", "Status tab"). No in-body screenshots or video.
- **CTAs and friction.** No commercial CTA. Options: "Summarize this article for me" (AI summary), page feedback, and a link to set up the Pro Manager Administrator role.
- **Trust signals.**
  - An Important callout says to assign users to the Pro Manager Administrator role and "make sure that access to the portal is restricted based on your organizational needs."
  - Licensing scope is explicit: "Generating incidents is available with a Teams Rooms Pro or Teams Shared Device license."
  - Device scope: "The certified Microsoft Teams Room system device."
- **Notable patterns.**
  - Room states are Healthy, Unhealthy, **Unmonitored** (lost cloud connectivity) and **Suppressed** (silenced for known maintenance states).
  - Health is based on "an evolving criteria and heuristics".
  - Each signal has one ticket, and tickets hold Notes (shared with the team and a bot), Attachments ("pictures, videos, logs") and History.
  - Monitored areas: display, audio, camera, HDMI ingest, sign-in, proximity sensor, app version, OS version.
  - The wording about Warning incidents contradicts itself: they "don't affect the health status", yet "will be shown as a health status of the device."
- **Motion, visual, accessibility, mobile.**
  - Light, Dark and High contrast themes; a skip link; `color-scheme: light dark`; a responsive viewport.
  - Status is described with icons only ("green heart" and "red broken heart"), and no text alternative was observed.
  - Motion: not observable from page text.

### 3.7 Vyopta, now HP WXP Collaboration (requested page not retrieved; HP substitutes used)

**Finding:** the vyopta.com "Our Platform" URLs redirect (302) to HP. The HP marketing page says "WXP Collaboration, formerly Vyopta, delivers visibility into space utilization." Benchmark Vyopta as part of HP Workforce Experience Platform (WXP), not as a standalone vendor site.

HP WXP marketing page (`hp.com/lamerica_nsc_carib-en/...`):
- **Headline and time to value: Delayed.**
  - Headline: "HP Workforce Experience Platform (WXP)".
  - Subheadline: "Transform IT from Infrastructure to Impact".
  - Concrete value arrives later, in the Secure / Monitor / Remediate / Automate blocks.
- **Hierarchy and IA.**
  1. Hero.
  2. Three statistics.
  3. Benefits.
  4. A testimonial and an ROI calculator teaser.
  5. "Modular, cloud-based SaaS that connects into your existing infrastructure."
  6. Secure / Monitor / Remediate / Automate.
  7. HP Add-on Solutions.
  8. Third-Party Integrations.
  9. Developer Resources.
  10. Partner with HP.
  11. FAQ.
  12. Footnotes and disclaimers.
  13. A tier table (Standard, Pro, Elite).

  The page sits inside HP's corporate navigation (Laptops, Desktops, Printers…) and has on-page anchors: Overview, ROI Calculator, Add-ons, Integrations, FAQ.
- **Proof.**
  - A dashboard image (alt text: "Image of laptop showing WXP dashboard") and a "Platform Tour" label whose target was not shown.
  - An ROI calculator, a tier table, and a developer portal.
  - No embedded video was visible.
- **CTAs and friction.**
  - "Contact us" (twice) goes to an HP sales contact page.
  - "Request a demo" and "Platform tour": targets not shown.
  - "ROI Calculator".
  - "Fill out the form" offers a talk with an HP expert and a release-update subscription.
  - **"Visit our pricing plans page" points to "#"**, a placeholder link.
- **Trust signals, as stated on the page.**
  - Three cited statistics: 57% (HP Internal Research, 2025), 47% (Deloitte, 2023), 34% (Forrester, 2024).
  - A named testimonial (Shawn Bennett, Director of IT Support, Healthcare Information Technology Services: "has become essential for optimizing our IT endpoints.") with a Kansas Health logo.
  - "WXP is ISO27001, ISO27701, ISO27017 and SOC2 Type2 certified for Information Security."
  - "HP follows stringent GDPR privacy regulations."
  - "AI trained on billions of telemetry datapoints".
  - Integrations named: ServiceNow, Microsoft Intune, Tableau, Power BI, Power Automate, Entra ID, Splunk.
- **Motion, visual, accessibility, mobile.**
  - Carousel controls ("Show Next Slide", "Show Previous Slide", "Play") suggest an auto-advancing slider. A template placeholder `%{i}` appears in the code.
  - Skip links: "Skip to Content", "Skip to Footer", "Skip to Country Selector". There is an accessibility footer link.
  - Descriptive alt text is present on several images.
  - A responsive viewport meta tag is present.

HP WXP Collaboration docs page (published May 12, 2025; updated April 8, 2026):
- Title: "Integration Experience With WXP Collaboration". The meta description reads "Integrate HP Workforce Experience Platform with Vyopta". The visible body does not mention Vyopta.
- Content:
  - Numbered setup steps; IT Admin privileges are required.
  - A colour-banded Collaboration score: green 85–100, orange 55–84, red 0–54.
  - Meeting KPIs and an inventory of video endpoints and telephones.
  - A Collaboration Experience dashboard with ten widgets.
  - A FedRAMP support contact.
- Text only, with a logo image. There are "Open in ChatGPT", "Open in Claude", "Copy page" and "View as Markdown" options.

### 3.8 Appspace (homepage)

- **Headline and time to value: Immediate.**
  - Headline: "Your whole workplace, connected".
  - The subheadline names four concrete product areas (intranet, digital signage, space reservation, visitor management) and a start-small, scale-later path.
  - Page title: "Workplace Communication & Management Software | Appspace".
- **Hierarchy and IA.**
  1. Gartner banner.
  2. Hero.
  3. "Four products. One workplace experience platform."
  4. "The AI assistant that actually gets things done".
  5. "Built for the teams that keep your workplace running" (tabs: Comms & HR, Facilities, IT).
  6. "A team player in your tech stack" (integrations).
  7. "A Gartner® Leader across the workplace."
  8. "The trusted choice for workplace experience customers" (statistics).
  9. "Stop juggling silos. Start enjoying a connected workplace."
  10. "Recognized by analysts. Loved by customers." (badges).

  Top navigation: Products, Solutions (by need, team and industry), Resources, Partners, **Pricing**.
- **Proof.**
  - Product images for each of the four products and an interface image.
  - Integration logos: Microsoft 365, Teams, SharePoint, Slack, Google, Salesforce, Workday, ServiceNow, Jira, Webex.
  - Links to product demos, interactive demos, customer stories and a knowledge center.
  - No demo video or embedded tour is described on the homepage itself.
- **CTAs and friction.** There are two parallel paths:
  - Sales-led: "Get a demo" (`/schedule-demo/`) and "Contact us" (`/contact-sales/`).
  - Self-serve: "Explore the platform" and "Try for free" (cloud sign-up).

  Also present: "Sign in", app store badges, and "Get the report". The homepage itself has no form fields.
- **Trust signals.**
  - Gartner: "Appspace is a Leader in the Gartner® Magic Quadrant™ for Intranet Packaged Solutions", and a claim to be "the only vendor recognized as a Leader in both the 2026 Gartner® Magic Quadrant™" (the sentence continues with the Workplace Experience Applications report).
  - Gartner, Forrester, Clearbox and G2 badges.
  - The statistics headings ("of the Fortune 500", "customer retention among enterprises", "customers") came through as **"0 +" and "0 %"** in the extracted text. That suggests client-side counters which did not render without JavaScript (an inference), so the figures cannot be verified from the homepage.
  - The blog boilerplate (July 29, 2026) states: "Trusted by more than 3,000 customers globally, including 180 Fortune 500 companies."
  - No named customer testimonials appear in the homepage text. "Security & trust" is only a navigation link.
- **Notable.** The AI assistant is described with scoped permissions: "Set what it knows, what it can do, and who can access it."
- **Motion, visual, accessibility, mobile.**
  - A "Skip to content" link.
  - Many images have empty alt text; a few have descriptive alt text (for example, "Appspace communications and HR interface, view 1").
  - A responsive viewport meta tag, and iOS and Android app badges.
  - Motion: not observable from page text, apart from the counter inference above.

### 3.9 ServiceNow Workplace Service Delivery

- **Headline and time to value: Immediate.**
  - Headline: "Unify workplace experience and management on a single platform."
  - Subheadline: "Bring employee engagement and facilities workflows together into a single, connected experience."
- **Hierarchy and IA.**
  1. Hero with "Read Report".
  2. "The world works with ServiceNow™".
  3. "How does Workplace Service Delivery work?" (with video).
  4. Four benefits.
  5. Six use cases: Space Planning, Operational Efficiency, Reservations, Team Collaboration, Incident Insights, Hazard Reporting.
  6. Customers: "Industry leaders rely on ServiceNow to make work better".
  7. Integrations.
  8. Resources.
  9. Ecosystem.
  10. Impact.
  11. FAQ.
  12. "Talk with an expert".
  13. Newsletter.

  Global navigation: MyNow, Products, Industries, Learning, Support, Partners, Company. Utility links: "Get Started", "View a Demo", and a sales phone number. In-page tabs: Overview, Plans and Packages, Getting Started.
- **Proof.**
  - A runtime-labelled explainer: "Watch Video (1:35)".
  - A self-serve demo library ("View a Demo").
  - Data sheets and white papers.
  - No product screenshots appear in the extracted text.
- **CTAs and friction.**
  - "Get Started" and "Schedule Demo" / "Contact Us" go to a contact form. Its fields are not observable from page text.
  - "View a Demo" goes to the demo library.
  - Newsletter sign-up with an email field.
  - Whether content is gated is not observable from page text.
- **Trust signals, as stated on the page.**
  - "550% increase in weekly desk bookings", "4.35M reservations booked in 12 months", "18K team members supported by optimized scheduling." The extracted text attributes none of these to a named customer.
  - "2026 Gartner Magic Quadrant™ for Workplace Experience Applications".
  - "Integrate anything with ServiceNow."
  - No named customer logos in the extracted text.
- **Motion, visual, accessibility, mobile.**
  - "Skip to Main Content", a "Product accessibility" link and an accessibility statement link.
  - Some images have alt attributes.
  - The video runtime is labelled; captions and transcripts are not observable from page text.
  - A responsive viewport meta tag. The FAQ says the product works through "mobile apps".
  - Motion: not observable from page text.

---

## 4. Comparison table

Abbreviations: **TTV** = time to value (Section 1 rubric). **n/o** = not observable from page text. **NR** = not retrieved.

| Page | TTV | Hierarchy / IA | How product is proven | CTAs and friction | Trust signals present | Motion / visual / a11y / mobile |
|---|---|---|---|---|---|---|
| Radial (creative) | NR | NR | NR | NR | NR | NR; screenshots not captured |
| Utelogy | NR | NR | NR | NR | NR (secondary context only, Sec. 5) | NR |
| Xyte (docs substitute) | Immediate (docs) | Docs organised by task; separate "Current Capabilities" and "Coming Soon" sections | One screenshot; table of sample prompts | No sign-up or demo CTA; beta access through a CSM | Permissions-model statement; no human-approval statement | Accessibility not mentioned; mobile statements inconsistent; motion n/o |
| Crestron XiO Cloud | Early (headline leads with packaging) | Banner stack above the heading; lifecycle stages; tier tables | Chart graphics (empty alt); two named case studies; user guide; no video | Contact form (country, consent, reCAPTCHA; other fields n/o); free tier needs registration; dealer path; no prices | Azure; "Secure first"; named case studies; scalability claims; no certifications listed | Empty alt text throughout; no a11y statement; viewport meta; browser access; motion n/o |
| Q-SYS Reflect (docs) | Immediate | Task-structured docs; Beta labels | Text only | Log-in and getting-started links only; no prospect path | SSO, encryption, 802.1X, certificates, roles, audit log; no certifications named | Accessibility not mentioned; viewport meta; motion n/o |
| Microsoft Teams Rooms Pro portal (docs) | Immediate, plus scope statement | Terminology, then incidents, rooms, tickets | Text only; UI described in prose | No commercial CTA; AI summary; feedback | Role restriction callout; licensing and cloud scope; certified-device definition | Light, Dark and High contrast themes; skip link; status shown by icons only; motion n/o |
| HP WXP (Vyopta substitute) | Delayed (abstract subheadline) | Inside HP corporate navigation; stats, benefits, capabilities, add-ons, tiers | Dashboard image; "Platform Tour" label; ROI calculator; developer portal; no video seen | Contact sales; demo (target n/o); expert form; pricing link is "#" | ISO 27001/27701/27017 and SOC 2 Type 2 claim; GDPR; named testimonial; third-party-cited stats | Carousel with Play control; three skip links; descriptive alt text on several images; viewport meta |
| Appspace | Immediate | Products, AI, teams, integrations, analysts, stats, closing CTA | Product and UI images; integration logos; links to demos and stories | Two paths: demo or contact sales, or self-serve trial; Pricing in top navigation; no homepage form | Gartner MQ claims; analyst and G2 badges; stats rendered as "0" in text; customer count in blog boilerplate | Skip link; many empty alt attributes; app badges; viewport meta; counters possibly animated (inferred) |
| ServiceNow WSD | Immediate | Benefits, use cases, customers, integrations, FAQ, expert CTA; in-page tabs | 1:35 explainer video; self-serve demo library; data sheets | Get Started or Schedule Demo forms (fields n/o); demo library is self-serve; newsletter | Outcome stats with no named customer in text; Gartner MQ; integrations | Skip link; accessibility statement; some alt text; video runtime labelled; captions n/o |

Screenshots were not captured for any page.

---

## 5. What the category already does well

The category is mature. On the evidence of the retrieved pages alone, the following already exist and are marketed or documented. **Empathia has none of them in production.**

1. **Device and room health monitoring is table stakes.**
   - Crestron: online/offline status, room health, SMS and email alerts.
   - Q-SYS Reflect: Status, Event Log, cross-organisation Alerts.
   - Microsoft: incidents, plus Healthy, Unhealthy, Unmonitored and Suppressed states.
   - Xyte: incident monitoring and incident control.
   - HP WXP Collaboration: video endpoint and telephone monitoring, and meeting-quality KPIs.
2. **Remote management, firmware and configuration.**
   - Crestron pushes settings, firmware, program files and logos, and schedules firmware updates.
   - Q-SYS covers Core network, licensing and file management.
   - Xyte offers firmware management and device commands.
3. **Zero-touch and bulk provisioning.** Crestron provisions pre-configured devices automatically when they connect, and claims devices in bulk by CSV.
4. **Analytics and reporting.**
   - Crestron Premium: room usage, occupancy and uptime by device over time.
   - HP: a Collaboration score and a ten-widget dashboard.
   - Q-SYS: System Reliability reports.
   - ServiceNow: space insights from sensor and booking data.
5. **Integrations and APIs.**
   - Crestron Premium integrates with ServiceNow and has an API.
   - Q-SYS has a free API and access tokens.
   - Xyte has an API reference, an MCP server and a CLI.
   - HP integrates with ServiceNow, Intune, Power BI, Splunk and others.
   - Appspace shows an integration logo set.
   - ServiceNow: "Integrate anything with ServiceNow."
6. **AI assistants and automation are already shipping or being marketed.** Xyte AI Teammate (beta), the Appspace AI assistant with scoped permissions, ServiceNow AI agents, and HP AI features (anomaly detection, natural-language search). **"AI" is not a differentiator for Empathia.**
7. **Identity, roles and audit.**
   - Q-SYS: federated SSO, roles, audit log, device certificates, 802.1X.
   - Microsoft: a role-restricted portal.
   - HP: ISO and SOC 2 claims.
   - Crestron: Azure foundation.
8. **Versioning already exists in some form.** Q-SYS has "Design Backup and Restore (Beta)", and the Crestron catalog page describes a program library with version rollback. **Version history alone is not novel.**
9. **Tickets that carry evidence.** Microsoft tickets hold Notes, Attachments ("pictures, videos, logs") and History. **Attaching evidence to a ticket is not novel either.**
10. **Spatial hierarchies.** Crestron has a space tree (spaces, floors, buildings, campuses). Q-SYS has Organizations, Domains and Assets. Microsoft has a Rooms view.
11. **Honest state and maturity labelling.** Microsoft's "Unmonitored" and "Suppressed" states, Xyte's separate "Current Capabilities" and "Coming Soon" sections, and Q-SYS "(Beta)" labels.
12. **Ways to evaluate without talking to sales.** Appspace has a free trial, ServiceNow a demo library, Crestron a free tier behind registration, and HP an ROI calculator.
13. **Scale and distribution.** Named case studies (Crestron), analyst recognition (Appspace and ServiceNow cite the 2026 Gartner Magic Quadrant for Workplace Experience Applications), and certification claims (HP).

**Secondary context for Utelogy, not experience evidence.** One company-supplied item on AV Beat (2026-01-20) says Utelogy describes itself as "the global leader in connected workplace management, monitoring, control, automation, and analytics". The same item says it offers:
- browser-based cloud configuration, monitoring and lifecycle management;
- cloud-to-cloud connectivity via APIs and webhooks;
- agentic AI for natural-language interaction and orchestration (for example firmware updates, device recovery and usage analysis);
- predictive AI developed with Intel;
- event flows to ITSM and AIOps platforms;
- more than 200 new integrations in 2025.

These are the company's own claims and were not checked against utelogy.com.

**What this means for Empathia.** Competing on monitoring, control, analytics, AI or integration breadth would mean competing on the incumbents' home ground, with nothing in production. The credible angle is narrower: what the category does not visibly foreground. Section 6 sets this out.

---

## 6. Where Empathia can credibly differentiate, subject to implementation

Every item below is a **hypothesis to prove, not a fact**. For each one, the "Observed" line records only what the retrieved pages showed. A capability missing from a page may still exist in the product.

**Positioning hypothesis (overall).** Empathia sits as an *evidence and accountability layer* that complements monitoring and control platforms rather than replacing them. This must be tested with buyers. It also depends on integrations that do not yet exist in production (see Section 8).

### H1. Evidence provenance
- **Hypothesis.** Owners and integrators value being able to trace any room or device state to the evidence behind it: who captured it, when, by what method, and which artifact.
- **Observed.** Competitors show health states, event logs, audit logs of user actions (Q-SYS) and ticket attachments (Microsoft). None of the pages retrieved describes a provenance chain from a readiness claim down to its supporting evidence.
- **Must be true before claiming.**
  - A provenance model implemented end to end, on non-synthetic data in a pilot.
  - Each evidence record carries capture metadata.
  - Any integrity mechanism is documented and reviewed.
- **Risk.** Incumbents could add provenance metadata to tickets and logs they already have.

### H2. Independent verification and non-self-verification
- **Hypothesis.** A workflow that stops the person who did the commissioning work from being its only verifier, enforced by the system, is worth paying for. This is especially true for owners accepting work from integrators.
- **Observed.** The retrieved pages describe vendor platforms reporting on their own devices, and health derived from "an evolving criteria and heuristics" (Microsoft). None describes separation of duties for accepting commissioning work.
- **Must be true before claiming.**
  - Separation of duties enforced in code, with refusals logged and their reasons recorded.
  - A written policy defining what "independent" means in Empathia: a different person or role, **not** a third-party certification body.
  - Pilot feedback from at least one owner and one integrator.
- **Risk.** "Independent verification" can be heard as third-party or accredited verification. Word it carefully (Section 8).

### H3. Accepted baselines with version history
- **Hypothesis.** The differentiator is not versioning as such, which exists already (Q-SYS design backup and restore in Beta; Crestron program-library rollback). It is a baseline that has been **accepted**: a recorded decision with approver, evidence and scope, which later observations can be compared against across multi-vendor rooms.
- **Observed.** Versioning and backup on retrieved pages are tied to a single vendor's systems and programs. No page describes acceptance as a recorded decision.
- **Must be true before claiming.** Acceptance workflow, version diffs and drift comparison working on real (non-synthetic) room data from more than one vendor's devices.
- **Risk.** Vendors could add acceptance metadata to the backup and restore features they already have.

### H4. Design-to-operations lineage
- **Hypothesis.** Buyers value one thread running from request intake (Lite design, Scouter proposal) through commissioning, accepted baseline, operations and field service. That thread answers "is this room still what we specified, paid for and accepted?"
- **Observed.** Crestron's "Lifecycle of a space" begins at Deploy and runs through Monitor, Manage and Evolve. None of the retrieved pages starts the lifecycle at intake or design.
- **Must be true before claiming.** The end-to-end flow run on at least one real project, with lineage queryable at every stage. Operational data would come from an integration that does not yet exist.
- **Risk.** Design tools and ITSM platforms could close the gap from either end.

### H5. Role-aware relationship graph (Search Party)
- **Hypothesis.** A graph linking rooms, devices and people, with views that differ by role, answers questions that a space tree cannot. Examples: "who is affected", "who verified this", "who is qualified to fix it".
- **Observed.** Hierarchies are common: Crestron's space tree; Q-SYS Organizations, Domains and Assets; Microsoft's Rooms view. Microsoft and Xyte describe role and permission restrictions on access. No retrieved page describes a cross-entity graph whose views change by role.
- **Must be true before claiming.** A permission model implemented and tested; real data; usability evidence that role-based views reduce effort.
- **Risk.** Graph claims are easy to overstate. Show concrete queries, not a network diagram.

### H6. Competency-linked learning (Learn / SIGNAL)
- **Hypothesis.** Linking training competencies to who may perform or verify a task closes a loop that separate learning portals leave open.
- **Observed.** Training appears as separate properties: Crestron links to an LMS and a Training footer item, ServiceNow has a University, and HP has developer resources. No retrieved page links a competency to permission to perform or verify a task.
- **Must be true before claiming.** A competency model, mapping from task to competency, real learners, and governance over who defines competencies.
- **Risk.** Implying accreditation or continuing-education credit (Section 8).

### H7. Declared versus verified device state (Field Intelligence)
- **Hypothesis.** Showing every device attribute as *declared* (from design or proposal), *observed* (from field or telemetry) or *verified* (accepted with evidence), as a first-class distinction in the interface, reduces false confidence.
- **Observed.** Microsoft already separates "Unmonitored" from "Healthy", which is evidence that the category values not mistaking missing data for good data. No retrieved page describes declared-versus-observed comparison at the attribute level.
- **Must be true before claiming.** A field data source (manual capture at minimum) and a comparison engine running on real devices.

---

## 7. Patterns to adopt and patterns to avoid

These describe patterns, not layouts or copy. Do not reproduce any competitor's section order, headings or wording.

### 7.1 Corporate website (goal: qualified pilot or demo requests)

**Adopt**

1. **A one-sentence definition at the top.** The retrieved docs pages (Q-SYS, Microsoft) and the Appspace and ServiceNow heroes say what the product does in a single line. Empathia's hero should name the object (AV/IT rooms), the user (owners, integrators, field teams) and the outcome in plain words, with no category jargon.
2. **A scope statement next to the definition.** Microsoft states availability and scope straight after its opening line. Empathia should say, near the top, that it is in pilot stage and that demonstrations use synthetic data.
3. **Maturity labels on every module.** Xyte separates current from coming-soon features, and Q-SYS labels Beta. Give each Empathia module a single visible status, kept in one source of truth so that pages cannot contradict each other the way Xyte's mobile statements do.
4. **The lifecycle as the navigation spine.** Crestron organises its page by lifecycle. Empathia's lifecycle runs longer: intake, design, proposal, commissioning, baseline, operations, service, learning. Using it as the primary structure communicates H4 without needing to claim it.
5. **Show the full state vocabulary, including "unknown".** Microsoft's "Unmonitored" state is a trust-building pattern. Show how Empathia separates declared, observed, verified and unknown.
6. **Two CTA paths of different weight.** Appspace and ServiceNow pair a sales path with a self-serve one. Empathia has no trial, so pair a primary "request a pilot conversation" with a secondary low-commitment option, such as a walkthrough video or a technical brief on the evidence model. **Do not offer a trial or sign-up.**
7. **A short form that qualifies.** Ask only what helps qualify: role, organisation type (owner, integrator, manufacturer, service provider), approximate room estate size as a range, timeline, and the main problem in free text. Say what happens after submission. Put no gated downloads in front of a first conversation.
8. **Dates on content.** Microsoft and the HP docs show published and updated dates. Date Empathia's capability, trust and claims pages, and keep a public changelog of capability status.
9. **Accessibility baseline seen on mature sites.**
   - Skip links (Microsoft, Appspace, ServiceNow, HP).
   - A high-contrast theme option (Microsoft).
   - Descriptive alt text on product images (HP).
   - A text equivalent for every diagram and chart, and never colour or icon alone to show status (contrast this with Microsoft's heart icons).
   - Set WCAG 2.2 AA as an internal **target**, not a public claim.
10. **Server-render text that carries trust.** Appspace's statistics came through as "0" in extracted text. Anything credibility-critical must survive without JavaScript, for crawlers, screen readers and slow connections. For Empathia this mostly means: no counters at all.
11. **An honest trust page.** Mature sites have a security or trust destination. Empathia's should list only practices that are implemented and verified, and say plainly that there are no certifications yet.
12. **Runtime labels on media.** ServiceNow labels its explainer "(1:35)". Label the length of any Empathia walkthrough.

**Avoid**

1. **Stacking banners above the main content.** On Crestron's page, unrelated promotions come before the heading. Keep the hero for the hero.
2. **Abstract or packaging-led headlines.** HP's subheadline delays concrete value, and Crestron's headline leads with tier names. Lead with the job the product does.
3. **Placeholder or dead links.** HP's pricing link goes to "#", and several of its CTA targets were not visible. Check every link before each release.
4. **Unattributed outcome statistics.** ServiceNow's outcome figures carry no named source in the extracted text. Empathia has no outcome data and must not imply any.
5. **Logo walls and badge rows.** Empathia has no customers, analyst coverage or certifications. Do not fill the gap with partner, manufacturer or "as seen in" logos.
6. **Charts without text alternatives.** Crestron's chart graphics had empty alt text, and charts are often the proof.
7. **Feature tables whose meaning sits in checkmarks.** Crestron's tier tables lost their meaning in text extraction. Use text values ("Included", "Planned"), which screen readers can read.
8. **Repeated CTAs and repeated banners.** Crestron repeats several "Learn More" banners. Each section should have one clear next step.
9. **Leading with dashboards or AI.** That is the incumbents' home ground (Section 5).

### 7.2 Investor demo (goal: a credible 3–7 minute walkthrough)

**Adopt**

1. **Disclose synthetic data in the first ten seconds and on every screen.** Use a persistent, non-dismissable label. Never let a screen look live.
2. **State length and chapters up front**, following the runtime-label pattern, and keep the runtime promised.
3. **Follow one room through its whole lifecycle** (H4). A suggested beat sheet:

   | Time | Beat | Shows |
   |---|---|---|
   | 0:00–0:30 | Frame | Synthetic-data disclosure; the problem in one sentence; what the viewer will see |
   | 0:30–1:30 | Intake and design | Request, then Lite design, then Scouter proposal; this creates the *declared* state |
   | 1:30–3:00 | Commissioning and verification | Evidence captured. **The technician tries to verify their own work and the system refuses (H2).** A second person verifies, and baseline v1 is accepted (H3) |
   | 3:00–4:15 | Operations | A Field Intelligence observation differs from the declared state and is flagged (H7). Search Party shows what and who is affected, viewed from two roles (H5) |
   | 4:15–5:15 | Service | A ServiceHands visit with evidence; baseline v2 with a visible diff and history (H1, H3) |
   | 5:15–6:00 | Competency | Learn/SIGNAL shows the competency the task requires and a gap (H6) |
   | 6:00–7:00 | Honesty slide and ask | Built vs prototype vs planned; what a pilot would prove; how it complements existing monitoring platforms |

   **3-minute cut:** frame, then commissioning and verification, then baseline diff, then built vs planned.
4. **Only show behaviour the demo code actually runs.** Visibly label any static mock-up as "concept".
5. **Drill down to evidence at least once.** Go from a status to the record behind it (who, when, method, artifact) to make provenance (H1) concrete.
6. **Acknowledge the category.** One slide saying that monitoring, control, analytics and AI assistants already exist (Section 5) raises credibility with investors who know Crestron, Q-SYS and Microsoft. Keep competitor names off the public site (Section 8).
7. **Practical robustness.** Keyboard navigable; readable at presenter screen resolution; a reduced-motion option; works offline or from a local build if venue networks fail.

**Avoid**

1. **Live-looking animated telemetry, ticking counters or "real-time" badges** on synthetic data.
2. **Real manufacturer product names or logos in the synthetic data** where they could imply an integration. Use generic device names, or label models clearly as illustrative.
3. **AI as the headline.** The category already markets AI assistants (Section 5).
4. **Opening on a dashboard.** Open on the problem and the thread instead.
5. **A complete tour of every module.** Go deep on three or four, and cover the rest in one "also in scope" line.
6. **ROI calculators, market sizes or savings figures** without a cited, sound source and method. Section 8 covers outcome figures.

---

## 8. Claims we must not make

Until each one is true **and** evidenced, Empathia must not state or imply any of the following on the website, in the demo, in decks or in sales conversations.

1. **Customers or usage.** No customer, pilot, deployment, user, room or device counts. No customer names, logos, quotes or case studies.
2. **Certifications or compliance.** Nothing like "SOC 2", "ISO 27001", "FedRAMP", "GDPR compliant", "certified", "audited" or "compliant". No "certification-ready" claim without an independent readiness assessment.
3. **Production integrations.** No "integrates with", "works with", "connects to", "native support for" or logo use for any platform. That includes Crestron, Q-SYS, Microsoft Teams Rooms, Xyte, Utelogy, HP WXP or Vyopta, ServiceNow, Appspace, Zoom, Webex and others. Describe integrations as "planned" only if they are on the roadmap.
4. **Operational capabilities not in production.** No real-time monitoring, alerting, remote control, firmware management, provisioning or device commands.
5. **Outcome statistics.** No time saved, cost reduced, uptime improved, ROI, fewer truck rolls or faster commissioning, and no percentage of any kind, until it is measured in real pilots with the method disclosed.
6. **"Independent verification" in a third-party sense.** Do not imply that an accredited or external body verifies work. Once it is built, the accurate wording is that verification is done by a different person or role from the one who did the work.
7. **Integrity superlatives.** No "tamper-proof", "immutable", "audit-grade", "forensic", "legally admissible" or "court-ready". Before using any integrity language, implement the integrity controls, have them independently reviewed, and still avoid legal-admissibility language.
8. **Uniqueness or leadership.** No "first", "only", "unique", "industry-leading", "the leader" or "unlike anything else". The retrieved pages show adjacent capabilities (version rollback, design backup and restore, ticket attachments), and competitors' product internals cannot be verified.
9. **AI claims.** No "AI-powered verification", "predictive", "autonomous" or "self-healing" unless it ships. Even then, say what the AI does and where a human approves.
10. **Training accreditation.** Learn/SIGNAL must not be described as accredited, certified or eligible for continuing-education credit by any body.
11. **Synthetic data presented as real.** No unlabelled screen, metric, room or person from the demo dataset. Nothing labelled "live".
12. **Endorsements.** No partnership, endorsement, analyst recognition or award, whether stated or implied.
13. **Security features not implemented.** Claim only what is verified in code and infrastructure: SSO, SCIM, encryption at rest, data residency, penetration testing and so on.
14. **Availability.** No uptime figures, SLAs or support-hour commitments.
15. **Replacement claims.** No "replaces your monitoring platform, ITSM or LMS".
16. **Public comparisons with competitors.** Keep this benchmark internal. No named comparisons on the public site.
17. **Borrowed statistics.** Do not reuse competitor-cited figures, such as the third-party percentages on the HP page. If Empathia needs an industry figure, cite the primary source directly after reading it.
18. **Data ownership or portability.** No ownership-first, export or no-lock-in messaging until those capabilities exist and are documented (see Section 3.1).

---

## 9. Gaps in this benchmark and how to close them

1. **Pages not retrieved.** Re-read radial.to, utelogy.com, the xyte.ai homepage and the HP WXP Collaboration page (`https://workforceexperience.hp.com/wxp-collaboration/`) once they are allowlisted or can be reviewed by hand.
2. **No screenshots.** Capture each page at desktop and mobile widths to assess hierarchy, visual craft, motion and the CTA's position above the fold.
3. **No automated accessibility checks.** Run an automated checker on each page, plus a manual keyboard pass, before relying on the accessibility notes above.
4. **Form friction.** Contact form fields were not observable for Crestron (only country and consent), ServiceNow or HP. Review them by hand without submitting.
5. **Locale.** The HP page was read in the Latin America/Caribbean English locale. Other locales may differ.
6. **Verbatim check.** Before any quote is used outside this document, re-check it on the live page (Section 1, item 1).

---

## Sources

All retrieval attempts were made on **2026-10-31**.

**Requested pages**

| URL | Retrieval date | Result |
|---|---|---|
| https://radial.to/ | 2026-10-31 | Not retrieved (allowlist; not found via WebSearch) |
| https://www.utelogy.com/ | 2026-10-31 | Not retrieved (allowlist; two attempts) |
| https://www.xyte.ai/ | 2026-10-31 | Not retrieved (allowlist) |
| https://www.crestron.com/Products/Featured-Solutions/XiO-Cloud | 2026-10-31 | Retrieved (second attempt) |
| https://help.qsys.com/Content/Reflect/reflect_overview.htm | 2026-10-31 | Retrieved |
| https://learn.microsoft.com/en-us/microsoftteams/rooms/managed-meeting-rooms-portal | 2026-10-31 | Not retrieved at this URL (allowlist); same article read at the locale-neutral URL below |
| https://www.vyopta.com/our-platform | 2026-10-31 | Not retrieved (allowlist) |
| https://www.appspace.com/ | 2026-10-31 | Not retrieved at this URL (allowlist); read at https://appspace.com/ |
| https://www.servicenow.com/products/workplace-service-delivery.html | 2026-10-31 | Retrieved |

**Pages read as equivalents, substitutes or support**

| URL | Retrieval date | Result |
|---|---|---|
| https://learn.microsoft.com/MicrosoftTeams/rooms/managed-meeting-rooms-portal | 2026-10-31 | Retrieved (Microsoft equivalent) |
| https://appspace.com/ | 2026-10-31 | Retrieved (canonical https://www.appspace.com/) |
| https://www.appspace.com/?p=133255 (resolved to https://www.appspace.com/blog/the-future-of-work-is-better-workplace-experience/) | 2026-10-31 | Retrieved (blog post dated July 29, 2026) |
| https://www.crestron.com/Products/Catalog/Control-and-Management/Cloud-Management/Licenses/SW-XIOC | 2026-10-31 | Retrieved (Crestron support page) |
| https://docs.xyte.io/docs/ai-teammate | 2026-10-31 | Retrieved (Xyte substitute; page metadata updated 2026-08-05) |
| https://www.xyte.io/platform/connect | 2026-10-31 | 302 redirect to https://www.xyte.ai/platform/connect |
| https://www.xyte.ai/platform/connect | 2026-10-31 | Not retrieved (allowlist) |
| https://www.vyopta.com/?p=209955 | 2026-10-31 | 302 redirect to https://workforceexperience.hp.com/wxp-collaboration/ |
| https://www.vyopta.com/?p=205436 | 2026-10-31 | 302 redirect to https://workforceexperience.hp.com/wxp-collaboration/ |
| https://eu.workforceexperience.hp.com/hp-vyopta-collaboration-experience-management | 2026-10-31 | 302 redirect to https://workforceexperience.hp.com/wxp-collaboration/ |
| https://workforceexperience.hp.com/wxp-collaboration/ | 2026-10-31 | Not retrieved (allowlist) |
| https://www.hp.com/lamerica_nsc_carib-en/services/workforce-solutions/workforce-experience-platform.html | 2026-10-31 | Retrieved (Vyopta/HP substitute, marketing) |
| https://learn.workforceexperience.hp.com/hp-wxp-vyopta-integration (canonical https://learn.workforceexperience.hp.com/docs/wxp-collaboration-integration) | 2026-10-31 | Retrieved (Vyopta/HP substitute, docs; published May 12, 2025; updated April 8, 2026) |
| https://avbeat.com/news/utelogy-advances-ai-and-cloud-first-innovation-at-ise-2026 | 2026-10-31 | Retrieved (secondary, company-supplied content dated 2026-01-20; capability context only) |
