-- -----------------------------------------------------------------------------
-- SEED DATA: Demo Environment Generator
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_tenant_id uuid;
  v_owner_id uuid;
  v_trainer_ids uuid[];
  v_class_type_ids uuid[];
  v_member_ids uuid[];
  v_session_id uuid;
  i integer;
  j integer;
  t_date timestamp;
BEGIN
  -- 1. Create a "Demo Owner" (Virtual User - won't be able to login, but owns the data)
  -- In a real scenario, you'd bind this to a real auth user.
  v_owner_id := gen_random_uuid();
  
  -- 2. Create the Demo Tenant
  INSERT INTO tenants (name, subdomain_slug, brand_config)
  VALUES ('Antigravity Demo Gym', 'demo-gym-' || floor(random() * 1000)::text, '{"colors": {"primary": "#3b82f6"}}')
  RETURNING id INTO v_tenant_id;

  -- Create Owner Profile
  INSERT INTO user_profiles (user_id, tenant_id, role, email, full_name)
  VALUES (v_owner_id, v_tenant_id, 'owner', 'owner@demo.com', 'Demo Owner');

  RAISE NOTICE 'Created Tenant: %', v_tenant_id;

  -- 3. Create 10 Dummy Trainers
  FOR i IN 1..10 LOOP
    INSERT INTO user_profiles (user_id, tenant_id, role, email, full_name)
    VALUES (
      gen_random_uuid(),
      v_tenant_id,
      'trainer',
      'trainer' || i || '@demo.com',
      (ARRAY['Ezgi', 'Mehmet', 'Can', 'Selin', 'Burak', 'Ayşe', 'Deniz', 'Emre', 'Zeynep', 'Mert'])[i] || ' ' || 
      (ARRAY['Yılmaz', 'Demir', 'Kaya', 'Çelik', 'Koç', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Eren'])[i]
    )
    RETURNING user_id INTO v_owner_id; -- Reuse variable just to capture ID temporarily
    v_trainer_ids := array_append(v_trainer_ids, v_owner_id);
  END LOOP;

  -- 4. Create Class Types
  INSERT INTO class_types (tenant_id, name, description) VALUES (v_tenant_id, 'Reformer Pilates', 'Aletli pilates dersi') RETURNING id INTO v_session_id; v_class_type_ids := array_append(v_class_type_ids, v_session_id);
  INSERT INTO class_types (tenant_id, name, description) VALUES (v_tenant_id, 'Yoga Flow', 'Vinyasa yoga akışı') RETURNING id INTO v_session_id; v_class_type_ids := array_append(v_class_type_ids, v_session_id);
  INSERT INTO class_types (tenant_id, name, description) VALUES (v_tenant_id, 'HIIT Cardio', 'Yüksek yoğunluklu antrenman') RETURNING id INTO v_session_id; v_class_type_ids := array_append(v_class_type_ids, v_session_id);
  INSERT INTO class_types (tenant_id, name, description) VALUES (v_tenant_id, 'Kick Boxing', 'Teknik ve kondisyon') RETURNING id INTO v_session_id; v_class_type_ids := array_append(v_class_type_ids, v_session_id);

  -- 5. Create 20 Dummy Students (Members)
  FOR i IN 1..20 LOOP
    INSERT INTO user_profiles (user_id, tenant_id, role, email, full_name)
    VALUES (
      gen_random_uuid(),
      v_tenant_id,
      'member',
      'student' || i || '@demo.com',
      'Öğrenci ' || i
    )
    RETURNING user_id INTO v_owner_id;
    v_member_ids := array_append(v_member_ids, v_owner_id);
  END LOOP;

  -- 6. Schedule Classes for Next 7 Days
  FOR i IN 0..6 LOOP -- Days
    t_date := current_date + (i || ' days')::interval + '09:00:00'::time;
    
    FOR j IN 1..4 LOOP -- 4 Classes per day
      -- Insert Session
      INSERT INTO class_sessions (tenant_id, class_type_id, trainer_id, start_time, end_time, capacity, current_bookings_count)
      VALUES (
        v_tenant_id,
        v_class_type_ids[(j % 4) + 1],
        v_trainer_ids[(i + j) % 10 + 1], -- Rotate trainers
        t_date + ((j * 2) || ' hours')::interval, -- 09:00, 11:00, 13:00...
        t_date + ((j * 2) || ' hours')::interval + '1 hour'::interval,
        15,
        floor(random() * 10)::int -- Random initial bookings count
      )
      RETURNING id INTO v_session_id;

      -- Create Random Reservations for this session (FAKE BOOKINGS)
      -- We ideally insert into reservations table, but for "count" visualization 
      -- we updated current_bookings_count directly above.
      -- To be proper, let's insert a couple of reservation rows so "Members" list in session looks real if we implemented that.
      INSERT INTO reservations (tenant_id, user_id, class_session_id, status)
      VALUES (v_tenant_id, v_member_ids[1], v_session_id, 'confirmed');
      
    END LOOP;
  END LOOP;

END $$;
