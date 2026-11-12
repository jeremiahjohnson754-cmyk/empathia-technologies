#!/usr/bin/env node
/**
 * Render the Pilot 1 training film (12 Nov 2026): the original console illustration (scene.html) beat by beat, timed to the narration
 * when it is present (narration.mp3, split at its pauses) or to an estimate otherwise, then encoded to H.264 with WebVTT captions whose
 * text is exactly the narration script (beats.json). Outputs, in out/:
 *   pilot1.mp4            the film (with narration when narration.mp3 exists, otherwise silent; the QA record says which)
 *   pilot1-captioned.mp4  the captioned silent version (captions burned in), for rooms and readers without sound
 *   pilot1.vtt            captions · pilot1.txt transcript · poster.jpg · timings.json
 *   node media/training/pilot1/render.mjs
 */
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync, spawnSync } from 'node:child_process'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); const repo = path.resolve(here, '../../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const B = JSON.parse(fs.readFileSync(path.join(here, 'beats.json'), 'utf8')); const beats = B.beats;
const out = path.join(repo, 'apps/demo/public/media/training/pilot1'); const frames = path.join(repo, '.local/pilot1-frames'); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true }); fs.mkdirSync(out, { recursive: true });
const FPS = 30; const narration = path.join(here, 'narration.mp3'); const hasAudio = fs.existsSync(narration);
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// timings: the narration's pauses (the script puts a one-second break between beats) or words ÷ 2.6 + 1 s
let starts = [], total = 0;
if (hasAudio) {
  const dur = Number(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', narration]).trim());
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', narration, '-af', 'silencedetect=noise=-38dB:d=0.6', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1])).filter((t) => t > 0.3 && t < dur - 0.3);
  if (ends.length !== beats.length - 1) throw new Error(`narration has ${ends.length + 1} spoken parts; the script has ${beats.length} beats: retime by hand`);
  starts = [0, ...ends.map((t) => t - 0.15)]; total = dur + 0.8;
} else { let t = 0; for (const b of beats) { starts.push(t); t += b.text.split(/\s+/).length / 2.6 + 1.0; } total = t + 0.5; }
const spans = beats.map((b, i) => ({ n: b.n, from: starts[i], to: i + 1 < beats.length ? starts[i + 1] : total }));
fs.writeFileSync(path.join(out, 'timings.json'), JSON.stringify({ source: hasAudio ? 'narration pauses' : 'estimate (no narration yet)', total, spans }, null, 1));

// frames: 1.4 s of motion per beat at 30 fps, then one held frame for the rest of the beat
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(path.join(here, 'scene.html')).href); await p.evaluate(() => document.fonts.ready);
const list = []; let k = 0;
for (const [i, beat] of beats.entries()) {
  const len = spans[i].to - spans[i].from; const moving = Math.min(len, 1.4); const n = Math.round(moving * FPS);
  for (let f = 0; f < n; f += 1) { await p.evaluate(([bb, tot, t]) => window.setBeat(bb, tot, t), [beat, beats.length, f / FPS]); const file = path.join(frames, `f${String(k++).padStart(5, '0')}.png`); await p.screenshot({ path: file }); list.push([file, 1 / FPS]); }
  list[list.length - 1][1] += Math.max(0, len - n / FPS);
}
await b.close();
fs.writeFileSync(path.join(frames, 'list.txt'), list.map(([f, d]) => `file '${f}'\nduration ${d.toFixed(4)}`).join('\n') + `\nfile '${list[list.length - 1][0]}'\n`);

// captions and transcript: the script's words, nothing else
const ts = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${x.toFixed(3).padStart(6, '0')}`; };
fs.writeFileSync(path.join(out, 'pilot1.vtt'), 'WEBVTT\n\n' + beats.map((bt, i) => `${bt.n}\n${ts(spans[i].from)} --> ${ts(Math.max(spans[i].from + 0.5, spans[i].to - 0.2))}\n${bt.text}\n`).join('\n'));
fs.writeFileSync(path.join(out, 'pilot1.txt'), `${B.title}\n${B.applies}\n${B.illustration}\n\n` + beats.map((bt) => bt.text).join('\n') + '\n');

// encode
const video = ['-f', 'concat', '-safe', '0', '-i', path.join(frames, 'list.txt')];
const enc = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart'];
sh('ffmpeg', ['-y', '-v', 'error', ...video, ...(hasAudio ? ['-i', narration, '-c:a', 'aac', '-b:a', '160k', '-shortest'] : ['-an']), ...enc, path.join(out, 'pilot1.mp4')]);
sh('ffmpeg', ['-y', '-v', 'error', ...video, '-vf', `subtitles=${path.join(out, 'pilot1.vtt')}:force_style='FontName=Inter,FontSize=11,PrimaryColour=&H00FFFFFF,BackColour=&HB0101418,BorderStyle=4,Outline=0,MarginV=22'`, '-an', ...enc, path.join(out, 'pilot1-captioned.mp4')]);
sh('ffmpeg', ['-y', '-v', 'error', '-ss', String(spans[1].from + 1.2), '-i', path.join(out, 'pilot1.mp4'), '-frames:v', '1', '-q:v', '3', path.join(out, 'poster.jpg')]);
console.log(`pilot1: ${total.toFixed(1)} s, ${list.length} frames, ${hasAudio ? 'with narration' : 'silent (no narration yet)'}; ${fs.readdirSync(out).join(', ')}`);
