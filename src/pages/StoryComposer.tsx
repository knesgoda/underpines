import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ArrowLeft, Bold, Italic, Heading2, Heading3, Quote, List, Link as LinkIcon, Code, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useSeedlingStatus } from '@/hooks/useSeedlingStatus';
import Markdown from '@/lib/markdown';
import '@/styles/onboarding.css';

/**
 * Long-form composer — plain text with markdown, replacing TipTap.
 *
 * The rich editor cost ~127 kB gzip and stored HTML, which then had to be
 * rendered back through dangerouslySetInnerHTML. Markdown is lighter, closer
 * to what the era actually felt like, and renders through React elements so
 * injection is structurally impossible. There were no existing long-form posts
 * to migrate.
 */
const StoryComposer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSeedling, daysLeft } = useSeedlingStatus();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postId, setPostId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(wordCount / 250));

  /** Wrap or prefix the selection, so the toolbar stays useful without an editor. */
  const apply = (before: string, after = '', linePrefix = false) => {
    const el = areaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = body.slice(s, e);
    const next = linePrefix
      ? `${body.slice(0, s)}${before}${selected || 'text'}${body.slice(e)}`
      : `${body.slice(0, s)}${before}${selected || 'text'}${after}${body.slice(e)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = s + before.length + (selected || 'text').length;
      el.setSelectionRange(pos, pos);
    });
  };

  const saveDraft = useCallback(async () => {
    if (!user || (!title.trim() && !body.trim())) return;
    setSaving(true);

    if (postId) {
      await supabase.from('posts').update({
        title: title || null,
        content: body,
        updated_at: new Date().toISOString(),
      }).eq('id', postId);
    } else {
      const { data } = await supabase.from('posts').insert({
        author_id: user.id,
        post_type: 'story',
        title: title || null,
        content: body,
        is_published: false,
      }).select().single();
      if (data) setPostId(data.id);
    }

    setLastSaved(new Date());
    setSaving(false);
  }, [user, title, body, postId]);

  useEffect(() => {
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [saveDraft]);

  const handlePublish = async () => {
    if (!user) return;
    if (!title.trim()) { toast.info('Give it a title first'); return; }
    setPublishing(true);

    if (postId) {
      await supabase.from('posts').update({
        title: title.trim(),
        content: body,
        is_published: true,
        updated_at: new Date().toISOString(),
      }).eq('id', postId);
    } else {
      await supabase.from('posts').insert({
        author_id: user.id,
        post_type: 'story',
        title: title.trim(),
        content: body,
        is_published: true,
      });
    }

    toast.success('Published');
    navigate('/');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <span className="font-body text-xs text-muted-foreground">
          {wordCount} word{wordCount === 1 ? '' : 's'} · {readTime} min read
          {saving ? ' · saving…' : lastSaved ? ` · saved ${lastSaved.toLocaleTimeString()}` : ''}
        </span>
        <button
          type="button"
          onClick={() => setPreview(p => !p)}
          className="ml-auto flex items-center gap-1.5 font-body text-xs text-muted-foreground hover:text-foreground"
        >
          <Eye size={15} /> {preview ? 'Write' : 'Preview'}
        </button>
        <button
          onClick={handlePublish}
          disabled={publishing || !title.trim()}
          className="rounded-pill bg-primary px-5 py-2 font-body text-sm text-primary-foreground disabled:opacity-50"
        >
          {publishing ? 'Publishing…' : 'Publish'}
        </button>
      </div>

      {isSeedling && (
        <p className="mb-3 font-body text-xs text-muted-foreground">
          You're new here — {daysLeft} day{daysLeft === 1 ? '' : 's'} of settling in left.
        </p>
      )}

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Title"
        aria-label="Title"
        className="mb-3 w-full border-0 bg-transparent font-display text-3xl text-foreground outline-none placeholder:text-muted-foreground"
      />

      {preview ? (
        <article className="panel module prose-sm max-w-none">
          <Markdown>{body}</Markdown>
        </article>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-1 border-b border-border pb-2">
            <ToolbarBtn label="Bold" onClick={() => apply('**', '**')}><Bold size={16} /></ToolbarBtn>
            <ToolbarBtn label="Italic" onClick={() => apply('*', '*')}><Italic size={16} /></ToolbarBtn>
            <ToolbarBtn label="Heading 2" onClick={() => apply('\n## ', '', true)}><Heading2 size={16} /></ToolbarBtn>
            <ToolbarBtn label="Heading 3" onClick={() => apply('\n### ', '', true)}><Heading3 size={16} /></ToolbarBtn>
            <ToolbarBtn label="Quote" onClick={() => apply('\n> ', '', true)}><Quote size={16} /></ToolbarBtn>
            <ToolbarBtn label="List" onClick={() => apply('\n- ', '', true)}><List size={16} /></ToolbarBtn>
            <ToolbarBtn label="Link" onClick={() => apply('[', '](https://)')}><LinkIcon size={16} /></ToolbarBtn>
            <ToolbarBtn label="Code" onClick={() => apply('`', '`')}><Code size={16} /></ToolbarBtn>
          </div>

          <textarea
            ref={areaRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write it out. Markdown works."
            aria-label="Post body"
            className="min-h-[60vh] w-full resize-y border-0 bg-transparent font-body text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          />
        </>
      )}
    </motion.div>
  );
};

const ToolbarBtn = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
  >
    {children}
  </button>
);

export default StoryComposer;
