import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import WeatherScene from '@/components/cabin/WeatherScene';
import CabinEditDrawer from '@/components/cabin/CabinEditDrawer';
import WidgetShelf from '@/components/cabin/WidgetShelf';
import CircleButton from '@/components/circles/CircleButton';
import CollectionsShelf from '@/components/cabin/CollectionsShelf';
import CabinPostHistory from '@/components/cabin/CabinPostHistory';
import PineTreeLoading from '@/components/PineTreeLoading';
import CabinAvatar from '@/components/cabin/CabinAvatar';
import { getAtmosphere, cabinMoods } from '@/lib/cabin-config';
import { getCurrentSeason } from '@/lib/weather';
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
}

const Cabin = () => {
  const { handle } = useParams<{ handle: string }>();
  const [searchParams] = useSearchParams();
  const setupMode = searchParams.get('setup') === 'true';
  const editOnLoad = searchParams.get('edit') === 'true';
  const upgraded = searchParams.get('upgraded') === 'true';
  const previewMode = searchParams.get('preview') === 'true';
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isInCircle, setIsInCircle] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showUpgradeWelcome, setShowUpgradeWelcome] = useState(false);
  const [previewDesign, setPreviewDesign] = useState<any>(null);
  const [cabinMenuOpen, setCabinMenuOpen] = useState(false);

  const { weatherCode, windSpeed, temperature } = useWeather(profile?.latitude, profile?.longitude);

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
      setProfile(data as Profile);
      const owner = user?.id === data.id;
      setIsOwner(owner);

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

      setWeatherReady(true);
      if (user && user.id !== data.id) {
        await supabase.from('cabin_visits').upsert(
          { profile_id: data.id, visit_date: new Date().toISOString().split('T')[0], visit_count: 1 },
          { onConflict: 'profile_id,visit_date' }
        );
      }

      if (owner && editOnLoad) {
        setEditOpen(true);
      }
    }
    setLoading(false);
  }, [handle, user, editOnLoad]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) return <PineTreeLoading />;

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
    ? getAtmosphere(previewDesign.design_data.atmosphere)
    : getAtmosphere(profile.atmosphere);
  const atmos = effectiveAtmos;
  const mood = cabinMoods.find(m => m.key === profile.cabin_mood);
  const season = getCurrentSeason();
  const currentHour = new Date().getHours();
  const effectiveLayout = previewDesign?.design_data?.layout || profile.layout;
  const isHollow = effectiveLayout === 'hollow';

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
      {/* Header with weather scene */}
      <div className="relative w-full" style={{ height: isHollow ? 400 : 280 }}>
        {profile.header_image_url ? (
          <img
            src={profile.header_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${atmos.background}, ${atmos.accent}30)` }} />
        )}
        <WeatherScene
          weatherCode={weatherCode}
          windSpeed={windSpeed}
          hour={currentHour}
          season={season}
          className="opacity-80"
          reducedParticles={window.innerWidth < 768}
        />

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

      {/* === HOLLOW LAYOUT === */}
      {isHollow ? (
        <div className="max-w-2xl mx-auto px-6 relative z-10">
          {/* Avatar centered above name */}
          <div className="flex justify-center -mt-8 mb-4">
            <CabinAvatar
              avatarUrl={profile.avatar_url}
              defaultAvatarKey={profile.default_avatar_key}
              isOwner={isOwner}
              isEditing={editOpen}
              profileId={profile.id}
              onUpdate={fetchProfile}
              size={isMobile ? 'sm' : 'lg'}
            />
          </div>
          {/* Large breathing room above the name */}
          <div className="pt-4 pb-12 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              {mood && <span className="text-3xl">{mood.emoji}</span>}
              <h1 className="text-4xl md:text-5xl font-display" style={{ color: atmos.text }}>
                {profile.display_name}
              </h1>
              {profile.is_pines_plus && <span title="Pines+" className="text-xl">🌲</span>}
            </div>
            <p className="text-sm font-body" style={{ color: atmos.text, opacity: 0.4 }}>
              @{profile.handle}
            </p>

            {profile.mantra && (
              <p className="mt-8 text-xl md:text-2xl font-display italic leading-relaxed" style={{ color: atmos.text, opacity: 0.7 }}>
                "{profile.mantra}"
              </p>
            )}
          </div>

          {/* Minimal info below the fold */}
          <div className="py-12 space-y-6" style={{ borderTop: `1px solid ${atmos.border}` }}>
            <div className="flex flex-wrap gap-4 text-sm font-body justify-center" style={{ color: atmos.text, opacity: 0.5 }}>
              {profile.currently_type && profile.currently_value && (
                <span>Currently {profile.currently_type} {profile.currently_value}</span>
              )}
              {profile.city && <span>{profile.city}</span>}
              {temperature != null && <span>{Math.round(temperature)}°C</span>}
            </div>

            {profile.bio && (
              <p className="text-sm font-body text-center max-w-md mx-auto" style={{ color: atmos.text, opacity: 0.6 }}>
                {profile.bio}
              </p>
            )}

            {profile.pinned_song_title && (
              <div className="flex justify-center">
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-body"
                  style={{ backgroundColor: `${atmos.accent}15`, color: atmos.accent }}
                >
                  <Music size={14} />
                  {profile.pinned_song_title}
                  {profile.pinned_song_artist && ` — ${profile.pinned_song_artist}`}
                </div>
              </div>
            )}
          </div>

          {/* Widgets */}
          {profile.is_pines_plus && (
            <div className="py-8">
              <WidgetShelf userId={profile.id} isPinesPlus={profile.is_pines_plus} atmosphere={atmos} />
            </div>
          )}

          {/* Post History */}
          <div className="py-12 space-y-6">
            <CabinPostHistory profileId={profile.id} isOwner={isOwner} isInCircle={isInCircle} atmosphere={atmos} />
          </div>

          {!isOwner && user && profile && (
            <div className="flex items-center justify-center gap-3 pb-16">
              <CircleButton profileId={profile.id} profileName={profile.display_name} />
              <CabinMoreMenu
                targetUserId={profile.id}
                targetDisplayName={profile.display_name}
                open={cabinMenuOpen}
                setOpen={setCabinMenuOpen}
                navigate={navigate}
              />
            </div>
          )}
        </div>
      ) : (
        /* === HEARTH LAYOUT (default) === */
        <div className="max-w-4xl mx-auto px-6 relative z-10" style={{ marginTop: isMobile ? -40 : -48 }}>
          <div
            className="rounded-2xl shadow-card transition-colors duration-700 relative"
            style={{ backgroundColor: atmos.cardBg, borderColor: atmos.border, borderWidth: 1 }}
          >
            {/* Avatar overlapping header/card boundary */}
            <div className="absolute" style={{ top: isMobile ? -40 : -48, left: 24 }}>
              <CabinAvatar
                avatarUrl={profile.avatar_url}
                defaultAvatarKey={profile.default_avatar_key}
                isOwner={isOwner}
                isEditing={editOpen}
                profileId={profile.id}
                onUpdate={fetchProfile}
                size={isMobile ? 'sm' : 'lg'}
              />
            </div>
            <div className="flex items-start gap-4 pt-4 pr-8 pb-6" style={{ paddingLeft: isMobile ? 104 : 136 }}>
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-2">
                  {mood && <span className="text-2xl">{mood.emoji}</span>}
                  <h1 className="text-3xl font-display" style={{ color: atmos.text }}>
                    {profile.display_name}
                  </h1>
                  {profile.is_pines_plus && <span title="Pines+" className="text-lg">🌲</span>}
                </div>
                <p className="text-sm font-body mt-1" style={{ color: atmos.text, opacity: 0.5 }}>
                  @{profile.handle}
                </p>
              </div>
            </div>

            <div className="px-8 pb-8">
            {profile.mantra && (
              <p className="mt-2 text-lg font-display italic" style={{ color: atmos.text, opacity: 0.8 }}>
                "{profile.mantra}"
              </p>
            )}

            <div className="mt-4 h-px" style={{ backgroundColor: atmos.border }} />

            <div className="mt-4 flex flex-wrap gap-4 text-sm font-body" style={{ color: atmos.text, opacity: 0.6 }}>
              {profile.currently_type && profile.currently_value && (
                <span>Currently {profile.currently_type} {profile.currently_value}</span>
              )}
              {profile.city && <span>{profile.city}</span>}
              {temperature != null && <span>{Math.round(temperature)}°C</span>}
            </div>

            {profile.bio && (
              <p className="mt-4 text-sm font-body" style={{ color: atmos.text, opacity: 0.7 }}>
                {profile.bio}
              </p>
            )}

            {profile.pinned_song_title && (
              <div
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-body"
                style={{ backgroundColor: `${atmos.accent}15`, color: atmos.accent }}
              >
                <Music size={14} />
                {profile.pinned_song_title}
                {profile.pinned_song_artist && ` — ${profile.pinned_song_artist}`}
              </div>
            )}
            </div>
          </div>

          {/* Two-column content */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 pb-16">
            <div className="md:col-span-2 space-y-6">
              <CabinPostHistory profileId={profile.id} isOwner={isOwner} isInCircle={isInCircle} atmosphere={atmos} />
            </div>
            <div className="space-y-6">
              <CollectionsShelf profileId={profile.id} handle={profile.handle} isOwner={isOwner} atmosphere={atmos} />

              {/* Widget Shelf in sidebar for Hearth */}
              {profile.is_pines_plus && (
                <WidgetShelf userId={profile.id} isPinesPlus={profile.is_pines_plus} atmosphere={atmos} />
              )}
            </div>
          </div>

          {!isOwner && user && profile && (
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
          )}
        </div>
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

export default Cabin;
