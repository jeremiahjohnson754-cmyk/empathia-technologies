#!/usr/bin/env python3
"""Split a SIGNAL take into its canon lines at the generation's 1.5 s breaks (silences of 1.3 s or more; a shorter pause is a breath
inside a line), normalise each to -18 LUFS (linear, from the whole take's measurement) and write <out>/<who>-<n>.mp3. Refuses when the
number of parts differs from the number of lines the take was generated from.   python3 -I split.py take.mp3 lines.json who first_n outdir"""
import json, re, subprocess, sys
src, lines_f, who, first, out = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]
lines = json.load(open(lines_f, encoding='utf8'))
log = subprocess.run(['ffmpeg', '-hide_banner', '-i', src, '-af', 'silencedetect=noise=-38dB:d=1.3', '-f', 'null', '-'], capture_output=True, text=True).stderr
st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]; en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout)
pairs = [(s, e) for s, e in zip(st, en) if 0.3 < s and e < dur - 0.3]
cuts = [0.0] + [e - 0.15 for _, e in pairs]; ends = [s + 0.15 for s, _ in pairs] + [dur]
if len(cuts) != len(lines): sys.exit(f'{src}: {len(cuts)} parts, {len(lines)} lines; retime by hand')
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', src, '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex('{'):])
ln = f"loudnorm=I=-18:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
for k, (a, b) in enumerate(zip(cuts, ends)):
    dst = f'{out}/{who}-{first + k}.mp3'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-af', ln + ',afade=t=in:d=0.02', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '160k', dst], check=True)
    print(f'{dst}\t{b - a:.2f}s\t{lines[k][:60]}')
