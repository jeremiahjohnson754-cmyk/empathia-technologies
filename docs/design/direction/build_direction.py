#!/usr/bin/env python3
"""Builds docs/design/direction/direction.html — the Rebuild-direction frames (1440 + 390) imported into the
Figma file "Empathia Emblem" (page "Rebuild direction"). Every value comes from the demo's synthetic records on
phase3/legendary-experience (apps/demo/src/workspace/store.ts, campus/canon.ts, search/, access/v253.ts) or the
founder's 3 Nov screenshots; nothing is live. Run: python3 -I docs/design/direction/build_direction.py"""
import base64, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[3]
FONTS = ROOT / 'packages/design-tokens/fonts'
OUT = pathlib.Path(__file__).with_name('direction.html')

def face(file, fam, w):
    b = base64.b64encode((FONTS / file).read_bytes()).decode()
    return f"@font-face{{font-family:'{fam}';font-weight:{w};src:url(data:font/woff2;base64,{b}) format('woff2')}}"

P = [  # D37 order, dark values from packages/design-tokens/tokens.json
    ('mission-control', 'Mission Control', '#3ea6ff'), ('lite', 'Lite', '#ff8b3d'), ('pro', 'Pro', '#7b86ff'),
    ('search-party', 'Search Party', '#f05bc8'), ('servicehands', 'ServiceHands', '#46c95e'),
    ('commissioning', 'Commissioning & Assurance', '#f2c230'), ('apex', 'APEX', '#ff4f64'),
    ('field', 'Field Intelligence', '#a8dc3c'), ('learn', 'Learn', '#b48cff')]
PC = {k: c for k, _, c in P}
OK, WARN, BAD, INFO, ACC = '#62c684', '#e8a93c', '#f0655a', '#6aa5f2', '#45cfc1'

CSS = """
:root{--bg:#0a0e14;--bg2:#0f141c;--g1:rgba(22,28,37,.82);--g2:rgba(30,38,50,.88);--g3:rgba(16,21,29,.96);
--line:rgba(255,255,255,.07);--line2:rgba(255,255,255,.14);--tx:#f4f1ec;--tx2:#bdb7ac;--tx3:#a39d93;--acc:#45cfc1;--acc-ink:#04201d}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#05070a;font-family:'Inter',system-ui,sans-serif;color:var(--tx);padding:40px;display:flex;flex-direction:column;gap:80px;
 font-feature-settings:'cv11','ss01','tnum';-webkit-font-smoothing:antialiased}
.frame{position:relative;overflow:hidden;background:var(--bg);display:flex}
.d{width:1440px;height:1024px}.m{width:390px;height:844px;flex-direction:column}
.glow{position:absolute;border-radius:50%;filter:blur(90px);opacity:.22;pointer-events:none}
.rail{width:76px;background:var(--bg2);border-right:1px solid var(--line);display:flex;flex-direction:column;align-items:center;padding:18px 0;gap:6px;flex:none}
.rail .it{width:60px;padding:9px 0 7px;border-radius:12px;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;font-weight:500;color:var(--tx3)}
.rail .it.on{background:rgba(69,207,193,.12);color:var(--acc)}
.ico{width:20px;height:20px;display:block}
.main{flex:1;display:flex;flex-direction:column;min-width:0;position:relative}
.top{height:60px;display:flex;align-items:center;gap:14px;padding:0 28px;border-bottom:1px solid var(--line);flex:none}
.brand{display:flex;align-items:center;gap:9px;font-weight:700;font-size:16px;letter-spacing:-.01em}
.syn{font-size:11px;font-weight:600;color:#f3b54a;border:1px solid rgba(243,181,74,.35);border-radius:999px;padding:2px 8px}
.cmd{flex:1;max-width:560px;height:38px;border-radius:12px;background:var(--g1);border:1px solid var(--line2);display:flex;align-items:center;gap:10px;padding:0 12px;color:var(--tx3);font-size:14px}
.kbd{margin-left:auto;font-size:11px;font-weight:600;color:var(--tx2);border:1px solid var(--line2);border-radius:6px;padding:2px 6px}
.role{display:flex;align-items:center;gap:8px;height:36px;padding:0 12px 0 4px;border-radius:999px;background:var(--g1);border:1px solid var(--line2);font-size:13px;font-weight:600}
.av{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;color:#0a0e14}
.body{padding:28px;display:flex;flex-direction:column;gap:20px;flex:1;min-height:0}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--tx3)}
.h1{font-size:32px;line-height:38px;font-weight:700;letter-spacing:-.02em}
.h2{font-size:20px;line-height:26px;font-weight:600;letter-spacing:-.01em}
.h3{font-size:15px;line-height:20px;font-weight:600}
.lead{font-size:15px;line-height:22px;color:var(--tx2)}
.sm{font-size:13px;line-height:18px;color:var(--tx2)}.xs{font-size:12px;line-height:16px;color:var(--tx3)}
.card{background:var(--g1);border:1px solid var(--line);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:12px;box-shadow:0 1px 0 rgba(255,255,255,.04) inset}
.raised{background:var(--g2);box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 12px 32px -12px rgba(0,0,0,.6)}
.row{display:flex;gap:16px;align-items:center}.col{display:flex;flex-direction:column;gap:12px}
.grid{display:grid;gap:16px}
.chip{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid;white-space:nowrap}
.dot{width:7px;height:7px;border-radius:50%}
.tile{border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:6px;border:1px solid var(--line);background:var(--g1);position:relative;overflow:hidden}
.tile .bar{position:absolute;left:0;top:0;bottom:0;width:3px}
.stat{font-size:28px;line-height:32px;font-weight:700;letter-spacing:-.02em}
.btn{height:36px;padding:0 14px;border-radius:10px;display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;border:1px solid var(--line2);color:var(--tx);background:var(--g2);white-space:nowrap}
.btn.p{background:var(--acc);color:var(--acc-ink);border-color:var(--acc)}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line)}
.tab{padding:10px 14px;font-size:14px;font-weight:500;color:var(--tx3);border-bottom:2px solid transparent}
.tab.on{color:var(--tx);border-color:var(--acc)}
.steps{display:flex;align-items:flex-start}
.step{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;font-size:11px;font-weight:500;color:var(--tx3);text-align:center}
.step .n{width:22px;height:22px;border-radius:50%;border:2px solid var(--line2);background:var(--bg);display:grid;place-items:center;font-size:10px;font-weight:700;z-index:1}
.step.done .n{background:var(--acc);border-color:var(--acc);color:var(--acc-ink)}
.step.on .n{border-color:var(--acc);box-shadow:0 0 0 4px rgba(69,207,193,.18)}.step.on{color:var(--tx)}
.step .ln{position:absolute;top:10px;left:calc(50% + 11px);right:calc(-50% + 11px);height:2px;background:var(--line2)}
.step.done .ln{background:var(--acc)}
.tl{display:flex;flex-direction:column}
.tli{display:flex;gap:12px;padding-bottom:16px;position:relative}
.tli .m1{width:12px;height:12px;border-radius:50%;margin-top:4px;flex:none;border:2px solid}
.tli .ln{position:absolute;left:5px;top:18px;bottom:0;width:2px;background:var(--line2)}
.list{display:flex;flex-direction:column}
.li{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--line)}
.li:first-child{border-top:0}
.tabsb{height:84px;flex:none;border-top:1px solid var(--line);background:var(--g3);display:flex;justify-content:space-around;padding-top:10px}
.tabsb .it{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;font-weight:500;color:var(--tx3);width:64px}
.tabsb .it.on{color:var(--acc)}
.mtop{height:56px;flex:none;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid var(--line)}
.mbody{flex:1;overflow:hidden;padding:16px;display:flex;flex-direction:column;gap:14px}
.stage{background:radial-gradient(120% 90% at 50% 10%,#1a2433,#0b0f16);border:1px solid var(--line);border-radius:20px;position:relative;overflow:hidden}
.lbl{position:absolute;font-size:11px;font-weight:600;padding:3px 7px;border-radius:6px;background:rgba(10,14,20,.85);border:1px solid var(--line2)}
.kv{display:flex;flex-direction:column;gap:2px;padding:10px 0;border-top:1px solid var(--line)}
.kv b{font-size:14px;font-weight:600}
.m .cmd{flex:none}
.spin{font-variant-numeric:tabular-nums}
"""

ICONS = {
 'home': '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
 'campus': '<path d="M3 21V9l6-3v15M9 21V4l6 3v14M15 21v-9l6 2v7M2 21h20"/>',
 'search': '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 'room': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 15h18M8 19v-4"/>',
 'work': '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.6-.4-.4-2.6z"/>',
 'learn': '<path d="M2 9 12 4l10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5"/>',
 'more': '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
 'shield': '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="M8 12.5 11 15l5-6"/>',
 'bell': '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
 'chev': '<path d="m9 6 6 6-6 6"/>',
}
def ico(n, c='currentColor', s=20):
    return f'<svg class="ico" width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{ICONS[n]}</svg>'

def emblem(s=26):  # the small shield (D39): teal ring + compass tips, simplified for UI headers
    return (f'<svg width="{s}" height="{s}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="#121011" stroke="#45cfc1" stroke-width="2.4"/>'
            '<path d="M16 6 10.5 24M16 6l5.5 18" stroke="#b08442" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="8" r="2.2" fill="#c1121f"/></svg>')

def chip(t, c, dot=True):
    d = f'<span class="dot" style="background:{c}"></span>' if dot else ''
    return f'<span class="chip" style="color:{c};border-color:{c}55;background:{c}14">{d}{t}</span>'

def ring(pct, val, sub, c, s=120, w=10):
    r = (s - w) / 2; L = 2 * 3.14159 * r; off = L * (1 - pct)
    return (f'<div style="position:relative;width:{s}px;height:{s}px;flex:none"><svg width="{s}" height="{s}" viewBox="0 0 {s} {s}">'
            f'<circle cx="{s/2}" cy="{s/2}" r="{r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="{w}"/>'
            f'<circle cx="{s/2}" cy="{s/2}" r="{r}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-dasharray="{L:.1f}" stroke-dashoffset="{off:.1f}" transform="rotate(-90 {s/2} {s/2})"/></svg>'
            f'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">'
            f'<div style="font-size:{int(s*.2)}px;font-weight:700;letter-spacing:-.02em">{val}</div><div class="xs" style="text-align:center;max-width:{s-28}px">{sub}</div></div></div>')

def spark(vals, c, w=120, h=34):
    mx = max(vals) or 1; n = len(vals) - 1
    pts = ' '.join(f'{i*w/n:.1f},{h-3-(v/mx)*(h-8):.1f}' for i, v in enumerate(vals))
    area = f'0,{h} {pts} {w},{h}'
    return (f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}"><polygon points="{area}" fill="{c}" opacity=".14"/>'
            f'<polyline points="{pts}" fill="none" stroke="{c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>')

def stat(label, val, sub, c, sp=None, icon=None):
    s = spark(sp, c) if sp else ''
    return (f'<div class="tile"><span class="bar" style="background:{c}"></span><div class="row" style="gap:8px;justify-content:space-between">'
            f'<span class="xs" style="font-weight:600;color:var(--tx2)">{label}</span>{ico(icon, c, 16) if icon else ""}</div>'
            f'<div class="row" style="justify-content:space-between;align-items:flex-end"><span class="stat">{val}</span>{s}</div><span class="xs">{sub}</span></div>')

def rail(on):
    items = [('home', 'Home'), ('campus', 'Campus'), ('search', 'Search'), ('room', 'Room'), ('work', 'Work'), ('learn', 'Learn'), ('more', 'More')]
    h = ''.join(f'<div class="it{" on" if k == on else ""}">{ico(k)}{t}</div>' for k, t in items)
    return f'<nav class="rail"><div style="margin-bottom:14px">{emblem(30)}</div>{h}</nav>'

def tabsb(on):
    items = [('home', 'Home'), ('campus', 'Campus'), ('search', 'Search'), ('work', 'Work'), ('more', 'More')]
    return '<nav class="tabsb">' + ''.join(f'<div class="it{" on" if k == on else ""}">{ico(k, s=22)}{t}</div>' for k, t in items) + '</nav>'

ROLE_C = {'ops': '#e57ee6', 'svcmgr': '#5ccf8a', 'service': '#f08a4b', 'exec': '#93a9ff', 'visitor': '#e2b44a',
          'syseng': '#4fc3f7', 'designer': '#ec716b', 'installer': '#b5d84a', 'cxeng': '#c18cff', 'ipm': '#ff86b0',
          'bpm': '#c9c24a', 'steward': '#9d97ff', 'employee': '#6ea8ff', 'architect': '#d8cfb9'}

def top(role='AV Operations Lead', rk='ops', ini='OL'):
    return (f'<header class="top"><div class="brand">Empathia</div>{chip("Synthetic data", "#f3b54a", False)}'
            f'<div style="flex:1;display:flex;justify-content:center"><div class="cmd" style="width:520px">{ico("search", "#a39d93", 18)}Search Party — rooms, devices, jobs, people<span class="kbd">⌘K</span></div></div>'
            f'{ico("bell", "#bdb7ac")}<div class="role"><span class="av" style="background:{ROLE_C[rk]}">{ini}</span>{role}{ico("chev", "#a39d93", 14)}</div></header>')

def mtop(title, rk='ops', ini='OL'):
    return (f'<header class="mtop">{emblem(26)}<div class="h3" style="flex:1">{title}</div>{ico("search", "#bdb7ac", 22)}'
            f'<span class="av" style="background:{ROLE_C[rk]}">{ini}</span></header>')

def glow(x, y, s, c):
    return f'<div class="glow" style="left:{x}px;top:{y}px;width:{s}px;height:{s}px;background:{c}"></div>'

def frame(name, kind, inner):
    return f'<section class="frame {kind}" data-name="{name}">{inner}</section>'

# ---------- records (synthetic, from apps/demo/src/workspace/store.ts) ----------
INC = [('ISS-0417', 'Far-end audio drops out during long calls', 'Atlas 4.218 Boardroom', 'High', 'OPEN', 'recurrence of ISS-0380 · WO-0088'),
       ('ISS-0421', 'Camera shows no video in meetings', 'Atlas 4.220 Huddle', 'Standard', 'TRIAGED', 'triaged by Service Manager'),
       ('ISS-0402', 'Calls dropped in several rooms on the annex switch', 'Northstar Town Hall', 'High', 'RESOLVED', 'verified by Commissioning Engineer'),
       ('ISS-0398', 'Projector blank at the start of class', 'Atlas 4.231 Training', 'Standard', 'CLOSED', 'WO-0081 · requester confirmed'),
       ('ISS-0380', 'Echo reported on a board call', 'Atlas 4.218 Boardroom', 'Standard', 'CLOSED', 'closed after a DSP re-tune')]
def steps(names, cur, near=1):
    out = ''
    for i, n in enumerate(names):
        cls = 'done' if i < cur else 'on' if i == cur else ''
        lab = n if abs(i - cur) <= near or i == len(names) - 1 else ''
        ln = '<i class="ln"></i>' if i < len(names) - 1 else ''
        out += f'<div class="step {cls}" title="{n}">{ln}<span class="n">{"✓" if i < cur else i + 1}</span>{lab}</div>'
    return out
STC = {'OPEN': BAD, 'TRIAGED': WARN, 'RESOLVED': INFO, 'CLOSED': OK}
WEEKLY = [1, 0, 0, 1, 0, 1, 2]  # incidents opened per week, 7 weeks, from openedAt (45, 21, 12, 3, 1 days ago)
STAGES = ['Request', 'Intake', 'Triage', 'Matching', 'Assignment', 'Dispatch', 'Execution', 'Evidence', 'Validation', 'Resolution', 'Closure', 'Learning']
BUILDINGS = [('Atlas HQ', 'Headquarters and executive workplace', 7, 'ATL'), ('Meridian R&D', 'Research, engineering labs and design review', 2, 'MER'),
             ('Forge Manufacturing', 'Production floor and shift handover', 2, 'FRG'), ('Beacon Learning Center', 'Training and onboarding', 3, 'BCN'),
             ('Horizon Media Center', 'Townhalls, broadcast and production', 2, 'HZN')]
ROLES = [('AV Operations Lead', 'ops', 'OL'), ('Service Manager', 'svcmgr', 'SM'), ('Service Engineer', 'service', 'SE'), ('Systems Engineer', 'syseng', 'SY'),
         ('Designer', 'designer', 'DE'), ('Installation Engineer', 'installer', 'IE'), ('Commissioning Engineer', 'cxeng', 'CX'), ('Integration PM', 'ipm', 'IP'),
         ('Internal PM', 'bpm', 'PM'), ('Data Steward', 'steward', 'DS'), ('Executive', 'exec', 'EX'), ('Employee', 'employee', 'EM'), ('Visitor', 'visitor', 'VI'),
         ('Product Architect', 'architect', 'PA')]

def inc_row(i, compact=False):
    iid, t, room, sev, st, note = i
    return (f'<div class="li"><span class="dot" style="background:{STC[st]};width:9px;height:9px"></span><div class="col" style="gap:2px;flex:1;min-width:0">'
            f'<span class="h3" style="font-size:14px">{t}</span><span class="xs">{iid} · {room}{"" if compact else " · " + note}</span></div>'
            f'{chip(st, STC[st])}</div>')

def products_row(cols=9, h=86):
    out = ''
    for k, n, c in P:
        out += (f'<div class="tile" style="height:{h}px;background:linear-gradient(160deg,{c}30,{c}08 70%);border-color:{c}40">'
                f'<span class="dot" style="background:{c};width:10px;height:10px"></span><span class="h3" style="font-size:14px">{n}</span></div>')
    return f'<div class="grid" style="grid-template-columns:repeat({cols},1fr);gap:10px">{out}</div>'

# ---------- 1. Mission Control ----------
def mission_d():
    stats = (stat('Northstar Innovation Campus', '30 rooms', '5 buildings + Northstar Annex · synthetic estate', PC['lite'], icon='campus') +
             stat('Open service jobs', '2', 'ISS-0417 open · ISS-0421 triaged', PC['servicehands'], WEEKLY, 'work') +
             stat('Verified repairs', '3 of 3', 'resolved or closed jobs verified by someone who did not do the work', OK, icon='shield') +
             stat('Reference room baseline', '75 / 75', 'BL-4-218-v1 · applicable tests verified', PC['commissioning'], icon='room'))
    spine = steps(STAGES, 1)
    body = f'''
    <div class="row" style="justify-content:space-between;align-items:flex-end"><div class="col" style="gap:6px"><span class="eyebrow">Mission Control · one connected lifecycle</span>
      <span class="h1">Good morning — two jobs need you today</span><span class="lead">AV Operations Lead · Northstar Innovation Campus · every number computed from the demo's records</span></div>
      <div class="row" style="gap:8px"><span class="btn">Replay a story</span><span class="btn p">Open ISS-0417</span></div></div>
    <div class="card raised" style="flex-direction:row;align-items:center;gap:14px;padding:14px 18px;border-color:{PC['search-party']}55;background:linear-gradient(90deg,{PC['search-party']}18,rgba(30,38,50,.9) 40%)">
      {ico('search', PC['search-party'], 22)}<span style="font-size:18px;font-weight:600">Search Party</span><span class="sm" style="flex:1">Try “4.218”, “ISS-0417”, “switch” or a device category</span><span class="kbd">⌘K</span></div>
    {products_row()}
    <div class="grid" style="grid-template-columns:repeat(4,1fr)">{stats}</div>
    <div class="grid" style="grid-template-columns:1.35fr 1fr;flex:1;min-height:0">
      <div class="card"><div class="row" style="justify-content:space-between"><span class="h2">Service jobs</span><span class="sm" style="color:var(--acc)">All service jobs →</span></div>
        <div class="list">{''.join(inc_row(i) for i in INC)}</div></div>
      <div class="col" style="gap:16px">
        <div class="card"><span class="h2">ISS-0417 · where the job stands</span><div class="steps">{spine}</div>
          <span class="xs">Every job moves through twelve stages, one governed step at a time; the person who did the work never verifies it.</span></div>
        <div class="card" style="flex-direction:row;gap:18px;align-items:center">{ring(1.0, '18/18', 'seats covered · MODELED', PC['commissioning'], 112)}{ring(118.3/480, '25%', 'PoE 118.3 of 480 W', PC['mission-control'], 112)}
          <div class="col" style="gap:4px"><span class="h3">Atlas 4.218 · Executive Boardroom</span><span class="xs">The reference room. Coverage is modeled from the published FOV; PoE asked of SW-ATL-4A.</span></div></div>
      </div></div>'''
    return frame('Mission Control — 1440', 'd', glow(500, -260, 620, PC['mission-control']) + rail('home') + f'<div class="main">{top()}<div class="body">{body}</div></div>')

def mission_m():
    b = f'''<div class="col" style="gap:4px"><span class="eyebrow">Mission Control</span><span style="font-size:24px;line-height:30px;font-weight:700;letter-spacing:-.02em">Two jobs need you today</span></div>
    <div class="cmd" style="max-width:none;height:44px;border-color:{PC['search-party']}66">{ico('search', PC['search-party'], 18)}Search Party<span class="kbd">⌘K</span></div>
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">{stat('Open jobs', '2', '1 open · 1 triaged', PC['servicehands'], WEEKLY)}{stat('Campus', '30', 'rooms · 5 buildings', PC['lite'])}</div>
    <div class="card" style="padding:14px"><span class="h3">Service jobs</span><div class="list">{''.join(inc_row(i, True) for i in INC[:3])}</div></div>
    <div class="row" style="gap:8px;overflow:hidden">{''.join(chip(n, c) for _, n, c in P[:4])}</div>'''
    return frame('Mission Control — 390', 'm', glow(80, -160, 360, PC['mission-control']) + mtop('Empathia') + f'<div class="mbody">{b}</div>' + tabsb('home'))

# ---------- 2. Room page ----------
def stage_svg(w, h):
    return (f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" style="position:absolute;inset:0">'
            f'<polygon points="{w*.12},{h*.78} {w*.62},{h*.95} {w*.92},{h*.55} {w*.45},{h*.42}" fill="#16202c" stroke="#2a3a4e"/>'
            f'<polygon points="{w*.45},{h*.42} {w*.92},{h*.55} {w*.92},{h*.15} {w*.45},{h*.05}" fill="#121a25" stroke="#2a3a4e"/>'
            f'<polygon points="{w*.3},{h*.7} {w*.58},{h*.8} {w*.74},{h*.6} {w*.47},{h*.52}" fill="#7a5a3a" opacity=".85"/>'
            f'<polygon points="{w*.47},{h*.52} {w*.2},{h*.95} {w*.75},{h*.98}" fill="{ACC}" opacity=".08"/>'
            f'<rect x="{w*.56}" y="{h*.16}" width="{w*.12}" height="{h*.13}" fill="#1d3b52" stroke="#3fd8ff"/><rect x="{w*.72}" y="{h*.2}" width="{w*.12}" height="{h*.13}" fill="#1d3b52" stroke="#3fd8ff"/></svg>')

def room_d():
    W, H = 860, 520
    labels = [('Display 1', .57, .09, '#3fd8ff'), ('Display 2', .74, .13, '#3fd8ff'), ('Cam 1', .66, .33, '#7aa7ff'), ('Cam 2', .28, .86, '#7aa7ff'), ('Mic array', .44, .5, '#3ddc97')]
    lb = ''.join(f'<span class="lbl" style="left:{x*W:.0f}px;top:{y*H:.0f}px;color:{c}">{t}</span>' for t, x, y, c in labels)
    tiles = (stat('Baseline', '75 / 75', 'BL-4-218-v1 · applicable tests verified', OK) + stat('Positions', '11', 'every position bound · 8 models', PC['pro']) +
             stat('Open issues', '1', 'ISS-0417 · recurrence of ISS-0380', BAD) + stat('Lifecycle', 'Held', 'recommissioning · baseline v1 in force; v2 pending', PC['commissioning']))
    spine = steps(['Intake', 'Design', 'Install', 'Commission', 'Accept', 'Service'], 4, 9)
    body = f'''
    <div class="col" style="gap:8px"><span class="xs">North Campus › Atlas HQ › Floor 4</span>
      <div class="row" style="justify-content:space-between"><span class="h1">Atlas 4.218 — Executive Boardroom</span><div class="row" style="gap:8px"><span class="btn">Replay the room's history</span><span class="btn">Open scan replay</span><span class="btn p">Report an issue</span></div></div>
      <div class="row" style="gap:8px">{chip('EXE · 14 seats · 6.6 × 9.8 × 3 m', PC['lite'], False)}{chip('COMMISSIONING · recommissioning held', PC['commissioning'])}{chip('Simulated adapters · no live telemetry', '#f3b54a')}{chip('Real models named only from their published pages', '#aab4c1', False)}</div></div>
    <div class="tabs"><span class="tab on">Room, layers and devices</span><span class="tab">Commissioning plan</span><span class="tab">Service history</span><span class="tab">Where the room has moved</span></div>
    <div class="row" style="align-items:stretch;gap:20px;flex:1;min-height:0">
      <div class="col" style="flex:1;gap:16px"><div class="stage" style="height:{H}px;width:{W}px">{stage_svg(W, H)}{lb}
        <div class="row" style="position:absolute;left:14px;top:14px;gap:6px">{chip('3D view', ACC, False)}{chip('Plan', '#a39d93', False)}{chip('Coverage', '#a39d93', False)}</div></div>
        <div class="grid" style="grid-template-columns:repeat(4,1fr)">{tiles}</div></div>
      <div class="card" style="width:320px;flex:none;gap:0"><span class="eyebrow" style="color:var(--acc)">The room</span><span class="h2" style="margin:4px 0 8px">11 positions, 8 models</span>
        <div class="kv"><span class="xs">Baseline</span><b>BL-4-218-v1 · 75 of 75 applicable tests verified</b></div>
        <div class="kv"><span class="xs">Camera coverage</span><b>18 of 18 seats · MODELED from the published FOV</b></div>
        <div class="kv"><span class="xs">PoE asked of SW-ATL-4A</span><b>118.3 W of 480 W published budget</b></div>
        <div class="kv"><span class="xs">Drift</span><b>Device presence, configuration · 3 of 17 dimensions assessable</b></div>
        <div class="kv" style="gap:10px"><span class="xs">Delivery spine</span><div class="steps">{spine}</div></div></div></div>'''
    return frame('Room · Atlas 4.218 — 1440', 'd', rail('room') + f'<div class="main">{top()}<div class="body">{body}</div></div>')

def room_m():
    W, H = 358, 230
    b = f'''<div class="col" style="gap:6px"><span class="xs">Atlas HQ › Floor 4</span><span style="font-size:22px;line-height:28px;font-weight:700;letter-spacing:-.02em">Atlas 4.218 — Executive Boardroom</span>
      <div class="row" style="gap:6px;flex-wrap:wrap">{chip('Recommissioning held', PC['commissioning'])}{chip('No live telemetry', '#f3b54a')}</div></div>
    <div class="stage" style="height:{H}px;width:{W}px">{stage_svg(W, H)}<span class="lbl" style="left:190px;top:22px;color:#3fd8ff">Display 1</span><span class="lbl" style="left:150px;top:112px;color:#3ddc97">Mic array</span></div>
    <div class="tabs" style="overflow:hidden"><span class="tab on">Devices</span><span class="tab">Plan</span><span class="tab">History</span></div>
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">{stat('Baseline', '75/75', 'BL-4-218-v1', OK)}{stat('Coverage', '18/18', 'seats · modeled', PC['commissioning'])}</div>
    <div class="card" style="padding:14px">{inc_row(INC[0], True)}</div>'''
    return frame('Room · Atlas 4.218 — 390', 'm', mtop('Room') + f'<div class="mbody">{b}</div>' + tabsb('campus'))

# ---------- 3. ServiceHands work order ----------
TECH = [('Ana Reyes (synthetic)', 'Internal · Atlas HQ', 'SK-SVC-1 Advanced (14) · SK-AUD-2 Working (3)', '2 earlier jobs in this room · 22 h capacity', 'Eligible', OK),
        ('Cara Lind — Brightwater AV (synthetic)', 'Agreement SA-BW-02 · Active · audio, video, av', 'SK-AUD-2 Advanced (9) · SK-SVC-1 Advanced (20)', '12 h capacity', 'Eligible', OK),
        ('Dev Shah (synthetic)', 'Internal · Atlas HQ', 'cert.av_field expired 2026-10-01 · on leave', 'not offered', 'Not eligible', BAD),
        ('Ben Okafor (synthetic)', 'Internal · Northstar Annex', 'not on an Atlas site', 'not offered', 'Not eligible', BAD)]

def wo_d():
    spine = steps(STAGES, 1, 2)
    tl = [('Opened by the requestor', '3 days ago · ISS-0417 · High', BAD), ('Work order staged', 'WO-0088 · dsp_upgrade · parts: processor × 1', PC['servicehands']),
          ('Linked as a recurrence', 'ISS-0380 · echo on a board call · closed 43 days ago after a DSP re-tune', WARN), ('Next: triage and matching', 'Service Manager · needs an eligible technician', '#a39d93')]
    tlh = ''.join(f'<div class="tli">{'<i class="ln"></i>' if (t, s, c) != tl[-1] else ''}<span class="m1" style="border-color:{c};background:{c}33"></span><div class="col" style="gap:2px"><span class="h3" style="font-size:14px">{t}</span><span class="xs">{s}</span></div></div>' for t, s, c in tl)
    techs = ''.join(f'<div class="li"><span class="av" style="background:{"#46c95e" if st == "Eligible" else "#4a5568"};width:34px;height:34px">{n[0]}{n.split()[1][0]}</span>'
                    f'<div class="col" style="gap:2px;flex:1"><span class="h3" style="font-size:14px">{n}</span><span class="xs">{o} · {sk} · {cap}</span></div>{chip(st, c)}</div>' for n, o, sk, cap, st, c in TECH)
    checks = ''.join(f'<div class="li"><span style="width:18px;height:18px;border-radius:5px;border:2px solid var(--line2);flex:none"></span><span class="sm">{t}</span></div>'
                     for t in ['Safety brief acknowledged', 'Site access confirmed by facilities or the site champion', 'Working-at-height permit', 'Tools confirmed · service kit'])
    body = f'''
    <div class="col" style="gap:8px"><span class="xs">ServiceHands › Dispatch board › WO-0088</span>
      <div class="row" style="justify-content:space-between"><span class="h1">Restore far-end audio · Atlas 4.218</span><div class="row" style="gap:8px"><span class="btn">Cancel the work order…</span><span class="btn p">Assign technician</span></div></div>
      <div class="row" style="gap:8px">{chip('OPEN', BAD)}{chip('High', BAD, False)}{chip('ISS-0417', PC['servicehands'], False)}{chip('Recurrence of ISS-0380', WARN)}{chip('Atlas 4.218 Boardroom', PC['lite'], False)}</div></div>
    <div class="card"><div class="steps">{spine}</div></div>
    <div class="grid" style="grid-template-columns:1fr 1.35fr 1fr;flex:1;min-height:0">
      <div class="card"><span class="h2">Timeline</span><div class="tl">{tlh}</div>
        <span class="xs">Remote participants hear echo and then lose the room for a few seconds, mostly in calls over 40 minutes with more than six microphones open.</span></div>
      <div class="card"><div class="row" style="justify-content:space-between"><span class="h2">Matching</span><span class="xs">skills · certificates · site · leave · capacity</span></div><div class="list">{techs}</div>
        <span class="xs">Competency records are internal — not a credential, and never an authorization to work.</span></div>
      <div class="card"><span class="h2">Before you start</span><div class="list">{checks}</div>{ring(0, '0 / 4', 'preflight checks', PC['servicehands'], 104)}</div></div>'''
    return frame('ServiceHands · WO-0088 — 1440', 'd', glow(900, -300, 600, PC['servicehands']) + rail('work') + f'<div class="main">{top("Service Manager", "svcmgr", "SM")}<div class="body">{body}</div></div>')

def wo_m():
    tl = TLM = [('Opened', '3 days ago · High', BAD), ('WO-0088 staged', 'processor × 1', PC['servicehands']), ('Recurrence of ISS-0380', 'DSP re-tune, 43 days ago', WARN)]
    tl = ''.join(f'<div class="tli">{'<i class="ln"></i>' if (t, s, c) != tl[-1] else ''}<span class="m1" style="border-color:{c};background:{c}33"></span><div class="col" style="gap:2px"><span class="h3" style="font-size:14px">{t}</span><span class="xs">{s}</span></div></div>'
                 for t, s, c in TLM)
    b = f'''<div class="col" style="gap:6px"><span class="xs">WO-0088 · ISS-0417</span><span style="font-size:22px;line-height:28px;font-weight:700;letter-spacing:-.02em">Restore far-end audio · Atlas 4.218</span>
      <div class="row" style="gap:6px">{chip('OPEN', BAD)}{chip('Stage 2 of 12 · Intake', ACC, False)}</div></div>
    <div style="height:6px;border-radius:3px;background:var(--line2)"><div style="width:16.7%;height:6px;border-radius:3px;background:var(--acc)"></div></div>
    <div class="card" style="padding:14px"><span class="h3">Timeline</span><div class="tl">{tl}</div></div>
    <div class="card" style="padding:14px"><span class="h3">Before you start</span><span class="sm">0 of 4 · safety brief · site access · working-at-height permit · tools</span></div>
    <span class="btn p" style="height:48px;justify-content:center">Accept the job</span>'''
    return frame('ServiceHands · WO-0088 — 390', 'm', mtop('ServiceHands', 'service', 'SE') + f'<div class="mbody">{b}</div>' + tabsb('work'))

# ---------- 4. Search Party ----------
DEV = [('AS-0106 · Logitech Rally Camera', 'identity VERIFIED · synthetic unit, removed from A-0106'), ('AS-0107 · Logitech Rally Camera', 'identity VERIFIED · synthetic unit at A-0107'),
       ('AS-0112 · Logitech Rally Camera', 'identity VERIFIED · synthetic unit at A-0106'), ('AS-1302 · Logitech Rally Camera', 'identity VERIFIED · synthetic unit at A-1302')]
POS = [('Camera (1.141)', 'camera · Meridian 1.141'), ('Camera (11.348)', 'camera · Atlas 11.348'), ('Camera (2.138)', 'camera · Meridian 2.138'), ('Camera (3.133)', 'camera · Meridian 3.133')]
def group(title, more, rows, tag, c):
    r = ''.join(f'<div class="li" style="padding:9px 0"><span class="dot" style="background:{c};width:8px;height:8px;border-radius:2px"></span><div class="col" style="gap:1px;flex:1"><span style="font-size:14px;font-weight:500">{a}</span><span class="xs">{b}</span></div>{chip(tag, "#a39d93", False)}</div>' for a, b in rows)
    return f'<div class="col" style="gap:2px"><span class="eyebrow" style="font-size:11px">{title}{" · " + more if more else ""}</span><div class="list">{r}</div></div>'

def search_d():
    palette = f'''<div class="card" style="position:absolute;left:330px;top:92px;width:640px;background:var(--g3);border-color:var(--line2);box-shadow:0 30px 80px -20px rgba(0,0,0,.8);gap:14px;z-index:3">
      <div class="row" style="gap:10px;border-bottom:1px solid var(--line);padding-bottom:12px">{ico('search', PC['search-party'], 20)}<span style="font-size:17px;font-weight:500">camera</span><span class="kbd">esc</span></div>
      {group('Devices & physical units', '32 more in Search Party', DEV, 'Asset', PC['pro'])}
      {group('Logical positions & installations', '31 more in Search Party', POS[:3], 'Planned device', PC['lite'])}
      {group('Incidents & work orders', '', [('ISS-0421 · Camera shows no video in meetings', 'Atlas 4.220 Huddle · TRIAGED')], 'Incident', PC['servicehands'])}
      <div class="row xs" style="gap:14px;border-top:1px solid var(--line);padding-top:10px"><span>↑↓ move</span><span>↵ open</span><span>⇥ next group</span><span style="margin-left:auto;color:var(--acc)">Open all in Search Party →</span></div></div>'''
    ways = ''.join(f'<div class="tile" style="height:96px"><span class="h3">{t}</span><span class="xs">{s}</span></div>' for t, s in
                   [('A room', 'Atlas 4.218, a floor, a building'), ('A device', 'AS-0112, a model, a category'), ('A job', 'ISS-0417, WO-0088'), ('A person', 'a role, a technician, a skill'), ('A question', 'How was the camera at Atlas 4.218 repaired?')])
    body = f'''<div class="col" style="gap:6px;opacity:.55"><span class="eyebrow" style="color:{PC['search-party']}">Search Party</span><span class="h1">Start anywhere. Follow the relationships.</span>
      <span class="lead">Declared is not verified; modeled is not measured — and the product says so itself.</span></div>
      <div class="grid" style="grid-template-columns:repeat(5,1fr);opacity:.55">{ways}</div>
      <div class="card" style="opacity:.55"><span class="h2">Recorded story</span><span class="sm">How was the camera at Atlas 4.218 repaired, verified and turned into learning? · starts at AS-0112</span></div>'''
    return frame('Search Party · ⌘K — 1440', 'd', glow(420, -200, 600, PC['search-party']) + rail('search') + f'<div class="main">{top()}<div class="body">{body}</div>{palette}<div style="position:absolute;inset:60px 0 0 0;background:rgba(5,7,10,.45);z-index:2"></div></div>')

def search_m():
    b = f'''<div class="cmd" style="max-width:none;height:46px;border-color:{PC['search-party']}88;color:var(--tx)">{ico('search', PC['search-party'], 18)}camera<span class="kbd">Cancel</span></div>
      {group('Devices & physical units', '32 more', DEV[:3], 'Asset', PC['pro'])}{group('Logical positions', '31 more', POS[:2], 'Planned', PC['lite'])}
      {group('Incidents & work orders', '', [('ISS-0421 · Camera shows no video', 'Atlas 4.220 · TRIAGED')], 'Incident', PC['servicehands'])}'''
    return frame('Search Party · Quick find — 390', 'm', mtop('Search Party') + f'<div class="mbody" style="gap:16px">{b}</div>' + tabsb('search'))

# ---------- 5. Lite Living Campus ----------
def iso(x, y, w, d, h, c, name, sub):
    # extruded isometric tile: top, left and right faces
    def pt(px, py): return f'{x + (px - py) * .87:.1f},{y + (px + py) * .5:.1f}'
    top = f'{pt(0,0)} {pt(w,0)} {pt(w,d)} {pt(0,d)}'
    L = f'{pt(0,d)} {pt(w,d)}'; ax, ay = map(float, pt(w, d).split(',')); bx, by = map(float, pt(0, d).split(',')); cx, cy = map(float, pt(w, 0).split(','))
    left = f'{bx},{by} {ax},{ay} {ax},{ay+h} {bx},{by+h}'; right = f'{ax},{ay} {cx},{cy} {cx},{cy+h} {ax},{ay+h}'
    tx, ty = map(float, pt(w/2, d/2).split(','))
    return (f'<polygon points="{left}" fill="{c}" opacity=".35"/><polygon points="{right}" fill="{c}" opacity=".22"/>'
            f'<polygon points="{top}" fill="{c}" opacity=".75" stroke="#fff" stroke-opacity=".25"/>'
            f'<text x="{tx}" y="{ty-4}" text-anchor="middle" font-family="Inter" font-size="13" font-weight="700" fill="#0a0e14">{name}</text>'
            f'<text x="{tx}" y="{ty+12}" text-anchor="middle" font-family="Inter" font-size="11" font-weight="600" fill="#0a0e14">{sub}</text>')

def campus_svg(W, H, s=1.0):
    spec = [('Atlas', '7 floors', 2.6, 2.6, 2.1, 1.7, 7), ('Meridian', '2 floors', .2, 4.1, 2.3, 2, 2), ('Forge', '2 floors', 3.5, 5.5, 3, 2.2, 2),
            ('Beacon', '3 floors', 4.6, 0, 1.9, 1.8, 3), ('Horizon', '2 floors', 6.9, 2.7, 2.4, 2, 2), ('Northstar', 'Annex', .4, .6, 1.9, 1.6, 3)]
    cols = [PC['lite'], PC['pro'], PC['field'], PC['learn'], PC['search-party'], '#8aa0c8']
    k = 52 * s; ox, oy = W * .46, 40 * s
    g = ''.join(iso(ox + 0, oy, 0, 0, 0, '#000', '', '') if False else '' for _ in [0])
    order = sorted(range(6), key=lambda i: spec[i][2] + spec[i][3])
    for i in order:
        n, sub, x, y, w, d, f = spec[i]
        sx = ox + (x - y) * .87 * k; sy = oy + (x + y) * .5 * k
        g += iso(sx, sy, w * k, d * k, f * 7 * s, cols[i], n, sub)
    return f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}">{g}</svg>'

def campus_d():
    bl = ''.join(f'<div class="li"><span class="dot" style="background:{c};width:10px;height:10px"></span><div class="col" style="gap:1px;flex:1"><span class="h3" style="font-size:14px">{n}</span><span class="xs">{p} · {f} floors</span></div>{ico("chev", "#a39d93", 16)}</div>'
                 for (n, p, f, _), c in zip(BUILDINGS, [PC['lite'], PC['pro'], PC['field'], PC['learn'], PC['search-party']]))
    body = f'''<div class="row" style="justify-content:space-between;align-items:flex-end"><div class="col" style="gap:6px"><span class="eyebrow" style="color:{PC['lite']}">Lite · Living Campus</span>
      <span class="h1">Northstar Innovation Campus</span><span class="lead">Northstar Industries (synthetic) · 30 rooms modeled · every room opens in the same room view</span></div>
      <div class="row" style="gap:4px;background:var(--g1);border:1px solid var(--line);border-radius:12px;padding:4px">{''.join(f'<span class="btn" style="height:30px;{"background:var(--acc);color:var(--acc-ink);border-color:var(--acc)" if t == "Current" else "background:transparent;border-color:transparent"}">{t}</span>' for t in ['Designed', 'Commissioned', 'Current', 'Proposed'])}</div></div>
    <div class="row" style="align-items:stretch;gap:20px;flex:1;min-height:0">
      <div class="stage" style="flex:1">{campus_svg(900, 700, 1.4)}<div class="row" style="position:absolute;left:16px;bottom:16px;gap:6px">{chip('Spatial stage · dark in both themes (D36)', '#a39d93', False)}{chip('Coverage: complete · modelled · gap', ACC, False)}</div></div>
      <div class="col" style="width:340px;flex:none;gap:16px">
        <div class="card" style="border-color:{PC['lite']}55;background:linear-gradient(160deg,{PC['lite']}22,rgba(22,28,37,.85) 60%)"><span class="eyebrow" style="color:{PC['lite']}">Scouter · part of Lite</span>
          <span class="h2">Will this model fit the room?</span><span class="sm">9 catalogued models checked against the room's record, each check with its source.</span><span class="btn p" style="align-self:flex-start">Open Scouter</span></div>
        <div class="card" style="flex:1"><span class="h2">Buildings</span><div class="list">{bl}</div></div></div></div>'''
    return frame('Lite · Living Campus — 1440', 'd', glow(300, -260, 640, PC['lite']) + rail('campus') + f'<div class="main">{top()}<div class="body">{body}</div></div>')

def campus_m():
    b = f'''<div class="col" style="gap:4px"><span class="eyebrow" style="color:{PC['lite']}">Lite · Living Campus</span><span style="font-size:22px;line-height:28px;font-weight:700">Northstar Innovation Campus</span><span class="sm">30 rooms · 5 buildings + Annex</span></div>
    <div class="stage" style="height:300px">{campus_svg(358, 300, .5)}</div>
    <div class="row" style="gap:6px;overflow:hidden">{''.join(chip(n.split()[0], c, True) for (n, *_), c in zip(BUILDINGS, [PC['lite'], PC['pro'], PC['field'], PC['learn'], PC['search-party']]))}</div>
    <div class="card" style="padding:14px;border-color:{PC['lite']}55"><span class="h3">Scouter · will this model fit?</span><span class="xs">9 catalogued models checked against the room's record</span></div>'''
    return frame('Lite · Living Campus — 390', 'm', mtop('Campus') + f'<div class="mbody">{b}</div>' + tabsb('campus'))

# ---------- 6. Investor start ----------
def flash(n, rk, ini, w=200, h=250, big=False):
    c = ROLE_C[rk]
    return (f'<div class="tile" style="width:{w}px;height:{h}px;flex:none;padding:16px;background:linear-gradient(170deg,{c}38,{c}0a 55%,rgba(22,28,37,.9));border-color:{c}55;gap:10px">'
            f'<span class="av" style="background:{c};width:{52 if big else 44}px;height:{52 if big else 44}px;font-size:15px">{ini}</span>'
            f'<span class="h3" style="font-size:{17 if big else 15}px">{n}</span><span class="xs" style="flex:1">Sees only the tabs, buttons and screens its work needs (D44).</span>'
            f'<div style="height:4px;border-radius:2px;background:var(--line2)"><div style="height:4px;border-radius:2px;width:{"34%" if rk == "visitor" else "60%"};background:{c}"></div></div>'
            f'<span class="xs">{"26 of 77 surfaces · 1,950 records" if rk == "visitor" else "surfaces · records — computed from the policy"}</span></div>')

def investor_d():
    cards = ''.join(flash(n, rk, ini) for n, rk, ini in ROLES[:6])
    ways = ''.join(f'<div class="card raised" style="flex:1;gap:8px"><span class="eyebrow" style="color:{c}">{e}</span><span class="h2">{t}</span><span class="sm">{s}</span></div>' for e, t, s, c in
                   [('Two minutes', 'Watch one room’s story', 'Atlas 4.218 — echo, repair, verification and the lesson it became.', PC['mission-control']),
                    ('Ten minutes', 'Walk the campus as a role', 'Pick a role below; the product changes with it.', ACC),
                    ('Your own pace', 'Design a room', 'Design a room and watch it reach drawings, commissioning, Search Party and Pro.', PC['pro'])])
    body = f'''<div class="col" style="gap:10px;align-items:center;text-align:center;padding-top:20px"><span class="eyebrow">Investor demonstration · synthetic estate</span>
      <span style="font-size:52px;line-height:56px;font-weight:800;letter-spacing:-.03em">Every role, one Core.</span>
      <span class="lead" style="max-width:640px">Each role is given what its work needs and nothing else; the tabs, buttons and screens change with it.</span></div>
    <div class="row" style="gap:16px">{ways}</div>
    <div class="row" style="justify-content:space-between"><span class="h2">Choose who you are</span><span class="sm">14 roles · ← → to browse · View as stays available everywhere</span></div>
    <div class="row" style="gap:16px">{cards}</div>'''
    return frame('Investor start · role flashcards — 1440', 'd', glow(420, -300, 700, ACC) + glow(1000, 600, 500, PC['learn']) + f'<div class="main"><header class="top"><div class="brand">{emblem(28)}Empathia</div>{chip("Synthetic data", "#f3b54a", False)}<span style="flex:1"></span><span class="btn">Light / dark</span><span class="btn p">Start the 2-minute story</span></header><div class="body" style="padding:28px 64px">{body}</div></div>')

def investor_m():
    b = f'''<div class="col" style="gap:6px"><span class="eyebrow">Investor demonstration</span><span style="font-size:32px;line-height:36px;font-weight:800;letter-spacing:-.03em">Every role, one Core.</span>
      <span class="sm">Each role is given what its work needs and nothing else.</span></div>
    <div class="row" style="gap:12px;overflow:hidden">{flash(*ROLES[0], w=260, h=300, big=True)}{flash(*ROLES[1], w=260, h=300, big=True)}</div>
    <div class="row" style="gap:6px;justify-content:center">{''.join(f'<span style="width:{18 if i==0 else 6}px;height:6px;border-radius:3px;background:{"var(--acc)" if i==0 else "var(--line2)"}"></span>' for i in range(7))}</div>
    <span class="btn p" style="height:48px;justify-content:center">View as AV Operations Lead</span>'''
    return frame('Investor start — 390', 'm', glow(40, -120, 340, ACC) + mtop('Empathia', 'visitor', 'VI') + f'<div class="mbody">{b}</div>')

# ---------- 7. Website home ----------
EVID = [('DECLARED', '#aab4c1'), ('MODELED', '#a487ff'), ('SIMULATED', '#f3b54a'), ('OBSERVED', '#2ed6c5'), ('MEASURED', '#4c63ff'), ('VERIFIED', '#4cc38a')]
def web_d():
    prods = ''.join(f'<div class="tile" style="height:120px;background:linear-gradient(160deg,{c}2e,{c}06 70%);border-color:{c}40"><span class="dot" style="background:{c};width:10px;height:10px"></span><span class="h3">{n}</span><span class="xs">in the public demonstration</span></div>' for _, n, c in P)
    body = f'''
    <header class="top" style="padding:0 64px;height:72px;border:0"><div class="brand" style="font-size:18px">{emblem(30)}Empathia</div><span style="flex:1"></span>
      {''.join(f'<span class="sm" style="font-weight:500">{t}</span>' for t in ['Products', 'Solutions', 'Evidence', 'Company'])}<span class="btn">Explore the live demo</span><span class="btn p">Request a demonstration</span></header>
    <div class="row" style="padding:56px 64px 32px;gap:48px;align-items:center">
      <div class="col" style="flex:1;gap:20px"><span class="eyebrow" style="color:var(--acc)">Empathia Living Campus</span>
        <span style="font-size:64px;line-height:66px;font-weight:800;letter-spacing:-.035em">Every room.<br>Every device.<br>Every decision.<br><span style="color:var(--acc)">With its evidence.</span></span>
        <span class="lead" style="font-size:18px;line-height:28px;max-width:560px">The request, the design, the commissioning tests, the service work and the accepted baseline of every room, connected in one record of what actually happened, and honest about what is only declared or modeled.</span>
        <div class="row" style="gap:10px"><span class="btn p" style="height:46px;padding:0 20px;font-size:15px">Request a demonstration</span><span class="btn" style="height:46px;padding:0 20px;font-size:15px">Explore the live demo</span></div></div>
      <div class="stage" style="width:600px;height:420px;flex:none">{campus_svg(600, 420, .62)}<span class="lbl" style="left:16px;bottom:16px;top:auto;color:var(--tx2)">Demonstration campus · synthetic · dark capture (D43)</span></div></div>
    <div class="row" style="padding:0 64px;gap:8px">{''.join(chip(t, c) for t, c in EVID)}</div>
    <div class="col" style="padding:40px 64px;gap:16px"><span class="h1" style="font-size:36px">Nine products. One record.</span><span class="lead" style="max-width:720px">Each product is a stage of the same governed lifecycle and shares one identity for every room, device, person and project.</span>
      <div class="grid" style="grid-template-columns:repeat(5,1fr)">{prods}</div></div>'''
    return frame('Website · Home — 1440', 'd', glow(-100, -200, 700, ACC) + glow(900, 100, 600, PC['learn']) + f'<div class="main">{body}</div>')

def web_m():
    b = f'''<div class="col" style="gap:14px;padding-top:8px"><span class="eyebrow" style="color:var(--acc)">Empathia Living Campus</span>
      <span style="font-size:40px;line-height:44px;font-weight:800;letter-spacing:-.03em">Every room. Every device. Every decision. <span style="color:var(--acc)">With its evidence.</span></span>
      <span class="sm" style="font-size:15px;line-height:23px">One record of what actually happened — honest about what is only declared or modeled.</span>
      <span class="btn p" style="height:48px;justify-content:center;font-size:15px">Request a demonstration</span><span class="btn" style="height:48px;justify-content:center;font-size:15px">Explore the live demo</span></div>
    <div class="row" style="gap:6px;flex-wrap:wrap">{''.join(chip(t, c) for t, c in EVID[:4])}</div>
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">{''.join(f'<div class="tile" style="height:72px;background:linear-gradient(160deg,{c}2e,{c}06 70%);border-color:{c}40"><span class="dot" style="background:{c}"></span><span class="h3" style="font-size:13px">{n}</span></div>' for _, n, c in P[:4])}</div>'''
    return frame('Website · Home — 390', 'm', glow(-60, -80, 340, ACC) + f'<header class="mtop">{emblem(26)}<div class="h3" style="flex:1">Empathia</div>{ico("more", "#bdb7ac", 22)}</header><div class="mbody">{b}</div>')

FR = [mission_d, mission_m, room_d, room_m, wo_d, wo_m, search_d, search_m, campus_d, campus_m, investor_d, investor_m, web_d, web_m]
if __name__ == '__main__':
    import sys
    only = sys.argv[1:]  # optional subset of function names
    fns = [f for f in FR if not only or f.__name__ in only]
    fonts = face('inter-400.woff2', 'Inter', 400) + face('inter-500.woff2', 'Inter', 500) + face('inter-600.woff2', 'Inter', 600) + face('inter-700.woff2', 'Inter', 700) + face('inter-display-800.woff2', 'Inter', 800)
    html = f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Empathia rebuild direction</title><style>{fonts}{CSS}</style></head><body>{"".join(f() for f in fns)}</body></html>'
    out = OUT if not only else OUT.with_name('direction-' + '-'.join(only) + '.html')
    out.write_text(html); print(out, len(html))
