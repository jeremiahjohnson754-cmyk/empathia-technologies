#!/usr/bin/env node
// Commissioning Phase 5, documentation tracking and submission (founder's directive of 11 Nov 2026, §12 and §13), against the built demo:
// the checklist and what is missing, one deliverable from correction to acceptance to the dossier, the Site Champion's acknowledgement,
// a vendor's submission, the gate on the dossier, applicability across rooms, and field capture on a phone: photograph, mark-up, notes and
// measurements, an offline draft that survives a reload, and a synchronisation that happens once. Run in both schemes:
//   PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/demo-docs5.test.mjs
import crypto from 'node:crypto'; import zlib from 'node:zlib';
import { harness } from './demo-shell-lib.mjs';
const { ok, open, main, done, base } = await harness('demo-docs5');
const R = 'SIM-REPORT-2026-11-08-001'; const LIST = `#/docs/${R}`; const doc = (t) => `#/docs/${R}/${t}`;
const clean = (t) => t.errs.length === 0 && t.off.length === 0;
const over = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
/** the same browser, another role: the record is shared, the role is not */
const as = async (p, role, hash) => { await p.evaluate((r) => localStorage.setItem('empathia.demo.perspective', r), role); await p.goto(`${base}#/investor`); await p.goto(base + hash); await p.reload(); await p.waitForSelector('main h1'); await p.waitForTimeout(350); };
const attr = (p, sel, a) => p.getAttribute(sel, a);
const text = (p, sel) => p.innerText(sel);
const has = (p, sel) => p.locator(sel).count().then((n) => n > 0);
const said = async (p, id = 'doc') => { await p.waitForSelector(`[data-testid=${id}-done], [data-testid=${id}-refused]`); return (await has(p, `[data-testid=${id}-refused]`)) ? `REFUSED ${await text(p, `[data-testid=${id}-refused]`)}` : text(p, `[data-testid=${id}-done]`); };
const PDF = Buffer.from('%PDF-1.4\n% synthetic test file for the Phase 5 suite: not a real drawing\n'); const PDF_SHA = crypto.createHash('sha256').update(PDF).digest('hex');
// a real 64×48 PNG made here, so the browser can decode it
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
const png = (w, h) => { const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 40 + x * 3; raw[o + 1] = 90; raw[o + 2] = 140 + y * 2; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); };
const PNG = png(64, 48);
const fillFields = async (p) => { for (const el of await p.locator('[data-testid=doc-submit] [data-field]').all()) await el.fill(`stated for the test: ${await el.getAttribute('data-field')}`); };
const attach = async (p) => { await p.setInputFiles('[data-testid=doc-file-input]', { name: 'synthetic-r2.pdf', mimeType: 'application/pdf', buffer: PDF }); await p.waitForFunction(() => /SHA-256/.test(document.querySelector('[data-testid=doc-file-chosen]')?.textContent || '')); };

// ── the checklist ──
{ const t = await open(LIST, { role: 'ipm' }); const p = t.page; await p.waitForSelector('[data-testid=docs]');
  const d = await p.evaluate(() => { const r = document.querySelector('[data-testid=docs]'); return { required: r.dataset.required, met: r.dataset.met, blockers: r.dataset.blockers, dropped: r.dataset.dropped, rows: [...document.querySelectorAll('[data-testid=docs-list] > li')].map((x) => `${x.dataset.doc}:${x.dataset.state}:${x.dataset.met}`), rc: document.querySelector('[data-testid=release-controls]')?.dataset.open, note: !!document.querySelector('[data-testid=docs-nothing-mine]') }; });
  ok('D5B-01', 'the checklist reads the record: 13 of 16 required documents complete, none stopping acceptance here, three open, each for its own reason', d.required === '16' && d.met === '13' && d.blockers === '0' && d.dropped === '0' && d.rows.join(' ') === 'commissioning_results:CORRECTION_REQUESTED:no deficiency_closure:SUBMITTED:no training_materials:ACCEPTED:no' && d.note, JSON.stringify(d));
  const m = await main(p);
  ok('D5B-02', 'what is open is said in words: the correction and what the packet lacks, the open deficiencies, the acknowledgement outstanding, and what was due when', /does not include 1 evidence record that the dossier holds: EV-SIM-016/.test(m) && /2 deficiencies are still open: DEF-SIM-001, DEF-SIM-002/.test(m) && /not yet acknowledged by: Site Champion/.test(m) && /It was due on 1 November 2026/.test(m) && /Open on the dossier/.test(m));
  const miss = await p.evaluate(() => [...document.querySelectorAll('[data-testid=docs-missing-list] .d5-findings li')].map((x) => `${x.dataset.blocking}:${x.dataset.finding}`));
  ok('D5B-03', '“what is missing” is findings only, what stops a document first, and asserts no measurement, approval or sign-off of its own', miss.length === 6 && miss[0] === 'yes:evidence_not_in_packet' && miss.slice(1).every((x) => x.startsWith('no:')) && !/\d ?dB|approved by|signed by/i.test(await text(p, '[data-testid=docs-missing-list]')), miss.join(' '));
  const rc = await p.evaluate(() => [...document.querySelectorAll('[data-testid=release-controls] > ol > li')].map((x) => `${x.dataset.control}:${x.dataset.state}`).join(' '));
  ok('D5B-04', 'the ten release controls are computed: five open, five pass', rc === 'tests:OPEN evidence:OPEN deficiencies:OPEN documents:OPEN identity:PASS revisions:PASS signoff:PASS retest:PASS handoff:OPEN baseline:PASS', rc);
  await p.click('.d5-list .kit-seg__opt:has-text("All required")'); const all = await p.locator('[data-testid=docs-list] > li').count();
  await p.click('.d5-list .kit-seg__opt:has-text("Does not apply")'); const na = await p.evaluate(() => [...document.querySelectorAll('[data-testid=docs-list] > li')].map((x) => `${x.dataset.doc}|${x.querySelector('.d5-row__why')?.textContent}`));
  ok('D5B-05', 'all sixteen required are listed, and the two that do not apply say why', all === 16 && na.length === 2 && /rack_elevations\|Not required: the room has no equipment rack/.test(na.join(' ')) && /vendor_signoff\|Not required: the room was not installed by a vendor/.test(na.join(' ')), `${all} ${na.join(' ; ')}`);
  ok('D5B-06', 'no console error and nothing requested off the origin', clean(t), [...t.errs, ...t.off].join(' | ')); await t.close(); }

// ── one deliverable: correction → resubmission → independent acceptance → the dossier ──
{ const t = await open(LIST, { role: 'cxeng' }); const p = t.page; await p.waitForSelector('[data-testid=docs]');
  const mine = await p.evaluate(() => [...document.querySelectorAll('[data-testid=docs-list] > li')].map((x) => `${x.dataset.doc}:${x.dataset.mine}`).join(' '));
  ok('D5B-10', 'for the Commissioning Engineer, “needs me” is the one document they have to correct', mine === 'commissioning_results:yes' && await text(p, '[data-testid=docs-mine]').then((x) => /\b1\b/.test(x)), mine);
  await p.click('[data-testid=docs-list] a:has-text("Commissioning results")'); await p.waitForSelector('[data-testid=doc]');
  const before = await p.evaluate(() => ({ state: document.querySelector('[data-testid=doc]').dataset.state, corr: document.querySelector('[data-testid=doc-correction]')?.textContent || '', review: !!document.querySelector('[data-testid=doc-review]'), correct: !!document.querySelector('[data-testid=doc-correct]'), assign: !!document.querySelector('[data-testid=doc-assign]'), ev: document.querySelector('[data-testid=doc-evidence] legend')?.textContent || '', gate: document.querySelector('[data-testid=doc-gate]')?.textContent || '' }));
  ok('D5B-11', 'the document shows the correction asked, its gate on the dossier, and only the steps this role may take: it can submit, not review its own work, not assign', before.state === 'CORRECTION_REQUESTED' && /camera preset verification \(T-SIM-016\) is missing/.test(before.corr) && !before.review && !before.correct && !before.assign && /29 of 29/.test(before.ev) && /decided by test T-SIM-016/.test(before.gate), JSON.stringify(before));
  await p.click('[data-testid=doc-submit-go]'); const empty = await said(p);
  ok('D5B-12', 'a submission with an empty field and no file is not made, and says exactly what is missing', /^REFUSED Not submitted\. “Test procedure revision” is empty\. No file is attached\./.test(empty) && await attr(p, '[data-testid=doc]', 'data-revision') === '1', empty);
  await fillFields(p); const reqsBefore = t.reqs.length; await attach(p);
  const chosen = await text(p, '[data-testid=doc-file-chosen]');
  await p.click('[data-testid=doc-submit-go]'); const sub = await said(p);
  const after = await p.evaluate(() => ({ state: document.querySelector('[data-testid=doc]').dataset.state, rev: document.querySelector('[data-testid=doc]').dataset.revision, file: document.querySelector('[data-testid=doc-file]')?.textContent || '', findings: [...document.querySelectorAll('[data-testid=doc-findings] li')].map((x) => x.dataset.finding).join(' ') }));
  ok('D5B-13', 'revision 2 is recorded with the file’s name, size and the SHA-256 of its real bytes, computed in the browser', /Revision 2 is on the record/.test(sub) && after.state === 'SUBMITTED' && after.rev === '2' && after.file.includes(PDF_SHA) && after.file.includes('synthetic-r2.pdf') && chosen.includes(PDF_SHA.slice(0, 16)), JSON.stringify(after));
  ok('D5B-14', 'the file went nowhere: choosing and submitting it made no request at all', t.reqs.length === reqsBefore && t.off.length === 0, t.reqs.slice(reqsBefore).join(' '));
  ok('D5B-15', 'the packet now includes every evidence record; what remains is review by someone else', after.findings === 'awaiting_review overdue', after.findings);
  ok('D5B-16', 'the role that submitted is offered no review of it', !(await has(p, '[data-testid=doc-review]')) && !(await has(p, '[data-testid=doc-accept]')));
  await as(p, 'qa', doc('commissioning_results'));
  ok('D5B-17', 'the Document Reviewer is offered the review, and no submission', await has(p, '[data-testid=doc-accept]') && !(await has(p, '[data-testid=doc-submit]')));
  await p.click('[data-testid=doc-accept]'); const acc = await said(p);
  const accd = await p.evaluate(() => ({ state: document.querySelector('[data-testid=doc]').dataset.state, met: document.querySelector('[data-testid=doc]').dataset.met, findings: [...document.querySelectorAll('[data-testid=doc-findings] li')].map((x) => x.dataset.finding).join(' '), toDossier: !!document.querySelector('[data-testid=doc-to-dossier]') }));
  ok('D5B-18', 'accepted here, the requirement is still open: its test on the dossier decides, and the page says so; the reviewer is not offered to record it', /Revision 2 is accepted/.test(acc) && accd.state === 'ACCEPTED' && accd.met === 'no' && accd.findings === 'not_on_dossier' && !accd.toDossier, JSON.stringify(accd));
  await as(p, 'cxeng', doc('commissioning_results')); await p.click('[data-testid=doc-to-dossier-go]'); const rec = await said(p);
  ok('D5B-19', 'the Commissioning Engineer records it on the dossier: the test now cites this revision and waits for independent verification', /Recorded on the dossier: T-SIM-016 now cites this document/.test(rec) && /evidence DOC-commissioning_results-r2, awaiting verification/.test(await text(p, '[data-testid=doc-gate]')), `${rec} | ${await text(p, '[data-testid=doc-gate]')}`);
  await as(p, 'qa', `#/dossier/${R}`); await p.waitForSelector('[data-testid=dossier-tests], [data-testid=dossier-decision]'); await p.click('.pf .kit-seg__opt:has-text("All")').catch(() => undefined); await p.waitForSelector('[data-test=T-SIM-016]');
  const row = await text(p, '[data-test=T-SIM-016]');
  ok('D5B-20', 'on the dossier the test shows the document as its evidence and links back to it', /DOC-commissioning_results-r2/.test(row) && await has(p, '[data-testid=doc-of-T-SIM-016]'), row.slice(0, 200));
  const hist = await (async () => { await as(p, 'qa', doc('commissioning_results')); return p.evaluate(() => [...document.querySelectorAll('[data-testid=doc-history] li')].map((x) => x.dataset.kind).join(' ')); })();
  ok('D5B-21', 'the whole history is kept, in order', hist === 'ASSIGN SUBMIT REQUEST_CORRECTION SUBMIT ACCEPT', hist);
  ok('D5B-22', 'no console error through the journey', clean(t), [...t.errs, ...t.off].join(' | ')); await t.close(); }

// ── the Site Champion: reads what they acknowledge, acknowledges it, and nothing else ──
{ const t = await open('#/site', { role: 'sitechamp', w: 390, h: 844 }); const p = t.page; await p.waitForSelector('[data-testid=site]');
  ok('D5B-30', 'the champion’s own page says an operator guide is waiting for them', /operator guide .* is accepted and waiting for you to read and acknowledge it/.test(await text(p, '[data-testid=site-to-read]')));
  await p.click('[data-testid=site-to-read] a'); await p.waitForSelector('[data-testid=doc]');
  const v = await p.evaluate(() => ({ doc: document.querySelector('[data-testid=doc]').dataset.doc, findings: !!document.querySelector('[data-testid=doc-findings]'), gate: !!document.querySelector('[data-testid=doc-gate]'), submit: !!document.querySelector('[data-testid=doc-submit]'), review: !!document.querySelector('[data-testid=doc-accept]'), ack: !!document.querySelector('[data-testid=doc-ack-go]'), links: [...document.querySelectorAll('main a')].map((a) => a.getAttribute('href')).filter((h) => /dossier|commissioning/.test(h || '')).length }));
  ok('D5B-31', 'the champion sees the guide’s own record and one step, to acknowledge; no findings, no dossier, no submission, no review', v.doc === 'training_materials' && !v.findings && !v.gate && !v.submit && !v.review && v.ack && v.links === 0, JSON.stringify(v));
  await p.click('[data-testid=doc-ack-go]'); const a = await said(p);
  ok('D5B-32', 'acknowledging says what it is and is recorded against the role', /Acknowledged by the Site Champion/.test(a) && await attr(p, '[data-ack=sitechamp]', 'data-done') === 'yes' && !(await has(p, '[data-testid=doc-ack-go]')), a);
  await p.reload(); await p.waitForSelector('[data-testid=doc]');
  ok('D5B-33', 'it survives a reload', await attr(p, '[data-ack=sitechamp]', 'data-done') === 'yes');
  await p.goto(base + LIST); await p.reload(); await p.waitForSelector('[data-testid=docs]');
  const l = await p.evaluate(() => ({ rows: [...document.querySelectorAll('[data-testid=docs-list] > li')].map((x) => x.dataset.doc).join(' '), totals: !!document.querySelector('[data-testid=docs-totals]'), rc: !!document.querySelector('[data-testid=release-controls]'), missing: !!document.querySelector('[data-testid=docs-missing-list]'), txt: document.querySelector('main').innerText }));
  ok('D5B-34', 'the champion’s checklist is the one document they acknowledge: no totals, no findings, no release controls, no other document named', l.rows === 'training_materials' && !l.totals && !l.rc && !l.missing && /You have acknowledged it/.test(l.txt) && !/Network diagram|Commissioning results|T-SIM-/.test(l.txt), l.rows);
  const hidden = [];
  for (const [hash, id] of [[doc('network_diagram'), 'doc-missing'], ['#/docs/applies', 'docs-applies-hidden'], [doc('capture'), 'capture-hidden']]) { await p.goto(base + hash); await p.reload(); await p.waitForSelector('main h1'); if (await has(p, `[data-testid=${id}]`)) hidden.push(id); }
  ok('D5B-35', 'another document, the applicability page and field capture are not part of the champion’s view', hidden.length === 3, hidden.join(' '));
  ok('D5B-36', 'on a phone nothing scrolls sideways and nothing errors', await over(p) <= 0 && clean(t), [...t.errs, ...t.off].join(' | ')); await t.close(); }

// ── the gate: a document reopened stops the room; corrected and accepted, it no longer does. A new as-built makes what was drawn from it outdated ──
{ const t = await open(doc('network_diagram'), { role: 'architect' }); const p = t.page; await p.waitForSelector('[data-testid=doc]');
  await p.fill('[data-testid=doc-correct-text]', 'short'); await p.click('[data-testid=doc-correct-go]'); const short = await said(p);
  ok('D5B-40', 'a correction of one word is refused in words and what was typed is kept', /^REFUSED Say what has to be corrected, in at least 12 characters/.test(short) && await p.inputValue('[data-testid=doc-correct-text]') === 'short', short);
  await p.fill('[data-testid=doc-correct-text]', 'The control VLAN is not shown on the diagram.'); await p.click('[data-testid=doc-correct-go]'); await said(p);
  ok('D5B-41', 'an accepted document can be reopened by a reviewer; it is no longer accepted', await attr(p, '[data-testid=doc]', 'data-state') === 'CORRECTION_REQUESTED');
  await as(p, 'svcmgr', `#/dossier/${R}`); await p.waitForSelector('[data-testid=dossier-blockers]');
  const b = await p.evaluate(() => ({ line: document.querySelector('[data-blocker=document]')?.textContent || '', href: document.querySelector('[data-blocker=document] a')?.getAttribute('href'), rc: document.querySelector('[data-control=documents]')?.textContent || '', n: document.querySelectorAll('[data-testid=dossier-blockers] li').length }));
  ok('D5B-42', 'the dossier lists the document among what stops acceptance, links to it, and its release control says the same', /Documentation document “Network diagram” has a correction requested/.test(b.line) && b.href === `#/docs/${R}` && /Network diagram/.test(b.rc) && b.n === 8, JSON.stringify(b).slice(0, 300));
  await as(p, 'ipm', LIST); await p.waitForSelector('[data-testid=docs]');
  ok('D5B-43', 'the tracker counts it: one document stops acceptance here', await attr(p, '[data-testid=docs]', 'data-blockers') === '1' && /1 document stops acceptance here/.test(await main(p)));
  await as(p, 'syseng', doc('network_diagram')); await fillFields(p); await attach(p); await p.click('[data-testid=doc-submit-go]'); await said(p);
  await as(p, 'qa', doc('network_diagram')); await p.click('[data-testid=doc-accept]'); await said(p);
  await as(p, 'svcmgr', `#/dossier/${R}`); await p.waitForSelector('[data-testid=dossier-blockers]');
  ok('D5B-44', 'corrected, resubmitted and accepted by another role, the document no longer stops the room', !(await has(p, '[data-blocker=document]')) && await p.locator('[data-testid=dossier-blockers] li').count() === 7);
  // a new as-built
  await as(p, 'designer', doc('as_built_drawings')); await fillFields(p); await attach(p); await p.click('[data-testid=doc-submit-go]'); await said(p);
  await as(p, 'qa', doc('as_built_drawings')); await p.click('[data-testid=doc-accept]'); await said(p);
  await as(p, 'qa', LIST); await p.waitForSelector('[data-testid=docs]'); await p.click('.d5-list .kit-seg__opt:has-text("Open")');
  const out = await p.evaluate(() => [...document.querySelectorAll('[data-testid=docs-list] > li')].map((x) => `${x.dataset.doc}:${x.dataset.state}`).filter((x) => /OUTDATED/.test(x)).join(' '));
  ok('D5B-45', 'a new as-built drawing makes the signal flow drawn from the old one outdated (the network diagram, just redrawn against it, is not)', out === 'signal_flow:OUTDATED', out);
  ok('D5B-46', 'and the finding says which revision it was written against and which is current', /was written against revision 1 of the as-built drawings, which is now at revision 2/.test(await main(p)));
  ok('D5B-47', 'no console error through the journey', clean(t), [...t.errs, ...t.off].join(' | ')); await t.close(); }

// ── assignment and a vendor's submission ──
{ const t = await open(doc('warranty_information'), { role: 'ipm' }); const p = t.page; await p.waitForSelector('[data-testid=doc]');
  const f = await p.evaluate(() => ({ h: document.querySelector('[data-testid=doc-submit] .d5-h')?.textContent, vendor: !!document.querySelector('[data-testid=doc-vendor]'), assign: !!document.querySelector('[data-testid=doc-assign]') }));
  ok('D5B-50', 'the Integration PM does not submit the installer’s document as their own: they may record what a vendor sent, and assign', /Record revision 2 as received from a vendor/.test(f.h || '') && f.vendor && f.assign, JSON.stringify(f));
  await p.click('[data-testid=doc-submit-go]'); const nov = await said(p);
  ok('D5B-51', 'a vendor’s submission must name the vendor', /^REFUSED Say which vendor sent it/.test(nov), nov);
  await p.fill('[data-testid=doc-vendor]', 'Synthetic Integration Ltd (fictional)'); await p.locator('[data-field=provider]').fill('Synthetic Integration Ltd'); await p.click('[data-testid=doc-submit-go]'); const v = await said(p);
  const vd = await p.evaluate(() => ({ state: document.querySelector('[data-testid=doc]').dataset.state, sub: document.querySelector('[data-testid=doc-current]')?.textContent || '', findings: [...document.querySelectorAll('[data-testid=doc-findings] li')].map((x) => `${x.dataset.finding}:${x.dataset.blocking}`).join(' '), hist: [...document.querySelectorAll('[data-testid=doc-history] li')].pop()?.textContent || '' }));
  ok('D5B-52', 'it is recorded as received, gaps and all: the two fields the vendor left empty are findings that stop it being accepted', /Revision 2 is on the record/.test(v) && vd.state === 'SUBMITTED' && /Received from Synthetic Integration Ltd \(fictional\), recorded by the Integration PM/.test(vd.sub) && (vd.findings.match(/field_empty:yes/g) || []).length === 2 && /recorded revision 2 as received from/.test(vd.hist), JSON.stringify(vd).slice(0, 400));
  await as(p, 'qa', doc('warranty_information')); await p.click('[data-testid=doc-accept]'); const no = await said(p);
  ok('D5B-53', 'a reviewer cannot accept it while a required field is empty', /^REFUSED Revision 2 cannot be accepted: “Start date” is empty in revision 2\. “Term” is empty/.test(no), no);
  await as(p, 'ipm', doc('bom_revision')); await p.selectOption('#as-owner', 'syseng'); await p.click('[data-testid=doc-assign-go]'); const asg = await said(p);
  ok('D5B-54', 'reassigning names the new owner and the due date', /Assigned to the Systems Engineer, due/.test(asg) && /Systems Engineer/.test(await text(p, '[data-testid=doc-owner]')), asg);
  await as(p, 'designer', doc('bom_revision'));
  ok('D5B-55', 'the Designer, no longer its owner, is offered no submission of it', !(await has(p, '[data-testid=doc-submit]')) && await has(p, '[data-testid=doc-readonly]'));
  ok('D5B-56', 'no console error', clean(t), [...t.errs, ...t.off].join(' | ')); await t.close(); }

// ── applicability ──
{ const t = await open('#/docs/applies', { role: 'designer' }); const p = t.page; await p.waitForSelector('[data-testid=docs-applies]');
  const c = await p.evaluate(() => [...document.querySelectorAll('.d5-applies__col')].map((x) => ({ room: x.dataset.room, n: Number(x.dataset.required), rack: x.querySelector('[data-doc=rack_elevations]').dataset.applies, rows: x.querySelectorAll('li').length })));
  ok('D5B-60', 'three contrasting rooms side by side, each considered for the same eighteen deliverables: the smallest is asked for least, and the tracked room is one of them', c.length === 3 && c.every((x) => x.rows === 18) && c[0].n < c[1].n && c[1].room === 'R-ATL-4-218' && c[1].n === 16 && c[1].rack === 'no' && c[2].rack === 'yes', JSON.stringify(c));
  const firstOther = await p.evaluate(() => [...document.querySelectorAll('[data-testid=applies-room-0] option')].map((o) => o.value).find((v) => v !== document.querySelector('[data-testid=applies-room-0]').value));
  await p.selectOption('[data-testid=applies-room-0]', firstOther); await p.waitForFunction((v) => document.querySelector('.d5-applies__col')?.dataset.room === v, firstOther);
  ok('D5B-61', 'any of the 90 rooms can be put in a column, and every row gives its reason', await p.locator('[data-testid=applies-room-0] option').count() === 90 && await p.evaluate(() => [...document.querySelectorAll('.d5-applies__col li > span > span')].every((x) => x.textContent.length > 12)));
  ok('D5B-62', 'no console error', clean(t), [...t.errs, ...t.off].join(' | ')); await t.close(); }

// ── field capture on a phone ──
{ const t = await open(doc('capture'), { role: 'cxeng', w: 390, h: 844 }); const p = t.page; await p.waitForSelector('[data-testid=capture]');
  ok('D5B-70', 'field capture opens for a role that works in the room, says drafts are kept on the device, and starts empty', await attr(p, '[data-testid=capture]', 'data-durable') === 'yes' && await p.locator('[data-testid=capture-drafts] li').count() === 0 && /Photographs stay in this browser/.test(await main(p)));
  await p.selectOption('[data-testid=capture-for-test]', 'test:T-SIM-030'); await p.waitForSelector('[data-testid=capture-bar]');
  const key = (await text(p, '[data-testid=capture-bar] code')).trim();
  ok('D5B-71', 'a capture has its own reference and shows what must be in the frame for the kind of photograph', /^CAP-[A-Z0-9]{8}$/.test(key) && await p.locator('[data-testid=capture-guide] li').count() === 3 && await attr(p, '[data-testid=capture-stage]', 'data-has-image') === 'no', key);
  await p.selectOption('[data-testid=capture-frame]', 'reading'); ok('D5B-72', 'the guidance follows the kind of photograph', /The value and its unit readable/.test(await text(p, '[data-testid=capture-guide]')));
  const r0 = t.reqs.length; await p.setInputFiles('[data-testid=capture-file]', { name: 'caption-panel.png', mimeType: 'image/png', buffer: PNG }); await p.waitForFunction(() => document.querySelector('[data-testid=capture-stage]')?.dataset.hasImage === 'yes');
  ok('D5B-73', 'the photograph is shown with the framing guide over it; its name, size and checksum are noted; nothing was sent', /caption-panel\.png/.test(await text(p, '[data-testid=capture-photo-meta]')) && (await text(p, '[data-testid=capture-photo-meta]')).includes(crypto.createHash('sha256').update(PNG).digest('hex').slice(0, 16)) && t.reqs.length === r0 && t.off.length === 0);
  await p.click('[data-testid=capture-mark-centre]'); const box = await p.locator('[data-testid=capture-stage]').boundingBox();
  await p.click('[data-tool=box]'); await p.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2); await p.mouse.down(); await p.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 4 }); await p.mouse.up();
  await p.click('[data-tool=label]'); await p.fill('[data-testid=capture-label-text]', 'Captions on'); await p.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.8);
  const marks3 = await attr(p, '[data-testid=capture-stage]', 'data-marks'); await p.click('[data-testid=capture-mark-undo]');
  ok('D5B-74', 'an arrow, a dragged box and a label are drawn on the photograph, and the last can be undone', marks3 === '3' && await attr(p, '[data-testid=capture-stage]', 'data-marks') === '2' && await p.locator('[data-testid=capture-stage] .d5-stage__mark').count() === 2, marks3);
  await p.fill('[data-testid=capture-note]', 'Captioning switched on from the touch panel; shown on the left display.');
  await p.click('[data-testid=capture-add-measure]');
  const blank = await p.evaluate(() => [...document.querySelectorAll('[data-measure="0"] input')].map((i) => i.value).join('|'));
  ok('D5B-75', 'a new measurement is five empty fields: nothing is filled in for the person', blank === '||||', blank);
  await p.fill('[data-measure="0"] [data-m=quantity]', 'Caption delay behind speech'); await p.fill('[data-measure="0"] [data-m=value]', 'about two');
  await p.click('[data-testid=capture-sync-go]'); const bad = await said(p, 'capture');
  ok('D5B-76', 'a measurement that is not a number, with no unit, instrument or method, is not synchronised, and each gap is named', /^REFUSED/.test(bad) && /value has to be a number, as it was read/.test(bad) && /give the unit/.test(bad) && /name the instrument/.test(bad) && /say how it was measured/.test(bad), bad);
  await p.fill('[data-measure="0"] [data-m=value]', '2,4'); await p.fill('[data-measure="0"] [data-m=unit]', 's'); await p.fill('[data-measure="0"] [data-m=instrument]', 'Stopwatch (synthetic)'); await p.fill('[data-measure="0"] [data-m=method]', 'Ten phrases, mean of the delays');
  await p.waitForFunction(() => document.querySelector('[data-testid=capture-saved]')?.dataset.saved === 'yes'); await p.waitForTimeout(700);
  await p.reload(); await p.waitForSelector('[data-testid=capture-drafts]'); await p.waitForSelector(`[data-draft=${key}]`);
  ok('D5B-77', 'the draft was saved as it was typed and is still on the device after a reload, not yet synchronised', await attr(p, `[data-draft=${key}]`, 'data-synced') === 'no' && /photograph · 1 measurement/.test(await text(p, `[data-draft=${key}]`)));
  await p.click(`[data-draft=${key}] [data-act=resume]`); await p.waitForSelector('[data-testid=capture-bar]');
  const back = await p.evaluate(() => ({ note: document.querySelector('[data-testid=capture-note]').value, marks: document.querySelector('[data-testid=capture-stage]').dataset.marks, img: document.querySelector('[data-testid=capture-stage]').dataset.hasImage, v: document.querySelector('[data-measure="0"] [data-m=value]').value, frame: document.querySelector('[data-testid=capture-frame]').value }));
  ok('D5B-78', 'reopened, it has the photograph, both marks, the note, the measurement as typed and the kind of photograph', back.img === 'yes' && back.marks === '2' && /Captioning switched on/.test(back.note) && back.v === '2,4' && back.frame === 'reading', JSON.stringify(back));
  await t.ctx.setOffline(true); await p.waitForFunction(() => document.querySelector('[data-testid=capture]').dataset.online === 'no'); await p.click('[data-testid=capture-sync-go]'); const off = await said(p, 'capture');
  ok('D5B-79', 'offline, synchronising is refused in words and the draft stays', /^REFUSED This device is offline\. The draft is kept here/.test(off), off);
  await t.ctx.setOffline(false); await p.waitForFunction(() => document.querySelector('[data-testid=capture]').dataset.online === 'yes'); await p.click('[data-testid=capture-sync-go]'); const s1 = await said(p, 'capture');
  await p.click('[data-testid=capture-sync-go]'); await p.waitForFunction(() => /already synchronised/.test(document.querySelector('[data-testid=capture-done]')?.textContent || '')); const s2 = await text(p, '[data-testid=capture-done]');
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.docs5.captures.v1') || '[]'));
  ok('D5B-80', 'back online it synchronises once; a second synchronisation adds nothing', new RegExp(`Synchronised once\\. ${key} is on the record`).test(s1) && /was already synchronised\. Nothing was added/.test(s2) && stored.length === 1, `${s1} | ${s2} | ${stored.length}`);
  ok('D5B-81', 'what reached the record is the note, the measurement as a number, and the photograph’s name, size and checksum; not the photograph', stored[0].measurements[0].value === 2.4 && stored[0].measurements[0].unit === 's' && stored[0].photo.annotated === true && stored[0].photo.name === 'caption-panel.png' && !JSON.stringify(stored).includes('data:image') && stored[0].by.role === 'cxeng', JSON.stringify(stored[0]).slice(0, 300));
  const p2 = await t.ctx.newPage(); await p2.goto(base + doc('capture')); await p2.waitForSelector(`[data-draft=${key}]`); await p2.click(`[data-draft=${key}] [data-act=resume]`); await p2.click('[data-testid=capture-sync-go]'); await p2.waitForSelector('[data-testid=capture-done]');
  ok('D5B-82', 'a second tab synchronising the same draft adds nothing either', /already synchronised/.test(await p2.innerText('[data-testid=capture-done]')) && await p2.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.docs5.captures.v1')).length) === 1); await p2.close();
  await p.click('[data-testid=capture-attach]'); const at = await said(p, 'capture');
  ok('D5B-83', 'the capture can be made the evidence of the test it was taken for, which then waits for independent verification', new RegExp(`${key} is now the evidence record of T-SIM-030`).test(at) && !(await has(p, '[data-testid=capture-attach]')), at);
  await p.goto(base + LIST); await p.reload(); await p.waitForSelector('[data-testid=docs-captures]');
  const cap = await text(p, '[data-testid=docs-captures]');
  ok('D5B-84', 'the checklist shows the capture once, with who took it, the measurement and the photograph’s name', new RegExp(key).test(cap) && /Caption delay behind speech: 2\.4 s, Stopwatch \(synthetic\), Ten phrases/.test(cap) && /caption-panel\.png .*annotated/.test(cap) && await p.locator('[data-capture]').count() === 1, cap.slice(0, 300));
  ok('D5B-85', 'on a phone nothing scrolls sideways, and the journey made no error and no request off the origin', await over(p) <= 0 && clean(t), [...t.errs, ...t.off].join(' | ')); await t.close(); }

// ── who may open it; untrusted storage; small screens; the dossier's hooks ──
{ const refused = []; for (const role of ['visitor', 'employee', 'bpm', 'steward']) { const t = await open(LIST, { role }); await t.page.waitForTimeout(500); if (await t.page.locator('[data-testid=access-page]').count() === 1 && !t.reqs.some((r) => /DocsPage/.test(r))) refused.push(role); await t.close(); }
  ok('D5B-90', 'a visitor, an employee, the Internal PM and the Data Steward are refused the documentation with the access page, and its code is not downloaded', refused.length === 4, refused.join(' '));
  const t0 = await open(doc('capture'), { role: 'exec' }); ok('D5B-91', 'an Executive reads the checklist but is not offered field capture', await has(t0.page, '[data-testid=capture-hidden]')); await t0.close();
  const forged = [{ kind: 'ACCEPT', doc: 'commissioning_results', revision: 1, by: { role: 'cxeng', label: 'Commissioning Engineer' }, at: new Date().toISOString() }, { kind: 'ACKNOWLEDGE', doc: 'training_materials', revision: 1, by: { role: 'employee', label: 'Employee' }, at: new Date().toISOString() }, { nonsense: true }];
  const t = await open(LIST, { role: 'qa', init: `try { if (!sessionStorage.getItem('__forged')) { localStorage.setItem('empathia.demo.docs5.v1', ${JSON.stringify(JSON.stringify(forged))}); sessionStorage.setItem('__forged', '1'); } } catch {}` }); const p = t.page; await p.waitForSelector('[data-testid=docs]');
  ok('D5B-92', 'a forged self-acceptance and an acknowledgement by a role nobody asked, written straight into storage, are refused by the rules, counted, and change nothing', await attr(p, '[data-testid=docs]', 'data-dropped') === '2' && await attr(p, '[data-testid=docs]', 'data-met') === '13' && /2 stored records were refused by the rules/.test(await text(p, '[data-testid=docs-dropped]')), await attr(p, '[data-testid=docs]', 'data-dropped'));
  await t.close();
  for (const w of [390, 320]) { const s = await open(doc('asset_list'), { role: 'installer', w, h: 760 }); await s.page.waitForSelector('[data-testid=doc]'); const o1 = await over(s.page);
    const small = await s.page.evaluate(() => [...document.querySelectorAll('.d5 .ui-btn, .d5 select, .d5 input[type=text]')].filter((b) => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 43.5).length);
    await s.page.goto(base + LIST); await s.page.reload(); await s.page.waitForSelector('[data-testid=docs]'); const o2 = await over(s.page);
    ok(`D5B-93-${w}`, `at ${w} px the checklist and a deliverable with its eleven positions fit the screen, and every control is at least 44 px tall`, o1 <= 0 && o2 <= 0 && small === 0 && clean(s), `${o1} ${o2} small=${small} ${s.errs.join('|')}`); await s.close(); }
  const d = await open(`#/dossier/${R}`, { role: 'svcmgr' }); await d.page.waitForSelector('[data-testid=release-controls]');
  ok('D5B-94', 'the dossier shows the same ten release controls and links to the documentation', await d.page.locator('[data-testid=release-controls] > ol > li').count() === 10 && await d.page.locator('[data-testid=release-controls] a').getAttribute('href') === `#/docs/${R}` && clean(d), d.errs.join('|')); await d.close();
  const q = await open('#/scan/SIM-AV-0042', { role: 'svcmgr' }); await q.page.waitForSelector('[data-testid=scan-passport]');
  ok('D5B-95', 'the label’s passport offers the room’s documents to a role that may read them', await q.page.locator(`[data-testid=scan-passport] a[href="#/docs/${R}"]`).count() === 1); await q.close();
  const z = await open(LIST, { role: 'ipm' }); await z.page.waitForSelector('[data-testid=docs]'); await as(z.page, 'architect', doc('support_contacts')); await z.page.fill('[data-testid=doc-correct-text]', 'Escalation path is not named.'); await z.page.click('[data-testid=doc-correct-go]'); await said(z.page);
  await as(z.page, 'ipm', LIST); await z.page.waitForSelector('[data-testid=docs-reset]'); await z.page.click('[data-testid=docs-reset]'); await z.page.waitForFunction(() => document.querySelector('[data-testid=docs]').dataset.blockers === '0');
  ok('D5B-96', '“start the demonstration again” returns the tracker to the report’s record', await attr(z.page, '[data-testid=docs]', 'data-met') === '13' && !(await has(z.page, '[data-testid=docs-reset]'))); await z.close(); }

await done();
