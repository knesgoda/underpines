

## Problem

The `camps` table has a **missing RLS SELECT policy for hidden camps and for the firekeeper's own camps**. Here are the existing SELECT policies:

1. **"Ember camps visible to authenticated"** — matches only `visibility = 'ember'`
2. **"Open camps visible to all authenticated"** — matches `visibility = 'open'` OR the user is already a `camp_members` row

When creating a camp, the code does `.insert(...).select().single()` — which requires **SELECT** permission on the newly inserted row. But the `camp_members` row hasn't been created yet (it's inserted afterward), so:

- **Hidden camps**: Neither policy matches → SELECT fails → `camp` is null → "Could not create camp" error → camp_members and bonfire are never created, leaving an orphaned camp row.
- **Open/Ember camps**: These work because the visibility-based policies match. But if someone picks "Hidden," it always fails.

## Fix

**Add one new RLS SELECT policy** on `camps` so the firekeeper can always see their own camps:

```sql
CREATE POLICY "Firekeeper can read own camps"
  ON public.camps
  FOR SELECT
  TO authenticated
  USING (firekeeper_id = auth.uid());
```

This single policy covers all visibility types for the camp creator and also fixes the existing gap where a firekeeper of a hidden camp can't manage it.

No code changes needed — the `CreateCamp.tsx` logic is correct once RLS allows the read-back.

## Technical details

- **One migration** adding the SELECT policy
- No changes to existing policies (they remain for other users' access)
- No application code changes required

