-- -----------------------------------------------------------------------------
-- MASSIVE SEED DATA GENERATOR (100 Students)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    v_tenant_id uuid;
    v_class_type_ids uuid[];
    v_trainer_id uuid;
    v_student_id uuid;
    v_i integer;
    v_random_class_type uuid;
BEGIN
    -- 1. Get Tenant (Antigravity Main)
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;

    -- 2. Get Class Types
    SELECT array_agg(id) INTO v_class_type_ids FROM class_types WHERE tenant_id = v_tenant_id;

    -- 3. Create 100 Students
    FOR v_i IN 1..100 LOOP
        -- Insert into Auth Users (Simulated via profiles since we can't insert into auth.users directly easily in SQL editor without admin privs usually, 
        -- but here we assume we populate user_profiles directly and linking logic handles it or we rely on 'user_id' being a random UUID for demo).
        
        -- Generate a Random UUID for student
        v_student_id := uuid_generate_v4();
        
        -- Create Profile
        INSERT INTO user_profiles (user_id, tenant_id, full_name, role, email, phone, birth_date)
        VALUES (
            v_student_id,
            v_tenant_id,
            'Student ' || v_i,
            'member',
            'student' || v_i || '@demo.com',
            '+90555000' || lpad(v_i::text, 4, '0'),
            timestamp '2000-01-01' + (random() * (timestamp '2010-01-01' - timestamp '2000-01-01'))
        );

        -- Give Credits (Package)
        INSERT INTO user_credits (tenant_id, user_id, remaining_credits, status, expire_date)
        VALUES (
            v_tenant_id,
            v_student_id,
            floor(random() * 20)::int + 1, -- 1 to 20 credits
            'active',
            now() + interval '30 days'
        );
        
        -- Add Random Measurements
        INSERT INTO user_measurements (tenant_id, user_id, weight, height, fat_percentage)
        VALUES (
            v_tenant_id,
            v_student_id,
            50 + (random() * 40), -- 50-90 kg
            160 + (random() * 30), -- 160-190 cm
            10 + (random() * 20) -- 10-30 % fat
        );
        
        -- Add Nutrition Plan (For 50% of users)
        IF (random() > 0.5) THEN
            INSERT INTO nutrition_plans (tenant_id, user_id, title, daily_calories, start_date)
            VALUES (
                v_tenant_id, 
                v_student_id, 
                'Kilo Koruma', 
                2000 + floor(random()*500), 
                current_date
            );
        END IF;

    END LOOP;

    -- 4. Create Future Sessions (Populate Calendar)
    -- Create 50 Sessions for next 30 days
    FOR v_i IN 1..50 LOOP
        v_random_class_type := v_class_type_ids[floor(random() * array_length(v_class_type_ids, 1) + 1)];
        
        INSERT INTO class_sessions (tenant_id, class_type_id, trainer_id, start_time, duration_minutes, capacity, current_bookings_count)
        VALUES (
            v_tenant_id,
            v_random_class_type,
            (SELECT id FROM user_profiles WHERE role='trainer' AND tenant_id=v_tenant_id LIMIT 1), -- Assign first trainer
            now() + (v_i || ' days')::interval + '10:00:00', -- Distribute over days
            60,
            15,
            0
        );
    END LOOP;

    -- 5. Fill Sessions (Random bookings)
    -- For each session, book 5-10 random students
    -- (This part is complex in pure SQL block without cursors, simplified here)
    -- Instead, let's just update 'current_bookings_count' to look busy for Demo :) 
    -- and insert some real reservations for visibility.
    
    INSERT INTO reservations (tenant_id, user_id, session_id, status)
    SELECT 
        v_tenant_id,
        up.user_id,
        cs.id,
        'booked'
    FROM class_sessions cs
    CROSS JOIN LATERAL (
        SELECT user_id FROM user_profiles 
        WHERE role='member' 
        ORDER BY random() 
        LIMIT floor(random() * 10)::int -- 0 to 9 bookings per session
    ) up
    WHERE cs.start_time > now();
    
    -- Update counts
    UPDATE class_sessions cs
    SET current_bookings_count = (
        SELECT count(*) FROM reservations r WHERE r.session_id = cs.id
    );

END $$;
