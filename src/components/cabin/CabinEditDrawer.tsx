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
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/use-mobile';
import { getBiomeFromLocation } from '@/lib/biomeMapping';

const COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'MT', name: 'Malta' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NO', name: 'Norway' },
  { code: 'PT', name: 'Portugal' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

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
  hometown: string | null;
  job: string | null;
  links: { url: string; label: string }[] | null;
  interests: string | null;
  how_found: string | null;
  sitting_question: string | null;
  ask_me_about: string[] | null;
  pinned_memory_post_id: string | null;
  featured_photos: string[] | null;
  moments: { title: string; year?: string; note?: string }[] | null;
  trail_map_visible: boolean | null;
  spotify_track_id: string | null;
  spotify_preview_url: string | null;
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
  const [tab, setTab] = useState<'you' | 'about' | 'appearance' | 'details' | 'widgets'>('you');
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
    country_code: profile.country_code || 'US',
    atmosphere: profile.atmosphere,
    layout: profile.layout,
    accent_color: profile.accent_color,
    cabin_mood: profile.cabin_mood,
    pinned_song_title: profile.pinned_song_title || '',
    pinned_song_artist: profile.pinned_song_artist || '',
    hometown: profile.hometown || '',
    job: profile.job || '',
    links: (Array.isArray(profile.links) ? profile.links : []) as { url: string; label: string }[],
    interests: profile.interests || '',
    how_found: profile.how_found || '',
    sitting_question: profile.sitting_question || '',
    ask_me_about: (Array.isArray(profile.ask_me_about) ? profile.ask_me_about : []) as string[],
    pinned_memory_post_id: profile.pinned_memory_post_id || '',
    featured_photos: (Array.isArray(profile.featured_photos) ? profile.featured_photos : []) as string[],
    moments: (Array.isArray(profile.moments) ? profile.moments : []) as { title: string; year?: string; note?: string }[],
  });
  const [ownPosts, setOwnPosts] = useState<{ id: string; content: string | null; post_type: string; created_at: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const save = useCallback(async (updates: Partial<typeof form>) => {
    setSaving(true);
    const payload: any = { ...updates };

    // If zip or country changed, geocode and recompute biome
    const zipChanged = updates.zip_code != null && updates.zip_code !== profile.zip_code;
    const countryChanged = updates.country_code != null && updates.country_code !== profile.country_code;

    if (zipChanged || countryChanged) {
      const currentZip = updates.zip_code ?? form.zip_code;
      const currentCountry = updates.country_code ?? form.country_code;

      if (zipChanged && currentZip) {
        const geo = await geocodeZip(currentZip);
        if (geo) {
          payload.latitude = geo.lat;
          payload.longitude = geo.lon;
          payload.city = geo.city;
        }
      }

      // Recompute biome from location
      payload.biome = getBiomeFromLocation(currentZip, currentCountry);
    }

    await supabase.from('profiles').update(payload).eq('id', profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onUpdate();
  }, [profile.id, profile.zip_code, profile.country_code, form.zip_code, form.country_code, onUpdate]);

  // Debounced auto-save
  const JSON_FIELDS = ['links', 'ask_me_about', 'featured_photos', 'moments'] as const;
  useEffect(() => {
    const timer = setTimeout(() => {
      const changes: any = {};
      const fields = Object.keys(form) as (keyof typeof form)[];
      for (const key of fields) {
        const profileVal = (profile as any)[key];
        const formVal = form[key];
        if ((JSON_FIELDS as readonly string[]).includes(key)) {
          const pv = JSON.stringify(Array.isArray(profileVal) ? profileVal : []);
          const fv = JSON.stringify(formVal);
          if (fv !== pv) {
            if (key === 'links') {
              changes[key] = (formVal as any[]).filter((l: any) => l.url || l.label);
            } else if (key === 'ask_me_about') {
              changes[key] = (formVal as string[]).filter(Boolean);
            } else if (key === 'moments') {
              changes[key] = (formVal as any[]).filter((m: any) => m.title);
            } else {
              changes[key] = formVal;
            }
          }
        } else {
          const pv = profileVal || '';
          if (formVal !== pv) {
            changes[key] = formVal || null;
          }
        }
      }
      if (Object.keys(changes).length > 0) {
        save(changes);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [form, profile, save]);

  // Load own posts for pinned memory picker
  useEffect(() => {
    const loadPosts = async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, content, post_type, created_at')
        .eq('author_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setOwnPosts(data);
    };
    loadPosts();
  }, [profile.id]);

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };


  const tabs = [
    { key: 'you', label: 'You' },
    { key: 'about', label: 'About' },
    { key: 'appearance', label: 'Look' },
    { key: 'details', label: 'Details' },
    { key: 'widgets', label: 'Widgets' },
  ] as const;

  const updateLink = (index: number, field: 'url' | 'label', value: string) => {
    setForm(prev => {
      const links = [...prev.links];
      links[index] = { ...links[index], [field]: value };
      return { ...prev, links };
    });
  };

  const addLink = () => {
    if (form.links.length >= 5) return;
    setForm(prev => ({ ...prev, links: [...prev.links, { url: '', label: '' }] }));
  };

  const removeLink = (index: number) => {
    setForm(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== index) }));
  };

  const updateAskMeAbout = (index: number, value: string) => {
    setForm(prev => {
      const arr = [...prev.ask_me_about];
      arr[index] = value;
      return { ...prev, ask_me_about: arr };
    });
  };

  const addAskMeAbout = () => {
    if (form.ask_me_about.length >= 3) return;
    setForm(prev => ({ ...prev, ask_me_about: [...prev.ask_me_about, ''] }));
  };

  const removeAskMeAbout = (index: number) => {
    setForm(prev => ({ ...prev, ask_me_about: prev.ask_me_about.filter((_, i) => i !== index) }));
  };

  const updateMoment = (index: number, field: string, value: string) => {
    setForm(prev => {
      const moments = [...prev.moments];
      moments[index] = { ...moments[index], [field]: value };
      return { ...prev, moments };
    });
  };

  const addMoment = () => {
    setForm(prev => ({ ...prev, moments: [...prev.moments, { title: '' }] }));
  };

  const removeMoment = (index: number) => {
    setForm(prev => ({ ...prev, moments: prev.moments.filter((_, i) => i !== index) }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || form.featured_photos.length >= 6) return;
    setUploadingPhoto(true);
    const remaining = 6 - form.featured_photos.length;
    const toUpload = Array.from(files).slice(0, remaining);
    const newUrls: string[] = [];
    for (const file of toUpload) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${profile.id}/featured/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('cabin-headers').upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('cabin-headers').getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }
    }
    if (newUrls.length > 0) {
      setForm(prev => ({ ...prev, featured_photos: [...prev.featured_photos, ...newUrls] }));
    }
    setUploadingPhoto(false);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setForm(prev => ({ ...prev, featured_photos: prev.featured_photos.filter((_, i) => i !== index) }));
  };

  const atmos = getAtmosphere(form.atmosphere, theme);

  const drawerContent = (
    <div className="flex flex-col min-h-0 flex-1 bg-card">
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
              <select
                value={form.country_code}
                onChange={e => updateField('country_code', e.target.value)}
                className="w-full rounded-xl bg-background border border-input px-3 py-2 text-sm mb-2"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <Input
                value={form.zip_code}
                onChange={e => updateField('zip_code', e.target.value)}
                placeholder={form.country_code === 'US' ? 'Zip code' : 'Postal code'}
                className="rounded-xl bg-background"
              />
            </Field>
          </>
        )}

        {tab === 'about' && (
          <>
            <p className="text-xs font-body text-muted-foreground mb-4">A little more about you</p>

            <Field label="Hometown" hint="Optional">
              <Input
                value={form.hometown}
                onChange={e => updateField('hometown', e.target.value)}
                placeholder="Where you're from"
                className="rounded-xl bg-background"
              />
            </Field>

            <Field label="What you do or make" hint="Optional">
              <Input
                value={form.job}
                onChange={e => updateField('job', e.target.value)}
                placeholder="What do you do or make?"
                className="rounded-xl bg-background"
              />
            </Field>

            <Field label="Interests & hobbies" hint="Comma-separated">
              <Input
                value={form.interests}
                onChange={e => updateField('interests', e.target.value)}
                placeholder="hiking, bread baking, botany, jazz"
                className="rounded-xl bg-background"
              />
            </Field>

            <Field label="How you found your way here" hint="Optional">
              <Input
                value={form.how_found}
                onChange={e => updateField('how_found', e.target.value)}
                placeholder="A friend, a link, a lucky accident…"
                className="rounded-xl bg-background"
              />
            </Field>

            <Field label="A question you're sitting with" hint="Optional">
              <Input
                value={form.sitting_question}
                onChange={e => updateField('sitting_question', e.target.value)}
                placeholder="What are you mulling over?"
                className="rounded-xl bg-background"
              />
            </Field>

            <Field label="Ask me about" hint={`${form.ask_me_about.length}/3`}>
              <div className="space-y-2">
                {form.ask_me_about.map((topic, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={topic}
                      onChange={e => updateAskMeAbout(i, e.target.value)}
                      placeholder="A topic you love discussing"
                      className="rounded-xl bg-background text-sm flex-1"
                    />
                    <button onClick={() => removeAskMeAbout(i)} className="text-xs text-muted-foreground hover:text-destructive px-1">✕</button>
                  </div>
                ))}
                {form.ask_me_about.length < 3 && (
                  <button onClick={addAskMeAbout} className="text-xs font-body text-primary hover:underline">+ Add topic</button>
                )}
              </div>
            </Field>

            <Field label="Links" hint={`${form.links.length}/5`}>
              <div className="space-y-2">
                {form.links.map((link, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input
                        value={link.label}
                        onChange={e => updateLink(i, 'label', e.target.value)}
                        placeholder="Label (e.g. My blog)"
                        className="rounded-xl bg-background text-xs"
                      />
                      <Input
                        value={link.url}
                        onChange={e => updateLink(i, 'url', e.target.value)}
                        placeholder="https://…"
                        className="rounded-xl bg-background text-xs"
                      />
                    </div>
                    <button
                      onClick={() => removeLink(i)}
                      className="mt-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {form.links.length < 5 && (
                  <button
                    onClick={addLink}
                    className="text-xs font-body text-primary hover:underline"
                  >
                    + Add link
                  </button>
                )}
              </div>
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

            <Field label="Pinned memory" hint="Pin one of your posts to the top of your Cabin">
              {ownPosts.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {form.pinned_memory_post_id && (
                    <button
                      onClick={() => updateField('pinned_memory_post_id', '')}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-body text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      ✕ Remove pinned memory
                    </button>
                  )}
                  {ownPosts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => updateField('pinned_memory_post_id', p.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-body transition-all border ${
                        form.pinned_memory_post_id === p.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted'
                      }`}
                    >
                      <span className="line-clamp-1">{p.content?.slice(0, 80) || `${p.post_type} post`}</span>
                      <span className="block text-muted-foreground mt-0.5">{new Date(p.created_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-body text-muted-foreground">No posts yet. Write something first!</p>
              )}
            </Field>

            <Field label="Featured photos" hint={`${form.featured_photos.length}/6`}>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {form.featured_photos.map((url, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {form.featured_photos.length < 6 && (
                <label className="inline-flex items-center gap-1.5 text-xs font-body text-primary hover:underline cursor-pointer">
                  + Add photo
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                </label>
              )}
              {uploadingPhoto && <p className="text-xs text-muted-foreground mt-1">Uploading…</p>}
            </Field>

            <Field label="Moments" hint="Personal milestones">
              <div className="space-y-3">
                {form.moments.map((m, i) => (
                  <div key={i} className="rounded-xl border border-border p-3 space-y-1.5">
                    <div className="flex gap-2">
                      <Input
                        value={m.title}
                        onChange={e => updateMoment(i, 'title', e.target.value)}
                        placeholder="What happened"
                        className="rounded-xl bg-background text-sm flex-1"
                      />
                      <Input
                        value={m.year || ''}
                        onChange={e => updateMoment(i, 'year', e.target.value)}
                        placeholder="Year"
                        className="rounded-xl bg-background text-sm w-20"
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <Input
                        value={m.note || ''}
                        onChange={e => updateMoment(i, 'note', e.target.value)}
                        placeholder="A short note (optional)"
                        className="rounded-xl bg-background text-xs flex-1"
                      />
                      <button onClick={() => removeMoment(i)} className="text-xs text-muted-foreground hover:text-destructive px-1">✕</button>
                    </div>
                  </div>
                ))}
                <button onClick={addMoment} className="text-xs font-body text-primary hover:underline">+ Add moment</button>
              </div>
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
                  <div className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>🗺️</span>
                        <span className="text-sm font-body font-medium text-foreground">Trail Map</span>
                      </div>
                      <Switch
                        checked={profile.trail_map_visible ?? true}
                        onCheckedChange={async (checked) => {
                          await supabase.from('profiles').update({ trail_map_visible: checked } as any).eq('id', profile.id);
                          onUpdate();
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground font-body mt-1">
                      An interactive world map with your "Been here" and "Want to go" pins.
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
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-card flex flex-col"
              style={{ maxHeight: '90dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="w-12 h-1.5 rounded-full bg-border mx-auto mt-3 mb-1 shrink-0" />
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
