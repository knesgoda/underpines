import { getAvatarSrc, defaultAvatars } from '@/lib/default-avatars';

interface UserAvatarProps {
  avatarUrl?: string | null;
  defaultAvatarKey?: string | null;
  displayName?: string | null;
  size?: number;
  className?: string;
}

/**
 * Reusable avatar component used across the app.
 * Shows: avatar_url > default_avatar_key illustration > letter fallback.
 */
const UserAvatar = ({
  avatarUrl,
  defaultAvatarKey,
  displayName,
  size = 40,
  className = '',
}: UserAvatarProps) => {
  const hasImage = avatarUrl || (defaultAvatarKey && defaultAvatars[defaultAvatarKey]);

  if (hasImage) {
    const src = getAvatarSrc(avatarUrl ?? null, defaultAvatarKey ?? null);
    return (
      <div
        className={`shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
        }}
      >
        <img
          src={src}
          alt={displayName || 'User avatar'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  // Letter fallback
  const letter = displayName?.[0]?.toUpperCase() || '?';
  return (
    <div
      className={`shrink-0 rounded-full bg-secondary flex items-center justify-center font-medium text-secondary-foreground ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {letter}
    </div>
  );
};

export default UserAvatar;
