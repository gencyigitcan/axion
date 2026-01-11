-- Function to seed a specific tenant with demo data
create or replace function seed_tenant_data(p_tenant_id uuid)
returns void
language plpgsql
security definer -- Important to allow bypassing RLS for seeding
as $$
declare
    v_class_types uuid[];
    v_trainer_id uuid;
    v_member_ids uuid[];
    v_class_type_id uuid;
    v_session_id uuid;
    v_package_id uuid;
    i integer;
begin
    -- 1. Create a dummy Trainer if not exists (or find existing admin)
    -- Actually, usually the caller of this function is the owner.
    -- We can make the owner the trainer for simplicity, or create a fake trainer.
    
    -- Let's create a fake second trainer
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'trainer-' || substr(p_tenant_id::text, 1, 8) || '@demo.com', 'password', now(), '{"provider":"email","providers":["email"]}', '{}')
    on conflict do nothing; -- Hard to create auth user from here properly without triggers, so let's skip auth.users creation usually.
    
    -- ALTERNATIVE: Just insert into user_profiles with a random key, since we don't need them to login really.
    insert into user_profiles (user_id, tenant_id, role, first_name, last_name, email, full_name)
    values (gen_random_uuid(), p_tenant_id, 'trainer', 'Can', 'Eğitmen', 'trainer@demo.com', 'Can Eğitmen')
    returning user_id into v_trainer_id;

    -- 2. Create Class Types
    insert into class_types (tenant_id, name, description, duration_minutes, capacity, color) values
    (p_tenant_id, 'Reformer Pilates', 'Aletli pilates dersi', 50, 8, '#7c3aed'),
    (p_tenant_id, 'Mat Pilates', 'Grup mat dersi', 50, 12, '#2563eb'),
    (p_tenant_id, 'Yoga Flow', 'Vinyasa yoga akışı', 60, 15, '#16a34a')
    returning id into v_class_type_id; -- captures last one, but we want all.
    
    -- Capture all IDs
    select array_agg(id) into v_class_types from class_types where tenant_id = p_tenant_id;

    -- 3. Create Packages
    insert into packages (tenant_id, name, credit_amount, price, duration_days) values
    (p_tenant_id, '10 Ders Paketi', 10, 5000, 90),
    (p_tenant_id, '20 Ders Paketi', 20, 9000, 120),
    (p_tenant_id, 'Sınırsız Aylık', 999, 12000, 30);

    -- 4. Create Members (Fake User Profiles)
    for i in 1..10 loop
        begin
            insert into user_profiles (user_id, tenant_id, role, first_name, last_name, email, full_name, phone)
            values (
                gen_random_uuid(),
                p_tenant_id,
                'member',
                'Üye',
                i::text,
                'uye' || i || '-' || substr(p_tenant_id::text, 1, 8) || '@test.com', -- make email unique
                'Demo Üye ' || i,
                '555' || (1000000 + i)::text
            );
        exception when unique_violation then
            -- If user_id (which is random) somehow conflicts, or email if strictly unique globally (though likely per tenant, but let's be safe)
            -- Just skip in demo seeding
            continue;
        end;
    end loop;
    
    select array_agg(user_id) into v_member_ids from user_profiles where tenant_id = p_tenant_id and role = 'member';

    -- 5. Create Sessions for the next 7 days
    -- Simple loop
    for i in 0..6 loop
        -- Morning Session
        insert into class_sessions (tenant_id, class_type_id, instructor_id, start_time, end_time, capacity, current_bookings_count)
        values (
            p_tenant_id,
            v_class_types[1],
            v_trainer_id,
            (current_date + i) + time '10:00:00',
            (current_date + i) + time '10:50:00',
            8,
            0
        );
        
        -- Evening Session
        insert into class_sessions (tenant_id, class_type_id, instructor_id, start_time, end_time, capacity, current_bookings_count)
        values (
            p_tenant_id,
            v_class_types[mod(i, array_length(v_class_types, 1)) + 1],
            v_trainer_id,
            (current_date + i) + time '18:00:00',
            (current_date + i) + time '18:50:00',
            12,
            0
        );
    end loop;

    -- 6. Add some feature flags
    update tenants set features = '{"classes": true, "members": true, "nutrition": true, "calendar": true, "reports": true}' where id = p_tenant_id;

end;
$$;
