import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

const GroveCampDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [camp, setCamp] = useState<any>(null);
  const [postsThisWeek, setPostsThisWeek] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data: c } = await supabase
        .from('camps')
        .select('*, firekeeper:profiles!camps_firekeeper_id_fkey(handle, display_name)')
        .eq('id', id)
        .single();

      if (!c) { setLoading(false); return; }
      setCamp(c);

      const oneWeek = new Date(Date.now() - 7 * 86400000).toISOString();
      const [{ count: posts }, { count: reports }] = await Promise.all([
        supabase.from('camp_posts').select('id', { count: 'exact', head: true }).eq('camp_id', id).gte('created_at', oneWeek),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('reported_camp_id', id),
      ]);

      setPostsThisWeek(posts ?? 0);
      setReportCount(reports ?? 0);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <p className="text-sm text-[hsl(var(--pine-light)/0.5)]">Loading…</p>;
  if (!camp) return <p className="text-sm text-red-400">Camp not found.</p>;

  const healthIcon = camp.health_status === 'concern' ? '🔴' : camp.health_status === 'watch' ? '🟡' : '🟢';

  return (
    <div className="max-w-2xl space-y-5">
      <button onClick={() => navigate('/grove/camps')} className="flex items-center gap-1 text-xs text-[hsl(var(--amber-mid))] hover:text-[hsl(var(--amber-light))]">
        <ArrowLeft className="w-3.5 h-3.5" /> Camps
      </button>

      <div>
        <h1 className="font-display text-lg font-bold text-[hsl(var(--pine-pale))]">{camp.name}</h1>
        <p className="text-sm text-[hsl(var(--muted-text))]">
          {healthIcon} {camp.health_status || 'Healthy'} · {camp.member_count} members
        </p>
      </div>

      <Card className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
        <CardContent className="p-4 space-y-2">
          <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-[hsl(var(--amber-mid))]">Details</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-[hsl(var(--pine-light)/0.7)]">Firekeeper</span>
            <span className="text-[hsl(var(--pine-pale))]">{(camp.firekeeper as any)?.handle}</span>
            <span className="text-[hsl(var(--pine-light)/0.7)]">Posts this week</span>
            <span className="text-[hsl(var(--pine-pale))]">{postsThisWeek}</span>
            <span className="text-[hsl(var(--pine-light)/0.7)]">Reports</span>
            <span className="text-[hsl(var(--pine-pale))]">{reportCount}</span>
            <span className="text-[hsl(var(--pine-light)/0.7)]">Visibility</span>
            <span className="text-[hsl(var(--pine-pale))] capitalize">{camp.visibility}</span>
          </div>
        </CardContent>
      </Card>

      {camp.description && (
        <Card className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
          <CardContent className="p-4">
            <p className="text-sm text-[hsl(var(--pine-light)/0.7)]">{camp.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GroveCampDetail;
