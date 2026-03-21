import { useState, useEffect, useCallback } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Settings, Flame, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import PineTreeLoading from '@/components/PineTreeLoading';
import CampFirepit from '@/components/camps/CampFirepit';
import CampLodge from '@/components/camps/CampLodge';
import CampBonfire from '@/components/camps/CampBonfire';

interface CampData {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  visibility: string;
  firekeeper_id: string;
  member_count: number | null;
  is_active: boolean | null;
}

type Tab = 'firepit' | 'lodge' | 'bonfire';

const CampView = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [camp, setCamp] = useState<CampData | null>(null);
  const [membership, setMembership] = useState<{ role: string; scout_ends_at: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('firepit');
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    if (!id || !user) return;

    const [campRes, memRes] = await Promise.all([
      supabase.from('camps').select('*').eq('id', id).maybeSingle(),
      supabase.from('camp_members').select('role, scout_ends_at').eq('camp_id', id).eq('user_id', user.id).maybeSingle(),
    ]);

    setCamp(campRes.data as CampData | null);
    setMembership(memRes.data);
    setLoading(false);
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async () => {
    if (!user || !id || !camp) return;
    setJoining(true);

    if (camp.visibility === 'ember' || camp.visibility === 'hidden') {
      toast('Ask someone who\'s a member to send you an invite link from inside the Camp.');
      setJoining(false);
      return;
    }

    // Open camp: join directly as scout
    const scoutEnds = new Date(Date.now() + 14 * 86400000).toISOString();
    const { error } = await supabase.from('camp_members').insert({
      camp_id: id,
      user_id: user.id,
      role: 'scout',
      scout_ends_at: scoutEnds,
    });

    if (error) {
      toast.error('Could not join camp');
    } else {
      // Update member count
      await supabase.from('camps').update({ member_count: (camp.member_count || 1) + 1 }).eq('id', id);

      // Add to bonfire
      const { data: bonfire } = await supabase
        .from('campfires')
        .select('id')
        .eq('camp_id', id)
        .eq('campfire_type', 'bonfire')
        .is('bonfire_sub_group_of', null)
        .maybeSingle();

      if (bonfire) {
        await supabase.from('campfire_participants').insert({ campfire_id: bonfire.id, user_id: user.id });
      }

      toast.success('Welcome to the Camp!');
      load();
    }
    setJoining(false);
  };

  const [leaveOpen, setLeaveOpen] = useState(false);

  const handleLeave = async () => {
    if (!user || !id || !camp) return;
    await supabase.from('camp_members').delete().eq('camp_id', id).eq('user_id', user.id);
    await supabase.from('camps').update({ member_count: Math.max(0, (camp.member_count || 1) - 1) }).eq('id', id);
    setLeaveOpen(false);
    toast('You\'ve left the Camp.');
    navigate('/camps');
  };

  if (loading) return <PineTreeLoading />;
  if (!camp) return <div className="text-center py-16 font-body text-muted-foreground">Camp not found.</div>;

  const isFirekeeper = membership?.role === 'firekeeper';
  const isTrailblazer = membership?.role === 'trailblazer';
  const isScout = membership?.role === 'scout';
  const isMember = !!membership;

  // Not a member — show join prompt
  if (!isMember) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto px-4 py-8 text-center">
        {camp.cover_image_url ? (
          <img src={camp.cover_image_url} alt="" className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4" />
        ) : (
          <div className="w-24 h-24 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Flame size={32} className="text-muted-foreground" />
          </div>
        )}
        <h1 className="font-display text-xl text-foreground mb-1">{camp.name}</h1>
        {camp.description && <p className="font-body text-sm text-muted-foreground mb-2">{camp.description}</p>}
        <p className="font-body text-xs text-muted-foreground mb-6">{camp.member_count || 1} members</p>

        {camp.visibility === 'ember' || camp.visibility === 'hidden' ? (
          <div className="space-y-2">
            <p className="font-body text-sm text-amber-600">🔥 {camp.visibility === 'ember' ? 'Ember Camp' : 'Hidden Camp'}</p>
            <p className="font-body text-xs text-muted-foreground">You'll need an invite from a member to join.</p>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-50"
          >
            {joining ? 'Joining...' : 'Join this Camp'}
          </button>
        )}
      </motion.div>
    );
  }

  const scoutDays = isScout && membership?.scout_ends_at
    ? Math.max(0, Math.ceil((new Date(membership.scout_ends_at).getTime() - Date.now()) / 86400000))
    : null;

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'firepit', label: 'Firepit', emoji: '🔥' },
    { key: 'lodge', label: 'Lodge', emoji: '📋' },
    { key: 'bonfire', label: 'Bonfire', emoji: '🔥' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-3">
          {camp.cover_image_url ? (
            <img src={camp.cover_image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Flame size={24} className="text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg text-foreground truncate">{camp.name}</h1>
            {camp.description && <p className="font-body text-xs text-muted-foreground truncate">{camp.description}</p>}
          </div>
          <div className="flex items-center gap-1">
            {isFirekeeper && (
              <button onClick={() => navigate(`/camps/${id}/settings`)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Settings size={18} className="text-muted-foreground" />
              </button>
            )}
            {!isFirekeeper && (
              <button onClick={() => setLeaveOpen(true)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Leave Camp">
                <LogOut size={18} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {isScout && scoutDays !== null && (
          <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-3">
            <p className="font-body text-xs text-amber-700 dark:text-amber-300">
              🌱 You're a Scout. Full Firepit access in {scoutDays} days.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-md font-body text-xs transition-colors ${
                tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pb-8">
        {tab === 'firepit' && (
          <CampFirepit
            campId={camp.id}
            isScout={!!isScout}
            scoutDays={scoutDays}
            canModerate={isFirekeeper || isTrailblazer}
          />
        )}
        {tab === 'lodge' && (
          <CampLodge
            campId={camp.id}
            canWrite={isFirekeeper || isTrailblazer}
            isFirekeeper={isFirekeeper}
          />
        )}
        {tab === 'bonfire' && (
          <CampBonfire campId={camp.id} isScout={!!isScout} scoutDays={scoutDays} />
        )}
      </div>
    </motion.div>
  );
};

export default CampView;
