# QPIE — Book My Show (system document)

Ye document batata hai ki app kaise kaam karta hai, kyun aisa design kiya, aur kahan kya code hai.

---

## 1. Kya banaya hai

Flow: **City chuno → us city ke shows dekho → show chuno → kitni seats chahiye wo chuno → live seat map dekho → seats chuno → hold + pay → ticket code.**

Stack: Next.js 14 (App Router) · MongoDB (Mongoose) · **Redis** (seat lock, cache, live updates, queue) · **BullMQ** (background jobs) · Razorpay · GSAP animations.

---

## 2. Architecture

```
 Browser (React + GSAP)
   │  REST  (cities, shows, seat map, hold+pay, verify)
   │  SSE   (live seat updates)
   ▼
 Next.js server  (stateless — kitne bhi instances chala sakte ho)
   ├── Redis ── seat locks (Lua, atomic) · cache · pub/sub · rate limit · BullMQ
   ├── MongoDB ── source of truth (users, events, bookings, BookedSeat)
   └── BullMQ worker (same process) ── expire hold · refund · Redis resync
                         ▲
          Razorpay webhook (backstop agar user tab band kar de)
```

**Do data stores kyun?**
- **Redis** = speed + coordination. Seat "hold" 5 minute ka temporary lock hai, ye Redis mein rehta hai.
- **MongoDB** = permanent sach. Jo seat bik gayi wo `BookedSeat` collection mein jati hai, `(event, seatId)` par **unique index** ke saath.

---

## 3. Booking flow (step by step)

1. `GET /cities` → cities jinme upcoming show hai (Redis cache, 60s).
2. `GET /events` → shows (city / upcoming / search filtering happens in the browser).
3. User show kholta hai → `GET /events/:id/seats` (Redis se, ek round trip) + `GET /events/:id/stream` (SSE) shuru.
4. User seat count chunta hai (1–10), seats tap karta hai (ya **Best available** dabata hai).
5. **Hold + Pay** → `POST /bookings { eventId, seatIds }`
   - Server price khud nikalta hai (client price nahi bhejta).
   - Redis Lua script **sab seats ek saath, atomically** lock karta hai (all-or-nothing).
   - Lock mil gaya → Razorpay order banta hai → `Booking(status=created)` save → expire job queue mein.
   - Lock nahi mila → **409** + `unavailable: ["B3"]` (UI isko "pick another seat" ki tarah dikhata hai).
6. Razorpay checkout khulta hai, 5 min ka countdown ring dikhta hai.
7. Payment ke baad `POST /bookings/verify` → signature check → `confirmPayment()`.
8. `confirmPayment()`: booking **claim** karo → `BookedSeat` insert (unique index) → status `paid` + booking code → Redis mein seats "booked" mark → live update push.
9. Checkout band kar diya → `POST /bookings/release` → seats turant free.

---

## 4. "Ek seat, ek se zyada user" — error kaise nahi aata

Pehle ek honest baat: **ek hi seat do logon ko nahi mil sakti.** Jo kar sakte hain (aur kiya hai): ek ko seat mile, dusre ko **crash/ugly error ki jagah friendly message** mile aur seat map apne aap update ho jaye.

Teen layers hain:

| Layer | Kya karta hai |
|---|---|
| **1. Redis Lua hold** | "Check saari seats free hain + lock karo" ek atomic step hai. Redis single-threaded hai, to do requests kabhi beech mein ghus nahi sakti. |
| **2. Live seat map (SSE)** | Jaise hi koi seat hold/book karta hai, baaki sab ke screen par wo seat amber/grey ho jati hai. Conflict hone se pehle hi avoid ho jata hai. |
| **3. MongoDB unique index** | Agar kabhi Redis flush/crash ho jaye, tab bhi DB ek seat do baar bechne nahi dega. Aisa hua to booking `failed` + **automatic refund** (queue). |

UI mein race hone par: seat **shake** karti hai, message aata hai *"B3 was just taken. Please pick another."*, aur tumhari baaki seats selected rehti hain.

**Tested:** `npm run test:concurrency` — 1000 users ek hi seat par ek saath → **exactly 1 winner**, 999 ko clean "taken". Random overlapping multi-seat requests mein koi seat do owners ke paas nahi, aur partial win kabhi nahi hota.

---

## 5. Redis keys

Har show ke liye (`{show:ID}` hash-tag, taaki Redis Cluster mein ek hi slot par rahein):

| Key | Type | Matlab |
|---|---|---|
| `{show:ID}:booked` | SET | permanently bik chuki seats |
| `{show:ID}:holds` | ZSET | seat → hold expiry (ms) |
| `{show:ID}:holdby` | HASH | seat → holdId (kiska lock hai) |
| `{show:ID}:warm` | STRING | "booked set DB se bhara ja chuka hai" marker |
| `show:ID:events` | PUB/SUB | live seat updates ka channel |
| `cache:*` | STRING | cached events/cities (version `cache:v` se invalidate) |
| `rl:*` | STRING | rate limit counters |

Lua scripts (`lib/seatCore.cjs`): `seatHold`, `seatRelease`, `seatBook`, `seatSnapshot`. Time **Redis TIME** se aata hai, app servers ki clock se nahi (clock skew ka problem nahi).

**Redis restart ho jaye to?** Pehli request par `ensureWarm()` MongoDB se booked seats wapas Redis mein bhar deta hai. Chalte hue holds kho jate hain, par DB unique index final guard hai.

---

## 6. Queue (BullMQ) — kyun aur kya

User ke request ko slow nahi karna, isliye ye kaam background mein:

| Job | Kab | Kya |
|---|---|---|
| `expire-hold` | hold ke 5:30 min baad (delayed) | agar kisi ne pay nahi kiya to booking `expired`, seats free |
| `refund` | paisa kat gaya par seat kisi aur ko mil gayi | Razorpay refund, 6 retries (exponential backoff) |
| `sync-booked` | DB mein seat bik gayi par Redis update fail hua | Redis mein replay, 10 retries |

Worker `instrumentation-node.js` se same Next process mein start hota hai (free hosting par alag process nahi chahiye). Alag worker chalana ho to web instance par `ENABLE_WORKER=false`.

---

## 7. Non-functional requirements

**1. Low latency**
- Seat map = Redis Lua, ek round trip.
- Events/cities Redis cache + `Cache-Control: s-maxage` (CDN friendly).
- **Single-flight cache:** cache miss par 1000 requests ke bajay MongoDB ko sirf 1 query jati hai.
- Mongo pool warm (min 5, max 50). Redis commands 2s mein fail-fast.

**2. High availability**
- App servers stateless hain → PM2 cluster / multiple instances ke peeche chalao.
- Redis down ho to: **reads (shows, seat map) MongoDB se chalte rehte hain**; seat map "live holds unavailable" banner ke saath.
- Booking (write) Redis ke bina **503 "try again"** deta hai — jaan-bujh kar, taaki consistency na toote.
- Redis AOF persistence (`docker-compose.yml`). Production mein replica + Sentinel / managed Redis lo.
- Razorpay **webhook** backstop: user tab band kar de tab bhi ticket ban jata hai.

**3. Strong consistency**
- Seat bechne ka decision sirf (a) Redis atomic lock aur (b) MongoDB unique index se hota hai.
- `confirmPayment()` pehle booking ko atomically `processing` claim karta hai → verify aur webhook ek saath aaye to bhi seats do baar nahi katte.
- Late payment (hold expire hone ke baad): seat abhi free hai to ticket mil jata hai, warna auto-refund.

**4. High concurrency**
- Lua atomic locking (contention par bhi correct).
- Ek Redis subscriber per server process, saare SSE clients share karte hain (1000 users ≠ 1000 Redis connections).
- Rate limit: 15 hold attempts / minute / user.
- Queue slow kaam (refund, expiry) request path se bahar rakhti hai.

---

## 8. Failure scenarios

| Situation | Kya hota hai |
|---|---|
| Do users same seat ek saath | Ek jeetta hai, dusre ko 409 + friendly message, map refresh |
| User payment window band kare | `/bookings/release` → seats turant free |
| User pay kare par browser band ho jaye | Webhook `payment.captured` → ticket ban jata hai |
| Hold expire, user ne late pay kiya, seat free | Ticket mil jata hai |
| Hold expire, late pay, seat kisi aur ne le li | Booking `failed` → queue refund → `refunded` |
| Verify do baar fire (double click / webhook) | Claim step se ek hi baar process hota hai |
| Redis restart / flush | `ensureWarm` DB se rebuild; DB unique index guard |
| Redis down | Reads Mongo se; booking 503 (consistent) |
| Redis "mark booked" fail | `sync-booked` job retry karta hai |
| Server crash `processing` ke beech | 60s baad stale `processing` dobara claim ho sakta hai |

---

## 9. API

| Method | Route | Access |
|---|---|---|
| GET | `/api/v1/cities` | public |
| GET | `/api/v1/events?recent=true` | public |
| GET | `/api/v1/events?all=true` | admin (drafts bhi) |
| POST / PUT / DELETE | `/api/v1/events[/:id]` | admin |
| GET | `/api/v1/events/:id/seats` | public — layout + booked + held |
| GET | `/api/v1/events/:id/stream` | public — SSE live updates |
| POST | `/api/v1/bookings` | login — seats hold + Razorpay order |
| GET | `/api/v1/bookings` | login — meri bookings |
| POST | `/api/v1/bookings/verify` | login — payment confirm |
| POST | `/api/v1/bookings/release` | login — hold chhod do |
| POST | `/api/v1/webhooks/razorpay` | Razorpay (signature se secured) |

Conflict response:
```json
{ "error": "Seat B3 was just taken. Please pick another.", "code": "SEATS_TAKEN", "unavailable": ["B3"] }
```

---

## 10. Files

**Backend**
- `lib/seatCore.cjs` — Redis Lua seat engine (hold/release/book/snapshot)
- `lib/seats.js` — layout validation, warm-up, cache, publish
- `lib/redis.js` — client, single-flight cache, rate limit
- `lib/pubsub.js` — shared Redis subscriber for SSE
- `lib/queue.js`, `lib/worker.js` — BullMQ queue + jobs
- `lib/bookingService.js` — `confirmPayment()` (claim → DB → Redis)
- `lib/eventInput.js` — admin input whitelist + city normalize
- `models/BookedSeat.js` — unique `(event, seatId)`
- `instrumentation.js`, `instrumentation-node.js` — worker boot

**Frontend**
- `app/bookshow/page.js` — city + shows
- `components/booking/SeatSheet.jsx` — seat count, best available, hold, payment, confirmation
- `components/booking/SeatMap.jsx` — animated seat grid
- `components/booking/useSeatLive.js` — snapshot + SSE + polling
- `components/booking/CityPicker.jsx`, `AnimatedNumber.jsx`

**Animations (GSAP):** header reveal, city pill glide, card stagger + 3D tilt, seat ripple-in from centre, seat pop on select, live flash when someone else's seat changes, shake on conflict, animated price counter, countdown ring, confirmation check-draw + confetti. `prefers-reduced-motion` respect hota hai.

---

## 11. Setup

```bash
npm install
npm install ioredis bullmq          # agar naye package.json se na aaye
docker compose up -d redis          # free local Redis (ya Redis Cloud free 30MB)
cp .env.local.example .env.local    # MONGODB_URI, REDIS_URL, JWT_SECRET, Razorpay keys
npm run seed                        # admin + 6 shows (Delhi, Mumbai, Hyderabad, Bengaluru, Lucknow)
npm run dev
```

Concurrency proof (sirf Redis chahiye): `npm run test:concurrency`

Webhook local test: `ngrok http 3000` → Razorpay Dashboard → Webhooks → `https://<ngrok>/api/v1/webhooks/razorpay`, events `payment.captured`, secret = `RAZORPAY_WEBHOOK_SECRET`.

**Purane events:** `city` aur seat layout nahi hote. Admin → Edit → City, Rows, Seats per row bharo, tab `/bookshow` par dikhenge.

## 12. 1k users ke liye deploy

```bash
npm run build
npx pm2 start npm --name qpie -i max -- start   # har CPU core par ek instance
```
- Sab instances ek hi Redis + Mongo se baat karte hain (stateless).
- SSE ke liye **long-running Node server** chahiye (Render / Railway / VPS). Vercel serverless par SSE connection kat jata hai — tab bhi app chalega kyunki client har 5s snapshot poll karta hai, bas "instant" updates nahi milenge.
- Read endpoints ka load test: `npx autocannon -c 1000 -d 20 "http://localhost:3000/api/v1/events?city=Delhi"`

## 13. Limitations (honest)

- `BookedSeat` + Razorpay flow ka end-to-end test maine yahan nahi kiya (sandbox mein MongoDB/Razorpay nahi tha). Tested: Redis seat engine (1000 concurrent), `next build`, seat map route, SSE push, worker boot. Pehli baar Razorpay **test mode** mein ek full booking zaroor chalana.
- Hold booking ke time Razorpay API call hoti hai; 1000 simultaneous holds par Razorpay ka rate limit dekhna padega.
- Redis Cloud free / local theek hai. **Upstash free tier BullMQ ke liye mat lo** (command limit jaldi khatam).
- Login/register par rate limit abhi nahi (sirf booking par). `lib/redis.js` ka `rateLimit()` wahan bhi laga sakte ho.
- JWT mein role 7 din tak trust hota hai (admin demote karne par token expire hone tak chalega).
