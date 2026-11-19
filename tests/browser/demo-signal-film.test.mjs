#!/usr/bin/env node
// SIGNAL Story Director (founder 18 Nov 2026 11:59, Part II; 16:41 "actually done this time"): Ten Seats played end to end as an
// interactive film, as a first-time viewer would. Nothing sounds before the viewer chooses sound; the film runs by itself; the generated
// footage plays; a decision stops the film in the frame, a ladder option reopens it, a wrong first call changes what the next playable
// scene shows; the five playable scenes record the canon's evidence; a timed call can run out and be replayed; a line that is true only
// after one option is shown only then; the credits list the calls, the evidence and the voices; the story record is the same one the
// written story uses; a replay changes nothing saved; it works on a phone and with reduced motion; other chapters play their footage.
//   node tests/browser/demo-signal-film.test.mjs     (PW_COLOR_SCHEME=dark for the dark run)
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-signal-film');
const countAudio = () => { const A = window.AudioContext; window.__ac = 0; if (A) window.AudioContext = class extends A { constructor(...a) { super(...a); window.__ac += 1; } }; };
const info = (p) => p.evaluate(() => { const f = document.querySelector('[data-testid=film]'); const st = document.querySelector('[data-testid=film-stage]'); return f ? { k: +f.dataset.shot, kind: f.dataset.kind, n: +f.dataset.shots, sandbox: f.dataset.sandbox, sound: f.dataset.sound, item: st?.dataset.item || '', dec: document.querySelector('[data-testid=film-decision]')?.dataset.decision || '', play: document.querySelector('[data-testid=film-play]')?.dataset.play || '' } : null; });
/** step the film with Next until `pred` holds (Next is refused while a decision, conversation or playable scene waits) */
const until = async (p, pred, max = 120) => { for (let i = 0; i < max; i += 1) { const s = await info(p); if (s && pred(s)) return s; await p.click('[data-testid=film-next]', { timeout: 2000 }).catch(() => {}); await p.waitForTimeout(90); } return info(p); };
const store = (p) => p.evaluate(() => { try { return { story: JSON.parse(localStorage.getItem('empathia.signal.story.v1') || '{}'), film: JSON.parse(localStorage.getItem('empathia.signal.film.v1') || '{}') }; } catch { return { story: {}, film: {} }; } });
const over = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const setRange = (p, sel, v) => p.evaluate(([s, val]) => { const el = document.querySelector(s); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, String(val)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, v]);

// ── the whole episode, desktop, without sound ───────────────────────────────────────────────────────────────────────────────────────
{ const t = await open('#/film/s01e01', { w: 1440, h: 900, init: countAudio }); const p = t.page;
  await p.waitForSelector('[data-testid=film-title]', { timeout: 20000 });
  const t0 = await p.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, k: document.querySelector('.fm-title__k')?.textContent, b: document.querySelectorAll('[data-testid^=film-begin]').length, ac: window.__ac, playing: [...document.querySelectorAll('audio, video')].some((m) => !m.paused), modes: [...document.querySelectorAll('.fm-modes a')].map((a) => a.getAttribute('href')).join(' ') }));
  ok('FM-01', 'the film opens on its title card (season, episode, title), offers to begin with or without sound, and nothing sounds or plays yet', t0.h1 === 'Ten Seats' && /Season 1: The Sanctuary · Episode 1/.test(t0.k) && t0.b === 2 && t0.ac === 0 && !t0.playing && /#\/film\/s01e01 #\/play\/s01e01 #\/story\/s01e01/.test(t0.modes), JSON.stringify(t0));
  await p.click('[data-testid=film-begin-quiet]'); const a = await info(p); await p.waitForTimeout(3600); const b = await info(p);
  ok('FM-02', 'begun without sound, it opens on the first act card and runs by itself, shot after shot; no audio context was ever created', a.kind === 'act' && b.k > a.k && (await p.evaluate(() => window.__ac)) === 0 && b.sound === 'false', JSON.stringify([a, b]));
  const f = await until(p, (s) => s.kind === 'footage'); await p.waitForTimeout(1600);
  const v = await p.evaluate(() => { const x = document.querySelector('[data-testid=film-footage]'); return x ? { src: x.getAttribute('src'), muted: x.muted, t: x.currentTime, label: document.querySelector('.fm-foot__n')?.textContent || '' } : null; });
  ok('FM-03', 'the episode’s generated footage plays in the film (muted, labelled as generated footage of a fictional setting)', f.kind === 'footage' && v && /media\/signal\/s01e01\/footage-sanctuary\.mp4$/.test(v.src) && v.muted && v.t > 0.3 && /Generated footage/.test(v.label), JSON.stringify(v));
  const d1 = await until(p, (s) => s.kind === 'decision');
  const g = await p.evaluate(() => ({ next: document.querySelector('[data-testid=film-next]').disabled, n: document.querySelectorAll('.fm-opt').length, q: document.querySelector('.fm-dec__q')?.textContent }));
  ok('FM-04', 'the first decision stops the film inside the frame: four choices, and the film will not go on until one is made', d1.dec === 'BR-S01E01-01' && g.next && g.n === 4 && /What do you try first/.test(g.q), JSON.stringify([d1, g]));
  await p.click('[data-testid=film-opt-D]'); await p.waitForTimeout(250);
  const lad = await p.evaluate(() => ({ ladder: document.querySelector('[data-testid=film-out]')?.dataset.ladder, r: document.querySelector('.fm-out__r')?.textContent, opts: [...document.querySelectorAll('.fm-opt')].map((x) => x.dataset.testid).join(','), next: document.querySelector('[data-testid=film-next]').disabled }));
  ok('FM-05', 'the ladder: Ray’s canon line, and the choice is open again without that option (the film still waits)', lad.ladder === 'true' && /Who's qualified to be under that/.test(lad.r) && lad.opts === 'film-opt-A,film-opt-B,film-opt-C' && lad.next, JSON.stringify(lad));
  await p.locator('.fm-dec__q').press('1'); await p.waitForTimeout(250);
  const ca = await p.evaluate(() => ({ l: document.querySelector('[data-testid=film-out]')?.dataset.letter, r: document.querySelector('.fm-out__r')?.textContent, cont: !!document.querySelector('[data-testid=film-continue]') }));
  const s1 = await store(p);
  ok('FM-06', 'key 1 chooses “EQ the fill”: the canon result plays and the choice is the story’s own record (the written story reads the same)', ca.l === 'A' && /Seat 13 better, seat 12 worse/.test(ca.r) && ca.cont && s1.story.chapters?.s01e01?.choices?.['BR-S01E01-01']?.letter === 'A', JSON.stringify(ca));
  await p.click('[data-testid=film-continue]'); const m = await until(p, (s) => s.kind === 'play');
  const cons = await p.locator('[data-testid=fm-cons-eq]').count();
  ok('FM-07', 'the wrong first call has a visible consequence in the next scene: the measurement is of a changed system, and says so', m.play === 'measure' && cons === 1, JSON.stringify(m));
  const ten = ['R7-11', 'R7-12', 'R7-13', 'R8-10', 'R8-11', 'R8-12', 'R8-13', 'R8-14', 'R9-12', 'R9-13'];
  await p.click('[data-testid=fm-seat-R8-13]'); const an = await p.evaluate(() => { const a = document.querySelector('[data-testid=fm-analyzer]'); return { seat: a?.dataset.seat, first: a?.dataset.first, cap: a?.querySelector('figcaption')?.textContent }; });
  ok('FM-08', 'the analyzer at seat 13 shows the canon’s numbers: first notch ≈ 101 Hz, Δt ≈ 4.96 ms, labelled an illustrative model', an.seat === 'R8-13' && an.first === '101' && /4\.96 ms/.test(an.cap) && /illustrative model/.test(an.cap), JSON.stringify(an));
  const before = await p.locator('[data-testid=fm-play-finish]').isDisabled();
  for (const id of ten) { await p.click(`[data-testid=fm-seat-${id}]`); await p.click('[data-testid=fm-record]'); }
  const firsts = await p.evaluate(() => [...document.querySelectorAll('[data-testid=fm-readings] tbody td:nth-child(2)')].map((x) => x.textContent));
  await p.click('[data-testid=fm-play-finish]'); await p.waitForTimeout(200); const s2 = await store(p);
  ok('FM-09', 'Measure the ten seats: it cannot be finished early; ten readings, every first notch different; the record keeps the evidence and the caveat', before && firsts.length === 10 && new Set(firsts).size === 10 && s2.film.s01e01?.plays?.measure?.evidence === 'ten seats, before' && /true “before” is gone/.test(s2.film.s01e01.plays.measure.caveat || ''), JSON.stringify(firsts));
  await p.click('[data-testid=film-continue]'); const c = await until(p, (s) => s.kind === 'play');
  for (let i = 1; i <= 12; i += 1) await p.click(`[data-testid=fm-card-${i}]`);
  await p.click('[data-testid=fm-where-aisles]'); await p.click('[data-testid=fm-when-after]'); const wrong = await p.locator('[data-testid=fm-cards-wrong]').count();
  await p.click('[data-testid=fm-where-centre]'); const right = await p.locator('[data-testid=fm-cards-right]').count(); await p.click('[data-testid=fm-play-finish]');
  ok('FM-10', 'Plot the cards: twelve cards on the chart; a wrong reading is answered, the right one (rows 7–9 centre, just after the renovation) records the canon’s evidence', c.play === 'cards' && wrong === 1 && right === 1 && (await store(p)).film.s01e01.plays.cards?.evidence === 'EV-CASE001-01');
  await p.click('[data-testid=film-continue]'); const bd = await until(p, (s) => s.kind === 'play');
  for (const x of ['mic', 'hearing', 'air', 'room']) await p.click(`[data-testid=fm-run-${x}]`);
  const hearing = await p.textContent('[data-testid=fm-test-hearing]');
  await p.click('[data-testid=fm-keep-mic]'); const w2 = await p.locator('[data-testid=fm-board-wrong]').count(); await p.click('[data-testid=fm-keep-room]'); await p.click('[data-testid=fm-play-finish]');
  ok('FM-11', 'Four explanations: each test gives the canon’s result (her hearing is not Maya’s to judge); only “the room” can be kept', bd.play === 'board' && /not Maya’s to judge/.test(hearing) && w2 === 1 && (await store(p)).film.s01e01.plays.board?.evidence === 'The Room · suspected');
  await p.click('[data-testid=film-continue]'); const ft = await until(p, (s) => s.kind === 'play');
  await p.click('[data-testid=fm-record]'); await setRange(p, '[data-testid=fm-fader]', -6); await p.waitForTimeout(100); await p.click('[data-testid=fm-record]');
  const sh = await p.locator('[data-testid=fm-fill-shallower]').count(); await p.click('[data-testid=fm-play-finish]');
  ok('FM-12', 'Prove yourself wrong: fill down 6 dB, the notches get shallower but do not go (EV-S01E01-08)', ft.play === 'filltest' && sh === 1 && (await store(p)).film.s01e01.plays.filltest?.evidence === 'EV-S01E01-08');
  await p.click('[data-testid=film-continue]'); const d2 = await until(p, (s) => s.kind === 'decision');
  await p.click('[data-testid=film-opt-B]'); await p.waitForTimeout(200);
  const pm = await p.evaluate(() => ({ r: document.querySelector('.fm-out__r')?.textContent, model: !!document.querySelector('[data-testid=fm-plan-model] [data-testid=fm-analyzer]') }));
  ok('FM-13', 'The Sunday plan: the canon result, and the model shows what that plan does to the room', d2.dec === 'BR-S01E01-02' && /Center fixed; side rows and balcony thin/.test(pm.r) && pm.model, JSON.stringify(pm));
  await p.click('[data-testid=film-continue]'); const tk = await until(p, (s) => s.kind === 'talk');
  await p.click('[data-testid=film-say-1]'); const rep = await p.textContent('[data-testid=film-reply]');
  ok('FM-14', 'the conversation with Ana: Maya’s answer, Ana’s canon reply and what it does to trust', tk.kind === 'talk' && /Thank you for not guessing/.test(rep) && /Ana \+1/.test(rep), rep);
  await p.click('[data-testid=film-continue]'); const d3 = await until(p, (s) => s.kind === 'decision');
  const clock = await p.textContent('[data-testid=film-clock]').catch(() => '');
  await p.waitForTimeout(26500);
  const to = await p.evaluate(() => ({ cls: document.querySelector('[data-testid=film-out]')?.className || '', rep: !!document.querySelector('[data-testid=film-replay-decision]') }));
  const s3 = await store(p);
  ok('FM-15', 'the timed call (25 s on the story’s clock) counts down, runs out, is recorded as missed and can be replayed', d3.dec === 'BR-S01E01-03' && /\d+ s/.test(clock) && /is-timeout/.test(to.cls) && to.rep && s3.story.chapters.s01e01.choices['BR-S01E01-03'].letter === 'TIMEOUT', JSON.stringify([clock, to]));
  await p.click('[data-testid=film-replay-decision]'); await p.waitForTimeout(300); await p.click('[data-testid=film-opt-C]'); await p.waitForTimeout(200);
  ok('FM-16', 'replayed, “We’ll know by Sunday” records', (await store(p)).story.chapters.s01e01.choices['BR-S01E01-03'].letter === 'C');
  await p.click('[data-testid=film-continue]'); const p57 = await until(p, (s) => s.item === '57');
  const tr57 = await p.evaluate(() => document.querySelector('.fm-script')?.textContent || '');
  ok('FM-17', 'a line true only after option C is shown after C: Ana’s “She’ll want her seat back.”', p57.item === '57' && /She'll want her seat back/.test(tr57), tr57.slice(0, 200));
  const vf = await until(p, (s) => s.kind === 'play');
  for (const id of ['R8-12', 'R8-13', 'R7-12', 'R9-13', 'BAL-F']) { await p.click(`[data-testid=fm-seat-${id}]`); await p.click('[data-testid=fm-record]'); }
  const vfirst = await p.evaluate(() => [...document.querySelectorAll('[data-testid=fm-readings] tbody td:nth-child(2)')].map((x) => x.textContent));
  const notYet = await p.locator('[data-testid=fm-play-finish]').isDisabled(); await p.click('[data-testid=fm-wrote]'); await p.click('[data-testid=fm-play-finish]');
  ok('FM-18', 'Measure again after the re-aim: the ten seats’ notches are gone; it cannot be signed off until the weaker balcony front is written down', vf.play === 'verify' && vfirst.slice(0, 4).every((x) => x === 'none') && notYet && (await store(p)).film.s01e01.plays.verify?.evidence === 'condition 1 · empty room', JSON.stringify(vfirst));
  await p.click('[data-testid=film-continue]'); await until(p, (s) => s.kind === 'credits');
  const cr = await p.evaluate(() => ({ calls: document.querySelectorAll('[data-testid=film-calls] li').length, ev: [...document.querySelectorAll('[data-testid=film-evidence] li')].map((x) => x.textContent), cast: document.querySelector('.fm-credits__cast')?.textContent || '', next: document.querySelector('[data-testid=film-next-episode]')?.getAttribute('href'), v: document.querySelector('[data-testid=film-verdict]')?.textContent, cred: /not a credential/.test(document.querySelector('[data-testid=film-credits]')?.textContent || '') }));
  const s4 = await store(p);
  ok('FM-19', 'the credits: three calls with their verdicts, five things established (the caveat kept), AI voices named as such, not a credential, the next episode', cr.calls === 3 && cr.ev.length === 5 && !cr.ev.some((x) => /not done/.test(x)) && /true “before” is gone/.test(cr.ev[0]) && /AI-generated voice/.test(cr.cast) && cr.next === '#/film/s01e02' && !!cr.v && cr.cred && s4.story.chapters.s01e01.done === true, JSON.stringify(cr).slice(0, 300));
  await p.reload(); await p.waitForSelector('[data-testid=film-title]', { timeout: 20000 });
  ok('FM-20', 'after a reload the title offers to resume and to replay without changing the saved story', (await p.locator('[data-testid=film-resume]').count()) === 1 && (await p.locator('[data-testid=film-replay]').count()) === 1);
  await p.click('[data-testid=film-replay]'); const sb = await until(p, (s) => s.kind === 'decision'); await p.click('[data-testid=film-opt-C]'); await p.waitForTimeout(150);
  const s5 = await store(p);
  ok('FM-21', 'a replay is a sandbox: choosing differently there leaves the saved story and the saved evidence as they were', sb.sandbox === 'true' && s5.story.chapters.s01e01.choices['BR-S01E01-01'].letter === 'A' && !!s5.film.s01e01.plays.measure?.caveat && (await p.locator('[data-testid=film-sandbox]').count()) === 1);
  await p.click('[data-testid=film-continue]'); const m2 = await until(p, (s) => s.kind === 'play');
  ok('FM-22', 'in the replay, measuring first (the professional call) means no consequence banner in the measurement', m2.play === 'measure' && (await p.locator('[data-testid=fm-cons-eq], [data-testid=fm-cons-off]').count()) === 0);
  ok('FM-23', 'no page error and nothing requested off the page’s origin in the whole episode', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | '));
  await t.close(); }

// ── sound: the viewer's choice, voices and the comb at a seat ───────────────────────────────────────────────────────────────────────
{ const t = await open('#/film/s01e01', { w: 1280, h: 800, init: countAudio }); const p = t.page; await p.waitForSelector('[data-testid=film-title]', { timeout: 20000 });
  await p.click('[data-testid=film-begin-sound]'); await p.waitForTimeout(300);
  const s = await info(p); const ac = await p.evaluate(() => window.__ac);
  const beat = await until(p, (x) => x.kind === 'beat'); await p.waitForTimeout(1500);
  const au = await p.evaluate(() => { const a = document.querySelector('[data-testid=film] audio'); const l = document.querySelector('[data-testid=film-line]'); return { src: a?.getAttribute('src') || '', t: a?.currentTime || 0, who: l?.dataset.who, mode: l?.dataset.audio }; });
  ok('FM-24', 'begun with sound: one audio context, made by the viewer’s click; a voiced line plays its recorded take', s.sound === 'true' && ac === 1 && beat.kind === 'beat' && au.mode === 'take' && /\.mp3$/.test(au.src) && au.t > 0.2, JSON.stringify(au));
  await until(p, (x) => x.kind === 'decision'); await p.click('[data-testid=film-opt-C]'); await p.click('[data-testid=film-continue]'); await until(p, (x) => x.kind === 'play');
  ok('FM-25', 'with sound on, a seat can be listened to (the comb filter, made in the browser)', (await p.locator('[data-testid=fm-listen]').count()) === 1);
  await p.click('[data-testid=film-sound]'); ok('FM-26', 'sound can be turned off at any time', (await info(p)).sound === 'false');
  ok('FM-27', 'no page error with sound', !t.errs.length, t.errs.join(' | ')); await t.close(); }

// ── phone ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
{ const t = await open('#/film/s01e01', { w: 390, h: 844 }); const p = t.page; await p.waitForSelector('[data-testid=film-title]', { timeout: 20000 });
  const o1 = await over(p); await p.click('[data-testid=film-begin-quiet]'); await until(p, (s) => s.kind === 'decision');
  const opt = await p.evaluate(() => [...document.querySelectorAll('.fm-opt')].map((b) => Math.round(b.getBoundingClientRect().height)));
  const o2 = await over(p); await p.click('[data-testid=film-opt-C]'); await p.click('[data-testid=film-continue]'); await until(p, (s) => s.kind === 'play');
  const seats = await p.evaluate(() => { const r = [...document.querySelectorAll('.fm-map__pick')].map((b) => b.getBoundingClientRect()); let overlap = 0; for (let i = 0; i < r.length; i += 1) for (let j = i + 1; j < r.length; j += 1) { const a = r[i]; const b = r[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlap += 1; } return { n: r.length, min: Math.min(...r.map((x) => x.width)), overlap }; });
  const o3 = await over(p); const ctl = await p.evaluate(() => [...document.querySelectorAll('.fm-ctl .ui-btn')].every((b) => b.getBoundingClientRect().height >= 44));
  ok('FM-28', 'phone: no sideways scrolling on the title, a decision or a playable scene; choices are full-width and at least 44 px tall', o1 <= 0 && o2 <= 0 && o3 <= 0 && opt.length === 4 && opt.every((h) => h >= 44), JSON.stringify({ o1, o2, o3, opt }));
  ok('FM-29', 'phone: the seats in the measurement do not overlap and are at least 24 px; film controls are 44 px tall', seats.n >= 12 && seats.overlap === 0 && seats.min >= 24 && ctl, JSON.stringify(seats));
  ok('FM-30', 'phone: no page error', !t.errs.length, t.errs.join(' | ')); await t.close(); }

// ── reduced motion, another episode, and the ways in ────────────────────────────────────────────────────────────────────────────────
{ const t = await open('#/film/s01e05', { w: 1280, h: 800, reduced: true }); const p = t.page; await p.waitForSelector('[data-testid=film-title]', { timeout: 20000 });
  await p.click('[data-testid=film-begin-quiet]'); const pn = await until(p, (s) => s.kind === 'panel');
  const moving = await p.locator('.fm-art--move').count();
  const fo = await until(p, (s) => s.kind === 'footage'); const src = await p.getAttribute('[data-testid=film-footage]', 'src');
  ok('FM-31', 'reduced motion holds the camera still; another Season 1 episode plays its own reviewed footage', pn.kind === 'panel' && moving === 0 && fo.kind === 'footage' && /media\/signal\/s01\/film\/s01e05-/.test(src || ''), src);
  const dd = await until(p, (s) => s.kind === 'decision'); ok('FM-32', 'and stops at its own decisions', /^BR-S01E05-/.test(dd.dec), dd.dec);
  await t.go?.('#/story'); await p.goto(p.url().replace(/#.*/, '#/story')); await p.waitForSelector('[data-testid=story-library]', { timeout: 20000 });
  const ways = await p.evaluate(() => ({ start: document.querySelector('[data-testid=story-film-start]')?.getAttribute('href'), flag: document.querySelector('[data-testid=story-film-flagship]')?.getAttribute('href') }));
  await p.goto(p.url().replace(/#.*/, '#/play/s01e01')); await p.waitForSelector('[data-testid=play-to-film]', { timeout: 20000 });
  ok('FM-33', 'the ways in: the SIGNAL library offers the film and the Ten Seats film; the played scenes link to the film', /^#\/film\//.test(ways.start || '') && ways.flag === '#/film/s01e01' && (await p.getAttribute('[data-testid=play-to-film]', 'href')) === '#/film/s01e01', JSON.stringify(ways));
  await p.goto(p.url().replace(/#.*/, '#/film/zz99')); await p.waitForSelector('[data-testid=film-unknown]', { timeout: 20000 });
  ok('FM-34', 'an unknown chapter address says so and offers Ten Seats', (await p.getAttribute('[data-testid=film-unknown] a', 'href')) === '#/film/s01e01');
  ok('FM-35', 'no page error', !t.errs.length, t.errs.join(' | ')); await t.close(); }
await done();
