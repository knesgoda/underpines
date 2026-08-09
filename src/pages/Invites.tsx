import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Share2, TreePine } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PineTreeLoading from '@/components/PineTreeLoading';
import StatePanel from '@/components/StatePanel';
import UserAvatar from '@/components/UserAvatar';
import { useSeedlingStatus } from '@/hooks/useSeedlingStatus';
import '@/styles/invites.css';

const THIRTY_DAYS_MS = 30 * 86400000;

const EARNING_CRITERIA = [
  { text: 'Someone accepts your invite within 72 hours', slots: '+3' },
  { text: 'Publish your first 10 posts', slots: '+1' },
  { text: 'Keep a conversation going for 30 days', slots: '+1' },
  { text: '3 of the people you brought stay active', slots: '+2' },
  { text: 'Your account turns 1 year old', slots: '+3' },
];

interface Invitee {
  id: string;
  invitee_id: string;
  invitee: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
    default_avatar_key: string | null;
    updated_at: string | null;
  } | null;
}

interface InviteData {
  invite: { id: string; slug: string; is_infinite: boolean | null; uses_remaining: number | null; uses_total: number | null } | null;
  invitees: Invitee[];
  nudged: Set<string>;
}

/**
 * Invites.
 *
 * Invite-only is the whole shape of the product, so this is the one surface in
 * the speculative group that has to be right. Rebuilt rather than restyled:
 * the invitee list was written out twice with slightly different behaviour in
 * each copy, and the second one silently dropped the nudge button.
 */
const Invites = () => {
  const { user } = useAuth();
  const { isSeedling, daysLeft } = useSeedlingStatus();
  const [copied, setCopied] = useState(false);
  const [nudged, setNudged] = useState<Set<string>>(new Set());
  const [nudging, setNudging] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['invites', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<InviteData> => {
      const { data: invite } = await supabase
        .from('invites')
        .select('id, slug, is_infinite, uses_remaining, uses_total')
        .eq('inviter_id', user!.id)
        .maybeSingle();

      if (!invite) return { invite: null, invitees: [], nudged: new Set() };

      const { data: uses } = await supabase
        .from('invite_uses')
        .select('id, invitee_id, invitee:invitee_id(id, display_name, handle, avatar_url, default_avatar_key, updated_at)')
        .eq('invite_id', invite.id);

      const invitees = (uses ?? []) as unknown as Invitee[];
      const ids = invitees.map(u => u.invitee_id).filter(Boolean);
      if (ids.length === 0) return { invite, invitees, nudged: new Set() };

      const { data: sent } = await supabase
        .from('notifications')
        .select('recipient_id')
        .eq('notification_type', 'smoke_signal')
        .eq('actor_id', user!.id)
        .in('recipient_id', ids)
        .gte('created_at', new Date(Date.now() - THIRTY_DAYS_MS).toISOString());

      return { invite, invitees, nudged: new Set((sent ?? []).map(n => n.recipient_id)) };
    },
  });

  if (isLoading) return <PineTreeLoading />;

  if (!user) {
    return (
      <div className="page-shell">
        <StatePanel title="Sign in first." action={<Link to="/login" className="outline-button">Sign in</Link>}>
          Invites belong to an account.
        </StatePanel>
      </div>
    );
  }

  const invite = data?.invite ?? null;
  const invitees = data?.invitees ?? [];
  const alreadyNudged = (id: string) => nudged.has(id) || !!data?.nudged.has(id);

  // The origin the app is actually served from. This was hardcoded to
  // underpines.com, so an invite copied from any other host — a preview build,
  // a staging URL, localhost — pointed somewhere the recipient could not use.
  const inviteUrl = invite ? `${window.location.origin}/invite/${invite.slug}` : '';
  const displayUrl = inviteUrl.replace(/^https?:\/\//, '');
  const staleBefore = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const hasInvites = !!invite && (invite.is_infinite || (invite.uses_remaining ?? 0) > 0);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      // Clipboard is unavailable without a secure context or a user gesture in
      // some browsers; the textarea trick still works there.
      const textarea = document.createElement('textarea');
      textarea.value = inviteUrl;
      textarea.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    toast.success('Link copied. Pick someone good.');
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (!navigator.share) { copy(); return; }
    try {
      await navigator.share({
        title: 'Join me on Under Pines',
        text: 'I saved you a seat.',
        url: inviteUrl,
      });
    } catch {
      // Cancelled.
    }
  };

  const nudge = async (inviteeId: string) => {
    if (nudging) return;
    setNudging(inviteeId);

    const { data: recent } = await supabase
      .from('notifications')
      .select('id')
      .eq('notification_type', 'smoke_signal')
      .eq('actor_id', user.id)
      .eq('recipient_id', inviteeId)
      .gte('created_at', new Date(Date.now() - THIRTY_DAYS_MS).toISOString())
      .limit(1);

    if (recent?.length) {
      toast('You nudged them recently. Give it a month.');
      setNudging(null);
      return;
    }

    const { error } = await supabase.from('notifications').insert({
      notification_type: 'smoke_signal',
      recipient_id: inviteeId,
      actor_id: user.id,
      is_read: false,
    });

    if (error) toast.error('Could not send that.');
    else {
      setNudged(prev => new Set(prev).add(inviteeId));
      toast.success('Nudged. They will see it next time they look.');
    }
    setNudging(null);
  };

  const InviteeList = () => (
    <section className="panel module">
      <h2>Who you brought here</h2>
      {invitees.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nobody yet. Your first invite could be the start of something.
        </p>
      ) : (
        invitees.map(row => {
          const person = row.invitee;
          if (!person) return null;
          const stale = !!person.updated_at && person.updated_at < staleBefore;

          return (
            <div key={row.id} className="invitee-row">
              <UserAvatar
                avatarUrl={person.avatar_url}
                defaultAvatarKey={person.default_avatar_key}
                displayName={person.display_name}
                size={30}
              />
              <Link to={`/${person.handle}`} className="invitee-name">
                <b>{person.display_name}</b>
                <small>@{person.handle}</small>
              </Link>
              {!stale ? (
                <span className="invitee-state active">Around</span>
              ) : alreadyNudged(row.invitee_id) ? (
                <span className="invitee-state">Nudged</span>
              ) : (
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => nudge(row.invitee_id)}
                  disabled={nudging === row.invitee_id}
                >
                  Nudge them
                </button>
              )}
            </div>
          );
        })
      )}

      <Link to="/invites/tree" className="album-link">
        <TreePine size={13} className="mr-1 inline" /> See the whole tree
      </Link>
    </section>
  );

  const EarningList = ({ lead }: { lead: string }) => (
    <section className="panel module">
      <h2>Earning more</h2>
      <p className="mb-3 text-sm text-muted-foreground">{lead}</p>
      <ul className="earn-list">
        {EARNING_CRITERIA.map(c => (
          <li key={c.text}>
            <span>{c.text}</span>
            <b>{c.slots}</b>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="page-shell invites">
      <div className="panel-title"><span>Invites</span></div>

      <section className="panel module">
        <h2>Why this matters</h2>
        <p>
          Everyone here was vouched for by someone real. That is the only thing keeping this
          place the size and shape it is.
        </p>
      </section>

      {isSeedling ? (
        <StatePanel title="Not yet.">
          Your invite link switches on once you have settled in — {daysLeft}{' '}
          {daysLeft === 1 ? 'day' : 'days'} to go.
        </StatePanel>
      ) : hasInvites && invite ? (
        <>
          <section className="panel module">
            <h2>Your link</h2>
            <code className="invite-url">{displayUrl}</code>
            <div className="invite-actions">
              <button type="button" className="solid-button" onClick={copy}>
                {copied ? <Check size={14} className="mr-1 inline" /> : <Copy size={14} className="mr-1 inline" />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
              {'share' in navigator && (
                <button type="button" className="outline-button" onClick={share}>
                  <Share2 size={14} className="mr-1 inline" /> Share
                </button>
              )}
            </div>
            {!invite.is_infinite && (
              <p className="invite-count">
                {invite.uses_remaining} of {invite.uses_total} left.
              </p>
            )}
          </section>
          <InviteeList />
        </>
      ) : invite ? (
        <>
          <EarningList lead="Your invites are all out in the world. More come from:" />
          <InviteeList />
        </>
      ) : (
        <EarningList lead="You do not have invites yet. They come from:" />
      )}
    </div>
  );
};

export default Invites;
