import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import WeatherScene from '@/components/cabin/WeatherScene';
import CabinEditDrawer from '@/components/cabin/CabinEditDrawer';
import PineTreeLoading from '@/components/PineTreeLoading';
import { getAtmosphere, cabinMoods } from '@/lib/cabin-config';
import { fetchWeather, geocodeZip, getCurrentSeason } from '@/lib/weather';
import { Button } from '@/components/ui/button';
import { Settings, Music, Copy } from 'lucide-react';
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
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [weather, setWeather] = useState<any>(null);

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
      setIsOwner(user?.id === data.id);

      // Fetch weather if location set
      if (data.latitude && data.longitude) {
        const w = await fetchWeather(data.latitude, data.longitude);
        setWeather(w);
      }

      // Record visit if not owner
      if (user && user.id !== data.id) {
        await supabase.from('cabin_visits').upsert(
          { profile_id: data.id, visit_date: new Date().toISOString().split('T')[0], visit_count: 1 },
          { onConflict: 'profile_id,visit_date' }
        );
      }
    }
    setLoading(false);
  }, [handle, user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) return <PineTreeLoading />;

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background texture-paper">
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

  return (
    <div
      className="min-h-screen transition-colors duration-700"
      style={{ backgroundColor: atmos.background, color: atmos.text }}
    >
      {/* Header with weather scene */}
      <div className="relative w-full" style={{ height: 280 }}>
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

        {/* Edit button */}
        {isOwner && (
          <button
            onClick={() => setEditOpen(true)}
            className="absolute top-4 right-4 z-20 flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-body transition-all duration-300 hover:scale-102"
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

      {/* Profile info */}
      <div className="max-w-4xl mx-auto px-6 -mt-6 relative z-10">
        <div
          className="rounded-2xl p-8 shadow-card transition-colors duration-700"
          style={{ backgroundColor: atmos.cardBg, borderColor: atmos.border, borderWidth: 1 }}
        >
          <div className="flex items-start gap-4">
            {mood && (
              <span className="text-2xl">{mood.emoji}</span>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-display" style={{ color: atmos.text }}>
                  {profile.display_name}
                </h1>
                {profile.is_pines_plus && (
                  <span title="Pines+" className="text-lg">🌲</span>
                )}
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
              <span>
                Currently {profile.currently_type} {profile.currently_value}
              </span>
            )}
            {profile.city && <span>{profile.city}</span>}
            {weather && (
              <span>{Math.round(weather.temperature)}°C</span>
            )}
          </div>

          {profile.bio && (
            <p className="mt-4 text-sm font-body" style={{ color: atmos.text, opacity: 0.7 }}>
              {profile.bio}
            </p>
          )}

          {/* Pinned song */}
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

        {/* Two column layout placeholder */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 pb-16">
          <div className="md:col-span-2">
            <div
              className="rounded-2xl p-8 text-center shadow-soft transition-colors duration-700"
              style={{ backgroundColor: atmos.cardBg, borderColor: atmos.border, borderWidth: 1 }}
            >
              <p className="text-sm font-body" style={{ color: atmos.text, opacity: 0.4 }}>
                Posts will live here. Phase 2.
              </p>
            </div>
          </div>
          <div>
            <div
              className="rounded-2xl p-6 text-center shadow-soft transition-colors duration-700"
              style={{ backgroundColor: atmos.cardBg, borderColor: atmos.border, borderWidth: 1 }}
            >
              <p className="text-sm font-body" style={{ color: atmos.text, opacity: 0.4 }}>
                Collections are coming soon.
              </p>
            </div>
          </div>
        </div>

        {/* Not owner: campfire button */}
        {!isOwner && user && (
          <div className="mt-4 flex justify-center pb-12">
            <Button
              onClick={() => toast.info('Campfires are coming soon')}
              className="rounded-pill px-6 font-body"
              style={{ backgroundColor: atmos.accent, color: atmos.cardBg }}
            >
              Send a Campfire
            </Button>
          </div>
        )}
      </div>

      {/* Setup mode suggestion cards */}
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
                className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-body shadow-card hover:scale-102 transition-transform duration-300"
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

      {/* Edit drawer */}
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
