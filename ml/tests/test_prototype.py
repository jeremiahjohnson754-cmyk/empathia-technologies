"""Tests for the synthetic research prototype: encoding, inference parity with training, determinism, refusal of bad input.
    python3 -I -m unittest discover -s ml/tests -v      (from the repository root; run training first)
"""
import json, sys, unittest, subprocess
from pathlib import Path
ML = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML)); sys.path.insert(0, str(ML / "inference")); sys.path.insert(0, str(ML / "training"))
from features import FEATURES, encode_row  # noqa: E402
from predict import load_model, predict  # noqa: E402

ROW = {"phase": 3, "tier": 1, "instrument": 1, "n_devices": 12, "n_families": 6, "large_room": 0, "new_install": 1, "occupancy": 8, "domain": "Audio"}


class Prototype(unittest.TestCase):
    def test_encoding_is_fixed_and_one_hot(self):
        v = encode_row(ROW)
        self.assertEqual(len(v), len(FEATURES))
        doms = [x for f, x in zip(FEATURES, v) if f.startswith("domain=")]
        self.assertEqual(sum(doms), 1.0)
        self.assertEqual(encode_row({**ROW, "domain": "Unseen"})[FEATURES.index("domain=OTHER")], 1.0)

    def test_model_is_labelled_synthetic_and_refuses_mismatched_features(self):
        m = load_model()
        self.assertEqual(m["status"], "RESEARCH_PROTOTYPE_SYNTHETIC_DATA")
        self.assertIn("No real-world predictive validity", m["warning"])
        bad = dict(m, features=m["features"][:-1])
        p = ML / "models" / "_bad.json"; p.write_text(json.dumps(bad))
        try:
            with self.assertRaises(ValueError):
                load_model(p)
        finally:
            p.unlink()

    def test_inference_matches_the_trained_sklearn_model(self):
        """The JSON model (scaler folded into the weights) gives the same scores as the sklearn pipeline it was exported from."""
        import numpy as np
        from sklearn.linear_model import LogisticRegression
        from sklearn.preprocessing import StandardScaler
        from features import encode
        from train import load, split, SEED
        rows = load(); tr, te = split(rows)
        X = encode(rows); y = np.asarray([int(r["failed_first_attempt"]) for r in rows])
        sc = StandardScaler().fit(X[tr]); lr = LogisticRegression(max_iter=2000, C=1.0, random_state=SEED).fit(sc.transform(X[tr]), y[tr])
        sample = [rows[i] for i in te[:500]]
        ref = lr.predict_proba(sc.transform(encode(sample)))[:, 1]
        got = np.asarray(predict(load_model(), sample))
        self.assertLess(float(np.max(np.abs(ref - got))), 1e-4)
        a, b = predict(load_model(), [{**ROW, "instrument": 0}, {**ROW, "instrument": 1}])
        self.assertGreater(b, a, "monotone in the declared direction for the strongest synthetic effect")

    def test_missing_fields_are_refused(self):
        with self.assertRaises(ValueError):
            predict(load_model(), [{"phase": 1}])

    def test_training_is_deterministic(self):
        before = json.loads((ML / "models" / "first_attempt_logreg_v1.json").read_text())
        subprocess.run([sys.executable, "-I", str(ML / "training" / "train.py")], check=True, capture_output=True)
        after = json.loads((ML / "models" / "first_attempt_logreg_v1.json").read_text())
        self.assertEqual(before["weights"], after["weights"])
        self.assertEqual(before["intercept"], after["intercept"])
        self.assertEqual(before["trainedOn"]["sha256"], after["trainedOn"]["sha256"])


if __name__ == "__main__":
    unittest.main()
