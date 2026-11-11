// Role start pages in a real browser (founder, 10 Nov): every role lands on its own start page, the thing to start with and every
// jump is one action away and really opens for that role, the keyboard shortcuts work and can be turned off, and a visitor is shown
// no score, issue or money.   node tests/browser/demo-rolehome.test.mjs      (build first: node scripts/build.mjs)
import { harness } from './demo-shell-lib.mjs';
const t = await harness('demo-rolehome'); const { ok, open, base } = t;
const ROLES = ['ops', 'svcmgr', 'service', 'syseng', 'designer', 'installer', 'cxeng', 'ipm', 'bpm', 'steward', 'exec', 'employee', 'sitechamp', 'visitor', 'architect', 'qa'];   // sixteen since the Site Champion became a dedicated role (founder, 11 Nov 2026)
const HOME = { visitor: 'Welcome', employee: 'Today', exec: 'Briefing', service: 'Today’s work', syseng: 'Drawing board', steward: 'Ledger', ops: 'Mission Control', svcmgr: 'Service delivery', designer: 'Design desk', installer: 'Field package', cxeng: 'Proof board', ipm: 'Delivery timeline', bpm: 'Business delivery', architect: 'Mission Control', qa: 'Review desk', sitechamp: 'My site' };
const MISSION = ['ops', 'architect'];
const settle = async (p) => { await p.waitForSelector('main h1', { timeout: 8000 }).catch(() => undefined); await p.waitForTimeout(250); };
/** the page that is showing: refused (the owl page), failed to load, or a heading */
const landed = (p) => p.evaluate(() => ({ refused: !!document.querySelector('[data-testid=access-page]'), missing: !!document.querySelector('[data-testid=not-found]'), failed: !!document.querySelector('.loadfail, [data-testid=workspace-failure]'), h1: document.querySelector('main h1')?.textContent || '', hash: location.hash }));
const press = async (p, ...keys) => { for (const k of keys) { await p.keyboard.press(k); await p.waitForTimeout(60); } await p.waitForTimeout(350); };
const heads = {};

for (const role of ROLES) {
  const s = await open('#/home', { role }); const p = s.page; await settle(p);
  const d = await p.evaluate(() => { const h = document.querySelector('[data-testid=home]'); return { start: h?.getAttribute('data-start') || null, mission: !!document.querySelector('[data-testid=mc-hero]'), kicker: document.querySelector('[data-testid=home] .kicker')?.textContent || '', h1: document.querySelector('main h1')?.textContent || '', jumps: Array.from(document.querySelectorAll('[data-testid=rh-jump] a')).map((a) => ({ key: a.getAttribute('data-key'), href: a.getAttribute('href'), label: a.querySelector('b')?.textContent })), primary: document.querySelector('[data-testid=rh-primary]')?.getAttribute('href') || null, sum: document.querySelector('[data-testid=rh-summary]')?.textContent || '' }; });
  heads[role] = d.h1;
  if (MISSION.includes(role)) ok(`RS-${role}-01`, `${role} starts on Mission Control, now with a jump bar`, d.mission && d.start === null && d.jumps.length >= 4, JSON.stringify({ mission: d.mission, jumps: d.jumps.length }));
  else ok(`RS-${role}-01`, `${role} starts on “${HOME[role]}”, its own page, with a sentence computed for it`, d.start === role && !d.mission && d.kicker.includes(HOME[role]) && d.h1.length > 3 && d.sum.length > 20, JSON.stringify({ start: d.start, kicker: d.kicker, h1: d.h1 }));
  ok(`RS-${role}-02`, `${role} is offered ${d.jumps.length} places to jump to (at least three), each with its own letter`, d.jumps.length >= 3 && new Set(d.jumps.map((j) => j.key)).size === d.jumps.length, d.jumps.map((j) => `${j.key}:${j.label}`).join(', '));
  // every jump is one action and opens for this role
  const bad = [];
  for (const j of d.jumps) { await p.goto(base + '#/home'); await settle(p); await p.click(`[data-testid=rh-jump] a[data-key="${j.key}"]`); await settle(p); const l = await landed(p); if (l.refused || l.missing || l.failed || !l.h1) bad.push(`${j.label} → ${l.refused ? 'refused' : l.missing ? 'no such page' : l.failed ? 'failed to load' : 'no heading'}`); }
  ok(`RS-${role}-03`, `each of ${role}’s jumps opens a page that role may use, in one action`, bad.length === 0, bad.join(' | '));
  if (!MISSION.includes(role)) {
    if (d.primary) { await p.goto(base + '#/home'); await settle(p); await p.click('[data-testid=rh-primary]'); await settle(p); const l = await landed(p); ok(`RS-${role}-04`, `${role}’s “start here” opens the thing it names`, !l.refused && !l.missing && !l.failed && !!l.h1 && l.hash !== '#/home', JSON.stringify(l)); }
    else ok(`RS-${role}-04`, `${role} has nothing to start with on record, and the page says so instead of offering a button`, (await p.goto(base + '#/home'), await settle(p), (await p.locator('[data-testid=rh-start]').count()) === 0 && (await p.textContent('[data-testid=rh-summary]')).length > 20));
  }
  // the keyboard: g then the first jump's letter
  await p.goto(base + '#/home'); await settle(p); await p.locator('main h1').focus().catch(() => undefined);
  await press(p, 'g', d.jumps[0].key); const k = await landed(p);
  ok(`RS-${role}-05`, `${role}: g then ${d.jumps[0].key} goes to ${d.jumps[0].label}`, k.hash.split('?')[0] === d.jumps[0].href.split('?')[0] && !k.refused, k.hash);
  ok(`RS-${role}-06`, `${role}: no console error on the start page or its jumps`, s.errs.length === 0, s.errs.slice(0, 3).join(' | '));
  await s.close();
}
ok('RS-16', 'the fourteen role pages do not all say the same thing: their headlines differ', new Set(ROLES.filter((r) => !MISSION.includes(r)).map((r) => heads[r])).size >= 13, JSON.stringify(heads));

// ---------------------------------------------------------------------------------------------------------- what a visitor is not shown
{ const s = await open('#/home', { role: 'visitor' }); await settle(s.page); const text = await t.main(s.page);
  ok('RS-17', 'a visitor’s start page shows no score, no issue count, no money and no figures', !/\$\d|\/100|health|issue|funded|authoris|verified|work order/i.test(text) && (await s.page.locator('[data-testid=rh-tiles], [data-testid=rh-strip], [data-testid=home-kpis], [data-testid=mc-priorities]').count()) === 0, text.slice(0, 300));
  await s.close(); }
{ const s = await open('#/home', { role: 'employee' }); await settle(s.page); const text = await t.main(s.page);
  ok('RS-18', 'an employee’s start page is their room, rooms near it and what they reported: no scores, money or other people’s work', /Your room is Atlas 4\.218/.test(text) && !/\$\d|\/100|funded|authoris|work order/i.test(text) && (await s.page.locator('[data-zone=near] [data-testid=rh-row]').count()) >= 3 && (await s.page.locator('[data-testid=rh-tiles], [data-testid=rh-strip]').count()) === 0, text.slice(0, 300));
  await s.close(); }

// ---------------------------------------------------------------------------------------------------------- the bell follows the role too
for (const [role, scope] of [['visitor', 'own'], ['employee', 'own'], ['exec', 'own'], ['svcmgr', 'all'], ['service', 'all']]) {
  const s = await open('#/home', { role }); const p = s.page; await settle(p); await p.click('[data-testid=notifications]'); await p.waitForSelector('#notes-panel');
  const b = await p.evaluate(() => ({ scope: document.querySelector('[data-testid=notifications]').getAttribute('data-scope'), head: document.querySelector('#notes-panel .notes__h')?.textContent || '', label: document.querySelector('[data-testid=notifications]').getAttribute('aria-label') }));
  ok(`RS-18-bell-${role}`, scope === 'all' ? `${role} works on incidents and is told about every open one` : `${role} is told only about what they reported, not the campus’s incidents`, b.scope === scope && (scope === 'all' ? /^Open service incidents/.test(b.head) : /^Your open reports/.test(b.head) && /of your reports/.test(b.label)), JSON.stringify(b));
  await s.close();
}
// ---------------------------------------------------------------------------------------------------------- shortcuts
{ const s = await open('#/home', { role: 'cxeng' }); const p = s.page; await settle(p);
  await p.keyboard.press('g'); await p.waitForTimeout(120);
  const hint = await p.textContent('[data-testid=shortcut-armed]');
  ok('RS-19', 'after g the page says what it is waiting for, naming the letters', /^Go to…/.test(hint) && /c Checks/.test(hint) && /h Proof board/.test(hint), hint);
  await p.waitForTimeout(1700); ok('RS-20', 'a half-typed shortcut lapses after a second and a half: the letter then does nothing', (await p.textContent('[data-testid=shortcut-armed]')) === '' && (await press(p, 'c'), (await landed(p)).hash === '#/home'));
  await press(p, 'g', 'c'); await press(p, 'g', 'h'); ok('RS-21', 'g then h returns to the start page from anywhere', (await landed(p)).hash === '#/home' && /wait/.test(await p.textContent('main h1')), (await landed(p)).hash);
  await p.keyboard.press('?'); await p.waitForSelector('[data-testid=shortcuts-sheet]', { timeout: 3000 }).catch(() => undefined);
  const sheet = await p.evaluate(() => { const el = document.querySelector('[data-testid=shortcuts-sheet]'); return el ? { modal: el.getAttribute('aria-modal'), label: document.getElementById(el.getAttribute('aria-labelledby'))?.textContent, keys: Array.from(el.querySelectorAll('[data-testid=shortcuts-list] [data-key]')).map((x) => x.getAttribute('data-key')), inside: el.contains(document.activeElement) } : null; });
  const bar = await p.evaluate(() => Array.from(document.querySelectorAll('[data-testid=rh-jump] a')).map((a) => a.getAttribute('data-key')));
  ok('RS-22', '? opens a dialog that lists exactly the letters on the jump bar, and focus moves into it', !!sheet && sheet.modal === 'true' && sheet.label === 'Keyboard shortcuts' && sheet.inside && JSON.stringify(sheet.keys) === JSON.stringify(bar), JSON.stringify(sheet));
  await press(p, 'g', 'c'); ok('RS-23', 'with the dialog open, shortcuts do not fire behind it', (await landed(p)).hash === '#/home');
  await p.click('[data-testid=shortcuts-toggle]'); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  await press(p, 'g', 'c'); const off = await landed(p);
  ok('RS-24', 'turned off, g then c does nothing, the jump bar drops its key hints, and the buttons still work', off.hash === '#/home' && (await p.locator('[data-testid=rh-jump] kbd').count()) === 1 && (await p.getAttribute('[data-testid=rh-jump] a', 'aria-keyshortcuts')) === null, off.hash);
  await p.reload(); await settle(p); await press(p, 'g', 'c');
  ok('RS-25', 'the choice is kept on this device after a reload; ? still opens the list so they can be turned back on', (await landed(p)).hash === '#/home' && (await p.keyboard.press('?'), await p.waitForSelector('[data-testid=shortcuts-sheet]', { timeout: 3000 }).then(() => true, () => false)) && !(await p.isChecked('[data-testid=shortcuts-toggle]')));
  await p.click('[data-testid=shortcuts-toggle]'); await p.keyboard.press('Escape'); await press(p, 'g', 'c');
  ok('RS-26', 'turned back on, g then c goes to Checks again', (await landed(p)).hash === '#/commissioning', (await landed(p)).hash);
  await p.goto(base + '#/home'); await settle(p); await p.click('[data-testid=rh-shortcuts]');
  ok('RS-27', 'the list also opens from a button on the start page (a shortcut must not be the only way to find the shortcuts)', await p.waitForSelector('[data-testid=shortcuts-sheet]', { timeout: 3000 }).then(() => true, () => false));
  await p.keyboard.press('Escape'); await s.close(); }
{ const s = await open('#/home', { role: 'exec' }); const p = s.page; await settle(p);
  await p.click('.rh-search input'); await p.keyboard.type('gcp'); await p.waitForTimeout(400);
  ok('RS-28', 'typing g, c, p into the search box searches for “gcp”; it does not jump anywhere', (await landed(p)).hash === '#/home' && (await p.inputValue('.rh-search input')) === 'gcp');
  await s.close(); }

// ---------------------------------------------------------------------------------------------------------- the role changes, the page re-forms
{ const s = await open('#/home', { role: 'architect' }); const p = s.page; await settle(p);
  await p.click('[data-testid=viewas-open]'); await p.click('[data-testid=viewas-sheet] [data-role-key=service]'); await p.waitForTimeout(700);
  const a = await p.evaluate(() => ({ start: document.querySelector('[data-testid=home]')?.getAttribute('data-start'), kicker: document.querySelector('[data-testid=home] .kicker')?.textContent, mc: !!document.querySelector('[data-testid=mc-hero]') }));
  ok('RS-29', 'switching from Product Architect to Service Engineer replaces Mission Control with “Today’s work”', a.start === 'service' && !a.mc && /Today’s work/.test(a.kicker || ''), JSON.stringify(a));
  await p.click('[data-testid=viewas-open]'); await p.click('[data-testid=viewas-sheet] [data-role-key=exec]'); await p.waitForTimeout(700);
  const b = await p.evaluate(() => ({ start: document.querySelector('[data-testid=home]')?.getAttribute('data-start'), jobs: document.querySelectorAll('[data-zone=jobs]').length, tiles: document.querySelectorAll('[data-testid=rh-tiles] li').length }));
  ok('RS-30', 'switching again to Executive leaves nothing of the engineer’s page behind: the briefing, four figures, no job list', b.start === 'exec' && b.jobs === 0 && b.tiles === 4, JSON.stringify(b));
  ok('RS-31', 'the switches logged no error', s.errs.length === 0, s.errs.join(' | '));
  await s.close(); }

// ---------------------------------------------------------------------------------------------------------- phone and dark
for (const role of ['service', 'exec', 'employee', 'cxeng']) {
  const s = await open('#/home', { role, w: 390, h: 844 }); const p = s.page; await settle(p);
  const m = await p.evaluate(() => { const small = Array.from(document.querySelectorAll('[data-testid=home] a, [data-testid=home] button')).filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 44 && !x.closest('p, .ui-meta, .rh-sum') && getComputedStyle(x).display !== 'inline'; }).map((x) => `${(x.textContent || '').trim().slice(0, 24)} ${Math.round(x.getBoundingClientRect().height)}`); return { over: document.documentElement.scrollWidth - document.documentElement.clientWidth, small, hints: Array.from(document.querySelectorAll('.rh-jump__k')).filter((x) => getComputedStyle(x).display !== 'none').length, primaryTop: document.querySelector('[data-testid=rh-primary]')?.getBoundingClientRect().top ?? -1 }; });
  ok(`RS-32-${role}`, `phone, ${role}: no sideways scroll, every button at least 44 px tall, no key hints (a phone has no g key), and the thing to start with is on the first screen`, m.over <= 0 && m.small.length === 0 && m.hints === 0 && (m.primaryTop === -1 || m.primaryTop < 844), JSON.stringify(m));
  await s.close();
}
for (const role of ['service', 'exec', 'steward']) for (const theme of ['light', 'dark']) {
  const s = await open('#/home', { role, theme }); const p = s.page; await settle(p);
  const low = await p.evaluate(() => { const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const [r, g, b] = m.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }; const bgOf = (el) => { for (let x = el; x; x = x.parentElement) { const c = getComputedStyle(x).backgroundColor; const m = c.match(/[\d.]+/g); if (/^rgb/.test(c) && m && (m.length < 4 || Number(m[3]) > 0.98)) return c; } return null; }; const out = []; for (const el of document.querySelectorAll('[data-testid=home] :is(p, b, span, a, h1, h2, small, kbd, button)')) { if (!el.textContent.trim() || el.children.length) continue; const cs = getComputedStyle(el); const bg = bgOf(el); if (!/^rgb/.test(cs.color) || !bg) continue; const a = lum(cs.color), b = lum(bg); const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && Number(cs.fontWeight) >= 700); if (r < (big ? 3 : 4.5)) out.push(`${el.textContent.trim().slice(0, 26)} ${r.toFixed(2)}`); } return out; });
  ok(`RS-33-${role}-${theme}`, `${theme}, ${role}: every piece of text on the start page meets its contrast minimum`, low.length === 0, low.slice(0, 6).join(' | '));
  await s.close();
}
await t.done();
