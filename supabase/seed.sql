-- Optional canonical song catalog seed.
-- Profiles are created only from real auth.users by the auth trigger. This file
-- intentionally does not fabricate users, memberships, or owned playlists.
insert into public.songs (title, artist, normalized_title, normalized_artist)
values
  ('Nơi này có anh', 'Sơn Tùng M-TP', 'noi nay co anh', 'son tung m tp'),
  ('Bạc phận', 'Jack x K-ICM', 'bac phan', 'jack x k icm'),
  ('Sóng gió', 'Jack x K-ICM', 'song gio', 'jack x k icm'),
  ('Chúng ta của tương lai', 'Sơn Tùng M-TP', 'chung ta cua tuong lai', 'son tung m tp')
on conflict (normalized_title, normalized_artist) do nothing;
