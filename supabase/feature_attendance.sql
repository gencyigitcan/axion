-- Feature: Trainer Attendance
-- 1. Create a function to mark attendance for a session

create or replace function mark_session_attendance(p_session_id uuid, p_user_ids uuid[], p_status text default 'attended')
returns void
language plpgsql
security definer
as $$
begin
    -- Update reservations for the given session and users
    UPDATE reservations r
    SET status = p_status,
        updated_at = now()
    WHERE r.session_id = p_session_id
    AND r.user_id = ANY(p_user_ids);
    
    -- Could add logic to charge penalty if status='noshow' etc. 
end;
$$;
