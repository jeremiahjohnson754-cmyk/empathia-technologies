"""Prepare the voice takes of the website's recorded films for the recorder (scripts/media/record-product-film.mjs --voice=<dir>).

usage: python3 -I scripts/media/qwen-film-takes.py <raw-dir> <out-dir>

<raw-dir>/<KEY>/NN.raw.wav is the one Qwen3-TTS take of step NN of film KEY (scripts/media/qwen-tts-batch.py; the step's own on-screen
words, with ids and initialisms spelled as said). Each is trimmed to 0.05 s before its first sound and 0.1 s after its last
(silencedetect -45 dB), given one gain to -23 LUFS so every line sits at the same level before the mix, and written as
<out-dir>/<KEY>/NN.wav (48 kHz mono PCM). <out-dir>/VOICE.json carries the label every film shows. Nothing here changes a word.
"""
import json, os, re, subprocess, sys

raw, out = sys.argv[1:3]
LABEL = 'AI-generated voice (synthetic, not a real person): Qwen3-TTS preset voice Ryan'
def run(a): return subprocess.run(a, capture_output=True, text=True, check=True)
def dur(f): return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout.strip())
def lufs(f):
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-']).stderr)[-1])
def sil(f):
    e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'silencedetect=n=-45dB:d=0.1', '-f', 'null', '-']).stderr
    return [float(x) for x in re.findall(r'silence_start: ([\d.]+)', e)], [float(x) for x in re.findall(r'silence_end: ([\d.]+)', e)]

report = []
for key in sorted(os.listdir(raw)):
    if not os.path.isdir(os.path.join(raw, key)): continue
    os.makedirs(os.path.join(out, key), exist_ok=True)
    for f in sorted(x for x in os.listdir(os.path.join(raw, key)) if x.endswith('.raw.wav')):
        src = os.path.join(raw, key, f); d = dur(src); st, en = sil(src)
        a = en[0] if st and st[0] < 0.01 and en else 0.0
        b = st[-1] if st and (len(en) < len(st) or en[-1] >= d - 0.01) else d
        a, b = max(0.0, a - 0.05), min(d, b + 0.1)
        g = -23.0 - lufs(src); dst = os.path.join(out, key, f.replace('.raw.wav', '.wav'))
        run(['ffmpeg', '-hide_banner', '-y', '-i', src, '-af', f'atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,volume={g:.2f}dB,aresample=48000',
             '-ac', '1', '-c:a', 'pcm_s16le', '-map_metadata', '-1', dst])
        report.append({'take': f'{key}/{f}', 'raw_s': round(d, 2), 'seconds': round(dur(dst), 2), 'gain_db': round(g, 2)})
json.dump({'label': LABEL, 'model': 'Qwen3-TTS-12Hz-0.6B-CustomVoice', 'speaker': 'ryan', 'licence': 'Apache-2.0 (the model); the takes are the project\'s own output',
           'generated': 'on the project\'s own build machine, one take per line, none chosen by ear yet', 'provenance': 'docs/media/QWEN_TOUR_NARRATION.md'},
          open(os.path.join(out, 'VOICE.json'), 'w'), indent=1)
print(json.dumps({'takes': len(report), 'seconds': round(sum(r['seconds'] for r in report), 1)}))
