# Static extraction of Empathia Lite's records from V2.5.3 into apps/demo/src/lite/data/v253.ts.
#   python3 -I apps/demo/src/lite/data/extract-v253.py legacy/source/v253/Empathia-Living-Campus-V2.5.3-offline.html apps/demo/src/lite/data/v253.ts
# Parses JavaScript literal syntax only (arrays, objects, strings, numbers, !0/!1, and the SO/stool/rect helper calls of spaceLayout);
# the legacy file is never executed. The legacy HTML is .gitignored, so the generated v253.ts is committed with this script as provenance.
import sys, re, json

TOK = re.compile(r'''\s*(?:(?P<s>"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\$]|\\.|\$(?!\{))*`)|(?P<n>-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)|(?P<i>[A-Za-z_$][\w$]*)|(?P<p>!0|!1|void 0|\.\.\.|[\[\]{}(),:?.]))''')
ESC = {'n': '\n', 't': '\t', 'r': '\r', 'b': '\b', 'f': '\f', 'v': '\v', '0': '\0'}

def unq(s):
    body = s[1:-1]; out = []; i = 0
    while i < len(body):
        c = body[i]
        if c != '\\': out.append(c); i += 1; continue
        n = body[i + 1]
        if n == 'x': out.append(chr(int(body[i + 2:i + 4], 16))); i += 4
        elif n == 'u': out.append(chr(int(body[i + 2:i + 6], 16))); i += 6
        else: out.append(ESC.get(n, n)); i += 2
    return ''.join(out)

class Reader:
    def __init__(s, src, i): s.src = src; s.i = i
    def tok(s):
        m = TOK.match(s.src, s.i)
        if not m: raise ValueError('cannot read at %d: %r' % (s.i, s.src[s.i:s.i + 50]))
        return m
    def take(s): m = s.tok(); s.i = m.end(); return m
    def p(s): return s.tok().group('p')
    def val(s):
        m = s.take(); p = m.group('p'); i = m.group('i')
        if m.group('s'): return unq(m.group('s'))
        if m.group('n'): return float(m.group('n')) if re.search(r'[.e]', m.group('n')) else int(m.group('n'))
        if p == '!0': return True
        if p == '!1': return False
        if p == 'void 0' or i == 'null': return None
        if p == '[':
            out = []
            while s.p() != ']':
                out.append(s.val())
                if s.p() == ',': s.take()
            s.take(); return out
        if p == '{':
            out = {}
            while s.p() != '}':
                k = s.take(); key = unq(k.group('s')) if k.group('s') else (k.group('i') or k.group('n'))
                if s.p() == ':': s.take(); out[key] = s.val()
                else: out[key] = {'$ref': key}
                if s.p() == ',': s.take()
            s.take(); return out
        if i:
            if s.p() == '(':
                s.take(); args = []
                while s.p() != ')':
                    args.append(s.val())
                    if s.p() == ',': s.take()
                s.take(); return call(i, args)
            return {'$ref': i}
        raise ValueError('unexpected %r at %d' % (m.group(0), s.i))

def call(fn, a):
    # the three geometry helpers of V2.5.3's spaceLayout (SO, stool, rect), evaluated as their definitions state
    if fn == 'SO':
        o = {'id': a[0], 'kind': a[1], 'label': a[2], 'x': a[3], 'y': a[4], 'z': 0, 'w': a[5], 'd': a[6], 'h': a[7], 'rot': 0}
        if len(a) > 8 and isinstance(a[8], dict): o.update(a[8])
        return o
    if fn == 'stool':
        o = {'id': a[0], 'kind': 'chair', 'x': a[1], 'y': a[2], 'z': 0, 'w': .5, 'd': .5, 'h': .9, 'rot': 0, 'face': a[3], 'label': 'Seat'}
        if len(a) > 4 and isinstance(a[4], dict): o.update(a[4])
        return o
    if fn == 'rect': x0, y0, x1, y1 = a; return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
    raise ValueError('unknown call ' + fn)

def read(src, name, start=0):
    m = re.compile(r'(?<![\w$.])' + re.escape(name) + r'\s*=\s*(?=[\[{])').search(src, start)
    if not m: raise SystemExit('not found: ' + name)
    return Reader(src, m.end()).val()

src = open(sys.argv[1], encoding='utf8', errors='replace').read()
D = {}
for n in ['LITE_MODES', 'LITE_STATES', 'LITE_LAYERS', 'LITE_COVER', 'LITE_MODE_LAYERS', 'LITE_TECH', 'SPACES', 'COMMONS_SCENES', 'COMMONS_CONTROL', 'VISIT_STEPS', 'QR_TYPES', 'QR_KINDS', 'VISITOR_PATH', 'CAMPUS_GATE', 'CAMPUS_PLAZA']:
    D[n] = read(src, n)
D['GUIDES'] = read(src, 'GUIDES', src.index('GUIDES=[{id:"G-ONB"'))
D['LITE_TAGLINE'] = re.search(r'LITE_TAGLINE="([^"]+)"', src).group(1)
D['QR_BASE'] = re.search(r'QR_BASE="([^"]+)"', src).group(1)
a = src.index('function spaceLayout(id,scene){'); b = src.index('function commonsLayout(', a)
layouts = {}
for m in re.finditer(r'case"(SP-[A-Z0-9-]+)":return', src[a:b]):
    if m.group(1) == "SP-ATL-COMMONS": continue  # commonsLayout(scene) is procedural: ported by hand in commons.ts
    layouts[m.group(1)] = Reader(src, a + m.end()).val()
D['SPACE_LAYOUTS'] = layouts
# the focus pods are built in a loop in V2.5.3 (x positions 1.4, 3.5, 5.6, 7.7); geometry and copy as that loop states
pods = re.search(r'case"SP-ATL-PODS":\{const objs=\[\];return\[([\d.,]+)\]', src[a:b]).group(1)
D['PODS_X'] = [float(x) for x in pods.split(',')]

ts = ['/**', ' * Empathia Lite records of the Living Campus V2.5.3, extracted statically by extract-v253.py (never executed). Synthetic data.',
      ' * Generated file: re-run the extractor rather than editing by hand.', ' */', '/* eslint-disable */']
TYPES = {
    'LITE_MODES': 'ReadonlyArray<readonly [string, string, string, string]>', 'LITE_STATES': 'ReadonlyArray<readonly [string, string, string]>',
    'LITE_LAYERS': 'ReadonlyArray<readonly [string, string, string]>', 'LITE_COVER': 'ReadonlyArray<readonly [string, string, string]>',
    'LITE_MODE_LAYERS': 'Readonly<Record<string, readonly string[]>>', 'LITE_TECH': 'Readonly<Record<string, boolean>>', 'SPACES': 'readonly SpaceDef[]',
    'COMMONS_SCENES': 'ReadonlyArray<readonly [string, string, string, readonly string[], readonly string[]]>', 'COMMONS_CONTROL': 'Readonly<Record<string, { mode: string; say: string; lead: readonly string[]; support: readonly string[] }>>',
    'VISIT_STEPS': 'ReadonlyArray<readonly [string, string, string, string]>', 'QR_TYPES': 'ReadonlyArray<readonly [string, string, string, string, string]>',
    'QR_KINDS': 'ReadonlyArray<readonly [string, string, string, string]>', 'VISITOR_PATH': 'ReadonlyArray<readonly [number, number]>',
    'CAMPUS_GATE': 'Readonly<Record<string, string>>', 'CAMPUS_PLAZA': 'readonly [number, number]', 'GUIDES': 'readonly GuideDef[]',
    'LITE_TAGLINE': 'string', 'QR_BASE': 'string', 'SPACE_LAYOUTS': 'Readonly<Record<string, SpaceLayout>>', 'PODS_X': 'readonly number[]',
}
ts.append("import type { SpaceDef, GuideDef, SpaceLayout } from './types.js';")
for k in TYPES:
    ts.append('export const %s: %s = %s;' % (k, TYPES[k], json.dumps(D[k], ensure_ascii=False)))
open(sys.argv[2], 'w', encoding='utf8').write('\n'.join(ts) + '\n')
print('wrote', sys.argv[2], {k: (len(v) if hasattr(v, '__len__') else v) for k, v in D.items()})
