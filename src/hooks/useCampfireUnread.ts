import { useNavigation } from '@/contexts/NavigationContext';

/**
 * Returns true if there are campfire messages newer than the user's last visit
 * to /campfires, and a way to mark them seen.
 *
 * The state itself lives in NavigationContext. Both nav bars are mounted at
 * all times — only CSS hides one — so running the query chain and realtime
 * subscription per component meant doing all of it twice on every load.
 */
export const useCampfireUnread = () => {
  const { hasUnreadCampfires, markCampfiresSeen } = useNavigation();
  return { hasUnread: hasUnreadCampfires, markSeen: markCampfiresSeen };
};
