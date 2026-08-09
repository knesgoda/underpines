import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PineTreeLoading from '@/components/PineTreeLoading';
import UserAvatar from '@/components/UserAvatar';
import { useFriendActions } from '@/hooks/useFriends';
import type { MiniProfile } from '@/hooks/useProfilePage';
import '@/styles/explore.css';

/**
 * "People {inviter} knows" — shown once, just after an invite is redeemed.
 *
 * An invite-only network is worth nothing to a new arrival who lands alone, so
 * this is the first place they can pick up a few people. Was headed "People on
 * {name}'s trail" with a "Follow the trail" button.
 */
const CircleSuggestions = () => {
  const { handle } = useParams<{ handle: string }>();
  const { user } = useAuth();
  const actions = useFriendActions();
  const [asked, setAsked] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['inviter-friends', handle, user?.id],
    enabled: !!handle && !!user,
    queryFn: async (): Promise<{ inviter: string; people: MiniProfile[] }> => {
      const { data: inviter } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('handle', handle!)
        .maybeSingle();
      if (!inviter) return { inviter: '', people: [] };

      const { data: circles } = await supabase
        .from('circles')
        .select('requester_id, requestee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${inviter.id},requestee_id.eq.${inviter.id}`);

      const otherIds = (circles ?? [])
        .map(c => (c.requester_id === inviter.id ? c.requestee_id : c.requester_id))
        .filter(id => id !== user!.id);

      if (otherIds.length === 0) return { inviter: inviter.display_name, people: [] };

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, default_avatar_key')
        .in('id', otherIds);

      return { inviter: inviter.display_name, people: (profiles ?? []) as MiniProfile[] };
    },
  });

  if (isLoading) return <PineTreeLoading />;

  const inviter = data?.inviter || 'they';
  const people = data?.people ?? [];

  const add = (id: string, name: string) =>
    actions.request
      .mutateAsync(id)
      .then(() => { setAsked(prev => new Set(prev).add(id)); toast.success(`Asked ${name}.`); })
      .catch(() => toast.error('That did not go through.'));

  return (
    <div className="page-shell explore">
      <div className="panel-title"><span>People {inviter} knows</span></div>

      <section className="panel module">
        <p className="mb-4 text-sm text-muted-foreground">
          These are the people who brought you here, and who they know. A few familiar faces make
          the place feel like somewhere.
        </p>

        {people.length === 0 ? (
          <p className="explore-empty">
            It is quiet on their side too. <Link to="/explore">Have a look around instead.</Link>
          </p>
        ) : (
          <div className="people-grid">
            {people.map(p => (
              <div key={p.id} className="person-card">
                <Link to={`/${p.handle}`}>
                  <UserAvatar
                    avatarUrl={p.avatar_url}
                    defaultAvatarKey={p.default_avatar_key}
                    displayName={p.display_name}
                    size={46}
                  />
                  <b>{p.display_name}</b>
                </Link>
                <small>@{p.handle}</small>
                {asked.has(p.id) ? (
                  <span className="asked">Asked</span>
                ) : (
                  <button type="button" className="outline-button" onClick={() => add(p.id, p.display_name)}>
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CircleSuggestions;
