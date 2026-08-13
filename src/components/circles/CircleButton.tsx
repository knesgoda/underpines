import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CircleButtonProps {
  profileId: string;
  profileName: string;
}

type CircleStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

/**
 * The add-friend control on someone's page.
 *
 * "Follow the trail" / "Trail invite sent" / "Trail together" needed decoding
 * before you knew what the button did. The states are now named after what
 * they are. The table is still `circles`.
 */
const CircleButton = ({ profileId, profileName }: CircleButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CircleStatus>('none');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from('circles')
        .select('*')
        .or(`and(requester_id.eq.${user.id},requestee_id.eq.${profileId}),and(requester_id.eq.${profileId},requestee_id.eq.${user.id})`)
        .maybeSingle();

      if (!data) setStatus('none');
      else if (data.status === 'accepted') setStatus('accepted');
      else if (data.status === 'pending' && data.requester_id === user.id) setStatus('pending_sent');
      else if (data.status === 'pending' && data.requestee_id === user.id) setStatus('pending_received');
      else setStatus('none');

      setLoading(false);
    };
    check();
  }, [user, profileId]);

  const sendRequest = async () => {
    if (!user) return;
    setActing(true);
    await supabase.from('circles').insert({ requester_id: user.id, requestee_id: profileId });
    await supabase.from('notifications').insert({
      recipient_id: profileId,
      notification_type: 'circle_request',
      actor_id: user.id,
    });
    setStatus('pending_sent');
    setActing(false);
  };

  const acceptRequest = async () => {
    if (!user) return;
    setActing(true);
    await supabase
      .from('circles')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('requester_id', profileId)
      .eq('requestee_id', user.id);

    await supabase.from('notifications').insert({
      recipient_id: profileId,
      notification_type: 'circle_accepted',
      actor_id: user.id,
    });
    setStatus('accepted');
    setActing(false);
    toast.success(`You and ${profileName} are friends now.`);
  };

  const declineRequest = async () => {
    if (!user) return;
    setActing(true);
    await supabase
      .from('circles')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('requester_id', profileId)
      .eq('requestee_id', user.id);
    setStatus('none');
    setActing(false);
  };

  const openMessages = async () => {
    if (!user) return;
    const { data: mine } = await supabase
      .from('campfire_participants')
      .select('campfire_id')
      .eq('user_id', user.id);

    for (const p of mine ?? []) {
      const { data: shared } = await supabase
        .from('campfire_participants')
        .select('user_id')
        .eq('campfire_id', p.campfire_id)
        .eq('user_id', profileId)
        .maybeSingle();
      if (!shared) continue;

      const { data: existing } = await supabase
        .from('campfires')
        .select('id')
        .eq('id', p.campfire_id)
        .eq('campfire_type', 'one_on_one')
        .eq('is_active', true)
        .maybeSingle();

      // /campfires/:id was never a route — it fell through to the 404. The
      // messages screen picks its own thread, so send people there.
      if (existing) { navigate('/messages'); return; }
    }

    const { data: created } = await supabase
      .from('campfires')
      .insert({ campfire_type: 'one_on_one', firekeeper_id: user.id, name: profileName })
      .select()
      .single();

    if (!created) { toast.error('Could not start that conversation.'); return; }

    await supabase.from('campfire_participants').insert([
      { campfire_id: created.id, user_id: user.id },
      { campfire_id: created.id, user_id: profileId },
    ]);
    navigate('/messages');
  };

  if (loading) return <div className="h-10" />;

  if (status === 'none') {
    return (
      <button
        onClick={sendRequest}
        disabled={acting}
        className="rounded-[3px] border-2 border-primary px-5 py-2 font-body text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
      >
        Add friend
      </button>
    );
  }

  if (status === 'pending_sent') {
    return (
      <div className="flex items-center gap-2 rounded-[3px] border border-border px-4 py-2 opacity-60">
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-sm"
        >
          ⋯
        </motion.span>
        <span className="font-body text-sm text-muted-foreground">Request sent</span>
      </div>
    );
  }

  if (status === 'pending_received') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={acceptRequest}
          disabled={acting}
          className="rounded-[3px] bg-primary px-4 py-2 font-body text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Accept
        </button>
        <button
          onClick={declineRequest}
          disabled={acting}
          className="rounded-[3px] border border-border px-4 py-1.5 font-body text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Not now
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5 rounded-[3px] bg-primary/10 px-4 py-2 font-body text-sm text-primary">
        <Check size={14} /> Friends
      </span>
      <button
        onClick={openMessages}
        className="flex items-center gap-1.5 rounded-[3px] bg-primary px-4 py-2 font-body text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        <MessageSquare size={14} /> Message
      </button>
    </div>
  );
};

export default CircleButton;
