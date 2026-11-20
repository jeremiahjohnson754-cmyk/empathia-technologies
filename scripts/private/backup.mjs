/**
 * Encrypted backup copies of the private store (founder, 17 Nov 2026: "versioned, access-controlled private object storage, with
 * encrypted backup copies and checksum verification").
 *
 * A backup is one file that only the holder of a private key can open. It is encrypted to a PUBLIC key, which is safe to hand
 * over; the private key never comes near this workstation, a repository or a conversation. Making a backup needs no secret at all.
 *
 *   the file:  "EMPATHIA-PRIVATE-BACKUP-1\n"  a JSON header line  the files' bytes, AES-256-GCM  a 16-byte tag
 *   the header: when it was made, each file's path, size and SHA-256, and the AES key wrapped for the recipient (RSA-OAEP, SHA-256).
 *   The header is authenticated with the data, so neither can be changed without the tag failing.
 *
 * Restoring: the key is unwrapped with the private key, everything is decrypted into temporary files, the tag is checked, every
 * file's SHA-256 is checked against the header, and only then is anything put in place.
 */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';

const MAGIC = 'EMPATHIA-PRIVATE-BACKUP-1\n';
const fileSha = (f) => { const h = crypto.createHash('sha256'); const fd = fs.openSync(f, 'r'); const buf = Buffer.alloc(1 << 20); let n; while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n)); fs.closeSync(fd); return h.digest('hex'); };

/** files: [{ path, bytes, sha256 }] relative to dir. recipientPem: a PEM public key (RSA, 3072 bits or more). */
export function makeBackup(dir, files, recipientPem, out) {
  const pub = crypto.createPublicKey(recipientPem); const d = pub.asymmetricKeyDetails || {};
  if (pub.type !== 'public' || pub.asymmetricKeyType !== 'rsa' || (d.modulusLength || 0) < 3072) throw new Error('the recipient must be an RSA public key of 3072 bits or more, in PEM');
  for (const f of files) { const p = path.join(dir, f.path); if (!fs.existsSync(p) || fs.statSync(p).size !== f.bytes || fileSha(p) !== f.sha256) throw new Error(`${f.path} in the store is not the file the manifest names: no backup was made`); }
  const key = crypto.randomBytes(32); const iv = crypto.randomBytes(12);
  const header = JSON.stringify({ made: new Date().toISOString(), cipher: 'aes-256-gcm', iv: iv.toString('base64'), wrap: 'rsa-oaep-sha256', key: crypto.publicEncrypt({ key: pub, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, key).toString('base64'), recipient: crypto.createHash('sha256').update(pub.export({ type: 'spki', format: 'der' })).digest('hex'), files: files.map((f) => ({ path: f.path, bytes: f.bytes, sha256: f.sha256 })) }) + '\n';
  const c = crypto.createCipheriv('aes-256-gcm', key, iv); c.setAAD(Buffer.from(MAGIC + header));
  const tmp = `${out}.part`; const fd = fs.openSync(tmp, 'w', 0o600);
  try {
    fs.writeSync(fd, MAGIC + header); const buf = Buffer.alloc(1 << 20);
    for (const f of files) { const src = fs.openSync(path.join(dir, f.path), 'r'); let n; while ((n = fs.readSync(src, buf, 0, buf.length, null)) > 0) fs.writeSync(fd, c.update(buf.subarray(0, n))); fs.closeSync(src); }
    fs.writeSync(fd, c.final()); fs.writeSync(fd, c.getAuthTag()); fs.closeSync(fd); fs.renameSync(tmp, out);
  } catch (e) { try { fs.closeSync(fd); } catch { /* closed */ } fs.rmSync(tmp, { force: true }); throw e; }
  return { bytes: fs.statSync(out).size, sha256: fileSha(out), files: files.length, recipient: JSON.parse(header).recipient };
}

/** Reads a backup's header without any key: what it holds and whom it was made for. */
export function readHeader(file) {
  const fd = fs.openSync(file, 'r'); try {
    const head = Buffer.alloc(1 << 16); const n = fs.readSync(fd, head, 0, head.length, 0); const text = head.subarray(0, n).toString('latin1');
    if (!text.startsWith(MAGIC)) throw new Error('not a backup made by this tool'); const end = text.indexOf('\n', MAGIC.length); if (end < 0) throw new Error('the backup’s header is not complete');
    const line = head.subarray(MAGIC.length, end + 1).toString('utf8'); return { header: JSON.parse(line), dataAt: end + 1, aad: Buffer.concat([Buffer.from(MAGIC), head.subarray(MAGIC.length, end + 1)]) };
  } finally { fs.closeSync(fd); }
}

/** Decrypts into `into` (created if absent). Nothing is put in place unless the tag and every file's SHA-256 are right. expected: optional manifest entries the backup must match. */
export function restoreBackup(file, privatePem, into, expected = null) {
  const { header, dataAt, aad } = readHeader(file); const size = fs.statSync(file).size; const total = header.files.reduce((a, f) => a + f.bytes, 0);
  if (size !== dataAt + total + 16) throw new Error('the backup is not the length its header says: it is truncated or was changed');
  if (expected) for (const e of expected) { const f = header.files.find((x) => x.path === e.path); if (!f || f.sha256 !== e.sha256 || f.bytes !== e.bytes) throw new Error(`the backup does not hold ${e.path} as the manifest names it`); }
  let key; try { key = crypto.privateDecrypt({ key: crypto.createPrivateKey(privatePem), padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(header.key, 'base64')); } catch { throw new Error('this private key does not open the backup'); }
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(header.iv, 'base64')); d.setAAD(aad);
  const fd = fs.openSync(file, 'r'); const tag = Buffer.alloc(16); fs.readSync(fd, tag, 0, 16, size - 16); d.setAuthTag(tag);
  fs.mkdirSync(into, { recursive: true, mode: 0o700 }); const work = fs.mkdtempSync(path.join(into, '.restoring-')); const buf = Buffer.alloc(1 << 20); let pos = dataAt; const made = [];
  try {
    for (const f of header.files) {
      if (path.isAbsolute(f.path) || f.path.split('/').includes('..')) throw new Error(`the backup names a path outside the store: ${f.path}`);
      const t = path.join(work, f.path); fs.mkdirSync(path.dirname(t), { recursive: true, mode: 0o700 }); const o = fs.openSync(t, 'w', 0o600); const h = crypto.createHash('sha256'); let left = f.bytes;
      while (left > 0) { const n = fs.readSync(fd, buf, 0, Math.min(buf.length, left), pos); if (n <= 0) throw new Error('the backup ended early'); pos += n; left -= n; const plain = d.update(buf.subarray(0, n)); h.update(plain); fs.writeSync(o, plain); }
      fs.closeSync(o); made.push({ ...f, tmp: t, got: h.digest('hex') });
    }
    try { d.final(); } catch { throw new Error('the backup was changed after it was made (its authentication tag does not match): nothing was restored'); }
    const bad = made.filter((m) => m.got !== m.sha256); if (bad.length) throw new Error(`${bad.length} files do not have the SHA-256 the header names: nothing was restored`);
    for (const m of made) { const t = path.join(into, m.path); fs.mkdirSync(path.dirname(t), { recursive: true, mode: 0o700 }); fs.renameSync(m.tmp, t); }
    return { files: made.length, bytes: total, made: header.made };
  } finally { fs.closeSync(fd); fs.rmSync(work, { recursive: true, force: true }); }
}
