// The recipe a working engineer dials into each SIGNAL challenge, per level: the reference QA's own (tools/chaltest.py), each one
// verified there to score 100/100 ★★★. Shared by the challenge and boss unit tests. `C` is the bundled challenges module.
export const recipes = (C) => ({
  'hear-comp': (lv) => (lv <= 2 ? { thr: -30, ratio: 2, att: 5, rel: 80, knee: 3, mk: 4 } : { thr: -30, ratio: 2.5, att: 15, rel: 100, knee: 3, mk: 4 }),
  'hear-eq': (lv) => { const o = {}; let k = 1; for (const b of C.Hear.guitarBad(lv)) { if (b[0] === 'hs') { o.hsf = b[1]; o.hs = -b[2]; } else { o[`p${k}f`] = b[1]; o[`p${k}g`] = -b[2]; o[`p${k}q`] = b[3]; k += 1; } } return o; },
  'see-focus': (lv) => ({ sf: 2.5, wb: 3200, ...(lv === 1 ? { N: 2.8, sh: 60, iso: 400, nd: 0 } : lv === 2 ? { N: 4, sh: 60, iso: 800, nd: 0 } : { fps: 24, fl: 50, N: 2.8, sh: 60, iso: 800, nd: 1 }) }),
  'see-moire': (lv) => ({ st: 3, g: 1.5, f: lv <= 2 ? 24 : 35, N: 1.4, sf: 3 }),
  'see-promo': (lv) => { const p = lv === 1 ? ['#111827', '#FACC15', '#F8FAFC', '#F97316'] : lv === 2 ? ['#14213D', '#F8FAFC', '#E2E8F0', '#F59E0B'] : ['#111827', '#FACC15', '#F8FAFC', '#FF2E88']; return { bg: p[0], hd: p[1], bd: p[2], ac: p[3] }; },
  'reach-light': (lv) => ({ fx: lv === 1 ? 'fres' : 'mhw', pos: 'foh', dy: lv === 1 ? 0 : 4.5, zoom: lv === 1 ? 25 : 20, cct: lv >= 3 ? 3200 : 5600, ...(lv >= 2 ? { hicri: true } : {}), ...(lv >= 3 ? { back: true, br: 70 } : {}) }),
  'build-studio': (lv) => ({ iface: 'i2', mic: 'ldc', comp: 'lapt', daw: 'daw', mon: 'closed', cable: 'xlr', floor: 'carpet', panels: 8, traps: 4, sofa: true, ...(lv >= 2 ? { behind: true, sides: true } : {}), fs: 48000, buf: 128, phantom: true, pop: true }),
  'build-stream': (lv) => ({ src: 'pc', cap: 'none', mic: 'usbdyn', cam: 'web', light: 'key', net: 'eth', res: lv >= 3 ? '720p30' : '720p60', br: lv >= 3 ? 3500 : 4500, enc: 'hw', kf: 2, ab: 160, mic_l: -16, game: -26, ...(lv >= 2 ? { off: 55 } : {}), ...(lv >= 3 ? { key: false } : {}) }),
  'build-rf': (lv) => Object.fromEntries((lv === 1 ? [518, 523.05, 524.95, 540.1] : lv === 2 ? [518, 523.05, 530.775, 535.5, 536.05, 540.1] : [518, 523.05, 530.775, 533.25, 535, 535.5, 537.6, 540.1]).map((f, i) => [`f${i}`, f])),
  'record-take': () => ({ phantom: true, d: 15, g: 30, pop: true, fan: false, room: 'treated', mon: 'closed' }),
  'record-panel': (lv) => { const o = { pat: 'card', auto: true }; for (let i = 0; i < [0, 3, 4, 5, 5][lv]; i += 1) { o[`d${i}`] = 25; o[`g${i}`] = Math.min(60, Math.round((-20 - ([62, 56, 66, 58, 60][i] + 12.04 - 147.8)) * 2) / 2); } return o; },
  'record-loud': (lv) => ({ g0: 2, g1: -7, g2: -10, g3: -11, g5: 1, g6: -12, ...(lv >= 2 ? { std: 'a85' } : {}), ...(lv >= 3 ? { lim: true, ceil: -2 } : {}) }),
});
