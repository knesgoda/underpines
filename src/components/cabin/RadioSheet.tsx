/**
 * The radio (spec §21–22): a visitor hears what the owner shares, never
 * autoplayed. The owner gets a shortcut to the Listening surface, where
 * sharing itself is controlled.
 */
import { Link } from 'react-router-dom';
import CabinSheet from './CabinSheet';
import { PROVIDER_LABELS, useNowPlaying } from '@/hooks/useListening';

const RadioSheet = ({
  open, onClose, ownerId, ownerName, isOwner,
}: {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  ownerName: string;
  isOwner: boolean;
}) => {
  const { data: listening } = useNowPlaying(open ? ownerId : undefined);

  return (
    <CabinSheet open={open} onClose={onClose} title="The radio">
      {listening?.is_sharing ? (
        <div className="cabin-radio-now">
          <span aria-hidden="true">📻</span>
          <div className="min-w-0">
            <b>{listening.track_title}</b>
            <small>
              {listening.artist} · {PROVIDER_LABELS[listening.provider]}
              {listening.is_live ? ' · live' : ''}
            </small>
          </div>
          {listening.track_url?.startsWith('https://') && (
            <a href={listening.track_url} target="_blank" rel="noopener noreferrer nofollow" className="album-link">
              Open it
            </a>
          )}
        </div>
      ) : (
        <p className="quiet">
          {isOwner ? 'The radio is off.' : `${ownerName} isn’t sharing what’s playing.`}
        </p>
      )}
      {isOwner && (
        <Link to="/listening" className="outline-button" onClick={onClose}>
          Open Listening
        </Link>
      )}
    </CabinSheet>
  );
};

export default RadioSheet;
