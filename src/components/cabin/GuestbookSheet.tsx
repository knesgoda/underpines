/**
 * The guestbook by the door (spec §29). Visitors sign it if the owner
 * allows; the owner can hide or remove entries. No counts, no rankings —
 * just names and small sentences.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import CabinSheet from './CabinSheet';
import UserAvatar from '@/components/UserAvatar';
import StatePanel from '@/components/StatePanel';
import { formatTimeAgo } from '@/lib/time';
import { useGuestbook, useCabinInvalidate } from '@/hooks/useCabin';
import { signGuestbook } from '@/lib/cabinApi';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const ERRORS: Record<string, string> = {
  rate_limited: 'The guestbook needs a rest — try again tomorrow.',
  not_allowed: 'The guestbook is closed to you right now.',
};

const GuestbookSheet = ({
  open, onClose, ownerId, ownerName, canSign, isOwner,
}: {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  ownerName: string;
  canSign: boolean;
  isOwner: boolean;
}) => {
  const { data: entries, isLoading, isError } = useGuestbook(ownerId, open);
  const invalidate = useCabinInvalidate();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const sign = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await signGuestbook(ownerId, text.trim());
      if (!res.success) {
        toast.error(ERRORS[res.error ?? ''] ?? 'Could not sign the guestbook.');
      } else {
        setText('');
        toast.success('Signed.');
        invalidate(['cabin-guestbook']);
      }
    } catch {
      toast.error('Could not sign the guestbook.');
    } finally {
      setBusy(false);
    }
  };

  const setHidden = async (id: string, hidden: boolean) => {
    await db.from('cabin_guestbook_entries').update({ hidden }).eq('id', id);
    invalidate(['cabin-guestbook']);
  };

  const remove = async (id: string) => {
    await db.from('cabin_guestbook_entries').delete().eq('id', id);
    invalidate(['cabin-guestbook']);
  };

  return (
    <CabinSheet open={open} onClose={onClose} title="Guestbook">
      {canSign && (
        <div className="cabin-form">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={280}
            placeholder={`Leave a line for ${ownerName}.`}
            aria-label="Sign the guestbook"
          />
          <button type="button" className="solid-button" disabled={busy || !text.trim()} onClick={sign}>
            {busy ? 'Signing…' : 'Sign'}
          </button>
        </div>
      )}

      {isError && <StatePanel title="The guestbook did not open.">Try again in a moment.</StatePanel>}
      {!isLoading && !isError && (entries?.length ?? 0) === 0 && (
        <p className="quiet">Nobody has signed yet. The first page is the hardest.</p>
      )}

      {entries?.map(e => (
        <div key={e.id} className={`cabin-guest-entry ${e.hidden ? 'is-hidden' : ''}`}>
          <UserAvatar
            avatarUrl={e.author?.avatar_url ?? null}
            defaultAvatarKey={e.author?.default_avatar_key ?? null}
            displayName={e.author?.display_name ?? ''}
            size={30}
          />
          <div className="min-w-0">
            <p>{e.content}</p>
            <small>
              {e.author?.display_name ?? 'Someone'} · {formatTimeAgo(e.created_at)}
              {e.hidden && ' · hidden'}
            </small>
          </div>
          {isOwner && (
            <span className="cabin-entry-tools">
              <button type="button" onClick={() => setHidden(e.id, !e.hidden)}>
                {e.hidden ? 'Show' : 'Hide'}
              </button>
              <button type="button" onClick={() => remove(e.id)}>Remove</button>
            </span>
          )}
        </div>
      ))}
    </CabinSheet>
  );
};

export default GuestbookSheet;
