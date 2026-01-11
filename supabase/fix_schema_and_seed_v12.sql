-- v12: The Architect Script (Fixing PK vs FK mismatch)
-- Error 23503: Trainer FK violation. 
-- Cause: We generated a UUID for 'user_id' but 'class_sessions.trainer_id' likely references 'user_profiles.id' (PK).
-- Fix: We must use 'RETURNING id' when inserting new profiles to ensure we have the correct PK.

-- 1. Ensure Columns Exist (DDL)
alter table user_profiles add column if not exists phone text;
alter table user_profiles add column if not exists birth_date date;
alter table class_sessions add column if not exists duration_minutes integer default 60;
alter table class_types add column if not exists duration_minutes integer default 60;
alter table class_types add column if not exists credits_required integer default 1;
alter table class_sessions add column if not exists end_time timestamptz; -- Ensure end_time exists

-- 2. Run Massive Seed
DO $$
DECLARE
    v_tenant_id uuid;
    v_class_type_ids uuid[];
    v_package_ids uuid[];
    
    v_trainer_user_id uuid;
    v_trainer_pk uuid; -- Actual PK in user_profiles
    
    v_student_user_id uuid;
    v_student_pk uuid; -- Actual PK
    
    v_i integer;
    v_random_class_type uuid;
    v_random_package uuid;
    v_profile_query text;
    v_credit_query text;
    v_session_query text;
    v_ct_query text;
    v_pkg_query text;
    
    v_start_time timestamptz;
    v_end_time timestamptz;
BEGIN
    -- 1. Get Tenant
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    
    -- 2. SELF-HEALING: Create Class Types
    IF NOT EXISTS (SELECT 1 FROM class_types WHERE tenant_id = v_tenant_id) THEN
        v_ct_query := format('INSERT INTO class_types (tenant_id, name, duration_minutes, credits_required) VALUES (%L, %L, 60, 1)', v_tenant_id, 'Reform Pilates');
        EXECUTE v_ct_query;
        v_ct_query := format('INSERT INTO class_types (tenant_id, name, duration_minutes, credits_required) VALUES (%L, %L, 60, 1)', v_tenant_id, 'Mat Pilates');
        EXECUTE v_ct_query;
        v_ct_query := format('INSERT INTO class_types (tenant_id, name, duration_minutes, credits_required) VALUES (%L, %L, 60, 1)', v_tenant_id, 'Yoga Flow');
        EXECUTE v_ct_query;
    END IF;
    SELECT array_agg(id) INTO v_class_type_ids FROM class_types WHERE tenant_id = v_tenant_id;

    -- 3. SELF-HEALING: Create Packages
    IF NOT EXISTS (SELECT 1 FROM packages WHERE tenant_id = v_tenant_id) THEN
        v_pkg_query := format('INSERT INTO packages (tenant_id, name, credit_count, price, validity_days, allowed_class_type_ids) VALUES (%L, %L, 8, 2000, 30, %L)', v_tenant_id, '8 Derslik Paket', v_class_type_ids);
        EXECUTE v_pkg_query;
        v_pkg_query := format('INSERT INTO packages (tenant_id, name, credit_count, price, validity_days, allowed_class_type_ids) VALUES (%L, %L, 12, 2800, 45, %L)', v_tenant_id, '12 Derslik Paket', v_class_type_ids);
        EXECUTE v_pkg_query;
    END IF;
    SELECT array_agg(id) INTO v_package_ids FROM packages WHERE tenant_id = v_tenant_id;

    -- 4. SELF-HEALING: Create Trainer (Correctly capturing PK)
    SELECT id INTO v_trainer_pk FROM user_profiles WHERE role='trainer' AND tenant_id = v_tenant_id LIMIT 1;
    
    IF v_trainer_pk IS NULL THEN
        v_trainer_user_id := uuid_generate_v4();
        -- Insert and capture the ID (PK)
        v_profile_query := format(
             'INSERT INTO user_profiles (user_id, tenant_id, full_name, role, email) VALUES (%L, %L, %L, %L, %L) RETURNING id',
             v_trainer_user_id, v_tenant_id, 'Master Trainer', 'trainer', 'trainer@demo.com'
        );
        EXECUTE v_profile_query INTO v_trainer_pk; -- Capture PK
    END IF;

    -- 5. Create 100 Students
    FOR v_i IN 1..100 LOOP
        v_student_user_id := uuid_generate_v4();
        
        -- PROFILE (Ignore RETURNING for students as generic reservations query uses user_id, but good to know)
        -- We continue to assume others link via user_id, if not we'll fix later.
        v_profile_query := format(
            'INSERT INTO user_profiles (user_id, tenant_id, full_name, role, email, phone, birth_date) VALUES (%L, %L, %L, %L, %L, %L, %L) ON CONFLICT (user_id) DO NOTHING',
            v_student_user_id,
            v_tenant_id,
            'Student ' || v_i,
            'member',
            'student' || v_i || '@demo.com',
            '+90555000' || lpad(v_i::text, 4, '0'),
            (timestamp '2000-01-01' + (random() * (timestamp '2010-01-01' - timestamp '2000-01-01')))::date
        );
        EXECUTE v_profile_query;

        -- CREDITS
        v_random_package := NULL;
        IF array_length(v_package_ids, 1) > 0 THEN
             v_random_package := v_package_ids[floor(random() * array_length(v_package_ids, 1) + 1)];
        END IF;

        v_credit_query := format(
            'INSERT INTO user_credits (tenant_id, user_id, remaining_credits, status, expiration_date, package_id) VALUES (%L, %L, %s, %L, %L, %L)',
            v_tenant_id,
            v_student_user_id,
            (floor(random() * 20)::int + 1)::text,
            'active',
            now() + interval '30 days',
            v_random_package
        );
        EXECUTE v_credit_query;
        
        -- MEASUREMENTS
        INSERT INTO user_measurements (tenant_id, user_id, weight, height, fat_percentage)
        VALUES (
            v_tenant_id,
            v_student_user_id,
            50 + (random() * 40),
            160 + (random() * 30),
            10 + (random() * 20)
        );
        
        -- NUTRITION
         IF (random() > 0.5) THEN
            INSERT INTO nutrition_plans (tenant_id, user_id, title, daily_calories, start_date)
            VALUES (
                v_tenant_id, 
                v_student_user_id, 
                'Kilo Koruma', 
                2000 + floor(random()*500), 
                current_date
            );
        END IF;
    END LOOP;

    -- 6. Create Future Sessions (Using v_trainer_pk)
    FOR v_i IN 1..50 LOOP
        v_random_class_type := v_class_type_ids[floor(random() * array_length(v_class_type_ids, 1) + 1)];
        
        v_start_time := now() + (v_i || ' days')::interval + '10:00:00';
        v_end_time := v_start_time + interval '60 minutes';

        v_session_query := format(
            'INSERT INTO class_sessions (tenant_id, class_type_id, trainer_id, start_time, end_time, duration_minutes, capacity, current_bookings_count) VALUES (%L, %L, %L, %L, %L, 60, 15, 0)',
            v_tenant_id,
            v_random_class_type,
            v_trainer_pk, -- Use PK here
            v_start_time,
            v_end_time
        );
        EXECUTE v_session_query;
    END LOOP;

    -- 7. Fill Sessions (Reservations likely use user_id, stay with that)
    INSERT INTO reservations (tenant_id, user_id, session_id, status)
    SELECT 
        v_tenant_id,
        up.user_id, -- Using user_id (auth UUID)
        cs.id,
        'booked'
    FROM class_sessions cs
    CROSS JOIN LATERAL (
        SELECT user_id FROM user_profiles 
        WHERE role='member' 
        ORDER BY random() 
        LIMIT floor(random() * 10)::int
    ) up
    WHERE cs.start_time > now();
    
    -- Update counts
    UPDATE class_sessions cs
    SET current_bookings_count = (
        SELECT count(*) FROM reservations r WHERE r.session_id = cs.id
    );

END $$;
