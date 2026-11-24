// Changed 23 Nov 2026 (founder decisions E3-D2 and E3-D3): the administration view is the UC / Voice Administrator's (the AV Operations
// Lead no longer reads signalling detail); the estimate is experimental and its cell reads "MOS n.nn"; site scope, FLOW, MissionProof,
// the room's Calling jump and the platform families are new checks.
// Empathia VOICE in the demonstration (Enterprise 3.0 directive 1A; J6B-VOICE), on a desktop and a phone:
//   the CallPath of Atlas 4.218 (six hops; an unobserved hop says UNKNOWN), the quality samples with estimates, the three cases in the
//   address (missing telemetry and stale samples are UNKNOWN, never healthy), the perspectives (a technician without signalling
//   detail, an executive with a summary only), the refusal for a caller (access page, the screen's code never requested), the report
//   from the room that becomes a ServiceHands job, the way into Search Party and back with the case kept, and the website launch.
//   node tests/browser/demo-voice.test.mjs   (after node scripts/build.mjs)
import { harness } from './demo-shell-lib.mjs';
const { open, ok, done } = await harness('demo-voice');
const ROOM = 'R-ATL-4-218'; const CP = `#/voice/callpath/${ROOM}`;
const settle = async (p) => { await p.waitForSelector('main h1', { timeout: 10000 }); await p.waitForTimeout(400); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const hash = (p) => p.evaluate(() => location.hash);
const chunk = (reqs) => reqs.filter((u) => /CallPathPage|voice\/CallPath/i.test(u));

for (const [tag, w, h] of [['desk', 1440, 900], ['phone', 390, 844]]) {
  const t = await open(CP, { role: 'ucadmin', sw: false, w, h, reduced: true }); const p = t.page; p.setDefaultTimeout(15000);
  await p.waitForSelector('[data-testid=voice-callpath]');
  const hops = await p.locator('[data-testid=voice-path] > li').evaluateAll((els) => els.map((e) => `${e.dataset.hop}:${e.dataset.observed}`));
  ok(`VC-${tag}-01`, 'CallPath: the room’s six hops in order, the unobserved WAN edge says UNKNOWN', /CallPath: Atlas 4\.218/.test(await p.locator('main h1').innerText()) && hops.join(' ') === 'endpoint:SIMULATED access:OBSERVED core:SIMULATED wan:UNKNOWN sbc:SIMULATED provider:SIMULATED', hops.join(' '));
  const mos = await p.locator('[data-testid=voice-mos]').allInnerTexts(); const verdict = await p.getByTestId('voice-verdict').getAttribute('data-verdict');
  ok(`VC-${tag}-02`, 'quality: six simulated windows; loss, jitter and delay lead; the estimate is marked experimental and stays between 1.0 and 4.5; three windows miss the declared targets', mos.length === 6 && mos.every((m) => { const n = parseFloat((m.match(/MOS (\d\.\d\d)/) || [])[1]); return n >= 1 && n <= 4.5; }) && /experimental/i.test(await p.getByTestId('voice-exp-note').innerText()) && /EXPERIMENTAL/.test(await p.getByTestId('voice-method-status').textContent())   /* textContent: the method sits in a closed <details> */ && verdict === 'OUTSIDE_POLICY' && await p.locator('[data-testid=voice-samples] tr[data-out="1"]').count() === 3, `${mos.join(' | ')} · ${verdict}`);
  ok(`VC-${tag}-03`, 'administration reads the session token and signalling-side detail; the page says it is a simulation', await p.getByTestId('voice-session').count() === 1 && await p.getByTestId('voice-admin-detail').count() === 3 && /Simulation\./.test(await p.locator('main').innerText()));
  const cells = await p.evaluate(() => { const td = document.querySelector('[data-testid=voice-samples] td'); const wrap = document.querySelector('.vc-samples-wrap'); return { display: getComputedStyle(td).display, inner: wrap.scrollWidth - wrap.clientWidth }; });
  ok(`VC-${tag}-04`, 'no sideways scroll, on the page or inside the samples (a phone reads each window as a card); no console error', await overflow(p) <= 1 && cells.inner <= 1 && (w > 640 || cells.display === 'grid') && t.errs.length === 0, `overflow ${await overflow(p)} · inner ${cells.inner} · ${cells.display} · ${t.errs[0] || ''}`);

  await p.locator('.vc-cases button, .vc-cases [role=radio], .vc-cases label', { hasText: 'Provider telemetry missing' }).first().click(); await p.waitForTimeout(400);
  const m = { hash: await hash(p), verdict: await p.getByTestId('voice-verdict').getAttribute('data-verdict'), provider: await p.locator('[data-hop=provider]').getAttribute('data-observed'), text: await p.locator('main').innerText() };
  ok(`VC-${tag}-05`, 'missing provider telemetry: the case is in the address; the verdict is UNKNOWN, the provider is NOT CONFIGURED, no samples, no hypothesis', m.hash === `${CP}?case=missing` && m.verdict === 'UNKNOWN' && m.provider === 'NOT_CONFIGURED' && await p.getByTestId('voice-nosamples').count() === 1 && await p.getByTestId('voice-nohyp').count() === 1 && /not a healthy result/.test(m.text), `${m.hash} ${m.verdict} ${m.provider}`);
  await p.goBack(); await p.waitForTimeout(400);
  ok(`VC-${tag}-06`, 'Back returns to the degraded case', await hash(p) === CP && await p.getByTestId('voice-verdict').getAttribute('data-verdict') === 'OUTSIDE_POLICY', await hash(p));

  await p.goto(p.url().split('#')[0] + `${CP}?case=stale`); await settle(p);
  const stale = await p.locator('[data-testid=voice-mos]').allInnerTexts();
  ok(`VC-${tag}-07`, 'stale samples: UNKNOWN, shown for the record, no estimate made from them', await p.getByTestId('voice-verdict').getAttribute('data-verdict') === 'UNKNOWN' && stale.length === 6 && stale.every((x) => /no estimate/.test(x)) && await p.getByTestId('voice-nohyp').count() === 1, stale.join(' | '));
  await p.getByTestId('voice-to-flow').click(); await settle(p);
  const fl = { hash: await hash(p), rooms: await p.locator('[data-testid=flow-rooms] li').count(), layers: await p.locator('.fl-layer').count(), unknown: await p.locator('.fl-claims li[data-state=UNKNOWN]').count(), stale: await p.locator('.fl-claims li[data-state=STALE]').count() };
  await p.getByTestId('flow-back-voice').click(); await settle(p);
  ok(`VC-${tag}-16`, 'FLOW from the CallPath: the uplink by layer, three dependent rooms, unknowns said, the stale counters stale; the way back keeps the case', /^#\/flow\/link\/SW-ATL-4A\?from=voice&room=R-ATL-4-218&case=stale$/.test(fl.hash) && fl.rooms === 3 && fl.layers === 4 && fl.unknown >= 3 && fl.stale === 1 && await hash(p) === `${CP}?case=stale` && await overflow(p) <= 1, JSON.stringify(fl));
  await p.getByTestId('voice-to-graph').click(); await settle(p);
  const sp = await hash(p);
  await p.goBack(); await settle(p);
  ok(`VC-${tag}-08`, 'the shared switch opens in Search Party; Back returns to the CallPath with the case kept', /^#\/search\?focus=NetworkNode(:|%3A)SW-ATL-4A/.test(sp) && await hash(p) === `${CP}?case=stale` && await p.getByTestId('voice-verdict').getAttribute('data-verdict') === 'UNKNOWN', `${sp} → ${await hash(p)}`);
  await t.close();

  for (const role of ['service', 'ops']) {
  const s = await open(CP, { role, sw: false, w, h, reduced: true });
  ok(`VC-${tag}-09-${role}`, `${role}: reads the path and the samples without the session token or signalling-side detail (least privilege)`, await s.page.getByTestId('voice-callpath').count() === 1 && await s.page.getByTestId('voice-samples').count() === 1 && await s.page.getByTestId('voice-session').count() === 0 && await s.page.getByTestId('voice-admin-detail').count() === 0 && !/CS-7f3a|DNA-0218|TRK-NORTH/.test(await s.page.locator('main').innerText()));
  await s.close(); }

  const e = await open(CP, { role: 'employee', sw: false, w, h, reduced: true });
  const et = await e.page.locator('main').innerText();
  ok(`VC-${tag}-10`, 'a caller is refused the CallPath: the access page, the screen’s code never requested, nothing from it on the page', await e.page.getByTestId('access-page').count() === 1 && chunk(e.reqs).length === 0 && !/CS-7f3a|SBC-NORTH|packet|jitter/i.test(et), chunk(e.reqs).join(','));
  await e.page.goto(e.page.url().split('#')[0] + `#/voice/report/${ROOM}`); await settle(e.page);
  await e.page.locator('.vc-choice', { hasText: 'Audio breaking up' }).click(); await e.page.fill('.vc-form textarea', 'During the town hall, for about a minute.'); await e.page.getByTestId('voice-submit').click(); await e.page.waitForTimeout(500);
  const receipt = await e.page.getByTestId('voice-receipt').innerText().catch(() => '');
  ok(`VC-${tag}-11`, 'the caller reports from the room: a receipt with the report and the ServiceHands job, their own report listed, no way into the CallPath', /Report VR-0001, job ISS-\d{4}/.test(receipt) && await e.page.locator('[data-testid=voice-mine] li').count() === 1 && await e.page.getByTestId('voice-report-to-callpath').count() === 0 && await overflow(e.page) <= 1 && e.errs.length === 0, `${receipt} · ${e.errs[0] || ''}`);
  await e.close();

  const o = await open(`#/voice/report/${ROOM}`, { role: 'ops', sw: false, w, h, reduced: true });
  await o.page.getByTestId('voice-submit').click(); await o.page.waitForTimeout(500);
  const job = ((await o.page.getByTestId('voice-receipt').innerText().catch(() => '')).match(/ISS-\d{4}/) || [''])[0];
  await o.page.getByTestId('voice-report-to-callpath').click(); await settle(o.page);
  const link = await o.page.getByTestId('voice-to-service').innerText().catch(() => ''); const steps = await o.page.locator('[data-testid=voice-job] .vc-job li').evaluateAll((els) => els.map((e) => `${e.dataset.step}:${e.dataset.done}`).join(' '));
  await o.page.getByTestId('voice-to-service').click(); await settle(o.page);
  ok(`VC-${tag}-12`, 'the report is a real job: the CallPath shows its four steps (reported; not yet assigned, evidenced or verified), and ServiceHands lists it', !!job && link.includes(job) && steps === 'reported:1 assigned:0 evidence:0 verified:0' && /^#\/servicehands/.test(await hash(o.page)) && (await o.page.locator('main').innerText()).includes(job), `${job} · ${link}`);
  await o.close();

  const x = await open('#/voice', { role: 'exec', sw: false, w, h, reduced: true });
  ok(`VC-${tag}-13`, 'an executive reads the overview as a summary, with no way into the CallPath and no session detail', await x.page.getByTestId('voice-home').getAttribute('data-view') === 'summary' && await x.page.getByTestId('voice-summary').count() === 1 && await x.page.getByTestId('voice-open-callpath').count() === 0 && await x.page.locator('main a[href^="#/voice/callpath"]').count() === 0 && !/CS-7f3a/.test(await x.page.locator('main').innerText()) && await x.page.locator('[data-testid=voice-adapters] tbody tr').count() === 7);
  await x.close();

  const n = await open('#/voice/callpath/R-ATL-4-220', { role: 'ops', sw: false, w, h, reduced: true });
  ok(`VC-${tag}-14`, 'a room without a call-flow record says Not configured, not healthy', await n.page.getByTestId('voice-noflow').count() === 1 && /Not configured/.test(await n.page.locator('main').innerText()));
  await n.close();

  const l = await open(`${CP}?from=site&li=module-voice&back=%2Fvoice`, { role: 'visitor', sw: false, w, h, reduced: true });
  const back = await l.page.getByTestId('launch-back').getAttribute('href').catch(() => null);
  ok(`VC-${tag}-15`, 'the website’s “Open the CallPath” launch lands on the CallPath as the UC / Voice Administrator, with the way back to /voice', await l.page.getByTestId('launch-strip').count() === 1 && /UC \/ Voice Administrator/.test(await l.page.getByTestId('launch-strip').innerText()) && await l.page.getByTestId('voice-callpath').count() === 1 && await l.page.getByTestId('voice-session').count() === 1 && !!back && /\/voice$/.test(back), String(back));
  await l.close();

  const OTHER = '#/voice/callpath/R-MER-1-140';
  for (const role of ['ucadmin', 'service']) { const r = await open(OTHER, { role, sw: false, w, h, reduced: true });
    ok(`VC-${tag}-17-${role}`, `${role}: a room on another site is refused by site scope: the access page, the screen’s code never requested, nothing of the path shown`, await r.page.getByTestId('access-page').count() === 1 && chunk(r.reqs).length === 0 && !/PA-0012|SBC-NORTH|UCP-A/.test(await r.page.locator('main').innerText()), chunk(r.reqs).join(',')); await r.close(); }
  const a = await open(OTHER, { role: 'architect', sw: false, w, h, reduced: true });
  const oh = await a.page.locator('[data-testid=voice-path] > li').evaluateAll((els) => els.map((e) => e.dataset.observed));
  ok(`VC-${tag}-18`, 'a tenant-wide role opens the other site’s CallPath: configured only, every hop’s observation UNKNOWN, no cases, no samples, no hypothesis', await a.page.getByTestId('voice-configured-only').count() === 1 && oh.length === 5 && oh.every((x) => x === 'UNKNOWN') && await a.page.locator('.vc-cases').count() === 0 && await a.page.getByTestId('voice-samples').count() === 0 && await a.page.getByTestId('voice-verdict').getAttribute('data-verdict') === 'UNKNOWN', oh.join(' '));
  await a.close();

  const ms = await open('#/missionproof', { role: 'ops', sw: false, w, h, reduced: true }); const mp = ms.page;
  const dep = (id) => mp.locator(`[data-dep=${id}]`).getAttribute('data-ready');
  const m0 = { overall: await mp.getByTestId('mission').getAttribute('data-overall'), host: await dep('host'), calling: await dep('calling'), uplink: await dep('uplink'), rehearsal: await dep('rehearsal') };
  await mp.locator('.vc-cases button, .vc-cases [role=radio], .vc-cases label', { hasText: 'After the repair' }).first().click(); await mp.waitForTimeout(400);
  const m1 = { hash: await hash(mp), calling: await dep('calling'), uplink: await dep('uplink'), delta: await mp.getByTestId('mission-delta').innerText() };
  await mp.getByTestId('mission-rehearse').click(); await mp.waitForTimeout(300);
  const m2 = { rehearsal: await dep('rehearsal'), overall: await mp.getByTestId('mission').getAttribute('data-overall') };
  await mp.getByTestId('mission-open-calling').click(); await settle(mp); const toCp = await hash(mp);
  ok(`VC-${tag}-19`, 'MissionProof: the town hall reads its dependencies from records (host room not accepted, calling and uplink at risk, no rehearsal); after the repair with no verified job calling is UNKNOWN, never ready; a rehearsal is recorded; the mission stays not ready; the case travels to the CallPath', m0.overall === 'NOT_READY' && m0.host === 'NOT_READY' && m0.calling === 'AT_RISK' && m0.uplink === 'AT_RISK' && m0.rehearsal === 'NOT_READY' && m1.hash === '#/missionproof?case=retest' && m1.calling === 'UNKNOWN' && m1.uplink === 'READY' && /read differently/.test(m1.delta) && m2.rehearsal === 'READY' && m2.overall === 'NOT_READY' && toCp === `${CP}?case=retest` && ms.errs.length === 0, JSON.stringify({ m0, m1, m2, toCp, e: ms.errs[0] }));
  await ms.close();
  const mx = await open('#/missionproof', { role: 'exec', sw: false, w, h, reduced: true });
  ok(`VC-${tag}-20`, 'an executive reads the mission and cannot record a rehearsal or open the CallPath from it', await mx.page.getByTestId('mission').count() === 1 && await mx.page.getByTestId('mission-rehearse').count() === 0 && await mx.page.getByTestId('mission-open-calling').count() === 0 && await overflow(mx.page) <= 1);
  await mx.close();

  const rj = await open(`#/campus/ATL/4/${ROOM}`, { role: 'ucadmin', sw: false, w, h, reduced: true });
  const jump = await rj.page.getByTestId('room-jump-voice').getAttribute('href').catch(() => null);
  const rje = await open(`#/campus/ATL/4/${ROOM}`, { role: 'employee', sw: false, w, h, reduced: true });
  ok(`VC-${tag}-21`, 'the room’s own page offers “Calling” to a role that may open its CallPath, and not to a caller', jump === CP && await rje.page.getByTestId('room-jump-voice').count() === 0, String(jump));
  await rj.close(); await rje.close();

  // 24 Nov 2026: the device passport (founder's Day 2 order, item 2). The asset that is the room's calling endpoint links to its CallPath.
  const al = await open('#/v25/asset?a=AS-0108', { role: 'ops', sw: false, w, h, reduced: true }); await al.page.getByTestId('asset-life').waitFor();
  const alHref = await al.page.locator('[data-testid=al-calling] a').getAttribute('href').catch(() => null);
  await al.page.goto(al.page.url().split('#')[0] + '#/v25/asset?a=AS-0101'); await al.page.waitForFunction(() => /AS-0101/.test(document.querySelector('main')?.innerText || '')); await al.page.waitForTimeout(300); const alOther = await al.page.getByTestId('al-calling').count();
  const ald = await open('#/v25/asset?a=AS-0108', { role: 'designer', sw: false, w, h, reduced: true }); await ald.page.getByTestId('asset-life').waitFor(); await ald.page.waitForTimeout(300);
  ok(`VC-${tag}-24`, 'the asset page of the room’s calling endpoint links to that room’s CallPath for a role that may open it; another unit has no such link; a role that may not open the CallPath is not offered it', alHref === CP && alOther === 0 && await ald.page.getByTestId('al-calling').count() === 0 && await overflow(al.page) <= 1 && al.errs.length === 0, `${alHref} ${alOther} ${al.errs.join(' | ')}`);
  await al.close(); await ald.close();

  const f = await open('#/families', { role: 'ucadmin', sw: false, w, h, reduced: true });
  const fam = { caps: await f.page.locator('[data-cap]').count(), fams: await f.page.locator('[data-family]').count(), voice: await f.page.getByTestId('fam-open-voice').count(), flow: await f.page.getByTestId('fam-open-flow').count(), mission: await f.page.getByTestId('fam-open-missionproof').count(), prism: await f.page.getByTestId('fam-open-prism').count(), omni: await f.page.getByTestId('fam-open-omnipresence').count(), sh: await f.page.getByTestId('fam-open-servicehands').count(), notBuilt: (await f.page.locator('main').innerText()).split('Not built yet').length - 1 };
  ok(`VC-${tag}-22`, 'the platform families: six families, seventeen capabilities, none marked not built (changed 24 Nov 2026: the last five are built); VOICE, FLOW, MissionProof and OMNIPRESENCE open; a capability or product this role may not open (PRISM, ServiceHands) has no link', fam.caps === 17 && fam.fams === 6 && fam.voice === 1 && fam.flow === 1 && fam.mission === 1 && fam.omni === 1 && fam.prism === 0 && fam.sh === 0 && fam.notBuilt === 0 && await overflow(f.page) <= 1 && f.errs.length === 0, JSON.stringify(fam));
  await f.page.goto(f.page.url().split('#')[0] + '#/home'); await settle(f.page);
  ok(`VC-${tag}-23`, 'the UC / Voice Administrator has a home, with no console error and no sideways scroll', (await f.page.locator('main h1').innerText()).length > 0 && f.errs.length === 0 && await overflow(f.page) <= 1, `${await f.page.locator('main h1').innerText()} · ${f.errs[0] || ''}`);
  await f.close();

  // 24 Nov 2026: the two links the founder asked for on 23 Nov 19:22 ("repair the remaining Assurance and APEX links"). One browser,
  // so what one person records is what the next one reads. The whole repair, through ServiceHands, is walked in demo-journeys (J6BR).
  const swap = async (page, role, to) => { await page.evaluate((r) => localStorage.setItem('empathia.demo.perspective', r), role); await page.goto(page.url().split('#')[0] + to); await page.reload(); await settle(page); };
  const AS = `#/assurance/room/${ROOM}`; const as = await open(AS, { role: 'ops', sw: false, w, h, reduced: true }); const ap = as.page; ap.setDefaultTimeout(15000); await settle(ap);
  const a0 = { btn: await ap.getByTestId('as-run-btn').count(), drift: await ap.getByTestId('as-drift').count(), state: await ap.getByTestId('as-calling-says').getAttribute('data-state') };
  await swap(ap, 'cxeng', AS); await ap.getByTestId('as-run-btn').click(); await ap.waitForTimeout(300);
  const a1 = { says: await ap.getByTestId('as-run-says').innerText(), rows: await ap.getByTestId('as-drift-row').count(), cleared: await ap.getByTestId('as-drift-cleared').count(), disabled: await ap.getByTestId('as-run-btn').isDisabled(), over: await overflow(ap) };
  await ap.reload(); await settle(ap); await ap.getByTestId('as-run-btn').click(); await ap.waitForTimeout(300);
  const a2 = { says: await ap.getByTestId('as-run-says').innerText(), rows: await ap.getByTestId('as-drift-row').count(), cleared: await ap.getByTestId('as-drift-cleared').count() };
  await swap(ap, 'ops', AS);
  const a3 = { btn: await ap.getByTestId('as-run-btn').count(), rows: await ap.getByTestId('as-drift-row').count(), row: (await ap.getByTestId('as-drift-opened').first().innerText().catch(() => '')).slice(0, 160) };
  ok(`VC-${tag}-25`, 'an Assurance run by the commissioning engineer writes one drift record for calling, read from VOICE and labelled simulated; a second run with nothing changed writes no second record and clears nothing; the operations lead reads the record and is not offered the run', a0.btn === 0 && a0.drift === 0 && a0.state === 'OUTSIDE' && /It wrote drift record DR-0001/.test(a1.says) && a1.rows === 1 && a1.cleared === 0 && a1.disabled && a1.over <= 1 && /DR-0001 still stands/.test(a2.says) && a2.rows === 1 && a2.cleared === 0 && a3.btn === 0 && a3.rows === 1 && /VOICE \(simulated\)/.test(a3.row) && as.errs.length === 0, JSON.stringify({ a0, a1, a2, a3, e: as.errs[0] }));

  const APX = '#/v25/apex?case=APX-001'; const rec = () => ap.getByRole('button', { name: /^Record VH-0001 on this case$/ });
  await swap(ap, 'service', APX); await ap.getByTestId('apex-calling').waitFor();
  const x0 = { record: await rec().count(), recorded: await ap.getByTestId('apex-voice-recorded').count() };
  await swap(ap, 'svcmgr', APX); await ap.getByTestId('apex-calling').waitFor(); const before = await ap.getByTestId('apex-case').innerText();
  await rec().click(); await ap.waitForTimeout(300); const after = await ap.getByTestId('apex-case').innerText();
  const x1 = { recorded: await ap.getByTestId('apex-voice-recorded').count(), again: await rec().count(), from: await ap.getByTestId('hyp-from').innerText().catch(() => ''), listed: /recorded from VOICE/.test(after) && !/recorded from VOICE/.test(before), caveat: /not a root cause/.test(after), over: await overflow(ap) };
  // 24 Nov 2026, design pass (from captured screens): the layers kept their text in the middle of a card stretched by the network layer's
  // three citations, and the hypothesis's evidence was one sentence joined by semicolons.
  const x3 = await ap.evaluate(() => { const L = [...document.querySelectorAll('[data-testid=layers] .apex__layer')].map((c) => ({ card: c.getBoundingClientRect(), head: c.querySelector('b').getBoundingClientRect(), next: c.children[1].getBoundingClientRect() }));
    const ev = [...document.querySelectorAll('[data-testid=hypothesis] .ui-facts > div')].find((d) => d.querySelector('dt')?.textContent === 'Evidence cited');
    return { layers: L.length, low: L.filter((x) => x.head.top - x.card.top > 16 || x.head.height > 44 || x.next.top - x.head.top > 56).length, cols: new Set(L.map((x) => Math.round(x.card.left))).size, tallest: Math.round(Math.max(...L.map((x) => x.card.height))), evidence: ev ? ev.querySelectorAll('li').length : -1 }; });
  ok(`VC-${tag}-27`, 'the APEX case reads whole: each of the seven layers starts at the top of its card, its text directly under its name; on a phone they are one column; the recorded hypothesis lists its three citations one to a line', x3.layers === 7 && x3.low === 0 && (w > 520 ? x3.cols >= 3 : x3.cols === 1) && x3.evidence === 3, JSON.stringify(x3));
  await swap(ap, 'ucadmin', CP);
  const x2 = await ap.getByTestId('voice-hyp-recorded').innerText().catch(() => '');
  ok(`VC-${tag}-26`, 'APEX records VOICE’s hypothesis on a case only when someone who may act on the case asks: the technician reads the case and is not offered it; the service manager records VH-0001 once, with where it came from and that it is not a root cause; the CallPath then names the case', x0.record === 0 && x0.recorded === 0 && x1.recorded === 1 && x1.again === 0 && /VOICE VH-0001/.test(x1.from) && x1.listed && x1.caveat && x1.over <= 1 && /Recorded on APEX case APX-001/.test(x2) && as.errs.length === 0, JSON.stringify({ x0, x1, x2, e: as.errs[0] }));
  await as.close();
}
await done();
