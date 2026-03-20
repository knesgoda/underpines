import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface CircleButtonProps {
  profileId: string;
  profileName: string;
}

type CircleStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

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

      if (!data) {
        setStatus('none');
      } else if (data.status === 'accepted') {
        setStatus('accepted');
      } else if (data.status === 'pending' && data.requester_id === user.id) {
        setStatus('pending_sent');
      } else if (data.status === 'pending' && data.requestee_id === user.id) {
        setStatus('pending_received');
      } else {
        setStatus('none'); // declined resets to none visually
      }
      setLoading(false);
    };
    check();
  }, [user, profileId]);

  const sendRequest = async () => {
    if (!user) return;
    setActing(true);
    await supabase.from('circles').insert({
      requester_id: user.id,
      requestee_id: profileId,
    });
    // Create notification
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

    // Notify the requester
    await supabase.from('notifications').insert({
      recipient_id: profileId,
      notification_type: 'circle_accepted',
      actor_id: user.id,
    });
    setStatus('accepted');
    setActing(false);
    toast.success(`${profileName} is now in your Circle`);
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

  const startCampfire = async () => {
    if (!user) return;
    // Check if 1-on-1 campfire already exists
    const { data: myParticipations } = await supabase
      .from('campfire_participants')
      .select('campfire_id')
      .eq('user_id', user.id);

    if (myParticipations) {
      for (const p of myParticipations) {
        const { data: otherParticipant } = await supabase
          .from('campfire_participants')
          .select('user_id')
          .eq('campfire_id', p.campfire_id)
          .eq('user_id', profileId)
          .maybeSingle();

        if (otherParticipant) {
          const { data: campfire } = await supabase
            .from('campfires')
            .select('*')
            .eq('id', p.campfire_id)
            .eq('campfire_type', 'one_on_one')
            .eq('is_active', true)
            .maybeSingle();

          if (campfire) {
            navigate(`/campfires/${campfire.id}`);
            return;
          }
        }
      }
    }

    // Create new campfire
    const { data: newCampfire } = await supabase
      .from('campfires')
      .insert({
        campfire_type: 'one_on_one',
        firekeeper_id: user.id,
        name: profileName,
      })
      .select()
      .single();

    if (newCampfire) {
      await supabase.from('campfire_participants').insert([
        { campfire_id: newCampfire.id, user_id: user.id },
        { campfire_id: newCampfire.id, user_id: profileId },
      ]);
      navigate(`/campfires/${newCampfire.id}`);
    }
  };

  if (loading) return <div className="h-10" />;

  if (status === 'none') {
    return (
      <button
        onClick={sendRequest}
        disabled={acting}
        className="px-5 py-2 rounded-full border-2 border-primary text-primary font-body text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
      >
        Add to my Circle
      </button>
    );
  }

  if (status === 'pending_sent') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border">
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-sm"
        >
          🔥
        </motion.span>
        <span className="font-body text-sm text-muted-foreground">Waiting by the fire...</span>
      </div>
    );
  }

  if (status === 'pending_received') {
    return (
      <div className="space-y-2">
        <p className="font-body text-sm text-foreground">They want to join your Circle</p>
        <div className="flex gap-2">
          <button
            onClick={acceptRequest}
            disabled={acting}
            className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Accept
          </button>
          <button
            onClick={declineRequest}
            disabled={acting}
            className="px-4 py-1.5 rounded-full border border-border font-body text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  // accepted
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/8 font-body text-sm text-primary">
        In your Circle ✓
      </span>
      <button
        onClick={startCampfire}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90"
      >
        <Flame size={14} />
        Start a Campfire
      </button>
    </div>
  );
};

export default CircleButton;
