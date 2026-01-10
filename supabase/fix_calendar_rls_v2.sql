-- 1. CLEANUP (Drop existing conflicting policies)
drop policy if exists "Admins manage class_sessions" on class_sessions;
drop policy if exists "Members can view class sessions in their tenant" on class_sessions;
drop policy if exists "View class_sessions in own tenant" on class_sessions;

drop policy if exists "Admins manage class_types" on class_types;
drop policy if exists "View class_types in own tenant" on class_types;

-- 2. Helper Function (Safe Re-create)
create or replace function public.my_tenant_id()
returns uuid language sql stable as $$
  select tenant_id from user_profiles where user_id = auth.uid();
$$;

-- 3. Class Types Policies
create policy "View class_types in own tenant"
on class_types for select to authenticated
using (tenant_id = public.my_tenant_id());

create policy "Admins manage class_types"
on class_types for all to authenticated
using (
  tenant_id = public.my_tenant_id() 
  AND 
  exists (select 1 from user_profiles where user_id = auth.uid() and role in ('admin', 'owner'))
);

-- 4. Class Sessions Policies
create policy "View class_sessions in own tenant"
on class_sessions for select to authenticated
using (tenant_id = public.my_tenant_id());

create policy "Admins manage class_sessions"
on class_sessions for all to authenticated
using (
  tenant_id = public.my_tenant_id() 
  AND 
  exists (select 1 from user_profiles where user_id = auth.uid() and role in ('admin', 'owner'))
);
