# Empathia flagship emblem concepts, built on the established mark: the V2.5.3 / film drawing compass (a lambda with three nodes)
import math
C=128
INK='#c1121f'; BLACK='#121011'; BRONZE='#b08442'; IVORY='#f2eadb'; GREEN='#45cfc1'  # GREEN = the V2.5.3 emblem teal-green
def pt(a,r,c=(C,C)): return (c[0]+r*math.cos(math.radians(a)), c[1]+r*math.sin(math.radians(a)))
def f(p): return f'{p[0]:.1f},{p[1]:.1f}'
R=94; A_PEN=126.4; A_NEEDLE=54.3
pen=pt(A_PEN,R); needle=pt(A_NEEDLE,R); HINGE=(128,74)
def leaf(x,y,ang,L=13,W=4.6,col=BRONZE):
    return f'<path d="M0,0 C{L*0.3:.1f},{-W:.1f} {L*0.75:.1f},{-W:.1f} {L:.1f},0 C{L*0.75:.1f},{W:.1f} {L*0.3:.1f},{W:.1f} 0,0Z" transform="translate({x:.1f} {y:.1f}) rotate({ang})" fill="{col}"/>'
def emblem(h=HINGE,tips=(pen,needle),col=GREEN,sw=13,nr=14,hole=BLACK,laurel=True):
    """The drawing compass: two legs from the hinge, a node at the hinge and at each point (the V2.5.3 mark, drawn large)."""
    g=f'<path d="M{f(tips[0])} L{f(h)} L{f(tips[1])}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'
    g+=''.join(f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{nr}" fill="{col}"/>' for p in (h,)+tuple(tips))
    if hole: g+=f'<circle cx="{h[0]}" cy="{h[1]}" r="{nr*0.36:.1f}" fill="{hole}"/>'
    if laurel:
        hx,hy=h
        g+=leaf(hx-16,hy-4,192,L=20,W=6)+leaf(hx-12,hy-16,220,L=18,W=5.6)+leaf(hx-6,hy-25,248,L=14,W=4.6)
        g+=leaf(hx+16,hy-4,-12,L=20,W=6)+leaf(hx+12,hy-16,-40,L=18,W=5.6)+leaf(hx+6,hy-25,-68,L=14,W=4.6)
    return g
def ring(r=R,sw=6.5,nodes=True,c=(C,C)):
    """The ring the compass draws, in red ink: the lifecycle, from the pen (Request) round to the needle (Improve)."""
    a=pt(A_PEN,r,c); b=pt(A_NEEDLE,r,c)
    g=f'<path d="M{f(a)} A{r},{r} 0 1 1 {f(b)}" fill="none" stroke="{INK}" stroke-width="{sw}" stroke-linecap="round"/>'
    if nodes:  # Request · Design · Commission · Operate · Support · Learn · Improve — the two points are the first and last
        for k in range(1,6):
            p=pt(A_PEN+48*k,r,c); g+=f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="6.5" fill="{INK}" stroke="{BLACK}" stroke-width="3"/>'
    return g
def drip(p,s=1.0):
    x,y=p; y+=12*s
    return f'<path d="M{x:.1f},{y-4*s:.1f} C{x-0.8*s:.1f},{y+6*s:.1f} {x-6*s:.1f},{y+9*s:.1f} {x-6*s:.1f},{y+15*s:.1f} A{6*s:.1f},{6*s:.1f} 0 0 0 {x+6*s:.1f},{y+15*s:.1f} C{x+6*s:.1f},{y+9*s:.1f} {x+0.8*s:.1f},{y+6*s:.1f} {x:.1f},{y-4*s:.1f}Z" fill="{INK}"/>'
def svg(body,title,vb='0 0 256 256'): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'
aspis=f'<circle cx="128" cy="128" r="116" fill="{BLACK}"/><circle cx="128" cy="128" r="116" fill="none" stroke="{BRONZE}" stroke-width="9"/>'
# 1 — the flagship: the emblem on the Spartan aspis, drawing the lifecycle in red ink
open('1-aspis-flagship.svg','w').write(svg(aspis+ring()+drip(pen)+emblem(),'Empathia: the compass on the aspis'))
# 1s — the same for 16–48 px: no laurel, no stage nodes, heavier
small=f'<circle cx="128" cy="128" r="118" fill="{BLACK}"/><circle cx="128" cy="128" r="113" fill="none" stroke="{BRONZE}" stroke-width="14"/>'+ring(sw=13,nodes=False)+emblem(h=(128,66),sw=20,nr=21,laurel=False,hole=None)
open('1s-aspis-small.svg','w').write(svg(small,'Empathia'))
# 2 — the tile: the established rounded-square mark, made flagship (app icon)
tile=f'<rect x="8" y="8" width="240" height="240" rx="64" fill="{BLACK}"/><rect x="8" y="8" width="240" height="240" rx="64" fill="none" stroke="{BRONZE}" stroke-width="6"/>'
tile+=ring(r=88,nodes=False,sw=7).replace(f'M{f(pen)}',f'M{f(pt(A_PEN,88))}')
t_pen=pt(A_PEN,88); t_needle=pt(A_NEEDLE,88)
tile=f'<rect x="8" y="8" width="240" height="240" rx="64" fill="{BLACK}"/><rect x="8" y="8" width="240" height="240" rx="64" fill="none" stroke="{BRONZE}" stroke-width="6"/>'+ring(r=88,sw=7,nodes=False)+drip(t_pen,0.9)+emblem(h=(128,76),tips=(t_pen,t_needle),laurel=False)
open('2-tile-app-icon.svg','w').write(svg(tile,'Empathia: app tile'))
# 3 — the heraldic crest: the compass inside a heater shield, a red redline beneath it
heater='M40,30 H216 V116 C216,178 178,214 128,240 C78,214 40,178 40,116 Z'
cr=f'<path d="{heater}" fill="{BLACK}"/><path d="{heater}" fill="none" stroke="{INK}" stroke-width="16" stroke-linejoin="round"/><path d="{heater}" fill="none" stroke="{BRONZE}" stroke-width="5" stroke-linejoin="round"/>'
cp=(78,180); cn=(178,180)
cr+=f'<path d="M64,206 Q128,188 192,206" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>'+emblem(h=(128,78),tips=(cp,cn))+drip((78,180),0.8)
open('3-heraldic-crest.svg','w').write(svg(cr,'Empathia: heraldic crest'))
# 4 — war paint: a dry-brush swipe of red across the aspis, the green compass over it
def smooth(pts):
    d=f'M{f(pts[0])}'; n=len(pts)
    for i in range(n):
        p0,p1,p2,p3=pts[i-1],pts[i],pts[(i+1)%n],pts[(i+2)%n]
        d+=f' C{f((p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6))} {f((p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6))} {f(p2)}'
    return d+'Z'
sw_=smooth([(14,160),(48,132),(96,112),(146,92),(196,70),(244,50),(246,70),(206,98),(162,122),(116,146),(70,166),(30,180)])
streaks=''.join(f'<path d="M{a},{b} L{c},{d}" stroke="{BLACK}" stroke-width="{w}" stroke-linecap="round" opacity=".85"/>' for a,b,c,d,w in [(30,166,92,138,1.6),(70,150,150,116,1.2),(118,134,214,86,1.4),(160,104,236,66,1.0),(52,170,108,148,1.0)])
drips=''.join(f'<rect x="{x0-w/2}" y="{y0}" width="{w}" height="{h}" rx="{w/2}"/><circle cx="{x0}" cy="{y0+h}" r="{w*0.8:.1f}"/>' for x0,y0,w,h in [(58,166,8,46),(100,150,6,28),(146,128,7,54),(184,106,5,22)])
spat=''.join(f'<circle cx="{a}" cy="{b}" r="{r}"/>' for a,b,r in [(36,124,4),(26,110,2.4),(214,112,4.5),(228,98,2.6),(176,58,3.2),(84,196,3),(200,140,2.2)])
war=f'<clipPath id="sh"><circle cx="128" cy="128" r="111"/></clipPath><g clip-path="url(#sh)" fill="{INK}"><path d="{sw_}"/>{drips}{spat}</g><g clip-path="url(#sh)">{streaks}</g>'
wp=pt(126.4,92); wn=pt(54.3,92)
open('4-war-paint.svg','w').write(svg(aspis+war+emblem(h=(128,62),tips=(wp,wn),laurel=False),'Empathia: war paint'))
# 5 — the Agora Owl, mascot for empty and not-found states: compass-drawn eyes in the emblem green, the lambda for brow and beak
owl=f'<circle cx="128" cy="128" r="116" fill="{INK}"/><circle cx="128" cy="128" r="116" fill="none" stroke="{BLACK}" stroke-width="9"/>'
for ex in (88,168): owl+=f'<circle cx="{ex}" cy="120" r="34" fill="{IVORY}" stroke="{BLACK}" stroke-width="5"/><circle cx="{ex}" cy="120" r="25" fill="none" stroke="{GREEN}" stroke-width="4"/>'
owl+=f'<circle cx="95" cy="123" r="13" fill="{BLACK}"/><circle cx="161" cy="123" r="13" fill="{BLACK}"/><circle cx="99" cy="118" r="3.6" fill="{IVORY}"/><circle cx="165" cy="118" r="3.6" fill="{IVORY}"/>'
owl+=f'<path d="M54,80 L128,106 L202,80" fill="none" stroke="{BLACK}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/><polygon points="128,100 141,142 128,164 115,142" fill="{BLACK}"/>'
owl+=f'<path d="M132,158 Q150,176 172,180" fill="none" stroke="{IVORY}" stroke-width="2.6" stroke-linecap="round"/>'+leaf(146,170,-60,col=IVORY)+leaf(154,174,40,col=IVORY)+leaf(164,178,-40,col=IVORY)+f'<circle cx="174" cy="182" r="3.2" fill="{IVORY}"/>'
open('5-agora-owl.svg','w').write(svg(owl,'Empathia: the Agora Owl'))
print('ok')
