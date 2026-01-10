-- -----------------------------------------------------------------------------
-- ULTIMATE RLS FIX & RECURSION PREVENTION
-- -----------------------------------------------------------------------------

-- 1. Create a Security Definer function to get current user's Tenant ID
-- This bypasses RLS, so it won't cause infinite recursion when used in policies.
create or replace function public.get_my_tenant_id_secure()
returns uuid
language plpgsql
security definer
stable
as $$
declare
  tid uuid;
begin
  select tenant_id into tid from user_profiles where user_id = auth.uid();
  return tid;
end;
$$;

-- 2. Fix User Profiles Policy (Allow viewing all profiles in same tenant)
drop policy if exists "Users and Admins view profiles" on user_profiles;
drop policy if exists "View profiles in same tenant" on user_profiles;
drop policy if exists "Users can view own profile" on user_profiles; -- Cleanup old ones

create policy "View profiles in same tenant"
on user_profiles for select
to authenticated
using (
  -- I can see the profile IF it belongs to my tenant
  tenant_id = public.get_my_tenant_id_secure()
  OR
  -- OR if it is my own profile (fallback for initial creation/reading)
  user_id = auth.uid()
);

-- 3. Fix Calendar Policies (Class Sessions)
drop policy if exists "View class_sessions in own tenant" on class_sessions;
drop policy if exists "Admins manage class_sessions" on class_sessions;

create policy "View class_sessions in own tenant"
on class_sessions for select
to authenticated
using (tenant_id = public.get_my_tenant_id_secure());

create policy "Admins manage class_sessions"
on class_sessions for all
to authenticated
using (
  tenant_id = public.get_my_tenant_id_secure() 
  AND 
  exists (
    select 1 from user_profiles 
    where user_id = auth.uid() and role in ('admin', 'owner')
  )
);

-- 4. Fix Class Types Policies
drop policy if exists "View class_types in own tenant" on class_types;
drop policy if exists "Admins manage class_types" on class_types;

create policy "View class_types in own tenant"
on class_types for select
to authenticated
using (tenant_id = public.get_my_tenant_id_secure());

create policy "Admins manage class_types"
on class_types for all
to authenticated
using (
  tenant_id = public.get_my_tenant_id_secure() 
  AND 
  exists (
    select 1 from user_profiles 
    where user_id = auth.uid() and role in ('admin', 'owner')
  )
);
