import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const SubscriptionPage = () => {
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto px-4 py-8">
      <h1 className="font-display text-2xl text-foreground mb-6">Your Subscription</h1>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
          <span className="text-3xl">🌲</span>
          <h2 className="font-display text-lg text-foreground">Pines+ is coming soon</h2>
          <p className="font-body text-sm text-muted-foreground">
            We're putting the finishing touches on Pines+. It'll be <strong>$1/month</strong> or <strong>$10/year</strong> — less than a coffee.
          </p>
          <p className="font-body text-xs text-muted-foreground">
            You'll be the first to know when it's ready.
          </p>
        </div>

        <div className="rounded-xl bg-muted/50 p-4">
          <p className="font-body text-xs text-muted-foreground font-medium mb-2">What Pines+ will include:</p>
          <ul className="space-y-1 font-body text-xs text-muted-foreground">
            <li>🌲 8 atmospheres (vs. 3 free)</li>
            <li>🎟️ 8 invite slots (vs. 3 free)</li>
            <li>🔥 Campfire messages kept forever</li>
            <li>🧩 Widget shelf on your Cabin</li>
            <li>🌿 A quiet pine cone badge beside your name</li>
            <li>🔍 Campfire search</li>
          </ul>
        </div>
      </div>

      <button onClick={() => navigate('/settings')} className="mt-6 font-body text-xs text-muted-foreground hover:underline">
        ← Back to Settings
      </button>
    </motion.div>
  );
};

export default SubscriptionPage;
