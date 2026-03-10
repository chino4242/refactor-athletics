-- Create function to increment career XP
CREATE OR REPLACE FUNCTION increment_career_xp(user_id uuid, xp_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET career_xp = COALESCE(career_xp, 0) + xp_amount
  WHERE id = user_id;
END;
$$;
