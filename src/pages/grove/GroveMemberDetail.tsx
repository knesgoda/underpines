import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const GroveMemberDetail = () => {
  const { handle } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [postCount, setPostCount] = useState(0);
  const [reportsReceived, setReportsReceived] = useState(0);
  const [reportsFiled, setReportsFiled] = useState(0);
  const [blocksReceived, setBlocksReceived] = useState(0);
  const [modActions, setModActions] = useState<any[]>([]);
  const [inviteSlots, setInviteSlots] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!handle) return;

      const { data: p } = await supabase.from('profiles').select('*').eq('handle', handle).single();
      if (!p) { setLoading(false); return; }
      setProfile(p);

      const [
        { count: posts },
        { count: received },
        { count: filed },
        { count: blocks },
        { data: actions },
      ] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', p.id),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('reported_user_id', p.id),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('reporter_id', p.id),
        supabase.from('blocks').select('id', { count: 'exact', head: true }).eq('blocked_id', p.id),
        supabase.from('moderation_actions').select('*').eq('target_user_id', p.id).order('created_at', { ascending: false }),
      ]);

      setPostCount(posts ?? 0);
      setReportsReceived(received ?? 0);
      setReportsFiled(filed ?? 0);
      setBlocksReceived(blocks ?? 0);
      setModActions(actions || []);

      // Get invite info
      const { data: invites } = await supabase.from('invites').select('uses_remaining').eq('inviter_id', p.id);
      const total = invites?.reduce((s, i) => s + (i.uses_remaining || 0), 0) ?? 0;
      setInviteSlots(String(total));

      setLoading(false);
    };
    load();
  }, [handle]);

  const handleSuspend = async (days: number) => {
    if (!profile || !user) return;
    const until = new Date(Date.now() + days * 86400000).toISOString();
    await supabase.from('suspensions').upsert({
      user_id: profile.id, suspended_by: user.id,
      reason: 'Admin action from The Grove', suspended_until: until, is_permanent: false,
    }, { onConflict: 'user_id' });
    await supabase.from('moderation_actions').insert({
      admin_id: user.id, target_user_id: profile.id, action_type: 'suspend', suspension_days: days,
    });
    toast.success(`Suspended for ${days} days.`);
  };

  const handleBan = async () => {
    if (!profile || !user) return;
    await supabase.from('suspensions').upsert({
      user_id: profile.id, suspended_by: user.id,
      reason: 'Permanent ban from The Grove', is_permanent: true,
    }, { onConflict: 'user_id' });
    await supabase.from('posts').update({ is_published: false }).eq('author_id', profile.id);
    await supabase.from('moderation_actions').insert({
      admin_id: user.id, target_user_id: profile.id, action_type: 'ban',
    });
    toast.success('User permanently banned.');
  };

  if (loading) return <p className="text-sm text-[hsl(var(--pine-light)/0.5)]">Loading…</p>;
  if (!profile) return <p className="text-sm text-red-400">Member not found.</p>;

  return (
    <div className="max-w-2xl space-y-5">
      <button onClick={() => navigate('/grove/members')} className="flex items-center gap-1 text-xs text-[hsl(var(--amber-mid))] hover:text-[hsl(var(--amber-light))]">
        <ArrowLeft className="w-3.5 h-3.5" /> Members
      </button>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[hsl(var(--pine-mid)/0.3)] flex items-center justify-center text-lg text-[hsl(var(--pine-light)/0.5)]">
          {profile.display_name?.charAt(0)?.toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-[hsl(var(--pine-pale))]">{profile.handle}</h1>
          <p className="text-sm text-[hsl(var(--muted-text))]">{profile.display_name}</p>
          <p className="text-xs text-[hsl(var(--muted-text))]">Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      <Card className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
        <CardContent className="p-4 space-y-2">
          <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-[hsl(var(--amber-mid))]">Activity</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-[hsl(var(--pine-light)/0.7)]">Posts</span>
            <span className="text-[hsl(var(--pine-pale))]">{postCount}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
        <CardContent className="p-4 space-y-2">
          <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-[hsl(var(--amber-mid))]">Safety</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-[hsl(var(--pine-light)/0.7)]">Reports received</span>
            <span className="text-[hsl(var(--pine-pale))]">{reportsReceived}</span>
            <span className="text-[hsl(var(--pine-light)/0.7)]">Reports filed</span>
            <span className="text-[hsl(var(--pine-pale))]">{reportsFiled}</span>
            <span className="text-[hsl(var(--pine-light)/0.7)]">Blocks received</span>
            <span className="text-[hsl(var(--pine-pale))]">{blocksReceived}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
        <CardContent className="p-4 space-y-2">
          <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-[hsl(var(--amber-mid))]">Moderation History</h2>
          {modActions.length === 0 ? (
            <p className="text-sm text-[hsl(var(--pine-light)/0.4)]">No actions taken.</p>
          ) : (
            <div className="space-y-2">
              {modActions.map(a => (
                <div key={a.id} className="text-xs text-[hsl(var(--pine-light)/0.7)]">
                  <span className="capitalize font-medium">{a.action_type}</span>
                  {a.suspension_days && <span> · {a.suspension_days}d</span>}
                  {a.action_detail && <span> · {a.action_detail}</span>}
                  <span className="text-[hsl(var(--muted-text))]"> · {new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
        <CardContent className="p-4 space-y-3">
          <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-[hsl(var(--amber-mid))]">Actions</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="text-xs border-[hsl(var(--pine-mid)/0.3)] text-orange-400" onClick={() => handleSuspend(1)}>Suspend 24h</Button>
            <Button size="sm" variant="outline" className="text-xs border-[hsl(var(--pine-mid)/0.3)] text-orange-400" onClick={() => handleSuspend(7)}>Suspend 7d</Button>
            <Button size="sm" variant="outline" className="text-xs border-red-500/30 text-red-400" onClick={handleBan}>Ban</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroveMemberDetail;
