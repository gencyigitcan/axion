# Deployment Guide for Antigravity

Congrats! You are ready to deploy your SaaS.

## 1. Prerequisites

- **GitHub Account:** Push your code to a repository.
- **Vercel Account:** For frontend hosting.
- **Supabase Account:** For backend database.

## 2. Environment Variables

In Vercel Project Settings, add these variables (copy from your local `.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
RESEND_API_KEY=YOUR_RESEND_API_KEY (Optional for Emails)
```

## 3. Database Migration

Since we used SQL snippets in development, you need to ensure your production database has the same schema.

1. Go to **Supabase Dashboard > SQL Editor**.
2. Run the content of `supabase/migrations/20260110000000_initial_schema.sql`.
3. Then run these feature scripts in order:
   - `supabase/force_fix_calendar.sql`
   - `supabase/fix_relationship_v2.sql`
   - `supabase/feature_cancellation.sql`
   - `supabase/feature_waitlist.sql`

## 4. Deploy Command

If you have Vercel CLI installed:

```bash
vercel --prod
```

Or simply push to your `main` branch on GitHub, and Vercel will auto-deploy.

## 5. Post-Deploy Checks

- Go to your Vercel URL (e.g., `axion.vercel.app`).
- Create a new tenant via `/onboarding`.
- Log in and verify the Dashboard loads.
