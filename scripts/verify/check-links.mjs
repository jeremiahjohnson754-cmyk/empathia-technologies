#!/usr/bin/env node
/**
 * Every relative link in every tracked Markdown file resolves to a file or folder in the repository (verification item 21).
 * External links (http, https, mailto) are listed but not fetched (this environment has no general web access): NOT_RUN for those.
 *   node scripts/verify/check-links.mjs [out.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const files = execFileSync('git', ['-C', root, 'ls-files', '*.md'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const broken = []; let checked = 0; const external = new Set();
for (const f of files) {
  const text = fs.readFileSync(path.join(root, f), 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const href = m[1];
    if (/^(https?:|mailto:)/.test(href)) { external.add(href); continue; }
    if (href.startsWith('#') || /^[a-z]+:/.test(href)) continue;
    const target = decodeURIComponent(href.split('#')[0]);
    if (!target) continue;
    checked += 1;
    const abs = target.startsWith('/') ? path.join(root, target) : path.resolve(path.dirname(path.join(root, f)), target);
    if (!fs.existsSync(abs)) broken.push({ file: f, link: href });
  }
}
const res = { markdownFiles: files.length, relativeLinksChecked: checked, broken, externalLinks: { count: external.size, result: 'NOT_RUN', why: 'no general web access from this environment' }, result: broken.length ? 'FAIL' : 'PASS' };
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(res, null, 2));
console.log(`${res.result}: ${checked} relative links in ${files.length} Markdown files; ${broken.length} broken; ${external.size} external links NOT_RUN`);
for (const b of broken.slice(0, 40)) console.log(`  broken: ${b.file} → ${b.link}`);
process.exit(broken.length ? 1 : 0);
