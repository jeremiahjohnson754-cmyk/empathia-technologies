"""Reopen every exported file with an independent reader (called by scripts/verify/export-formats.mjs).

argv: <out dir> <dossier schema> <office|no-office>
Writes <out>/EXPORT_VALIDATION.json and prints one line per file; exit 0 only if every check passes.
Run with python3 -I: the files are read, never executed.
"""
import csv, hashlib, io, json, os, re, shutil, subprocess, sys, tempfile

out, schema_path, office = sys.argv[1], sys.argv[2], sys.argv[3] == 'office'
manifest = json.load(open(os.path.join(out, 'manifest.json'), encoding='utf-8'))
schema = json.load(open(schema_path, encoding='utf-8'))
results = []


def check(report, fmt, name, ok, detail):
    results.append({'report': report, 'format': fmt, 'check': name, 'pass': bool(ok), 'detail': detail})


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=240, **kw)


def winansi(s):
    sub = {'→': '->', '←': '<-', '↔': '<->', '≥': '>=', '≤': '<=', '≈': '~', '≠': '!=', '−': '-', '✓': 'v', '✗': 'x', ' ': ' ', ' ': ' ', ' ': ' '}
    keep = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'
    o = ''
    for ch in s:
        c = ord(ch)
        if ch in sub and not (0x20 <= c < 0x7f):
            o += sub[ch]
        elif c < 0x20:
            o += ' '
        elif c > 0xff and ch not in keep:
            o += '?'
        else:
            o += ch
    return o


import openpyxl  # noqa: E402
import docx  # noqa: E402
import pptx  # noqa: E402
import jsonschema  # noqa: E402

for m in manifest:
    rid, d, F = m['id'], os.path.join(out, m['dir']), m['files']
    tables = [t for t in m['tables']]
    p = lambda f: os.path.join(d, F[f]['name'])  # noqa: E731

    # ---------------------------------------------------------------- xlsx
    try:
        wb = openpyxl.load_workbook(p('xlsx'))
        wbv = openpyxl.load_workbook(p('xlsx'), data_only=True)
        names = wb.sheetnames
        check(rid, 'xlsx', 'opens', True, f'{len(names)} sheets: {", ".join(names[:6])}{"…" if len(names) > 6 else ""}')
        extra = (1 if m.get('media') else 0) + (1 if m.get('links') else 0)
        check(rid, 'xlsx', 'one sheet per table plus Summary, Provenance, Dictionary (and Pictures and Links when the report has them)', len(names) == len(tables) + 3 + extra, f'{len(names)} sheets for {len(tables)} tables')
        bad_rows, injected, frozen = [], [], 0
        for i, t in enumerate(tables):
            ws = wb[names[i + 1]]
            if ws.max_row != t['rows'] + 1 and not (t['rows'] == 0 and ws.max_row == 1):
                bad_rows.append(f'{ws.title}: {ws.max_row - 1} rows for {t["rows"]}')
            if ws.freeze_panes:
                frozen += 1
            for row in ws.iter_rows(min_row=2):
                for c in row:
                    if c.data_type == 'f':
                        injected.append(f'{ws.title}!{c.coordinate}')
        check(rid, 'xlsx', 'every row of every table is there', not bad_rows, '; '.join(bad_rows) or f'{sum(t["rows"] for t in tables)} rows')
        check(rid, 'xlsx', 'no table cell runs as a formula', not injected, ', '.join(injected[:5]) or 'all text or numbers')
        check(rid, 'xlsx', 'headers frozen', frozen == len(tables), f'{frozen} of {len(tables)}')
        sm, smv = wb[names[0]], wbv[names[0]]
        formulas, wrong = 0, []
        for r in range(2, sm.max_row + 1):
            c = sm.cell(r, 2)
            if c.data_type == 'f':
                formulas += 1
                mt = re.match(r"=?COUNTIF\('(.+)'!([A-Z]+):\2,\"(.*)\"\)$", str(c.value))
                cached = smv.cell(r, 2).value
                if mt:
                    ws = wb[mt.group(1).replace("''", "'")]
                    col = openpyxl.utils.column_index_from_string(mt.group(2))
                    want = sum(1 for rr in range(2, ws.max_row + 1) if str(ws.cell(rr, col).value or '') == mt.group(3).replace('""', '"'))
                    if cached != want:
                        wrong.append(f'{sm.cell(r, 1).value}: cached {cached}, counted {want}')
        check(rid, 'xlsx', 'summary totals are formulas whose cached values match the sheets', formulas > 0 and not wrong, '; '.join(wrong) or f'{formulas} formulas')
    except Exception as e:  # noqa: BLE001
        check(rid, 'xlsx', 'opens', False, repr(e))

    # ---------------------------------------------------------------- csv
    try:
        raw = open(p('csv'), encoding='utf-8-sig', newline='').read()
        lines = raw.split('\r\n')
        body = '\r\n'.join(x for x in lines if not x.startswith('# '))
        rows = list(csv.reader(io.StringIO(body)))
        rows = [r for r in rows if r]
        biggest = (next((t for t in tables if t['title'] == m.get('primary')), None) or max(tables, key=lambda t: t['rows'])) if tables else None
        check(rid, 'csv', 'parses', True, f'{len(rows)} lines after the # provenance lines')
        if biggest:
            check(rid, 'csv', 'header and every row of the main table', len(rows) == biggest['rows'] + 1 and len(rows[0]) == biggest['cols'] and all(len(r) == biggest['cols'] for r in rows), f'{len(rows) - 1} rows × {len(rows[0])} columns for {biggest["title"]} ({biggest["rows"]} × {biggest["cols"]})')
        risky = [c for r in rows[1:] for c in r if c[:1] in ('=', '+', '@') or (c[:1] == '-' and not re.fullmatch(r'-?\d+(\.\d+)?([eE][-+]?\d+)?', c))]
        check(rid, 'csv', 'no cell can run as a formula', not risky, ', '.join(risky[:5]) or 'formula-like text is prefixed with an apostrophe')
        check(rid, 'csv', 'provenance travels with the file', any(x.startswith('# Synthetic') for x in lines), 'the # lines name the data as synthetic')
    except Exception as e:  # noqa: BLE001
        check(rid, 'csv', 'parses', False, repr(e))

    # ---------------------------------------------------------------- json
    try:
        doc = json.load(open(p('json'), encoding='utf-8'))
        errs = sorted(jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker()).iter_errors(doc), key=lambda e: e.path)
        check(rid, 'json', 'valid against empathia.dossier/1', not errs, '; '.join(f'{list(e.path)}: {e.message}' for e in errs[:3]) or 'schema-valid')
        body = {k: v for k, v in doc.items() if k != 'integrity'}
        h = hashlib.sha256(json.dumps(body, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
        check(rid, 'json', 'SHA-256 integrity recomputes', h == doc['integrity']['value'], h[:16] + '…')
        if m.get('media'):
            check(rid, 'json', 'each picture is listed with its size and SHA-256', len(doc.get('media', [])) == m['media'] and all(x['sha256'] and x['bytes'] > 0 for x in doc['media']), f"{len(doc.get('media', []))} pictures")
        check(rid, 'json', 'every table is in the dossier', len(doc['tables']) == len(tables) and all(len(doc['tables'][t['title']]['rows']) == t['rows'] for t in tables), f'{len(doc["tables"])} tables')
    except Exception as e:  # noqa: BLE001
        check(rid, 'json', 'parses', False, repr(e))

    # ---------------------------------------------------------------- docx
    try:
        D = docx.Document(p('docx'))
        text = '\n'.join(x.text for x in D.paragraphs)
        cells = '\n'.join(c.text for t in D.tables for row in t.rows for c in row.cells)
        check(rid, 'docx', 'opens', True, f'{len(D.paragraphs)} paragraphs, {len(D.tables)} tables, {len(D.sections)} sections')
        check(rid, 'docx', 'title, subtitle and status on the title page', m['title'] in text and m['subtitle'][:40] in text and m['status'] in text, m['title'])
        datat = [t for t in tables if t['rows']]
        check(rid, 'docx', 'a Word table for every table with rows', len(D.tables) >= len(datat) + 2, f'{len(D.tables)} tables (≥ {len(datat)} data + facts)')
        hdr = [h for h in D.tables if h.rows and h.rows[0]._tr.trPr is not None and h.rows[0]._tr.trPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tblHeader') is not None]
        check(rid, 'docx', 'data tables repeat their header row', len(hdr) >= len(datat), f'{len(hdr)} with a repeating header')
        foot = '\n'.join(par.text for s in D.sections for par in s.footer.paragraphs)
        xmlfoot = ''.join(s.footer._element.xml for s in D.sections)
        check(rid, 'docx', 'page numbers in the footer', 'PAGE' in xmlfoot and 'NUMPAGES' in xmlfoot, foot.strip()[:60])
        check(rid, 'docx', 'document properties', D.core_properties.title == m['title'], D.core_properties.title or '')
        if m.get('media'):
            n_img = sum(1 for r_ in D.part.rels.values() if 'image' in r_.reltype)
            check(rid, 'docx', 'every picture is embedded (the shield plus each drawing and photograph)', n_img >= m['media'] + 1, f'{n_img} images')
        if m.get('links'):
            n_ln = sum(1 for r_ in D.part.rels.values() if r_.reltype.endswith('/hyperlink'))
            check(rid, 'docx', 'links are real hyperlinks', n_ln >= m['links'], f'{n_ln} hyperlinks')
        check(rid, 'docx', 'the shield is embedded', any('image' in r.reltype for r in D.part.rels.values()), 'image part present' if any('image' in r.reltype for r in D.part.rels.values()) else 'no image')
        if m['tables'] and m['tables'][0]['rows']:
            check(rid, 'docx', 'table text reaches the document', len(cells) > 20, f'{len(cells)} characters in tables')
    except Exception as e:  # noqa: BLE001
        check(rid, 'docx', 'opens', False, repr(e))

    # ---------------------------------------------------------------- pptx
    try:
        P = pptx.Presentation(p('pptx'))
        sl = list(P.slides)
        charts = sum(1 for s in sl for sh in s.shapes if sh.has_chart)
        tbls = sum(1 for s in sl for sh in s.shapes if sh.has_table)
        alltext = '\n'.join(sh.text_frame.text for s in sl for sh in s.shapes if sh.has_text_frame)
        check(rid, 'pptx', 'opens', True, f'{len(sl)} slides, {charts} chart, {tbls} tables')
        check(rid, 'pptx', 'title, summary, status, tables and provenance slides', len(sl) >= 4 + len(tables), f'{len(sl)} slides for {len(tables)} tables')
        check(rid, 'pptx', 'a native chart (editable in PowerPoint)', charts >= 1, f'{charts}')
        check(rid, 'pptx', 'a native table for every table with rows', tbls >= len([t for t in tables if t['rows']]), f'{tbls}')
        if m.get('media'):
            pics_ = sum(1 for s_ in sl for sh in s_.shapes if sh.shape_type == 13)
            check(rid, 'pptx', 'a slide for each drawing and photograph', pics_ >= min(m['media'], 6) + 1, f'{pics_} pictures')
        if m.get('links'):
            hl = sum(1 for s_ in sl for sh in s_.shapes if sh.has_text_frame for para in sh.text_frame.paragraphs for run_ in para.runs if run_.hyperlink.address)
            check(rid, 'pptx', 'links are real hyperlinks', hl >= min(m['links'], 14), f'{hl} hyperlinks')
        check(rid, 'pptx', 'the deck says what it is', 'synthetic' in alltext.lower() and m['title'] in alltext, 'title and provenance present')
    except Exception as e:  # noqa: BLE001
        check(rid, 'pptx', 'opens', False, repr(e))

    # ---------------------------------------------------------------- pdf
    try:
        info = run(['pdfinfo', p('pdf')]).stdout
        pages = int(re.search(r'Pages:\s+(\d+)', info).group(1))
        title = (re.search(r'Title:\s+(.*)', info) or [None, ''])[1].strip()
        txt = run(['pdftotext', '-layout', p('pdf'), '-']).stdout
        check(rid, 'pdf', 'opens', pages > 0, f'{pages} pages')
        check(rid, 'pdf', 'document title in the metadata', title == m['title'], title)
        check(rid, 'pdf', 'real text, not a picture of text', winansi(m['title']) in txt and len(txt) > 400, f'{len(txt)} characters of text')
        check(rid, 'pdf', 'page numbers on every page', len(re.findall(r'page \d+ of %d' % pages, txt)) == pages, f'{len(re.findall(r"page \\d+ of %d" % pages, txt))} of {pages}')
        run(['pdftoppm', '-r', '60', '-png', '-f', '1', '-l', '2', p('pdf'), os.path.join(d, 'page')])
        if m.get('media'):
            imgs = run(['pdfimages', '-list', p('pdf')]).stdout.strip().splitlines()[2:]
            check(rid, 'pdf', 'every picture is embedded (the shield plus each drawing and photograph)', len(imgs) >= m['media'] + 1, f'{len(imgs)} images')
        if m.get('links'):
            urls = [ln for ln in run(['pdfinfo', '-url', p('pdf')]).stdout.splitlines()[1:] if 'Annotation' in ln and 'http' in ln]
            check(rid, 'pdf', 'links are live link annotations (poppler reads their addresses)', len(urls) >= m['links'], f"{len(urls)} link annotations for {m['links']} links")
    except Exception as e:  # noqa: BLE001
        check(rid, 'pdf', 'opens', False, repr(e))

    # ---------------------------------------------------------------- redaction: what a report must never carry, in any format
    if m.get('mustNot') or m.get('mustHave'):
        import zipfile
        for f in ('pdf', 'docx', 'xlsx', 'pptx', 'csv', 'json'):
            try:
                if f == 'pdf':
                    body = run(['pdftotext', p('pdf'), '-']).stdout
                elif f in ('docx', 'xlsx', 'pptx'):
                    with zipfile.ZipFile(p(f)) as z:
                        body = ' '.join(z.read(n).decode('utf-8', 'replace') for n in z.namelist() if n.endswith('.xml') or n.endswith('.rels'))
                else:
                    body = open(p(f), encoding='utf-8-sig').read()
                if m.get('mustNot'):
                    hits = [rx for rx in m['mustNot'] if re.search(rx, body)]
                    check(rid, f, 'redaction holds: nothing the reader may not see is in the file', not hits, ', '.join(hits) or f"none of {len(m['mustNot'])} withheld patterns")
                # a slide table keeps at most seven columns, and the CSV carries only the primary table, so a report may name where to look
                if m.get('mustHave') and f in m.get('mustHaveIn', ['pdf', 'docx', 'xlsx', 'csv', 'json']):
                    miss = [rx for rx in m['mustHave'] if not re.search(rx, body)]
                    check(rid, f, 'the reader who may see it gets it (the control for the redaction check)', not miss, ', '.join(miss) or f"all {len(m['mustHave'])} patterns present")
            except Exception as e:  # noqa: BLE001
                check(rid, f, 'redaction holds: nothing the reader may not see is in the file', False, repr(e))

# ---------------------------------------------------------------- LibreOffice: the Office files convert to PDF
if office and shutil.which('soffice'):
    m = manifest[0]
    d = os.path.join(out, m['dir'])
    prof = tempfile.mkdtemp(prefix='lo-')
    lo = os.path.join(out, '_libreoffice'); os.makedirs(lo, exist_ok=True)
    for f in ('docx', 'xlsx', 'pptx'):
        src = os.path.join(d, m['files'][f]['name'])
        lof = os.path.join(lo, f); os.makedirs(lof, exist_ok=True)
        r = run(['soffice', f'-env:UserInstallation=file://{prof}', '--headless', '--convert-to', 'pdf', '--outdir', lof, src])
        pdf = os.path.join(lof, os.path.splitext(os.path.basename(src))[0] + '.pdf')
        ok = os.path.exists(pdf)
        pages = int(re.search(r'Pages:\s+(\d+)', run(['pdfinfo', pdf]).stdout).group(1)) if ok else 0
        check(m['id'], f, 'LibreOffice opens and converts it to PDF', ok and pages > 0, f'{pages} pages' if ok else (r.stderr or r.stdout)[-200:])
        if ok:
            run(['pdftoppm', '-r', '50', '-png', '-f', '1', '-l', '4', pdf, os.path.join(lof, 'page')])
    shutil.rmtree(prof, ignore_errors=True)
elif office:
    check('-', '-', 'LibreOffice available', False, 'soffice not found: NOT RUN')

json.dump({'checks': results, 'passed': sum(r['pass'] for r in results), 'failed': sum(not r['pass'] for r in results)}, open(os.path.join(out, 'EXPORT_VALIDATION.json'), 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
for r in results:
    if not r['pass']:
        print(f"FAIL {r['report']} {r['format']}: {r['check']} — {r['detail']}")
print(f"export formats ({len(manifest)} reports × 6 formats): {sum(r['pass'] for r in results)} passed, {sum(not r['pass'] for r in results)} failed")
sys.exit(0 if all(r['pass'] for r in results) else 1)
