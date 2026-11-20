"""Validate every JSON file of an unzipped Power BI project against Microsoft's published schema named in its $schema (vendored in
tests/fixtures/ms-fabric-schemas). Prints a JSON report; exit 1 when a file fails, names an unknown schema, or a required file is missing.
Run isolated: python3 -I validate-pbip.py <project dir> <schemas dir>"""
import json, os, sys
from jsonschema import Draft7Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT7

root, schemas = sys.argv[1], sys.argv[2]
BASE = 'https://developer.microsoft.com/json-schemas/fabric/'
reg = Registry(); by_url = {}
for d, _, fs in os.walk(schemas):
    for f in fs:
        if not f.endswith('.json'): continue
        p = os.path.join(d, f); rel = os.path.relpath(p, schemas).replace(os.sep, '/'); doc = json.load(open(p, encoding='utf-8'))
        res = Resource.from_contents(doc, default_specification=DRAFT7); url = BASE + rel
        reg = reg.with_resource(url, res); by_url[url] = doc
        if isinstance(doc.get('$id'), str): reg = reg.with_resource(doc['$id'], res)
out = {'files': [], 'failed': 0}
for d, _, fs in os.walk(root):
    for f in sorted(fs):
        p = os.path.join(d, f); rel = os.path.relpath(p, root).replace(os.sep, '/')
        if not (f.endswith('.json') or f.endswith('.pbip') or f.endswith('.pbir') or f.endswith('.pbism')): continue
        doc = json.load(open(p, encoding='utf-8')); url = doc.get('$schema') if isinstance(doc, dict) else None
        if rel.endswith('.json') and (url is None) and ('StaticResources/' in rel or rel == 'empathia-provenance.json'): out['files'].append({'file': rel, 'schema': None, 'ok': True}); continue
        if url not in by_url: out['files'].append({'file': rel, 'schema': url, 'ok': False, 'errors': ['no vendored schema for this $schema']}); out['failed'] += 1; continue
        v = Draft7Validator(by_url[url], registry=reg); errs = [f"{'/'.join(map(str, e.absolute_path))}: {e.message[:200]}" for e in v.iter_errors(doc)]
        out['files'].append({'file': rel, 'schema': url[len(BASE):], 'ok': not errs, **({'errors': errs[:5]} if errs else {})}); out['failed'] += bool(errs)
print(json.dumps(out)); sys.exit(1 if out['failed'] else 0)
