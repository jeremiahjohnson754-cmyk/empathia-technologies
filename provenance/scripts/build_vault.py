#!/usr/bin/env python3
"""Build the generated parts of the IP and software provenance vault (read-only over the sources).

Writes, under provenance/:
  source-manifest/SOURCE_MANIFEST.json, SOURCE_MANIFEST_SUMMARY.md     every git-tracked file of the monorepo AT HEAD
  source-manifest/GIT_HISTORY.json                                      commits and tags of the monorepo and the demonstrator repo
  sbom/empathia-sbom.cdx.json                                           CycloneDX 1.5 SBOM of what is actually used
  licenses/texts/<component>/...                                        licence texts found on disk next to each component
  licenses/LICENSE_TEXT_INDEX.json                                      which texts were found (or NOT_FOUND)
  CLASSIFICATION.csv                                                    from scripts/classification.json

It never writes outside provenance/, never modifies a repository (only `git log`/`ls-tree`/`cat-file`), and never reads .local/.

    python3 -I provenance/scripts/build_vault.py
"""
import ast, csv, datetime, hashlib, json, os, pathlib, re, shutil, subprocess, sys
from importlib import metadata

ROOT = pathlib.Path(__file__).resolve().parents[2]
VAULT = ROOT / 'provenance'
DEMO = pathlib.Path('/home/claude/Empathia_V25/work/source-254')
NPM = pathlib.Path('/opt/npm-tools/node_modules')
NOW = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
CLASS = json.loads((VAULT / 'scripts/classification.json').read_text())


def git(repo, *args, binary=False):
    r = subprocess.run(['git', '-C', str(repo), *args], capture_output=True, check=True)
    return r.stdout if binary else r.stdout.decode('utf-8', 'replace')


def classify(path):
    best = None
    for rule in CLASS['rules']:
        p = rule['prefix']
        if path == p or path.startswith(p.rstrip('/') + '/') or (p.endswith('*') and path.startswith(p[:-1])):
            if best is None or len(p) > len(best['prefix']):
                best = rule
    return best['class'] if best else CLASS['default']


# ------------------------------------------------------------------------------------------------ 1. source manifest (at HEAD)
def source_manifest():
    head = git(ROOT, 'rev-parse', 'HEAD').strip()
    branch = git(ROOT, 'rev-parse', '--abbrev-ref', 'HEAD').strip()
    tree = git(ROOT, 'ls-tree', '-r', '-l', '--full-tree', 'HEAD')
    rows = []
    for line in tree.splitlines():
        meta, path = line.split('\t', 1)
        mode, typ, blob, size = meta.split()
        if typ != 'blob':
            continue
        data = git(ROOT, 'cat-file', 'blob', blob, binary=True)
        last = git(ROOT, 'log', '-1', '--format=%H%x09%aI', 'HEAD', '--', path).strip().split('\t')
        rows.append({'path': path, 'bytes': int(size), 'sha256': hashlib.sha256(data).hexdigest(), 'gitBlob': blob, 'mode': mode,
                     'lastCommit': last[0] if last else None, 'lastCommitDate': last[1] if len(last) > 1 else None, 'classification': classify(path)})
    dirty = git(ROOT, 'status', '--porcelain').strip().splitlines()
    out = {'generatedAt': NOW, 'repository': str(ROOT), 'head': head, 'branch': branch,
           'note': 'Hashes are of the committed content at HEAD (git cat-file), not of the working tree. Uncommitted working-tree changes at generation time are listed in workingTreeChanges and are NOT covered.',
           'workingTreeChanges': dirty, 'files': len(rows), 'bytes': sum(r['bytes'] for r in rows), 'entries': rows}
    d = VAULT / 'source-manifest'; d.mkdir(parents=True, exist_ok=True)
    (d / 'SOURCE_MANIFEST.json').write_text(json.dumps(out, indent=1) + '\n')
    by_area, by_class = {}, {}
    for r in rows:
        a = '/'.join(r['path'].split('/')[:2]) if '/' in r['path'] else r['path']
        by_area.setdefault(a, [0, 0]); by_area[a][0] += 1; by_area[a][1] += r['bytes']
        by_class[r['classification']] = by_class.get(r['classification'], 0) + 1
    md = [f'# Source manifest summary', '', f'Generated {NOW} by `provenance/scripts/build_vault.py` from the monorepo at commit `{head}` (branch `{branch}`).', '',
          f'**{len(rows)} tracked files, {out["bytes"]:,} bytes.** Each entry in `SOURCE_MANIFEST.json` has path, bytes, SHA-256 of the committed content, git blob id, last commit touching it, and its confidentiality classification.', '',
          f'Working-tree changes not yet committed at generation time: {len(dirty)} (listed in the JSON; not covered by these hashes).', '',
          '| Area | Files | Bytes |', '|---|---:|---:|'] + [f'| `{a}` | {n} | {b:,} |' for a, (n, b) in sorted(by_area.items())] + [
          '', '| Classification | Files |', '|---|---:|'] + [f'| {k} | {v} |' for k, v in sorted(by_class.items())] + [
          '', 'Excluded by construction: `.local/` (database cluster, credentials, JWT secret, object store), `node_modules/`, `dist/` — none are tracked.']
    (d / 'SOURCE_MANIFEST_SUMMARY.md').write_text('\n'.join(md) + '\n')
    return out


# ------------------------------------------------------------------------------------------------ 1b. git history of both repositories
def history(repo, label):
    fmt = '%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%cn%x1f%cI%x1f%s%x1f%(trailers:key=Co-Authored-By,valueonly,separator=%x2C)%x1f%(trailers:key=Claude-Session,valueonly,separator=%x2C)'
    raw = git(repo, 'log', '--all', f'--format={fmt}', '--name-only')
    commits = []
    for block in raw.split('\x1e')[1:]:
        head, _, files = block.partition('\n')
        h, an, ae, ad, cn, cd, s, coa, sess = (head.split('\x1f') + [''] * 9)[:9]
        commits.append({'hash': h, 'author': an, 'authorEmail': ae, 'authorDate': ad, 'committer': cn, 'commitDate': cd, 'subject': s,
                        'coAuthoredBy': [x.strip() for x in coa.split(',') if x.strip()], 'claudeSession': [x.strip() for x in sess.split(',') if x.strip()],
                        'filesChanged': [f for f in files.strip().split('\n') if f]})
    tags = []
    for line in git(repo, 'for-each-ref', '--format=%(refname:short)%09%(objectname)%09%(*objectname)%09%(creatordate:iso-strict)%09%(subject)', 'refs/tags').splitlines():
        n, o, peeled, dt, subj = (line.split('\t') + [''] * 5)[:5]
        tags.append({'tag': n, 'object': o, 'commit': peeled or o, 'date': dt, 'subject': subj})
    authors = {}
    for c in commits:
        authors[f"{c['author']} <{c['authorEmail']}>"] = authors.get(f"{c['author']} <{c['authorEmail']}>", 0) + 1
    return {'label': label, 'path': str(repo), 'head': git(repo, 'rev-parse', 'HEAD').strip(), 'branch': git(repo, 'rev-parse', '--abbrev-ref', 'HEAD').strip(),
            'commits': len(commits), 'authors': authors, 'commitsWithCoAuthoredBy': sum(1 for c in commits if c['coAuthoredBy']),
            'commitsWithClaudeSession': sum(1 for c in commits if c['claudeSession']),
            'firstCommit': commits[-1]['authorDate'] if commits else None, 'lastCommit': commits[0]['authorDate'] if commits else None, 'tags': tags, 'log': commits}


# ------------------------------------------------------------------------------------------------ 2. SBOM
def npm_pkg(name):
    p = NPM / name
    pj = p / 'package.json'
    return (p, json.loads(pj.read_text())) if pj.exists() else (None, None)


LIC_NAMES = re.compile(r'^(LICEN[CS]E|COPYING|NOTICE|LICENSE-MIT|LICENSE\.(md|txt))', re.I)


def lic_files(d):
    if not d or not d.exists():
        return []
    return sorted(f for f in d.iterdir() if f.is_file() and LIC_NAMES.match(f.name))


def py_licence(md):
    """SPDX expression if declared, else the License field when short, else the trove classifiers."""
    if md.get('License-Expression'):
        return md['License-Expression']
    field = (md.get('License') or '').strip()
    classifiers = [c.split('::')[-1].strip() for c in (md.get_all('Classifier') or []) if c.startswith('License ::')]
    if field and len(field) <= 40 and '\n' not in field:
        return field
    return ' AND '.join(classifiers) or (field.split('\n')[0][:80] + ' (see licence text)' if field else 'NOT_STATED')


def sbom():
    root_pkg = json.loads((ROOT / 'package.json').read_text())
    seeds = list(root_pkg.get('devDependencies', {}).keys()) + ['undici-types', 'csstype', 'scheduler', 'playwright-core']
    runtime_bundled = {'react', 'react-dom', 'scheduler'}       # bundled into the apps' JavaScript by esbuild
    comps, seen, missing = [], {}, []
    stack = [(n, None) for n in seeds]
    while stack:
        name, parent = stack.pop()
        if name in seen:
            continue
        d, pj = npm_pkg(name)
        if not pj:
            if parent is None:
                missing.append(name)
            seen[name] = None
            continue
        seen[name] = pj['version']
        lic = pj.get('license')
        if isinstance(lic, dict):
            lic = lic.get('type')
        if not lic and isinstance(pj.get('licenses'), list) and pj['licenses']:
            lic = pj['licenses'][0].get('type')
        files = lic_files(d)
        scope = 'required' if name in runtime_bundled else 'optional'
        comps.append({'type': 'library', 'bom-ref': f'pkg:npm/{name}@{pj["version"]}', 'name': name, 'version': pj['version'], 'scope': scope,
                      'purl': f'pkg:npm/{name.replace("@", "%40")}@{pj["version"]}',
                      'licenses': [{'license': {'id': lic}}] if lic and re.fullmatch(r'[A-Za-z0-9.\-+]+', str(lic)) else ([{'expression': str(lic)}] if lic else []),
                      'properties': [{'name': 'empathia:usage', 'value': 'runtime (bundled into the apps)' if scope == 'required' else 'development tooling'},
                                     {'name': 'empathia:resolvedPath', 'value': str(d)}, {'name': 'empathia:introducedBy', 'value': parent or 'package.json / scripts/bootstrap.mjs'},
                                     {'name': 'empathia:licenseFiles', 'value': ', '.join(f.name for f in files) or 'NOT_FOUND'}]})
        for dep in list((pj.get('dependencies') or {}).keys()) + list((pj.get('optionalDependencies') or {}).keys()):
            if (NPM / dep / 'package.json').exists():
                stack.append((dep, name))
    # @types/react and @types/react-dom are asked for in package.json but not present offline
    # python: modules actually imported by tracked .py files
    std = set(sys.stdlib_module_names)
    imported = {}
    for f in ROOT.rglob('*.py'):
        if any(part in ('node_modules', '.local', 'dist') for part in f.parts):
            continue
        try:
            tree = ast.parse(f.read_text(errors='replace'))
        except SyntaxError:
            continue
        for n in ast.walk(tree):
            mods = [a.name for a in n.names] if isinstance(n, ast.Import) else [n.module] if isinstance(n, ast.ImportFrom) and n.module and n.level == 0 else []
            for m in mods:
                top = m.split('.')[0]
                imported.setdefault(top, set()).add(str(f.relative_to(ROOT)))
    dist_of = metadata.packages_distributions()
    py_third = []
    for mod, files in sorted(imported.items()):
        if mod in std or mod.startswith('_'):
            continue
        for dist in dist_of.get(mod, []) or [None]:
            if dist is None:
                py_third.append({'module': mod, 'dist': None, 'files': sorted(files)}); continue
            md = metadata.metadata(dist)
            lic = py_licence(md)
            dpath = pathlib.Path(str(metadata.distribution(dist)._path))  # dist-info folder
            lf = [f for f in dpath.rglob('*') if f.is_file() and LIC_NAMES.match(f.name)]
            py_third.append({'module': mod, 'dist': dist, 'version': metadata.version(dist), 'license': (lic or '').split('\n')[0][:120], 'files': sorted(files), 'licenseFiles': [str(x) for x in lf]})
            runtime = any((f.startswith('services/') or f.startswith('ml/')) and '/tests/' not in f and not f.split('/')[-1].startswith('test_') for f in files)
            comps.append({'type': 'library', 'bom-ref': f'pkg:pypi/{dist}@{metadata.version(dist)}', 'name': dist, 'version': metadata.version(dist), 'scope': 'required' if runtime else 'optional',
                          'purl': f'pkg:pypi/{dist.lower()}@{metadata.version(dist)}', 'licenses': [{'expression': (lic or 'NOT_STATED').split('\n')[0][:120]}],
                          'properties': [{'name': 'empathia:usage', 'value': 'python, imported by ' + ', '.join(sorted(files))[:400]}, {'name': 'empathia:licenseFiles', 'value': ', '.join(x.name for x in lf) or 'NOT_FOUND'}]})
    # launched rather than imported: uvicorn runs the intelligence service (python3 -I -m uvicorn app.main:app)
    for dist, why in [('uvicorn', 'python, launches services/intelligence-python (python3 -I -m uvicorn app.main:app)')]:
        try:
            md = metadata.metadata(dist)
        except metadata.PackageNotFoundError:
            continue
        lic = py_licence(md)
        lf = [f for f in pathlib.Path(str(metadata.distribution(dist)._path)).rglob('*') if f.is_file() and LIC_NAMES.match(f.name)]
        comps.append({'type': 'library', 'bom-ref': f'pkg:pypi/{dist}@{metadata.version(dist)}', 'name': dist, 'version': metadata.version(dist), 'scope': 'required',
                      'purl': f'pkg:pypi/{dist}@{metadata.version(dist)}', 'licenses': [{'expression': (lic or 'NOT_STATED').split(chr(10))[0][:120]}],
                      'properties': [{'name': 'empathia:usage', 'value': why}, {'name': 'empathia:licenseFiles', 'value': ', '.join(x.name for x in lf) or 'NOT_FOUND'}]})
    # transitive Python requirements actually installed (no extras), recorded with the dist that pulls them in
    norm = lambda n: re.sub(r'[-_.]+', '-', n).lower()
    have = {norm(c['name']) for c in comps if c['bom-ref'].startswith('pkg:pypi/')}
    queue = [(c['name'], c['scope']) for c in comps if c['bom-ref'].startswith('pkg:pypi/')]
    while queue:
        parent, scope = queue.pop()
        for req in metadata.requires(parent) or []:
            if 'extra ==' in req:
                continue
            name = re.split(r'[ ;<>=!~\[(]', req, maxsplit=1)[0].strip()
            if not name or norm(name) in have:
                continue
            try:
                md = metadata.metadata(name)
            except metadata.PackageNotFoundError:
                continue
            have.add(norm(name))
            lic = py_licence(md)
            dist = metadata.distribution(name)
            lf = [f for f in pathlib.Path(str(dist._path)).rglob('*') if f.is_file() and LIC_NAMES.match(f.name)]
            comps.append({'type': 'library', 'bom-ref': f'pkg:pypi/{dist.metadata["Name"]}@{dist.version}', 'name': dist.metadata['Name'], 'version': dist.version, 'scope': scope,
                          'purl': f'pkg:pypi/{dist.metadata["Name"].lower()}@{dist.version}', 'licenses': [{'expression': (lic or 'NOT_STATED').split(chr(10))[0][:120]}],
                          'properties': [{'name': 'empathia:usage', 'value': f'python, required by {parent}'}, {'name': 'empathia:licenseFiles', 'value': ', '.join(x.name for x in lf) or 'NOT_FOUND'}]})
            queue.append((dist.metadata['Name'], scope))
    # system software
    def ver(cmd, rx):
        try:
            out = subprocess.run(cmd, capture_output=True, text=True).stdout
            m = re.search(rx, out); return m.group(1) if m else 'UNKNOWN'
        except FileNotFoundError:
            return 'NOT_INSTALLED'
    pw = json.loads((NPM / 'playwright-core/browsers.json').read_text()) if (NPM / 'playwright-core/browsers.json').exists() else {'browsers': []}
    chromium = next((b for b in pw['browsers'] if b['name'] == 'chromium'), {})
    system = [
        ('application', 'PostgreSQL', ver(['/usr/lib/postgresql/16/bin/postgres', '--version'], r'\) (\S+)'), 'PostgreSQL', 'required', 'database server for the enterprise API (local development cluster via scripts/db.mjs; not shipped)', '/usr/share/doc/postgresql-16/copyright'),
        ('application', 'Node.js', ver(['node', '--version'], r'v(\S+)'), 'MIT', 'required', 'runtime of the API, scripts and builds (not shipped)', str(pathlib.Path(subprocess.run(['node', '-p', 'process.execPath'], capture_output=True, text=True).stdout.strip()).resolve().parents[1] / 'LICENSE')),
        ('application', 'Python', ver(['python3', '--version'], r'Python (\S+)'), 'PSF-2.0', 'optional', 'scripts (discovery, media manifest, verification, provenance)', f'/usr/lib/python{sys.version_info.major}.{sys.version_info.minor}/LICENSE.txt'),
        ('application', 'Chromium (Playwright build)', f"{chromium.get('browserVersion', 'UNKNOWN')} (revision {chromium.get('revision', '?')})", 'BSD-3-Clause AND others (NOT_FOUND on disk)', 'optional', 'browser tests and screenshots only (/opt/pw-browsers)', None),
        ('application', 'FFmpeg', ver(['ffmpeg', '-version'], r'ffmpeg version (\S+)'), 'LGPL-2.1-or-later OR GPL-2.0-or-later (build-dependent)', 'optional', 'media probing and test-fixture transcoding (tooling; not shipped)', '/usr/share/doc/ffmpeg/copyright'),
        ('application', '@mermaid-js/mermaid-cli (mmdc)', ver(['/home/claude/.npm-global/bin/mmdc', '--version'], r'(\S+)'), 'MIT', 'optional', 'renders the architecture diagrams at build time (tooling)', '/home/claude/.npm-global/lib/node_modules/@mermaid-js/mermaid-cli/LICENSE'),
    ]
    for typ, n, v, lic, scope, use, lf in system:
        comps.append({'type': typ, 'bom-ref': f'sys:{n}@{v}', 'name': n, 'version': v, 'scope': scope, 'licenses': [{'expression': lic}],
                      'properties': [{'name': 'empathia:usage', 'value': use}, {'name': 'empathia:licenseFiles', 'value': lf or 'NOT_FOUND'}]})
    fonts = [str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.suffix.lower() in ('.woff', '.woff2', '.ttf', '.otf') and 'node_modules' not in p.parts and '.local' not in p.parts]
    bom = {'bomFormat': 'CycloneDX', 'specVersion': '1.5', 'serialNumber': f'urn:uuid:{hashlib.sha256(NOW.encode()).hexdigest()[:8]}-0000-4000-8000-{hashlib.sha256(NOW.encode()).hexdigest()[8:20]}', 'version': 1,
           'metadata': {'timestamp': NOW, 'tools': [{'name': 'provenance/scripts/build_vault.py'}],
                        'component': {'type': 'application', 'name': 'empathia-technologies', 'version': json.loads((ROOT / 'package.json').read_text())['version'], 'bom-ref': 'empathia-technologies'},
                        'properties': [{'name': 'empathia:scopeNote', 'value': 'scope=required: shipped inside an app bundle or needed by the running service; scope=optional: development, build or test tooling. The enterprise API has no third-party npm runtime dependency (framework-free HTTP and a vendored PostgreSQL client).'},
                                       {'name': 'empathia:fontsShipped', 'value': ', '.join(fonts) or 'none: the design tokens use system font stacks only'},
                                       {'name': 'empathia:notFoundOffline', 'value': ', '.join(missing + ['@types/react', '@types/react-dom']) + ' (asked for by package.json, not present in the offline registry; a local type shim is used — tooling/types/react-offline)'}]},
           'components': comps}
    d = VAULT / 'sbom'; d.mkdir(parents=True, exist_ok=True)
    (d / 'empathia-sbom.cdx.json').write_text(json.dumps(bom, indent=1) + '\n')
    (d / 'PYTHON_IMPORTS.json').write_text(json.dumps({mod: sorted(f) for mod, f in sorted(imported.items())}, indent=1) + '\n')
    return bom, py_third


# ------------------------------------------------------------------------------------------------ 3. licence texts
def copy_licences(bom):
    out = VAULT / 'licenses/texts'
    if out.exists():
        shutil.rmtree(out)
    index = []
    for c in bom['components']:
        props = {p['name']: p['value'] for p in c.get('properties', [])}
        srcs = []
        if c['bom-ref'].startswith('pkg:npm/'):
            srcs = lic_files(pathlib.Path(props.get('empathia:resolvedPath', '/nonexistent')))
        elif c['bom-ref'].startswith('pkg:pypi/'):
            try:
                dpath = pathlib.Path(str(metadata.distribution(c['name'])._path))
                srcs = [f for f in dpath.rglob('*') if f.is_file() and LIC_NAMES.match(f.name)]
            except metadata.PackageNotFoundError:
                srcs = []
        elif props.get('empathia:licenseFiles', 'NOT_FOUND') != 'NOT_FOUND':
            srcs = [pathlib.Path(props['empathia:licenseFiles'])]
        safe = re.sub(r'[^A-Za-z0-9._@+-]', '_', f"{c['name']}@{c['version']}")
        copied = []
        for s in srcs:
            if s.exists():
                t = out / safe / s.name; t.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(s, t)
                copied.append({'file': str(t.relative_to(VAULT)), 'from': str(s), 'sha256': hashlib.sha256(t.read_bytes()).hexdigest()})
        lic = c['licenses'][0].get('license', {}).get('id') if c['licenses'] and 'license' in c['licenses'][0] else (c['licenses'][0].get('expression') if c['licenses'] else 'NOT_STATED')
        index.append({'component': c['name'], 'version': c['version'], 'declaredLicense': lic, 'scope': c['scope'], 'texts': copied, 'status': 'FOUND' if copied else 'NOT_FOUND'})
    (VAULT / 'licenses/LICENSE_TEXT_INDEX.json').write_text(json.dumps(index, indent=1) + '\n')
    return index


# ------------------------------------------------------------------------------------------------ 5. classification csv
def classification_csv():
    with open(VAULT / 'CLASSIFICATION.csv', 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['item', 'kind', 'classification', 'reason'])
        for r in CLASS['rules']:
            w.writerow([r['prefix'], 'monorepo path', r['class'], r['reason']])
        for r in CLASS['external']:
            w.writerow([r['item'], r['kind'], r['class'], r['reason']])
    defs = {'PUBLIC': 'may be published', 'INVESTOR_DISCLOSABLE': 'may be shown to investors once its distribution is authorized for that channel',
            'CONFIDENTIAL_TECHNICAL': 'engineering material; authorized technical reviewers under confidentiality', 'INTERNAL_ONLY': 'the founder and the internal team only',
            'RESTRICTED_IP': 'core know-how, algorithms and IP records; need-to-know, founder and counsel', 'THIRD_PARTY_LICENSED': "governed by someone else's licence or terms"}
    md = ['# Confidentiality classification', '', 'Generated by `scripts/build_vault.py` from `scripts/classification.json` (edit the JSON, then re-run). Every monorepo file inherits the class of its longest matching path; the per-file result is in `source-manifest/SOURCE_MANIFEST.json`.', '',
          '| Class | Meaning |', '|---|---|'] + [f'| {k} | {v} |' for k, v in defs.items()] + [
          '', 'Classification decides who may see a thing; it does not authorize distribution. No item is authorized for external distribution today, and **no part of the source vault is INVESTOR_DISCLOSABLE**. Nothing is designated PUBLIC.', '',
          '## Monorepo paths', '', '| Path | Class | Reason |', '|---|---|---|'] + [f"| `{r['prefix']}` | {r['class']} | {r['reason']} |" for r in CLASS['rules']] + [
          '', '## Packages, editions, media sets and records outside the monorepo', '', '| Item | Kind | Class | Reason |', '|---|---|---|---|'] + [f"| {r['item']} | {r['kind']} | {r['class']} | {r['reason']} |" for r in CLASS['external']]
    (VAULT / 'CLASSIFICATION.md').write_text('\n'.join(md) + '\n')


if __name__ == '__main__':
    VAULT.mkdir(exist_ok=True)
    m = source_manifest()
    hist = {'generatedAt': NOW, 'repositories': [history(ROOT, 'monorepo (empathia-technologies)'), history(DEMO, 'demonstrator (Empathia V2.5 source, worktree source-254, read-only)')]}
    # other repositories in the workspace: author and date summary only (read-only), for the chain-of-title review
    hist['otherRepositories'] = []
    for other in ['/home/claude/Empathia_V25/work/source', '/home/claude/empathia-campus', '/home/claude/Empathia_Products/Onboard/repo', '/home/claude/Empathia_V25/legal/media-rights']:
        o = pathlib.Path(other)
        if not (o / '.git').exists():
            hist['otherRepositories'].append({'path': other, 'status': 'NOT_A_GIT_REPOSITORY_OR_NOT_FOUND'}); continue
        try:
            full = history(o, other)
            hist['otherRepositories'].append({k: full[k] for k in ('path', 'head', 'branch', 'commits', 'authors', 'commitsWithCoAuthoredBy', 'commitsWithClaudeSession', 'firstCommit', 'lastCommit', 'tags')})
        except subprocess.CalledProcessError as e:
            hist['otherRepositories'].append({'path': other, 'status': f'UNREADABLE: {e}'})
    (VAULT / 'source-manifest/GIT_HISTORY.json').write_text(json.dumps(hist, indent=1) + '\n')
    bom, py = sbom()
    idx = copy_licences(bom)
    classification_csv()
    print(json.dumps({'manifestFiles': m['files'], 'head': m['head'], 'sbomComponents': len(bom['components']),
                      'licenceTextsFound': sum(1 for i in idx if i['status'] == 'FOUND'), 'licenceTextsNotFound': [f"{i['component']}@{i['version']}" for i in idx if i['status'] == 'NOT_FOUND'],
                      'commits': {r['label']: r['commits'] for r in hist['repositories']}, 'pythonThirdParty': [(p['module'], p.get('dist'), p.get('version')) for p in py]}, indent=1))
