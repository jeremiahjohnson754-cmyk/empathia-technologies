#!/usr/bin/env python3
"""
Validate both Render Blueprints against the repository before anything is applied (no network; reads files only).
  python3 -I scripts/staging/validate-blueprints.py [--out=tests/evidence/BLUEPRINT_VALIDATION.json]
Phase 1 (render.yaml): only free static sites, no database, no secrets, publish paths produced by `build.mjs --public`, security headers.
Phase 2 (deploy/render/enterprise.render.yaml): plan values and regions from the Blueprint spec, private-only database, the Dockerfile,
start and pre-deploy commands map to real entry points, health paths are served, the disk is the image's evidence directory, every
environment variable is one the code reads, every variable production requires is present, and no secret has a literal value.
Exit 1 on any FAIL. Requires PyYAML (reported NOT_RUN by the test runner if it is missing).
"""
import json, os, re, sys, datetime
import yaml

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
def rd(p): return open(os.path.join(REPO, p), encoding='utf-8').read()
def ex(p): return os.path.exists(os.path.join(REPO, p))
results = []
def rec(i, name, ok, detail=''):
    results.append({'id': i, 'name': name, 'result': 'PASS' if ok else 'FAIL', 'detail': detail})
    print(f"{'PASS' if ok else 'FAIL'} {i} {name}{' — ' + detail if detail else ''}")

# From https://render.com/docs/blueprint-spec (checked 2026-10-31)
WEB_PLANS = {'free', '0.5c-512mb', '1c-2g', '2c-4g', '2c-8g', '2c-16g', '4c-8g', '4c-16g', '4c-32g', '8c-16g', '8c-32g', '8c-64g', '12c-24g', '12c-48g', '12c-96g'}
PG_PLANS = {'free', '0.1c-256mb', '0.5c-1g', '1c-2g', '1c-4g', '2c-4g', '2c-8g', '2c-16g', '4c-16g', '4c-32g', '8c-32g', '8c-64g'}
REGIONS = {'oregon', 'ohio', 'virginia', 'frankfurt', 'singapore'}
TESTED_PG = '16'
SRC_DIRS = ['services/enterprise-api/src', 'apps/enterprise-web/server', 'packages/observability/src']
code = ''
for d in SRC_DIRS:
    for root, _, files in os.walk(os.path.join(REPO, d)):
        for f in files:
            if f.endswith(('.ts', '.mjs', '.js')): code += open(os.path.join(root, f), encoding='utf-8').read()
RUNTIME_READ = {'NODE_OPTIONS'}   # read by Node itself, not by application code
def read_by_code(k): return k in RUNTIME_READ or re.search(r"""(\[['"]%s['"]\]|env\.%s\b|['"]%s['"])""" % (k, k, k), code) is not None

arg = lambda k: next((a.split('=', 1)[1] for a in sys.argv if a.startswith(f'--{k}=')), None)
p1 = yaml.safe_load(rd(arg('phase1') or 'render.yaml'))
p2 = yaml.safe_load(rd(arg('phase2') or 'deploy/render/enterprise.render.yaml'))

# ---- Phase 1
s1 = p1.get('services', [])
rec('P1-1', 'Phase 1 has no database and only static sites', not p1.get('databases') and all(s.get('type') == 'web' and s.get('runtime') == 'static' for s in s1), ', '.join(s['name'] for s in s1))
build = rd('scripts/build.mjs')
outs = {'apps/website/dist': 'apps/website/build.mjs', 'apps/demo/dist': 'apps/demo'}
rec('P1-2', 'each static site publishes a directory the public build produces', all(s.get('staticPublishPath') in outs and '--public' in s.get('buildCommand', '') for s in s1) and "includes('--public')" in build, ', '.join(f"{s['name']}→{s.get('staticPublishPath')}" for s in s1))
rec('P1-3', 'no secret or dashboard-entered variable in Phase 1', all(not e.get('sync') is False and 'generateValue' not in e and 'fromDatabase' not in e for s in s1 for e in s.get('envVars', [])))
need_h = {'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Strict-Transport-Security', 'Referrer-Policy'}
rec('P1-4', 'every static site sends CSP, nosniff, frame denial, HSTS, no-referrer on /*', all(need_h <= {h['name'] for h in s.get('headers', []) if h.get('path') == '/*'} for s in s1))
demo = next((s for s in s1 if s['name'] == 'empathia-demo'), None)
rec('P1-5', 'the investor demo is not indexed (X-Robots-Tag noindex)', bool(demo) and any(h['name'] == 'X-Robots-Tag' and 'noindex' in h['value'] for h in demo.get('headers', [])))
nv = {e.get('value') for s in s1 for e in s.get('envVars', []) if e.get('key') == 'NODE_VERSION'}
rec('P1-6', 'NODE_VERSION matches .node-version and the Docker base image', nv == {rd('.node-version').strip()} and f"node:{rd('.node-version').strip()}-" in rd('deploy/render/Dockerfile'), str(nv))

# ---- Phase 2
dbs, s2 = p2.get('databases', []), p2.get('services', [])
db = dbs[0] if len(dbs) == 1 else {}
rec('P2-1', 'one database, paid plan from the spec, tested major version', len(dbs) == 1 and db.get('plan') in PG_PLANS - {'free'} and str(db.get('postgresMajorVersion')) == TESTED_PG, f"{db.get('plan')} PG{db.get('postgresMajorVersion')}")
rec('P2-2', 'the database accepts private-network connections only (ipAllowList: [])', db.get('ipAllowList') == [])
rec('P2-3', 'database diskSizeGB is 1 or a multiple of 5', db.get('diskSizeGB') in (None, 1) or (isinstance(db.get('diskSizeGB'), int) and db['diskSizeGB'] % 5 == 0))
regions = {db.get('region')} | {s.get('region') for s in s2}
rec('P2-4', 'database and services share one valid region', len(regions) == 1 and regions <= REGIONS, str(regions))
rec('P2-5', 'services are paid Docker web services with deliberate deploys', all(s.get('type') == 'web' and s.get('runtime') == 'docker' and s.get('plan') in WEB_PLANS - {'free'} and s.get('autoDeployTrigger') == 'off' for s in s2))
df = rd('deploy/render/Dockerfile')
rec('P2-6', 'dockerfilePath exists and both services build the same image', all(ex(s.get('dockerfilePath', '').lstrip('./')) and s.get('dockerContext') == '.' for s in s2) and len({s.get('dockerfilePath') for s in s2}) == 1)
def entry_ok(cmd):
    # every `node <file>` in a command maps to a source file that the runtime tree contains after the build
    files = re.findall(r'node\s+(\S+)', cmd or '')
    bad = []
    for f in files:
        src = re.sub(r'/dist/src/(.*)\.js$', r'/src/\1.ts', f)
        if not ex(src): bad.append(f)
    return files and not bad, bad
api = next((s for s in s2 if s['name'] == 'empathia-api'), {}); web = next((s for s in s2 if s['name'] == 'empathia-app'), {})
asm = rd('deploy/render/assemble-runtime.mjs')
ok_cmd = all(entry_ok(s.get('dockerCommand'))[0] for s in s2)
rec('P2-7', 'start commands name real entry points', ok_cmd and 'apps/enterprise-web/server' in asm and 'services/enterprise-api' in asm, f"api: {api.get('dockerCommand')} · app: {web.get('dockerCommand')}")
pre = api.get('preDeployCommand', '')
bs = rd('services/enterprise-api/src/db/bootstrap.ts')
order = [m for m in re.findall(r'(bootstrap\.js --roles|migrate\.js|bootstrap\.js --policy)', pre)]
rec('P2-8', 'pre-deploy: roles (V-1 gate) → migrations → policy, all real entry points', entry_ok(pre)[0] and order == ['bootstrap.js --roles', 'migrate.js', 'bootstrap.js --policy'] and "'--roles'" in bs and "'--policy'" in bs and 'V-1 failed' in bs, ' → '.join(order))
mainsrc = rd('services/enterprise-api/src/main.ts') + rd('services/enterprise-api/src/modules/routes.ts') if ex('services/enterprise-api/src/modules/routes.ts') else ''
rec('P2-9', 'health check paths are served (/health by the API, /healthz by the web server)', api.get('healthCheckPath') == '/health' and "'/health'" in mainsrc and web.get('healthCheckPath') == '/healthz' and "/healthz" in rd('apps/enterprise-web/server/serve.mjs'))
m = re.search(r'OBJECT_STORE_DIR=(\S+)', df)
rec('P2-10', 'the persistent disk is mounted at the image\'s evidence directory, API only', bool(m) and api.get('disk', {}).get('mountPath') == m.group(1) and 'disk' not in web and isinstance(api.get('disk', {}).get('sizeGB'), int), f"{api.get('disk')} vs OBJECT_STORE_DIR={m.group(1) if m else None}")
keys = {s['name']: [e['key'] for e in s.get('envVars', [])] for s in s2}
unread = [f"{n}:{k}" for n, ks in keys.items() for k in ks if not read_by_code(k)]
rec('P2-11', 'every environment variable is one the code reads', not unread, ', '.join(unread))
need_api = {'DATABASE_URL', 'JWT_SECRET', 'OIDC_ISSUER', 'OIDC_AUDIENCE', 'OIDC_JWKS_URL', 'CORS_ORIGINS', 'EMPATHIA_APP_PASSWORD', 'EMPATHIA_WORKER_PASSWORD', 'PGSSLMODE', 'TRUSTED_PROXY'}
rec('P2-12', 'every variable production requires is declared (API: database, secrets, OIDC, CORS; app: API_URL)', need_api <= set(keys.get('empathia-api', [])) and 'API_URL' in keys.get('empathia-app', []), ', '.join(sorted(need_api - set(keys.get('empathia-api', [])))))
secretish = re.compile(r'(PASSWORD|SECRET|DATABASE_URL|DSN|TOKEN)')
leaks = [f"{s['name']}:{e['key']}" for s in s2 for e in s.get('envVars', []) if secretish.search(e['key']) and 'value' in e]
rec('P2-13', 'no secret has a literal value (generated, from the database, or entered in the dashboard)', not leaks, ', '.join(leaks))
env = {e['key']: e for e in api.get('envVars', [])}
rec('P2-14', 'production mode, OIDC, TLS to the database, proxy-aware client addresses', env.get('NODE_ENV', {}).get('value') == 'production' and env.get('AUTH_MODE', {}).get('value') == 'oidc' and env.get('PGSSLMODE', {}).get('value') == 'require' and env.get('TRUSTED_PROXY', {}).get('value') == 'on')
fd = env.get('DATABASE_URL', {}).get('fromDatabase', {})
rec('P2-15', 'DATABASE_URL comes from the declared database\'s connection string (the owner)', fd.get('name') == db.get('name') and fd.get('property') == 'connectionString' and db.get('user') == 'empathia_owner')
rec('P2-16', 'no development switch: AUTH_MODE is not dev and the web app is in production mode', env.get('AUTH_MODE', {}).get('value') != 'dev' and {e['key']: e.get('value') for e in web.get('envVars', [])}.get('NODE_ENV') == 'production')
names = [s['name'] for s in s1 + s2] + [d['name'] for d in dbs]
rec('P2-17', 'resource names are unique across both Blueprints', len(names) == len(set(names)), ', '.join(names))

out = arg('out')
rep = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'spec': 'https://render.com/docs/blueprint-spec (2026-10-31)', 'results': results,
       'pass': sum(r['result'] == 'PASS' for r in results), 'fail': sum(r['result'] == 'FAIL' for r in results),
       'limits': 'Static check of files only. Not checked here: that Render accepts the files (it validates on Blueprint creation), V-1 (role creation on Render Postgres), V-2 (disk writable by uid 10001), the Docker build itself.'}
if out: open(os.path.join(REPO, out), 'w').write(json.dumps(rep, indent=2) + '\n')
print(f"\nPASS {rep['pass']} · FAIL {rep['fail']}"); sys.exit(1 if rep['fail'] else 0)
