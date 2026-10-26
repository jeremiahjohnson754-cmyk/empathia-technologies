# services/intelligence-python

Python boundary of the production starter, for computation that is better done in Python (numerical models, statistics, document
processing). **Today it serves only the synthetic research prototype** from `ml/` — `POST /v1/research/first-attempt-risk` — so that
the service boundary, contract validation, labelling, authentication and tests exist before any real model does.

| | |
|---|---|
| Framework | Starlette 1.6 + pydantic 2 + uvicorn. FastAPI is the intended framework and is **BLOCKED** here (not installable offline); swapping is mechanical (same pydantic models, same handlers). |
| Auth | service-to-service bearer token (`INTELLIGENCE_TOKEN`, required: without it `/v1` answers 503); the enterprise API is the only intended caller. End users never call this service directly. |
| Contract | `RiskRequest` / `RiskResponse` in `app/main.py`; extra fields refused; at most 500 rows or 256 KiB. |
| Labelling | every response carries `status: RESEARCH_PROTOTYPE_SYNTHETIC_DATA` and a statement that a score never records, skips, passes or waives a test. |
| Tests | `tests/test_service.py` — 4 tests over real HTTP (uvicorn child process). |

Why not more Python? The rules engines (classification, applicability, results, lifecycle, assurance, relationships) already run in
TypeScript in one process with the API and the browser; moving them would duplicate tested logic for no gain. Python is added where a
library genuinely earns it — numerical modelling now; candidates later: acoustic simulation, PDF/drawing extraction, optimisation.

Run (from this folder): `python3 -I -m uvicorn app.main:app --host 127.0.0.1 --port 4300`
Test (from the repository root): `python3 -I -m unittest discover -s services/intelligence-python/tests -v`
