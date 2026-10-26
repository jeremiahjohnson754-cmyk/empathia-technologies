"""Validate every example room input (and the golden-case inputs) against ROOM_MODEL.schema.json. Prints PASS/FAIL counts.
    python3 -I spatial/room-models/check_schema.py"""
import json, pathlib, sys
from jsonschema import Draft202012Validator
here = pathlib.Path(__file__).resolve().parent
v = Draft202012Validator(json.loads((here / 'ROOM_MODEL.schema.json').read_text()))
docs = []
for f in sorted((here / 'examples').glob('*.json')):
    d = json.loads(f.read_text())
    docs += [(f"{f.name}[{i}]", x) for i, x in enumerate(d)] if isinstance(d, list) else [(f.name, d)]
golden = json.loads((here.parents[1] / 'packages/domain-data/golden/room-engine-golden.json').read_text())['data']
docs += [(f"golden:{c['name']}", c['input']) for c in golden]
bad = [(n, e.message) for n, d in docs for e in v.iter_errors(d)]
print(json.dumps({'checked': len(docs), 'invalid': len({n for n, _ in bad}), 'firstErrors': bad[:10]}, indent=1))
sys.exit(1 if bad else 0)
