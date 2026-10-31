/**
 * Production identity (AUTH_MODE=oidc) against a local JWKS, over real HTTP: a token signed by the provider's key is accepted and
 * mapped to the person and membership named by the headers; everything an attacker would try is refused with 401 — alg=none, HS256
 * signed with the public key as secret (algorithm confusion), a different key, wrong issuer, wrong audience, expired, not-yet-valid,
 * unknown subject, a role the person does not hold, a tenant the person is not a member of; key rotation is handled by one JWKS
 * refresh; the development sign-in route is disabled. This is a local provider: a named identity provider is still to be verified.
 *   node --test tests/security/oidc.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { setup, client } from '../integration/harness.mjs';

const ISS = 'https://idp.synthetic.invalid/'; const AUD = 'empathia-enterprise-api';
const k1 = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }); const k2 = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }); const ec = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwk = (pair, kid) => ({ ...pair.publicKey.export({ format: 'jwk' }), kid, use: 'sig' });
let served = { keys: [jwk(k1, 'k1')] }; let fetches = 0;
const b64 = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
const sign = (claims, { kid = 'k1', alg = 'RS256', key = k1.privateKey } = {}) => { const h = b64({ alg, kid, typ: 'JWT' }); const p = b64(claims); const data = `${h}.${p}`; const sig = alg === 'none' ? '' : alg === 'HS256' ? crypto.createHmac('sha256', key).update(data).digest('base64url') : alg === 'ES256' ? crypto.sign('sha256', Buffer.from(data), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url') : crypto.sign('sha256', Buffer.from(data), key).toString('base64url'); return `${data}.${sig}`; };
const now = () => Math.floor(Date.now() / 1000);
const good = (over = {}) => ({ iss: ISS, aud: AUD, sub: 'sub-designer', iat: now(), nbf: now() - 5, exp: now() + 300, ...over });

let h, c, jwks, me;
before(async () => {
  jwks = http.createServer((req, res) => { fetches += 1; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(served)); });
  await new Promise((r) => jwks.listen(4187, '127.0.0.1', r));
  h = await setup({ db: 'empathia_test_oidc', port: 4186, env: { AUTH_MODE: 'oidc', OIDC_ISSUER: ISS, OIDC_AUDIENCE: AUD, OIDC_JWKS_URL: 'http://127.0.0.1:4187/jwks', OIDC_LINK_BY_EMAIL: 'on' } });
  c = client(h.base);
  h.asSuper("UPDATE app.person SET external_subject = 'sub-designer' WHERE email = 'designer@empathia-demo.empathia.invalid'");
  me = (token, headers = {}) => c.call('GET', '/v1/me', { token, headers });
});
after(async () => { await h?.app.stop(); jwks?.close(); });

test('OIDC-1 — a provider-signed token is accepted; the tenant and role come from headers and must be memberships the person holds', async () => {
  const t = sign(good());
  const r = await me(t, { 'x-empathia-tenant': 'empathia-demo', 'x-empathia-role': 'designer' });
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.role, 'designer'); assert.equal(r.body.tenant, 'empathia-demo');
  const single = await me(t); assert.equal(single.status, 200, 'one membership: headers may be omitted');
  assert.equal((await me(t, { 'x-empathia-tenant': 'empathia-demo', 'x-empathia-role': 'secadmin' })).status, 401, 'a role the person does not hold');
  assert.equal((await me(t, { 'x-empathia-tenant': 'second-tenant', 'x-empathia-role': 'designer' })).status, 401, 'a tenant the person is not a member of');
  assert.equal((await c.call('POST', '/v1/auth/token', { body: { email: 'designer@empathia-demo.empathia.invalid', password: 'empathia-dev-only' } })).status, 404, 'the development sign-in is disabled');
});

test('OIDC-2 — forged and malformed tokens are refused: alg=none, HS256 with the public key, another key, ES256 key mismatch, wrong iss/aud, expired, not yet valid, unknown subject', async () => {
  const H = { 'x-empathia-tenant': 'empathia-demo', 'x-empathia-role': 'designer' };
  const pem = k1.publicKey.export({ type: 'spki', format: 'pem' });
  const cases = [
    ['alg=none', sign(good(), { alg: 'none' })],
    ['HS256 with the public key as secret', sign(good(), { alg: 'HS256', key: pem })],
    ['signed by a key not in the JWKS (kid spoofed)', sign(good(), { key: k2.privateKey })],
    ['ES256 signature against an RSA kid', sign(good(), { alg: 'ES256', key: ec.privateKey })],
    ['wrong issuer', sign(good({ iss: 'https://evil.invalid/' }))],
    ['wrong audience', sign(good({ aud: 'other-api' }))],
    ['expired', sign(good({ exp: now() - 120 }))],
    ['not yet valid', sign(good({ nbf: now() + 600 }))],
    ['unknown subject', sign(good({ sub: 'sub-nobody' }))],
    ['no kid', sign(good()).replace(/^[^.]+/, b64({ alg: 'RS256', typ: 'JWT' }))],
    ['garbage', 'not.a.token'],
  ];
  for (const [name, t] of cases) { const r = await me(t, H); assert.equal(r.status, 401, `${name}: ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`); }
});

test('OIDC-3 — key rotation: a token signed by a newly published key triggers one JWKS refresh; the old key keeps working until it is withdrawn', async () => {
  const H = { 'x-empathia-tenant': 'empathia-demo', 'x-empathia-role': 'designer' };
  const before = fetches;
  served = { keys: [jwk(k1, 'k1'), jwk(k2, 'k2')] };
  assert.equal((await me(sign(good(), { kid: 'k2', key: k2.privateKey }), H)).status, 200);
  assert.equal(fetches, before + 1, 'exactly one refresh');
  assert.equal((await me(sign(good()), H)).status, 200);
  served = { keys: [jwk(k2, 'k2')] };
  assert.equal((await me(sign(good(), { kid: 'k2', key: k2.privateKey }), H)).status, 200, 'cached old set still accepts k2');
  assert.equal((await me(sign(good(), { kid: 'k3', key: k2.privateKey }), H)).status, 401, 'an unknown kid within the refresh cool-down is refused, not fetched again');
});

test('OIDC-4 — first sign-in binds a verified email to the existing person (audit-visible); an unverified email never binds; a bound subject stays bound', async () => {
  const H = { 'x-empathia-tenant': 'empathia-demo', 'x-empathia-role': 'syseng' };
  assert.equal((await me(sign(good({ sub: 'sub-syseng', email: 'syseng@empathia-demo.empathia.invalid', email_verified: false })), H)).status, 401, 'unverified email does not bind');
  assert.equal((await me(sign(good({ sub: 'sub-syseng', email: 'SYSENG@empathia-demo.empathia.invalid', email_verified: true })), H)).status, 200, 'verified email binds (case-insensitive)');
  assert.equal(h.asSuper("SELECT external_subject FROM app.person WHERE email = 'syseng@empathia-demo.empathia.invalid'"), 'sub-syseng');
  assert.equal((await me(sign(good({ sub: 'sub-other', email: 'syseng@empathia-demo.empathia.invalid', email_verified: true })), H)).status, 401, 'a second subject cannot take over a bound person');
  assert.equal((await me(sign(good({ sub: 'sub-syseng' })), H)).status, 200, 'the bound subject signs in without an email claim');
});
