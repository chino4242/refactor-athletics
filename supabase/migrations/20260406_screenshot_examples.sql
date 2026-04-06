-- Few-shot examples for screenshot parsing corrections
CREATE TABLE public.screenshot_examples (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  screenshot_type text NOT NULL,
  image_description text NOT NULL,
  corrected_json jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_screenshot_examples_user_type ON screenshot_examples(user_id, screenshot_type);

ALTER TABLE public.screenshot_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own examples" ON public.screenshot_examples FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own examples" ON public.screenshot_examples FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own examples" ON public.screenshot_examples FOR DELETE USING (auth.uid() = user_id);
