/**
 * Video QA, the parts a machine can do (docs/media/VIDEO_QA_PROCESS.md). Pure functions over a scene record: the script, the shot plan,
 * word timings from a transcription of the sound, the captions, and figures measured from the picture file. Nothing here listens or
 * watches: a human still does that, and the record says so. Every function returns rows { check, result, detail } where result is
 * PASS, FAIL or NOT RUN. A row is never PASS without a measurement behind it.
 */
import { spawnSync } from 'node:child_process';

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
/** 0–999 in words, so "29" from a transcription compares with "twenty-nine" in a script. */
export const numberWords = (n) => {
  if (!Number.isInteger(n) || n < 0 || n > 999) return [String(n)];
  if (n < 20) return [ONES[n]];
  if (n < 100) return n % 10 ? [TENS[Math.floor(n / 10)], ONES[n % 10]] : [TENS[n / 10]];
  return [ONES[Math.floor(n / 100)], 'hundred', ...(n % 100 ? numberWords(n % 100) : [])];
};
/** Spoken words only: lower case, no punctuation, hyphens split, digits spelled. */
export const spoken = (text) => String(text).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  .flatMap((w) => (/^\d+$/.test(w) ? numberWords(Number(w)) : [w]));

const row = (check, ok, detail) => ({ check, result: ok === null ? 'NOT RUN' : ok ? 'PASS' : 'FAIL', detail });
const s2 = (n) => n.toFixed(2);

/** Each scripted line against what the transcription heard in its own voice file. */
export const wordsCheck = (lines, heard) => lines.map((l, i) => {
  const h = heard?.[i]; if (!h) return row(`Line ${l.n} words`, null, 'no transcription of this voice file');
  const want = spoken(l.text), got = spoken(h.words.map((w) => w.text).join(' '));
  const same = want.length === got.length && want.every((w, k) => w === got[k]);
  return row(`Line ${l.n} words`, same, same ? `${want.length} of ${want.length} words as scripted` : `scripted "${want.join(' ')}", heard "${got.join(' ')}"`);
});

/** Where each line falls in the joined file: found whole, in script order, inside its own shot, and clear of the next line. */
export const syncCheck = (lines, shots, end, master, { lead = 0.15, tail = 0.25 } = {}) => {
  if (!master) return { rows: [row('Sync of lines to shots', null, 'no transcription of the joined file')], placed: [] };
  const words = master.words.flatMap((w) => spoken(w.text).map((t, k, a) => ({ t, start: w.start + ((w.end - w.start) * k) / a.length, end: w.start + ((w.end - w.start) * (k + 1)) / a.length })));
  const rows = []; const placed = []; let at = 0;
  for (const l of lines) {
    const want = spoken(l.text); const seg = words.slice(at, at + want.length);
    const found = seg.length === want.length && seg.every((w, k) => w.t === want[k]);
    if (!found) { rows.push(row(`Line ${l.n} in the joined file`, false, `expected "${want.join(' ')}" at word ${at + 1}, heard "${seg.map((w) => w.t).join(' ')}"`)); placed.push(null); continue; }
    at += want.length; const from = seg[0].start, to = seg[seg.length - 1].end;
    const shot = shots.find((s) => s.n === l.shot); const next = shots.find((s) => s.n === l.shot + 1); const shotEnd = next ? next.from : end;
    const inside = from >= shot.from + lead && to <= shotEnd - tail;
    placed.push({ n: l.n, from, to, shot: shot.n, shotFrom: shot.from, shotEnd });
    rows.push(row(`Line ${l.n} inside shot ${shot.n}`, inside, `spoken ${s2(from)}–${s2(to)} s; shot ${s2(shot.from)}–${s2(shotEnd)} s; ${s2(from - shot.from)} s after the cut, ${s2(shotEnd - to)} s before the next`));
    if (l.planned !== undefined && l.offset !== undefined) { const d = from - (l.planned + l.offset); rows.push(row(`Line ${l.n} placed as planned`, Math.abs(d) <= 0.2, `first word planned at ${s2(l.planned + l.offset)} s, measured ${s2(from)} s (${d >= 0 ? '+' : ''}${s2(d)} s)`)); }
  }
  rows.push(row('Nothing spoken that is not in the script', at === words.length, at === words.length ? `${words.length} words heard, ${words.length} scripted` : `${words.length - at} extra words after the script: "${words.slice(at).map((w) => w.t).join(' ')}"`));
  const ok = placed.filter(Boolean);
  for (let i = 1; i < ok.length; i++) rows.push(row(`Silence between lines ${ok[i - 1].n} and ${ok[i].n}`, ok[i].from - ok[i - 1].to >= 0.4, `${s2(ok[i].from - ok[i - 1].to)} s`));
  return { rows, placed };
};

const clock = (t) => { const m = /^(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})$/.exec(t.trim()); return m ? Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000 : NaN; };
/** WebVTT cues: [{ from, to, text }]. Throws on a file that is not WebVTT. */
export const parseVtt = (vtt) => {
  const blocks = String(vtt).replace(/\r/g, '').split(/\n{2,}/); if (!/^WEBVTT/.test(blocks[0] || '')) throw new Error('not a WebVTT file');
  return blocks.slice(1).map((b) => b.split('\n').filter(Boolean)).filter((ls) => ls.some((x) => x.includes('-->'))).map((ls) => {
    const i = ls.findIndex((x) => x.includes('-->')); const [a, b] = ls[i].split('-->').map((x) => x.trim().split(/\s+/)[0]);
    return { from: clock(a), to: clock(b), text: ls.slice(i + 1).join(' ') };
  });
};
/**
 * Captions against the voice. A caption appears no more than 0.3 s before its first word and never after it, stays until the last word
 * has been said, lasts at least a second, reads at 17 characters a second or slower, does not overlap the next, and says the script.
 */
export const captionCheck = (vtt, lines, placed, duration, { maxCps = 17, minSeconds = 1, early = 0.3 } = {}) => {
  let cues; try { cues = parseVtt(vtt); } catch (e) { return [row('Captions parse', false, e.message)]; }
  const rows = [row('Captions parse', cues.every((c) => Number.isFinite(c.from) && Number.isFinite(c.to) && c.to > c.from), `${cues.length} cues`)];
  const said = spoken(cues.map((c) => c.text).join(' ')).join(' '), script = spoken(lines.map((l) => l.text).join(' ')).join(' ');
  rows.push(row('Captions say the script', said === script, said === script ? 'word for word' : `captions "${said}"`));
  rows.push(row('Captions in order, none overlapping', cues.every((c, i) => i === 0 || c.from >= cues[i - 1].to), cues.map((c) => `${s2(c.from)}–${s2(c.to)}`).join(' · ')));
  rows.push(row('Captions inside the file', cues.every((c) => c.from >= 0 && c.to <= duration), `last cue ends ${s2(Math.max(...cues.map((c) => c.to)))} s of ${s2(duration)} s`));
  const slow = cues.map((c) => ({ c, cps: c.text.length / (c.to - c.from) }));
  rows.push(row(`Each caption on screen at least ${minSeconds} s`, cues.every((c) => c.to - c.from >= minSeconds), `shortest ${s2(Math.min(...cues.map((c) => c.to - c.from)))} s`));
  rows.push(row(`Reading rate at most ${maxCps} characters a second`, slow.every((x) => x.cps <= maxCps), `fastest ${Math.max(...slow.map((x) => x.cps)).toFixed(1)}`));
  if (!placed?.length || placed.some((p) => !p)) { rows.push(row('Captions timed to the voice', null, 'the lines were not all found in the joined file')); return rows; }
  const up = placed.map((p) => cues.find((q) => q.from <= p.from + 1e-6 && q.to > p.from));      // the cue on screen at the line's first word
  const lead = placed.map((p, i) => (up[i] ? p.from - up[i].from : NaN));
  const stays = placed.map((p) => cues.some((q) => q.from <= p.to && q.to >= p.to));
  rows.push(row('A caption is up when each line starts', up.every(Boolean), lead.map((d, i) => `line ${placed[i].n}: ${Number.isFinite(d) ? `${s2(d)} s before the first word` : 'NONE'}`).join(' · ')));
  rows.push(row(`No caption more than ${early} s ahead of its line`, lead.every((d) => Number.isFinite(d) && d <= early + 1e-6), `largest lead ${s2(Math.max(...lead.filter(Number.isFinite), 0))} s`));
  rows.push(row('A caption is still up when each line ends', stays.every(Boolean), placed.map((p, i) => `line ${p.n}: ${stays[i] ? 'yes' : 'NO'}`).join(' · ')));
  return rows;
};

/** Figures measured from a picture file with ffprobe and ffmpeg. Returns null when the file or the tools are missing. */
export const measurePicture = (file) => {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,pix_fmt,r_frame_rate,width,height,nb_frames:format=duration,size', '-of', 'json', file], { encoding: 'utf8' });
  if (probe.status !== 0) return null; const info = JSON.parse(probe.stdout); const v = info.streams.find((s) => s.codec_type === 'video'); if (!v) return null;
  const run = (vf) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vf', vf, '-an', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const nums = (text, re) => [...text.matchAll(re)].map((m) => +Number(m[1]).toFixed(2));
  const black = run('blackdetect=d=0.05:pix_th=0.10'); const freeze = run('freezedetect=n=0.001:d=1.5'); const scene = run("select='gt(scene,0.08)',showinfo");
  const bs = nums(black, /black_start:([0-9.]+)/g), be = nums(black, /black_end:([0-9.]+)/g); const fs_ = nums(freeze, /freeze_start: ([0-9.]+)/g), fd = nums(freeze, /freeze_duration: ([0-9.]+)/g);
  return {
    codec: v.codec_name, pixel_format: v.pix_fmt, frame_rate: v.r_frame_rate, width: v.width, height: v.height, frames: Number(v.nb_frames), duration: +Number(info.format.duration).toFixed(3), bytes: Number(info.format.size),
    audio_streams: info.streams.filter((s) => s.codec_type === 'audio').length,
    dark_spans: bs.map((from, i) => ({ from, to: be[i] ?? null })), still_spans: fs_.map((from, i) => ({ from, seconds: fd[i] ?? null })), hard_cuts: nums(scene, /pts_time:([0-9.]+)/g),
  };
};

/**
 * The picture figures, judged. Dark spans must each be explained in the record (a product screen, not a dropped frame); no still span
 * may run past the longest hold the shot plan allows; text that carries the scene must stay readable at the sizes it will be watched at.
 */
export const pictureCheck = (p, plan) => {
  if (!p) return [row('Picture file', null, 'not measured (the file is not in this workspace)')];
  const rows = [row('Encoding', p.codec === 'h264' && p.pixel_format === 'yuv420p' && p.frame_rate === `${plan.fps}/1` && p.width === plan.width && p.height === plan.height, `${p.codec}, ${p.pixel_format}, ${p.frame_rate} fps, ${p.width} × ${p.height}, ${p.frames} frames`)];
  rows.push(row('Length as planned', Math.abs(p.duration - plan.seconds) <= 0.2, `${p.duration} s against ${plan.seconds} s planned`));
  const explained = (d) => (plan.explained_dark || []).find((e) => d.from >= e.from - 0.2 && d.to <= e.to + 0.2);
  rows.push(row('No unexplained dark frames', p.dark_spans.every(explained), p.dark_spans.length ? p.dark_spans.map((d) => `${s2(d.from)}–${s2(d.to)} s: ${explained(d)?.why || 'UNEXPLAINED'}`).join(' · ') : 'none found'));
  const longest = Math.max(0, ...p.still_spans.map((x) => x.seconds || 0));
  rows.push(row(`No hold longer than ${plan.longest_hold} s`, longest <= plan.longest_hold, p.still_spans.length ? `longest ${s2(longest)} s; ${p.still_spans.length} holds` : 'no hold over 1.5 s'));
  for (const t of plan.text || []) for (const size of plan.watched_at || []) {
    const px = (t.css_px * size.width) / p.width; rows.push(row(`"${t.what}" readable at ${size.name}`, px >= size.floor_px, `${t.css_px} px in the recording is ${px.toFixed(1)} px at ${size.width} px wide; floor ${size.floor_px} px`));
  }
  return rows;
};

/** What the picture shows and when, against the line that speaks of it: a line may not arrive before its picture, nor long after. */
export const eventCheck = (events, placed, { late = 2 } = {}) => (events || []).map((e) => {
  const p = placed?.find((x) => x && x.n === e.line); if (!p) return row(`Line ${e.line} follows "${e.what}"`, null, 'the line was not found in the joined file');
  const d = p.from - e.at; return row(`Line ${e.line} follows "${e.what}"`, d >= 0 && d <= late, `on screen from ${s2(e.at)} s, line starts ${s2(p.from)} s (${s2(d)} s later; allowed 0 to ${late} s)`);
});

/** The whole record, judged: { rows, counts, verdict }. The verdict is never better than the worst row, and never APPROVED: only a person approves. */
export const judge = (rec, vtt) => {
  const sync = syncCheck(rec.lines, rec.shots, rec.plan.seconds, rec.heard?.master);
  const groups = [
    ['Narration words (each voice file)', wordsCheck(rec.lines, rec.heard?.lines)],
    ['Narration in the joined file', [...sync.rows, ...eventCheck(rec.events, sync.placed)]],
    ['Captions', vtt ? captionCheck(vtt, rec.lines, sync.placed, rec.master?.duration ?? rec.plan.seconds) : [row('Captions', null, 'no caption file')]],
    ['Picture (silent recording)', pictureCheck(rec.picture, rec.plan)],
    ['Needs a person or a tool this workspace lacks', (rec.not_run || []).map((n) => row(n.check, null, n.why))],
  ];
  const all = groups.flatMap(([, rs]) => rs); const counts = { PASS: 0, FAIL: 0, 'NOT RUN': 0 }; for (const r of all) counts[r.result]++;
  const verdict = counts.FAIL ? 'QC_FAILED' : counts['NOT RUN'] ? 'QC_AUTOMATED · NOT REVIEWED BY A PERSON' : 'QC_AUTOMATED';
  return { groups, counts, verdict, placed: sync.placed };
};
