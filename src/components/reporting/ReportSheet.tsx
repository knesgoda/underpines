import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
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
  { value: 'suspected_bot', label: 'This might be a bot or automated account' },
  // LEGAL-REVIEW-NEEDED: Minor safety report auto-escalates to Critical severity
  { value: 'minor_safety', label: 'This involves someone who may be a minor' },
  { value: 'wrong_camp', label: "This doesn't belong in this group", campOnly: true },
  { value: 'other', label: 'Something else' },
];

// Spec §42: quick optional detail for bot reports. Reporting should take
// under 30 seconds, so these are checkboxes, not required fields.
const BOT_SUBCATEGORIES: { value: string; label: string }[] = [
  { value: 'spam_posts', label: 'Spam or repetitive posts' },
  { value: 'repetitive_dms', label: 'Strange or repetitive messages' },
  { value: 'fake_engagement', label: 'Fake engagement' },
  { value: 'scam_behavior', label: 'Scam behavior' },
  { value: 'automated_account', label: 'Account appears automated' },
  { value: 'suspicious_invites', label: 'Suspicious invitations' },
  { value: 'other', label: 'Other' },
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
  const [botSubcategories, setBotSubcategories] = useState<string[]>([]);
  const [context, setContext] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleSubcategory = (value: string) => {
    setBotSubcategories(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async () => {
    if (!reason || !user) return;

    // Self-report prevention: silently ignore
    if (reportedUserId && reportedUserId === user.id) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    try {
      const { data: report, error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId || null,
        reported_post_id: reportedPostId || null,
        reported_camp_post_id: reportedCampPostId || null,
        reported_campfire_message_id: reportedCampfireMessageId || null,
        reported_camp_id: reportedCampId || null,
        report_reason: reason,
        subcategory:
          reason === 'suspected_bot' && botSubcategories.length > 0
            ? botSubcategories.join(',')
            : null,
        reporter_context: context || null,
      } as never).select('id').single();

      if (error) throw error;

      // Trigger AI triage using the returned report ID
      if (report?.id) {
        supabase.functions.invoke('triage-report', {
          body: { reportId: report.id },
        }).catch(() => {}); // Fire and forget
      }

      setSubmitted(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setBotSubcategories([]);
    setContext('');
    setSubmitted(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto">
        {submitted ? (
          <div className="py-12 text-center space-y-3">
            <p className="font-body text-base text-foreground">
              Thanks for looking out for the community.
            </p>
            <p className="font-body text-sm text-muted-foreground">
              The Ranger Station received your report.
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

              {reason === 'suspected_bot' && (
                <div className="rounded-[5px] border border-border bg-muted/40 p-3 space-y-2">
                  <p className="font-body text-xs text-muted-foreground">
                    What seemed unusual? (optional)
                  </p>
                  {BOT_SUBCATEGORIES.map((s) => (
                    <div key={s.value} className="flex items-center gap-3 py-0.5">
                      <Checkbox
                        id={`bot-${s.value}`}
                        checked={botSubcategories.includes(s.value)}
                        onCheckedChange={() => toggleSubcategory(s.value)}
                      />
                      <Label htmlFor={`bot-${s.value}`} className="font-body text-sm cursor-pointer">
                        {s.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Textarea
                  placeholder="Anything else we should know? (optional)"
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
                {submitting ? 'Sending…' : 'Send to the Ranger Station'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ReportSheet;
