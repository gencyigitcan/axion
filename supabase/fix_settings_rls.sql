-- Allow authenticated users to view their own user_profile
-- (Already exists, but ensuring Update policy is correct)

-- Allow Admins/Owners to update their own tenant
-- This relies on the "Owners manage own tenant" policy we created earlier.
-- Let's double check it covers UPDATE.

-- Policy: "Owners manage own tenant"
-- on tenants for update
-- using (...)

-- Let's ensure SELECT policy for tenants is broad enough for fetching config.
-- "Authenticated users can view tenants" -> using (true) (We did this for Public demo too, so it's fine).

-- NO NEW SQL NEEDED if previous policies are correct.
-- But let's add a robust policy just in case "Owners manage own tenant" was missed or dropped.

drop policy if exists "Owners and Admins update tenant" on tenants;
create policy "Owners and Admins update tenant"
on tenants for update
to authenticated
using (
  exists (
    select 1 from user_profiles
    where user_profiles.tenant_id = tenants.id
    and user_profiles.user_id = auth.uid()
    and user_profiles.role in ('admin', 'owner')
  )
)
with check (
  exists (
    select 1 from user_profiles
    where user_profiles.tenant_id = tenants.id
    and user_profiles.user_id = auth.uid()
    and user_profiles.role in ('admin', 'owner')
  )
);
