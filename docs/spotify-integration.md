# Listening: what ships now, and what Spotify needs

Listening works today through deliberate sharing. Live Spotify status is the
one part that cannot be built here, because it depends on an approval nobody
on this side controls. This is what is already in place, what has to happen
externally, and exactly where the live path plugs in.

## What already works

- `now_playing` — one row per person: track, artist, album, artwork, link,
  progress, `is_live`, `is_sharing`, `audience`. RLS gates reads on sharing
  state, audience, friendship, shared group membership and blocks.
- `listening_connections` — linked services and, for Spotify, the tokens. **No
  public read policy at all.** Only the owner and the service role can read it.
  That separation is the reason there are two tables; do not merge them.
- `/listening` — share a track, pause or resume, choose the audience, clear it,
  connect and disconnect services.
- `MyPage` shows what someone has on when they are sharing and RLS permits it.
- `src/hooks/useListening.ts` — all reads and writes.

Sharing defaults to **off**. Nothing is broadcast until someone turns it on.

## What only you can do

Live status needs a Spotify application and, for the endpoint we want,
Spotify's extended-API review. That review is an external approval with a real
lead time — commonly weeks — so it is worth starting before the code that
consumes it exists.

1. Create an app at <https://developer.spotify.com/dashboard>.
2. Add the redirect URI: `https://<your-domain>/auth/spotify/callback`.
3. Request the `user-read-currently-playing` and `user-read-playback-state`
   scopes. These are the ones behind the extended-API review.
4. Submit for extended API access. Describe the use plainly: showing a member's
   current track to the audience they choose, no public history, no
   advertising, no derived profiling. That is accurate and it is also what
   reviewers are checking for.
5. When approved, set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` as edge
   function secrets.

Apple Music and YouTube need nothing. Neither exposes a server-side
now-playing API, so both are manual shares by design rather than by omission —
that is not a gap waiting to be filled.

## Where the live path plugs in

Three pieces, none of which change anything that already exists:

**1. `supabase/functions/spotify-callback`** — exchange the OAuth code, then
write one row:

```ts
await supabase.from('listening_connections').upsert({
  user_id, provider: 'spotify',
  access_token, refresh_token, token_expires_at, provider_account_id,
}, { onConflict: 'user_id,provider' });
```

The unique index on `(user_id, provider)` already exists for this.

**2. `supabase/functions/poll-spotify`** — a cron job, service role. For each
Spotify connection: refresh the token if `token_expires_at` has passed, call
`/v1/me/player/currently-playing`, and upsert `now_playing` with
**`is_live: true`**. When playback stops, delete the row rather than leaving a
stale track on someone's page.

Do not have the poller touch `is_sharing` or `audience`. Those are the
member's settings, and a poller overwriting them would silently broadcast
something they had paused.

**3. The client needs no change.** `useNowPlaying` already reads whatever is
in the row, `Listening.tsx` already renders the "Live" chip when `is_live` is
true, and `MyPage` already shows it. The only edit worth making is turning the
Connect button for Spotify into a link to the OAuth flow instead of the direct
insert it does now — `useListeningActions().connect` has a comment marking
that spot.

## Two things to get right

**Token storage.** `listening_connections` has no reader policy. When you add
the edge functions, use the service role, and do not add a policy to make
local testing easier — a refresh token is a durable credential.

**Stopping means stopping.** If someone pauses sharing, the poller must not
resurrect it. `is_sharing` is the member's switch; `is_live` describes where
the data came from. Keeping those two separate is what makes "pause" mean what
it says.
