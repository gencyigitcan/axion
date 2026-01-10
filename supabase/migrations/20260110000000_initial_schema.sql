-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. ENUMS & TYPES
-- -----------------------------------------------------------------------------

create type user_role as enum ('member', 'trainer', 'admin', 'owner');
create type reservation_status as enum ('booked', 'checked_in', 'cancelled', 'no_show');
create type credit_status as enum ('active', 'expired', 'depleted');

-- -----------------------------------------------------------------------------
-- 2. TABLES
-- -----------------------------------------------------------------------------

-- Tenants (Studios/Gyms)
create table tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subdomain_slug text unique not null,
  brand_config jsonb default '{}'::jsonb, -- logo, colors
  created_at timestamptz default now()
);

-- User Profiles (Tenant Scoped)
-- Note: usage of 'users' is ambiguous with auth.users, so we use user_profiles
create table user_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null, -- Links to StackAuth/Supabase Auth ID (external)
  tenant_id uuid not null references tenants(id),
  role user_role not null default 'member',
  full_name text,
  email text,
  full_phone_number text,
  created_at timestamptz default now(),
  
  unique(user_id, tenant_id)
);

-- Class Types (Pilates, Yoga, etc.)
create table class_types (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Packages (Products)
create table packages (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  price numeric(10, 2) not null,
  validity_days int not null,
  credit_count int not null,
  allowed_class_type_ids uuid[] not null, -- Array of class_type_ids
  created_at timestamptz default now()
);

-- User Credits (The Wallet)
create table user_credits (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null, -- References user_profiles(user_id) logically
  package_id uuid references packages(id),
  remaining_credits int not null check (remaining_credits >= 0),
  expiration_date timestamptz not null,
  status credit_status default 'active',
  created_at timestamptz default now()
);

-- Class Sessions (The Calendar)
create table class_sessions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  class_type_id uuid not null references class_types(id),
  trainer_id uuid not null, -- References user_profiles(user_id) where role=trainer
  start_time timestamptz not null,
  end_time timestamptz not null,
  capacity int not null,
  current_bookings_count int default 0,
  
  check (end_time > start_time)
);

-- Reservations (The Bookings)
create table reservations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  session_id uuid not null references class_sessions(id),
  user_id uuid not null, -- References user_profiles(user_id)
  used_credit_id uuid references user_credits(id),
  status reservation_status default 'booked',
  created_at timestamptz default now(),
  
  unique(session_id, user_id)
);

-- Audit Logs (Immutable)
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  actor_id uuid not null,
  action text not null,
  table_name text not null,
  record_id uuid not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------

alter table tenants enable row level security;
alter table user_profiles enable row level security;
alter table class_types enable row level security;
alter table packages enable row level security;
alter table user_credits enable row level security;
alter table class_sessions enable row level security;
alter table reservations enable row level security;
alter table audit_logs enable row level security;

-- Helper function to get current user's tenant_id from metadata or profile
-- For simplicity in this v1, we assume the app sends tenant_id in request header 
-- or we lookup via user_profiles. 
-- A common pattern: user claims contain app_metadata->tenant_id.
-- Here we'll implement a policy based on matching tenant_id column to a session variable 
-- or a lookup.
-- OPTIMIZATION: We assume the client sets `app.current_tenant` GUC or we use auth.uid() lookup.

-- -----------------------------------------------------------------------------
-- ADMIN POLICIES (Explicit per table to avoid Syntax Error)
-- -----------------------------------------------------------------------------

-- Helper function to avoid repetition in policies (Optional but clean)
create or replace function public.is_admin_of(_tenant_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from user_profiles
    where user_id = auth.uid()
    and tenant_id = _tenant_id
    and role in ('admin', 'owner')
  );
$$;

-- Class Types
create policy "Admins manage class_types" on class_types for all using ( public.is_admin_of(tenant_id) );

-- Packages
create policy "Admins manage packages" on packages for all using ( public.is_admin_of(tenant_id) );

-- User Credits
create policy "Admins manage user_credits" on user_credits for all using ( public.is_admin_of(tenant_id) );

-- Class Sessions
create policy "Admins manage class_sessions" on class_sessions for all using ( public.is_admin_of(tenant_id) );

-- Reservations
create policy "Admins manage reservations" on reservations for all using ( public.is_admin_of(tenant_id) );

-- -----------------------------------------------------------------------------
-- TENANT POLICIES (Updated for Onboarding)
-- -----------------------------------------------------------------------------

-- Allow ANY authenticated user to create a Tenant (Onboarding)
create policy "Authenticated users can create tenants"
on tenants for insert
to authenticated
with check (true);

-- Allow ANY authenticated user to view Tenants
create policy "Authenticated users can view tenants"
on tenants for select
to authenticated
using (true);

-- Allow Owner to manage their own tenant
create policy "Owners manage own tenant"
on tenants for update
to authenticated
using (
  exists (
    select 1 from user_profiles
    where user_profiles.tenant_id = tenants.id
    and user_profiles.user_id = auth.uid()
    and user_profiles.role in ('admin', 'owner')
  )
);

-- User Profiles (Prevent infinite recursion by checking ID directly first)
create policy "Users manage own profile" on user_profiles for all using ( user_id = auth.uid() );

create policy "Admins manage other profiles" on user_profiles for all using (
  auth.uid() in (
    select user_id from user_profiles as admin 
    where admin.tenant_id = user_profiles.tenant_id 
    and admin.role in ('admin', 'owner')
    and admin.user_id != user_profiles.user_id -- prevent recursion for self
  )
);

-- Policy: Members view Class Sessions
create policy "Members can view class sessions in their tenant"
on class_sessions for select
using (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Policy: Members view own Reservations
create policy "Members view own reservations"
on reservations for select
using (user_id = auth.uid());

-- (More detailed policies would go here...)


-- -----------------------------------------------------------------------------
-- 4. ATOMIC RESERVATION FUNCTION (RPC)
-- -----------------------------------------------------------------------------

create or replace function book_class_session(
  p_session_id uuid,
  p_user_id uuid,
  p_credit_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_capacity int;
  v_current_count int;
  v_credit_balance int;
  v_tenant_id uuid;
begin
  -- 1. Lock Session Row
  select capacity, current_bookings_count, tenant_id
  into v_capacity, v_current_count, v_tenant_id
  from class_sessions
  where id = p_session_id
  for update; -- LOCKING
  
  if not found then
    raise exception 'Session not found';
  end if;

  -- 2. Check Capacity
  if v_current_count >= v_capacity then
    raise exception 'Class is full';
  end if;
  
  -- 3. Lock & Check Credit
  select remaining_credits into v_credit_balance
  from user_credits
  where id = p_credit_id and user_id = p_user_id
  for update; -- LOCKING
  
  if not found or v_credit_balance <= 0 then
    raise exception 'Insufficient credits';
  end if;

  -- 4. Execute Book
  insert into reservations (tenant_id, session_id, user_id, used_credit_id, status)
  values (v_tenant_id, p_session_id, p_user_id, p_credit_id, 'booked');

  -- 5. Update Credit
  update user_credits
  set remaining_credits = remaining_credits - 1
  where id = p_credit_id;
  
  -- 6. Update Session Count
  update class_sessions
  set current_bookings_count = current_bookings_count + 1
  where id = p_session_id;
  
  -- 7. Audit Log
  insert into audit_logs (tenant_id, actor_id, action, table_name, record_id, new_data)
  values (v_tenant_id, p_user_id, 'create_reservation', 'reservations', p_session_id, jsonb_build_object('session_id', p_session_id));

  return jsonb_build_object('success', true, 'message', 'Reservation confirmed');
exception
  when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;
