import { Link } from 'react-router-dom';
import { MediaImage } from '@/components/MediaImage';
import type { FeaturedAlbum } from '@/hooks/useFeaturedPage';

/**
 * Albums as objects on a corkboard.
 *
 * This is a featured preview, not a replacement: every album still lives on the
 * Photos page, and each print here opens it there. The attachment style and
 * tilt come from the album's own id, so a board looks handmade but never
 * reshuffles between renders — and the rotation stays small enough to read.
 */
const ATTACHMENTS = ['pin-red', 'pin-brass', 'clip', 'tape'] as const;

const variantOf = (id: string) => {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum = (sum + id.charCodeAt(i)) % 997;
  return {
    attachment: ATTACHMENTS[sum % ATTACHMENTS.length],
    tilt: [-1.6, 1.2, -0.8, 2, -2, 0.6][sum % 6],
  };
};

const AlbumCorkboard = ({
  albums,
  handle,
  isOwner,
}: {
  albums: FeaturedAlbum[];
  handle: string;
  isOwner: boolean;
}) => (
  <section className="corkboard" aria-labelledby="albums-heading">
    <div className="corkboard-head">
      <h2 id="albums-heading">Albums</h2>
    </div>

    {albums.length === 0 ? (
      <p className="corkboard-empty">
        {isOwner ? 'Nothing on the board yet — the photos you post land here.' : 'No albums pinned up yet.'}
      </p>
    ) : (
      <ul className="corkboard-grid">
        {albums.map(({ album, coverUrl }) => {
          const { attachment, tilt } = variantOf(album.id);
          return (
            <li key={album.id} style={{ '--tilt': `${tilt}deg` } as React.CSSProperties}>
              <Link to={`/${handle}/photos`} className={`polaroid att-${attachment}`}>
                <span className={`attachment ${attachment}`} aria-hidden="true" />
                <span className="polaroid-photo">
                  {coverUrl ? (
                    <MediaImage src={coverUrl} alt={`Cover photo of the album ${album.title}`} loading="lazy" />
                  ) : (
                    <span className="polaroid-blank" aria-hidden="true" />
                  )}
                </span>
                <span className="polaroid-caption">
                  <b>{album.title}</b>
                  <small>{album.photos.length} photo{album.photos.length === 1 ? '' : 's'}</small>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    )}

    <Link to={`/${handle}/photos`} className="corkboard-link">
      See all albums →
    </Link>
  </section>
);

export default AlbumCorkboard;
