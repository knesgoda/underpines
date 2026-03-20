import { useRef } from 'react';
import { Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAvatarSrc } from '@/lib/default-avatars';
import { toast } from 'sonner';

interface CabinAvatarProps {
  avatarUrl: string | null;
  defaultAvatarKey: string | null;
  isOwner: boolean;
  isEditing: boolean;
  profileId: string;
  onUpdate: () => void;
  size?: 'sm' | 'lg';
}

const CabinAvatar = ({
  avatarUrl,
  defaultAvatarKey,
  isOwner,
  isEditing,
  profileId,
  onUpdate,
  size = 'lg',
}: CabinAvatarProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const src = getAvatarSrc(avatarUrl, defaultAvatarKey);
  const px = size === 'lg' ? 80 : 64;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/png')) {
      toast.error('Please upload a JPEG or PNG image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    const ext = file.name.split('.').pop();
    const path = `${profileId}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error('Could not upload avatar');
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    // Add cache-busting param
    const url = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profileId);
    onUpdate();
    toast.success('Avatar updated');
  };

  return (
    <div className="relative" style={{ width: px, height: px }}>
      <img
        src={src}
        alt="Profile avatar"
        className="rounded-full object-cover"
        style={{
          width: px,
          height: px,
          border: '3px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      />
      {isOwner && isEditing && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 flex items-center justify-center rounded-full transition-opacity hover:opacity-90"
            style={{
              width: 24,
              height: 24,
              backgroundColor: 'rgba(0,0,0,0.6)',
            }}
          >
            <Camera size={12} color="white" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleUpload}
            className="hidden"
          />
        </>
      )}
    </div>
  );
};

export default CabinAvatar;
