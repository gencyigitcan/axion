-- -----------------------------------------------------------------------------
-- SEED DATA V2: Comprehensive Demo Environment (10 Class Types, Weekly Schedule)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_tenant_id uuid;
  v_owner_id uuid;
  v_class_type_ids uuid[];
  v_trainer_ids uuid[];
  v_member_ids uuid[];
  v_session_id uuid;
  i integer;
  j integer;
  t_date timestamp;
  -- Class Names Array
  v_class_names text[] := ARRAY[
    'Reformer Pilates (TEST)', 
    'Vinyasa Yoga (TEST)', 
    'HIIT Cardio (TEST)', 
    'Kick Boxing (TEST)', 
    'Spinning / Cycle (TEST)',
    'Zumba Dance (TEST)',
    'CrossFit WOD (TEST)',
    'Meditation & Breath (TEST)',
    'Barre Fitness (TEST)',
    'BodyPump (TEST)'
  ];
  -- Trainer Names Array
  v_trainer_names text[] := ARRAY[
    'Can Yılmaz (TEST)', 'Ece Demir (TEST)', 'Mert Kaya (TEST)', 'Selin Çelik (TEST)', 'Burak Koç (TEST)',
    'Ayşe Öztürk (TEST)', 'Deniz Arslan (TEST)', 'Emre Doğan (TEST)', 'Zeynep Kılıç (TEST)', 'Murat Eren (TEST)'
  ];

BEGIN
  -- 1. CLEANUP (Optional: Remove old demo data to prevent duplicates if re-running)
  -- Find the tenant first
  SELECT id INTO v_tenant_id FROM tenants WHERE name = 'Antigravity Demo Gym' LIMIT 1;
  
  IF v_tenant_id IS NOT NULL THEN
     -- WIPE data for this tenant to ensure clean state for V2
     DELETE FROM reservations WHERE tenant_id = v_tenant_id;
     DELETE FROM class_sessions WHERE tenant_id = v_tenant_id;
     DELETE FROM user_credits WHERE tenant_id = v_tenant_id;
     DELETE FROM packages WHERE tenant_id = v_tenant_id;
     DELETE FROM class_types WHERE tenant_id = v_tenant_id;
     DELETE FROM user_profiles WHERE tenant_id = v_tenant_id;
     DELETE FROM tenants WHERE id = v_tenant_id;
  END IF;

  -- 2. Create the Demo Tenant
  INSERT INTO tenants (name, subdomain_slug, brand_config)
  VALUES ('Antigravity Demo Gym', 'demo-gym-v2', '{"colors": {"primary": "#8b5cf6"}}') -- Violet
  RETURNING id INTO v_tenant_id;

  -- Create Owner
  INSERT INTO user_profiles (user_id, tenant_id, role, email, full_name)
  VALUES (gen_random_uuid(), v_tenant_id, 'owner', 'owner@demo.com', 'Demo Owner (TEST)');

  -- 3. Create 10 Trainers
  FOR i IN 1..10 LOOP
    INSERT INTO user_profiles (user_id, tenant_id, role, email, full_name)
    VALUES (
      gen_random_uuid(), -- user_id (Mock Auth ID)
      v_tenant_id,
      'trainer',
      'trainer' || i || '@demo.com',
      v_trainer_names[i]
    )
    RETURNING id INTO v_owner_id; -- Capture the PK 'id', not 'user_id'
    v_trainer_ids := array_append(v_trainer_ids, v_owner_id);
  END LOOP;

  -- 4. Create 10 Class Types
  FOR i IN 1..10 LOOP
    INSERT INTO class_types (tenant_id, name, description) 
    VALUES (
      v_tenant_id, 
      v_class_names[i], 
      'Bu bir demo dersidir. İçerik ' || v_class_names[i] || ' hakkındadır.'
    ) 
    RETURNING id INTO v_session_id; 
    v_class_type_ids := array_append(v_class_type_ids, v_session_id);
  END LOOP;

  -- 5. Create 50 Dummy Members
  FOR i IN 1..50 LOOP
    INSERT INTO user_profiles (user_id, tenant_id, role, email, full_name)
    VALUES (
      gen_random_uuid(),
      v_tenant_id,
      'member',
      'student' || i || '@demo.com',
      'Öğrenci ' || i || ' (TEST)'
    )
    RETURNING user_id INTO v_owner_id;
    v_member_ids := array_append(v_member_ids, v_owner_id);
  END LOOP;

  -- 6. Schedule Classes (Current Week + Next Week)
  -- 14 Days, 6-8 classes per day
  FOR i IN 0..13 LOOP 
    t_date := current_date + (i || ' days')::interval;
    
    FOR j IN 1..6 LOOP -- 6 Classes per day
      
      INSERT INTO class_sessions (
        tenant_id, class_type_id, trainer_id, start_time, end_time, capacity, current_bookings_count
      )
      VALUES (
        v_tenant_id,
        v_class_type_ids[floor(random() * 10 + 1)::int], -- Random Class Type
        v_trainer_ids[floor(random() * 10 + 1)::int],    -- Random Trainer
        t_date + ((8 + (j * 2)) || ' hours')::interval, -- 10:00, 12:00, 14:00...
        t_date + ((8 + (j * 2) + 1) || ' hours')::interval,
        20,
        floor(random() * 15)::int -- Random booked count
      );
      
      -- Note: preventing overlapping trainers logic omitted for brevity in SQL, 
      -- but randomized 10 trainers/10 classes should distribute well enough for demo visual.

    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seed V2 Complete for Tenant: %', v_tenant_id;
END $$;
