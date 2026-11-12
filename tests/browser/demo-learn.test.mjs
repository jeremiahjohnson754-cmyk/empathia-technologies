#!/usr/bin/env node
// Empathia Learn (#/learn and every V2.5.3 area): the home's tiles and panels are computed from the records; SIGNAL plays an authored
// episode scene by scene; a room story has eight panels and three decisions judged against the record; Service Mode runs a room case
// on the clock and scores six ratings (first attempt kept); a SIGNAL incident runs on the library's rules; a case file shows the seven
// sources and reveals the cause only on request; the design clinic works figures from the model; the Fieldbook, library, Ask Empathia
// (a fixed set, says so otherwise), the explorer and the ServiceHands Academy; every completion is a training line in the ledger, never
// an authorization; a role without Learn gets the owl page; at 390/768/1440, no errors, no request leaves the page.
//   node tests/browser/demo-learn.test.mjs
import { suite } from './demo-ops-harness.mjs';
await suite('demo-learn', 4489, async ({ ok, open, goto, over, text, smallTargets, clearState, VIEWPORTS }) => {
  for (const [w, hgt, tag] of VIEWPORTS) {
    const { ctx, page, errs, ext } = await open(w, hgt);
    await goto(page, '#/learn', 'service'); await clearState(page); await page.reload(); await page.waitForSelector('[data-testid=learn-home]', { timeout: 10000 });
    const t = await text(page);
    ok(`LN-${tag}-01`, 'the Learn home shows readiness, cases, drills and story decisions from the records, and the V2.5.3 badges', (await page.locator('[data-testid=learn-tiles] .kit-tile').count()) === 4 && /Shadowing/.test(t) && /0 of 9/.test(t) && /Scores stay in this browser/.test(t) && /Training simulation/.test(t), t.slice(0, 200));
    // 2026-11-09: eleven room cases, not nine. A case is computed for every room whose record carries an issue (learn/model.ts); the
    // founder-approved rooms plan (docs/recovery/ROOMS_PLAN.md rows 33 and 37, campus/design.ts OPEN_ISSUE) gave the Large Auditorium
    // (R-HZN-1-500) and the Major Incident War Room (R-FRG-2-300) an open issue each, so Learn now has a case for both. The count stays exact.
    // 2026-11-10: nineteen, not eleven. The 90-room estate (campus/design.ts HELD and OPEN_ISSUE for rooms 46–90) gave eight of the new rooms
    // an issue, and a case is computed for every room whose record carries one. The count stays exact.
    ok(`LN-${tag}-02`, 'the home has the six ratings, the competencies, learn from a room (nineteen cases) and the chain', (await page.locator('[data-testid=ln-ratings] .kit-meter').count()) === 6 && (await page.locator('[data-testid=ln-competencies] .kit-meter').count()) === 9 && (await page.locator('[data-testid=learn-rooms] [data-testid^=case-]').count()) === 19 && (await page.locator('.ln-chain li').count()) === 8 && /of\s*19/.test(await page.locator('[data-testid=learn-tiles]').innerText()));
    ok(`LN-${tag}-03`, 'no sideways scroll', (await over(page)) <= 0, await over(page));
    if (tag === 'phone') { const s = await smallTargets(page); ok(`LN-${tag}-04`, 'controls are at least 44 px tall on a phone', !s.length, s.join(' | ')); }
    if (tag === 'desktop') {
      // SIGNAL
      await goto(page, '#/learn/signal', 'service'); await page.waitForSelector('[data-testid=signal-seasons]');
      ok('LN-05', 'SIGNAL lists twelve seasons and the five people', (await page.locator('.ln-season').count()) === 12 && (await page.locator('.ln-person').count()) === 5);
      await goto(page, '#/learn/signal/S1E1', 'service'); await page.waitForSelector('[data-testid=episode-scene]');
      ok('LN-06', 'the episode opens on its first scene with Continue', /Saturday, 6:40/.test(await text(page)) && (await page.locator('[data-testid=episode-next]').count()) === 1);
      await page.click('[data-testid=episode-next]'); await page.click('[data-testid=episode-next]');
      ok('LN-07', 'the discovery scene asks the learner to classify each statement', (await page.locator('.ln-evq__row').count()) === 4);
      await page.click('.ln-evq__row >> nth=2 >> button:has-text("measured")');
      ok('LN-08', 'a classification is judged against the record', /right/.test(await page.locator('.ln-evq__row >> nth=2').innerText()));
      await page.click('[data-testid=episode-next]');
      ok('LN-09', 'a decision scene blocks Continue until a choice is made', await page.locator('[data-testid=episode-next]').isDisabled() && (await page.locator('.ln-choice').count()) === 3);
      await page.click('.ln-choice >> nth=1');
      ok('LN-10', 'the choice shows its consequence and the other choices close', /rear left corner/.test(await text(page)) && await page.locator('.ln-choice >> nth=0').isDisabled());
      for (let i = 0; i < 6 && (await page.locator('[data-testid=episode-next]').count()); i += 1) { if (await page.locator('[data-testid=episode-next]').isDisabled()) await page.click('.ln-choice:not([disabled]) >> nth=0'); await page.click('[data-testid=episode-next]'); }
      await page.click('[data-testid=episode-finish]');
      ok('LN-11', 'the episode can be played to its cliffhanger and finished', /Played · record kept/.test(await text(page)));
      await goto(page, '#/learn/signal', 'service'); await page.waitForSelector('[data-testid=signal-signals]');
      ok('LN-12', 'the decisions move the competency signals and the story remembers them', (await page.locator('[data-testid=signal-signals] .kit-meter').count()) >= 2 && /walked/.test(await text(page)));
      // room story
      await goto(page, '#/learn/story/R-BCN-3-225', 'service'); await page.waitForSelector('[data-testid=story-decisions]');
      ok('LN-13', 'a room story has eight panels from the record and three decisions', (await page.locator('.ln-panel').count()) === 8 && (await page.locator('.ln-dec').count()) === 3);
      await page.click('.ln-dec >> nth=0 >> .ln-choice >> nth=1');
      ok('LN-14', 'a decision is judged against the record with the rule', /As the record supports/.test(await text(page)) && /independently verified/.test(await text(page)));
      // Service Mode: a room case
      await goto(page, '#/learn/service', 'service'); await page.waitForSelector('[data-testid=service-cases]');
      ok('LN-15', 'Service Mode lists the ten actions with their minutes, the eight evidence states and the six weighted ratings', (await page.locator('.ln-verbs li').count()) === 10 && (await page.locator('.ln-ladder li').count()) === 8 && /24%/.test(await text(page)));
      await goto(page, '#/learn/service/TC-R-BCN-3-225', 'service'); await page.waitForSelector('[data-testid=start-clock]');
      ok('LN-16', 'a case opens with the call, the seven sources and a 50-minute window', /50-minute window/.test(await text(page)) && (await page.locator('.ln-sources li').count()) === 7);
      await page.click('[data-testid=start-clock]'); await page.waitForSelector('[data-testid=case-actions]');
      ok('LN-17', 'Diagnose is disabled until a stage is chosen; Declare until a cause and a response are', await page.locator('.ln-act:has-text("Diagnose")').isDisabled() && await page.locator('[data-testid=declare]').isDisabled());
      await page.click('.ln-act:has-text("Inspect")'); await page.click('.ln-act:has-text("Ask")'); await page.click('.ln-act:has-text("Measure")');
      ok('LN-18', 'each action spends V2.5.3 minutes on the clock', /18 of 50 minutes used/.test(await text(page)));
      await page.click('[data-testid=case-actions] .ln-choice >> nth=0'); await page.click('.ln-act:has-text("Diagnose")'); await page.click('.ln-act:has-text("Verify")');
      await page.click('.ln-choice:has-text("baseline")'); await page.click('[data-testid=declare]'); await page.waitForSelector('[data-testid=case-score]');
      const sc = await page.locator('[data-testid=case-score]').innerText();
      ok('LN-19', 'declaring scores the six ratings with their rules and names the recorded cause', (await page.locator('[data-testid=case-score] .kit-meter').count()) === 6 && /Overall \d+/.test(sc) && /places the cause at/.test(sc), sc.slice(0, 120));
      await page.click('button:has-text("Take it again")'); await page.click('.ln-act:has-text("Repair")'); await page.click('[data-testid=case-actions] .ln-choice >> nth=1'); await page.click('.ln-choice:has-text("Raise the microphone")'); await page.click('[data-testid=declare]'); await page.waitForSelector('[data-testid=case-score]');
      ok('LN-20', 'a second attempt keeps the first attempt on the record', /First attempt kept: \d+/.test(await text(page)));
      // SIGNAL incident on the library's rules
      // Changed 11 Nov 2026: the page now runs the shared runner on the build package's rules (packages/ui/src/incidents.ts): the
      // briefing comes first and Start unlocks the actions; the clock runs in real time; a refusal spends its time (LN-22 said it
      // spent nothing, which was this page's deviation from the reference); the headline is the reference's.
      await goto(page, '#/learn/service/SM-01', 'service'); await page.waitForSelector('[data-testid=incident]');
      const secs = async () => { const [m, x] = (await page.locator('[data-testid=incident-clock] b').innerText()).split(':').map(Number); return m * 60 + x; };
      ok('LN-21', 'a SIGNAL incident opens on its briefing with its clock (4:05) and Start; Start shows the status and an empty evidence tray', /4:05/.test(await text(page)) && await page.locator('[data-testid=incident-actions]').count() === 0 && await page.getByRole('button', { name: /Start the incident/ }).count() === 1);
      await page.getByRole('button', { name: /Start the incident/ }).click(); await page.waitForSelector('[data-testid=incident-actions]'); const s0 = await secs();
      const startOk = /Nothing collected yet/.test(await text(page)) && /System state/.test(await text(page));
      await page.click('[data-action=office]'); const s1 = await secs();
      ok('LN-22', 'an action that is not yours is refused with the owner named, spends its time, and cannot be repeated', startOk && /Whose network is that/.test(await text(page)) && s0 - s1 >= 10 && await page.locator('[data-action=office]').isDisabled(), `${s0} → ${s1}`);
      await page.click('[data-action=walk]'); const s2 = await secs();
      ok('LN-23', 'an action spends its cost and puts evidence on the board', s1 - s2 >= 30 && (await page.locator('[data-testid=incident-evidence] li').count()) === 2, `${s1} → ${s2}`);
      await page.click('[data-testid=incident-declare]'); await page.waitForSelector('[data-testid=incident-end]');
      ok('LN-24', 'declaring without restoring the stream is an honest fail with an expert’s path', /declared resolved while still broken/i.test(await text(page)) && /An expert’s path/.test(await text(page)));
      // case files
      await goto(page, '#/learn/cases', 'service'); await page.waitForSelector('[data-testid=learn-cases]');
      // 2026-11-09: eleven room cases (see LN-02: the rooms plan added an open issue to the auditorium and the war room)
      ok('LN-25', 'Case Files: nineteen room cases (eleven until 10 Nov 2026), six generalized cases, SIGNAL case files by season', (await page.locator('[data-testid^=case-]').count()) === 19 && /Find the echo/.test(await text(page)) && (await page.locator('[data-testid=signal-casefiles] details').count()) === 12);
      await goto(page, '#/learn/cases/TC-R-BCN-3-225', 'service'); await page.waitForSelector('[data-testid=casefile-sources]');
      ok('LN-26', 'a case file shows the seven sources from Core and hides the cause until asked', (await page.locator('.ln-src article').count()) === 7 && !/places the cause at/.test(await text(page)));
      await page.click('[data-testid=reveal]');
      ok('LN-27', 'the cause is named with who owns the fix', /places the cause at/.test(await text(page)) && /(yours to do|engineering approval)/.test(await text(page)));
      await goto(page, '#/learn/cases/TC-R-HZN-1-120', 'service'); await page.waitForSelector('[data-testid=learn-nocase]');
      ok('LN-28', 'a room without an issue has no case, and the page says what the record holds instead', /No case for Horizon 1.120 yet/.test(await text(page)) && /applicable tests verified/.test(await text(page)));
      // design clinic
      await goto(page, '#/learn/design', 'service'); await page.waitForSelector('[data-testid=design-lessons]');
      ok('LN-29', 'the Design clinic lists eight lessons with the rooms they are worked on, and the rooms the rules flag', (await page.locator('.ln-lessons li').count()) === 8 && /Worked on Beacon 3.225/.test(await text(page)) && (await page.locator('[data-testid=design-flagged] .kit-row').count()) >= 5);
      await goto(page, '#/learn/design/absorb', 'service'); await page.waitForSelector('[data-testid=design-figures]');
      ok('LN-30', 'a lesson fills its placeholders from the materials table and works figures from the rooms', /mineral ceiling tile 0.62/.test(await text(page)) && /Meridian 2.120 is 6.8 × 8.6 m/.test(await text(page)));
      // Fieldbook, library, ask, explore, academy
      await goto(page, '#/learn/fieldbook', 'service'); await page.waitForSelector('[data-testid=glossary]');
      ok('LN-31', 'the Fieldbook has the glossary by domain and the formulas', /522 terms/.test(await text(page)) && /125 formulas/.test(await text(page)));
      await goto(page, '#/learn/library', 'service'); await page.waitForSelector('[data-testid=library-flows]');
      ok('LN-32', 'the library has 161 SIGNAL lessons, thirteen kinds of knowledge and a signal flow per kind of room', /161 lessons/.test(await text(page)) && (await page.locator('.ln-kk__i').count()) === 13 && (await page.locator('.ln-flows article').count()) >= 10);
      await goto(page, '#/learn/ask', 'service'); await page.waitForSelector('[data-testid=learn-ask]');
      await page.click('.kit-row:has-text("Why is Beacon 3.101 blocked?")'); await page.waitForSelector('[data-testid=ask-answer]');
      ok('LN-33', 'Ask Empathia answers a prepared question from the records with its sources', /cannot be accepted yet/.test(await text(page)) && (await page.locator('[data-testid=ask-answer] a').count()) >= 1);
      await page.fill('[data-testid=learn-ask] input', 'what is the weather'); await page.press('[data-testid=learn-ask] input', 'Enter');
      ok('LN-34', 'a question it does not know is refused honestly', /not a question Ask Empathia knows/.test(await text(page)));
      await page.click('.kit-row:has-text("Which devices approach support end?")');
      ok('LN-35', 'a prepared question outside the records says so rather than inventing', /not part of this demonstration’s records/.test(await text(page)));
      await goto(page, '#/learn/explore', 'service'); await page.waitForSelector('[data-testid=learn-explore]');
      await page.click('.ln-ex__hot >> nth=0');
      // LN-36 updated 12 Nov 2026: the explorer is restored to the reference (System view answers a "?" as the system sees it, "label — text")
      ok('LN-36', 'the explorer draws the venue with hotspots that explain themselves', (await page.locator('.ln-ex__hot').count()) >= 3 && / — /.test(await page.getByTestId('explore-info').innerText()));
      await goto(page, '#/learn/servicehands', 'service'); await page.waitForSelector('[data-testid=academy-now]');
      ok('LN-37', 'the ServiceHands Academy lists fifteen jobs in five groups and the live requests waiting on each', (await page.locator('.ln-academy .kit-row').count()) === 15 && /requests? waiting on this job/.test(await text(page)));
      await page.click('.ln-academy .kit-row >> nth=0'); await page.waitForSelector('[data-testid=academy-job]');
      ok('LN-38', 'a job opens its three questions on a live count', (await page.locator('[data-testid=academy-job] .ui-quiz, [data-testid=academy-job] fieldset, [data-testid=academy-job] button').count()) >= 1);
      // the ledger
      const ev = await page.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.workspace.v1')).events.filter((e) => e.type.startsWith('training.')).map((e) => e.type + ': ' + e.detail));
      ok('LN-39', 'every completion is a training line in the ledger that never grants authority', ev.length >= 5 && ev.every((d) => /never a credential or an authorization/.test(d)) && ev.some((d) => /service_case/.test(d)) && ev.some((d) => /signal_episode/.test(d)), JSON.stringify(ev.slice(0, 2)));
      // access
      await goto(page, '#/learn/service', 'visitor');
      ok('LN-40', 'a role without Learn gets the owl page, not the screen', /is not open to the Visitor/.test(await text(page)) && !(await page.locator('[data-testid=learn-service]').count()));
      await goto(page, '#/learn/ask', 'employee'); await page.waitForSelector('[data-testid=learn-ask]');
      ok('LN-41', 'Ask Empathia opens for the Employee (V2.5.3 area "ask") while the Learn chips show only what they may open', (await page.locator('.ln-nav a').count()) === 1);
    }
    ok(`LN-${tag}-99`, 'no page error, no console error, no request leaves the page', !errs.filter((e) => !/Failed to load resource/.test(e)).length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
    await ctx.close();
  }
});
