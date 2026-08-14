import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import PineTreeLoading from '@/components/PineTreeLoading';
import WarmGround from '@/components/layout/WarmGround';

const InviteLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { setData } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [inviter, setInviter] = useState<any>(null);
  const [expired, setExpired] = useState(false);
  // A personal link whose owner is out of passes: valid link, resting door.
  const [resting, setResting] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!slug) { setExpired(true); setLoading(false); return; }

      // Server-side validation with rate limiting (returns ip_hash for
      // infinite/open links).
      const { data: validation, error: valErr } = await supabase.functions.invoke('validate-invite', {
        body: { slug },
      });

      if (valErr || !validation?.valid) {
        setExpired(true);
        setLoading(false);
        return;
      }

      // The invites/profiles tables are no longer publicly readable; the
      // landing page (which runs before the visitor has an account) gets the
      // validity and inviter's public name through a SECURITY DEFINER RPC.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: landing } = await (supabase as any).rpc('get_invite_landing', { _slug: slug });

      if (!landing?.valid) {
        if (landing?.reason === 'resting') setResting(true);
        setExpired(true);
        setLoading(false);
        return;
      }

      const isRoot = !!landing.is_root;

      setInvite({ id: landing.invite_id, is_root: isRoot });
      setInviter(isRoot ? null : { display_name: landing.inviter_name, handle: landing.inviter_handle });
      setData({
        inviteId: landing.invite_id,
        inviteSlug: slug,
        inviterName: isRoot ? null : landing.inviter_name || null,
        inviterHandle: isRoot ? null : landing.inviter_handle || null,
        ipHash: validation.ip_hash || null,
      });

      setLoading(false);
    };

    fetchInvite();
  }, [slug, setData]);

  if (loading) return <PineTreeLoading />;

  if (expired) {
    return (
      <WarmGround>
        <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-sm px-6"
        >
          <svg width="40" height="56" viewBox="0 0 48 72" className="mx-auto mb-8 opacity-40">
            <path d="M24 4 L14 24 L34 24 Z" fill="hsl(var(--pine-mid))" />
            <path d="M24 14 L10 38 L38 38 Z" fill="hsl(var(--pine-mid))" opacity="0.7" />
            <path d="M24 26 L6 52 L42 52 Z" fill="hsl(var(--pine-mid))" opacity="0.5" />
            <rect x="20" y="52" width="8" height="16" rx="2" fill="hsl(var(--primary))" opacity="0.6" />
          </svg>

          <h2 className="text-2xl font-display text-foreground mb-4">
            {resting ? 'This link is resting.' : 'This invite has expired.'}
          </h2>
          <p className="text-muted-foreground font-body text-sm">
            {resting ? (
              <>
                Whoever sent it is out of invites for the moment.<br />
                Ask them to send you a Trail Pass by email instead.
              </>
            ) : (
              <>
                Know someone on Under Pines?<br />
                Ask them for a fresh invite.
              </>
            )}
          </p>
          </motion.div>
        </div>
      </WarmGround>
    );
  }

  return (
    <WarmGround>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-md"
        >
          <svg
            width="32"
            height="48"
            viewBox="0 0 48 72"
            className="mx-auto mb-8 animate-tree-sway"
          >
            <path d="M24 4 L14 24 L34 24 Z" fill="hsl(var(--pine-mid))" opacity="0.95" />
            <path d="M24 14 L10 38 L38 38 Z" fill="hsl(var(--pine-mid))" opacity="0.8" />
            <path d="M24 26 L6 52 L42 52 Z" fill="hsl(var(--pine-mid))" opacity="0.65" />
            <rect x="20" y="52" width="8" height="16" rx="2" fill="hsl(var(--primary))" opacity="0.8" />
          </svg>

          {/* Container from this branch — role tokens rather than a hardcoded
              translucent white, so it reads in light as well as dark. Copy from
              main, which added the root invite: an open link has no inviter to
              name. */}
          <div className="rounded-[5px] border border-border bg-card p-8 mb-8 shadow-panel">
             <p className="text-xl font-display text-foreground leading-relaxed">
               {invite?.is_root
                 ? "There's a seat by the fire, and it's yours."
                 : `${inviter?.display_name || 'Someone special'} has saved you a seat by the fire.`}
             </p>

            <Button
              onClick={() => navigate('/onboarding')}
              className="mt-8 rounded-[3px] px-10 h-14 text-base font-display bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
            >
              Come in
            </Button>
          </div>

          <div className="flex items-center gap-4 justify-center text-muted-foreground">
            <div className="h-px w-12 bg-border" />
            <span className="text-xs font-body">
              {invite?.is_root ? 'Under Pines' : `Invited by @${inviter?.handle || slug}`}
            </span>
            <div className="h-px w-12 bg-border" />
          </div>

        </motion.div>
      </div>
    </WarmGround>
  );
};

export default InviteLanding;
