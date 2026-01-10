-- -----------------------------------------------------------------------------
-- FEATURE: WAITLIST SYSTEM
-- -----------------------------------------------------------------------------

-- 1. Create Waitlist Table
create table if not exists waitlist (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  session_id uuid not null references class_sessions(id) on delete cascade,
  user_id uuid not null, -- Store Auth ID/User ID consistent with reservations
  created_at timestamptz default now(),
  
  unique(session_id, user_id)
);

-- 2. RLS Policies
alter table waitlist enable row level security;

-- Members can see their own waitlist entries
create policy "Members view own waitlist"
on waitlist for select
to authenticated
using (user_id = auth.uid());

-- Admins/Trainers can see all waitlist entries for their tenant
create policy "Staff view tenant waitlist"
on waitlist for select
to authenticated
using (
    tenant_id = public.get_my_tenant_id_secure()
    and exists (
        select 1 from user_profiles
        where user_id = auth.uid()
        and role in ('admin', 'owner', 'trainer')
    )
);

-- Members can insert themselves
create policy "Members join waitlist"
on waitlist for insert
to authenticated
with check (
    user_id = auth.uid()
    and tenant_id = public.get_my_tenant_id_secure()
);

-- Members can remove themselves (cancel waitlist)
create policy "Members leave waitlist"
on waitlist for delete
to authenticated
using (user_id = auth.uid());


-- 3. RPC: Join Waitlist (Validation Wrapper)
create or replace function join_waitlist(
  p_session_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_tenant_id uuid;
  v_capacity int;
  v_current_count int;
begin
  -- Get Session Info
  select tenant_id, capacity, current_bookings_count
  into v_tenant_id, v_capacity, v_current_count
  from class_sessions
  where id = p_session_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Ders bulunamadı');
  end if;

  -- Validation: Only join if full? Or allow anytime? 
  -- Usually waitlist is for when it's full.
  if v_current_count < v_capacity then
     return jsonb_build_object('success', false, 'error', 'Kontenjan henüz dolmadı, doğrudan rezervasyon yapabilirsiniz.');
  end if;

  -- Insert
  insert into waitlist (tenant_id, session_id, user_id)
  values (v_tenant_id, p_session_id, p_user_id);

  return jsonb_build_object('success', true, 'message', 'Yedek listeye eklendiniz. Yer açılırsa, size haber vereceğiz.');

exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'Zaten yedek listedesiniz.');
  when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;
