import { useState } from 'react';
import UserAvatar from '@/components/UserAvatar';
import { PineFlourish } from './PaperFlourish';
import AvatarEditor from './AvatarEditor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PageProfile } from '@/hooks/useProfilePage';

/**
 * The top sheet: who this is, in as few words as the page can manage.
 *
 * One h1 — the person's name. Masking tape and the pine are decoration and
 * stay out of the accessibility tree.
 *
 * For the owner, the picture opens the picture editor in a modal so changing it
 * never costs you your place on the page.
 */
const ProfileHeader = ({ profile, isOwner = false }: { profile: PageProfile; isOwner?: boolean }) => {
  const [editing, setEditing] = useState(false);

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
        <>
          <button
            type="button"
            className="avatar-edit-link"
            title="Change your picture"
            aria-label="Change your picture"
            onClick={() => setEditing(true)}
          >
            {avatar}
            <span className="avatar-edit-hint">Change</span>
          </button>
          <Dialog open={editing} onOpenChange={setEditing}>
            <DialogContent className="avatar-editor-dialog">
              <DialogHeader>
                <DialogTitle>Your picture</DialogTitle>
                <DialogDescription>
                  Upload a photo or pick a woodland friend. Changes save right away.
                </DialogDescription>
              </DialogHeader>
              <AvatarEditor
                chrome="bare"
                avatarUrl={profile.avatar_url}
                defaultAvatarKey={profile.default_avatar_key}
                displayName={profile.display_name}
              />
              <DialogFooter>
                <button type="button" className="solid-button" onClick={() => setEditing(false)}>
                  Done
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
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
};

export default ProfileHeader;
