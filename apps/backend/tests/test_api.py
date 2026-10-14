"""MA1 API Tests v8 — with Anthropic mock"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
os.environ["ANTHROPIC_API_KEY"] = "sk-ant-test-key"
os.environ["APP_ENV"] = "test"

from api import app
client = TestClient(app)

import security


_n = [0]


def make_user(admin=False):
    """Crée un utilisateur et renvoie (user_id, en-têtes Authorization)."""
    _n[0] += 1
    email = f"auto{_n[0]}@test.com"
    r = client.post("/auth/register", json={"email": email, "password": "pass123"})
    if admin:
        import api
        api.ADMIN_EMAILS = set(api.ADMIN_EMAILS) | {email}
    return r.json()["user_id"], {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    security._hits.clear(); security._fails.clear()
    yield

def mock_claude(text="Reponse test"):
    m = MagicMock()
    m.content = [MagicMock(text=text)]
    return m


class TestHealth:
    def test_health(self):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        assert "8.0" in r.json()["version"]


class TestAuth:
    def test_register(self):
        r = client.post("/auth/register", json={"email": "t1@test.com", "password": "pass123", "name": "Test"})
        assert r.status_code == 200
        assert r.json()["success"]
        assert "token" in r.json()

    def test_register_duplicate(self):
        client.post("/auth/register", json={"email": "dup@test.com", "password": "pass123"})
        r = client.post("/auth/register", json={"email": "dup@test.com", "password": "pass123"})
        assert r.status_code == 400

    def test_register_underage(self):
        r = client.post("/auth/register", json={"email": "kid@test.com", "password": "pass123", "birth_year": 2015})
        assert r.status_code == 400

    def test_login_ok(self):
        client.post("/auth/register", json={"email": "log@test.com", "password": "pass123"})
        r = client.post("/auth/login", json={"email": "log@test.com", "password": "pass123"})
        assert r.status_code == 200
        assert r.json()["success"]

    def test_login_bad_pw(self):
        client.post("/auth/register", json={"email": "bad@test.com", "password": "pass123"})
        r = client.post("/auth/login", json={"email": "bad@test.com", "password": "wrong"})
        assert r.status_code == 401

    def test_auth_me(self):
        r = client.post("/auth/register", json={"email": "me@test.com", "password": "pass123", "name": "Me"})
        token = r.json()["token"]
        r2 = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200
        assert r2.json()["name"] == "Me"


class TestPricing:
    def test_pricing(self):
        r = client.get("/pricing")
        plans = r.json()["plans"]
        assert [p["price_eur"] for p in plans] == [0, 10, 79, 200]

    def test_upgrade(self):
        _, h = make_user(admin=True)
        r = client.post("/plan/upgrade", json={"user_id": "u_test", "plan": "premium"}, headers=h)
        assert r.json()["plan"] == "premium"

    def test_upgrade_invalid(self):
        _, h = make_user(admin=True)
        r = client.post("/plan/upgrade", json={"user_id": "u_test", "plan": "invalid"}, headers=h)
        assert r.status_code == 400


class TestProfile:
    def test_new_profile(self):
        uid, h = make_user()
        r = client.get(f"/profile/{uid}", headers=h)
        assert r.json()["score_total"] == 0
        assert r.json()["level"] == "debutant"


class TestReadiness:
    def test_zero(self):
        uid, h = make_user()
        r = client.get(f"/readiness/{uid}", headers=h)
        assert r.json()["readiness"] == 0
        assert r.json()["status"] == "continuez"


class TestPlan30:
    def test_plan(self):
        r = client.get("/plan/30days")
        assert len(r.json()["plan"]) == 30


class TestLeaderboard:
    def test_leaderboard(self):
        r = client.get("/leaderboard")
        assert "leaderboard" in r.json()


class TestChat:
    @patch("api.get_claude")
    def test_chat_ok(self, mock_get):
        mc = MagicMock()
        mc.messages.create.return_value = mock_claude("La vitesse max est de 130 km/h sur autoroute.")
        mock_get.return_value = mc
        r = client.post("/chat", json={"message": "Vitesse autoroute?", "user_id": "u_chat"})
        assert r.status_code == 200
        assert "130" in r.json()["answer"]

    @patch("api.get_claude")
    def test_chat_disclaimer(self, mock_get):
        mc = MagicMock()
        mc.messages.create.return_value = mock_claude("Test reponse")
        mock_get.return_value = mc
        r = client.post("/chat", json={"message": "Test", "user_id": "u_disc"})
        assert "outil" in r.json()["answer"].lower() or "juridique" in r.json()["answer"].lower()


class TestQCM:
    @patch("api.get_claude")
    def test_qcm_generate(self, mock_get):
        mc = MagicMock()
        mc.messages.create.return_value = mock_claude(
            '[{"id":"q1","question":"Test?","choices":["A","B","C","D"],"answer_index":0,"explanation":"Ok","ref":"Art.1"}]'
        )
        mock_get.return_value = mc
        r = client.post("/qcm/generate", json={"topic": "vitesse", "n": 1, "user_id": "u_qcm"})
        assert r.status_code == 200
        assert len(r.json()["questions"]) >= 1

    def test_qcm_result(self):
        uid, h = make_user()
        r = client.post("/qcm/result", json={"user_id": uid, "topic": "vitesse", "correct": True}, headers=h)
        assert r.status_code == 200
        assert r.json()["profile"]["score_correct"] >= 1


class TestExam:
    def test_exam_result(self):
        uid, h = make_user()
        r = client.post("/exam/result", json={"user_id": uid, "correct": 35, "total": 40, "time_seconds": 1200}, headers=h)
        assert r.status_code == 200
        assert r.json()["result"]["passed"] == True
        assert r.json()["result"]["pct"] == 88


class TestRGPD:
    def test_export(self):
        uid, h = make_user()
        r = client.get(f"/rgpd/export/{uid}", headers=h)
        assert r.status_code == 200

    def test_delete(self):
        uid, h = make_user()
        r2 = client.delete(f"/rgpd/delete/{uid}", headers=h)
        assert r2.json()["success"]


class TestReferral:
    def test_get_code(self):
        uid, h = make_user()
        r = client.get(f"/referral/{uid}", headers=h)
        assert r.status_code == 200
        assert r.json()["code"].startswith("MA1-")


class TestAnalytics:
    def test_track(self):
        r = client.post("/analytics/event", json={"user_id": "u_track", "event": "test", "data": {}})
        assert r.json()["tracked"]

    def test_summary(self):
        _, h = make_user(admin=True)
        r = client.get("/analytics/summary?days=7", headers=h)
        assert r.status_code == 200
        assert "total_users" in r.json()


class TestSecurityGuards:
    def test_login_lockout(self):
        for _ in range(8):
            assert client.post("/auth/login", json={"email": "ghost@test.com", "password": "x"}).status_code == 401
        assert client.post("/auth/login", json={"email": "ghost@test.com", "password": "x"}).status_code == 429

    def test_register_rate_limited(self):
        codes = [client.post("/auth/register", json={"email": f"rl{i}@test.com", "password": "pass123"}).status_code for i in range(7)]
        assert 429 in codes

    def test_auth_me_requires_token(self):
        assert client.get("/auth/me").status_code == 401
