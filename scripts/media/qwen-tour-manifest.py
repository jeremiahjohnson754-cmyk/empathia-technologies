"""Build the Qwen tour-narration manifest: every tour stop with no shipped take, its words, and the spoken form sent to the model.
usage: python3 -I scripts/media/qwen-tour-manifest.py <repo> <out.json>
The words are the stop's own on-screen text (tours.ts); for the five Tour G stops left captions-only on 18 Nov, the words already
written for the voice (CAPTIONS_ONLY). The spoken form changes only how ids, numbers and initialisms are said; it adds no words."""
import json, re, sys, os
repo, out = sys.argv[1], sys.argv[2]
src = open(os.path.join(repo, 'apps/demo/src/tour/tours.ts'), encoding='utf8').read()

have = set(re.findall(r"^  '(tour-[a-g]-\d\d)': \{", src, re.M))
cap = {}
m = re.search(r"export const CAPTIONS_ONLY[^=]*= \{(.*?)\n\};", src, re.S)
for k, body in re.findall(r"'(tour-g-\d\d)': \[(.*?)\],?\n", m.group(1)):
    cap[k] = re.findall(r"'((?:[^'\\]|\\.)*)'", body)

stops = re.findall(r"\{ id: '([A-G])(\d+)', title: '([^']*)', text: '([^']*)'", src)
SPOKEN = [  # (pattern, spoken) applied in order; each is a pronunciation, not a change of words
    (r'\bAtlas 4\.218\b', 'Atlas four point two one eight'),
    (r'\bBeacon 3\.225\b', 'Beacon three point two two five'),
    (r'\b4\.218\b', 'four point two one eight'),
    (r'“4\.218”', '“four point two one eight”'),
    (r'\bAPEX\b', 'Apex'),
    (r'\bSIGNAL\b', 'Signal'),
    (r'\bJSON\b', 'J-SON'),
    (r'\bCSV\b', 'C-S-V'),
    (r'\bPDF\b', 'P-D-F'),
    (r'\b3D\b', 'three-D'),
    (r'\b2D\b', 'two-D'),
    (r'\bPress g\b', 'Press G'),
    (r'\bv1\b', 'version one'), (r'\bv2\b', 'version two'),
    (r' — ', ', '),
]
def spoken(t):
    for p, r in SPOKEN: t = re.sub(p, r, t)
    return t

rows = []
for tour, n, title, text in stops:
    key = f'tour-{tour.lower()}-{int(n):02d}'
    if key in have: continue
    words = ' '.join(cap[key]) if key in cap else text
    sentences = cap[key] if key in cap else None
    rows.append({'id': key, 'stop': f'{tour}{n}', 'title': title, 'text': words, 'sentences': sentences, 'say': spoken(words)})
json.dump(rows, open(out, 'w'), ensure_ascii=False, indent=1)
print(len(rows), 'stops without a take;', sum(len(r['text'].split()) for r in rows), 'words')
for r in rows:
    if r['say'] != r['text']: print(r['id'], '|', r['say'])
