-- CREATRIX Database Schema
-- Creator Management SaaS Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'creator' CHECK (role IN ('creator', 'agency', 'admin')),
  company_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform connections (OnlyFans, MYM, Fansly)
CREATE TABLE IF NOT EXISTS public.platform_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('onlyfans', 'mym', 'fansly')),
  platform_username TEXT,
  access_token TEXT,
  refresh_token TEXT,
  is_connected BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Fans/Subscribers CRM
CREATE TABLE IF NOT EXISTS public.fans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('onlyfans', 'mym', 'fansly')),
  platform_fan_id TEXT,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'cancelled', 'pending')),
  subscription_tier TEXT,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  first_subscribed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fan tags for segmentation
CREATE TABLE IF NOT EXISTS public.fan_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#06b6d4',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Fan to tag relationship
CREATE TABLE IF NOT EXISTS public.fan_tag_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fan_id UUID NOT NULL REFERENCES public.fans(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.fan_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fan_id, tag_id)
);

-- Content library
CREATE TABLE IF NOT EXISTS public.content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('photo', 'video', 'message', 'ppv')),
  file_url TEXT,
  thumbnail_url TEXT,
  platforms TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages/Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES public.fans(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('onlyfans', 'mym', 'fansly')),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  is_starred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fan_id, platform)
);

-- Individual messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('creator', 'fan')),
  content TEXT,
  media_urls TEXT[] DEFAULT '{}',
  is_ppv BOOLEAN DEFAULT FALSE,
  ppv_price DECIMAL(10, 2),
  ppv_unlocked BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message templates
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leak monitoring alerts
CREATE TABLE IF NOT EXISTS public.leak_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  screenshot_url TEXT,
  matched_content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'confirmed', 'ignored', 'dmca_sent')),
  similarity_score DECIMAL(5, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reputation monitoring mentions
CREATE TABLE IF NOT EXISTS public.reputation_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_url TEXT,
  title TEXT,
  content_preview TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score DECIMAL(3, 2),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics snapshots
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  platform TEXT CHECK (platform IN ('onlyfans', 'mym', 'fansly', 'all')),
  total_fans INTEGER DEFAULT 0,
  new_fans INTEGER DEFAULT 0,
  churned_fans INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER,
  top_content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, platform)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leak_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- RLS Policies for platform_connections
CREATE POLICY "platform_connections_select_own" ON public.platform_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "platform_connections_insert_own" ON public.platform_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "platform_connections_update_own" ON public.platform_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "platform_connections_delete_own" ON public.platform_connections FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for fans
CREATE POLICY "fans_select_own" ON public.fans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fans_insert_own" ON public.fans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fans_update_own" ON public.fans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fans_delete_own" ON public.fans FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for fan_tags
CREATE POLICY "fan_tags_select_own" ON public.fan_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fan_tags_insert_own" ON public.fan_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fan_tags_update_own" ON public.fan_tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fan_tags_delete_own" ON public.fan_tags FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for fan_tag_assignments (check via fan ownership)
CREATE POLICY "fan_tag_assignments_select_own" ON public.fan_tag_assignments FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.fans WHERE fans.id = fan_id AND fans.user_id = auth.uid()));
CREATE POLICY "fan_tag_assignments_insert_own" ON public.fan_tag_assignments FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.fans WHERE fans.id = fan_id AND fans.user_id = auth.uid()));
CREATE POLICY "fan_tag_assignments_delete_own" ON public.fan_tag_assignments FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.fans WHERE fans.id = fan_id AND fans.user_id = auth.uid()));

-- RLS Policies for content
CREATE POLICY "content_select_own" ON public.content FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "content_insert_own" ON public.content FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "content_update_own" ON public.content FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "content_delete_own" ON public.content FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for conversations
CREATE POLICY "conversations_select_own" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "conversations_insert_own" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_update_own" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "conversations_delete_own" ON public.conversations FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for messages (check via conversation ownership)
CREATE POLICY "messages_select_own" ON public.messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = conversation_id AND conversations.user_id = auth.uid()));

-- RLS Policies for message_templates
CREATE POLICY "message_templates_select_own" ON public.message_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "message_templates_insert_own" ON public.message_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "message_templates_update_own" ON public.message_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "message_templates_delete_own" ON public.message_templates FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for leak_alerts
CREATE POLICY "leak_alerts_select_own" ON public.leak_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "leak_alerts_insert_own" ON public.leak_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leak_alerts_update_own" ON public.leak_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "leak_alerts_delete_own" ON public.leak_alerts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reputation_mentions
CREATE POLICY "reputation_mentions_select_own" ON public.reputation_mentions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reputation_mentions_insert_own" ON public.reputation_mentions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reputation_mentions_update_own" ON public.reputation_mentions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reputation_mentions_delete_own" ON public.reputation_mentions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for analytics_snapshots
CREATE POLICY "analytics_snapshots_select_own" ON public.analytics_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "analytics_snapshots_insert_own" ON public.analytics_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "analytics_snapshots_update_own" ON public.analytics_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "analytics_snapshots_delete_own" ON public.analytics_snapshots FOR DELETE USING (auth.uid() = user_id);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fans_user_id ON public.fans(user_id);
CREATE INDEX IF NOT EXISTS idx_fans_platform ON public.fans(platform);
CREATE INDEX IF NOT EXISTS idx_fans_subscription_status ON public.fans(subscription_status);
CREATE INDEX IF NOT EXISTS idx_content_user_id ON public.content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON public.content(status);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_fan_id ON public.conversations(fan_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leak_alerts_user_id ON public.leak_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_mentions_user_id ON public.reputation_mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_user_id_date ON public.analytics_snapshots(user_id, date);
