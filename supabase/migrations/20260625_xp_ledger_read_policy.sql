-- Allow authenticated users to read any user's XP ledger (needed for duel scoring)
-- XP amounts are not sensitive data
DROP POLICY IF EXISTS "Users can read own ledger" ON xp_ledger;
CREATE POLICY "Authenticated can read xp_ledger" ON xp_ledger FOR SELECT USING (auth.role() = 'authenticated');
