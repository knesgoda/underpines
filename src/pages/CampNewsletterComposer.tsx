import { useState, useEffect, useCallback } from 'react';
import Markdown from '@/lib/markdown';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ArrowLeft, Bold, Italic, Quote, Minus, ImagePlus, Link as LinkIcon, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PineTreeLoading from '@/components/PineTreeLoading';

const CampNewsletterComposer = () => {
  const { id: campId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const newsletterId = searchParams.get('edit');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [camp, setCamp] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [draftId, setDraftId] = useState<string | null>(newsletterId);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [loading, setLoading] = useState(true);
  const [frequencyError, setFrequencyError] = useState<string | null>(null);

  const [body, setBody] = useState('');

  useEffect(() => {
    if (!campId || !user) return;
    const load = async () => {
      const [campRes, settingsRes] = await Promise.all([
        supabase.from('camps').select('*').eq('id', campId).maybeSingle(),
        supabase.from('camp_newsletter_settings').select('*').eq('camp_id', campId).maybeSingle(),
      ]);

      if (!campRes.data) { navigate(-1); return; }
      setCamp(campRes.data);
      setSettings(settingsRes.data);

      if (newsletterId) {
        const { data: nl } = await supabase.from('camp_newsletters').select('*').eq('id', newsletterId).maybeSingle();
        if (nl) {
          setTitle(nl.title);
          setDraftId(nl.id);
          setBody(nl.content || '');
        }
      }
      setLoading(false);
    };
    load();
  }, [campId, user, newsletterId, navigate]);

  const checkFrequency = useCallback(async (): Promise<boolean> => {
    if (!campId) return false;
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase
      .from('camp_newsletters')
      .select('sent_at')
      .eq('camp_id', campId)
      .eq('status', 'sent')
      .gte('sent_at', oneWeekAgo)
      .limit(1);

    if (data && data.length > 0) {
      const nextDate = new Date(new Date(data[0].sent_at).getTime() + 7 * 86400000);
      setFrequencyError(`You've already sent a newsletter this week. Your next available send date is ${nextDate.toLocaleDateString()}.`);
      return false;
    }
    setFrequencyError(null);
    return true;
  }, [campId]);

  const saveDraft = useCallback(async () => {
    if (!user || !campId) return;
    setSaving(true);
    const content = body;
    const freq = settings?.frequency || 'weekly';

    if (draftId) {
      await supabase.from('camp_newsletters').update({
        title: title || 'Untitled',
        content,
      }).eq('id', draftId);
    } else {
      const { data } = await supabase.from('camp_newsletters').insert({
        camp_id: campId,
        author_id: user.id,
        title: title || 'Untitled',
        content,
        frequency: freq,
        status: 'draft',
      }).select().single();
      if (data) setDraftId(data.id);
    }

    setLastSaved(new Date());
    setSaving(false);
  }, [user, body, title, draftId, campId, settings]);

  // Auto-save every 30s
  useEffect(() => {
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [saveDraft]);

  const handleSendNow = async () => {
    if (!user || !campId) return;
    const canSend = await checkFrequency();
    if (!canSend) return;
    setShowSendConfirm(true);
  };

  const confirmSend = async () => {
    if (!user || !campId) return;
    setSending(true);
    const content = body;
    const freq = settings?.frequency || 'weekly';

    if (draftId) {
      await supabase.from('camp_newsletters').update({
        title: title.trim() || 'Untitled',
        content,
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: camp?.member_count || 0,
      }).eq('id', draftId);
    } else {
      await supabase.from('camp_newsletters').insert({
        camp_id: campId,
        author_id: user.id,
        title: title.trim() || 'Untitled',
        content,
        frequency: freq,
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: camp?.member_count || 0,
      });
    }

    // Member notifications are written by the notify_camp_newsletter trigger
    // when the newsletter row reaches status='sent' — the client no longer
    // fans out inserts (and couldn't: direct inserts are admin-only now).

    toast.success('Newsletter sent!');
    navigate(`/camps/${campId}/settings`);
  };

  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime) return;
    const canSend = await checkFrequency();
    if (!canSend) return;

    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    const content = body;
    const freq = settings?.frequency || 'weekly';

    if (draftId) {
      await supabase.from('camp_newsletters').update({
        title: title.trim() || 'Untitled',
        content,
        status: 'scheduled',
        scheduled_for: scheduledFor,
      }).eq('id', draftId);
    } else {
      await supabase.from('camp_newsletters').insert({
        camp_id: campId!,
        author_id: user!.id,
        title: title.trim() || 'Untitled',
        content,
        frequency: freq,
        status: 'scheduled',
        scheduled_for: scheduledFor,
      });
    }

    toast.success('Newsletter scheduled!');
    navigate(`/camps/${campId}/settings`);
  };

  const insertImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user) return;
      const ext = file.name.split('.').pop();
      const path = `${user.id}/newsletters/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('post-media').upload(path, file, { contentType: file.type });
      if (error) { toast.error('Upload failed'); return; }
      const { data } = supabase.storage.from('post-media').getPublicUrl(path);
      setBody(b => `${b}\n\n![](${data.publicUrl})\n`);
    };
    input.click();
  };

  const insertLink = () => {
    const url = prompt('URL:');
    if (!url) return;
    setBody(b => `${b}[link](${url})`);
  };

  if (loading) return <PineTreeLoading />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(`/camps/${campId}/settings`)} className="flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs font-body text-muted-foreground/50">
                {saving ? 'Saving...' : 'Draft saved'}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(true)}>
              <Eye size={14} className="mr-1" /> Preview
            </Button>
            <Button variant="outline" size="sm" onClick={saveDraft}>Save Draft</Button>
            <Button variant="outline" size="sm" onClick={() => setShowSchedule(true)}>Schedule</Button>
            <Button size="sm" onClick={handleSendNow} disabled={sending || !title.trim()}>
              {sending ? 'Sending...' : 'Send now'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="font-body text-xs text-muted-foreground mb-4">{camp?.name} Newsletter</p>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Issue title..."
          className="w-full font-display text-3xl font-bold text-foreground outline-none placeholder:text-muted-foreground/30 mb-6 bg-transparent"
        />

        {frequencyError && (
          <div className="mb-4 p-3 rounded-[4px] bg-destructive/10 border border-destructive/20">
            <p className="font-body text-sm text-destructive">{frequencyError}</p>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 py-2 mb-4 border-y border-border overflow-x-auto">
          <ToolbarBtn onClick={() => setBody(b => b + '**bold**')}><Bold size={16} /></ToolbarBtn>
          <ToolbarBtn onClick={() => setBody(b => b + '*italic*')}><Italic size={16} /></ToolbarBtn>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarBtn onClick={() => setBody(b => b + '\n> ')}><Quote size={16} /></ToolbarBtn>
          <ToolbarBtn onClick={() => setBody(b => b + '\n\n')}><Minus size={16} /></ToolbarBtn>
          <ToolbarBtn onClick={insertImage}><ImagePlus size={16} /></ToolbarBtn>
          <ToolbarBtn onClick={insertLink}><LinkIcon size={16} /></ToolbarBtn>
        </div>

        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write the newsletter. Markdown works." aria-label="Newsletter body" className="min-h-[40vh] w-full resize-y rounded-[3px] border border-border bg-background p-3 font-body text-sm text-foreground outline-none" />
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Email Preview</DialogTitle>
          </DialogHeader>
          <div className="bg-[#f5f0e8] rounded-[4px] p-6 font-serif text-sm">
            <p className="text-center text-xs text-[#8b7355] tracking-widest mb-4">UNDER PINES</p>
            <div className="border-t border-[#d4c5a9] pt-4 mb-4">
              <p className="text-xs text-[#8b7355] tracking-wider mb-2">FROM YOUR CAMPS</p>
              <p className="font-bold text-[#1a1a2e] mb-1">{camp?.name}</p>
              <p className="text-[#1a1a2e] font-bold text-lg mb-2">{title || 'Untitled'}</p>
              <div className="text-[#1a1a2e] text-sm"><Markdown>{body}</Markdown></div>
            </div>
            <div className="text-center mt-6">
              <span className="inline-block px-4 py-2 bg-[#c2752a] text-[#f5f0e8] rounded-[3px] text-xs">Read the full newsletter →</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Confirm */}
      <Dialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Send this newsletter?</DialogTitle>
          </DialogHeader>
          <p className="font-body text-sm text-muted-foreground">
            Send this newsletter to {camp?.member_count || 0} members? They'll receive it in their next Daily Ember delivery.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowSendConfirm(false)}>Cancel</Button>
            <Button onClick={confirmSend} disabled={sending}>
              {sending ? 'Sending...' : 'Send newsletter →'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Schedule Newsletter</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1 block">Date</label>
              <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full px-3 py-2 rounded-[5px] border border-border bg-card font-body text-sm text-foreground" />
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1 block">Time</label>
              <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-full px-3 py-2 rounded-[5px] border border-border bg-card font-body text-sm text-foreground" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowSchedule(false)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={!scheduleDate}>Schedule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

const ToolbarBtn = ({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-[3px] transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
  >
    {children}
  </button>
);

export default CampNewsletterComposer;
