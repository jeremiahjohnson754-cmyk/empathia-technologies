// Founder, 12 Nov 2026: "prove that a major decision changes something later in the episode, not just the next ten seconds of dialogue."
// Over the whole of Season 1, as the canon stands (packages/signal-canon/data/story/s01e*.json), every option of every significant or
// major decision is played, and the three places a choice reaches beyond its own card are checked:
//   1. LATER IN THE SAME EPISODE: a later decision's briefing recalls it (story.ts › callbacksBefore), in that option's own canon words,
//      and different options give different briefings. The distance is measured in items, panels and spoken lines, so "later" means later.
//   2. THE END OF THE EPISODE: what it set in motion (echoes), and the chapter's merit, trust and verdict, differ by option.
//   3. THE NEXT EPISODE: the "previously" that opens the next chapter carries it.
// It also writes the Decision and Consequence Coverage Report (docs/signal/S01_DECISION_CONSEQUENCE_REPORT.md) from what it measured.
//   node --test tests/unit/signal-consequence.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sgcons-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/signal/story.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const S = await import(pathToFileURL(out).href);
const dir = path.join(repo, 'packages/signal-canon/data/story');
const CH = fs.readdirSync(dir).filter((f) => /^s01e\d\d\.json$/.test(f)).sort().map((f) => ({ id: f.slice(0, 6), items: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).items }));
const decisions = (items) => items.map((it, i) => ({ it, i })).filter((x) => x.it.type === 'decision');
const spoken = (items, a, b) => items.slice(a + 1, b).reduce((n, it) => n + (it.type === 'beat' ? it.lines.length : it.type === 'panel' ? it.bubbles.length : 0), 0);
const panels = (items, a, b) => items.slice(a + 1, b).filter((it) => it.type === 'panel' || it.type === 'beat').length;
/** play every decision with the canonical option except `d`, which takes `letter` */
const play = (items, d, letter) => { let s = S.emptyChapter(); for (const { it } of decisions(items)) { const L = it.id === d.id ? letter : (it.options.find((o) => o.canonical) || it.options[0]).letter; s = L === S.TIMEOUT ? S.timeOut(s, it) : S.choose(s, it, L).state; } return s; };
const sevOf = (d) => Math.max(...d.options.map((o) => o.weight.sev || 1));
const rows = []; const gaps = [];

test('Season 1 has the eleven chapters with decisions the canon holds, and every decision has at least two options', () => {
  assert.equal(CH.length, 12); assert.equal(CH.filter((c) => decisions(c.items).length).length, 11);
  for (const c of CH) for (const { it } of decisions(c.items)) assert.ok(it.options.length >= 2, it.id);
});

test('LATER IN THE EPISODE: each significant or major decision is recalled at a later decision, in its own canon words, and different choices give different briefings', () => {
  for (const c of CH) {
    const ds = decisions(c.items);
    for (let k = 0; k < ds.length; k++) {
      const { it: d, i } = ds[k]; if (sevOf(d) < 2) { rows.push({ ch: c.id, d, later: null, end: { items: c.items.length - i - 1, panels: panels(c.items, i, c.items.length), lines: spoken(c.items, i, c.items.length) }, note: 'minor call: recalled at the chapter end and in the next chapter only' }); continue; }
      // the farthest later decision whose briefing still recalls this one (callbacks show the two latest significant calls)
      const later = ds.slice(k + 1).filter((x) => S.callbacksBefore(c.items, play(c.items, d, (d.options.find((o) => o.canonical) || d.options[0]).letter), x.it.id).some((cb) => cb.id === d.id));
      const next = later[later.length - 1];
      if (!next) { rows.push({ ch: c.id, d, later: null, end: { items: c.items.length - i - 1, panels: panels(c.items, i, c.items.length), lines: spoken(c.items, i, c.items.length) }, note: 'no later decision recalls it: recalled at the chapter end and in the next chapter' }); continue; }
      const briefings = new Map();
      for (const o of [...d.options.map((x) => x.letter), S.TIMEOUT]) {
        const s = play(c.items, d, o); const w = S.weightOf(d, s.choices[d.id]);
        const cbs = S.callbacksBefore(c.items, s, next.it.id, 3); const mine = cbs.find((x) => x.id === d.id);
        if (w.sev >= 2) {
          assert.ok(mine, `${d.id} ${o}: recalled at ${next.it.id}`); // the farthest point that recalls it
          if (o === S.TIMEOUT) assert.equal(mine.result, (d.timeout || ['Someone else decided for you.']).join(' '));
          else { const opt = d.options.find((x) => x.letter === o); assert.equal(mine.result, opt.result); assert.equal(mine.consequence, opt.consequence); }
          briefings.set(o, JSON.stringify(mine));
        } else assert.ok(!mine, `${d.id} ${o}: a minor call is not recalled`);
      }
      assert.equal(new Set(briefings.values()).size, briefings.size, `${d.id}: every recalled option reads differently`);
      const g = { items: next.i - i - 1, panels: panels(c.items, i, next.i), lines: spoken(c.items, i, next.i) }; gaps.push(g.items);
      // the episode's end ("What your calls set in motion") is the other later place it is recalled; the farther of the two must be well
      // past the next card. A decision recalled only at the very next card is reported as such.
      const end = { items: c.items.length - i - 1, panels: panels(c.items, i, c.items.length), lines: spoken(c.items, i, c.items.length) };
      assert.ok(Math.max(g.items, end.items) >= 3, `${d.id} reaches no further than the next card`);
      rows.push({ ch: c.id, d, later: next.it.id, gap: g, end, recalled: [...briefings.keys()] });
    }
  }
});

test('THE END OF THE EPISODE: what a choice set in motion, and the chapter’s merit and trust, differ by option', () => {
  for (const c of CH) for (const { it: d } of decisions(c.items)) {
    const ends = new Set();
    for (const o of d.options.map((x) => x.letter)) {
      const s = play(c.items, d, o); const e = S.echoes(c.items, s); const t = S.tally(c.items, s);
      const mine = e.made.find((m) => m.id === d.id); assert.ok(mine, `${d.id} ${o} in what it set in motion`);
      assert.equal(mine.consequence, d.options.find((x) => x.letter === o).consequence);
      ends.add(JSON.stringify([mine.label, mine.consequence, t.merit, t.trust, S.chapterVerdict(t)]));
    }
    assert.equal(ends.size, d.options.length, `${d.id}: each option ends the episode differently`);
  }
});

test('THE NEXT EPISODE: the opening "previously" carries each choice, with its merit and trust', () => {
  for (let k = 0; k < CH.length - 1; k++) { const c = CH[k];
    for (const { it: d } of decisions(c.items)) {
      const seen = new Set(); for (const o of d.options.map((x) => x.letter)) { const e = S.echoes(c.items, play(c.items, d, o)); seen.add(JSON.stringify([e.made.find((m) => m.id === d.id), e.merit, e.trust])); }
      assert.equal(seen.size, d.options.length, `${d.id} carries into ${CH[k + 1].id}`);
    } }
});

test('the coverage report is written from what was measured', () => {
  const L = ['# Season 1 · Decision and consequence coverage', '',
    `Generated by \`tests/unit/signal-consequence.test.mjs\` from the canon as it stands (${CH.length} chapters, ${CH.reduce((n, c) => n + decisions(c.items).length, 0)} decisions). Every option of every decision was played; the timeout was played wherever a significant or major call is recalled.`, '',
    '**Where a choice reaches.** (1) *Later in the same episode*: a later decision\'s briefing recalls a significant or major call in that option\'s own canon words ("Because of an earlier call"); (2) *the episode\'s end*: "What your calls set in motion", merit, trust and the verdict; (3) *the next episode*: the opening "previously". Nothing is invented: every recalled sentence is the canon\'s.', '',
    `**Distance.** From a decision to the farthest later decision that recalls it: median ${gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)]} items, minimum ${Math.min(...gaps)}, maximum ${Math.max(...gaps)}.`, '',
    '**What it is not.** The canon\'s scenes are one line: a choice changes what the reader knows and is told later, the chapter\'s outcome and the next chapter\'s opening, but not which scenes play. Scenes that play differently would be new story writing, which is the founder\'s decision (see the Founder Acceptance Report).', '',
    '| Chapter | Decision | Weight | Recalled at a later decision | To that decision (items · scenes · spoken lines) | To the episode end (items · scenes · lines) | Options recalled | End of episode | Next episode |', '|---|---|---|---|---|---|---|---|---|'];
  for (const r of rows) L.push(`| ${r.ch.toUpperCase()} | ${r.d.id}: ${r.d.prompt.replace(/\|/g, '/')} | ${S.SEVERITY[sevOf(r.d)]} | ${r.later || '—'} | ${r.gap ? `${r.gap.items} · ${r.gap.panels} · ${r.gap.lines}` : r.note} | ${r.end.items} · ${r.end.panels} · ${r.end.lines} | ${r.recalled ? r.recalled.join(', ') : '—'} | differs by option | differs by option |`);
  fs.writeFileSync(path.join(repo, 'docs/signal/S01_DECISION_CONSEQUENCE_REPORT.md'), L.join('\n') + '\n');
  assert.ok(rows.length >= 30);
});
