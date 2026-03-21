import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { atmospheres, cabinMoods, accentColors, getAtmosphere } from '@/lib/cabin-config';
import { useTheme } from '@/contexts/ThemeContext';
import { geocodeZip } from '@/lib/weather';
import { defaultAvatars, getAvatarSrc } from '@/lib/default-avatars';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

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

interface CabinEditDrawerProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onUpdate: () => void;
}

const CabinEditDrawer = ({ open, onClose, profile, onUpdate }: CabinEditDrawerProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const [tab, setTab] = useState<'you' | 'appearance' | 'details' | 'widgets'>('you');
  const [saving, setSaving] = useState(false);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    display_name: profile.display_name,
    handle: profile.handle,
    bio: profile.bio || '',
    mantra: profile.mantra || '',
    currently_type: profile.currently_type || '',
    currently_value: profile.currently_value || '',
    zip_code: profile.zip_code || '',
    atmosphere: profile.atmosphere,
    layout: profile.layout,
    accent_color: profile.accent_color,
    cabin_mood: profile.cabin_mood,
    pinned_song_title: profile.pinned_song_title || '',
    pinned_song_artist: profile.pinned_song_artist || '',
  });

  const save = useCallback(async (updates: Partial<typeof form>) => {
    setSaving(true);
    const payload: any = { ...updates };

    // If zip changed, geocode it
    if (updates.zip_code && updates.zip_code !== profile.zip_code) {
      const geo = await geocodeZip(updates.zip_code);
      if (geo) {
        payload.latitude = geo.lat;
        payload.longitude = geo.lon;
        payload.city = geo.city;
      }
    }

    await supabase.from('profiles').update(payload).eq('id', profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onUpdate();
  }, [profile.id, profile.zip_code, onUpdate]);

  // Debounced auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      const changes: any = {};
      const fields = Object.keys(form) as (keyof typeof form)[];
      for (const key of fields) {
        const profileVal = (profile as any)[key] || '';
        if (form[key] !== profileVal) {
          changes[key] = form[key] || null;
        }
      }
      if (Object.keys(changes).length > 0) {
        save(changes);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [form, profile, save]);

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    const path = `${profile.id}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('cabin-headers').upload(path, file, { upsert: true });
    if (error) {
      toast.error('Could not upload image');
      return;
    }

    const { data: urlData } = supabase.storage.from('cabin-headers').getPublicUrl(path);
    await supabase.from('profiles').update({ header_image_url: urlData.publicUrl }).eq('id', profile.id);
    onUpdate();
    toast.success('Header updated');
  };

  const tabs = [
    { key: 'you', label: 'You' },
    { key: 'appearance', label: 'Appearance' },
    { key: 'details', label: 'Details' },
    { key: 'widgets', label: 'Widgets' },
  ] as const;

  const atmos = getAtmosphere(form.atmosphere, theme);

  const drawerContent = (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-display text-foreground">Edit Cabin</h3>
          {saved && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted-foreground font-body flex items-center gap-1"
            >
              <Check size={12} /> Saved
            </motion.span>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-body transition-colors ${
              tab === t.key
                ? 'text-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {tab === 'you' && (
          <>
            <Field label="Avatar">
              <div className="flex items-center gap-4 mb-2">
                <img
                  src={getAvatarSrc(profile.avatar_url, profile.default_avatar_key)}
                  alt="Current avatar"
                  className="w-14 h-14 rounded-full object-cover"
                  style={{ border: '2px solid var(--border)' }}
                />
                <p className="text-xs text-muted-foreground font-body">
                  {profile.avatar_url ? 'Custom photo set. Tap your avatar on the Cabin to change it.' : 'Pick a default avatar below, or tap the camera on your Cabin avatar to upload a photo.'}
                </p>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {Object.entries(defaultAvatars).map(([key, { src, label }]) => (
                  <button
                    key={key}
                    onClick={async () => {
                      await supabase.from('profiles').update({ default_avatar_key: key, avatar_url: null }).eq('id', profile.id);
                      onUpdate();
                    }}
                    className={`rounded-full overflow-hidden transition-all ${
                      !profile.avatar_url && profile.default_avatar_key === key ? 'ring-2 ring-primary ring-offset-1' : 'hover:scale-105'
                    }`}
                    title={label}
                  >
                    <img src={src} alt={label} className="w-full h-full object-cover aspect-square" />
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Display name">
              <Input
                value={form.display_name}
                onChange={e => updateField('display_name', e.target.value)}
                className="rounded-xl bg-background"
              />
            </Field>
            <Field label="Handle">
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">@</span>
                <Input
                  value={form.handle}
                  onChange={e => updateField('handle', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="rounded-xl bg-background"
                />
              </div>
            </Field>
            <Field label="Mantra" hint={`${form.mantra.length}/80`}>
              <Input
                value={form.mantra}
                onChange={e => updateField('mantra', e.target.value.slice(0, 80))}
                placeholder="One sentence you're living by"
                className="rounded-xl bg-background"
              />
            </Field>
            <Field label="Currently">
              <div className="flex gap-2">
                <select
                  value={form.currently_type}
                  onChange={e => updateField('currently_type', e.target.value)}
                  className="rounded-xl bg-background border border-input px-3 py-2 text-sm font-body"
                >
                  <option value="">—</option>
                  <option value="reading">reading</option>
                  <option value="listening">listening to</option>
                  <option value="thinking">thinking about</option>
                </select>
                <Input
                  value={form.currently_value}
                  onChange={e => updateField('currently_value', e.target.value)}
                  placeholder="..."
                  className="rounded-xl bg-background flex-1"
                />
              </div>
            </Field>
            <Field label="Bio" hint={`${form.bio.length}/200`}>
              <Textarea
                value={form.bio}
                onChange={e => updateField('bio', e.target.value.slice(0, 200))}
                placeholder="A few words about you"
                className="rounded-xl bg-background resize-none"
                rows={3}
              />
            </Field>
            <Field label="Location" hint="We use your zip to show weather. Never stored as precise location.">
              <Input
                value={form.zip_code}
                onChange={e => updateField('zip_code', e.target.value)}
                placeholder="Zip code"
                className="rounded-xl bg-background"
              />
            </Field>
          </>
        )}

        {tab === 'appearance' && (
          <>
            <Field label="Atmosphere">
              <div className="grid grid-cols-2 gap-2">
                {atmospheres.map(a => {
                  const locked = !a.free && !profile.is_pines_plus;
                  return (
                    <button
                      key={a.key}
                      onClick={() => !locked && updateField('atmosphere', a.key)}
                      disabled={locked}
                      className={`relative rounded-xl p-3 text-left text-xs font-body transition-all duration-300 border ${
                        form.atmosphere === a.key ? 'ring-2 ring-primary' : ''
                      } ${locked ? 'opacity-50' : 'hover:scale-102'}`}
                      style={{
                        backgroundColor: a.background,
                        color: a.text,
                        borderColor: a.border,
                      }}
                    >
                      <span className="font-medium">{a.label}</span>
                      <br />
                      <span style={{ opacity: 0.6 }}>{a.description}</span>
                      {locked && <span className="absolute top-2 right-2 text-xs">🌲</span>}
                    </button>
                  );
                })}
              </div>
              {!profile.is_pines_plus && (
                <p className="text-xs text-muted-foreground mt-2 font-body">
                  🌲 marks atmospheres available with Pines+
                </p>
              )}
            </Field>

            <Field label="Layout">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'hearth', label: 'Hearth', desc: 'Classic card + sidebar' },
                  { key: 'hollow', label: 'Hollow', desc: 'Centered & minimal' },
                  { key: 'trailhead', label: 'Trailhead', desc: 'Wide editorial columns' },
                  { key: 'canopy', label: 'Canopy', desc: 'Grid-forward gallery' },
                ].map(l => (
                  <button
                    key={l.key}
                    onClick={() => updateField('layout', l.key)}
                    className={`rounded-xl p-3 text-left text-sm font-body border transition-all hover:scale-102 ${
                      form.layout === l.key ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <span className="font-medium capitalize">{l.label}</span>
                    <span className="block text-xs opacity-60 mt-0.5">{l.desc}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Accent color">
              <div className="flex flex-wrap gap-2">
                {accentColors.map(c => (
                  <button
                    key={c}
                    onClick={() => updateField('accent_color', c)}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      form.accent_color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>

            <Field label="Cabin mood">
              <div className="flex flex-wrap gap-2">
                {cabinMoods.map(m => (
                  <button
                    key={m.key}
                    onClick={() => updateField('cabin_mood', m.key)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border transition-all ${
                      form.cabin_mood === m.key ? 'ring-2 ring-primary' : 'hover:scale-105'
                    }`}
                    title={m.label}
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>
            </Field>

            {/* Header is now a 100% illustrated scene — upload removed */}

            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              <button
                onClick={() => { onClose(); navigate('/marketplace'); }}
                className="w-full text-left px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors font-body text-sm text-foreground flex items-center gap-2"
              >
                🏕️ Browse designs
              </button>
              <button
                onClick={() => { onClose(); navigate('/designs/create'); }}
                className="w-full text-left px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors font-body text-sm text-foreground flex items-center gap-2"
              >
                🎨 Sell this design
              </button>
            </div>
          </>
        )}

        {tab === 'details' && (
          <>
            <Field label="Pinned song">
              <Input
                value={form.pinned_song_title}
                onChange={e => updateField('pinned_song_title', e.target.value)}
                placeholder="Song title"
                className="rounded-xl bg-background mb-2"
              />
              <Input
                value={form.pinned_song_artist}
                onChange={e => updateField('pinned_song_artist', e.target.value)}
                placeholder="Artist"
                className="rounded-xl bg-background"
              />
            </Field>
          </>
        )}

        {tab === 'widgets' && (
          <div className="py-4">
            {profile.is_pines_plus ? (
              <div className="space-y-4">
                <p className="text-sm font-body text-muted-foreground mb-4">
                  Manage your Bookshelf and Field Notes from your Cabin directly. 
                  They appear in the sidebar (Hearth) or below your profile (Hollow).
                </p>
                <div className="space-y-3">
                  <div className="rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span>📚</span>
                      <span className="text-sm font-body font-medium text-foreground">Bookshelf</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-body">
                      Up to 6 books displayed as illustrated spines. Add and remove books from your Cabin view.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span>📝</span>
                      <span className="text-sm font-body font-medium text-foreground">Field Notes</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-body">
                      A tiny public notebook. Up to 5 short notes (140 chars each). Newest at top.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 py-4">
                <span className="text-3xl">🌲</span>
                <h4 className="font-display text-lg text-foreground">Widget Shelf</h4>
                <p className="text-sm text-muted-foreground font-body">Available with Pines+</p>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">
                  Personalize your Cabin with a bookshelf,<br />
                  vinyl collection, trail map, and more.
                </p>
                <p className="text-xs text-muted-foreground font-body">
                  $10/year — less than a coffee
                </p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button
                    onClick={() => {
                      onClose();
                      navigate('/settings/subscription');
                    }}
                    className="rounded-pill text-sm font-body bg-primary text-primary-foreground"
                  >
                    $10/year
                  </Button>
                  <Button
                    onClick={() => {
                      onClose();
                      navigate('/settings/subscription');
                    }}
                    variant="outline"
                    className="rounded-pill text-sm font-body"
                  >
                    $1/month
                  </Button>
                  <Button variant="ghost" onClick={() => setTab('you')} className="rounded-pill text-sm font-body">
                    Maybe later
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/10 z-40"
          />

          {/* Drawer */}
          {isMobile ? (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-card max-h-sheet"
            >
              <div className="w-12 h-1.5 rounded-full bg-border mx-auto mt-3" />
              {drawerContent}
            </motion.div>
          ) : (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 right-0 bottom-0 z-50 shadow-card"
              style={{ width: 380 }}
            >
              {drawerContent}
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <div className="flex items-baseline justify-between mb-2">
      <label className="text-sm font-body font-medium text-foreground">{label}</label>
      {hint && <span className="text-xs text-muted-foreground font-body">{hint}</span>}
    </div>
    {children}
  </div>
);

export default CabinEditDrawer;
