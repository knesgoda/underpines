import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import PineTreeLoading from '@/components/PineTreeLoading';
import CampNewsletterSettings from '@/components/camps/CampNewsletterSettings';

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  scout_ends_at: string | null;
  profile?: { display_name: string; handle: string };
}

interface JoinRequest {
  id: string;
  user_id: string;
  status: string;
  profile?: { display_name: string; handle: string };
}

const CampSettings = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [camp, setCamp] = useState<any>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('open');

  const load = useCallback(async () => {
    if (!id || !user) return;

    const [campRes, memRes, reqRes] = await Promise.all([
      supabase.from('camps').select('*').eq('id', id).maybeSingle(),
      supabase.from('camp_members').select('*').eq('camp_id', id).order('joined_at'),
      supabase.from('camp_join_requests').select('*').eq('camp_id', id).eq('status', 'pending'),
    ]);

    const campData = campRes.data;
    if (!campData || campData.firekeeper_id !== user.id) {
      navigate(-1);
      return;
    }

    setCamp(campData);
    setName(campData.name);
    setDescription(campData.description || '');
    setVisibility(campData.visibility);

    // Fetch profiles for members and requests
    const allUserIds = [
      ...(memRes.data || []).map((m: any) => m.user_id),
      ...(reqRes.data || []).map((r: any) => r.user_id),
    ];
    const { data: profiles } = await supabase.from('profiles').select('id, display_name, handle').in('id', allUserIds);
    const pMap: Record<string, any> = {};
    (profiles || []).forEach(p => { pMap[p.id] = p; });

    setMembers((memRes.data || []).map((m: any) => ({ ...m, profile: pMap[m.user_id] })));
    setRequests((reqRes.data || []).map((r: any) => ({ ...r, profile: pMap[r.user_id] })));
    setLoading(false);
  }, [id, user, navigate]);

  useEffect(() => { load(); }, [load]);

  const saveBasic = async () => {
    if (!id) return;
    await supabase.from('camps').update({ name: name.trim(), description: description.trim() || null, visibility }).eq('id', id);
    toast.success('Settings saved.');
  };

  const changeRole = async (memberId: string, userId: string, newRole: string) => {
    await supabase.from('camp_members').update({ role: newRole }).eq('id', memberId);
    toast.success('Role updated.');
    load();
  };

  const passFirekeeping = async (memberId: string, userId: string) => {
    if (!confirm('Pass Firekeeping to this member? You will become a regular member.')) return;
    if (!id || !user) return;

    // Update camp firekeeper
    await supabase.from('camps').update({ firekeeper_id: userId }).eq('id', id);
    // Update roles
    await supabase.from('camp_members').update({ role: 'firekeeper' }).eq('id', memberId);
    await supabase.from('camp_members').update({ role: 'member' }).eq('camp_id', id).eq('user_id', user.id);

    toast.success('Firekeeping transferred.');
    navigate(`/camps/${id}`);
  };

  const acceptRequest = async (reqId: string, userId: string) => {
    const scoutEnds = new Date(Date.now() + 14 * 86400000).toISOString();
    await supabase.from('camp_join_requests').update({ status: 'accepted' }).eq('id', reqId);
    await supabase.from('camp_members').insert({ camp_id: id, user_id: userId, role: 'scout', scout_ends_at: scoutEnds });
    if (camp) await supabase.from('camps').update({ member_count: (camp.member_count || 1) + 1 }).eq('id', id);
    toast.success('Request accepted.');
    load();
  };

  const declineRequest = async (reqId: string) => {
    await supabase.from('camp_join_requests').update({ status: 'declined' }).eq('id', reqId);
    toast('Request declined.');
    load();
  };

  const archiveCamp = async () => {
    if (!id || !camp) return;
    if (!confirm(`Archive ${camp.name}? Members will lose access but nothing is deleted. This can be undone.`)) return;
    await supabase.from('camps').update({ is_active: false }).eq('id', id);
    toast('Camp archived.');
    navigate('/camps');
  };

  const roleLabel = (role: string) => {
    if (role === 'firekeeper') return '🔑';
    if (role === 'trailblazer') return '🌿';
    if (role === 'scout') return '🌱';
    return '';
  };

  if (loading) return <PineTreeLoading />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto px-4 py-8">
      <button onClick={() => navigate(`/camps/${id}`)} className="flex items-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back to Camp
      </button>

      <h1 className="font-display text-2xl text-foreground mb-6">Camp Settings</h1>

      {/* Basic settings */}
      <div className="space-y-4 mb-8">
        <div>
          <label className="font-body text-xs text-muted-foreground mb-1 block">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card font-body text-sm text-foreground focus:outline-none" />
        </div>
        <div>
          <label className="font-body text-xs text-muted-foreground mb-1 block">Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card font-body text-sm text-foreground focus:outline-none" />
        </div>
        <div>
          <label className="font-body text-xs text-muted-foreground mb-1 block">Visibility</label>
          <select value={visibility} onChange={e => setVisibility(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card font-body text-sm text-foreground focus:outline-none">
            <option value="open">Open</option>
            <option value="ember">Ember</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
        <button onClick={saveBasic} className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium">Save changes</button>
      </div>

      {/* Pending requests */}
      {requests.length > 0 && (
        <div className="mb-8">
          <h2 className="font-body text-sm font-medium text-foreground mb-3">Pending Requests ({requests.length})</h2>
          <div className="space-y-2">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-card">
                <span className="font-body text-sm text-foreground">{req.profile?.display_name || 'Unknown'}</span>
                <div className="flex gap-2">
                  <button onClick={() => acceptRequest(req.id, req.user_id)} className="px-3 py-1 rounded-full bg-primary text-primary-foreground font-body text-xs">Accept</button>
                  <button onClick={() => declineRequest(req.id)} className="px-3 py-1 rounded-full border border-border font-body text-xs text-muted-foreground">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="mb-8">
        <h2 className="font-body text-sm font-medium text-foreground mb-3">Members ({members.length})</h2>
        <div className="space-y-1">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-sm">{roleLabel(m.role)}</span>
                <span className="font-body text-sm text-foreground">{m.profile?.display_name || 'Unknown'}</span>
                <span className="font-body text-[10px] text-muted-foreground">@{m.profile?.handle}</span>
              </div>
              {m.user_id !== user?.id && m.role !== 'firekeeper' && (
                <div className="flex gap-1">
                  {m.role === 'trailblazer' ? (
                    <button onClick={() => changeRole(m.id, m.user_id, 'member')} className="font-body text-[10px] text-muted-foreground hover:text-foreground">Remove role</button>
                  ) : (
                    <button onClick={() => changeRole(m.id, m.user_id, 'trailblazer')} className="font-body text-[10px] text-primary hover:underline">Make Trailblazer</button>
                  )}
                  <span className="text-muted-foreground/30">|</span>
                  <button onClick={() => passFirekeeping(m.id, m.user_id)} className="font-body text-[10px] text-muted-foreground hover:text-foreground">Pass 🔑</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div>
        <h2 className="font-body text-sm font-medium text-destructive mb-3">Danger Zone</h2>
        <button onClick={archiveCamp} className="px-4 py-2 rounded-full border border-destructive text-destructive font-body text-sm hover:bg-destructive/10 transition-colors">
          Archive this Camp
        </button>
      </div>
    </motion.div>
  );
};

export default CampSettings;
