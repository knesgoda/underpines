import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteOwnFeedback,
  listFeedbackItems,
  listFeedbackVotes,
  setFeedbackStatus,
  submitFeedback,
  toggleFeedbackVote,
  updateOwnFeedback,
  type FeedbackItem,
  type FeedbackStatus,
  type FeedbackType,
  type FeedbackVoteRow,
} from '@/lib/feedbackApi';

/**
 * The Ranger Station board. Two reads (items + votes) folded client-side —
 * the board is small, and sorting by votes is cheaper here than another RPC.
 */

export interface FeedbackBoardItem extends FeedbackItem {
  vote_count: number;
  mine_voted: boolean;
}

/** Exported for the unit test; pure fold, no I/O. */
export const foldVotes = (
  items: FeedbackItem[],
  votes: FeedbackVoteRow[],
  viewerId: string | null,
): FeedbackBoardItem[] => {
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  votes.forEach(v => {
    counts.set(v.item_id, (counts.get(v.item_id) ?? 0) + 1);
    if (viewerId && v.user_id === viewerId) mine.add(v.item_id);
  });
  return items.map(item => ({
    ...item,
    vote_count: counts.get(item.id) ?? 0,
    mine_voted: mine.has(item.id),
  }));
};

export const useFeedbackBoard = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['feedback', user?.id],
    queryFn: async (): Promise<FeedbackBoardItem[]> => {
      const [items, votes] = await Promise.all([listFeedbackItems(), listFeedbackVotes()]);
      return foldVotes(items, votes, user?.id ?? null);
    },
  });
};

const useFeedbackMutation = <TArgs,>(fn: (args: TArgs) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback'] }),
  });
};

export const useSubmitFeedback = () =>
  useFeedbackMutation((args: { type: FeedbackType; title: string; body: string }) =>
    submitFeedback(args.type, args.title, args.body));

export const useToggleVote = () =>
  useFeedbackMutation((itemId: string) => toggleFeedbackVote(itemId));

export const useUpdateOwnFeedback = () =>
  useFeedbackMutation((args: { itemId: string; title: string; body: string }) =>
    updateOwnFeedback(args.itemId, args.title, args.body));

export const useDeleteOwnFeedback = () =>
  useFeedbackMutation((itemId: string) => deleteOwnFeedback(itemId));

export const useSetFeedbackStatus = () =>
  useFeedbackMutation((args: { itemId: string; status: FeedbackStatus; note: string | null }) =>
    setFeedbackStatus(args.itemId, args.status, args.note));
