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

1. Add `MISTRAL_API_KEY` in Vercel → Project Settings → Environment Variables
2. Framework preset: **TanStack Start** (or leave auto-detect with `vercel.json`)
3. Do **not** set Output Directory to `dist` — Nitro handles the build output
4. Redeploy with **Redeploy without build cache** after pulling latest `main`

```bash
npm run build   # should complete with Nitro (.output/)
```

## Privacy

CSVs never leave the browser for storage. Only narration, date, and amount are sent to the server for Mistral categorization. The API key stays in server env.
