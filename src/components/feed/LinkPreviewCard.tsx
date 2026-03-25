import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OgData {
  title: string | null;
  description: string | null;
  image: string | null;
  domain: string;
  url: string;
}

// Simple in-memory cache so we don't re-fetch for the same URL
const ogCache = new Map<string, OgData>();

interface Props {
  url: string;
}

const LinkPreviewCard = ({ url }: Props) => {
  const [og, setOg] = useState<OgData | null>(ogCache.get(url) || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ogCache.has(url)) {
      setOg(ogCache.get(url)!);
      return;
    }

    let cancelled = false;

    const fetchOg = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('fetch-og-metadata', {
          body: { url },
        });

        if (cancelled) return;

        if (error || !data) {
          setFailed(true);
          return;
        }

        const result: OgData = data as OgData;
        ogCache.set(url, result);
        setOg(result);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    fetchOg();
    return () => { cancelled = true; };
  }, [url]);

  // Fallback: simple domain card
  const fallbackDomain = (() => {
    try { return new URL(url.startsWith('www.') ? `https://${url}` : url).hostname.replace(/^www\./, ''); } catch { return url; }
  })();

  if (!og && !failed) {
    // Loading skeleton
    return (
      <div className="mt-2 rounded-lg border border-border overflow-hidden animate-pulse">
        <div className="h-[80px] bg-muted" />
        <div className="p-3 space-y-2">
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const displayDomain = og?.domain || fallbackDomain;
  const displayTitle = og?.title;
  const displayDesc = og?.description;
  const displayImage = og?.image;
  const href = url.startsWith('www.') ? `https://${url}` : url;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow bg-card"
    >
      {displayImage && (
        <img
          src={displayImage}
          alt=""
          className="w-full object-cover rounded-t-lg"
          style={{ maxHeight: '180px' }}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className="p-3 space-y-1">
        <p className="font-body text-[11px] text-muted-foreground uppercase tracking-wide">
          {displayDomain}
        </p>
        {displayTitle && (
          <p className="font-body text-sm font-medium text-foreground line-clamp-2">
            {displayTitle}
          </p>
        )}
        {displayDesc && (
          <p className="font-body text-xs text-muted-foreground line-clamp-2">
            {displayDesc}
          </p>
        )}
        {!displayTitle && !displayDesc && (
          <p className="font-body text-sm text-muted-foreground truncate">{url}</p>
        )}
      </div>
    </a>
  );
};

export default LinkPreviewCard;
