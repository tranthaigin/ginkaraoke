-- Enforce the selected session mode at the database boundary. SMART sessions
-- remain duet-only; RANDOM sessions may explicitly contain solo entries.

create or replace function private.validate_recommendation_batch_mode()
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

  if new.selection_mode <> session_mode then
    raise exception 'Recommendation batch mode must match its session';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_recommendation_batch_mode() from public;

drop trigger if exists recommendation_batches_validate_mode on public.recommendation_batches;
create trigger recommendation_batches_validate_mode
before insert or update of session_id, selection_mode
on public.recommendation_batches
for each row execute function private.validate_recommendation_batch_mode();

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
    and (new.singer_2_id is null or cardinality(new.eligible_singer_ids) < 2)
  then
    raise exception 'SMART sessions require two eligible singers';
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
