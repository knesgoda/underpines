import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteOwnFeedback,
  listFeedbackItems,
  listFeedbackVoteCounts,
  listFeedbackVotes,
  setFeedbackStatus,
  submitFeedback,
  toggleFeedbackVote,
  updateOwnFeedback,
  type FeedbackItem,
  type FeedbackStatus,
  type FeedbackType,
  type FeedbackVoteCount,
  type FeedbackVoteRow,
} from '@/lib/feedbackApi';

/**
 * The Ranger Station board. Totals come from an aggregate RPC (voter
 * identities stay private); the viewer's own votes come from the rows RLS
 * still lets them read.
 */

export interface FeedbackBoardItem extends FeedbackItem {
  vote_count: number;
  mine_voted: boolean;
}

/** Exported for the unit test; pure fold, no I/O. */
export const foldVotes = (
  items: FeedbackItem[],
  counts: FeedbackVoteCount[],
  myVotes: FeedbackVoteRow[],
  viewerId: string | null,
): FeedbackBoardItem[] => {
  const countMap = new Map<string, number>();
  counts.forEach(c => countMap.set(c.item_id, c.vote_count));
  const mine = new Set<string>();
  myVotes.forEach(v => {
    if (viewerId && v.user_id === viewerId) mine.add(v.item_id);
  });
  return items.map(item => ({
    ...item,
    vote_count: countMap.get(item.id) ?? 0,
    mine_voted: mine.has(item.id),
  }));
};

export const useFeedbackBoard = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['feedback', user?.id],
    queryFn: async (): Promise<FeedbackBoardItem[]> => {
      const [items, counts, myVotes] = await Promise.all([
        listFeedbackItems(),
        listFeedbackVoteCounts(),
        listFeedbackVotes(),
      ]);
      return foldVotes(items, counts, myVotes, user?.id ?? null);
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
