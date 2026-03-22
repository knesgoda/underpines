import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Search as SearchIcon, Lock, Users, Tent, Flame, TreePine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import PostCard, { PostWithAuthor } from '@/components/feed/PostCard';
import PineTreeLoading from '@/components/PineTreeLoading';
import { formatTimeAgo } from '@/lib/time';

/* ───── highlight helper ───── */
const Highlight = ({ text, query }: { text: string; query: string }) => {
  if (!query || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-amber-light/40 text-foreground rounded-sm px-0.5">{p}</mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
};

const Search = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(false);
  const [isPinesPlus, setIsPinesPlus] = useState(false);

  /* results */
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [camps, setCamps] = useState<any[]>([]);
  const [campfireResults, setCampfireResults] = useState<any[]>([]);
  const [circleIds, setCircleIds] = useState<string[]>([]);



  /* Load circle ids + pines+ status */
  useEffect(() => {
    if (!user) return;
    const loadCtx = async () => {
      const { data: cData } = await supabase
        .from('circles')
        .select('requester_id, requestee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},requestee_id.eq.${user.id}`);
      if (cData) {
        setCircleIds(cData.map((c) => (c.requester_id === user.id ? c.requestee_id : c.requester_id)));
      }
      const { data: sub } = await supabase
        .from('pines_plus_subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      setIsPinesPlus(!!sub);
    };
    loadCtx();
  }, [user]);

  /* Search only on explicit submit */
  const handleSearch = useCallback(() => {
    if (!query.trim()) {
      setPosts([]);
      setPeople([]);
      setCamps([]);
      setCampfireResults([]);
      return;
    }
    runSearch(query.trim());
  }, [query, activeTab]);

  const runSearch = useCallback(async (q: string) => {
    if (!user || !q) return;
    setLoading(true);
    try {
      if (activeTab === 'posts') await searchPosts(q);
      else if (activeTab === 'people') await searchPeople(q);
      else if (activeTab === 'camps') await searchCamps(q);
      else if (activeTab === 'campfires') await searchCampfires(q);
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, circleIds]);

  /* ───── Posts ───── */
  const searchPosts = async (q: string) => {
    const pattern = `%${q}%`;
    const [{ data: feedPosts }, { data: campPosts }] = await Promise.all([
      supabase
        .from('posts')
        .select('*, author:profiles!posts_author_id_fkey(display_name, handle, accent_color, cabin_mood), post_media(*)')
        .eq('is_published', true)
        .or(`content.ilike.${pattern},title.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('camp_posts')
        .select('*, author:profiles!camp_posts_author_id_fkey(display_name, handle, accent_color, cabin_mood), camp_post_media(*)')
        .eq('is_published', true)
        .or(`content.ilike.${pattern},title.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    const mapped = (campPosts || []).map((cp: any) => ({
      ...cp,
      post_media: cp.camp_post_media,
      _isCampPost: true,
    }));
    const merged = [...(feedPosts || []), ...mapped].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setPosts(merged.slice(0, 30));
  };

  /* ───── People ───── */
  const searchPeople = async (q: string) => {
    const pattern = `%${q}%`;
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, handle, mantra, city, accent_color')
      .or(`display_name.ilike.${pattern},handle.ilike.${pattern}`)
      .limit(30);
    if (!data) { setPeople([]); return; }
    // Sort: circle members first
    const sorted = [...data].sort((a, b) => {
      const aCircle = circleIds.includes(a.id) ? 0 : 1;
      const bCircle = circleIds.includes(b.id) ? 0 : 1;
      return aCircle - bCircle || a.display_name.localeCompare(b.display_name);
    });
    setPeople(sorted.slice(0, 20));
  };

  /* ───── Camps ───── */
  const searchCamps = async (q: string) => {
    const pattern = `%${q}%`;
    const { data } = await supabase
      .from('camps')
      .select('*')
      .eq('is_active', true)
      .in('visibility', ['open', 'ember'])
      .ilike('name', pattern)
      .order('member_count', { ascending: false })
      .limit(20);
    if (!data) { setCamps([]); return; }
    // For each camp, find circle members inside
    const campIds = data.map((c) => c.id);
    const { data: members } = await supabase
      .from('camp_members')
      .select('camp_id, user_id, profiles!camp_members_user_id_fkey(display_name)')
      .in('camp_id', campIds.length ? campIds : ['00000000-0000-0000-0000-000000000000'])
      .in('user_id', circleIds.length ? circleIds : ['00000000-0000-0000-0000-000000000000']);
    const circleMap: Record<string, string[]> = {};
    (members || []).forEach((m: any) => {
      if (!circleMap[m.camp_id]) circleMap[m.camp_id] = [];
      circleMap[m.camp_id].push(m.profiles?.display_name || 'Someone');
    });
    setCamps(data.map((c) => ({ ...c, circleMembers: circleMap[c.id] || [] })));
  };

  /* ───── Campfires ───── */
  const searchCampfires = async (q: string) => {
    if (!isPinesPlus) return;
    const pattern = `%${q}%`;
    const { data } = await supabase
      .from('campfire_messages')
      .select('*, campfires!campfire_messages_campfire_id_fkey(name), profiles!campfire_messages_sender_id_fkey(display_name, handle)')
      .eq('is_faded', false)
      .ilike('content', pattern)
      .order('created_at', { ascending: false })
      .limit(20);
    setCampfireResults(data || []);
  };

  /* ───── Circle request ───── */
  const sendCircleRequest = async (personId: string) => {
    if (!user) return;
    await supabase.from('circles').insert({ requester_id: user.id, requestee_id: personId });
    setCircleIds((prev) => [...prev, personId]);
  };

  const hasSearched = query.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Search Input */}
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative mb-2">
        <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the Pines..."
          className="pl-10 font-body bg-card border-border"
        />
      </form>
      <p className="text-[11px] font-body text-muted-foreground/60 mb-4 pl-1">
        Your searches aren't saved or tracked.
      </p>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-muted/50 mb-4">
          <TabsTrigger value="posts" className="flex-1 font-body text-xs">Posts</TabsTrigger>
          <TabsTrigger value="people" className="flex-1 font-body text-xs">People</TabsTrigger>
          <TabsTrigger value="camps" className="flex-1 font-body text-xs">Camps</TabsTrigger>
          <TabsTrigger value="campfires" className="flex-1 font-body text-xs gap-1">
            <Flame size={12} />
            Campfires
            {!isPinesPlus && <Lock size={10} className="text-muted-foreground" />}
          </TabsTrigger>
        </TabsList>

        {/* Posts */}
        <TabsContent value="posts">
          {loading ? (
            <div className="py-12"><PineTreeLoading /></div>
          ) : !hasSearched ? (
            <EmptyIdle />
          ) : posts.length === 0 ? (
            <EmptyState icon="🌿" query={query} message='in your Circles or Camps.' subtext="Only posts from people you're connected to are searchable here." />
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* People */}
        <TabsContent value="people">
          {loading ? (
            <div className="py-12"><PineTreeLoading /></div>
          ) : !hasSearched ? (
            <EmptyIdle />
          ) : people.length === 0 ? (
            <EmptyState icon="🌲" query={query} message="" subtext="Try their handle if you know it." />
          ) : (
            <div className="space-y-1">
              {people.map((p) => {
                const inCircle = circleIds.includes(p.id);
                const isMe = p.id === user?.id;
                return (
                  <Link
                    key={p.id}
                    to={`/${p.handle}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-secondary text-secondary-foreground font-body text-sm">
                        {p.display_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-medium text-foreground truncate">
                        <Highlight text={p.display_name} query={query} />
                      </p>
                      <p className="font-body text-xs text-muted-foreground truncate">
                        @<Highlight text={p.handle} query={query} />
                        {p.mantra && <span className="ml-2 text-muted-foreground/60">· {p.mantra}</span>}
                      </p>
                      {p.city && <p className="font-body text-[11px] text-muted-foreground/50">{p.city}</p>}
                    </div>
                    {!isMe && (
                      inCircle ? (
                        <span className="text-xs font-body text-primary whitespace-nowrap">In your Circle ✓</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs font-body shrink-0"
                          onClick={(e) => { e.preventDefault(); sendCircleRequest(p.id); }}
                        >
                          Add to Circle
                        </Button>
                      )
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Camps */}
        <TabsContent value="camps">
          {loading ? (
            <div className="py-12"><PineTreeLoading /></div>
          ) : !hasSearched ? (
            <EmptyIdle />
          ) : camps.length === 0 ? (
            <EmptyState icon="🏕️" query={query} message="" subtext="Hidden Camps don't appear in search — ask a member for an invite link." />
          ) : (
            <div className="space-y-2">
              {camps.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                  {c.cover_image_url ? (
                    <img src={c.cover_image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Tent size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-foreground">
                      <Highlight text={c.name} query={query} />
                    </p>
                    <p className="font-body text-xs text-muted-foreground">
                      {c.member_count} members{c.description && ` · ${c.description}`}
                    </p>
                    {c.circleMembers.length > 0 && (
                      <p className="font-body text-xs text-primary mt-0.5">
                        🔥 {c.circleMembers.slice(0, 2).join(' and ')} {c.circleMembers.length > 2 ? `and ${c.circleMembers.length - 2} more` : ''} {c.circleMembers.length === 1 ? 'is a member' : 'are members'}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {c.visibility === 'ember' && (
                        <span className="text-[10px] font-body text-amber-deep bg-amber-light/30 px-1.5 py-0.5 rounded-full">Ember Camp 🔥</span>
                      )}
                      <Button size="sm" variant="outline" className="text-xs font-body h-7" onClick={() => navigate(`/camps/${c.id}`)}>
                        {c.visibility === 'ember' ? 'Request invite' : 'View Camp'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Campfires */}
        <TabsContent value="campfires">
          {!isPinesPlus ? (
            <div className="text-center py-16 space-y-4">
              <Flame size={32} className="mx-auto text-primary" />
              <h3 className="font-display text-lg text-foreground">Search Your Campfires</h3>
              <p className="font-body text-sm text-muted-foreground max-w-xs mx-auto">
                Find any message, photo, or link ever shared in your Campfires.
              </p>
              <p className="font-body text-xs text-muted-foreground">
                Available with Pines+<br />$10/year — less than a coffee.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Button variant="ghost" size="sm" className="font-body text-xs">Maybe later</Button>
                <Button size="sm" className="font-body text-xs" onClick={() => navigate('/settings/subscription')}>
                  Upgrade to Pines+
                </Button>
              </div>
            </div>
          ) : loading ? (
            <div className="py-12"><PineTreeLoading /></div>
          ) : !hasSearched ? (
            <EmptyIdle />
          ) : campfireResults.length === 0 ? (
            <EmptyState icon="🔥" query={query} message="in your Campfires." />
          ) : (
            <div className="space-y-2">
              {campfireResults.map((m: any) => (
                <Link
                  key={m.id}
                  to={`/campfires`}
                  className="block p-3 rounded-xl bg-card border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-body text-xs font-medium text-primary">{m.campfires?.name || 'Campfire'}</span>
                    <span className="font-body text-[10px] text-muted-foreground">{formatTimeAgo(m.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">
                        {m.profiles?.display_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-body text-xs text-muted-foreground">{m.profiles?.display_name}</span>
                  </div>
                  <p className="font-body text-sm text-foreground mt-1 line-clamp-2">
                    "<Highlight text={m.content || ''} query={query} />"
                  </p>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ───── Shared empty states ───── */
const EmptyIdle = () => (
  <div className="text-center py-16">
    <TreePine size={28} className="mx-auto text-muted-foreground/40 mb-3" />
    <p className="font-body text-sm text-muted-foreground">Start typing to search the Pines.</p>
  </div>
);

const EmptyState = ({ icon, query, message, subtext }: { icon: string; query: string; message: string; subtext?: string }) => (
  <div className="text-center py-16 space-y-2">
    <span className="text-2xl">{icon}</span>
    <p className="font-body text-sm text-foreground">
      Nothing found for "<span className="font-medium">{query}</span>"
      {message && <><br />{message}</>}
    </p>
    {subtext && <p className="font-body text-xs text-muted-foreground max-w-xs mx-auto">{subtext}</p>}
  </div>
);

export default Search;
