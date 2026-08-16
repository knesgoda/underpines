import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import { defaultAvatars, defaultAvatarKeys } from '@/lib/default-avatars';
import { useSaveAvatar } from '@/hooks/usePageEditor';
import { uploadWithProgress } from '@/lib/uploadWithProgress';
import { avatarProgress, crawl, type AvatarPhase } from '@/lib/avatarProgress';

const AvatarCropModal = lazy(() => import('@/components/cabin/AvatarCropModal'));


/** What went wrong, in plain words, plus the promise that nothing was lost. */
const failureCopy: Record<'upload' | 'save' | 'creature' | 'remove', string> = {
  upload: "The upload didn't finish. Your cropped picture is still here — nothing was lost.",
  save: "The picture uploaded but we couldn't attach it to your page yet.",
  creature: "We couldn't save that woodland friend.",
  remove: "We couldn't remove your photo.",
};

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
  const ext = (/\.([a-z0-9]{2,5})$/i.exec(fileName)?.[1] ?? 'jpg').toLowerCase();
  return `${userId}/${now}-${uuid}.${ext}`;
};

interface AvatarEditorProps {
  avatarUrl: string | null;
  defaultAvatarKey: string | null;
  displayName: string | null;
  /**
   * 'panel' — the standalone section on Edit my page (default).
   * 'bare'  — no panel or heading, for use inside a dialog that titles itself.
   */
  chrome?: 'panel' | 'bare';
  /**
   * Called whenever a save is in flight, so a host dialog can refuse to close
   * mid-upload instead of dropping the picture on the floor.
   */
  onBusyChange?: (busy: boolean) => void;
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
const AvatarEditor = ({
  avatarUrl,
  defaultAvatarKey,
  displayName,
  chrome = 'panel',
  onBusyChange,
}: AvatarEditorProps) => {
  const { user } = useAuth();
  const saveAvatar = useSaveAvatar(user?.id);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<AvatarPhase>('idle');
  // Steps we can't measure crawl forward on a timer instead of sitting still.
  const [ticks, setTicks] = useState(0);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  // A failed attempt holds on to the cropped picture so Retry doesn't ask you
  // to pick and crop it all over again.
  const [failure, setFailure] = useState<
    | { kind: 'upload'; blob: Blob }
    | { kind: 'save'; url: string }
    | { kind: 'creature'; key: string }
    | { kind: 'remove' }
    | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = uploading || saveAvatar.isPending;
  const within = phase === 'uploading' ? progress : crawl(ticks);
  const { percent, label, step, steps, done } = avatarProgress(phase, within);

  // Crawl the unmeasurable steps so the bar keeps moving while we wait.
  useEffect(() => {
    if (phase !== 'processing' && phase !== 'saving') return;
    setTicks(0);
    const id = window.setInterval(() => setTicks(t => t + 1), 450);
    return () => window.clearInterval(id);
  }, [phase]);

  // Tell the host (a dialog, usually) so it can hold the door shut mid-save.
  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  // Release the preview URL when the cropper closes.
  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const closeCropper = () => {
    setCropSrc(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  /** Pick a file, then fine-tune it — drag to reposition, zoom to fill. */
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;

    const problem = validateAvatarFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }

    setCropSrc(URL.createObjectURL(file));
  };

  /** Save the record that points at an already-uploaded picture. */
  const runSave = async (url: string) => {
    setPhase('saving');
    try {
      await saveAvatar.mutateAsync({ avatar_url: url });
      setFailure(null);
      setPhase('done');
      toast.success('New picture up.');
      window.setTimeout(() => {
        setPhase('idle');
        setProgress(0);
      }, 700);
    } catch {
      setFailure({ kind: 'save', url });
      setPhase('idle');
      setProgress(0);
      toast.error("Uploaded, but it didn't save. Your picture is still here — try again.");
    }
  };

  /** Upload the cropped picture, then save it. */
  const runUpload = async (blob: Blob) => {
    if (!user) return;
    setFailure(null);
    setUploading(true);
    setProgress(0);
    setPhase('uploading');
    const path = avatarStoragePath(user.id, 'picture.png', crypto.randomUUID());
    const { error: uploadErr } = await uploadWithProgress('avatars', path, blob, {
      contentType: 'image/png',
      cacheControl: '31536000',
      onProgress: setProgress,
      onBytesSent: () => setPhase('processing'),
    });
    setUploading(false);

    if (uploadErr) {
      setPhase('idle');
      setProgress(0);
      setFailure({ kind: 'upload', blob });
      toast.error("That picture didn't make it through. Your crop is saved — try again.");
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    await runSave(urlData.publicUrl);
  };

  const handleCropped = async (blob: Blob) => {
    closeCropper();
    await runUpload(blob);
  };

  const retry = async () => {
    if (!failure) return;
    if (failure.kind === 'upload') return runUpload(failure.blob);
    if (failure.kind === 'save') return runSave(failure.url);
    if (failure.kind === 'creature') return chooseCreature(failure.key);
    return removePhoto();
  };

  const chooseCreature = async (key: string) => {

    try {
      // Choosing an illustration means showing it, so the photo steps aside.
      await saveAvatar.mutateAsync({ default_avatar_key: key, avatar_url: null });
      setFailure(null);
      toast.success(`${defaultAvatars[key].label} it is.`);
    } catch {
      setFailure({ kind: 'creature', key });
      toast.error('Could not save that. Try again?');
    }
  };

  const removePhoto = async () => {
    try {
      await saveAvatar.mutateAsync({ avatar_url: null });
      setFailure(null);
      toast.success('Back to your woodland friend.');
    } catch {
      setFailure({ kind: 'remove' });
      toast.error('Could not save that. Try again?');
    }
  };

  return (
    <section className={chrome === 'bare' ? 'avatar-editor-bare' : 'panel module'}>
      {chrome === 'panel' && <h2>Your picture</h2>}

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
            {phase === 'uploading' || phase === 'processing' ? 'Uploading…' : 'Upload a photo'}
          </button>
          {avatarUrl && (
            <button type="button" className="outline-button inline-flex items-center gap-1.5" onClick={removePhoto} disabled={busy}>
              <X size={13} /> Remove photo
            </button>
          )}
          <small>JPEG, PNG, GIF or WebP, up to 5MB. You can zoom and drag it into place. Shown as a circle.</small>

          {phase !== 'idle' && (
            <div
              className="avatar-editor-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label="Saving your picture"
              aria-valuetext={`${label} — ${percent}%`}
            >
              <div className="avatar-editor-progress-track">
                <span style={{ width: `${percent}%` }} />
              </div>
              <span className="avatar-editor-progress-label">
                {done ? 'Done' : `Step ${step} of ${steps} · ${label}… ${percent}%`}
              </span>
            </div>
          )}

          {failure && !busy && (
            <div className="avatar-editor-error" role="alert">
              <p>{failureCopy[failure.kind]}</p>
              <div className="avatar-editor-error-actions">
                <button type="button" className="solid-button" onClick={retry}>
                  <RefreshCw size={13} /> Try again
                </button>
                <button type="button" className="outline-button" onClick={() => setFailure(null)}>
                  Not now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      {cropSrc && (
        <Suspense fallback={null}>
          <AvatarCropModal imageSrc={cropSrc} onCancel={closeCropper} onSave={handleCropped} />
        </Suspense>
      )}


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
