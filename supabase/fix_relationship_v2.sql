-- -----------------------------------------------------------------------------
-- FIX: RELATIONSHIP NOT FOUND
-- -----------------------------------------------------------------------------

-- The error "Could not find a relationship between 'class_sessions' and 'user_profiles'"
-- happens because Supabase cannot infer which foreign key to use, OR the foreign key was implicitly created with a generated name that client doesn't know.

-- 1. Explicitly drop any existing constraint to avoid confusion
ALTER TABLE class_sessions DROP CONSTRAINT IF EXISTS class_sessions_trainer_id_fkey;

-- 2. Re-add the constraint using the exact column 'id' from user_profiles
-- Reviewing initial schema: user_profiles PK is 'id'. 
-- This is correct.
ALTER TABLE class_sessions
ADD CONSTRAINT class_sessions_trainer_id_fkey
FOREIGN KEY (trainer_id)
REFERENCES user_profiles(id);

-- 3. Reload the schema cache (Supabase specific trick: notify pgrst to reload)
-- Usually just executing DDL does this.

-- 4. Just in case, let's verify Policy for this relation
-- If RLS hides the related `user_profiles` row (the trainer), the client treats it as "null" or relation missing sometimes.
-- Our previous "force_fix_calendar.sql" should have covered RLS ("View profiles common").
-- Let's reinforce it.

COMMENT ON CONSTRAINT class_sessions_trainer_id_fkey ON class_sessions IS 'Links session to trainer profile';
