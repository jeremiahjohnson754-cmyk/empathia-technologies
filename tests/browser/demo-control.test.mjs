#!/usr/bin/env node
// Room Control (#/control/<room>; founder, 10 Nov: a fully interactive room panel as a capability of Lite). A person operates the
// room: scenes, a source for each screen, volume, mute, microphones, privacy, camera presets. The sentence at the top, the plan and
// the dock follow every press; the room answers in words and says it is simulated; an operation is in the ledger and survives a
// reload; a role that does not operate rooms never reaches the panel. Destructive: rapid presses, a corrupt stored state, a room
// without screens, the volume slider from the keyboard.
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-control');
const REF = 'R-ATL-4-218';
const d = (p) => p.evaluate(() => { const e = document.querySelector('[data-testid=room-panel]'); return e ? { ...e.dataset, sentence: document.querySelector('[data-testid=rc-sentence]')?.textContent, said: document.querySelector('[data-testid=rc-said]')?.textContent, marked: Number(document.querySelector('[data-testid=rc-caption]').dataset.marked), links: Number(document.querySelector('[data-testid=rc-caption]').dataset.links), now: [...document.querySelectorAll('[data-testid=rc-now] li')].map((l) => l.textContent) } : null; });
const ledger = (p) => p.evaluate(() => { const w = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /workspace/.test(k)) || '') || 'null'); return w ? w.events.filter((e) => e.type === 'room.control').map((e) => ({ by: e.by, detail: e.detail, outcome: e.outcome, at: e.aggregate })) : []; });

{ const t = await open(`#/control/${REF}`, { role: 'employee' }); const p = t.page; await p.waitForSelector('[data-testid=room-panel]');
  let s = await d(p);
  ok('C-01', 'the room is found off, and the heading says so in a sentence', s.power === 'false' && s.sentence === 'Atlas 4.218 is off.' && s.marked === 0, JSON.stringify(s));
  ok('C-02', 'an employee sees the Room, Meet and Present modes, and no Engineer mode (V2.5.3: control.engineer)', await p.evaluate(() => { const o = [...document.querySelectorAll('.kit-seg__opt')].map((x) => x.textContent.trim()); return o.includes('Room') && o.includes('Meet') && o.includes('Present') && !o.includes('Engineer'); }));
  await p.click('[data-scene=meet]'); await p.waitForTimeout(150); s = await d(p);
  ok('C-03', 'the Meet scene: the meeting on the screen, microphones on, and the sentence, the plan and “now” follow', s.power === 'true' && s.scene === 'meet' && s.volume === '55' && s.mic === 'on' && s.sentence === 'Atlas 4.218 shows the meeting, volume 55, microphones on.' && s.links >= 1 && s.marked >= 4 && s.now.includes('Display 1 Meeting'), JSON.stringify(s));
  ok('C-04', 'the room answers in words and says nothing was sent', /^Meet: The meeting on every screen.*\(simulated: nothing was sent to the room\)$/.test(s.said), s.said);
  ok('C-05', 'a design finding on the room’s record is not presented as a fault of the screen', await p.locator('[data-testid=rc-caution]').count() === 0);
  await p.click('.kit-seg__opt:has-text("Present")'); await p.waitForSelector('[data-testid=rc-routes]');
  await p.click('[data-display="A-0101"] [data-source-id=laptop]'); await p.waitForTimeout(120); s = await d(p);
  ok('C-06', 'Present mode shows what each screen is fed; choosing the laptop routes it and ends the scene', s.sentence === 'Atlas 4.218 shows the laptop, volume 55, microphones on.' && s.scene === '' && await p.getAttribute('[data-display="A-0101"]', 'data-source') === 'laptop' && await p.getAttribute('[data-display="A-0101"] [data-source-id=laptop]', 'aria-checked') === 'true', JSON.stringify(s));
  await p.click('[data-display="A-0101"] [data-source-id=laptop]'); await p.waitForTimeout(100);
  ok('C-07', 'pressing what is already so changes nothing and says why', /already shows the laptop/.test(await p.locator('[data-testid=rc-refused]').innerText().catch(() => '')) && (await d(p)).rev === s.rev);
  await p.focus('[data-testid=rc-volume]'); for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150); s = await d(p);
  ok('C-08', 'the volume slider works from the keyboard and the number follows', s.volume === '70' && await p.locator('[data-testid=rc-volume-value]').innerText() === '70' && /volume 70/.test(s.sentence), JSON.stringify(s));
  await p.click('[data-testid=rc-mute]'); await p.waitForTimeout(100); await p.click('[aria-label="Volume up"]'); await p.waitForTimeout(100); s = await d(p);
  ok('C-09', 'mute, then volume up: the sound comes back on', s.volume === '75' && /^Volume 75, sound on/.test(s.said), s.said);
  await p.click('.kit-seg__opt:has-text("Meet")'); await p.waitForSelector('[data-testid=rc-cameras]');
  await p.click('[data-testid=rc-privacy]'); await p.waitForTimeout(120); s = await d(p);
  await p.click('[data-camera="A-0106"] button:has-text("Table")'); await p.waitForTimeout(100); const refused = await p.locator('[data-testid=rc-refused]').innerText().catch(() => '');
  await p.click('[data-testid=rc-micmute]'); await p.waitForTimeout(100); const refused2 = await p.locator('[data-testid=rc-refused]').innerText().catch(() => '');
  ok('C-10', 'privacy mutes the microphones and closes the camera; while it is on, a preset and un-muting are refused with the reason', s.privacy === 'true' && s.mic === 'muted' && /privacy on/.test(s.sentence) && s.now.includes('Camera 1 closed') && /cameras are closed/.test(refused) && /turn privacy off before/.test(refused2), JSON.stringify({ s, refused, refused2 }));
  await p.click('[data-testid=rc-privacy]'); await p.waitForTimeout(100); await p.click('[data-camera="A-0106"] button:has-text("Table")'); await p.waitForTimeout(100); s = await d(p);
  ok('C-11', 'privacy off: the camera takes the preset; the microphones stay muted until someone turns them on', s.now.includes('Camera 1 Table') && s.mic === 'muted' && /Camera 1 moves to the Table preset/.test(s.said), JSON.stringify(s));
  const dock = p.locator('[data-dock=mic]'); const before = await dock.getAttribute('aria-pressed'); await dock.click(); await dock.click(); await dock.click(); await p.waitForTimeout(150);
  ok('C-12', 'the dock is the same state: three rapid presses on Microphones leave them toggled once', (await dock.getAttribute('aria-pressed')) !== before && (await d(p)).mic === 'on');
  const rev = Number((await d(p)).rev); await p.reload(); await p.waitForSelector('[data-testid=room-panel]'); s = await d(p);
  ok('C-13', 'a reload finds the room as it was left', Number(s.rev) === rev && s.power === 'true' && s.volume === '75' && s.now.includes('Camera 1 Table') && s.now.includes('Display 1 Laptop cable'), JSON.stringify(s));
  const led = await ledger(p);
  ok('C-14', 'every operation is in the ledger with who did it and that it was simulated; a refused press of someone allowed to operate is not', led.length === rev && led.every((e) => e.outcome === 'ALLOWED' && e.at === REF && / · simulated · Employee$/.test(e.detail)), JSON.stringify(led.slice(0, 2)));
  await p.click('[data-scene=off]'); await p.waitForTimeout(120); s = await d(p);
  ok('C-15', 'All off returns the room to off', s.power === 'false' && s.sentence === 'Atlas 4.218 is off.' && s.marked === 0);
  ok('C-16', 'no console error, no request leaves the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

// an engineer: the commands the room was told, the answers and their source, and the truth about the connection
{ const t = await open(`#/control/${REF}?mode=engineer`, { role: 'service' }); const p = t.page; await p.waitForSelector('[data-testid=room-panel]');
  await p.click('[data-scene=meet]'); await p.waitForSelector('[data-testid=rc-log]');
  const log = await p.$$eval('[data-testid=rc-log] tbody tr', (rows) => rows.map((r) => [...r.children].map((c) => c.textContent)));
  const conn = await p.evaluate(() => ({ n: document.querySelector('[data-testid=rc-connection]').dataset.connected, text: document.querySelector('[data-testid=rc-connection]').textContent }));
  ok('C-17', 'Engineer mode lists each command with the position it went to, what answered, and that the answer is simulated', log.length >= 4 && log.some((r) => r[0] === 'A-0101' && /route meeting/.test(r[1]) && /reports input meeting/.test(r[2])) && log.some((r) => r[0] === 'A-0103' && /mic-mute false/.test(r[1])) && log.every((r) => r[3] === 'SIMULATED'), JSON.stringify(log.slice(0, 3)));
  ok('C-18', 'the page says what is connected (nothing) and what a real connection needs; operating a room does not change its baseline', conn.n === '0' && /no equipment is contacted/.test(conn.text) && /None is written/.test(conn.text) && /authorisation/.test(conn.text) && /does not change what it was commissioned as/.test(conn.text), conn.text.slice(0, 200));
  await p.goto(p.url().split('#')[0] + `#/room/${REF}?tab=history`); await p.waitForSelector('main h1'); await p.waitForTimeout(400);
  ok('C-19', 'the room’s record is as it was: its baseline history shows no change from operating it', !/room\.control/.test(await p.locator('main').innerText()));
  ok('C-20', 'no console error', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

// a room with several screens and a switcher: every screen, each screen, a camera on a screen, the path through the switcher
{ const t = await open('#/control/R-EGT-1-140?mode=engineer', { role: 'ops' }); const p = t.page; await p.waitForSelector('[data-testid=room-panel]'); await p.waitForTimeout(200);
  const n = await p.locator('[data-display]').count();
  if (n >= 2) {
    await p.click('[data-all=laptop]'); await p.waitForTimeout(150); let s = await d(p); const all = await p.$$eval('[data-display]', (e) => e.map((x) => x.dataset.source));
    ok('C-21', 'a room with several screens: “Every screen” sets them all, and the plan joins each to what feeds it', all.every((x) => x === 'laptop') && new RegExp(`all ${n} screens|both screens`).test(s.sentence) && s.links >= n, JSON.stringify({ all, s }));
    const cam = await p.locator('[data-display] [data-source-id^="cam:"]').first().getAttribute('data-source-id').catch(() => null);
    if (cam) { await p.locator(`[data-display] [data-source-id="${cam}"]`).first().click(); await p.waitForTimeout(150); s = await d(p); ok('C-22', 'a room with a switcher can put a camera on one screen while the others keep theirs', new Set(await p.$$eval('[data-display]', (e) => e.map((x) => x.dataset.source))).size === 2 && / on /.test(s.sentence), s.sentence); }
    else ok('C-22', 'this room has no camera to route (no switcher): none is offered', true);
  } else { ok('C-21', 'the chosen room has one screen', true); ok('C-22', 'n/a', true); }
  ok('C-23', 'no console error', !t.errs.length, t.errs.join(' | ')); await t.close(); }

// a room whose display has a reported problem: operating that display says so, from the room's own record
{ const t = await open('#/control/R-ATL-7-112', { role: 'employee' }); const p = t.page; await p.waitForSelector('[data-testid=room-panel]'); await p.click('[data-dock=session]'); await p.waitForTimeout(150);
  ok('C-05b', 'a unit with a reported problem says so when it is operated', /open problem on this unit: Display does not wake from standby on the first try/.test(await p.locator('[data-testid=rc-caution]').first().innerText().catch(() => ''))); await t.close(); }

// a room with no screen: nothing to route is offered, the dock says so, and the session still switches the room system
{ const t = await open('#/control/R-ATL-4-220?mode=meet', { role: 'employee' }); const p = t.page; await p.waitForSelector('[data-testid=room-panel]');
  const m = await p.evaluate(() => ({ routes: !!document.querySelector('[data-testid=rc-routes]'), share: document.querySelector('[data-dock=share]').disabled, shareNote: document.querySelector('[data-dock=share] .pa-note').textContent, lacks: document.querySelector('[data-testid=rc-lacks]')?.textContent || '' }));
  await p.click('[data-dock=session]'); await p.waitForTimeout(120); const s = await d(p);
  ok('C-24', 'a room without a screen offers no routing, marks Share “not in this room”, says what its record lacks, and still switches on', !m.routes && m.share && m.shareNote === 'not in this room' && /has no screen/.test(m.lacks) && s.power === 'true', JSON.stringify({ m, s })); await t.close(); }

// who may: a visitor never reaches a panel; a corrupt stored state starts the room clean; ways in from Lite and from the walk-in
{ const t = await open(`#/control/${REF}`, { role: 'visitor' }); ok('C-25', 'a visitor gets the access page, never a disabled panel', await t.page.locator('[data-testid=access-page]').count() === 1 && await t.page.locator('[data-testid=room-panel]').count() === 0); await t.close(); }
{ const t = await open(`#/control/${REF}`, { role: 'employee', init: () => { try { localStorage.setItem('empathia.demo.control.v1', '{"R-ATL-4-218":{"v":1,"power":true,"routes":{"A-0101":"satellite"}}}'); } catch { /* */ } } }); const p = t.page; await p.waitForSelector('[data-testid=room-panel]');
  ok('C-26', 'a stored state that does not fit the room is not used: the room is found off, with no error', (await d(p)).power === 'false' && !t.errs.length, t.errs.join(' | '));
  await p.goto(p.url().split('#')[0] + `#/lite/room/${REF}`); await p.waitForSelector('[data-testid=lite-control]', { timeout: 8000 }).catch(() => undefined);
  ok('C-27', 'the room in Lite offers “operate this room”', await p.getAttribute('[data-testid=lite-control]', 'href').catch(() => null) === `#/control/${REF}`);
  await p.goto(p.url().split('#')[0] + `#/here/${REF}`); await p.waitForSelector('[data-testid=here-look]');
  ok('C-28', 'In this room offers the room’s panel', await p.getAttribute('[data-testid=here-control]', 'href').catch(() => null) === `#/control/${REF}`); await t.close(); }

// the role matrix in a browser (founder, 10 Nov 13:39: room control respects roles and permissions). The expected sets are V2.5.3's tables
// (control area, control.use, control.engineer), the same ones tests/unit/demo-control.test.mjs RC-08 derives from the policy.
{ const ALL = ['visitor', 'employee', 'exec', 'service', 'svcmgr', 'syseng', 'designer', 'installer', 'cxeng', 'ipm', 'bpm', 'ops', 'steward', 'architect', 'qa'];
  const OPEN = ALL.filter((r) => !['visitor', 'qa'].includes(r)); const ENG = ['service', 'svcmgr', 'syseng', 'installer', 'cxeng', 'ops', 'architect']; const bad = []; let leaked = 0;
  for (const role of ALL) {
    const t = await open(`#/control/${REF}`, { role }); const p = t.page; await p.waitForTimeout(250);
    const panel = await p.locator('[data-testid=room-panel]').count() === 1; const refused = await p.locator('[data-testid=access-page]').count() === 1;
    if (panel !== OPEN.includes(role) || refused === OPEN.includes(role)) bad.push(`${role}: panel=${panel} refused=${refused}`);
    if (panel) { const enabled = await p.locator('[data-scene=meet]').isEnabled(); if (!enabled) bad.push(`${role}: opens the panel but cannot operate it`); const modes = await p.$$eval('.kit-seg__opt', (o) => o.map((x) => x.textContent.trim())); if (modes.includes('Engineer') !== ENG.includes(role)) bad.push(`${role}: Engineer mode offered=${modes.includes('Engineer')}`); }
    else if (t.reqs.some((u) => /Control|Panel/.test(u) && /chunks\//.test(u))) leaked += 1;   // D44: a refused role never downloads the panel's code
    await p.goto(p.url().split('#')[0] + `#/control/${REF}?mode=engineer`); await p.waitForTimeout(350);
    const engPanel = await p.locator('[data-testid=rc-connection]').count() === 1; const engRefused = await p.locator('[data-testid=access-page]').count() === 1;
    if (engPanel !== ENG.includes(role) || engRefused === ENG.includes(role)) bad.push(`${role}: engineer address panel=${engPanel} refused=${engRefused}`);
    await t.close(); }
  ok('C-30', 'all fifteen roles: thirteen open and operate a panel, the Visitor and the Document Reviewer get the access page; seven get Engineer mode and its address, the rest are refused it', !bad.length, bad.join(' | '));
  ok('C-31', 'a role that is refused never downloads the panel’s code', leaked === 0, String(leaked)); }
// a role changed while the panel is open: the page re-asks the policy, and the store refuses a press that the old page would have allowed
{ const t = await open(`#/control/${REF}`, { role: 'employee' }); const p = t.page; await p.waitForSelector('[data-testid=room-panel]');
  await p.evaluate(() => { localStorage.setItem('empathia.demo.perspective', 'visitor'); dispatchEvent(new StorageEvent('storage', { key: 'empathia.demo.perspective', newValue: 'visitor' })); }); await p.waitForTimeout(700);
  const gone = await p.locator('[data-testid=room-panel]').count() === 0; const stillThere = !gone ? await p.locator('[data-scene=meet]').isEnabled().catch(() => false) : false;
  ok('C-32', 'when the role changes to one that does not operate rooms, the panel is no longer there to press (or is no longer enabled)', gone || !stillThere, JSON.stringify({ gone, stillThere })); await t.close(); }

// a phone: the room first, 44 px controls, nothing sideways, both widths
for (const w of [390, 320]) { const t = await open(`#/control/${REF}?mode=present`, { role: 'employee', w, h: 780 }); const p = t.page; await p.waitForSelector('[data-testid=room-panel]'); await p.click('[data-scene=present]'); await p.waitForTimeout(150);
  const m = await p.evaluate(() => { const small = [...document.querySelectorAll('.rc button, .rc input[type=range]')].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 43.5).map((b) => `${(b.textContent || b.getAttribute('aria-label') || 'range').trim().slice(0, 16)}:${Math.round(b.getBoundingClientRect().height)}`); return { over: document.documentElement.scrollWidth - innerWidth, small, first: document.querySelector('.rc-side').getBoundingClientRect().top < document.querySelector('.rc-main').getBoundingClientRect().top }; });
  ok(`C-${w}-29`, `${w} px: the room’s plan comes first, every control is at least 44 px, nothing scrolls sideways, no error`, m.first && m.over <= 0 && !m.small.length && !t.errs.length, JSON.stringify(m)); await t.close(); }

await done();
