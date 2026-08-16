import { Link } from 'react-router-dom';
import UserAvatar from '@/components/UserAvatar';
import { PineFlourish } from './PaperFlourish';
import type { PageProfile } from '@/hooks/useProfilePage';

/**
 * The top sheet: who this is, in as few words as the page can manage.
 *
 * One h1 — the person's name. Masking tape and the pine are decoration and
 * stay out of the accessibility tree.
 */
const ProfileHeader = ({ profile, isOwner = false }: { profile: PageProfile; isOwner?: boolean }) => {
  const avatar = (
    <UserAvatar
      avatarUrl={profile.avatar_url}
      defaultAvatarKey={profile.default_avatar_key}
      displayName={profile.display_name}
      size={104}
    />
  );

  return (
  <section className="paper profile-sheet">
    <span className="tape" aria-hidden="true" />
    <PineFlourish className="sheet-pine sheet-pine-left" />
    <PineFlourish className="sheet-pine sheet-pine-right" />

    <div className="profile-sheet-inner">
      {isOwner ? (
        <Link to="/me/edit#your-picture" className="avatar-edit-link" title="Change your picture">
          {avatar}
          <span className="avatar-edit-hint">Change</span>
        </Link>
      ) : (
        avatar
      )}
      <div className="min-w-0">
        <h1 className="profile-title">{profile.display_name}</h1>
        <p className="profile-handle">@{profile.handle}</p>
        {profile.mantra && (
          <>
            <span className="quote-rule" aria-hidden="true" />
            <blockquote className="profile-quote">“{profile.mantra}”</blockquote>
          </>
        )}
      </div>
    </div>
  </section>
);

export default ProfileHeader;
