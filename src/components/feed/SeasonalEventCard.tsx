import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import SeasonalIllustration from '@/components/illustrations/SeasonalIllustration';

interface SeasonalEvent {
  id: string;
  name: string;
  illustration_key: string;
  prompt_text: string | null;
}

interface SeasonalEventCardProps {
  onShareThought: (prompt: string) => void;
}

const SeasonalEventCard = ({ onShareThought }: SeasonalEventCardProps) => {
  const { user } = useAuth();
  const [event, setEvent] = useState<SeasonalEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchEvent = async () => {
      const { data } = await supabase
        .from('seasonal_events')
        .select('id, name, illustration_key, prompt_text')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!data) return;

      // Check if user already dismissed or responded
      const { data: response } = await supabase
        .from('event_responses')
        .select('id')
        .eq('event_id', data.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!response) setEvent(data as SeasonalEvent);
    };
    fetchEvent();
  }, [user]);

  const handleDismiss = async () => {
    if (!event || !user) return;
    await supabase.from('event_responses').insert({
      event_id: event.id,
      user_id: user.id,
      response_text: null,
    });
    setDismissed(true);
  };

  const handleShare = () => {
    if (!event) return;
    handleDismiss();
    onShareThought(event.prompt_text || '');
  };

  if (!event || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="rounded-2xl overflow-hidden bg-card border border-border shadow-card mb-4"
      >
        <div className="relative w-full h-48 overflow-hidden">
          <SeasonalIllustration illustrationKey={event.illustration_key} className="w-full h-full" />
        </div>
        <div className="p-5 space-y-3">
          <h3 className="font-display text-xl text-foreground">{event.name}</h3>
          {event.prompt_text && (
            <p className="font-body text-sm text-muted-foreground italic leading-relaxed">
              {event.prompt_text}
            </p>
          )}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleShare}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-body text-sm hover:opacity-90 transition-opacity"
            >
              Share a thought →
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 rounded-full font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              🌲 Skip
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SeasonalEventCard;
