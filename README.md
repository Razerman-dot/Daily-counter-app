# Daily Counter

Tap to count anything – push-ups, glasses of water, customers served – and keep a
separate total for every day. Built mobile-first with React + Vite on the front and
Express + MongoDB on the back.

```
/client   React 18 + Vite, React Router, Axios, Tailwind, Recharts, dayjs
/server   Express REST API, Mongoose, JWT (httpOnly cookie), bcrypt, Zod, helmet, rate limiting
```

## Features

- **Auth** – register / login / logout / "me"; JWT in an httpOnly cookie; bcrypt-hashed passwords.
- **Counter screen** – huge number for *today*, big +1 / −1 buttons (never below 0), *Reset today*
  with confirmation, ↑ / ↓ keyboard shortcuts on desktop, haptic tap on phones.
- **Optimistic UI** – every tap updates instantly and is saved right away; failed requests roll back
  just their own change and show a toast.
- **One record per user, per counter, per day**, in the **user's timezone** (default `Africa/Lagos`).
  At midnight the screen rolls over to 0 automatically; yesterday's total stays saved.
- **History** – 7/30-day bar chart, list view and month calendar, and stats: today, this week,
  this month, all-time, daily average, best day, current streak and longest streak.
- **CSV export** of a counter's full history.
- **Multiple counters** – create, rename, delete; each has its own history.
- Dark / light mode, loading / empty / error states everywhere, toasts for feedback.

## How the daily storage works

```js
DailyCount { userId, counterId, date: "YYYY-MM-DD", count, createdAt, updatedAt }
// unique index on { userId, counterId, date }
```

- `date` is computed on the **server** from the user's stored IANA timezone
  (`dayjs().tz(user.timezone)`), never from server time or raw UTC – see
  [`server/src/utils/date.js`](server/src/utils/date.js).
- **+1** is a single atomic `findOneAndUpdate({...key}, { $inc: { count: 1 } }, { upsert: true })`.
  100 simultaneous taps → one document with `count: 100` (covered by a test). If two
  *first* taps race to insert, the unique index rejects one and it's retried.
- **−1** only matches when `count >= 1` (`{ ...key, count: { $gte: 1 } }`), so the floor at 0 is
  enforced inside the atomic update – no read-modify-write race.
- See [`server/src/services/countService.js`](server/src/services/countService.js).

## Run it locally

**Prerequisites:** Node.js 18.18+ (20 or 22 LTS recommended) and a MongoDB database – either a free
[MongoDB Atlas](https://www.mongodb.com/atlas) cluster or MongoDB running locally.

### 1. API

```bash
cd server
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Edit `server/.env`:

- `MONGODB_URI` – your Atlas connection string (Atlas → *Connect* → *Drivers*), or
  `mongodb://127.0.0.1:27017/daily-counter` for a local MongoDB.
- `JWT_SECRET` – a long random string:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

```bash
npm run seed    # optional: demo user + 30 days of sample data
npm run dev     # http://localhost:4000  (health check: /api/health)
```

Demo login after seeding: **demo@example.com / demo12345**

> **No MongoDB yet?** `npm run dev:memory` starts a throwaway in-memory MongoDB, seeds the
> demo user and runs the API against it (data is lost when you stop it). Only `JWT_SECRET`
> is needed – and even that has a dev default.

### 2. Web app

```bash
cd client
npm install
npm run dev     # http://localhost:5173
```

In development Vite proxies `/api` to `http://localhost:4000`, so no client `.env` is needed.

### 3. Tests

```bash
cd server
npm test
```

Uses Node's built-in test runner and an in-memory MongoDB (`mongodb-memory-server`
downloads a MongoDB binary the first time it runs, so the first run takes longer). Covers:

- **Increment / upsert** – single record per day, 100 concurrent taps, the 0 floor under
  concurrent decrements, mixed concurrent +/−, per-day and per-counter isolation, reset, the unique index.
- **Day boundaries** – Lagos midnight at 23:00 UTC, timezones behind/ahead of UTC, half-hour
  offsets, DST transition days, leap days, week/month starts.
- **Stats** – totals, average, best day, streaks.
- **API** – auth flow, cookie flags, CSRF header, validation, users isolated from each other's
  counters, history gap filling, CSV export, timezone changes.

## API

All endpoints are under `/api`. Writes (POST/PATCH/DELETE) must send
`X-Requested-With: XMLHttpRequest` (the web app does this automatically).

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/register` | `{ name, email, password, timezone? }` – also creates a first counter |
| POST | `/auth/login` | `{ email, password }` |
| POST | `/auth/logout` | |
| GET | `/auth/me` | current user |
| PATCH | `/auth/me` | `{ name?, timezone? }` |
| GET | `/counters` | list, each with today's count |
| POST | `/counters` | `{ name }` |
| PATCH | `/counters/:id` | `{ name }` (rename) |
| DELETE | `/counters/:id` | deletes the counter and its history |
| GET | `/counters/:id/today` | `{ date, count, timezone }` |
| POST | `/counters/:id/increment` | `{ amount: 1 \| -1 }` → `{ date, count, applied }` |
| POST | `/counters/:id/reset-today` | |
| GET | `/counters/:id/history?from=YYYY-MM-DD&to=YYYY-MM-DD` | every day in range (gaps = 0); default last 30 days, max 366 |
| GET | `/counters/:id/stats` | today, week, month, allTime, dailyAverage, bestDay, currentStreak, longestStreak |
| GET | `/counters/:id/export.csv` | optional `from` / `to` |
| GET | `/health` | DB connectivity, for the host's health check |

Errors are always `{ "error": "message", "details"?: [{ field, message }] }`.

## Security notes

- Passwords hashed with bcrypt (12 rounds, via `bcryptjs` – the same algorithm, no native build step).
  Login takes the same time whether or not an email exists.
- The JWT lives in an `httpOnly` cookie, so page JavaScript can't read it.
- CSRF: writes require the `X-Requested-With` header. Browsers can't send it cross-origin without a
  CORS preflight, and CORS only allows `CLIENT_ORIGIN`.
- `helmet` headers, JSON body size limit, `express-rate-limit` on login/register (20 failed attempts
  / 15 min / IP) plus a general API limit.
- Every input is validated with Zod; every counter query is scoped to `userId` (someone else's
  counter returns 404).
- CSV cells are escaped and protected against spreadsheet formula injection.

## Deploy

### Backend → Render (or Railway)

1. Push the repo to GitHub.
2. **Render** → *New* → *Web Service* → pick the repo.
   - Root directory: `server`
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/api/health`
3. Environment variables:
   - `NODE_ENV=production`
   - `MONGODB_URI=` your Atlas string (in Atlas → *Network Access*, allow `0.0.0.0/0` or Render's outbound IPs)
   - `JWT_SECRET=` long random string
   - `CLIENT_ORIGIN=https://your-app.vercel.app` (comma-separate several origins)
   - `COOKIE_SAMESITE` – see below
4. Optional: run the seed once from the Render shell: `npm run seed`.

**Railway** is the same: new project from the repo, root `server`, start command `npm start`, same variables (Railway sets `PORT`).

### Frontend → Vercel (or Netlify)

Recommended: **proxy `/api` through the frontend host**. The browser then only talks to
your frontend domain, the cookie is first-party, and Safari/iOS (which blocks third-party
cookies) works.

1. In [`client/vercel.json`](client/vercel.json) (Vercel) or
   [`client/public/_redirects`](client/public/_redirects) (Netlify), replace
   `YOUR-API.onrender.com` with your API host.
2. **Vercel** → *New Project* → import the repo → root directory `client`. Framework preset: Vite.
   Leave `VITE_API_URL` **empty**.
   **Netlify** → base directory `client`, build command `npm run build`, publish directory `client/dist`.
3. On the API set `COOKIE_SAMESITE=lax` and `CLIENT_ORIGIN=https://your-app.vercel.app`.

Alternative – call the API directly (cross-site): set `VITE_API_URL=https://your-api.onrender.com`
on the frontend and `COOKIE_SAMESITE=none` on the API (the production default; requires HTTPS).
This works in Chrome/Firefox, but browsers that block third-party cookies (Safari) won't keep users
logged in – which is why the proxy setup is recommended.

## Project structure

```
server/
  src/
    app.js                 Express app (middleware, routes)
    server.js              boots DB + HTTP server, graceful shutdown
    config/                env validation (Zod), Mongo connection
    models/                User, Counter, DailyCount
    services/countService  atomic increment / decrement / reset
    controllers/           auth + counters
    routes/                route → validation → controller wiring
    middleware/            auth (JWT cookie), validate (Zod), security, errors
    utils/                 date (timezone day keys), stats, csv, http helpers
    validators/            Zod schemas for every endpoint
  scripts/seed.js          demo user + 30 days of data
  tests/                   node:test suites
client/
  src/
    api/                   axios instance + endpoint functions
    context/               Auth, Theme, Counters providers
    hooks/                 useTodayCount (optimistic + day rollover), useAsync
    components/            Layout, guards, dialogs, chart, calendar, states
    pages/                 Counter, History, Counters, Settings, Login/Register
```
