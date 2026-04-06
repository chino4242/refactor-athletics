-- Public shareable challenges (link-based, no group required)
CREATE TABLE public.public_challenges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES public.users(id) NOT NULL,
  name text NOT NULL,
  description text,
  invite_code text UNIQUE NOT NULL,
  metric text NOT NULL,           -- 'steps', 'workouts', 'water_days', 'active_minutes', 'weight_loss', 'muscle_gain', etc.
  metric_config jsonb DEFAULT '{}', -- flexible config per metric type (e.g. body_comp specifics, comparison mode)
  target numeric,                 -- optional target value
  start_date text NOT NULL,
  end_date text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.public_challenge_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid REFERENCES public.public_challenges(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  display_name text,
  score numeric DEFAULT 0,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX idx_public_challenges_code ON public_challenges(invite_code);
CREATE INDEX idx_public_challenges_status ON public_challenges(status);
CREATE INDEX idx_public_participants_challenge ON public_challenge_participants(challenge_id);
CREATE INDEX idx_public_participants_user ON public_challenge_participants(user_id);

ALTER TABLE public.public_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_challenge_participants ENABLE ROW LEVEL SECURITY;

-- Anyone can view challenges and participants (needed for leaderboard)
CREATE POLICY "Public challenges viewable by everyone" ON public.public_challenges FOR SELECT USING (true);
CREATE POLICY "Users can create challenges" ON public.public_challenges FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own challenges" ON public.public_challenges FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Participants viewable by everyone" ON public.public_challenge_participants FOR SELECT USING (true);
CREATE POLICY "Users can join challenges" ON public.public_challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own participation" ON public.public_challenge_participants FOR UPDATE USING (auth.uid() = user_id);
