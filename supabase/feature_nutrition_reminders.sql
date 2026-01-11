-- Feature: Nutrition Reminders & Logic
-- 1. Create a function to check compliance and send notifications
-- This function is intended to be called by an admin/trainer manually or via a cron job

create or replace function send_daily_nutrition_reminders()
returns json
language plpgsql
security definer
as $$
declare
    v_tenant_id uuid;
    v_sent_count int := 0;
    v_user record;
    v_plan_id uuid;
    v_has_tracking boolean;
begin
    -- Get current tenant (assuming execution by a logged in trainer, we use their tenant)
    -- Actually, for automation, we might need to loop through tenants. 
    -- For this MVP single-tenant context, we'll fetch the tenant ID from the first active plan found or similar context.
    -- Better: Trigger this per tenant. Let's assume the caller contexts provides tenant_id via RLS/Session or we just run for all.
    -- Let's be safe and run for all active plans in the system (Super Admin style) or strictly scoped.
    -- Since we use `get_my_tenant_id()`, we rely on the caller being auth'd.
    
    -- Iterate over users with ACTIVE nutrition plans
    FOR v_user IN 
        SELECT distinct np.user_id, np.tenant_id, up.full_name
        FROM nutrition_plans np
        JOIN user_profiles up ON up.user_id = np.user_id
        WHERE np.is_active = true
    LOOP
        -- Check if tracking exists for TODAY
        SELECT EXISTS (
            SELECT 1 FROM daily_tracking dt
            WHERE dt.user_id = v_user.user_id 
            AND dt.date = CURRENT_DATE
        ) INTO v_has_tracking;
        
        -- If NO tracking, send notification
        IF NOT v_has_tracking THEN
            PERFORM send_notification(
                v_user.user_id,
                'Beslenme Takibi Hatırlatması',
                'Bugünkü öğün ve kilo takibini girmeyi unuttun. Hedefine ulaşmak için disiplin şart! 💪',
                'info'
            );
            v_sent_count := v_sent_count + 1;
        END IF;
        
    END LOOP;
    
    return json_build_object(
        'success', true,
        'notifications_sent', v_sent_count
    );
end;
$$;
