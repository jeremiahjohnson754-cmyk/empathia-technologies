# The public founder page: content audit

Task #242, the fourth deliverable of the founder's 21:34 directive (18 Nov 2026). Its distinction:

> "the Founder Studio application is not the same thing as your public-facing founder biography page."

This audit checks the public page, `/founder` and the founder section of the home page, against every rule the founder has set for
them. It was read from the built page (`apps/website/dist/founder/index.html`) on 19 Nov 2026.

| Rule | Source | Finding |
|---|---|---|
| Credentials are CTS (AVIXA), CAPM (PMI) and CompTIA Network+, nothing else; never SHRM-CP, CMP, CTS-D or CTS-I | Founder | **Holds.** The page names exactly CTS, CAPM and Network+. None of the others appears on it. CTS-D and CTS-I appear elsewhere on the site only as the names of the Learn product's unofficial study spaces, never as his credentials. |
| "KEEP MY EXISTING FOUNDER PHOTOGRAPH. DO NOT REPLACE IT." | Founder | **Holds.** The portrait is served from `/media/founder/` in three sizes. It has one commit in its history (`cf19a6e`, the pipeline that kept the original). `founder.ts` is not edited. |
| The private origins archive is not a public asset | 21:34 directive | **Holds.** The page holds no receipt, screenshot, chronology, archive reference or contractor communication. The archive was never opened in this work. |
| The 20 Nov 2025 founder-vision date is not presented as independently authenticated | 21:34 directive | **Holds.** The page gives no such date. |
| No implied B3 Integrated Solutions affiliation; no relative named without approval | 21:34 directive | **Holds.** Neither appears. |
| No employer-specific architecture or records; no real organisations' names | Standing rule | **Holds.** The site-wide forbidden-claims check (`W-claims-*`) covers every page. The Search Party story's drawing says it is "not the record of any organisation". |
| The founder's email stays private | Standing rule | **Holds.** The page has no address and no `mailto:`. Enquiries open the hosted form with `source=founder`, and the page says the form "is not a private channel". |
| The Studio and the Founder Edition are not public | 21:34 directive | **Holds.** The page does not link to the Studio, the Founder Edition or any private route. Its only outbound links are the demonstration and the enquiry form. |
| The founder's words are his | Standing rule | The two passages marked "in the founder's own words", "The Missing Piece" and the closing reflection, are rendered from `founderStory.tsx` and `founderQuote.ts` as he gave them. Nothing is paraphrased into his voice. |
| Demonstrations are labelled synthetic | Standing rule | **Holds.** The Search Party screenshot is marked "Synthetic demonstration data", and the footer says nothing shown is a live system. |

## What now guards it

The website suite's `W-founder-page` check runs on `/founder` in every regression. It already held the credential rule. On 19 Nov it
was extended in two ways:
- It now also fails on SHRM, CMP, CTS-D or CTS-I in the page's text.
- It fails on anything of the private archive: receipts, the archive, a chronology, B3 Integrated Solutions, or the 20 Nov 2025 date.

`W-founder-*` checks the home page's founder section at three widths: the three credentials, the portrait and the two links.

## Not covered here

- Whether a family-legacy section should be added: only with the founder's approval of the specific material (directive).
- The private Studio's own pages: the security and privacy deliverable.
