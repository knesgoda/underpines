import { useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import { defaultAvatars, defaultAvatarKeys } from '@/lib/default-avatars';
import { useSaveAvatar } from '@/hooks/usePageEditor';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = /^image\/(jpeg|png|gif|webp)$/;

/** Shared with the tests: the same rules the file input enforces. */
export const validateAvatarFile = (
  file: { size: number; type: string; name?: string },
): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return 'That picture is a little big. Try one under 5MB.';
  }
  if (!ALLOWED.test(file.type)) {
    const isHeic = file.name?.toLowerCase().endsWith('.heic') || file.type === 'image/heic';
    return isHeic
      ? "That file format isn't supported yet. Try saving it as a JPEG or PNG first."
      : 'Only JPEG, PNG, GIF, or WebP pictures for now.';
  }
  return null;
};

/** Owner-scoped path — the avatars bucket only accepts writes under your own id. */
export const avatarStoragePath = (userId: string, fileName: string, uuid: string, now = Date.now()) => {
  const ext = (fileName.split('.').pop() || 'jpg').toLowerCase();
  return `${userId}/${now}-${uuid}.${ext}`;
};

interface AvatarEditorProps {
  avatarUrl: string | null;
  defaultAvatarKey: string | null;
  displayName: string | null;
}

/**
 * Your picture.
 *
 * The welcome flow lets people pick a woodland friend and then never mentions
 * it again — photo upload was left to a profile editor that got rebuilt without
 * it. This is that missing screen: upload a photo, or choose one of the
 * illustrations, in the place where the rest of the page is edited.
 *
 * Saves on its own rather than waiting for "Save page", because a picture is a
 * single decision and people expect it to land immediately.
 */
const AvatarEditor = ({ avatarUrl, defaultAvatarKey, displayName }: AvatarEditorProps) => {
  const { user } = useAuth();
  const saveAvatar = useSaveAvatar(user?.id);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = uploading || saveAvatar.isPending;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;

    const problem = validateAvatarFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }

    setUploading(true);
    const path = avatarStoragePath(user.id, file.name, crypto.randomUUID());
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });

    if (uploadErr) {
      setUploading(false);
      toast.error("That picture didn't make it through. Try again?");
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    setUploading(false);

    try {
      await saveAvatar.mutateAsync({ avatar_url: urlData.publicUrl });
      toast.success('New picture up.');
    } catch {
      toast.error("Uploaded, but it didn't save. Try again?");
    }
  };

  const chooseCreature = async (key: string) => {
    try {
      // Choosing an illustration means showing it, so the photo steps aside.
      await saveAvatar.mutateAsync({ default_avatar_key: key, avatar_url: null });
    } catch {
      toast.error('Could not save that. Try again?');
    }
  };

  const removePhoto = async () => {
    try {
      await saveAvatar.mutateAsync({ avatar_url: null });
      toast.success('Back to your woodland friend.');
    } catch {
      toast.error('Could not save that. Try again?');
    }
  };

  return (
    <section className="panel module">
      <h2>Your picture</h2>

      <div className="avatar-editor-row">
        <div className="avatar-editor-current">
          <UserAvatar
            avatarUrl={avatarUrl}
            defaultAvatarKey={defaultAvatarKey}
            displayName={displayName}
            size={72}
          />
          {busy && (
            <span className="avatar-editor-busy" aria-hidden="true">
              <Loader2 size={18} className="animate-spin" />
            </span>
          )}
        </div>

        <div className="avatar-editor-actions">
          <button
            type="button"
            className="solid-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            {uploading ? 'Uploading…' : 'Upload a photo'}
          </button>
          {avatarUrl && (
            <button type="button" className="paper-button" onClick={removePhoto} disabled={busy}>
              <X size={13} /> Remove photo
            </button>
          )}
          <small>JPEG, PNG, GIF or WebP, up to 5MB. Shown as a circle.</small>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      <p className="avatar-editor-label">Or pick a woodland friend</p>
      <div className="avatar-editor-grid">
        {defaultAvatarKeys.map(key => {
          const active = !avatarUrl && defaultAvatarKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => chooseCreature(key)}
              disabled={busy}
              aria-pressed={active}
              className={active ? 'is-active' : undefined}
              title={defaultAvatars[key].label}
            >
              <img
                src={defaultAvatars[key].src}
                alt={defaultAvatars[key].label}
                width={48}
                height={48}
                loading="lazy"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default AvatarEditor;
