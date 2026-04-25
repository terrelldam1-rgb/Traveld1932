# Publishing Travel'D to App Stores

Complete step-by-step guide to get Travel'D live on the **Apple App Store** and **Google Play Store**. Follow in order.

---

## Phase 1 — Export & Prepare

### 1.1 Save code to GitHub
In Emergent, click **"Save to GitHub"** → clone the repo to your local machine:
```bash
git clone git@github.com:<you>/<traveld-repo>.git
cd <traveld-repo>/frontend
yarn install
```

### 1.2 Host your backend publicly
The current backend runs inside the Emergent preview container. For production you need a public API. Recommended:
- **Render.com** — free-tier FastAPI hosting
- **Railway.app** — one-click from GitHub
- **Fly.io** — generous free tier

Deploy `/app/backend` with these env vars:
```
MONGO_URL=<MongoDB Atlas connection string>
DB_NAME=traveld_prod
JWT_SECRET=<generate a new 64-char random string>
STRIPE_API_KEY=<your LIVE Stripe secret key sk_live_...>
FOUNDER_EMAIL=terrelldam1@gmail.com
FOUNDER_NAME=Terrell
EMERGENT_LLM_KEY=<optional — only if you keep AI features>
```

Get **MongoDB Atlas** free cluster at https://cloud.mongodb.com — copy the connection string.

### 1.3 Update the frontend to point to production backend
In `frontend/eas.json`, replace `https://your-production-api.example.com` under `build.preview.env` and `build.production.env` with your new backend URL.

---

## Phase 2 — Developer Accounts

| Store | Cost | Sign up |
|-------|------|---------|
| Apple Developer Program | **$99 / year** | https://developer.apple.com/programs/enroll/ |
| Google Play Console | **$25 one-time** | https://play.google.com/console/signup |

Enroll as an **individual** or **organization** (organization needs a D-U-N-S number).

---

## Phase 3 — Install EAS

```bash
npm install -g eas-cli
eas login                 # use your Expo account
cd frontend
eas init                  # creates a project ID, paste it into app.json `extra.eas.projectId`
```

---

## Phase 4 — App Store Assets

Prepare these before submission:

### Icons (already generated)
- `assets/images/icon.png` — 1024×1024 ✅
- `assets/images/adaptive-icon.png` — Android foreground ✅

### Screenshots (you need to take these)
Run the app on a simulator and use `Cmd+S` (iOS) or `adb exec-out screencap` (Android):

| Store | Sizes needed |
|-------|--------------|
| iOS | 6.9" (1320×2868), 6.5" (1284×2778) |
| Android | Phone (1080×1920), 7" tablet (1200×1920) |

Capture 4–6 screens each: Welcome, Home, Trip Detail (Pool), Flights, Invite, Admin Dashboard.

### Marketing Copy
- **App name:** Travel'D
- **Subtitle (iOS, 30 chars):** "Host trips, split the pool"
- **Short desc (Android, 80 chars):** "Group travel made easy — pool money, share invites, track your flights."
- **Full description:** use `/app/memory/PRD.md` as source material
- **Keywords (iOS):** travel, trip, group, pool, flight, reminder, split, host, invite
- **Category:** Travel

### Privacy Policy URL (REQUIRED)
- Host `/app/PRIVACY_POLICY.md` publicly. Easiest options:
  - **GitHub Pages** — push it to a public repo, turn on Pages
  - **Vercel** — free, drag-and-drop a HTML copy
- Paste the public URL in App Store Connect → *App Privacy → Privacy Policy URL*

---

## Phase 5 — Build & Submit iOS

```bash
cd frontend
eas build --platform ios --profile production
# Wait ~15 min. Download the .ipa when done.

eas submit --platform ios
# Uploads to App Store Connect. Enter your Apple ID + app-specific password.
```

Then in **App Store Connect** (https://appstoreconnect.apple.com):
1. Create a new app — bundle ID `com.terrelldam.traveld`
2. Upload screenshots
3. Fill App Privacy questionnaire — see [App Privacy answers](#app-privacy-answers) below
4. Complete App Review Information — include founder test account: `terrelldam1@gmail.com` + the password you set on first login
5. Submit for review (typical wait: 24–72 hours)

### App Privacy answers
- Email address → linked to identity, used for app functionality
- Name → linked, app functionality
- Payment info → **handled by Stripe**, not collected by us
- Purchases → linked, app functionality
- Other user content (flight info) → linked, app functionality
- Tracking: **No**

---

## Phase 6 — Build & Submit Android

```bash
eas build --platform android --profile production
eas submit --platform android
```

On first Android submit, EAS will ask for a **Google Play service account key**. Create one:
1. Go to https://play.google.com/console → Setup → API access
2. Create a new service account in Google Cloud, grant it **"Release manager"** role
3. Download the JSON key, save as `frontend/google-play-service-account.json` (already referenced in `eas.json`)

In **Play Console** (https://play.google.com/console):
1. Create app — package `com.terrelldam.traveld`
2. Content rating questionnaire
3. Data safety form — mirror the iOS App Privacy answers
4. Target audience: 18+
5. Upload screenshots + feature graphic (1024×500)
6. Submit to **internal testing** first (instant), then **closed testing**, then **production**

---

## Phase 7 — Stripe Live Mode

Before going live:
1. Activate your Stripe account (business details, bank info) at https://dashboard.stripe.com/settings/account
2. Replace `sk_test_emergent` with your **live** `sk_live_...` key in the backend env
3. Set up a webhook endpoint: `https://<your-backend>/api/webhook/stripe`
4. Test with a real card before opening to users

⚠️ **Important:** Apple requires that any digital goods (premium features, unlocks) use **In-App Purchase**, not Stripe. The Travel'D pool is for *real-world travel expenses* (flights, hotels, activities), which is allowed via Stripe. Make sure your App Store submission description emphasizes this clearly.

---

## Phase 8 — Ongoing

- **Version bumps:** update `version` + `ios.buildNumber` + `android.versionCode` in `app.json` before each release
- **OTA updates:** small JS-only fixes can ship via `eas update` without a store re-review
- **Analytics (optional):** add `expo-analytics` or Mixpanel

---

## Quick reference

| Task | Command |
|------|---------|
| Dev build | `eas build --profile development` |
| Production iOS | `eas build --platform ios --profile production` |
| Production Android | `eas build --platform android --profile production` |
| Submit iOS | `eas submit --platform ios` |
| Submit Android | `eas submit --platform android` |
| Push OTA update | `eas update --branch production` |

You've got this. First review is always the longest — once accepted, subsequent releases are much faster.
