import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, GripVertical, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import PineTreeLoading from '@/components/PineTreeLoading';
import UserAvatar from '@/components/UserAvatar';
import {
  usePageProfile, usePageModules, usePageTheme, useTopFriends, type PageTheme,
} from '@/hooks/useProfilePage';
import { useFriendLists } from '@/hooks/useFriends';
import {
  useSaveBasics,
  useSaveModules,
  useSavePageTheme,
  useSaveTopFriends,
  MAX_TOP_FRIENDS,
  MODULE_TYPES,
  type PageModuleDraft,
} from '@/hooks/usePageEditor';
import { useAlbums } from '@/hooks/usePhotos';
import { useFeaturedAlbumRows, useSaveFeaturedAlbums } from '@/hooks/useFeaturedPage';

import { contrastRatio, hexToHslTriplet, hslTripletToHex } from '@/lib/color';
import { addModule, moveItem, moveModule, removeModule, updateModule } from '@/lib/pageModules';
// profile.css supplies .module and .page-2006, which the preview reuses so it
// shows the same rules the real page will.
import '@/styles/profile.css';
import '@/styles/customizer.css';

const DEFAULTS = { background: '#fff8e9', card: '#fffdf7', foreground: '#172033', accent: '#e65f3c' };

const CURRENTLY_TYPES = ['reading', 'listening to', 'watching', 'making', 'thinking about'];

/**
 * Edit my page.
 *
 * Phase 3c retired the Cabin scene and its editor together, which left the
 * profile customizable in principle and uneditable in practice. This is the
 * replacement, and it deliberately covers the three things a page is: what it
 * says, what it looks like, and what plays on it.
 */
const PageCustomizer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading } = usePageProfile();
  const { data: savedModules } = usePageModules(profile?.id);
  const { data: savedTheme } = usePageTheme(profile?.id);
  const { data: savedTopFriends } = useTopFriends(profile?.id);
  const { data: friendLists } = useFriendLists();
  const { data: albums } = useAlbums(profile?.id);
  const { data: savedFeatured } = useFeaturedAlbumRows(profile?.id);

  const saveBasics = useSaveBasics(user?.id);
  const saveModules = useSaveModules(user?.id);
  const saveTheme = useSavePageTheme(user?.id);
  const saveTopFriends = useSaveTopFriends(user?.id);
  const saveFeatured = useSaveFeaturedAlbums(user?.id);


  const [displayName, setDisplayName] = useState('');
  const [mantra, setMantra] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [currentlyType, setCurrentlyType] = useState('');
  const [currentlyValue, setCurrentlyValue] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songUrl, setSongUrl] = useState('');

  const [colors, setColors] = useState(DEFAULTS);
  const [full2006, setFull2006] = useState(false);
  const [modules, setModules] = useState<PageModuleDraft[]>([]);
  const [topFriendIds, setTopFriendIds] = useState<string[]>([]);
  /** The corkboard: which albums are pinned up, in order, and which photo shows. */
  const [featuredPicks, setFeaturedPicks] = useState<{ album_id: string; cover_media_id: string | null }[]>([]);



  // Seed the form once the profile arrives. Keyed on profile.id rather than the
  // object so a background refetch cannot stomp on what is being typed.
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? '');
    setMantra(profile.mantra ?? '');
    setBio(profile.bio ?? '');
    setCity(profile.city ?? '');
    setCurrentlyType(profile.currently_type ?? '');
    setCurrentlyValue(profile.currently_value ?? '');
    setSongTitle(profile.pinned_song_title ?? '');
    setSongArtist(profile.pinned_song_artist ?? '');
    setSongUrl(profile.pinned_song_preview_url ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    if (!savedTheme) return;
    setColors({
      background: hslTripletToHex(savedTheme.background ?? '') ?? DEFAULTS.background,
      card: hslTripletToHex(savedTheme.card ?? '') ?? DEFAULTS.card,
      foreground: hslTripletToHex(savedTheme.foreground ?? '') ?? DEFAULTS.foreground,
      accent: savedTheme.accent ?? DEFAULTS.accent,
    });
    setFull2006(!!savedTheme.full2006);
  }, [savedTheme]);

  useEffect(() => {
    if (!savedTopFriends) return;
    setTopFriendIds(savedTopFriends.map(t => t.friend_id));
  }, [savedTopFriends]);

  useEffect(() => {
    if (!savedFeatured) return;
    setFeaturedPicks(savedFeatured.map(r => ({ album_id: r.album_id, cover_media_id: r.cover_media_id })));
  }, [savedFeatured]);



  useEffect(() => {
    if (!savedModules) return;
    setModules(
      savedModules.map(m => ({
        id: m.id,
        widget_type: String(m.widget_type),
        text: typeof (m.widget_data as { text?: unknown } | null)?.text === 'string'
          ? String((m.widget_data as { text: string }).text)
          : '',
      })),
    );
  }, [savedModules]);

  const contrast = useMemo(
    () => contrastRatio(colors.foreground, colors.card),
    [colors.foreground, colors.card],
  );

  if (isLoading) return <PineTreeLoading />;

  if (!user || !profile) {
    return (
      <div className="page-shell">
        <section className="panel p-10 text-center">
          <p className="font-body text-sm text-foreground">You need to be signed in to edit a page.</p>
          <Link to="/login" className="outline-button mt-4 inline-block">Sign in</Link>
        </section>
      </div>
    );
  }

  const save = async () => {
    const theme: PageTheme = {
      background: hexToHslTriplet(colors.background) ?? undefined,
      card: hexToHslTriplet(colors.card) ?? undefined,
      foreground: hexToHslTriplet(colors.foreground) ?? undefined,
      accent: colors.accent,
      full2006,
    };

    try {
      await Promise.all([
        saveBasics.mutateAsync({
          display_name: displayName.trim() || profile.display_name,
          mantra,
          bio,
          city,
          currently_type: currentlyType || null,
          currently_value: currentlyValue,
          pinned_song_title: songTitle,
          pinned_song_artist: songArtist,
          pinned_song_preview_url: songUrl,
          accent_color: colors.accent,
        }),
        saveTheme.mutateAsync(theme),
        saveModules.mutateAsync(modules),
        saveTopFriends.mutateAsync(topFriendIds),
      ]);
      toast.success('Your page is saved.');
      navigate('/me');
    } catch {
      toast.error('Could not save your page.');
    }
  };

  const saving = saveBasics.isPending || saveTheme.isPending || saveModules.isPending
    || saveTopFriends.isPending;

  // Only accepted friends can be picked, and only once each. `chosen` follows
  // topFriendIds so the list reorders with the ids rather than with the
  // alphabetical order the friend list arrives in.
  const friends = friendLists?.friends ?? [];
  const byId = new Map(friends.map(f => [f.id, f]));
  const chosen = topFriendIds.map(id => byId.get(id)).filter((f): f is (typeof friends)[number] => !!f);
  const available = friends.filter(f => !topFriendIds.includes(f.id));

  // The preview is the same tokens the page itself uses, so what is shown here
  // is what a visitor gets rather than an approximation of it.
  const previewStyle = {
    '--background': hexToHslTriplet(colors.background) ?? undefined,
    '--card': hexToHslTriplet(colors.card) ?? undefined,
    '--foreground': hexToHslTriplet(colors.foreground) ?? undefined,
  } as React.CSSProperties;

  return (
    <div className="page-shell customizer">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-2xl text-foreground">Edit my page</h1>
        <button type="button" className="solid-button ml-auto" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save page'}
        </button>
      </div>

      <div className="customizer-layout">
        <div className="customizer-main">
          <section className="panel module">
            <h2>The basics</h2>
            <Field label="Display name">
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={60} />
            </Field>
            <Field label="Mantra" hint="One line, shown under your name.">
              <input value={mantra} onChange={e => setMantra(e.target.value)} maxLength={120} />
            </Field>
            <Field label="About me">
              <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={1000} rows={4} />
            </Field>
            <Field label="Where you are">
              <input value={city} onChange={e => setCity(e.target.value)} maxLength={80} />
            </Field>
            <Field label="Currently">
              <div className="currently-row">
                <select value={currentlyType} onChange={e => setCurrentlyType(e.target.value)}>
                  <option value="">—</option>
                  {CURRENTLY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  value={currentlyValue}
                  onChange={e => setCurrentlyValue(e.target.value)}
                  maxLength={120}
                  placeholder="what it is"
                />
              </div>
            </Field>
          </section>

          <section className="panel module">
            <h2>Your song</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              A song on your page, the way it used to work. Paste a link to an audio file and it
              plays for anyone who visits — they choose whether to press play.
            </p>
            <Field label="Title">
              <input value={songTitle} onChange={e => setSongTitle(e.target.value)} maxLength={120} />
            </Field>
            <Field label="Artist">
              <input value={songArtist} onChange={e => setSongArtist(e.target.value)} maxLength={120} />
            </Field>
            <Field label="Audio link" hint="An https link to an .mp3, .m4a or .ogg file.">
              <input
                value={songUrl}
                onChange={e => setSongUrl(e.target.value)}
                placeholder="https://…"
                inputMode="url"
              />
            </Field>
            {songUrl && !/^https:\/\//i.test(songUrl.trim()) && (
              <p className="warn">That needs to be an https link, or it will not play.</p>
            )}
          </section>

          <section className="panel module">
            <h2>Top friends</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Up to {MAX_TOP_FRIENDS}, in the order you put them. Everyone can see it, which is
              the entire point and the entire risk.
            </p>

            {friends.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add some friends first and they will show up here.
              </p>
            ) : (
              <>
                {chosen.length === 0 && (
                  <p className="mb-2 text-sm text-muted-foreground">Nobody picked yet.</p>
                )}

                {chosen.map((friend, i) => (
                  <div key={friend.id} className="top-friend-row">
                    <span className="rank">{i + 1}</span>
                    <UserAvatar
                      avatarUrl={friend.avatar_url}
                      defaultAvatarKey={friend.default_avatar_key}
                      displayName={friend.display_name}
                      size={28}
                    />
                    <b>{friend.display_name}</b>
                    <button
                      type="button"
                      onClick={() => setTopFriendIds(ids => moveItem(ids, i, -1))}
                      disabled={i === 0}
                      aria-label={`Move ${friend.display_name} up`}
                    >↑</button>
                    <button
                      type="button"
                      onClick={() => setTopFriendIds(ids => moveItem(ids, i, 1))}
                      disabled={i === chosen.length - 1}
                      aria-label={`Move ${friend.display_name} down`}
                    >↓</button>
                    <button
                      type="button"
                      onClick={() => setTopFriendIds(ids => ids.filter(id => id !== friend.id))}
                      aria-label={`Remove ${friend.display_name}`}
                    ><X size={13} /></button>
                  </div>
                ))}

                {available.length > 0 && topFriendIds.length < MAX_TOP_FRIENDS && (
                  <label className="field mt-3">
                    <span>Add someone</span>
                    <select
                      value=""
                      onChange={e => {
                        if (e.target.value) setTopFriendIds(ids => [...ids, e.target.value]);
                      }}
                    >
                      <option value="">Pick a friend…</option>
                      {available.map(f => (
                        <option key={f.id} value={f.id}>{f.display_name}</option>
                      ))}
                    </select>
                  </label>
                )}

                {topFriendIds.length >= MAX_TOP_FRIENDS && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    That is all {MAX_TOP_FRIENDS}. Remove someone to make room.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="panel module">
            <h2>Your modules</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Blurbs down the side of your page. Order is yours.
            </p>

            {modules.length === 0 && (
              <p className="text-sm text-muted-foreground">No modules yet. Add one below.</p>
            )}

            {modules.map((m, i) => (
              <div key={m.id ?? `new-${i}`} className="module-row">
                <div className="module-row-head">
                  <span className="grip" aria-hidden><GripVertical size={14} /></span>
                  <select
                    value={m.widget_type}
                    onChange={e => setModules(ms => updateModule(ms, i, { widget_type: e.target.value }))}
                    aria-label="Module kind"
                  >
                    {MODULE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                    {/* A type this editor does not offer — from the old shelf — is
                        kept rather than silently rewritten. */}
                    {!MODULE_TYPES.some(t => t.key === m.widget_type) && (
                      <option value={m.widget_type}>{m.widget_type}</option>
                    )}
                  </select>
                  <button type="button" onClick={() => setModules(ms => moveModule(ms, i, -1))} disabled={i === 0} aria-label="Move up">↑</button>
                  <button
                    type="button"
                    onClick={() => setModules(ms => moveModule(ms, i, 1))}
                    disabled={i === modules.length - 1}
                    aria-label="Move down"
                  >↓</button>
                  <button type="button" onClick={() => setModules(ms => removeModule(ms, i))} aria-label="Remove module">
                    <X size={14} />
                  </button>
                </div>
                <textarea
                  value={m.text}
                  onChange={e => setModules(ms => updateModule(ms, i, { text: e.target.value }))}
                  maxLength={600}
                  rows={3}
                  placeholder="Write it out."
                  aria-label="Module text"
                />
              </div>
            ))}

            <button type="button" className="outline-button mt-3" onClick={() => setModules(ms => addModule(ms, MODULE_TYPES[0].key))}>
              <Plus size={14} className="mr-1 inline" /> Add a module
            </button>
          </section>
        </div>

        <aside className="customizer-side">
          <section className="panel module">
            <h2>Page colours</h2>
            <Swatch label="Background" value={colors.background} onChange={v => setColors(c => ({ ...c, background: v }))} />
            <Swatch label="Panels" value={colors.card} onChange={v => setColors(c => ({ ...c, card: v }))} />
            <Swatch label="Text" value={colors.foreground} onChange={v => setColors(c => ({ ...c, foreground: v }))} />
            <Swatch label="Accent" value={colors.accent} onChange={v => setColors(c => ({ ...c, accent: v }))} />

            {contrast !== null && contrast < 4.5 && (
              <p className="warn">
                Text against panels is {contrast.toFixed(1)}:1. Under 4.5:1 some people will not be
                able to read your page. It is your page — this is a warning, not a rule.
              </p>
            )}

            <button
              type="button"
              className="outline-button mt-3 w-full"
              onClick={() => setColors(DEFAULTS)}
            >
              Back to the house colours
            </button>
          </section>

          <section className="panel module">
            <h2>Full 2006 mode</h2>
            <label className="toggle-row">
              <input type="checkbox" checked={full2006} onChange={e => setFull2006(e.target.checked)} />
              <span>
                Hard borders, tiled ground, display type. Loud on purpose.
              </span>
            </label>
          </section>

          <section className="panel module">
            <h2>Preview</h2>
            <div className={`page-preview ${full2006 ? 'page-2006' : ''}`} style={previewStyle}>
              <div className="preview-panel">
                <b style={{ color: colors.accent }}>{displayName || profile.display_name}</b>
                <small>@{profile.handle}</small>
                {mantra && <i>“{mantra}”</i>}
              </div>
              <div className="preview-panel">
                <span className="preview-heading" style={{ color: colors.accent }}>ABOUT ME</span>
                <p>{bio || 'Whatever you write goes here.'}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

const Swatch = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="swatch">
    <input type="color" value={value} onChange={e => onChange(e.target.value)} aria-label={label} />
    <span>{label}</span>
    <code>{value}</code>
  </label>
);

export default PageCustomizer;
