"""Finish Qwen3-TTS takes for the demo: trim, level, encode, caption at measured pauses, hash, and write the catalogue module.

usage: python3 -I scripts/media/qwen-takes.py <manifest.json> <wav-dir> <out-media-dir> <out-module.ts> <report.json> [words.json]

manifest rows: {id, text, say, sentences?}   text = the words shown (transcript and captions), say = the same words in the spoken
form the model was given (ids and numbers spelled as said), sentences = the display sentences when already split.
Each <wav-dir>/<id>.wav is one take, generated once (scripts/media/qwen-tts-batch.py). Nothing here generates or changes a word.

Per take: leading and trailing silence trimmed to 0.15 s / 0.25 s; one fixed gain to -23 LUFS (EBU R128); mono 24 kHz MP3 at
48 kb/s with metadata stripped; one caption cue per sentence, each boundary placed at a measured pause (silencedetect -45 dB, 0.2 s).
Which pause: the one nearest the end of the sentence's last word as a speech recogniser timed it (words.json: {id: [[word, start, end]]},
times in the raw take; Whisper base.en word timestamps, used only to place cues), or, without word times, nearest the sentence's share
of the line by spoken words. A boundary with no pause within 0.8 s of its target is placed at the target and reported as estimated.
The report also records duration, words per second, the longest pause inside the take and the loudness after encoding.
"""
import difflib, hashlib, json, os, re, subprocess, sys

man_path, wav_dir, out_dir, mod_path, rep_path = sys.argv[1:6]
WORDS = json.load(open(sys.argv[6])) if len(sys.argv) > 6 else {}
VOICE = 'AI-generated voice (synthetic, not a real person) · Qwen3-TTS preset voice Ryan · Qwen3-TTS-12Hz-0.6B-CustomVoice (Apache-2.0)'
NOTE = ('AI-generated voice (synthetic, not a real person). Qwen3-TTS preset voice Ryan, model Qwen3-TTS-12Hz-0.6B-CustomVoice '
        '(Apache-2.0), generated on the project\'s own build machine, one take per line. Not yet chosen by ear. See '
        'docs/media/QWEN_TOUR_NARRATION.md. Cue boundaries at the measured pauses (silencedetect -45 dB) nearest each sentence end.')

def run(args):
    return subprocess.run(args, capture_output=True, text=True, check=True)

def silences(path):
    err = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'silencedetect=n=-45dB:d=0.2', '-f', 'null', '-']).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', err)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)]
    return list(zip(st, en + [None] * (len(st) - len(en))))

def duration(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).stdout.strip())

def lufs(path):
    err = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-']).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', err)[-1])

SPLIT = re.compile(r'(?<=[.!?…])\s+(?=[A-Z“‘(])')
def sentences(t):
    return [s for s in SPLIT.split(t.strip()) if s]

def toks(t):
    return [w for w in re.sub(r"[^a-z0-9' ]+", ' ', t.lower().replace('’', "'")).split() if w]

def word_ends(say_sents, asr):
    """the recogniser's end time of each sentence's last word (raw take times), matched word by word; None where unmatched"""
    said = [w for s in say_sents for w in toks(s)]
    heard, ends = [], []
    for w, _s, e in asr:
        for x in toks(w): heard.append(x); ends.append(e)
    at = {}
    for a, b, n in difflib.SequenceMatcher(None, said, heard, autojunk=False).get_matching_blocks():
        for k in range(n): at[a + k] = ends[b + k]
    out, i = [], -1
    for s in say_sents[:-1]:
        i += len(toks(s)); j = i
        while j >= 0 and j not in at: j -= 1
        out.append(at[j] if j >= 0 and i - j <= 2 and at[j] is not None else None)
    return out

def ts(x):
    h, r = divmod(x, 3600); m, s = divmod(r, 60)
    return f'{int(h):02d}:{int(m):02d}:{s:06.3f}'

rows = json.load(open(man_path, encoding='utf8'))
os.makedirs(out_dir, exist_ok=True)
report, entries = [], []
for r in rows:
    wav = os.path.join(wav_dir, r['id'] + '.wav')
    if not os.path.exists(wav):
        report.append({'id': r['id'], 'missing': True}); continue
    dur0 = duration(wav); sil = silences(wav)
    start = sil[0][1] if sil and sil[0][0] < 0.01 and sil[0][1] else 0.0
    end = sil[-1][0] if sil and (sil[-1][1] is None or sil[-1][1] >= dur0 - 0.01) else dur0
    a, b = max(0.0, start - 0.15), min(dur0, end + 0.25)
    gain = -23.0 - lufs(wav)   # integrated loudness is gated, so the trimmed silence does not move it
    mp3 = os.path.join(out_dir, r['id'] + '.mp3')
    run(['ffmpeg', '-hide_banner', '-y', '-i', wav, '-af', f'atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,volume={gain:.2f}dB',
         '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k', '-map_metadata', '-1', '-id3v2_version', '0', mp3])
    dur = duration(mp3); inner = [(s, e) for s, e in silences(mp3) if e is not None and s > 0.05 and e < dur - 0.05]
    shown = r.get('sentences') or sentences(r['text']); said = sentences(r['say'])
    if len(shown) != len(said): raise SystemExit(f"{r['id']}: {len(shown)} shown sentences but {len(said)} said")
    words = [len(s.split()) for s in said]; total = sum(words)
    heard = word_ends(said, WORDS[r['id']]) if r['id'] in WORDS else [None] * (len(said) - 1)
    cuts, estimated, acc, timed = [], [], 0, 0
    for k in range(len(said) - 1):
        acc += words[k]; target = dur * acc / total
        if heard[k] is not None: target = heard[k] - a; timed += 1
        cand = [((s + e) / 2, abs((s + e) / 2 - target)) for s, e in inner if (s + e) / 2 > (cuts[-1] if cuts else 0) + 0.3]
        best = min(cand, key=lambda c: c[1]) if cand else None
        if best and best[1] <= 0.8: cuts.append(round(best[0], 3))
        else: cuts.append(round(min(max(target, (cuts[-1] if cuts else 0) + 0.5), dur - 0.5), 3)); estimated.append(k + 1)
    bounds = [0.0] + cuts + [round(dur, 3)]
    vtt = ['WEBVTT', '', 'NOTE ' + NOTE, '']
    for k, s in enumerate(shown):
        vtt += [str(k + 1), f'{ts(bounds[k])} --> {ts(bounds[k + 1])}', s, '']
    open(os.path.join(out_dir, r['id'] + '.vtt'), 'w', encoding='utf8').write('\n'.join(vtt))
    sha = hashlib.sha256(open(mp3, 'rb').read()).hexdigest(); after = lufs(mp3)
    longest = max((e - s for s, e in inner), default=0.0)
    report.append({'id': r['id'], 'seconds': round(dur, 2), 'raw_seconds': round(dur0, 2), 'gain_db': round(gain, 2), 'lufs': round(after, 1),
                   'wps': round(len(r['text'].split()) / dur, 2), 'longest_pause': round(longest, 2), 'cues': len(shown), 'word_timed': timed, 'estimated': estimated,
                   'bytes': os.path.getsize(mp3), 'sha256': sha})
    entries.append((r['id'], {'src': f"media/narration/{r['id']}.mp3", 'captions': f"media/narration/{r['id']}.vtt", 'seconds': round(dur, 2),
                    'lufs': round(after, 1), 'transcript': ' '.join(shown), 'voice': VOICE, 'sha256': sha,
                    'source': 'Qwen3-TTS take 1 of its line, one take generated, not yet chosen by ear (preset speaker ryan, language English, '
                              f'default sampling; trimmed, gain {gain:+.1f} dB to -23 LUFS, mono 24 kHz MP3 48 kb/s)'}))
json.dump(report, open(rep_path, 'w'), indent=1)
lines = ['/** Tour narration voiced with Qwen3-TTS (founder 19 Nov 2026 09:48 and 10:12: the missing tour lines). Written by',
         ' *  scripts/media/qwen-takes.py from the takes and their manifest; do not edit by hand. Provenance and checks:',
         ' *  docs/media/QWEN_TOUR_NARRATION.md. */',
         "import type { NarrationTake } from './tours.js';", '', 'export const QWEN_NARRATION: Record<string, NarrationTake> = {']
for k, e in entries:
    lines.append(f'  {json.dumps(k)}: {json.dumps(e, ensure_ascii=False)},')
lines += ['};', '']
open(mod_path, 'w', encoding='utf8').write('\n'.join(lines))
print(json.dumps({'takes': len(entries), 'missing': sum(1 for x in report if x.get('missing')), 'bytes': sum(x.get('bytes', 0) for x in report),
                  'estimated': [x['id'] for x in report if x.get('estimated')], 'long_pauses': [x['id'] for x in report if x.get('longest_pause', 0) > 0.9]}))
