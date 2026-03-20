import { Link } from 'react-router-dom';
import { Flame, ChevronRight } from 'lucide-react';
import { useInviteData } from '@/hooks/useInviteData';

const InviteRow = () => {
  const { invite, usesRemaining, isInfinite, loading } = useInviteData();

  if (loading || !invite) return null;

  const subtitle = isInfinite
    ? 'Unlimited invites · Tap to share your link'
    : usesRemaining && usesRemaining > 0
      ? `You have ${usesRemaining} invite${usesRemaining !== 1 ? 's' : ''} · Tap to share your link`
      : 'Tap to see how to earn more';

  return (
    <Link
      to="/invites"
      className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4 shadow-soft hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
        <Flame size={18} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-body font-medium text-foreground">Invite Friends</p>
        <p className="text-xs font-body text-muted-foreground truncate">{subtitle}</p>
      </div>
      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
    </Link>
  );
};

export default InviteRow;
