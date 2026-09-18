# QPIE

Event discovery site + ticket booking, in one Next.js 14 (App Router) app.
MongoDB for data, JWT auth with roles, Razorpay for payments.

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in MongoDB URI, JWT secret, Razorpay keys
npm run seed                       # creates your admin account + 3 sample events
npm run dev
```

Sign in at `/login` with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set,
then open `/admin`.

## Env vars

| Key | Where to get it |
|---|---|
| `MONGODB_URI` | MongoDB Atlas → Connect → Drivers (free M0 tier) |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → Settings → API Keys (test mode) |
| `SEED_ADMIN_*` | Your choice — only read by `npm run seed` |
| `ALLOWED_ORIGIN` | Optional. Origin allowed to call `/api/v1` from outside this app |

## Pages

| Route | Who | What |
|---|---|---|
| `/` | public | Hero, featured events, recent events, footer |
| `/bookshow` | public to browse, sign-in to pay | Pick a show, choose seats, pay |
| `/bookings` | signed in | Your tickets and booking codes |
| `/login` | public | Sign in or create an account |
| `/admin` | admin role | Create, edit and delete events |

## API

Everything lives under `/api/v1` and returns JSON only — the same surface a
mobile app can use later. Auth works with an httpOnly cookie (web) **or** an
`Authorization: Bearer <token>` header (any other client); `login` and
`register` return the token in the body for that reason.

| Method | Route | Access |
|---|---|---|
| POST | `/api/v1/auth/register` | public |
| POST | `/api/v1/auth/login` | public |
| POST | `/api/v1/auth/logout` | public |
| GET | `/api/v1/auth/me` | public (returns `{ user: null }` when signed out) |
| GET | `/api/v1/events` | public — `?recent=true` filters to the recent section |
| POST | `/api/v1/events` | admin |
| GET | `/api/v1/events/:id` | public |
| PUT / DELETE | `/api/v1/events/:id` | admin |
| GET | `/api/v1/bookings` | signed in — your own bookings only |
| POST | `/api/v1/bookings` | signed in — creates a Razorpay order |
| POST | `/api/v1/bookings/verify` | signed in — confirms payment, issues the ticket |
| POST | `/api/v1/subscribe` | public — footer email signup |

## How a booking works

1. Browser posts `{ eventId, seats }` to `/api/v1/bookings`.
   The **server** reads the event's own `pricePerSeat` and computes the amount —
   the client never sends a price, so it can't decide what it pays.
2. Server creates the Razorpay order and a `Booking` row with status `created`.
3. Razorpay Checkout opens; on success the browser posts the three Razorpay ids
   to `/api/v1/bookings/verify`.
4. Server recomputes `HMAC-SHA256(order_id|payment_id, KEY_SECRET)` and compares
   it to the signature in constant time. A mismatch marks the booking `failed`.
5. Seats are decremented with a single guarded `findOneAndUpdate`
   (`availableSeats: { $gte: seats }`), so two people paying for the last seat
   at the same time can't both win. The loser is marked `failed` for refund.
6. Booking goes to `paid` and gets a booking code. Verify is idempotent —
   Razorpay's handler can fire more than once.

## Roles

One `User` model, `role` is `user` or `admin`. Register always creates a `user`;
role is never read from the request body. Admin is granted by `npm run seed` or
by flipping the field in Atlas. Every admin route calls `requireAdmin()` on the
server — hiding the `/admin` link in the UI is convenience, not the protection.

## Before going live

- Add a Razorpay **webhook** (`payment.captured`) as a backstop, so a booking
  still confirms if the user closes the tab before `verify` runs.
- Refund flow for the sold-out-after-payment case (currently marked `failed` and
  logged, but the refund is manual).
- Rate-limit `/api/v1/auth/login` and `/api/v1/auth/register`.
- Set `ALLOWED_ORIGIN` instead of leaving CORS at `*`.
- Swap the Pexels stock URLs for your own licensed media.
