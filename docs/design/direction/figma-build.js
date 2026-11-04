// use_figma body: prepend `const D = <cjson/fNN.json>; const POS = [x, y];` — builds one direction frame on the
// "Rebuild direction" page (6:2) of "Empathia Emblem" from the geometry extract.mjs measured in Chrome.
const page = await figma.getNodeByIdAsync('6:2'); await figma.setCurrentPageAsync(page);
const W = { 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold' };
await Promise.all(Object.values(W).map((s) => figma.loadFontAsync({ family: 'Inter', style: s })));
const C = (h) => { const n = parseInt(h.slice(0, 6), 16); return { c: { r: (n >> 16 & 255) / 255, g: (n >> 8 & 255) / 255, b: (n & 255) / 255 }, a: h.length > 6 ? parseInt(h.slice(6), 16) / 255 : 1 }; };
const SP = (h) => { const k = C(h); return { type: 'SOLID', color: k.c, opacity: k.a }; };
const GP = ([t, ang, st]) => { const p = (ang - 90) * Math.PI / 180, c = Math.cos(p), s = Math.sin(p);
  return { type: t === 'R' ? 'GRADIENT_RADIAL' : 'GRADIENT_LINEAR', gradientTransform: t === 'R' ? [[1, 0, 0], [0, 1, 0]] : [[c, s, .5 - .5 * c - .5 * s], [-s, c, .5 + .5 * s - .5 * c]],
    gradientStops: st.map(([h, pos]) => { const k = C(h); return { position: Math.min(1, Math.max(0, pos)), color: { ...k.c, a: k.a } }; }) }; };
const old = page.children.find((n) => n.name === D.n); if (old) old.remove();
const F = figma.createFrame(); F.name = D.n; F.resize(D.w, D.h); F.x = POS[0]; F.y = POS[1]; F.fills = [SP('0a0e14')]; F.clipsContent = true;
let n = 0;
for (const it of D.I) {
  if (it[0] === 'r') {
    const [, x, y, w, h, bg, g, bw, bc, rad, blur, sh, bb, op] = it; const r = figma.createRectangle();
    r.x = x; r.y = y; r.resize(Math.max(w, 1), Math.max(h, 1)); const f = []; if (bg) f.push(SP(bg)); if (g) f.push(GP(g)); r.fills = f;
    if (bw) { r.strokes = [SP(bc)]; r.strokeWeight = bw; r.strokeAlign = 'INSIDE'; } r.cornerRadius = rad; const ef = [];
    if (blur) ef.push({ type: 'LAYER_BLUR', blurType: 'NORMAL', radius: blur, visible: true });
    if (sh) ef.push({ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: .55 }, offset: { x: 0, y: 12 }, radius: 32, spread: -12, visible: true, blendMode: 'NORMAL' });
    r.effects = ef; if (op < 1) r.opacity = op; r.name = 'box'; F.appendChild(r); n++;
    if (bb) { const l = figma.createRectangle(); l.x = x; l.y = y + h - bb[0]; l.resize(Math.max(w, 1), bb[0]); l.fills = [SP(bb[1])]; l.name = 'rule'; F.appendChild(l); n++; }
  } else if (it[0] === 'x') {
    const [, x, y, w, h, s, fs, fw, lh, ls, c, al, ml, op] = it; const t = figma.createText();
    t.fontName = { family: 'Inter', style: W[fw] || 'Regular' }; t.characters = s; t.fontSize = fs; if (lh) t.lineHeight = { unit: 'PIXELS', value: lh };
    if (ls) t.letterSpacing = { unit: 'PIXELS', value: ls }; t.fills = [SP(c || 'f4f1ec')]; if (al === 'C') t.textAlignHorizontal = 'CENTER';
    F.appendChild(t); t.x = x; t.y = y; if (ml) { t.textAutoResize = 'HEIGHT'; t.resize(w, h); } else t.textAutoResize = 'WIDTH_AND_HEIGHT'; if (op < 1) t.opacity = op; n++;
  } else { const [, x, y, w, h, i] = it; const v = figma.createNodeFromSvg(D.S[i]); v.name = 'icon'; F.appendChild(v); v.x = x; v.y = y; v.resize(Math.max(w, 1), Math.max(h, 1)); n++; }
}
return { frameId: F.id, name: F.name, nodes: n };
