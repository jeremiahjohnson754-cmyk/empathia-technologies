// How two pictures of the same scene differ, measured the way an eye would judge them, and the limits a simplified drawing must meet.
//
// Founder, 24 Nov 2026 21:02: "Claude should define acceptable visual differences based on your quality requirements, rather than
// simply deriving thresholds that accommodate whatever the new implementation produces." So the limits below were written and
// committed BEFORE the simplified crowd was built into a page or measured (commit 572fcf52 on the kept branch wip/lod, 25 Nov 2026
// 03:06 UTC; the first build followed at 03:13 and the first measurement at 03:15, and the limits below are that commit's, unchanged), from the requirements
// ("Preserve full graphical detail for nearby spectators… Preserve crowd density, atmosphere and visual identity… You shouldn't have
// to sacrifice the cinematic experience") and from how well an eye tells two colours and two textures apart. If a drawing fails
// them, the drawing changes. A limit is changed only with its reason written here, and never to fit a result.
//
// What is compared: the whole drawing and the simple one, the same view, the same still moment, the same resolution.
//
//   NEAR      Where nothing is simplified, nothing may differ: zero pixels. "Full graphical detail for nearby spectators" is exact.
//   COLOUR    The picture is cut into blocks of 16 pixels (about 0.4° of the eye at a desk; smaller on a phone, so stricter there)
//             and each block's average colour is compared in CIELAB, where a difference (ΔE*ab) of about 1 is not seen, about 2.3
//             is the least an eye notices side by side (the usual figure for one just-noticeable difference), and about 5 is seen at
//             a glance. Judged ONLY over the blocks in which the two pictures differ at all, so that the sky, the pitch and the city,
//             which are identical, cannot make the crowd look better than it is:
//               the average block            ≤ 1.0   (not seen)
//               99 of every 100 blocks       ≤ 2.3   (at most the least noticeable difference)
//               no block                     ≤ 5.0   (nothing seen at a glance)
//             This is density, brightness and colour identity: fewer or dimmer spectators, or a shift of the home colours, move a
//             block's average.
//   TEXTURE   An average can hide a smear. A crowd must still read as separate people in rows, so in each differing block that has
//             texture in the whole drawing (lightness varies by 2 L* or more), the variation of lightness in the simple drawing is
//             compared with the whole one's. An eye tells two contrasts apart when they differ by roughly a tenth to a fifth:
//               the middle block's ratio     within 0.90 to 1.10
//               95 of every 100 blocks       within 0.80 to 1.25
//   STILL     A still scene stays still: two readings of the simple drawing a moment apart are the same picture (no flicker).
//
// These judge a still picture. Whether the change is seen in motion, as the camera moves across the line between whole and simple,
// is guarded by the band around the line (gl.ts, LOD_BAND) and needs a person's eye on a device: recorded as not yet done.
export const BLOCK = 16;
export const LIMITS = { nearPixels: 0, meanDE: 1.0, p99DE: 2.3, maxDE: 5.0, texturedL: 2, medianContrast: [0.90, 1.10], p95Contrast: [0.80, 1.25] };

const lin = (u) => { const c = u / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
/** sRGB (0 to 255) to CIELAB under D65 */
export function lab(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b); const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047, Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B, Z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const fx = f(X), fy = f(Y), fz = f(Z); return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
export const deltaE = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const quantile = (sorted, q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))] : 0);

/**
 * Compare two RGBA pictures of the same size. Returns what the limits are judged on: how many pixels differ; over the blocks that
 * differ at all, the average, 99th-percentile and largest ΔE of the block averages; and over the textured ones among them, the
 * median ratio of lightness variation (simple over whole) and the share of blocks whose ratio is inside the 95% band.
 */
export function comparePictures(whole, simple, w, h, block = BLOCK) {
  if (whole.length !== w * h * 4 || simple.length !== whole.length) throw new Error('pictures are not the same size');
  let pixels = 0; const des = []; const ratios = []; let blocks = 0;
  for (let by = 0; by + block <= h; by += block) for (let bx = 0; bx + block <= w; bx += block) { blocks += 1; let differs = 0; const sa = [0, 0, 0], sb = [0, 0, 0]; let la = 0, la2 = 0, lb = 0, lb2 = 0; const n = block * block;
    for (let y = by; y < by + block; y++) for (let x = bx; x < bx + block; x++) { const i = (y * w + x) * 4; if (whole[i] !== simple[i] || whole[i + 1] !== simple[i + 1] || whole[i + 2] !== simple[i + 2]) differs += 1;
      for (let k = 0; k < 3; k++) { sa[k] += whole[i + k]; sb[k] += simple[i + k]; } const L1 = lab(whole[i], whole[i + 1], whole[i + 2])[0], L2 = lab(simple[i], simple[i + 1], simple[i + 2])[0]; la += L1; la2 += L1 * L1; lb += L2; lb2 += L2 * L2; }
    pixels += differs; if (!differs) continue;
    des.push(deltaE(lab(sa[0] / n, sa[1] / n, sa[2] / n), lab(sb[0] / n, sb[1] / n, sb[2] / n)));
    const sdA = Math.sqrt(Math.max(0, la2 / n - (la / n) ** 2)), sdB = Math.sqrt(Math.max(0, lb2 / n - (lb / n) ** 2)); if (sdA >= LIMITS.texturedL) ratios.push(sdB / sdA); }
  des.sort((a, b) => a - b); ratios.sort((a, b) => a - b); const [lo, hi] = LIMITS.p95Contrast;
  return { pixels, blocks, differing: des.length, meanDE: des.length ? des.reduce((a, v) => a + v, 0) / des.length : 0, p99DE: quantile(des, 0.99), maxDE: des.length ? des[des.length - 1] : 0,
    textured: ratios.length, medianContrast: ratios.length ? quantile(ratios, 0.5) : 1, contrastInBand: ratios.length ? ratios.filter((r) => r >= lo && r <= hi).length / ratios.length : 1 };
}

/** which limits a comparison breaks: none when the simple drawing is acceptable */
export function verdict(c) {
  const bad = [];
  if (c.meanDE > LIMITS.meanDE) bad.push(`the average block differs by ΔE ${c.meanDE.toFixed(2)} (limit ${LIMITS.meanDE})`);
  if (c.p99DE > LIMITS.p99DE) bad.push(`one block in a hundred differs by ΔE ${c.p99DE.toFixed(2)} or more (limit ${LIMITS.p99DE})`);
  if (c.maxDE > LIMITS.maxDE) bad.push(`a block differs by ΔE ${c.maxDE.toFixed(2)} (limit ${LIMITS.maxDE})`);
  if (c.textured && (c.medianContrast < LIMITS.medianContrast[0] || c.medianContrast > LIMITS.medianContrast[1])) bad.push(`the texture of the middle block is ${c.medianContrast.toFixed(2)} of the whole drawing’s (limits ${LIMITS.medianContrast.join(' to ')})`);
  if (c.textured && c.contrastInBand < 0.95) bad.push(`only ${(c.contrastInBand * 100).toFixed(0)}% of textured blocks keep their texture within ${LIMITS.p95Contrast.join(' to ')} (limit 95%)`);
  return bad;
}
