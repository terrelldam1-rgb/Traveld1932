"""
Backend tests for new features in Travel'D:
1. Profile updates with new fields (preferred_contact, instagram, tiktok, twitter)
2. Trip Pool Expenses CRUD (POST/GET/DELETE) + role enforcement
3. Trip detail enrichment (host card, total_spent, spent_by_category, available_balance)
4. Payout request (403 non-host, 400 over balance, 200 valid path)
5. Chat announcement when expense is added

Cleans up any trips it creates via admin DELETE /api/admin/trips/{id}.
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
FOUNDER_PASS = "FounderTest!2026"


class TestRunner:
    def __init__(self):
        self.results = []
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
        for name, ok, detail in self.results:
            if not ok:
                print(f"  FAIL: {name} :: {detail}")
        return passed, total


T = TestRunner()


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    return r


def cleanup(admin_token):
    for tid in T.created_trip_ids:
        try:
            requests.delete(f"{API}/admin/trips/{tid}", headers=auth_header(admin_token), timeout=10)
        except Exception:
            pass


def main():
    # --- Login both users ---
    r_admin = login(FOUNDER_EMAIL, FOUNDER_PASS)
    if r_admin.status_code != 200:
        T.record("admin login", False, f"{r_admin.status_code} {r_admin.text}")
        T.summary()
        sys.exit(1)
    admin_data = r_admin.json()
    admin_token = admin_data["token"]
    admin_user = admin_data["user"]
    T.record("admin login", admin_user.get("role") == "admin", f"role={admin_user.get('role')}")

    r_demo = login(DEMO_EMAIL, DEMO_PASS)
    if r_demo.status_code != 200:
        T.record("demo login", False, f"{r_demo.status_code} {r_demo.text}")
        cleanup(admin_token)
        T.summary()
        sys.exit(1)
    demo_data = r_demo.json()
    demo_token = demo_data["token"]
    demo_user = demo_data["user"]
    T.record("demo login", True, f"id={demo_user['id']}")

    # =====================================================
    # 1) PROFILE UPDATE with new fields
    # =====================================================
    print("\n--- Profile update with new fields ---")
    profile_payload = {
        "preferred_contact": "phone",
        "instagram": "demo_traveler",
        "tiktok": "@demotrips",
        "twitter": "demo_x_user",
        "phone": "+15551234567",
    }
    r = requests.patch(f"{API}/auth/me", json=profile_payload, headers=auth_header(demo_token), timeout=15)
    ok = r.status_code == 200
    T.record("PATCH /auth/me with new social fields returns 200", ok, f"status={r.status_code} body={r.text[:200]}")
    if ok:
        body = r.json()
        for k, v in profile_payload.items():
            T.record(f"PATCH /auth/me persisted {k}={v}", body.get(k) == v, f"got {body.get(k)}")

    # GET /auth/me should also reflect them
    r = requests.get(f"{API}/auth/me", headers=auth_header(demo_token), timeout=15)
    ok = r.status_code == 200
    T.record("GET /auth/me returns 200", ok, f"status={r.status_code}")
    if ok:
        body = r.json()
        for k in ("preferred_contact", "instagram", "tiktok", "twitter"):
            T.record(f"GET /auth/me has {k}", body.get(k) == profile_payload[k], f"got {body.get(k)}")

    # Test 'hidden' value too
    r = requests.patch(f"{API}/auth/me", json={"preferred_contact": "hidden"}, headers=auth_header(demo_token), timeout=15)
    T.record("PATCH /auth/me preferred_contact=hidden", r.status_code == 200 and r.json().get("preferred_contact") == "hidden",
             f"status={r.status_code} got={r.json().get('preferred_contact') if r.status_code==200 else 'n/a'}")

    # Test invalid value rejected
    r = requests.patch(f"{API}/auth/me", json={"preferred_contact": "telegram"}, headers=auth_header(demo_token), timeout=15)
    T.record("PATCH /auth/me invalid preferred_contact rejected (422)", r.status_code == 422, f"status={r.status_code}")

    # Set demo back to email pref so host_card shows email later
    requests.patch(f"{API}/auth/me", json={"preferred_contact": "email"}, headers=auth_header(demo_token), timeout=15)

    # Also update admin profile so host_card has socials/contact
    admin_profile = {
        "preferred_contact": "email",
        "instagram": "founder_ig",
        "tiktok": "founder_tt",
        "twitter": "founder_x",
        "phone": "+15559998888",
    }
    r = requests.patch(f"{API}/auth/me", json=admin_profile, headers=auth_header(admin_token), timeout=15)
    T.record("admin PATCH /auth/me social fields", r.status_code == 200, f"status={r.status_code}")

    # =====================================================
    # 2) Setup: Admin creates trip; demo joins via invite_code
    # =====================================================
    print("\n--- Create trip and have demo join ---")
    start = (datetime.now(timezone.utc) + timedelta(days=20)).date().isoformat()
    end = (datetime.now(timezone.utc) + timedelta(days=27)).date().isoformat()
    trip_payload = {
        "name": "Pool Expenses Test Trip",
        "destination": "Lisbon, Portugal",
        "start_date": start,
        "end_date": end,
        "pool_goal": 5000.0,
        "solo_price": 1200.0,
        "description": "Group trip for testing pool expenses.",
        "lodging": "Memmo Alfama Hotel",
        "max_members": 8,
        "pay_full_enabled": True,
    }
    r = requests.post(f"{API}/trips", json=trip_payload, headers=auth_header(admin_token), timeout=15)
    if r.status_code != 200:
        T.record("create trip", False, f"{r.status_code} {r.text}")
        cleanup(admin_token)
        T.summary()
        sys.exit(1)
    trip = r.json()
    trip_id = trip["id"]
    invite_code = trip["invite_code"]
    T.created_trip_ids.append(trip_id)
    T.record("create trip", True, f"id={trip_id} code={invite_code}")

    # Demo joins
    r = requests.post(f"{API}/trips/join", json={"invite_code": invite_code}, headers=auth_header(demo_token), timeout=15)
    T.record("demo joins trip", r.status_code == 200, f"status={r.status_code} {r.text[:120]}")

    # =====================================================
    # 3) Trip Pool Expenses CRUD
    # =====================================================
    print("\n--- Trip pool expenses CRUD ---")

    # 3a) demo (non-host) attempts POST -> 403
    bad_expense = {"amount": 25.5, "category": "food", "vendor": "Pasteis de Belem", "paid_on": "2026-02-15", "notes": "tasting"}
    r = requests.post(f"{API}/trips/{trip_id}/expenses", json=bad_expense, headers=auth_header(demo_token), timeout=15)
    T.record("demo POST /expenses -> 403", r.status_code == 403, f"status={r.status_code}")

    # 3b) host POST -> 200
    expense_payload = {
        "amount": 320.75,
        "category": "hotel",
        "vendor": "Memmo Alfama Hotel",
        "paid_on": "2026-02-15",
        "notes": "Night 1 deposit",
    }
    r = requests.post(f"{API}/trips/{trip_id}/expenses", json=expense_payload, headers=auth_header(admin_token), timeout=15)
    ok = r.status_code == 200
    T.record("host POST /expenses -> 200", ok, f"status={r.status_code} {r.text[:200]}")
    expense_id = None
    if ok:
        body = r.json()
        expense_id = body.get("id")
        T.record("expense returns id", bool(expense_id), f"id={expense_id}")
        for k in ("amount", "category", "vendor", "paid_on", "notes"):
            T.record(f"expense persisted {k}", body.get(k) == expense_payload[k] or (k == "amount" and float(body.get(k)) == expense_payload[k]),
                     f"got={body.get(k)}")

    # Add a second expense (will use later for available balance check)
    r2 = requests.post(f"{API}/trips/{trip_id}/expenses", json={
        "amount": 75.00, "category": "food", "vendor": "Time Out Market", "paid_on": "2026-02-16", "notes": "lunch"
    }, headers=auth_header(admin_token), timeout=15)
    T.record("host POST 2nd expense -> 200", r2.status_code == 200, f"status={r2.status_code}")
    expense_id_2 = r2.json().get("id") if r2.status_code == 200 else None

    # 3c) GET /expenses by demo (member) -> {items, total_spent}
    r = requests.get(f"{API}/trips/{trip_id}/expenses", headers=auth_header(demo_token), timeout=15)
    ok = r.status_code == 200
    T.record("demo GET /expenses -> 200", ok, f"status={r.status_code}")
    if ok:
        body = r.json()
        T.record("GET /expenses has items list", isinstance(body.get("items"), list), f"items type={type(body.get('items'))}")
        T.record("GET /expenses total_spent ~= sum", abs(body.get("total_spent", 0) - (320.75 + 75.00)) < 0.01,
                 f"total_spent={body.get('total_spent')}")

    # 3d) GET /trips/{id} contains host card + financial fields
    r = requests.get(f"{API}/trips/{trip_id}", headers=auth_header(demo_token), timeout=15)
    ok = r.status_code == 200
    T.record("GET /trips/{id} -> 200", ok, f"status={r.status_code}")
    if ok:
        body = r.json()
        host = body.get("host")
        T.record("trip has host card", isinstance(host, dict), f"host={host}")
        if isinstance(host, dict):
            for k in ("preferred_contact", "contact_value", "instagram", "tiktok", "twitter"):
                T.record(f"host card has {k}", k in host, f"keys={list(host.keys())}")
            # Admin set preferred_contact=email so contact_value should be admin's email
            T.record("host.preferred_contact == 'email'", host.get("preferred_contact") == "email",
                     f"got={host.get('preferred_contact')}")
            T.record("host.contact_value == admin email", host.get("contact_value") == FOUNDER_EMAIL,
                     f"got={host.get('contact_value')}")
            T.record("host.instagram == 'founder_ig'", host.get("instagram") == "founder_ig", f"got={host.get('instagram')}")
        T.record("trip has total_spent", "total_spent" in body and abs(body["total_spent"] - 395.75) < 0.01,
                 f"total_spent={body.get('total_spent')}")
        T.record("trip has spent_by_category", isinstance(body.get("spent_by_category"), dict) and
                 abs(body["spent_by_category"].get("hotel", 0) - 320.75) < 0.01 and
                 abs(body["spent_by_category"].get("food", 0) - 75.00) < 0.01,
                 f"spent_by_category={body.get('spent_by_category')}")
        T.record("trip has available_balance", "available_balance" in body, f"available_balance={body.get('available_balance')}")
        # No paid contributions yet, so available_balance should be -total_spent (i.e. -395.75)
        T.record("available_balance == total_raised - total_spent",
                 abs(body.get("available_balance", 0) - (body.get("total_raised", 0) - body.get("total_spent", 0))) < 0.01,
                 f"available={body.get('available_balance')} raised={body.get('total_raised')} spent={body.get('total_spent')}")

    # =====================================================
    # 4) Chat announcement when expense added
    # =====================================================
    print("\n--- Chat announcement check ---")
    r = requests.get(f"{API}/trips/{trip_id}/messages", headers=auth_header(demo_token), timeout=15)
    ok = r.status_code == 200
    T.record("GET /messages -> 200", ok, f"status={r.status_code}")
    if ok:
        msgs = r.json()
        ann = [m for m in msgs if m.get("is_announcement") and "Pool spent" in (m.get("text") or "")]
        T.record("expense added announcement present", len(ann) >= 1, f"found {len(ann)} announcements; sample={ann[0]['text'] if ann else 'none'}")
        T.record("announcement mentions vendor", any("Memmo Alfama Hotel" in (m.get("text") or "") for m in ann),
                 f"texts={[m.get('text') for m in ann]}")

    # =====================================================
    # 5) DELETE expenses
    # =====================================================
    print("\n--- Delete expenses (role checks) ---")
    # demo (non-host) tries to delete -> 403
    if expense_id:
        r = requests.delete(f"{API}/trips/{trip_id}/expenses/{expense_id}", headers=auth_header(demo_token), timeout=15)
        T.record("demo DELETE /expenses/{id} -> 403", r.status_code == 403, f"status={r.status_code}")
        # admin (founder) is host AND admin — try host delete (same user). Since we only have admin host + demo,
        # we'll test "host delete -> 200" with admin_token (host of this trip).
        r = requests.delete(f"{API}/trips/{trip_id}/expenses/{expense_id}", headers=auth_header(admin_token), timeout=15)
        T.record("host DELETE /expenses/{id} -> 200", r.status_code == 200, f"status={r.status_code}")

    # Admin (acts as admin role too) deletes 2nd expense — same user, but still validates the permission path
    if expense_id_2:
        r = requests.delete(f"{API}/trips/{trip_id}/expenses/{expense_id_2}", headers=auth_header(admin_token), timeout=15)
        T.record("admin DELETE /expenses/{id} -> 200", r.status_code == 200, f"status={r.status_code}")

    # Verify list is empty now
    r = requests.get(f"{API}/trips/{trip_id}/expenses", headers=auth_header(demo_token), timeout=15)
    if r.status_code == 200:
        T.record("expenses cleared after deletes", r.json().get("total_spent") == 0 and len(r.json().get("items", [])) == 0,
                 f"items={len(r.json().get('items',[]))} total={r.json().get('total_spent')}")

    # =====================================================
    # 6) Payout requests
    # =====================================================
    print("\n--- Payout request ---")
    payload = {"amount": 100.0, "method": "bank_transfer", "notes": "test payout"}
    # 6a) demo (non-host) -> 403
    r = requests.post(f"{API}/trips/{trip_id}/payout-request", json=payload, headers=auth_header(demo_token), timeout=15)
    T.record("demo POST /payout-request -> 403", r.status_code == 403, f"status={r.status_code} body={r.text[:120]}")

    # 6b) host with amount > available_balance (trip has 0 raised, 0 spent now) -> 400
    r = requests.post(f"{API}/trips/{trip_id}/payout-request", json=payload, headers=auth_header(admin_token), timeout=15)
    T.record("host POST /payout-request over balance -> 400", r.status_code == 400, f"status={r.status_code} body={r.text[:120]}")

    # 6c) Insert a paid contribution doc directly into payment_transactions (since checkout is mocked Stripe)
    # We'll do this via a small mongo write through python-motor would require the same connection; easier to use mongosh CLI.
    paid_amount = 500.0
    import subprocess
    mongo_cmd = (
        f"db.payment_transactions.insertOne({{ id: 'test_paid_{trip_id[:8]}', trip_id: '{trip_id}', "
        f"user_id: '{demo_user['id']}', user_email: '{DEMO_EMAIL}', category: 'general', package_id: 'tier_500', "
        f"amount: {paid_amount}, currency: 'usd', payment_status: 'paid', status: 'completed', "
        f"created_at: '{datetime.now(timezone.utc).isoformat()}', updated_at: '{datetime.now(timezone.utc).isoformat()}', "
        f"session_id: 'test_session_{trip_id[:8]}' }});"
    )
    try:
        # Determine MONGO_URL from backend/.env
        mongo_url = "mongodb://localhost:27017/trip_host_db"
        try:
            base = None
            db_name = "trip_host_db"
            with open("/app/backend/.env") as f:
                for line in f:
                    if line.startswith("MONGO_URL="):
                        base = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if line.startswith("DB_NAME="):
                        db_name = line.split("=", 1)[1].strip().strip('"').strip("'")
            if base:
                mongo_url = base.rstrip("/") + "/" + db_name
        except Exception:
            pass
        proc = subprocess.run(
            ["mongosh", mongo_url, "--quiet", "--eval", mongo_cmd],
            capture_output=True, text=True, timeout=15,
        )
        T.record("inject paid contribution via mongosh", proc.returncode == 0,
                 f"rc={proc.returncode} stderr={proc.stderr[:200]}")
    except FileNotFoundError:
        T.record("inject paid contribution via mongosh", False, "mongosh not available; skipping 200 path")

    # Verify trip now reports total_raised >= 500
    r = requests.get(f"{API}/trips/{trip_id}", headers=auth_header(admin_token), timeout=15)
    if r.status_code == 200:
        T.record("after paid txn, total_raised >= 500",
                 r.json().get("total_raised", 0) >= paid_amount - 0.01, f"total_raised={r.json().get('total_raised')}")
        T.record("after paid txn, available_balance >= 500",
                 r.json().get("available_balance", 0) >= paid_amount - 0.01,
                 f"available_balance={r.json().get('available_balance')}")

    # 6d) host with valid amount -> 200, persisted in admin_requests with type=payout
    r = requests.post(f"{API}/trips/{trip_id}/payout-request",
                      json={"amount": 200.0, "method": "bank_transfer", "notes": "first payout"},
                      headers=auth_header(admin_token), timeout=15)
    ok = r.status_code == 200
    T.record("host POST /payout-request valid -> 200", ok, f"status={r.status_code} body={r.text[:200]}")
    if ok:
        body = r.json()
        T.record("payout request type=payout", body.get("type") == "payout", f"type={body.get('type')}")
        T.record("payout request has trip_id", body.get("trip_id") == trip_id, f"trip_id={body.get('trip_id')}")
        T.record("payout request status=open", body.get("status") == "open", f"status={body.get('status')}")
        # Verify via admin inbox
        r2 = requests.get(f"{API}/admin/inbox?status_filter=open", headers=auth_header(admin_token), timeout=15)
        if r2.status_code == 200:
            inbox = r2.json()
            payouts = [i for i in inbox if i.get("type") == "payout" and i.get("trip_id") == trip_id]
            T.record("payout appears in admin inbox", len(payouts) >= 1, f"count={len(payouts)}")

    # 6e) Over-balance after a valid request: requesting > available again should 400
    r = requests.post(f"{API}/trips/{trip_id}/payout-request",
                      json={"amount": 9999.0, "method": "bank_transfer", "notes": "too much"},
                      headers=auth_header(admin_token), timeout=15)
    T.record("host POST /payout-request 9999 > available -> 400", r.status_code == 400, f"status={r.status_code}")

    # ---- Cleanup ----
    print("\n--- Cleanup ---")
    cleanup(admin_token)
    # also remove injected payment_transactions doc
    try:
        subprocess.run(
            ["mongosh", mongo_url, "--quiet", "--eval",
             f"db.payment_transactions.deleteMany({{ trip_id: '{trip_id}' }});"],
            capture_output=True, text=True, timeout=15,
        )
        subprocess.run(
            ["mongosh", mongo_url, "--quiet", "--eval",
             f"db.admin_requests.deleteMany({{ trip_id: '{trip_id}' }});"],
            capture_output=True, text=True, timeout=15,
        )
    except Exception:
        pass

    passed, total = T.summary()
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
