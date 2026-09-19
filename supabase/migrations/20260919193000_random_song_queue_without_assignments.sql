-- RANDOM mode chooses songs from selected members' playlists without assigning
-- performers. SMART mode remains strictly duet-only. Playlist ownership stays
-- in eligible_singer_ids so clients can explain where every random song came from.

alter table public.session_songs
  alter column singer_1_id drop not null;

-- Convert previously generated RANDOM rows from the older solo/duet behavior.
update public.session_songs as queued_song
set singer_1_id = null,
    singer_2_id = null
from public.karaoke_sessions as session
where session.id = queued_song.session_id
  and session.selection_mode = 'RANDOM'
  and (queued_song.singer_1_id is not null or queued_song.singer_2_id is not null);

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.session_songs'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) ilike '%singer_1_id%'
        or pg_get_constraintdef(oid) ilike '%singer_2_id%'
        or pg_get_constraintdef(oid) ilike '%cardinality(eligible_singer_ids)%'
      )
  loop
    execute format(
      'alter table public.session_songs drop constraint %I',
      constraint_record.conname
    );
  end loop;
end;
$$;

alter table public.session_songs
  add constraint session_songs_distinct_singers_check
    check (singer_1_id is null or singer_2_id is null or singer_1_id <> singer_2_id),
  add constraint session_songs_singer_1_eligible_check
    check (singer_1_id is null or singer_1_id = any(eligible_singer_ids)),
  add constraint session_songs_singer_2_eligible_check
    check (singer_2_id is null or singer_2_id = any(eligible_singer_ids)),
  add constraint session_songs_eligible_count_check
    check (cardinality(eligible_singer_ids) >= 1);

drop policy if exists session_songs_insert on public.session_songs;
create policy session_songs_insert on public.session_songs for insert to authenticated
with check (
  private.can_access_session(session_id)
  and (
    singer_1_id is null
    or exists (
      select 1
      from public.session_members
      where session_id = session_songs.session_id
        and user_id = singer_1_id
    )
  )
  and (
    singer_2_id is null
    or exists (
      select 1
      from public.session_members
      where session_id = session_songs.session_id
        and user_id = singer_2_id
    )
  )
);

create or replace function private.validate_session_song_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_mode text;
begin
  select selection_mode
  into session_mode
  from public.karaoke_sessions
  where id = new.session_id;

  if session_mode is null then
    raise exception 'Session not found';
  end if;

  if session_mode = 'SMART'
    and (
      new.singer_1_id is null
      or new.singer_2_id is null
      or cardinality(new.eligible_singer_ids) < 2
    )
  then
    raise exception 'SMART sessions require two eligible singers';
  end if;

  if session_mode = 'RANDOM'
    and (new.singer_1_id is not null or new.singer_2_id is not null)
  then
    raise exception 'RANDOM sessions must not assign singers';
  end if;

  if exists (
    select 1
    from unnest(new.eligible_singer_ids) as eligible(user_id)
    where not exists (
      select 1
      from public.session_members as participant
      where participant.session_id = new.session_id
        and participant.user_id = eligible.user_id
    )
  ) then
    raise exception 'Every eligible singer must participate in the session';
  end if;

  if exists (
    select 1
    from unnest(new.eligible_singer_ids) as eligible(user_id)
    where not exists (
      select 1
      from public.member_songs as known_song
      where known_song.user_id = eligible.user_id
        and known_song.song_id = new.song_id
    )
  ) then
    raise exception 'Every eligible singer must have the song in their playlist';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_session_song_membership() from public;

comment on column public.session_songs.singer_1_id is
  'Assigned first singer in SMART mode; null in RANDOM mode.';
comment on column public.session_songs.singer_2_id is
  'Assigned second singer in SMART mode; null in RANDOM mode.';
comment on column public.session_songs.eligible_singer_ids is
  'Selected session members whose playlists contain this song.';
