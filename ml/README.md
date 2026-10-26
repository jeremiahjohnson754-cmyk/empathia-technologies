# ml/ — machine-learning research prototypes

**Status: one research prototype on synthetic data. No trained model on real data exists anywhere in Empathia.**
The demonstrator's "intelligence" features are deterministic rules, graph traversal, SQL and keyword retrieval — see
`docs/algorithms/ENGINE_INVENTORY.md`. PyTorch is not installed and cannot be installed in this build environment: **BLOCKED**.

| Path | What |
|---|---|
| `datasets/generate_synthetic.mjs` | synthetic dataset: real engine features, labels from a declared function (seeded, reproducible) |
| `features.py` | the one feature encoding used by training, evaluation and inference |
| `training/train.py` | logistic regression (exported as JSON) and gradient boosting (comparison) |
| `evaluation/evaluate.py` | held-out rooms; constant, hand-rule and oracle baselines; AUC, Brier, log loss, ECE → `evaluation/results/` |
| `inference/predict.py` | pickle-free inference from the JSON model |
| `models/first_attempt_logreg_v1.json` | the exported model (labelled RESEARCH_PROTOTYPE_SYNTHETIC_DATA) |
| `model-cards/first-attempt-fail-risk.md` | model card |
| `tests/test_prototype.py` | 5 tests: encoding, parity with sklearn, refusal of bad input, model labelling, deterministic training |

Run (from the repository root):
```bash
node ml/datasets/generate_synthetic.mjs      # needs packages/commissioning-engine built
python3 -I ml/training/train.py
python3 -I ml/evaluation/evaluate.py
python3 -I -m unittest discover -s ml/tests -v
```
