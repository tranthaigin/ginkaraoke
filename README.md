# GinKaraoke

Mobile-first shared karaoke companion built with React, TypeScript, Vite, Supabase Auth/PostgreSQL/Realtime, and a PWA service worker. Each person owns a private-to-edit song list; group members can use the shared knowledge graph to generate valid, fair duet queues.

Production URL: <https://tranthaigin.github.io/ginkaraoke/>

## Product flow

1. Sign in with Google through Supabase Auth.
2. Confirm a display profile, then create a group or join with a code.
3. Maintain your own songs, favorites, and priorities.
4. Create a Karaoke Session and select only the friends attending.
5. Choose Smart mode for valid, fair duet assignments, or Random mode for up to 50 songs sampled from the selected members' playlists without assigning performers.
6. Mark songs played, undo, remove, or move them upward. Generate another batch without repeating queued or played songs.
7. After all unused songs are exhausted, recycling is available only after explicit confirmation.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm ci
```

Create an ignored `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
```

Only the browser-safe publishable key belongs in Vite. Never use a `service_role` key, database password, Google Client Secret, or other private credential in frontend environment variables.

```bash
npm run dev
```

The development app is available at <http://localhost:5173>. Missing configuration produces a clear setup screen; it never silently switches to a second LocalStorage database.

The login screen also exposes an explicitly labelled demo experience. Demo repositories keep sample data in memory and are isolated from Supabase; LocalStorage stores only the user's explicit demo-mode choice. Demo writes are temporary and are never presented as cloud persistence.

## Supabase setup and migration

The target project is `Karaokegroup`. Apply migrations in timestamp order with the Supabase CLI or SQL editor:

1. `supabase/migrations/20260919061727_20260915_init.sql` represents the legacy demo model.
2. `supabase/migrations/20260919061730_20260919_authenticated_model.sql` preserves those tables under `legacy_*`, revokes their API access, and creates the authenticated final model.
3. `supabase/migrations/20260919062215_20260919_remote_hardening.sql` backfills pre-migration Auth users and tightens queue relationships, mutable columns, and singer eligibility.
4. Later feature migrations add group dissolution, session selection modes, and enforce that Random queues store playlist sources without assigning singers.

For a fresh environment, apply all files. The resulting schema creates:

- `profiles`, `groups`, `group_members`
- canonical `songs` and owned `member_songs`
- `karaoke_sessions`, participant snapshots, recommendation batches, and persisted queue entries
- restrictive RLS policies based on `auth.uid()` and membership
- protected group create/join/removal RPCs
- Auth profile trigger and Realtime publication entries

Generated production schema types are checked in at `src/types/database.ts` and are used by the Supabase client.

The optional `supabase/seed.sql` seeds only canonical songs. It intentionally does not fabricate Auth users, profiles, memberships, or ownership.

Google provider configuration belongs in Supabase. Required redirect URLs:

- `http://localhost:5173/**`
- `https://tranthaigin.github.io/ginkaraoke/**`

Google's OAuth callback remains the Supabase callback shown in the provider setup, not a GitHub Pages URL.

## Recommendation engine

`src/services/recommendation/engine.ts` is independent of React and Supabase. Compatibility has the dominant weight. The engine then applies centralized favorite/priority, partner diversity, turn fairness, rest, repeated-pair, consecutive-singer, and weak recent-history signals.

Normal batches exclude every song already queued or played in the current session. State from earlier batches contributes to pair/turn fairness. Solo-only songs are excluded from the main duet queue. Recycle mode is an explicit input and never activates automatically.

Random mode uses a uniform shuffle over distinct songs in the union of the selected attendees' playlists. It ignores compatibility, priority, favorites, and turn scoring, and never assigns singers. Each queue row retains the selected members whose playlists contain the song so the UI can show its source on demand. An active Smart room can add a Random batch without ending or recreating the session; assignment rules are enforced per batch in PostgreSQL.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
# or all four
npm run check
```

Tests cover Vietnamese normalization and the required A/B/C/D/E queue acceptance scenarios, including valid pairs, fairness across batches, 50-item limits, reservation semantics, exhaustion, explicit recycle, and fresh-session reset.

## GitHub Pages deployment

`.github/workflows/deploy.yml` installs with `npm ci`, validates public configuration, typechecks, lints, tests, builds, and deploys only after checks pass. Configure these repository **Variables** under Settings → Secrets and variables → Actions:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Then select GitHub Actions as the Pages source. Vite uses `/ginkaraoke/` in production, the manifest/service worker use the same scope, and HashRouter avoids project-site refresh 404s.

## Offline behavior

The PWA caches the application shell and static assets. An offline badge is shown immediately. Cloud reads already rendered remain visible, but writes are blocked with an honest warning; GinKaraoke does not claim an unsynced change succeeded and does not treat LocalStorage as an authoritative database.

## Security notes

- All user/group/session tables have RLS.
- Playlist writes require `user_id = auth.uid()`.
- Group/session reads require membership; joining by code is a narrow `SECURITY DEFINER` RPC with an empty `search_path`.
- Smart-mode singer IDs must be distinct, selected session members, and members of the persisted eligible-singer array. Random-mode queue rows must leave both singer IDs empty.
- The group owner cannot silently edit other users' playlists.
- Old JSON ownership restore was removed because it was incompatible with authenticated cloud ownership and could become an authorization bypass.
