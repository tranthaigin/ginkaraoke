import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../supabase/migrations/20260919061730_20260919_authenticated_model.sql', import.meta.url), 'utf8');
const hardeningSql = readFileSync(new URL('../../supabase/migrations/20260919062215_20260919_remote_hardening.sql', import.meta.url), 'utf8');
const featureSql = readFileSync(new URL('../../supabase/migrations/20260919101503_20260919_group_dissolution_and_random_mode.sql', import.meta.url), 'utf8');
const modeGuardSql = readFileSync(new URL('../../supabase/migrations/20260919110253_enforce_session_selection_mode.sql', import.meta.url), 'utf8');
const randomQueueSql = readFileSync(new URL('../../supabase/migrations/20260919193000_random_song_queue_without_assignments.sql', import.meta.url), 'utf8');

describe('authenticated migration security contract', () => {
  it('enables RLS on every exposed application table', () => {
    for (const table of [
      'profiles', 'groups', 'group_members', 'songs', 'member_songs',
      'karaoke_sessions', 'session_members', 'recommendation_batches', 'session_songs',
    ]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it('authorizes owned playlists with auth.uid()', () => {
    expect(sql).toContain('with check (user_id = auth.uid())');
    expect(sql).toContain('using (user_id = auth.uid())');
  });

  it('protects join-by-code behind a narrow security definer RPC', () => {
    expect(sql).toMatch(/function public\.join_group_by_code[\s\S]+security definer set search_path = ''/);
    expect(sql).toContain('grant execute on function public.join_group_by_code(text) to authenticated');
  });

  it('does not grant anonymous access in the final model', () => {
    expect(sql).not.toMatch(/create policy[\s\S]{0,160}\bto anon\b/i);
    expect(sql).not.toContain('with check (true)');
  });

  it('backfills users who authenticated before the profile trigger existed', () => {
    expect(hardeningSql).toContain('from auth.users as users');
    expect(hardeningSql).toContain('on conflict (id) do nothing');
  });

  it('binds queue rows to their batch, participants, and known song owners', () => {
    expect(hardeningSql).toContain('foreign key (batch_id, session_id)');
    expect(hardeningSql).toContain('session_songs_singer_1_membership_fkey');
    expect(hardeningSql).toContain('session_songs_singer_2_membership_fkey');
    expect(hardeningSql).toContain('Every eligible singer must have the song in their playlist');
  });

  it('limits client updates to mutable group, session, and queue fields', () => {
    expect(hardeningSql).toContain('grant update (name) on public.groups to authenticated');
    expect(hardeningSql).toContain('grant update (name, status, ended_at) on public.karaoke_sessions to authenticated');
    expect(hardeningSql).toContain('grant update (state, queue_position, played_at) on public.session_songs to authenticated');
  });

  it('limits permanent group dissolution to the authenticated owner', () => {
    expect(featureSql).toMatch(/function public\.dissolve_group[\s\S]+security definer[\s\S]+set search_path = ''/);
    expect(featureSql).toContain('if not private.is_group_owner(target_group)');
    expect(featureSql).toContain('grant execute on function public.dissolve_group(uuid) to authenticated');
  });

  it('introduces random mode without weakening participant validation', () => {
    expect(featureSql).toContain("check (selection_mode in ('SMART', 'RANDOM'))");
    expect(featureSql).toContain('alter column singer_2_id drop not null');
    expect(featureSql).toContain('user_id = singer_1_id');
    expect(featureSql).toContain('singer_2_id is null');
  });

  it('keeps smart sessions duet-only and binds every batch to its session mode', () => {
    expect(modeGuardSql).toContain("session_mode = 'SMART'");
    expect(modeGuardSql).toContain('new.singer_2_id is null');
    expect(modeGuardSql).toContain('SMART sessions require two eligible singers');
    expect(modeGuardSql).toContain('Recommendation batch mode must match its session');
    expect(modeGuardSql).toContain('recommendation_batches_validate_mode');
  });

  it('stores random songs without assigning performers while preserving playlist ownership', () => {
    expect(randomQueueSql).toContain('alter column singer_1_id drop not null');
    expect(randomQueueSql).toContain("session_mode = 'SMART'");
    expect(randomQueueSql).toContain("session_mode = 'RANDOM'");
    expect(randomQueueSql).toContain('RANDOM sessions must not assign singers');
    expect(randomQueueSql).toContain('cardinality(eligible_singer_ids) >= 1');
    expect(randomQueueSql).toContain('Every eligible singer must have the song in their playlist');
  });
});
