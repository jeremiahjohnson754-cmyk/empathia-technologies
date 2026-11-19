"""Generate takes with Qwen3-TTS CustomVoice (preset speakers only; no cloning) from a job list, one take per line, never retried.
usage: TTS_MODEL=<local snapshot of Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice> python -I scripts/media/qwen-tts-batch.py <jobs.json>   jobs: [{"id","say","speaker","out"}]
Loads the model once; skips a job whose output exists; writes <out> (24 kHz wav) and appends one JSON line per take to <jobs>.log."""
import sys, os, json, time
import torch, soundfile as sf
from qwen_tts import Qwen3TTSModel
torch.set_num_threads(os.cpu_count() or 2)
jobs = json.load(open(sys.argv[1]))
log = open(sys.argv[1] + '.log', 'a')
m = Qwen3TTSModel.from_pretrained(os.environ['TTS_MODEL'], device_map='cpu', dtype=torch.float32)
for j in jobs:
    if os.path.exists(j['out']): continue
    os.makedirs(os.path.dirname(j['out']), exist_ok=True)
    t = time.time()
    try:
        wavs, sr = m.generate_custom_voice(text=j['say'], speaker=j['speaker'], language='English')
    except Exception as e:  # recorded, never retried
        log.write(json.dumps({'id': j['id'], 'error': repr(e)[:300]}) + '\n'); log.flush(); continue
    tmp = j['out'] + '.part.wav'
    sf.write(tmp, wavs[0], sr); os.replace(tmp, j['out'])
    dur = len(wavs[0]) / sr
    log.write(json.dumps({'id': j['id'], 'speaker': j['speaker'], 'gen_s': round(time.time() - t, 1), 'audio_s': round(dur, 2), 'sr': sr, 'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}) + '\n'); log.flush()
print('done', flush=True)
