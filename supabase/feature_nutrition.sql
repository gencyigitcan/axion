-- -----------------------------------------------------------------------------
-- NUTRITION & DAILY TRACKING FEATURE
-- -----------------------------------------------------------------------------

-- 1. Nutrition Plans Table
create table if not exists nutrition_plans (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references user_profiles(user_id) on delete cascade,
  assigned_by uuid references user_profiles(user_id),
  
  title text not null, -- "Kilo Verme Diyeti"
  daily_calories int,
  macros jsonb, -- { "protein": 150, "carb": 200, "fat": 60 }
  
  start_date date not null,
  end_date date,
  is_active boolean default true,
  
  created_at timestamptz default now()
);

-- 2. Daily Tracking Table (Weight & Meals)
create table if not exists daily_tracking (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references user_profiles(user_id) on delete cascade,
  
  date date default current_date,
  weight numeric(5,2), -- Daily weight check
  
  meals_confirmed boolean default false, -- Did they stick to the plan?
  water_intake_liters numeric(3,1) default 0,
  
  notes text,
  created_at timestamptz default now(),
  
  unique(user_id, date) -- One entry per day
);

-- 3. RLS
alter table nutrition_plans enable row level security;
alter table daily_tracking enable row level security;

-- Staff manage plans
create policy "Staff manage plans" on nutrition_plans for all to authenticated
using (tenant_id = public.get_my_tenant_id_secure() and exists (select 1 from user_profiles where user_id = auth.uid() and role in ('admin','owner','trainer')));

-- Users view plans
create policy "Users view plans" on nutrition_plans for select to authenticated
using (user_id = auth.uid());

-- Users manage own tracking
create policy "Users manage tracking" on daily_tracking for all to authenticated
using (user_id = auth.uid()); -- Insert/Update own

-- Staff view tracking
create policy "Staff view tracking" on daily_tracking for select to authenticated
using (tenant_id = public.get_my_tenant_id_secure() and exists (select 1 from user_profiles where user_id = auth.uid() and role in ('admin','owner','trainer')));


-- 4. Notification Trigger for Daily Reminder (Scheduled tasks usually need external cron, but we can simulate logic)
-- Since we can't easily run CRON in pure SQL without pg_cron extension, we create a VIEW 
-- that lists users who haven't logged today, so the Frontend or Admin can see "Pending Logs".

create or replace view compliance_report as
select 
  np.tenant_id,
  np.user_id,
  up.full_name,
  current_date as today,
  dt.id as tracking_id,
  dt.meals_confirmed,
  dt.weight
from nutrition_plans np
join user_profiles up on up.user_id = np.user_id
left join daily_tracking dt on dt.user_id = np.user_id and dt.date = current_date
where np.is_active = true;

