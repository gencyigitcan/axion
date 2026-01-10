-- -----------------------------------------------------------------------------
-- FIX: Allow Tenant & Profile Creation for Onboarding Flow
-- -----------------------------------------------------------------------------

-- 1. Allow Authenticated Users to Create Tenants
-- (Currently, new users have NO tenant, so they fail the 'Admin' check)
create policy "Authenticated users can create tenants"
on tenants for insert
to authenticated
with check (true);

-- 2. Allow Authenticated Users to View/Select Tenants
-- For simplicity, tenants are public info (Name, Slug, Config)
-- This allows the UI to read back the tenant after insertion.
create policy "Authenticated users can view tenants"
on tenants for select
to authenticated
using (true);

-- 3. Allow Authenticated Users to Create their own Profile
-- (Currently, they are not 'Admin' yet)
create policy "Users can create their own profile"
on user_profiles for insert
to authenticated
with check (auth.uid() = user_id);

-- 4. Allow Users to View their own Profile
-- (Required to verify if profile exists in Dashboard/Middleware)
-- Note: We already have "Users manage own profile" but let's ensure it covers SELECT.
-- The previous policy was ON ALL which usually covers SELECT, but explicit is better.
-- If "Users manage own profile" exists, this might be redundant but safe.
drop policy if exists "Users manage own profile" on user_profiles;
create policy "Users manage own profile"
on user_profiles
for all 
using (auth.uid() = user_id);

-- OPTIONAL: Add Owner_ID to tenants to lock it down further for future?
-- For now, allowing INSERT is enough.
