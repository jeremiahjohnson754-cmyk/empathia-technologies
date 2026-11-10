/**
 * The offline step of the demo build (apps/demo/build.mjs calls it last, before the build manifest): writes
 *   dist/offline-packs.json  what can be kept on a device beyond the app itself (SIGNAL seasons, the library, narration), with sizes;
 *   dist/sw.js               the offline worker (src/offline/sw.template.js) with this build's shell version and file list.
 * The shell is every file of the app's code. Data that is large and optional (SIGNAL story and art, the library, media) is not in the
 * shell: it is saved when it is first opened, or when the visitor asks to keep a pack.
 * The shell version is a hash of the shell files' own hashes. Every build carries a new build id in the bundle, so every deploy is a
 * new shell version; the worker copies hashed chunks it already holds instead of downloading them again, so a visitor fetches only
 * what changed.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const walk = (d, pre = '') => fs.readdirSync(d).flatMap((f) => (fs.statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f), `${pre}${f}/`) : [`${pre}${f}`]));
// the story's table of contents and review flags are small and belong to the app: the library opens offline and says what is kept
const SHELL_DATA = ['signal/index.json', 'signal/flags.json'];
const NOT_SHELL = (f) => f === 'sw.js' || f === 'BUILD_MANIFEST.json' || f === 'signal-lib.json' || (f.startsWith('signal/') && !SHELL_DATA.includes(f)) || f.startsWith('media/') || f.endsWith('.LEGAL.txt') || f.endsWith('.map');

export function shipOffline(app, dist) {
  // a pack may only name files this build wrote: a missing one stops the build, by name
  const size = (f) => { if (!fs.existsSync(path.join(dist, f))) throw new Error(`an offline pack names a file the build did not write: ${f}`); return fs.statSync(path.join(dist, f)).size; };
  const sum = (fs_) => fs_.reduce((n, f) => n + size(f), 0);
  // packs: the story is kept a season at a time; every season pack carries the shared drawings every chapter needs
  const index = JSON.parse(fs.readFileSync(path.join(dist, 'signal/index.json'), 'utf8'));
  const core = ['signal/defs.svg'];   // the drawings every chapter's art refers to
  const seasons = [...new Set(index.chapters.map((c) => c.season))].sort((a, b) => a - b);
  const packs = [
    ...seasons.map((s) => { const own = index.chapters.filter((c) => c.season === s).flatMap((c) => [`signal/story/${c.id}.json`, `signal/art/${c.id}.json`]);
      return { id: `story-${s}`, kind: 'story', label: s === 0 ? 'SIGNAL story: Prologue' : `SIGNAL story: Season ${s}, ${index.seasons[String(s)]}`, chapters: own.length / 2, files: [...core, ...own], bytes: sum(own), sharedBytes: sum(core) }; }),
    { id: 'library', kind: 'library', label: 'SIGNAL library (the reference lessons behind Learn)', files: ['signal-lib.json'], bytes: size('signal-lib.json'), sharedBytes: 0 },
  ];
  const media = walk(dist).filter((f) => f.startsWith('media/'));
  if (media.length) packs.push({ id: 'narration', kind: 'media', label: 'Tour narration (audio and captions)', files: media, bytes: sum(media), sharedBytes: 0 });
  fs.writeFileSync(path.join(dist, 'offline-packs.json'), JSON.stringify({ schema: 1, packs }, null, 1));

  const shell = walk(dist).filter((f) => !NOT_SHELL(f)).sort();
  for (const must of ['index.html', 'demo.js', 'demo.css', 'manifest.webmanifest', 'offline-packs.json']) if (!shell.includes(must)) throw new Error(`offline shell is missing ${must}`);
  const h = crypto.createHash('sha256');
  for (const f of shell) h.update(f).update('\0').update(crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, f))).digest()).update('\0');
  const version = h.digest('hex').slice(0, 12);
  const template = fs.readFileSync(path.join(app, 'src/offline/sw.template.js'), 'utf8');
  if (!template.includes("'__VERSION__'") || !template.includes('__PRECACHE__')) throw new Error('sw.template.js lost its placeholders');
  fs.writeFileSync(path.join(dist, 'sw.js'), template.replace("'__VERSION__'", JSON.stringify(version)).replace('__PRECACHE__', JSON.stringify(shell)));
  return { version, files: shell.length, bytes: sum(shell), packs: packs.length };
}
