import { useRef, useState, useCallback } from 'react';
import { Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAvatarSrc } from '@/lib/default-avatars';
import { toast } from 'sonner';
import AvatarCropModal from './AvatarCropModal';

interface CabinAvatarProps {
  avatarUrl: string | null;
  defaultAvatarKey: string | null;
  isOwner: boolean;
  isEditing?: boolean;
  profileId: string;
  onUpdate: () => void;
  size?: 'sm' | 'lg';
}

const CabinAvatar = ({
  avatarUrl,
  defaultAvatarKey,
  isOwner,
  profileId,
  onUpdate,
  size = 'lg',
}: CabinAvatarProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const src = getAvatarSrc(avatarUrl, defaultAvatarKey);
  const px = size === 'lg' ? 96 : 80;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const reader = new FileReader();
    reader.onload = () => setCropImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropSave = useCallback(async (blob: Blob) => {
    setCropImage(null);

    const path = `${profileId}/avatar.png`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/png' });

    if (error) {
      toast.error('Could not upload avatar');
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profileId);
    onUpdate();
    toast.success('Avatar updated');
  }, [profileId, onUpdate]);

  return (
    <>
      <div
        className={`relative group ${isOwner ? 'cursor-pointer' : ''}`}
        style={{
          width: px,
          height: px,
          borderRadius: '50%',
          border: '3px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={isOwner ? () => fileRef.current?.click() : undefined}
      >
        <img
          src={src}
          alt="Profile avatar"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            borderRadius: '50%',
          }}
        />

        {/* Owner hover overlay — dims image with centered camera */}
        {isOwner && hovered && (
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '50%' }}
            onClick={() => fileRef.current?.click()}
          >
            <Camera size={22} color="white" />
          </div>
        )}


        {isOwner && (
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileSelect}
            className="hidden"
          />
        )}
      </div>

      {cropImage && (
        <AvatarCropModal
          imageSrc={cropImage}
          onCancel={() => setCropImage(null)}
          onSave={handleCropSave}
        />
      )}
    </>
  );
};

export default CabinAvatar;
