-- =========================================================
-- GinKaraoke - Demo & Test Seed Data
-- =========================================================

-- 1. Create Demo Group
INSERT INTO public.groups (id, name, join_code)
VALUES ('a0000000-0000-0000-0000-000000000001', 'QT Karaoke Team', 'QT-KARAOKE')
ON CONFLICT (join_code) DO NOTHING;

-- 2. Create Members: Qt, Huy, Khang
INSERT INTO public.members (id, group_id, display_name, avatar)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Qt', '😎'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Huy', '🤠'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Khang', '🥳')
ON CONFLICT DO NOTHING;

-- 3. Create Songs
-- Nơi này có anh (Sơn Tùng M-TP)
-- Bạc phận (Jack x K-ICM)
-- Sóng gió (Jack x K-ICM)
-- Chúng ta của tương lai (Sơn Tùng M-TP)
INSERT INTO public.songs (id, title, artist, normalized_title)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Nơi này có anh', 'Sơn Tùng M-TP', 'noi nay co anh'),
  ('c0000000-0000-0000-0000-000000000002', 'Bạc phận', 'Jack x K-ICM', 'bac phan'),
  ('c0000000-0000-0000-0000-000000000003', 'Sóng gió', 'Jack x K-ICM', 'song gio'),
  ('c0000000-0000-0000-0000-000000000004', 'Chúng ta của tương lai', 'Sơn Tùng M-TP', 'chung ta cua tuong lai')
ON CONFLICT (normalized_title, artist) DO NOTHING;

-- 4. Assign Member Songs
-- Qt: Nơi này có anh, Bạc phận, Sóng gió
INSERT INTO public.member_songs (member_id, song_id, favorite, priority)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', true, 'HIGH'),
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', false, 'WANT_TO_SING'),
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', false, 'NORMAL')
ON CONFLICT (member_id, song_id) DO NOTHING;

-- Huy: Nơi này có anh, Bạc phận, Chúng ta của tương lai
INSERT INTO public.member_songs (member_id, song_id, favorite, priority)
VALUES
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', false, 'NORMAL'),
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', true, 'HIGH'),
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', false, 'WANT_TO_SING')
ON CONFLICT (member_id, song_id) DO NOTHING;

-- Khang: Nơi này có anh, Sóng gió, Chúng ta của tương lai
INSERT INTO public.member_songs (member_id, song_id, favorite, priority)
VALUES
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', false, 'NORMAL'),
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', true, 'HIGH'),
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', false, 'NORMAL')
ON CONFLICT (member_id, song_id) DO NOTHING;
