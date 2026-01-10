-- Allow authenticated users to view active credits (their own)
create policy "Users can view own credits"
on user_credits for select
to authenticated
using (auth.uid() = user_id);

-- Allow authenticated users to view reservations (their own)
create policy "Users can view own reservations"
on reservations for select
to authenticated
using (user_id = auth.uid());

-- Fix package reading
create policy "Authenticated users can view packages"
on packages for select
to authenticated
using (true);
