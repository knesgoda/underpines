import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';

interface TenorGif {
  id: string;
  title: string;
  media_formats: {
    tinygif?: { url: string; dims: [number, number] };
    gif?: { url: string };
  };
}

interface GifPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

const TENOR_KEY = import.meta.env.VITE_TENOR_API_KEY || '';
const TENOR_BASE = 'https://tenor.googleapis.com/v2';

const GifPickerModal = ({ open, onClose, onSelect }: GifPickerModalProps) => {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchGifs = useCallback(async (searchQuery: string) => {
    if (!TENOR_KEY) return;
    setLoading(true);
    try {
      const endpoint = searchQuery.trim()
        ? `${TENOR_BASE}/search?q=${encodeURIComponent(searchQuery)}&key=${TENOR_KEY}&limit=30&media_filter=tinygif,gif&client_key=underpines`
        : `${TENOR_BASE}/featured?key=${TENOR_KEY}&limit=30&media_filter=tinygif,gif&client_key=underpines`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifs(data.results || []);
    } catch {
      setGifs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      fetchGifs('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setGifs([]);
    }
  }, [open, fetchGifs]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open, fetchGifs]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSelect = (gif: TenorGif) => {
    const url = gif.media_formats.gif?.url || gif.media_formats.tinygif?.url;
    if (url) {
      onSelect(url);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md max-h-[70vh] bg-[#f9fafb] rounded-t-2xl sm:rounded-2xl shadow-sm border border-border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2 p-3 border-b border-border">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search GIFs..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-[#16a34a] transition-shadow"
                />
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-2">
              {loading && gifs.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <span className="font-body text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : gifs.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <span className="font-body text-sm text-muted-foreground">
                    {query ? 'No GIFs found' : 'Search for a GIF'}
                  </span>
                </div>
              ) : (
                <div className="columns-2 gap-1.5 [column-fill:balance]">
                  {gifs.map(gif => (
                    <button
                      key={gif.id}
                      onClick={() => handleSelect(gif)}
                      className="block w-full mb-1.5 rounded-lg overflow-hidden hover:ring-2 hover:ring-[#16a34a] transition-shadow break-inside-avoid"
                    >
                      <img
                        src={gif.media_formats.tinygif?.url}
                        alt={gif.title || 'GIF'}
                        className="w-full h-auto block bg-muted"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tenor attribution */}
            <div className="px-3 py-1.5 border-t border-border text-center">
              <span className="font-body text-[10px] text-muted-foreground">Powered by Tenor</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GifPickerModal;
