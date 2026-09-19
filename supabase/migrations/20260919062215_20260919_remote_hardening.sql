-- Remote hardening discovered during the authenticated-model production audit.
-- Backfill users that authenticated before the profiles trigger existed, tighten
-- cross-table queue integrity, and limit client updates to mutable fields only.

insert into public.profiles (id, display_name, avatar_url)
select
  users.id,
  left(
    coalesce(
      nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
      'Singer'
    ),
    80
  ),
  nullif(users.raw_user_meta_data ->> 'avatar_url', '')
from auth.users as users
on conflict (id) do nothing;

alter table public.recommendation_batches
  add constraint recommendation_batches_id_session_key unique (id, session_id);

alter table public.session_songs
  drop constraint session_songs_batch_id_fkey,
  add constraint session_songs_batch_session_fkey
    foreign key (batch_id, session_id)
    references public.recommendation_batches(id, session_id)
    on delete cascade,
  add constraint session_songs_singer_1_membership_fkey
    foreign key (session_id, singer_1_id)
    references public.session_members(session_id, user_id)
    on delete restrict,
  add constraint session_songs_singer_2_membership_fkey
    foreign key (session_id, singer_2_id)
    references public.session_members(session_id, user_id)
    on delete restrict,
  add constraint session_songs_state_timestamp_check check (
    (state = 'QUEUED' and played_at is null)
    or (state = 'PLAYED' and played_at is not null)
  );

alter table public.karaoke_sessions
  add constraint karaoke_sessions_status_timestamp_check check (
    (status = 'active' and ended_at is null)
    or (status = 'completed' and ended_at is not null)
  );

create or replace function private.validate_session_song_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

drop trigger if exists session_songs_validate_membership on public.session_songs;
create trigger session_songs_validate_membership
before insert or update of session_id, song_id, singer_1_id, singer_2_id, eligible_singer_ids
on public.session_songs
for each row execute function private.validate_session_song_membership();

drop policy if exists groups_update_owner on public.groups;
create policy groups_update_owner on public.groups for update to authenticated
using (private.is_group_owner(id))
with check (owner_id = auth.uid());

revoke update on public.groups from authenticated;
grant update (name) on public.groups to authenticated;

revoke update on public.karaoke_sessions from authenticated;
grant update (name, status, ended_at) on public.karaoke_sessions to authenticated;

revoke update on public.session_songs from authenticated;
grant update (state, queue_position, played_at) on public.session_songs to authenticated;
