/** The standalone integration worker runs one round against a fresh database and records every runnable integration. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { setup, repo } from './harness.mjs';

let h;
before(async () => { h = await setup({ db: 'empathia_test_worker', port: 4194 }); });
after(async () => { await h?.app.stop(); });

test('one worker round syncs the three MOCK integrations and labels every observation SYNTHETIC_MOCK', () => {
  const r = spawnSync(process.execPath, [path.join(repo, 'services/integration-worker/main.mjs'), '--once'], { env: { ...process.env }, encoding: 'utf8', timeout: 60000 });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.deepEqual(out.results.map((x) => x.key).sort(), ['mock-device-inventory', 'mock-dsp-readback', 'mock-itsm-readonly']);
  assert.ok(out.results.every((x) => x.state === 'OK'), JSON.stringify(out.results));
  assert.equal(h.asSuper("SELECT count(*) FROM app.integration_sync WHERE state = 'OK'"), '3');
  assert.equal(h.asSuper("SELECT count(*) FROM app.integration_observation WHERE evidence <> 'SYNTHETIC_MOCK'"), '0');
  assert.equal(h.asSuper("SELECT count(DISTINCT integration_key) FROM app.integration_observation"), '3');
  assert.equal(h.asSuper("SELECT count(*) FROM app.audit_event WHERE action = 'integration.sync' AND actor_role = 'secadmin'"), '3', 'the worker acts as its named account and is audited');
});
