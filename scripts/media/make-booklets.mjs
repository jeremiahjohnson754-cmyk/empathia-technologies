#!/usr/bin/env node
/**
 * The guides as printed booklets (founder, 13 Nov 2026: "make the IT onboarding success and end user guides far better … make them
 * look super cool like Adobe InDesign booklets with our emblem and the corporate information … and screenshots of Lite, the various
 * rooms and equipment"). Two booklets, set in Inter on US Letter by Chromium's print engine:
 *   - End-User Success Guide: one room (Atlas 4.218 by default), from that room's own guide (guides/roomGuide.ts), its plan drawn from
 *     the record, screenshots of the room in Lite and on the room-guide page, and the general chapters (guides/chapters.ts);
 *   - IT Onboarding Success Guide: the programme (onboard/program.ts) by phase, its knowledge checks with the answers at the back, the
 *     30/60/90-day competencies, and the organisation's own fields (onboard/profile.ts), shown as "not recorded" where none is held.
 * Every word is the product's own content; nothing about a real organisation is written in; both say DRAFT and synthetic on the cover
 * and on every page. The screenshots are taken from the built demonstration (apps/demo/dist), never drawn by hand.
 *
 * Usage: node scripts/media/make-booklets.mjs [--room=R-ATL-4-218] [--out=apps/website/media/booklets]
 * Writes <out>/*.pdf, a cover image for each (webp and jpg) and BOOKLETS.json (pages, bytes, SHA-256, sources).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const ROOM = arg('room', 'R-ATL-4-218'); const out = path.resolve(repo, arg('out', 'apps/website/media/booklets'));
const require_ = createRequire(import.meta.url);
const { chromium } = require_('playwright');
const sharp = require_(process.env.SHARP_PATH || '/opt/npm-tools/node_modules/sharp');
if (!fs.existsSync(path.join(repo, 'apps/demo/dist/index.html'))) { console.error('build the demo first: node apps/demo/build.mjs'); process.exit(1); }

// 1 · the product's own content, bundled for Node
const cache = path.join(repo, 'node_modules/.cache/booklets'); fs.mkdirSync(cache, { recursive: true });
const esbuild = await import(pathToFileURL(path.join(repo, 'node_modules/esbuild/lib/main.js')).href);
const bundle = path.join(cache, 'content.mjs');
await esbuild.build({ stdin: { contents: `export { roomGuide } from './guides/roomGuide.ts'; export { CHAPTERS } from './guides/chapters.ts'; export * as OB from './onboard/program.ts'; export { profile } from './onboard/profile.ts'; export { roomRecord } from './campus/design.ts'; export { fullName, shortName, buildingByKey, SITE } from './campus/canon.ts'; export { planSvg } from './export/plan.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', define: { 'process.env.DEMO_BUILD_ID': '"booklets"' } });
const C = await import(pathToFileURL(bundle).href + `?t=${Date.now()}`);
const r = C.roomRecord(ROOM); if (!r) throw new Error(`no room ${ROOM}`);
const G = C.roomGuide(r); const P = C.profile();

// 2 · screenshots from the built demonstration
const freePort = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const port = await freePort(); const base = `http://127.0.0.1:${port}/`;
const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), `--port=${port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((ok) => { srv.stdout.on('data', ok); srv.stderr.on('data', ok); setTimeout(ok, 2500); });
const browser = await chromium.launch();
const shots = {};
async function shot(key, hash, selector, { role = 'employee', w = 1440, h = 900, wait = 1200, scheme = 'light' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: scheme, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await ctx.addInitScript(([r0]) => { try { localStorage.setItem('empathia.demo.perspective', r0); window.SIGNAL_NOPOP = true; } catch { /* */ } }, [role]);
  const p = await ctx.newPage(); await p.goto(base + hash); await p.waitForSelector(selector, { timeout: 15000 }); await p.waitForTimeout(wait);
  const el = p.locator(selector).first(); await el.scrollIntoViewIfNeeded(); const png = await el.screenshot({ animations: 'disabled' });
  shots[key] = `data:image/jpeg;base64,${(await sharp(png).resize({ width: 1800, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer()).toString('base64')}`;
  await ctx.close();
}
await shot('lite', `#/lite/room/${ROOM}`, '[data-testid=lite-room-3d]', { wait: 3000 });
await shot('guide', `#/guide/room/${ROOM}`, '[data-testid=guide-equipment]');
await shot('here', `#/here/${ROOM}?step=look`, '[data-testid=here-kinds]', { wait: 1500 });
await shot('campus', '#/campus/ATL/4', '[data-testid=floor-stage]', { wait: 2000, role: 'architect' });
await shot('onboard', '#/onboard', '[data-testid=ob-editions]', { role: 'architect' });
await browser.close(); srv.kill();

// 3 · the booklets as HTML, printed by Chromium
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const font = (w, f) => `@font-face{font-family:Inter;font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(path.join(repo, 'apps/demo/dist/fonts', f)).toString('base64')}) format('woff2')}`;
const FONTS = [font(400, 'inter-400.woff2'), font(500, 'inter-500.woff2'), font(600, 'inter-600.woff2'), font(700, 'inter-700.woff2'), `@font-face{font-family:'Inter Display';font-weight:800;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(repo, 'apps/demo/dist/fonts/inter-display-800.woff2')).toString('base64')}) format('woff2')}`].join('');
const EMBLEM = `data:image/svg+xml;base64,${fs.readFileSync(path.join(repo, 'packages/design-tokens/brand/emblem.svg')).toString('base64')}`;
const plan = C.planSvg(r); const PLAN = `data:image/svg+xml;base64,${Buffer.from(plan.svg).toString('base64')}`;
const TODAY = '13 November 2026';
const CSS = `${FONTS}
@page { size: Letter; margin: 0.7in 0.75in 0.8in; }
@page :first { margin: 0; }
:root { --ink:#0F172A; --tx:#1F2937; --mut:#5B6676; --line:#D7DDE5; --teal:#0A7268; --teal2:#45CFC1; --soft:#EEF5F4; --sand:#F6F3EE; }
* { box-sizing: border-box; } html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 400 10pt/1.5 Inter, Helvetica, Arial, sans-serif; color: var(--tx); font-variant-numeric: tabular-nums; }
h1,h2,h3 { color: var(--ink); text-wrap: balance; margin: 0; } h2 { font: 700 20pt/1.15 Inter; letter-spacing: -0.01em; } h3 { font: 600 11.5pt/1.3 Inter; margin: 14pt 0 4pt; }
p { margin: 0 0 7pt; } ul, ol { margin: 0 0 8pt; padding-left: 14pt; } li { margin: 0 0 3pt; }
.cover { height: 11in; width: 8.5in; background: var(--ink); color: #fff; position: relative; overflow: hidden; break-after: page; padding: 0.9in 0.85in; display: flex; flex-direction: column; }
.cover::before { content: ''; position: absolute; right: -2.2in; top: -1.4in; width: 6.4in; height: 6.4in; border-radius: 50%; background: radial-gradient(circle at 40% 40%, rgba(69,207,193,.30), rgba(69,207,193,0) 68%); }
.cover .mark { width: 0.9in; height: 0.9in; } .cover .co { font: 600 9.5pt Inter; letter-spacing: .14em; color: var(--teal2); margin-top: 0.25in; }
.cover h1 { font: 800 40pt/1.02 'Inter Display', Inter; letter-spacing: -0.02em; color: #fff; margin-top: 1.5in; max-width: 6in; }
.cover .sub { font: 400 14pt/1.4 Inter; color: #C9D3DF; margin-top: 14pt; max-width: 5.6in; }
.cover .shot { margin-top: auto; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,.18); max-height: 3.4in; }
.cover .shot img { width: 100%; display: block; object-fit: cover; max-height: 3.4in; }
.cover .meta { display: flex; justify-content: space-between; gap: 12pt; margin-top: 16pt; font: 500 8.5pt/1.4 Inter; color: #AAB6C4; }
.stamp { display: inline-block; border: 1px solid currentColor; border-radius: 3px; padding: 1pt 5pt; font: 600 7.5pt Inter; letter-spacing: .08em; }
.opener { break-before: page; padding-top: 0.35in; } .opener .n { font: 800 64pt/0.9 'Inter Display', Inter; color: var(--teal); } .opener .lead { font: 400 12.5pt/1.5 Inter; color: var(--mut); max-width: 5.6in; margin-top: 8pt; }
.rule { height: 3px; width: 0.8in; background: var(--teal); margin: 14pt 0 16pt; }
.two { columns: 2; column-gap: 0.32in; } .two h3 { break-after: avoid; } .two li, .two p { break-inside: avoid; }
figure { margin: 10pt 0 14pt; break-inside: avoid; } figure img { width: 100%; max-height: 6.4in; object-fit: contain; display: block; border: 1px solid var(--line); border-radius: 8px; background: #fff; } figcaption { font: 400 8pt/1.4 Inter; color: var(--mut); margin-top: 5pt; }
.facts { width: 100%; border-collapse: collapse; margin: 6pt 0 12pt; font-size: 9pt; } .facts th, .facts td { text-align: left; vertical-align: top; padding: 5pt 7pt; border-bottom: 1px solid var(--line); } .facts th { width: 34%; color: var(--ink); font-weight: 600; background: var(--soft); }
.facts td.nr { color: var(--mut); font-style: italic; }
.steps { counter-reset: s; list-style: none; padding: 0; } .steps li { counter-increment: s; position: relative; padding: 0 0 6pt 24pt; break-inside: avoid; } .steps li::before { content: counter(s); position: absolute; left: 0; top: 0; width: 16pt; height: 16pt; border-radius: 50%; background: var(--teal); color: #fff; font: 700 8pt/16pt Inter; text-align: center; }
.steps .why { display: block; color: var(--mut); font-size: 8.5pt; }
.note { background: var(--sand); border-left: 3px solid #B54708; padding: 8pt 10pt; margin: 10pt 0; font-size: 9pt; break-inside: avoid; } .note b { color: #7A2E0E; }
.pill { display: inline-block; font: 600 7.5pt Inter; padding: 1pt 6pt; border-radius: 99px; background: var(--soft); color: var(--teal); margin-right: 4pt; }
.yes { color: #067647; font-weight: 600; } .no { color: var(--mut); }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8pt; margin: 8pt 0 14pt; } .card { border: 1px solid var(--line); border-radius: 8px; padding: 8pt 9pt; break-inside: avoid; } .card b { display: block; color: var(--ink); font-size: 9.5pt; } .card span { font-size: 8.5pt; color: var(--mut); }
.item { padding: 6pt 0; border-bottom: 1px solid var(--line); break-inside: avoid; } .item b { color: var(--ink); } .item .meta { font-size: 8pt; color: var(--mut); } .item ul { margin: 3pt 0 0; font-size: 8.8pt; }
.back { break-before: page; min-height: 9in; display: flex; flex-direction: column; justify-content: flex-end; } .back .mark { width: 0.7in; height: 0.7in; } .back p { font-size: 9pt; color: var(--mut); max-width: 5in; }
.toc { list-style: none; padding: 0; margin: 10pt 0 0; } .toc li { display: flex; gap: 10pt; padding: 6pt 0; border-bottom: 1px solid var(--line); font-size: 10.5pt; } .toc li span:first-child { color: var(--teal); font-weight: 700; width: 22pt; }
`;
const footer = (label) => `<div style="width:100%;font:500 7px Inter,Helvetica,Arial;color:#5B6676;padding:0 0.75in;display:flex;justify-content:space-between"><span>Empathia Technologies · ${esc(label)} · DRAFT · synthetic demonstration</span><span class="pageNumber"></span></div>`;
const coverHtml = ({ title, sub, shot, left, right }) => `<section class="cover"><img class="mark" src="${EMBLEM}" alt=""><div class="co">EMPATHIA TECHNOLOGIES</div><h1>${esc(title)}</h1><div class="sub">${esc(sub)}</div>${shot ? `<div class="shot"><img src="${shot}" alt=""></div>` : ''}<div class="meta"><span>${left}</span><span>${right}</span></div></section>`;
const backHtml = (what) => `<section class="back"><img class="mark" src="${EMBLEM}" alt=""><h3>Empathia Technologies</h3><p>${esc(what)}</p><p>This booklet was set from the Living Campus demonstration on ${TODAY}. Every room, person and organisation in it is synthetic. It is a DRAFT: written by the demonstration’s engineer from the founder’s list of contents and not yet reviewed by a practising specialist. An organisation’s own edition replaces the generic wording with its approved instructions.</p><p>Names of other companies’ products are used only to say which is which; no instruction for another company’s application is written here.</p></section>`;

// End-User Success Guide
const eu = (() => {
  const o = r.outline; const b = C.buildingByKey(o.building);
  const parts = [];
  parts.push(coverHtml({ title: `How to use ${C.shortName(o)}`, sub: `The End-User Success Guide for ${o.name}, ${b?.name || ''}: what is in the room, how to start, share and finish, and what to do when something does not work.`, shot: shots.lite, left: `<span class="stamp">DRAFT</span> &nbsp; Synthetic demonstration`, right: `Revision ${esc(G.revision)} · ${TODAY}` }));
  parts.push(`<section><h2>In this booklet</h2><div class="rule"></div><ol class="toc">${['The room at a glance', 'How to use it, step by step', 'Meetings, sharing and hybrid work', 'When something does not work', 'Finding rooms, accessibility and privacy'].map((t, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><span>${esc(t)}</span></li>`).join('')}</ol>
    <h3>${esc(G.summary)}</h3><p>${esc(G.equipment)}</p><div class="note"><b>Before you start.</b> Nobody using this room is asked to open a cabinet, unplug the room’s equipment or change a setting an engineer set. When a first step does not help, the next step is to ask.</div>
    <h3>After reading this, you can</h3><ul>${G.objectives.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>`);
  parts.push(`<section class="opener"><div class="n">01</div><h2>The room at a glance</h2><p class="lead">${esc(o.intent)}</p><div class="rule"></div>
    <figure><img src="${shots.lite}" alt="The room in Lite"><figcaption>The room in Lite, the demonstration’s 3D view, drawn from the same record as this booklet. Positions are as designed or modelled, not surveyed.</figcaption></figure>
    <table class="facts"><tr><th>Room</th><td>${esc(C.fullName(o))}</td></tr><tr><th>Seats</th><td>${o.capacity}</td></tr><tr><th>Size</th><td>${o.dims[0]} × ${o.dims[1]} m, ceiling ${o.dims[2]} m</td></tr><tr><th>How it is operated</th><td>${esc(G.operatedBy)}</td></tr></table>
    <h3>What the room supports</h3><table class="facts">${G.supports.map((s) => `<tr><th>${esc(s.what)}</th><td><span class="${s.yes ? 'yes' : 'no'}">${s.yes ? 'Yes' : 'No'}</span> — ${esc(s.because)}</td></tr>`).join('')}</table>
    <figure><img src="${PLAN}" alt="Plan of the room"><figcaption>The room drawn from its record: each dot is a device position by layer, with its code. A drawing, not a survey.</figcaption></figure>
    <figure><img src="${shots.here}" alt="What is in the room"><figcaption>What is in the room, by kind, as the “In a room” page shows it.</figcaption></figure></section>`);
  parts.push(`<section class="opener"><div class="n">02</div><h2>How to use it, step by step</h2><p class="lead">Every step below is written for this room’s own equipment. A room without a camera has no camera section, and a step never names equipment the room does not have.</p><div class="rule"></div>
    ${G.sections.map((s) => `<h3>${esc(s.title)}</h3><p>${esc(s.lead)}</p><ol class="steps">${s.steps.map((st) => `<li>${esc(st.do)}${st.why ? `<span class="why">${esc(st.why)}</span>` : ''}</li>`).join('')}</ol>`).join('')}
    ${G.lacks.length ? `<div class="note"><b>Not in this room.</b> ${esc(G.lacks.join(' · '))}</div>` : ''}
    <figure><img src="${shots.guide}" alt="The room guide page"><figcaption>The same guide on screen: the room-guide page in the demonstration.</figcaption></figure></section>`);
  const ch = (ids) => C.CHAPTERS.filter((c) => ids.includes(c.id));
  const chapterHtml = (c) => `<h3>${esc(c.title)}</h3><p><i>${esc(c.summary)}</i></p>${c.sections.map((s) => `<p><b>${esc(s.heading)}.</b></p><ul>${s.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`).join('')}${c.yours ? `<div class="note"><b>Your organisation adds:</b> ${esc(c.yours)} None is recorded in this demonstration.</div>` : ''}`;
  parts.push(`<section class="opener"><div class="n">03</div><h2>Meetings, sharing and hybrid work</h2><p class="lead">The parts that are the same in every room.</p><div class="rule"></div><div class="two">${ch(['meetings', 'rooms', 'sharing', 'hybrid']).map(chapterHtml).join('')}</div></section>`);
  parts.push(`<section class="opener"><div class="n">04</div><h2>When something does not work</h2><p class="lead">Three safe things to try, then ask. Asking early is how rooms get fixed.</p><div class="rule"></div><div class="two">${ch(['help', 'questions']).map(chapterHtml).join('')}</div></section>`);
  parts.push(`<section class="opener"><div class="n">05</div><h2>Finding rooms, accessibility and privacy</h2><div class="rule"></div><figure><img src="${shots.campus}" alt="The floor on the campus map"><figcaption>${esc(b?.name || '')}, floor ${o.floor}, on the campus map: room footprints are their modelled dimensions.</figcaption></figure><div class="two">${ch(['finding', 'accessibility', 'remote', 'security', 'apps']).map(chapterHtml).join('')}</div></section>`);
  parts.push(backHtml('Every room, every device, every decision, with its evidence.'));
  return { file: `end-user-guide-${ROOM.toLowerCase()}`, label: `End-User Success Guide · ${C.shortName(o)}`, html: parts.join('') };
})();

// IT Onboarding Success Guide
const it = (() => {
  const OB = C.OB; const parts = [];
  parts.push(coverHtml({ title: 'IT Onboarding Success Guide', sub: 'Ninety days from an account and a desk to independent in the core of the role: the programme by phase, the checks along the way, and what good looks like at 30, 60 and 90 days.', shot: shots.onboard, left: `<span class="stamp">DRAFT</span> &nbsp; Synthetic demonstration`, right: `${esc(P.tenant)} edition · ${TODAY}` }));
  parts.push(`<section><h2>How this programme works</h2><div class="rule"></div><p>The programme is the same for every organisation. Everything about one organisation (who the manager is, which site, which contacts) is read from that organisation’s own records when the guide is opened, and a field it has not provided is shown as not recorded, never filled in.</p>
    <div class="grid3">${OB.PHASES.map((ph, i) => `<div class="card"><b>${String(i + 1).padStart(2, '0')} · ${esc(ph.title)}</b><span>${esc(ph.when)}</span><br><span>${esc(ph.aim)}</span></div>`).join('')}</div>
    <h3>This edition</h3><table class="facts">${P.fields.map((f) => `<tr><th>${esc(f.label)}</th>${f.value ? `<td>${esc(f.value)}<br><span style="color:var(--mut);font-size:8pt">${esc(f.from)}</span></td>` : `<td class="nr">Not recorded. ${esc(f.from)}.</td>`}</tr>`).join('')}</table></section>`);
  // the rooms the new starter will look after, as the demonstration shows them
  const roomsCh = C.CHAPTERS.find((c) => c.id === 'rooms');
  parts.push(`<section class="opener"><div class="n">00</div><h2>The rooms you will look after</h2><p class="lead">${esc(P.siteName ? `${P.siteName}: ${P.rooms} rooms on record.` : 'The rooms of your site.')} Every room has one record: its equipment, its history and its evidence, the same in every view.</p><div class="rule"></div>
    <figure><img src="${shots.campus}" alt="A floor on the campus map"><figcaption>A floor on the campus map: room footprints are their modelled dimensions, and a room’s glyph counts its open issues.</figcaption></figure>
    <figure><img src="${shots.lite}" alt="A room in Lite"><figcaption>${esc(C.fullName(r.outline))} in Lite, drawn from its record. Positions are as designed or modelled, not surveyed.</figcaption></figure>
    ${roomsCh ? `<div class="two"><h3>${esc(roomsCh.title)}</h3><p><i>${esc(roomsCh.summary)}</i></p>${roomsCh.sections.map((x) => `<p><b>${esc(x.heading)}.</b></p><ul>${x.points.map((pt) => `<li>${esc(pt)}</li>`).join('')}</ul>`).join('')}</div>` : ''}
    <figure><img src="${shots.guide}" alt="A room's equipment, by kind"><figcaption>A room’s equipment by kind, on its room-guide page. A class of device, never a make or model.</figcaption></figure></section>`);
  const who = (i) => (i.owner === 'manager' ? 'The manager' : i.owner === 'mentor' ? 'The mentor' : 'The new starter');
  OB.PHASES.forEach((ph, n) => {
    const items = OB.ITEMS.filter((i) => i.phase === ph.id);
    parts.push(`<section class="opener"><div class="n">${String(n + 1).padStart(2, '0')}</div><h2>${esc(ph.title)}</h2><p class="lead">${esc(ph.when)}. ${esc(ph.aim)}</p><div class="rule"></div>${items.map((i) => `<div class="item"><span class="pill">${esc(i.kind)}</span><b>${esc(i.title)}</b><div class="meta">${who(i)} · confirmed by ${esc(i.confirm)}${i.check ? ` · knowledge check ${esc(i.check)}` : ''}${i.needs ? ` · needs the organisation’s ${esc(i.needs)}` : ''}</div><div>${esc(i.why)}</div>${i.rubric ? `<ul>${i.rubric.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`).join('')}</section>`);
  });
  parts.push(`<section class="opener"><div class="n">07</div><h2>What good looks like at 30, 60 and 90 days</h2><div class="rule"></div><table class="facts"><tr><th>Competency</th><td><b>Day 30 · Day 60 · Day 90</b></td></tr>${OB.COMPETENCIES.map((c) => `<tr><th>${esc(c.title)}</th><td><b>30:</b> ${esc(c.day30)}<br><b>60:</b> ${esc(c.day60)}<br><b>90:</b> ${esc(c.day90)}</td></tr>`).join('')}</table><p>Ratings are ${OB.RATINGS.map((x) => `“${esc(x)}”`).join(', ')}. A rating is a manager’s judgement recorded with its evidence; it grants no authority on its own.</p><p>Examples of professional pathways a person may choose to pursue: ${OB.PATHWAY_EXAMPLES.map(esc).join(', ')}. Naming a pathway is not a requirement and implies no endorsement.</p></section>`);
  parts.push(`<section class="opener"><div class="n">08</div><h2>Knowledge checks</h2><p class="lead">Each check, then the answers with why, at the end of this section.</p><div class="rule"></div><div class="two">${OB.CHECKS.map((c) => `<h3>${esc(c.title)}</h3><ol>${c.questions.map((q) => `<li>${esc(q.q)}<ol type="a">${q.options.map((op) => `<li>${esc(op)}</li>`).join('')}</ol></li>`).join('')}</ol>`).join('')}</div>
    <h3 style="break-before:page">Answers</h3><div class="two">${OB.CHECKS.map((c) => `<p><b>${esc(c.title)}</b></p><ol>${c.questions.map((q) => `<li><b>${String.fromCharCode(97 + q.answer)}</b> — ${esc(q.why)}</li>`).join('')}</ol>`).join('')}</div></section>`);
  parts.push(backHtml('Onboarding that starts before day one and ends with someone able to show the next person.'));
  return { file: 'it-onboarding-success-guide', label: 'IT Onboarding Success Guide', html: parts.join('') };
})();

fs.mkdirSync(out, { recursive: true });
const b2 = await chromium.launch(); const made = [];
for (const bk of [eu, it]) {
  const ctx = await b2.newContext(); const p = await ctx.newPage();
  await p.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(bk.label)}</title><style>${CSS}</style></head><body>${bk.html}</body></html>`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  const pdf = await p.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: footer(bk.label), margin: { top: '0.7in', bottom: '0.8in', left: '0.75in', right: '0.75in' }, tagged: true, outline: true });
  const f = path.join(out, `${bk.file}.pdf`); fs.writeFileSync(f, pdf);
  // the cover as an image for the website's card
  const cp = await ctx.newPage(); await cp.setViewportSize({ width: 816, height: 1056 }); await cp.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${bk.html.split('</section>')[0]}</section></body></html>`); await cp.evaluate(() => document.fonts.ready);
  const png = await cp.screenshot({ clip: { x: 0, y: 0, width: 816, height: 1056 } });
  fs.writeFileSync(path.join(out, `${bk.file}-cover.webp`), await sharp(png).resize(600).webp({ quality: 82 }).toBuffer()); fs.writeFileSync(path.join(out, `${bk.file}-cover.jpg`), await sharp(png).resize(600).jpeg({ quality: 82 }).toBuffer());
  const pages = Number((/Pages:\s+(\d+)/.exec(spawnSync('pdfinfo', [f], { encoding: 'utf8' }).stdout || '') || [])[1] || 0);
  made.push({ file: `${bk.file}.pdf`, title: bk.label, pages, bytes: pdf.length, sha256: crypto.createHash('sha256').update(pdf).digest('hex'), cover: `${bk.file}-cover.webp` });
  await ctx.close();
}
await b2.close();
fs.writeFileSync(path.join(out, 'BOOKLETS.json'), JSON.stringify({ made: TODAY, room: ROOM, status: 'DRAFT', synthetic: true, sources: ['apps/demo/src/guides/roomGuide.ts', 'apps/demo/src/guides/chapters.ts', 'apps/demo/src/onboard/program.ts', 'apps/demo/src/onboard/profile.ts', 'screenshots of the built demonstration (apps/demo/dist)'], booklets: made }, null, 2) + '\n');
for (const m of made) console.log(`${m.file}: ${(m.bytes / 1024).toFixed(0)} KB`);
