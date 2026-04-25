# Privacy Policy — Travel'D

**Last updated:** April 24, 2026

Travel'D ("we", "us", or "our") operates the Travel'D mobile application (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.

## 1. Information We Collect

### Account Information
When you register, we collect:
- **Email address** (required for login and trip invitations)
- **Name** (displayed to trip members)
- **Password** (stored hashed with bcrypt; we never store plaintext)

### Trip & Travel Information
When you create or join a trip, we collect:
- Trip name, destination, dates, and cover image selection
- Invite codes and member lists
- **Flight details you add**: airline, flight number, departure/arrival airports and times, optional confirmation numbers

### Payment Information
For pool contributions:
- We use **Stripe** (stripe.com) to process payments. We do **not** store your credit card number or CVC on our servers.
- We store only the Stripe checkout session ID, amount, currency, category, and payment status.
- See Stripe's privacy policy: https://stripe.com/privacy

### Device Information
- **Local notifications** are scheduled on-device for flight check-in reminders. These do not leave your device.
- We do **not** collect advertising identifiers, location data, contacts, or browsing history.

## 2. How We Use Your Information

- To provide core features (creating trips, joining via invite code, pool contributions, flight reminders)
- To authenticate you and keep your account secure
- To display trip member lists and contribution totals to other members of the same trip
- To process payments through Stripe

## 3. Data Sharing

We do **not** sell your personal information. We share data only with:
- **Stripe**, to process payments you initiate
- **Other members of a trip you join** — they see your name, email, avatar, flight info *for that trip*, and contribution amount
- **Legal authorities**, if required by law

## 4. Data Storage and Security

- Data is stored in a MongoDB database hosted on secured cloud infrastructure.
- Passwords are hashed with bcrypt. JWT tokens are signed with a secret and stored on your device using Expo SecureStore.
- Payment data flows directly between your device and Stripe.

## 5. Your Rights

You can:
- **Access, edit, or delete** your trips, flights, and contributions from within the app
- **Delete your account** by emailing terrelldam1@gmail.com (we will remove your data within 30 days)
- **Withdraw from a trip** at any time via the trip detail screen

Residents of the EEA (GDPR), UK, and California (CCPA) have additional rights to data portability, correction, and deletion. Contact us to exercise these rights.

## 6. Children's Privacy

Travel'D is not directed to children under 13. We do not knowingly collect data from children under 13. If you believe we have, please contact us immediately.

## 7. Notifications

The app requests permission to send **local push notifications** for flight check-in reminders (scheduled 24 hours before your flight). You can disable this in your device settings at any time.

## 8. Changes to This Policy

We may update this policy from time to time. Changes will be posted at this URL with an updated "Last updated" date.

## 9. Contact

For questions or data requests:
**Email:** terrelldam1@gmail.com
**App:** Travel'D by Terrell Damien

---

*Host this file at a public URL (e.g. GitHub Pages) and enter that URL as your Privacy Policy link in App Store Connect and Google Play Console.*
