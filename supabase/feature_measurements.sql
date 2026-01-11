-- -----------------------------------------------------------------------------
-- FEATURE: BODY MEASUREMENTS
-- -----------------------------------------------------------------------------

-- 1. Measurements Table
create table if not exists user_measurements (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references user_profiles(user_id) on delete cascade,
  recorded_by uuid references user_profiles(user_id), -- Who measured? (Trainer)
  
  weight numeric(5,2), -- kg
  height numeric(5,2), -- cm
  fat_percentage numeric(4,2), -- %
  muscle_mass numeric(5,2), -- kg
  
  chest numeric(5,2), -- cm
  waist numeric(5,2),
  hips numeric(5,2),
  
  notes text,
  measured_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 2. RLS Policies
alter table user_measurements enable row level security;

-- Admins/Trainers can manage (Insert/Update/Delete) for their tenant
create policy "Staff manage measurements"
on user_measurements for all
to authenticated
using (
    tenant_id = public.get_my_tenant_id_secure()
    and exists (select 1 from user_profiles where user_id = auth.uid() and role in ('admin', 'owner', 'trainer'))
);

-- Users can VIEW their own measurements
create policy "Users view own measurements"
on user_measurements for select
to authenticated
using (user_id = auth.uid());

