"""Evaluate the research prototype on the held-out rooms, against baselines and against the synthetic ground truth.

    python3 -I ml/evaluation/evaluate.py      → ml/evaluation/results/metrics_v1.json and REPORT_v1.md

Baselines: the training base rate (constant), and a hand rule (tier 1 + instrument-measured + audio/video domain) — what an engineer
might do without a model. The "oracle" uses the generator's own true probability: the ceiling any model could reach on this synthetic
data. Matching the oracle shows only that the model rediscovered the declared function, not that it would work on real rooms.
"""
from __future__ import annotations
import json, sys
from pathlib import Path
import numpy as np
from sklearn.metrics import roc_auc_score, brier_score_loss, log_loss
import joblib

ML = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML)); sys.path.insert(0, str(ML / "training")); sys.path.insert(0, str(ML / "inference"))
from features import encode, FEATURES  # noqa: E402
from train import load, split  # noqa: E402
from predict import load_model, predict  # noqa: E402

OUT = ML / "evaluation" / "results"


def ece(y: np.ndarray, p: np.ndarray, bins: int = 10) -> float:
    edges = np.linspace(0, 1, bins + 1); e = 0.0
    for a, b in zip(edges[:-1], edges[1:]):
        m = (p >= a) & (p < b) if b < 1 else (p >= a) & (p <= b)
        if m.any():
            e += m.mean() * abs(y[m].mean() - p[m].mean())
    return float(e)


def scores(y, p):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return {"roc_auc": round(float(roc_auc_score(y, p)), 4), "brier": round(float(brier_score_loss(y, p)), 4), "log_loss": round(float(log_loss(y, p)), 4), "ece_10": round(ece(y, p), 4)}


def main() -> None:
    rows = load(); tr, te = split(rows)
    test = [rows[i] for i in te]; y = np.asarray([int(r["failed_first_attempt"]) for r in test])
    base = float(np.mean([int(rows[i]["failed_first_attempt"]) for i in tr]))
    model = load_model()
    p_lr = np.asarray(predict(model, test))
    p_hgb = joblib.load(ML / "models" / "first_attempt_hgb_v1.joblib").predict_proba(encode(test))[:, 1]
    rule = np.asarray([(1 if r["tier"] == "1" else 0) + int(r["instrument"]) + (1 if r["domain"] in ("Audio", "Video") else 0) for r in test], dtype=float)
    rule_p = base + (rule - rule.mean()) * 0.05
    oracle = np.asarray([float(r["true_p"]) for r in test])
    res = {
        "status": "RESEARCH_PROTOTYPE_SYNTHETIC_DATA", "test_rows": int(len(test)), "test_rooms": int(len({r["room"] for r in test})), "positive_rate_test": round(float(y.mean()), 4), "base_rate_train": round(base, 4),
        "models": {"constant_base_rate": scores(y, np.full(len(y), base)), "hand_rule": scores(y, np.clip(rule_p, 0.01, 0.99)), "logistic_regression": scores(y, p_lr), "hist_gradient_boosting": scores(y, p_hgb), "oracle_true_p": scores(y, oracle)},
        "recovered_weights": {f: w for f, w in zip(FEATURES, model["weights"]) if f in ("tier1", "phase_ge3", "instrument", "n_devices", "large_room", "new_install", "domain=Audio", "domain=Video")},
        "declared_truth": {"tier1": 0.5, "phase_ge3": 0.35, "instrument": 0.6, "n_devices": 0.03, "large_room": 0.3, "new_install": 0.2, "domain=Audio": 0.45, "domain=Video": 0.30},
        "interpretation": "On synthetic data generated from a declared logistic function, the logistic model approaches the oracle and roughly recovers the declared weights (with a noise term, recovered weights are attenuated; domain weights are identified only relative to one another, because the one-hot domains and the intercept are collinear). This validates the pipeline (data → features → training → serialization → inference → evaluation), not any real-world prediction.",
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "metrics_v1.json").write_text(json.dumps(res, indent=2) + "\n")
    lines = ["# First-attempt failure risk — evaluation (SYNTHETIC DATA)", "", f"Held-out rooms: {res['test_rooms']} ({res['test_rows']} test rows). Positive rate {res['positive_rate_test']}.", "", "| Model | ROC AUC | Brier | Log loss | ECE (10 bins) |", "|---|---|---|---|---|"]
    for k, v in res["models"].items():
        lines.append(f"| {k} | {v['roc_auc']} | {v['brier']} | {v['log_loss']} | {v['ece_10']} |")
    lines += ["", "Recovered vs declared weights (raw-feature scale):", "", "| Feature | Recovered | Declared |", "|---|---|---|"]
    for k, v in res["recovered_weights"].items():
        lines.append(f"| {k} | {v:.3f} | {res['declared_truth'].get(k, '—')} |")
    lines += ["", res["interpretation"], "", "No real-world predictive validity is claimed."]
    (OUT / "REPORT_v1.md").write_text("\n".join(lines) + "\n")
    print(json.dumps(res["models"], indent=1))


if __name__ == "__main__":
    main()
