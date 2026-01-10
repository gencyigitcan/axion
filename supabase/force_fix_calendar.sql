-- FORCE FIX: Drop recursive policies and implement simpler non-recursive ones
-- 1. Security Definer Helper (Already defined, but ensuring it exists)

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

-- 2. CLASS SESSIONS: Drop and Re-create simple policy
drop policy if exists "View class_sessions in own tenant" on class_sessions;
drop policy if exists "Admins manage class_sessions" on class_sessions;
drop policy if exists "Enable read access for all users" on class_sessions; -- legacy cleanup

create policy "View class_sessions"
on class_sessions for select
to authenticated
using (
  -- Use the SECURE function to avoid recursion when checking tenant
  tenant_id = public.get_my_tenant_id_secure()
);

create policy "Manage class_sessions"
on class_sessions for all
to authenticated
using (
  tenant_id = public.get_my_tenant_id_secure()
  and exists (
    select 1 from user_profiles
    where user_id = auth.uid()
    and role in ('admin', 'owner')
  )
);


-- 3. CLASS TYPES: Drop and Re-create simple policy
drop policy if exists "View class_types in own tenant" on class_types;
drop policy if exists "Admins manage class_types" on class_types;

create policy "View class_types"
on class_types for select
to authenticated
using (
  tenant_id = public.get_my_tenant_id_secure()
);

create policy "Manage class_types"
on class_types for all
to authenticated
using (
  tenant_id = public.get_my_tenant_id_secure()
  and exists (
    select 1 from user_profiles
    where user_id = auth.uid()
    and role in ('admin', 'owner')
  )
);

-- 4. USER PROFILES: The most common source of recursion
-- Break the loop by allowing users to see their own tenant's profiles WITHOUT querying user_profiles recursively if possible.
-- But we MUST query user_profiles to know our own tenant.
-- Hence, the "security definer" function is CRITICAL.

drop policy if exists "View profiles in same tenant" on user_profiles;
drop policy if exists "Users and Admins view profiles" on user_profiles;
drop policy if exists "Admins can view all profiles" on user_profiles;

create policy "View profiles common"
on user_profiles for select
to authenticated
using (
   -- I can see profiles if they share my secure tenant ID
   tenant_id = public.get_my_tenant_id_secure()
   OR
   -- I can always see myself
   user_id = auth.uid()
);

-- 5. RESERVATIONS: Ensure visibility
drop policy if exists "View reservations in own tenant" on reservations;
drop policy if exists "view_reservations" on reservations;

create policy "View reservations"
on reservations for select
to authenticated
using (
    -- Users can see their own reservations OR Admins can see all in tenant
    user_id = auth.uid()
    OR
    (
       tenant_id = public.get_my_tenant_id_secure()
       AND
       exists (
          select 1 from user_profiles
          where user_id = auth.uid()
          and role in ('admin', 'owner')
       )
    )
);

-- 6. Grant Permissions (Just in case)
grant select on class_types to authenticated;
grant select on class_sessions to authenticated;
grant select on user_profiles to authenticated;
