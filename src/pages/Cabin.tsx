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
import { getAtmosphere, cabinMoods } from '@/lib/cabin-config';
import { fetchWeather, getCurrentSeason } from '@/lib/weather';
import { Button } from '@/components/ui/button';
import { Settings, Music } from 'lucide-react';
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
}

const Cabin = () => {
  const { handle } = useParams<{ handle: string }>();
  const [searchParams] = useSearchParams();
  const setupMode = searchParams.get('setup') === 'true';
  const editOnLoad = searchParams.get('edit') === 'true';
  const upgraded = searchParams.get('upgraded') === 'true';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isInCircle, setIsInCircle] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [weather, setWeather] = useState<any>(null);
  const [showUpgradeWelcome, setShowUpgradeWelcome] = useState(false);

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

      if (data.latitude && data.longitude) {
        const w = await fetchWeather(data.latitude, data.longitude);
        setWeather(w);
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

  const atmos = getAtmosphere(profile.atmosphere);
  const mood = cabinMoods.find(m => m.key === profile.cabin_mood);
  const season = getCurrentSeason();
  const currentHour = new Date().getHours();
  const isHollow = profile.layout === 'hollow';

  return (
    <div
      className="min-h-screen transition-colors duration-700 pt-14"
      style={{ backgroundColor: atmos.background, color: atmos.text }}
    >
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
          weatherCode={weather?.weathercode ?? 0}
          windSpeed={weather?.windspeed ?? 0}
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
          {/* Large breathing room above the name */}
          <div className="pt-20 pb-12 text-center">
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
              {weather && <span>{Math.round(weather.temperature)}°C</span>}
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

          {!isOwner && user && (
            <div className="flex justify-center pb-16">
              <CircleButton profileId={profile.id} profileName={profile.display_name} />
            </div>
          )}
        </div>
      ) : (
        /* === HEARTH LAYOUT (default) === */
        <div className="max-w-4xl mx-auto px-6 -mt-6 relative z-10">
          <div
            className="rounded-2xl p-8 shadow-card transition-colors duration-700"
            style={{ backgroundColor: atmos.cardBg, borderColor: atmos.border, borderWidth: 1 }}
          >
            <div className="flex items-start gap-4">
              {mood && <span className="text-2xl">{mood.emoji}</span>}
              <div className="flex-1">
                <div className="flex items-center gap-2">
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

            {profile.mantra && (
              <p className="mt-4 text-lg font-display italic" style={{ color: atmos.text, opacity: 0.8 }}>
                "{profile.mantra}"
              </p>
            )}

            <div className="mt-4 h-px" style={{ backgroundColor: atmos.border }} />

            <div className="mt-4 flex flex-wrap gap-4 text-sm font-body" style={{ color: atmos.text, opacity: 0.6 }}>
              {profile.currently_type && profile.currently_value && (
                <span>Currently {profile.currently_type} {profile.currently_value}</span>
              )}
              {profile.city && <span>{profile.city}</span>}
              {weather && <span>{Math.round(weather.temperature)}°C</span>}
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

          {!isOwner && user && (
            <div className="flex justify-center pb-12">
              <CircleButton profileId={profile.id} profileName={profile.display_name} />
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
    </div>
  );
};

export default Cabin;
