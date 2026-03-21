import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useAdminCheck = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setIsFounder(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'moderator', 'founder']);

      const roles = data?.map(r => (r.role as string)) || [];
      setIsAdmin(roles.length > 0);
      setIsFounder(roles.includes('founder'));
      setLoading(false);
    };

    check();
  }, [user]);

  return { isAdmin, isFounder, loading };
};
