import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import UserAvatar from '@/components/UserAvatar';

interface CircleStackProps {
  profileId: string;
  isOwner: boolean;
  atmosphere: any;
}

interface CircleMemberPreview {
  id: string;
  display_name: string;
  avatar_url: string | null;
  default_avatar_key: string | null;
}

const CabinCircleStack = ({ profileId, isOwner, atmosphere }: CircleStackProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<CircleMemberPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: circles } = await supabase
        .from('circles')
        .select('requester_id, requestee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profileId},requestee_id.eq.${profileId}`)
        .limit(8);

      if (circles && circles.length > 0) {
        const otherIds = circles.map(c =>
          c.requester_id === profileId ? c.requestee_id : c.requester_id
        );

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, default_avatar_key')
          .in('id', otherIds)
          .limit(6);

        setMembers(profiles || []);
      }
      setLoading(false);
    };
    load();
  }, [profileId]);

  if (loading || members.length === 0) return null;

  const displayMembers = members.slice(0, 5);

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {displayMembers.map(m => (
          <div key={m.id} className="rounded-full border-2" style={{ borderColor: atmosphere.cardBg || 'var(--card)' }}>
            <UserAvatar
              avatarUrl={m.avatar_url}
              defaultAvatarKey={m.default_avatar_key}
              displayName={m.display_name}
              size={28}
            />
          </div>
        ))}
      </div>
      {isOwner ? (
        <Link
          to="/circles"
          className="font-body text-xs hover:opacity-80 transition-opacity"
          style={{ color: atmosphere.accent || 'hsl(var(--primary))' }}
        >
          See your Circles →
        </Link>
      ) : (
        <span className="font-body text-xs" style={{ color: atmosphere.text, opacity: 0.4 }}>
          On the trail
        </span>
      )}
    </div>
  );
};

export default CabinCircleStack;
