import math
C=128
INK='#c1121f'; BLACK='#121011'; BRONZE='#b08442'; IVORY='#f2eadb'
def pt(a,r): return (C+r*math.cos(math.radians(a)), C+r*math.sin(math.radians(a)))
pen=pt(126.4,94); needle=pt(54.3,94)
def f(p): return f'{p[0]:.1f},{p[1]:.1f}'
def leg(tip, hinge=(128,60), wt=7.4, wb=4.2, nib=16):
    dx,dy=tip[0]-hinge[0],tip[1]-hinge[1]; L=math.hypot(dx,dy); ux,uy=dx/L,dy/L; px,py=-uy,ux
    b=(tip[0]-nib*ux, tip[1]-nib*uy)
    P=[(hinge[0]+wt*px,hinge[1]+wt*py),(b[0]+wb*px,b[1]+wb*py),tip,(b[0]-wb*px,b[1]-wb*py),(hinge[0]-wt*px,hinge[1]-wt*py)]
    return ' '.join(f'{x:.1f},{y:.1f}' for x,y in P)
def leaf(x,y,ang,L=13,W=4.6,col=BRONZE):
    # an olive leaf: pointed ellipse along angle
    return f'<path d="M0,0 C{L*0.3:.1f},{-W:.1f} {L*0.75:.1f},{-W:.1f} {L:.1f},0 C{L*0.75:.1f},{W:.1f} {L*0.3:.1f},{W:.1f} 0,0Z" transform="translate({x:.1f} {y:.1f}) rotate({ang})" fill="{col}"/>'
def compass(hinge=(128,60), tips=(pen,needle), col=IVORY, hole=BLACK, olive=True):
    hx,hy=hinge
    g=f'<rect x="{hx-5}" y="{hy-33}" width="10" height="24" rx="3.5" fill="{col}"/>'
    g+=f'<polygon points="{leg(tips[0],hinge)}" fill="{col}"/><polygon points="{leg(tips[1],hinge,nib=24)}" fill="{col}"/>'
    g+=f'<circle cx="{hx}" cy="{hy}" r="14" fill="{col}"/><circle cx="{hx}" cy="{hy}" r="5" fill="{hole}"/>'
    if olive:  # an olive crown on the compass head: Athena's tree on Sparta's letter
        g+=leaf(hx-7,hy-22,200)+leaf(hx-8,hy-12,165)+leaf(hx+7,hy-22,-20)+leaf(hx+8,hy-12,15)
    return g
aspis=f'<circle cx="128" cy="128" r="116" fill="{BLACK}"/><circle cx="128" cy="128" r="116" fill="none" stroke="{BRONZE}" stroke-width="9"/>'
arc=f'<path d="M{f(pen)} A94,94 0 1 1 {f(needle)}" fill="none" stroke="{INK}" stroke-width="6.5" stroke-linecap="round"/>'
x,y=pen
drip=f'<path d="M{x:.1f},{y-2:.1f} C{x-0.8:.1f},{y+7:.1f} {x-6:.1f},{y+10:.1f} {x-6:.1f},{y+16:.1f} A6,6 0 0 0 {x+6:.1f},{y+16:.1f} C{x+6:.1f},{y+10:.1f} {x+0.8:.1f},{y+7:.1f} {x:.1f},{y-2:.1f}Z" fill="{INK}"/>'
def svg(body, title, vb='0 0 256 256'): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'
open('A-redline-aspis.svg','w').write(svg(aspis+arc+compass()+drip,'Empathia: Redline Aspis'))
# D — War paint: a dry-brush swipe of red across the shield, drips falling from it
def smooth(pts):
    d=f'M{f(pts[0])}'
    n=len(pts)
    for i in range(n):
        p0,p1,p2,p3=pts[i-1],pts[i],pts[(i+1)%n],pts[(i+2)%n]
        c1=(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6); c2=(p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6)
        d+=f' C{f(c1)} {f(c2)} {f(p2)}'
    return d+'Z'
up=[(14,160),(48,132),(96,112),(146,92),(196,70),(244,50)]
lo=[(246,70),(206,98),(162,122),(116,146),(70,166),(30,180)]
sw=smooth(up+lo)
streaks=''.join(f'<path d="M{a},{b} L{c},{d}" stroke="{BLACK}" stroke-width="{w}" stroke-linecap="round" opacity=".85"/>' for a,b,c,d,w in [(30,166,92,138,1.6),(70,150,150,116,1.2),(118,134,214,86,1.4),(160,104,236,66,1.0),(52,170,108,148,1.0)])
drips=''.join(f'<rect x="{x0-w/2}" y="{y0}" width="{w}" height="{h}" rx="{w/2}"/><circle cx="{x0}" cy="{y0+h}" r="{w*0.8:.1f}"/>' for x0,y0,w,h in [(58,166,8,46),(100,150,6,28),(146,128,7,54),(184,106,5,22)])
spat=''.join(f'<circle cx="{a}" cy="{b}" r="{r}"/>' for a,b,r in [(36,124,4),(26,110,2.4),(214,112,4.5),(228,98,2.6),(176,58,3.2),(84,196,3),(200,140,2.2)])
war=f'<clipPath id="sh"><circle cx="128" cy="128" r="111"/></clipPath><g clip-path="url(#sh)" fill="{INK}"><path d="{sw}"/>{drips}{spat}</g><g clip-path="url(#sh)">{streaks}</g>'
open('D-war-paint.svg','w').write(svg(aspis+war+compass(olive=False),'Empathia: War Paint'))
# C — the Agora Owl, mascot: compass-drawn eyes, the lambda for brow and beak, an olive sprig in the beak
owl=f'<circle cx="128" cy="128" r="116" fill="{INK}"/><circle cx="128" cy="128" r="116" fill="none" stroke="{BLACK}" stroke-width="9"/>'
for ex in (88,168):
    owl+=f'<circle cx="{ex}" cy="120" r="34" fill="{IVORY}" stroke="{BLACK}" stroke-width="5"/>'
owl+=f'<circle cx="95" cy="123" r="14" fill="{BLACK}"/><circle cx="161" cy="123" r="14" fill="{BLACK}"/><circle cx="99" cy="118" r="4" fill="{IVORY}"/><circle cx="165" cy="118" r="4" fill="{IVORY}"/>'
owl+=f'<path d="M54,80 L128,106 L202,80" fill="none" stroke="{BLACK}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/><polygon points="128,100 141,142 128,164 115,142" fill="{BLACK}"/>'
owl+=f'<path d="M132,158 Q150,176 172,180" fill="none" stroke="{IVORY}" stroke-width="2.6" stroke-linecap="round"/>'+leaf(146,170,-60,col=IVORY)+leaf(154,174,40,col=IVORY)+leaf(164,178,-40,col=IVORY)+f'<circle cx="174" cy="182" r="3.2" fill="{IVORY}"/>'
open('C-agora-owl.svg','w').write(svg(owl,'Empathia: Agora Owl'))
print('ok')
