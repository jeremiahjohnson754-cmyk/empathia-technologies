// Empathia VOICE in the demonstration (Enterprise 3.0 directive 1A; J6B-VOICE steps 1 to 4), on a desktop and a phone:
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
  const t = await open(CP, { role: 'architect', sw: false, w, h, reduced: true }); const p = t.page; p.setDefaultTimeout(15000);
  await p.waitForSelector('[data-testid=voice-callpath]');
  const hops = await p.locator('[data-testid=voice-path] > li').evaluateAll((els) => els.map((e) => `${e.dataset.hop}:${e.dataset.observed}`));
  ok(`VC-${tag}-01`, 'CallPath: the room’s six hops in order, the unobserved WAN edge says UNKNOWN', /CallPath: Atlas 4\.218/.test(await p.locator('main h1').innerText()) && hops.join(' ') === 'endpoint:SIMULATED access:OBSERVED core:SIMULATED wan:UNKNOWN sbc:SIMULATED provider:SIMULATED', hops.join(' '));
  const mos = await p.locator('[data-testid=voice-mos]').allInnerTexts(); const verdict = await p.getByTestId('voice-verdict').getAttribute('data-verdict');
  ok(`VC-${tag}-02`, 'quality: six simulated windows, each with an estimate between 1.0 and 4.5; three miss the declared targets', mos.length === 6 && mos.every((m) => { const n = parseFloat(m); return n >= 1 && n <= 4.5; }) && verdict === 'OUTSIDE_POLICY' && await p.locator('[data-testid=voice-samples] tr[data-out="1"]').count() === 3, `${mos.join(' | ')} · ${verdict}`);
  ok(`VC-${tag}-03`, 'administration reads the session token and signalling-side detail; the page says it is a simulation', await p.getByTestId('voice-session').count() === 1 && await p.getByTestId('voice-admin-detail').count() === 3 && /Simulation\./.test(await p.locator('main').innerText()));
  ok(`VC-${tag}-04`, 'no sideways scroll and no console error', await overflow(p) <= 1 && t.errs.length === 0, `overflow ${await overflow(p)} · ${t.errs[0] || ''}`);

  await p.locator('.vc-cases button, .vc-cases [role=radio], .vc-cases label', { hasText: 'Provider telemetry missing' }).first().click(); await p.waitForTimeout(400);
  const m = { hash: await hash(p), verdict: await p.getByTestId('voice-verdict').getAttribute('data-verdict'), provider: await p.locator('[data-hop=provider]').getAttribute('data-observed'), text: await p.locator('main').innerText() };
  ok(`VC-${tag}-05`, 'missing provider telemetry: the case is in the address; the verdict is UNKNOWN, the provider is NOT CONFIGURED, no samples, no hypothesis', m.hash === `${CP}?case=missing` && m.verdict === 'UNKNOWN' && m.provider === 'NOT_CONFIGURED' && await p.getByTestId('voice-nosamples').count() === 1 && await p.getByTestId('voice-nohyp').count() === 1 && /not a healthy result/.test(m.text), `${m.hash} ${m.verdict} ${m.provider}`);
  await p.goBack(); await p.waitForTimeout(400);
  ok(`VC-${tag}-06`, 'Back returns to the degraded case', await hash(p) === CP && await p.getByTestId('voice-verdict').getAttribute('data-verdict') === 'OUTSIDE_POLICY', await hash(p));

  await p.goto(p.url().split('#')[0] + `${CP}?case=stale`); await settle(p);
  const stale = await p.locator('[data-testid=voice-mos]').allInnerTexts();
  ok(`VC-${tag}-07`, 'stale samples: UNKNOWN, shown for the record, no estimate made from them', await p.getByTestId('voice-verdict').getAttribute('data-verdict') === 'UNKNOWN' && stale.length === 6 && stale.every((x) => /no estimate/.test(x)) && await p.getByTestId('voice-nohyp').count() === 1, stale.join(' | '));
  await p.getByTestId('voice-to-graph').click(); await settle(p);
  const sp = await hash(p);
  await p.goBack(); await settle(p);
  ok(`VC-${tag}-08`, 'the shared switch opens in Search Party; Back returns to the CallPath with the case kept', /^#\/search\?focus=NetworkNode(:|%3A)SW-ATL-4A/.test(sp) && await hash(p) === `${CP}?case=stale` && await p.getByTestId('voice-verdict').getAttribute('data-verdict') === 'UNKNOWN', `${sp} → ${await hash(p)}`);
  await t.close();

  const s = await open(CP, { role: 'service', sw: false, w, h, reduced: true });
  ok(`VC-${tag}-09`, 'a technician reads the path and the samples without the session token or signalling-side detail', await s.page.getByTestId('voice-callpath').count() === 1 && await s.page.getByTestId('voice-samples').count() === 1 && await s.page.getByTestId('voice-session').count() === 0 && await s.page.getByTestId('voice-admin-detail').count() === 0 && !/CS-7f3a|DNA-0218|TRK-NORTH/.test(await s.page.locator('main').innerText()));
  await s.close();

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
  const link = await o.page.getByTestId('voice-to-service').innerText().catch(() => '');
  await o.page.getByTestId('voice-to-service').click(); await settle(o.page);
  ok(`VC-${tag}-12`, 'the report is a real job: the CallPath names it, and ServiceHands lists it for the room', !!job && link.includes(job) && /^#\/servicehands/.test(await hash(o.page)) && (await o.page.locator('main').innerText()).includes(job), `${job} · ${link}`);
  await o.close();

  const x = await open('#/voice', { role: 'exec', sw: false, w, h, reduced: true });
  ok(`VC-${tag}-13`, 'an executive reads the overview as a summary, with no way into the CallPath and no session detail', await x.page.getByTestId('voice-home').getAttribute('data-view') === 'summary' && await x.page.getByTestId('voice-summary').count() === 1 && await x.page.getByTestId('voice-open-callpath').count() === 0 && await x.page.locator('main a[href^="#/voice/callpath"]').count() === 0 && !/CS-7f3a/.test(await x.page.locator('main').innerText()) && await x.page.locator('[data-testid=voice-adapters] tbody tr').count() === 7);
  await x.close();

  const n = await open('#/voice/callpath/R-ATL-4-220', { role: 'ops', sw: false, w, h, reduced: true });
  ok(`VC-${tag}-14`, 'a room without a call-flow record says Not configured, not healthy', await n.page.getByTestId('voice-noflow').count() === 1 && /Not configured/.test(await n.page.locator('main').innerText()));
  await n.close();

  const l = await open(`${CP}?from=site&li=module-voice&back=%2Fvoice`, { role: 'visitor', sw: false, w, h, reduced: true });
  const back = await l.page.getByTestId('launch-back').getAttribute('href').catch(() => null);
  ok(`VC-${tag}-15`, 'the website’s “Open the CallPath” launch lands on the CallPath as the AV Operations Lead, with the way back to /voice', await l.page.getByTestId('launch-strip').count() === 1 && await l.page.getByTestId('voice-callpath').count() === 1 && !!back && /\/voice$/.test(back), String(back));
  await l.close();
}
await done();
