# First-attempt failure risk — evaluation (SYNTHETIC DATA)

Held-out rooms: 375 (29062 test rows). Positive rate 0.212.

| Model | ROC AUC | Brier | Log loss | ECE (10 bins) |
|---|---|---|---|---|
| constant_base_rate | 0.5 | 0.167 | 0.5166 | 0.0035 |
| hand_rule | 0.5594 | 0.1655 | 0.512 | 0.0046 |
| logistic_regression | 0.6093 | 0.1625 | 0.5033 | 0.0051 |
| hist_gradient_boosting | 0.606 | 0.1628 | 0.5042 | 0.0037 |
| oracle_true_p | 0.6368 | 0.1601 | 0.4963 | 0.0046 |

Recovered vs declared weights (raw-feature scale):

| Feature | Recovered | Declared |
|---|---|---|
| phase_ge3 | 0.343 | 0.35 |
| tier1 | 0.467 | 0.5 |
| instrument | 0.601 | 0.6 |
| n_devices | 0.034 | 0.03 |
| large_room | 0.264 | 0.3 |
| new_install | 0.188 | 0.2 |
| domain=Audio | 0.314 | 0.45 |
| domain=Video | 0.136 | 0.3 |

On synthetic data generated from a declared logistic function, the logistic model approaches the oracle and roughly recovers the declared weights (with a noise term, recovered weights are attenuated; domain weights are identified only relative to one another, because the one-hot domains and the intercept are collinear). This validates the pipeline (data → features → training → serialization → inference → evaluation), not any real-world prediction.

No real-world predictive validity is claimed.
