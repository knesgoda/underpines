/**
 * The handwritten card on the desk (spec §23): the bio as an object in the
 * room rather than a header above it. Identity stays reachable — name,
 * handle, joined date, and the way out to their page.
 */
import { Link } from 'react-router-dom';
import CabinSheet from './CabinSheet';
import UserAvatar from '@/components/UserAvatar';
import type { CabinView } from '@/lib/cabinApi';

const BioSheet = ({
  open, onClose, view,
}: {
  open: boolean;
  onClose: () => void;
  view: CabinView;
}) => {
  const p = view.profile;
  if (!p) return null;
  const joined = p.created_at
    ? new Date(p.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;
  return (
    <CabinSheet open={open} onClose={onClose} title={p.display_name}>
      <div className="cabin-bio-card">
        <UserAvatar
          avatarUrl={p.avatar_url}
          defaultAvatarKey={p.default_avatar_key}
          displayName={p.display_name}
          size={56}
        />
        <div className="min-w-0">
          <b>{p.display_name}</b>
          <small>@{p.handle}</small>
          {p.mantra && <p className="cabin-bio-mantra">“{p.mantra}”</p>}
        </div>
      </div>
      {p.bio && <p>{p.bio}</p>}
      {joined && <p className="quiet">Under the pines since {joined}.</p>}
      <Link to={`/${p.handle}`} className="outline-button" onClick={onClose}>
        {view.is_owner ? 'Open your page' : 'Read their page'}
      </Link>
    </CabinSheet>
  );
};

export default BioSheet;
