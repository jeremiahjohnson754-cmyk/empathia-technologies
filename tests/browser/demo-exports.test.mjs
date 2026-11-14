#!/usr/bin/env node
// The commissioning completion package, downloaded as a person would (founder, 13 Nov 2026: "the export system is especially
// important … a legitimate engineering package, commissioning report, Excel register, and executive PowerPoint presentation").
// Each of the six buttons on #/commissioning/room/:id must hand the browser a real file of its format: the bytes are opened here
// (the Office files as zip packages with their main parts, the PDF by poppler, the JSON by its schema fields and SHA-256, the CSV by
// its provenance lines and header). The file named on the page is the file saved (same SHA-256), each export is written to the
// workspace's audit trail, nothing is fetched from off the page, and the card works at phone width. The deeper reopening of every
// format (openpyxl, python-docx, python-pptx, LibreOffice) is scripts/verify/export-formats.mjs.
//   node tests/browser/demo-exports.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { harness } from './demo-shell-lib.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const JSZip = createRequire(path.join(repo, 'package.json'))('jszip');
const { ok, open, done } = await harness('demo-exports');
const ROOM = 'R-BCN-3-225'; const stem = `CX-${ROOM}-commissioning-package`;
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

{
  const t = await open(`#/commissioning/room/${ROOM}`, { role: 'architect', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  const card = p.getByTestId('cx-export'); await card.waitFor();
  ok('XP-01', 'the commissioning record offers its completion package in six formats', (await card.locator('button[data-format]').count()) === 6 && /Completion package/.test(await card.innerText()));
  const got = {};
  for (const f of ['pdf', 'docx', 'xlsx', 'pptx', 'json', 'csv']) {
    const [dl] = await Promise.all([p.waitForEvent('download'), card.locator(`button[data-format=${f}]`).click()]);
    const file = await dl.path(); got[f] = { name: dl.suggestedFilename(), bytes: fs.readFileSync(file), file };
    await p.getByTestId('export-last').filter({ hasText: got[f].name }).waitFor();
    got[f].shown = await p.getByTestId('export-last').innerText();
  }
  ok('XP-02', 'every file is named for the report and its format, never for a person', Object.entries(got).every(([f, g]) => g.name === `${stem}.${f}`), Object.values(got).map((g) => g.name).join(' '));

  // PDF: a real PDF with text, pages and the title in its metadata
  const info = spawnSync('pdfinfo', [got.pdf.file], { encoding: 'utf8' }).stdout || ''; const txt = spawnSync('pdftotext', [got.pdf.file, '-'], { encoding: 'utf8' }).stdout || '';
  ok('XP-03', 'PDF: opens, several pages, titled, real text with the status and page numbers', got.pdf.bytes.subarray(0, 5).toString() === '%PDF-' && Number((info.match(/Pages:\s+(\d+)/) || [])[1]) >= 5 && /Title:\s+Commissioning completion package/.test(info) && /Status: Blocked/.test(txt) && /page 1 of \d+/.test(txt), info.split('\n').slice(0, 3).join(' | '));

  // the three Office files: zip packages with their main parts
  const zip = async (b) => JSZip.loadAsync(b);
  const dz = await zip(got.docx.bytes); const doc = await dz.file('word/document.xml').async('string'); const ct = await dz.file('[Content_Types].xml').async('string');
  ok('XP-04', 'Word: a .docx package whose document holds the title, the status and the test register', /wordprocessingml\.document\.main/.test(ct) && /Commissioning completion package/.test(doc) && /Test register/.test(doc) && /<w:tblHeader\/>/.test(doc) && !!Object.keys(dz.files).find((n) => n.startsWith('word/media/')));
  const xz = await zip(got.xlsx.bytes); const wb = await xz.file('xl/workbook.xml').async('string'); const sheets = (wb.match(/<sheet /g) || []).length; const s1 = await xz.file('xl/worksheets/sheet1.xml').async('string');
  ok('XP-05', 'Excel: an .xlsx workbook with a summary of COUNTIF totals and one sheet per table', sheets >= 10 && /COUNTIF\(/.test(s1) && /Provenance/.test(wb) && /Test register/.test(wb), `${sheets} sheets`);
  const pz = await zip(got.pptx.bytes); const slides = Object.keys(pz.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length; const charts = Object.keys(pz.files).filter((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n)).length;
  ok('XP-06', 'PowerPoint: a .pptx deck with a native chart and a slide per table, deflated (not stored)', slides >= 10 && charts >= 1 && got.pptx.bytes.length < 600_000, `${slides} slides, ${charts} chart, ${got.pptx.bytes.length} bytes`);

  // JSON: the dossier, with its integrity that recomputes
  const j = JSON.parse(got.json.bytes.toString('utf8')); const { integrity, ...body } = j;
  ok('XP-07', 'JSON: the empathia.dossier/1 record; its SHA-256 recomputes; it names the role it was made as, which grants nothing', j.schema === 'empathia.dossier/1' && integrity?.value === sha(Buffer.from(JSON.stringify(body))) && /Architect/i.test(j.generatedAs) && j.entities?.room?.id === ROOM && j.entities?.acceptanceBlocked === true, integrity?.value);

  // CSV: provenance first, then the register
  const csv = got.csv.bytes.toString('utf8');
  ok('XP-08', 'CSV: provenance as # lines, then the test register with its header', csv.charCodeAt(0) === 0xfeff && /^﻿# /.test(csv) && /# Synthetic demonstration/.test(csv) && /\r\nCheck,Description,Phase,Domain,/.test(csv));

  // the page names the file it saved, and the trail records each one
  ok('XP-09', 'the page shows the SHA-256 of the file it saved (the same bytes the browser received)', got.csv.shown.includes(sha(got.csv.bytes).slice(0, 16)) && got.pdf.shown.includes(sha(got.pdf.bytes).slice(0, 16)));
  const trail = await p.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.workspace.v1') || '{}').events?.filter((e) => e.type === 'export.created') || []);
  ok('XP-10', 'each export is written to the audit trail with its name, size and SHA-256', trail.length === 6 && trail.every((e) => e.aggregate === ROOM && /SHA-256 [0-9a-f]{64}/.test(e.detail)) && trail.some((e) => e.detail.includes(sha(got.xlsx.bytes))), `${trail.length}`);
  ok('XP-11', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();
}
{
  // the reference room's package carries its documentation tracker, the plan drawn in the browser and links back into the record
  const t = await open('#/commissioning/room/R-ATL-4-218', { role: 'architect', sw: false }); const p = t.page; p.setDefaultTimeout(30000);
  const card = p.getByTestId('cx-export'); await card.waitFor();
  const [dj] = await Promise.all([p.waitForEvent('download'), card.locator('button[data-format=json]').click()]);
  const j = JSON.parse(fs.readFileSync(await dj.path(), 'utf8')); const { integrity, ...body } = j;
  const [dd] = await Promise.all([p.waitForEvent('download'), card.locator('button[data-format=docx]').click()]);
  const dz = await JSZip.loadAsync(fs.readFileSync(await dd.path())); const doc = await dz.file('word/document.xml').async('string'); const rels = await dz.file('word/_rels/document.xml.rels').async('string');
  const plan = (j.media || []).find((m) => m.id === 'plan'); const origin = new URL(p.url()).origin;
  ok('XP-DOCS', 'the reference room’s package holds the whole project (the request, the business case on the desk, the lifecycle timeline, service and issue intelligence), the documentation tracker, the plan drawn from its record (a real PNG in the files), and links back to the record’s own pages', !!plan && plan.kind === 'drawing' && plan.bytes > 2000 && /^[0-9a-f]{64}$/.test(plan.sha256)
    && j.tables.Documents?.rows.some((r) => r.state === 'Met') && j.links.length >= 10 && j.links.every((l) => l.url.startsWith(origin)) && j.links.some((l) => /#\/docs\//.test(l.url))
    && integrity.value === sha(Buffer.from(JSON.stringify(body))) && /Documentation/.test(doc)
    && /From the request/.test(doc) && /Lifecycle timeline/.test(doc) && /Service and issue intelligence/.test(doc) && j.tables.Projects?.rows.some((r) => r.id === 'PRJ-ATLAS-AV') && j.tables.Lifecycle?.rows.length >= 5 && j.tables['Service requests']?.rows.length >= 1 && /Drawings and photographs/.test(doc) && Object.keys(dz.files).filter((n) => n.startsWith('word/media/')).length >= 2 && (rels.match(/hyperlink/g) || []).length >= 10 && !t.errs.length && !t.off.length,
    `${plan?.bytes} ${j.links?.length} ${t.errs.join('|')}`);
  await t.close();
}
{
  // the assurance report: the next step of the flagship journey (commissioning → assurance → APEX)
  const t = await open('#/assurance/room/R-ATL-4-218', { role: 'architect', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  const card = p.getByTestId('as-export'); await card.waitFor();
  const [dx] = await Promise.all([p.waitForEvent('download'), card.locator('button[data-format=xlsx]').click()]);
  const xz = await JSZip.loadAsync(fs.readFileSync(await dx.path())); const wb = await xz.file('xl/workbook.xml').async('string');
  const dims = await xz.file('xl/worksheets/sheet2.xml').async('string'); const shared = xz.file('xl/sharedStrings.xml') ? await xz.file('xl/sharedStrings.xml').async('string') : '';
  const [dp] = await Promise.all([p.waitForEvent('download'), card.locator('button[data-format=pdf]').click()]);
  const txt = spawnSync('pdftotext', [await dp.path(), '-'], { encoding: 'utf8' }).stdout || '';
  ok('XP-AS', 'the assurance page exports its report: seventeen dimensions, the changes since handover, the ready check, as the page shows them', dx.suggestedFilename() === 'AS-R-ATL-4-218-assurance-report.xlsx' && /Dimensions/.test(wb) && /Ready check/.test(wb) && (dims.match(/<row /g) || []).length === 18 && /Assurance report/.test(txt) && /Seventeen dimensions/.test(txt) && /nothing was measured/.test(txt.replace(/\s+/g, ' ')) && !t.errs.length && !t.off.length, `${(dims.match(/<row /g) || []).length} rows ${shared.length}`);
  await t.close();
}
{
  // the APEX case report: the end of the journey, with the thread back to commissioning and assurance
  const t = await open('#/v25/apex?case=APX-001', { role: 'cxeng', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  const card = p.getByTestId('apex-export'); await card.waitFor();
  const [dd] = await Promise.all([p.waitForEvent('download'), card.locator('button[data-format=docx]').click()]);
  const doc = await (await JSZip.loadAsync(fs.readFileSync(await dd.path()))).file('word/document.xml').async('string');
  const [dj] = await Promise.all([p.waitForEvent('download'), card.locator('button[data-format=json]').click()]);
  const j = JSON.parse(fs.readFileSync(await dj.path(), 'utf8'));
  ok('XP-APEX', 'the APEX case exports its report: seven layers, ranked hypotheses with why each is not proven, the action tiers, and the thread to commissioning and assurance', dd.suggestedFilename() === 'APX-001-apex-case.docx' && /Seven layers of evidence/.test(doc) && /Hypotheses, ranked/.test(doc) && /Why it is not proven/.test(doc) && /The thread/.test(doc)
    && j.kind === 'apex-case' && j.entities.layers.length === 7 && j.entities.thread.commissioning && j.entities.thread.assurance && Array.isArray(j.entities.hypotheses) && !t.errs.length && !t.off.length, `${dd.suggestedFilename()} ${j.kind}`);
  await t.close();
}
{
  // the portfolio brief: the estate drilled up (buildings, room types) and down (every room); the building filter scopes it
  const t = await open('#/commissioning', { role: 'architect', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  const card = p.getByTestId('estate-export'); await card.waitFor();
  const [d1] = await Promise.all([p.waitForEvent('download'), card.locator('button[data-format=json]').click()]);
  const all = JSON.parse(fs.readFileSync(await d1.path(), 'utf8'));
  await p.getByRole('radio', { name: 'Beacon', exact: true }).click(); await p.waitForTimeout(200);
  const [d2] = await Promise.all([p.waitForEvent('download'), card.locator('button[data-format=json]').click()]);
  const one = JSON.parse(fs.readFileSync(await d2.path(), 'utf8'));
  const [d3] = await Promise.all([p.waitForEvent('download'), card.locator('button[data-format=pptx]').click()]);
  const pz = await JSZip.loadAsync(fs.readFileSync(await d3.path())); const chart = Object.keys(pz.files).some((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n));
  const tiles = await p.getByTestId('tiles').innerText();
  ok('XP-EST', 'the portfolio brief counts what the command centre counts: every room for the campus, only Beacon’s once Beacon is chosen, with a deck that carries a native chart', d1.suggestedFilename() === 'EST-CAMPUS-portfolio-brief.json' && all.entities.rooms.length === all.tables.Rooms.rows.length && all.entities.rooms.length >= 100
    && d2.suggestedFilename() === 'EST-BCN-portfolio-brief.json' && one.entities.rooms.length > 0 && one.entities.rooms.every((r) => r.building === 'BCN') && tiles.includes(`of ${one.entities.rooms.length}`) && chart && !t.errs.length && !t.off.length, `${all.entities.rooms.length} / ${one.entities.rooms.length} · ${tiles.replace(/\s+/g, ' ').slice(0, 60)}`);
  await t.close();
}
{
  const t = await open(`#/commissioning/room/R-ATL-4-218`, { role: 'architect', w: 390, h: 844, sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  const card = p.getByTestId('cx-export'); await card.scrollIntoViewIfNeeded();
  const [dl] = await Promise.all([p.waitForEvent('download'), card.locator('button[data-format=pdf]').click()]);
  const b = fs.readFileSync(await dl.path());
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('XP-phone', 'at phone width the card fits and a PDF still downloads', sw <= 0 && b.subarray(0, 5).toString() === '%PDF-' && dl.suggestedFilename() === 'CX-R-ATL-4-218-commissioning-package.pdf', `${sw} ${dl.suggestedFilename()}`);
  await t.close();
}
await done();
