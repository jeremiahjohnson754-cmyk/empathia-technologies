#!/usr/bin/env node
// Promotes a reviewed batch (one owner review covers the batch's review reel) into the Learn labs' generated-media manifest. Every take
// passes the same rule as promote.mjs (paid period, confirmed non-Beta model, named reviewer, terms URL + date, channel, unchanged bytes).
//   node scripts/media/elevenlabs/promote-batch.mjs --batch=batch1 --reviewed-by="…" --terms-url=… --terms-checked=YYYY-MM-DD --channels=learn
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { ROOT } from './lib.mjs'; import { promotable } from './promote.mjs';
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const dir = path.join(ROOT, '.local/media/elevenlabs', arg('batch')); const gen = JSON.parse(fs.readFileSync(path.join(dir, 'generation.json'), 'utf8'));
const rep = JSON.parse(fs.readFileSync(path.join(dir, 'import-report.json'), 'utf8')); const generatedAt = new Date(gen.generatedAtUnixMs).toISOString().replace(/\.\d+Z$/, 'Z');
const o0 = { reviewedBy: arg('reviewed-by'), termsUrl: arg('terms-url'), termsChecked: arg('terms-checked'), channels: arg('channels').split(',').filter(Boolean) };
const media = path.join(ROOT, 'apps/demo/src/learn/labs/audio/media'); fs.mkdirSync(media, { recursive: true }); const mf = path.join(media, 'generated.json');
const m = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : { format: 'empathia-generated-media/1', rule: 'Only VERIFIED generated media with provenance; the lab re-checks each sha256 on load and labels it AI-generated.', sources: [] };
let ok = 0; const refused = [];
for (const r of rep) {
  const t = gen.takes.find((x) => x.item === r.item); const file = path.join(dir, `${r.item}.norm.mp3`); const bytes = fs.readFileSync(file); const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  const c = { generatedAt, sha256: r.normSha256 }; const why = promotable(c, { model: t.model }, { ...o0, sha256: sha }); if (why.length) { refused.push(`${r.item}: ${why.join('; ')}`); continue; }
  const name = `${r.item}.mp3`; fs.writeFileSync(path.join(media, name), bytes);
  const entry = { id: `gen-${r.item}`, origin: 'generated', kind: r.cls, file: `media/${name}`, sha256: sha, loop: r.cls === 'bed', loopSeconds: r.reloop ? r.reloop.lengthSecs : null,
    loudnessTargetLufs: r.target, measured: { ...r.after, method: 'ffmpeg ebur128 (software meter)' }, mastering: r.reloop ? `re-looped (${r.reloop.curve}, ${r.reloop.crossfadeSecs}s crossfade), one constant gain ${r.gainDb} dB` : `one constant gain ${r.gainDb} dB (${r.boundBy}-bound)`,
    rightsStatus: 'VERIFIED', provider: 'ElevenLabs', plan: 'Starter', planPaidAtGeneration: true, generatedAt, voiceOrModel: t.voice ? `${t.model} · voice ${t.voice}` : t.model,
    text: (JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/media/elevenlabs/jobs', r.cls === 'speech' ? 'learn-intelligibility.json' : 'av-training-sfx.json'), 'utf8')).items.find((i) => i.id === r.item) || {}).text || null,
    generationId: t.gen, flowId: gen.flowId, termsUrl: o0.termsUrl, termsCheckedAt: o0.termsChecked, billingEvidenceRef: 'docs/media/ELEVENLABS_PLAN_EVIDENCE.md', reviewedBy: o0.reviewedBy, channels: o0.channels,
    uiLabel: r.cls === 'speech' ? 'AI-generated voice (synthetic, not a real person)' : 'AI-generated sound effect' };
  m.sources = m.sources.filter((s) => s.id !== entry.id).concat(entry); ok++;
}
fs.writeFileSync(mf, JSON.stringify(m, null, 2) + '\n');
console.log(`promoted ${ok} → ${path.relative(ROOT, mf)}${refused.length ? `\nREFUSED:\n  ${refused.join('\n  ')}` : ''}`);
