import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import { formatTimeAgo } from '@/lib/time';
import { useFriendActions, useSuggestions } from '@/hooks/useFriends';
import '@/styles/explore.css';

/**
 * Explore.
 *
 * `/explore` used to render the search screen, so the nav promised a place to
 * find things and delivered an empty text box — the worst possible first
 * impression on a network this small. This is a surface with something on it
 * before you type: people your friends know, groups worth joining, and what
 * has just been written.
 *
 * Everything here reads tables that exist today.
 */

interface NewFace {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  default_avatar_key: string | null;
  mantra: string | null;
  created_at: string | null;
}

const useNewFaces = () =>
  useQuery({
    queryKey: ['explore-new-faces'],
    queryFn: async (): Promise<NewFace[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, default_avatar_key, mantra, created_at')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as NewFace[];
    },
  });

const useOpenGroups = () =>
  useQuery({
    queryKey: ['explore-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camps')
        .select('id, name, description, member_count, cover_image_url')
        .eq('is_active', true)
        .in('visibility', ['open', 'ember'])
        .order('member_count', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

const useRecentPosts = () =>
  useQuery({
    queryKey: ['explore-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, created_at, author:profiles!posts_author_id_fkey(display_name, handle)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

const Explore = () => {
  const { user } = useAuth();
  const { data: suggestions } = useSuggestions();
  const { data: newFaces } = useNewFaces();
  const { data: groups } = useOpenGroups();
  const { data: recent } = useRecentPosts();
  const actions = useFriendActions();
  const [asked, setAsked] = useState<Set<string>>(new Set());

  const addFriend = (id: string, name: string) =>
    actions.request
      .mutateAsync(id)
      .then(() => { setAsked(prev => new Set(prev).add(id)); toast.success(`Asked ${name}.`); })
      .catch(() => toast.error('That did not go through.'));

  const AddButton = ({ id, name }: { id: string; name: string }) =>
    asked.has(id) ? (
      <span className="asked">Asked</span>
    ) : (
      <button type="button" className="outline-button" onClick={() => addFriend(id, name)}>Add</button>
    );

  return (
    <div className="page-shell explore">
      <div className="panel-title">
        <span>Explore</span>
        <Link to="/search" className="outline-button">
          <SearchIcon size={13} className="mr-1 inline" /> Search
        </Link>
      </div>

      {user && suggestions && suggestions.length > 0 && (
        <section className="panel module">
          <h2>People you might know</h2>
          <div className="people-grid">
            {suggestions.map(s => (
              <div key={s.id} className="person-card">
                <Link to={`/${s.handle}`}>
                  <UserAvatar avatarUrl={s.avatar_url} defaultAvatarKey={s.default_avatar_key} displayName={s.display_name} size={46} />
                  <b>{s.display_name}</b>
                </Link>
                <small>{s.mutuals} friend{s.mutuals === 1 ? '' : 's'} in common</small>
                <AddButton id={s.id} name={s.display_name} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel module">
        <h2>New around here</h2>
        {!newFaces?.length ? (
          <p className="explore-empty">It is quiet under here. Nobody new yet.</p>
        ) : (
          <div className="people-grid">
            {newFaces.filter(p => p.id !== user?.id).map(p => (
              <div key={p.id} className="person-card">
                <Link to={`/${p.handle}`}>
                  <UserAvatar avatarUrl={p.avatar_url} defaultAvatarKey={p.default_avatar_key} displayName={p.display_name} size={46} />
                  <b>{p.display_name}</b>
                </Link>
                <small>{p.mantra || (p.created_at ? `Joined ${formatTimeAgo(p.created_at)}` : '')}</small>
                {user && <AddButton id={p.id} name={p.display_name} />}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel module">
        <h2>Groups to join</h2>
        {!groups?.length ? (
          <p className="explore-empty">
            No open groups yet. <Link to="/camps/new">Start the first one.</Link>
          </p>
        ) : (
          <div className="group-grid">
            {groups.map(g => (
              <Link key={g.id} to={`/camps/${g.id}`} className="group-card">
                <b>{g.name}</b>
                {g.description && <p>{g.description}</p>}
                <small>{g.member_count ?? 0} member{g.member_count === 1 ? '' : 's'}</small>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="panel module">
        <h2>Just posted</h2>
        {!recent?.length ? (
          <p className="explore-empty">Nothing posted yet.</p>
        ) : recent.map(post => {
          const author = post.author as { display_name: string; handle: string } | null;
          return (
            <Link key={post.id} to={`/post/${post.id}`} className="recent-row">
              <b>{post.title || (post.content ?? '').slice(0, 80) || 'Untitled'}</b>
              <small>
                {author?.display_name ?? 'Someone'}
                {post.created_at ? ` · ${formatTimeAgo(post.created_at)}` : ''}
              </small>
            </Link>
          );
        })}
      </section>
    </div>
  );
};

export default Explore;
