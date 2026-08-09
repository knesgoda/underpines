import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import PineTreeLoading from '@/components/PineTreeLoading';
import { ErrorPanel } from '@/components/StatePanel';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabel, settlingDaysLeft, useMyGroups } from '@/hooks/useGroups';
import '@/styles/groups.css';

/** The groups you are in. Was "My Camps". */
const MyCamps = () => {
  const { user } = useAuth();
  const { data: groups, isLoading, isError } = useMyGroups();

  if (isLoading) return <PineTreeLoading />;
  if (isError) return <div className="page-shell"><ErrorPanel what="your groups" /></div>;

  if (!user) {
    return (
      <div className="page-shell">
        <section className="panel state-panel">
          <p className="quiet">Sign in first.</p>
          <p>Your groups live behind the door.</p>
          <Link to="/login" className="outline-button mt-4 inline-block">Sign in</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="panel-title">
        <span>Your groups</span>
        <Link to="/groups" className="outline-button">Browse all</Link>
      </div>

      {!groups?.length ? (
        <section className="panel state-panel">
          <p className="quiet">You are not in any groups yet.</p>
          <p>Groups are where a handful of people talk about one thing.</p>
          <Link to="/groups" className="outline-button mt-4 inline-block">Find one</Link>
        </section>
      ) : (
        <section className="panel group-list">
          {groups.map(({ camp_id, role, scout_ends_at, group }) => {
            const days = settlingDaysLeft(scout_ends_at);
            return (
              <Link key={camp_id} to={`/camps/${camp_id}`} className="group-row">
                {group.cover_image_url
                  ? <img src={group.cover_image_url} alt="" loading="lazy" />
                  : <span className="group-blank"><Users size={18} /></span>}
                <div className="group-meta">
                  <b>{group.name}</b>
                  <small>
                    {roleLabel(role)} · {group.member_count ?? 1} member
                    {(group.member_count ?? 1) === 1 ? '' : 's'}
                    {days !== null && ` · ${days} day${days === 1 ? '' : 's'} settling in`}
                  </small>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default MyCamps;
