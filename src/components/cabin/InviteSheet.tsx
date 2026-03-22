import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useInviteData } from '@/hooks/useInviteData';
import { Flame, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface InviteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InviteSheet = ({ open, onOpenChange }: InviteSheetProps) => {
  const { invite, inviteUrl, usesRemaining, isInfinite, inviteeCount, loading } = useInviteData();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display text-lg flex items-center gap-2">
            <Flame size={18} className="text-primary" />
            Invite Friends
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <p className="text-sm font-body text-muted-foreground">Loading…</p>
        ) : !invite ? (
          <div className="text-center py-6">
            <p className="text-sm font-body text-muted-foreground">
              No invite link available yet. Keep posting and engaging to earn invites!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Link display + copy */}
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl bg-muted px-4 py-3 font-body text-sm text-foreground truncate">
                {inviteUrl}
              </div>
              <button
                onClick={handleCopy}
                className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm font-body text-muted-foreground">
              <span>
                {isInfinite
                  ? '∞ invites remaining'
                  : `${usesRemaining ?? 0} invite${usesRemaining !== 1 ? 's' : ''} remaining`}
              </span>
              {inviteeCount > 0 && (
                <span>{inviteeCount} accepted</span>
              )}
            </div>

            <p className="text-xs font-body text-muted-foreground/60">
              Share your link with someone you think would love the Pines.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default InviteSheet;
