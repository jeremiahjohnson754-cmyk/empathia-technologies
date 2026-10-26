#!/usr/bin/env python3
"""Secret-pattern scan over every git-tracked text file of this repository (verification item 24). Read-only.
Reports file, line and pattern NAME only — never the matched value. Known, documented development values are listed in
scripts/verify/secret-allowlist.json with a reason; anything else is a finding and the scan fails.
    python3 -I scripts/verify/scan-secrets.py <repo> <out.json>
"""
import json, pathlib, re, subprocess, sys
repo, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
# the same patterns as scripts/discovery/secret-scan.py (Stage 0)
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
 'connection-string-with-password': re.compile(r'\b(?:postgres|postgresql|mysql|mongodb|redis)://[^:\s/$]+:[^@\s$]{3,}@'),
}
allow = json.loads((repo / 'scripts/verify/secret-allowlist.json').read_text())['allow']
files = subprocess.run(['git', '-C', str(repo), 'ls-files', '-z'], capture_output=True, check=True).stdout.decode().split('\0')
hits, scanned = [], 0
for f in filter(None, files):
    p = repo / f
    if not p.is_file() or p.stat().st_size > 20_000_000: continue
    try: txt = p.read_text('utf-8')
    except Exception: continue
    scanned += 1
    for i, line in enumerate(txt.splitlines(), 1):
        for name, rx in PAT.items():
            if rx.search(line):
                ok = next((a for a in allow if a['path'] == f and a['pattern'] == name), None)
                hits.append({'path': f, 'line': i, 'pattern': name, 'allowed': bool(ok), 'reason': ok['reason'] if ok else None})
findings = [h for h in hits if not h['allowed']]
out.write_text(json.dumps({'scanned_files': scanned, 'patterns': list(PAT), 'allowed': [h for h in hits if h['allowed']], 'findings': findings, 'result': 'PASS' if not findings else 'FAIL'}, indent=2))
print(f"{'PASS' if not findings else 'FAIL'}: {scanned} tracked files scanned, {len(findings)} findings, {len(hits) - len(findings)} allow-listed")
sys.exit(1 if findings else 0)
