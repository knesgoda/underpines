import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import PineTreeLoading from '@/components/PineTreeLoading';
import { ErrorPanel } from '@/components/StatePanel';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups, useMemberships } from '@/hooks/useGroups';
import '@/styles/groups.css';

const PER_PAGE = 20;

/**
 * Groups — the directory, formerly "🏕️ Camps".
 *
 * Also fixes a page that never finished loading when signed out: the old
 * effect returned early without clearing its loading flag, so a visitor who
 * followed a link here sat on a spinner indefinitely. Nothing in the directory
 * is private, so it now renders for everyone and only the join affordances
 * depend on being signed in.
 */
const CampsDirectory = () => {
  const { user } = useAuth();
  const { data: groups, isLoading, isError } = useGroups();
  const { data: memberships } = useMemberships();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const joined = useMemo(
    () => new Set((memberships ?? []).map(m => m.camp_id)),
    [memberships],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (groups ?? []).filter(g => !q || g.name.toLowerCase().includes(q));
  }, [groups, search]);

  if (isLoading) return <PineTreeLoading />;
  if (isError) return <div className="page-shell"><ErrorPanel what="the group list" /></div>;

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <div className="page-shell">
      <div className="panel-title">
        <span>Groups</span>
        {user && <Link to="/camps/new" className="outline-button"><Plus size={13} className="mr-1 inline" /> Start one</Link>}
      </div>

      {joined.size > 0 && (
        <Link to="/camps/mine" className="panel group-mine">
          <b>Your groups</b>
          <small>{joined.size} joined</small>
        </Link>
      )}

      <div className="group-search">
        <Search size={15} />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search groups by name"
          aria-label="Search groups"
        />
      </div>

      {paged.length === 0 ? (
        <section className="panel state-panel">
          <p className="quiet">{search ? 'Nothing by that name.' : "It's quiet under here."}</p>
          <p>
            {search
              ? 'Try a different word.'
              : user
                ? 'No groups yet. Starting the first one is a reasonable thing to do.'
                : 'No groups yet.'}
          </p>
        </section>
      ) : (
        <section className="panel group-list">
          {paged.map(g => (
            <Link key={g.id} to={`/camps/${g.id}`} className="group-row">
              {g.cover_image_url
                ? <img src={g.cover_image_url} alt="" loading="lazy" />
                : <span className="group-blank"><Users size={18} /></span>}
              <div className="group-meta">
                <b>
                  {g.name}
                  {g.visibility === 'ember' && <em className="tag">Invite only</em>}
                  {joined.has(g.id) && <em className="tag joined">Joined</em>}
                </b>
                <small>
                  {g.member_count ?? 1} member{(g.member_count ?? 1) === 1 ? '' : 's'}
                  {g.description ? ` · ${g.description}` : ''}
                </small>
              </div>
            </Link>
          ))}
        </section>
      )}

      {totalPages > 1 && (
        <div className="group-pager">
          <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Previous</button>
          <span>{page + 1} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
};

export default CampsDirectory;
