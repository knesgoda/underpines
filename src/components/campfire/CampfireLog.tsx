import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Pin, Trash2, Plus, X } from 'lucide-react';
import { formatTimeAgo } from '@/lib/time';
import { toast } from 'sonner';

interface LogItem {
  id: string;
  content_type: string;
  content: string;
  link_url: string | null;
  photo_url: string | null;
  is_pinned: boolean | null;
  created_at: string | null;
  author_id: string;
  authorName?: string;
}

interface Props {
  campfireId: string;
  isFirekeeper: boolean;
  onClose: () => void;
}

const CampfireLog = ({ campfireId, isFirekeeper, onClose }: Props) => {
  const { user } = useAuth();
  const [items, setItems] = useState<LogItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<'note' | 'link'>('note');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const loadLog = async () => {
    const { data } = await supabase
      .from('campfire_log')
      .select('*')
      .eq('campfire_id', campfireId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (data) {
      const authorIds = [...new Set(data.map(i => i.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', authorIds);

      const pMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);
      setItems(data.map(i => ({ ...i, authorName: pMap.get(i.author_id) })));
    }
  };

  useEffect(() => { loadLog(); }, [campfireId]);

  const addItem = async () => {
    if (!user || !newContent.trim()) return;
    await supabase.from('campfire_log').insert({
      campfire_id: campfireId,
      author_id: user.id,
      content_type: newType,
      content: newContent.trim(),
      link_url: newType === 'link' ? newLinkUrl.trim() || null : null,
    });
    setNewContent('');
    setNewLinkUrl('');
    setShowAdd(false);
    loadLog();
  };

  const togglePin = async (id: string, current: boolean) => {
    // Unpin all first
    if (!current) {
      for (const item of items) {
        if (item.is_pinned) {
          await supabase.from('campfire_log').update({ is_pinned: false }).eq('id', item.id);
        }
      }
    }
    await supabase.from('campfire_log').update({ is_pinned: !current }).eq('id', id);
    loadLog();
  };

  const deleteItem = async (id: string) => {
    await supabase.from('campfire_log').delete().eq('id', id);
    loadLog();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-body text-sm font-medium text-foreground">🪵 The Log</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 && !showAdd && (
          <p className="font-body text-xs text-muted-foreground text-center py-6">Nothing in the log yet.</p>
        )}

        {items.map(item => (
          <div key={item.id} className={`p-3 rounded-xl border border-border bg-background ${item.is_pinned ? 'ring-1 ring-primary/20' : ''}`}>
            {item.is_pinned && <p className="font-body text-[10px] text-primary mb-1">📌 Pinned</p>}

            {item.content_type === 'link' && item.link_url ? (
              <a href={item.link_url} target="_blank" rel="noreferrer" className="font-body text-sm text-primary hover:underline break-all">
                {item.content}
              </a>
            ) : item.content_type === 'photo' && item.photo_url ? (
              <img src={item.photo_url} alt="" className="rounded-lg max-h-[160px] object-cover mb-1" />
            ) : (
              <p className="font-body text-sm text-foreground">{item.content}</p>
            )}

            <div className="flex items-center justify-between mt-2">
              <p className="font-body text-[10px] text-muted-foreground">
                {item.authorName} · {item.created_at ? formatTimeAgo(item.created_at) : ''}
              </p>
              {isFirekeeper && (
                <div className="flex gap-1">
                  <button onClick={() => togglePin(item.id, !!item.is_pinned)} className="p-1 text-muted-foreground hover:text-primary">
                    <Pin size={12} />
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {showAdd && (
          <div className="p-3 rounded-xl border border-border bg-background space-y-2">
            <div className="flex gap-2">
              <button onClick={() => setNewType('note')} className={`px-2 py-1 rounded-md font-body text-xs ${newType === 'note' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>Note</button>
              <button onClick={() => setNewType('link')} className={`px-2 py-1 rounded-md font-body text-xs ${newType === 'link' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>Link</button>
            </div>
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder={newType === 'note' ? 'Add a note (max 300 chars)' : 'Link title'}
              maxLength={300}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card font-body text-sm outline-none resize-none"
              rows={2}
            />
            {newType === 'link' && (
              <input
                value={newLinkUrl}
                onChange={e => setNewLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-card font-body text-sm outline-none"
              />
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-1.5 rounded-lg border border-border font-body text-xs text-muted-foreground">Cancel</button>
              <button onClick={addItem} disabled={!newContent.trim()} className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground font-body text-xs disabled:opacity-50">Add</button>
            </div>
          </div>
        )}
      </div>

      {!showAdd && (
        <div className="p-3 border-t border-border">
          <button onClick={() => setShowAdd(true)} className="w-full flex items-center justify-center gap-1 py-2 rounded-lg border border-dashed border-border font-body text-xs text-muted-foreground hover:text-foreground">
            <Plus size={14} /> Add to the Log
          </button>
        </div>
      )}
    </div>
  );
};

export default CampfireLog;
