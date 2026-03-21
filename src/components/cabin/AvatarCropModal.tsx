import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AvatarCropModalProps {
  imageSrc: string;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}

async function getCroppedImg(imageSrc: string, crop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    size,
    size,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas is empty'))),
      'image/png',
      1,
    );
  });
}

const AvatarCropModal = ({ imageSrc, onCancel, onSave }: AvatarCropModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedArea) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedArea);
      onSave(blob);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/80" onClick={onCancel} />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm mx-4">
        {/* Crop area */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-2xl overflow-hidden" style={{ touchAction: 'none' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Instruction */}
        <p className="mt-5 text-sm font-body text-white/60 text-center">
          Drag to reposition. Pinch or use the slider to zoom.
        </p>

        {/* Zoom slider */}
        <div className="w-full max-w-[240px] mt-4 px-4">
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.05}
            onValueChange={(v) => setZoom(v[0])}
            className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_.relative]:bg-white/20"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="rounded-full text-white/70 hover:text-white hover:bg-white/10 font-body"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-primary text-primary-foreground font-body px-6"
          >
            {saving ? 'Saving…' : 'Save photo'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropModal;
