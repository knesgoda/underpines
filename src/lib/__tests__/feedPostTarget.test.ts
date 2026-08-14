import { describe, expect, it } from 'vitest';
import { feedPostTarget } from '@/hooks/useFeedPosts';
import type { PostWithAuthor } from '@/components/feed/PostCard';

/**
 * Camp posts live in camp_posts, not posts: they have no /post/:id detail
 * page and their ids must never be treated as posts ids. Opening one goes to
 * its camp; a regular post goes to its detail page. This pins the
 * discrimination the feed's onOpen and reaction slot both rely on.
 */

const post = (overrides: Partial<PostWithAuthor>): PostWithAuthor => ({
  id: 'p1',
  author_id: 'a1',
  post_type: 'spark',
  content: 'hi',
  title: null,
  is_published: true,
  is_quote_post: false,
  quoted_post_id: null,
  created_at: '2026-08-14T00:00:00Z',
  ...overrides,
});

describe('feedPostTarget', () => {
  it('regular posts open their detail page', () => {
    expect(feedPostTarget(post({}))).toBe('/post/p1');
  });

  it('camp posts open their camp, never /post/:id', () => {
    expect(feedPostTarget(post({ _isCampPost: true, _campId: 'c9' }))).toBe('/camps/c9');
  });

  it('a camp post missing its camp id still stays out of /post/:id', () => {
    expect(feedPostTarget(post({ _isCampPost: true }))).toBe('/camps/mine');
  });
});
