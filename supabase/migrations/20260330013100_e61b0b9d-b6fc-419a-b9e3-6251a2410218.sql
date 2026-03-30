
CREATE TABLE public.bot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  system_prompt text NOT NULL DEFAULT 'You are NexaBot, an intelligent AI assistant designed to help with customer service, personal productivity, and business automation. You are helpful, concise, and professional.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.bot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own config" ON public.bot_config FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own config" ON public.bot_config FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own config" ON public.bot_config FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_bot_config_updated_at BEFORE UPDATE ON public.bot_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
