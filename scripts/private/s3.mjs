/**
 * A small client for a private, versioned object-storage bucket (S3 or anything that speaks its API), for the private assets only.
 * Founder, 17 Nov 2026: "a private, versioned object-storage bucket with access limited to the build pipeline and authorized
 * founders. Keep the hashes in Git, not the sensitive films themselves." And: "Never make those films public simply to simplify
 * build provisioning."
 *
 * No dependency: requests are signed here (AWS Signature Version 4). Credentials come from the environment and are never printed,
 * logged or written. The configuration:
 *   EMPATHIA_PRIVATE_BUCKET                    the bucket's name
 *   EMPATHIA_PRIVATE_BUCKET_REGION             its region (for example us-east-2)
 *   EMPATHIA_PRIVATE_BUCKET_ENDPOINT           optional: another provider's endpoint (https://…); default is Amazon S3 for the region
 *   EMPATHIA_PRIVATE_BUCKET_PREFIX             optional: a folder inside the bucket (default founder-studio/)
 *   EMPATHIA_PRIVATE_BUCKET_ACCESS_KEY_ID, EMPATHIA_PRIVATE_BUCKET_SECRET_ACCESS_KEY, optionally EMPATHIA_PRIVATE_BUCKET_SESSION_TOKEN
 * Only these names are read. A machine's general cloud credentials (AWS_ACCESS_KEY_ID and the like) are deliberately not used: the
 * key for this bucket is one made for this bucket, able to read and write it and nothing else.
 */
import fs from 'node:fs'; import crypto from 'node:crypto'; import { Readable } from 'node:stream'; import { pipeline } from 'node:stream/promises';

const sha256hex = (b) => crypto.createHash('sha256').update(b).digest('hex');
const hmac = (k, s) => crypto.createHmac('sha256', k).update(s).digest();
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const EMPTY = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/** AWS Signature Version 4. Returns the headers to send (the given ones plus x-amz-date, the payload hash for S3, and Authorization). */
export function sign({ method, url, headers = {}, payloadHash = EMPTY, accessKey, secretKey, sessionToken = '', region, service = 's3', now = new Date() }) {
  const u = new URL(url); const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); const date = amzDate.slice(0, 8);
  const h = { host: u.host, 'x-amz-date': amzDate, ...(service === 's3' ? { 'x-amz-content-sha256': payloadHash } : {}), ...(sessionToken ? { 'x-amz-security-token': sessionToken } : {}) };
  for (const [k, v] of Object.entries(headers)) h[k.toLowerCase()] = String(v).trim().replace(/\s+/g, ' ');
  const names = Object.keys(h).sort();
  const path = u.pathname.split('/').map((seg) => enc(decodeURIComponent(seg))).join('/') || '/';
  const query = [...u.searchParams.entries()].map(([k, v]) => [enc(k), enc(v)]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('&');
  const canonical = [method, path, query, names.map((n) => `${n}:${h[n]}\n`).join(''), names.join(';'), payloadHash].join('\n');
  const scope = `${date}/${region}/${service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonical)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, date), region), service), 'aws4_request');
  const signature = hmac(key, toSign).toString('hex');
  return { headers: { ...h, authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}` }, signature, canonicalHash: sha256hex(canonical) };
}

export function bucketConfig(env = process.env) {
  const bucket = env.EMPATHIA_PRIVATE_BUCKET || ''; const region = env.EMPATHIA_PRIVATE_BUCKET_REGION || '';
  const accessKey = env.EMPATHIA_PRIVATE_BUCKET_ACCESS_KEY_ID || ''; const secretKey = env.EMPATHIA_PRIVATE_BUCKET_SECRET_ACCESS_KEY || '';
  const missing = [!bucket && 'EMPATHIA_PRIVATE_BUCKET', !region && 'EMPATHIA_PRIVATE_BUCKET_REGION', !accessKey && 'EMPATHIA_PRIVATE_BUCKET_ACCESS_KEY_ID', !secretKey && 'EMPATHIA_PRIVATE_BUCKET_SECRET_ACCESS_KEY'].filter(Boolean);
  if (missing.length) return { ok: false, why: `the private bucket is not configured on this machine (missing: ${missing.join(', ')}). Its credentials are placed in the environment as secrets, never in the repository or in a conversation` };
  const endpoint = (env.EMPATHIA_PRIVATE_BUCKET_ENDPOINT || '').replace(/\/$/, ''); const amazon = !endpoint;
  if (endpoint && !/^https:\/\//.test(endpoint) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(endpoint)) return { ok: false, why: 'the bucket endpoint must be https (http is accepted only for a stand-in on this machine)' };
  const base = amazon ? `https://${bucket}.s3.${region}.amazonaws.com` : `${endpoint}/${bucket}`;
  let prefix = env.EMPATHIA_PRIVATE_BUCKET_PREFIX ?? 'founder-studio/'; if (prefix && !prefix.endsWith('/')) prefix += '/';
  return { ok: true, bucket, region, base, prefix, accessKey, secretKey, sessionToken: env.EMPATHIA_PRIVATE_BUCKET_SESSION_TOKEN || '', where: amazon ? `s3://${bucket}/${prefix} (${region})` : `${new URL(endpoint).host}/${bucket}/${prefix}` };
}

export class Bucket {
  constructor(cfg) { this.cfg = cfg; }
  url(key, query = '') { return `${this.cfg.base}/${key.split('/').map(enc).join('/')}${query}`; }
  async call(method, url, { headers = {}, body, payloadHash = EMPTY, signed = true } = {}) {
    const h = signed ? sign({ method, url, headers, payloadHash, accessKey: this.cfg.accessKey, secretKey: this.cfg.secretKey, sessionToken: this.cfg.sessionToken, region: this.cfg.region }).headers : headers;
    delete h.host;
    return fetch(url, { method, headers: h, body, signal: AbortSignal.timeout(900000) });
  }
  /** 'Enabled', or what the provider answered. Every upload then keeps the versions before it. */
  async versioning() { const r = await this.call('GET', `${this.cfg.base}/?versioning=`); const t = await r.text(); if (r.status !== 200) return `unknown (${r.status})`; return (/<Status>([^<]+)<\/Status>/.exec(t) || [])[1] || 'never enabled'; }
  /** The provider's own public-access block, where it has one: all four settings on, some off, or not offered. */
  async publicAccessBlock() { const r = await this.call('GET', `${this.cfg.base}/?publicAccessBlock=`); const t = await r.text(); if (r.status === 404 || r.status === 501 || r.status === 400) return 'not offered by this provider'; if (r.status !== 200) return `unknown (${r.status})`; const on = (t.match(/>true</g) || []).length; return on === 4 ? 'all four settings on' : `${on} of 4 settings on`; }
  async head(key) { const r = await this.call('HEAD', this.url(this.cfg.prefix + key)); return r.status === 200 ? { exists: true, bytes: Number(r.headers.get('content-length')), sha256: r.headers.get('x-amz-meta-sha256') || '', version: r.headers.get('x-amz-version-id') || '' } : { exists: false, status: r.status }; }
  /** What anyone gets with no credential at all. It must not be the object. */
  async anonymous(key) { const r = await this.call('GET', this.url(this.cfg.prefix + key), { signed: false, headers: { range: 'bytes=0-0' } }); try { await r.body?.cancel(); } catch { /* nothing to cancel */ } return r.status; }
  async put(key, file, sha256) {
    const bytes = fs.statSync(file).size; if (bytes > 2 ** 31) throw new Error(`${key} is larger than this client uploads in one request (2 GiB)`);
    // the request is signed over the file's own SHA-256, and the provider is told the same hash to check what arrived
    const headers = { 'content-type': 'application/octet-stream', 'x-amz-checksum-sha256': Buffer.from(sha256, 'hex').toString('base64'), 'x-amz-meta-sha256': sha256, 'x-amz-server-side-encryption': 'AES256' };
    const r = await this.call('PUT', this.url(this.cfg.prefix + key), { headers, body: fs.readFileSync(file), payloadHash: sha256 });
    if (r.status !== 200) throw new Error(`the upload of ${key} was refused (${r.status}): ${(await r.text()).replace(/\s+/g, ' ').slice(0, 160)}`);
    await r.arrayBuffer(); return { version: r.headers.get('x-amz-version-id') || '' };
  }
  /** Download to a temporary file beside the target, hash while writing, and keep it only if it is the file the manifest names. */
  async get(key, target, sha256, bytes) {
    const r = await this.call('GET', this.url(this.cfg.prefix + key)); if (r.status !== 200) { try { await r.body?.cancel(); } catch { /* */ } throw new Error(`${key} is not in the bucket (${r.status})`); }
    const tmp = `${target}.part`; const h = crypto.createHash('sha256'); let n = 0;
    try {
      await pipeline(Readable.fromWeb(r.body), async function* (src) { for await (const c of src) { h.update(c); n += c.length; yield c; } }, fs.createWriteStream(tmp, { mode: 0o600 }));
      const got = h.digest('hex'); if (n !== bytes || got !== sha256) throw new Error(`${key} in the bucket is not the file the manifest names (${n} bytes, sha256 ${got.slice(0, 12)}…; expected ${bytes}, ${sha256.slice(0, 12)}…): not kept`);
      fs.renameSync(tmp, target);
    } finally { fs.rmSync(tmp, { force: true }); }
  }
}
