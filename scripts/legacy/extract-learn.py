"""Extract the Learn / ServiceHands product content of V2.5.3 (data literals only) into packages/domain-data/data/LEARN_V253.json.

The legacy file is read as text and never executed: each named constant is located, its array/object literal is cut out by bracket
matching and converted to JSON by a small tokenizer (strings, numbers, identifiers as keys, !0/!1, regex literals become their source).
Run with:  python3 -I scripts/legacy/extract-learn.py
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'legacy/source/v253/Empathia-Living-Campus-V2.5.3-offline.html')
OUT = os.path.join(ROOT, 'packages/domain-data/data/LEARN_V253.json')
s = open(SRC, encoding='utf-8', errors='ignore').read()

NAMES = ['EVIDENCE_LADDER', 'SERVICE_VERBS', 'VERB_MIN', 'SCORE_DIMS', 'SCORE_PASS', 'READINESS', 'LEARN_POINTS', 'FIX_OWNER', 'OWNER_SAYS',
         'DOMAIN_KIT', 'SERVICE_WINDOW', 'LEARN_NAV', 'KNOWLEDGE_KINDS', 'NEW_COMPETENCIES', 'SIGNAL_SEASONS', 'SIGNAL_CAST', 'SIGNAL_EPISODES',
         'DESIGN_LESSONS', 'ASK_QUESTIONS', 'SH_STAGES', 'SH_ROUTES', 'REPLAY_STAGES', 'ROOT_CAUSES', 'KNOWN_FIXES']


def find_decl(name):
    m = re.search(r'(?:const |let |var |,)' + name + r'=', s)
    return m.end() if m else -1


def tokens(src, i):
    """Yield (kind, value, end) from position i until the literal that starts at i closes."""
    depth = 0
    n = len(src)
    out = []
    while i < n:
        c = src[i]
        if c in ' \n\t\r':
            i += 1; continue
        if c in '[{':
            depth += 1; out.append(('p', c)); i += 1; continue
        if c in ']}':
            depth -= 1; out.append(('p', c)); i += 1
            if depth == 0: return out, i
            continue
        if c in ',:':
            out.append(('p', c)); i += 1; continue
        if c in '"\'`':
            q = c; j = i + 1; buf = []
            while src[j] != q:
                if src[j] == '\\':
                    e = src[j + 1]
                    if e == 'u': buf.append(chr(int(src[j + 2:j + 6], 16))); j += 6; continue
                    if e == 'x': buf.append(chr(int(src[j + 2:j + 4], 16))); j += 4; continue
                    buf.append({'n': '\n', 't': '\t', 'r': ''}.get(e, e)); j += 2; continue
                if q == '`' and src[j] == '$' and src[j + 1] == '{': raise ValueError('template expression at %d' % j)
                buf.append(src[j]); j += 1
            out.append(('s', ''.join(buf))); i = j + 1; continue
        if c == '!' and src[i + 1] in '01':
            out.append(('v', src[i + 1] == '0')); i += 2; continue
        if c == '/' and out and out[-1][0] == 'p':
            j = i + 1
            while src[j] != '/':
                j += 2 if src[j] == '\\' else 1
            k = j + 1
            while src[k].isalpha(): k += 1
            out.append(('s', src[i + 1:j])); i = k; continue
        m = re.match(r'-?(?:\d+\.?\d*|\.\d+)(?:e\d+)?', src[i:])
        if m and (c.isdigit() or c in '.-'):
            t = m.group(0); out.append(('v', float(t) if ('.' in t or 'e' in t) else int(t))); i += len(t); continue
        m = re.match(r'[A-Za-z_$][\w$]*', src[i:])
        if m:
            w = m.group(0)
            if w in ('null', 'void'): out.append(('v', None)); i += len(w) + (2 if w == 'void' else 0); continue
            if w in ('true', 'false'): out.append(('v', w == 'true')); i += len(w); continue
            out.append(('id', w)); i += len(w); continue
        raise ValueError('unexpected %r at %d: %s' % (c, i, src[i:i + 60]))
    raise ValueError('unterminated')


def to_json(toks):
    parts = []
    for idx, (k, v) in enumerate(toks):
        if k == 'p': parts.append(v)
        elif k == 's': parts.append(json.dumps(v, ensure_ascii=False))
        elif k == 'v': parts.append(json.dumps(v))
        elif k == 'id':
            nxt = toks[idx + 1] if idx + 1 < len(toks) else None
            if nxt and nxt == ('p', ':'): parts.append(json.dumps(v))
            else: raise ValueError('identifier value %s' % v)
    return json.loads(''.join(parts))


data, missing = {}, []
for name in NAMES:
    i = find_decl(name)
    if i < 0: missing.append(name); continue
    if s[i] in '[{':
        try:
            toks, _ = tokens(s, i); data[name] = to_json(toks)
        except Exception as e:  # a literal with code in it: reported, not guessed
            missing.append('%s (%s)' % (name, str(e)[:60]))
    else:
        m = re.match(r'-?[\d.]+', s[i:]); data[name] = float(m.group(0)) if m and '.' in m.group(0) else int(m.group(0)) if m else None
for name in ['MATERIALS', 'BANDS']:
    i = find_decl(name)
    try:
        toks, _ = tokens(s, i); data[name] = to_json(toks)
    except Exception as e: missing.append('%s (%s)' % (name, str(e)[:60]))
# lessons added later in the file with DESIGN_LESSONS.push({...},{...})
for m in re.finditer(r'DESIGN_LESSONS\.push\(', s):
    i = m.end()
    while True:
        toks, i = tokens(s, i); data['DESIGN_LESSONS'].append(to_json(toks))
        while s[i] in ' \n': i += 1
        if s[i] == ',': i += 1; continue
        break
# the rendered values of the placeholders (V2.5.3 page text): DR-70 trigger, 60-character justification minimum
data['PLACEHOLDERS'] = {'DR': '70', 'JMAT': '60', 'JMIN': '10'}   # JUST_MIN = {minor: 10, material: 60}
data['_source'] ='Empathia Living Campus V2.5.3 offline (read statically by scripts/legacy/extract-learn.py; never executed)'
json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=0, separators=(',', ':'))
print('wrote', OUT, os.path.getsize(OUT), 'bytes;', ', '.join('%s:%s' % (k, len(v) if hasattr(v, '__len__') else v) for k, v in data.items() if k != '_source'))
if missing: print('MISSING', missing)
