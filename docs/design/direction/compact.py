"""Compacts extract.mjs JSON into the array format figma-build.js reads (hex colours, deduped SVGs)."""
import json, sys, glob, os, re
def hx(c):
    if not c: return 0
    r, g, b, a = c; s = '%02x%02x%02x' % (round(r*255), round(g*255), round(b*255))
    return s if a >= .999 else s + '%02x' % round(a*255)
src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
for f in sorted(glob.glob(src + '/f*.json')):
    d = json.load(open(f)); S = []; out = []
    for it in d['items']:
        if it['t'] == 'r':
            g = it.get('g'); gg = [g['r'], g['a'], [[hx(c), round(p, 2)] for c, p in g['s']]] if g else 0
            out.append(['r', it['x'], it['y'], it['w'], it['h'], hx(it['bg']), gg, it['bw'], hx(it['bc']) if it['bw'] else 0, round(it['rad']), it['blur'], it['sh'],
                        [it['bb'][0], hx(it['bb'][1])] if it.get('bb') else 0, it.get('op', 1)])
        elif it['t'] == 'x':
            out.append(['x', it['x'], it['y'], it['w'], it['h'], it['s'], it['fs'], it['fw'], it['lh'] or 0, round(it['ls'], 2), hx(it['c']), it['al'], it['ml'], it.get('op', 1)])
        else:
            svg = re.sub(r'\s+', ' ', it['svg']).replace(' xmlns="http://www.w3.org/2000/svg"', '')
            if svg not in S: S.append(svg)
            out.append(['v', it['x'], it['y'], it['w'], it['h'], S.index(svg)])
    js = json.dumps({'n': d['name'], 'w': d['w'], 'h': d['h'], 'S': S, 'I': out}, separators=(',', ':'))
    open(dst + '/' + os.path.basename(f), 'w').write(js); print(os.path.basename(f), len(js))
