#!/usr/bin/env python3
"""Write provenance/VAULT_INDEX.json: every file of the vault with bytes and sha256 (run last).

    python3 -I provenance/scripts/index_vault.py
"""
import datetime, hashlib, json, pathlib
V = pathlib.Path(__file__).resolve().parents[1]
DISCLAIMER = 'This dossier organizes evidence for review by qualified counsel. It does not establish ownership, copyright registration, patentability or freedom to operate.'
files = []
for f in sorted(V.rglob('*')):
    if f.is_file() and f.name != 'VAULT_INDEX.json' and '__pycache__' not in f.parts:
        b = f.read_bytes()
        files.append({'path': str(f.relative_to(V)), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()})
sections = {
    'README.md': 'what the vault is and how to regenerate it',
    'AI_ASSISTANCE_RECORD.md': 'AI-assisted development record',
    'CLASSIFICATION.md / .csv': 'confidentiality classification (scheme of six classes)',
    'source-manifest/': 'hashed manifest of every tracked monorepo file at HEAD; git histories of the monorepo, the demonstrator and related repositories',
    'sbom/': 'CycloneDX 1.5 SBOM; Python imports',
    'licenses/': 'third-party licences, copied licence texts, redistribution restrictions',
    'chain-of-title/': 'chain-of-title checklist with ownership ambiguities',
    'invention-disclosures/': 'five factual invention-disclosure records (attorney-review material)',
    'release-history/': 'release lineage and the frozen-release integrity check',
    'scripts/': 'generators (read-only over sources)',
}
out = {'vault': 'Empathia IP and software provenance vault', 'classification': 'RESTRICTED_IP (licence texts: THIRD_PARTY_LICENSED)', 'disclaimer': DISCLAIMER,
       'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'sections': sections, 'files': files,
       'treeSha256': hashlib.sha256('\n'.join(f"{x['sha256']}  {x['path']}" for x in files).encode()).hexdigest()}
(V / 'VAULT_INDEX.json').write_text(json.dumps(out, indent=1) + '\n')
print(len(files), out['treeSha256'])
