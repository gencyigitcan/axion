-- Add Foreign Key Relationship for class_sessions -> user_profiles using class_sessions.trainer_id
-- We named it 'trainer_id' but Supabase JS client needs to know the constraint name or reliable mapping.

ALTER TABLE class_sessions 
DROP CONSTRAINT IF EXISTS class_sessions_trainer_id_fkey;

ALTER TABLE class_sessions
ADD CONSTRAINT class_sessions_trainer_id_fkey
FOREIGN KEY (trainer_id)
REFERENCES user_profiles(id) -- CAREFUL: Is it 'id' (uuid PK) or 'user_id' (auth uuid)?
-- Looking at schema, user_profiles has PK 'id' (uuid default gen_random_uuid()) and 'user_id' (auth.uid references auth.users)
-- Usually we reference the PK 'id'.

-- Let's check initial schema:
-- CREATE TABLE user_profiles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users...)
-- CREATE TABLE class_sessions (..., trainer_id UUID REFERENCES user_profiles(id), ...)

-- The error "Could not find a relationship" usually means Supabase Client Inference failed.
-- We can fix this by being EXPLICIT in the JS query, OR ensuring the constraint is visible.

-- RE-APPLY Constraint just to be sure:
ON DELETE SET NULL;

-- Also let's grant permissions to be safe
GRANT REFERENCES ON user_profiles TO authenticated;
GRANT REFERENCES ON class_sessions TO authenticated;
