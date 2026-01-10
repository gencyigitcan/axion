-- -----------------------------------------------------------------------------
-- PUBLIC & ONBOARDING FIXES
-- -----------------------------------------------------------------------------

-- 1. Allow Public Read Access to Tenants (for Join Page)
drop policy if exists "Authenticated users can view tenants" on tenants;
create policy "Public can view tenant info"
on tenants for select
to public
using (true);
-- Note: 'to public' means even unauthenticated users (anon).

-- 2. Allow Public to Insert Profile (during Signup) if authenticated via Supabase Auth
-- When a user signs up on the Join Page, they get a Supabase User ID.
-- Then they try to insert into user_profiles.
-- Ensure the policy allows this.

drop policy if exists "Users create own profile" on user_profiles;
create policy "Users create own profile"
on user_profiles for insert
to authenticated
with check (auth.uid() = user_id);
