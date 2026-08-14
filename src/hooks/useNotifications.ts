import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import {
  clearAllNotifications,
  dismissNotification,
  fetchNotifications,
  markAllRead,
  mergePages,
  type NotificationsPage,
} from '@/lib/notificationsApi';

/**
 * The Updates page's data. Pages merge into one flat, deduped view; the
 * cursor is the last row's created_at (keyset, not offset, so a realtime
 * insert can't shift rows between pages).
 */
export const useNotifications = () => {
  const { user } = useAuth();

  const query = useInfiniteQuery({
    queryKey: ['updates', user?.id],
    enabled: !!user,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchNotifications(user!.id, pageParam),
    getNextPageParam: (last: NotificationsPage) => last.nextBefore,
  });

  const merged = query.data ? mergePages(query.data.pages) : null;
  return { ...query, merged };
};

/** Invalidate the list and re-count the badge after any mutation. */
const useNotificationsMutation = <TArgs,>(fn: (args: TArgs) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  const { refreshNotifications } = useNavigation();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['updates'] });
      refreshNotifications();
    },
  });
};

export const useDismissNotification = () =>
  useNotificationsMutation((id: string) => dismissNotification(id));

export const useClearAllNotifications = () => {
  const { user } = useAuth();
  return useNotificationsMutation(() => clearAllNotifications(user!.id));
};

export const useMarkAllRead = () => {
  const { user } = useAuth();
  return useNotificationsMutation(() => markAllRead(user!.id));
};
