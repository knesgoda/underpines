import { useState, useEffect, useCallback } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Plus, Pin, ExternalLink, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { formatTimeAgo } from '@/lib/time';

interface LodgeItem {
  id: string;
  camp_id: string;
  author_id: string;
  title: string;
  content: string | null;
  item_type: string;
  link_url: string | null;
  is_pinned: boolean | null;
  position: number;
  created_at: string | null;
  author?: { display_name: string };
}

interface Props {
  campId: string;
  canWrite: boolean;
  isFirekeeper: boolean;
}

const CampLodge = ({ campId, canWrite, isFirekeeper }: Props) => {
  const { user } = useAuth();
  const [items, setItems] = useState<LodgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'note' | 'link' | 'resource'>('note');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('camp_lodge_items')
      .select('*')
      .eq('camp_id', campId)
      .order('is_pinned', { ascending: false })
      .order('position', { ascending: true });

    const rows = (data || []) as LodgeItem[];
    const authorIds = [...new Set(rows.map(r => r.author_id))];
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', authorIds);
      const pMap: Record<string, any> = {};
      (profiles || []).forEach(p => { pMap[p.id] = p; });
      rows.forEach(r => { r.author = pMap[r.author_id]; });
    }

    setItems(rows);
    setLoading(false);
  }, [campId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!user || !formTitle.trim()) return;
    setSaving(true);

    const { error } = await supabase.from('camp_lodge_items').insert({
      camp_id: campId,
      author_id: user.id,
      title: formTitle.trim(),
      content: formContent.trim() || null,
      item_type: formType,
      link_url: formUrl.trim() || null,
      position: items.length,
    });

    if (error) {
      toast.error('Could not add item');
    } else {
      setShowForm(false);
      setFormTitle('');
      setFormContent('');
      setFormUrl('');
      load();
    }
    setSaving(false);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Remove this item?')) return;
    await supabase.from('camp_lodge_items').delete().eq('id', itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handlePin = async (itemId: string, pinned: boolean) => {
    await supabase.from('camp_lodge_items').update({ is_pinned: !pinned }).eq('id', itemId);
    load();
  };

  const getDomain = (url: string) => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  };

  return (
    <div>
      {loading ? (
        <div className="text-center py-8"><p className="font-body text-sm text-muted-foreground">Loading...</p></div>
      ) : items.length === 0 && !canWrite ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📋</p>
          <p className="font-body text-sm text-muted-foreground">The Lodge is empty.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border bg-card p-4 ${item.is_pinned ? 'border-primary/30' : 'border-border'}`}
            >
              {item.is_pinned && (
                <div className="flex items-center gap-1 mb-2">
                  <Pin size={12} className="text-primary" />
                  <span className="font-body text-[10px] text-primary">Pinned</span>
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-body text-sm font-medium text-foreground">{item.title}</h3>
                  {item.content && <p className="font-body text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{item.content}</p>}
                  {item.link_url && (
                    <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 font-body text-xs text-primary hover:underline">
                      <ExternalLink size={10} /> {getDomain(item.link_url)}
                    </a>
                  )}
                  <p className="font-body text-[10px] text-muted-foreground mt-2">
                    Added by {item.author?.display_name || 'Unknown'} · {item.created_at ? formatTimeAgo(item.created_at) : ''}
                  </p>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-1 ml-2">
                    {isFirekeeper && (
                      <button onClick={() => handlePin(item.id, !!item.is_pinned)} className="p-1 rounded hover:bg-muted" title={item.is_pinned ? 'Unpin' : 'Pin'}>
                        <Pin size={12} className={item.is_pinned ? 'text-primary' : 'text-muted-foreground'} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(item.id)} className="p-1 rounded hover:bg-muted">
                      <Trash2 size={12} className="text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add form */}
      {canWrite && (
        <>
          {showForm ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex gap-2 mb-2">
                {(['note', 'link', 'resource'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFormType(t)}
                    className={`px-3 py-1 rounded-full font-body text-xs transition-colors capitalize ${formType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Title"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {(formType === 'link' || formType === 'resource') && (
                <input
                  value={formUrl}
                  onChange={e => setFormUrl(e.target.value)}
                  placeholder="URL"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              )}
              <textarea
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                placeholder={formType === 'note' ? 'Content' : 'Description (optional)'}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm text-foreground resize-none placeholder:text-muted-foreground focus:outline-none min-h-[60px]"
                rows={3}
              />
              <div className="flex justify-between">
                <button onClick={() => setShowForm(false)} className="font-body text-xs text-muted-foreground">Cancel</button>
                <button onClick={handleAdd} disabled={!formTitle.trim() || saving} className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-xs font-medium disabled:opacity-40">
                  Add to Lodge
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border font-body text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              <Plus size={14} /> Add to Lodge
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default CampLodge;
