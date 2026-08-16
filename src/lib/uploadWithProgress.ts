import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * Upload a file to storage while reporting real byte progress.
 *
 * The storage client's `upload()` gives us no progress events, so a picture
 * upload looks frozen on a slow phone connection. This does the same REST call
 * by hand through XMLHttpRequest, which does report progress.
 */
export async function uploadWithProgress(
  bucket: string,
  path: string,
  body: Blob,
  opts: {
    contentType?: string;
    cacheControl?: string;
    onProgress?: (fraction: number) => void;
    /** Fires when the last byte has left the device and storage takes over. */
    onBytesSent?: () => void;
  } = {},
): Promise<{ error: Error | null }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: new Error('Not signed in') };

  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', PUBLISHABLE_KEY);
    xhr.setRequestHeader('cache-control', opts.cacheControl ?? '3600');
    xhr.setRequestHeader('x-upsert', 'false');
    if (opts.contentType) xhr.setRequestHeader('content-type', opts.contentType);

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) {
        opts.onProgress?.(Math.min(1, event.loaded / event.total));
      }
    };
    xhr.upload.onload = () => {
      opts.onProgress?.(1);
      opts.onBytesSent?.();
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        opts.onProgress?.(1);
        resolve({ error: null });
      } else {
        resolve({ error: new Error(`Upload failed (${xhr.status})`) });
      }
    };
    xhr.onerror = () => resolve({ error: new Error('Network error during upload') });
    xhr.onabort = () => resolve({ error: new Error('Upload cancelled') });

    xhr.send(body);
  });
}
