import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Mail, TreePine, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  createTrailPass,
  listMyTrailPasses,
  refreshMyInvites,
  revokeTrailPass,
  sendTrailPassEmail,
  type InviteSummary,
  type TrailPass,
} from '@/lib/trailApi';
import PineTreeLoading from '@/components/PineTreeLoading';
import StatePanel from '@/components/StatePanel';
import UserAvatar from '@/components/UserAvatar';
import '@/styles/invites.css';

const THIRTY_DAYS_MS = 30 * 86400000;

interface InviteeProfile {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  default_avatar_key: string | null;
  updated_at: string | null;
}

interface PageData {
  summary: InviteSummary;
  passes: TrailPass[];
  invitees: InviteeProfile[];
  nudged: Set<string>;
}

const PASS_STATUS_LABEL: Record<TrailPass['status'], string> = {
  PENDING: 'Waiting',
  REDEEMED: 'Joined',
  EXPIRED: 'Expired',
  REVOKED: 'Cancelled',
  PAUSED: 'On hold',
};

/**
 * Trail Passes.
 *
 * Invitations are single-use and bound to one email address. Everything that
 * matters — eligibility, the pass balance, expiry, regeneration — is enforced
 * by the create_trail_pass / refresh_my_invites RPCs; this page just renders
 * the result. Exact eligibility mechanics are deliberately not spelled out
 * here (spec §15: don't teach attackers how to farm eligibility).
 */
const Invites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [newPassLink, setNewPassLink] = useState<string | null>(null);
  const [emailWasSent, setEmailWasSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nudging, setNudging] = useState<string | null>(null);
  const [nudged, setNudged] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['trail-passes', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PageData> => {
      // refresh_my_invites also lazily expires overdue passes and credits
      // matured healthy invitees back to the balance.
      const summary = await refreshMyInvites();
      const passes = await listMyTrailPasses(user!.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { data: lineage } = await db
        .from('user_lineage')
        .select('user_id')
        .eq('invited_by_user_id', user!.id);
      const ids: string[] = (lineage ?? []).map((l: { user_id: string }) => l.user_id);

      let invitees: InviteeProfile[] = [];
      let nudgedSet = new Set<string>();
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, handle, avatar_url, default_avatar_key, updated_at')
          .in('id', ids);
        invitees = (profiles ?? []) as InviteeProfile[];

        const { data: sent } = await supabase
          .from('notifications')
          .select('recipient_id')
          .eq('notification_type', 'smoke_signal')
          .eq('actor_id', user!.id)
          .in('recipient_id', ids)
          .gte('created_at', new Date(Date.now() - THIRTY_DAYS_MS).toISOString());
        nudgedSet = new Set((sent ?? []).map(n => n.recipient_id));
      }

      return { summary, passes, invitees, nudged: nudgedSet };
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

  const summary = data?.summary;
  const passes = data?.passes ?? [];
  const invitees = data?.invitees ?? [];
  const staleBefore = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const alreadyNudged = (id: string) => nudged.has(id) || !!data?.nudged.has(id);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['trail-passes', user.id] });

  const handleSend = async () => {
    if (sending || !email.trim()) return;
    setSending(true);
    setNewPassLink(null);
    try {
      const result = await createTrailPass(email.trim(), firstName.trim() || undefined, message.trim() || undefined);
      if (!result.success || !result.token) {
        const friendly: Record<string, string> = {
          invalid_email: "That doesn't look like an email address.",
          already_invited: 'You already have a pass out for that address.',
          no_passes: "You don't have a Trail Pass available right now.",
          invites_frozen: 'Your Trail Passes are temporarily unavailable.',
          not_yet_eligible: 'Trail Passes unlock after some time in the community.',
          not_eligible: "Trail Passes aren't available on your account right now.",
        };
        toast.error(friendly[result.error ?? ''] ?? 'Could not create that Trail Pass.');
        return;
      }

      const link = `${window.location.origin}/join/${result.token}`;
      const emailResult = await sendTrailPassEmail(result.pass_id!, result.token);
      setNewPassLink(link);
      setEmailWasSent(emailResult.sent);
      if (emailResult.sent) {
        toast.success('Trail Pass sent. Pick someone good.');
      } else {
        toast.success('Trail Pass created. Share the link below — it only works for that email.');
      }
      setEmail('');
      setFirstName('');
      setMessage('');
      refresh();
    } finally {
      setSending(false);
    }
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = link;
      textarea.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    toast.success('Link copied.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (passId: string) => {
    const result = await revokeTrailPass(passId);
    if (result.success) {
      toast.success('Trail Pass cancelled. It returned to your pouch.');
      refresh();
    } else {
      toast.error('Could not cancel that pass.');
    }
  };

  const nudge = async (inviteeId: string) => {
    if (nudging) return;
    setNudging(inviteeId);
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

  const passesAvailable = summary?.available_passes ?? 0;
  const frozen = !!summary?.frozen;
  const eligible = !!summary?.eligible;

  return (
    <div className="page-shell invites">
      <div className="panel-title"><span>Trail Passes</span></div>

      <section className="panel module">
        <h2>Invite someone Under Pines</h2>
        <p>
          Under Pines grows through people, not algorithms. Send a Trail Pass to
          someone you'd like to have around. Each pass is personal: it goes to
          one email address and works exactly once.
        </p>
      </section>

      {frozen ? (
        <StatePanel title="Your Trail Passes are resting.">
          Your Trail Passes are temporarily unavailable while we review unusual
          activity connected to recent invitations. Everything else about your
          account works normally.
        </StatePanel>
      ) : !eligible ? (
        <StatePanel title="Not quite yet.">
          Trail Passes become available after you've spent some time as part of
          the community.
        </StatePanel>
      ) : passesAvailable > 0 ? (
        <section className="panel module">
          <h2>
            Send a Trail Pass
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {passesAvailable} available
            </span>
          </h2>
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm text-muted-foreground">Their email</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="friend@example.com"
                className="mt-1 w-full rounded-[5px] border border-border bg-card px-3 py-2 font-body text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted-foreground">Their first name (optional)</span>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-[5px] border border-border bg-card px-3 py-2 font-body text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted-foreground">A note from you (optional)</span>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                maxLength={500}
                className="mt-1 w-full rounded-[5px] border border-border bg-card px-3 py-2 font-body text-sm resize-none"
              />
            </label>
            <button
              type="button"
              className="solid-button"
              onClick={handleSend}
              disabled={sending || !email.trim()}
            >
              <Mail size={14} className="mr-1 inline" />
              {sending ? 'Sending…' : 'Send Trail Pass'}
            </button>
            {newPassLink && (
              <div className="rounded-[5px] border border-border bg-muted/40 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {emailWasSent
                    ? 'Sent! You can also share the link directly:'
                    : "We couldn't email it just now — share this link with them instead:"}
                </p>
                <code className="invite-url break-all">{newPassLink.replace(/^https?:\/\//, '')}</code>
                <button type="button" className="outline-button" onClick={() => copyLink(newPassLink)}>
                  {copied ? <Check size={14} className="mr-1 inline" /> : <Copy size={14} className="mr-1 inline" />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            )}
          </div>
          <p className="invite-count mt-3">
            Trail Passes are limited and become available as your corner of the
            community grows.
          </p>
        </section>
      ) : (
        <StatePanel title="Your trail is growing.">
          You don't have a Trail Pass available right now. More become available
          over time as the people you've invited become part of the community.
        </StatePanel>
      )}

      {passes.length > 0 && (
        <section className="panel module">
          <h2>Passes you've sent</h2>
          {passes.map(pass => (
            <div key={pass.id} className="invitee-row">
              <div className="invitee-name">
                <b>{pass.invitee_name || pass.invitee_email_normalized}</b>
                {pass.invitee_name && <small>{pass.invitee_email_normalized}</small>}
              </div>
              <span className={`invitee-state ${pass.status === 'REDEEMED' ? 'active' : ''}`}>
                {PASS_STATUS_LABEL[pass.status]}
              </span>
              {pass.status === 'PENDING' && (
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => handleRevoke(pass.id)}
                  aria-label={`Cancel the pass for ${pass.invitee_email_normalized}`}
                >
                  <XCircle size={13} className="mr-1 inline" /> Cancel
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="panel module">
        <h2>Who you brought here</h2>
        {invitees.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nobody yet. Your first invite could be the start of something.
          </p>
        ) : (
          invitees.map(person => {
            const stale = !!person.updated_at && person.updated_at < staleBefore;
            return (
              <div key={person.id} className="invitee-row">
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
                ) : alreadyNudged(person.id) ? (
                  <span className="invitee-state">Nudged</span>
                ) : (
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => nudge(person.id)}
                    disabled={nudging === person.id}
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
    </div>
  );
};

export default Invites;
