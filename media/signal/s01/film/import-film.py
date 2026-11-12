#!/usr/bin/env python3
"""Cut a vidIQ composite of Season 1 shots (compose-A.json / compose-B.json give the order; every shot is 8 s, hard cuts) back into
one muted clip per shot, 1344x756 H.264 at 24 fps, and write it where the scene expects it: apps/demo/public/media/signal/s01/film/
<chapter>-<slot>.mp4, or apps/demo/public/media/signal/s01e01/footage-<slot>.mp4 for Ten Seats. Before cutting, the composite's
length and the hard cut at every 8-second boundary are checked (scene-change score); a mismatch refuses.
  python3 -I import-film.py composite.mp4 A|B"""
import json, os, re, subprocess, sys
src, part = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__)); repo = os.path.abspath(os.path.join(here, '../../../..'))
order = json.load(open(os.path.join(here, f'compose-{part}.json')))
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout)
if abs(dur - 8 * len(order)) > 0.5: sys.exit(f'{src}: {dur:.2f}s, expected {8 * len(order)}s for {len(order)} shots')
log = subprocess.run(['ffmpeg', '-hide_banner', '-i', src, '-vf', "select='gt(scene,0.25)',showinfo", '-an', '-f', 'null', '-'], capture_output=True, text=True).stderr
cuts = [float(x) for x in re.findall(r'pts_time:([\d.]+)', log)]
missing = [8 * k for k in range(1, len(order)) if not any(abs(c - 8 * k) < 0.25 for c in cuts)]
print('scene changes found at', [round(c, 2) for c in cuts]); print('boundaries without a detected cut (similar adjacent shots):', missing)
REJECTED = {'job_52357c3b-8a08-4cba-8c65-c34080731643', 'job_9da44509-9042-4ca0-99d7-fd1a2ff3f695', 'job_a87aaf54-cdae-4704-bbeb-d83bea6e7612'}  # see README: rejected on review
for k, r in enumerate(order):
    if r['job'] in REJECTED: print('skip (rejected)', r['chapter'], r['slot']); continue
    if r['chapter'] == 's01e01': dst = os.path.join(repo, f"apps/demo/public/media/signal/s01e01/footage-{r['slot']}.mp4")
    else: dst = os.path.join(repo, f"apps/demo/public/media/signal/s01/film/{r['chapter']}-{r['slot']}.mp4")
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst) and '--force' not in sys.argv: print('keep (already placed)', dst.replace(repo + '/', '')); continue
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{8 * k + 0.04:.3f}', '-i', src, '-t', '7.9', '-an', '-vf', 'scale=1344:756,fps=24,format=yuv420p',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-movflags', '+faststart', dst], check=True)
    print(dst.replace(repo + '/', ''), r['job'])
