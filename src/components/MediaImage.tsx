import { useEffect, useRef, useState } from 'react';
import type { ImgHTMLAttributes, VideoHTMLAttributes } from 'react';
import { ImageOff, Loader2, RotateCw } from 'lucide-react';
import { useSignedMediaUrl } from '@/lib/signedMedia';
import { logMediaFailure } from '@/lib/mediaTelemetry';


/**
 * Drop-in <img>/<video> for anything stored in the private `post-media` bucket.
 *
 * Two failure modes are handled, because they're different:
 *  - we couldn't mint a signature at all (no access, network trouble)
 *  - we minted one and Storage still answered 403/expired when the browser
 *    fetched the file — the <img> would otherwise render a broken-image icon
 *
 * The second case gets backoff-guarded silent re-sign attempts (signatures
 * lapse; access can change mid-session), and only then falls back to a quiet,
 * readable placard with a manual "Try again".
 *
 * While a re-sign is pending — the backoff wait included — the slot shows a
 * skeleton rather than a broken frame, and the "Try again" button stays inert
 * until that attempt has landed so a person can't stack requests.
 */

type FallbackProps = {
  className?: string;
  style?: React.CSSProperties;
  label: string;
  onRetry?: () => void;
  retrying?: boolean;
  kind: 'photo' | 'video';
};

const MediaFallback = ({ className, style, label, onRetry, retrying, kind }: FallbackProps) => (
  <div
    className={`${className ?? ''} flex flex-col items-center justify-center gap-2 border border-border bg-muted/60 p-4 text-center`.trim()}
    style={style}
    role="img"
    aria-label={label}
    data-media-state={retrying ? 'retrying' : 'unavailable'}
  >
    <ImageOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
    <p className="text-xs leading-snug text-muted-foreground">
      {kind === 'video' ? "This video isn't loading right now." : "This photo isn't loading right now."}
    </p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        aria-busy={retrying || undefined}
        className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline underline-offset-2 hover:opacity-80 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
      >
        {retrying ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : (
          <RotateCw className="h-3 w-3" aria-hidden="true" />
        )}
        {retrying ? 'Trying…' : 'Try again'}
      </button>
    )}
  </div>
);

const Placeholder = ({
  className,
  style,
  state = 'loading',
}: { className?: string; style?: React.CSSProperties; state?: 'loading' | 'retrying' }) => (
  <div
    className={`${className ?? ''} animate-pulse bg-muted`.trim()}
    style={style}
    aria-hidden="true"
    data-media-state={state}
  />
);

type MediaImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined;
};

export const MediaImage = ({ src, className, style, alt = '', onError, ...rest }: MediaImageProps) => {
  const { url, loading, failed, resigning, retry, resign } = useSignedMediaUrl(src);
  // true once the re-sign budget for this reference is spent.
  const [givenUp, setGivenUp] = useState(false);
  const attemptsRef = useRef(0);

  useEffect(() => { setGivenUp(false); attemptsRef.current = 0; }, [src]);

  const manualRetry = () => { setGivenUp(false); attemptsRef.current = 0; retry(); };

  // An automatic re-sign is in flight: hold the skeleton rather than flashing
  // a broken frame or an unavailable card that's about to be replaced.
  if (!givenUp && resigning) return <Placeholder className={className} style={style} state="retrying" />;

  if (givenUp || !url || (failed && !loading)) {
    if (loading && !givenUp) return <Placeholder className={className} style={style} />;
    return (
      <MediaFallback
        kind="photo"
        className={className}
        style={style}
        label={alt || "Photo unavailable"}
        onRetry={manualRetry}
        retrying={resigning || loading}
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
        // Backoff-guarded: false means we've spent the attempts for this object.
        const attempt = attemptsRef.current + 1;
        attemptsRef.current = attempt;
        const willRetry = resign();
        logMediaFailure(src, willRetry ? 'fetch_forbidden' : 'gave_up', { attempt, kind: 'photo' });
        if (!willRetry) setGivenUp(true);
      }}

      {...rest}
    />
  );
};

type MediaVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src'> & {
  src: string | null | undefined;
};

export const MediaVideo = ({ src, className, style, onError, ...rest }: MediaVideoProps) => {
  const { url, loading, failed, resigning, retry, resign } = useSignedMediaUrl(src);
  const [givenUp, setGivenUp] = useState(false);
  const attemptsRef = useRef(0);

  useEffect(() => { setGivenUp(false); attemptsRef.current = 0; }, [src]);

  const manualRetry = () => { setGivenUp(false); attemptsRef.current = 0; retry(); };

  if (!givenUp && resigning) return <Placeholder className={className} style={style} state="retrying" />;

  if (givenUp || !url || (failed && !loading)) {
    if (loading && !givenUp) return <Placeholder className={className} style={style} />;
    return (
      <MediaFallback
        kind="video"
        className={className}
        style={style}
        label="Video unavailable"
        onRetry={manualRetry}
        retrying={resigning || loading}
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
        const attempt = attemptsRef.current + 1;
        attemptsRef.current = attempt;
        const willRetry = resign();
        logMediaFailure(src, willRetry ? 'fetch_forbidden' : 'gave_up', { attempt, kind: 'video' });
        if (!willRetry) setGivenUp(true);
      }}

      {...rest}
    />
  );
};



export default MediaImage;
