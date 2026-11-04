# Empathia emblem v3 — precise geometry for Figma. 512 x 512, centre (256,256).
import math, json, sys, os
OUT=os.path.dirname(os.path.abspath(__file__))
K=dict(black='#121011', bowl_hi='#221e1f', bowl_lo='#0a0909', ink='#c1121f', ink_dk='#8f0c16', bronze='#b08442', bronze_dk='#7a5726', bronze_hi='#d9b271',
       green='#45cfc1', green_dk='#2a9a8e', green_hi='#9be9df', ivory='#f2eadb')
C=256.0
def P(a,r,c=(C,C)): return (c[0]+r*math.cos(math.radians(a)), c[1]+r*math.sin(math.radians(a)))
def f(p): return f'{p[0]:.2f},{p[1]:.2f}'
RING=176; A0=126.4; A1=54.3
PEN=P(A0,RING); NEEDLE=P(A1,RING); HINGE=(256.0,142.0)
def taper(a,b,wa,wb):
    dx,dy=b[0]-a[0],b[1]-a[1]; L=math.hypot(dx,dy); px,py=-dy/L,dx/L
    pts=[(a[0]+wa*px,a[1]+wa*py),(b[0]+wb*px,b[1]+wb*py),(b[0]-wb*px,b[1]-wb*py),(a[0]-wa*px,a[1]-wa*py)]
    return 'M'+' L'.join(f(p) for p in pts)+'Z'
def leaf(x,y,ang,L,W):
    # olive leaf: lanceolate, pointed both ends, slight asymmetry
    pts=f'M0,0 C{L*0.22:.2f},{-W*1.05:.2f} {L*0.70:.2f},{-W*0.92:.2f} {L:.2f},0 C{L*0.68:.2f},{W*0.80:.2f} {L*0.20:.2f},{W*0.95:.2f} 0,0Z'
    return f'<path d="{pts}" transform="translate({x:.2f} {y:.2f}) rotate({ang:.1f})"/>'
def sprig(side):
    # an olive sprig from beside the hinge, curving outward and up; side = -1 left, +1 right
    s=side; x0,y0=256+s*24,152
    c1=(256+s*58,150); c2=(256+s*82,124); e=(256+s*86,92)
    stem=f'<path d="M{x0:.1f},{y0:.1f} C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {e[0]:.1f},{e[1]:.1f}" fill="none" stroke="{K["bronze"]}" stroke-width="4.5" stroke-linecap="round"/>'
    def bez(t):
        mt=1-t; return (mt**3*x0+3*mt*mt*t*c1[0]+3*mt*t*t*c2[0]+t**3*e[0], mt**3*y0+3*mt*mt*t*c1[1]+3*mt*t*t*c2[1]+t**3*e[1])
    def tang(t):
        mt=1-t; dx=3*mt*mt*(c1[0]-x0)+6*mt*t*(c2[0]-c1[0])+3*t*t*(e[0]-c2[0]); dy=3*mt*mt*(c1[1]-y0)+6*mt*t*(c2[1]-c1[1])+3*t*t*(e[1]-c2[1]); return math.degrees(math.atan2(dy,dx))
    leaves=''
    for i,t in enumerate([0.22,0.42,0.62,0.80]):
        x,y=bez(t); a=tang(t); L=30-i*3; W=7.6-i*0.6
        leaves+=leaf(x,y,a-58*s*(1 if i%2==0 else -1)*(-1),L,W)
    x,y=bez(0.985); a=tang(0.985); leaves+=leaf(x,y,a,26,6.4)  # terminal leaf
    ox,oy=bez(0.52); fruit=f'<ellipse cx="{ox+s*10:.1f}" cy="{oy+12:.1f}" rx="6.2" ry="7.6" fill="{K["bronze_hi"]}"/>'
    return stem+f'<g fill="{K["bronze"]}">{leaves}</g>'+fruit
def compass(col=K['green'],dk=K['green_dk'],hi=K['green_hi'],bowl=K['black'],detail=True,h=HINGE,tips=(PEN,NEEDLE),w=(15,9),node=23,hinge_r=31):
    g=''
    for t in tips: g+=f'<path d="{taper(h,t,w[0],w[1])}" fill="{col}"/>'
    if detail:  # a fine highlight along each leg's outer edge, and the shaded inner edge
        for t,sgn in ((tips[0],-1),(tips[1],1)):
            dx,dy=t[0]-h[0],t[1]-h[1]; L=math.hypot(dx,dy); px,py=-dy/L,dx/L
            a=(h[0]+sgn*(w[0]-4)*px*-1, h[1]+sgn*(w[0]-4)*py*-1); b=(t[0]+sgn*(w[1]-3)*px*-1, t[1]+sgn*(w[1]-3)*py*-1)
            g+=f'<path d="M{f(a)} L{f(b)}" stroke="{hi}" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>'
    # the grip above the hinge, ridged
    gx,gy,gw,gh=h[0]-13,h[1]-62,26,40
    g+=f'<rect x="{gx}" y="{gy}" width="{gw}" height="{gh}" rx="8" fill="{col}"/>'
    if detail:
        for k in range(4): g+=f'<rect x="{gx+4}" y="{gy+7+k*7.5}" width="{gw-8}" height="2.4" rx="1.2" fill="{dk}"/>'
    g+=f'<rect x="{h[0]-6}" y="{h[1]-26}" width="12" height="10" fill="{col}"/>'
    # the hinge disc: outer disc, inner ring, pin
    g+=f'<circle cx="{h[0]}" cy="{h[1]}" r="{hinge_r}" fill="{col}"/>'
    if detail: g+=f'<circle cx="{h[0]}" cy="{h[1]}" r="{hinge_r-9}" fill="none" stroke="{dk}" stroke-width="3"/>'
    g+=f'<circle cx="{h[0]}" cy="{h[1]}" r="{8 if detail else 9}" fill="{bowl}"/>'
    # the nodes at the points (the V2.5.3 mark's nodes)
    for t in tips:
        g+=f'<circle cx="{t[0]:.2f}" cy="{t[1]:.2f}" r="{node}" fill="{col}"/>'
        if detail: g+=f'<circle cx="{t[0]:.2f}" cy="{t[1]:.2f}" r="{node-8}" fill="none" stroke="{dk}" stroke-width="2.6"/>'
    return g
def ring(r=RING,sw=13,stations=True,bowl=K['black'],a0=A0,a1=A1,c=(C,C)):
    a=P(a0,r,c); b=P(a1,r,c)
    g=f'<path d="M{f(a)} A{r},{r} 0 1 1 {f(b)}" fill="none" stroke="{K["ink"]}" stroke-width="{sw}" stroke-linecap="round"/>'
    if stations:
        span=(a1+360-a0)
        for k in range(1,6):
            p=P(a0+span*k/6,r,c); g+=f'<circle cx="{p[0]:.2f}" cy="{p[1]:.2f}" r="{sw*0.95:.1f}" fill="{K["ink"]}" stroke="{bowl}" stroke-width="{sw*0.55:.1f}"/>'
    return g
def drip(p,s=1.0):
    x,y=p; y0=y+20*s
    d=(f'M{x-4.6*s:.2f},{y0-8*s:.2f} C{x-4*s:.2f},{y0+6*s:.2f} {x-11*s:.2f},{y0+12*s:.2f} {x-11*s:.2f},{y0+22*s:.2f} '
       f'A{11*s:.2f},{11*s:.2f} 0 0 0 {x+11*s:.2f},{y0+22*s:.2f} C{x+11*s:.2f},{y0+12*s:.2f} {x+4*s:.2f},{y0+6*s:.2f} {x+4.6*s:.2f},{y0-8*s:.2f}Z')
    hl=f'<ellipse cx="{x-4*s:.2f}" cy="{y0+20*s:.2f}" rx="{2.6*s:.2f}" ry="{4.2*s:.2f}" fill="#ffffff" opacity=".28"/>'
    return f'<path d="{d}" fill="{K["ink"]}"/>'+hl+f'<circle cx="{x+1*s:.2f}" cy="{y0+47*s:.2f}" r="{4.6*s:.2f}" fill="{K["ink"]}"/>'
def aspis(rendered=True):
    defs=''
    if rendered:
        defs=(f'<defs><radialGradient id="bowl" cx="0.42" cy="0.36" r="0.72"><stop offset="0" stop-color="{K["bowl_hi"]}"/><stop offset="1" stop-color="{K["bowl_lo"]}"/></radialGradient>'
              f'<linearGradient id="rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{K["bronze_hi"]}"/><stop offset="0.48" stop-color="{K["bronze"]}"/><stop offset="1" stop-color="{K["bronze_dk"]}"/></linearGradient></defs>')
    rim='url(#rim)' if rendered else K['bronze']; bowl='url(#bowl)' if rendered else K['black']
    g=defs+f'<circle cx="256" cy="256" r="244" fill="{rim}"/>'
    g+=f'<circle cx="256" cy="256" r="236" fill="none" stroke="{K["bronze_hi"] if rendered else K["bronze"]}" stroke-width="2" opacity=".7"/>'
    g+=f'<circle cx="256" cy="256" r="214" fill="{K["bronze_dk"]}"/><circle cx="256" cy="256" r="208" fill="{bowl}"/>'
    return g
def svg(body,name,vb=512):
    s=f'<svg xmlns="http://www.w3.org/2000/svg" width="{vb}" height="{vb}" viewBox="0 0 {vb} {vb}">{body}</svg>\n'
    open(os.path.join(OUT,name),'w').write(s); return s
# 1 — flagship, rendered (gradients) and flat
for rendered,name in ((True,'aspis-rendered.svg'),(False,'aspis-flat.svg')):
    svg(aspis(rendered)+ring()+f'<g>{sprig(-1)}{sprig(1)}</g>'+compass()+drip(PEN),name)
# 1s — small (16–48 px): no laurel, no stations, no detail, heavier
small=f'<circle cx="256" cy="256" r="246" fill="{K["bronze"]}"/><circle cx="256" cy="256" r="212" fill="{K["black"]}"/>'+ring(r=170,sw=26,stations=False)
sp=P(A0,170); sn=P(A1,170)
small+=compass(detail=False,h=(256,128),tips=(sp,sn),w=(24,17),node=34,hinge_r=40).replace(f'<rect x="{256-13}" y="{128-62}"','<rect x="999" y="999"')
svg(small,'aspis-small.svg')
# 2 — tile (app icon), the V2.5.3 square carried forward
tp=P(A0,150); tn=P(A1,150)
tile=(f'<defs><linearGradient id="trim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{K["bronze_hi"]}"/><stop offset="1" stop-color="{K["bronze_dk"]}"/></linearGradient></defs>'
      f'<rect x="8" y="8" width="496" height="496" rx="124" fill="url(#trim)"/><rect x="22" y="22" width="468" height="468" rx="112" fill="{K["black"]}"/>')
tile+=ring(r=150,sw=14,stations=False)+compass(h=(256,150),tips=(tp,tn),w=(16,10),node=25,hinge_r=31)+drip(tp,0.9)
svg(tile,'tile.svg')
# 3 — crest (heater shield)
H='M80,56 H432 V232 C432,356 356,428 256,480 C156,428 80,356 80,232 Z'
crest=(f'<path d="{H}" fill="{K["bronze"]}" transform="translate(256 268) scale(1.06) translate(-256 -268)"/>'
       f'<path d="{H}" fill="{K["ink"]}"/><path d="{H}" fill="{K["black"]}" transform="translate(256 268) scale(0.9) translate(-256 -268)"/>')
cp=(152,372); cn=(360,372)
crest+=f'<path d="M124,420 Q256,384 388,420" fill="none" stroke="{K["ink"]}" stroke-width="12" stroke-linecap="round"/>'
crest+=f'<g transform="translate(0 30)">{sprig(-1)}{sprig(1)}</g>'+compass(h=(256,172),tips=(cp,cn))+drip(cp,0.8)
svg(crest,'crest.svg')
print('ok')
