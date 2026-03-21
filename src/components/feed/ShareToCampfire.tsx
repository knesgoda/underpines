import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { toast } from 'sonner';

interface ShareToCampfireProps {
  postId: string;
  open: boolean;
  onClose: () => void;
}

const ShareToCampfire = ({ postId, open, onClose }: ShareToCampfireProps) => {
  const { user } = useAuth();
  const [campfires, setCampfires] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    const load = async () => {
      const { data: participations } = await supabase
        .from('campfire_participants')
        .select('campfire_id')
        .eq('user_id', user.id);

      if (participations && participations.length > 0) {
        const ids = participations.map(p => p.campfire_id);
        const { data } = await supabase
          .from('campfires')
          .select('*')
          .in('id', ids)
          .eq('is_active', true);
        setCampfires(data || []);
      }
    };
    load();
  }, [user, open]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const handleSend = async (campfireId: string) => {
    if (!user) return;
    setSending(true);

    await supabase.from('campfire_messages').insert({
      campfire_id: campfireId,
      sender_id: user.id,
      message_type: 'cross_post',
      cross_post_id: postId,
      content: note.trim() || null,
    });

    toast.success('Shared to Campfire');
    setSending(false);
    onClose();
  };

  const filtered = campfires.filter(c =>
    !search || (c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="relative bg-card rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden border border-border shadow-card"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-body text-sm font-medium text-foreground">Send to a Campfire</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Campfires..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background font-body text-sm outline-none"
            />
          </div>

          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-sm font-body text-muted-foreground text-center py-4">
                No campfires yet. Start one first.
              </p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSend(c.id)}
                  disabled={sending}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <span>🔥</span>
                  <span className="font-body text-sm text-foreground">{c.name || 'Campfire'}</span>
                </button>
              ))
            )}
          </div>

          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note... (optional)"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm outline-none"
          />
        </div>
      </motion.div>
    </div>
  );
};

export default ShareToCampfire;
