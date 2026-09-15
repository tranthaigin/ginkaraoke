-- =========================================================
-- GinKaraoke - Supabase Database Schema Migration
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    join_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by join code
CREATE INDEX IF NOT EXISTS idx_groups_join_code ON public.groups (join_code);

-- 2. MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '🎤',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_group_id ON public.members (group_id);

-- 3. SONGS TABLE (Global / Shared catalog per normalized title & artist)
CREATE TABLE IF NOT EXISTS public.songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    artist TEXT NOT NULL DEFAULT '',
    normalized_title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT songs_normalized_unique UNIQUE (normalized_title, artist)
);

CREATE INDEX IF NOT EXISTS idx_songs_normalized ON public.songs (normalized_title);
CREATE INDEX IF NOT EXISTS idx_songs_title ON public.songs (title);

-- 4. MEMBER_SONGS TABLE (Personal playlist per member)
CREATE TABLE IF NOT EXISTS public.member_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    favorite BOOLEAN NOT NULL DEFAULT false,
    priority TEXT NOT NULL CHECK (priority IN ('NORMAL', 'WANT_TO_SING', 'HIGH')) DEFAULT 'NORMAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT member_songs_unique UNIQUE (member_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_member_songs_member_id ON public.member_songs (member_id);
CREATE INDEX IF NOT EXISTS idx_member_songs_song_id ON public.member_songs (song_id);

-- 5. KARAOKE_SESSIONS TABLE (Each outing session)
CREATE TABLE IF NOT EXISTS public.karaoke_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_group_id ON public.karaoke_sessions (group_id);

-- 6. SESSION_MEMBERS TABLE (Participants in a session)
CREATE TABLE IF NOT EXISTS public.session_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.karaoke_sessions(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    CONSTRAINT session_members_unique UNIQUE (session_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_session_members_session_id ON public.session_members (session_id);

-- 7. SESSION_SONGS TABLE (Session playlist, tracks sung status)
CREATE TABLE IF NOT EXISTS public.session_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.karaoke_sessions(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    sung BOOLEAN NOT NULL DEFAULT false,
    sung_at TIMESTAMPTZ,
    priority_order INT NOT NULL DEFAULT 0,
    score NUMERIC NOT NULL DEFAULT 0,
    CONSTRAINT session_songs_unique UNIQUE (session_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_session_songs_session_id ON public.session_songs (session_id);

-- =========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karaoke_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_songs ENABLE ROW LEVEL SECURITY;

-- Allow public/anon access for groups (read by join code, create new group)
CREATE POLICY "Allow public select groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Allow public insert groups" ON public.groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update groups" ON public.groups FOR UPDATE USING (true);

-- Members
CREATE POLICY "Allow public select members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow public insert members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update members" ON public.members FOR UPDATE USING (true);
CREATE POLICY "Allow public delete members" ON public.members FOR DELETE USING (true);

-- Songs (Shared song catalog)
CREATE POLICY "Allow public select songs" ON public.songs FOR SELECT USING (true);
CREATE POLICY "Allow public insert songs" ON public.songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update songs" ON public.songs FOR UPDATE USING (true);

-- Member Songs
CREATE POLICY "Allow public select member_songs" ON public.member_songs FOR SELECT USING (true);
CREATE POLICY "Allow public insert member_songs" ON public.member_songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update member_songs" ON public.member_songs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete member_songs" ON public.member_songs FOR DELETE USING (true);

-- Karaoke Sessions
CREATE POLICY "Allow public select karaoke_sessions" ON public.karaoke_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert karaoke_sessions" ON public.karaoke_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update karaoke_sessions" ON public.karaoke_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete karaoke_sessions" ON public.karaoke_sessions FOR DELETE USING (true);

-- Session Members
CREATE POLICY "Allow public select session_members" ON public.session_members FOR SELECT USING (true);
CREATE POLICY "Allow public insert session_members" ON public.session_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete session_members" ON public.session_members FOR DELETE USING (true);

-- Session Songs
CREATE POLICY "Allow public select session_songs" ON public.session_songs FOR SELECT USING (true);
CREATE POLICY "Allow public insert session_songs" ON public.session_songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update session_songs" ON public.session_songs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete session_songs" ON public.session_songs FOR DELETE USING (true);

-- =========================================================
-- REALTIME PUBLICATION SETUP
-- =========================================================
-- Enable realtime for tables that require live syncing across devices
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.members, 
    public.songs, 
    public.member_songs, 
    public.karaoke_sessions, 
    public.session_songs;
COMMIT;
