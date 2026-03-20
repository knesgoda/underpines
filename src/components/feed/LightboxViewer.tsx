import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxProps {
  open: boolean;
  images: string[];
  startIndex: number;
  onClose: () => void;
}

const LightboxViewer = ({ open, images, startIndex, onClose }: LightboxProps) => {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);
  const multi = images.length > 1;

  useEffect(() => { setIndex(startIndex); }, [startIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && multi) setIndex(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight' && multi) setIndex(i => Math.min(images.length - 1, i + 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, images.length, multi]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || !multi) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) setIndex(i => Math.min(images.length - 1, i + 1));
      else setIndex(i => Math.max(0, i - 1));
    }
    touchStartX.current = null;
  }, [multi, images.length]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
          style={{ height: '100vh', height: '100dvh' } as any}
          onClick={onClose}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close — safe-area aware for notch devices */}
          <button
            onClick={onClose}
            className="absolute right-4 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            style={{ top: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {/* Image */}
          <img
            src={images[index]}
            alt=""
            className="block select-none"
            style={{
              maxWidth: '95vw',
              maxHeight: '92vh',
              maxHeight: '92dvh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
            } as any}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Nav arrows for multi-image */}
          {multi && index > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setIndex(i => i - 1); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {multi && index < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setIndex(i => i + 1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight size={22} />
            </button>
          )}

          {/* Counter */}
          {multi && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 font-body text-xs text-white/60">
              {index + 1} / {images.length}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LightboxViewer;
