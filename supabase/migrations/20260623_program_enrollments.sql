-- Progressive program enrollments
CREATE TABLE IF NOT EXISTS public.program_enrollments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  program_id text NOT NULL,
  current_week integer DEFAULT 1,
  week_minutes integer DEFAULT 0,
  week_started_at timestamp with time zone DEFAULT now(),
  enrolled_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.program_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own enrollments" ON public.program_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own enrollments" ON public.program_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own enrollments" ON public.program_enrollments FOR UPDATE USING (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_enrollment_active ON public.program_enrollments (user_id, program_id) WHERE status = 'active';
