import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import PineTreeLoading from '@/components/PineTreeLoading';

const CampNewsletterArchive = () => {
  const { id: campId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [camp, setCamp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campId || !user) return;
    const load = async () => {
      const [campRes, nlRes] = await Promise.all([
        supabase.from('camps').select('name').eq('id', campId).maybeSingle(),
        supabase.from('camp_newsletters').select('*').eq('camp_id', campId).eq('status', 'sent').order('sent_at', { ascending: false }),
      ]);
      setCamp(campRes.data);
      setNewsletters(nlRes.data || []);
      setLoading(false);
    };
    load();
  }, [campId, user]);

  if (loading) return <PineTreeLoading />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto px-4 py-8">
      <button onClick={() => navigate(`/camps/${campId}`)} className="flex items-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back to Camp
      </button>

      <h1 className="font-display text-2xl text-foreground mb-6">Newsletters</h1>

      {newsletters.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">No newsletters yet.</p>
      ) : (
        <div className="space-y-3">
          {newsletters.map(nl => (
            <button
              key={nl.id}
              onClick={() => navigate(`/camps/${campId}/newsletter/${nl.id}`)}
              className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <p className="font-body text-sm font-medium text-foreground">{nl.title}</p>
              <p className="font-body text-xs text-muted-foreground mt-1">
                Sent {new Date(nl.sent_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} · {nl.recipient_count || 0} members
              </p>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default CampNewsletterArchive;
