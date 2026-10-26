#!/usr/bin/env python3
"""Read-only secret-pattern scan over the text files of the inventory (Stage 0 / verification item 24).
Reports file, line number and pattern NAME only — never the matched value.
    python3 -I scripts/discovery/secret-scan.py <root> <inventory.csv> <out.json>"""
import csv, json, pathlib, re, sys
root, inv, out = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
PAT = {
 'aws-access-key-id': re.compile(r'\bAKIA[0-9A-Z]{16}\b'),
 'private-key-block': re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'),
 'github-token': re.compile(r'\bgh[pousr]_[A-Za-z0-9]{36,}\b'),
 'slack-token': re.compile(r'\bxox[abpors]-[A-Za-z0-9-]{10,}'),
 'openai-style-key': re.compile(r'\bsk-[A-Za-z0-9_-]{32,}\b'),
 'anthropic-key': re.compile(r'\bsk-ant-[A-Za-z0-9_-]{20,}'),
 'google-api-key': re.compile(r'\bAIza[0-9A-Za-z_-]{35}\b'),
 'jwt': re.compile(r'\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'),
 'password-assignment': re.compile(r'(?i)\b(?:password|passwd|secret|api[_-]?key)\s*[:=]\s*["\'][^"\'\s]{8,}["\']'),
 'connection-string-with-password': re.compile(r'\b(?:postgres|postgresql|mysql|mongodb|redis)://[^:\s/]+:[^@\s]{3,}@'),
}
TEXT = {'log', 'captions', 'source-js','source-ts','source-py','source-css','source-ps1','script','config','data-json','data-csv','doc-md','text','html','SECRET-CANDIDATE','other'}
hits = []; scanned = 0
for r in csv.DictReader(open(inv)):
    if r['kind'] not in TEXT or r['path'].split('/')[0].startswith('.') or int(r['bytes']) > 20_000_000: continue
    p = root / r['path']
    try: txt = p.read_text('utf-8', errors='ignore')
    except Exception: continue
    scanned += 1
    for i, line in enumerate(txt.splitlines(), 1):
        if len(line) > 20000: line = line[:20000]
        for name, rx in PAT.items():
            if rx.search(line): hits.append({'path': r['path'], 'line': i, 'pattern': name})
json.dump({'scannedFiles': scanned, 'hits': hits}, open(out, 'w'), indent=1)
from collections import Counter
print(scanned, 'files scanned;', len(hits), 'hits;', Counter(h['pattern'] for h in hits))
