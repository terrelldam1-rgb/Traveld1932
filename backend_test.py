"""
Travel'D backend tests covering:
  1. /api/auth/me fix (must return 200 with role, phone, emergency_contact)
  2. POST /api/trips with description/lodging/itinerary/max_members/pay_full_enabled
     plus admin-only is_public/tags enforcement.
  3. Host transport on behalf of member, transport-status endpoint, and chat announcement.

Cleans up any trips it creates.
"""
import os
import sys
import json
import requests
from datetime import datetime, timezone, timedelta

BASE = os.environ.get("BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE}/api"

DEMO_EMAIL = "demo@triphost.com"
DEMO_PASS = "demo1234"
FOUNDER_EMAIL = "terrelldam1@gmail.com"
# Reuse a stable test password for first-login auto-set (or normal login if already set)
FOUNDER_PASS = "FounderTest!2026"


class TestRunner:
    def __init__(self):
        self.results = []  # (name, ok, detail)
        self.created_trip_ids = []

    def record(self, name, ok, detail=""):
        marker = "PASS" if ok else "FAIL"
        print(f"[{marker}] {name}" + (f" :: {detail}" if detail else ""))
        self.results.append((name, ok, detail))
        return ok

    def summary(self):
        passed = sum(1 for _, ok, _ in self.results if ok)
        total = len(self.results)
        print("\n" + "=" * 70)
        print(f"RESULTS: {passed}/{total} passed")
        print("=" * 70)
        for name, ok, detail in self.results:
            mark = "PASS" if ok else "FAIL"
            print(f"  [{mark}] {name}{(' :: ' + detail) if detail else ''}")
        return passed == total


def login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    return r


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def main():
    t = TestRunner()

    # ---------- 1. /api/auth/me ----------
    print("\n=== 1) Auth /me fix ===")
    r = login(DEMO_EMAIL, DEMO_PASS)
    if not t.record("login demo user", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}"):
        t.summary(); sys.exit(1)
    demo_data = r.json()
    demo_token = demo_data["token"]
    demo_user = demo_data["user"]
    demo_user_id = demo_user["id"]

    r = requests.get(f"{API}/auth/me", headers=auth_headers(demo_token), timeout=15)
    ok = r.status_code == 200
    me = r.json() if ok else {}
    t.record("GET /api/auth/me returns 200", ok, f"status={r.status_code} body={r.text[:200]}")
    required_fields = ["id", "email", "name", "role", "phone", "emergency_contact"]
    have_all = all(f in me for f in required_fields)
    t.record(
        "/auth/me has id/email/name/role/phone/emergency_contact",
        have_all,
        f"keys={list(me.keys())}",
    )
    t.record("/auth/me role == 'user' for demo", me.get("role") == "user", f"role={me.get('role')}")

    # ---------- Founder admin login (first-login may auto-set password) ----------
    print("\n=== Founder admin login ===")
    r = login(FOUNDER_EMAIL, FOUNDER_PASS)
    if r.status_code != 200:
        # password may already be set to something else — fail but continue
        t.record("admin login founder", False,
                 f"status={r.status_code} body={r.text[:200]} — try resetting password_pending=true in mongo to use FOUNDER_PASS")
        t.summary(); sys.exit(1)
    t.record("admin login founder", True)
    admin_data = r.json()
    admin_token = admin_data["token"]
    admin_user = admin_data["user"]
    admin_user_id = admin_user["id"]
    t.record("founder role == admin", admin_user.get("role") == "admin", f"role={admin_user.get('role')}")

    r = requests.get(f"{API}/auth/me", headers=auth_headers(admin_token), timeout=15)
    me_admin = r.json() if r.status_code == 200 else {}
    t.record("GET /auth/me admin returns role=admin",
             r.status_code == 200 and me_admin.get("role") == "admin",
             f"status={r.status_code} role={me_admin.get('role')}")

    # ---------- 2. Trip creation ----------
    print("\n=== 2) Trip creation with extra fields ===")
    start = (datetime.now(timezone.utc) + timedelta(days=30)).date().isoformat()
    end = (datetime.now(timezone.utc) + timedelta(days=37)).date().isoformat()

    base_trip_payload = {
        "name": "Backend Test Trip — Tokyo Cherry Blossoms",
        "destination": "Tokyo, Japan",
        "start_date": start,
        "end_date": end,
        "description": "A 7-day group trip exploring Tokyo during cherry blossom season.",
        "lodging": "Park Hyatt Tokyo — twin rooms, breakfast included",
        "itinerary": [
            {"day": 1, "title": "Arrival", "details": "Land at Haneda, check-in, evening Shibuya stroll"},
            {"day": 2, "title": "Asakusa & Senso-ji", "details": "Temple, market, sushi dinner"},
            {"day": 3, "title": "Mount Fuji day trip", "details": "Bullet train to Hakone"},
        ],
        "max_members": 12,
        "pay_full_enabled": True,
        "pool_goal": 12000.0,
        "solo_price": 2500.0,
    }

    # 2a. Demo user creates a private trip — should succeed
    r = requests.post(f"{API}/trips", headers=auth_headers(demo_token), json=base_trip_payload, timeout=15)
    ok = r.status_code == 200
    t.record("demo user creates private trip", ok, f"status={r.status_code} body={r.text[:200]}")
    demo_trip = None
    if ok:
        demo_trip = r.json()
        t.created_trip_ids.append(demo_trip["id"])
        # verify persisted fields
        checks = {
            "description": demo_trip.get("description") == base_trip_payload["description"],
            "lodging": demo_trip.get("lodging") == base_trip_payload["lodging"],
            "itinerary length 3": len(demo_trip.get("itinerary") or []) == 3,
            "max_members 12": demo_trip.get("max_members") == 12,
            "pay_full_enabled True": demo_trip.get("pay_full_enabled") is True,
            "is_public False (default)": demo_trip.get("is_public") is False,
        }
        for k, v in checks.items():
            t.record(f"trip persists {k}", bool(v), f"value={demo_trip.get(k.split()[0])}")

    # 2b. max_members clamping (>15 should clamp to 15)
    big_payload = {**base_trip_payload, "name": "Big Trip", "max_members": 50}
    r = requests.post(f"{API}/trips", headers=auth_headers(demo_token), json=big_payload, timeout=15)
    if r.status_code == 200:
        big = r.json()
        t.created_trip_ids.append(big["id"])
        t.record("max_members clamped to 15 when 50 sent", big.get("max_members") == 15,
                 f"max_members={big.get('max_members')}")
    else:
        t.record("max_members clamping (create)", False, f"status={r.status_code}")

    # 2c. min clamp 0 -> 1
    small_payload = {**base_trip_payload, "name": "Tiny Trip", "max_members": 0}
    r = requests.post(f"{API}/trips", headers=auth_headers(demo_token), json=small_payload, timeout=15)
    if r.status_code == 200:
        small = r.json()
        t.created_trip_ids.append(small["id"])
        t.record("max_members clamped to 1 when 0 sent", small.get("max_members") == 1,
                 f"max_members={small.get('max_members')}")
    else:
        t.record("max_members min clamping", False, f"status={r.status_code}")

    # 2d. NON-admin user attempts is_public=True -> 403
    bad_payload = {**base_trip_payload, "name": "Public Try", "is_public": True}
    r = requests.post(f"{API}/trips", headers=auth_headers(demo_token), json=bad_payload, timeout=15)
    t.record("non-admin is_public=true returns 403", r.status_code == 403,
             f"status={r.status_code} body={r.text[:150]}")

    # 2e. NON-admin user attempts tags=[...] -> 403
    bad_payload2 = {**base_trip_payload, "name": "Tags Try", "tags": ["fine_dine"]}
    r = requests.post(f"{API}/trips", headers=auth_headers(demo_token), json=bad_payload2, timeout=15)
    t.record("non-admin tags=[...] returns 403", r.status_code == 403,
             f"status={r.status_code} body={r.text[:150]}")

    # 2f. Admin creates a public tagged trip
    admin_payload = {
        **base_trip_payload,
        "name": "Backend Test Public Trip — Paris Fine Dining",
        "destination": "Paris, France",
        "is_public": True,
        "tags": ["fine_dine", "party"],
        "featured": False,
    }
    r = requests.post(f"{API}/trips", headers=auth_headers(admin_token), json=admin_payload, timeout=15)
    ok = r.status_code == 200
    t.record("admin creates public+tagged trip", ok, f"status={r.status_code} body={r.text[:200]}")
    admin_trip = None
    if ok:
        admin_trip = r.json()
        t.created_trip_ids.append(admin_trip["id"])
        t.record("admin trip is_public True", admin_trip.get("is_public") is True)
        t.record("admin trip tags include fine_dine,party",
                 set(admin_trip.get("tags") or []) >= {"fine_dine", "party"},
                 f"tags={admin_trip.get('tags')}")

        # 2g. Public listing filtered by tag (no auth required)
        r = requests.get(f"{API}/trips/public", params={"tag": "fine_dine"}, timeout=15)
        ok = r.status_code == 200
        t.record("GET /trips/public?tag=fine_dine returns 200", ok, f"status={r.status_code}")
        if ok:
            ids = [x["id"] for x in r.json()]
            t.record("admin tagged trip appears in public catalog by tag",
                     admin_trip["id"] in ids,
                     f"count={len(ids)} ours_in_list={admin_trip['id'] in ids}")

    # ---------- 3. Host transport on behalf of member ----------
    print("\n=== 3) Host transport on behalf of member ===")
    if not admin_trip:
        t.record("admin trip exists for transport tests", False, "cannot continue without admin trip")
    else:
        invite_code = admin_trip.get("invite_code")
        t.record("admin trip has invite_code", bool(invite_code), f"code={invite_code}")

        # 3a. demo user joins via /trips/join
        r = requests.post(
            f"{API}/trips/join",
            headers=auth_headers(demo_token),
            json={"invite_code": invite_code},
            timeout=15,
        )
        ok_join = r.status_code == 200
        t.record("demo joins admin trip via invite_code", ok_join,
                 f"status={r.status_code} body={r.text[:200]}")

        if ok_join:
            joined = r.json()
            member_ids = [m["user_id"] for m in joined.get("members", [])]
            t.record("demo present in trip members after join", demo_user_id in member_ids,
                     f"members={member_ids}")

            trip_id = admin_trip["id"]
            iso_dep = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
            iso_arr = (datetime.now(timezone.utc) + timedelta(days=30, hours=10)).isoformat()

            # 3b. demo (non-host, non-admin) attempts to assign to admin -> 403
            payload_bad = {
                "trip_id": trip_id,
                "transport_type": "flight",
                "airline": "Air France",
                "flight_number": "AF123",
                "departure_airport": "JFK",
                "arrival_airport": "CDG",
                "departure_time": iso_dep,
                "arrival_time": iso_arr,
                "assignee_user_id": admin_user_id,
            }
            r = requests.post(f"{API}/flights", headers=auth_headers(demo_token), json=payload_bad, timeout=15)
            t.record("non-host assigning transport to other returns 403",
                     r.status_code == 403,
                     f"status={r.status_code} body={r.text[:200]}")

            # 3c. Admin/host assigns transport to demo
            payload_good = {
                "trip_id": trip_id,
                "transport_type": "flight",
                "airline": "Delta",
                "flight_number": "DL808",
                "departure_airport": "JFK",
                "arrival_airport": "CDG",
                "departure_time": iso_dep,
                "arrival_time": iso_arr,
                "confirmation_number": "ABC123",
                "assignee_user_id": demo_user_id,
                "notes": "Booked by host",
            }
            r = requests.post(f"{API}/flights", headers=auth_headers(admin_token), json=payload_good, timeout=15)
            ok_create = r.status_code == 200
            t.record("admin host assigns transport to demo (POST /flights)",
                     ok_create, f"status={r.status_code} body={r.text[:200]}")
            if ok_create:
                f = r.json()
                t.record("flight.user_id == demo_user_id",
                         f.get("user_id") == demo_user_id,
                         f"user_id={f.get('user_id')}")
                t.record("flight.submitted_for_other == True",
                         f.get("submitted_for_other") is True,
                         f"submitted_for_other={f.get('submitted_for_other')}")
                t.record("flight.submitted_by == admin_user_id",
                         f.get("submitted_by") == admin_user_id,
                         f"submitted_by={f.get('submitted_by')}")

            # 3d. Non-member assignee returns 400
            payload_nonmember = {**payload_good, "assignee_user_id": "00000000-aaaa-bbbb-cccc-000000000000"}
            r = requests.post(f"{API}/flights", headers=auth_headers(admin_token), json=payload_nonmember, timeout=15)
            t.record("assignee not member returns 400", r.status_code == 400,
                     f"status={r.status_code} body={r.text[:200]}")

            # 3e. transport-status endpoint
            r = requests.get(f"{API}/trips/{trip_id}/transport-status",
                             headers=auth_headers(admin_token), timeout=15)
            ok_ts = r.status_code == 200
            t.record("GET /trips/{id}/transport-status returns 200", ok_ts, f"status={r.status_code}")
            if ok_ts:
                ts = r.json()
                members_rows = ts.get("members", [])
                t.record("transport-status has 2 member rows (admin + demo)",
                         len(members_rows) == 2, f"len={len(members_rows)}")
                demo_row = next((m for m in members_rows if m["user_id"] == demo_user_id), None)
                admin_row = next((m for m in members_rows if m["user_id"] == admin_user_id), None)
                t.record("demo row has has_transport=True and transport_count>=1",
                         bool(demo_row) and demo_row.get("has_transport") is True
                         and demo_row.get("transport_count", 0) >= 1,
                         f"demo_row={demo_row}")
                t.record("admin row has has_transport=False",
                         bool(admin_row) and admin_row.get("has_transport") is False,
                         f"admin_row_has_transport={admin_row and admin_row.get('has_transport')}")
                t.record("missing_count == 1 after one submission",
                         ts.get("missing_count") == 1,
                         f"missing_count={ts.get('missing_count')} submitted_count={ts.get('submitted_count')}")

            # 3f. Chat announcement was posted
            r = requests.get(f"{API}/trips/{trip_id}/messages",
                             headers=auth_headers(admin_token), timeout=15)
            ok_msg = r.status_code == 200
            t.record("GET /trips/{id}/messages returns 200", ok_msg, f"status={r.status_code}")
            if ok_msg:
                msgs = r.json()
                ann = [m for m in msgs if m.get("is_announcement")]
                related = [m for m in ann if "added a flight" in m.get("text", "").lower()
                           or "added a flight" in m.get("text", "")
                           or ("added a" in m.get("text", "") and "for a member" in m.get("text", ""))]
                t.record("announcement message exists about host adding transport",
                         len(related) >= 1,
                         f"announcement_count={len(ann)} matching={len(related)} sample={msgs[-1] if msgs else None}")

    # ---------- Cleanup ----------
    print("\n=== Cleanup ===")
    for tid in t.created_trip_ids:
        # Try admin delete (works for any trip), fallback to host delete
        r = requests.delete(f"{API}/admin/trips/{tid}", headers=auth_headers(admin_token), timeout=15)
        if r.status_code != 200:
            r2 = requests.delete(f"{API}/trips/{tid}", headers=auth_headers(demo_token), timeout=15)
            print(f"  cleanup trip {tid}: admin={r.status_code} host={r2.status_code}")
        else:
            print(f"  cleanup trip {tid}: admin=200")

    all_pass = t.summary()
    sys.exit(0 if all_pass else 1)


if __name__ == "__main__":
    main()
