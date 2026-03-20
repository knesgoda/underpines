import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QueuedPost {
  id: string;
  post_type: string;
  content: string | null;
  title: string | null;
  author_id: string;
  queued_at: number;
}

const QUEUE_KEY = 'underpines_offline_queue';

const getQueue = (): QueuedPost[] => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch { return []; }
};

const setQueue = (q: QueuedPost[]) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
};

const useOfflineQueue = (isOnline: boolean) => {
  const processingRef = useRef(false);

  const enqueue = useCallback((post: QueuedPost) => {
    const queue = getQueue();
    queue.push({ ...post, queued_at: Date.now() });
    setQueue(queue);
    toast('Your post has been saved and will be sent when you are back in signal.');
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    processingRef.current = true;
    const sorted = queue.sort((a, b) => a.queued_at - b.queued_at);
    const remaining = [...sorted];

    for (const post of sorted) {
      const { error } = await supabase.from('posts').insert({
        post_type: post.post_type,
        content: post.content,
        title: post.title,
        author_id: post.author_id,
        is_published: true,
      });

      if (!error) {
        const idx = remaining.findIndex(p => p.id === post.id);
        if (idx >= 0) remaining.splice(idx, 1);
        setQueue(remaining);
      }
      // 2-second delay between sends
      if (sorted.indexOf(post) < sorted.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (remaining.length < sorted.length) {
      const sent = sorted.length - remaining.length;
      toast(`🌿 ${sent === 1 ? 'Your queued post was sent.' : `${sent} queued posts were sent.`}`);
    }
    processingRef.current = false;
  }, []);

  useEffect(() => {
    if (isOnline) processQueue();
  }, [isOnline, processQueue]);

  return { enqueue, getQueuedPosts: getQueue };
};

export default useOfflineQueue;
