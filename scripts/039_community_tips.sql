-- User-submitted tips about using Creatix (reviewed via admin later; feed shows approved only)
CREATE TABLE IF NOT EXISTS public.community_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 200),
  body TEXT NOT NULL CHECK (char_length(body) <= 8000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_tips_status_created
  ON public.community_tips (status, created_at DESC);

COMMENT ON TABLE public.community_tips IS 'Creator tips for the app; pending until staff approves (admin portal TBD).';

ALTER TABLE public.community_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY community_tips_insert_own ON public.community_tips
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY community_tips_select_visible ON public.community_tips
  FOR SELECT TO authenticated
  USING (status = 'approved' OR auth.uid() = user_id);
