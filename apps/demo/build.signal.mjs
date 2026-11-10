/**
 * Ships the SIGNAL canon (packages/signal-canon) beside the bundle as dist/signal/**: the story is fetched one chapter at a time and is
 * never part of the JavaScript. Story JSON is copied byte for byte. Panel art is made safe for this site's content policy (style-src
 * 'self'): each panel's one <style> block becomes attributes, and references to the shared sprite file become in-page references,
 * because the player inlines the sprite sheet once. Nothing else in the art is touched; a panel with anything unexpected stops the build.
 */
import fs from 'node:fs'; import path from 'node:path';
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
  const defs = fs.readFileSync(path.join(src, 'art/defs.svg'), 'utf8'); if (/<script|<style|\son[a-z]+=|style="|href="(?!#)|<foreignObject/i.test(defs)) throw new Error('SIGNAL sprite sheet: content this site\'s policy does not allow');
  fs.writeFileSync(path.join(out, 'defs.svg'), defs); fs.copyFileSync(path.join(src, 'flags.json'), path.join(out, 'flags.json'));
  const cast = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(src, 'cast/characters.json'), 'utf8')).map((p) => [p.id, p.name]));
  fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify({ stats, seasons, cast, chapters: index.map((c) => ({ id: c.id, season: c.season, episode: c.episode, title: c.title, kicker: c.kicker, sub: c.sub, level: c.level, tier: c.tier, flags: c.flags.length, panels: c.counts.panel || 0, decisions: c.decisions.length, timed: c.timed_decisions, quest: c.quest ? (c.quest.title || c.quest) : null, boss: !!c.boss, meltdown: !!c.meltdown })) }));
  return { chapters: index.length, panels };
}
