/**
 * Object storage for evidence and generated files. Content-addressed by SHA-256 (the same bytes are stored once; a stored object
 * can be checked against its hash at any time). The local adapter is for development and tests; the S3 adapter is a contract
 * (MinIO locally, any S3-compatible store in production) that needs the AWS SDK, which this offline environment cannot install.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface StoredObject { key: string; sha256: string; bytes: number }
export interface ObjectStore {
  readonly kind: 'local' | 's3';
  put(data: Buffer): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  verify(key: string, sha256: string): Promise<boolean>;
}

export class LocalObjectStore implements ObjectStore {
  readonly kind = 'local' as const;
  constructor(private dir: string) { fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); }
  private file(key: string) {
    if (!/^sha256\/[0-9a-f]{2}\/[0-9a-f]{64}$/.test(key)) throw new Error('invalid object key');
    return path.join(this.dir, key);
  }
  async put(data: Buffer): Promise<StoredObject> {
    const sha256 = crypto.createHash('sha256').update(data).digest('hex');
    const key = `sha256/${sha256.slice(0, 2)}/${sha256}`;
    const f = this.file(key);
    if (!fs.existsSync(f)) { fs.mkdirSync(path.dirname(f), { recursive: true, mode: 0o700 }); const tmp = `${f}.${process.pid}.tmp`; fs.writeFileSync(tmp, data, { mode: 0o600 }); fs.renameSync(tmp, f); }
    return { key, sha256, bytes: data.length };
  }
  async get(key: string): Promise<Buffer> { return fs.promises.readFile(this.file(key)); }
  async verify(key: string, sha256: string): Promise<boolean> { try { return crypto.createHash('sha256').update(await this.get(key)).digest('hex') === sha256; } catch { return false; } }
}

/** CONTRACT_ONLY: the S3/MinIO adapter. Its interface is fixed above; the implementation needs @aws-sdk/client-s3 (not installable here). */
export class S3ObjectStore implements ObjectStore {
  readonly kind = 's3' as const;
  constructor(readonly endpoint: string, readonly bucket: string) {}
  private nc(): never { throw new Error('NOT_CONFIGURED: the S3 adapter is a contract in this starter (see docs/architecture/STORAGE.md)'); }
  async put(): Promise<StoredObject> { return this.nc(); }
  async get(): Promise<Buffer> { return this.nc(); }
  async verify(): Promise<boolean> { return this.nc(); }
}
