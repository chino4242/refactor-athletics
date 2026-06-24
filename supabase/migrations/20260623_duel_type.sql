-- Add duel_type column to duels table
ALTER TABLE public.duels ADD COLUMN IF NOT EXISTS duel_type text DEFAULT 'xp';
