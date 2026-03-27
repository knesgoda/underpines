

# Comprehensive Code Review — Under Pines

## Summary

The codebase is well-structured overall, with good separation of concerns, proper theming, and thoughtful UX patterns. However, there are several issues ranging from **critical security vulnerabilities** to **scalability concerns** and **minor bugs** that should be addressed before a large user influx.

---

## Critical Issues

### 1. XSS Vulnerability in PostDetail.tsx
**File:** `src/pages/PostDetail.tsx` line 208
Story content is rendered with `dangerouslySetInnerHTML` **without DOMPurify sanitization**:
```tsx
dangerouslySetInnerHTML={{ __html: post.content || '' }}
```
The newsletter pages correctly use `DOMPurify.sanitize()`, but PostDetail does not. Any user who writes a "story" post can inject arbitrary JavaScript.

**Fix:** Wrap with `DOMPurify.sanitize(post.content || '')`.

### 2. Race Condition in AuthContext
**File:** `src/contexts/AuthContext.tsx`
`onAuthStateChange` and `getSession()` both call `setLoading(false)`. If `getSession()` resolves before the auth listener fires, the app may briefly render with stale state. The listener should be set up first, and `getSession()` should only serve as a fallback.

**Fix:** Set `getSession()` inside the subscription callback pattern, or gate it so it only fires if the listener hasn't already fired.

### 3. RevenueCat Test API Key Hardcoded
**File:** `src/contexts/RevenueCatContext.tsx` line 6
```tsx
const RC_API_KEY = 'test_yDcyukMSOIftLUVEMPyBENdGhaN';
```
This is a test key committed to source. For production it should be an environment variable, and you need a production key before launch.

---

## High-Priority Issues

### 4. Feed Query Scalability — `.in()` with large arrays
**File:** `src/pages/Feed.tsx` lines 128-136
The feed loads all circle IDs into an array then uses `.in('author_id', allowedAuthorIds)`. Supabase/PostgREST has a practical URL-length limit. A user with 500+ circles will hit this limit and the query will fail silently or error.

**Fix:** Move feed assembly to a database function or an RPC call that joins circles server-side.

### 5. No QueryClient Configuration
**File:** `src/App.tsx` line 67
```tsx
const queryClient = new QueryClient();
```
Default config means no stale time, no retry limit tuning, no garbage collection control. Under heavy use, every navigation re-fetches everything.

**Fix:** Configure `defaultOptions` with sensible stale times (e.g. 5 min), retry limits, and GC time.

### 6. Index.tsx Calls `navigate()` During Render
**File:** `src/pages/Index.tsx` lines 12-15
```tsx
if (!loading && user) {
  navigate('/cabin');
  return null;
}
```
Calling `navigate()` during render is a React anti-pattern that causes warnings and potential infinite loops.

**Fix:** Move to a `useEffect`.

### 7. ReportSheet — Race Condition in Triage
**File:** `src/components/reporting/ReportSheet.tsx` lines 72-74
After inserting a report, the code immediately queries for the latest report by `created_at` to get its ID for triage. Under concurrent load, this could return the wrong report.

**Fix:** Use the returned `id` from the insert's `.select('id').single()` chain directly.

---

## Medium-Priority Issues

### 8. Missing Error Boundaries
No React error boundaries exist anywhere. A single component crash (e.g., in a creature animation or seasonal layer) takes down the entire app.

**Fix:** Add an `<ErrorBoundary>` wrapper around `AppLayout` children at minimum.

### 9. Optimistic Post ID Mismatch (SparkComposer)
**File:** `src/components/feed/SparkComposer.tsx` lines 100-133
The optimistic post uses a client-generated `crypto.randomUUID()` as its `id`, but the actual inserted post gets a different server-generated ID. The optimistic post is never replaced with the real one — it stays in the feed with the wrong ID until a refresh. This means reactions, replies, and links to the post will fail.

**Fix:** After successful insert, replace the optimistic post in the feed state with the real `data` from Supabase.

### 10. Feed Doesn't Use IndexedDB Cache
`feedCache.ts` exists with `cacheFeedPosts` / `getCachedFeedPosts`, but `Feed.tsx` never calls either function. The offline-first promise is unfulfilled.

**Fix:** Call `getCachedFeedPosts()` on mount for instant display, then refresh from network. Call `cacheFeedPosts()` after loading.

### 11. No Pagination / Infinite Scroll
**File:** `src/pages/Feed.tsx` line 137
Feed is hard-capped at 50 posts with no way to load more. As users post more, older content becomes unreachable.

**Fix:** Implement cursor-based pagination or infinite scroll.

### 12. Reply Content Not Sanitized
**File:** `src/components/feed/ReplyThread.tsx`
Reply content is rendered as plain text via `{reply.content}`, which is safe from XSS. However, there's no length limit on reply input — users can submit arbitrarily long replies.

**Fix:** Add a character limit (e.g., 500 chars) to the reply textarea.

---

## Low-Priority / Polish Issues

### 13. Unused `phone` State in StepVerify
The verify step has phone input state and a code verification UI that's never actually used — the flow skips straight to account creation. Dead code should be removed to avoid confusion.

### 14. LandingRedirect Component Returns `null`
**File:** `src/pages/Feed.tsx` line 533-536
When `!user`, Feed renders `<LandingRedirect />` which just returns `null`. But `HomePage.tsx` already handles this by showing `<Index />`. This is dead code.

### 15. `as any` Type Assertions
Multiple files use `as any` to bypass TypeScript (`profiles.update`, `replies.insert`, etc.). This masks type errors that could cause runtime failures.

### 16. Reaction Change is Non-Optimistic
`ReactionBar.tsx` awaits the database operation before calling `onReactionChange()`, making reactions feel sluggish. Should update UI immediately and revert on error.

### 17. `scrollTimerRef` in Feed Never Resets on Route Change
If a user navigates away and back, the scroll timer keeps counting from where it left off, potentially showing the nudge immediately.

---

## Recommended Implementation Order

1. **Fix XSS in PostDetail** — security, 1 line change
2. **Fix navigate-during-render in Index.tsx** — stability
3. **Fix ReportSheet race condition** — data integrity
4. **Add RevenueCat production key as env var** — launch blocker
5. **Configure QueryClient defaults** — performance
6. **Add Error Boundary** — resilience
7. **Fix optimistic post ID mismatch** — UX correctness
8. **Wire up feed cache** — offline experience
9. **Fix AuthContext race condition** — edge case stability
10. **Plan feed query scalability** — future-proofing for large user base
11. **Add pagination** — content accessibility
12. **Clean up dead code** — maintenance

---

## Technical Details

All fixes are in the React frontend layer. No database migrations are needed. The most impactful single fix is the DOMPurify sanitization in PostDetail.tsx — it's a one-line change that closes a real XSS vector. The feed scalability issue (#4) is the most architecturally significant but only becomes urgent at ~500+ circle connections per user.

