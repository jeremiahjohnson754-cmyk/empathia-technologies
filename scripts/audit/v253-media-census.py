#!/usr/bin/env python3
"""
Census of the narration, film and SIGNAL structures inside the V2.5.3 single-file editions (read-only; the HTML is untrusted input and
is only scanned as text, never executed). Answers: how many SIGNAL seasons and playable episodes, how many VO_LINES narration entries,
how many CINE_FILMS definitions, which media / voice ids the code references, and whether any media bytes are embedded.
  python3 -I scripts/audit/v253-media-census.py <live.html> <offline.html> [--out=docs/parity/V253_MEDIA_CENSUS.json]
"""
import json, re, sys, hashlib, os, datetime
args = [a for a in sys.argv[1:] if not a.startswith('--')]; out = next((a[6:] for a in sys.argv if a.startswith('--out=')), None)
def census(path):
    raw = open(path, 'rb').read(); t = raw.decode('utf-8', 'replace')
    def block(name):
        m = re.search(r'\b' + name + r'\s*=\s*([\[{])', t)
        if not m: return ''
        i = m.end() - 1; open_c = t[i]; close_c = ']' if open_c == '[' else '}'; depth = 0; j = i; s = None
        while j < len(t):
            c = t[j]
            if s:
                if c == '\\': j += 2; continue
                if c == s: s = None
            elif c in '"\'`': s = c
            elif c == open_c: depth += 1
            elif c == close_c:
                depth -= 1
                if depth == 0: return t[i:j + 1]
            j += 1
        return ''
    eps = block('SIGNAL_EPISODES'); seasons = block('SIGNAL_SEASONS'); vo = block('VO_LINES'); vodur = block('VO_DUR'); cine = block('CINE_FILMS')
    return {
        'file': os.path.basename(path), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
        'signalSeasons': len(re.findall(r'\bn\s*:\s*\d+|\bseason\s*:\s*\d+|\{\s*id\s*:', seasons)) if seasons else 0,
        'signalEpisodeIds': sorted(set(re.findall(r'\bS\d+E\d+\b', eps))),
        'voLinesEntries': len(re.findall(r'["\']?[\w.-]+["\']?\s*:\s*["\'`]', vo)) if vo.startswith('{') else len(re.findall(r'\{', vo)),
        'voDurEntries': len(re.findall(r':\s*[\d.]+', vodur)),
        'cineFilmKeys': sorted(set(re.findall(r'["\']?([A-Za-z][\w-]{1,40})["\']?\s*:\s*\{', cine)))[:80] if cine.startswith('{') else len(re.findall(r'\bid\s*:', cine)),
        'mediaIdsReferenced': sorted(set(re.findall(r'["\'`]((?:media|vo|film|cine)-[a-z0-9][\w.-]{1,60})["\'`]', t)))[:400],
        'videoTagsInMarkup': len(re.findall(r'<video\b', t.split('<script', 1)[0])), 'audioTagsInMarkup': len(re.findall(r'<audio\b', t.split('<script', 1)[0])),
        'embeddedMediaDataUris': len(re.findall(r'data:(?:audio|video)/', t)),
        'hasVoPlay': 'voPlay' in t, 'hasMediaUrl': 'mediaUrl' in t, 'hasMediaHas': 'mediaHas' in t,
    }
res = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'method': 'text scan of the inline scripts (not executed); counts are pattern counts and say so', 'editions': [census(a) for a in args]}
for e in res['editions']: e['mediaIdsReferencedCount'] = len(e['mediaIdsReferenced'])
if out: open(out, 'w').write(json.dumps(res, indent=2) + '\n')
for e in res['editions']: print(e['file'], {k: (v if not isinstance(v, list) or len(v) < 8 else f'{len(v)} items') for k, v in e.items() if k not in ('file', 'sha256')})
