# Export platform

Founder, 13 Nov 2026: "the export system is especially important. A beautiful digital-twin room that can produce a legitimate
engineering package, commissioning report, Excel register, and executive PowerPoint presentation is much more valuable than a
beautiful room alone."

## How it works

One format-neutral report, six native files, so the files cannot disagree with one another or with the page.

| Piece | File | Role |
|---|---|---|
| Report model | `apps/demo/src/export/model.ts` | `empathia.report/1`: scope, status and why, role made as, build, provenance lines, KPIs, an optional chart, sections (text, facts, bullets, tables), the dossier entities |
| Writers | `apps/demo/src/export/render.ts` | `toPdf` (pdf-lib), `toDocx` (docx), `toXlsx` (the demo's own OOXML writer), `toPptx` (pptxgenjs, re-deflated with JSZip), `toJson`, `toCsv` |
| Commissioning package | `apps/demo/src/export/cx.ts` | builds the report from a room record through `campus/cxRecord.ts`, the same rules the page uses |
| APEX case report | `apps/demo/src/export/apex.ts` | the seven layers and what they cite, ranked hypotheses with why each is not proven, every action (blocked ones included), the tiers and runbooks, and the thread back through ServiceHands, Assurance and Commissioning; on `#/v25/apex` |
| Portfolio brief | `apps/demo/src/export/estate.ts` | the estate, or the building or floor drilled to on `#/commissioning` and `#/assurance` (docs/product/DRILL_DOWN.md), drilled up by building and room type and down to every room, the rooms to act on first, open deficiencies, the four-week assurance trend; on `#/commissioning` and `#/assurance` |
| Assurance report | `apps/demo/src/export/as.ts` | the seventeen dimensions, Commissioned ↔ current changes, the ready check, the room's service requests, baselines (`campus/asRecord.ts`, `assurance/model.ts`); on `#/assurance/room/:id` |
| Shared rules | `apps/demo/src/campus/cxRecord.ts` | five phases, the three acceptance blockers, traceability, the commissioning state (moved here from the pages so the page and the files share one rule) |
| UI | `apps/demo/src/export/ExportMenu.tsx` | six buttons on `#/commissioning/room/:id`; a Blob download; the file's SHA-256 shown and written to the audit trail |
| Documentation, pictures, links | `apps/demo/src/export/cxExtras.ts`, `plan.ts`, `media.ts` | the commissioning package adds every document the room requires and why (`requiredFor` over its record); for the dossier's room, the tracker's state, revision and file fingerprint, its findings, the field captures synchronised into it, and the photographs this browser still holds for them; the room's plan drawn from its record (SVG, rasterised in the browser; captioned as a drawing, never a photograph); live links back to the record's pages and documents |
| Shield | `apps/demo/src/export/mark.ts` | the page's own `brand/emblem.svg` drawn to a 256 px PNG; without it, files are written without a shield, never with a substitute |
| JSON schema | `apps/demo/src/export/dossier.schema.json` | `empathia.dossier/1` (draft 2020-12) |

The libraries (MIT: docx 9.8.1, pptxgenjs 4.0.1, pdf-lib 1.17.1, jszip 3.10.1) load only when a file is asked for. They are part of
the offline shell, so a saved app can still export.

## What each file holds (commissioning completion package)

| Format | Contents |
|---|---|
| PDF | Title page (shield, status and why, scope, role, build, provenance); summary with figures; acceptance decision; scope; five phases; test register; traceability; deficiencies; design findings; asset inventory; connections; installation record; documentation coverage; sign-off; baselines; audit trail; provenance. Running header, "page n of N" footer, document metadata. Real text, wrapped and paginated, with table headers repeated on each page. |
| Word | The same report, editable: title page, header with the shield, page-numbered footer, Heading 1 styles (navigation pane), fact tables, data tables with a repeating header row, document properties. |
| Excel | Summary sheet (report facts, KPIs, COUNTIF totals per status column with cached values), one sheet per table (frozen, filterable header), Provenance, Dictionary. Text that would run as a formula stays text. |
| PowerPoint | Title; "In brief" figures; status with the acceptance decision and a native, editable stacked bar chart of checks by phase; a native table per table (up to 3 slides each; the workbook carries the rest); "What this deck is, and is not". |
| JSON | `empathia.dossier/1`: every table, the structured entities (room, results, trace, positions, proposed connections, issues, baselines, exception, counts) and a SHA-256 of the body. |
| CSV | The test register, provenance as `#` lines, UTF-8 with BOM, formula-injection safe. |

Every file states: synthetic records; results as recorded, nothing measured and no device contacted; devices as classes (no make,
model or serial); connections proposed by rules, not traced; the role it was made as, which grants nothing; standards named only.

## Validation

`node scripts/verify/export-formats.mjs [--out=dir] [--no-office]` bundles the page's own export code for Node, writes the package of
five rooms (the reference room, a blocked room, an accepted room with an open deficiency, the earlier record with no device
positions, the largest room) plus one hostile report (formula-like cells, characters outside the PDF font, an empty table, 600 rows,
unbroken long words), then reopens every file with independent readers (`export-formats-check.py`, run with `python3 -I`):

- XLSX: openpyxl; sheet count, every row, no data cell is a formula, frozen headers, each COUNTIF's cached value equals a recount.
- CSV: the csv module; header and every row of the primary table, no cell can run as a formula, provenance lines present.
- JSON: jsonschema against `dossier.schema.json`; the SHA-256 recomputes; every table present.
- DOCX: python-docx; title, subtitle and status; a table per data table with a repeating header; PAGE/NUMPAGES fields; properties; the shield.
- PPTX: python-pptx; slide count, a native chart, native tables, provenance text.
- PDF: pdfinfo/pdftotext; pages, title metadata, real text, "page n of N" on every page; page images for review.
- LibreOffice converts the DOCX, XLSX and PPTX of the first room to PDF.

13 Nov 2026 (22:40 CT): 518 checks pass, 0 fail (16 reports × 6 formats, LibreOffice included; the reference room's package carries its tracker, a test-fixture capture photograph (generated, labelled as a fixture) and 27 links, checked as embedded images, hyperlinks and PDF link annotations).

`tests/browser/demo-exports.test.mjs` downloads all six from the page as a person would and opens the bytes (16 checks, desktop and
phone: the reference room's documentation, plan and links; commissioning, assurance, APEX and the portfolio brief with its building filter): file names, PDF pages and text, the Office packages' main parts, the JSON schema and SHA-256, the CSV header, the SHA-256
shown on the page equals the downloaded file's, six audit-trail events, no console error and no off-page request.

## Known limits (not hidden)

- The PDF uses the standard Helvetica font (Windows-1252). Characters outside it (arrows, ≥, CJK, emoji) are written as plain
  equivalents (`->`, `>=`) or `?`, and counted; the Word, Excel, PowerPoint and JSON files keep them.
- The XLSX writer stores its parts uncompressed (about 240 KB for a full package).
- A PowerPoint slide shows at most seven columns and twelve rows; longer tables run to three slides and point to the workbook.
- The commissioning completion package, the assurance report and the APEX case report are built (the Commissioning → Assurance → APEX journey). The estate's portfolio brief is built too. Search Party, ServiceHands and Learn reports are next on the
  same model (task #144); the Proof dossier (`#/dossier/…`) still offers JSON and CSV only and says so.
- Not tested in Microsoft Office itself (not available here); LibreOffice, openpyxl, python-docx, python-pptx and poppler are.
