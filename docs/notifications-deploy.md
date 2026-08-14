# Notification overhaul — deploy runbook

_Written 2026-08-14 (branch `claude/notification-system-design-ewdaqj`). The
sandbox session that built this could not get approval to run DDL against
prod (`query_database` was denied by the permission classifier and Lovable
`send_message` needed an interactive approval), so unlike previous security
migrations this one is **committed but NOT applied**. Everything below is what
the next session (or Kevin in the Lovable editor) runs, in order._

## Order matters

1. **Apply the migration** (`supabase/migrations/20260815000000_notification_system_overhaul.sql`)
   via `mcp__Lovable__query_database` verbatim, or by pasting into Lovable.
   It is additive and safe under the OLD frontend: legacy client inserts are
   absorbed by the `notify_user` dedupe guard and the reaction upsert index.
2. **Run the exploit test** (`docs/notifications-exploit-test.sql`) — a single
   DO block, rolled back by its final RAISE. Every step prints via NOTICE; it
   must end with `exploit_test_complete_rollback`, and every `FAIL:` notice is
   a blocker.
3. **Run the state checks** below.
4. **Merge + publish the frontend** (Lovable publish). Do NOT publish before
   step 1: the new client no longer inserts notifications itself, so against
   the un-migrated database notifications would silently stop.
5. **Deploy the `send-daily-ember` edge function** (rides with any other
   pending edge deploys; until then the digest slightly undercounts
   reactions — cosmetic).

The one window artifact between steps 1 and 4: the badge starts counting
reaction notifications while the old UI still hides the rows until the Ember
delivers them. Hours-long, harmless — publish promptly.

## Post-apply state checks (query_database)

```sql
-- 4 policies (SELECT/INSERT/UPDATE/DELETE), UPDATE has a WITH CHECK
SELECT policyname, cmd, qual, with_check FROM pg_policies
WHERE schemaname='public' AND tablename='notifications' ORDER BY cmd;

-- both new indexes present
SELECT indexname FROM pg_indexes WHERE tablename='notifications'
  AND indexname IN ('notifications_recipient_created_idx','notifications_reaction_agg_uq');

-- 10 triggers
SELECT tgname, tgrelid::regclass FROM pg_trigger
WHERE tgname LIKE 'trg_notify_%' AND NOT tgisinternal ORDER BY 1;

-- helper + trigger fns are definer with pinned search_path, not client-callable
SELECT proname, prosecdef, proconfig FROM pg_proc
WHERE proname IN ('notify_user') OR proname LIKE 'trg_fn_notify_%';
SELECT has_function_privilege('authenticated',
  'public.notify_user(uuid,uuid,text,uuid,uuid,uuid,uuid)', 'EXECUTE'); -- false

-- authenticated can UPDATE exactly one column: is_read
SELECT column_name FROM information_schema.column_privileges
WHERE table_name='notifications' AND grantee='authenticated' AND privilege_type='UPDATE';

-- constraints carry the full vocabularies (25 notification types, 11 reactions)
SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conname IN ('notifications_notification_type_check','reactions_reaction_type_check');

-- boot state still answers for a member (hard dependency of the whole app)
-- run with a member jwt (see the exploit test's harness) and check
-- profile/roles/unread_notifications are all present.
```

## Kevin's signed-in eyeball list (after publish)

1. React to someone's post from a second account — their badge bumps within
   seconds and Updates shows "X reacted to your post." live. React with a
   third account — the row collapses to "X and 1 other" instead of adding a
   second row. Also try 🫠 / 🙄 / 🌕 — these reactions used to be silently
   dropped by the constraint and should now stick.
2. Reply / quote / friend-request / accept from another account — each shows
   up and its tap lands on the right place (post, profile). Accepting from
   the Updates inline button now notifies the other side too.
3. Redeem a Trail Pass with a fresh account — the inviter gets
   "X used your invite — welcome them in."
4. The ✕ on a row removes just that row; Clear all asks once, then empties
   the list and zeroes the badge; Mark all read still works.
5. On a phone: the 🔔 with the count sits next to the avatar and opens
   /updates; the avatar dropdown shows "Updates (N)" everywhere.
6. Any old cabin/system rows read as real copy, not "Something happened."
7. The /invites nudge and a camp newsletter still send (they are the two
   client-side inserts the tightened policy still allows).
8. Next morning's Daily Ember shows a sane reaction count.
