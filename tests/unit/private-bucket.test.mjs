// The durable copy of the private assets (founder, 17 Nov 2026: "a private, versioned object-storage bucket with access limited to
// the build pipeline and authorized founders… encrypted backup copies and checksum verification. Never make those films public
// simply to simplify build provisioning."). These checks use a stand-in bucket in this process and synthetic files: no account,
// no credential, no private file. What they cannot show is a real provider accepting the requests; that is stated in the document.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import crypto from 'node:crypto';
import { spawn } from 'node:child_process'; import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tool = path.join(repo, 'scripts/private/founder-studio-assets.mjs');
const { sign, bucketConfig } = await import(path.join(repo, 'scripts/private/s3.mjs'));
const { makeBackup, restoreBackup } = await import(path.join(repo, 'scripts/private/backup.mjs'));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'empathia-bucket-'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const SECRET = 'stand-in-secret-' + crypto.randomBytes(12).toString('hex'); const KEYID = 'STANDINKEYID';

// ---- a stand-in bucket: checks every signature the way a provider would, keeps versions, and answers the two settings asked about
const S = { versioning: 'Enabled', block: 4, isPublic: false, objects: new Map(), seen: [], badSignatures: 0 };
const server = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c); const body = Buffer.concat(chunks); const u = new URL(req.url, `http://${req.headers.host}`);
  const key = decodeURIComponent(u.pathname.replace(/^\/[^/]+\//, '')); const auth = req.headers.authorization || '';
  S.seen.push({ method: req.method, key, signed: !!auth, sse: req.headers['x-amz-server-side-encryption'] || '', checksum: req.headers['x-amz-checksum-sha256'] || '' });
  const deny = (code, why) => { res.writeHead(code, { 'content-type': 'application/xml' }); res.end(`<Error><Code>${why}</Code></Error>`); };
  if (!auth) { const o = S.objects.get(key); if (S.isPublic && o && req.method === 'GET') { res.writeHead(206); res.end(o.body.subarray(0, 1)); } else deny(403, 'AccessDenied'); return; }
  const signed = (/SignedHeaders=([^,]+)/.exec(auth) || [])[1].split(';'); const headers = Object.fromEntries(signed.filter((n) => !['host', 'x-amz-date', 'x-amz-content-sha256'].includes(n)).map((n) => [n, req.headers[n]]));
  const d = req.headers['x-amz-date']; const now = new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(9, 11)}:${d.slice(11, 13)}:${d.slice(13, 15)}Z`);
  const want = sign({ method: req.method, url: u.toString(), headers, payloadHash: req.headers['x-amz-content-sha256'], accessKey: KEYID, secretKey: SECRET, region: 'test-region-1', now }).headers.authorization;
  if (want !== auth) { S.badSignatures += 1; deny(403, 'SignatureDoesNotMatch'); return; }
  if (u.searchParams.has('versioning')) { res.writeHead(200); res.end(`<VersioningConfiguration>${S.versioning ? `<Status>${S.versioning}</Status>` : ''}</VersioningConfiguration>`); return; }
  if (u.searchParams.has('publicAccessBlock')) { if (S.block === 'none') { deny(404, 'NoSuchPublicAccessBlockConfiguration'); return; } res.writeHead(200); res.end(`<PublicAccessBlockConfiguration>${['BlockPublicAcls', 'IgnorePublicAcls', 'BlockPublicPolicy', 'RestrictPublicBuckets'].map((n, i) => `<${n}>${i < S.block}</${n}>`).join('')}</PublicAccessBlockConfiguration>`); return; }
  if (req.method === 'PUT') {
    if (sha(body) !== req.headers['x-amz-content-sha256'] || Buffer.from(sha(body), 'hex').toString('base64') !== req.headers['x-amz-checksum-sha256']) { deny(400, 'BadDigest'); return; }
    const o = S.objects.get(key) || { versions: 0 }; o.versions += 1; o.body = body; o.meta = req.headers['x-amz-meta-sha256']; S.objects.set(key, o); res.writeHead(200, S.versioning === 'Enabled' ? { 'x-amz-version-id': `v${o.versions}` } : {}); res.end(); return;
  }
  const o = S.objects.get(key); if (!o) { deny(404, 'NoSuchKey'); return; }
  res.writeHead(200, { 'content-length': o.body.length, 'x-amz-meta-sha256': o.meta, 'x-amz-version-id': `v${o.versions}` }); res.end(req.method === 'HEAD' ? undefined : o.body);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok)); const endpoint = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

// ---- a synthetic store and its manifest
const store = tmp(); const manifest = path.join(tmp(), 'manifest.json'); const files = [];
for (const [p, n] of [['founder-edition/page.html', 70_000], ['films/one.mp4', 300_000], ['films/two with space.mp4', 1_234_567]]) { const f = path.join(store, 'founder-studio', p); fs.mkdirSync(path.dirname(f), { recursive: true }); const b = crypto.randomBytes(n); fs.writeFileSync(f, b); files.push({ path: p, bytes: n, sha256: sha(b), role: 'synthetic' }); }
fs.writeFileSync(manifest, JSON.stringify({ files }));
const env = (over = {}) => ({ PATH: process.env.PATH, HOME: os.homedir(), EMPATHIA_PRIVATE_STORE: store, EMPATHIA_PRIVATE_MANIFEST: manifest, EMPATHIA_PRIVATE_BUCKET: 'stand-in', EMPATHIA_PRIVATE_BUCKET_REGION: 'test-region-1', EMPATHIA_PRIVATE_BUCKET_ENDPOINT: endpoint, EMPATHIA_PRIVATE_BUCKET_ACCESS_KEY_ID: KEYID, EMPATHIA_PRIVATE_BUCKET_SECRET_ACCESS_KEY: SECRET, ...over });
const run = (args, e = env()) => new Promise((ok) => { const p = spawn(process.execPath, [tool, ...args], { env: e }); let out = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; }); p.on('exit', (code) => ok({ code, out })); });
const outputs = [];
const go = async (args, e) => { const r = await run(args, e); outputs.push(r.out); return r; };

test('PB-01 the request signer reproduces the published Signature Version 4 example', () => {
  const r = sign({ method: 'GET', url: 'https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08', headers: { 'content-type': 'application/x-www-form-urlencoded; charset=utf-8' }, accessKey: 'AKIDEXAMPLE', secretKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY', region: 'us-east-1', service: 'iam', now: new Date('2015-08-30T12:36:00Z') });
  assert.equal(r.canonicalHash, 'f536975d06c0309214f805bb90ccff089219ecd68b2577efef23edd43b7e1a59');
  assert.equal(r.signature, '5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7');
});

test('PB-02 push: every file uploaded once, signed, with its checksum and encryption at rest asked for; a second push uploads nothing; the bucket keeps versions', async () => {
  const a = await go(['push']); assert.equal(a.code, 0, a.out); assert.match(a.out, /3 uploaded, 0 already there/);
  const puts = S.seen.filter((x) => x.method === 'PUT'); assert.equal(puts.length, 3); assert.ok(puts.every((x) => x.signed && x.sse === 'AES256' && x.checksum));
  assert.equal(S.badSignatures, 0); assert.deepEqual([...S.objects.keys()].sort(), files.map((f) => `founder-studio/${f.path}`).sort());
  const b = await go(['push']); assert.match(b.out, /0 uploaded, 3 already there/);
  const s = await go(['bucket-status']); assert.equal(s.code, 0, s.out); assert.match(s.out, /keeps versions and gives nothing to a request without a credential/);
});

test('PB-03 pull into an empty store: each file checked against the manifest, owner-only, and the store then verifies', async () => {
  const empty = tmp(); const r = await go(['pull'], env({ EMPATHIA_PRIVATE_STORE: empty })); assert.equal(r.code, 0, r.out); assert.match(r.out, /3 downloaded and verified, 0 already in the store/);
  for (const f of files) { const p = path.join(empty, 'founder-studio', f.path); assert.equal(sha(fs.readFileSync(p)), f.sha256); assert.equal(fs.statSync(p).mode & 0o777, 0o600); }
  assert.equal((await go(['verify'], env({ EMPATHIA_PRIVATE_STORE: empty }))).code, 0);
});

test('PB-04 a file changed in the bucket is not kept: pull refuses it and leaves nothing of it behind', async () => {
  const k = `founder-studio/${files[1].path}`; const o = S.objects.get(k); const good = o.body; o.body = Buffer.concat([good.subarray(0, 100), Buffer.from([good[100] ^ 1]), good.subarray(101)]);
  const empty = tmp(); const r = await go(['pull'], env({ EMPATHIA_PRIVATE_STORE: empty })); o.body = good;
  assert.equal(r.code, 1); assert.match(r.out, /films\/one\.mp4 in the bucket is not the file the manifest names .*not kept/);
  const dir = path.join(empty, 'founder-studio/films'); assert.deepEqual(fs.existsSync(dir) ? fs.readdirSync(dir) : [], []);
});

test('PB-05 a bucket that does not keep versions, or whose public-access block is partly off, is refused before anything is sent', async () => {
  const before = S.seen.filter((x) => x.method === 'PUT').length;
  S.versioning = ''; let r = await go(['push']); S.versioning = 'Enabled'; assert.equal(r.code, 1); assert.match(r.out, /refused: the bucket does not keep versions/);
  S.block = 2; r = await go(['push']); S.block = 4; assert.equal(r.code, 1); assert.match(r.out, /public-access block is not fully on \(2 of 4 settings on\)/);
  assert.equal(S.seen.filter((x) => x.method === 'PUT').length, before);
});

test('PB-06 a bucket that gives a file to a request with no credential is public: status says so, and a push stops at the first file', async () => {
  S.isPublic = true;
  try {
    const s = await go(['bucket-status']); assert.equal(s.code, 1); assert.match(s.out, /3 files are given to a request with no credential: the bucket is public/);
    const r = await go(['push']); assert.equal(r.code, 1); assert.match(r.out, /STOP: .* is given to a request with no credential .*The bucket is public/);
  } finally { S.isPublic = false; }
});

test('PB-07 not configured: said plainly; the machine’s general cloud credentials are never used; a plain-http endpoint elsewhere is refused', async () => {
  const none = { PATH: process.env.PATH, HOME: os.homedir(), EMPATHIA_PRIVATE_STORE: store, EMPATHIA_PRIVATE_MANIFEST: manifest, AWS_ACCESS_KEY_ID: 'GENERALKEY', AWS_SECRET_ACCESS_KEY: 'general-secret', EMPATHIA_PRIVATE_BUCKET: 'stand-in', EMPATHIA_PRIVATE_BUCKET_REGION: 'test-region-1', EMPATHIA_PRIVATE_BUCKET_ENDPOINT: endpoint };
  const before = S.seen.length; const r = await go(['push'], none); assert.equal(r.code, 1);
  assert.match(r.out, /not configured on this machine \(missing: EMPATHIA_PRIVATE_BUCKET_ACCESS_KEY_ID, EMPATHIA_PRIVATE_BUCKET_SECRET_ACCESS_KEY\)/); assert.equal(S.seen.length, before, 'no request was made');
  assert.match(bucketConfig({ ...env(), EMPATHIA_PRIVATE_BUCKET_ENDPOINT: 'http://storage.example.invalid' }).why, /must be https/);
  assert.equal(bucketConfig({ ...env(), EMPATHIA_PRIVATE_BUCKET_ENDPOINT: '' }).base, 'https://stand-in.s3.test-region-1.amazonaws.com');
});

test('PB-08 an encrypted backup: opens only with the recipient’s private key, restores exactly, and any change to it restores nothing', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 3072, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const other = crypto.generateKeyPairSync('rsa', { modulusLength: 3072, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const weak = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const src = path.join(store, 'founder-studio'); const out = path.join(tmp(), 'backup.bin');
  assert.throws(() => makeBackup(src, files, weak.publicKey, out), /3072 bits or more/);
  const made = makeBackup(src, files, publicKey, out); assert.equal(made.files, 3); assert.equal(fs.statSync(out).mode & 0o777, 0o600);
  const raw = fs.readFileSync(out); for (const f of files) assert.equal(raw.indexOf(fs.readFileSync(path.join(src, f.path)).subarray(0, 64)), -1, 'no file’s bytes are in the backup in the clear');
  const into = tmp(); const r = restoreBackup(out, privateKey, into, files); assert.equal(r.files, 3);
  for (const f of files) assert.equal(sha(fs.readFileSync(path.join(into, f.path))), f.sha256);
  assert.throws(() => restoreBackup(out, other.privateKey, tmp(), files), /this private key does not open the backup/);
  const changed = path.join(tmp(), 'changed.bin'); const b = Buffer.from(raw); b[b.length - 5000] ^= 1; fs.writeFileSync(changed, b);
  const into2 = tmp(); assert.throws(() => restoreBackup(changed, privateKey, into2, files), /changed after it was made|do not have the SHA-256/); assert.deepEqual(fs.readdirSync(into2), []);
  const header = path.join(tmp(), 'header.bin'); const hb = Buffer.from(raw); const at = hb.indexOf('"bytes":'); hb[at + 8] = hb[at + 8] === 0x37 ? 0x38 : 0x37; fs.writeFileSync(header, hb);
  assert.throws(() => restoreBackup(header, privateKey, tmp(), null), /not the length its header says|changed after it was made/);
  const cut = path.join(tmp(), 'cut.bin'); fs.writeFileSync(cut, raw.subarray(0, raw.length - 100)); assert.throws(() => restoreBackup(cut, privateKey, tmp(), files), /not the length its header says/);
  assert.throws(() => restoreBackup(out, privateKey, tmp(), [{ ...files[0], sha256: '0'.repeat(64) }]), /does not hold .* as the manifest names it/);
});

test('PB-09 nothing these commands print holds the bucket’s secret', () => {
  assert.ok(outputs.length >= 10); for (const o of outputs) { assert.ok(!o.includes(SECRET)); assert.ok(!o.includes('general-secret')); }
});
