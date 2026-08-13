import { Link } from 'react-router-dom';

export type ProfileTab = 'wall' | 'journal' | 'likes';

/**
 * Wall · Photos · Journal · Likes.
 *
 * Photos is a link, because it is a whole page of its own; the other three are
 * views of the same column and are buttons. The active one gets a coral rule —
 * editorial rather than application chrome.
 */
const ProfileTabs = ({
  active,
  onChange,
  handle,
}: {
  active: ProfileTab;
  onChange: (tab: ProfileTab) => void;
  handle: string;
}) => (
  <nav className="paper-tabs" aria-label="Sections of this page">
    <button
      type="button"
      className={active === 'wall' ? 'is-active' : undefined}
      aria-current={active === 'wall' ? 'page' : undefined}
      onClick={() => onChange('wall')}
    >
      Wall
    </button>
    <Link to={`/${handle}/photos`}>Photos</Link>
    <button
      type="button"
      className={active === 'journal' ? 'is-active' : undefined}
      aria-current={active === 'journal' ? 'page' : undefined}
      onClick={() => onChange('journal')}
    >
      Journal
    </button>
    <button
      type="button"
      className={active === 'likes' ? 'is-active' : undefined}
      aria-current={active === 'likes' ? 'page' : undefined}
      onClick={() => onChange('likes')}
    >
      Likes
    </button>
  </nav>
);

export default ProfileTabs;
