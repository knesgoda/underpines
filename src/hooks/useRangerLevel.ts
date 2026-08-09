import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Client-side ranger level for showing/hiding UI. Authorization is enforced
 * server-side (RLS + ranger_level() inside every action RPC) — this only
 * decides what to render.
 *
 * 0 none · 1 Ranger · 2 Senior Ranger · 3 Head Ranger.
 */
const LEVEL_BY_ROLE: Record<string, number> = {
  head_ranger: 3,
  founder: 3,
  admin: 3,
  senior_ranger: 2,
  moderator: 1,
  ranger: 1,
};

export const useRangerLevel = () => {
  const { user } = useAuth();
  const [level, setLevel] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLevel(0);
      setLoading(false);
      return;
    }
    const check = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      const max = (data ?? []).reduce(
        (acc, r) => Math.max(acc, LEVEL_BY_ROLE[r.role as string] ?? 0),
        0,
      );
      setLevel(max);
      setLoading(false);
    };
    check();
  }, [user]);

  return { level, loading, isRanger: level >= 1, isSenior: level >= 2, isHead: level >= 3 };
};
