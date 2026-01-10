-- -----------------------------------------------------------------------------
-- FIX: Missing Select Policies for Operational Tables
-- -----------------------------------------------------------------------------

-- 1. Helper Function to check user's tenant
-- This is cleaner than repeating the subquery everywhere.
create or replace function public.my_tenant_id()
returns uuid
language sql
stable
as $$
  select tenant_id from user_profiles where user_id = auth.uid();
$$;

-- 2. Class Types Policies
drop policy if exists "Admins manage class_types" on class_types;
create policy "View class_types in own tenant"
on class_types for select
to authenticated
using (tenant_id = public.my_tenant_id());

create policy "Admins manage class_types"
on class_types for all
to authenticated
using (
  tenant_id = public.my_tenant_id() 
  AND 
  exists (
    select 1 from user_profiles 
    where user_id = auth.uid() and role in ('admin', 'owner')
  )
);

-- 3. Class Sessions Policies
drop policy if exists "Admins manage class_sessions" on class_sessions;
drop policy if exists "Members can view class sessions in their tenant" on class_sessions;

create policy "View class_sessions in own tenant"
on class_sessions for select
to authenticated
using (tenant_id = public.my_tenant_id());

create policy "Admins manage class_sessions"
on class_sessions for all
to authenticated
using (
  tenant_id = public.my_tenant_id() 
  AND 
  exists (
    select 1 from user_profiles 
    where user_id = auth.uid() and role in ('admin', 'owner')
  )
);

-- 4. Packages Policies
drop policy if exists "Admins manage packages" on packages;

create policy "View packages in own tenant"
on packages for select
to authenticated
using (tenant_id = public.my_tenant_id());

create policy "Admins manage packages"
on packages for all
to authenticated
using (
  tenant_id = public.my_tenant_id() 
  AND 
  exists (
    select 1 from user_profiles 
    where user_id = auth.uid() and role in ('admin', 'owner')
  )
);
