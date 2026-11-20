// Stopping is bounded (17 Nov 2026). A client that holds a connection open cannot keep a stopping service alive.
//   SD-01  with one connection idle and one holding a request it never finishes, stop() returns within the grace period (and not
//          before the idle one is closed); both connections are closed by the server; nothing answers afterwards
import test from 'node:test'; import assert from 'node:assert/strict'; import net from 'node:net';
import { setup, client } from '../integration/harness.mjs';

test('SD-01 a held-open connection does not keep a stopping service alive: idle connections close at once, the rest at the grace period', async () => {
  const port = 4154; const h = await setup({ db: 'empathia_shutdown', port, env: { SHUTDOWN_GRACE_MS: '1500' } }); const c = client(h.base);
  assert.equal((await c.call('GET', '/health')).status, 200);
  const open = (first) => new Promise((ok) => { const s = net.connect(port, '127.0.0.1', () => { s.write(first); ok(s); }); s.on('error', () => {}); });
  // an idle keep-alive connection: one whole request, answered, then nothing
  const idle = await open('GET /health HTTP/1.1\r\nHost: x\r\nConnection: keep-alive\r\n\r\n'); await new Promise((ok) => idle.once('data', ok));
  // a request that never finishes: headers promised, never completed
  const held = await open('POST /v1/auth/token HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 500\r\n\r\n{"email":');
  const closed = { idle: null, held: null }; const t0 = Date.now(); idle.on('close', () => { closed.idle = Date.now() - t0; }); held.on('close', () => { closed.held = Date.now() - t0; });
  await h.app.stop(); const took = Date.now() - t0; await new Promise((ok) => setTimeout(ok, 100));
  assert.ok(took >= 1200 && took < 5000, `stop() returned after ${took} ms (grace 1500 ms)`);
  assert.ok(closed.idle !== null && closed.idle < 1000, `the idle connection was closed at once (${closed.idle} ms)`);
  assert.ok(closed.held !== null && closed.held >= 1200, `the held request was closed at the grace period (${closed.held} ms)`);
  await assert.rejects(() => c.call('GET', '/health'), 'nothing answers after stop');
});
