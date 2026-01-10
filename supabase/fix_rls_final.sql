-- -----------------------------------------------------------------------------
-- EMERGENCY RLS FIX (Run this in Supabase SQL Editor)
-- -----------------------------------------------------------------------------

-- 1. Reset Tenant Policies (Drop existing ones to be safe)
drop policy if exists "Authenticated users can create tenants" on tenants;
drop policy if exists "Authenticated users can view tenants" on tenants;
drop policy if exists "Admins have full access to their tenant" on tenants;
drop policy if exists "Admins manage tenants" on tenants;

-- 2. Allow ANY authenticated user to create a Tenant (Onboarding)
create policy "Authenticated users can create tenants"
on tenants for insert
to authenticated
with check (true);

-- 3. Allow ANY authenticated user to view Tenants (For selection/verification)
create policy "Authenticated users can view tenants"
on tenants for select
to authenticated
using (true);

-- 4. Allow Owner to manage their own tenant (Update/Delete)
create policy "Owners manage own tenant"
on tenants for update
to authenticated
using (
  exists (
    select 1 from user_profiles
    where user_profiles.tenant_id = tenants.id
    and user_profiles.user_id = auth.uid()
    and user_profiles.role in ('admin', 'owner')
  )
);

-- -----------------------------------------------------------------------------
-- USER PROFILE FIXES
-- -----------------------------------------------------------------------------

drop policy if exists "Users can create their own profile" on user_profiles;
drop policy if exists "Users manage own profile" on user_profiles;

-- Allow user to create their initial Owner profile
create policy "Users can create their own profile"
on user_profiles for insert
to authenticated
with check (auth.uid() = user_id);

-- Allow user to view/edit their own profile
create policy "Users manage own profile"
on user_profiles for all
using (auth.uid() = user_id);
