-- GinKaraoke authenticated multi-user model.
-- Existing unauthenticated demo tables are preserved as legacy_* tables so the
-- upgrade is non-destructive; they are removed from API access and Realtime.

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.members') is not null and to_regclass('public.profiles') is null then
    alter table public.session_songs rename to legacy_session_songs;
    alter table public.session_members rename to legacy_session_members;
    alter table public.karaoke_sessions rename to legacy_karaoke_sessions;
    alter table public.member_songs rename to legacy_member_songs;
    alter table public.songs rename to legacy_songs;
    alter table public.members rename to legacy_members;
    alter table public.groups rename to legacy_groups;
    alter table public.legacy_groups rename constraint groups_pkey to legacy_groups_pkey;
    alter table public.legacy_groups rename constraint groups_join_code_key to legacy_groups_join_code_key;
    alter table public.legacy_members rename constraint members_pkey to legacy_members_pkey;
    alter table public.legacy_songs rename constraint songs_pkey to legacy_songs_pkey;
    alter table public.legacy_songs rename constraint songs_normalized_unique to legacy_songs_normalized_unique;
    alter table public.legacy_member_songs rename constraint member_songs_pkey to legacy_member_songs_pkey;
    alter table public.legacy_member_songs rename constraint member_songs_unique to legacy_member_songs_unique;
    alter table public.legacy_karaoke_sessions rename constraint karaoke_sessions_pkey to legacy_karaoke_sessions_pkey;
    alter table public.legacy_session_members rename constraint session_members_pkey to legacy_session_members_pkey;
    alter table public.legacy_session_members rename constraint session_members_unique to legacy_session_members_unique;
    alter table public.legacy_session_songs rename constraint session_songs_pkey to legacy_session_songs_pkey;
    alter table public.legacy_session_songs rename constraint session_songs_unique to legacy_session_songs_unique;
  end if;
end $$;

do $$ begin
  create type public.group_role as enum ('owner', 'member');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.song_priority as enum ('NORMAL', 'WANT_TO_SING', 'HIGH');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.session_status as enum ('active', 'completed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.session_song_state as enum ('QUEUED', 'PLAYED');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  join_code text not null unique check (join_code ~ '^[A-Z0-9-]{8,24}$'),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  artist text not null default '' check (char_length(artist) <= 200),
  normalized_title text not null,
  normalized_artist text not null default '',
  created_at timestamptz not null default now(),
  unique (normalized_title, normalized_artist)
);

create table if not exists public.member_songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  favorite boolean not null default false,
  priority public.song_priority not null default 'NORMAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, song_id)
);

create table if not exists public.karaoke_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  status public.session_status not null default 'active',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists one_active_session_per_group
  on public.karaoke_sessions(group_id) where status = 'active';

create table if not exists public.session_members (
  session_id uuid not null references public.karaoke_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table if not exists public.recommendation_batches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.karaoke_sessions(id) on delete cascade,
  batch_number integer not null check (batch_number > 0),
  recycle_mode boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (session_id, batch_number)
);

create table if not exists public.session_songs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.karaoke_sessions(id) on delete cascade,
  batch_id uuid not null references public.recommendation_batches(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete restrict,
  singer_1_id uuid not null references public.profiles(id) on delete restrict,
  singer_2_id uuid not null references public.profiles(id) on delete restrict,
  eligible_singer_ids uuid[] not null default '{}',
  state public.session_song_state not null default 'QUEUED',
  queue_position integer not null check (queue_position >= 0),
  score numeric not null default 0,
  score_metadata jsonb not null default '{}'::jsonb,
  recycle_mode boolean not null default false,
  created_at timestamptz not null default now(),
  played_at timestamptz,
  updated_at timestamptz not null default now(),
  check (singer_1_id <> singer_2_id),
  check (singer_1_id = any(eligible_singer_ids)),
  check (singer_2_id = any(eligible_singer_ids)),
  check (cardinality(eligible_singer_ids) >= 2)
);

create unique index if not exists session_song_normal_unique
  on public.session_songs(session_id, song_id) where recycle_mode = false;
create index if not exists group_members_user_idx on public.group_members(user_id);
create index if not exists member_songs_user_idx on public.member_songs(user_id);
create index if not exists member_songs_song_idx on public.member_songs(song_id);
create index if not exists sessions_group_created_idx on public.karaoke_sessions(group_id, created_at desc);
create index if not exists session_songs_queue_idx on public.session_songs(session_id, state, queue_position);
create index if not exists songs_search_idx on public.songs(normalized_title, normalized_artist);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists groups_updated_at on public.groups;
create trigger groups_updated_at before update on public.groups
for each row execute function public.set_updated_at();
drop trigger if exists member_songs_updated_at on public.member_songs;
create trigger member_songs_updated_at before update on public.member_songs
for each row execute function public.set_updated_at();
drop trigger if exists sessions_updated_at on public.karaoke_sessions;
create trigger sessions_updated_at before update on public.karaoke_sessions
for each row execute function public.set_updated_at();
drop trigger if exists session_songs_updated_at on public.session_songs;
create trigger session_songs_updated_at before update on public.session_songs
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1), 'Singer'),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.is_group_member(target_group uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = target_group and gm.user_id = target_user
  );
$$;

create or replace function private.is_group_owner(target_group uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.groups g
    where g.id = target_group and g.owner_id = target_user
  );
$$;

create or replace function private.can_access_session(target_session uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.karaoke_sessions ks
    join public.group_members gm on gm.group_id = ks.group_id
    where ks.id = target_session and gm.user_id = target_user
  );
$$;

create or replace function private.shares_group(other_user uuid, viewer_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = viewer_user and theirs.user_id = other_user
  );
$$;

create or replace function public.create_group_with_owner(group_name text, requested_join_code text default null)
returns public.groups language plpgsql security definer set search_path = '' as $$
declare
  created_group public.groups;
  candidate text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(group_name)) not between 1 and 100 then raise exception 'Invalid group name'; end if;
  candidate := upper(coalesce(
    nullif(trim(requested_join_code), ''),
    substring(replace(pg_catalog.gen_random_uuid()::text, '-', '') from 1 for 10)
  ));
  if candidate !~ '^[A-Z0-9-]{8,24}$' then raise exception 'Join code must be 8-24 letters, numbers, or hyphens'; end if;
  insert into public.groups(name, join_code, owner_id)
  values (trim(group_name), candidate, auth.uid()) returning * into created_group;
  insert into public.group_members(group_id, user_id, role)
  values (created_group.id, auth.uid(), 'owner');
  return created_group;
end $$;

create or replace function public.join_group_by_code(requested_code text)
returns public.groups language plpgsql security definer set search_path = '' as $$
declare found_group public.groups;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into found_group from public.groups where join_code = upper(trim(requested_code));
  if found_group.id is null then raise exception 'Invalid join code'; end if;
  insert into public.group_members(group_id, user_id, role)
  values (found_group.id, auth.uid(), 'member') on conflict do nothing;
  return found_group;
end $$;

create or replace function public.remove_group_member(target_group uuid, target_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_user = (select owner_id from public.groups where id = target_group) then
    raise exception 'The group owner cannot leave or be removed';
  end if;
  if target_user <> auth.uid() and not private.is_group_owner(target_group) then
    raise exception 'Only the owner can remove another member';
  end if;
  delete from public.group_members where group_id = target_group and user_id = target_user;
end $$;

revoke all on function public.create_group_with_owner(text, text) from public;
revoke all on function public.join_group_by_code(text) from public;
revoke all on function public.remove_group_member(uuid, uuid) from public;
grant execute on function public.create_group_with_owner(text, text) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.songs enable row level security;
alter table public.member_songs enable row level security;
alter table public.karaoke_sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.recommendation_batches enable row level security;
alter table public.session_songs enable row level security;

create policy profiles_select on public.profiles for select to authenticated
using (id = auth.uid() or private.shares_group(id));
create policy profiles_insert_self on public.profiles for insert to authenticated
with check (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy groups_select_members on public.groups for select to authenticated
using (private.is_group_member(id));
create policy groups_update_owner on public.groups for update to authenticated
using (private.is_group_owner(id)) with check (private.is_group_owner(id));

create policy group_members_select on public.group_members for select to authenticated
using (private.is_group_member(group_id));

create policy songs_select_authenticated on public.songs for select to authenticated using (true);
create policy songs_insert_authenticated on public.songs for insert to authenticated
with check (auth.uid() is not null);

create policy member_songs_select on public.member_songs for select to authenticated
using (user_id = auth.uid() or private.shares_group(user_id));
create policy member_songs_insert_own on public.member_songs for insert to authenticated
with check (user_id = auth.uid());
create policy member_songs_update_own on public.member_songs for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy member_songs_delete_own on public.member_songs for delete to authenticated
using (user_id = auth.uid());

create policy sessions_select on public.karaoke_sessions for select to authenticated
using (private.is_group_member(group_id));
create policy sessions_insert on public.karaoke_sessions for insert to authenticated
with check (created_by = auth.uid() and private.is_group_member(group_id));
create policy sessions_update on public.karaoke_sessions for update to authenticated
using (private.is_group_member(group_id)) with check (private.is_group_member(group_id));

create policy session_members_select on public.session_members for select to authenticated
using (private.can_access_session(session_id));
create policy session_members_insert on public.session_members for insert to authenticated
with check (
  private.can_access_session(session_id)
  and exists (
    select 1 from public.karaoke_sessions ks
    where ks.id = session_id and private.is_group_member(ks.group_id, user_id)
  )
);
create policy session_members_delete on public.session_members for delete to authenticated
using (private.can_access_session(session_id));

create policy batches_select on public.recommendation_batches for select to authenticated
using (private.can_access_session(session_id));
create policy batches_insert on public.recommendation_batches for insert to authenticated
with check (created_by = auth.uid() and private.can_access_session(session_id));
create policy batches_delete on public.recommendation_batches for delete to authenticated
using (created_by = auth.uid() and private.can_access_session(session_id));

create policy session_songs_select on public.session_songs for select to authenticated
using (private.can_access_session(session_id));
create policy session_songs_insert on public.session_songs for insert to authenticated
with check (
  private.can_access_session(session_id)
  and exists (select 1 from public.session_members where session_id = session_songs.session_id and user_id = singer_1_id)
  and exists (select 1 from public.session_members where session_id = session_songs.session_id and user_id = singer_2_id)
);
create policy session_songs_update on public.session_songs for update to authenticated
using (private.can_access_session(session_id)) with check (private.can_access_session(session_id));
create policy session_songs_delete on public.session_songs for delete to authenticated
using (private.can_access_session(session_id));

-- Keep table privileges explicit; RLS is the row-level authorization boundary.
revoke all on table
  public.profiles, public.groups, public.group_members, public.songs,
  public.member_songs, public.karaoke_sessions, public.session_members,
  public.recommendation_batches, public.session_songs
from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, update on public.groups to authenticated;
grant select on public.group_members to authenticated;
grant select, insert on public.songs to authenticated;
grant select, insert, update, delete on public.member_songs to authenticated;
grant select, insert, update on public.karaoke_sessions to authenticated;
grant select, insert, delete on public.session_members to authenticated;
grant select, insert, delete on public.recommendation_batches to authenticated;
grant select, insert, update, delete on public.session_songs to authenticated;

do $$
declare legacy_table text;
begin
  foreach legacy_table in array array[
    'legacy_groups','legacy_members','legacy_songs','legacy_member_songs',
    'legacy_karaoke_sessions','legacy_session_members','legacy_session_songs'
  ] loop
    if to_regclass('public.' || legacy_table) is not null then
      execute format('alter table public.%I enable row level security', legacy_table);
      execute format('revoke all on public.%I from anon, authenticated', legacy_table);
      begin
        execute format('alter publication supabase_realtime drop table public.%I', legacy_table);
      exception when undefined_object then null;
      end;
    end if;
  end loop;
end $$;

do $$
begin
  alter publication supabase_realtime add table
    public.group_members,
    public.member_songs,
    public.karaoke_sessions,
    public.session_members,
    public.recommendation_batches,
    public.session_songs;
exception when duplicate_object then null;
end $$;
