/**
 * The animated drawings for the 26 Physics in Motion simulations, ported unchanged in substance from the reference physics.js (each sim's
 * model and draw on a 2D canvas; the controls live in physics.ts and LabRunner). Toy models for learning (RV-39). The canvas is a dark
 * stage in either theme, as the reference draws it. Restored 12 Nov 2026. Checked by behaviour (every sim draws at every start state, in
 * the unit tests and the browser), not by the type checker: the reference code is kept as it is so the drawings stay the reference's.
 */
// @ts-nocheck
let REDUCED = false;
const still = () => REDUCED;
const round = (x, n = 0) => { const p = 10 ** n; return Math.round(x * p) / p; };
const inGoal = (v, g) => v >= g[0] && v <= g[1];
function bg(ctx, w, h) { ctx.fillStyle = '#0B1220'; ctx.fillRect(0, 0, w, h); }
function label(ctx, x, y, s, col, size, align) { ctx.fillStyle = col || '#CBD5E1'; ctx.font = '700 ' + Math.max(13, Math.round((size || 13) * 1.18)) + 'px system-ui, sans-serif'; ctx.textAlign = align || 'left'; ctx.fillText(s, x, y); }
const C0 = 343;
const PHYS = {
    /* Two sources, one listener: interference and comb filtering */
    waves: {
      h: 320, aria: 'Two loudspeakers radiating waves toward a row of seats; the listener marker shows the level where waves add or cancel.',
      model: function (st, L) {
        var s1 = { x: L.s1[0], y: L.s1[1] }, s2 = { x: L.s2[0], y: L.s2[1] }, lx = st.x, ly = L.rowY;
        var d1 = Math.hypot(lx - s1.x, ly - s1.y), d2 = Math.hypot(lx - s2.x, ly - s2.y), dd = Math.abs(d2 - d1), ph = 2 * Math.PI * st.f * dd / C0;
        var re = 1 + Math.cos(ph), im = Math.sin(ph), lvl = 20 * Math.log10(Math.max(1e-4, Math.sqrt(re * re + im * im)) / 2);
        return { d1: d1, d2: d2, dd: dd, lvl: lvl, notch: dd > 0.001 ? C0 / (2 * dd) : Infinity, s1: s1, s2: s2, ly: ly };
      },
      read: function (m, st) { return [['path difference', round(m.dd, 3) + ' m'], ['time difference', round(m.dd / C0 * 1000, 2) + ' ms'], ['first notch here', isFinite(m.notch) ? Math.round(m.notch) + ' Hz' : '—'], ['level vs one speaker ×2', round(m.lvl, 1) + ' dB']]; },
      check: function (m, st, L) {
        if (L.goal === 'notch') return m.lvl <= -15 ? { ok: true, why: [], notes: ['At ' + st.f + ' Hz and ' + st.x + ' m the two arrivals cancel: ' + round(m.lvl, 1) + ' dB.'] } : { ok: false, why: ['Not a cancellation yet (' + round(m.lvl, 1) + ' dB). Find where the path difference is half a wavelength.'] };
        return m.lvl >= -1 ? { ok: true, why: [] } : { ok: false, why: ['The arrivals aren’t adding (' + round(m.lvl, 1) + ' dB).'] };
      },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 320, sc = 60, ox = 40, oy = 30; bg(ctx, W, H);
        var lam = C0 / st.f;
        [m.s1, m.s2].forEach(function (s, k) {
          var cx = ox + s.x * sc, cy = oy + s.y * sc, ph = (t * 1.2) % 1;
          for (var r = ph * lam * sc; r < 900; r += lam * sc) { if (r < 2) continue; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.strokeStyle = k ? 'rgba(244,114,182,.35)' : 'rgba(34,211,238,.35)'; ctx.lineWidth = 2; ctx.stroke(); }
          ctx.fillStyle = k ? '#F472B6' : '#22D3EE'; ctx.fillRect(cx - 10, cy - 12, 20, 24); label(ctx, cx, cy - 18, k ? 'FILL' : 'MAIN', '#F4F1E8', 12, 'center');
        });
        ctx.strokeStyle = '#475569'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(ox, oy + m.ly * sc); ctx.lineTo(ox + 12 * sc, oy + m.ly * sc); ctx.stroke(); ctx.setLineDash([]);
        var lx = ox + st.x * sc, ly = oy + m.ly * sc, good = m.lvl > -6;
        ctx.beginPath(); ctx.arc(lx, ly, 12, 0, 2 * Math.PI); ctx.fillStyle = good ? '#34D399' : '#EF4444'; ctx.fill();
        label(ctx, lx, ly + 30, round(m.lvl, 1) + ' dB', good ? '#34D399' : '#EF4444', 14, 'center');
        label(ctx, W - 10, H - 10, 'ILLUSTRATIVE · 1 grid unit = 1 m · rings = wavefronts', '#94A3B8', 11, 'right');
      }
    },
    /* Inverse square: level vs distance */
    invsq: {
      h: 260, aria: 'A loudspeaker and a listener whose distance you set; rings spread and thin as distance grows.',
      model: function (st, L) { return { lvl: L.l1 - 20 * Math.log10(st.d / 1), d: st.d }; },
      read: function (m, st, L) { return [['level at 1 m', L.l1 + ' dB SPL'], ['distance', st.d + ' m'], ['level here', round(m.lvl, 1) + ' dB SPL'], ['change from 1 m', round(m.lvl - L.l1, 1) + ' dB']]; },
      check: function (m, st, L) { return inGoal(m.lvl, L.goal) ? { ok: true, why: [], notes: ['At ' + st.d + ' m: ' + round(m.lvl, 1) + ' dB SPL.'] } : { ok: false, why: ['Level here is ' + round(m.lvl, 1) + ' dB; the goal is ' + L.goal[0] + '–' + L.goal[1] + ' dB.'] }; },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 260; bg(ctx, W, H); var sx = 60, sy = 130, px = 60 + Math.log2(st.d) / 6 * 680;
        for (var i = 0; i < 12; i++) { var r = ((t * 60 + i * 60) % 720); ctx.beginPath(); ctx.arc(sx, sy, r, -0.6, 0.6); ctx.strokeStyle = 'rgba(34,211,238,' + Math.max(0, 0.9 - r / 720) + ')'; ctx.lineWidth = 3; ctx.stroke(); }
        ctx.fillStyle = '#22D3EE'; ctx.fillRect(sx - 16, sy - 22, 24, 44);
        [1, 2, 4, 8, 16, 32, 64].forEach(function (d) { var x = 60 + Math.log2(d) / 6 * 680; label(ctx, x, 240, d + ' m', '#94A3B8', 11, 'center'); ctx.fillStyle = '#1F2A3D'; ctx.fillRect(x, 60, 1, 150); });
        ctx.beginPath(); ctx.arc(px, sy, 12, 0, 2 * Math.PI); ctx.fillStyle = '#FBBF24'; ctx.fill(); label(ctx, px, sy - 22, round(m.lvl, 1) + ' dB', '#FBBF24', 14, 'center');
        label(ctx, W - 10, 20, 'ILLUSTRATIVE · free field · distance axis doubles each step', '#94A3B8', 11, 'right');
      }
    },
    /* Wavelength vs obstacle size (diffraction) */
    wavelength: {
      h: 280, aria: 'Wavefronts meeting a pillar; long waves bend around it, short waves leave a shadow.',
      model: function (st, L) { var lam = C0 / st.f; return { lam: lam, ratio: lam / L.size }; },
      read: function (m, st, L) { return [['wavelength', round(m.lam, 3) + ' m'], ['pillar', L.size + ' m'], ['wavelength ÷ pillar', round(m.ratio, 2)], ['behind the pillar', m.ratio > 2 ? 'wraps around (little shadow)' : m.ratio < 0.5 ? 'deep shadow' : 'partial shadow']]; },
      check: function (m, st, L) { return Math.abs(m.ratio - 1) <= (L.tol || 0.05) ? { ok: true, why: [], notes: [st.f + ' Hz has a wavelength equal to the pillar.'] } : { ok: false, why: ['Wavelength is ' + round(m.ratio, 2) + '× the pillar. Find where it equals the pillar.'] }; },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 280; bg(ctx, W, H); var px = 420, pw = 60, lamPx = Math.max(6, Math.min(400, m.lam / L.size * pw)), shadow = Math.max(0, Math.min(1, 1 - (m.ratio - 0.4) / 1.6));
        for (var x = ((t * 80) % lamPx); x < W; x += lamPx) {
          ctx.strokeStyle = 'rgba(34,211,238,.55)'; ctx.lineWidth = 3; ctx.beginPath();
          if (x < px) { ctx.moveTo(x, 20); ctx.lineTo(x, H - 20); }
          else { ctx.moveTo(x, 20); ctx.lineTo(x, 110); ctx.moveTo(x, 170); ctx.lineTo(x, H - 20); ctx.stroke(); ctx.beginPath(); ctx.strokeStyle = 'rgba(34,211,238,' + (0.55 * (1 - shadow)) + ')'; ctx.moveTo(x, 110); ctx.lineTo(x, 170); }
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(239,68,68,' + shadow * 0.25 + ')'; ctx.fillRect(px + pw, 110, W - px - pw, 60);
        ctx.fillStyle = '#94A3B8'; ctx.fillRect(px, 110, pw, 60); label(ctx, px + pw / 2, 104, 'PILLAR ' + L.size + ' m', '#F4F1E8', 12, 'center');
        label(ctx, W - 10, H - 6, 'ILLUSTRATIVE · wavefronts to scale with the pillar', '#94A3B8', 11, 'right');
      }
    },
    /* Speed of sound vs temperature */
    soundspeed: {
      h: 200, aria: 'A sound pulse racing from the stage to a delay tower; its speed depends on air temperature.',
      model: function (st, L) { var c = 331.3 + 0.606 * st.T; return { c: c, ms: L.dist / c * 1000 }; },
      read: function (m, st, L) { return [['speed of sound', round(m.c, 1) + ' m/s'], ['distance', L.dist + ' m'], ['travel time', round(m.ms, 2) + ' ms']]; },
      check: function (m, st, L) { return inGoal(m.ms, L.goal) ? { ok: true, why: [] } : { ok: false, why: ['Travel time is ' + round(m.ms, 2) + ' ms; the goal is ' + L.goal[0] + '–' + L.goal[1] + ' ms.'] }; },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 200; bg(ctx, W, H); ctx.fillStyle = '#22D3EE'; ctx.fillRect(30, 70, 30, 60); ctx.fillStyle = '#F472B6'; ctx.fillRect(740, 70, 30, 60);
        label(ctx, 45, 60, 'STAGE', '#F4F1E8', 12, 'center'); label(ctx, 755, 60, 'TOWER', '#F4F1E8', 12, 'center');
        var p = ((t * 1000) % (m.ms * 8)) / (m.ms * 8), x = 60 + p * 680; ctx.beginPath(); ctx.arc(x, 100, 10, 0, 2 * Math.PI); ctx.fillStyle = '#FBBF24'; ctx.fill();
        label(ctx, 400, 180, 'pulse shown 8× slower than real · ' + round(m.c, 1) + ' m/s at ' + st.T + ' °C · ILLUSTRATIVE', '#94A3B8', 11, 'center');
      }
    },
    /* Feedback loop gain */
    loop: {
      h: 240, aria: 'A signal circulating mic → speaker → mic; each lap it grows or shrinks by the loop gain.',
      model: function (st) { var k = Math.pow(10, st.g / 20); return { k: k, after10: Math.pow(k, 10) }; },
      read: function (m, st) { return [['loop gain', st.g + ' dB'], ['each lap ×', round(m.k, 3)], ['after 10 laps ×', round(m.after10, 3)], ['behavior', st.g >= 0 ? 'rings and grows: FEEDBACK' : st.g > -3 ? 'rings a long time' : 'dies away']]; },
      check: function (m, st, L) { return inGoal(st.g, L.goal) ? { ok: true, why: [] } : { ok: false, why: [st.g >= 0 ? 'At or above 0 dB the loop grows: feedback.' : 'Set the loop gain with the stability margin the goal asks for (' + L.goal[0] + ' to ' + L.goal[1] + ' dB).'] }; },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 240; bg(ctx, W, H); ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(30, 120); ctx.lineTo(770, 120); ctx.stroke();
        ctx.beginPath(); for (var x = 0; x < 740; x++) { var lap = x / 74, a = Math.min(95, 40 * Math.pow(m.k, lap)); var y = 120 - a * Math.sin((x / 9) - t * 6); if (x) ctx.lineTo(30 + x, y); else ctx.moveTo(30, y); }
        ctx.strokeStyle = st.g >= 0 ? '#EF4444' : '#34D399'; ctx.lineWidth = 3; ctx.stroke();
        label(ctx, 30, 24, 'amplitude over 10 laps around the loop', '#94A3B8', 12); label(ctx, W - 10, H - 8, 'ILLUSTRATIVE', '#94A3B8', 11, 'right');
      }
    },
    /* Ohm's law and a thermal breaker */
    ohm: {
      h: 230, aria: 'A circuit feeding loads; the current bar and the breaker respond to the load you add.',
      model: function (st, L) { var I = st.w / L.volts; return { I: I, pct: I / L.breaker }; },
      read: function (m, st, L) { return [['voltage', L.volts + ' V'], ['load', st.w + ' W'], ['current I = P/V', round(m.I, 2) + ' A'], ['breaker', L.breaker + ' A (' + Math.round(m.pct * 100) + '%)']]; },
      check: function (m, st, L) { return inGoal(st.w, L.goal) ? { ok: true, why: [] } : { ok: false, why: ['The goal is a load of ' + L.goal[0] + '–' + L.goal[1] + ' W: ' + (L.goalWhy || 'the most you can plan without passing the limit line.')] }; },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 230; bg(ctx, W, H); var tripped = m.pct > 1;
        ctx.strokeStyle = tripped ? '#475569' : '#FBBF24'; ctx.lineWidth = 6; ctx.strokeRect(80, 50, 640, 120);
        if (!tripped) { var n = 24, sp = Math.min(3, m.I / 5); for (var i = 0; i < n; i++) { var p = ((i / n) + t * sp * 0.1) % 1, per = 2 * (640 + 120), d = p * per, x, y; if (d < 640) { x = 80 + d; y = 50; } else if (d < 760) { x = 720; y = 50 + d - 640; } else if (d < 1400) { x = 720 - (d - 760); y = 170; } else { x = 80; y = 170 - (d - 1400); } ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI); ctx.fillStyle = '#FDE68A'; ctx.fill(); } }
        ctx.fillStyle = '#0F172A'; ctx.fillRect(330, 90, 140, 40); label(ctx, 400, 116, tripped ? 'BREAKER TRIPPED' : round(m.I, 1) + ' A', tripped ? '#EF4444' : '#F4F1E8', 14, 'center');
        ctx.fillStyle = '#1F2A3D'; ctx.fillRect(80, 196, 640, 14); ctx.fillStyle = m.pct > (L.limit || 0.8) ? '#EF4444' : '#FBBF24'; ctx.fillRect(80, 196, 640 * Math.min(1, m.pct), 14);
        ctx.fillStyle = '#F4F1E8'; ctx.fillRect(80 + 640 * (L.limit || 0.8), 190, 2, 26); label(ctx, W - 10, 18, 'ILLUSTRATIVE · planning only — the electrician owns the panel (RV-26)', '#94A3B8', 11, 'right');
      }
    },
    /* Sampling: wagon wheel / LED strobe */
    sampling: {
      h: 260, aria: 'A spinning wheel filmed by a camera; at some speeds it seems to stop or run backwards.',
      model: function (st, L) { var fps = L.fps, spokes = L.spokes, per = 1 / spokes, adv = (st.rps / fps) % per, ap = adv > per / 2 ? adv - per : adv; return { apparent: ap * fps, real: st.rps, fps: fps }; },
      read: function (m, st, L) { return [['real speed', st.rps + ' rev/s'], ['camera', L.fps + ' fps'], ['spokes', L.spokes], ['camera sees', Math.abs(m.apparent) < 0.02 ? 'FROZEN' : (m.apparent < 0 ? 'backwards ' : 'forwards ') + round(Math.abs(m.apparent), 2) + ' rev/s']]; },
      check: function (m, st, L) { return Math.abs(m.apparent) < 0.02 && st.rps > 0.5 ? { ok: true, why: [], notes: ['At ' + st.rps + ' rev/s the wheel moves exactly one spoke-gap (or a whole number of them) per frame.'] } : { ok: false, why: ['The wheel isn’t frozen on camera yet.'] }; },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 260; bg(ctx, W, H);
        function wheel(cx, ang, lab) { ctx.save(); ctx.translate(cx, 130); ctx.rotate(ang); ctx.strokeStyle = '#F4F1E8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 80, 0, 2 * Math.PI); ctx.stroke(); for (var i = 0; i < L.spokes; i++) { ctx.beginPath(); ctx.moveTo(0, 0); var a = i * 2 * Math.PI / L.spokes; ctx.lineTo(80 * Math.cos(a), 80 * Math.sin(a)); ctx.strokeStyle = i ? '#94A3B8' : '#FBBF24'; ctx.stroke(); } ctx.restore(); label(ctx, cx, 240, lab, '#CBD5E1', 12, 'center'); }
        var frameT = Math.floor(t * L.fps) / L.fps;
        wheel(220, 2 * Math.PI * st.rps * (still() ? 0 : t * 0.02), 'THE ROOM (slowed 50×)');
        wheel(580, 2 * Math.PI * m.apparent * frameT, 'THE CAMERA at ' + L.fps + ' fps');
        label(ctx, W - 10, 18, 'ILLUSTRATIVE · stroboscopic sampling', '#94A3B8', 11, 'right');
      }
    },
    /* Radio path loss with obstacles */
    fspl: {
      h: 220, aria: 'A wireless transmitter and receiver; bars show path loss, body and obstacle loss, and the margin left.',
      model: function (st, L) { var fspl = 20 * Math.log10(st.d / 1000) + 20 * Math.log10(L.f) + 32.44, extra = (st.body ? L.bodyLoss : 0) + (st.frame ? L.frameLoss : 0), rx = L.tx - fspl - extra; return { fspl: fspl, extra: extra, rx: rx, margin: rx - L.sens }; },
      read: function (m, st, L) { return [['free-space loss', round(m.fspl, 1) + ' dB'], ['obstacles', m.extra + ' dB'], ['received', round(m.rx, 1) + ' dBm'], ['margin over sensitivity', round(m.margin, 1) + ' dB']]; },
      check: function (m, st, L) { var ok = m.margin >= L.goalMargin && (!L.needBody || st.body) && (!L.needFrame || st.frame); return ok ? { ok: true, why: [] } : { ok: false, why: ['Margin is ' + round(m.margin, 1) + ' dB with the real obstacles on; you need ≥ ' + L.goalMargin + ' dB.' + (L.needBody && !st.body ? ' Turn on the body loss — she will turn her back.' : '')] }; },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 220; bg(ctx, W, H); var max = L.tx - L.sens + 10, sc = 700 / max;
        function bar(y, v, col, lab) { ctx.fillStyle = col; ctx.fillRect(50, y, Math.max(0, v * sc), 26); label(ctx, 56, y + 18, lab, '#05070C', 12); }
        bar(30, m.fspl, '#22D3EE', 'path loss ' + round(m.fspl, 1) + ' dB'); bar(66, m.extra, '#F472B6', 'obstacles ' + m.extra + ' dB');
        ctx.fillStyle = m.margin >= L.goalMargin ? '#34D399' : '#EF4444'; ctx.fillRect(50, 102, Math.max(0, m.margin * sc), 26); label(ctx, 56, 120, 'margin ' + round(m.margin, 1) + ' dB', '#05070C', 12);
        var r = ((t * 70) % 60); ctx.strokeStyle = 'rgba(34,211,238,.4)'; ctx.lineWidth = 2; for (var k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(60, 180, r + k * 60, -0.4, 0.4); ctx.stroke(); }
        label(ctx, W - 10, H - 8, 'ILLUSTRATIVE · FSPL = 20·log10(d km) + 20·log10(f MHz) + 32.44 · RV-35', '#94A3B8', 11, 'right');
      }
    },
    /* Additive color and color temperature */
    color: {
      h: 220, aria: 'Your RGB mix beside a target white; a readout shows how close you are.',
      model: function (st, L) { var t = L.target, d = Math.sqrt(Math.pow(st.r - t[0], 2) + Math.pow(st.g - t[1], 2) + Math.pow(st.b - t[2], 2)); return { d: d }; },
      read: function (m, st, L) { return [['your mix', 'R' + st.r + ' G' + st.g + ' B' + st.b], ['target', L.targetLabel], ['distance', Math.round(m.d)]]; },
      check: function (m, st, L) { return m.d <= (L.tol || 24) ? { ok: true, why: [] } : { ok: false, why: ['Not a match yet (distance ' + Math.round(m.d) + '). Warm white is lots of red, less green, much less blue.'] }; },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 220; bg(ctx, W, H);
        ctx.globalCompositeOperation = 'lighter';
        [[st.r, 0, 0, 300], [0, st.g, 0, 400], [0, 0, st.b, 350]].forEach(function (c) { ctx.beginPath(); ctx.arc(c[3], 110, 80, 0, 2 * Math.PI); ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; ctx.fill(); });
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgb(' + st.r + ',' + st.g + ',' + st.b + ')'; ctx.fillRect(560, 40, 90, 140); ctx.fillStyle = 'rgb(' + L.target.join(',') + ')'; ctx.fillRect(660, 40, 90, 140);
        label(ctx, 605, 200, 'YOURS', '#CBD5E1', 12, 'center'); label(ctx, 705, 200, 'TARGET', '#CBD5E1', 12, 'center'); label(ctx, 20, 20, 'light adds: overlapping beams mix toward white · ILLUSTRATIVE', '#94A3B8', 11);
      }
    },
    /* Fourier: build a square wave from odd harmonics */
    fourier: {
      h: 250, aria: 'A waveform built from a fundamental and its harmonics, drawn live.',
      model: function (st) { var err = Math.abs(st.h3 - 1 / 3) + Math.abs(st.h5 - 1 / 5) + Math.abs(st.h7 - 1 / 7); return { err: err }; },
      read: function (m, st, L) { return [['fundamental', L.f0 + ' Hz'], ['3rd', 3 * L.f0 + ' Hz × ' + st.h3], ['5th', 5 * L.f0 + ' Hz × ' + st.h5], ['7th', 7 * L.f0 + ' Hz × ' + st.h7]]; },
      check: function (m) { return m.err <= 0.06 ? { ok: true, why: [] } : { ok: false, why: ['Not square yet: odd harmonics at 1/n of the fundamental.'] }; },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 250; bg(ctx, W, H); ctx.strokeStyle = '#334155'; ctx.beginPath(); ctx.moveTo(20, 125); ctx.lineTo(780, 125); ctx.stroke();
        ctx.beginPath(); for (var x = 0; x <= 760; x++) { var ph = x / 760 * 4 * Math.PI + t; var y = Math.sin(ph) + st.h3 * Math.sin(3 * ph) + st.h5 * Math.sin(5 * ph) + st.h7 * Math.sin(7 * ph); var Y = 125 - y * 70; if (x) ctx.lineTo(20 + x, Y); else ctx.moveTo(20, Y); }
        ctx.strokeStyle = '#34D399'; ctx.lineWidth = 3; ctx.stroke(); label(ctx, W - 10, H - 8, 'ILLUSTRATIVE · sum of sines', '#94A3B8', 11, 'right');
      }
    },
    /* Projector throw: distance = throw ratio × image width (S06E02) */
    throw: {
      h: 260, aria: 'Side view of a theater: a screen on the left, a ceiling beam, and a projector whose position and lens you set; the light cone shows the image width.',
      model: function (st, L) { var w = st.d / st.tr, inBeam = st.d >= L.beam[0] - 0.3 && st.d <= L.beam[1] + 0.3; return { w: w, inBeam: inBeam }; },
      read: function (m, st, L) { return [['image width = distance ÷ throw ratio', round(m.w, 2) + ' m'], ['target width', L.width + ' m'], ['beam zone', L.beam[0] + '–' + L.beam[1] + ' m from the screen'], ['projector', m.inBeam ? 'IN THE BEAM ZONE' : 'clear of the beam']]; },
      check: function (m, st, L) {
        var why = []; if (Math.abs(m.w - L.width) > (L.tol || 0.1)) why.push('Image is ' + round(m.w, 2) + ' m wide; the screen is ' + L.width + ' m.');
        if (m.inBeam) why.push('The projector sits in the beam zone (' + L.beam[0] + '–' + L.beam[1] + ' m): the beam blocks the light or the mount.');
        if (L.lenses && L.lenses.every(function (x) { return Math.abs(x - st.tr) > 0.02; })) why.push('Pick a throw ratio the specified lenses actually have: ' + L.lenses.join(' or ') + ' : 1.');
        return why.length ? { ok: false, why: why } : { ok: true, why: [], notes: [round(st.d, 1) + ' m with a ' + st.tr + ':1 lens fills ' + L.width + ' m, clear of the beam.'] };
      },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 260; bg(ctx, W, H); var x0 = 70, sc = (W - 120) / (L.dMax || 14), fy = 220, cy = 40;
        ctx.fillStyle = '#1E293B'; ctx.fillRect(0, fy, W, H - fy); ctx.fillRect(0, 0, W, cy);
        var sh = m.w * 18; ctx.fillStyle = '#E2E8F0'; ctx.fillRect(x0 - 8, 110 - Math.min(90, sh / 2), 8, Math.min(180, sh));
        label(ctx, x0 - 4, fy + 26, 'SCREEN ' + L.width + ' m', '#CBD5E1', 13, 'left');
        var bx0 = x0 + L.beam[0] * sc, bx1 = x0 + L.beam[1] * sc; ctx.fillStyle = '#78716C'; ctx.fillRect(bx0, cy, bx1 - bx0, 46); label(ctx, (bx0 + bx1) / 2, cy + 64, 'BEAM', '#D6D3D1', 13, 'center');
        var px = x0 + st.d * sc, py = cy + 30; ctx.fillStyle = m.inBeam ? '#EF4444' : '#FBBF24'; ctx.fillRect(px - 14, py - 10, 28, 20);
        ctx.fillStyle = 'rgba(251,191,36,.18)'; ctx.beginPath(); ctx.moveTo(px - 14, py); ctx.lineTo(x0, 110 - Math.min(90, sh / 2)); ctx.lineTo(x0, 110 + Math.min(90, sh / 2)); ctx.closePath(); ctx.fill();
        label(ctx, px, py + 34, round(st.d, 1) + ' m · ' + st.tr + ':1', m.inBeam ? '#FCA5A5' : '#FDE68A', 13, 'center');
        label(ctx, W - 10, H - 8, 'ILLUSTRATIVE · side view · image width = distance ÷ throw ratio', '#94A3B8', 11, 'right');
      }
    },
    /* Ceiling loudspeakers on a square grid: coverage circle at ear height vs the worst point between four loudspeakers */
    ceiling: {
      h: 300, aria: 'Plan view of a ceiling loudspeaker grid: each loudspeaker covers a circle at ear height; red shows where nobody is covered.',
      model: function (st, L) { var D = 2 * (L.hc - L.he) * Math.tan(L.theta / 2 * Math.PI / 180), r = D / 2, worst = st.s / Math.SQRT2; return { D: D, r: r, worst: worst, covered: r >= worst - 1e-9, n: Math.ceil(L.roomW / st.s) * Math.ceil(L.roomL / st.s) }; },
      read: function (m, st, L) { return [['coverage D = 2(Hc − He)·tan(θ/2)', round(m.D, 2) + ' m'], ['worst point = spacing ÷ √2', round(m.worst, 2) + ' m from the nearest loudspeaker'], ['coverage radius', round(m.r, 2) + ' m'], ['loudspeakers for ' + L.roomW + ' × ' + L.roomL + ' m', m.n]]; },
      check: function (m, st, L) { var why = []; if (!m.covered) why.push('Holes between every four loudspeakers: the worst point is ' + round(m.worst, 2) + ' m away but coverage only reaches ' + round(m.r, 2) + ' m. Minimum overlap needs spacing ≤ D ÷ √2 = ' + round(m.D / Math.SQRT2, 2) + ' m.');
        if (st.s < (L.minS || 0)) why.push('Much denser than needed (' + m.n + ' loudspeakers): more cost and more overlapping arrivals. Minimum overlap is enough here.');
        return why.length ? { ok: false, why: why } : { ok: true, why: [], notes: ['Spacing ' + st.s + ' m: every point at ear height is inside a loudspeaker\'s coverage, with ' + m.n + ' loudspeakers.'] }; },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 300; bg(ctx, W, H); var sc = 34, ox = 60, oy = 30, cols = Math.min(9, Math.floor(620 / (st.s * sc)) + 1), rows = Math.min(6, Math.floor(230 / (st.s * sc)) + 1);
        ctx.fillStyle = 'rgba(239,68,68,.35)'; ctx.fillRect(ox, oy, (cols - 1) * st.s * sc, (rows - 1) * st.s * sc);
        for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) { var x = ox + i * st.s * sc, y = oy + j * st.s * sc; ctx.fillStyle = 'rgba(52,211,153,.55)'; ctx.beginPath(); ctx.arc(x, y, m.r * sc, 0, 2 * Math.PI); ctx.fill(); }
        for (i = 0; i < cols; i++) for (j = 0; j < rows; j++) { ctx.fillStyle = '#F8FAFC'; ctx.beginPath(); ctx.arc(ox + i * st.s * sc, oy + j * st.s * sc, 4, 0, 2 * Math.PI); ctx.fill(); }
        ctx.fillStyle = '#0B1220'; ctx.fillRect(700, 0, 100, H); ctx.fillRect(0, 270, W, 30);
        label(ctx, 712, 60, m.covered ? 'COVERED' : 'HOLES', m.covered ? '#6EE7B7' : '#FCA5A5', 14);
        label(ctx, 712, 90, 'ceiling ' + L.hc + ' m', '#CBD5E1', 12); label(ctx, 712, 116, 'ears ' + L.he + ' m', '#CBD5E1', 12); label(ctx, 712, 142, L.theta + '° cone', '#CBD5E1', 12);
        label(ctx, W - 10, H - 8, 'ILLUSTRATIVE · plan view at ear height · green = covered · red = uncovered', '#94A3B8', 11, 'right');
      }
    },
    /* Sabine reverberation */
    sabine: {
      h: 220, aria: 'A decaying sound in a room; add absorption and watch the decay shorten.',
      model: function (st, L) { var A = L.A0 + st.A, rt = 0.161 * L.V / A; return { rt: rt, A: A }; },
      read: function (m, st, L) { return [['room volume', L.V + ' m³'], ['total absorption', m.A + ' m²'], ['RT60 = 0.161·V/A', round(m.rt, 2) + ' s']]; },
      check: function (m, st, L) { return inGoal(m.rt, L.goal) ? { ok: true, why: [] } : { ok: false, why: ['RT60 is ' + round(m.rt, 2) + ' s; target ' + L.goal[0] + '–' + L.goal[1] + ' s.'] }; },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 220; bg(ctx, W, H); var T = (t % 3); ctx.beginPath();
        for (var x = 0; x < 740; x++) { var tt = x / 740 * 3, a = tt < 0.1 ? 1 : Math.pow(10, -3 * (tt - 0.1) / m.rt); var y = 110 - 90 * a * Math.sin(x * 0.9) * (tt < T ? 1 : 0.15); if (x) ctx.lineTo(30 + x, y); else ctx.moveTo(30, y); }
        ctx.strokeStyle = '#22D3EE'; ctx.lineWidth = 2; ctx.stroke(); label(ctx, 30, 20, 'a clap, then the room ringing out over 3 s', '#94A3B8', 12); label(ctx, W - 10, H - 8, 'ILLUSTRATIVE · Sabine', '#94A3B8', 11, 'right');
      }
    },
    /* Bits and quantization */
    bits: {
      h: 230, aria: 'A sine wave sampled with the bit depth you choose; the staircase shows quantization.',
      model: function (st) { return { dr: 6.02 * st.n + 1.76, levels: Math.pow(2, st.n) }; },
      read: function (m, st) { return [['levels', m.levels.toLocaleString('en-US')], ['dynamic range ≈ 6.02·n + 1.76', round(m.dr, 1) + ' dB']]; },
      check: function (m, st, L) { return inGoal(m.dr, L.goal) ? { ok: true, why: [] } : { ok: false, why: ['Dynamic range is ' + round(m.dr, 1) + ' dB; the goal is ' + L.goal[0] + '–' + L.goal[1] + ' dB.'] }; },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 230; bg(ctx, W, H); var q = Math.pow(2, Math.min(st.n, 8)) / 2;
        ctx.beginPath(); for (var x = 0; x < 760; x++) { var v = Math.sin(x / 760 * 4 * Math.PI + t); var y = 115 - v * 90; if (x) ctx.lineTo(20 + x, y); else ctx.moveTo(20, y); } ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); for (var x2 = 0; x2 < 760; x2++) { var v2 = Math.round(Math.sin(x2 / 760 * 4 * Math.PI + t) * q) / q; var y2 = 115 - v2 * 90; if (x2) ctx.lineTo(20 + x2, y2); else ctx.moveTo(20, y2); } ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 2.5; ctx.stroke();
        label(ctx, W - 10, H - 8, 'ILLUSTRATIVE · staircase capped at 8 bits for visibility', '#94A3B8', 11, 'right');
      }
    },
    /* Thin lens: focus */
    lens: {
      h: 220, aria: 'A lens forming an image of a subject; move the sensor until the blur circle shrinks to a point.',
      model: function (st, L) { var ideal = 1 / (1 / L.f - 1 / (L.subject * 1000)), blur = Math.abs(st.di - ideal) / ideal * 400; return { ideal: ideal, blur: blur }; },
      read: function (m, st, L) { return [['focal length', L.f + ' mm'], ['subject', L.subject + ' m'], ['sensor at', st.di + ' mm'], ['blur circle', round(m.blur, 2) + ' (arb.)']]; },
      check: function (m) { return m.blur <= 0.5 ? { ok: true, why: [] } : { ok: false, why: ['Still soft: the image forms ' + round(m.ideal, 2) + ' mm behind the lens.'] }; },
      draw: function (ctx, m, st, L, t) {
        var W = 800, H = 220; bg(ctx, W, H); var lx = 420, sx = lx + (st.di - L.f) * 12 + 120, ix = lx + (m.ideal - L.f) * 12 + 120;
        ctx.fillStyle = '#7C3AED'; ctx.fillRect(40, 70, 26, 80); ctx.strokeStyle = '#E0F2FE'; ctx.lineWidth = 2;
        [[53, 72], [53, 148]].forEach(function (p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(lx, 110 + (p[1] - 110) * 0.6); ctx.lineTo(ix, 110 - (p[1] - 110) * 0.4); ctx.lineTo(sx, 110 - (p[1] - 110) * 0.4 * (1 + (sx - ix) / 200)); ctx.stroke(); });
        ctx.fillStyle = '#94A3B8'; ctx.beginPath(); ctx.ellipse(lx, 110, 10, 70, 0, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#F4F1E8'; ctx.fillRect(sx - 2, 50, 4, 120); label(ctx, sx, 190, 'SENSOR', '#F4F1E8', 12, 'center');
        ctx.beginPath(); ctx.arc(sx, 110, Math.max(2, m.blur * 6), 0, 2 * Math.PI); ctx.strokeStyle = m.blur <= 0.5 ? '#34D399' : '#EF4444'; ctx.stroke();
        label(ctx, W - 10, 18, 'ILLUSTRATIVE · thin lens 1/f = 1/do + 1/di · not to scale', '#94A3B8', 11, 'right');
      }
    }
  };

  PHYS.lever = {
    h: 230, aria: 'A beam on two supports carrying one load; move the load and watch each support share it.',
    model: function (st, L) { var R2 = L.load * st.x / L.span, R1 = L.load - R2; return { R1: R1, R2: R2 }; },
    read: function (m, st, L) { return [['load', L.load + ' kg'], ['left support', round(m.R1, 1) + ' kg (rated ' + L.r1 + ')'], ['right support', round(m.R2, 1) + ' kg (rated ' + L.r2 + ')']]; },
    check: function (m, st, L) { var ok = m.R1 <= L.r1 && m.R2 <= L.r2; return ok ? { ok: true, why: [], notes: ['Both supports within their (illustrative) ratings. In real life the rigger and the engineer decide.'] } : { ok: false, why: ['A support is over its rating: left ' + round(m.R1, 1) + '/' + L.r1 + ', right ' + round(m.R2, 1) + '/' + L.r2 + ' kg.'] }; },
    draw: function (ctx, m, st, L, t) {
      var W = 800, H = 230; bg(ctx, W, H); var x0 = 100, x1 = 700, bx = x0 + st.x / L.span * (x1 - x0);
      ctx.fillStyle = '#94A3B8'; ctx.fillRect(x0 - 10, 90, x1 - x0 + 20, 14);
      [[x0, m.R1, L.r1], [x1, m.R2, L.r2]].forEach(function (s) { ctx.fillStyle = s[1] > s[2] ? '#EF4444' : '#34D399'; ctx.beginPath(); ctx.moveTo(s[0], 104); ctx.lineTo(s[0] - 18, 140); ctx.lineTo(s[0] + 18, 140); ctx.fill(); label(ctx, s[0], 165, round(s[1], 0) + ' / ' + s[2] + ' kg', s[1] > s[2] ? '#EF4444' : '#34D399', 13, 'center'); });
      ctx.fillStyle = '#FBBF24'; ctx.fillRect(bx - 22, 50, 44, 40); label(ctx, bx, 44, L.load + ' kg', '#FBBF24', 13, 'center');
      label(ctx, W - 10, H - 8, 'ILLUSTRATIVE · moments: R2 = load × x ÷ span · not a rigging calculation (RV-38)', '#94A3B8', 11, 'right');
    }
  };
  PHYS.entropy = {
    h: 200, aria: 'Bars comparing how many guesses a password takes at your chosen length and character set.',
    model: function (st, L) { var bits = st.n * Math.log2(st.k), secs = Math.pow(2, bits - 1) / L.rate; return { bits: bits, secs: secs }; },
    read: function (m, st, L) { function human(s) { var y = s / 31557600; return y > 1e6 ? '> a million years' : y > 1 ? round(y, 1) + ' years' : s > 86400 ? round(s / 86400, 1) + ' days' : s > 3600 ? round(s / 3600, 1) + ' hours' : round(s, 1) + ' s'; } return [['entropy n·log2(k)', round(m.bits, 1) + ' bits'], ['guesses/s (illustrative)', L.rate.toExponential(0)], ['average time to guess', human(m.secs)]]; },
    check: function (m, st, L) { return m.bits >= L.goalBits ? { ok: true, why: [] } : { ok: false, why: ['Only ' + round(m.bits, 1) + ' bits; the policy needs ≥ ' + L.goalBits + '.'] }; },
    draw: function (ctx, m, st, L, t) { var W = 800, H = 200; bg(ctx, W, H); var w = Math.min(1, m.bits / 128) * 700; ctx.fillStyle = m.bits >= L.goalBits ? '#34D399' : '#EF4444'; ctx.fillRect(50, 70, w, 40); ctx.fillStyle = '#F4F1E8'; ctx.fillRect(50 + L.goalBits / 128 * 700, 60, 3, 60); label(ctx, 50 + L.goalBits / 128 * 700, 54, 'policy ' + L.goalBits + ' bits', '#F4F1E8', 12, 'center'); label(ctx, 50, 150, round(m.bits, 1) + ' bits of 128 shown', '#CBD5E1', 13); label(ctx, W - 10, H - 8, 'ILLUSTRATIVE · random passwords only', '#94A3B8', 11, 'right'); }
  };

  /* ---------------------------------------------------------------- Season 4 sims (On Air) */
  /* Clock drift: a free-running clock against true time */
  PHYS.drift = {
    h: 250, aria: 'Two clocks: a perfect reference and a drifting one. The gap between their frame ticks grows with time and with the clock error in parts per million.',
    model: function (st, L) { var fps = L.fps || 29.97, drift = st.ppm * 1e-6 * st.hours * 3600, at = st.ppm * 1e-6 * (L.goalHours || 1) * 3600; return { drift: drift, frames: drift * fps, goalFrames: at * fps, fps: fps }; },
    read: function (m, st, L) { return [['drift = ppm × 10⁻⁶ × t', round(m.drift * 1000, 3) + ' ms'], ['in frames at ' + m.fps, round(m.frames, 3)], ['after ' + (L.goalHours || 1) + ' h', round(m.goalFrames, 3) + ' frames']]; },
    check: function (m, st, L) { var g = L.goal || [0, 0.5]; return m.goalFrames >= g[0] && m.goalFrames <= g[1] ? { ok: true, why: [], notes: ['At ' + st.ppm + ' ppm the clock slips ' + round(m.goalFrames, 3) + ' frames in ' + (L.goalHours || 1) + ' h — inside the goal.'] } : { ok: false, why: ['After ' + (L.goalHours || 1) + ' h this clock is off by ' + round(m.goalFrames, 3) + ' frames. The goal is ' + g[0] + '–' + g[1] + ' frames.'] }; },
    draw: function (ctx, m, st, L, t) {
      var W = 800, H = 250; bg(ctx, W, H); var fps = m.fps, span = 12, x0 = 60, x1 = 760, dx = (x1 - x0) / span, off = (m.frames % span) * dx;
      label(ctx, x0, 40, 'REFERENCE (locked)', '#34D399', 13); label(ctx, x0, 140, 'THIS CLOCK', '#FBBF24', 13);
      for (var i = 0; i <= span; i++) { var x = x0 + i * dx; ctx.fillStyle = '#34D399'; ctx.fillRect(x - 2, 55, 4, 40); var x2 = x0 + ((i * dx + off) % (x1 - x0)); ctx.fillStyle = '#FBBF24'; ctx.fillRect(x2 - 2, 155, 4, 40); }
      var ph = (t * 0.25) % 1; ctx.fillStyle = 'rgba(244,244,245,.25)'; ctx.fillRect(x0 + ph * (x1 - x0) - 1, 50, 2, 150);
      label(ctx, 400, 230, 'Slip shown: ' + round(m.frames, 2) + ' frames (wrapped every ' + span + ')', '#CBD5E1', 13, 'center'); label(ctx, W - 10, 18, 'ILLUSTRATIVE · toy model (RV-39)', '#94A3B8', 11, 'right');
    }
  };
  /* Lip sync: audio path delay vs video path delay */
  PHYS.lipsync = {
    h: 230, aria: 'A flash on the picture track and a beep on the sound track; the gap between them is the lip-sync offset.',
    model: function (st, L) { var off = st.audio - (L.video || 0), fps = L.fps || 29.97; return { off: off, frames: off / (1000 / fps) }; },
    read: function (m, st, L) { return [['video path', (L.video || 0) + ' ms'], ['audio path', st.audio + ' ms'], ['offset = audio − video', round(m.off, 1) + ' ms (' + round(m.frames, 2) + ' frames)'], ['heard as', m.off < 0 ? 'sound EARLY' : m.off > 0 ? 'sound late' : 'in sync']]; },
    check: function (m, st, L) { var w = L.window || [-15, 45]; return m.off >= w[0] && m.off <= w[1] ? { ok: true, why: [], notes: ['Offset ' + round(m.off, 1) + ' ms: inside the window.'] } : { ok: false, why: ['Offset ' + round(m.off, 1) + ' ms is outside the acceptable window (' + w[0] + ' to +' + w[1] + ' ms; sound early is noticed sooner than sound late).'] }; },
    draw: function (ctx, m, st, L, t) {
      var W = 800, H = 230; bg(ctx, W, H); var x0 = 60, sc = 1.3, cyc = (t % 2) / 2, base = 200;
      label(ctx, x0, 36, 'PICTURE', '#7DD3FC', 13); label(ctx, x0, 136, 'SOUND', '#F9A8D4', 13);
      for (var i = 0; i < 20; i++) { ctx.strokeStyle = '#334155'; ctx.strokeRect(x0 + i * 34, 46, 30, 50); }
      var vx = x0 + base + (L.video || 0) * sc * 0.5, ax = x0 + base + st.audio * sc * 0.5;
      ctx.fillStyle = '#F8FAFC'; ctx.fillRect(Math.min(W - 40, vx), 46, 30, 50); label(ctx, Math.min(W - 25, vx + 15), 112, 'flash', '#F8FAFC', 11, 'center');
      ctx.strokeStyle = '#F472B6'; ctx.lineWidth = 2; ctx.beginPath(); for (var x = x0; x < W - 20; x += 2) { var y = 170 + (Math.abs(x - ax) < 16 ? Math.sin(x * 0.9) * 22 : Math.sin(x * 0.3 + t * 4) * 2); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
      ctx.fillStyle = Math.abs(ax - vx) < 8 ? '#34D399' : '#FBBF24'; ctx.fillRect(Math.min(vx, ax), 120, Math.max(2, Math.abs(ax - vx)), 4);
      label(ctx, W - 10, 18, 'ILLUSTRATIVE · window is a planning figure (RV-39)', '#94A3B8', 11, 'right');
    }
  };
  /* Loudness: integrated loudness per segment against a target */
  PHYS.loudness = {
    h: 250, aria: 'A loudness meter across a program: news, a promo and news again. One segment stands out; the gain slider trims it toward the target line.',
    model: function (st, L) { var segs = L.segs.map(function (s, i) { return { name: s[0], lufs: s[1] + (i === (L.adjust || 1) ? st.g : 0) }; }); return { segs: segs, adj: segs[L.adjust || 1] }; },
    read: function (m, st, L) { return m.segs.map(function (s) { return [s.name, round(s.lufs, 1) + ' LUFS']; }).concat([['target', L.target + ' LUFS (±' + (L.tol || 1) + ')']]); },
    check: function (m, st, L) { var d = m.adj.lufs - L.target; return Math.abs(d) <= (L.tol || 1) ? { ok: true, why: [], notes: [m.adj.name + ' now sits at ' + round(m.adj.lufs, 1) + ' LUFS — at the target.'] } : { ok: false, why: [m.adj.name + ' is ' + round(Math.abs(d), 1) + ' LU ' + (d > 0 ? 'louder' : 'quieter') + ' than the target. Gain = target − measured.'] }; },
    draw: function (ctx, m, st, L, t) {
      var W = 800, H = 250; bg(ctx, W, H); var x0 = 60, w = (W - 120) / m.segs.length, y = function (l) { return 30 + (-(l) - 10) * 7; };
      ctx.fillStyle = 'rgba(52,211,153,.15)'; ctx.fillRect(x0, y(L.target + (L.tol || 1)), W - 120, y(L.target - (L.tol || 1)) - y(L.target + (L.tol || 1)));
      ctx.fillStyle = '#34D399'; ctx.fillRect(x0, y(L.target) - 1, W - 120, 2); label(ctx, W - 58, y(L.target) - 4, 'target', '#34D399', 11, 'right');
      m.segs.forEach(function (s, i) { var x = x0 + i * w; ctx.strokeStyle = i === (L.adjust || 1) ? '#FBBF24' : '#7DD3FC'; ctx.lineWidth = 3; ctx.beginPath(); for (var k = 0; k <= 40; k++) { var xx = x + k * w / 40, yy = y(s.lufs + Math.sin(k * 1.7 + t * 3 + i) * 1.6); if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); } ctx.stroke(); label(ctx, x + w / 2, H - 14, s.name + ' · ' + round(s.lufs, 1), '#CBD5E1', 12, 'center'); });
      label(ctx, W - 10, 18, 'ILLUSTRATIVE · target and levels are example values (RT-04)', '#94A3B8', 11, 'right');
    }
  };
  /* Fresnel + rain fade on a microwave hop */
  PHYS.fresnel = {
    h: 280, aria: 'A microwave link between two dishes across a valley, with a ridge in the middle, the first Fresnel zone drawn as an ellipse, and rain crossing the path.',
    model: function (st, L) {
      var D = L.D || 18, f = L.f || 7, d1 = (L.obs || [9, 30])[0], oh = (L.obs || [9, 30])[1], d2 = D - d1;
      var r = 17.32 * Math.sqrt(d1 * d2 / (f * D)), clr = st.h - oh, ratio = clr / r;
      var diff = ratio >= 0.6 ? 0 : ratio >= 0 ? 6 * (1 - ratio / 0.6) : Math.min(30, 6 + 20 * (-ratio));
      var gamma = (L.k || 0.0035) * Math.pow(Math.max(0, st.rain), L.alpha || 1.25), fade = gamma * D;
      return { r: r, clr: clr, ratio: ratio, diff: diff, gamma: gamma, fade: fade, margin: (L.clearMargin || 18) - fade - diff, D: D, d1: d1, oh: oh };
    },
    read: function (m, st, L) { return [['Fresnel radius at the ridge', round(m.r, 1) + ' m'], ['clearance', round(m.clr, 1) + ' m (' + Math.round(m.ratio * 100) + '% of r)'], ['diffraction loss', round(m.diff, 1) + ' dB'], ['rain fade A = γ·d', round(m.gamma, 3) + ' dB/km × ' + m.D + ' km = ' + round(m.fade, 1) + ' dB'], ['fade margin left', round(m.margin, 1) + ' dB']]; },
    check: function (m, st, L) {
      var why = []; if (st.rain < (L.stormRain || 30)) why.push('Test it in the storm: set the rain to at least ' + (L.stormRain || 30) + ' mm/h.');
      if (m.margin < (L.goalMargin || 3)) why.push('Only ' + round(m.margin, 1) + ' dB of margin left; the link needs ≥ ' + (L.goalMargin || 3) + ' dB. ' + (m.ratio < 0.6 ? 'The ridge is inside the Fresnel zone — clear it.' : 'Rain is eating the margin.'));
      return why.length ? { ok: false, why: why } : { ok: true, why: [], notes: ['In ' + st.rain + ' mm/h rain the hop keeps ' + round(m.margin, 1) + ' dB of margin.'] };
    },
    draw: function (ctx, m, st, L, t) {
      var W = 800, H = 280; bg(ctx, W, H); var x0 = 70, x1 = 730, gy = 240, sc = 2.2, px = function (d) { return x0 + d / m.D * (x1 - x0); };
      ctx.fillStyle = '#1E293B'; ctx.beginPath(); ctx.moveTo(x0 - 40, gy); ctx.lineTo(px(m.d1) - 90, gy); ctx.lineTo(px(m.d1), gy - m.oh * sc); ctx.lineTo(px(m.d1) + 90, gy); ctx.lineTo(x1 + 40, gy); ctx.lineTo(x1 + 40, H); ctx.lineTo(x0 - 40, H); ctx.fill();
      var hy = gy - st.h * sc; ctx.fillStyle = '#94A3B8'; ctx.fillRect(x0 - 3, hy, 6, gy - hy); ctx.fillRect(x1 - 3, hy, 6, gy - hy);
      ctx.fillStyle = '#E2E8F0'; ctx.beginPath(); ctx.arc(x0 + 8, hy, 9, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x1 - 8, hy, 9, 0, 7); ctx.fill();
      ctx.strokeStyle = m.ratio >= 0.6 ? 'rgba(52,211,153,.8)' : 'rgba(248,113,113,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, hy, (x1 - x0) / 2, Math.max(2, m.r * sc), 0, 0, 2 * Math.PI); ctx.stroke();
      ctx.strokeStyle = '#FBBF24'; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(x0, hy); ctx.lineTo(x1, hy); ctx.stroke(); ctx.setLineDash([]);
      var n = Math.round(st.rain * 1.2); ctx.strokeStyle = 'rgba(125,211,252,.55)'; ctx.lineWidth = 1.5; for (var i = 0; i < n; i++) { var rx = (i * 97 + t * 180) % W, ry = (i * 53 + t * 300) % (gy - 20); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 4, ry + 12); ctx.stroke(); }
      label(ctx, 400, 26, 'margin ' + round(m.margin, 1) + ' dB', m.margin >= (L.goalMargin || 3) ? '#34D399' : '#F87171', 16, 'center');
      label(ctx, W - 10, H - 8, 'ILLUSTRATIVE · γ = k·Rᵅ toy values (RV-39)', '#94A3B8', 11, 'right');
    }
  };
  /* Shannon capacity with bonded links */
  PHYS.shannon = {
    h: 240, aria: 'Several cellular links bonded together. Each bar is one link’s capacity; the stack must reach the line the encoder needs.',
    model: function (st, L) { var snr = L.snrFixed != null ? L.snrFixed : st.snr, B = L.B || 5, C = B * Math.log2(1 + Math.pow(10, snr / 10)), use = st.n * (L.eff || 0.5) * C; return { snr: snr, C: C, use: use }; },
    read: function (m, st, L) { return [['SNR', m.snr + ' dB (' + round(Math.pow(10, m.snr / 10), 2) + '×)'], ['C = B·log2(1+S/N) per link', round(m.C, 2) + ' Mb/s'], ['usable (' + Math.round((L.eff || 0.5) * 100) + '% × ' + st.n + ' links)', round(m.use, 2) + ' Mb/s'], ['encoder needs', (L.need || 8) + ' Mb/s']]; },
    check: function (m, st, L) { return m.use >= (L.need || 8) ? { ok: true, why: [], notes: [st.n + ' links carry ' + round(m.use, 1) + ' Mb/s — enough.'] } : { ok: false, why: ['Usable capacity ' + round(m.use, 1) + ' Mb/s is below the ' + (L.need || 8) + ' Mb/s the encoder needs.'] }; },
    draw: function (ctx, m, st, L, t) {
      var W = 800, H = 240; bg(ctx, W, H); var x0 = 80, base = 210, maxv = Math.max((L.need || 8) * 1.6, m.use * 1.1), sc = 170 / maxv, per = (L.eff || 0.5) * m.C;
      for (var i = 0; i < st.n; i++) { var y0 = base - i * per * sc; ctx.fillStyle = ['#38BDF8', '#22D3EE', '#34D399', '#A78BFA', '#F472B6', '#FBBF24'][i % 6]; ctx.fillRect(x0, y0 - per * sc, 180, per * sc - 2); label(ctx, x0 + 190, y0 - per * sc / 2 + 4, 'link ' + (i + 1), '#CBD5E1', 12); }
      var ny = base - (L.need || 8) * sc; ctx.fillStyle = '#F8FAFC'; ctx.fillRect(x0 - 20, ny, 360, 2); label(ctx, x0 + 350, ny - 4, 'needs ' + (L.need || 8) + ' Mb/s', '#F8FAFC', 12, 'right');
      for (var k = 0; k < 14; k++) { var px = 520 + (k * 23 + t * 60) % 240, py = 60 + (k * 37) % 140; ctx.fillStyle = 'rgba(148,163,184,.35)'; ctx.fillRect(px, py, 5, 9); }
      label(ctx, 640, 40, 'crowd phones (noise)', '#94A3B8', 12, 'center'); label(ctx, W - 10, H - 8, 'ILLUSTRATIVE · Shannon limit, toy efficiency (RV-39)', '#94A3B8', 11, 'right');
    }
  };
  /* ---------------------------------------------------------------- Season 7 sims (The Estate) */
  /* Polling vs outage length: which outages does a poll every T minutes see? (S07E05) */
  PHYS.poll = {
    h: 270, aria: 'Three hours of a room: red bars are outages, ticks are the monitoring polls. An outage is seen only if a poll lands inside it.',
    model: function (st, L) {
      var span = (L.hours || 3) * 60, outs = [], polls = [], seen = 0, t;
      for (var h = 0; h < (L.hours || 3); h++) outs.push([h * 60 + L.outStart, h * 60 + L.outStart + L.outLen]);
      for (t = st.ph; t < span; t += st.T) polls.push(t);
      outs.forEach(function (o) { o.seen = polls.some(function (p) { return p >= o[0] && p < o[1]; }); if (o.seen) seen++; });
      var load = L.devices * 60 / st.T;
      return { outs: outs, polls: polls, seen: seen, load: load, pOut: Math.min(1, L.outLen / st.T), pReq: Math.min(1, L.dReq / st.T), guaranteed: st.T <= L.dReq };
    },
    read: function (m, st, L) { return [['outages seen (this timing)', m.seen + ' of ' + m.outs.length], ['chance a ' + L.dReq + '-min outage is seen, any timing', Math.round(m.pReq * 100) + '%'], ['polls per hour (' + L.devices + ' devices)', Math.round(m.load).toLocaleString('en-US') + ' / ' + L.budget.toLocaleString('en-US')]]; },
    check: function (m, st, L) {
      if (!m.guaranteed) return { ok: false, why: ['A ' + L.dReq + '-minute outage can still fall between two polls ' + st.T + ' minutes apart (P = ' + Math.round(m.pReq * 100) + '%). The interval must be no longer than the shortest outage that matters.'] };
      if (m.load > L.budget) return { ok: false, why: ['Every outage is seen — but ' + Math.round(m.load).toLocaleString('en-US') + ' polls an hour is more than the monitoring server’s budget of ' + L.budget.toLocaleString('en-US') + '.'] };
      return { ok: true, why: [], notes: ['Any outage of ' + L.dReq + ' minutes or more is now seen, whatever its timing — and the server can keep up. Event-driven alerts still see it sooner.'] };
    },
    draw: function (ctx, m, st, L, t) {
      var W = 800, H = 270; bg(ctx, W, H); var x0 = 40, x1 = 770, span = (L.hours || 3) * 60, sx = function (min) { return x0 + (x1 - x0) * min / span; };
      ctx.fillStyle = '#1E293B'; ctx.fillRect(x0, 90, x1 - x0, 60);
      m.outs.forEach(function (o) { ctx.fillStyle = o.seen ? '#FBBF24' : '#EF4444'; ctx.fillRect(sx(o[0]), 90, sx(o[1]) - sx(o[0]), 60); label(ctx, (sx(o[0]) + sx(o[1])) / 2, 170, o.seen ? 'SEEN' : 'MISSED', o.seen ? '#FDE68A' : '#FCA5A5', 12, 'center'); });
      var sweep = still() ? span : (t * 30) % span;
      m.polls.forEach(function (p) { if (p > sweep) return; ctx.fillStyle = '#22D3EE'; ctx.fillRect(sx(p) - 1.5, 70, 3, 100); });
      for (var h = 0; h <= (L.hours || 3); h++) { ctx.fillStyle = '#475569'; ctx.fillRect(sx(h * 60), 150, 2, 12); label(ctx, sx(h * 60), 196, (L.startHour + h) + ':00', '#94A3B8', 12, 'center'); }
      label(ctx, x0, 40, 'red = outage nobody saw · amber = outage a poll caught · blue ticks = polls', '#CBD5E1', 13);
      label(ctx, W - 10, H - 10, 'ILLUSTRATIVE · polls are instants; an outage is seen only if one lands inside it (RV-151)', '#94A3B8', 11, 'right');
    }
  };
  /* Mains flicker vs camera shutter: the exposure sums the light over the shutter time (S07E07) */
  PHYS.flicker = {
    h: 280, aria: 'A camera frame under lights pulsing at twice the mains frequency. Bands appear unless the shutter holds a whole number of pulses.',
    model: function (st, L) {
      var f = 2 * L.mains, ts = 1 / st.x, n = f * ts, sinc = Math.abs(Math.sin(Math.PI * n) / (Math.PI * n)), depth = L.m * sinc, angle = 360 * st.fps * ts, k = Math.round(f / st.fps), alias = Math.abs(f - k * st.fps);
      return { f: f, ts: ts, n: n, depth: depth, angle: angle, alias: alias };
    },
    read: function (m, st, L) { return [['light pulses', m.f + ' Hz (mains ' + L.mains + ' Hz × 2)'], ['pulses per exposure t·f', round(m.n, 2)], ['band depth', round(m.depth * 100, 1) + '% of brightness'], ['shutter angle', Math.round(m.angle) + '°'], ['bands move at', m.alias < 0.05 ? 'standing still' : round(m.alias, 2) + ' Hz']]; },
    check: function (m, st, L) {
      if (m.angle > 360.5) return { ok: false, why: ['A 1/' + st.x + ' s shutter is longer than one frame at ' + st.fps + ' fps (' + Math.round(m.angle) + '°). The shutter can’t stay open longer than a frame.'] };
      if (m.depth > L.goal) return { ok: false, why: ['Bands ' + round(m.depth * 100, 1) + '% deep: 1/' + st.x + ' s holds ' + round(m.n, 2) + ' light pulses. Make it a whole number.'] };
      return { ok: true, why: [], notes: ['1/' + st.x + ' s holds ' + round(m.n, 2) + ' pulses — the bands average out' + (m.alias < 0.05 ? ', and at ' + st.fps + ' fps they would stand still anyway.' : '.')] };
    },
    draw: function (ctx, m, st, L, t) {
      var W = 800, H = 280; bg(ctx, W, H);
      var fx = 40, fy = 40, fw = 330, fh = 200, per = 1 / st.fps, bandsPerFrame = m.f * per, roll = still() ? 0.25 : (t * Math.min(m.alias, 3) * 0.15) % 1;
      for (var r = 0; r < fh; r += 2) { var b = 0.62 * (1 - m.depth * Math.cos(2 * Math.PI * (r / fh * bandsPerFrame + roll))); var c = Math.round(255 * Math.max(0, Math.min(1, b))); ctx.fillStyle = 'rgb(' + c + ',' + c + ',' + Math.round(c * 0.96) + ')'; ctx.fillRect(fx, fy + r, fw, 2); }
      ctx.strokeStyle = '#05070C'; ctx.lineWidth = 4; ctx.strokeRect(fx, fy, fw, fh); label(ctx, fx + fw / 2, fy + fh + 26, 'THE CAMERA’S FRAME', '#CBD5E1', 12, 'center');
      var gx = 420, gw = 350, gy = 150, span = 0.04, sx = function (tt) { return gx + gw * tt / span; };
      ctx.fillStyle = 'rgba(45,212,191,.22)'; ctx.fillRect(sx(0.005), 50, sx(0.005 + Math.min(m.ts, span - 0.005)) - sx(0.005), 190);
      ctx.beginPath(); for (var i = 0; i <= 300; i++) { var tt = i / 300 * span, y = gy - 70 * (1 + L.m * Math.cos(2 * Math.PI * m.f * tt)) / (1 + L.m) + 20; if (i) ctx.lineTo(sx(tt), y); else ctx.moveTo(sx(tt), y); }
      ctx.strokeStyle = '#FDE68A'; ctx.lineWidth = 2.5; ctx.stroke();
      label(ctx, gx, 44, 'light output over 40 ms · shaded = one exposure', '#CBD5E1', 12); label(ctx, gx + gw / 2, 262, 'exposure 1/' + st.x + ' s = ' + round(m.n, 2) + ' pulses', m.depth > L.goal ? '#FCA5A5' : '#86EFAC', 13, 'center');
      label(ctx, W - 10, 18, 'ILLUSTRATIVE · light following the mains waveform, depth m = ' + L.m + ' (RV-151)', '#94A3B8', 11, 'right');
    }
  };
  /* ---------------------------------------------------------------- Season 8 sims (Topping Out) */
  /* Optical loss budget along three routes, two fiber types (S08E01) */
  PHYS.fiber = {
    h: 290, aria: 'A plan of the building with three fiber routes from the equipment room to the stage rack, and a bar comparing the chosen link’s loss with the optics’ budget.',
    model: function (st, L) { var r = L.routes[st.route], f = L.fibers[st.fiber], att = f.att * r.m / 1000, con = r.conn * L.conn, spl = r.splice * L.splice, loss = att + con + spl; return { r: r, f: f, att: att, con: con, spl: spl, loss: loss, margin: f.budget - loss, reach: r.m <= f.reach }; },
    read: function (m, st, L) { return [['length', m.r.m + ' m'], ['fiber α·d', round(m.att, 2) + ' dB'], ['connectors + splices', round(m.con + m.spl, 2) + ' dB'], ['total loss', round(m.loss, 2) + ' dB'], ['budget · margin', m.f.budget + ' dB · ' + round(m.margin, 2) + ' dB'], ['reach', m.reach ? 'within ' + m.f.reach + ' m' : 'BEYOND ' + m.f.reach + ' m']]; },
    check: function (m, st, L) {
      if (m.r.blocked) return { ok: false, why: [m.r.blocked] };
      if (!m.reach) return { ok: false, why: [m.f.name + ' reaches only ' + m.f.reach + ' m at this speed; this route is ' + m.r.m + ' m.'] };
      if (m.margin < L.needMargin) return { ok: false, why: ['Margin is ' + round(m.margin, 2) + ' dB; the spec asks for at least ' + L.needMargin + ' dB (for ageing, repairs and dirty connectors).'] };
      return { ok: true, why: [], notes: [round(m.loss, 2) + ' dB of loss against a ' + m.f.budget + ' dB budget leaves ' + round(m.margin, 2) + ' dB — the route the drawings promised.'] };
    },
    draw: function (ctx, m, st, L, t) {
      var W = 800, H = 290; bg(ctx, W, H);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.strokeRect(30, 30, 520, 220);
      ctx.fillStyle = '#1E293B'; ctx.fillRect(40, 120, 80, 50); label(ctx, 80, 150, 'MER', '#E2E8F0', 13, 'center');
      ctx.fillStyle = '#1E293B'; ctx.fillRect(460, 120, 80, 50); label(ctx, 500, 146, 'STAGE', '#E2E8F0', 12, 'center'); label(ctx, 500, 162, 'RACK', '#E2E8F0', 12, 'center');
      ctx.fillStyle = 'rgba(239,68,68,.45)'; ctx.fillRect(282, 100, 16, 90); label(ctx, 290, 92, 'DOCK WALL · DEMOLISH', '#FCA5A5', 12, 'center');
      L.routes.forEach(function (r, i) {
        ctx.beginPath(); var p = r.path; ctx.moveTo(p[0][0], p[0][1]); for (var k = 1; k < p.length; k++) ctx.lineTo(p[k][0], p[k][1]);
        var sel = i === st.route; ctx.strokeStyle = sel ? (m.r.blocked ? '#EF4444' : '#FACC15') : '#334155'; ctx.lineWidth = sel ? 5 : 2; ctx.setLineDash(sel ? [] : [6, 6]); ctx.stroke(); ctx.setLineDash([]);
        if (sel && !still()) { var q = (t * 0.4) % 1, n = p.length - 1, seg = Math.min(n - 1, Math.floor(q * n)), f = q * n - seg; ctx.beginPath(); ctx.arc(p[seg][0] + (p[seg + 1][0] - p[seg][0]) * f, p[seg][1] + (p[seg + 1][1] - p[seg][1]) * f, 5, 0, 2 * Math.PI); ctx.fillStyle = '#FEF3C7'; ctx.fill(); }
      });
      var bx = 590, bw = 190, sc = bw / Math.max(7, m.loss + 1); label(ctx, bx, 50, 'LOSS vs BUDGET', '#CBD5E1', 13);
      ctx.fillStyle = '#22D3EE'; ctx.fillRect(bx, 70, m.att * sc, 26); ctx.fillStyle = '#A78BFA'; ctx.fillRect(bx + m.att * sc, 70, (m.con + m.spl) * sc, 26);
      ctx.fillStyle = '#F8FAFC'; ctx.fillRect(bx + m.f.budget * sc, 60, 3, 46); label(ctx, bx + Math.min(bw - 10, m.f.budget * sc), 124, 'budget ' + m.f.budget + ' dB', '#F8FAFC', 12, 'center');
      ctx.fillStyle = m.margin >= L.needMargin && m.reach && !m.r.blocked ? '#34D399' : '#EF4444'; ctx.fillRect(bx, 150, Math.max(0, Math.min(bw, m.margin * sc)), 20);
      label(ctx, bx, 196, 'margin ' + round(m.margin, 2) + ' dB (need ≥ ' + L.needMargin + ')', '#CBD5E1', 12);
      label(ctx, W - 10, H - 8, 'ILLUSTRATIVE · α, 0.75 dB/connector, 0.3 dB/splice (RV-161)', '#94A3B8', 11, 'right');
    }
  };
  /* Heat load vs N+1 cooling (S08E05) */
  PHYS.cooling = {
    h: 260, aria: 'Bars comparing the equipment room’s heat load with its cooling capacity, with all units running and with one unit out.',
    model: function (st, L) { var cap = st.n * L.unit, capOut = (st.n - 1) * L.unit, now = st.out ? capOut : cap; return { cap: cap, capOut: capOut, now: now, btu: L.load * 1000 * 3.412, warm: now < L.load }; },
    read: function (m, st, L) { return [['heat load', L.load + ' kW ≈ ' + Math.round(m.btu).toLocaleString('en-US') + ' BTU/h'], ['capacity, all units', m.cap + ' kW'], ['capacity, one unit out', m.capOut + ' kW'], ['room', m.warm ? 'HEATING UP' : 'holding']]; },
    check: function (m, st, L) { if (m.capOut < L.load) return { ok: false, why: ['With one unit out, ' + m.capOut + ' kW of cooling can’t carry ' + L.load + ' kW of heat. N+1 means the rest still cope.'] }; if (st.n > L.maxUnits) return { ok: false, why: ['Covered — but more units than the mechanical engineer needs; the smallest N+1 set is enough.'] }; return { ok: true, why: [], notes: [st.n + ' units: with one out, ' + m.capOut + ' kW still carries ' + L.load + ' kW. The mechanical engineer of record selects the real units.'] }; },
    draw: function (ctx, m, st, L, t) {
      var W = 800, H = 260; bg(ctx, W, H); var sc = 440 / (5 * L.unit);
      function bar(y, v, col, lab) { ctx.fillStyle = col; ctx.fillRect(160, y, v * sc, 30); label(ctx, 150, y + 21, lab, '#CBD5E1', 12, 'right'); label(ctx, 168 + v * sc, y + 21, v + ' kW', '#F8FAFC', 12); }
      bar(40, L.load, '#F97316', 'heat load'); bar(90, m.cap, '#22D3EE', 'all units'); bar(140, m.capOut, m.capOut >= L.load ? '#34D399' : '#EF4444', 'one unit out');
      ctx.fillStyle = '#F8FAFC'; ctx.fillRect(160 + L.load * sc, 30, 2, 150);
      var th = m.warm ? 0.9 : 0.35, pulse = still() ? 0 : Math.sin(t * 3) * 0.03; ctx.fillStyle = '#1E293B'; ctx.fillRect(700, 40, 24, 140); ctx.fillStyle = m.warm ? '#EF4444' : '#34D399'; ctx.fillRect(700, 40 + 140 * (1 - th - pulse), 24, 140 * (th + pulse));
      label(ctx, 712, 200, m.warm ? 'HEATING' : 'OK', m.warm ? '#FCA5A5' : '#86EFAC', 12, 'center');
      for (var k = 0; k < st.n; k++) { var x = 170 + k * 90, y = 214, off = (st.out && k === st.n - 1); ctx.fillStyle = off ? '#475569' : '#0EA5E9'; ctx.fillRect(x, y, 70, 22); label(ctx, x + 35, y + 16, off ? 'OUT' : 'unit ' + (k + 1), '#05070C', 11, 'center'); }
      label(ctx, W - 10, H - 6, 'ILLUSTRATIVE · 1 W ≈ 3.412 BTU/h (RV-161)', '#94A3B8', 11, 'right');
    }
  };
/** Canvas height for a simulation (the reference's, 300 by default). */
export const physHeight = (sim: string): number => (PHYS[sim] && PHYS[sim].h) || 300;
export const physHas = (sim: string): boolean => !!(PHYS[sim] && PHYS[sim].draw);
/** Draw one frame: the reference model from the state and the lab, then its drawing at time t (seconds); reduced motion draws t = 0. */
export function drawPhysics(ctx: CanvasRenderingContext2D, sim: string, st: Record<string, unknown>, L: Record<string, unknown>, t: number, reduced = false): void {
  const S = PHYS[sim]; if (!S || !S.draw) return; REDUCED = reduced; S.draw(ctx, S.model(st, L), st, L, reduced ? 0 : t);
}
