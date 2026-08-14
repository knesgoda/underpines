/**
 * Ranger Station (member feedback board) client wrappers.
 *
 * Reads go through RLS (any member can read every item and vote). Writes go
 * only through SECURITY DEFINER RPCs that re-check everything server-side —
 * submission rate limits, author-only edits, ranger-only status moves.
 * Nothing here grants anything; it only shapes requests.
 */
import { supabase } from '@/integrations/supabase/client';

// New tables aren't in the generated Database types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type FeedbackType = 'feature' | 'bug';
export type FeedbackStatus = 'open' | 'planned' | 'in_progress' | 'done' | 'declined';

export const FEEDBACK_STATUSES: FeedbackStatus[] = [
  'open',
  'planned',
  'in_progress',
  'done',
  'declined',
];

export const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: 'Open',
  planned: 'Planned',
  in_progress: 'In progress',
  done: 'Done',
  declined: 'Declined',
};

export const TYPE_LABELS: Record<FeedbackType, string> = {
  feature: 'Feature request',
  bug: 'Bug report',
};

export interface FeedbackItem {
  id: string;
  author_id: string;
  item_type: FeedbackType;
  title: string;
  body: string;
  status: FeedbackStatus;
  ranger_note: string | null;
  created_at: string;
  updated_at: string;
  author?: { handle: string; display_name: string } | null;
}

export interface FeedbackVoteRow {
  item_id: string;
  user_id: string;
}

/** What the RPCs answer: success or a machine-readable reason. */
export interface RpcResult {
  success: boolean;
  error?: string;
  item_id?: string;
  voted?: boolean;
  vote_count?: number;
}

/** Human copy for the errors a member can actually run into. */
export const RPC_ERROR_COPY: Record<string, string> = {
  rate_limited: 'Five a day is the limit — bring the rest tomorrow.',
  invalid_title: 'The title needs to be between 3 and 120 characters.',
  invalid_body: 'The details need to be between 1 and 4000 characters.',
  not_editable: 'This one has already been picked up and can no longer be edited.',
  not_deletable: 'This one has already been picked up and can no longer be removed.',
  not_allowed: 'Only Rangers can move items on the board.',
};

export const rpcErrorMessage = (error?: string) =>
  (error && RPC_ERROR_COPY[error]) || 'That did not go through.';

export const listFeedbackItems = async (): Promise<FeedbackItem[]> => {
  const { data, error } = await db
    .from('feedback_items')
    .select('*, author:profiles(handle, display_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FeedbackItem[];
};

export const listFeedbackVotes = async (): Promise<FeedbackVoteRow[]> => {
  const { data, error } = await db.from('feedback_votes').select('item_id, user_id');
  if (error) throw error;
  return (data ?? []) as FeedbackVoteRow[];
};

export const submitFeedback = async (
  type: FeedbackType,
  title: string,
  body: string,
): Promise<RpcResult> => {
  const { data, error } = await db.rpc('submit_feedback', {
    _type: type,
    _title: title,
    _body: body,
  });
  if (error) throw error;
  return data as RpcResult;
};

export const toggleFeedbackVote = async (itemId: string): Promise<RpcResult> => {
  const { data, error } = await db.rpc('toggle_feedback_vote', { _item_id: itemId });
  if (error) throw error;
  return data as RpcResult;
};

export const updateOwnFeedback = async (
  itemId: string,
  title: string,
  body: string,
): Promise<RpcResult> => {
  const { data, error } = await db.rpc('update_own_feedback', {
    _item_id: itemId,
    _title: title,
    _body: body,
  });
  if (error) throw error;
  return data as RpcResult;
};

export const deleteOwnFeedback = async (itemId: string): Promise<RpcResult> => {
  const { data, error } = await db.rpc('delete_own_feedback', { _item_id: itemId });
  if (error) throw error;
  return data as RpcResult;
};

export const setFeedbackStatus = async (
  itemId: string,
  status: FeedbackStatus,
  note: string | null,
): Promise<RpcResult> => {
  const { data, error } = await db.rpc('set_feedback_status', {
    _item_id: itemId,
    _status: status,
    _note: note,
  });
  if (error) throw error;
  return data as RpcResult;
};
