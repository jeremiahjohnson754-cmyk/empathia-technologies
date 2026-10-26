#!/usr/bin/env python3
"""Stage 0 discovery: a file-level inventory of the founder's workspace (read-only).
Writes docs/discovery/FILE_INVENTORY.csv (path, bytes, sha256, kind, top-level area, git status) and FILE_INVENTORY_SUMMARY.json.
Skips dependency caches (node_modules, .git internals, __pycache__) and records that it skipped them. Never modifies a file.
  python3 -I scripts/discovery/inventory.py /home/claude <out-dir>"""
import csv, hashlib, json, os, pathlib, sys, collections
ROOT = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
SKIP = {'node_modules', '.git', '__pycache__', '.cache', '.npm', '.pnpm-store'}
KIND = {'.js': 'source-js', '.mjs': 'source-js', '.ts': 'source-ts', '.tsx': 'source-ts', '.jsx': 'source-js', '.css': 'source-css', '.html': 'html', '.py': 'source-py', '.ps1': 'source-ps1',
        '.sh': 'script', '.json': 'data-json', '.csv': 'data-csv', '.md': 'doc-md', '.txt': 'text', '.log': 'log', '.xlsx': 'workbook', '.docx': 'document', '.pdf': 'pdf', '.pptx': 'presentation',
        '.mp4': 'video', '.mov': 'video', '.webm': 'video', '.mkv': 'video', '.wav': 'audio', '.mp3': 'audio', '.m4a': 'audio', '.aac': 'audio', '.flac': 'audio',
        '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.webp': 'image', '.svg': 'image-svg', '.gif': 'image', '.glb': '3d', '.gltf': '3d', '.obj': '3d', '.fbx': '3d', '.blend': '3d', '.uasset': 'ue5', '.umap': 'ue5', '.uproject': 'ue5',
        '.zip': 'archive', '.tar': 'archive', '.gz': 'archive', '.sql': 'source-sql', '.yml': 'config', '.yaml': 'config', '.toml': 'config', '.env': 'SECRET-CANDIDATE', '.pem': 'SECRET-CANDIDATE', '.key': 'SECRET-CANDIDATE',
        '.mmd': 'diagram', '.puml': 'diagram', '.srt': 'captions', '.vtt': 'captions', '.ass': 'captions', '.ttf': 'font', '.otf': 'font', '.woff': 'font', '.woff2': 'font', '.sha256': 'hash-list'}
rows = []; skipped = collections.Counter(); kinds = collections.Counter(); areas = collections.defaultdict(lambda: {'files': 0, 'bytes': 0})
for dp, dns, fns in os.walk(ROOT):
    keep = []
    for d in dns:
        if d in SKIP: skipped[os.path.join(dp, d)] += 1
        else: keep.append(d)
    dns[:] = keep
    for fn in fns:
        p = pathlib.Path(dp) / fn
        try: st = p.lstat()
        except OSError: continue
        if not p.is_file() or p.is_symlink(): continue
        h = hashlib.sha256()
        try:
            with open(p, 'rb') as f:
                for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
        except OSError as e: rows.append([str(p.relative_to(ROOT)), st.st_size, f'UNREADABLE:{e.errno}', 'unreadable', '']); continue
        rel = p.relative_to(ROOT); area = rel.parts[0] if len(rel.parts) > 1 else '(top level)'; sub = '/'.join(rel.parts[:3])
        k = KIND.get(p.suffix.lower(), 'other'); kinds[k] += 1; areas[area]['files'] += 1; areas[area]['bytes'] += st.st_size
        rows.append([str(rel), st.st_size, h.hexdigest(), k, area, sub])
with open(OUT / 'FILE_INVENTORY.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['path', 'bytes', 'sha256', 'kind', 'area', 'subarea']); w.writerows(sorted(rows))
json.dump({'root': str(ROOT), 'files': len(rows), 'bytes': sum(r[1] for r in rows), 'kinds': kinds, 'areas': areas, 'skippedDependencyFolders': len(skipped)}, open(OUT / 'FILE_INVENTORY_SUMMARY.json', 'w'), indent=1, default=dict)
print(json.dumps({'files': len(rows), 'kinds': dict(kinds.most_common(15))}))
