-- -----------------------------------------------------------------------------
-- FEATURE: IN-APP NOTIFICATIONS
-- -----------------------------------------------------------------------------

-- 1. Create Notifications Table
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null, -- Who receives the notification
  title text not null,
  message text not null,
  link text, -- Action link (e.g., /dashboard/calendar)
  is_read boolean default false,
  created_at timestamptz default now()
);

-- 2. RLS Policies
alter table notifications enable row level security;

-- Users view their own notifications
create policy "Users view own notifications"
on notifications for select
to authenticated
using (user_id = auth.uid());

-- Users can mark their notifications as read (Update)
create policy "Users update own notifications"
on notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid()); -- Ensure they don't change ownership

-- Admins/System can insert notifications (for everyone in tenant or specific users)
-- Usually inserted via RPC or Trigger, but allowing insert for authenticated for now (be careful with tenant_id)
create policy "System insert notifications"
on notifications for insert
to authenticated
with check (
    tenant_id = public.get_my_tenant_id_secure()
    -- Add more checks if strict necessary, but usually sufficient if we trust backend logic
);


-- 3. Utility Function to Send Notification (RPC)
-- This makes it easy to call from other DB functions or Client
create or replace function send_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_link text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_tenant_id uuid;
begin
  -- Infer tenant from user profile
  select tenant_id into v_tenant_id
  from user_profiles
  where user_id = p_user_id;

  if v_tenant_id is not null then
    insert into notifications (tenant_id, user_id, title, message, link)
    values (v_tenant_id, p_user_id, p_title, p_message, p_link);
  end if;
end;
$$;


-- 4. TRIGGER: Auto-Notify on Waitlist Promotion (Example / Placeholder)
-- If we had a promotion logic, we would call send_notification here.
-- For now, let's notify when a Reservation is created (Confirmation)
create or replace function notify_reservation_created()
returns trigger
language plpgsql
security definer
as $$
declare
    v_class_name text;
    v_start_time timestamptz;
begin
     -- Get Class Info
     select ct.name, cs.start_time 
     into v_class_name, v_start_time
     from class_sessions cs
     join class_types ct on ct.id = cs.class_type_id
     where cs.id = NEW.session_id;

     perform send_notification(
        NEW.user_id, 
        'Rezervasyon Oluşturuldu', 
        v_class_name || ' dersi için rezervasyonunuz alındı. Tarih: ' || to_char(v_start_time, 'DD Mon HH24:MI'),
        '/dashboard/calendar'
     );
     return NEW;
end;
$$;

-- Attach Trigger to Reservations
drop trigger if exists on_reservation_created on reservations;
create trigger on_reservation_created
after insert on reservations
for each row
execute function notify_reservation_created();
