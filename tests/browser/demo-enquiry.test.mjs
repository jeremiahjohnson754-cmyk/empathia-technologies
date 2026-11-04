#!/usr/bin/env node
// The investor demonstration's way to a real conversation: the "Work with Empathia" entry points on the investor start and the contact
// link in the footer of every page open the owner's hosted Tally form (apps/demo/src/enquiry.ts) in a new tab, say so, carry the
// disclosure, and send nothing from the demonstration. tally.so is stubbed, so the clicks are tested without leaving the test machine.
// Recovered from the original suite (14 checks at 1440/390); rebuilt on the shared harness, which adds 768 px.
//   node tests/browser/demo-enquiry.test.mjs
import fs from 'node:fs'; import path from 'node:path';
import { suite, repo } from './demo-ops-harness.mjs';
const FORM = (fs.readFileSync(path.join(repo, 'apps/demo/src/enquiry.ts'), 'utf8').match(/url: '([^']+)'/) || [])[1];
await suite('demo-enquiry', 4486, async ({ ok, open, goto, base, VIEWPORTS }) => {
  ok('DE-00', 'the demonstration names the owner\'s hosted form (tally.so/r/…)', /^https:\/\/tally\.so\/r\/[A-Za-z0-9]+$/.test(FORM || ''), FORM);
  for (const [w, h, tag] of VIEWPORTS) {
    const { ctx, page, errs } = await open(w, h, { stubTally: true }); const ext = [];
    page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('https://tally.so/')) ext.push(r.url()); });
    await goto(page, '#/investor'); await page.waitForSelector('[data-testid="work-with"]');
    const s = await page.evaluate(() => {
      const sec = document.querySelector('[data-testid="work-with"]');
      return { links: Array.from(sec.querySelectorAll('a[data-enquiry]')).map((a) => ({ k: a.dataset.enquiry, href: a.getAttribute('href'), target: a.target, rel: a.rel, name: a.textContent })),
        note: (sec.querySelector('[data-enquiry-note]') || {}).textContent || '', over: document.documentElement.scrollWidth - innerWidth,
        footer: Array.from(document.querySelectorAll('footer a[data-enquiry="footer"]')).map((a) => ({ href: a.getAttribute('href'), target: a.target, rel: a.rel, name: a.textContent })) };
    });
    const each = (l) => l.href === FORM && l.target === '_blank' && /\bnoopener\b/.test(l.rel) && /\bnoreferrer\b/.test(l.rel) && /new tab/.test(l.name) && /tally\.so/.test(l.name);
    ok(`DE-${tag}-01`, 'the investor start offers pilot, partnership, investor and demonstration entry points, each opening the hosted form in a new tab and saying so', ['pilot', 'partner', 'investor', 'demo'].every((k) => s.links.some((l) => l.k === k)) && s.links.length === 4 && s.links.every(each), JSON.stringify(s.links));
    ok(`DE-${tag}-02`, 'each entry point names the choice to make in the form, and the disclosure says who receives and who stores the enquiry and that nothing from the demonstration is sent', s.links.every((l) => /In the form, choose/.test(l.name)) && /tally\.so/.test(s.note) && /Tally stores it for us in the EU/.test(s.note) && /Nothing you do in this demonstration is sent with it/.test(s.note), s.note);
    ok(`DE-${tag}-03`, 'the footer carries the contact link to the same form, opening in a new tab and saying so', s.footer.length === 1 && s.footer.every(each), JSON.stringify(s.footer));
    ok(`DE-${tag}-04`, 'no sideways scroll with the section on the page', s.over <= 0, `over=${s.over}`);
    const [popup] = await Promise.all([page.waitForEvent('popup', { timeout: 5000 }).catch(() => null), page.click('[data-testid="work-with"] a[data-enquiry="investor"]')]);
    const opened = popup ? popup.url() : null; if (popup) await popup.close();
    ok(`DE-${tag}-05`, 'pressing an entry point opens the hosted form in a new tab and the demonstration stays where it was', opened === FORM && page.url() === base + '#/investor', JSON.stringify({ opened, at: page.url() }));
    await goto(page, '#/servicehands');
    const deep = await page.evaluate(() => document.querySelectorAll('footer a[data-enquiry="footer"]').length);
    ok(`DE-${tag}-06`, 'the contact link is in the footer of a page deep in the demonstration too', deep === 1, `links=${deep}`);
    if (tag === 'phone') { const hs = await page.evaluate(() => Array.from(document.querySelectorAll('footer a')).map((a) => a.getBoundingClientRect().height)); ok(`DE-${tag}-08`, 'footer links are at least 44 px tall on a phone', hs.every((x) => x >= 43.5), JSON.stringify(hs)); }
    ok(`DE-${tag}-07`, 'no page error and no request outside the demonstration from its own page', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
    await ctx.close();
  }
});
