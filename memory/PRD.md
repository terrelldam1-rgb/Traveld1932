# TripHost — Group Travel Planner

## Overview
A mobile-first Expo app for hosting group trips. Hosts create trips, invite friends via 6-char codes / share links, and collect contributions to a shared pool via Stripe. Each traveler stores flight info and gets a 24h check-in reminder.

## Core Features (MVP complete)
- **Auth:** JWT custom auth (register/login/me) with bcrypt; token stored via expo-secure-store on native, localStorage on web.
- **Trips:** Create (name, destination, date range, cover photo, pool goal, category goals), list, detail (Pool / Flights / Members segmented tabs), update, delete, leave, join by invite code.
- **Invite / Share:** 6-char alphanumeric code, native Share sheet, deep link `/trip/join?code=XXXXXX`.
- **Pool (Stripe Checkout):** Fixed tiers ($25/$50/$100/$250/$500) × 5 categories (flight/hotel/transportation/activities/general). Opens Stripe Checkout in WebBrowser, polls status endpoint, updates pool totals and per-member contributed amounts. Webhook endpoint `/api/webhook/stripe`.
- **Flights:** Add (airline, flight#, airports, ISO datetimes, PNR), list per user, delete. Schedules an expo-notifications local alert **24h before departure** on native devices.

## Tech
- **Backend:** FastAPI + MongoDB (motor), JWT (PyJWT), bcrypt, emergentintegrations (Stripe Checkout).
- **Frontend:** Expo Router, React Native, expo-secure-store, expo-notifications, expo-clipboard, expo-linear-gradient, expo-web-browser, @expo/vector-icons (Feather), axios.
- **Design:** Sunset & Terracotta theme — bone-white (#F9F7F3), terracotta (#E06D53), pine green (#2A4B41). Floating pill tab bar. Travel imagery from Pexels/Unsplash.

## Collections
- `users`: id, email, name, password_hash, avatar_url, created_at
- `trips`: id, name, destination, start_date, end_date, cover_url, description, pool_goal, category_goals, host_id, invite_code, members[{user_id, role, joined_at}], created_at
- `flights`: id, user_id, trip_id?, airline, flight_number, departure/arrival airports+times, confirmation_number
- `payment_transactions`: id, session_id, user_id, trip_id, category, package_id, amount, currency, payment_status, status, metadata, created_at, updated_at

## Key API Endpoints (all `/api` prefixed, Bearer auth required unless stated)
- `POST /auth/register`, `POST /auth/login` (public), `GET /auth/me`
- `POST /trips`, `GET /trips`, `GET/PATCH/DELETE /trips/{id}`, `POST /trips/join`, `POST /trips/{id}/leave`
- `POST /flights`, `GET /flights?trip_id=`, `DELETE /flights/{id}`
- `GET /payments/packages`, `POST /payments/checkout`, `GET /payments/status/{session_id}`, `POST /webhook/stripe`

## Smart Business Enhancement
Category-based pool allocation (flight/hotel/transport/activities) with per-category goals shown as progress bars — drives travelers to keep contributing toward specific "unlocked" expenses, increasing pool completion rates and trip follow-through.

## Tested
Backend 18/19 pytest ✅. Payment status endpoint now returns `pending` gracefully when Stripe session isn't yet indexed (post-fix verified via curl).

## Known limitations
- Stripe Checkout is test mode (`sk_test_emergent`); only card flow.
- Local notifications work on native only (no-op on web preview).
- Date inputs are YYYY-MM-DD text fields (native date picker can be added later).
