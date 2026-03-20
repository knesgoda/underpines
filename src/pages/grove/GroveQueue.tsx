import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

interface Report {
  id: string;
  report_reason: string;
  reporter_context: string | null;
  ai_severity: string | null;
  ai_category: string | null;
  ai_confidence: number | null;
  ai_reasoning: string | null;
  ai_recommended_action: string | null;
  status: string;
  content_hidden: boolean;
  created_at: string;
  reported_user_id: string | null;
  reported_post_id: string | null;
  reported_camp_post_id: string | null;
  reported_campfire_message_id: string | null;
  reporter: { display_name: string; handle: string } | null;
  reported_user: { display_name: string; handle: string } | null;
}

const SEVERITY_TAB: Record<string, string> = {
  critical: 'urgent',
  high: 'today',
  medium: 'week',
  low: 'week',
};

const GroveQueue = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionReport, setActionReport] = useState<Report | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [banHandle, setBanHandle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [suspendDays, setSuspendDays] = useState(0);

  const fetchReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*, reporter:profiles!reports_reporter_id_fkey(display_name, handle), reported_user:profiles!reports_reported_user_id_fkey(display_name, handle)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false });

    setReports((data as unknown as Report[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);

  const getTab = (r: Report) => SEVERITY_TAB[r.ai_severity || 'low'] || 'week';

  const handleAction = async (report: Report, action: string, days?: number) => {
    if (!user) return;

    try {
      let newStatus = action;

      if (action === 'clear') {
        newStatus = 'cleared';
        // Restore hidden content
        if (report.content_hidden) {
          if (report.reported_post_id) {
            await supabase.from('posts').update({ is_published: true }).eq('id', report.reported_post_id);
          }
          if (report.reported_camp_post_id) {
            await supabase.from('camp_posts').update({ is_published: true }).eq('id', report.reported_camp_post_id);
          }
        }
      }

      if (action === 'warn') {
        newStatus = 'warned';
      }

      if (action === 'suspend' && days && report.reported_user_id) {
        newStatus = 'suspended';
        const until = new Date(Date.now() + days * 86400000).toISOString();
        await supabase.from('suspensions').upsert({
          user_id: report.reported_user_id,
          suspended_by: user.id,
          reason: report.ai_category || report.report_reason,
          suspended_until: until,
          is_permanent: false,
        }, { onConflict: 'user_id' });
      }

      if (action === 'ban' && report.reported_user_id) {
        newStatus = 'banned';
        await supabase.from('suspensions').upsert({
          user_id: report.reported_user_id,
          suspended_by: user.id,
          reason: report.ai_category || report.report_reason,
          is_permanent: true,
        }, { onConflict: 'user_id' });
        // Soft-hide all posts by banned user
        await supabase.from('posts').update({ is_published: false }).eq('author_id', report.reported_user_id);
      }

      // Update report
      await supabase.from('reports').update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', report.id);

      // Log moderation action
      await supabase.from('moderation_actions').insert({
        admin_id: user.id,
        target_user_id: report.reported_user_id,
        report_id: report.id,
        action_type: action === 'clear' ? 'clear' : action === 'warn' ? 'warn' : action === 'suspend' ? 'suspend' : 'ban',
        action_detail: noteText || null,
        suspension_days: days || null,
      });

      toast.success(`Report ${action === 'clear' ? 'cleared' : action + 'ed'}.`);
      setActionReport(null);
      setActionType('');
      setBanHandle('');
      setNoteText('');
      fetchReports();
    } catch {
      toast.error('Action failed.');
    }
  };

  const severityColor = (s: string | null) => {
    if (s === 'critical') return 'text-red-400';
    if (s === 'high') return 'text-orange-400';
    if (s === 'medium') return 'text-yellow-400';
    return 'text-[hsl(var(--pine-light)/0.5)]';
  };

  const tabCounts = {
    urgent: reports.filter(r => getTab(r) === 'urgent').length,
    today: reports.filter(r => getTab(r) === 'today').length,
    week: reports.filter(r => getTab(r) === 'week').length,
  };

  const renderReport = (report: Report) => (
    <Card key={report.id} className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs">
          <span className={severityColor(report.ai_severity)}>
            {report.ai_severity === 'critical' ? '🔴' : report.ai_severity === 'high' ? '🟠' : '🟡'}
          </span>
          <span className="text-[hsl(var(--pine-light)/0.7)] capitalize">{report.ai_category || report.report_reason}</span>
          {report.ai_confidence && (
            <span className="text-[hsl(var(--muted-text))]">· {Math.round(report.ai_confidence * 100)}% confidence</span>
          )}
        </div>

        {report.reporter_context && (
          <div className="bg-[hsl(var(--pine-darkest))] rounded p-3">
            <p className="text-xs text-[hsl(var(--muted-text))] uppercase tracking-wider mb-1">Reporter context</p>
            <p className="text-sm text-[hsl(var(--pine-light)/0.8)] italic">"{report.reporter_context}"</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-[hsl(var(--muted-text))]">Reported user</p>
            <p className="text-[hsl(var(--pine-pale))]">{report.reported_user?.handle || '—'}</p>
          </div>
          <div>
            <p className="text-[hsl(var(--muted-text))]">Reported by</p>
            <p className="text-[hsl(var(--pine-pale))]">{report.reporter?.handle || '—'}</p>
          </div>
        </div>

        {report.ai_reasoning && (
          <div className="text-xs">
            <p className="text-[hsl(var(--muted-text))]">AI reasoning</p>
            <p className="text-[hsl(var(--pine-light)/0.7)]">{report.ai_reasoning}</p>
          </div>
        )}

        <p className="text-xs text-[hsl(var(--muted-text))]">
          Content is currently: {report.content_hidden ? 'Hidden' : 'Visible'}
        </p>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-[hsl(var(--pine-mid)/0.2)]">
          <Button size="sm" variant="outline" className="text-xs border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light)/0.7)] hover:bg-[hsl(var(--pine-mid)/0.2)]"
            onClick={() => { setActionReport(report); setActionType('clear'); }}>
            Clear
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-[hsl(var(--pine-mid)/0.3)] text-yellow-400 hover:bg-yellow-400/10"
            onClick={() => { setActionReport(report); setActionType('warn'); }}>
            Warn
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs border-[hsl(var(--pine-mid)/0.3)] text-orange-400 hover:bg-orange-400/10">
                Suspend <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
              {[1, 2, 7, 30].map(d => (
                <DropdownMenuItem key={d} className="text-[hsl(var(--pine-light)/0.7)] text-xs"
                  onClick={() => { setActionReport(report); setActionType('suspend'); setSuspendDays(d); }}>
                  {d === 1 ? '24 hours' : d === 2 ? '48 hours' : `${d} days`}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" className="text-xs border-red-500/30 text-red-400 hover:bg-red-400/10"
            onClick={() => { setActionReport(report); setActionType('ban'); }}>
            Ban
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-xl font-bold text-[hsl(var(--pine-pale))]">Review Queue</h1>

      {loading ? (
        <p className="text-sm text-[hsl(var(--pine-light)/0.5)]">Loading…</p>
      ) : (
        <Tabs defaultValue="urgent">
          <TabsList className="bg-[hsl(var(--pine-dark))] border border-[hsl(var(--pine-mid)/0.3)]">
            <TabsTrigger value="urgent" className="text-xs data-[state=active]:bg-[hsl(var(--pine-mid)/0.3)] data-[state=active]:text-red-400">
              🔴 Urgent ({tabCounts.urgent})
            </TabsTrigger>
            <TabsTrigger value="today" className="text-xs data-[state=active]:bg-[hsl(var(--pine-mid)/0.3)] data-[state=active]:text-orange-400">
              🟠 Today ({tabCounts.today})
            </TabsTrigger>
            <TabsTrigger value="week" className="text-xs data-[state=active]:bg-[hsl(var(--pine-mid)/0.3)] data-[state=active]:text-yellow-400">
              🟡 This week ({tabCounts.week})
            </TabsTrigger>
          </TabsList>

          {['urgent', 'today', 'week'].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-3 mt-3">
              {reports.filter(r => getTab(r) === tab).length === 0 ? (
                <p className="text-sm text-[hsl(var(--pine-light)/0.4)] py-8 text-center">No reports in this queue.</p>
              ) : (
                reports.filter(r => getTab(r) === tab).map(renderReport)
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Clear confirmation */}
      <AlertDialog open={actionType === 'clear' && !!actionReport} onOpenChange={() => { setActionType(''); setActionReport(null); }}>
        <AlertDialogContent className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[hsl(var(--pine-pale))]">Clear this report?</AlertDialogTitle>
            <AlertDialogDescription className="text-[hsl(var(--pine-light)/0.6)]">
              Content will be restored if it was hidden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light)/0.7)]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => actionReport && handleAction(actionReport, 'clear')}>Clear report</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warn confirmation */}
      <AlertDialog open={actionType === 'warn' && !!actionReport} onOpenChange={() => { setActionType(''); setActionReport(null); }}>
        <AlertDialogContent className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[hsl(var(--pine-pale))]">Warn this user?</AlertDialogTitle>
            <AlertDialogDescription className="text-[hsl(var(--pine-light)/0.6)]">
              Content will remain hidden. A warning will be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Optional note…"
            className="bg-[hsl(var(--pine-darkest))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light))] text-sm" />
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light)/0.7)]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => actionReport && handleAction(actionReport, 'warn')}>Send warning</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend confirmation */}
      <AlertDialog open={actionType === 'suspend' && !!actionReport} onOpenChange={() => { setActionType(''); setActionReport(null); }}>
        <AlertDialogContent className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[hsl(var(--pine-pale))]">
              Suspend {actionReport?.reported_user?.handle} for {suspendDays} day{suspendDays !== 1 ? 's' : ''}?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Suspension note…"
            className="bg-[hsl(var(--pine-darkest))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light))] text-sm" />
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light)/0.7)]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => actionReport && handleAction(actionReport, 'suspend', suspendDays)}>Confirm suspension</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban confirmation */}
      <AlertDialog open={actionType === 'ban' && !!actionReport} onOpenChange={() => { setActionType(''); setActionReport(null); setBanHandle(''); }}>
        <AlertDialogContent className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[hsl(var(--pine-pale))]">
              Permanently ban {actionReport?.reported_user?.handle}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[hsl(var(--pine-light)/0.6)]">
              Type their handle to confirm. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={banHandle} onChange={e => setBanHandle(e.target.value)} placeholder="Type handle…"
            className="bg-[hsl(var(--pine-darkest))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light))] text-sm" />
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light)/0.7)]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={banHandle !== actionReport?.reported_user?.handle}
              onClick={() => actionReport && handleAction(actionReport, 'ban')}
              className="bg-destructive text-destructive-foreground"
            >Confirm ban</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GroveQueue;
