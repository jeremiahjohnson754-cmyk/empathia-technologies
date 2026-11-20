// Link previews (founder 19 Nov 2026 06:08: "so we can send and share this all with people"): the cards exist at 1200 × 630, and the
// tags name the image absolutely only when the site knows its public address.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { BRAND, BRAND_DIR, shareMeta } = await import(path.join(repo, 'packages/design-tokens/brand.mjs'));
const jpegSize = (buf) => { for (let i = 2; i < buf.length;) { if (buf[i] !== 0xff) return null; const m = buf[i + 1]; const len = buf.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }; i += 2 + len; } return null; };
test('SH-01 both share cards are 1200 × 630 JPEGs under 200 KB', () => {
  for (const r of ['shareWebsite', 'shareDemo']) { const b = fs.readFileSync(path.join(BRAND_DIR, BRAND[r])); assert.deepEqual(jpegSize(b), { w: 1200, h: 630 }, r); assert.ok(b.length < 200 * 1024, r); }
});
test('SH-02 with a public base the tags carry the absolute image, the page address and the large card; without one, no image', () => {
  const on = shareMeta({ base: 'https://demo.example/', image: 'share-demo.jpg', title: 'T', description: 'D', url: '/' });
  assert.match(on, /og:image" content="https:\/\/demo\.example\/brand\/share-demo\.jpg"/); assert.match(on, /og:url" content="https:\/\/demo\.example\/"/); assert.match(on, /summary_large_image/);
  const off = shareMeta({ base: '', image: 'share-demo.jpg', title: 'T', description: 'D' });
  assert.doesNotMatch(off, /og:image|og:url/); assert.match(off, /twitter:card" content="summary"/);
  assert.match(shareMeta({ base: 'https://x.example', image: 'a.jpg', title: '"<x>' }), /&quot;&lt;x>/);
});
