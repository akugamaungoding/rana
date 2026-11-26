# Supabase Setup Guide for Rana

Follow these steps to set up your Supabase project for the Rana personal finance app.

## Step 1: Create a Supabase account and project

1. Go to [https://supabase.com](https://supabase.com) and sign up for a free account.
2. In the Supabase dashboard, click **"New Project"**.
3. Choose your organization, enter a project name (e.g., "rana-finance"), and set a database password.
4. Select a region close to you and click **"Create new project"**.
5. Wait for the project to finish initializing (usually 1–2 minutes).

## Step 2: Run the database schema

1. In the Supabase dashboard, go to the **SQL Editor** in the left sidebar.
2. Click **"New query"**.
3. Open the file `supabase/schema.sql` from this project and copy its entire contents.
4. Paste the SQL into the editor and click **Run**.
5. You should see a success message. The tables `expenses`, `incomes`, `investments`, and `investment_updates` are now created with Row Level Security enabled.

## Step 3: Configure email authentication (optional)

1. Go to **Authentication** → **Providers** → **Email**.
2. Find the option **"Enable email confirmations"** (sometimes labeled "Confirm email").
3. For easier testing during development, you can **turn this off** so users can sign in immediately after signing up without verifying their email address.
4. Click **Save** if you make changes.

## Step 4: Get your API credentials

1. Go to **Project Settings** → **API**.
2. Copy the **Project URL** (e.g., `https://xyzabc.supabase.co`).
3. Copy the **anon public key** (the `anon public` key, not the service role key).
4. Keep these values handy — you'll need them in the next step.

> ⚠️ Never use the `service_role` key in the frontend. Only the `anon` key is safe for client-side use.

## Step 5: Create your local environment file

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` in a text editor and replace the placeholder values:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
   ```
3. Save the file.

## Step 6: Run the app locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000 in your browser.
4. Sign up with your email and password, then start using the app.

## Step 7: Deploy on Vercel

1. Push your code to a GitHub repository (make sure `.env` is in `.gitignore` so it's not committed).
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon public key
5. Click **Deploy**.
6. Once deployed, note your Vercel URL (e.g., `https://rana-finance.vercel.app`).

## Step 8: Add your Vercel URL to Supabase

1. In the Supabase dashboard, go to **Authentication** → **URL Configuration**.
2. Add your Vercel URL (e.g., `https://rana-finance.vercel.app`) to the **Site URL** field.
3. Add the same URL to **Redirect URLs** (e.g., `https://rana-finance.vercel.app/*`).
4. Click **Save**.

This ensures Supabase can redirect users back to your app after sign-in/sign-up actions.

## Troubleshooting

| Problem | Possible cause | Fix |
|---------|---------------|-----|
| Blank white page | Build error or JS error | Open browser DevTools (F12) and check the Console tab for errors. Make sure `npm run build` succeeds. |
| "Invalid API key" | Wrong Supabase credentials | Double-check `.env` values match Supabase Project Settings → API. Restart the dev server after changing `.env`. |
| Can't sign in / sign up | Email confirmation enabled | Turn off "Confirm email" in Authentication → Providers → Email (Step 3). Or check your email for a confirmation link. |
| Data not saving | RLS policies blocking writes | Make sure you ran `schema.sql` successfully. Check that you're logged in (auth.uid() must be set). |
| RLS errors | Missing or incorrect policies | Re-run `schema.sql` in the Supabase SQL Editor. Verify Row Level Security is enabled on all tables. |
| Sign-in redirect fails | Wrong Site URL | Add your deployed Vercel URL to Supabase Authentication → URL Configuration → Site URL (Step 8). |