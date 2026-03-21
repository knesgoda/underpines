/**
 * useCompanions — Fetches and filters cabin_companions for the current user.
 *
 * Returns an array of companion objects with an `isActive` flag based on
 * behavior type, active_hours vs current time-of-day, and viewing context.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ── Time-of-day classification ─────────────────────────────────
function getTimeSlot() {
  const h = new Date().getHours();
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

function isDayTime() {
  const slot = getTimeSlot();
  return ['dawn', 'morning', 'afternoon', 'dusk'].includes(slot);
}

/**
 * Check whether a companion's active_hours match the current time.
 */
function isWithinActiveHours(activeHours) {
  if (activeHours === 'all') return true;
  if (activeHours === 'day') return isDayTime();
  return getTimeSlot() === activeHours;
}

/**
 * localStorage key for daily_visit completion tracking.
 */
function dailyVisitKey(companionId) {
  const dateStr = new Date().toISOString().slice(0, 10);
  return `companion-visited-${companionId}-${dateStr}`;
}

/**
 * localStorage key for session-based passing_through tracking.
 */
function sessionKey(companionId) {
  return `companion-session-${companionId}`;
}

export function useCompanions(userId, { isViewingCabin = false } = {}) {
  const [companions, setCompanions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch companions from DB
  useEffect(() => {
    if (!userId) {
      setCompanions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      const { data, error } = await supabase
        .from('cabin_companions')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: true });

      if (!cancelled) {
        if (error) {
          console.error('Failed to fetch companions:', error);
          setCompanions([]);
        } else {
          setCompanions(data || []);
        }
        setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [userId]);

  // Determine which companions are currently active
  const activeCompanions = useMemo(() => {
    if (!companions.length) return [];

    return companions
      .map((companion) => {
        // Check active hours
        if (!isWithinActiveHours(companion.active_hours)) {
          return { ...companion, isActive: false };
        }

        switch (companion.behavior) {
          case 'always_present':
            // Always active during their hours
            return { ...companion, isActive: true };

          case 'daily_visit': {
            // Only when viewing cabin/feed, once per day
            if (!isViewingCabin) return { ...companion, isActive: false };

            const key = dailyVisitKey(companion.id);
            const alreadyVisited = localStorage.getItem(key) === 'true';
            if (alreadyVisited) return { ...companion, isActive: false };

            return { ...companion, isActive: true };
          }

          case 'passing_through': {
            // Once per session
            const key = sessionKey(companion.id);
            const alreadyPassed = sessionStorage.getItem(key) === 'true';
            if (alreadyPassed) return { ...companion, isActive: false };

            return { ...companion, isActive: true };
          }

          default:
            return { ...companion, isActive: false };
        }
      })
      .sort((a, b) => a.priority - b.priority);
  }, [companions, isViewingCabin]);

  // Mark a daily_visit companion as completed for today
  const markDailyVisitComplete = useCallback((companionId) => {
    const key = dailyVisitKey(companionId);
    localStorage.setItem(key, 'true');
  }, []);

  // Mark a passing_through companion as completed for this session
  const markPassingComplete = useCallback((companionId) => {
    const key = sessionKey(companionId);
    sessionStorage.setItem(key, 'true');
  }, []);

  return {
    companions: activeCompanions,
    loading,
    markDailyVisitComplete,
    markPassingComplete,
  };
}

export default useCompanions;
