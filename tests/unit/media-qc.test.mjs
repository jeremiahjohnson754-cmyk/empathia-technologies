// Video QA, the machine's part (docs/media/VIDEO_QA_PROCESS.md): the checks catch what they claim to catch, and the committed record of
// Film 13 scene 01 is exactly what its measurements say.   node --test tests/unit/media-qc.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { spawnSync } from 'node:child_process';
import { spoken, numberWords, wordsCheck, syncCheck, eventCheck, captionCheck, parseVtt, pictureCheck, judge } from '../../scripts/media/qc-lib.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const dir = path.join(repo, 'docs/media/film-13');
const rec = () => JSON.parse(fs.readFileSync(path.join(dir, 'scene-01.qc.json'), 'utf8')); const vtt = () => fs.readFileSync(path.join(dir, 'scene-01.vtt'), 'utf8');
const results = (rows) => rows.map((r) => r.result); const failed = (rows) => rows.filter((r) => r.result === 'FAIL').map((r) => r.check);

test('MQ-01 figures a transcription writes as digits compare with the words a script spells out', () => {
  assert.deepEqual(numberWords(29), ['twenty', 'nine']); assert.deepEqual(numberWords(30), ['thirty']); assert.deepEqual(numberWords(7), ['seven']); assert.deepEqual(numberWords(132), ['one', 'hundred', 'thirty', 'two']);
  assert.deepEqual(spoken('29 of 32 tests'), spoken('Twenty-nine of thirty-two tests.')); assert.deepEqual(spoken('Empathia: proof'), ['empathia', 'proof']);
});

test('MQ-02 a dropped, changed or added word in a voice file fails that line and no other', () => {
  const r = rec(); assert.ok(results(wordsCheck(r.lines, r.heard.lines)).every((x) => x === 'PASS'));
  const drop = structuredClone(r.heard.lines); drop[1].words.splice(4, 1); assert.deepEqual(failed(wordsCheck(r.lines, drop)), ['Line 2 words']);
  const swap = structuredClone(r.heard.lines); swap[2].words[0].text = '28'; assert.deepEqual(failed(wordsCheck(r.lines, swap)), ['Line 3 words']);
  const add = structuredClone(r.heard.lines); add[3].words.push({ text: 'yet', start: 1.3, end: 1.5 }); assert.deepEqual(failed(wordsCheck(r.lines, add)), ['Line 4 words']);
  assert.equal(wordsCheck(r.lines, undefined)[0].result, 'NOT RUN', 'no transcription is NOT RUN, never PASS');
});

test('MQ-03 a line that runs over its cut, starts on the cut, or is missing from the joined file fails', () => {
  const r = rec(); const ok = syncCheck(r.lines, r.shots, r.plan.seconds, r.heard.master); assert.deepEqual(failed(ok.rows), []); assert.equal(ok.placed.length, 5);
  const late = structuredClone(r.heard.master); for (const w of late.words.slice(2, 11)) { w.start += 0.4; w.end += 0.4; }        // line 2 now ends 9.80 s, after the 9.67 s cut
  assert.ok(failed(syncCheck(r.lines, r.shots, r.plan.seconds, late).rows).includes('Line 2 inside shot 2'));
  const early = structuredClone(r.heard.master); for (const w of early.words.slice(18, 23)) { w.start -= 2.6; w.end -= 2.6; }    // line 4 now starts 16.90 s, before its shot
  assert.ok(failed(syncCheck(r.lines, r.shots, r.plan.seconds, early).rows).includes('Line 4 inside shot 4'));
  const gone = structuredClone(r.heard.master); gone.words.splice(18, 5); const g = syncCheck(r.lines, r.shots, r.plan.seconds, gone);
  assert.ok(failed(g.rows).includes('Line 4 in the joined file')); assert.equal(g.placed[3], null);
  const extra = structuredClone(r.heard.master); extra.words.push({ text: 'Subscribe', start: 26.5, end: 26.9 });
  assert.ok(failed(syncCheck(r.lines, r.shots, r.plan.seconds, extra).rows).includes('Nothing spoken that is not in the script'));
  assert.equal(syncCheck(r.lines, r.shots, r.plan.seconds, undefined).rows[0].result, 'NOT RUN');
});

test('MQ-04 a line that speaks of something before it is on screen fails', () => {
  const r = rec(); const { placed } = syncCheck(r.lines, r.shots, r.plan.seconds, r.heard.master);
  assert.deepEqual(failed(eventCheck(r.events, placed)), []);
  assert.deepEqual(failed(eventCheck([{ what: 'the refusal is on screen', at: 19.9, line: 4 }], placed)), ['Line 4 follows "the refusal is on screen"']);
  assert.deepEqual(failed(eventCheck([{ what: 'the refusal is on screen', at: 16.0, line: 4 }], placed)), ['Line 4 follows "the refusal is on screen"'], 'three and a half seconds late is too late');
});

test('MQ-05 captions: the committed file passes; a late, overlapping, too fast, too short or reworded caption fails', () => {
  const r = rec(); const { placed } = syncCheck(r.lines, r.shots, r.plan.seconds, r.heard.master); const d = r.master.duration;
  assert.deepEqual(failed(captionCheck(vtt(), r.lines, placed, d)), []); assert.equal(parseVtt(vtt()).length, 6);
  const swap = (a, b) => vtt().replace(a, b);
  assert.ok(failed(captionCheck(swap('00:19.400 -->', '00:19.900 -->'), r.lines, placed, d)).includes('A caption is up when each line starts'), 'a caption that arrives after the voice');
  assert.ok(failed(captionCheck(swap('00:19.400 -->', '00:18.000 -->'), r.lines, placed, d)).includes('No caption more than 0.3 s ahead of its line'), 'a caption that gives the answer away');
  assert.ok(failed(captionCheck(swap('--> 00:15.600', '--> 00:14.000'), r.lines, placed, d)).includes('A caption is still up when each line ends'));
  assert.ok(failed(captionCheck(swap('--> 00:10.000', '--> 00:11.500'), r.lines, placed, d)).includes('Captions in order, none overlapping'));
  assert.ok(failed(captionCheck(swap('--> 00:27.000', '--> 00:29.000'), r.lines, placed, d)).includes('Captions inside the file'));
  assert.ok(failed(captionCheck(swap('Two fail.', 'Two failed.'), r.lines, placed, d)).includes('Captions say the script'));
  assert.ok(failed(captionCheck(swap('--> 00:06.500', '--> 00:05.900'), r.lines, placed, d)).includes('Each caption on screen at least 1 s'));
  assert.ok(failed(captionCheck(swap('00:06.500 --> 00:10.000', '00:06.500 --> 00:08.500'), r.lines, placed, d)).includes('Reading rate at most 17 characters a second'));
  const old = 'WEBVTT\n\n00:00.000 --> 00:05.000\nOne label.\n\n00:05.000 --> 00:10.000\nOne record. Twenty-nine of thirty-two tests have their evidence.\n\n00:10.000 --> 00:17.000\nTwenty-seven pass. Three are pending. Two fail.\n\n00:17.000 --> 00:23.000\nSo the answer is no.\n\n00:23.000 --> 00:27.000\nEmpathia. Proof, before acceptance.\n';
  assert.ok(failed(captionCheck(old, r.lines, placed, d)).includes('No caption more than 0.3 s ahead of its line'), 'the first cut of the captions, cut to the shots and not the voice, showed "So the answer is no." 2.5 s early');
  assert.equal(captionCheck('not a caption file', r.lines, placed, d)[0].result, 'FAIL');
});

test('MQ-06 picture: unexplained dark frames, a frozen hold, a wrong size and text too small to read each fail', () => {
  const r = rec(); const base = pictureCheck(r.picture, r.plan); assert.deepEqual(failed(base), [], 'take 2 passes every picture check');
  // take 1 drew the page at its ordinary size: the sentence the scene exists for was 13.5 px in the frame and could not be read on a phone
  const take1 = structuredClone(r.plan); take1.text = [{ what: 'the 27 / 3 / 2 totals', css_px: 26 }, { what: 'the refusal sentence', css_px: 13.5 }];
  assert.deepEqual(failed(pictureCheck(r.picture, take1)), ['"the refusal sentence" readable at a phone held sideways (844 px)']);
  const dark = structuredClone(r.picture); dark.dark_spans.push({ from: 20, to: 20.2 }); assert.ok(failed(pictureCheck(dark, r.plan)).includes('No unexplained dark frames'));
  const frozen = structuredClone(r.picture); frozen.still_spans.push({ from: 5, seconds: 9 }); assert.ok(failed(pictureCheck(frozen, r.plan)).includes('No hold longer than 5 s'));
  const small = structuredClone(r.picture); small.width = 1280; small.height = 720; assert.ok(failed(pictureCheck(small, r.plan)).includes('Encoding'));
  const padded = structuredClone(r.picture); padded.sampled_frames = 27; padded.padded_frames = 22; assert.ok(failed(pictureCheck(padded, r.plan)).includes('The picture fills the frame'), 'the first try at take 2 came out as a small page in a grey frame; the recorder said nothing');
  assert.equal(pictureCheck(null, r.plan)[0].result, 'NOT RUN');
});

test('MQ-07 the verdict is never better than the worst row, a record with nothing measured is not a pass, and no verdict says approved', () => {
  const r = rec(); const f = judge(r, vtt()); assert.equal(f.counts.FAIL, 0); assert.ok(f.counts['NOT RUN'] >= 6); assert.equal(f.verdict, 'QC_AUTOMATED · NOT REVIEWED BY A PERSON', 'take 2: nothing measured fails, and it still is not reviewed');
  const small = structuredClone(r); small.plan.text[1].css_px = 13.5; const j = judge(small, vtt()); assert.equal(j.verdict, 'QC_FAILED', 'one failing row fails the scene (take 1)'); assert.equal(j.counts.FAIL, 1);
  const empty = structuredClone(r); delete empty.heard; empty.picture = null; const e = judge(empty, null); assert.equal(e.counts.PASS, 0, 'nothing measured, nothing passes'); assert.notEqual(e.verdict, 'QC_AUTOMATED');
  for (const v of [j, f, e]) assert.ok(!/APPROVED|HUMAN_REVIEWED/.test(v.verdict.replace('NOT REVIEWED', '')));
  assert.ok(r.not_run.some((n) => /person/i.test(n.check)), 'the record always carries the row only a person can fill');
});

test('MQ-08 the committed QC record is what the measurements say, and the record keeps no signed address or key', () => {
  const c = spawnSync(process.execPath, [path.join(repo, 'scripts/media/film13-scene01-qc.mjs'), '--check'], { cwd: repo, encoding: 'utf8' }); assert.equal(c.status, 0, c.stderr || c.stdout);
  const raw = fs.readFileSync(path.join(dir, 'scene-01.qc.json'), 'utf8') + fs.readFileSync(path.join(dir, 'SCENE_01_QC.md'), 'utf8');
  assert.ok(!/Signature=|security-token|AWSAccessKeyId|oobCode|Expires=/i.test(raw));
});
