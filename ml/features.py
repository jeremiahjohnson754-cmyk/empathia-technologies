"""Feature encoding shared by training, evaluation and inference (one definition, so they cannot drift apart).

Inputs are the columns of the synthetic dataset (ml/datasets/generate_synthetic.mjs). The encoding is explicit and stable: one-hot
vocabularies are fixed here, not learned from data, so a JSON-serialized linear model can be applied without pickles.
"""
from __future__ import annotations
import math
import numpy as np

DOMAINS = ["Accessibility", "Assurance", "Audio", "Change", "Compute", "Control", "Cybersecurity", "Design", "Experience", "Lighting", "Network", "Physical", "Power", "Safety", "Signage", "UC", "Video"]
NUMERIC = ["phase_ge3", "tier1", "instrument", "n_devices", "n_families", "large_room", "new_install", "log_occupancy"]
FEATURES = NUMERIC + [f"domain={d}" for d in DOMAINS] + ["domain=OTHER"]


def encode_row(r: dict) -> list[float]:
    phase, tier = int(r["phase"]), int(r["tier"])
    v = [1.0 if phase >= 3 else 0.0, 1.0 if tier == 1 else 0.0, float(r["instrument"]), float(r["n_devices"]), float(r["n_families"]),
         float(r["large_room"]), float(r["new_install"]), math.log1p(float(r["occupancy"]))]
    dom = str(r["domain"])
    v += [1.0 if dom == d else 0.0 for d in DOMAINS] + [0.0 if dom in DOMAINS else 1.0]
    return v


def encode(rows: list[dict]) -> np.ndarray:
    return np.asarray([encode_row(r) for r in rows], dtype=np.float64)
