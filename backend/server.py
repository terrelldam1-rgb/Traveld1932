from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import secrets
import string
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest,
)

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# App
app = FastAPI(title="TripHost API")
api = APIRouter(prefix="/api")

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")

security = HTTPBearer(auto_error=False)

# Fixed contribution packages (in USD) - price manipulation protection
CONTRIBUTION_PACKAGES = {
    "tier_25": 25.00,
    "tier_50": 50.00,
    "tier_100": 100.00,
    "tier_250": 250.00,
    "tier_500": 500.00,
}

CATEGORIES = {"flight", "hotel", "transportation", "activities"}


# ============ Helpers ============
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def gen_invite_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u.get("name", ""),
        "avatar_url": u.get("avatar_url"),
        "role": u.get("role", "user"),
        "phone": u.get("phone"),
        "emergency_contact": u.get("emergency_contact"),
    }


# ============ Models ============
class RegisterReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class AuthResp(BaseModel):
    token: str
    user: dict


class TripCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    destination: str = Field(min_length=1, max_length=120)
    start_date: str  # ISO date
    end_date: str
    cover_url: Optional[str] = None
    pool_goal: float = 0.0
    solo_price: float = 0.0  # advertised price if traveling alone (also "pay full" amount)
    category_goals: dict = Field(default_factory=dict)
    description: Optional[str] = None
    is_public: bool = False
    tags: List[str] = Field(default_factory=list)
    max_members: int = 15
    itinerary: List[dict] = Field(default_factory=list)
    guided: bool = False
    status: Literal["draft", "published", "archived"] = "published"
    featured: bool = False
    lodging: Optional[str] = None  # hotel / lodging details
    pay_full_enabled: bool = True  # allow members to pay full price upfront


class TripUpdate(BaseModel):
    name: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    cover_url: Optional[str] = None
    pool_goal: Optional[float] = None
    solo_price: Optional[float] = None
    category_goals: Optional[dict] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None
    max_members: Optional[int] = None
    itinerary: Optional[List[dict]] = None
    guided: Optional[bool] = None
    status: Optional[Literal["draft", "published", "archived"]] = None
    featured: Optional[bool] = None
    lodging: Optional[str] = None
    pay_full_enabled: Optional[bool] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    emergency_contact: Optional[str] = None


class CheckoutFullReq(BaseModel):
    trip_id: str
    origin_url: str


class SupportReq(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=2000)


class FlightCreate(BaseModel):
    trip_id: Optional[str] = None
    transport_type: Literal["flight", "train", "bus", "ferry", "car", "shuttle", "rideshare", "other"] = "flight"
    # Generic fields used by all types (relabeled in UI):
    airline: str  # operator / airline / rental company
    flight_number: str  # flight # / train # / bus # / ferry # / reservation #
    departure_airport: str  # origin airport / station / port / pickup location
    arrival_airport: str  # destination / return location (car)
    departure_time: str  # ISO datetime — departure / pickup
    arrival_time: str  # arrival / return
    confirmation_number: Optional[str] = None
    booking_reference: Optional[str] = None
    notes: Optional[str] = None
    # Type-specific extras (free-form)
    extras: dict = Field(default_factory=dict)
    # Deprecated top-level — kept only for older clients
    terminal: Optional[str] = None
    gate: Optional[str] = None
    seat: Optional[str] = None
    checkin_url: Optional[str] = None


class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class SuggestionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    note: Optional[str] = None
    category: Optional[str] = None  # must_see / food / nightlife / etc


class CheckoutReq(BaseModel):
    trip_id: str
    package_id: str
    category: Literal["flight", "hotel", "transportation", "activities", "general"]
    origin_url: str


# ============ Auth Endpoints ============
@api.post("/auth/register", response_model=AuthResp)
async def register(body: RegisterReq):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "avatar_url": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    return {"token": token, "user": public_user(doc)}


@api.post("/auth/login", response_model=AuthResp)
async def login(body: LoginReq):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    # Founder/seeded account: set password on first login
    if user.get("password_pending"):
        new_hash = hash_password(body.password)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"password_hash": new_hash, "password_pending": False}},
        )
        user["password_hash"] = new_hash
    elif not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    return {"token": token, "user": public_user(user)}


@api.get("/auth/me")


class AnnouncementReq(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


@api.delete("/admin/trips/{trip_id}")
async def admin_delete_trip(trip_id: str, _: dict = Depends(require_admin)):
    res = await db.trips.delete_one({"id": trip_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    await db.flights.delete_many({"trip_id": trip_id})
    await db.trip_messages.delete_many({"trip_id": trip_id})
    await db.trip_suggestions.delete_many({"trip_id": trip_id})
    return {"ok": True}


@api.patch("/admin/trips/{trip_id}/feature")
async def admin_toggle_feature(trip_id: str, body: dict, _: dict = Depends(require_admin)):
    featured = bool(body.get("featured"))
    res = await db.trips.update_one({"id": trip_id}, {"$set": {"featured": featured}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"featured": featured}


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.delete_one({"id": user_id})
    # Also remove from any trip members
    await db.trips.update_many({}, {"$pull": {"members": {"user_id": user_id}}})
    return {"ok": True}


@api.post("/admin/dm/{user_id}")
async def admin_dm(user_id: str, body: MessageCreate, admin: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    # Store as a support thread item in admin_requests inbox
    doc = {
        "id": str(uuid.uuid4()),
        "type": "admin_dm",
        "from_user_id": admin["id"],
        "from_name": admin.get("name"),
        "from_email": admin["email"],
        "to_user_id": user_id,
        "to_email": target["email"],
        "message": body.text.strip(),
        "status": "sent",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.admin_requests.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/trips/{trip_id}/members/{user_id}")
async def remove_member(trip_id: str, user_id: str, actor: dict = Depends(get_current_user)):
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    is_host = trip["host_id"] == actor["id"]
    is_admin = actor.get("role") == "admin"
    if not (is_host or is_admin):
        raise HTTPException(status_code=403, detail="Only host or admin can remove members")
    if trip["host_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot remove host")
    await db.trips.update_one(
        {"id": trip_id},
        {"$pull": {"members": {"user_id": user_id}}},
    )
    return {"ok": True}


@api.post("/trips/{trip_id}/announcements")
async def post_announcement(trip_id: str, body: AnnouncementReq, user: dict = Depends(get_current_user)):
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    is_host = trip["host_id"] == user["id"]
    is_admin = user.get("role") == "admin"
    if not (is_host or is_admin):
        raise HTTPException(status_code=403, detail="Only host or admin can announce")
    msg = {
        "id": str(uuid.uuid4()),
        "trip_id": trip_id,
        "user_id": user["id"],
        "user_name": user.get("name"),
        "text": body.text.strip(),
        "is_announcement": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.trip_messages.insert_one(msg)
    msg.pop("_id", None)
    return msg


@api.get("/trips/{trip_id}/host-summary")
async def host_summary(trip_id: str, user: dict = Depends(get_current_user)):
    trip = await _trip_for_user(trip_id, user["id"])
    is_host = trip["host_id"] == user["id"]
    is_admin = user.get("role") == "admin"
    if not (is_host or is_admin):
        raise HTTPException(status_code=403, detail="Only host or admin")
    enriched = await _enrich_trip(trip)
    txns = await db.payment_transactions.find(
        {"trip_id": trip_id, "payment_status": "paid"}, {"_id": 0}
    ).to_list(1000)
    return {
        **enriched,
        "paid_transactions": txns,
        "total_raised": enriched["total_raised"],
    }


async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.patch("/auth/me")
async def update_me(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    refreshed = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {
        **public_user(refreshed),
        "phone": refreshed.get("phone"),
        "emergency_contact": refreshed.get("emergency_contact"),
    }


@api.post("/trips/{trip_id}/regenerate-code")
async def regenerate_invite_code(trip_id: str, user: dict = Depends(get_current_user)):
    trip = await _trip_for_user(trip_id, user["id"])
    if trip["host_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only host or admin can regenerate")
    new_code = gen_invite_code()
    while await db.trips.find_one({"invite_code": new_code}):
        new_code = gen_invite_code()
    await db.trips.update_one({"id": trip_id}, {"$set": {"invite_code": new_code}})
    return {"invite_code": new_code}


@api.post("/payments/checkout-full")
async def create_full_checkout(body: CheckoutFullReq, user: dict = Depends(get_current_user)):
    trip = await _trip_for_user(body.trip_id, user["id"])
    if not trip.get("pay_full_enabled", True):
        raise HTTPException(status_code=400, detail="Full payment not enabled for this trip")
    amount = float(trip.get("solo_price") or trip.get("pool_goal") or 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="No price set for this trip")
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/payment-return?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment-return?canceled=1"
    metadata = {
        "trip_id": body.trip_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "category": "full",
        "package_id": "full_price",
    }
    stripe_client = _stripe(origin)
    req = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session: CheckoutSessionResponse = await stripe_client.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "trip_id": body.trip_id,
        "category": "full",
        "package_id": "full_price",
        "amount": amount,
        "currency": "usd",
        "payment_status": "pending",
        "status": "initiated",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id, "amount": amount}


@api.post("/inbox/support")
async def submit_support(body: SupportReq, user: dict = Depends(get_current_user)):
    req = {
        "id": str(uuid.uuid4()),
        "type": "support",
        "from_user_id": user["id"],
        "from_name": user.get("name"),
        "from_email": user["email"],
        "subject": body.subject.strip(),
        "message": body.message.strip(),
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.admin_requests.insert_one(req)
    req.pop("_id", None)
    return req




# ============ Trips ============
async def _trip_for_user(trip_id: str, user_id: str) -> dict:
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    member_ids = [m["user_id"] for m in trip.get("members", [])]
    if user_id not in member_ids and trip["host_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not a member of this trip")
    return trip


async def _enrich_trip(trip: dict) -> dict:
    # Add member user data and contribution totals
    member_ids = [m["user_id"] for m in trip.get("members", [])]
    users = await db.users.find({"id": {"$in": member_ids}}, {"_id": 0, "password_hash": 0}).to_list(200)
    users_map = {u["id"]: public_user(u) for u in users}

    # Sum successful contributions by category and by user
    txns = await db.payment_transactions.find(
        {"trip_id": trip["id"], "payment_status": "paid"}, {"_id": 0}
    ).to_list(1000)
    total_raised = sum(t["amount"] for t in txns)
    by_category = {}
    by_user = {}
    for t in txns:
        by_category[t["category"]] = by_category.get(t["category"], 0.0) + t["amount"]
        by_user[t["user_id"]] = by_user.get(t["user_id"], 0.0) + t["amount"]

    enriched_members = []
    for m in trip.get("members", []):
        u = users_map.get(m["user_id"])
        if not u:
            continue
        enriched_members.append({
            **u,
            "role": m.get("role", "member"),
            "joined_at": m.get("joined_at"),
            "contributed": round(by_user.get(m["user_id"], 0.0), 2),
        })

    trip["members_detail"] = enriched_members
    trip["total_raised"] = round(total_raised, 2)
    trip["category_raised"] = {k: round(v, 2) for k, v in by_category.items()}

    # Per-person share: prefer solo_price if set (group discount concept),
    # else pool_goal / members count.
    member_count = max(1, len(enriched_members))
    solo = float(trip.get("solo_price") or 0.0)
    goal = float(trip.get("pool_goal") or 0.0)
    if goal > 0:
        share = round(goal / member_count, 2)
    elif solo > 0:
        share = round(solo, 2)
    else:
        share = 0.0
    trip["share_per_person"] = share
    trip["solo_savings"] = round(max(0.0, solo - share), 2) if solo > 0 else 0.0

    # Enrich each member with their individual share & remaining owed
    for m in enriched_members:
        m["share"] = share
        m["remaining"] = round(max(0.0, share - m["contributed"]), 2)
        m["paid_in_full"] = share > 0 and m["contributed"] >= share
    return trip


@api.post("/trips")
async def create_trip(body: TripCreate, user: dict = Depends(get_current_user)):
    # Only admins can publish public trips
    if body.is_public and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can publish public trips")
    # Only admins can apply category tags (to keep public categories curated)
    if body.tags and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can tag trips")
    max_m = max(1, min(15, body.max_members or 15))
    trip_id = str(uuid.uuid4())
    invite_code = gen_invite_code()
    while await db.trips.find_one({"invite_code": invite_code}):
        invite_code = gen_invite_code()

    doc = {
        "id": trip_id,
        "name": body.name,
        "destination": body.destination,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "cover_url": body.cover_url,
        "description": body.description,
        "pool_goal": body.pool_goal,
        "solo_price": body.solo_price,
        "category_goals": body.category_goals or {},
        "host_id": user["id"],
        "invite_code": invite_code,
        "is_public": body.is_public,
        "tags": body.tags or [],
        "max_members": max_m,
        "itinerary": body.itinerary or [],
        "guided": body.guided,
        "status": body.status,
        "featured": body.featured if user.get("role") == "admin" else False,
        "lodging": body.lodging,
        "pay_full_enabled": body.pay_full_enabled,
        "members": [{
            "user_id": user["id"],
            "role": "host",
            "joined_at": datetime.now(timezone.utc).isoformat(),
        }],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.trips.insert_one(doc)
    doc.pop("_id", None)
    return await _enrich_trip(doc)


@api.get("/trips")
async def list_trips(user: dict = Depends(get_current_user)):
    cursor = db.trips.find(
        {"members.user_id": user["id"]},
        {"_id": 0},
    ).sort("start_date", 1)
    trips = await cursor.to_list(200)
    return [await _enrich_trip(t) for t in trips]


@api.get("/trips/public")
async def list_public_trips(tag: Optional[str] = None):
    """Public catalog of admin-curated trips. No auth required (discovery)."""
    q: dict = {"is_public": True, "status": {"$ne": "archived"}}
    if tag:
        q["tags"] = tag
    cursor = db.trips.find(q, {"_id": 0}).sort([("featured", -1), ("start_date", 1)])
    trips = await cursor.to_list(500)
    # filter out drafts unless owned (this endpoint is unauthenticated, drop drafts)
    trips = [t for t in trips if t.get("status", "published") != "draft"]
    return [await _enrich_trip(t) for t in trips]


@api.get("/trips/{trip_id}")
async def get_trip(trip_id: str, user: dict = Depends(get_current_user)):
    trip = await _trip_for_user(trip_id, user["id"])
    return await _enrich_trip(trip)


@api.patch("/trips/{trip_id}")
async def update_trip(trip_id: str, body: TripUpdate, user: dict = Depends(get_current_user)):
    trip = await _trip_for_user(trip_id, user["id"])
    if trip["host_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only host can update")
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if updates:
        await db.trips.update_one({"id": trip_id}, {"$set": updates})
    updated = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    return await _enrich_trip(updated)


@api.delete("/trips/{trip_id}")
async def delete_trip(trip_id: str, user: dict = Depends(get_current_user)):
    trip = await _trip_for_user(trip_id, user["id"])
    if trip["host_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only host can delete")
    await db.trips.delete_one({"id": trip_id})
    await db.flights.delete_many({"trip_id": trip_id})
    return {"ok": True}


@api.post("/trips/join")
async def join_trip(body: dict, user: dict = Depends(get_current_user)):
    code = (body.get("invite_code") or "").upper().strip()
    if not code:
        raise HTTPException(status_code=400, detail="invite_code required")
    trip = await db.trips.find_one({"invite_code": code}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    member_ids = [m["user_id"] for m in trip.get("members", [])]
    if user["id"] in member_ids:
        return await _enrich_trip(trip)
    max_m = trip.get("max_members", 15)
    if len(member_ids) >= max_m:
        raise HTTPException(status_code=400, detail=f"Trip is full (max {max_m} travelers)")
    new_member = {
        "user_id": user["id"],
        "role": "member",
        "joined_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.trips.update_one({"id": trip["id"]}, {"$push": {"members": new_member}})
    trip["members"].append(new_member)
    return await _enrich_trip(trip)


@api.get("/trips/public")
async def list_public_trips_legacy(tag: Optional[str] = None):
    # kept for route registration uniqueness check; the version above is the source of truth.
    return await list_public_trips(tag)


@api.post("/trips/{trip_id}/join-public")
async def join_public_trip(trip_id: str, user: dict = Depends(get_current_user)):
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not trip or not trip.get("is_public"):
        raise HTTPException(status_code=404, detail="Public trip not found")
    member_ids = [m["user_id"] for m in trip.get("members", [])]
    if user["id"] in member_ids:
        return await _enrich_trip(trip)
    max_m = trip.get("max_members", 15)
    if len(member_ids) >= max_m:
        raise HTTPException(status_code=400, detail=f"Trip is full (max {max_m} travelers)")
    new_member = {
        "user_id": user["id"],
        "role": "member",
        "joined_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.trips.update_one({"id": trip_id}, {"$push": {"members": new_member}})
    trip["members"].append(new_member)
    return await _enrich_trip(trip)


@api.post("/trips/{trip_id}/leave")
async def leave_trip(trip_id: str, user: dict = Depends(get_current_user)):
    trip = await _trip_for_user(trip_id, user["id"])
    if trip["host_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Host cannot leave; delete the trip instead")
    await db.trips.update_one(
        {"id": trip_id},
        {"$pull": {"members": {"user_id": user["id"]}}},
    )
    return {"ok": True}


# ============ Flights ============
@api.post("/flights")
async def add_flight(body: FlightCreate, user: dict = Depends(get_current_user)):
    if body.trip_id:
        await _trip_for_user(body.trip_id, user["id"])
    fid = str(uuid.uuid4())
    doc = body.dict()
    doc.update({
        "id": fid,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.flights.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/flights")
async def list_flights(
    trip_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q = {"user_id": user["id"]}
    if trip_id:
        q["trip_id"] = trip_id
    flights = await db.flights.find(q, {"_id": 0}).sort("departure_time", 1).to_list(200)
    return flights


@api.delete("/flights/{flight_id}")
async def delete_flight(flight_id: str, user: dict = Depends(get_current_user)):
    res = await db.flights.delete_one({"id": flight_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Flight not found")
    return {"ok": True}


# ============ Payments (Stripe Checkout) ============
def _stripe(origin_url: str) -> StripeCheckout:
    webhook_url = f"{origin_url.rstrip('/')}/api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


@api.get("/payments/packages")
async def list_packages():
    return [{"id": pid, "amount": amt} for pid, amt in CONTRIBUTION_PACKAGES.items()]


@api.post("/payments/checkout")
async def create_checkout(body: CheckoutReq, user: dict = Depends(get_current_user)):
    if body.package_id not in CONTRIBUTION_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    await _trip_for_user(body.trip_id, user["id"])

    amount = float(CONTRIBUTION_PACKAGES[body.package_id])
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/payment-return?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment-return?canceled=1"

    metadata = {
        "trip_id": body.trip_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "category": body.category,
        "package_id": body.package_id,
    }

    stripe_client = _stripe(origin)
    req = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session: CheckoutSessionResponse = await stripe_client.create_checkout_session(req)

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "trip_id": body.trip_id,
        "category": body.category,
        "package_id": body.package_id,
        "amount": amount,
        "currency": "usd",
        "payment_status": "pending",
        "status": "initiated",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": session.url, "session_id": session.session_id, "amount": amount}


@api.get("/payments/status/{session_id}")
async def checkout_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your transaction")

    # If already paid, short-circuit
    if txn["payment_status"] == "paid":
        return {"payment_status": "paid", "status": txn["status"], "amount": txn["amount"]}

    origin = str(request.base_url).rstrip("/")
    stripe_client = _stripe(origin)
    try:
        res: CheckoutStatusResponse = await stripe_client.get_checkout_status(session_id)
    except Exception as e:
        # Stripe may not have the session indexed yet right after creation,
        # or the session was canceled/expired. Report pending gracefully.
        logging.info(f"Stripe status lookup pending for {session_id}: {e}")
        return {"payment_status": "pending", "status": "pending", "amount": txn["amount"]}

    # Idempotent update
    new_fields = {
        "payment_status": res.payment_status,
        "status": res.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": new_fields},
    )
    return {"payment_status": res.payment_status, "status": res.status, "amount": res.amount_total / 100.0}


@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    origin = str(request.base_url).rstrip("/")
    stripe_client = _stripe(origin)
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        evt = await stripe_client.handle_webhook(body, sig)
    except Exception as e:
        logging.exception("Webhook error")
        raise HTTPException(status_code=400, detail=str(e))
    await db.payment_transactions.update_one(
        {"session_id": evt.session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {
            "payment_status": evt.payment_status,
            "status": "completed" if evt.payment_status == "paid" else evt.payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"received": True}


# ============ Trip Chat & Suggestions ============
@api.post("/trips/{trip_id}/messages")
async def post_message(trip_id: str, body: MessageCreate, user: dict = Depends(get_current_user)):
    await _trip_for_user(trip_id, user["id"])
    msg = {
        "id": str(uuid.uuid4()),
        "trip_id": trip_id,
        "user_id": user["id"],
        "user_name": user.get("name"),
        "text": body.text.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.trip_messages.insert_one(msg)
    msg.pop("_id", None)
    return msg


@api.get("/trips/{trip_id}/messages")
async def list_messages(trip_id: str, user: dict = Depends(get_current_user)):
    await _trip_for_user(trip_id, user["id"])
    cursor = db.trip_messages.find({"trip_id": trip_id}, {"_id": 0}).sort("created_at", 1)
    return await cursor.to_list(500)


@api.post("/trips/{trip_id}/suggestions")
async def add_suggestion(trip_id: str, body: SuggestionCreate, user: dict = Depends(get_current_user)):
    await _trip_for_user(trip_id, user["id"])
    sug = {
        "id": str(uuid.uuid4()),
        "trip_id": trip_id,
        "user_id": user["id"],
        "user_name": user.get("name"),
        "title": body.title.strip(),
        "note": (body.note or "").strip() or None,
        "category": body.category,
        "likes": [user["id"]],  # author auto-likes
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.trip_suggestions.insert_one(sug)
    sug.pop("_id", None)
    sug["like_count"] = len(sug["likes"])
    sug["liked_by_me"] = True
    return sug


@api.get("/trips/{trip_id}/suggestions")
async def list_suggestions(trip_id: str, user: dict = Depends(get_current_user)):
    await _trip_for_user(trip_id, user["id"])
    cursor = db.trip_suggestions.find({"trip_id": trip_id}, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(500)
    for s in items:
        likes = s.get("likes", [])
        s["like_count"] = len(likes)
        s["liked_by_me"] = user["id"] in likes
        s.pop("likes", None)
    return items


@api.post("/trips/{trip_id}/suggestions/{suggestion_id}/like")
async def toggle_like_suggestion(trip_id: str, suggestion_id: str, user: dict = Depends(get_current_user)):
    await _trip_for_user(trip_id, user["id"])
    sug = await db.trip_suggestions.find_one({"id": suggestion_id, "trip_id": trip_id})
    if not sug:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    likes = set(sug.get("likes", []))
    if user["id"] in likes:
        likes.discard(user["id"])
    else:
        likes.add(user["id"])
    await db.trip_suggestions.update_one(
        {"id": suggestion_id},
        {"$set": {"likes": list(likes)}},
    )
    return {"like_count": len(likes), "liked_by_me": user["id"] in likes}


# ============ Inbox (Admin Requests) ============
class CodeRequestReq(BaseModel):
    message: Optional[str] = None  # optional note to admin


class BirthdayRequestReq(BaseModel):
    person_name: str = Field(min_length=1, max_length=120)
    birthday_date: str  # ISO date
    destination_ideas: Optional[str] = None
    group_size: int = Field(default=1, ge=1, le=50)
    vibe: Optional[str] = None  # solo / family / friends
    budget: Optional[float] = None
    notes: Optional[str] = None


@api.post("/inbox/request-code")
async def request_private_code(body: CodeRequestReq, user: dict = Depends(get_current_user)):
    req = {
        "id": str(uuid.uuid4()),
        "type": "code_request",
        "from_user_id": user["id"],
        "from_name": user.get("name"),
        "from_email": user["email"],
        "message": (body.message or "").strip() or None,
        "status": "open",  # open / answered / closed
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.admin_requests.insert_one(req)
    req.pop("_id", None)
    return req


@api.post("/inbox/birthday-request")
async def request_birthday_trip(body: BirthdayRequestReq, user: dict = Depends(get_current_user)):
    req = {
        "id": str(uuid.uuid4()),
        "type": "birthday",
        "from_user_id": user["id"],
        "from_name": user.get("name"),
        "from_email": user["email"],
        "person_name": body.person_name,
        "birthday_date": body.birthday_date,
        "destination_ideas": body.destination_ideas,
        "group_size": body.group_size,
        "vibe": body.vibe,
        "budget": body.budget,
        "notes": body.notes,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.admin_requests.insert_one(req)
    req.pop("_id", None)
    return req


@api.get("/admin/inbox")
async def admin_inbox(
    status_filter: Optional[str] = None,
    _: dict = Depends(require_admin),
):
    q: dict = {}
    if status_filter:
        q["status"] = status_filter
    reqs = await db.admin_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return reqs


@api.patch("/admin/inbox/{request_id}")
async def admin_update_inbox_item(
    request_id: str,
    body: dict,
    _: dict = Depends(require_admin),
):
    new_status = body.get("status")
    if new_status not in {"open", "answered", "closed"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.admin_requests.update_one(
        {"id": request_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ============ Startup ============
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.trips.create_index("id", unique=True)
    await db.trips.create_index("invite_code", unique=True)
    await db.trips.create_index("members.user_id")
    await db.flights.create_index("id", unique=True)
    await db.flights.create_index([("user_id", 1), ("departure_time", 1)])
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.payment_transactions.create_index("trip_id")
    await db.admin_requests.create_index("id", unique=True)
    await db.admin_requests.create_index([("status", 1), ("created_at", -1)])
    await db.admin_requests.create_index("id", unique=True)
    await db.admin_requests.create_index([("status", 1), ("created_at", -1)])
    await db.trip_messages.create_index([("trip_id", 1), ("created_at", 1)])
    await db.trip_suggestions.create_index([("trip_id", 1), ("created_at", -1)])

    # Seed founder (Super Admin) — password set on first login
    founder_email = os.environ.get("FOUNDER_EMAIL", "").lower().strip()
    if founder_email:
        existing = await db.users.find_one({"email": founder_email})
        if not existing:
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": founder_email,
                "name": os.environ.get("FOUNDER_NAME", "Founder"),
                "password_hash": hash_password(secrets.token_urlsafe(32)),
                "password_pending": True,
                "role": "admin",
                "avatar_url": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logging.info(f"Seeded founder account: {founder_email} (password set on first login)")
        elif existing.get("role") != "admin":
            await db.users.update_one({"email": founder_email}, {"$set": {"role": "admin"}})

    logging.info("Indexes ready")


@api.get("/admin/trips")
async def admin_list_trips(_: dict = Depends(require_admin)):
    trips = await db.trips.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [await _enrich_trip(t) for t in trips]


@api.get("/admin/users")
async def admin_list_users(_: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    for u in users:
        u.pop("password_pending", None)
    return users


@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    trips_count = await db.trips.count_documents({})
    users_count = await db.users.count_documents({})
    flights_count = await db.flights.count_documents({})
    paid_txns = await db.payment_transactions.find({"payment_status": "paid"}, {"_id": 0, "amount": 1}).to_list(5000)
    total_pooled = round(sum(t.get("amount", 0) for t in paid_txns), 2)
    return {
        "users": users_count,
        "trips": trips_count,
        "flights": flights_count,
        "total_pooled_usd": total_pooled,
        "paid_transactions": len(paid_txns),
    }


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
