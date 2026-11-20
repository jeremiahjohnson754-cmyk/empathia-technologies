// 70-0: the connectors attached to the engineering session are tools, not product integrations (docs/surpass/CONNECTOR_INVENTORY.md).
// Neither public app names one of them. Tally is the exception by design: it is the disclosed processor of the website's enquiry form,
// named on the page that discloses it, and is therefore left out of the list. A generated-media provenance line (the narration's
// "AI-generated voice … ElevenLabs …" disclosure) names the tool that made the file, which is disclosure, not an integration claim.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const NAMES = ['Figma', 'Postman', 'Supabase', 'Sentry', 'Netlify', 'Lovable', 'Framer', 'Webflow', 'Superhuman', 'Canva', 'Mobbin', 'vidIQ', 'TinyFish', 'ElevenLabs', 'Firecrawl', 'Hive', 'BioRender', 'Bitly', 'HeyGen', 'HyperFrames', 'Splice', 'Shutterstock'];
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => { const p = path.join(dir, e.name); return e.isDirectory() ? files(p) : /\.(tsx?|json|html|css|md)$/.test(e.name) ? [p] : []; });
for (const app of ['apps/website/src', 'apps/demo/src']) {
  test(`${app} names no engineering connector as if it were part of the product`, () => {
    const hits = [];
    for (const f of files(path.join(root, app))) { for (const line of fs.readFileSync(f, 'utf8').split('\n')) { if (/voice: 'AI-generated voice \(synthetic, not a real person\)/.test(line)) continue; for (const n of NAMES) if (new RegExp(`\\b${n}\\b`).test(line)) hits.push(`${path.relative(root, f)}: ${n}`); } }
    assert.deepEqual(hits, []);
  });
}
