import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { toast } from 'sonner';

interface VintageRadioProps {
  userId: string;
  songTitle: string | null;
  songArtist: string | null;
  spotifyTrackId: string | null;
  spotifyPreviewUrl: string | null;
  atmosphere: { cardBg: string; text: string; border: string; accent: string; background: string };
  onUpdate: () => void;
}

interface SearchTrack {
  id: string;
  name: string;
  artist: string;
  preview_url: string | null;
  album_art: string | null;
}

const VintageRadio = ({
  userId, songTitle, songArtist, spotifyTrackId, spotifyPreviewUrl,
  atmosphere, onUpdate,
}: VintageRadioProps) => {
  const { user } = useAuth();
  const isOwner = user?.id === userId;
  const [playing, setPlaying] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const hasSong = !!songTitle;
  const hasPreview = !!spotifyPreviewUrl;

  // Clean up audio on unmount / navigation
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = useCallback(() => {
    if (!hasPreview) return;

    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(spotifyPreviewUrl!);
      audioRef.current.addEventListener('ended', () => setPlaying(false));
    }
    audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
  }, [playing, hasPreview, spotifyPreviewUrl]);

  const handleTap = () => {
    if (isOwner) {
      setSearchOpen(true);
    } else if (hasSong) {
      togglePlay();
    }
  };

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { setResults([]); return; }
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke('spotify-search', {
          body: { query: searchQuery },
        });
        if (data?.tracks) setResults(data.tracks);
      } catch { /* silent */ }
      setSearching(false);
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]);

  const selectTrack = async (track: SearchTrack) => {
    // Stop any playing audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);

    await supabase.from('profiles').update({
      pinned_song_title: track.name,
      pinned_song_artist: track.artist,
      spotify_track_id: track.id,
      spotify_preview_url: track.preview_url,
    } as any).eq('id', userId);

    toast.success('Song pinned to your radio');
    setSearchOpen(false);
    setSearchQuery('');
    setResults([]);
    onUpdate();
  };

  const clearSong = async () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
    await supabase.from('profiles').update({
      pinned_song_title: null,
      pinned_song_artist: null,
      spotify_track_id: null,
      spotify_preview_url: null,
    } as any).eq('id', userId);
    setSearchOpen(false);
    onUpdate();
  };

  // Colors derived from atmosphere
  const bodyColor = atmosphere.accent;
  const dimDial = atmosphere.border;

  return (
    <>
      <div
        className="rounded-2xl p-5 shadow-soft transition-colors duration-700"
        style={{ backgroundColor: atmosphere.cardBg, borderColor: atmosphere.border, borderWidth: 1 }}
      >
        {/* Radio SVG */}
        <div
          className={`flex justify-center ${hasSong && !isOwner ? 'cursor-pointer' : isOwner ? 'cursor-pointer' : ''}`}
          onClick={handleTap}
          role="button"
          tabIndex={0}
          aria-label={isOwner ? 'Set your pinned song' : hasSong ? 'Tune in' : undefined}
        >
          <svg viewBox="0 0 160 120" width="160" height="120" className="drop-shadow-sm">
            {/* Radio body */}
            <rect x="10" y="20" width="140" height="90" rx="16" ry="16"
              fill={atmosphere.cardBg}
              stroke={bodyColor} strokeWidth="2" opacity="0.9"
            />
            {/* Inner face */}
            <rect x="18" y="28" width="124" height="74" rx="10" ry="10"
              fill={atmosphere.background} opacity="0.5"
            />

            {/* Speaker grille lines */}
            <g opacity={playing ? 1 : 0.5}>
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <line
                  key={i}
                  x1="30" y1={38 + i * 8} x2="90" y2={38 + i * 8}
                  stroke={bodyColor} strokeWidth="1.5" strokeLinecap="round"
                  opacity={0.4}
                >
                  {playing && (
                    <animate
                      attributeName="opacity"
                      values="0.3;0.6;0.3"
                      dur={`${1.2 + i * 0.15}s`}
                      repeatCount="indefinite"
                    />
                  )}
                </line>
              ))}
            </g>

            {/* Tuning dial */}
            <rect x="102" y="34" width="34" height="20" rx="4"
              fill={playing ? bodyColor : dimDial}
              opacity={playing ? 0.8 : 0.3}
            >
              {playing && (
                <animate
                  attributeName="opacity"
                  values="0.6;0.9;0.6"
                  dur="2s"
                  repeatCount="indefinite"
                />
              )}
            </rect>
            {/* Dial line */}
            <line x1="110" y1="40" x2="128" y2="40" stroke={atmosphere.cardBg} strokeWidth="1" opacity="0.6" />
            <line x1="119" y1="37" x2="119" y2="50" stroke={atmosphere.cardBg} strokeWidth="0.5" opacity="0.4" />

            {/* Glow behind dial when playing */}
            {playing && (
              <ellipse cx="119" cy="44" rx="22" ry="14" fill={bodyColor} opacity="0.15">
                <animate attributeName="opacity" values="0.08;0.18;0.08" dur="2s" repeatCount="indefinite" />
              </ellipse>
            )}

            {/* Knobs */}
            <circle cx="108" cy="76" r="7" fill={atmosphere.background} stroke={bodyColor} strokeWidth="1.5" opacity="0.7" />
            <circle cx="108" cy="76" r="2" fill={bodyColor} opacity="0.5" />
            <circle cx="130" cy="76" r="7" fill={atmosphere.background} stroke={bodyColor} strokeWidth="1.5" opacity="0.7" />
            <circle cx="130" cy="76" r="2" fill={bodyColor} opacity="0.5" />

            {/* Antenna */}
            <line x1="45" y1="20" x2="35" y2="5" stroke={bodyColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <circle cx="35" cy="5" r="2" fill={bodyColor} opacity="0.4" />

            {/* Speaker pulse overlay when playing */}
            {playing && (
              <ellipse cx="60" cy="58" rx="30" ry="22" fill={bodyColor} opacity="0.06">
                <animate attributeName="rx" values="28;32;28" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="ry" values="20;24;20" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.03;0.08;0.03" dur="1.5s" repeatCount="indefinite" />
              </ellipse>
            )}
          </svg>
        </div>

        {/* Song info */}
        {hasSong && (
          <p className="text-center text-xs font-body mt-3 leading-relaxed" style={{ color: atmosphere.text, opacity: 0.55 }}>
            {songTitle} — {songArtist}
          </p>
        )}

        {/* Tune in / status label */}
        {hasSong && !isOwner && (
          <p
            className="text-center text-[10px] font-body mt-1.5 tracking-wide uppercase"
            style={{ color: atmosphere.accent, opacity: playing ? 0.8 : 0.45 }}
          >
            {playing ? '♫ playing' : hasPreview ? 'tune in' : ''}
          </p>
        )}

        {hasSong && !hasPreview && !isOwner && (
          <p className="text-center text-[10px] font-body mt-2 italic" style={{ color: atmosphere.text, opacity: 0.35 }}>
            This song is too shy to preview — but it's worth finding.
          </p>
        )}

        {!hasSong && isOwner && (
          <p
            className="text-center text-xs font-body mt-3 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: atmosphere.accent, opacity: 0.5 }}
            onClick={() => setSearchOpen(true)}
          >
            Tap to set your song
          </p>
        )}

        {isOwner && hasSong && (
          <p
            className="text-center text-[10px] font-body mt-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: atmosphere.accent, opacity: 0.4 }}
            onClick={() => setSearchOpen(true)}
          >
            change song
          </p>
        )}
      </div>

      {/* Song search sheet */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle className="font-display text-base">Pin a song to your radio</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for a song..."
                className="pl-9 rounded-xl text-sm h-10"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto max-h-[40vh] space-y-1">
              {searching && (
                <p className="text-xs text-muted-foreground text-center py-4 font-body">Searching...</p>
              )}
              {!searching && results.length === 0 && searchQuery.trim() && (
                <p className="text-xs text-muted-foreground text-center py-4 font-body">No results found</p>
              )}
              {results.map(track => (
                <button
                  key={track.id}
                  onClick={() => selectTrack(track)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  {track.album_art ? (
                    <img src={track.album_art} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs">🎵</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body text-foreground truncate">{track.name}</p>
                    <p className="text-xs font-body text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  {!track.preview_url && (
                    <span className="text-[9px] text-muted-foreground font-body shrink-0">no preview</span>
                  )}
                </button>
              ))}
            </div>

            {hasSong && (
              <button
                onClick={clearSong}
                className="w-full text-xs font-body text-muted-foreground hover:text-destructive transition-colors py-2"
              >
                Remove pinned song
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default VintageRadio;
