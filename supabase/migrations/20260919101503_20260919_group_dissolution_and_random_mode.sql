-- Add an owner-only group dissolution RPC and an explicit random session mode.
-- Random sessions may contain solo songs, while SMART sessions continue to use
-- the existing two-valid-singer recommendation engine.

alter table public.karaoke_sessions
  add column if not exists selection_mode text not null default 'SMART';

alter table public.karaoke_sessions
  add constraint karaoke_sessions_selection_mode_check
  check (selection_mode in ('SMART', 'RANDOM'));

alter table public.recommendation_batches
  add column if not exists selection_mode text not null default 'SMART';

alter table public.recommendation_batches
  add constraint recommendation_batches_selection_mode_check
  check (selection_mode in ('SMART', 'RANDOM'));

alter table public.session_songs
  alter column singer_2_id drop not null;

-- Replace the original duet-only checks with checks that also permit an
-- explicitly surfaced solo entry in RANDOM mode.
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
        pg_get_constraintdef(oid) ilike '%singer_2_id%'
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
    check (singer_2_id is null or singer_1_id <> singer_2_id),
  add constraint session_songs_singer_2_eligible_check
    check (singer_2_id is null or singer_2_id = any(eligible_singer_ids)),
  add constraint session_songs_eligible_count_check
    check (cardinality(eligible_singer_ids) >= 1);

drop policy if exists session_songs_insert on public.session_songs;
create policy session_songs_insert on public.session_songs for insert to authenticated
with check (
  private.can_access_session(session_id)
  and exists (
    select 1
    from public.session_members
    where session_id = session_songs.session_id
      and user_id = singer_1_id
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

create or replace function public.dissolve_group(target_group uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.groups
    where id = target_group
  ) then
    raise exception 'Group not found';
  end if;

  if not private.is_group_owner(target_group) then
    raise exception 'Only the group owner can dissolve this group';
  end if;

  delete from public.groups
  where id = target_group
    and owner_id = auth.uid();
end;
$$;

revoke all on function public.dissolve_group(uuid) from public;
grant execute on function public.dissolve_group(uuid) to authenticated;
