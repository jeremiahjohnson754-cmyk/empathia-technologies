#!/usr/bin/env python3
"""Stage 0: the source register — one row per source unit (repository, package, archive, production folder), with the fields the
directive asks for (section 4). Facts that can be computed are computed here (file counts, bytes, a folder manifest hash over the
inventory's per-file SHA-256, git HEAD and tags). Judgements (purpose, maturity, distribution safety, next action) are written in
UNITS below by the builder and are labelled as such in the report.

    python3 -I scripts/discovery/source-register.py <workspace-root> <inventory.csv> <out.csv>
"""
import csv, hashlib, pathlib, subprocess, sys, collections

root, inv, out = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
files = list(csv.DictReader(open(inv)))

def folder_facts(prefix):
    sel = [r for r in files if r['path'] == prefix or r['path'].startswith(prefix.rstrip('/') + '/')]
    h = hashlib.sha256()
    for r in sorted(sel, key=lambda r: r['path']): h.update(f"{r['path']}\t{r['sha256']}\n".encode())
    kinds = collections.Counter(r['kind'] for r in sel)
    return len(sel), sum(int(r['bytes']) for r in sel), (h.hexdigest() if sel else ''), ', '.join(f'{k} {v}' for k, v in kinds.most_common(4))

def git(path, *a):
    try: return subprocess.run(['git', '-C', str(root / path), *a], capture_output=True, text=True, timeout=30).stdout.strip()
    except Exception: return ''

# path | format | purpose | version | deps | ownership/licensing | product | maturity | defects | independently tested | safe to distribute | next action
U = [
 ('Empathia_V25/work/source', 'git repository (HTML/CSS/JS single-file app + Python/Node tooling)', 'V2.5 master source: main branch of the V2.5 demonstrator; worktrees below share this repository', '2.5.1 master', 'Python 3 (build.py), Node 22 + Playwright (tests), no runtime deps', 'AI-assisted (Claude) under founder direction; chain of title: see provenance/chain-of-title', 'all 18 (demonstrator)', 'DEMONSTRATED / BUILDER_TESTED', 'see release reports', 'separate-AI review only (no third-party audit)', 'NO (internal source)', 'keep as history; active work is on the founder/2.5.4 worktree'),
 ('Empathia_V25/work/source-251p', 'git worktree, branch patch/2.5.1.1', '2.5.1.1 security patch line (GAP-AZ-01)', '2.5.1.1 (frozen)', 'as above', 'as above', 'platform', 'BUILDER_TESTED; frozen', 'none open in its records', 'separate-AI review', 'NO (source)', 'preserve unchanged'),
 ('Empathia_V25/work/source-cs', 'git worktree, branch cstudio (tag v2.5.2-rc1)', '2.5.2: Control Studio, Collaboro-Sing, Frontline, Onboard, service desk', '2.5.2 rc1 (frozen, 09db550)', 'as above', 'as above', 'Control Studio, Collaboro-Sing, Frontline, Onboard + platform', 'BUILDER_TESTED; frozen', 'page-API security NOT VERIFIED — EXTERNAL TEST REQUIRED', 'separate-AI review; external security test outstanding', 'NO (source)', 'preserve unchanged; external page-API assessment'),
 ('Empathia_V25/work/source-253', 'git worktree, branch feature/build-a-room (tags v2.5.3-rc1..rc3)', '2.5.3: Build a Room with Lite', '2.5.3 rc3 (frozen, cf86866)', 'as above', 'as above', 'Lite, Drawing Intelligence, Commissioning, Search Party, Pro', 'BUILDER_TESTED; VERIFIED WITH CONDITIONS by a separate-AI release review', 'R3-2/R3-3 (fixed on 2.5.4 branch, not in rc3 bytes)', 'separate-AI review; external security test outstanding', 'NO (source)', 'preserve unchanged'),
 ('Empathia_V25/work/source-254', 'git worktree, branch founder/2.5.4', 'founder program development line: R3-2/R3-3 fixes; Founder Edition development build', '2.5.4-dev (not a release)', 'as above', 'as above', 'all 18 (demonstrator)', 'IMPLEMENTED; room suite 95/95 on the dev build', 'not gated, packaged or reviewed as a release', 'NO', 'NO (source)', 'full gate + packaging + review before any 2.5.4 candidate'),
 ('Empathia_V25/Empathia_Investor_Release_2511', 'release package (HTML editions + docs + evidence)', '2.5.1.1 investor package', '2.5.1.1 (frozen)', 'browser only', 'contains 40 VERIFIED first-party UI captures (investor channel); no unverified media', 'all', 'packaged; frozen', 'see its release report', 'separate-AI review', 'NOT AUTHORIZED (owner approval required)', 'preserve unchanged'),
 ('Empathia_V25/Empathia_Investor_Release_252', 'release package', '2.5.2 rc1 investor package', '2.5.2 rc1 (frozen)', 'browser only', 'as above', 'all', 'packaged; frozen', 'page-API security NOT VERIFIED', 'separate-AI review', 'NOT AUTHORIZED', 'preserve; external assessment'),
 ('Empathia_V25/Empathia_Investor_Release_253_rc3', 'release package (offline + live editions)', '2.5.3 rc3 investor package (current candidate)', '2.5.3 rc3 (frozen)', 'browser only', 'as above', 'all', 'packaged; frozen', 'page-API security NOT VERIFIED', 'separate-AI review; external test outstanding', 'NOT AUTHORIZED', 'preserve; external assessment; owner approval'),
 ('Empathia_V25/Empathia_Engineer_Edition_253_rc3', 'release package (Private Engineer Edition)', 'controlled engineering review edition', '2.5.3 rc3 (frozen)', 'browser only', 'internal technical evidence', 'all', 'packaged; frozen', 'as rc3', 'separate-AI review', 'NO — authorized technical reviewers only', 'preserve'),
 ('Empathia_V25/Empathia_Investor_Release_253', 'release package', '2.5.3 rc1 (superseded, frozen)', '2.5.3 rc1', 'browser only', 'as above', 'all', 'frozen, superseded', 'F-03 (fixed in rc2)', 'separate-AI review', 'NO (superseded)', 'preserve as history'),
 ('Empathia_V25/Empathia_Investor_Release_253_rc2', 'release package', '2.5.3 rc2 (superseded, frozen)', '2.5.3 rc2', 'browser only', 'as above', 'all', 'frozen, superseded', 'R2-1 (fixed in rc3)', 'separate-AI review', 'NO (superseded)', 'preserve as history'),
 ('Empathia_V25/work/frozen', 'deterministic tar archives + .sha256', 'immutable archives of every frozen package', 'n/a', 'none', 'n/a', 'all', 'frozen (chattr +i)', 'none', 'n/a', 'NO (archive of record)', 'keep; verify on every stage checkpoint'),
 ('Empathia_V25/handoff', 'Markdown + JSON', '2.5.2 / 2.5.3 release reports, security briefs, owner decisions, frozen-candidate records', '2.5.3 rc3', 'none', 'builder-authored records', 'all', 'n/a', 'n/a', 'n/a', 'internal; the security briefs go to the external tester only', 'keep current'),
 ('Empathia_V25/release', 'Markdown, CSV, JSON, XLSX', 'release documentation: capability register, integration registry, role matrix, commissioning library and workbooks', '2.5.1–2.5.3', 'none', 'builder-authored', 'all', 'n/a', 'n/a', 'n/a', 'partly (copied into packages after checks)', 'feed the blueprint (docs/)'),
 ('Empathia_V25/legal/media-rights', 'private git repository (ledger CSV, evidence, quarantine, masters)', 'media-rights ledger and protected masters', 'ledger 310 assets', 'none', 'rights NOT ESTABLISHED for most media', 'films and media', 'n/a', '240 UNVERIFIED, 30 EXCLUDED, 40 VERIFIED (investor channel, UI captures)', 'n/a', 'NO (access-controlled)', 'counsel review; obtain licences/terms for narration and generated footage'),
 ('Empathia_V25/legal/distribution', 'deny-list and distribution records', 'hashed deny-list read by release verification', '209 lines', 'none', 'n/a', 'release process', 'n/a', 'n/a', 'n/a', 'NO', 'keep current'),
 ('Empathia_V25/inputs', 'founder-supplied design packages (Markdown, JSON, CSV, HTML, ZIP-extracted folders)', 'V2.1–V2.5 specifications, prompts, FI v1.3/v1.4 materials, directives', 'V2.1–V2.5', 'n/a', 'FOUNDER-SUPPLIED; origin of some inputs (FI v1.3 collector, original commissioning workbook) needs chain-of-title review', 'all', 'SPECIFIED', 'n/a', 'n/a', 'NO (inputs, may contain third-party or workplace-derived material)', 'counsel review of origin (provenance/chain-of-title)'),
 ('Empathia_V25/baseline_v141_readonly', 'read-only V1.4.1 release copy (HTML + source)', 'the V1.4.1 canvas the V2.5 work extends', '1.4.1', 'browser only', 'AI-assisted under founder direction', 'all', 'DEMONSTRATED (V1.4.1)', 'n/a', 'n/a', 'NO (baseline of record)', 'preserve'),
 ('empathia-campus', 'git repository (V0.1–V1.4.1 source, tests, tools, release builds)', 'the original Living Campus demonstrator line', 'v1.4.1 (tag) on feature/relationships-explorer', 'Python 3, Node, Playwright', 'AI-assisted under founder direction; history squashed to 4 commits (earlier history not in git)', 'all', 'DEMONSTRATED / BUILDER_TESTED (V1.4.1 gates)', 'superseded by V2.5', 'n/a', 'NO (source)', 'preserve; reference only'),
 ('Empathia_Products/Onboard', 'git repository + specification package', 'Onboard knowledge system (three books) and its MVP work', 'repo master 2ef17e0', 'Node tooling', 'AI-assisted under founder direction', 'Onboard', 'SPECIFIED; partly IMPLEMENTED', 'books not authored in full', 'reviewer packet prepared; review not performed', 'NO', 'author the books; owner review'),
 ('Empathia_Products/Control_Studio', 'specification package (Markdown)', 'Control Studio PRD, architecture, MVP backlog, acceptance tests', 'v0.1 spec', 'n/a', 'builder-authored', 'Control Studio', 'SPECIFIED (implemented in 2.5.2 as a simulated POC)', 'CS-AT-41 not passed or not run', 'n/a', 'internal', 'keep spec and implementation in step'),
 ('Empathia_Products/Collaboro_Sing', 'Markdown', 'Collaboro-Sing acceptance (proposed matrix)', 'proposed', 'n/a', 'builder-authored', 'Collaboro-Sing', 'SPECIFIED', 'matrix pending owner approval', 'n/a', 'internal', 'owner approval of the matrix'),
 ('Empathia_Products/Frontline', 'Markdown', 'Frontline acceptance (proposed matrix)', 'proposed', 'n/a', 'builder-authored', 'Frontline', 'SPECIFIED', 'matrix pending owner approval', 'n/a', 'internal', 'owner approval of the matrix'),
 ('collabora-sing-synclab', 'Node project (server + public web app) + evidence', 'SyncLab v0.2: remote rehearsal lab (WebRTC/MIDI) — earlier independent build', 'v0.2', 'Node (ws signalling)', 'AI-assisted under founder direction', 'Collaboro-Sing', 'IMPLEMENTED; LOCAL_INTEGRATION_TEST', 'n/a', 'n/a', 'NO', 'reconcile with the 2.5.2 Collaboro-Sing journey'),
 ('collabora-sing-synclab-3d', 'browser 3D project (src, dist, video)', 'SyncLab 3D explainer', 'v1.1', 'Three.js (vendored)', 'AI-assisted; vendored library under its own licence', 'Collaboro-Sing', 'DEMONSTRATED', 'n/a', 'n/a', 'NO', 'ledger the video; SBOM the vendored library'),
 ('Empathia_Film_Campaign', 'film production folder (scripts, storyboards, shot lists, narration, music, timelines, masters, captions, QA)', 'V1.4.1 / V2.5 film campaign: F01–F03, FA, FB, FL, FT, S01–S19', 'final masters', 'ffmpeg, Node renderers, Python tools', 'narration from a hosted voice service and generated footage: rights NOT ESTABLISHED', 'films', 'RENDERED (masters probed)', 'rights not established', 'n/a', 'NO (internal until rights VERIFIED)', 'rights evidence; ledger the masters'),
 ('Empathia_Cinematic_Video_4m18', 'film production folder', 'flagship 4:18 film (FL) and teaser: EDL, storyboard, captions, reproducible project, QA', 'masters 3840x2160 + 9:16', 'ffmpeg, Node', 'as above', 'films', 'RENDERED (4K probed)', 'rights not established', 'n/a', 'NO', 'as above'),
 ('Empathia_FI_Film', 'film production folder', 'Field Intelligence film (IE): 4K captioned, trailer, teaser; collector material', 'out/', 'ffmpeg, Python, PowerShell (collector)', 'as above; the FI collector origin needs chain-of-title review', 'Field Intelligence, films', 'RENDERED', 'rights not established', 'n/a', 'NO', 'as above'),
 ('empathia-film', 'film project (src, audio, out)', 'Empathia 2:00 master, executive 60 s, social 30 s, teaser 15 s', 'out/hq', 'Node renderer, ffmpeg', 'narration "Brian" from a hosted voice service: UNVERIFIED', 'films', 'RENDERED', 'rights UNVERIFIED', 'n/a', 'NO', 'as above'),
 ('empathia-campaign', 'film project (engine, films, audio, out)', 'campaign F02P "The Living System", F04 "What If…", shorts', 'out/', 'Node, ffmpeg', 'as above; F03-v1.mp4 render is truncated (moov atom missing)', 'films', 'RENDERED (F02P, F04); F03-v1 incomplete', 'F03-v1 render truncated', 'n/a', 'NO', 'as above'),
 ('Empathia_Investor_Short_Films', 'film project', 'Film A (Platform Vision) and Film B (Intelligence Becomes Experience)', 'masters', 'Node, ffmpeg', 'as above', 'films', 'RENDERED', 'rights not established', 'n/a', 'NO', 'as above'),
 ('kit133', 'founder-supplied prompt kit (V1.3.3)', 'build directive kit for V1.3.3', '1.3.3', 'n/a', 'FOUNDER-SUPPLIED', 'all', 'SPECIFIED', 'n/a', 'n/a', 'NO', 'archive as provenance'),
 ('kit14', 'founder-supplied prompt kit (V1.4)', 'build directive kit for V1.4', '1.4', 'n/a', 'FOUNDER-SUPPLIED', 'all', 'SPECIFIED', 'n/a', 'n/a', 'NO', 'archive as provenance'),
 ('empathia-technologies', 'git monorepo (TypeScript, SQL, Python, React)', 'founder program: Founder Studio, production starter, blueprint, provenance', '0.1 (this program)', 'Node 22, TypeScript 6, PostgreSQL 16, Python 3.13 (see SBOM)', 'AI-assisted under founder direction', 'platform', 'IMPLEMENTED (in progress)', 'see completion report', 'NO', 'NO (source vault)', 'this program'),
]

rows = []
for (path, fmt, purpose, version, deps, own, product, maturity, defects, indep, safe, nxt) in U:
    n, b, h, kinds = folder_facts(path)
    gp = path if (root / path / '.git').exists() else f'{path}/repo' if (root / path / 'repo' / '.git').exists() else None
    head = (git(gp, 'log', '-1', '--format=%h %cs') + ('' if gp == path else ' (repo/)')) if gp else ''
    tags = git(gp, 'tag').replace('\n', ' ') if gp else ''
    rows.append({'path': path, 'format': fmt, 'purpose': purpose, 'version': version, 'lastCommit': head or 'not a git repository', 'tags': tags,
                 'files': n, 'bytes': b, 'manifestSha256': h, 'contents': kinds, 'dependencies': deps, 'ownershipLicensing': own,
                 'productRelationship': product, 'functionalMaturity': maturity, 'knownDefects': defects, 'independentlyTested': indep,
                 'safeToDistribute': safe, 'nextAction': nxt})
with open(out, 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
print(f'{len(rows)} source units; {sum(r["files"] for r in rows)} files covered')
