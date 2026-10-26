"""Empathia intelligence service (Python) — production-starter boundary for computation that is better done in Python.

Today it serves ONE thing: the synthetic research prototype in ml/ (first-attempt test-failure risk), behind a typed contract, so
the boundary, validation, labelling and tests exist before any real model does. Everything else in Empathia stays in TypeScript,
where the engines already are (see README.md for why).

Framework: Starlette + pydantic + uvicorn. FastAPI (Starlette + pydantic with generated OpenAPI) is the intended framework and is
NOT installable in this offline build (BLOCKED); the handlers below are written so the swap is mechanical.

    python3 -I -m uvicorn app.main:app --host 127.0.0.1 --port 4300   (from services/intelligence-python)
"""
from __future__ import annotations
import os, sys, time
from pathlib import Path
from typing import Literal
from pydantic import BaseModel, Field, ValidationError
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "ml")); sys.path.insert(0, str(REPO / "ml" / "inference"))
from predict import load_model, predict  # noqa: E402

STATUS = "RESEARCH_PROTOTYPE_SYNTHETIC_DATA"
MODEL = load_model()
TOKEN = os.environ.get("INTELLIGENCE_TOKEN")      # service-to-service bearer; required — without it /v1 answers 503 (deny by default)
HEADERS = {"x-content-type-options": "nosniff", "cache-control": "no-store"}


class TestRow(BaseModel):
    """One applicable test of one room, as @empathia/commissioning-engine reports it."""
    model_config = {"extra": "forbid"}
    test_id: str = Field(min_length=1, max_length=80)
    domain: str = Field(min_length=1, max_length=40)
    phase: int = Field(ge=1, le=5)
    tier: int = Field(ge=1, le=3)
    instrument: bool
    n_devices: int = Field(ge=0, le=500)
    n_families: int = Field(ge=0, le=60)
    large_room: bool
    new_install: bool
    occupancy: int = Field(ge=1, le=5000)


class RiskRequest(BaseModel):
    model_config = {"extra": "forbid"}
    rows: list[TestRow] = Field(min_length=1, max_length=500)


class RiskScore(BaseModel):
    test_id: str
    score: float
    rank: int


class RiskResponse(BaseModel):
    status: Literal["RESEARCH_PROTOTYPE_SYNTHETIC_DATA"]
    model: str
    version: str
    scores: list[RiskScore]
    use: str
    warning: str


def problem(status: int, code: str, detail: str, errors: list | None = None) -> JSONResponse:
    return JSONResponse({"type": "about:blank", "title": code, "status": status, "code": code, "detail": detail, **({"errors": errors} if errors else {})}, status_code=status, media_type="application/problem+json", headers=HEADERS)


async def health(_: Request) -> JSONResponse:
    return JSONResponse({"status": "ok", "service": "empathia-intelligence-python", "models": [{"model": MODEL["model"], "version": MODEL["version"], "status": MODEL["status"]}], "note": "research prototype on synthetic data; not production-ready"}, headers=HEADERS)


async def first_attempt_risk(req: Request) -> JSONResponse:
    if not TOKEN:
        return problem(503, "not_configured", "INTELLIGENCE_TOKEN is not set: the service refuses unauthenticated use")
    if req.headers.get("authorization") != f"Bearer {TOKEN}":
        return problem(401, "unauthenticated", "service token required")
    if not req.headers.get("content-type", "").startswith("application/json"):
        return problem(415, "unsupported_media_type", "send JSON")
    body = await req.body()
    if len(body) > 256 * 1024:
        return problem(413, "payload_too_large", "at most 256 KiB")
    try:
        r = RiskRequest.model_validate_json(body)
    except ValidationError as e:
        return problem(400, "validation", "the request does not match the contract", [f"{'.'.join(map(str, x['loc']))}: {x['msg']}" for x in e.errors()][:20])
    t0 = time.perf_counter()
    rows = [{**x.model_dump(), "instrument": int(x.instrument), "large_room": int(x.large_room), "new_install": int(x.new_install)} for x in r.rows]
    p = predict(MODEL, rows)
    order = sorted(range(len(p)), key=lambda i: -p[i])
    rank = {i: k + 1 for k, i in enumerate(order)}
    out = RiskResponse(status=STATUS, model=MODEL["model"], version=MODEL["version"],
                       scores=[RiskScore(test_id=x.test_id, score=round(s, 4), rank=rank[i]) for i, (x, s) in enumerate(zip(r.rows, p))],
                       use="Ordering aid for commissioning work only. A score never records, skips, passes or waives a test.", warning=MODEL["warning"])
    return JSONResponse(out.model_dump(), headers={**HEADERS, "server-timing": f"model;dur={(time.perf_counter() - t0) * 1000:.1f}"})


app = Starlette(routes=[Route("/health", health), Route("/v1/research/first-attempt-risk", first_attempt_risk, methods=["POST"])])
