-- -----------------------------------------------------------------------------
-- DATA CLEANUP & RELATIONSHIP REPAIR
-- -----------------------------------------------------------------------------

-- The error "Key (trainer_id)=(...) is not present in table user_profiles" means 
-- you have Class Sessions pointing to non-existent Trainers (Orphan Data).
-- This likely happened if data was partially deleted or if a Seed script was interrupted.

-- 1. DELETE ORPHAN SESSIONS
-- Remove sessions where the trainer no longer exists.
DELETE FROM class_sessions
WHERE trainer_id NOT IN (SELECT id FROM user_profiles);

-- 2. NOW APPLY THE RELATIONSHIP CONSTRAINT
-- Safe to run now that orphans are gone.

ALTER TABLE class_sessions DROP CONSTRAINT IF EXISTS class_sessions_trainer_id_fkey;

ALTER TABLE class_sessions
ADD CONSTRAINT class_sessions_trainer_id_fkey
FOREIGN KEY (trainer_id)
REFERENCES user_profiles(id)
ON DELETE CASCADE; -- If trainer is deleted, delete their sessions automatically to prevent this error in future.
