import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SparkComposerProps {
  onPost: (post: any) => void;
  onCancel: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const SparkComposer = ({ onPost, onCancel }: SparkComposerProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.max(el.scrollHeight, 80) + 'px';
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    if (file.size > MAX_FILE_SIZE) {
      toast.error("That image is a bit too big for the fire. Try one under 10MB.");
      return;
    }

    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
      const isHeic = file.name?.toLowerCase().endsWith('.heic') || file.type === 'image/heic';
      toast.error(isHeic
        ? "That file format isn't supported yet. Try saving it as a JPEG or PNG first."
        : "Only JPEG, PNG, GIF, or WebP images for now.");
      return;
    }

    // Set preview
    const preview = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(preview);
    setUploadedUrl(null);

    // Upload immediately
    if (!user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('post-media')
      .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });

    if (uploadErr) {
      toast.error("That image didn't make it through. Try again?");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(path);
    setUploadedUrl(urlData.publicUrl);
    setUploading(false);
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setUploadedUrl(null);
    setUploading(false);
  };

  const isSubmitBlocked = !content.trim() || posting || (imageFile && !uploadedUrl);

  const handlePost = async () => {
    if (!content.trim() || !user) return;
    setPosting(true);

    // Optimistic post object
    const optimisticPost = {
      id: crypto.randomUUID(),
      author_id: user.id,
      post_type: 'spark' as const,
      content: content.trim(),
      image_url: uploadedUrl || null,
      title: null,
      is_published: true,
      is_quote_post: false,
      quoted_post_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _optimistic: true,
    };

    onPost(optimisticPost);
    setContent('');
    clearImage();

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        post_type: 'spark',
        content: content.trim(),
        image_url: uploadedUrl || null,
      })
      .select()
      .single();

    if (error) {
      onPost({ ...optimisticPost, _failed: true });
      toast.error("That one didn't make it. Try again?");
    }
    setPosting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-3"
    >
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          if (e.target.value.length <= 300) {
            setContent(e.target.value);
            autoResize();
          }
        }}
        placeholder="What's alive in you right now?"
        className="w-full bg-transparent text-foreground font-body text-sm resize-none outline-none placeholder:text-muted-foreground/50 min-h-[80px]"
        rows={3}
      />

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative inline-block"
          >
            <img
              src={imagePreview}
              alt="Attachment preview"
              className="w-16 h-16 rounded-lg object-cover border border-border"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                <Loader2 size={16} className="animate-spin text-primary" />
              </div>
            )}
            <button
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center shadow-sm"
            >
              <X size={10} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleImageSelect}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          {!imageFile && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Add an image"
            >
              <ImageIcon size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {content.length >= 250 && (
            <span className="text-xs font-body text-muted-foreground">
              {content.length}/300
            </span>
          )}
          <button
            onClick={handlePost}
            disabled={!!isSubmitBlocked}
            className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-40 transition-opacity hover:opacity-90"
          >
            Post to Pines ↑
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SparkComposer;
