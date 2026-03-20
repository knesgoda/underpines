import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface InviteData {
  invite: any | null;
  inviteUrl: string;
  usesRemaining: number | null;
  isInfinite: boolean;
  inviteeCount: number;
  loading: boolean;
}

export const useInviteData = (): InviteData => {
  const { user } = useAuth();
  const [invite, setInvite] = useState<any>(null);
  const [inviteeCount, setInviteeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetch = async () => {
      const { data: inv } = await supabase
        .from('invites')
        .select('*')
        .eq('inviter_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (inv) {
        setInvite(inv);
        const { count } = await supabase
          .from('invite_uses')
          .select('*', { count: 'exact', head: true })
          .eq('invite_id', inv.id);
        setInviteeCount(count ?? 0);
      }
      setLoading(false);
    };

    fetch();
  }, [user]);

  const inviteUrl = invite ? `https://underpines.lovable.app/invite/${invite.slug}` : '';

  return {
    invite,
    inviteUrl,
    usesRemaining: invite?.is_infinite ? null : (invite?.uses_remaining ?? null),
    isInfinite: invite?.is_infinite ?? false,
    inviteeCount,
    loading,
  };
};
