import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

interface Stats {
  urgentReports: number;
  todayReports: number;
  weekReports: number;
  totalMembers: number;
  suspendedMembers: number;
  pinesPlusMembers: number;
  totalCamps: number;
  flaggedCamps: number;
  recentReportsFiled: number;
  recentReportsCleared: number;
  recentReportsPending: number;
  recentReportsActioned: number;
}

const GroveOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const oneWeek = new Date(now.getTime() - 7 * 86400000).toISOString();
      const oneDay = new Date(now.getTime() - 86400000).toISOString();

      const [
        { count: totalMembers },
        { count: suspendedMembers },
        { count: pinesPlusMembers },
        { count: totalCamps },
        { count: flaggedCamps },
        { data: urgentData },
        { data: todayData },
        { data: weekData },
        { count: recentFiled },
        { count: recentCleared },
        { count: recentPending },
        { count: recentActioned },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('suspensions').select('id', { count: 'exact', head: true }),
        supabase.from('pines_plus_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('camps').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('camps').select('id', { count: 'exact', head: true }).in('health_status', ['concern', 'watch']),
        supabase.from('reports').select('id').eq('status', 'pending_review').eq('ai_severity', 'critical'),
        supabase.from('reports').select('id').eq('status', 'pending_review').in('ai_severity', ['critical', 'high']),
        supabase.from('reports').select('id').eq('status', 'pending_review'),
        supabase.from('reports').select('id', { count: 'exact', head: true }).gte('created_at', oneWeek),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'cleared').gte('created_at', oneWeek),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending_review').gte('created_at', oneWeek),
        supabase.from('reports').select('id', { count: 'exact', head: true }).in('status', ['warned', 'suspended', 'banned']).gte('created_at', oneWeek),
      ]);

      setStats({
        urgentReports: urgentData?.length ?? 0,
        todayReports: todayData?.length ?? 0,
        weekReports: weekData?.length ?? 0,
        totalMembers: totalMembers ?? 0,
        suspendedMembers: suspendedMembers ?? 0,
        pinesPlusMembers: pinesPlusMembers ?? 0,
        totalCamps: totalCamps ?? 0,
        flaggedCamps: flaggedCamps ?? 0,
        recentReportsFiled: recentFiled ?? 0,
        recentReportsCleared: recentCleared ?? 0,
        recentReportsPending: recentPending ?? 0,
        recentReportsActioned: recentActioned ?? 0,
      });
    };

    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (!stats) return <div className="text-[hsl(var(--pine-light)/0.5)] text-sm">Loading…</div>;

  const sections = [
    {
      title: 'Review Queue',
      onClick: () => navigate('/grove/queue'),
      rows: [
        { label: '🔴 Urgent', value: stats.urgentReports, note: stats.urgentReports > 0 ? 'Review now' : '' },
        { label: '🟠 Today', value: stats.todayReports, note: 'Within hours' },
        { label: '🟡 This week', value: stats.weekReports, note: 'Low priority' },
      ],
    },
    {
      title: 'Platform',
      onClick: () => navigate('/grove/members'),
      rows: [
        { label: 'Members total', value: stats.totalMembers },
        { label: '🚫 Suspended', value: stats.suspendedMembers },
        { label: '🌲 Pines+', value: stats.pinesPlusMembers, note: stats.totalMembers > 0 ? `(${Math.round(stats.pinesPlusMembers / stats.totalMembers * 100)}%)` : '' },
      ],
    },
    {
      title: 'Camps',
      onClick: () => navigate('/grove/camps'),
      rows: [
        { label: 'Total camps', value: stats.totalCamps },
        { label: 'Flagged camps', value: stats.flaggedCamps, note: stats.flaggedCamps > 0 ? 'Review health' : '' },
      ],
    },
    {
      title: 'Reports (last 7 days)',
      onClick: () => navigate('/grove/queue'),
      rows: [
        { label: 'Filed', value: stats.recentReportsFiled },
        { label: 'AI cleared', value: stats.recentReportsCleared },
        { label: 'Pending review', value: stats.recentReportsPending },
        { label: 'Actions taken', value: stats.recentReportsActioned },
      ],
    },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-[hsl(var(--pine-pale))]">The Grove</h1>
        <p className="text-sm text-[hsl(var(--pine-light)/0.6)] mt-1">{greeting}.</p>
      </div>

      {sections.map((section) => (
        <Card
          key={section.title}
          className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)] cursor-pointer hover:border-[hsl(var(--amber-deep)/0.3)] transition-colors"
          onClick={section.onClick}
        >
          <CardContent className="p-4">
            <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-[hsl(var(--amber-mid))] mb-3">
              {section.title}
            </h2>
            <div className="space-y-1.5">
              {section.rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="text-[hsl(var(--pine-light)/0.7)]">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[hsl(var(--pine-pale))]">{row.value}</span>
                    {row.note && <span className="text-xs text-[hsl(var(--amber-mid)/0.7)]">{row.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default GroveOverview;
