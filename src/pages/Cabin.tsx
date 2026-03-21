import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import CabinScene from '@/components/cabin/CabinScene';
import { getMoonPhase } from '@/lib/moon';
import { getBiomeFromLocation } from '@/lib/biomeMapping';
import CabinEditDrawer from '@/components/cabin/CabinEditDrawer';
import WidgetShelf from '@/components/cabin/WidgetShelf';
import CircleButton from '@/components/circles/CircleButton';
import CollectionsShelf from '@/components/cabin/CollectionsShelf';
import CabinPostHistory from '@/components/cabin/CabinPostHistory';
import PineTreeLoading from '@/components/PineTreeLoading';
import CabinAvatar from '@/components/cabin/CabinAvatar';
import SuggestionBox from '@/components/cabin/SuggestionBox';
import InviteRow from '@/components/cabin/InviteRow';
import CabinCircleStack from '@/components/cabin/CabinCircleStack';
import { getAtmosphere, cabinMoods } from '@/lib/cabin-config';
import { useWeather } from '@/hooks/useWeather';
import { Button } from '@/components/ui/button';
import { Settings, Music, MoreHorizontal } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBlockMute } from '@/hooks/useBlockMute';
import { toast } from 'sonner';

interface Profile {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  mantra: string | null;
  currently_type: string | null;
  currently_value: string | null;
  zip_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  accent_color: string;
  atmosphere: string;
  layout: string;
  cabin_mood: string;
  pinned_song_title: string | null;
  pinned_song_artist: string | null;
  header_image_url: string | null;
  is_pines_plus: boolean;
  avatar_url: string | null;
  default_avatar_key: string | null;
  country_code: string | null;
  biome: string | null;
}

const Cabin = () => {
  const { handle } = useParams<{ handle: string }>();
  const [searchParams] = useSearchParams();
  const setupMode = searchParams.get('setup') === 'true';
  const editOnLoad = searchParams.get('edit') === 'true';
  const upgraded = searchParams.get('upgraded') === 'true';
  const previewMode = searchParams.get('preview') === 'true';
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isInCircle, setIsInCircle] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFounderProfile, setIsFounderProfile] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showUpgradeWelcome, setShowUpgradeWelcome] = useState(false);
  const [previewDesign, setPreviewDesign] = useState<any>(null);
  const [cabinMenuOpen, setCabinMenuOpen] = useState(false);
  const [monthlyVisits, setMonthlyVisits] = useState<number | null>(null);

  const { temperature, unit: tempUnit } = useWeather(profile?.latitude, profile?.longitude);

  // Load preview design from sessionStorage
  useEffect(() => {
    if (previewMode) {
      const raw = sessionStorage.getItem('cabin_preview_design');
      if (raw) {
        setPreviewDesign(JSON.parse(raw));
      }
    }
    return () => {
      // Clean up preview on unmount
      sessionStorage.removeItem('cabin_preview_design');
    };
  }, [previewMode]);

  useEffect(() => {
    if (upgraded && !sessionStorage.getItem('pines_upgrade_shown')) {
      setShowUpgradeWelcome(true);
      sessionStorage.setItem('pines_upgrade_shown', '1');
    }
  }, [upgraded]);

  const fetchProfile = useCallback(async () => {
    let query = supabase.from('profiles').select('*');

    if (handle) {
      query = query.eq('handle', handle);
    } else if (user) {
      query = query.eq('id', user.id);
    } else {
      setLoading(false);
      return;
    }

    const { data } = await query.maybeSingle();
    if (data) {
      const owner = user?.id === data.id;

      // Self-heal: backfill biome if member has location but biome is still default
      if (owner && (!data.biome || data.biome === 'default') && data.zip_code && data.country_code) {
        const computed = getBiomeFromLocation(data.zip_code, data.country_code);
        if (computed !== 'default') {
          data.biome = computed;
          supabase.from('profiles').update({ biome: computed }).eq('id', data.id).then(() => {});
        }
      }

      setProfile(data as Profile);
      setIsOwner(owner);

      // Check founder status
      const { data: founderRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.id)
        .eq('role', 'founder')
        .maybeSingle();
      setIsFounderProfile(!!founderRole);

      // Check circle status
      if (user && !owner) {
        const { data: circle } = await supabase
          .from('circles')
          .select('status')
          .or(`and(requester_id.eq.${user.id},requestee_id.eq.${data.id}),and(requester_id.eq.${data.id},requestee_id.eq.${user.id})`)
          .eq('status', 'accepted')
          .maybeSingle();
        setIsInCircle(!!circle);
      } else if (owner) {
        setIsInCircle(true);
      }

      // Check if blocked by this profile owner
      if (user && !owner) {
        const { data: block } = await supabase
          .from('blocks')
          .select('id')
          .eq('blocker_id', data.id)
          .eq('blocked_id', user.id)
          .maybeSingle();
        if (block) {
          setIsBlocked(true);
          setLoading(false);
          return;
        }
      }

      if (user && user.id !== data.id) {
        await supabase.from('cabin_visits').upsert(
          { profile_id: data.id, visit_date: new Date().toISOString().split('T')[0], visit_count: 1 },
          { onConflict: 'profile_id,visit_date' }
        );
      }

      if (owner && editOnLoad) {
        setEditOpen(true);
      }

      // Fetch monthly visit count for owner
      if (owner) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const { data: visits } = await supabase
          .from('cabin_visits')
          .select('visit_count')
          .eq('profile_id', data.id)
          .gte('visit_date', monthStart);
        if (visits) {
          setMonthlyVisits(visits.reduce((sum, v) => sum + (v.visit_count || 0), 0));
        }
      }
    }
    setLoading(false);
  }, [handle, user, editOnLoad]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) return <PineTreeLoading />;

  if (isBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background texture-paper pt-14">
        <div className="text-center">
          <h2 className="text-2xl font-display text-foreground mb-2">
            This Cabin is not available.
          </h2>
          <p className="text-sm text-muted-foreground font-body">
            Maybe they're still finding their way through the woods.
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background texture-paper pt-14">
        <div className="text-center">
          <h2 className="text-2xl font-display text-foreground mb-2">
            This Cabin doesn't exist yet.
          </h2>
          <p className="text-sm text-muted-foreground font-body">
            Maybe they're still finding their way through the woods.
          </p>
        </div>
      </div>
    );
  }

  const effectiveAtmos = previewDesign?.design_data?.atmosphere
    ? getAtmosphere(previewDesign.design_data.atmosphere, theme)
    : getAtmosphere(profile.atmosphere, theme);
  const atmos = effectiveAtmos;
  const mood = cabinMoods.find(m => m.key === profile.cabin_mood);
  const effectiveLayout = previewDesign?.design_data?.layout || profile.layout;
  const isHollow = effectiveLayout === 'hollow';
  const isTrailhead = effectiveLayout === 'trailhead';
  const isCanopy = effectiveLayout === 'canopy';

  return (
    <div
      className="min-h-screen transition-colors duration-700 pt-14"
      style={{ backgroundColor: atmos.background, color: atmos.text }}
    >
      {/* Design Preview Banner */}
      {previewDesign && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between text-sm font-body">
          <span>Previewing: {previewDesign.name}</span>
          <div className="flex gap-2">
            <button onClick={() => { setPreviewDesign(null); sessionStorage.removeItem('cabin_preview_design'); navigate('/cabin'); }}
              className="px-3 py-1 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors text-xs">
              Exit preview
            </button>
            {previewDesign.price_cents > 0 ? (
              <button onClick={() => navigate(`/marketplace/${previewDesign.id}`)}
                className="px-3 py-1 rounded-full bg-primary-foreground text-primary text-xs font-medium">
                Buy for ${(previewDesign.price_cents / 100).toFixed(0)} →
              </button>
            ) : (
              <button onClick={() => navigate(`/marketplace/${previewDesign.id}`)}
                className="px-3 py-1 rounded-full bg-primary-foreground text-primary text-xs font-medium">
                Get for free →
              </button>
            )}
          </div>
        </div>
      )}
      {/* Illustrated scene header */}
      <div className="relative w-full">
        <CabinScene
          memberName={isTrailhead ? '' : profile.display_name}
          atmosphere={profile.atmosphere}
          moonPhase={getMoonPhase()}
          latitude={profile.latitude ?? undefined}
          longitude={profile.longitude ?? undefined}
          postalCode={profile.zip_code ?? undefined}
          countryCode={profile.country_code ?? undefined}
          biome={profile.biome ?? undefined}
          creatureKey={profile.default_avatar_key ?? undefined}
          userId={profile.id}
        />
        {/* Trailhead: name overlaid on bottom of header */}
        {isTrailhead && (
          <div className="absolute bottom-0 left-0 right-0 px-8 pb-6 pt-16" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}>
            <div className="max-w-5xl mx-auto flex items-end gap-4">
              <CabinAvatar
                avatarUrl={profile.avatar_url}
                defaultAvatarKey={profile.default_avatar_key}
                isOwner={isOwner}
                isEditing={editOpen}
                profileId={profile.id}
                onUpdate={fetchProfile}
                size={isMobile ? 'sm' : 'lg'}
              />
              <div>
                <div className="flex items-center gap-2">
                  {mood && <span className="text-2xl">{mood.emoji}</span>}
                  <h1 className="text-3xl md:text-4xl font-display text-white drop-shadow-md">
                    {profile.display_name}
                  </h1>
                  {profile.is_pines_plus && <PineConeBadge className="w-4 h-4" />}
                </div>
                <p className="text-sm font-body text-white/60 mt-0.5">@{profile.handle}</p>
                {isOwner && monthlyVisits != null && monthlyVisits > 0 && (
                  <p className="text-xs font-body text-white/30 mt-1">{monthlyVisits} visit{monthlyVisits !== 1 ? 's' : ''} this month</p>
                )}
              </div>
            </div>
          </div>
        )}

        {isOwner && (
          <button
            onClick={() => setEditOpen(true)}
            className="absolute top-4 right-4 z-20 flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-body transition-all duration-300"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Settings size={14} />
            Edit Cabin
          </button>
        )}
      </div>

      {/* Mobile invite row for owner */}
      {isOwner && isMobile && (
        <div className="px-6 pt-4 md:hidden">
          <InviteRow />
        </div>
      )}

      {/* === HOLLOW LAYOUT === */}
      {isHollow ? (
        <div className="max-w-2xl mx-auto px-6 relative z-10">
          <div className="flex justify-center -mt-8 mb-4">
            <CabinAvatar avatarUrl={profile.avatar_url} defaultAvatarKey={profile.default_avatar_key} isOwner={isOwner} isEditing={editOpen} profileId={profile.id} onUpdate={fetchProfile} size={isMobile ? 'sm' : 'lg'} />
          </div>
          <div className="pt-4 pb-12 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              {mood && <span className="text-3xl">{mood.emoji}</span>}
              <h1 className="text-4xl md:text-5xl font-display" style={{ color: atmos.text }}>{profile.display_name}</h1>
              {profile.is_pines_plus && <PineConeBadge className="w-5 h-5" />}
            </div>
            <p className="text-sm font-body" style={{ color: atmos.text, opacity: 0.4 }}>@{profile.handle}</p>
            {isOwner && monthlyVisits != null && monthlyVisits > 0 && (
              <p className="text-xs font-body mt-1" style={{ color: atmos.text, opacity: 0.25 }}>{monthlyVisits} visit{monthlyVisits !== 1 ? 's' : ''} this month</p>
            )}
            {profile.mantra && (
              <p className="mt-8 text-xl md:text-2xl font-display italic leading-relaxed" style={{ color: atmos.text, opacity: 0.7 }}>"{profile.mantra}"</p>
            )}
          </div>
          <div className="py-12 space-y-6" style={{ borderTop: `1px solid ${atmos.border}` }}>
            <CabinMetaRow profile={profile} temperature={temperature} tempUnit={tempUnit} atmos={atmos} centered />
            {profile.bio && <p className="text-sm font-body text-center max-w-md mx-auto" style={{ color: atmos.text, opacity: 0.6 }}>{profile.bio}</p>}
             <CabinPinnedSong profile={profile} atmos={atmos} centered />
             <CabinCircleStack profileId={profile.id} isOwner={isOwner} atmosphere={atmos} />
           </div>
          {profile.is_pines_plus && <div className="py-8"><WidgetShelf userId={profile.id} isPinesPlus={profile.is_pines_plus} atmosphere={atmos} /></div>}
          <div className="py-12 space-y-6"><CabinPostHistory profileId={profile.id} isOwner={isOwner} isInCircle={isInCircle} atmosphere={atmos} /></div>
          <CabinCircleActions isOwner={isOwner} user={user} profile={profile} cabinMenuOpen={cabinMenuOpen} setCabinMenuOpen={setCabinMenuOpen} navigate={navigate} />
        </div>

      ) : isTrailhead ? (
        /* === TRAILHEAD LAYOUT === */
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          {/* Bio strip below header */}
          <div className="py-6 space-y-3" style={{ borderBottom: `1px solid ${atmos.border}` }}>
            {profile.mantra && (
              <p className="text-lg font-display italic" style={{ color: atmos.text, opacity: 0.8 }}>"{profile.mantra}"</p>
            )}
            <CabinMetaRow profile={profile} temperature={temperature} tempUnit={tempUnit} atmos={atmos} />
             {profile.bio && <p className="text-sm font-body max-w-xl" style={{ color: atmos.text, opacity: 0.7 }}>{profile.bio}</p>}
             <CabinPinnedSong profile={profile} atmos={atmos} />
             <CabinCircleStack profileId={profile.id} isOwner={isOwner} atmosphere={atmos} />
          </div>

          {/* Two-column editorial */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-5 gap-8 pb-16">
            <div className="md:col-span-3 space-y-6">
              <CabinPostHistory profileId={profile.id} isOwner={isOwner} isInCircle={isInCircle} atmosphere={atmos} />
            </div>
            <div className="md:col-span-2 space-y-6">
              <CollectionsShelf profileId={profile.id} handle={profile.handle} isOwner={isOwner} atmosphere={atmos} />
              {profile.is_pines_plus && <WidgetShelf userId={profile.id} isPinesPlus={profile.is_pines_plus} atmosphere={atmos} />}
            </div>
          </div>
          <CabinCircleActions isOwner={isOwner} user={user} profile={profile} cabinMenuOpen={cabinMenuOpen} setCabinMenuOpen={setCabinMenuOpen} navigate={navigate} />
        </div>

      ) : isCanopy ? (
        /* === CANOPY LAYOUT === */
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          {/* Compact name card */}
          <div className="flex items-center gap-4 py-6">
            <CabinAvatar avatarUrl={profile.avatar_url} defaultAvatarKey={profile.default_avatar_key} isOwner={isOwner} isEditing={editOpen} profileId={profile.id} onUpdate={fetchProfile} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {mood && <span className="text-xl">{mood.emoji}</span>}
                <h1 className="text-2xl font-display truncate" style={{ color: atmos.text }}>{profile.display_name}</h1>
                {profile.is_pines_plus && <PineConeBadge className="w-3.5 h-3.5" />}
              </div>
              <p className="text-xs font-body" style={{ color: atmos.text, opacity: 0.4 }}>@{profile.handle}</p>
              {isOwner && monthlyVisits != null && monthlyVisits > 0 && (
                <p className="text-[10px] font-body mt-0.5" style={{ color: atmos.text, opacity: 0.25 }}>{monthlyVisits} visit{monthlyVisits !== 1 ? 's' : ''} this month</p>
              )}
            </div>
            <div className="hidden md:block text-right">
              <CabinMetaRow profile={profile} temperature={temperature} tempUnit={tempUnit} atmos={atmos} />
            </div>
          </div>

          {profile.bio && (
            <p className="text-sm font-body mb-6 max-w-lg" style={{ color: atmos.text, opacity: 0.6 }}>{profile.bio}</p>
          )}

          {/* Masonry-style grid */}
          <div className="columns-2 md:columns-3 gap-4 pb-16 [column-fill:_balance]">
            <CollectionsShelf profileId={profile.id} handle={profile.handle} isOwner={isOwner} atmosphere={atmos} />
            <CabinPostHistory profileId={profile.id} isOwner={isOwner} isInCircle={isInCircle} atmosphere={atmos} />
          </div>

          {profile.is_pines_plus && <div className="pb-8"><WidgetShelf userId={profile.id} isPinesPlus={profile.is_pines_plus} atmosphere={atmos} /></div>}
          <CabinCircleActions isOwner={isOwner} user={user} profile={profile} cabinMenuOpen={cabinMenuOpen} setCabinMenuOpen={setCabinMenuOpen} navigate={navigate} />
        </div>

      ) : (
        /* === HEARTH LAYOUT (default) === */
        <div className="max-w-4xl mx-auto px-6 relative z-10" style={{ marginTop: isMobile ? -40 : -48 }}>
          <div
            className="rounded-2xl shadow-card transition-colors duration-700 relative"
            style={{ backgroundColor: atmos.cardBg, borderColor: atmos.border, borderWidth: 1 }}
          >
            <div className="absolute" style={{ top: isMobile ? -40 : -48, left: 24 }}>
              <CabinAvatar avatarUrl={profile.avatar_url} defaultAvatarKey={profile.default_avatar_key} isOwner={isOwner} isEditing={editOpen} profileId={profile.id} onUpdate={fetchProfile} size={isMobile ? 'sm' : 'lg'} />
            </div>
            <div className="flex items-start gap-4 pt-4 pr-8 pb-6" style={{ paddingLeft: isMobile ? 104 : 136 }}>
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-2">
                  {mood && <span className="text-2xl">{mood.emoji}</span>}
                  <h1 className="text-3xl font-display" style={{ color: atmos.text }}>{profile.display_name}</h1>
                  {profile.is_pines_plus && <PineConeBadge className="w-4 h-4" />}
                </div>
                <p className="text-sm font-body mt-1" style={{ color: atmos.text, opacity: 0.5 }}>@{profile.handle}</p>
                {isOwner && monthlyVisits != null && monthlyVisits > 0 && (
                  <p className="text-xs font-body mt-1" style={{ color: atmos.text, opacity: 0.25 }}>{monthlyVisits} visit{monthlyVisits !== 1 ? 's' : ''} this month</p>
                )}
              </div>
            </div>
            <div className="px-8 pb-8">
              {profile.mantra && <p className="mt-2 text-lg font-display italic" style={{ color: atmos.text, opacity: 0.8 }}>"{profile.mantra}"</p>}
              <div className="mt-4 h-px" style={{ backgroundColor: atmos.border }} />
              <div className="mt-4"><CabinMetaRow profile={profile} temperature={temperature} tempUnit={tempUnit} atmos={atmos} /></div>
               {profile.bio && <p className="mt-4 text-sm font-body" style={{ color: atmos.text, opacity: 0.7 }}>{profile.bio}</p>}
               <CabinPinnedSong profile={profile} atmos={atmos} />
               <div className="mt-4">
                 <CabinCircleStack profileId={profile.id} isOwner={isOwner} atmosphere={atmos} />
               </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 pb-16">
            <div className="md:col-span-2 space-y-6">
              <CabinPostHistory profileId={profile.id} isOwner={isOwner} isInCircle={isInCircle} atmosphere={atmos} />
            </div>
            <div className="space-y-6">
              <CollectionsShelf profileId={profile.id} handle={profile.handle} isOwner={isOwner} atmosphere={atmos} />
              {profile.is_pines_plus && <WidgetShelf userId={profile.id} isPinesPlus={profile.is_pines_plus} atmosphere={atmos} />}
            </div>
          </div>
          <CabinCircleActions isOwner={isOwner} user={user} profile={profile} cabinMenuOpen={cabinMenuOpen} setCabinMenuOpen={setCabinMenuOpen} navigate={navigate} />
        </div>
      )}

      {/* Suggestion box — visitors only */}
      {!isOwner && user && profile && (
        <SuggestionBox
          cabinOwnerId={profile.id}
          cabinOwnerHandle={profile.handle}
          atmosphere={atmos}
        />
      )}

      {/* Setup suggestion cards */}
      {isOwner && setupMode && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center px-6 z-30">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap gap-3 justify-center max-w-lg"
          >
            {[
              { emoji: '🖼️', label: 'Add a header image' },
              { emoji: '🎵', label: 'Pin a song' },
              { emoji: '✏️', label: 'Write your first line' },
            ].map((card, i) => (
              <motion.button
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-body shadow-card transition-transform duration-300"
                style={{
                  backgroundColor: atmos.cardBg,
                  color: atmos.text,
                  border: `1px solid ${atmos.border}`,
                }}
              >
                <span>{card.emoji}</span>
                {card.label}
              </motion.button>
            ))}
          </motion.div>
        </div>
      )}

      {isOwner && (
        <CabinEditDrawer
          open={editOpen}
          onClose={() => setEditOpen(false)}
          profile={profile}
          onUpdate={fetchProfile}
        />
      )}

      {/* Pines+ Welcome Overlay */}
      <AnimatePresence>
        {showUpgradeWelcome && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowUpgradeWelcome(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="relative rounded-2xl bg-card border border-border shadow-lg p-8 max-w-sm mx-4 text-center"
            >
              <p className="text-4xl mb-4">🌲</p>
              <h2 className="font-display text-xl text-foreground mb-2">Welcome to Pines+</h2>
              <p className="font-body text-sm text-muted-foreground mb-6">
                Your Cabin just got a little more yours. New atmospheres, more invites, and your Campfires kept forever.
              </p>
              <button
                onClick={() => setShowUpgradeWelcome(false)}
                className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm"
              >
                Explore what's new →
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

  

const CabinMoreMenu = ({
  targetUserId,
  targetDisplayName,
  open,
  setOpen,
  navigate,
}: {
  targetUserId: string;
  targetDisplayName: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  navigate: (path: string) => void;
}) => {
  const { openBlockDialog, handleMute, BlockConfirmDialog } = useBlockMute({
    targetUserId,
    targetDisplayName,
    onComplete: () => navigate('/'),
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 w-56 bg-card border border-border rounded-xl shadow-card overflow-hidden z-20"
          >
            <button
              onClick={() => { openBlockDialog(); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-sm font-body flex items-center gap-2 text-foreground hover:bg-muted transition-colors"
            >
              🚫 Step away from the fire
            </button>
            <button
              onClick={() => { handleMute(); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-sm font-body flex items-center gap-2 text-foreground hover:bg-muted transition-colors"
            >
              🔇 Bank the fire
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <BlockConfirmDialog />
    </div>
  );
};

// --- Shared sub-components for layouts ---

const CabinMetaRow = ({ profile, temperature, tempUnit, atmos, centered }: {
  profile: Profile; temperature: number | null; tempUnit: 'C' | 'F'; atmos: any; centered?: boolean;
}) => (
  <div className={`flex flex-wrap gap-4 text-sm font-body ${centered ? 'justify-center' : ''}`} style={{ color: atmos.text, opacity: 0.5 }}>
    {profile.currently_type && profile.currently_value && (
      <span>Currently {profile.currently_type} {profile.currently_value}</span>
    )}
    {profile.city && <span>{profile.city}</span>}
    {temperature != null && <span>{Math.round(temperature)}°{tempUnit}</span>}
  </div>
);

const CabinPinnedSong = ({ profile, atmos, centered }: { profile: Profile; atmos: any; centered?: boolean }) => {
  if (!profile.pinned_song_title) return null;
  return (
    <div className={centered ? 'flex justify-center' : 'mt-4'}>
      <div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-body"
        style={{ backgroundColor: `${atmos.accent}15`, color: atmos.accent }}
      >
        <Music size={14} />
        {profile.pinned_song_title}
        {profile.pinned_song_artist && ` — ${profile.pinned_song_artist}`}
      </div>
    </div>
  );
};

const CabinCircleActions = ({ isOwner, user, profile, cabinMenuOpen, setCabinMenuOpen, navigate }: {
  isOwner: boolean; user: any; profile: Profile; cabinMenuOpen: boolean; setCabinMenuOpen: (v: boolean) => void; navigate: (path: string) => void;
}) => {
  if (isOwner || !user || !profile) return null;
  return (
    <div className="flex items-center justify-center gap-3 pb-12">
      <CircleButton profileId={profile.id} profileName={profile.display_name} />
      <CabinMoreMenu
        targetUserId={profile.id}
        targetDisplayName={profile.display_name}
        open={cabinMenuOpen}
        setOpen={setCabinMenuOpen}
        navigate={navigate}
      />
    </div>
  );
};

const PineConeBadge = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    className={`inline-block opacity-50 shrink-0 ${className}`}
    aria-label="Pines+ member"
    role="img"
  >
    <path d="M8 1C8 1 6 3.5 6 4.5C6 5.2 6.8 5.8 8 6C9.2 5.8 10 5.2 10 4.5C10 3.5 8 1 8 1Z" />
    <path d="M8 4C8 4 5 7 5 8.5C5 9.5 6.2 10.3 8 10.5C9.8 10.3 11 9.5 11 8.5C11 7 8 4 8 4Z" />
    <path d="M8 7.5C8 7.5 4.5 10.5 4.5 12C4.5 13.2 5.8 14 8 14C10.2 14 11.5 13.2 11.5 12C11.5 10.5 8 7.5 8 7.5Z" />
    <rect x="7.25" y="13" width="1.5" height="2.5" rx="0.5" />
  </svg>
);

export default Cabin;
