import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import PineTreeLoading from '@/components/PineTreeLoading';

const CampNewsletterView = () => {
  const { id: campId, newsletterId } = useParams<{ id: string; newsletterId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newsletter, setNewsletter] = useState<any>(null);
  const [camp, setCamp] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campId || !newsletterId || !user) return;
    const load = async () => {
      const [campRes, memberRes] = await Promise.all([
        supabase.from('camps').select('*').eq('id', campId).maybeSingle(),
        supabase.from('camp_members').select('id').eq('camp_id', campId).eq('user_id', user.id).maybeSingle(),
      ]);

      setCamp(campRes.data);
      setIsMember(!!memberRes.data);

      if (memberRes.data) {
        const { data: nl } = await supabase.from('camp_newsletters').select('*').eq('id', newsletterId).maybeSingle();
        setNewsletter(nl);
        if (nl) {
          const { data: prof } = await supabase.from('profiles').select('display_name, handle').eq('id', nl.author_id).maybeSingle();
          setAuthor(prof);
        }
      }
      setLoading(false);
    };
    load();
  }, [campId, newsletterId, user]);

  if (loading) return <PineTreeLoading />;

  if (!isMember) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="font-body text-sm text-muted-foreground mb-4">
          This newsletter is for members of {camp?.name || 'this Camp'}.
        </p>
        <button
          onClick={() => navigate(`/camps/${campId}`)}
          className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-body text-sm"
        >
          View this Camp →
        </button>
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="font-body text-sm text-muted-foreground">Newsletter not found.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(`/camps/${campId}`)}
        className="flex items-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} /> Back to Camp
      </button>

      <div className="flex items-center gap-2 mb-4">
        {camp?.cover_image_url && (
          <img src={camp.cover_image_url} alt="" className="w-6 h-6 rounded-full object-cover" />
        )}
        <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">{camp?.name}</span>
      </div>

      <h1 className="font-display text-3xl text-foreground mb-2">{newsletter.title}</h1>
      <p className="font-body text-xs text-muted-foreground mb-8">
        By {author?.display_name || 'Unknown'} · {new Date(newsletter.sent_at || newsletter.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>

      <div
        className="prose prose-sm max-w-none font-body text-foreground"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(newsletter.content) }}
      />
    </motion.div>
  );
};

export default CampNewsletterView;
