#!/usr/bin/env node
/**
 * Web renditions of the founder's photograph into apps/website/media/founder/: 320, 640 and 960 px, each as WebP (quality 82) and
 * JPEG (quality 84, progressive).
 *
 * The ORIGINAL is kept untouched in the repository as the recoverable source: apps/website/media-src/founder/founder-original.webp
 * (the file the founder supplied on 2026-11-10; its SHA-256 is checked below and recorded in docs/media/FOUNDER_PORTRAIT.json).
 * Only the derivatives are treated, and only as a whole picture (founder, 2026-11-10: a professional, restrained grade is allowed;
 * his face, features, pose and likeness are not to be altered, nothing generated, no background replaced):
 *   - white balance  red × 0.965, green × 1.02, blue × 1.03        (a slightly cooler balance)
 *   - exposure       gamma 1.10                                    (a small lift)
 *   - tonal balance  sigmoidal contrast 2.2 at 48 %                (gentle)
 *   - clarity        unsharp mask, radius 0 × sigma 1.4, amount 0.35, threshold 0.02
 * Every step acts on every pixel alike: there is no mask, no local edit, no retouching, no crop. Then: resize (Lanczos), sRGB,
 * metadata stripped. `--no-grade` writes the renditions from the original with the resize alone.
 *   node apps/website/scripts/portrait.mjs [--source=/path/to/picture] [--no-grade]
 * Needs ImageMagick (`convert`, `identify`). The site reads the sizes in apps/website/src/ui.tsx → FounderPortrait; keep the two in step.
 */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ORIGINAL = path.join(repo, 'apps/website/media-src/founder/founder-original.webp'); const ORIGINAL_SHA = '6b63e655f3f46d7d6ead1df9520a72ce1149b7bb3b395ff5f958458fc9aa0239';
const source = (process.argv.find((a) => a.startsWith('--source=')) || '').slice(9) || ORIGINAL; const graded = !process.argv.includes('--no-grade');
if (!fs.existsSync(source)) { console.error(`${source} is missing`); process.exit(2); }
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
if (source === ORIGINAL && sha(ORIGINAL) !== ORIGINAL_SHA) { console.error('founder-original.webp is not the file the founder supplied (SHA-256 differs): restore it from git before making renditions'); process.exit(1); }
const out = path.join(repo, 'apps/website/media/founder'); fs.mkdirSync(out, { recursive: true });
const size = (f) => execFileSync('identify', ['-format', '%w %h', f], { encoding: 'utf8' }).trim().split(' ').map(Number);
const [w, h] = size(source);
const SIZES = [320, 640, 960].filter((s) => s <= w);   // never upscaled
const GRADE = ['-channel', 'R', '-evaluate', 'multiply', '0.965', '-channel', 'G', '-evaluate', 'multiply', '1.02', '-channel', 'B', '-evaluate', 'multiply', '1.03', '+channel', '-gamma', '1.10', '-sigmoidal-contrast', '2.2x48%', '-unsharp', '0x1.4+0.35+0.02'];
for (const f of fs.readdirSync(out)) if (/\.(webp|jpe?g)$/.test(f)) fs.rmSync(path.join(out, f));   // earlier renditions are replaced, not kept beside the new ones
const files = {};
for (const s of SIZES) {
  const common = [source, '-auto-orient', '-colorspace', 'sRGB', ...(graded ? GRADE : []), '-filter', 'Lanczos', '-resize', `${s}x`, '-strip'];
  execFileSync('convert', [...common, '-quality', '82', '-define', 'webp:method=6', path.join(out, `${s}.webp`)]);
  execFileSync('convert', [...common, '-sampling-factor', '4:2:0', '-interlace', 'JPEG', '-quality', '84', path.join(out, `${s}.jpg`)]);
  for (const e of ['webp', 'jpg']) { const f = path.join(out, `${s}.${e}`); const [rw, rh] = size(f); files[`${s}.${e}`] = { width: rw, height: rh, bytes: fs.statSync(f).size, sha256: sha(f) }; }
}
const record = {
  subject: 'Jeremiah Johnson, founder of Empathia Technologies',
  rights: 'The founder confirmed on 10 Nov 2026 that he holds the necessary rights to the photographs, films, music and creative assets he supplied, for authorised use in Empathia. This photograph is one of them, supplied by him for the website.',
  direction: 'Founder, 10 Nov 2026: "KEEP MY EXISTING FOUNDER PHOTOGRAPH. DO NOT REPLACE IT." His face, likeness and pose are preserved; grading, lighting, tonal balance and clarity only; no generated version; the original is kept as a recoverable source asset.',
  original: { kept: path.relative(repo, ORIGINAL), width: w, height: h, bytes: fs.statSync(source).size, sha256: sha(source), note: 'untouched; the recoverable source of every rendition' },
  treatment: graded
    ? 'whole picture only: white balance (R × 0.965, G × 1.02, B × 1.03), exposure (gamma 1.10), tonal balance (sigmoidal contrast 2.2 at 48 %), clarity (unsharp 0 × 1.4, amount 0.35, threshold 0.02); then resized (Lanczos), sRGB, metadata stripped. No crop, no mask, no local edit, no retouching, nothing generated, background unchanged.'
    : 'whole picture, resized (Lanczos), sRGB, metadata stripped; no grade, no crop, no retouching',
  files, at: new Date().toISOString(),
};
fs.writeFileSync(path.join(repo, 'docs/media/FOUNDER_PORTRAIT.json'), JSON.stringify(record, null, 2) + '\n');
console.log(Object.entries(files).map(([k, v]) => `${k} ${v.width}×${v.height} ${(v.bytes / 1024).toFixed(1)} KiB`).join(' · '));
