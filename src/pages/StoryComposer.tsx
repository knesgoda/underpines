import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TiptapLink from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlock from '@tiptap/extension-code-block';
import { motion } from 'framer-motion';
import { ArrowLeft, Bold, Italic, Strikethrough, Heading2, Heading3, Quote, Minus, ImagePlus, Link as LinkIcon, Code } from 'lucide-react';
import { toast } from 'sonner';
import { useSeedlingStatus } from '@/hooks/useSeedlingStatus';

const StoryComposer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [postId, setPostId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [publishing, setPublishing] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        blockquote: { HTMLAttributes: { class: 'border-l-3 border-primary/30 pl-4 italic text-muted-foreground' } },
      }),
      Placeholder.configure({ placeholder: 'Tell your story...' }),
      TiptapLink.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      CodeBlock.configure({ HTMLAttributes: { class: 'bg-muted/50 rounded-lg p-4 font-mono text-sm' } }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none font-body text-foreground outline-none min-h-[300px] focus:outline-none',
      },
    },
  });

  // Word count
  const wordCount = editor?.getText().split(/\s+/).filter(Boolean).length || 0;
  const readTime = Math.max(1, Math.round(wordCount / 250));

  // Auto-save draft every 30 seconds
  const saveDraft = useCallback(async () => {
    if (!user || !editor) return;
    setSaving(true);
    const content = editor.getHTML();

    if (postId) {
      await supabase.from('posts').update({
        title: title || null,
        content,
        updated_at: new Date().toISOString(),
      }).eq('id', postId);
    } else {
      const { data } = await supabase.from('posts').insert({
        author_id: user.id,
        post_type: 'story',
        title: title || null,
        content,
        is_published: false,
      }).select().single();
      if (data) setPostId(data.id);
    }

    setLastSaved(new Date());
    setSaving(false);
  }, [user, editor, title, postId]);

  useEffect(() => {
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [saveDraft]);

  const handlePublish = async () => {
    if (!user || !editor) return;
    if (!title.trim()) {
      toast.info('Give it a title first');
      return;
    }
    setPublishing(true);
    const content = editor.getHTML();

    if (postId) {
      await supabase.from('posts').update({
        title: title.trim(),
        content,
        is_published: true,
        updated_at: new Date().toISOString(),
      }).eq('id', postId);
    } else {
      await supabase.from('posts').insert({
        author_id: user.id,
        post_type: 'story',
        title: title.trim(),
        content,
        is_published: true,
      });
    }

    toast.success('Published to the Pines');
    navigate('/');
  };

  const insertImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user) return;
      const ext = file.name.split('.').pop();
      const path = `${user.id}/stories/${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from('post-media').upload(path, file, { contentType: file.type });
      if (error) { toast.error('Upload failed'); return; }

      const { data } = supabase.storage.from('post-media').getPublicUrl(path);
      editor?.chain().focus().setImage({ src: data.publicUrl }).run();
    };
    input.click();
  };

  const insertLink = () => {
    const url = prompt('URL:');
    if (!url) return;
    editor?.chain().focus().setLink({ href: url }).run();
  };

  if (!editor) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Back to feed
          </button>

          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-xs font-body text-muted-foreground/50">
                {saving ? 'Saving...' : 'Draft saved'}
              </span>
            )}
            <button
              onClick={saveDraft}
              className="px-3 py-1.5 rounded-full border border-border text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              Save Draft
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || !title.trim()}
              className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {publishing ? 'Publishing...' : 'Publish ↑'}
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Give it a title..."
          className="w-full font-display text-3xl font-bold text-foreground outline-none placeholder:text-muted-foreground/30 mb-6"
        />

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 py-2 mb-4 border-y border-border overflow-x-auto">
          <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></ToolbarBtn>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></ToolbarBtn>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={16} /></ToolbarBtn>
          <ToolbarBtn onClick={insertImage}><ImagePlus size={16} /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('link')} onClick={insertLink}><LinkIcon size={16} /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code size={16} /></ToolbarBtn>
        </div>

        <EditorContent editor={editor} />

        <div className="mt-6 border-t border-border pt-3">
          <span className="text-xs font-body text-muted-foreground/40">
            ~{wordCount} words · ~{readTime} min read
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const ToolbarBtn = ({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-md transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
  >
    {children}
  </button>
);

export default StoryComposer;
