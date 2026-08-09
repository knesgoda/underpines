import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, X } from 'lucide-react';
import { toast } from 'sonner';
import PineTreeLoading from '@/components/PineTreeLoading';
import StatePanel from '@/components/StatePanel';
import { useAuth } from '@/contexts/AuthContext';
import {
  AUDIENCES, PROVIDERS, PROVIDER_LABELS, PROVIDER_SUPPORTS_LIVE,
  useListeningActions, useMyConnections, useNowPlaying,
  type Audience, type Provider,
} from '@/hooks/useListening';
import '@/styles/listening.css';

const PROVIDER_BLURB: Record<Provider, string> = {
  spotify: 'Live status, once the Spotify review clears. Shareable by hand until then.',
  apple: 'Share a track when you choose. Apple has no live now-playing API.',
  youtube: 'Share a video when you choose. YouTube has no live now-playing API.',
};

/**
 * Listening.
 *
 * The handoff drew this as a live Spotify feed. Live needs an OAuth app and
 * Spotify's extended-API review, so what ships is the same surface driven by
 * deliberate sharing — which is most of the appeal anyway, and the part that
 * works without waiting on anyone. `is_live` is the seam the poller writes to.
 */
const Listening = () => {
  const { user } = useAuth();
  const { data: nowPlaying, isLoading } = useNowPlaying(user?.id);
  const { data: connections } = useMyConnections();
  const actions = useListeningActions();

  const [provider, setProvider] = useState<Provider>('spotify');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [url, setUrl] = useState('');

  if (isLoading) return <PineTreeLoading />;

  if (!user) {
    return (
      <div className="page-shell">
        <StatePanel title="Sign in first." action={<Link to="/login" className="outline-button">Sign in</Link>}>
          Listening is tied to your account.
        </StatePanel>
      </div>
    );
  }

  const connected = new Set((connections ?? []).map(c => c.provider));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) return;
    actions.share
      .mutateAsync({ provider, track_title: title, artist, album, track_url: url })
      .then(() => {
        setTitle(''); setArtist(''); setAlbum(''); setUrl('');
        toast.success('Shared.');
      })
      .catch(() => toast.error('That did not go through.'));
  };

  const run = (p: Promise<unknown>, ok: string) =>
    p.then(() => toast.success(ok)).catch(() => toast.error('That did not go through.'));

  return (
    <div className="page-shell listening">
      <div className="panel-title">
        <span>Listening</span>
        <Link to="/me" className="outline-button">View my page</Link>
      </div>

      <section className="panel module">
        <h2>What this is</h2>
        <p>
          Let people hear what has your attention. Nothing is posted automatically, there is no
          public history, and you choose who sees it.
        </p>
      </section>

      <div className="listening-layout">
        <div className="listening-main">
          <section className={`panel now-card ${nowPlaying?.is_sharing ? 'is-live' : 'is-paused'}`}>
            <div className="now-top">
              <span>{nowPlaying?.is_sharing ? 'On your page now' : 'Not showing'}</span>
              {nowPlaying && <b>{PROVIDER_LABELS[nowPlaying.provider]}</b>}
            </div>

            {nowPlaying ? (
              <>
                <div className="now-track">
                  <span className="now-art" aria-hidden>
                    {nowPlaying.artwork_url
                      ? <img src={nowPlaying.artwork_url} alt="" />
                      : <Music size={22} />}
                  </span>
                  <div className="now-meta">
                    {nowPlaying.album && <small>{nowPlaying.album}</small>}
                    <h2>{nowPlaying.track_title}</h2>
                    <p>{nowPlaying.artist}</p>
                    {nowPlaying.is_live && <span className="live-chip">Live</span>}
                  </div>
                </div>

                <div className="now-footer">
                  <span>
                    Visible to{' '}
                    <b>{AUDIENCES.find(a => a.value === nowPlaying.audience)?.label ?? 'Friends'}</b>
                  </span>
                  <div className="now-actions">
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => run(
                        actions.setSharing.mutateAsync(!nowPlaying.is_sharing),
                        nowPlaying.is_sharing ? 'Hidden.' : 'Showing again.',
                      )}
                    >
                      {nowPlaying.is_sharing ? 'Pause sharing' : 'Resume sharing'}
                    </button>
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => run(actions.clear.mutateAsync(), 'Cleared.')}
                      aria-label="Clear what you are listening to"
                    >
                      <X size={13} className="mr-1 inline" /> Clear
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="now-empty">Nothing shared right now.</p>
            )}
          </section>

          <section className="panel module">
            <h2>Share a track</h2>
            <form onSubmit={submit} className="share-form">
              <label>
                <span>Where from</span>
                <select value={provider} onChange={e => setProvider(e.target.value as Provider)}>
                  {PROVIDERS.map(p => <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>)}
                </select>
              </label>
              <label>
                <span>Track</span>
                <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} required />
              </label>
              <label>
                <span>Artist</span>
                <input value={artist} onChange={e => setArtist(e.target.value)} maxLength={200} required />
              </label>
              <label>
                <span>Album</span>
                <input value={album} onChange={e => setAlbum(e.target.value)} maxLength={200} />
              </label>
              <label className="wide">
                <span>Link</span>
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" inputMode="url" />
              </label>
              <button
                type="submit"
                className="solid-button"
                disabled={actions.share.isPending || !title.trim() || !artist.trim()}
              >
                {actions.share.isPending ? 'Sharing…' : 'Share it'}
              </button>
            </form>
          </section>

          <section className="panel module">
            <h2>Services</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Under Pines never posts your listening history automatically.
            </p>
            <div className="provider-list">
              {PROVIDERS.map(p => (
                <div key={p} className="provider-row">
                  <span className="provider-mark" aria-hidden><Music size={16} /></span>
                  <div className="provider-meta">
                    <b>
                      {PROVIDER_LABELS[p]}
                      {PROVIDER_SUPPORTS_LIVE[p] && <em className="tag">Live capable</em>}
                    </b>
                    <small>{PROVIDER_BLURB[p]}</small>
                  </div>
                  {connected.has(p) ? (
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => run(actions.disconnect.mutateAsync(p), `Disconnected ${PROVIDER_LABELS[p]}.`)}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => run(actions.connect.mutateAsync(p), `Connected ${PROVIDER_LABELS[p]}.`)}
                    >
                      Connect
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="listening-side">
          <section className="panel module">
            <h2>Who can see this</h2>
            <div className="audience-options">
              {AUDIENCES.map(a => (
                <button
                  key={a.value}
                  type="button"
                  disabled={!nowPlaying}
                  aria-pressed={nowPlaying?.audience === a.value}
                  className={nowPlaying?.audience === a.value ? 'is-selected' : ''}
                  onClick={() => run(actions.setAudience.mutateAsync(a.value as Audience), 'Updated.')}
                >
                  {a.label}
                </button>
              ))}
            </div>
            {!nowPlaying && (
              <p className="side-note">Share something first and this becomes editable.</p>
            )}
          </section>

          <section className="panel module">
            <h2>Your listening is yours</h2>
            <p className="side-note">
              No public history. No music-based advertising. Clear it or disconnect a service
              whenever you like.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Listening;
