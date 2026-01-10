-- -----------------------------------------------------------------------------
-- DEMO ACCESS POLICIES (Allow Public Read for Demo Tenant)
-- -----------------------------------------------------------------------------

-- WARNING: This makes data readable by ANYONE. 
-- In a real app, you might restrict this to a specific "Demo Tenant ID".
-- For this MVP, we will allow public read on key tables to enable the "Demo View".

-- 1. Class Sessions (Public Read)
drop policy if exists "Public read sessions" on class_sessions;
create policy "Public read sessions"
on class_sessions for select
to public
using (true);

-- 2. Class Types (Public Read)
drop policy if exists "Public read class types" on class_types;
create policy "Public read class types"
on class_types for select
to public
using (true);

-- 3. Trainers (Public Read - Filtered by role usually, but full read ok for MVP demo)
drop policy if exists "Public read trainers" on user_profiles;
create policy "Public read trainers"
on user_profiles for select
to public
using (true);
