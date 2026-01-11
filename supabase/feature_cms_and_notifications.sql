-- -----------------------------------------------------------------------------
-- FEATURE: BLOG & CONTENT MANAGEMENT (CMS)
-- -----------------------------------------------------------------------------

-- 1. Create Blog Table
create table if not exists blog_posts (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  author_id uuid references user_profiles(id), -- Optional
  title text not null,
  slug text not null,
  excerpt text,
  content text, -- Markdown or HTML
  cover_image text,
  is_published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(tenant_id, slug)
);

-- 2. Add Landing Page Config to Tenants (if not exists, we use brand_config or separate)
-- We will just use a convention or a new column if needed. 
-- For simplicity, let's create a 'site_pages' table for flexible content (Home, About, etc.)
create table if not exists site_pages (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  slug text not null, -- 'home', 'about', 'contact'
  title text,
  hero_title text,
  hero_description text,
  hero_image text,
  content jsonb default '{}'::jsonb, -- Flexible blocks
  updated_at timestamptz default now(),

  unique(tenant_id, slug)
);

-- 3. RLS Policies

-- Public Access (Unauthenticated can read published posts)
alter table blog_posts enable row level security;
alter table site_pages enable row level security;

create policy "Public view published posts"
on blog_posts for select
using (is_published = true);

-- Admins manage posts
create policy "Admins manage posts"
on blog_posts for all
to authenticated
using (
    tenant_id = public.get_my_tenant_id_secure()
    and exists (select 1 from user_profiles where user_id = auth.uid() and role in ('admin', 'owner'))
);

create policy "Public view site pages"
on site_pages for select
using (true); -- Public pages are public

create policy "Admins manage site pages"
on site_pages for all
to authenticated
using (
    tenant_id = public.get_my_tenant_id_secure()
    and exists (select 1 from user_profiles where user_id = auth.uid() and role in ('admin', 'owner'))
);

-- -----------------------------------------------------------------------------
-- UPDATE: TRAINER NOTIFICATION TRIGGER
-- -----------------------------------------------------------------------------

create or replace function notify_reservation_created()
returns trigger
language plpgsql
security definer
as $$
declare
    v_class_name text;
    v_start_time timestamptz;
    v_trainer_id uuid; -- This is the user_profiles.id (PK), we need user_profiles.user_id (Auth ID) for notification
    v_trainer_auth_id uuid;
    v_member_name text;
    v_tenant_id uuid;
begin
     -- Get Class Info & Trainer
     select 
       ct.name, 
       cs.start_time, 
       cs.trainer_id,
       cs.tenant_id
     into 
       v_class_name, 
       v_start_time, 
       v_trainer_id,
       v_tenant_id
     from class_sessions cs
     join class_types ct on ct.id = cs.class_type_id
     where cs.id = NEW.session_id;

     -- Get Trainer Auth ID
     select user_id into v_trainer_auth_id
     from user_profiles
     where id = v_trainer_id;

     -- Get Member Name (Who booked?)
     select full_name into v_member_name
     from user_profiles
     where user_id = NEW.user_id;

     -- 1. Notify Member (Existing)
     perform send_notification(
        NEW.user_id, 
        'Rezervasyon Onaylandı', 
        v_class_name || ' dersi için kaydınız alındı. Tarih: ' || to_char(v_start_time, 'DD Mon HH24:MI'),
        '/dashboard/calendar'
     );

     -- 2. Notify Trainer (New)
     if v_trainer_auth_id is not null and v_trainer_auth_id != NEW.user_id then
         perform send_notification(
            v_trainer_auth_id,
            'Yeni Katılımcı',
            v_member_name || ' isimli üye ' || v_class_name || ' dersine kayıt oldu.',
            '/dashboard/calendar' -- Or specific trainer view
         );
     end if;

     return NEW;
end;
$$;
