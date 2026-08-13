import { useEffect, useState } from 'react';
import type { ImgHTMLAttributes, VideoHTMLAttributes } from 'react';
import { ImageOff, RotateCw } from 'lucide-react';
import { useSignedMediaUrl } from '@/lib/signedMedia';

/**
 * Drop-in <img>/<video> for anything stored in the private `post-media` bucket.
 *
 * Two failure modes are handled, because they're different:
 *  - we couldn't mint a signature at all (no access, network trouble)
 *  - we minted one and Storage still answered 403/expired when the browser
 *    fetched the file — the <img> would otherwise render a broken-image icon
 *
 * The second case gets one silent re-sign attempt (signatures lapse; access can
 * change mid-session), and only then falls back to a quiet, readable placard
 * with a manual "Try again".
 */

type FallbackProps = {
  className?: string;
  style?: React.CSSProperties;
  label: string;
  onRetry?: () => void;
  kind: 'photo' | 'video';
};

const MediaFallback = ({ className, style, label, onRetry, kind }: FallbackProps) => (
  <div
    className={`${className ?? ''} flex flex-col items-center justify-center gap-2 border border-border bg-muted/60 p-4 text-center`.trim()}
    style={style}
    role="img"
    aria-label={label}
    data-media-state="unavailable"
  >
    <ImageOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
    <p className="text-xs leading-snug text-muted-foreground">
      {kind === 'video' ? "This video isn't loading right now." : "This photo isn't loading right now."}
    </p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline underline-offset-2 hover:opacity-80"
      >
        <RotateCw className="h-3 w-3" aria-hidden="true" />
        Try again
      </button>
    )}
  </div>
);

const Placeholder = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div
    className={`${className ?? ''} animate-pulse bg-muted`.trim()}
    style={style}
    aria-hidden="true"
    data-media-state="loading"
  />
);

type MediaImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined;
};

export const MediaImage = ({ src, className, style, alt = '', onError, ...rest }: MediaImageProps) => {
  const { url, loading, failed, retry } = useSignedMediaUrl(src);
  // 0 = fine, 1 = one automatic re-sign spent, 2 = give up and show the placard.
  const [brokenStage, setBrokenStage] = useState(0);

  useEffect(() => { setBrokenStage(0); }, [src]);

  if (!url || (failed && !loading)) {
    if (loading) return <Placeholder className={className} style={style} />;
    return (
      <MediaFallback
        kind="photo"
        className={className}
        style={style}
        label={alt || "Photo unavailable"}
        onRetry={() => { setBrokenStage(0); retry(); }}
      />
    );
  }

  if (brokenStage >= 2) {
    return (
      <MediaFallback
        kind="photo"
        className={className}
        style={style}
        label={alt || "Photo unavailable"}
        onRetry={() => { setBrokenStage(0); retry(); }}
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      onError={(event) => {
        onError?.(event);
        setBrokenStage((stage) => {
          if (stage === 0) { retry(); return 1; }
          return 2;
        });
      }}
      {...rest}
    />
  );
};

type MediaVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src'> & {
  src: string | null | undefined;
};

export const MediaVideo = ({ src, className, style, onError, ...rest }: MediaVideoProps) => {
  const { url, loading, failed, retry } = useSignedMediaUrl(src);
  const [brokenStage, setBrokenStage] = useState(0);

  useEffect(() => { setBrokenStage(0); }, [src]);

  if (!url || (failed && !loading) || brokenStage >= 2) {
    if (loading) return <Placeholder className={className} style={style} />;
    return (
      <MediaFallback
        kind="video"
        className={className}
        style={style}
        label="Video unavailable"
        onRetry={() => { setBrokenStage(0); retry(); }}
      />
    );
  }

  return (
    <video
      src={url}
      className={className}
      style={style}
      onError={(event) => {
        onError?.(event);
        setBrokenStage((stage) => {
          if (stage === 0) { retry(); return 1; }
          return 2;
        });
      }}
      {...rest}
    />
  );
};

export default MediaImage;
