#!/usr/bin/env node
/**
 * Web renditions of the founder's photograph into apps/website/media/founder/: 320, 640 and 960 px, each as WebP (quality 82) and
 * JPEG (quality 84, progressive). The site reads those sizes in apps/website/src/ui.tsx → FounderPortrait; keep the two in step.
 *
 * CURRENT PHOTOGRAPH (founder, 25 Nov 2026 16:56 and 17:33 CT: "Photo for the founder picture" / "just replace the founder picture with
 * that not the graphics and the founder picture features"; crop approved 26 Nov 2026 04:30 CT): the photograph he supplied on 25 Nov,
 * kept untouched at apps/website/media-src/founder/founder-2026-11-25-supplied.jpg (1449 × 2576, SHA-256 checked below). Its
 * renditions are a CROP AND RESIZE ONLY: the square 1449 × 1449 at offset (0, 380), head and shoulders, the crop he approved; no grade,
 * no mask, no retouching, nothing generated; resized (Lanczos), metadata stripped. The photograph is tagged Display P3: its colours are
 * CONVERTED to sRGB through its own profile (relative colorimetric, lcms; `sRGB.icc` beside this script, Pillow's built-in sRGB, "No
 * copyright, use freely") before the profile is stripped, so the web files show the colour as taken. Stripping the tag without converting
 * (the first version of this script, 26 Nov, found by an independent review) showed the face about 13 % less saturated. Only the photograph changes:
 * the component, frame, sizes, layout and alternative text around it are not touched, and apps/website/src/founder.ts is never edited.
 *
 * PREVIOUS PHOTOGRAPH, kept as a recoverable source: apps/website/media-src/founder/founder-original.webp (supplied 10 Nov 2026,
 * 1440 × 1440). `--previous` remakes the renditions from it with the restrained whole-picture grade it was served with (white balance
 * R × 0.965, G × 1.02, B × 1.03; gamma 1.10; sigmoidal contrast 2.2 at 48 %; unsharp 0 × 1.4, amount 0.35, threshold 0.02);
 * `--previous --no-grade` without the grade.
 *   node apps/website/scripts/portrait.mjs [--previous [--no-grade]]      any other argument is refused
 * Needs ImageMagick (`convert`, `identify`). Every run rewrites docs/media/FOUNDER_PORTRAIT.json.
 */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ARGS = process.argv.slice(2); const bad = ARGS.filter((a) => !['--previous', '--no-grade'].includes(a)).concat(ARGS.includes('--no-grade') && !ARGS.includes('--previous') ? ['--no-grade without --previous (the current photograph is never graded)'] : []);
if (bad.length) { console.error(`refused: ${bad.join(', ')}`); process.exit(2); }
const SRGB = path.join(repo, 'apps/website/scripts/sRGB.icc'); const SRGB_SHA = '65224225657150c0e0e3563322b8bcba1a761298fe9e55ae919394413d22e9b1';
const SOURCES = {
  current: { file: path.join(repo, 'apps/website/media-src/founder/founder-2026-11-25-supplied.jpg'), sha: '9d8aedd073e0ac9be9a40e4f06c7535e8e7c620a1dd4ee52be64187114f1704d', supplied: '2026-11-25', crop: '1449x1449+0+380', grade: false, toSrgb: true },
  previous: { file: path.join(repo, 'apps/website/media-src/founder/founder-original.webp'), sha: '6b63e655f3f46d7d6ead1df9520a72ce1149b7bb3b395ff5f958458fc9aa0239', supplied: '2026-11-10', crop: '', grade: !process.argv.includes('--no-grade'), toSrgb: false },
};
const use = process.argv.includes('--previous') ? SOURCES.previous : SOURCES.current; const source = use.file; const graded = use.grade;
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
for (const s of Object.values(SOURCES)) {
  if (!fs.existsSync(s.file)) { console.error(`${s.file} is missing: restore it from git`); process.exit(2); }
  if (sha(s.file) !== s.sha) { console.error(`${path.basename(s.file)} is not the file the founder supplied (SHA-256 differs): restore it from git before making renditions`); process.exit(1); }
}
if (use.toSrgb && (!fs.existsSync(SRGB) || sha(SRGB) !== SRGB_SHA)) { console.error('apps/website/scripts/sRGB.icc is missing or changed: restore it from git'); process.exit(1); }
const out = path.join(repo, 'apps/website/media/founder'); fs.mkdirSync(out, { recursive: true });
const size = (f) => execFileSync('identify', ['-format', '%w %h', f], { encoding: 'utf8' }).trim().split(' ').map(Number);
const [w, h] = size(source); const side = use.crop ? Number(use.crop.split('x')[0]) : w;
if (use.crop) {   // the crop must be a square inside the picture: ImageMagick would otherwise quietly return a smaller, non-square image
  const [, cw, ch, cx, cy] = /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(use.crop).map(Number);
  if (cw !== ch || cx + cw > w || cy + ch > h) { console.error(`crop ${use.crop} is not a square inside ${w} × ${h}`); process.exit(1); }
}
const SIZES = [320, 640, 960].filter((s) => s <= side);   // never upscaled
const GRADE = ['-channel', 'R', '-evaluate', 'multiply', '0.965', '-channel', 'G', '-evaluate', 'multiply', '1.02', '-channel', 'B', '-evaluate', 'multiply', '1.03', '+channel', '-gamma', '1.10', '-sigmoidal-contrast', '2.2x48%', '-unsharp', '0x1.4+0.35+0.02'];
for (const f of fs.readdirSync(out)) if (/\.(webp|jpe?g)$/.test(f)) fs.rmSync(path.join(out, f));   // earlier renditions are replaced, not kept beside the new ones
const files = {};
for (const s of SIZES) {
  const common = [source, '-auto-orient', ...(use.crop ? ['-crop', use.crop, '+repage'] : []), ...(use.toSrgb ? ['-intent', 'Relative', '-black-point-compensation', '-profile', SRGB] : []), '-colorspace', 'sRGB', ...(graded ? GRADE : []), '-filter', 'Lanczos', '-resize', `${s}x`, '-strip'];
  execFileSync('convert', [...common, '-quality', '82', '-define', 'webp:method=6', path.join(out, `${s}.webp`)]);
  execFileSync('convert', [...common, '-sampling-factor', '4:2:0', '-interlace', 'JPEG', '-quality', '84', path.join(out, `${s}.jpg`)]);
  for (const e of ['webp', 'jpg']) { const f = path.join(out, `${s}.${e}`); const [rw, rh] = size(f); files[`${s}.${e}`] = { width: rw, height: rh, bytes: fs.statSync(f).size, sha256: sha(f) }; }
}
const meta = (s) => { const [sw, sh] = size(s.file); return { kept: path.relative(repo, s.file), supplied: s.supplied, width: sw, height: sh, bytes: fs.statSync(s.file).size, sha256: sha(s.file), note: 'untouched; a recoverable source' }; };
const record = {
  subject: 'Jeremiah Johnson, founder of Empathia Technologies',
  rights: 'The founder confirmed on 10 Nov 2026 that he holds the necessary rights to the photographs, films, music and creative assets he supplied, for authorised use in Empathia. Both photographs here were supplied by him for the website.',
  direction: use === SOURCES.current
    ? 'Founder, 25 Nov 2026 16:56 CT: "Photo for the founder picture"; 17:33 CT: "just replace the founder picture with that not the graphics and the founder picture features". Crop shown to him and approved 26 Nov 2026 04:30 CT. Only the photograph is replaced; the component, frame, sizes, layout and alternative text are unchanged; founder.ts is not edited. Crop and resize only, no retouching, no generated or altered likeness.'
    : 'Founder, 10 Nov 2026: "KEEP MY EXISTING FOUNDER PHOTOGRAPH. DO NOT REPLACE IT." Served with a restrained whole-picture grade only.',
  served: { from: path.relative(repo, source), crop: use.crop ? `${use.crop} (head and shoulders, the crop the founder approved)` : 'none' },
  current: meta(SOURCES.current), previous: meta(SOURCES.previous),
  treatment: graded
    ? 'whole picture only: white balance (R × 0.965, G × 1.02, B × 1.03), exposure (gamma 1.10), tonal balance (sigmoidal contrast 2.2 at 48 %), clarity (unsharp 0 × 1.4, amount 0.35, threshold 0.02); then resized (Lanczos), sRGB, metadata stripped. No crop, no mask, no local edit, no retouching, nothing generated, background unchanged.'
    : `${use.crop ? `cropped to ${use.crop}, ` : ''}${use.toSrgb ? 'colours converted from the embedded Display P3 profile to sRGB (relative colorimetric, black-point compensation), ' : ''}resized (Lanczos), metadata stripped; no grade, no mask, no local edit, no retouching, nothing generated, background unchanged`,
  files, at: new Date().toISOString(),
};
fs.writeFileSync(path.join(repo, 'docs/media/FOUNDER_PORTRAIT.json'), JSON.stringify(record, null, 2) + '\n');
console.log(Object.entries(files).map(([k, v]) => `${k} ${v.width}×${v.height} ${(v.bytes / 1024).toFixed(1)} KiB`).join(' · '));
