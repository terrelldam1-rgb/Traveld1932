"""Backend tests for TripHost API"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://trip-host.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def host_user():
    email = f"TEST_host_{uuid.uuid4().hex[:8]}@triphost.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "hostpass1", "name": "Host Tester"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"token": data["token"], "user": data["user"], "email": email}


@pytest.fixture(scope="module")
def guest_user():
    email = f"TEST_guest_{uuid.uuid4().hex[:8]}@triphost.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "guestpass1", "name": "Guest Tester"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"token": data["token"], "user": data["user"], "email": email}


def h(token):
    return {"Authorization": f"Bearer {token}"}


# ============ AUTH ============
class TestAuth:
    def test_register_duplicate(self, host_user):
        r = requests.post(f"{API}/auth/register", json={"email": host_user["email"], "password": "x12345", "name": "dup"})
        assert r.status_code == 400

    def test_login_success(self, host_user):
        r = requests.post(f"{API}/auth/login", json={"email": host_user["email"], "password": "hostpass1"})
        assert r.status_code == 200
        assert "token" in r.json()
        assert r.json()["user"]["email"] == host_user["email"].lower()

    def test_login_fail(self, host_user):
        r = requests.post(f"{API}/auth/login", json={"email": host_user["email"], "password": "WRONG"})
        assert r.status_code == 401

    def test_me(self, host_user):
        r = requests.get(f"{API}/auth/me", headers=h(host_user["token"]))
        assert r.status_code == 200
        assert r.json()["id"] == host_user["user"]["id"]

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ============ TRIPS ============
@pytest.fixture(scope="module")
def created_trip(host_user):
    payload = {
        "name": "TEST_Bali Hop",
        "destination": "Bali, Indonesia",
        "start_date": "2026-06-10",
        "end_date": "2026-06-20",
        "pool_goal": 2000,
        "category_goals": {"flight": 800, "hotel": 600},
    }
    r = requests.post(f"{API}/trips", json=payload, headers=h(host_user["token"]))
    assert r.status_code == 200, r.text
    return r.json()


class TestTrips:
    def test_create_and_persist(self, host_user, created_trip):
        assert created_trip["name"] == "TEST_Bali Hop"
        assert len(created_trip["invite_code"]) == 6
        trip_id = created_trip["id"]
        r = requests.get(f"{API}/trips/{trip_id}", headers=h(host_user["token"]))
        assert r.status_code == 200
        assert r.json()["id"] == trip_id
        assert "_id" not in r.json()

    def test_list_trips(self, host_user, created_trip):
        r = requests.get(f"{API}/trips", headers=h(host_user["token"]))
        assert r.status_code == 200
        assert any(t["id"] == created_trip["id"] for t in r.json())

    def test_patch_trip(self, host_user, created_trip):
        r = requests.patch(f"{API}/trips/{created_trip['id']}", json={"name": "TEST_Bali Updated"}, headers=h(host_user["token"]))
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Bali Updated"
        g = requests.get(f"{API}/trips/{created_trip['id']}", headers=h(host_user["token"]))
        assert g.json()["name"] == "TEST_Bali Updated"

    def test_join_invalid_code(self, guest_user):
        r = requests.post(f"{API}/trips/join", json={"invite_code": "ZZZZZZ"}, headers=h(guest_user["token"]))
        assert r.status_code == 404

    def test_join_trip_with_code(self, guest_user, created_trip):
        r = requests.post(f"{API}/trips/join", json={"invite_code": created_trip["invite_code"]}, headers=h(guest_user["token"]))
        assert r.status_code == 200
        member_ids = [m["id"] for m in r.json()["members_detail"]]
        assert guest_user["user"]["id"] in member_ids

    def test_non_member_forbidden(self, created_trip):
        # Register a third user
        email = f"TEST_third_{uuid.uuid4().hex[:8]}@triphost.com"
        reg = requests.post(f"{API}/auth/register", json={"email": email, "password": "thirdpass1", "name": "Third"})
        tok = reg.json()["token"]
        r = requests.get(f"{API}/trips/{created_trip['id']}", headers=h(tok))
        assert r.status_code == 403

    def test_host_cannot_leave(self, host_user, created_trip):
        r = requests.post(f"{API}/trips/{created_trip['id']}/leave", headers=h(host_user["token"]))
        assert r.status_code == 400

    def test_guest_can_leave(self, guest_user, created_trip):
        r = requests.post(f"{API}/trips/{created_trip['id']}/leave", headers=h(guest_user["token"]))
        assert r.status_code == 200
        # rejoin for later tests
        requests.post(f"{API}/trips/join", json={"invite_code": created_trip["invite_code"]}, headers=h(guest_user["token"]))


# ============ FLIGHTS ============
class TestFlights:
    def test_add_and_list_flight(self, host_user, created_trip):
        payload = {
            "trip_id": created_trip["id"],
            "airline": "TestAir",
            "flight_number": "TA101",
            "departure_airport": "JFK",
            "arrival_airport": "DPS",
            "departure_time": "2026-12-10T08:30:00",
            "arrival_time": "2026-12-11T18:00:00",
        }
        r = requests.post(f"{API}/flights", json=payload, headers=h(host_user["token"]))
        assert r.status_code == 200, r.text
        fid = r.json()["id"]
        assert "_id" not in r.json()

        lst = requests.get(f"{API}/flights?trip_id={created_trip['id']}", headers=h(host_user["token"]))
        assert lst.status_code == 200
        assert any(f["id"] == fid for f in lst.json())

        d = requests.delete(f"{API}/flights/{fid}", headers=h(host_user["token"]))
        assert d.status_code == 200

    def test_flight_for_non_member_trip(self, guest_user):
        # guest tries to add flight to non-existent trip
        r = requests.post(f"{API}/flights", json={
            "trip_id": str(uuid.uuid4()),
            "airline": "X", "flight_number": "Y",
            "departure_airport": "A", "arrival_airport": "B",
            "departure_time": "2026-12-10T08:30:00",
            "arrival_time": "2026-12-11T18:00:00",
        }, headers=h(guest_user["token"]))
        assert r.status_code in (403, 404)


# ============ PAYMENTS ============
class TestPayments:
    def test_packages(self):
        r = requests.get(f"{API}/payments/packages")
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert set(ids) == {"tier_25", "tier_50", "tier_100", "tier_250", "tier_500"}

    def test_checkout_invalid_package(self, host_user, created_trip):
        r = requests.post(f"{API}/payments/checkout", json={
            "trip_id": created_trip["id"],
            "package_id": "tier_999",
            "category": "flight",
            "origin_url": BASE_URL,
        }, headers=h(host_user["token"]))
        assert r.status_code == 400

    def test_checkout_creates_session(self, host_user, created_trip):
        r = requests.post(f"{API}/payments/checkout", json={
            "trip_id": created_trip["id"],
            "package_id": "tier_50",
            "category": "flight",
            "origin_url": BASE_URL,
        }, headers=h(host_user["token"]))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["amount"] == 50.0
        assert data["url"].startswith("http")
        assert data["session_id"]

        # status endpoint
        s = requests.get(f"{API}/payments/status/{data['session_id']}", headers=h(host_user["token"]))
        assert s.status_code == 200
        assert "payment_status" in s.json()


# ============ CLEANUP ============
class TestCleanup:
    def test_delete_trip(self, host_user, created_trip):
        r = requests.delete(f"{API}/trips/{created_trip['id']}", headers=h(host_user["token"]))
        assert r.status_code == 200
        g = requests.get(f"{API}/trips/{created_trip['id']}", headers=h(host_user["token"]))
        assert g.status_code in (403, 404)
