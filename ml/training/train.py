"""Train the first-attempt test-failure research prototype on the SYNTHETIC dataset.

    python3 -I ml/training/train.py            (from the repository root)

Seeds are fixed; the split is by room (no room appears in both train and test). Two models: logistic regression (serialized as JSON
coefficients, the inference model) and histogram gradient boosting (comparison only, serialized with joblib for local evaluation —
never load a joblib/pickle file from an untrusted source). PyTorch is not used: it is not installable in this environment (BLOCKED),
and a linear model is sufficient to recover the declared synthetic function.
"""
from __future__ import annotations
import csv, hashlib, json, sys, time
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler
import joblib

ML = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML))
from features import FEATURES, encode  # noqa: E402

SEED = 7
DATA = ML / "datasets" / "synthetic_first_attempt_v1.csv"
MODELS = ML / "models"


def load(path: Path = DATA) -> list[dict]:
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def split(rows: list[dict]):
    groups = np.asarray([r["room"] for r in rows])
    tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=SEED).split(np.zeros(len(rows)), groups=groups))
    return tr, te


def main() -> None:
    t0 = time.time()
    raw = DATA.read_bytes()
    rows = load()
    X, y = encode(rows), np.asarray([int(r["failed_first_attempt"]) for r in rows])
    tr, te = split(rows)
    scaler = StandardScaler().fit(X[tr])
    lr = LogisticRegression(max_iter=2000, C=1.0, random_state=SEED).fit(scaler.transform(X[tr]), y[tr])
    hgb = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.08, random_state=SEED).fit(X[tr], y[tr])
    MODELS.mkdir(exist_ok=True)
    # fold the scaler into raw-feature coefficients so inference is one dot product on encode_row()
    w = lr.coef_[0] / scaler.scale_
    b = float(lr.intercept_[0] - np.sum(lr.coef_[0] * scaler.mean_ / scaler.scale_))
    model = {
        "model": "first_attempt_fail_risk", "version": "0.1.0-synthetic", "kind": "logistic_regression",
        "status": "RESEARCH_PROTOTYPE_SYNTHETIC_DATA", "features": FEATURES, "weights": [round(float(x), 6) for x in w], "intercept": round(b, 6),
        "trainedOn": {"dataset": DATA.name, "sha256": hashlib.sha256(raw).hexdigest(), "rows": int(len(tr)), "rooms": int(len({rows[i]["room"] for i in tr})), "seed": SEED},
        "warning": "Trained on synthetic labels from a declared function. No real-world predictive validity. Do not use for decisions.",
        "trainedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "library": {"scikit-learn": __import__("sklearn").__version__, "numpy": np.__version__},
    }
    (MODELS / "first_attempt_logreg_v1.json").write_text(json.dumps(model, indent=2) + "\n")
    joblib.dump(hgb, MODELS / "first_attempt_hgb_v1.joblib")
    (MODELS / "split_v1.json").write_text(json.dumps({"seed": SEED, "test_rooms": sorted({rows[i]["room"] for i in te})}) + "\n")
    print(json.dumps({"trained": ["logistic_regression", "hist_gradient_boosting"], "train_rows": int(len(tr)), "test_rows": int(len(te)), "seconds": round(time.time() - t0, 1)}))


if __name__ == "__main__":
    main()
