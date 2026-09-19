-- Allow an active karaoke room to add either SMART or RANDOM batches.
-- Singer assignment rules are enforced from the batch mode, so one session can
-- safely contain smart duet recommendations and unassigned random songs.

drop trigger if exists recommendation_batches_validate_mode
on public.recommendation_batches;

drop function if exists private.validate_recommendation_batch_mode();

create or replace function private.validate_session_song_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch_mode text;
begin
  select selection_mode
  into batch_mode
  from public.recommendation_batches
  where id = new.batch_id
    and session_id = new.session_id;

  if batch_mode is null then
    raise exception 'Recommendation batch not found for session';
  end if;

  if batch_mode = 'SMART'
    and (
      new.singer_1_id is null
      or new.singer_2_id is null
      or cardinality(new.eligible_singer_ids) < 2
    )
  then
    raise exception 'SMART batches require two eligible singers';
  end if;

  if batch_mode = 'RANDOM'
    and (new.singer_1_id is not null or new.singer_2_id is not null)
  then
    raise exception 'RANDOM batches must not assign singers';
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

comment on column public.recommendation_batches.selection_mode is
  'Generation mode for this batch; may differ from the session default mode.';
