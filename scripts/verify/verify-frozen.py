#!/usr/bin/env python3
"""Verify that every frozen release is byte-for-byte unchanged (verification item 25). Read-only.

For each frozen package: re-hash every file listed in its SHA256SUMS and compare; record the edition hashes; check the immutable
attribute. For each archive in work/frozen: re-hash it and compare with its .sha256. Exit 1 on any mismatch.

    python3 -I scripts/verify/verify-frozen.py <Empathia_V25 dir> <out.json>
"""
import hashlib, json, pathlib, subprocess, sys, datetime

base, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
PKGS = [
    ('Empathia_Investor_Release_2511', 'Release_Manifest/SHA256SUMS.txt'),
    ('Empathia_Investor_Release_252', 'Release_Manifest/SHA256SUMS.txt'),
    ('Empathia_Investor_Release_253', 'Release_Manifest/SHA256SUMS.txt'),
    ('Empathia_Engineer_Edition_253', 'SHA256SUMS.txt'),
    ('Empathia_Investor_Release_253_rc2', 'Release_Manifest/SHA256SUMS.txt'),
    ('Empathia_Engineer_Edition_253_rc2', 'SHA256SUMS.txt'),
    ('Empathia_Investor_Release_253_rc3', 'Release_Manifest/SHA256SUMS.txt'),
    ('Empathia_Engineer_Edition_253_rc3', 'SHA256SUMS.txt'),
]

def sha(p: pathlib.Path) -> str:
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()

res = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'packages': [], 'archives': []}
bad = 0
for name, sums in PKGS:
    root = base / name
    lst = root / sums
    entries = []; mism = []
    for line in lst.read_text().splitlines():
        if not line.strip(): continue
        want, rel = line.split(None, 1); rel = rel.strip().lstrip('*')
        f = (root / rel) if (root / rel).exists() else (lst.parent / rel)
        got = sha(f) if f.exists() else 'MISSING'
        entries.append(rel)
        if got != want: mism.append({'file': rel, 'want': want, 'got': got})
    try: attr = subprocess.run(['lsattr', '-d', str(root)], capture_output=True, text=True).stdout.split()[0]
    except Exception: attr = 'unknown'
    eds = {str(p.relative_to(root)): sha(p) for p in sorted(root.glob('*Edition*/*.html'))}
    res['packages'].append({'package': name, 'checksumList': sums, 'entries': len(entries), 'mismatches': mism, 'immutableFlag': 'i' in attr.split('-')[4:5] or attr[4:5] == 'i', 'lsattr': attr, 'editions': eds})
    bad += len(mism)
for t in sorted((base / 'work' / 'frozen').glob('*.tar')):
    want = (t.with_suffix('.tar.sha256')).read_text().split()[0]
    got = sha(t)
    res['archives'].append({'archive': t.name, 'match': got == want, 'sha256': got})
    bad += got != want
res['result'] = 'PASS' if bad == 0 else 'FAIL'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(res, indent=1))
print(json.dumps({'result': res['result'], 'packages': [(p['package'], p['entries'], len(p['mismatches']), p['lsattr']) for p in res['packages']], 'archives': [(a['archive'], a['match']) for a in res['archives']]}, indent=1))
sys.exit(0 if bad == 0 else 1)
