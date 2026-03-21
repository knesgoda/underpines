import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import PineTreeLoading from '@/components/PineTreeLoading';

interface SuggestedMember {
  id: string;
  display_name: string;
  handle: string;
}

const CircleSuggestions = () => {
  const { handle } = useParams();
  const { user } = useAuth();
  const [members, setMembers] = useState<SuggestedMember[]>([]);
  const [inviterName, setInviterName] = useState('');
  const [loading, setLoading] = useState(true);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !handle) return;
    const load = async () => {
      const { data: inviter } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('handle', handle)
        .maybeSingle();

      if (!inviter) { setLoading(false); return; }
      setInviterName(inviter.display_name);

      const { data: circles } = await supabase
        .from('circles')
        .select('requester_id, requestee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${inviter.id},requestee_id.eq.${inviter.id}`);

      if (circles) {
        const otherIds = circles
          .map(c => c.requester_id === inviter.id ? c.requestee_id : c.requester_id)
          .filter(id => id !== user.id);

        if (otherIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, handle')
            .in('id', otherIds);
          setMembers(profiles || []);
        }
      }
      setLoading(false);
    };
    load();
  }, [user, handle]);

  const sendRequest = async (profileId: string) => {
    if (!user) return;
    await supabase.from('circles').insert({ requester_id: user.id, requestee_id: profileId });
    await supabase.from('notifications').insert({ recipient_id: profileId, notification_type: 'circle_request', actor_id: user.id });
    setRequestedIds(prev => new Set([...prev, profileId]));
  };

  if (loading) return <PineTreeLoading />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl text-foreground mb-2">
        People on {inviterName}'s trail
      </h1>
      <p className="font-body text-sm text-muted-foreground mb-6">
        These are people your inviter walks with. Maybe you'll find a few familiar faces.
      </p>

      {members.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">🌿</p>
          <p className="font-body text-sm text-muted-foreground">{inviterName}'s trail is quiet for now.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-secondary-foreground">
                  {m.display_name[0]?.toUpperCase()}
                </div>
                <div>
                  <Link to={`/${m.handle}`} className="font-body text-sm font-medium text-foreground hover:opacity-80">{m.display_name}</Link>
                  <p className="font-body text-xs text-muted-foreground">@{m.handle}</p>
                </div>
              </div>
              {requestedIds.has(m.id) ? (
                <span className="font-body text-xs text-muted-foreground">Trail invite sent</span>
              ) : (
                <button
                  onClick={() => sendRequest(m.id)}
                  className="px-3 py-1.5 rounded-full border-2 border-primary text-primary font-body text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Follow the trail
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default CircleSuggestions;
