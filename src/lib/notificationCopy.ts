/**
 * What each notification says and where tapping it goes. Pure — Lantern
 * feeds it lookups, the drift test walks every type in NOTIFICATION_TYPES
 * through it and fails on any that falls into the "Something happened."
 * bucket.
 *
 * Every destination here must be a real route (App.tsx). Three deliberate
 * degradations: messages land on /messages because no per-thread route
 * exists, cabin events link to the actor's profile while the cabin is
 * flag-hidden (CABIN_ENABLED), and design events land home while the
 * marketplace is flag-hidden (MARKETPLACE_ENABLED) — flipping the flags
 * restores the doors.
 */
import type { NotificationRow } from '@/lib/notificationsApi';

export interface DescribeContext {
  /** Display name for an actor id; falls back to "Someone". */
  actorName: (id: string | null) => string;
  /** Handle for an actor id, when the profile loaded. */
  actorHandle: (id: string | null) => string | null;
  /** Campfire name for a thread id. */
  threadName: (id: string | null) => string | null;
  /** The signed-in viewer's handle (collections live under it). */
  viewerHandle: string | null;
  cabinEnabled: boolean;
  marketplaceEnabled: boolean;
}

export interface Described {
  text: string;
  to: string;
}

export const describeNotification = (n: NotificationRow, ctx: DescribeContext): Described => {
  const name = ctx.actorName(n.actor_id);
  const actorPage = () => {
    const handle = ctx.actorHandle(n.actor_id);
    return handle ? `/${handle}` : '/';
  };
  const postPage = () => (n.post_id ? `/post/${n.post_id}` : '/');
  const campPage = () => (n.camp_id_ref ? `/camps/${n.camp_id_ref}` : '/camps/mine');
  // While the cabin is hidden, cabin events point at the person instead.
  const cabinPage = () => (ctx.cabinEnabled ? '/cabin' : actorPage());
  // While the marketplace is hidden, design events land home.
  const designsPage = () => (ctx.marketplaceEnabled ? '/settings/designs' : '/');

  switch (n.notification_type) {
    case 'circle_request':
      return { text: `${name} wants to be friends.`, to: '/friends' };
    case 'circle_accepted':
      return { text: `${name} accepted your friend request.`, to: actorPage() };
    case 'reply':
      return { text: `${name} replied to your post.`, to: postPage() };
    case 'quote_post':
      return { text: `${name} quoted your post.`, to: postPage() };
    case 'reaction_batch': {
      const others = Math.max(0, (n.aggregate_count ?? 1) - 1);
      const text = others === 0
        ? `${name} reacted to your post.`
        : `${name} and ${others} ${others === 1 ? 'other' : 'others'} reacted to your post.`;
      return { text, to: postPage() };
    }
    case 'campfire_message':
      return { text: `${ctx.threadName(n.campfire_id) ?? 'A conversation'} has a new message.`, to: '/messages' };
    case 'smoke_signal':
      return { text: `${name} waved at you.`, to: actorPage() };
    case 'invite_accepted':
      return { text: `${name} used your invite — welcome them in.`, to: actorPage() };
    case 'collection_subscriber':
      // Collections live under a handle; without the owner there is nowhere
      // specific to go, so send them to their own list.
      return {
        text: `${name} subscribed to your collection.`,
        to: ctx.viewerHandle ? `/${ctx.viewerHandle}/collections` : '/',
      };
    case 'design_purchased':
      return { text: `${name} bought your design.`, to: designsPage() };
    case 'design_approved':
      return { text: 'Your design was approved and is live in the marketplace.', to: designsPage() };
    case 'design_rejected':
      return { text: 'Your design was not approved this time.', to: designsPage() };
    case 'camp_join_request':
      return { text: `${name} asked to join your group.`, to: campPage() };
    case 'camp_join_accepted':
      return { text: 'You were let into a group.', to: campPage() };
    case 'camp_member_joined':
      return { text: `${name} joined your group.`, to: campPage() };
    case 'camp_role_changed':
      return { text: 'Your role in a group changed.', to: campPage() };
    case 'camp_newsletter':
      return { text: `${name} sent a newsletter.`, to: campPage() };
    case 'cabin_knock':
      return { text: `${name} knocked on your door.`, to: cabinPage() };
    case 'cabin_gift':
      return { text: `${name} left a gift on your porch.`, to: cabinPage() };
    case 'cabin_guestbook':
      return { text: `${name} signed your guestbook.`, to: cabinPage() };
    case 'cabin_note':
      return { text: `${name} left you a note.`, to: cabinPage() };
    case 'cabin_trade':
      return { text: `${name} sent you a trade offer.`, to: cabinPage() };
    case 'system':
      return { text: 'A note from the Rangers.', to: '/' };
    case 'inactive_nudge':
      return { text: 'It has been quiet without you — come see what is new.', to: '/' };
    case 'annual_wrapped':
      return { text: 'Your year under the pines is ready.', to: '/' };
    default:
      return { text: 'Something happened.', to: '/' };
  }
};
