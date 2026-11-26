# Rana – Personal Finance Web App

A simple, mobile-first personal finance app built with Vite, vanilla JavaScript, and Supabase.

## Features

- **Authentication** – Email/password sign up, log in, log out (Supabase Auth)
- **Expenses** – Track spending by category, date, and note with filters and totals
- **Income** – Record income sources with optional recurring monthly entries
- **Dashboard** – Income vs expenses vs balance with a progress bar
- **Calendar** – Monthly view with expense/income/investment markers and day detail sheet
- **Investments** – Track investment capital, value updates, return %, annualized return, and portfolio summary

## Tech Stack

- Frontend: Vite + vanilla JavaScript (no framework)
- Backend: Supabase (PostgreSQL + Auth)
- Styling: Custom CSS (mobile-first, responsive)
- Deploy: Vercel (static build, `dist` output)

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
src/main.js
src/supabase.js
src/styles.css
src/ui/auth.js
src/ui/components.js
src/ui/home.js
src/ui/expenses.js
src/ui/income.js
src/ui/calendar.js
src/ui/investments.js
```

## Getting Started

### Prerequisites

- Node.js installed
- A Supabase account (free tier)

### 1. Set up Supabase

See `SUPABASE_SETUP.md` for a step-by-step guide to creating your Supabase project, running the schema, and configuring auth.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` and paste your Project URL and anon public key from Supabase Project Settings → API.

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

1. Push your code to GitHub
2. Import the repo in Vercel
3. Add environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Deploy
5. In Supabase, go to Authentication → URL Configuration and add your Vercel URL as the Site URL

## License

MIT