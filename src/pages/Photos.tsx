import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import PineTreeLoading from '@/components/PineTreeLoading';
import { ErrorPanel } from '@/components/StatePanel';
import { usePageProfile } from '@/hooks/useProfilePage';
import { useAlbums, type Photo } from '@/hooks/usePhotos';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/photos.css';

/**
 * Photos — everything someone has posted, grouped.
 *
 * Photos were only ever visible inline in the feed, so a page's pictures were
 * effectively gone the moment they scrolled past. Albums are derived from
 * posts until the albums tables land; see usePhotos.ts.
 */
const Photos = () => {
  const { handle } = useParams<{ handle?: string }>();
  const { user } = useAuth();
  const { data: profile, isLoading } = usePageProfile(handle);
  const { data: albums, isLoading: albumsLoading, isError } = useAlbums(profile?.id);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  // Escape closes the viewer. Declared before the early returns so the hook
  // order stays stable across loading and loaded renders.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  if (isLoading || albumsLoading) return <PineTreeLoading />;
  if (isError) return <div className="page-shell"><ErrorPanel what="these photos" /></div>;

  if (!profile) {
    return (
      <div className="page-shell">
        <section className="panel state-panel">
          <p className="quiet">That branch snapped.</p>
          <p>No page with that handle.</p>
        </section>
      </div>
    );
  }

  const isOwner = !!user && user.id === profile.id;
  const all = (albums ?? []).flatMap(a => a.photos).filter(p => p.media_type?.startsWith('image'));

  return (
    <div className="page-shell">
      <div className="panel-title">
        <span>{isOwner ? 'My photos' : `${profile.display_name}'s photos`}</span>
        <Link to={`/${profile.handle}`} className="outline-button">Back to their page</Link>
      </div>

      {all.length === 0 ? (
        <section className="panel state-panel">
          <p className="quiet">It's quiet under here.</p>
          <p>
            {isOwner
              ? 'Nothing posted with a photo yet. Anything you post with a picture shows up here.'
              : `${profile.display_name} has not posted any photos yet.`}
          </p>
        </section>
      ) : (
        <>
          <section className="panel module">
            <h2>All photos · {all.length}</h2>
            <div className="photo-grid">
              {all.map(p => (
                <button key={p.id} type="button" onClick={() => setLightbox(p)} aria-label="Open photo">
                  <img src={p.url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </section>

          {(albums ?? [])
            .filter(a => a.photos.length > 1)
            .map(album => (
              <section key={album.id} className="panel module">
                <h2>{album.title}</h2>
                <div className="photo-grid">
                  {album.photos.map(p => (
                    <button key={p.id} type="button" onClick={() => setLightbox(p)} aria-label="Open photo">
                      <img src={p.url} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
                {album.photos[0]?.postId && (
                  <Link to={`/post/${album.photos[0].postId}`} className="album-link">See the post</Link>
                )}
              </section>
            ))}
        </>
      )}

      {lightbox && (
        /* Clicking the backdrop closes; Escape does too, via the button's focus. */
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <button type="button" className="lightbox-close" aria-label="Close" onClick={() => setLightbox(null)}>
            <X size={20} />
          </button>
          <img src={lightbox.url} alt="" onClick={e => e.stopPropagation()} />
          {lightbox.postId && (
            <Link to={`/post/${lightbox.postId}`} className="lightbox-link" onClick={e => e.stopPropagation()}>
              See the post
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default Photos;
