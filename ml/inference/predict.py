"""Inference for the first-attempt test-failure research prototype: a JSON logistic model applied to encoded rows (no pickles).

    from ml.inference.predict import load_model, predict
    p = predict(load_model(), [{"phase": 3, "tier": 1, "instrument": 1, "n_devices": 12, "n_families": 6, "large_room": 0, "new_install": 1, "occupancy": 8, "domain": "Audio"}])

Every response carries status RESEARCH_PROTOTYPE_SYNTHETIC_DATA. The output is a synthetic-data score, not a probability about a real room.
"""
from __future__ import annotations
import json, math, sys
from pathlib import Path

ML = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML))
from features import FEATURES, encode_row  # noqa: E402

MODEL = ML / "models" / "first_attempt_logreg_v1.json"
REQUIRED = ["phase", "tier", "instrument", "n_devices", "n_families", "large_room", "new_install", "occupancy", "domain"]


def load_model(path: Path = MODEL) -> dict:
    m = json.loads(path.read_text())
    if m.get("features") != FEATURES:
        raise ValueError("model features do not match ml/features.py: retrain or use the matching code revision")
    if m.get("status") != "RESEARCH_PROTOTYPE_SYNTHETIC_DATA":
        raise ValueError("unexpected model status")
    return m


def predict(model: dict, rows: list[dict]) -> list[float]:
    out = []
    for r in rows:
        missing = [k for k in REQUIRED if k not in r]
        if missing:
            raise ValueError(f"missing fields: {', '.join(missing)}")
        z = model["intercept"] + sum(w * x for w, x in zip(model["weights"], encode_row(r)))
        out.append(1.0 / (1.0 + math.exp(-z)))
    return out


if __name__ == "__main__":
    rows = json.loads(sys.stdin.read() or "[]")
    m = load_model()
    print(json.dumps({"status": m["status"], "model": m["model"], "version": m["version"], "scores": [round(p, 4) for p in predict(m, rows)], "warning": m["warning"]}))
