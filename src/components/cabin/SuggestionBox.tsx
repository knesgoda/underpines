import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import type { Atmosphere } from '@/lib/cabin-config';

interface Props {
  cabinOwnerId: string;
  cabinOwnerHandle: string;
  atmosphere: Atmosphere;
}

const SESSION_KEY = 'cabin_suggestion_sent';
const MAX_CHARS = 500;
const SHOW_COUNTER_AT = 400;

const SuggestionBox = ({ cabinOwnerId, cabinOwnerHandle, atmosphere }: Props) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState('');
  const [visible, setVisible] = useState(false);

  // Check sessionStorage for already-submitted state
  useEffect(() => {
    const sent = sessionStorage.getItem(SESSION_KEY);
    if (sent) {
      const parsed = JSON.parse(sent) as string[];
      if (parsed.includes(cabinOwnerId)) {
        setSubmitted(true);
      }
    }
    // Delay appearance
    const t = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(t);
  }, [cabinOwnerId]);

  // Check rate limits
  useEffect(() => {
    if (!user || submitted) return;

    const checkLimits = async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Check per-cabin limit (1 per cabin per 24h)
      const { data: cabinSuggestions } = await supabase
        .from('cabin_suggestions')
        .select('id')
        .eq('author_id', user.id)
        .eq('cabin_owner_id', cabinOwnerId)
        .gte('created_at', twentyFourHoursAgo);

      if (cabinSuggestions && cabinSuggestions.length >= 1) {
        setRateLimited(true);
        setRateLimitMessage("You've already left a note here today.");
        return;
      }

      // Check global limit (5 per day)
      const { data: allSuggestions } = await supabase
        .from('cabin_suggestions')
        .select('id')
        .eq('author_id', user.id)
        .gte('created_at', twentyFourHoursAgo);

      if (allSuggestions && allSuggestions.length >= 5) {
        setRateLimited(true);
        setRateLimitMessage("You've been busy! Come back tomorrow.");
        return;
      }
    };

    checkLimits();
  }, [user, cabinOwnerId, submitted]);

  const handleSubmit = useCallback(async () => {
    if (!user || !content.trim() || submitting) return;
    setSubmitting(true);

    try {
      // 1. Insert suggestion
      const { error: insertError } = await supabase.from('cabin_suggestions').insert({
        cabin_owner_id: cabinOwnerId,
        author_id: user.id,
        content: content.trim().slice(0, MAX_CHARS),
      });

      if (insertError) throw insertError;

      // 2. Find the founder (admin role)
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      if (adminRole && adminRole.user_id !== user.id) {
        const founderId = adminRole.user_id;

        // 3. Find or create 1-on-1 campfire with founder
        const { data: myParticipations } = await supabase
          .from('campfire_participants')
          .select('campfire_id')
          .eq('user_id', user.id);

        let campfireId: string | null = null;

        if (myParticipations && myParticipations.length > 0) {
          const myIds = myParticipations.map(p => p.campfire_id);

          // Find a one_on_one campfire where founder is also a participant
          const { data: founderParticipations } = await supabase
            .from('campfire_participants')
            .select('campfire_id')
            .eq('user_id', founderId)
            .in('campfire_id', myIds);

          if (founderParticipations && founderParticipations.length > 0) {
            const sharedIds = founderParticipations.map(p => p.campfire_id);
            const { data: campfire } = await supabase
              .from('campfires')
              .select('id')
              .in('id', sharedIds)
              .eq('campfire_type', 'one_on_one')
              .limit(1)
              .maybeSingle();

            campfireId = campfire?.id || null;
          }
        }

        // Create campfire if none exists
        if (!campfireId) {
          const { data: newCampfire } = await supabase
            .from('campfires')
            .insert({
              campfire_type: 'one_on_one',
              firekeeper_id: user.id,
              is_active: true,
            })
            .select('id')
            .single();

          if (newCampfire) {
            campfireId = newCampfire.id;
            // Add both participants
            await supabase.from('campfire_participants').insert([
              { campfire_id: campfireId, user_id: user.id },
              { campfire_id: campfireId, user_id: founderId },
            ]);
          }
        }

        // 4. Send the message
        if (campfireId) {
          // Get author handle
          const { data: authorProfile } = await supabase
            .from('profiles')
            .select('handle')
            .eq('id', user.id)
            .maybeSingle();

          const authorHandle = authorProfile?.handle || 'someone';

          await supabase.from('campfire_messages').insert({
            campfire_id: campfireId,
            sender_id: user.id,
            content: `🪵 Note left on @${cabinOwnerHandle}'s Cabin:\n\n${content.trim()}\n\n— from @${authorHandle}`,
            message_type: 'text',
          });
        }
      }

      // Mark as submitted in sessionStorage
      const sent = sessionStorage.getItem(SESSION_KEY);
      const parsed: string[] = sent ? JSON.parse(sent) : [];
      parsed.push(cabinOwnerId);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(parsed));

      setSubmitted(true);
    } catch {
      // Silently fail — this is a quiet feature
    } finally {
      setSubmitting(false);
    }
  }, [user, content, cabinOwnerId, cabinOwnerHandle, submitting]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-md mx-auto px-6 pb-16"
    >
      <div
        className="rounded-2xl p-5 transition-colors duration-500"
        style={{
          backgroundColor: atmosphere.cardBg,
          border: `1px solid ${atmosphere.border}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <p className="font-body text-sm" style={{ color: atmosphere.text, opacity: 0.7 }}>
              Your note found its way through the trees. 🌲
            </p>
          </motion.div>
        ) : rateLimited ? (
          <div className="text-center py-3">
            <p className="text-lg mb-1">🪵</p>
            <p className="font-body text-sm" style={{ color: atmosphere.text, opacity: 0.5 }}>
              {rateLimitMessage}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <p className="text-lg mb-1">🪵</p>
              <p className="font-display text-sm" style={{ color: atmosphere.text }}>
                Leave a note at the door
              </p>
              <p className="font-body text-xs mt-0.5" style={{ color: atmosphere.text, opacity: 0.45 }}>
                Ideas, wishes, or things you'd love to see in the Pines
              </p>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
              placeholder="A thought for the forest..."
              rows={3}
              className="w-full rounded-xl px-3 py-2.5 font-body text-sm resize-none outline-none placeholder:opacity-40 transition-colors"
              style={{
                backgroundColor: `${atmosphere.background}`,
                color: atmosphere.text,
                border: `1px solid ${atmosphere.border}`,
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <span
                className="font-body text-[10px] transition-opacity"
                style={{
                  color: atmosphere.text,
                  opacity: content.length >= SHOW_COUNTER_AT ? 0.4 : 0,
                }}
              >
                {content.length}/{MAX_CHARS}
              </span>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                className="px-4 py-1.5 rounded-full font-body text-xs font-medium transition-all duration-200 disabled:opacity-30 active:scale-[0.97]"
                style={{
                  backgroundColor: atmosphere.accent,
                  color: atmosphere.cardBg,
                }}
              >
                {submitting ? 'Sending...' : 'Tuck it under the door'}
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default SuggestionBox;
