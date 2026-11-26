# Supabase Setup Guide for Rana

Follow these steps to set up your Supabase project for the Rana personal finance app.

> **Note:** This app does not use authentication. All data is public via the Supabase `anon` key.

## Step 1: Create a Supabase Account and Project

1. Go to [https://supabase.com](https://supabase.com) and sign up for a free account.
2. In the dashboard, click **"New Project"**.
3. Choose your organization, enter a project name (e.g. `rana-finance`), and set a database password.
4. Select a region close to you and click **"Create new project"**.
5. Wait 1–2 minutes for the project to initialize.

## Step 2: Run the Database Schema

1. In the Supabase dashboard, go to **SQL Editor** (left sidebar).
2. Click **"New query"**.
3. Open `supabase/schema.sql` from this project, copy its entire contents.
4. Paste the SQL into the editor and click **Run**.
5. You should see a success message. The tables `expenses`, `incomes`, `investments`, and `investment_updates` are now created with RLS enabled for the `anon` role.

### Resetting Tables (if you ran an older schema)

If you previously ran an old version of the schema, run this SQL first to drop the old tables:

```sql
drop table if exists investment_updates cascade;
drop table if exists investments cascade;
drop table if exists incomes cascade;
drop table if exists expenses cascade;
```

Then re-run the new `schema.sql`.

## Step 3: Get Your API Credentials

1. Go to **Project Settings** → **API**.
2. Copy the **Project URL** (e.g. `https://xyzabc.supabase.co`).
3. Copy the **anon public key** (the `anon` / `public` key — NOT the `service_role` key).

> ⚠️ Never use the `service_role` key in the frontend. Only the `anon` key is safe for client-side use.

## Step 4: Create Your Local `.env` File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and paste your values:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
   ```
3. Save the file.

## Step 5: Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser. The app opens straight to the Home tab — no login needed.

## Step 6: Deploy on Vercel

1. Push your code to a GitHub repository (`.env` is in `.gitignore`, so it won't be committed).
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon public key
5. Click **Deploy**.

## Troubleshooting

| Problem | Possible Cause | Fix |
|---------|---------------|-----|
| Blank page | JS error | Open browser DevTools (F12) → Console tab. Check for errors. Run `npm run build` and fix any warnings. |
| "Supabase is not configured" | Missing env vars | Make sure `.env` has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Restart dev server after changing `.env`. |
| "Invalid API key" | Wrong key | Double-check that `.env` values match Supabase → Project Settings → API. Use the `anon` key, not `service_role`. |
| Data not saving | RLS policies missing | Re-run `schema.sql` in the SQL Editor. The `anon` role needs `select`, `insert`, `update`, and `delete` policies on all tables. |
| Empty lists (no data) | Old schema with `user_id` | Drop all tables (see "Resetting Tables" above) and re-run the new `schema.sql`. The new schema has no `user_id` column. |
| Data shows on localhost but not Vercel | Env vars not set | In Vercel project settings → Environment Variables, add both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Redeploy. |
