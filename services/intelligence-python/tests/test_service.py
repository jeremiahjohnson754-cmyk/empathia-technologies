"""Service tests over real HTTP: uvicorn is started as a child process (httpx/pytest are not installed here, so urllib + unittest).
    python3 -I -m unittest discover -s services/intelligence-python/tests -v      (from the repository root)
"""
import json, os, subprocess, sys, time, unittest, urllib.request, urllib.error
from pathlib import Path
SVC = Path(__file__).resolve().parents[1]
PORT = 4399
ROW = {"test_id": "audio_level", "domain": "Audio", "phase": 3, "tier": 1, "instrument": True, "n_devices": 12, "n_families": 6, "large_room": False, "new_install": True, "occupancy": 8}


def call(path, body=None, headers=None, method=None):
    data = json.dumps(body).encode() if body is not None and not isinstance(body, bytes) else body
    req = urllib.request.Request(f"http://127.0.0.1:{PORT}{path}", data=data, method=method or ("POST" if data is not None else "GET"), headers={"content-type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


class Service(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        env = {**os.environ, "INTELLIGENCE_TOKEN": "test-token-123"}
        cls.p = subprocess.Popen([sys.executable, "-I", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(PORT), "--log-level", "warning"], cwd=SVC, env=env)
        for _ in range(100):
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{PORT}/health", timeout=1); break
            except Exception:
                time.sleep(0.1)

    @classmethod
    def tearDownClass(cls):
        cls.p.terminate(); cls.p.wait(10)

    def test_health_names_the_model_and_its_status(self):
        s, b = call("/health")
        self.assertEqual(s, 200)
        self.assertEqual(b["models"][0]["status"], "RESEARCH_PROTOTYPE_SYNTHETIC_DATA")

    def test_scores_are_labelled_ranked_and_never_decisions(self):
        rows = [ROW, {**ROW, "test_id": "label_check", "domain": "Physical", "tier": 2, "phase": 2, "instrument": False}]
        s, b = call("/v1/research/first-attempt-risk", {"rows": rows}, {"authorization": "Bearer test-token-123"})
        self.assertEqual(s, 200, b)
        self.assertEqual(b["status"], "RESEARCH_PROTOTYPE_SYNTHETIC_DATA")
        self.assertEqual([x["rank"] for x in b["scores"]], [1, 2])
        self.assertIn("never records, skips, passes or waives", b["use"])

    def test_service_token_is_required(self):
        s, b = call("/v1/research/first-attempt-risk", {"rows": [ROW]})
        self.assertEqual(s, 401)

    def test_contract_violations_are_refused(self):
        h = {"authorization": "Bearer test-token-123"}
        self.assertEqual(call("/v1/research/first-attempt-risk", {"rows": []}, h)[0], 400)
        self.assertEqual(call("/v1/research/first-attempt-risk", {"rows": [{**ROW, "tier": 9}]}, h)[0], 400)
        self.assertEqual(call("/v1/research/first-attempt-risk", {"rows": [{**ROW, "extra": 1}]}, h)[0], 400)
        self.assertEqual(call("/v1/research/first-attempt-risk", b"not json", h)[0], 400)
        s, b = call("/v1/research/first-attempt-risk", b"{}", {**h, "content-type": "text/plain"})
        self.assertEqual(s, 415)


if __name__ == "__main__":
    unittest.main()
