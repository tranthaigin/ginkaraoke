import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../supabase/migrations/20260919061730_20260919_authenticated_model.sql', import.meta.url), 'utf8');
const hardeningSql = readFileSync(new URL('../../supabase/migrations/20260919062215_20260919_remote_hardening.sql', import.meta.url), 'utf8');

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
});
