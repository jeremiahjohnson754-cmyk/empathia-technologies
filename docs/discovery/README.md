# Discovery records (Stage 0)

- `REPOSITORY_DISCOVERY_REPORT.md` — the report.
- `SOURCE_REGISTER.csv` — one row per source unit with the directive's fields.
- `FILE_INVENTORY.csv.gz` — every file: path, bytes, SHA-256, kind, area. (`gunzip -k` to read; the uncompressed CSV is git-ignored.)
- `FILE_INVENTORY_SUMMARY.json` — totals by kind and area.
- `SECRET_SCAN.json` — secret-pattern scan result (pattern names and locations only).

Regenerate: `python3 -I scripts/discovery/inventory.py /home/claude docs/discovery`, then `source-register.py` and `secret-scan.py`.
