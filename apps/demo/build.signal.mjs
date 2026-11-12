/**
 * Ships the SIGNAL canon (packages/signal-canon) beside the bundle as dist/signal/**: the story is fetched one chapter at a time and is
 * never part of the JavaScript. Story JSON is copied byte for byte. Panel art is made safe for this site's content policy (style-src
 * 'self'): each panel's one <style> block becomes attributes, and references to the shared sprite file become in-page references,
 * because the player inlines the sprite sheet once. Nothing else in the art is touched; a panel with anything unexpected stops the build.
 */
import fs from 'node:fs'; import path from 'node:path';
import { buildRatingsIndex } from './signal-ratings-index.mjs';
export function shipSignal(repo, dist) {
  const src = path.join(repo, 'packages/signal-canon/data'); const out = path.join(dist, 'signal'); fs.mkdirSync(path.join(out, 'story'), { recursive: true }); fs.mkdirSync(path.join(out, 'art'), { recursive: true });
  const index = JSON.parse(fs.readFileSync(path.join(src, 'story/index.json'), 'utf8')); const stats = JSON.parse(fs.readFileSync(path.join(src, 'stats.json'), 'utf8')); const seasons = JSON.parse(fs.readFileSync(path.join(src, 'seasons.json'), 'utf8'));
  const artIndex = JSON.parse(fs.readFileSync(path.join(src, 'art/index.json'), 'utf8')); let panels = 0;
  for (const c of index) {
    fs.copyFileSync(path.join(src, 'story', `${c.id}.json`), path.join(out, 'story', `${c.id}.json`));
    const art = []; const extra = [];   // panels in reading order: the n-th panel item of the chapter is the n-th entry; any other art closes the chapter
    const alts = JSON.parse(fs.readFileSync(path.join(src, 'story', `${c.id}.json`), 'utf8')).items.filter((i) => i.type === 'panel').map((i) => i.alt);
    for (const p of artIndex.filter((a) => a.chapter === c.id)) { let svg = fs.readFileSync(path.join(src, 'art', p.file), 'utf8');
      const m = svg.match(/<style>\.panel-wash\{fill:(#[0-9A-Fa-f]{3,8})\}text\{font-family:[^}]*\}<\/style>/); if (!m) throw new Error(`SIGNAL art ${p.file}: unexpected style block`);
      svg = svg.replace(m[0], '').replace('class="panel-wash"', `class="panel-wash" fill="${m[1]}"`).replaceAll('href="../defs.svg#', 'href="#').replace(/ aria-labelledby="[^"]*"/, '').replace(/<title[^>]*>[\s\S]*?<\/title>/, '');
      if (/<script|<style|\son[a-z]+=|style="|href="(?!#)|<foreignObject|<iframe|javascript:/i.test(svg)) throw new Error(`SIGNAL art ${p.file}: content this site's policy does not allow`);
      if (/-p\d+$/.test(p.id)) { if (alts[art.length] !== p.alt) throw new Error(`SIGNAL art ${p.file}: does not match panel ${art.length + 1} of ${c.id}`); art.push(svg); panels += 1; } else extra.push({ alt: p.alt, svg }); }
    if (art.length !== (c.counts.panel || 0)) throw new Error(`SIGNAL ${c.id}: ${art.length} art files for ${c.counts.panel} panels`);
    fs.writeFileSync(path.join(out, 'art', `${c.id}.json`), JSON.stringify({ panels: art, closing: extra }));
  }
  // each chapter's playable pieces beside it (restoration, 11 Nov 2026): its gates in reading order with their tier, and the quizzes
  // lessons, drills, live incidents and labs it carries (incident plates not shipped either), taken unchanged from the build package's content bundle. Lesson plates are not shipped (founder's ruling).
  { const app = JSON.parse(fs.readFileSync(path.join(src, 'app-data.json'), 'utf8')); const gates = JSON.parse(fs.readFileSync(path.join(src, 'gates.json'), 'utf8'));
    fs.mkdirSync(path.join(out, 'pieces'), { recursive: true });
    // the ratings engine's data (season reviews, the Story Score and the loadout), restored 11 Nov 2026
    fs.writeFileSync(path.join(out, 'ratings.json'), JSON.stringify(buildRatingsIndex(app)));
    for (const c of index) { const items = JSON.parse(fs.readFileSync(path.join(src, 'story', `${c.id}.json`), 'utf8')).items; const quizzes = {}; const lessons = {}; const drills = {}; const incidents = {}; const labs = {}; const meltdowns = {}; const bosses = {}; const formulas = {}; const tiers = {};
      const g = gates.filter((x) => x.chapter === c.id).map((x) => { const it = items[x.index]; const id = it && (it.type === 'decision' ? it.id : it.type === 'mount' ? it.id : it.type === 'twist' ? it.test_id : null);
        if (id !== x.id) throw new Error(`SIGNAL gates: ${c.id} item ${x.index} is not ${x.kind} ${x.id}`); return { index: x.index, kind: x.kind, id: x.id, tier: x.tier, twist: !!x.twist, core: !!x.core }; });
      const want = (kind, id) => { if (kind === 'quiz') { if (!app.quizzes[id]) throw new Error(`SIGNAL ${c.id}: quiz ${id} missing`); quizzes[id] = app.quizzes[id]; }
        if (kind === 'lesson') { const L = app.lessons[id]; if (!L) throw new Error(`SIGNAL ${c.id}: lesson ${id} missing`); const { plates, ...rest } = L; void plates; lessons[id] = rest; want('quiz', L.quiz); }
        if (kind === 'drill') { if (!app.drills[id]) throw new Error(`SIGNAL ${c.id}: drill ${id} missing`); drills[id] = { ...app.drills[id], id }; }
        if (kind === 'incident') { if (!app.incidents[id]) throw new Error(`SIGNAL ${c.id}: incident ${id} missing`); const { plates, ...rest } = app.incidents[id]; void plates; incidents[id] = { ...rest, id }; }
        if (kind === 'lab') { if (!app.labs[id]) throw new Error(`SIGNAL ${c.id}: lab ${id} missing`); labs[id] = { ...app.labs[id], id }; }
        if (kind === 'meltdown') { if (!app.meltdowns[id]) throw new Error(`SIGNAL ${c.id}: meltdown ${id} missing`); meltdowns[id] = { ...app.meltdowns[id], id }; }
        // boss levels (restored 12 Nov 2026): the run as the package has it (minus its build-time self-check), the formulas its design and cost stages show, and its support tier
        if (kind === 'boss') { const B = app.bosses[id]; if (!B) throw new Error(`SIGNAL ${c.id}: boss ${id} missing`); bosses[id] = { ...B, steps: B.steps.map(({ _check, ...st }) => { void _check; return st; }) }; tiers[id] = app.tierOf[`boss:${id}`] || 2;
          const fx = (k) => { if (!k || formulas[k]) return; if (!app.formulas[k]) throw new Error(`SIGNAL ${c.id}: formula ${k} missing`); formulas[k] = app.formulas[k]; for (const o of app.formulas[k].opts || []) if (!formulas[o] && app.formulas[o]) formulas[o] = app.formulas[o]; };
          for (const st of B.steps) { if (st.type === 'design') (st.f || []).forEach(fx); if (st.type === 'cost') fx(st.f); } } };
      for (const it of items) { if (it.type === 'mount') want(it.kind, it.id); if (it.type === 'twist') want(it.test_kind, it.test_id); }
      fs.writeFileSync(path.join(out, 'pieces', `${c.id}.json`), JSON.stringify({ gates: g, quizzes, lessons, drills, incidents, labs, meltdowns, bosses, formulas, tiers })); } }
  const defs = fs.readFileSync(path.join(src, 'art/defs.svg'), 'utf8'); if (/<script|<style|\son[a-z]+=|style="|href="(?!#)|<foreignObject/i.test(defs)) throw new Error('SIGNAL sprite sheet: content this site\'s policy does not allow');
  fs.writeFileSync(path.join(out, 'defs.svg'), defs); fs.copyFileSync(path.join(src, 'flags.json'), path.join(out, 'flags.json'));
  const cast = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(src, 'cast/characters.json'), 'utf8')).map((p) => [p.id, p.name]));
    // chapter locks (restored 12 Nov 2026, reference gate.js): a chapter opens once every hard and soft gate of the one before is cleared, so the
  // library carries each chapter's hard and soft gates, and which quiz clears each lesson.
  const lockGates = {}; { const gl = JSON.parse(fs.readFileSync(path.join(src, 'gates.json'), 'utf8')); for (const x of gl) if (x.tier !== 'opt') (lockGates[x.chapter] = lockGates[x.chapter] || []).push([x.kind, x.id, x.tier]); }
  const lessonQuiz = {}; { const app0 = JSON.parse(fs.readFileSync(path.join(src, 'app-data.json'), 'utf8')); for (const [k, L] of Object.entries(app0.lessons)) lessonQuiz[k] = L.quiz; }
  fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify({ stats, seasons, cast, lessonQuiz, chapters: index.map((c) => ({ gates: lockGates[c.id] || [], id: c.id, season: c.season, episode: c.episode, title: c.title, kicker: c.kicker, sub: c.sub, level: c.level, tier: c.tier, flags: c.flags.length, panels: c.counts.panel || 0, decisions: c.decisions.length, timed: c.timed_decisions, quest: c.quest ? (c.quest.title || c.quest) : null, boss: !!c.boss, meltdown: !!c.meltdown })) }));
  return { chapters: index.length, panels };
}
