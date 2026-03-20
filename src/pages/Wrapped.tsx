import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import PineTreeLoading from '@/components/PineTreeLoading';

interface WrappedData {
  total_posts: number;
  first_post_excerpt: string | null;
  total_messages: number;
  top_campfire_name: string | null;
  top_campfire_messages: number;
  reactions_given: number;
  circle_count: number;
  camps_joined: number;
}

const Wrapped = () => {
  const { year } = useParams<{ year: string }>();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<WrappedData | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !year) return;
    const load = async () => {
      const targetYear = parseInt(year);
      const yearStart = new Date(targetYear, 0, 1).toISOString();
      const yearEnd = new Date(targetYear + 1, 0, 1).toISOString();

      const { data: prof } = await supabase
        .from('profiles')
        .select('display_name, handle, created_at')
        .eq('id', user.id)
        .maybeSingle();
      setProfile(prof);

      // Compile data client-side
      const { data: posts } = await supabase
        .from('posts')
        .select('id, content, title, post_type, created_at')
        .eq('author_id', user.id)
        .eq('is_published', true)
        .gte('created_at', yearStart)
        .lt('created_at', yearEnd)
        .order('created_at', { ascending: true });

      const { count: msgCount } = await supabase
        .from('campfire_messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .gte('created_at', yearStart)
        .lt('created_at', yearEnd);

      const { data: campfireMsgs } = await supabase
        .from('campfire_messages')
        .select('campfire_id')
        .eq('sender_id', user.id)
        .gte('created_at', yearStart)
        .lt('created_at', yearEnd);

      let topCampfireName = null;
      let topCampfireMsgCount = 0;
      if (campfireMsgs && campfireMsgs.length > 0) {
        const counts: Record<string, number> = {};
        campfireMsgs.forEach(m => { counts[m.campfire_id] = (counts[m.campfire_id] || 0) + 1; });
        const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        if (topEntry) {
          topCampfireMsgCount = topEntry[1];
          const { data: cf } = await supabase.from('campfires').select('name').eq('id', topEntry[0]).maybeSingle();
          topCampfireName = cf?.name || 'A Campfire';
        }
      }

      const { count: reactionsGiven } = await supabase
        .from('reactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', yearStart)
        .lt('created_at', yearEnd);

      const { count: circleCount } = await supabase
        .from('circles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},requestee_id.eq.${user.id}`);

      const { count: campsJoined } = await supabase
        .from('camp_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('joined_at', yearStart)
        .lt('joined_at', yearEnd);

      const firstPost = posts?.[0];

      setData({
        total_posts: posts?.length || 0,
        first_post_excerpt: firstPost?.content?.slice(0, 120) || firstPost?.title || null,
        total_messages: msgCount || 0,
        top_campfire_name: topCampfireName,
        top_campfire_messages: topCampfireMsgCount,
        reactions_given: reactionsGiven || 0,
        circle_count: circleCount || 0,
        camps_joined: campsJoined || 0,
      });
      setLoading(false);
    };
    load();
  }, [user, year]);

  if (authLoading || loading) return <PineTreeLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!data || !profile) return <PineTreeLoading />;

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="max-w-[520px] mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="space-y-10"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <p className="text-xs font-body text-muted-foreground tracking-[0.08em] uppercase">
            Your {year} in the Pines
          </p>
          <div className="text-6xl">🌲</div>
          <p className="font-body text-sm text-muted-foreground">
            You joined on {joinDate}.<br />
            A lot has happened since.
          </p>
        </div>

        <div className="h-px bg-border" />

        {/* Stats */}
        <div className="space-y-8">
          {data.top_campfire_name && (
            <StatBlock emoji="🔥" label="Your warmest Campfire" value={data.top_campfire_name} detail={`${data.top_campfire_messages} messages between you`} />
          )}
          <StatBlock emoji="📖" label={`You published ${data.total_posts} post${data.total_posts !== 1 ? 's' : ''}`}
            value={data.first_post_excerpt ? `Starting with: "${data.first_post_excerpt}..."` : undefined} />
          <StatBlock emoji="💚" label={`You gave ${data.reactions_given} reaction${data.reactions_given !== 1 ? 's' : ''}`} />
          <StatBlock emoji="🌲" label={`Your Circle grew to ${data.circle_count} people`} />
          {data.camps_joined > 0 && (
            <StatBlock emoji="🏕️" label={`You joined ${data.camps_joined} Camp${data.camps_joined !== 1 ? 's' : ''}`} />
          )}
        </div>

        <div className="h-px bg-border" />

        <p className="text-center font-display text-lg italic text-muted-foreground">
          Here's to another year in the Pines.
        </p>
      </motion.div>
    </div>
  );
};

const StatBlock = ({ emoji, label, value, detail }: { emoji: string; label: string; value?: string; detail?: string }) => (
  <div className="flex gap-4">
    <span className="text-2xl mt-0.5">{emoji}</span>
    <div>
      <p className="font-body text-sm text-foreground">{label}</p>
      {value && <p className="font-body text-sm text-muted-foreground mt-1">{value}</p>}
      {detail && <p className="font-body text-xs text-muted-foreground mt-0.5">{detail}</p>}
    </div>
  </div>
);

export default Wrapped;
