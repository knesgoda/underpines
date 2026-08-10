import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { RadioSVG, WalkmanSVG, DiscmanSVG, MP3PlayerSVG } from './PlayerDevices';

export type PlayerType = 'radio' | 'walkman' | 'discman' | 'mp3';

interface MusicPlayerProps {
  userId: string;
  songTitle: string | null;
  songArtist: string | null;
  spotifyTrackId: string | null;
  spotifyPreviewUrl: string | null;
  playerType: PlayerType;
  isPinesPlus: boolean;
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

const PLAYER_LABELS: Record<PlayerType, string> = {
  radio: 'Radio',
  walkman: 'Walkman',
  discman: 'Discman',
  mp3: 'MP3 Player',
};

const MusicPlayer = ({
  userId, songTitle, songArtist, spotifyTrackId, spotifyPreviewUrl,
  playerType, isPinesPlus, atmosphere, onUpdate,
}: MusicPlayerProps) => {
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

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
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
    if (isOwner && !hasSong) {
      setSearchOpen(true);
    } else if (hasSong) {
      togglePlay();
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) { setResults([]); return; }
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase.functions.invoke('spotify-search', {
          body: { query: searchQuery },
        });
        if (data?.tracks) setResults(data.tracks);
      } catch { /* silent */ }
      setSearching(false);
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]);

  const selectTrack = async (track: SearchTrack) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
    await supabase.from('profiles').update({
      pinned_song_title: track.name,
      pinned_song_artist: track.artist,
      spotify_track_id: track.id,
      spotify_preview_url: track.preview_url,
    } as any).eq('id', userId);
    toast.success('Song pinned');
    setSearchOpen(false);
    setSearchQuery('');
    setResults([]);
    onUpdate();
  };

  const clearSong = async () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
    await supabase.from('profiles').update({
      pinned_song_title: null, pinned_song_artist: null,
      spotify_track_id: null, spotify_preview_url: null,
    } as any).eq('id', userId);
    setSearchOpen(false);
    onUpdate();
  };

  const deviceProps = {
    playing,
    accent: atmosphere.accent,
    cardBg: atmosphere.cardBg,
    background: atmosphere.background,
  };

  const renderDevice = () => {
    switch (playerType) {
      case 'walkman': return <WalkmanSVG {...deviceProps} />;
      case 'discman': return <DiscmanSVG {...deviceProps} />;
      case 'mp3': return <MP3PlayerSVG {...deviceProps} songTitle={songTitle ? `${songTitle} — ${songArtist}` : undefined} />;
      default: return <RadioSVG {...deviceProps} />;
    }
  };

  return (
    <>
      <div
        className="rounded-2xl p-5 shadow-soft transition-colors duration-700"
        style={{ backgroundColor: atmosphere.cardBg, borderColor: atmosphere.border, borderWidth: 1 }}
      >
        <div
          className={`flex justify-center ${hasSong || isOwner ? 'cursor-pointer' : ''}`}
          onClick={handleTap}
          role="button"
          tabIndex={0}
          aria-label={isOwner ? 'Set your pinned song' : hasSong ? 'Tune in' : undefined}
        >
          {renderDevice()}
        </div>

        {hasSong && (
          <p className="text-center text-xs font-body mt-3 leading-relaxed" style={{ color: atmosphere.text, opacity: 0.55 }}>
            {songTitle} — {songArtist}
          </p>
        )}

        {hasSong && !isOwner && (
          <p className="text-center text-[10px] font-body mt-1.5 tracking-wide uppercase"
            style={{ color: atmosphere.accent, opacity: playing ? 0.8 : 0.45 }}>
            {playing ? '♫ playing' : hasPreview ? 'tune in' : ''}
          </p>
        )}

        {hasSong && !hasPreview && !isOwner && (
          <p className="text-center text-[10px] font-body mt-2 italic" style={{ color: atmosphere.text, opacity: 0.35 }}>
            This song is too shy to preview — but it's worth finding.
          </p>
        )}

        {!hasSong && isOwner && (
          <p className="text-center text-xs font-body mt-3 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: atmosphere.accent, opacity: 0.5 }}
            onClick={() => setSearchOpen(true)}>
            Tap to set your song
          </p>
        )}

        {isOwner && hasSong && (
          <p className="text-center text-[10px] font-body mt-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: atmosphere.accent, opacity: 0.4 }}
            onClick={() => setSearchOpen(true)}>
            change song
          </p>
        )}
      </div>

      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle className="font-display text-base">Pin a song</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for a song..." className="pl-9 rounded-xl text-sm h-10" autoFocus />
            </div>
            <div className="overflow-y-auto max-h-[40vh] space-y-1">
              {searching && <p className="text-xs text-muted-foreground text-center py-4 font-body">Searching...</p>}
              {!searching && results.length === 0 && searchQuery.trim() && (
                <p className="text-xs text-muted-foreground text-center py-4 font-body">No results found</p>
              )}
              {results.map(track => (
                <button key={track.id} onClick={() => selectTrack(track)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors text-left">
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
              <button onClick={clearSong}
                className="w-full text-xs font-body text-muted-foreground hover:text-destructive transition-colors py-2">
                Remove pinned song
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

/* ─── Player Selector (for Cabin edit form) ─── */
export const PlayerSelector = ({
  current, isPinesPlus, onChange, accent,
}: {
  current: PlayerType;
  isPinesPlus: boolean;
  onChange: (t: PlayerType) => void;
  accent: string;
}) => {
  const devices: { type: PlayerType; label: string; pinesOnly: boolean }[] = [
    { type: 'radio', label: 'Radio', pinesOnly: false },
    { type: 'walkman', label: 'Walkman', pinesOnly: true },
    { type: 'discman', label: 'Discman', pinesOnly: true },
    { type: 'mp3', label: 'MP3 Player', pinesOnly: true },
  ];

  const thumbProps = { playing: false, accent, cardBg: 'hsl(var(--card))', background: 'hsl(var(--muted))' };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {devices.map(d => {
          const locked = d.pinesOnly && !isPinesPlus;
          const selected = current === d.type;
          return (
            <button
              key={d.type}
              onClick={() => !locked && onChange(d.type)}
              className={`relative rounded-xl border p-2 flex flex-col items-center gap-1.5 transition-all ${
                selected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' :
                locked ? 'border-border opacity-40 cursor-not-allowed' :
                'border-border hover:border-primary/40'
              }`}
              disabled={locked}
            >
              <div className="w-full flex justify-center" style={{ transform: 'scale(0.35)', transformOrigin: 'center', height: 45 }}>
                {d.type === 'radio' && <RadioSVG {...thumbProps} />}
                {d.type === 'walkman' && <WalkmanSVG {...thumbProps} />}
                {d.type === 'discman' && <DiscmanSVG {...thumbProps} />}
                {d.type === 'mp3' && <MP3PlayerSVG {...thumbProps} />}
              </div>
              <span className="text-[10px] font-body text-foreground">{d.label}</span>
              {locked && (
                <span className="absolute top-1 right-1 text-[8px] text-muted-foreground">🔒</span>
              )}
            </button>
          );
        })}
      </div>
      {!isPinesPlus && (
        <p className="text-[10px] font-body text-muted-foreground text-center">
          Pines+ coming soon — unlocks Walkman, Discman & MP3 Player
        </p>
      )}
    </div>
  );
};

export default MusicPlayer;
