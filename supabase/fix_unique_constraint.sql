-- FIX: Add UNIQUE constraint to user_profiles.user_id to allow foreign keys
-- The previous error (42830) happens because we tried to reference user_profiles(user_id) but it wasn't strictly unique in the schema definition, 
-- even though logically 1:1 with auth.users.

-- 1. Ensure Uniqueness
alter table user_profiles
add constraint user_profiles_user_id_key unique (user_id);

-- 2. Now Re-Apply Features that failed
-- We re-run the creation of tables that failed due to this missing constraint.

-- Re-run User Documents (from feature_age_and_docs.sql)
create table if not exists user_documents (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references user_profiles(user_id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,
  uploaded_by uuid references user_profiles(user_id),
  created_at timestamptz default now()
);

-- Re-run Measurements (from feature_measurements.sql)
create table if not exists user_measurements (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references user_profiles(user_id) on delete cascade,
  recorded_by uuid references user_profiles(user_id),
  
  weight numeric(5,2),
  height numeric(5,2),
  fat_percentage numeric(4,2),
  muscle_mass numeric(5,2),
  
  chest numeric(5,2),
  waist numeric(5,2),
  hips numeric(5,2),
  
  notes text,
  measured_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 3. Re-Apply Policies (Idempotent)
alter table user_documents enable row level security;
alter table user_measurements enable row level security;

-- Policies for Documents
drop policy if exists "Admins manage documents" on user_documents;
create policy "Admins manage documents"
on user_documents for all
to authenticated
using (
    tenant_id = public.get_my_tenant_id_secure()
    and exists (select 1 from user_profiles where user_id = auth.uid() and role in ('admin', 'owner'))
);

drop policy if exists "Users view own documents" on user_documents;
create policy "Users view own documents"
on user_documents for select
to authenticated
using (user_id = auth.uid());

-- Policies for Measurements
drop policy if exists "Staff manage measurements" on user_measurements;
create policy "Staff manage measurements"
on user_measurements for all
to authenticated
using (
    tenant_id = public.get_my_tenant_id_secure()
    and exists (select 1 from user_profiles where user_id = auth.uid() and role in ('admin', 'owner', 'trainer'))
);

drop policy if exists "Users view own measurements" on user_measurements;
create policy "Users view own measurements"
on user_measurements for select
to authenticated
using (user_id = auth.uid());
