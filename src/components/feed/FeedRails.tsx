import { Link, useLocation } from 'react-router-dom';
import UserAvatar from '@/components/UserAvatar';
import { useViewerProfile, useCircleIds, useInviteeCount } from '@/hooks/queries';

const RAIL_NAV = [
  { label: 'Home', to: '/', icon: '⌂' },
  { label: 'My Page', to: '/me', icon: '☺' },
  { label: 'Friends', to: '/friends', icon: '✿' },
  // Photos gets its own surface in a later slice; until then it lives on the
  // profile, so there is no rail entry pointing at a route that 404s.
  { label: 'Groups', to: '/groups', icon: '⛺' },
  { label: 'Messages', to: '/messages', icon: '✉' },
  { label: 'Ranger Station', to: '/ranger-station', icon: '🪧' },
  { label: 'Invites', to: '/invites', icon: '🎟' },
  { label: 'Settings', to: '/settings', icon: '⚙' },
];

const memberSince = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—';

/**
 * The feed's left rail: who you are, and where you can go. Deliberately not
 * shared with the topbar — the handoff repeats navigation here on purpose,
 * the way the era it is evoking did.
 */
export const LeftRail = () => {
  const location = useLocation();
  const { data: profile } = useViewerProfile();
  const { data: circleIds } = useCircleIds();
  const { data: inviteeCount } = useInviteeCount();

  return (
    <aside className="left-rail">
      <section className="panel identity-card">
        <Link to="/me" className="identity-top">
          <UserAvatar
            avatarUrl={profile?.avatar_url ?? null}
            defaultAvatarKey={profile?.default_avatar_key ?? null}
            displayName={profile?.display_name ?? ''}
            size={38}
          />
          <span>
            <b>{profile?.display_name ?? '—'}</b>
            <small>@{profile?.handle ?? '—'}</small>
          </span>
        </Link>

        {profile?.bio && <p>{profile.bio}</p>}

        <div className="era-stat">
          <span>Friends <b>{circleIds?.length ?? 0}</b></span>
          <span>Invited <b>{inviteeCount ?? 0}</b></span>
        </div>

        <Link to="/me" className="outline-button block text-center">Edit my page</Link>
      </section>

      <nav className="panel rail-nav" aria-label="Sections">
        {RAIL_NAV.map(item => {
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          return (
            <Link key={item.to} to={item.to} className={active ? 'selected' : undefined}>
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <p className="copyright">
        UNDER PINES · MEMBER SINCE {memberSince(profile?.created_at ?? null).toUpperCase()}
        <br />
        NO ADS · NO ALGORITHM · NO METRICS
      </p>
    </aside>
  );
};

/** Right rail — invite state and the house rules. */
export const RightRail = ({ inviteUrl }: { inviteUrl: string | null }) => (
  <aside className="right-rail">
    <section className="panel">
      <h2 className="panel-title">
        <span>Your invites</span>
        <Link to="/invites"><button type="button">Manage</button></Link>
      </h2>
      <p className="mt-3 font-body text-xs text-muted-foreground">
        {inviteUrl
          ? 'Everyone here was let in by someone. Pass it on carefully.'
          : 'No invites left right now. They come back.'}
      </p>
    </section>

    <section className="panel">
      <h2 className="panel-title"><span>A quiet place</span></h2>
      <p className="mt-3 font-body text-xs leading-relaxed text-muted-foreground">
        Posts appear in the order they were written. Nothing is ranked, nothing
        is promoted, and no one can see how many people liked anything.
      </p>
    </section>
  </aside>
);
