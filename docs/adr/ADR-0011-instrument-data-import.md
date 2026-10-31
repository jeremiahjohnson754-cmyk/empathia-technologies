# ADR-0011 — Instrument-data import: an instrument export becomes traceable field measurements (P2)

Status: implemented 2026-10-31 (Project Ascension directive, P2) · migration `0025_measurement_import.sql`

## Context

P2 asks for "instrument-data ingestion and validation traceable to source, timestamp, equipment, calibration, uncertainty", and says
a software simulation must never be portrayed as a physical measurement. Measurements with provenance already existed (ADR-0004), but
values could only be entered one at a time, with a calibration status that the recorder simply declared.

## Decision

1. **The file is evidence first.** The export is uploaded as an evidence object (SHA-256 recorded at upload), and the import cites it.
   Reading it re-verifies the stored bytes against that hash, applies the caller's site scope, and audits the read.
2. **Declared once per import, applied per row.** Instrument id and model, calibration certificate number and due date, method, and
   instrument uncertainty are given once. Each row's calibration status is **derived**: CALIBRATED only when measured on or before the
   due date, otherwise EXPIRED. The certificate itself is declared, not checked against a calibration lab; the ADR and the API say so.
3. **All-or-nothing validation.** Required columns are metric, value, unit, measured_at and location (uncertainty is optional). Every row
   is checked: field count, metric identifier, numeric value, unit and location length, a date-time that is not in the future,
   non-negative uncertainty, and dBFS never recorded as a sound pressure level. If any row fails, nothing is written. The refusal lists
   every row's reasons (row numbers as a spreadsheet shows them) and is audited. A **dry run** returns the same report without writing
   anything, and says when the file has already been imported. Limits: 2,000 rows and 1 MB per import.
4. **Traceability in the record.** `measurement_import` (append-only) holds the file hash, instrument, calibration, method, uncertainty,
   who imported it and how many rows were within calibration. Each measurement carries `import_id` and `import_row`, and its `source` names
   the file, the hash prefix and the row. A file is imported once per room (UNIQUE).
5. **Nothing is promoted.** Imported values are FIELD_MEASURED and UNREVIEWED. Verification is the existing independent step (never the
   importer). An EXPIRED value can never be verified (existing DB CHECK). The immutability trigger now also covers calibration due, the
   import link and the row number.

## Consequences

- API: `POST /v1/rooms/:room/measurements/import` (150 operations). UI: the room's Acceptance & assurance tab, "Import an instrument
  export" (choose file → check → import).
- Tests: `tests/security/measurement-import.test.mjs` IMP-1..4; browser W-83.
- Not done: vendor-specific export formats (only the documented CSV columns are read); a calibration-certificate registry; linking
  imported values to a commissioning test result (the existing `test_result_id` link is available for manual recording only);
  ingestion from Field Intelligence sessions, which are simulated and must not become measurements.
