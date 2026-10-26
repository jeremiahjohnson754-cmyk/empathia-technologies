#!/usr/bin/env python3
"""Build the media and film manifest (Stage 6, directive section 12).

Read-only over the founder workspace. For every video and audio file found by the Stage 0 inventory it records the title,
path, container/codec, resolution, duration (from ffprobe, i.e. the file was actually inspected), SHA-256 (from the inventory),
the rights record joined by hash from the protected media-rights ledger, and a role (master / review / chunk / superseded /
quarantined test pattern / embedded-copy) inferred from the path. It never upgrades a rights status: an asset that is not in the
ledger is NOT_IN_LEDGER, which is treated exactly like UNVERIFIED (not distributable).

    python3 -I scripts/media/build-media-manifest.py <workspace-root> <inventory.csv> <ledger.csv> <out-dir>
"""
import csv, json, os, pathlib, re, subprocess, sys, collections

root, inv_csv, ledger_csv, out = map(pathlib.Path, sys.argv[1:5])
out.mkdir(parents=True, exist_ok=True)
VIDEO = {'.mp4', '.mov', '.webm', '.mkv', '.m4v'}
AUDIO = {'.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'}

ledger = {}
with open(ledger_csv, newline='') as f:
    for r in csv.DictReader(f):
        ledger[r['sha256']] = r

def role_of(p: str) -> str:
    q = p.lower()
    if '/quarantine/' in q or 'test-pattern' in q: return 'QUARANTINED_TEST_PATTERN'
    if '/superseded' in q or 'superseded' in q: return 'SUPERSEDED'
    if '/chunks/' in q or '/uhd-parts/' in q or re.search(r'/render/[^/]*part', q): return 'RENDER_CHUNK'
    if '/review' in q or '09_review' in q: return 'REVIEW_EXPORT'
    if 'first-voice' in q: return 'SUPERSEDED_VOICE'
    if '10_final_masters' in q or '/masters/' in q or '11_masters' in q or '/out/hq/' in q or '/deliver/' in q: return 'MASTER'
    if '/media/out/' in q and 'empathia-campus' in q: return 'DEMONSTRATOR_EMBED_SOURCE'
    if '/legal/media-rights/masters/' in q: return 'PROTECTED_ARCHIVE_COPY'
    if '/render/' in q: return 'RENDER_INTERMEDIATE'
    if '/out/' in q: return 'OUTPUT'
    return 'OTHER'

def probe(path: pathlib.Path) -> dict:
    try:
        r = subprocess.run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', str(path)], capture_output=True, text=True, timeout=60)
        j = json.loads(r.stdout or '{}')
    except Exception as e:  # noqa: BLE001 — recorded, never hidden
        return {'probe': f'FAILED: {e}'}
    if not j.get('format'): return {'probe': f'FAILED: {r.stderr.strip()[:200]}'}
    v = next((s for s in j.get('streams', []) if s.get('codec_type') == 'video' and s.get('disposition', {}).get('attached_pic') != 1), None)
    a = next((s for s in j.get('streams', []) if s.get('codec_type') == 'audio'), None)
    s = next((s for s in j.get('streams', []) if s.get('codec_type') == 'subtitle'), None)
    fr = v.get('avg_frame_rate', '0/1') if v else '0/1'
    try:
        n, d = fr.split('/'); fps = round(int(n) / int(d), 3) if int(d) else None
    except Exception:  # noqa: BLE001
        fps = None
    return {
        'probe': 'OK',
        'container': j['format'].get('format_name'),
        'durationS': round(float(j['format'].get('duration', 0) or 0), 3),
        'bitRate': int(j['format'].get('bit_rate', 0) or 0),
        'videoCodec': v.get('codec_name') if v else None,
        'width': v.get('width') if v else None,
        'height': v.get('height') if v else None,
        'fps': fps,
        'audioCodec': a.get('codec_name') if a else None,
        'audioChannels': a.get('channels') if a else None,
        'subtitleStream': s.get('codec_name') if s else None,
    }

def title_of(path: str) -> str:
    stem = pathlib.Path(path).stem
    return re.sub(r'[_]+', ' ', stem)

rows = []
with open(inv_csv, newline='') as f:
    for r in csv.DictReader(f):
        ext = pathlib.Path(r['path']).suffix.lower()
        if ext not in VIDEO | AUDIO: continue
        p = root / r['path']
        L = ledger.get(r['sha256'])
        rec = {
            'title': title_of(r['path']),
            'path': r['path'],
            'kind': 'video' if ext in VIDEO else 'audio',
            'bytes': int(r['bytes']),
            'sha256': r['sha256'],
            'role': role_of('/' + r['path']),
            'ledgerAssetId': L['asset_id'] if L else None,
            'rightsStatus': L['verification_status'] if L else 'NOT_IN_LEDGER',
            'rightsOwner': L['rights_owner'] if L else 'NOT ESTABLISHED',
            'licenceEvidence': L['licence_terms'] if L else 'NONE ON FILE',
            'provenance': (L['source'] if L else 'not ledgered; see the production folder this file lives in')[:400],
            'creator': (L['creator'] if L else 'not recorded in the ledger')[:300],
            'authorizedChannels': L['authorized_channels'] if L else 'NONE',
            'usageRestrictions': 'internal founder use only; not distributable until VERIFIED for a channel' if not L or L['verification_status'] != 'VERIFIED' else f"only: {L['authorized_channels']}",
            'distributionEligibility': 'ELIGIBLE_FOR:' + L['authorized_channels'] if L and L['verification_status'] == 'VERIFIED' else 'NOT_ELIGIBLE',
        }
        rec.update(probe(p))
        rows.append(rec)

rows.sort(key=lambda x: (x['role'] != 'MASTER', x['path']))
json.dump({'generatedBy': 'scripts/media/build-media-manifest.py', 'root': str(root), 'assets': rows}, open(out / 'MEDIA_MANIFEST.json', 'w'), indent=1)
cols = ['title', 'kind', 'role', 'path', 'container', 'videoCodec', 'audioCodec', 'width', 'height', 'fps', 'durationS', 'bytes', 'sha256', 'rightsStatus', 'ledgerAssetId', 'rightsOwner', 'authorizedChannels', 'distributionEligibility', 'usageRestrictions', 'licenceEvidence', 'creator', 'provenance', 'probe']
with open(out / 'MEDIA_MANIFEST.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore'); w.writeheader(); w.writerows(rows)
summary = collections.Counter((r['kind'], r['role'], r['rightsStatus']) for r in rows)
print(json.dumps({'assets': len(rows), 'probeFailures': sum(1 for r in rows if r.get('probe') != 'OK'), 'byKindRoleRights': {' / '.join(k): v for k, v in sorted(summary.items())}}, indent=1))
