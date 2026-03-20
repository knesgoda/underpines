import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import CampfireView from '@/components/campfire/CampfireView';

interface Props {
  campId: string;
}

const CampBonfire = ({ campId }: Props) => {
  const { user } = useAuth();
  const [bonfireId, setBonfireId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('campfires')
      .select('id')
      .eq('camp_id', campId)
      .eq('campfire_type', 'bonfire')
      .is('bonfire_sub_group_of', null)
      .maybeSingle()
      .then(({ data }) => {
        setBonfireId(data?.id || null);
        setLoading(false);
      });
  }, [campId, user]);

  if (loading) return <div className="text-center py-8"><p className="font-body text-sm text-muted-foreground">Loading Bonfire...</p></div>;
  if (!bonfireId) return <div className="text-center py-8"><p className="font-body text-sm text-muted-foreground">No Bonfire found for this Camp.</p></div>;

  return <CampfireView campfireId={bonfireId} onBack={() => {}} onRefreshList={() => {}} />;
};

export default CampBonfire;
