import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ReportSheetProps {
  open: boolean;
  onClose: () => void;
  reportedUserId?: string;
  reportedPostId?: string;
  reportedCampPostId?: string;
  reportedCampfireMessageId?: string;
  reportedCampId?: string;
  showWrongCamp?: boolean;
}

const REASONS: { value: string; label: string; campOnly?: boolean }[] = [
  { value: 'harmful_dangerous', label: 'This feels harmful or dangerous' },
  { value: 'spam_fake', label: 'This is spam or fake' },
  // LEGAL-REVIEW-NEEDED: Minor safety report auto-escalates to Critical severity
  { value: 'minor_safety', label: 'This involves someone who may be a minor' },
  { value: 'wrong_camp', label: "This doesn't belong in this Camp", campOnly: true },
  { value: 'other', label: 'Something else' },
];

const ReportSheet = ({
  open,
  onClose,
  reportedUserId,
  reportedPostId,
  reportedCampPostId,
  reportedCampfireMessageId,
  reportedCampId,
  showWrongCamp = false,
}: ReportSheetProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [context, setContext] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !user) return;

    // Self-report prevention: silently ignore
    if (reportedUserId && reportedUserId === user.id) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId || null,
        reported_post_id: reportedPostId || null,
        reported_camp_post_id: reportedCampPostId || null,
        reported_campfire_message_id: reportedCampfireMessageId || null,
        reported_camp_id: reportedCampId || null,
        report_reason: reason,
        reporter_context: context || null,
      });

      if (error) throw error;

      // Trigger AI triage
      supabase.functions.invoke('triage-report', {
        body: { reportId: (await supabase.from('reports').select('id').order('created_at', { ascending: false }).limit(1).single()).data?.id },
      }).catch(() => {}); // Fire and forget

      setSubmitted(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setContext('');
    setSubmitted(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
        {submitted ? (
          <div className="py-12 text-center space-y-3">
            <p className="font-body text-base text-foreground">
              Thank you. We'll look into this quietly.
            </p>
            <Button variant="ghost" onClick={handleClose} className="mt-4 font-body">
              Close
            </Button>
          </div>
        ) : (
          <>
             <SheetHeader>
               <SheetTitle className="font-display text-lg">
                 Flag something for the community's health
               </SheetTitle>
             </SheetHeader>

            <div className="mt-5 space-y-5">
              <RadioGroup value={reason} onValueChange={setReason}>
                {REASONS.filter(r => !r.campOnly || showWrongCamp).map((r) => (
                  <div key={r.value} className="flex items-center gap-3 py-1.5">
                    <RadioGroupItem value={r.value} id={r.value} />
                    <Label htmlFor={r.value} className="font-body text-sm cursor-pointer">
                      {r.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <div>
                <Textarea
                  placeholder="Add context if you'd like (optional)"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="font-body text-sm resize-none"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="w-full font-body"
              >
                {submitting ? 'Sending…' : 'Send quietly'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ReportSheet;
