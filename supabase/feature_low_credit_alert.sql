-- -----------------------------------------------------------------------------
-- FEATURE: LOW CREDIT ALERT (Retention)
-- -----------------------------------------------------------------------------

-- Trigger Function to check credits after usage
create or replace function check_low_credits()
returns trigger
language plpgsql
security definer
as $$
declare
    v_package_name text;
begin
    -- Only run if credits decreased
    if NEW.remaining_credits < OLD.remaining_credits then
        
        -- Get Package Name for context
        select name into v_package_name
        from packages
        where id = NEW.package_id;

        -- Threshold 1: Exactly 3 credits left
        if NEW.remaining_credits = 3 then
             perform send_notification(
                NEW.user_id,
                '⚠️ Paketiniz Azaldı',
                v_package_name || ' paketinizde son 3 hak kaldı. Antrenman düzenini bozmamak için yenilemeyi unutma!',
                '/dashboard/packages' -- Link to purchase page (if exists) or profile
             );
        end if;

        -- Threshold 2: Last 1 credit
        if NEW.remaining_credits = 1 then
             perform send_notification(
                NEW.user_id,
                '🚨 Son 1 Hak!',
                'Dikkat! ' || v_package_name || ' paketinde sadece 1 ders hakkın kaldı. Tükenmeden yenile!',
                '/dashboard/packages'
             );
        end if;

        -- Threshold 3: Finished
        if NEW.remaining_credits = 0 then
             perform send_notification(
                NEW.user_id,
                '❌ Paketiniz Bitti',
                v_package_name || ' kullanım süresi doldu veya haklarınız bitti. Yeni paket alarak devam edebilirsiniz.',
                '/dashboard/packages'
             );
        end if;

    end if;

    return NEW;
end;
$$;

-- Attach Trigger to user_credits
drop trigger if exists on_credit_usage on user_credits;
create trigger on_credit_usage
after update on user_credits
for each row
execute function check_low_credits();
