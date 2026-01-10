-- -----------------------------------------------------------------------------
-- FIX: Infinite Recursion on user_profiles
-- -----------------------------------------------------------------------------

-- 1. Create a Secure Helper to check Role without triggering RLS
-- This function runs as the database owner (superuser rights usually in Supabase), 
-- effectively bypassing RLS on user_profiles while running.
create or replace function public.get_my_role(_tenant_id uuid)
returns user_role
language plpgsql
security definer
as $$
declare
  _role user_role;
begin
  select role into _role
  from user_profiles
  where user_id = auth.uid()
  and tenant_id = _tenant_id;
  
  return _role;
end;
$$;

-- 2. Drop all existing policies on user_profiles to start fresh
drop policy if exists "Users can create their own profile" on user_profiles;
drop policy if exists "Users manage own profile" on user_profiles;
drop policy if exists "Users manage own profile" on user_profiles; -- duplicate name check
drop policy if exists "Admins manage other profiles" on user_profiles;
drop policy if exists "Users view own profile" on user_profiles;

-- 3. Re-Create Policies using the Secure Function

-- A. INSERT: Authenticated users can create a profile for themselves
create policy "Users create own profile"
on user_profiles for insert
to authenticated
with check (auth.uid() = user_id);

-- B. SELECT: 
-- 1. I can see my own profile
-- 2. OR I am an Admin/Owner of that tenant
create policy "Users and Admins view profiles"
on user_profiles for select
to authenticated
using (
  -- Rule 1: It's me
  auth.uid() = user_id 
  OR 
  -- Rule 2: I am an Admin in this tenant
  (public.get_my_role(tenant_id) in ('admin', 'owner'))
);

-- C. UPDATE/DELETE:
-- 1. I can edit my own basic info (soft check, maybe restrict specific fields in triggers later)
-- 2. Admin can edit any profile in their tenant
create policy "Users and Admins update profiles"
on user_profiles for update
to authenticated
using (
  auth.uid() = user_id 
  OR 
  (public.get_my_role(tenant_id) in ('admin', 'owner'))
);

create policy "Admins delete profiles"
on user_profiles for delete
to authenticated
using (
  public.get_my_role(tenant_id) in ('admin', 'owner')
);
