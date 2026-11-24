// PRISM, SENTINEL, ACCORD, FORGE and OMNIPRESENCE in the demonstration (Enterprise 3.0 directive 1; journeys J7, J9, J3, J11), on a
// desktop and a phone. Each is used the way its journey says: a screen's exception becomes a real ServiceHands job; the drill is read
// moment by moment and its failed routes are followed up; the capsule is read from both sides, downloaded, withdrawn and read after
// it ends; a package is opened, refused to its author and approved by a second person; a building's tag is scanned and a room is
// switched only when every condition holds. Refusals are checked the same way as everywhere: the access page, and the screen's code
// never requested.   node tests/browser/demo-modules.test.mjs   (after node scripts/build.mjs)
import { harness } from './demo-shell-lib.mjs';
const { open, ok, done } = await harness('demo-modules');
const settle = async (p) => { await p.waitForSelector('main h1', { timeout: 10000 }); await p.waitForTimeout(400); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const hash = (p) => p.evaluate(() => location.hash);
const go = async (p, h) => { await p.goto(p.url().split('#')[0] + h); await settle(p); };
const clean = async (t) => await overflow(t.page) <= 1 && t.errs.length === 0;
const attrs = (p, sel, a) => p.locator(sel).evaluateAll((els, k) => els.map((e) => e.getAttribute(k)), a);

for (const [tag, w, h] of [['desk', 1440, 900], ['phone', 390, 844]]) {
  const O = { sw: false, w, h, reduced: true };

  // ---------------------------------------------------------------------------------------------- PRISM
  { const t = await open('#/prism', { role: 'ops', ...O }); const p = t.page; p.setDefaultTimeout(15000); await p.waitForSelector('[data-testid=prism]');
    const verdicts = await attrs(p, '[data-testid=prism-screens] > li', 'data-verdict'); const sum = await p.getByTestId('prism-summary').innerText();
    ok(`MD-${tag}-01`, 'PRISM: six screens of the estate; three as scheduled, one not as scheduled, one not reporting, one unknown; the summary says so', verdicts.join(' ') === 'MATCH MATCH MISMATCH OFFLINE UNKNOWN MATCH' && /3 of 6 as scheduled/.test(sum) && /3 of 6 screens need attention/.test(sum), `${verdicts.join(' ')} · ${sum}`);
    const text = await p.locator('main').innerText();
    ok(`MD-${tag}-02`, 'a player that issues no proof of play says “Not supported”; a stale report says what time it is from and is not read as correct; the page says it publishes nothing', /Not supported by this player/.test(text) && /The last report is from 13:02 UTC/.test(text) && /publishes nothing/.test(text) && /No player connection/.test(text), '');
    const bad = (await attrs(p, '[data-testid=prism-screens] > li[data-verdict=MISMATCH]', 'data-screen'))[0];
    await p.getByTestId(`prism-raise-${bad}`).click(); await p.waitForTimeout(500);
    const job = ((await p.getByTestId(`prism-job-${bad}`).innerText().catch(() => '')).match(/ISS-\d{4}/) || [''])[0];
    const others = await p.locator('[data-testid^=prism-job-]').count();
    await p.locator(`[data-testid=prism-job-${bad}] a`).click(); await settle(p);
    ok(`MD-${tag}-03`, 'an exception is raised as a real job: the screen shows the job, no other screen does, and ServiceHands lists it', !!job && others === 1 && /^#\/servicehands/.test(await hash(p)) && (await p.locator('main').innerText()).includes(job), `${bad} ${job} ${others}`);
    await go(p, '#/prism'); ok(`MD-${tag}-04`, 'PRISM: the job is still on the screen after coming back; no sideways scroll, no console error', (await p.getByTestId(`prism-job-${bad}`).innerText()).includes(job) && await clean(t), t.errs.join(' | '));
    await t.close();
    const x = await open('#/prism', { role: 'exec', ...O }); await x.page.waitForSelector('[data-testid=prism]');
    const v = await open('#/prism', { role: 'employee', ...O }); await v.page.waitForTimeout(600);
    ok(`MD-${tag}-05`, 'an executive reads PRISM and is offered no job to raise; an employee gets the access page and the screen’s code is never requested', await x.page.locator('[data-testid^=prism-raise-]').count() === 0 && await x.page.locator('[data-testid=prism-screens] > li').count() === 6 && await v.page.getByTestId('access-page').count() === 1 && v.reqs.filter((u) => /PrismPage/i.test(u)).length === 0, '');
    await x.close(); await v.close(); }

  // ---------------------------------------------------------------------------------------------- SENTINEL
  { const t = await open('#/sentinel', { role: 'ops', ...O }); const p = t.page; p.setDefaultTimeout(15000); await p.waitForSelector('[data-testid=sentinel]');
    const banner = await p.getByTestId('sentinel-banner').innerText(); const end = await attrs(p, '[data-testid=sentinel-routes] > li', 'data-state'); const tally = await p.getByTestId('sentinel-tally').innerText();
    ok(`MD-${tag}-06`, 'SENTINEL: the banner “SIMULATION — NOT A LIFE-SAFETY SYSTEM” is on the page; after the window closes, 3 routes are proven shown, 2 acknowledged without proof, 2 failed', /SIMULATION — NOT A LIFE-SAFETY SYSTEM/.test(banner) && end.join(' ') === 'RENDERED ACKNOWLEDGED RENDERED FAILED FAILED RENDERED ACKNOWLEDGED' && /3 of 7 routes are proven shown; 2 acknowledged without proof; 0 awaiting an answer; 2 failed/.test(tally), `${end.join(' ')} · ${tally}`);
    await p.locator('.kit-seg__opt', { hasText: '+1 s' }).click(); await settle(p); const one = await attrs(p, '[data-testid=sentinel-routes] > li', 'data-state');
    await p.locator('.kit-seg__opt', { hasText: 'Before the alert' }).click(); await settle(p); const before = await attrs(p, '[data-testid=sentinel-routes] > li', 'data-state'); const h0 = await hash(p);
    await p.goBack(); await settle(p); const back = await hash(p);
    ok(`MD-${tag}-07`, 'the drill is read moment by moment, in the address: before the alert nothing has started; one second in, nothing is proven and nothing has failed; Back returns to the earlier moment', before.every((s) => s === 'NOT_STARTED') && h0 === '#/sentinel?t=-1' && one.join(' ') === 'ACKNOWLEDGED ACKNOWLEDGED ACKNOWLEDGED REQUESTED REQUESTED ACKNOWLEDGED ACKNOWLEDGED' && back === '#/sentinel?t=1', `${before.join(' ')} · ${one.join(' ')} · ${back}`);
    await go(p, '#/sentinel'); const text = await p.locator('main').innerText();
    ok(`MD-${tag}-08`, 'the alert is from a fictional source and SENTINEL cannot create one; the plan needs a life-safety review that has not been done; what it never does is listed', /fictional authoritative source/.test(text) && /cannot create, edit or escalate/.test(text) && /has not been done for this demonstration/.test(text) && await p.locator('[data-testid=sentinel-never] li').count() === 5 && /fire alarm/.test(text), '');
    await p.getByTestId('sentinel-follow').click(); await p.waitForTimeout(500); const job = ((await p.getByTestId('sentinel-job').innerText().catch(() => '')).match(/ISS-\d{4}/) || [''])[0];
    ok(`MD-${tag}-09`, 'the two failed routes are followed up as one real job; the button is gone once the job exists; no sideways scroll, no console error', !!job && await p.getByTestId('sentinel-follow').count() === 0 && await p.locator('[data-testid=sentinel-failed] li').count() === 2 && await clean(t), `${job} · ${t.errs.join(' | ')}`);
    await t.close();
    const v = await open('#/sentinel', { role: 'visitor', ...O }); await v.page.waitForTimeout(600);
    ok(`MD-${tag}-10`, 'a visitor is refused SENTINEL: the access page, the screen’s code never requested', await v.page.getByTestId('access-page').count() === 1 && v.reqs.filter((u) => /SentinelPage/i.test(u)).length === 0, '');
    await v.close(); }

  // ---------------------------------------------------------------------------------------------- ACCORD
  { const t = await open('#/accord', { role: 'steward', ...O }); const p = t.page; p.setDefaultTimeout(15000); await p.waitForSelector('[data-testid=accord]');
    const cust = await p.locator('main').innerText();
    ok(`MD-${tag}-11`, 'ACCORD as the customer: four items, each with what is withheld; the terms, both organisations (synthetic, fictional), what is never in the capsule, and no download yet', await p.locator('[data-testid=accord-items] > li').count() === 4 && await p.locator('[data-testid^=accord-withheld-]').count() === 4 && /The session token/.test(cust) && /Northstar Industries \(synthetic\)/.test(cust) && /Tidewater Service Partners \(fictional\)/.test(cust) && await p.locator('[data-testid=accord-outside] li').count() === 4 && await p.getByTestId('accord-noaudit').count() === 1, '');
    await p.locator('.kit-seg__opt', { hasText: 'The service provider' }).click(); await settle(p); const prov = await p.locator('main').innerText();
    ok(`MD-${tag}-12`, 'as the service provider (in the address): the same four items with shared lines only; no session token, signalling detail, other room, other job or withheld list; no audit, no withdrawal', await hash(p) === '#/accord?as=provider' && await p.locator('[data-testid=accord-items] > li').count() === 4 && await p.locator('[data-testid^=accord-withheld-]').count() === 0 && !/CS-7f3a|TRK-|SBC-|R-ATL-4-220|R-ATL-4-231|SW-ATL|ISS-0380/.test(prov) && /ISS-0417/.test(prov) && await p.getByTestId('accord-withdraw').count() === 0 && await p.getByTestId('accord-audit').count() === 0, '');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.getByTestId('accord-download').click()]); const file = dl.suggestedFilename(); await p.waitForTimeout(400);
    await go(p, '#/accord'); const audit = await p.getByTestId('accord-audit').innerText().catch(() => '');
    ok(`MD-${tag}-13`, 'the provider downloads the scoped file; the customer’s audit shows the download with the SHA-256 of that file', file === 'CAP-0001-scoped-evidence.json' && /Tidewater Service Partners/.test(audit) && /[0-9a-f]{64}/.test(audit), `${file} · ${audit.slice(0, 160)}`);
    await p.getByTestId('accord-withdraw').click(); await p.waitForTimeout(300); await go(p, '#/accord?as=provider');
    const gone = { status: await p.getByTestId('accord').getAttribute('data-status'), items: await p.locator('[data-testid=accord-items] > li').count(), empty: await p.getByTestId('accord-empty').count(), dl: await p.getByTestId('accord-download').count() };
    await go(p, '#/accord'); await p.getByTestId('accord-restore').click(); await p.waitForTimeout(300); await go(p, '#/accord?as=provider&at=expired');
    const ended = { status: await p.getByTestId('accord').getAttribute('data-status'), items: await p.locator('[data-testid=accord-items] > li').count(), dl: await p.getByTestId('accord-download').count() };
    await go(p, '#/accord?at=expired'); const mine = await p.locator('[data-testid=accord-items] > li').count();
    ok(`MD-${tag}-14`, 'withdrawn, or read after it ends, the provider has nothing to read or download; the customer still reads its own records; no sideways scroll, no console error', gone.status === 'WITHDRAWN' && gone.items === 0 && gone.empty === 1 && gone.dl === 0 && ended.status === 'EXPIRED' && ended.items === 0 && ended.dl === 0 && mine === 4 && await clean(t), `${JSON.stringify(gone)} ${JSON.stringify(ended)} ${mine} · ${t.errs.join(' | ')}`);
    await t.close();
    const x = await open('#/accord', { role: 'exec', ...O }); await x.page.waitForSelector('[data-testid=accord]'); const e = await open('#/accord', { role: 'employee', ...O }); await e.page.waitForTimeout(600);
    ok(`MD-${tag}-15`, 'an executive reads the capsule and cannot withdraw it; an employee gets the access page and the screen’s code is never requested', await x.page.getByTestId('accord-withdraw').count() === 0 && await x.page.locator('[data-testid=accord-items] > li').count() === 4 && await e.page.getByTestId('access-page').count() === 1 && e.reqs.filter((u) => /AccordPage/i.test(u)).length === 0, '');
    await x.close(); await e.close(); }

  // ---------------------------------------------------------------------------------------------- FORGE
  { const t = await open('#/forge', { role: 'designer', ...O }); const p = t.page; p.setDefaultTimeout(15000); await p.waitForSelector('[data-testid=forge-home]');
    const cards = await p.locator('[data-testid^=forge-room-]').count(); await p.getByTestId('forge-open-R-ATL-4-218').click(); await settle(p);
    const st = await attrs(p, '[data-testid=forge-artifacts] > li', 'data-status'); const says = await p.getByTestId('forge-config-says').innerText(); const fp = await p.getByTestId('forge-fingerprint').innerText();
    ok(`MD-${tag}-16`, 'FORGE: three rooms offered; the package of Atlas 4.218 has six artefacts derived from its design record (the bill of materials and paths with gaps), revision 2, a fingerprint', cards === 3 && await hash(p) === '#/forge/room/R-ATL-4-218' && st.join(' ') === 'COMPILED COMPILED_WITH_GAPS COMPILED_WITH_GAPS COMPILED COMPILED COMPILED' && await p.getByTestId('forge-package').getAttribute('data-revision') === '2' && /Fingerprint [0-9a-f]{8}/.test(fp), `${cards} ${st.join(' ')} ${fp}`);
    const cfg = await attrs(p, '[data-testid=forge-configs] li', 'data-status');
    ok(`MD-${tag}-17`, 'every configuration target is rejected, by name, with the reason: no vendor-verified capability pack; nothing is generated', cfg.length > 0 && says.includes(`${cfg.length} of ${cfg.length} configuration targets rejected`) && /There are 0 such packs/.test(says) && cfg.every((s) => s === 'REJECTED'), `${says} · ${cfg.join(' ')}`);
    const text = await p.locator('main').innerText();
    ok(`MD-${tag}-18`, 'the Designer, who prepares the revision, is not offered approval and is told why; the change since the accepted revision and the way back are stated', await p.getByTestId('forge-approve').count() === 0 && /cannot approve it/.test(await p.getByTestId('forge-noapprove').innerText()) && /AS-0112/.test(await p.getByTestId('forge-changes').innerText()) && /Revision 1 is the accepted baseline/.test(text), '');
    await go(p, '#/forge/room/R-NST-2-101');
    ok(`MD-${tag}-19`, 'a room with no equipment designed: FORGE compiles nothing and says so', await p.getByTestId('forge-nodesign').count() === 1 && (await attrs(p, '[data-testid=forge-artifacts] > li', 'data-status')).filter((s) => s === 'NOT_AVAILABLE').length === 5 && await p.getByTestId('forge-approve').count() === 0 && await clean(t), t.errs.join(' | '));
    await t.close();
    const c = await open('#/forge/room/R-ATL-4-218', { role: 'cxeng', ...O }); const cp = c.page; await cp.waitForSelector('[data-testid=forge-package]');
    await cp.getByTestId('forge-approve').click(); await cp.waitForTimeout(300); const ap = await cp.getByTestId('forge-approval').innerText().catch(() => '');
    await cp.reload(); await cp.waitForSelector('[data-testid=forge-package]'); await cp.waitForTimeout(300);
    ok(`MD-${tag}-20`, 'the Commissioning Engineer approves the revision: approved against its fingerprint, still approved after a reload, and the configuration stays rejected', /Approved by the Commissioning Engineer/.test(ap) && /for fingerprint [0-9a-f]{8}/.test(ap) && await cp.getByTestId('forge-package').getAttribute('data-approved') === '1' && /^(\d+) of \1 configuration targets rejected/.test(await cp.getByTestId('forge-config-says').innerText()) && await clean(c), `${ap} · ${c.errs.join(' | ')}`);
    await c.close();
    const e = await open('#/forge', { role: 'exec', ...O }); await e.page.waitForTimeout(600);
    ok(`MD-${tag}-21`, 'an executive is refused FORGE: the access page, the screen’s code never requested', await e.page.getByTestId('access-page').count() === 1 && e.reqs.filter((u) => /ForgePage/i.test(u)).length === 0, '');
    await e.close(); }

  // ---------------------------------------------------------------------------------------------- OMNIPRESENCE
  { const t = await open('#/omnipresence', { role: 'ops', ...O }); const p = t.page; p.setDefaultTimeout(15000); await p.waitForSelector('[data-testid=omni-home]');
    const tags = await attrs(p, '[data-testid=omni-tags] > li', 'data-clean'); const payload = await p.getByTestId('omni-payload-ATL').innerText();
    ok(`MD-${tag}-22`, 'OMNIPRESENCE: six building tags, each a QR code whose content is the demonstration’s address and the building’s key, and nothing else', tags.length === 6 && tags.every((c) => c === '1') && /#\/omnipresence\/b\/ATL$/.test(payload) && !/[?&]/.test(payload) && await p.locator('[data-testid=omni-tags] svg path').count() === 6, `${tags.join('')} ${payload}`);
    await p.getByTestId('omni-scan-ATL').click(); await settle(p);
    const claims = await p.locator('[data-testid=omni-claims] > li').evaluateAll((els) => els.map((e) => `${e.dataset.claim}:${e.dataset.state}`).join(' '));
    const n = await p.locator('[data-testid=omni-rooms] > li').count(); await p.getByTestId('omni-find').fill('4.218'); await p.waitForTimeout(250); const found = await attrs(p, '[data-testid=omni-rooms] > li', 'data-room');
    ok(`MD-${tag}-23`, 'the scan opens the building: four separate claims with presence UNKNOWN, the building’s rooms, and a search that finds one room', await hash(p) === '#/omnipresence/b/ATL' && claims === 'place:DECLARED identity:DECLARED authority:DECLARED presence:UNKNOWN' && n > 5 && found.join(',') === 'R-ATL-4-218', `${claims} ${n} ${found.join(',')}`);
    await p.getByTestId('omni-pick-R-ATL-4-218').click(); await settle(p);
    const no = { allowed: await p.getByTestId('omni-control').getAttribute('data-allowed'), failed: (await p.locator('[data-testid=omni-checks] > li[data-done="0"]').evaluateAll((els) => els.map((e) => e.dataset.check))).join(','), send: await p.getByTestId('omni-send').count() };
    await p.locator('.kit-seg__opt', { hasText: 'Simulated room anchor' }).click(); await settle(p);
    const yes = { hash: await hash(p), allowed: await p.getByTestId('omni-control').getAttribute('data-allowed'), presence: await p.locator('[data-testid=omni-claims] > li[data-claim=presence]').getAttribute('data-state') };
    ok(`MD-${tag}-24`, 'without a presence proof, control from the tag is not offered even to a role that operates rooms; with the simulated room anchor (in the address) every condition holds', no.allowed === '0' && no.failed === 'presence,permission' && no.send === 0 && yes.hash === '#/omnipresence/b/ATL?room=R-ATL-4-218&presence=anchor' && yes.allowed === '1' && yes.presence === 'SIMULATED', `${JSON.stringify(no)} ${JSON.stringify(yes)}`);
    await p.getByTestId('omni-send').click(); await p.waitForTimeout(400); const stages = await attrs(p, '[data-testid=omni-receipt] > li', 'data-stage'); const label = await p.getByTestId('omni-send').innerText();
    ok(`MD-${tag}-25`, 'the room is switched on through its simulated panel and the answer comes in stages: REQUESTED, ACCEPTED, then OBSERVED for each unit; the button now offers off; no sideways scroll, no console error', stages[0] === 'REQUESTED' && stages[1] === 'ACCEPTED' && stages.length > 2 && stages.slice(2).every((s) => s === 'OBSERVED') && /off/.test(label) && /Simulated/.test(await p.getByTestId('omni-receipt').innerText()) && await clean(t), `${stages.join(' ')} · ${label} · ${t.errs.join(' | ')}`);
    await p.getByTestId('omni-send').click(); await p.waitForTimeout(300);   // leave the room as it was found
    await t.close();
    const v = await open('#/omnipresence/b/ATL?room=R-ATL-4-218&presence=anchor', { role: 'visitor', ...O }); await v.page.waitForSelector('[data-testid=omni-building]');
    const vv = { allowed: await v.page.getByTestId('omni-control').getAttribute('data-allowed'), send: await v.page.getByTestId('omni-send').count(), first: (await v.page.locator('[data-testid=omni-checks] > li[data-done="0"]').evaluateAll((els) => els.map((e) => e.dataset.check)))[0], passports: await v.page.locator('[data-testid=omni-rooms] a', { hasText: 'Passport' }).count() };
    ok(`MD-${tag}-26`, 'a visitor with the same address, presence proof included, is offered no control: a tag and a presence proof give no authority; links they may not open are not shown', vv.allowed === '0' && vv.send === 0 && vv.first === 'authority' && await clean(v), JSON.stringify(vv));
    await go(v.page, '#/omnipresence/b/ZZZ'); ok(`MD-${tag}-27`, 'a tag that names no building opens nothing', await v.page.getByTestId('omni-unknown').count() === 1 && await v.page.getByTestId('omni-building').count() === 0, '');
    await v.close(); }

  // ---------------------------------------------------------------------------------------------- the platform map
  { const t = await open('#/families', { role: 'architect', ...O }); await t.page.waitForSelector('[data-testid=families]');
    const links = await t.page.locator('[data-testid^=fam-open-]').count(); const text = await t.page.locator('main').innerText();
    ok(`MD-${tag}-28`, 'the platform map: all seventeen capabilities open for the Product Architect, and none is marked not built', links === 17 && !/Not built yet/.test(text) && await clean(t), `${links}`);
    // added 24 Nov 2026 (design pass): the platform as one figure, the same one the website draws, and the issue as one path
    const fig = await t.page.evaluate(() => { const f = document.querySelector('[data-testid=plate]'); const cols = [...f.querySelectorAll('.pl__cols > li')]; return { heights: cols.map((c) => c.querySelectorAll('ul li').length), open: f.querySelectorAll('[data-testid^=plate-open-]').length, closed: f.dataset.closed, kinds: [f.querySelectorAll('li[data-kind=product]').length, f.querySelectorAll('li[data-kind=capability]').length],
      shared: f.querySelectorAll('.pl__shared li').length, record: /One record/.test(f.querySelector('.pl__record').textContent), gridCols: getComputedStyle(f.querySelector('.pl__cols')).gridTemplateColumns.split(' ').length, bottoms: cols.map((c) => Math.round(c.getBoundingClientRect().bottom)), stops: document.querySelectorAll('.pl-thread > li').length, small: [...f.querySelectorAll('a')].filter((a) => a.getBoundingClientRect().height < 24).length }; });
    ok(`MD-${tag}-29`, `the platform figure: seventeen blocks in six columns (5, 2, 2, 2, 3, 3), nine core and eight further, on six shared things and one record; ${tag === 'desk' ? 'the columns stand level' : 'two columns on a phone'}; the issue is a path of ten stops`, fig.heights.join() === '5,2,2,2,3,3' && fig.open === 17 && fig.closed === '0' && fig.kinds.join() === '9,8' && fig.shared === 6 && fig.record && (tag === 'desk' ? fig.gridCols === 6 && new Set(fig.bottoms).size === 1 : fig.gridCols === 2) && fig.stops === 10 && fig.small === 0, JSON.stringify(fig));
    await t.close();
    const x = await open('#/families', { role: 'exec', ...O }); await x.page.waitForSelector('[data-testid=plate]');
    const ex = await x.page.evaluate(() => { const f = document.querySelector('[data-testid=plate]'); return { closed: Number(f.dataset.closed), marked: f.querySelectorAll('li[data-open="0"]').length, links: f.querySelectorAll('li[data-open="0"] a').length, open: f.querySelectorAll('[data-testid^=plate-open-]').length, legend: f.querySelector('figcaption').textContent, guard: document.querySelectorAll('main a[data-closed]').length }; });
    ok(`MD-${tag}-30`, 'for an executive the figure names every capability and links only the ones an executive may open; the rest are marked and counted in the legend, and the page needed no link closed for it', ex.closed > 0 && ex.marked === ex.closed && ex.links === 0 && ex.open === 17 - ex.closed && new RegExp(`Not open to this role \\(${ex.closed}\\)`).test(ex.legend) && ex.guard === 0 && await clean(x), JSON.stringify(ex));
    await x.close(); }
}
await done();
