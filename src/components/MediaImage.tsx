import type { ImgHTMLAttributes, VideoHTMLAttributes } from 'react';
import { useSignedMediaUrl } from '@/lib/signedMedia';

/**
 * Drop-in <img> for anything stored in the private `post-media` bucket.
 * Signs the URL, and shows a neutral surface while signing or on failure so a
 * lapsed signature never renders as a broken-image icon.
 */
type MediaImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined;
};

export const MediaImage = ({ src, className, style, alt = '', ...rest }: MediaImageProps) => {
  const { url, loading, failed } = useSignedMediaUrl(src);

  if (!url) {
    return (
      <div
        className={`${className ?? ''} bg-muted ${loading ? 'animate-pulse' : ''}`.trim()}
        style={style}
        aria-hidden="true"
        data-media-state={failed ? 'unavailable' : 'loading'}
      />
    );
  }

  return <img src={url} alt={alt} className={className} style={style} {...rest} />;
};

type MediaVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src'> & {
  src: string | null | undefined;
};

export const MediaVideo = ({ src, className, style, ...rest }: MediaVideoProps) => {
  const { url, loading, failed } = useSignedMediaUrl(src);

  if (!url) {
    return (
      <div
        className={`${className ?? ''} bg-muted ${loading ? 'animate-pulse' : ''}`.trim()}
        style={style}
        aria-hidden="true"
        data-media-state={failed ? 'unavailable' : 'loading'}
      />
    );
  }

  return <video src={url} className={className} style={style} {...rest} />;
};

export default MediaImage;
