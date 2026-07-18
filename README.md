# RupeeLens — Personal Finance

TanStack Start + shadcn/ui + Framer Motion app for Indian bank CSV imports, local IndexedDB storage, and Mistral-powered categorization.

## Setup

```bash
npm install
cp .env.example .env
# Add your MISTRAL_API_KEY to .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Upload monthly bank CSVs (Axis-first; HDFC, ICICI, SBI, Kotak, Yes, IndusInd, IDFC + generic mapper)
- Store statements & transactions in browser IndexedDB
- Auto-categorize via Mistral (`mistral-small-latest`)
- Dashboard: income / expense / net, category breakdown, top merchants
- Weekly & daily spend charts
- Subscriptions detection
- Credits vs debits views

## Sample data

Import [`fixtures/axis-sample.csv`](fixtures/axis-sample.csv) from the Upload page to try the flow without a real statement.

## Deploy to Vercel

TanStack Start requires the **Nitro** plugin for server-side routing on Vercel.

1. **Environment variables** (Vercel → Project Settings → Environment Variables):
   - `MISTRAL_API_KEY` — server-only, for AI categorization/chat
   - `VITE_NEON_AUTH_URL` — same value as local (Neon Auth base URL, ends with `/neondb/auth`)
   - `DATABASE_URL` — Neon Postgres connection string (server-only)
2. **Neon Auth trusted origins** (Neon Console → Auth, or Neon MCP): add your production URL, e.g. `https://rupeelens-coral.vercel.app`. Without this, sign-in returns **403** from `/sign-in/email`.
3. Framework preset: **TanStack Start** (or leave auto-detect with `vercel.json`)
4. Do **not** set Output Directory to `dist` — Nitro handles the build output
5. Redeploy with **Redeploy without build cache** after pulling latest `main`

```bash
npm run build   # should complete with Nitro (.output/)
```

## Privacy

CSVs never leave the browser for storage. Only narration, date, and amount are sent to the server for Mistral categorization. The API key stays in server env.
