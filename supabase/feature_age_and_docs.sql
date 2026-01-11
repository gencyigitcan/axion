-- -----------------------------------------------------------------------------
-- FEATURE: AGE RESTRICTIONS & DOCUMENTS
-- -----------------------------------------------------------------------------

-- 1. Schema Updates
alter table class_types 
add column if not exists min_age smallint default 0,
add column if not exists max_age smallint default 99;

alter table user_profiles
add column if not exists birth_date date;

-- 2. User Documents Table
create table if not exists user_documents (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references user_profiles(user_id) on delete cascade, -- Link to Auth ID
  name text not null,
  file_url text not null,
  file_type text, -- pdf, jpg
  uploaded_by uuid references user_profiles(user_id),
  created_at timestamptz default now()
);

alter table user_documents enable row level security;

-- Policies
create policy "Admins manage documents"
on user_documents for all
to authenticated
using (
    tenant_id = public.get_my_tenant_id_secure()
    and exists (select 1 from user_profiles where user_id = auth.uid() and role in ('admin', 'owner'))
);

create policy "Users view own documents"
on user_documents for select
to authenticated
using (user_id = auth.uid());


-- 3. Update Booking RPC with Age Check
create or replace function book_class_session(
  p_session_id uuid,
  p_user_id uuid,
  p_credit_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_class_type_id uuid;
  v_min_age int;
  v_max_age int;
  v_user_birth_date date;
  v_user_age int;
  v_requester_role text;
  v_capacity int;
  v_current_count int;
begin
  -- Get Requester Role (Who is calling this?)
  select role into v_requester_role
  from user_profiles
  where user_id = auth.uid();

  -- Get Class Constraints
  select 
    cs.class_type_id,
    ct.min_age,
    ct.max_age,
    cs.capacity,
    cs.current_bookings_count
  into 
    v_class_type_id,
    v_min_age,
    v_max_age,
    v_capacity,
    v_current_count
  from class_sessions cs
  join class_types ct on ct.id = cs.class_type_id
  where cs.id = p_session_id;

  -- 1. Capacity Check (Standard)
  if v_current_count >= v_capacity then
    raise exception 'capacity_full';
  end if;

  -- 2. Age Check
  -- Only enforce if NOT admin/owner/trainer
  if v_requester_role = 'member' then
      select birth_date into v_user_birth_date from user_profiles where user_id = p_user_id;
      
      if v_user_birth_date is not null then
          v_user_age := date_part('year', age(v_user_birth_date));
          
          if v_user_age < v_min_age or v_user_age > v_max_age then
             raise exception 'age_restriction: Bu ders sadece %-% yaş arası içindir. Yaşınız (%s) uygun değil.', v_min_age, v_max_age, v_user_age;
          end if;
      else
          -- If birth date is missing but class has strict limits, what to do?
          -- For now, warn or block. Let's block if specific teen class (e.g. max < 18)
          if v_max_age < 18 then
              raise exception 'age_missing: Bu ders yaş kısıtlamalıdır. Lütfen profilinizden doğum tarihinizi güncelleyin.';
          end if;
      end if;
  end if;

  -- 3. Perform Booking
  insert into reservations (tenant_id, user_id, session_id, status, used_credit_id)
  select tenant_id, p_user_id, p_session_id, 'booked', p_credit_id
  from class_sessions where id = p_session_id;

  -- 4. Update Stats
  update class_sessions
  set current_bookings_count = current_bookings_count + 1
  where id = p_session_id;

  -- 5. Consume Credit (Logic depends on your credit system, assuming simple decrement)
  update user_credits
  set remaining_credits = remaining_credits - 1
  where id = p_credit_id;

end;
$$;
