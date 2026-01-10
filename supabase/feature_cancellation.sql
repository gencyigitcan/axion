-- -----------------------------------------------------------------------------
-- FEATURE: CANCELLATION POLICY (3 HOUR RULE)
-- -----------------------------------------------------------------------------

create or replace function cancel_reservation(
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_session_id uuid;
  v_credit_id uuid;
  v_start_time timestamptz;
  v_status reservation_status;
  v_hours_until_start interval;
begin
  -- 1. Get Reservation Details
  select session_id, used_credit_id, status
  into v_session_id, v_credit_id, v_status
  from reservations
  where id = p_reservation_id;

  if not found then 
    return jsonb_build_object('success', false, 'error', 'Rezervasyon bulunamadı');
  end if;
  
  if v_status = 'cancelled' then 
    return jsonb_build_object('success', false, 'error', 'Zaten iptal edilmiş');
  end if;

  -- 2. Get Session Start Time
  select start_time into v_start_time
  from class_sessions
  where id = v_session_id;

  -- 3. Calculate Time Difference
  v_hours_until_start := v_start_time - now();

  -- 4. Update Reservation Status
  update reservations
  set status = 'cancelled'
  where id = p_reservation_id;

  -- 5. Decrease Session Count (Always free up the spot, rule of thumb: cancellation frees spot)
  update class_sessions
  set current_bookings_count = greatest(0, current_bookings_count - 1)
  where id = v_session_id;

  -- 6. Refund Credit Logic (Only if > 3 hours)
  if v_hours_until_start > interval '3 hours' then
      update user_credits
      set remaining_credits = remaining_credits + 1
      where id = v_credit_id;
      
      return jsonb_build_object('success', true, 'message', 'Rezervasyon iptal edildi. Krediniz iade edildi.', 'refunded', true);
  else
      -- Late cancellation: No refund
      -- We don't update credits. The user loses the right.
      return jsonb_build_object('success', true, 'message', 'Geç iptal (3 saatten az). Ders hakkınız iade edilmedi.', 'refunded', false);
  end if;

exception
  when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;
