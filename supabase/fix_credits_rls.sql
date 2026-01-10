-- -----------------------------------------------------------------------------
-- CREATE CREDITS FIX
-- -----------------------------------------------------------------------------

-- 1. Helper: Is Admin/Owner check
-- This is useful to force RLS to respect admin role without recursion issues.
-- We already have get_my_role function or similar logic. Let's use simple exists check.

-- 2. Allow Admins/Owners to INSERT into user_credits (Add Package)
create policy "Admins can insert user_credits"
on user_credits for insert
to authenticated
with check (
  exists (
    select 1 from user_profiles
    where user_profiles.user_id = auth.uid()
    and user_profiles.tenant_id = user_credits.tenant_id
    and user_profiles.role in ('admin', 'owner')
  )
);

-- 3. Allow Admins/Owners to SELECT/VIEW user_credits
create policy "Admins can view all user_credits"
on user_credits for select
to authenticated
using (
  exists (
    select 1 from user_profiles
    where user_profiles.user_id = auth.uid()
    and user_profiles.tenant_id = user_credits.tenant_id
    and user_profiles.role in ('admin', 'owner')
  )
);
