# Rana – Personal Finance Web App

A simple, mobile-first personal finance app built with Vite, vanilla JavaScript, and Supabase.

## Features

- **Expenses** – Track spending by category, date, and note with filters and totals
- **Income** – Record income sources with optional recurring monthly entries
- **Dashboard** – Income vs expenses vs balance with a progress bar
- **Calendar** – Monthly view with expense/income/investment markers and day detail sheet
- **Investments** – Track investment capital, value updates, return %, annualized return, and portfolio summary

> No authentication required. The app uses Supabase as a database only via the `anon` key.

## Tech Stack

- **Frontend:** Vite + vanilla JavaScript (no framework)
- **Backend:** Supabase (PostgreSQL, no auth)
- **Styling:** Custom CSS (mobile-first, responsive)
- **Deploy:** Vercel (static build, `dist` output)

## Project Structure

```
index.html
package.json
vite.config.js
.env.example
.gitignore
README.md
SUPABASE_SETUP.md
supabase/schema.sql
src/
  main.js
  supabase.js
  styles.css
  lib/calc.js
  ui/
    components.js
    home.js
    expenses.js
    income.js
    calendar.js
    investments.js
scripts/
  smoke-test.js
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier)

### 1. Set up Supabase

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for a step-by-step guide.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and paste your Supabase Project URL and anon public key.

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 5. Build for production

```bash
npm run build
```

Output goes to `dist/`.

### 6. Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Deploy

## License

MIT
