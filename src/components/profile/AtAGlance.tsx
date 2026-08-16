import { Link } from 'react-router-dom';
import { CalendarDays, Eye, MapPin } from 'lucide-react';
import CircleButton from '@/components/circles/CircleButton';
import { CabinFlourish } from './PaperFlourish';
import { CABIN_ENABLED } from '@/lib/flags';
import type { PageProfile } from '@/hooks/useProfilePage';

const memberSince = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '';

/**
 * At a glance — the few facts a page carries, and the two doors off it.
 *
 * City respects the owner's show-city setting; the view count is theirs alone.
 * The buttons are the existing ones, unchanged in behaviour.
 */
const AtAGlance = ({
  profile,
  isOwner,
  showCity,
  visits,
}: {
  profile: PageProfile;
  isOwner: boolean;
  showCity: boolean;
  visits?: number;
}) => (
  <section className="paper module glance" aria-labelledby="glance-heading">
    <CabinFlourish className="glance-cabin" />
    <h2 id="glance-heading">At a glance</h2>

    <ul className="glance-list">
      {profile.city && showCity && (
        <li>
          <MapPin size={14} aria-hidden="true" />
          <span>Somewhere near {profile.city}.</span>
        </li>
      )}
      {profile.created_at && (
        <li>
          <CalendarDays size={14} aria-hidden="true" />
          <span>Here since {memberSince(profile.created_at)}.</span>
        </li>
      )}
      {isOwner && typeof visits === 'number' && (
        <li>
          <Eye size={14} aria-hidden="true" />
          <span>
            {visits} view{visits === 1 ? '' : 's'} in the last 30 days — only you can see this.
          </span>
        </li>
      )}
    </ul>

    <div className="glance-actions">
      {isOwner ? (
        <>
          <Link to="/me/edit" state={editorReturnState()} className="paper-button">Edit my page</Link>
          <Link to="/settings" className="paper-button">Settings</Link>
        </>
      ) : (
        <CircleButton profileId={profile.id} profileName={profile.display_name} />
      )}
      {CABIN_ENABLED && (
        <Link to={`/u/${profile.handle}`} className="paper-button">
          {isOwner ? 'Step into your cabin' : 'Visit the cabin'}
        </Link>
      )}
    </div>
  </section>
);

export default AtAGlance;
