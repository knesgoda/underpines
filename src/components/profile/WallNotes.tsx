import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import UserAvatar from '@/components/UserAvatar';
import { formatTimeAgo } from '@/lib/time';
import type { WallNote } from '@/hooks/useProfilePage';

/**
 * Notes people leave on this page.
 *
 * Kept exactly as it worked before — same table, same RLS, same composer — but
 * moved below the wall, since posts are what the page is now about. A blocked
 * viewer gets zero rows from RLS rather than an error.
 */
const WallNotes = ({
  profileId,
  profileName,
  isOwner,
  notes,
  canWrite,
}: {
  profileId: string;
  profileName: string;
  isOwner: boolean;
  notes: WallNote[] | undefined;
  canWrite: boolean;
}) => {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [posting, setPosting] = useState(false);

  const post = async () => {
    if (!note.trim()) return;
    setPosting(true);
    const { data: session } = await supabase.auth.getUser();
    const authorId = session.user?.id;
    if (!authorId) { setPosting(false); return; }

    const { error } = await supabase
      .from('wall_notes')
      .insert({ profile_id: profileId, author_id: authorId, content: note.trim() });
    setPosting(false);

    if (error) {
      toast.error('Could not leave that note.');
      return;
    }
    setNote('');
    queryClient.invalidateQueries({ queryKey: ['wall-notes', profileId] });
  };

  return (
    <section className="paper module" aria-labelledby="notes-heading">
      <h2 id="notes-heading">Notes on this page</h2>

      {canWrite && (
        <div className="wall-form mb-3">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={1000}
            placeholder={isOwner ? 'Leave yourself a note.' : `Say something to ${profileName}.`}
            aria-label="Write a note on this page"
          />
          <button
            type="button"
            className="paper-button justify-self-end"
            onClick={post}
            disabled={posting || !note.trim()}
          >
            {posting ? 'Posting…' : 'Leave a note'}
          </button>
        </div>
      )}

      {(!notes || notes.length === 0) && <p className="quiet">Nothing on the wall yet.</p>}

      {notes?.map(n => (
        <div key={n.id} className="wall-note">
          <UserAvatar
            avatarUrl={n.profile?.avatar_url ?? null}
            defaultAvatarKey={n.profile?.default_avatar_key ?? null}
            displayName={n.profile?.display_name ?? ''}
            size={32}
          />
          <div className="min-w-0">
            <p>{n.content}</p>
            <small>
              {n.profile?.display_name ?? 'Someone'} · {formatTimeAgo(n.created_at)}
            </small>
          </div>
        </div>
      ))}
    </section>
  );
};

export default WallNotes;
