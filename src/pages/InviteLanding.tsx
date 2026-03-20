import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import PineTreeLoading from '@/components/PineTreeLoading';
import WeatherScene from '@/components/cabin/WeatherScene';

const InviteLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { setData } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [inviter, setInviter] = useState<any>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!slug) { setExpired(true); setLoading(false); return; }

      const { data: inv } = await supabase
        .from('invites')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (!inv || (!inv.is_infinite && inv.uses_remaining <= 0)) {
        setExpired(true);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, handle')
        .eq('id', inv.inviter_id)
        .maybeSingle();

      setInvite(inv);
      setInviter(profile);
      setData({
        inviteId: inv.id,
        inviteSlug: slug,
        inviterName: profile?.display_name || null,
        inviterHandle: profile?.handle || null,
      });
      setLoading(false);
    };

    fetchInvite();
  }, [slug, setData]);

  if (loading) return <PineTreeLoading />;

  if (expired) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #052e16, #14532d, #052e16)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-sm px-6"
        >
          <svg width="40" height="56" viewBox="0 0 48 72" className="mx-auto mb-8 opacity-40">
            <path d="M24 4 L14 24 L34 24 Z" fill="#dcfce7" />
            <path d="M24 14 L10 38 L38 38 Z" fill="#dcfce7" opacity="0.7" />
            <path d="M24 26 L6 52 L42 52 Z" fill="#dcfce7" opacity="0.5" />
            <rect x="20" y="52" width="8" height="16" rx="2" fill="#fef3c7" opacity="0.4" />
          </svg>

          <h2 className="text-2xl font-display text-pine-light mb-4">
            This fire's burned out.
          </h2>
          <p className="text-pine-light/60 font-body text-sm">
            Know someone on Under Pines?<br />
            Ask them for a fresh invite.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Background weather scene at reduced opacity */}
      <div className="absolute inset-0 opacity-30">
        <WeatherScene hour={21} season="summer" />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0" style={{ background: 'rgba(5, 46, 22, 0.7)' }} />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-md"
        >
          {/* Swaying pine icon */}
          <svg
            width="32"
            height="48"
            viewBox="0 0 48 72"
            className="mx-auto mb-8 animate-tree-sway"
          >
            <path d="M24 4 L14 24 L34 24 Z" fill="#dcfce7" opacity="0.9" />
            <path d="M24 14 L10 38 L38 38 Z" fill="#dcfce7" opacity="0.7" />
            <path d="M24 26 L6 52 L42 52 Z" fill="#dcfce7" opacity="0.5" />
            <rect x="20" y="52" width="8" height="16" rx="2" fill="#fef3c7" opacity="0.5" />
          </svg>

          {/* Card with glass-morphism */}
          <div
            className="rounded-2xl p-8 mb-8"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
             <p className="text-xl font-display text-pine-light leading-relaxed">
               {inviter?.display_name || 'Someone special'} has saved you a seat by the fire.
             </p>

            <Button
              onClick={() => navigate('/onboarding')}
              className="mt-8 rounded-pill px-10 h-14 text-base font-display bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
            >
              Come in
            </Button>
          </div>

          {/* Divider and inviter info */}
          <div className="flex items-center gap-4 justify-center text-pine-light/30">
            <div className="h-px w-12 bg-pine-light/20" />
            <span className="text-xs font-body">
              Invited by @{inviter?.handle || slug}
            </span>
            <div className="h-px w-12 bg-pine-light/20" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default InviteLanding;
