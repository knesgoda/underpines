import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

interface EmberComposerProps {
  onPost: (post: any) => void;
  onCancel: () => void;
}

const EmberComposer = ({ onPost, onCancel }: EmberComposerProps) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected).slice(0, 10 - files.length);
    const valid = arr.filter(f => f.size <= 10 * 1024 * 1024 && /^(image\/(jpeg|png|webp)|video\/mp4)/.test(f.type));
    if (valid.length < arr.length) toast.info('Some files were skipped (max 10MB, JPEG/PNG/MP4 only)');

    const newFiles = [...files, ...valid].slice(0, 10);
    setFiles(newFiles);
    setPreviews(newFiles.map(f => URL.createObjectURL(f)));
  };

  const removeFile = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles(f => f.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const handlePost = async () => {
    if (files.length === 0 || !user) return;
    setPosting(true);

    try {
      // Create the post first
      const { data: post, error: postErr } = await supabase
        .from('posts')
        .insert({ author_id: user.id, post_type: 'ember', content: caption.trim() || null })
        .select()
        .single();

      if (postErr || !post) throw postErr;

      // Upload media
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${post.id}/${i}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('post-media')
          .upload(path, file, { contentType: file.type });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(path);

        await supabase.from('post_media').insert({
          post_id: post.id,
          media_type: file.type.startsWith('video') ? 'video' : 'photo',
          url: urlData.publicUrl,
          position: i,
        });
      }

      onPost({ ...post, post_media: [] }); // Will be refetched
      setFiles([]);
      setPreviews([]);
      setCaption('');
    } catch (err) {
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
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {previews.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full py-10 rounded-xl border-2 border-dashed border-border hover:border-primary/30 transition-colors flex flex-col items-center gap-2"
        >
          <ImagePlus size={28} className="text-muted-foreground" />
          <span className="font-body text-sm text-muted-foreground">Tap to add photos or video</span>
          <span className="font-body text-xs text-muted-foreground/50">Up to 10 photos or 1 video</span>
        </button>
      ) : (
        <div className="space-y-2">
          <div className={`grid gap-1.5 ${
            previews.length === 1 ? 'grid-cols-1' :
            previews.length === 2 ? 'grid-cols-2' :
            'grid-cols-3'
          }`}>
            {previews.map((src, i) => (
              <div key={i} className={`relative rounded-lg overflow-hidden ${i === 0 && previews.length >= 3 ? 'col-span-2 row-span-2' : ''}`}>
                {files[i]?.type.startsWith('video') ? (
                  <video src={src} className="w-full h-full object-cover max-h-[200px]" />
                ) : (
                  <img src={src} alt="" className="w-full h-full object-cover max-h-[200px]" />
                )}
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          {files.length < 10 && (
            <button onClick={() => inputRef.current?.click()} className="text-xs font-body text-primary hover:opacity-80">
              + Add more
            </button>
          )}
        </div>
      )}

      <input
        value={caption}
        onChange={e => setCaption(e.target.value)}
        placeholder="Add a caption (optional)"
        className="w-full bg-transparent text-foreground font-body text-sm outline-none placeholder:text-muted-foreground/50"
      />

      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
        <button
          onClick={handlePost}
          disabled={files.length === 0 || posting}
          className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-40 transition-opacity hover:opacity-90"
        >
          {posting ? 'Posting...' : 'Post to Pines ↑'}
        </button>
      </div>
    </motion.div>
  );
};

export default EmberComposer;
