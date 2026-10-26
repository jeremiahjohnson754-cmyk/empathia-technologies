#!/usr/bin/env python3
"""Write provenance/release-history/RELEASE_LINEAGE.json and .md from the recorded frozen check, the git tags and the 2.5.4 extraction record.
Read-only over the release packages; re-run scripts/verify/verify-frozen.py first (it writes FROZEN_CHECK_VAULT.json).

    python3 -I scripts/verify/verify-frozen.py /home/claude/Empathia_V25 provenance/release-history/FROZEN_CHECK_VAULT.json
    python3 -I provenance/scripts/release_lineage.py
"""
import csv, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
RH = ROOT / 'provenance/release-history'
check = json.loads((RH / 'FROZEN_CHECK_VAULT.json').read_text())
hist = json.loads((ROOT / 'provenance/source-manifest/GIT_HISTORY.json').read_text())
demo = next(r for r in hist['repositories'] if r['label'].startswith('demonstrator'))
tags = {t['tag']: t for t in demo['tags']}
prov = json.loads((ROOT / 'packages/domain-data/data/PROVENANCE.json').read_text())
pk = {p['package']: p for p in check['packages']}
ar = {a['archive']: a for a in check['archives']}

def arch(prefix):
    a = [v for k, v in ar.items() if k.startswith(prefix + '-')]
    return [{'archive': x['archive'], 'sha256': x['sha256'], 'matchesRecordedSha256': x['match']} for x in a]

REL = [
    ('2.5.1.1', 'investor', 'Empathia_Investor_Release_2511', None, 'frozen; security patch line (branch patch/2.5.1.1, worktree source-251p)'),
    ('2.5.2 rc1', 'investor', 'Empathia_Investor_Release_252', 'v2.5.2-rc1', 'frozen 2026-10-25'),
    ('2.5.3 rc1', 'investor', 'Empathia_Investor_Release_253', 'v2.5.3-rc1', 'frozen; superseded by rc2/rc3'),
    ('2.5.3 rc1', 'engineer', 'Empathia_Engineer_Edition_253', 'v2.5.3-rc1', 'frozen; superseded'),
    ('2.5.3 rc2', 'investor', 'Empathia_Investor_Release_253_rc2', 'v2.5.3-rc2', 'frozen; superseded by rc3'),
    ('2.5.3 rc2', 'engineer', 'Empathia_Engineer_Edition_253_rc2', 'v2.5.3-rc2', 'frozen; superseded'),
    ('2.5.3 rc3', 'investor', 'Empathia_Investor_Release_253_rc3', 'v2.5.3-rc3', 'frozen; current candidate'),
    ('2.5.3 rc3', 'engineer', 'Empathia_Engineer_Edition_253_rc3', 'v2.5.3-rc3', 'frozen; current engineer candidate'),
]
rows = []
for ver, kind, pkg, tag, note in REL:
    p = pk.get(pkg, {})
    t = tags.get(tag) if tag else None
    rows.append({'version': ver, 'edition': kind, 'package': f'Empathia_V25/{pkg}', 'frozen': True, 'state': note,
                 'gitTag': tag, 'gitCommit': t['commit'] if t else None, 'tagMessage': t['subject'] if t else None,
                 'manifestEntries': p.get('entries'), 'mismatchesAtCheck': len(p.get('mismatches', [])) if p else None, 'immutableAttribute': p.get('lsattr'),
                 'editionHashes': p.get('editions', {}), 'archives': arch(pkg),
                 'distribution': 'NOT AUTHORIZED — external page-API security assessment: NOT VERIFIED — EXTERNAL TEST REQUIRED; owner conditions open'})
rows[0]['gitCommit'] = '4b30315'   # head of branch patch/2.5.1.1 (no tag) as recorded in docs/discovery/SOURCE_REGISTER.csv
rows.append({'version': '2.5.4-dev', 'edition': 'founder (development build, not a release)', 'package': 'apps/founder-studio/dist/demonstrators/founder/Empathia-Founder-Edition.html (built from source)',
             'frozen': False, 'state': 'development line for the founder program; not a release candidate', 'gitTag': None, 'gitCommit': prov['sourceCommit'], 'sourceBranch': prov['sourceBranch'],
             'buildCommand': prov['buildCommand'], 'editionHashes': {prov['extractedFrom']: prov['sha256']}, 'distribution': 'INTERNAL ONLY — not authorized for any external channel'})
hist_csv = pathlib.Path('/home/claude/Empathia_V25/legal/historical-releases/HISTORICAL_PACKAGES.csv')
historical = []
if hist_csv.exists():
    seen = set()
    for r in csv.DictReader(open(hist_csv)):
        historical.append({'copyId': r['copy_id'], 'version': r['version'], 'variant': r['variant'], 'sha256': r['sha256'] or None, 'treeSha256': r['tree_sha256'] or None})
out = {'generatedFrom': ['provenance/release-history/FROZEN_CHECK_VAULT.json', 'provenance/source-manifest/GIT_HISTORY.json', 'packages/domain-data/data/PROVENANCE.json', str(hist_csv)],
       'frozenCheck': {'checkedAt': check['checkedAt'], 'result': check.get('result', 'PASS' if all(not p['mismatches'] for p in check['packages']) and all(a['match'] for a in check['archives']) else 'FAIL'),
                       'script': 'scripts/verify/verify-frozen.py'},
       'releases': rows,
       'historicalPackages': {'note': 'V1.2–V1.4.1 copies audited in Empathia_V25/legal/historical-releases (access-controlled). Subject to the historical release audit and recall/replacement plan there; not to be redistributed. Listed by id and hash only.', 'count': len(historical), 'items': historical}}
(RH / 'RELEASE_LINEAGE.json').write_text(json.dumps(out, indent=1) + '\n')

md = ['# Release lineage', '', f"Frozen-release integrity re-checked {check['checkedAt']} with `scripts/verify/verify-frozen.py`: **{out['frozenCheck']['result']}** (every file listed in each package's SHA256SUMS re-hashed; immutable attribute present; every archive matches its recorded sha256). Raw result: `FROZEN_CHECK_VAULT.json`.", '',
      '**Distribution:** no package below is authorized for external distribution. The independent page-API security assessment remains NOT VERIFIED — EXTERNAL TEST REQUIRED, and owner conditions are open. The 2.5.x \"independent audits\" referenced in tag messages were performed by a separate AI reviewer, not an independent human or third-party auditor.', '',
      '| Version | Edition | Package | Tag → commit | Files | Mismatches | Offline / private edition sha256 | State |', '|---|---|---|---|---:|---:|---|---|']
for r in rows:
    eh = r['editionHashes']
    main = next((v for k, v in eh.items() if 'offline' in k or 'engineer' in k or 'Founder' in k or '2.5.4' in k), next(iter(eh.values()), ''))
    md.append(f"| {r['version']} | {r['edition']} | `{r['package']}` | {r['gitTag'] or '—'} → `{(r['gitCommit'] or '')[:10]}` | {r.get('manifestEntries') or '—'} | {r.get('mismatchesAtCheck') if r.get('mismatchesAtCheck') is not None else '—'} | `{main}` | {r['state']} |")
md += ['', '## Archives', '', '| Archive | sha256 | Matches record |', '|---|---|---|'] + [f"| `{a['archive']}` | `{a['sha256']}` | {'yes' if a['match'] else 'NO'} |" for a in check['archives']]
md += ['', 'The 2.5.1.1 package has no deterministic tar archive in `work/frozen`; its integrity rests on its SHA256SUMS (495 entries, 0 mismatches) and the immutable attribute.', '',
       '## Lineage', '', '```mermaid', 'flowchart LR',
       '  V141["V1.4.1 (empathia-campus, tag v1.4.1)"] --> V25["V2.5 source (Empathia_V25/work/source)"]',
       '  V25 --> P2511["2.5.1.1 investor (frozen)"]', '  V25 --> R252["2.5.2 rc1 (tag v2.5.2-rc1, frozen)"]',
       '  R252 --> R253a["2.5.3 rc1 investor+engineer (frozen)"] --> R253b["2.5.3 rc2 (frozen)"] --> R253c["2.5.3 rc3 (frozen, current candidate)"]',
       '  R253c --> D254["2.5.4-dev founder/2.5.4 b8986d1 (not a release)"] --> MONO["empathia-technologies monorepo (this program)"]', '```', '',
       f"Historical V1.2–V1.4.1 copies: {len(historical)} records in the access-controlled historical-release audit (by id and hash in `RELEASE_LINEAGE.json`); see that audit for their restrictions."]
(RH / 'RELEASE_LINEAGE.md').write_text('\n'.join(md) + '\n')
print(out['frozenCheck'], len(rows), len(historical))
