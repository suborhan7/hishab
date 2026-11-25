# Hisab · হিসাব

A personal money tracker for **one bKash account that holds three kinds of money**: your own, your business partner's (Khobaib), and tournament collections. Every transaction belongs to a *pocket*, each pocket has a live balance, and the app checks that all pockets together match the real bKash balance.

It is a PWA: install it on your phone from the browser, or use it as a normal website on a laptop.

## Features

| | |
|---|---|
| **Pockets** | Personal, Khobaib (partner), Tournament by default; add, rename, recolour or archive more. Each pocket has a starting balance and a live balance. |
| **Screenshot entry** | Upload a bKash app receipt, notification or SMS screenshot. Gemini Flash (free tier) reads amount, TrxID, phone, date/time, type, fee and balance after. You always confirm on a pre-filled form before saving. The screenshot is kept as proof. |
| **Duplicate guard** | Warns as soon as a TrxID that is already saved is typed or read, and again on save (you can still save on purpose). |
| **Manual entry** | The same form, typed by hand. |
| **Balance check** | Type the real bKash balance; Hisab compares it with the sum of all pockets and shows the difference. A red warning appears whenever the Personal pocket goes negative (you are spending other people's money). |
| **Partner ledger** | Total received, total paid out (with where/why), fees, and what is still owed. A statement for any date range can be shared as an image, saved as PNG, or printed / saved as PDF. |
| **Tournament** | Player list with jersey number/size and paid / partly paid / unpaid status (bKash payments linked to a player plus cash), total collected, and what is still due to the jersey vendor. |
| **Fees** | bKash charges are stored separately from the amount, can be charged to any pocket, and have their own page (by month and by type). |
| **History** | Search (name, phone, TrxID, note) and filters (pocket, person, type, in/out, date range) with totals; monthly summary by pocket and by type. |
| **Language** | Full Bangla or full English (toggle in the top bar). Bangla mode uses Bangla numerals and dates. |
| **Theme** | Soft light and soft dark (no pure white/black), or follow the phone. Choice is remembered. |

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Drizzle ORM · Neon Postgres · Vercel Blob · Gemini Flash (`@google/genai`) · single password + signed session cookie (`jose`). All free tiers.

## Environment variables

Copy `.env.example` to `.env.local` for local development.

| Variable | Required | What it is |
|---|---|---|
| `APP_PASSWORD` | yes | The password you log in with. |
| `SESSION_SECRET` | yes | Random string (32+ chars) that signs the session cookie. `openssl rand -base64 32` |
| `DATABASE_URL` | in production | Neon Postgres connection string. Set automatically by Vercel's Neon integration. Leave empty locally to use an on-disk PGlite database in `./.pglite`. |
| `GEMINI_API_KEY` | for screenshot reading | Free key from <https://aistudio.google.com/apikey>. Without it the screenshot is still stored and you fill the form yourself. |
| `GEMINI_MODEL` | no | Defaults to `gemini-flash-latest`. |
| `BLOB_READ_WRITE_TOKEN` | in production | Set automatically when you connect a Vercel Blob store. Leave empty locally to store screenshots in `./public/uploads`. |
| `BLOB_ACCESS` | no | `private` (default, recommended) or `public`, matching how the Blob store was created. Screenshots are always served through `/api/proof`, behind login. |

## Run locally

```bash
npm install
cp .env.example .env.local   # set APP_PASSWORD and SESSION_SECRET
npm run dev                  # http://localhost:3000
```

No database setup is needed locally: without `DATABASE_URL` the app creates `./.pglite` and applies the migrations on first request.

## Deploy to Vercel (free)

1. Import this repository in Vercel.
2. **Storage → Create → Neon (Postgres)**, connect it to the project. This sets `DATABASE_URL`.
3. **Storage → Create → Blob** (choose *Private*), connect it. This sets `BLOB_READ_WRITE_TOKEN`.
4. **Settings → Environment Variables**: add `APP_PASSWORD`, `SESSION_SECRET`, `GEMINI_API_KEY`.
5. Deploy. `npm run build` runs `scripts/migrate.mjs` first, so the database tables are created/updated on every deploy.
6. Open the site on your phone → browser menu → **Add to Home screen**.

## How the numbers work

- Money is stored as integer **poisha** (৳1 = 100) to avoid rounding errors.
- **Pocket balance** = starting balance + money in − money out − fees charged to that pocket.
- **Balance check**: the real bKash balance should equal the sum of all pockets (including archived ones). Set each pocket's starting balance once so that this holds on day one.
- A transaction's fee goes to its own pocket unless you pick another one under "Fee paid from".
- Tournament vendor payments are normal "money out" transactions in the tournament pocket with the category *Paid to jersey vendor*.

## Project layout

```
src/
  app/
    (app)/            screens behind login (home, add, history, pockets, reconcile, fees, summary, settings)
    actions/          server actions (auth, transactions, pockets/players/reconcile)
    api/extract       screenshot upload + Gemini extraction (no DB writes)
    api/proof         serves stored screenshots behind login
    login/
  components/         shared UI (app shell, transaction form, lists, icons)
  db/                 Drizzle schema + client (Neon in prod, PGlite locally)
  i18n/               en.ts / bn.ts dictionaries (TypeScript enforces identical keys)
  lib/                data queries, money/date helpers, Gemini, storage, session
  proxy.ts            redirects to /login without a valid session
drizzle/              SQL migrations (generate with `npm run db:generate` after editing the schema)
public/sw.js          service worker (offline shell; money data is always fetched fresh)
```

## Scripts

| Script | |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Apply migrations (if `DATABASE_URL` is set) and build |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Create a new migration after changing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:studio` | Browse the database |
