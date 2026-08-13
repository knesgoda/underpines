import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import WarmGround from '@/components/layout/WarmGround';

const PineLogo = ({ size = 48 }: { size?: number }) => (
  <svg
    width={size}
    height={size * 1.5}
    viewBox="0 0 48 72"
    className="mx-auto animate-tree-sway"
  >
    <path d="M24 4 L14 24 L34 24 Z" fill="hsl(var(--pine-mid))" opacity="0.95" />
    <path d="M24 14 L10 38 L38 38 Z" fill="hsl(var(--pine-mid))" opacity="0.8" />
    <path d="M24 26 L6 52 L42 52 Z" fill="hsl(var(--pine-mid))" opacity="0.65" />
    <rect x="20" y="52" width="8" height="16" rx="2" fill="hsl(var(--primary))" opacity="0.8" />
  </svg>
);

const PRINCIPLES = [
  {
    title: 'You arrive through a person',
    body: 'There is no sign-up button. Everyone here was invited by someone who actually knows them, so every account has a human story behind it — and bots have nowhere to take root.',
  },
  {
    title: 'Your page is a place',
    body: "You get a corner of the forest that's genuinely yours — a page to decorate rather than optimize, and a cabin that slowly starts to feel inhabited. Opening a friend's should feel like visiting, not scrolling.",
  },
  {
    title: 'Communities stay human-sized',
    body: 'Groups form around the things people care about — big enough to discover someone new, small enough that you recognize the people in them. No megaphones, no broadcast channels.',
  },
  {
    title: 'The feed ends',
    body: "When you've seen what your friends shared, we tell you so. No recommendations, no trending page, no machine deciding what you see next. Being caught up is the point, not a problem to engineer away.",
  },
  {
    title: 'No attention economy',
    body: 'No ads, no follower counts to race, no streaks to protect, no boosts to buy. Nothing here is designed to farm your attention — you should come back because you wonder what your friends are up to.',
  },
];

const Waitlist = () => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('join_waitlist', { _email: email });
      if (error) throw error;
      if (!data?.success) {
        setErrorMsg(
          data?.error === 'invalid_email'
            ? "That doesn't look like an email address."
            : "The forest is busy right now — try again in a little while.",
        );
        setState('error');
        return;
      }
      setState('done');
    } catch {
      setErrorMsg('Something went wrong on our end. Try again in a moment.');
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="rounded-[5px] border border-border bg-card p-6 shadow-panel text-center">
        <p className="font-display text-lg text-foreground mb-1">You're on the list.</p>
        <p className="text-sm text-muted-foreground font-body">
          We'll find you when there's a seat by the fire.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle'); }}
          placeholder="you@example.com"
          aria-label="Email address"
          className="h-12 rounded-[3px] px-5 font-body bg-card"
        />
        <Button
          type="submit"
          disabled={state === 'sending'}
          className="h-12 rounded-[3px] px-8 font-body bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
        >
          {state === 'sending' ? 'Joining…' : 'Join the waitlist'}
        </Button>
      </div>
      {state === 'error' && (
        <p className="text-sm text-destructive font-body" role="alert">{errorMsg}</p>
      )}
      <p className="text-xs text-muted-foreground font-body">
        Invites go out slowly, on purpose. Friends of members come in through them directly.
      </p>
    </form>
  );
};

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // If logged in, redirect to cabin
  useEffect(() => {
    if (!loading && user) {
      navigate('/cabin', { replace: true });
    }
  }, [loading, user, navigate]);

  if (!loading && user) return null;

  return (
    <WarmGround>
      <div className="relative z-10 px-6">
        {/* Coming-soon hero */}
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-lg w-full py-16"
          >
            <div className="mb-8">
              <PineLogo />
            </div>

            <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-body mb-3">
              Coming soon
            </p>
            <h1 className="text-5xl font-display text-foreground mb-4">
              Under Pines
            </h1>
            <p className="text-muted-foreground font-body mb-10 leading-relaxed text-lg">
              A human-scale social network, for people who miss when the
              internet felt like a place instead of a feed.
            </p>

            <Waitlist />

            <div className="mt-10 flex items-center gap-4 justify-center text-muted-foreground">
              <div className="h-px w-12 bg-border" />
              <button
                onClick={() => navigate('/login')}
                className="text-xs font-body underline-offset-4 hover:underline"
              >
                Already have a seat? Sign in
              </button>
              <div className="h-px w-12 bg-border" />
            </div>

            <p className="mt-16 text-xs text-muted-foreground/70 font-body animate-bounce">
              ↓ what we're all about
            </p>
          </motion.div>
        </div>

        {/* What we're all about */}
        <div className="max-w-2xl mx-auto pb-24">
          <h2 className="text-3xl font-display text-foreground text-center mb-4">
            What we're all about
          </h2>
          <p className="text-muted-foreground font-body leading-relaxed text-center mb-12">
            Somewhere along the way, social media stopped being about the
            people you know and became a television that watches you back.
            Under Pines is built on a different idea: a network can stay
            small enough to behave like a community — where you join through
            someone you know, make a page that's actually yours, find groups
            around the things you love, talk with friends without an
            audience, catch up… and reach the end.
          </p>

          <div className="space-y-6">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="rounded-[5px] border border-border bg-card p-6 shadow-panel">
                <h3 className="font-display text-lg text-foreground mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <PineLogo size={32} />
            <p className="mt-6 font-display text-lg text-foreground">
              The pines are quiet. You're all caught up.
            </p>
            <p className="mt-2 text-sm text-muted-foreground font-body">
              That's not a failure state. That's the product working.
            </p>

            <div className="mt-12 flex items-center gap-6 justify-center text-xs text-muted-foreground font-body">
              <a href="/privacy" className="underline-offset-4 hover:underline">Privacy</a>
              <a href="/terms" className="underline-offset-4 hover:underline">Terms</a>
            </div>
          </div>
        </div>
      </div>
    </WarmGround>
  );
};

export default Index;
